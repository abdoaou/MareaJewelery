const BASE = process.env.API_URL || 'http://localhost:3000/api/v1'

const results = []
let passed = 0
let failed = 0

function log(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (ok) passed++
  else failed++
  const icon = ok ? 'PASS' : 'FAIL'
  console.log(`${icon}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function request(method, path, { body, token, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data }
}

async function run() {
  console.log(`\nTesting API at ${BASE}\n`)

  // Health
  const health = await request('GET', '/health')
  log('GET /health', health.status === 200 && health.data?.success, `status ${health.status}`)

  // Admin login
  const login = await request('POST', '/auth/login', {
    body: { email: 'admin@marea.com', password: 'Admin@123' },
  })
  const adminToken = login.data?.data?.accessToken
  log('POST /auth/login (admin)', login.status === 200 && !!adminToken, `status ${login.status}`)

  // Customer register
  const email = `test${Date.now()}@marea.com`
  const register = await request('POST', '/auth/register', {
    body: { email, password: 'Test@12345', firstName: 'Test', lastName: 'User' },
  })
  log('POST /auth/register', register.status === 201 || register.status === 200, `status ${register.status}`)

  const customerLogin = await request('POST', '/auth/login', {
    body: { email, password: 'Test@12345' },
  })
  const customerToken = customerLogin.data?.data?.accessToken
  const refreshToken = customerLogin.data?.data?.refreshToken
  log('POST /auth/login (customer)', customerLogin.status === 200 && !!customerToken, `status ${customerLogin.status}`)

  // Profile
  const me = await request('GET', '/auth/me', { token: customerToken })
  log('GET /auth/me', me.status === 200 && me.data?.data?.email === email, `status ${me.status}`)

  // Refresh token
  const refresh = await request('POST', '/auth/refresh', { body: { refreshToken } })
  log('POST /auth/refresh', refresh.status === 200 && !!refresh.data?.data?.accessToken, `status ${refresh.status}`)

  // Products
  const products = await request('GET', '/products')
  const productList = products.data?.data?.items || products.data?.data || []
  const productId = Array.isArray(productList) ? productList[0]?.id : null
  log('GET /products', products.status === 200, `count ${Array.isArray(productList) ? productList.length : '?'}`)

  const productBySlug = await request('GET', '/products/slug/gold-bracelet')
  log('GET /products/slug/:slug', productBySlug.status === 200, `status ${productBySlug.status}`)

  if (productId) {
    const productById = await request('GET', `/products/${productId}`)
    log('GET /products/:id', productById.status === 200, `status ${productById.status}`)
  } else {
    log('GET /products/:id', false, 'no product in DB')
  }

  // Categories
  const categories = await request('GET', '/categories')
  log('GET /categories', categories.status === 200, `status ${categories.status}`)

  const tree = await request('GET', '/categories/tree')
  log('GET /categories/tree', tree.status === 200, `status ${tree.status}`)

  // Cart (guest)
  const sessionId = `guest-${Date.now()}`
  if (productId) {
    const addCart = await request('POST', '/cart/items', {
      body: { productId, quantity: 1 },
      headers: { 'x-session-id': sessionId },
    })
    log('POST /cart/items (guest)', addCart.status === 200 || addCart.status === 201, `status ${addCart.status}`)

    const cart = await request('GET', '/cart', { headers: { 'x-session-id': sessionId } })
    log('GET /cart (guest)', cart.status === 200, `status ${cart.status}`)
  } else {
    log('POST /cart/items (guest)', false, 'no product')
    log('GET /cart (guest)', false, 'skipped')
  }

  // Order (COD)
  if (productId) {
    const order = await request('POST', '/orders', {
      body: {
        paymentMethod: 'COD',
        items: [{ productId, quantity: 1 }],
        shippingAddress: { line1: 'Beirut', city: 'Beirut', country: 'Lebanon' },
        customerNotes: 'API test order',
      },
      token: customerToken,
    })
    log('POST /orders (COD)', order.status === 200 || order.status === 201, `status ${order.status}`)

    const orders = await request('GET', '/orders', { token: customerToken })
    log('GET /orders', orders.status === 200, `status ${orders.status}`)
  } else {
    log('POST /orders (COD)', false, 'no product')
    log('GET /orders', false, 'skipped')
  }

  // Admin dashboard
  const dashboard = await request('GET', '/admin/dashboard', { token: adminToken })
  log('GET /admin/dashboard', dashboard.status === 200, `status ${dashboard.status}`)

  const auditLogs = await request('GET', '/admin/audit-logs', { token: adminToken })
  log('GET /admin/audit-logs', auditLogs.status === 200, `status ${auditLogs.status}`)

  // Public
  const recent = await request('GET', '/public/recent-orders')
  log('GET /public/recent-orders', recent.status === 200, `status ${recent.status}`)

  const liveSale = await request('GET', '/public/live-sale-settings')
  log('GET /public/live-sale-settings', liveSale.status === 200, `status ${liveSale.status}`)

  // Logout
  const logout = await request('POST', '/auth/logout', { body: { refreshToken } })
  log('POST /auth/logout', logout.status === 200, `status ${logout.status}`)

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Test runner error:', err.message)
  process.exit(1)
})
