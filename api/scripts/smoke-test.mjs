const API = process.env.API_BASE || 'http://localhost:3000/api/v1'
const WEBSITE = process.env.WEBSITE_BASE || 'http://localhost:5173'
const ADMIN = process.env.ADMIN_BASE || 'http://localhost:5175'

const results = []

async function test(name, fn) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, ok: true, ms: Date.now() - start })
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - start, error: err.message?.slice(0, 200) })
  }
}

async function getJson(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(url, { headers })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${res.status} invalid JSON: ${text.slice(0, 100)}`)
  }
  if (!res.ok) throw new Error(`${res.status} ${json.message || text.slice(0, 100)}`)
  return json
}

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${res.status} invalid JSON: ${text.slice(0, 100)}`)
  }
  if (!res.ok) throw new Error(`${res.status} ${json.message || text.slice(0, 100)}`)
  return json
}

async function getHtml(url) {
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status}`)
  if (!text.includes('<!doctype html') && !text.includes('<!DOCTYPE html')) {
    throw new Error('not HTML')
  }
  return text
}

let token = null

await test('API health', () => getJson(`${API}/health`))
await test('API products (published)', async () => {
  const j = await getJson(`${API}/products?status=PUBLISHED&limit=5`)
  if (!Array.isArray(j.data)) throw new Error('missing data array')
})
await test('API best sellers', () => getJson(`${API}/products?bestSeller=true&limit=5`))
await test('API categories', async () => {
  const j = await getJson(`${API}/categories`)
  if (!Array.isArray(j.data)) throw new Error('missing data array')
})
await test('API product by slug', async () => {
  const list = await getJson(`${API}/products?status=PUBLISHED&limit=1`)
  const slug = list.data?.[0]?.slug
  if (!slug) throw new Error('no products to test slug')
  await getJson(`${API}/products/slug/${slug}`)
})
await test('Admin login', async () => {
  const j = await postJson(`${API}/auth/login`, { email: 'admin@marea.com', password: 'Admin@123' })
  token = j.data?.accessToken
  if (!token) throw new Error('no access token')
})
await test('Admin dashboard', () => getJson(`${API}/admin/dashboard`, token))
await test('Admin customers', () => getJson(`${API}/admin/customers?limit=5`, token))
await test('Admin inventory', () => getJson(`${API}/admin/inventory?limit=5`, token))
await test('Website home page', () => getHtml(WEBSITE))
await test('Website shop page', () => getHtml(`${WEBSITE}/shop`))
await test('Admin login page', () => getHtml(`${ADMIN}/login`))
await test('Admin dashboard route (HTML shell)', () => getHtml(`${ADMIN}/`))

const pass = results.filter((r) => r.ok).length
const fail = results.filter((r) => !r.ok)

console.log('\n=== Smoke test results ===')
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${String(r.ms).padStart(5)}ms  ${r.name}${r.error ? ` — ${r.error}` : ''}`)
}
console.log(`\nTotal: ${pass}/${results.length} passed`)
if (fail.length) process.exit(1)
