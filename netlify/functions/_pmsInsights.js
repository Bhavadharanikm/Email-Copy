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

/* Days when far more bookings were "made" than any real day sees: a PMS import
   or migration stamping its own date on old bookings (Home Base has 1,196 on
   one day). Those booked dates are not real, so they are treated as unknown. */
function importDays(bookings) {
  const perDay = {}
  for (const b of bookings) if (STAY.has(b.status) && b.booked_at) { const d = b.booked_at.slice(0, 10); perDay[d] = (perDay[d] || 0) + 1 }
  const counts = Object.values(perDay).sort((a, b) => a - b)
  if (!counts.length) return new Set()
  const typical = counts[Math.floor(counts.length / 2)]
  const limit = Math.max(25, typical * 10)
  return new Set(Object.entries(perDay).filter(([, n]) => n > limit).map(([d]) => d))
}
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const ms  = (d) => Date.parse(d + 'T00:00:00Z')
const add = (d, n) => iso(ms(d) + n * DAY)
/* The lead time by which the earliest quarter of guests had booked (75th
   percentile of days ahead). */
const earlyPlanners = (xs) => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b)
  return v.length ? v[Math.min(v.length - 1, Math.floor(0.75 * (v.length - 1) + 0.5))] : null
}
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
export function pmsInsights({ props, bookings, provider, lastSync, syncStatus }, today, holidays, holidaysLastYear = [], holidaysTwoYearsAgo = []) {
  const propIds = props.map(p => p.id)
  const nights  = new Map(propIds.map(id => [id, new Map()]))   // prop -> night -> { kind, bookedAt }
  const stays   = []
  let noBookedAt = 0

  const imported = importDays(bookings)
  for (const b of bookings) {
    const kind = STAY.has(b.status) ? 'stay' : BLOCKED.has(b.status) ? 'block' : null
    if (!kind || !b.check_in || !b.check_out || !nights.has(b.property_id)) continue
    const bookedAt = b.booked_at && !imported.has(b.booked_at.slice(0, 10)) ? b.booked_at.slice(0, 10) : null
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
  /* The brain doc's seasons: each calendar month's own occupancy over the last
     24 months where there is history (one year's figure where there is only
     one), ranked into thirds. */
  const byCalMonth = {}
  for (const m of monthly.filter(x => x.status === 'actual' && x.occupancyPct != null)) (byCalMonth[m.month.slice(5)] ||= []).push(m.occupancyPct)
  const ranked = Object.entries(byCalMonth).map(([mm, xs]) => ({ mm, avg: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1), years: xs.length }))
    .sort((a, b) => b.avg - a.avg)
  const third = Math.ceil(ranked.length / 3)
  const season = Object.fromEntries(ranked.map((m, i) => [m.mm, { season: i < third ? 'Peak' : i < 2 * third ? 'Shoulder' : 'Low', avgOccupancyPct: m.avg, years: m.years }]))

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

  /* Did guests actually book around each holiday last year? Occupancy on last
     year's holiday nights against the same weekday nights 1-3 weeks either side. */
  function occupancyOf(dates) {
    let booked = 0, sellable = 0
    for (const id of propIds) {
      const m = nights.get(id), start = firstNight.get(id)
      for (const d of dates) {
        if (!start || d < start) continue
        const n = m.get(d)
        if (n?.kind === 'block') continue
        sellable++
        if (n?.kind === 'stay') booked++
      }
    }
    return pct(booked, sellable)
  }
  const holidayHistory = holidayAvailability.map(h => {
    const ly = holidaysLastYear.find(x => x.name === h.holiday)
    if (!ly) return { holiday: h.holiday, lastYear: null }
    const ns = holidayNights(ly)
    const around = ns.flatMap(d => [-21, -14, -7, 7, 14, 21].map(k => add(d, k))).filter(d => !ns.includes(d))
    const onHoliday = occupancyOf(ns), normal = occupancyOf(around)
    return { holiday: h.holiday, lastYearNights: ns.join(', '), lastYearOccupancyPct: onHoliday, sameWeekdaysAroundPct: normal,
      liftPts: onHoliday != null && normal != null ? +(onHoliday - normal).toFixed(1) : null }
  })

  const party = stays.filter(s => s.check_in >= add(today, -365)).map(s => s.guests).filter(Number.isFinite)
  const band = (lo, hi) => pct(party.filter(g => g >= lo && g <= hi).length, party.length)
  const firstStay = stays.map(s => s.check_in).sort()[0] || null
  const historyMonths = firstStay ? Math.round((ms(today) - ms(firstStay)) / (30.4 * DAY)) : 0

  /* Step 1 of the brain doc, worked out here so every suggestion uses the same
     window: the client's annual median lead time, or last year's lead time for
     the stay months now being promoted when that differs by more than 25%
     (HiddenGem's reading of "differs a lot"); the audience benchmark midpoint
     under 12 months of history. Promote stays out to 1.5x the lead time. */
  const annual = leadTime.medianDaysLast12Months
  let bookingWindow
  if (historyMonths < 12 || annual == null) {
    const g = median(party)
    const [audience, days] = g == null ? ['Couples / Small Stays', 35] : g <= 4 ? ['Couples / Small Stays', 35] : g <= 10 ? ['Families / Mid-Size Groups', 60] : ['Large Groups', 180]
    const early = { 35: 56, 60: 90, 180: 270 }[days]
    bookingWindow = { basis: 'benchmark', reason: `under 12 months of booking history (${historyMonths}), so the ${audience} benchmark (midpoint ${days} days, early planners ${early})`, leadTimeDays: days, earlyPlannersDays: early, annualDays: annual }
  } else {
    const horizon = add(today, Math.round(1.5 * annual))
    const months = []
    for (let d = today.slice(0, 7) + '-01'; d <= horizon; d = iso(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 1))) months.push(d.slice(0, 7))
    /* The same stay months one and two years back, where the history reaches. */
    const lyMonths = [1, 2].flatMap(back => months.map(m => `${+m.slice(0, 4) - back}${m.slice(4)}`))
    const seasonal = stays.filter(x => x.bookedAt && lyMonths.includes(x.check_in.slice(0, 7))).map(leadOf)
    const seasonYears = new Set(stays.filter(x => x.bookedAt && lyMonths.includes(x.check_in.slice(0, 7))).map(x => x.check_in.slice(0, 4))).size
    /* Under 30 stays, a season's median is a handful of bookings, not a pattern. */
    const seasonalDays = seasonal.length >= 30 ? median(seasonal) : null
    const useSeasonal = seasonalDays != null && Math.abs(seasonalDays - annual) / annual > 0.25
    bookingWindow = {
      basis: useSeasonal ? 'seasonal' : 'annual',
      reason: useSeasonal
        ? `the same months in past years (${seasonal.length} stays) booked ${seasonalDays} days out, more than 25% off the annual ${annual}`
        : seasonalDays != null ? `the same months in past years (${seasonal.length} stays) booked ${seasonalDays} days out, within 25% of the annual ${annual}` : `only ${seasonal.length} stays in the same months in past years, too few to read a seasonal lead time`,
      leadTimeDays: useSeasonal ? seasonalDays : annual, annualDays: annual, seasonalDays, seasonalStays: seasonal.length, seasonYears,
      earlyPlannersDays: useSeasonal ? earlyPlanners(seasonal) : earlyPlanners(lastYear.map(leadOf)),
    }
  }
  bookingWindow.promoteThrough = add(today, Math.round(1.5 * bookingWindow.leadTimeDays))

  /* Holiday stays often book further ahead than the year's average, so each
     upcoming holiday gets its own lead time from the stays over that holiday
     in the last one or two years. Under 10 stays it is left to the general one. */
  const holidayLeadTimes = holidayAvailability.map(h => {
    const past = [holidaysLastYear, holidaysTwoYearsAgo].map(list => list.find(x => x.name === h.holiday)).filter(Boolean)
    const pastNights = new Set(past.flatMap(holidayNights))
    const xs = stays.filter(x => x.bookedAt).filter(x => {
      for (let d = x.check_in; d < x.check_out; d = add(d, 1)) if (pastNights.has(d)) return true
      return false
    }).map(leadOf)
    return xs.length >= 10
      ? { holiday: h.holiday, stays: xs.length, years: past.length, medianDays: median(xs), earlyPlannersDays: earlyPlanners(xs) }
      : { holiday: h.holiday, stays: xs.length, years: past.length, medianDays: null, earlyPlannersDays: null }
  })

  return {
    pmsProvider: provider, lastSync, syncStatus,
    propertyCount: props.length,
    locations: [...new Set(props.map(p => [p.address?.city, p.address?.state].filter(Boolean).join(', ')).filter(Boolean))],
    historyMonths, bookingWindow,
    staysWithoutBookedDatePct: pct(noBookedAt, stays.length),
    importDaysIgnored: [...imported].sort(),
    pace: windows, leadTime, seasons: season, monthlyOccupancy: monthly,
    openWeekendsNext60Days: openWeekends, holidayAvailability, holidayHistory, holidayLeadTimes,
    partySize: { medianGuests: median(party), stays: party.length, pct1to2: band(1, 2), pct3to4: band(3, 4), pct5to10: band(5, 10), pct11plus: band(11, 999) },
  }
}

/**
 * Bookings made in the 14 days after each send (one bi-weekly cycle) against
 * the client's usual 14 days (the 28 days before it, halved). Timing, not attribution:
 * sends close together share bookings, and a lift can have other causes.
 */
export function bookingsAfterSends({ bookings }, sends) {
  const imported = importDays(bookings)
  const madeOn = bookings.filter(b => STAY.has(b.status) && b.booked_at).map(b => b.booked_at.slice(0, 10)).filter(d => !imported.has(d)).sort()
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
    if (!first || add(s.date, -28) < first || add(s.date, 13) > iso(Date.now())) continue
    const after = countBetween(s.date, add(s.date, 13))
    const usual = +(countBetween(add(s.date, -28), add(s.date, -1)) / 2).toFixed(1)
    out[s.id] = { bookings14d: after, usual14d: usual, lift: usual ? +(after / usual).toFixed(2) : null }
  }
  return out
}
