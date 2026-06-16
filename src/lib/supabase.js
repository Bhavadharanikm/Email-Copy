import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://vdonazmwxzucdxduzfhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkb25hem13eHp1Y2R4ZHV6ZmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjM2NjIsImV4cCI6MjA4NTczOTY2Mn0.D0RfgvzXR6uoraYT01tKTLX7152cuZ74LZUd4Tlt42o'
)

export const TABLE = 'Email Content Calendar'

// ── Row ↔ App object converters ───────────────────────────────────────────────

export function rowToIdea(row) {
  return {
    id:           String(row.id),
    clientName:   row.client_name   || '',
    subject:      row.subject       || '',
    campaignType: row.campaign_type || '',
    theme:        row.theme         || '',
    sendMonth:    row.send_month    || '',
    hook:         row.hook          || '',
    status:       row.idea_status   || 'pending',
    scheduledDate:row.calendar_date || null,
    sendDate:     row.calendar_date || '',
    sendTime:     row.send_time     || '',
    changedBy:    row.changed_by    || '',
    priority:     row.priority      || 'medium',
    entryStatus:  row.entry_status  || null,
  }
}

export function rowToEntry(row) {
  return {
    id:         String(row.id),
    clientName: row.client_name  || '',
    subject:    row.subject      || '',
    status:     row.entry_status || 'draft',
    notes:      row.hook         || '',
    date:       row.calendar_date|| '',
    sendDate:   row.calendar_date|| '',
    sendTime:   row.send_time    || '',
    changedBy:  row.changed_by   || '',
  }
}

export function ideaToRow(idea) {
  return {
    client_name:   idea.clientName   || null,
    subject:       idea.subject      || null,
    campaign_type: idea.campaignType || null,
    theme:         idea.theme        || null,
    send_month:    idea.sendMonth    || null,
    hook:          idea.hook         || null,
    idea_status:   idea.status       || 'pending',
    priority:      idea.priority     || 'medium',
    send_time:     idea.sendTime     || null,
    changed_by:    idea.changedBy    || null,
    calendar_date: idea.scheduledDate|| null,
    entry_status:  idea.entryStatus  || null,
    updated_at:    new Date().toISOString(),
  }
}

export function entryToRow(entry) {
  return {
    client_name:  entry.clientName || null,
    subject:      entry.subject    || null,
    hook:         entry.notes      || null,
    entry_status: entry.status     || 'draft',
    calendar_date:entry.date       || entry.sendDate || null,
    send_time:    entry.sendTime   || null,
    changed_by:   entry.changedBy  || null,
    updated_at:   new Date().toISOString(),
  }
}
