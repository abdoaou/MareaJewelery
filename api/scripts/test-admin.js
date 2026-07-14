/**
 * Admin dashboard API test suite
 * Run: node scripts/test-admin.js
 */
const BASE = process.env.API_URL || 'http://localhost:3000/api/v1'

let passed = 0
let failed = 0
let adminToken = ''

function log(name, ok, detail = '') {
  if (ok) passed++
  else failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function request(method, path, { body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function run() {
  console.log(`\nAdmin API tests @ ${BASE}\n`)

  const login = await request('POST', '/auth/login', {
    body: { email: 'admin@marea.com', password: 'Admin@123' },
  })
  adminToken = login.json?.data?.accessToken
  log('Admin login', login.status === 200 && !!adminToken)

  const dash = await request('GET', '/admin/dashboard', { token: adminToken })
  const stats = dash.json?.data
  log('Dashboard stats', dash.status === 200 && stats?.revenue != null, `revenue total: ${stats?.revenue?.total}`)

  const charts = await request('GET', '/admin/charts', { token: adminToken })
  log('Dashboard charts', charts.status === 200 && charts.json?.data?.dailySales != null)

  const orders = await request('GET', '/orders?limit=10', { token: adminToken })
  log('Orders list', orders.status === 200 && Array.isArray(orders.json?.data), `count: ${orders.json?.data?.length}`)

  const orderId = orders.json?.data?.[0]?.id
  if (orderId) {
    const order = await request('GET', `/orders/${orderId}`, { token: adminToken })
    log('Order detail', order.status === 200)

    const updated = await request('PATCH', `/orders/${orderId}/status`, {
      token: adminToken,
      body: { status: 'PROCESSING', note: 'Admin test update' },
    })
    log('Order status update', updated.status === 200)
  } else {
    log('Order detail', false, 'no orders')
    log('Order status update', false, 'skipped')
  }

  const products = await request('GET', '/products?limit=20', { token: adminToken })
  log('Products list', products.status === 200 && products.json?.data?.length > 0, `count: ${products.json?.data?.length}`)

  const productId = products.json?.data?.[0]?.id
  if (productId) {
    const dup = await request('POST', `/products/${productId}/duplicate`, { token: adminToken })
    log('Product duplicate', dup.status === 200 || dup.status === 201)
  } else {
    log('Product duplicate', false, 'no products')
  }

  const categories = await request('GET', '/categories', { token: adminToken })
  log('Categories list', categories.status === 200 && categories.json?.data?.length > 0, `count: ${categories.json?.data?.length}`)

  const tree = await request('GET', '/categories/tree', { token: adminToken })
  log('Categories tree', tree.status === 200)

  const inventory = await request('GET', '/admin/inventory', { token: adminToken })
  const invItems = inventory.json?.data?.items || inventory.json?.data
  log('Inventory list', inventory.status === 200, `rows: ${Array.isArray(invItems) ? invItems.length : '?'}`)

  const invId = Array.isArray(invItems) ? invItems[0]?.id : null
  if (invId) {
    const adj = await request('POST', '/admin/inventory/adjust', {
      token: adminToken,
      body: { inventoryId: invId, quantity: 1, note: 'Test adjustment' },
    })
    log('Inventory adjust (+1)', adj.status === 200)
  } else {
    log('Inventory adjust', false, 'no inventory')
  }

  const movements = await request('GET', '/admin/stock-movements', { token: adminToken })
  log('Stock movements', movements.status === 200)

  const customers = await request('GET', '/admin/customers', { token: adminToken })
  log('Customers list', customers.status === 200, `count: ${customers.json?.data?.items?.length ?? '?'}`)

  const notifications = await request('GET', '/admin/notifications', { token: adminToken })
  log('Notifications', notifications.status === 200, `count: ${notifications.json?.data?.length}`)

  const notifId = notifications.json?.data?.[0]?.id
  if (notifId) {
    const mark = await request('PATCH', `/admin/notifications/${notifId}/read`, { token: adminToken })
    log('Mark notification read', mark.status === 200)
  } else {
    log('Mark notification read', false, 'no notifications')
  }

  const audit = await request('GET', '/admin/audit-logs', { token: adminToken })
  log('Audit logs', audit.status === 200)

  const adminLogs = await request('GET', '/admin/admin-logs', { token: adminToken })
  log('Admin logs', adminLogs.status === 200)

  const search = await request('GET', '/orders?search=MR-DEMO', { token: adminToken })
  log('Order search filter', search.status === 200)

  const lowStock = await request('GET', '/admin/inventory?lowStock=true', { token: adminToken })
  log('Low stock filter', lowStock.status === 200)

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
