import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

function stripEnv(v) {
  if (!v) return ''
  return String(v).trim().replace(/^["']|["']$/g, '')
}

function parseFrom(from) {
  const normalized = stripEnv(from).replace(/([^\s<])</, '$1 <')
  const match = /^(.*?)\s*<(.+)>$/.exec(normalized)
  if (match) return { name: match[1].trim() || 'Marea Jewelry', email: match[2].trim() }
  return { name: 'Marea Jewelry', email: normalized }
}

const key = stripEnv(process.env.BREVO_API_KEY)
const from = parseFrom(process.env.EMAIL_FROM)
const to = process.argv[2] || 'prvtabdo70@gmail.com'

console.log('Brevo key type:', key.startsWith('xkeysib-') ? 'API key OK' : key ? 'WRONG KEY TYPE' : 'MISSING')
console.log('Sender:', from)
console.log('To:', to)

if (!key.startsWith('xkeysib-')) {
  console.error('Fix BREVO_API_KEY — must start with xkeysib-')
  process.exit(1)
}

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'api-key': key,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({
    sender: from,
    to: [{ email: to }],
    subject: 'Marea password reset test',
    htmlContent: '<p>Test reset code: <strong>123456</strong></p>',
    textContent: 'Test reset code: 123456',
  }),
})

const body = await res.text()
console.log('Brevo status:', res.status)
console.log('Brevo response:', body.slice(0, 500))
process.exit(res.ok ? 0 : 1)
