/**
 * templateEngine.js
 * Merges generated copy + selected images into the client's HTML template.
 *
 * Template variables use double-bracket syntax: [[VARIABLE_NAME]]
 * (avoids conflict with GHL's own {{ brandboards.* }} variables)
 *
 * Supported variables:
 *   [[PREVIEW_TEXT]]       [[HEADLINE_TEXT]]      [[SUBHEAD]]
 *   [[BODY_TEXT]]          [[BODY_BLOCK_2_TITLE]] [[BODY_BLOCK_2]]
 *   [[CLOSING_LINE]]       [[CTA_TEXT]]           [[CTA_URL]]
 *   [[HERO_IMAGE_URL]]     [[IMAGE_2_URL]]        [[IMAGE_3_URL]]
 *   [[BRAND_COLOR]]        [[ACCENT_COLOR]]       [[LOGO_URL]]
 *   [[CURRENT_YEAR]]
 */

/**
 * @param {string} templateHtml  - Raw HTML (loaded from /public/templates/*.html)
 * @param {object} copy          - generatedCopy from the store
 * @param {Array}  images        - selectedImages from the store [{ url }]
 * @param {object} brand         - client.brand object
 * @returns {string}             - Rendered HTML ready for preview and GHL push
 */
export function renderTemplate(templateHtml, copy, images = [], brand = {}) {
  if (!templateHtml) return '<p style="padding:40px;color:#888;text-align:center;">No HTML template configured for this client.</p>'

  // Build optional body block 2 section
  const block2Section = copy.bodyBlock2Title ? `
    <tr>
      <td align="left" style="font-size:0px;padding:12px 32px 4px 32px;word-break:break-word;">
        <div style="font-family:arial,helvetica,sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;">
          <p style="margin:0;line-height:1.5;">
            <span style="font-size:18px;font-family:arial,helvetica,sans-serif;font-weight:600;">${copy.bodyBlock2Title}</span>
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td align="left" style="font-size:0px;padding:4px 32px 12px 32px;word-break:break-word;">
        <div style="font-family:arial,helvetica,sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;">
          <p style="margin:0;line-height:1.6;">
            <span style="font-size:16px;font-family:arial,helvetica,sans-serif;">${copy.bodyBlock2 || ''}</span>
          </p>
        </div>
      </td>
    </tr>` : ''

  const vars = {
    PREVIEW_TEXT:        copy.previewText      || '',
    HEADLINE_TEXT:       copy.headlineText     || '',
    SUBHEAD:             copy.subhead          || '',
    BODY_TEXT:           (copy.bodyText || '').replace(/\n/g, '<br>'),
    BODY_BLOCK_2_SECTION: block2Section,
    BODY_BLOCK_2_TITLE:  copy.bodyBlock2Title  || '',
    BODY_BLOCK_2:        copy.bodyBlock2       || '',
    CLOSING_LINE:        copy.closingLine      || '',
    CTA_TEXT:            copy.ctaText          || 'Book Now',
    CTA_URL:             copy.ctaUrl           || '#',
    HERO_IMAGE_URL:      images[0]?.url        || '',
    IMAGE_2_URL:         images[1]?.url        || '',
    IMAGE_3_URL:         images[2]?.url        || '',
    BRAND_COLOR:         brand.primaryColor    || '#2D6A4F',
    ACCENT_COLOR:        brand.accentColor     || '#B7E4C7',
    LOGO_URL:            brand.logoUrl         || '',
    CURRENT_YEAR:        String(new Date().getFullYear()),
  }

  return templateHtml.replace(/\[\[(\w+)\]\]/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  })
}

/**
 * Returns a list of all [[VARIABLE]] placeholders still unfilled in the rendered HTML.
 */
export function detectUnfilledVars(renderedHtml) {
  const matches = renderedHtml.match(/\[\[\w+\]\]/g)
  return matches ? [...new Set(matches)] : []
}
