/**
 * Paste this into an n8n Code node (JavaScript) placed AFTER your
 * final "Create a message" node and BEFORE the HTTP Request callback node.
 *
 * It parses the AI output text into 3 clean variation objects.
 */

const text = $input.first().json.text || $input.first().json.output || ''
const jobId = $('Webhook1').first().json.body?.jobId || null

function parseVariation(block) {
  function extract(label) {
    // Matches *Label*\nContent up to the next *Label* or end
    const regex = new RegExp(`\\*${label}\\*\\n([\\s\\S]*?)(?=\\n\\n\\*[A-Z]|\\n\\*[A-Z]|$)`)
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
    ctaUrl:          '',   // fill in GHL booking URL per client
    closingLine:     extract('Closing Line'),
  }
}

// Split the full text into variation blocks on the *** separator
const blocks = text.split(/\*\*\*/).map(b => b.trim()).filter(Boolean)

const variations = blocks.map((block, i) => {
  const nameMatch = block.match(/VARIATION \d+ — ([^\*\n]+)/)
  return {
    id:   i + 1,
    name: nameMatch ? nameMatch[1].trim() : `Variation ${i + 1}`,
    ...parseVariation(block),
  }
})

return [{
  json: {
    jobId,
    variations,          // array of 3 variation objects
    generatedAt: new Date().toISOString(),
  }
}]
