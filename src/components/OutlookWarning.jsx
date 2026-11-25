/**
 * OutlookWarning — lists Windows Outlook hazards found in the final HTML, on
 * every approve page. Shows nothing when the HTML is clean.
 */
import { useMemo } from 'react'
import { outlookIssues } from '../lib/outlookCheck'

export default function OutlookWarning({ html, dark, style }) {
  const issues = useMemo(() => outlookIssues(html), [html])
  if (!issues.length) return null
  return (
    <div style={{
      marginTop: 14, padding: '12px 16px', borderRadius: 12,
      border: '1px solid rgba(220,38,38,0.4)',
      background: dark ? 'rgba(220,38,38,0.1)' : 'rgba(254,226,226,0.7)',
      color: dark ? '#fca5a5' : '#991b1b', fontSize: 12.5, lineHeight: 1.5, ...style,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Windows Outlook check: {issues.length} problem{issues.length > 1 ? 's' : ''} found</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {issues.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <div style={{ marginTop: 6, opacity: 0.85 }}>Pushing is not blocked, but this is what the client would see in Outlook on a PC.</div>
    </div>
  )
}
