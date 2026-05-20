import { Resend } from 'resend'

let resendClient = null

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!resendClient) resendClient = new Resend(key)
  return resendClient
}

export async function sendWelcomeEmail({ to, firstName }) {
  const resend = getResend()
  const from = process.env.RESEND_FROM_EMAIL || 'SureStack <onboarding@example.com>'
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping welcome email')
    return { skipped: true }
  }

  const name = firstName || 'there'
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Welcome to SureStack — Explorer Access activated',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="color:#0f172a;">Welcome, ${name}</h1>
        <p>Your SureStack account is ready. You have <strong>Explorer Access</strong> — your free intelligence entry layer with secure account access, optional wallet verification, reference market context, security orientation, and a limited intelligence console preview. Advanced analytics unlock with Prime Intelligence and above when you subscribe.</p>
        <p>Optional wallet verification links your address to your account for future features.</p>
        <p style="color:#64748b;font-size:12px;">SureStack Protocol · Real-Time Risk Intelligence</p>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Resend error:', error)
    throw error
  }
  return { id: data?.id }
}

export async function sendEmailVerifiedNotice({ to }) {
  const resend = getResend()
  const from = process.env.RESEND_FROM_EMAIL || 'SureStack <onboarding@example.com>'
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping verification notice')
    return { skipped: true }
  }

  await resend.emails.send({
    from,
    to,
    subject: 'Email verified — SureStack',
    html: `<p>Your email is verified. Continue onboarding in the Personal Risk Console.</p>`,
  })
}
