/**
 * TemplatePreview
 * Step 5 — live preview of the rendered HTML template in an iframe.
 * Uses templateEngine.renderTemplate() to merge copy + images into the client's HTML.
 */
import { useEffect } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { renderTemplate, detectUnfilledVars } from '../lib/templateEngine'

export default function TemplatePreview() {
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

  // Re-render whenever inputs change
  useEffect(() => {
    const html = renderTemplate(
      selectedClient?.emailTemplateHtml || '',
      generatedCopy,
      selectedImages,
      selectedClient?.brand || {}
    )
    setRenderedHtml(html)
  }, [selectedClient, generatedCopy, selectedImages])

  const unfilled = detectUnfilledVars(renderedHtml)

  return (
    <div className="space-y-3">
      {unfilled.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>Unfilled placeholders:</strong> {unfilled.join(', ')}
        </div>
      )}

      {/* Desktop / mobile toggle could go here in future */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-gray-400 ml-2">Email Preview</span>
        </div>
        <iframe
          title="Email Preview"
          srcDoc={renderedHtml}
          className="w-full"
          style={{ height: '640px', border: 'none' }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}
