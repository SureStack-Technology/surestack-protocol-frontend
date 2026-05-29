/**
 * Optional internal FastAPI narrator — falls back to OpenAI.
 * Structured findings in, short institutional copy out (single paragraph).
 *
 * @param {Array<{ code: string, severity: string, title: string, detail: string }>} findings
 * @param {string | undefined} apiKey
 * @returns {Promise<string | null>}
 */
export async function buildNarrative(findings, apiKey) {
  if (!findings?.length) return null

  const safe = findings.slice(0, 8).map((f) => ({
    code: f.code,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
  }))

  const internalBase = String(process.env.INTERNAL_AI_SERVICE_URL || '').trim().replace(/\/$/, '')
  if (internalBase) {
    try {
      const res = await fetch(`${internalBase}/v1/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.INTERNAL_AI_SERVICE_TOKEN
            ? { 'x-internal-token': process.env.INTERNAL_AI_SERVICE_TOKEN }
            : {}),
        },
        body: JSON.stringify({ findings: safe, product: 'wallet_risk' }),
      })
      if (res.ok) {
        const j = await res.json().catch(() => ({}))
        const text = String(j?.narrative || j?.summary || '').trim()
        if (text) return text
      }
    } catch {
      /* fallthrough */
    }
  }

  if (!apiKey) return null

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.35,
    max_tokens: 180,
    messages: [
      {
        role: 'system',
        content:
          'You are SureStack risk intelligence copy. Write one concise paragraph (max 3 sentences) summarizing ONLY the provided findings JSON. Do not invent numbers, contracts, or approvals. Use institutional tone. If findings are only INFO, say the wallet profile is still stabilizing.',
      },
      {
        role: 'user',
        content: JSON.stringify(safe),
      },
    ],
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    console.warn('[walletRiskNarrative] OpenAI error', res.status, t.slice(0, 200))
    return null
  }

  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content?.trim()
  return text || null
}
