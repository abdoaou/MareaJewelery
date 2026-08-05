import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

function stripEnv(v) {
  if (!v) return ''
  return String(v).trim().replace(/^["']+|["']+$/g, '')
}

const key = stripEnv(process.env.BREVO_API_KEY)
if (!key.startsWith('xkeysib-')) {
  console.error('Missing valid BREVO_API_KEY (xkeysib-...)')
  process.exit(1)
}

const headers = { 'api-key': key, Accept: 'application/json' }

async function get(path) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, { headers })
  const text = await res.text()
  return { status: res.status, body: text }
}

console.log('=== Brevo account ===')
const account = await get('/account')
console.log('Status:', account.status)
try {
  const a = JSON.parse(account.body)
  console.log('Plan:', a.plan?.type, '| Credits:', a.plan?.credits)
  console.log('Relay:', a.relay?.enabled, '| Data:', a.relay?.data)
} catch {
  console.log(account.body.slice(0, 400))
}

console.log('\n=== Verified senders ===')
const senders = await get('/senders')
console.log('Status:', senders.status)
try {
  const list = JSON.parse(senders.body).senders || []
  if (!list.length) {
    console.log('No senders configured! Add and verify prvtabdo70@gmail.com in Brevo → Senders.')
  } else {
    for (const s of list) {
      console.log(`- ${s.email} | active=${s.active} | verified=${JSON.stringify(s.verified)}`)
    }
  }
} catch {
  console.log(senders.body.slice(0, 400))
}

console.log('\n=== Blocked events (reason) ===')
const blocked = await get('/smtp/statistics/events?event=blocked&limit=5&sort=desc')
try {
  const ev = JSON.parse(blocked.body).events || []
  for (const e of ev) {
    console.log(`- to=${e.email} | reason=${e.reason || e.tag || 'unknown'} | subject=${e.subject}`)
  }
} catch {
  console.log(blocked.body.slice(0, 500))
}

console.log('\n=== Events for prvtabdo70@gmail.com ===')
const mine = await get('/smtp/statistics/events?email=prvtabdo70@gmail.com&limit=10&sort=desc')
try {
  const ev = JSON.parse(mine.body).events || []
  for (const e of ev) {
    console.log(`- ${e.date} | ${e.event} | reason=${e.reason || '-'} | subject=${e.subject?.slice(0, 60)}`)
  }
} catch {
  console.log(mine.body.slice(0, 500))
}
