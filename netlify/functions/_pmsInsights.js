/**
 * The PMS figures the suggestions brain asks for, computed from the agency
 * data platform's pms_bookings (read only): occupancy on the books and same
 * time last year for 0-30 / 31-60 / 61-90 / 91-180 days, median booking lead
 * time, how open each weekend in the next 60 days is, availability on upcoming
 * holidays, monthly seasonality and party size. Always for the client as a
 * whole: no figure names or singles out a property.
 *
 * Several clients share one PMS account, so a tenant's pms_included_property_ids
 * (when set) is the only list of properties that are theirs.
 */

/* Statuses differ by PMS. These are real stays; "blocked" is an owner block:
   the night cannot be sold but is not revenue. Inquiries, cancellations,
   expired holds and the like are ignored. */
const STAY    = new Set(['confirmed', 'booked', 'reserved', 'checked_in', 'checked_out', 'closed'])
const BLOCKED = new Set(['blocked'])

const DAY = 86400000
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const ms  = (d) => Date.parse(d + 'T00:00:00Z')
const add = (d, n) => iso(ms(d) + n * DAY)
const median = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b)
  if (!s.length) return null
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const pct = (n, d) => d ? +(100 * n / d).toFixed(1) : null

async function pageAll(get, path) {
  const out = []
  for (let off = 0; ; off += 1000) {
    const rows = await get(`${path}&order=id&offset=${off}&limit=1000`)
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

export async function loadPms(get, locationId, clientName) {
  const [conn] = await get(`ghl_connections?select=tenant_id&location_id=eq.${encodeURIComponent(locationId)}&limit=1`)
  let tenantId = conn?.tenant_id
  if (!tenantId) {
    const [t] = await get(`tenants?select=id&name=ilike.${encodeURIComponent(clientName)}&limit=1`)
    tenantId = t?.id
  }
  if (!tenantId) return { available: false, reason: 'No matching tenant on the data platform' }

  const [[tenant], [pmsConn]] = await Promise.all([
    get(`tenants?select=pms_included_property_ids&id=eq.${tenantId}`),
    get(`pms_connections?select=provider,last_sync_at,sync_status&tenant_id=eq.${tenantId}&limit=1`),
  ])
  if (!pmsConn) return { available: false, reason: 'No PMS connected for this client' }

  const allow = tenant?.pms_included_property_ids?.length ? tenant.pms_included_property_ids : null
  const propFilter = allow ? `&id=in.(${allow.join(',')})` : ''
  const props = (await get(`pms_properties?select=id,name,bedrooms,is_active,address&tenant_id=eq.${tenantId}${propFilter}&limit=1000`))
    .filter(p => p.is_active !== false)
  if (!props.length) return { available: false, reason: 'No active properties found for this client' }

  const since = add(iso(Date.now()), -800)
  const bookings = await pageAll(get, `pms_bookings?select=property_id,status,check_in,check_out,guests,booked_at`
    + `&tenant_id=eq.${tenantId}&check_out=gte.${since}&property_id=in.(${props.map(p => p.id).join(',')})`)

  return { available: true, provider: pmsConn.provider, lastSync: pmsConn.last_sync_at, syncStatus: pmsConn.sync_status, props, bookings }
}

/**
 * holidays: [{ name, date }] for the coming months.
 * Returns a compact object for the prompt; every number is computed here.
 */
export function pmsInsights({ props, bookings, provider, lastSync, syncStatus }, today, holidays) {
  const propIds = props.map(p => p.id)
  const nights  = new Map(propIds.map(id => [id, new Map()]))   // prop -> night -> { kind, bookedAt }
  const stays   = []
  let noBookedAt = 0

  for (const b of bookings) {
    const kind = STAY.has(b.status) ? 'stay' : BLOCKED.has(b.status) ? 'block' : null
    if (!kind || !b.check_in || !b.check_out || !nights.has(b.property_id)) continue
    const bookedAt = b.booked_at ? b.booked_at.slice(0, 10) : null
    if (kind === 'stay') {
      stays.push({ ...b, bookedAt })
      if (!bookedAt) noBookedAt++
    }
    for (let d = b.check_in; d < b.check_out; d = add(d, 1)) nights.get(b.property_id).set(d, { kind, bookedAt })
  }

  /* A property counts as sellable only from its first stay, so one added
     mid-year does not read as months of empty nights before it existed. */
  const firstNight = new Map()
  for (const s of stays) if (!firstNight.has(s.property_id) || s.check_in < firstNight.get(s.property_id)) firstNight.set(s.property_id, s.check_in)

  /* asOf: count only what was on the books by that date. A booking with no
     booked_at is assumed to have been there, which nudges STLY up slightly. */
  function occupancy(from, to, asOf) {
    let booked = 0, sellable = 0
    for (const id of propIds) {
      const m = nights.get(id), start = firstNight.get(id)
      if (!start) continue
      for (let d = from > start ? from : start; d <= to; d = add(d, 1)) {
        const n = m.get(d)
        const onBooks = n && (!asOf || !n.bookedAt || n.bookedAt <= asOf)
        if (onBooks && n.kind === 'block') continue
        sellable++
        if (onBooks && n.kind === 'stay') booked++
      }
    }
    return { occupancyPct: pct(booked, sellable), bookedNights: booked, sellableNights: sellable }
  }

  const windows = [['0-30 days', 0, 30], ['31-60 days', 31, 60], ['61-90 days', 61, 90], ['91-180 days', 91, 180]].map(([label, a, b]) => {
    const now = occupancy(add(today, a), add(today, b))
    const stly = occupancy(add(today, a - 364), add(today, b - 364), add(today, -364))
    const lyFinal = occupancy(add(today, a - 364), add(today, b - 364))
    return {
      window: label, dates: `${add(today, a)} to ${add(today, b)}`,
      onBooksPct: now.occupancyPct, stlyPct: stly.occupancyPct, lastYearFinalPct: lyFinal.occupancyPct,
      paceVsStlyPts: now.occupancyPct != null && stly.occupancyPct != null ? +(now.occupancyPct - stly.occupancyPct).toFixed(1) : null,
      openNights: now.sellableNights - now.bookedNights,
    }
  })

  const leadOf = (s) => s.bookedAt ? Math.round((ms(s.check_in) - ms(s.bookedAt)) / DAY) : null
  const lastYear = stays.filter(s => s.bookedAt && s.bookedAt >= add(today, -365) && s.bookedAt <= today)
  const leadByStayMonth = {}
  for (const s of stays) {
    if (!s.bookedAt || s.check_in > today) continue
    ;(leadByStayMonth[s.check_in.slice(0, 7)] ||= []).push(leadOf(s))
  }
  const leadTime = {
    medianDaysLast12Months: median(lastYear.map(leadOf)), bookingsUsed: lastYear.length,
    byStayMonth: Object.entries(leadByStayMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-24)
      .map(([month, xs]) => ({ month, medianDays: median(xs), stays: xs.length })),
  }

  const monthly = []
  for (let i = 24; i >= -6; i--) {
    const d = new Date(ms(today)); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i)
    const from = iso(d); const end = new Date(d); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0)
    const o = occupancy(from, iso(end))
    monthly.push({ month: from.slice(0, 7), occupancyPct: o.occupancyPct, status: i > 0 ? 'actual' : i === 0 ? 'this month, on the books' : 'on the books' })
  }
  const last12 = monthly.filter(m => m.status === 'actual').slice(-12).filter(m => m.occupancyPct != null)
  const ranked = [...last12].sort((a, b) => b.occupancyPct - a.occupancyPct)
  const third = Math.ceil(ranked.length / 3)
  const season = Object.fromEntries(ranked.map((m, i) => [m.month.slice(5), i < third ? 'Peak' : i < 2 * third ? 'Shoulder' : 'Low']))

  /* Business level only: how much of the client is open each weekend, never
     which property. A weekend is open for a property when Fri and Sat both are. */
  const openWeekends = []
  for (let i = 0; i <= 60; i++) {
    const d = add(today, i)
    if (new Date(ms(d)).getUTCDay() !== 5) continue
    const open = props.filter(p => !nights.get(p.id).get(d) && !nights.get(p.id).get(add(d, 1))).length
    openWeekends.push({ weekendOf: d, openPct: pct(open, props.length) })
  }

  const holidayNights = (h) => {
    const dow = new Date(ms(h.date)).getUTCDay()
    if (dow === 1) return [add(h.date, -3), add(h.date, -2), add(h.date, -1)]
    if (dow === 4) return [add(h.date, -1), h.date, add(h.date, 1), add(h.date, 2)]
    return [add(h.date, -1), h.date]
  }
  const holidayAvailability = holidays.filter(h => h.date >= today && h.date <= add(today, 270)).map(h => {
    const ns = holidayNights(h)
    const freeProps = props.filter(p => ns.every(d => !nights.get(p.id).get(d))).length
    return { holiday: h.name, nights: ns.join(', '), openPct: pct(freeProps, props.length) }
  })

  const party = stays.filter(s => s.check_in >= add(today, -365)).map(s => s.guests).filter(Number.isFinite)
  const band = (lo, hi) => pct(party.filter(g => g >= lo && g <= hi).length, party.length)
  const firstStay = stays.map(s => s.check_in).sort()[0] || null

  return {
    pmsProvider: provider, lastSync, syncStatus,
    propertyCount: props.length,
    locations: [...new Set(props.map(p => [p.address?.city, p.address?.state].filter(Boolean).join(', ')).filter(Boolean))],
    historyMonths: firstStay ? Math.round((ms(today) - ms(firstStay)) / (30.4 * DAY)) : 0,
    staysWithoutBookedDatePct: pct(noBookedAt, stays.length),
    pace: windows, leadTime, seasonRankLast12Months: season, monthlyOccupancy: monthly,
    openWeekendsNext60Days: openWeekends, holidayAvailability,
    partySize: { medianGuests: median(party), stays: party.length, pct1to2: band(1, 2), pct3to4: band(3, 4), pct5to10: band(5, 10), pct11plus: band(11, 999) },
  }
}

/**
 * Bookings made in the 7 days after each send against the client's usual pace
 * (the daily average over the 28 days before it). Timing, not attribution:
 * sends close together share bookings, and a lift can have other causes.
 */
export function bookingsAfterSends({ bookings }, sends) {
  const madeOn = bookings.filter(b => STAY.has(b.status) && b.booked_at).map(b => b.booked_at.slice(0, 10)).sort()
  const countBetween = (from, to) => {
    let lo = 0, hi = madeOn.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (madeOn[m] < from) lo = m + 1; else hi = m }
    let n = 0
    for (let i = lo; i < madeOn.length && madeOn[i] <= to; i++) n++
    return n
  }
  const first = madeOn[0]
  const out = {}
  for (const s of sends) {
    if (!first || add(s.date, -28) < first || add(s.date, 6) > iso(Date.now())) continue
    const after = countBetween(s.date, add(s.date, 6))
    const usual = +(countBetween(add(s.date, -28), add(s.date, -1)) / 4).toFixed(1)
    out[s.id] = { bookings7d: after, usual7d: usual, lift: usual ? +(after / usual).toFixed(2) : null }
  }
  return out
}
