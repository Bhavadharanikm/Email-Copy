/**
 * Paste this into the n8n Code node (JavaScript) that sits AFTER
 * your AI copywriting agent and BEFORE the HTTP Request callback node.
 *
 * Handles the AI output format:
 *   VARIATION 1 — NAME
 *   **Subject Line**
 *   The actual subject line text
 *   ...
 *   ---
 *   VARIATION 2 — NAME
 *   ...
 */

const text = $input.first().json.text || $input.first().json.output || ''
const jobId = $('Webhook1').first().json.body?.jobId || null

function parseVariation(block) {
  function extract(label) {
    // Matches **Label** followed by content on next line(s)
    // Stops at the next **Label** or end of block
    const regex = new RegExp(
      `\\*\\*${label}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\n?\\*\\*|$)`,
      'i'
    )
    const match = block.match(regex)
    return match ? match[1].trim() : ''
  }

  return {
    subjectLine:     extract('Subject Line'),
    previewText:     extract('Preview Text'),
    headlineText:    extract('Hero Headline'),
    subhead:         extract('Subhead'),
    bodyText:        extract('Body'),
    bodyBlock2Title: extract('Body Block 2 Title'),
    bodyBlock2:      extract('Body Block 2'),
    ctaText:         extract('CTA'),
    ctaUrl:          '',   // filled in per-client in GHL
    closingLine:     extract('Closing Line'),
  }
}

// Split on --- or *** separators, keep only blocks that contain a VARIATION header
const blocks = text
  .split(/\n---\n|\n\*\*\*\n|\*\*\*/)
  .map(b => b.trim())
  .filter(b => /VARIATION\s+\d+/i.test(b))

const variations = blocks.map((block, i) => {
  const nameMatch = block.match(/VARIATION\s+\d+\s*[—\-]+\s*([^\n*]+)/i)
  return {
    id:   i + 1,
    name: nameMatch ? nameMatch[1].trim() : `Variation ${i + 1}`,
    ...parseVariation(block),
  }
})

return [{
  json: {
    jobId,
    variations,
    generatedAt: new Date().toISOString(),
  }
}]
