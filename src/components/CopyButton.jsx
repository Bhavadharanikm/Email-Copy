/**
 * CopyButton — copies one line of text (a subject line, a preview line) to
 * the clipboard, and says "Copied" for a moment. Used on the approve screens
 * of the weekly, welcome-flow and repeat-booking pipelines.
 */
import { useState } from 'react'

export default function CopyButton({ text, dark }) {
  const [state, setState] = useState('idle')   // idle | copied | failed
  async function copy() {
    try {
      await navigator.clipboard.writeText(text || '')
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 1600)
  }
  return (
    <button onClick={copy} disabled={!text} title={text ? 'Copy to clipboard' : 'Nothing to copy'}
      style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
        cursor: text ? 'pointer' : 'default', opacity: text ? 1 : 0.5, lineHeight: 1.5,
        background: state === 'copied' ? (dark ? 'rgba(52,211,153,0.18)' : '#dcfce7') : (dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'),
        color: state === 'copied' ? (dark ? '#34d399' : '#15803d') : state === 'failed' ? '#dc2626' : (dark ? 'rgba(255,255,255,0.8)' : '#374151'),
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : 'Copy'}
    </button>
  )
}
