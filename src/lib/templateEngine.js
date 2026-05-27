/**
 * templateEngine.js
 * Merges generated copy + selected images into the client's HTML template.
 *
 * Template variables use double-curly syntax: {{VARIABLE_NAME}}
 *
 * Supported variables:
 *   {{SUBJECT_LINE}}     {{PREVIEW_TEXT}}
 *   {{HEADLINE_TEXT}}    {{BODY_TEXT}}
 *   {{CTA_TEXT}}         {{CTA_URL}}
 *   {{IMAGE_1_URL}}      {{IMAGE_2_URL}}    {{IMAGE_3_URL}}
 *   {{BRAND_COLOR}}      {{ACCENT_COLOR}}
 *   {{LOGO_URL}}         {{CURRENT_YEAR}}
 */

/**
 * @param {string} templateHtml  - Raw HTML from the client config
 * @param {object} copy          - generatedCopy from the store
 * @param {Array}  images        - selectedImages from the store [{ url }]
 * @param {object} brand         - client.brand object
 * @returns {string}             - Rendered HTML ready for preview and GHL push
 */
export function renderTemplate(templateHtml, copy, images = [], brand = {}) {
  if (!templateHtml) return '<p style="color:red">No HTML template configured for this client.</p>'

  const vars = {
    SUBJECT_LINE:   copy.subjectLine   || '',
    PREVIEW_TEXT:   copy.previewText   || '',
    HEADLINE_TEXT:  copy.headlineText  || '',
    BODY_TEXT:      copy.bodyText      || '',
    CTA_TEXT:       copy.ctaText       || 'Book Now',
    CTA_URL:        copy.ctaUrl        || '#',
    IMAGE_1_URL:    images[0]?.url     || '',
    IMAGE_2_URL:    images[1]?.url     || '',
    IMAGE_3_URL:    images[2]?.url     || '',
    BRAND_COLOR:    brand.primaryColor || '#000000',
    ACCENT_COLOR:   brand.accentColor  || '#ffffff',
    LOGO_URL:       brand.logoUrl      || '',
    CURRENT_YEAR:   String(new Date().getFullYear()),
  }

  return templateHtml.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  })
}

/**
 * Returns a list of all {{VARIABLE}} placeholders found in a template.
 * Useful for debugging incomplete templates.
 */
export function detectUnfilledVars(renderedHtml) {
  const matches = renderedHtml.match(/\{\{\w+\}\}/g)
  return matches ? [...new Set(matches)] : []
}
