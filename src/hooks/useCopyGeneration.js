/**
 * useCopyGeneration
 * Option B — async with polling.
 *
 * Flow:
 *   1. POST /generate-copy  → get { jobId } back in < 1s
 *   2. Show spinner ("n8n is writing your copy…")
 *   3. Poll /copy-callback?jobId=XXX every 2s
 *   4. When status === 'done', put copy into store and advance to step 3
 *
 * n8n has no time pressure — it can take 35–45s, no problem.
 */
import { useCallback } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { generateCopy, logToSheets } from '../lib/api'

const POLL_INTERVAL_MS  = 2_000   // poll every 2 seconds
const POLL_MAX_ATTEMPTS = 90      // give up after 3 minutes (90 × 2s)

async function pollForResult(jobId) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const res  = await fetch(`/.netlify/functions/copy-callback?jobId=${encodeURIComponent(jobId)}`)
    const data = await res.json()

    if (data.status === 'done')  return data.copy
    if (data.status === 'error') throw new Error(data.error || 'n8n workflow failed')
    // status === 'pending' → keep polling
  }
  throw new Error('Copy generation timed out after 3 minutes. Check your n8n workflow logs.')
}

export function useCopyGeneration() {
  const { setVariations, setGeneratedCopy, setGenerating, setError, setStep, selectedClient } = useCampaignStore((s) => ({
    setVariations:    s.setVariations,
    setGeneratedCopy: s.setGeneratedCopy,
    setGenerating:    s.setGenerating,
    setError:         s.setError,
    setStep:          s.setStep,
    selectedClient:   s.selectedClient,
  }))

  const generate = useCallback(async ({ client, prompt }) => {
    setGenerating(true)
    setError(null)

    try {
      // Step 1 — trigger n8n, get jobId back immediately
      // Falls back to stub if Netlify functions aren't running (local Vite dev)
      let jobId, _stub
      try {
        const res = await generateCopy({ client, prompt })
        jobId = res.jobId
        _stub = res._stub
      } catch {
        _stub = true   // Netlify functions not running — use stub variations
      }

      // Step 2 — if stub mode, inject 3 mock variations and skip polling
      if (_stub) {
        setVariations([
          {
            id: 1, name: 'The Countdown Frame',
            subjectLine:     `Summer weekends are filling up — have you grabbed yours yet? 🌲`,
            previewText:     `Couples are trading busy summers for quiet mountain mornings at ${client.name}.`,
            headlineText:    'Your Summer Weekend Is Still Out There.',
            subhead:         `For couples who keep meaning to plan something, ${client.name} is where that decision finally lands.`,
            bodyText:        `You keep saying this will be the summer you actually slow down together. The deck is ready. The hot tub is warm.\n\nSomewhere in the mountains, a private cabin is waiting for the two of you to show up with nothing on the schedule.`,
            bodyBlock2Title: "The Best Dates Don't Wait Around",
            bodyBlock2:      `A handful of summer weekends are still open at ${client.name}. The couples who check now are the ones who actually get to go.`,
            ctaText:         'Check Available Dates',
            ctaUrl:          'https://example.com/book',
            closingLine:     "You've been saying you'll plan something all summer — now's a good time to actually do it.",
          },
          {
            id: 2, name: 'The Shared Moment',
            subjectLine:     'When did you last have a weekend that was just the two of you?',
            previewText:     `Couples are finding that ${client.name} gives them back what busy summers take away.`,
            headlineText:    'One Weekend Can Change Everything.',
            subhead:         `For couples ready to press pause, ${client.name} is where the summer finally delivers.`,
            bodyText:        `No group chat. No obligations. Just the two of you, a wraparound deck with the mountains stretching out in front of you.\n\nSleep in. Step outside. Let the morning do its thing.`,
            bodyBlock2Title: 'The Summer Moment You Keep Almost Planning',
            bodyBlock2:      `A few weekends are still open. Two people, one cabin, and the kind of quiet that actually restores something.`,
            ctaText:         'Find Your Weekend',
            ctaUrl:          'https://example.com/book',
            closingLine:     'The weekend you keep talking about is still available — go ahead and make it real.',
          },
          {
            id: 3, name: 'Permission to Slip Away',
            subjectLine:     "You've been putting this off long enough.",
            previewText:     `Couples at ${client.name} are finally taking the summer trip they kept rescheduling.`,
            headlineText:    "Go Ahead. You've Earned This.",
            subhead:         `For couples stuck in the same summer routine, ${client.name} is the reset that's been waiting.`,
            bodyText:        `There's always a reason to wait. A busy stretch at work, a weekend that fills itself before you make a move.\n\nSink into the hot tub under the trees. Pull the chairs close to the fire pit. Let the floor-to-ceiling windows frame the mountains.`,
            bodyBlock2Title: 'You Deserve More Than Another Busy Weekend',
            bodyBlock2:      `The best ${client.name} summer dates are still open — but they're moving. Give yourself the one thing the summer keeps getting in the way of.`,
            ctaText:         'Reserve Your Cabin',
            ctaUrl:          'https://example.com/book',
            closingLine:     "You don't need a special occasion to book this — needing a break is reason enough.",
          },
        ])
        setStep(3)
        return
      }

      // Step 3 — poll until n8n delivers the copy (handles 35–45s easily)
      const result = await pollForResult(jobId)

      // n8n returns { variations: [...] } — store all 3, default to first
      if (result.variations?.length) {
        setVariations(result.variations)

        // Log all 3 variations to Google Sheet (non-blocking)
        logToSheets({ client: selectedClient, variations: result.variations })
          .catch(e => console.warn('[useCopyGeneration] Sheet log failed (non-fatal):', e.message))
      } else {
        // Fallback: n8n returned flat copy object (no variations)
        setGeneratedCopy(result)
      }
      setStep(3)

    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }, [setGeneratedCopy, setGenerating, setError, setStep])

  return { generate }
}
