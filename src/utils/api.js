import { auth } from '../firebase'

const BASE_URL = import.meta.env.VITE_API_URL

async function getToken() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

async function request(path, options = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function fetchOrders(shop) {
  const data = await request(`/orders?shop=${encodeURIComponent(shop)}`)
  return Array.isArray(data) ? data.map(formatOrder) : []
}

export async function fetchSubscription(shop) {
  const res = await fetch(`${BASE_URL}/subscription?shop=${encodeURIComponent(shop)}`)
  const data = await res.json()
  return data.plan || 'free'
}

export async function updateSubscription(shop, plan) {
  const res = await fetch(`${BASE_URL}/subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, plan }),
  })
  return res.json()
}

function formatOrder(o) {
  const raw = o.raw || {}
  const customer = raw.customer || {}
  const shipping = raw.shipping_address || raw.billing_address || {}

  const firstName = customer.first_name || ''
  const lastName  = customer.last_name  || ''
  const fullName  = `${firstName} ${lastName}`.trim() || o.email || 'Guest'

  const address = [
    shipping.address1,
    shipping.city,
    shipping.zip,
    shipping.country_code,
  ].filter(Boolean).join(', ')

  const items = (o.items || []).map(item => ({
    sku:       item.sku || item.name,
    name:      item.name,
    qty:       item.quantity || 1,
    size:      item.variant_title || '—',
    color:     '—',
    printFile: null,
  }))

  return {
    id:         o.order_name || `#${o.order_id}`,
    shopifyId:  o.order_id,
    customer: {
      name:    fullName,
      email:   o.email || customer.email || '—',
      address: address || '—',
    },
    items,
    status:    mapStatus(o.status),
    date:      formatDate(o.created_at),
    amount:    `${o.currency || 'INR'} ${parseFloat(o.total_price || 0).toFixed(2)}`,
    tracking:  raw.fulfillments?.[0]?.tracking_number || null,
    carrier:   raw.fulfillments?.[0]?.tracking_company || null,
  }
}

function mapStatus(status) {
  const map = {
    paid:              'queued',
    pending:           'queued',
    partially_paid:    'queued',
    refunded:          'delivered',
    partially_refunded:'shipped',
    voided:            'delivered',
  }
  return map[status] || 'queued'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}
