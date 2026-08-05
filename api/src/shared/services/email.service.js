import nodemailer from 'nodemailer'
import { env } from '../../config/env.js'
import { logger } from '../utils/logger.js'

let transporter = null

const BREVO_FAIL_EVENTS = new Set(['blocked', 'hardBounces', 'invalid', 'error'])
const BREVO_OK_EVENTS = new Set(['delivered', 'opened', 'clicks', 'uniqueOpened'])

function normalizeFrom(from) {
  if (!from) return 'Marea Jewelry <noreply@marea.com>'
  const cleaned = String(from).trim().replace(/^["']|["']$/g, '')
  return cleaned.replace(/([^\s<])</, '$1 <')
}

function getValidBrevoApiKey() {
  const key = env.email.brevoApiKey?.trim()
  if (!key) return null
  if (key.startsWith('xsmtpsib-')) return null
  return key
}

function parseFrom(from) {
  const normalized = normalizeFrom(from)
  const match = /^(.*?)\s*<(.+)>$/.exec(normalized)
  if (match) return { name: match[1].trim() || 'Marea Jewelry', email: match[2].trim() }
  return { name: 'Marea Jewelry', email: normalized }
}

function formatDeliverabilityError(reason, to) {
  const r = String(reason || '')
  if (r.includes('Gmail') || r.includes('rate limit') || r.includes('unsolicited')) {
    return (
      'Gmail blocked this email (Brevo spam/rate limit). Fix: In Brevo verify your domain (Senders → Domains), ' +
      'set EMAIL_FROM to info@marea.com (not @gmail.com), wait 24 hours, then try again. Also check spam folder.'
    )
  }
  if (r.includes('blocked') || r.includes('550')) {
    return `Email to ${to} was blocked by the mail provider. Verify your sender domain in Brevo.`
  }
  return `Email to ${to} was rejected: ${r.slice(0, 220)}`
}

/** After Brevo accepts (201), poll logs — Gmail often blocks async without failing the API call. */
async function waitForBrevoDelivery({ to, subject, apiKey, sentAtMs }) {
  const deadline = Date.now() + 12_000
  await new Promise((r) => setTimeout(r, 2500))

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `https://api.brevo.com/v3/smtp/statistics/events?email=${encodeURIComponent(to)}&limit=8&sort=desc`,
        { headers: { 'api-key': apiKey, Accept: 'application/json' } },
      )
      if (!res.ok) break

      const data = await res.json()
      const recent = (data.events || []).filter(
        (e) =>
          e.subject === subject &&
          new Date(e.date).getTime() >= sentAtMs - 3000,
      )

      for (const e of recent) {
        if (BREVO_FAIL_EVENTS.has(e.event)) {
          throw new Error(formatDeliverabilityError(e.reason || e.event, to))
        }
        if (e.event === 'deferred' && e.reason) {
          throw new Error(formatDeliverabilityError(e.reason, to))
        }
        if (BREVO_OK_EVENTS.has(e.event)) return
      }
    } catch (err) {
      if (err.message.includes('Gmail') || err.message.includes('blocked') || err.message.includes('rejected')) {
        throw err
      }
    }
    await new Promise((r) => setTimeout(r, 2000))
  }

  const sender = parseFrom(env.email.from)
  if (sender.email.endsWith('@gmail.com') || sender.email.endsWith('@googlemail.com')) {
    throw new Error(formatDeliverabilityError('Gmail blocks @gmail.com senders sent through Brevo', to))
  }
  logger.warn('[Email delivery unconfirmed]', { to, subject })
}

export function getEmailSetupHint() {
  if (env.nodeEnv === 'production') {
    return 'Email is not configured for production. In Railway, set BREVO_API_KEY (xkeysib-...) and EMAIL_FROM (use a verified domain email like info@marea.com, not @gmail.com).'
  }
  return 'Set BREVO_API_KEY (xkeysib-...) or SMTP_* in api/.env'
}

export function isEmailConfigured() {
  if (getValidBrevoApiKey()) return true
  if (env.nodeEnv === 'production') return false
  return Boolean(env.email.host && env.email.user && env.email.pass)
}

export function assertEmailConfigured() {
  const wrongSmtpKey = env.email.brevoApiKey?.trim().startsWith('xsmtpsib-')
  if (wrongSmtpKey) {
    throw new Error(
      'BREVO_API_KEY must be an API key (xkeysib-...), not an SMTP key (xsmtpsib-...). In Brevo open SMTP & API → API Keys tab.',
    )
  }
  if (!isEmailConfigured()) {
    throw new Error(getEmailSetupHint())
  }
  const sender = parseFrom(env.email.from)
  if (getValidBrevoApiKey() && sender.email.endsWith('@gmail.com')) {
    logger.warn(
      '[Email] Using a @gmail.com sender with Brevo often causes Gmail to block delivery. Verify marea.com in Brevo and use info@marea.com as EMAIL_FROM.',
    )
  }
}

function getTransporter() {
  if (!env.email.host) return null
  if (!transporter) {
    const port = Number(env.email.port) || 587
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user: env.email.user, pass: env.email.pass },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
      tls: { minVersion: 'TLSv1.2' },
    })
  }
  return transporter
}

async function sendViaBrevoApi({ to, subject, html, text }) {
  const apiKey = getValidBrevoApiKey()
  if (!apiKey) throw new Error('Brevo API key is missing or invalid')

  const sender = parseFrom(env.email.from)
  const replyTo = env.email.replyTo ? parseFrom(env.email.replyTo) : null
  const sentAtMs = Date.now()

  const payload = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  }
  if (replyTo && replyTo.email !== sender.email) {
    payload.replyTo = { email: replyTo.email, name: replyTo.name }
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = await res.json().catch(() => ({}))
  logger.info('[Email accepted by Brevo]', { to, subject, messageId: json.messageId })

  await waitForBrevoDelivery({ to, subject, apiKey, sentAtMs })
  logger.info('[Email delivered via Brevo API]', { to, subject, messageId: json.messageId })
  return json
}

export async function sendBulkEmails(messages) {
  assertEmailConfigured()
  if (!messages.length) return { sent: 0, failures: [] }

  const apiKey = getValidBrevoApiKey()
  if (apiKey) {
    return sendBulkViaBrevoApi(messages, apiKey)
  }

  let sent = 0
  const failures = []
  for (const msg of messages) {
    try {
      await sendEmail(msg, { retries: 2 })
      sent++
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      failures.push({ email: msg.to, error: err.message })
    }
  }
  return { sent, failures }
}

async function sendBulkViaBrevoApi(messages, apiKey) {
  const sender = parseFrom(env.email.from)
  const CHUNK = 50
  let sent = 0
  const failures = []

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK)
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          subject: chunk[0].subject,
          htmlContent: chunk[0].html,
          textContent: chunk[0].text,
          messageVersions: chunk.map((m) => ({
            to: [{ email: m.to }],
            subject: m.subject,
            htmlContent: m.html,
            textContent: m.text,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const errMsg = `Brevo API ${res.status}: ${body.slice(0, 300)}`
        for (const m of chunk) failures.push({ email: m.to, error: errMsg })
      } else {
        sent += chunk.length
      }
    } catch (err) {
      for (const m of chunk) failures.push({ email: m.to, error: err.message })
    }
  }

  return { sent, failures }
}

async function sendOnce({ to, subject, html, text }) {
  if (getValidBrevoApiKey()) {
    return sendViaBrevoApi({ to, subject, html, text })
  }

  const transport = getTransporter()
  if (!transport) {
    logger.warn('[Email stub] SMTP not configured — email not sent', { to, subject })
    if (env.nodeEnv === 'production') {
      throw new Error(getEmailSetupHint())
    }
    return { stub: true }
  }

  const info = await transport.sendMail({
    from: normalizeFrom(env.email.from),
    to,
    subject,
    html,
    text,
  })
  logger.info('[Email sent]', { to, subject, messageId: info.messageId })
  return info
}

export async function sendEmail({ to, subject, html, text }, { retries = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await sendOnce({ to, subject, html, text })
    } catch (err) {
      lastError = err
      logger.error('[Email failed]', { to, subject, attempt, retries, error: err.message })
      transporter = null
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
  }
  throw lastError
}
