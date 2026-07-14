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
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      tls: { minVersion: 'TLSv1.2' },
    })
  }
  return transporter
}

async function sendOnce({ to, subject, html, text }) {
  const transport = getTransporter()
  if (!transport) {
    logger.warn('[Email stub] SMTP not configured — email not sent', { to, subject })
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
