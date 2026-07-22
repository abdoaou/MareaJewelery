import nodemailer from 'nodemailer'
import { env } from '../../config/env.js'
import { logger } from '../utils/logger.js'

let transporter = null

function normalizeFrom(from) {
  if (!from) return 'Marea Jewelry <noreply@marea.com>'
  const cleaned = String(from).trim().replace(/^["']|["']$/g, '')
  return cleaned.replace(/([^\s<])</, '$1 <')
}

function getValidBrevoApiKey() {
  const key = env.email.brevoApiKey?.trim()
  if (!key) return null
  // xsmtpsib- is the SMTP password, not the HTTP API key
  if (key.startsWith('xsmtpsib-')) return null
  return key
}

export function getEmailSetupHint() {
  if (env.nodeEnv === 'production') {
    return 'Email is not configured for production. In Railway, set BREVO_API_KEY (xkeysib-... from Brevo → API Keys) and EMAIL_FROM.'
  }
  return 'Set BREVO_API_KEY (xkeysib-...) or SMTP_* in api/.env'
}

/** True when a working email transport is available. */
export function isEmailConfigured() {
  if (getValidBrevoApiKey()) return true
  // SMTP ports are blocked on most PaaS hosts (Railway, etc.)
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

function parseFrom(from) {
  const normalized = normalizeFrom(from)
  const match = /^(.*?)\s*<(.+)>$/.exec(normalized)
  if (match) return { name: match[1].trim() || 'Marea Jewelry', email: match[2].trim() }
  return { name: 'Marea Jewelry', email: normalized }
}

async function sendViaBrevoApi({ to, subject, html, text }) {
  const apiKey = getValidBrevoApiKey()
  if (!apiKey) throw new Error('Brevo API key is missing or invalid')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(env.email.from),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = await res.json().catch(() => ({}))
  logger.info('[Email sent via Brevo API]', { to, subject, messageId: json.messageId })
  return json
}

/** Send many personalized emails in few Brevo API calls (avoids HTTP timeouts on broadcast). */
export async function sendBulkEmails(messages) {
  assertEmailConfigured()
  if (!messages.length) return { sent: 0, failures: [] }

  const apiKey = getValidBrevoApiKey()
  if (apiKey) {
    return sendBulkViaBrevoApi(messages, apiKey)
  }

  // Local dev fallback: one SMTP message at a time
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
        logger.error('[Bulk email chunk failed]', { chunkSize: chunk.length, error: errMsg })
        for (const m of chunk) failures.push({ email: m.to, error: errMsg })
      } else {
        sent += chunk.length
        logger.info('[Bulk email chunk sent]', { count: chunk.length })
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

/** Send email with retries so the first auth code is delivered reliably. */
export async function sendEmail({ to, subject, html, text }, { retries = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await sendOnce({ to, subject, html, text })
    } catch (err) {
      lastError = err
      logger.error('[Email failed]', {
        to,
        subject,
        from: env.email.from,
        attempt,
        retries,
        error: err.message,
      })
      transporter = null
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
  }
  throw lastError
}
