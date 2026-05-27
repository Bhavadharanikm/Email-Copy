/**
 * TemplatePreview
 * Step 4 — live preview of the filled HTML email in an iframe.
 * Fetches the client's HTML template from /public/templates/{key}.html,
 * then merges copy + images using templateEngine.
 */
import { useEffect, useState } from 'react'
import { useCampaignStore }    from '../store/campaignStore'
import { renderTemplate, detectUnfilledVars } from '../lib/templateEngine'

// Map client ID → template file in /public/templates/
const TEMPLATE_FILES = {
  c1: '/templates/flohom.html',
  c2: null,
  c3: null,
}

export default function TemplatePreview() {
  const [loadingTpl, setLoadingTpl] = useState(false)

  const {
    selectedClient,
    generatedCopy,
    selectedImages,
    renderedHtml,
    setRenderedHtml,
  } = useCampaignStore((s) => ({
    selectedClient:  s.selectedClient,
    generatedCopy:   s.generatedCopy,
    selectedImages:  s.selectedImages,
    renderedHtml:    s.renderedHtml,
    setRenderedHtml: s.setRenderedHtml,
  }))

  useEffect(() => {
    const templateFile = TEMPLATE_FILES[selectedClient?.id]

    if (!templateFile) {
      // No template file — render from inline emailTemplateHtml or show placeholder
      const html = renderTemplate(
        selectedClient?.emailTemplateHtml || '',
        generatedCopy,
        selectedImages,
        selectedClient?.brand || {}
      )
      setRenderedHtml(html)
      return
    }

    // Fetch HTML template from /public/templates/
    setLoadingTpl(true)
    fetch(templateFile)
      .then(r => r.text())
      .then(templateHtml => {
        const html = renderTemplate(templateHtml, generatedCopy, selectedImages, selectedClient?.brand || {})
        setRenderedHtml(html)
      })
      .catch(() => setRenderedHtml('<p style="padding:40px;color:#888;text-align:center;">Failed to load template.</p>'))
      .finally(() => setLoadingTpl(false))

  }, [selectedClient, generatedCopy, selectedImages])

  const unfilled = detectUnfilledVars(renderedHtml)

  return (
    <div className="space-y-3">

      {loadingTpl && (
        <p className="text-sm text-gray-400 text-center py-4">Loading template…</p>
      )}

      {unfilled.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Unfilled placeholders:</strong> {unfilled.join(', ')}
        </div>
      )}

      {/* Email preview iframe */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-gray-400 ml-2">Email Preview — {selectedClient?.name}</span>
        </div>
        <iframe
          title="Email Preview"
          srcDoc={renderedHtml}
          className="w-full"
          style={{ height: '700px', border: 'none' }}
          sandbox="allow-same-origin"
        />
      </div>

    </div>
  )
}
