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

export async function fetchProducts(shop) {
  const res = await fetch(`${BASE_URL}/products?shop=${encodeURIComponent(shop)}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
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

export async function fetchPlans() {
  const res = await fetch(`${BASE_URL}/plans`)
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(p => ({
      id: p.plan_id,
      name: p.name,
      monthlyPrice: Number(p.monthly_price),
      annualPrice: Number(p.annual_price),
      stores: p.stores_limit === -1 ? 'Unlimited stores' : `${p.stores_limit} store${p.stores_limit === 1 ? '' : 's'}`,
      orders: p.orders_limit === -1 ? 'Unlimited orders' : `Up to ${p.orders_limit} orders/mo`,
      ordersLimit: p.orders_limit === -1 ? Infinity : Number(p.orders_limit),
      features: p.features || [],
      recommended: !!p.recommended,
    }))
}

export async function fetchMyStore(email) {
  const res = await fetch(`${BASE_URL}/my-store?email=${encodeURIComponent(email)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.shop_domain || null
}

export async function linkStore(shop, email) {
  await fetch(`${BASE_URL}/link-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, email }),
  })
}

export async function createRazorpayOrder(shop, plan, amount) {
  const res = await fetch(`${BASE_URL}/billing/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, plan, amount }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create order')
  return data
}

export async function verifyRazorpayPayment({ shop, plan, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const res = await fetch(`${BASE_URL}/billing/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, plan, razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Payment verification failed')
  return data
}

export async function fetchWallet(shop) {
  const res = await fetch(`${BASE_URL}/wallet?shop=${encodeURIComponent(shop)}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch wallet')
  return data
}

export async function createWalletTopupOrder(shop, amount) {
  const res = await fetch(`${BASE_URL}/wallet/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, amount }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create top-up order')
  return data
}

export async function verifyWalletTopup({ shop, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const res = await fetch(`${BASE_URL}/wallet/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Top-up verification failed')
  return data
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
