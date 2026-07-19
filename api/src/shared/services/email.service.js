import nodemailer from 'nodemailer'
import { env } from '../../config/env.js'
import { logger } from '../utils/logger.js'

let transporter = null

function normalizeFrom(from) {
  if (!from) return 'Marea Jewelry <noreply@marea.com>'
  const cleaned = String(from).trim().replace(/^["']|["']$/g, '')
  // Ensure "Name <email>" has a space before <
  return cleaned.replace(/([^\s<])</, '$1 <')
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
      // Fail fast so retries (and the verify page's auto-resend) kick in quickly
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

/** Brevo HTTP API — works on hosts that block outbound SMTP ports (e.g. Railway). */
async function sendViaBrevoApi({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.email.brevoApiKey,
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

async function sendOnce({ to, subject, html, text }) {
  if (env.email.brevoApiKey) {
    return sendViaBrevoApi({ to, subject, html, text })
  }

  const transport = getTransporter()
  if (!transport) {
    logger.warn('[Email stub] SMTP not configured — email not sent', { to, subject })
    // In production a missing email config must surface as a failure,
    // otherwise users are told a code was sent when nothing went out.
    if (env.nodeEnv === 'production') {
      throw new Error('Email is not configured (set BREVO_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM)')
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
      // Reset transporter so the next attempt opens a fresh SMTP connection
      transporter = null
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
  }
  throw lastError
}
