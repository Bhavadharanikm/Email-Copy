# n8n Workflow Blueprint — Email Copy Generation

## Option A (Sync — recommended)

The dashboard POSTs to your n8n webhook and **waits for the response**.
n8n must complete and respond within **25 seconds**.

### Node sequence

```
[Webhook] → [Set / Format Prompt] → [AI Agent / LLM] → [Format Output] → [Respond to Webhook]
```

### 1. Webhook node
- Method: POST  
- Path: `generate-email-copy`  
- Authentication: Header Auth → `x-webhook-secret: YOUR_SECRET` (optional but recommended)
- Response mode: **Using "Respond to Webhook" node** ← critical

### 2. Set node — build the AI prompt
Use expressions to pull fields from the webhook body:

```
clientName   = {{ $json.clientName }}
brandVoice   = {{ $json.brandVoice }}
emailType    = {{ $json.emailType }}
goal         = {{ $json.goal }}
tone         = {{ $json.tone }}
offer        = {{ $json.offer }}
doNotUse     = {{ $json.doNotUse.join(', ') }}
```

Combine into a prompt string:
```
You are a professional email copywriter for {{ $json.clientName }}.

Brand voice: {{ $json.brandVoice }}
Do NOT use these words: {{ $json.doNotUse }}

Write an email campaign with:
- Type: {{ $json.emailType }}
- Goal: {{ $json.goal }}
- Tone: {{ $json.tone }}
- Offer/Hook: {{ $json.offer }}

Return ONLY valid JSON with these exact keys:
{
  "subjectLine":  "...",
  "previewText":  "...",
  "headlineText": "...",
  "bodyText":     "...",
  "ctaText":      "...",
  "ctaUrl":       "..."
}
```

### 3. AI Agent or LLM node
- Connect to Claude (via Anthropic), OpenAI, or any LLM you use
- Set response format to JSON

### 4. Code node — parse + validate (optional but safe)
```javascript
const raw = $input.first().json.text || $input.first().json.content
const copy = typeof raw === 'string' ? JSON.parse(raw) : raw

const required = ['subjectLine','previewText','headlineText','bodyText','ctaText','ctaUrl']
for (const key of required) {
  if (!copy[key]) throw new Error(`Missing field: ${key}`)
}

return [{ json: copy }]
```

### 5. Respond to Webhook node
- Response code: 200
- Response body: `{{ JSON.stringify($json) }}`
- Content-Type: `application/json`

---

## Option B (Async — for workflows > 25s)

Use this if your AI workflow is slow (multiple agents, RAG, etc.).

### Node sequence
```
[Webhook] → [Respond immediately with jobId] → [AI nodes] → [HTTP Request → /copy-callback]
```

### 1. Webhook node
- Same as Option A but Response mode: **Immediately**

### 2. Respond to Webhook node (right after Webhook)
Return a jobId immediately:
```json
{ "jobId": "{{ $workflow.id }}_{{ $now.toMillis() }}" }
```

### 3. Your AI nodes (run in background)

### 4. HTTP Request node — POST back to the dashboard
- Method: POST
- URL: `https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/copy-callback`
- Body:
```json
{
  "jobId":       "{{ the same jobId from step 2 }}",
  "subjectLine": "{{ $json.subjectLine }}",
  "previewText": "{{ $json.previewText }}",
  "headlineText":"{{ $json.headlineText }}",
  "bodyText":    "{{ $json.bodyText }}",
  "ctaText":     "{{ $json.ctaText }}",
  "ctaUrl":      "{{ $json.ctaUrl }}"
}
```

---

## Payload the dashboard sends to n8n

```json
{
  "clientId":   "client_001",
  "clientName": "Example Boutique Hotel",
  "brandVoice": "Warm, elegant, aspirational...",
  "brandTone":  "Conversational but refined",
  "doNotUse":   ["cheap", "deal", "sale"],
  "emailType":  "Promotional",
  "goal":       "Drive bookings for Valentine's weekend",
  "tone":       "Soft & Romantic",
  "offer":      "15% off + complimentary breakfast",
  "notes":      ""
}
```

## Expected response from n8n

```json
{
  "subjectLine":  "Escape Together This Valentine's Day 💌",
  "previewText":  "A cozy retreat for two, thoughtfully planned",
  "headlineText": "Your perfect romantic escape awaits",
  "bodyText":     "February is the perfect time...",
  "ctaText":      "Reserve Your Stay →",
  "ctaUrl":       "https://example.com/book"
}
```
