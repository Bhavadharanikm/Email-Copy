/**
 * GET /.netlify/functions/clients
 * Returns the list of agency clients from clients/clients.json.
 * In production you could swap this for a database read.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const __dirname = '/Users/Pooja/Documents/Email Copywriting Automation'

export const handler = async () => {
  try {
    const filePath = join(__dirname, 'clients/clients.json')
    const data = JSON.parse(readFileSync(filePath, 'utf8'))

    // Strip sensitive fields before sending to the browser
    const safe = data.map(({ id, name, brand, googleDrive, ghl }) => ({
      id,
      name,
      brand: {
        primaryColor: brand?.primaryColor,
        accentColor:  brand?.accentColor,
        logoUrl:      brand?.logoUrl,
        voice:        brand?.voice,
        tone:         brand?.tone,
        fonts:        brand?.fonts,
      },
      googleDrive: { folderId: googleDrive?.folderId },
      ghl: { locationId: ghl?.locationId, templateId: ghl?.templateId },
      // emailTemplateHtml is intentionally included so the frontend can render previews
      emailTemplateHtml: data.find((c) => c.id === id)?.emailTemplateHtml || '',
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safe),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
