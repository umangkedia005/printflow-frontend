import { auth } from '../firebase'

const BASE_URL = import.meta.env.VITE_API_URL

async function getToken() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

export async function exchangeToken(shop, sessionToken) {
  const res = await fetch(`${BASE_URL}/token-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop, session_token: sessionToken }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Token exchange failed')
  return data
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

// Shopify orders only; orders the merchant placed themselves have their own
// tab (fetchManualOrders).
export async function fetchOrders(shop) {
  const data = await request(`/orders?shop=${encodeURIComponent(shop)}`)
  return Array.isArray(data) ? data.filter(o => o.source !== 'manual').map(formatOrder) : []
}

export async function fetchProducts(shop) {
  const res = await fetch(`${BASE_URL}/products?shop=${encodeURIComponent(shop)}`, { headers: await shopAuthHeaders() })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchSubscription(shop) {
  const res = await fetch(`${BASE_URL}/subscription?shop=${encodeURIComponent(shop)}`, { headers: await shopAuthHeaders() })
  const data = await res.json()
  return data.plan || 'free'
}

// Only moves a store back to Free (and cancels the charge in Shopify); paid
// plans go through createShopifySubscription and Shopify's approval page.
export async function updateSubscription(shop, plan) {
  const res = await fetch(`${BASE_URL}/subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ shop, plan }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not change the plan')
  return data
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

// Stores linked to the signed-in account; the server reads the account from
// the sign-in token, so the email is only kept for older callers.
export async function fetchMyStores() {
  const res = await fetch(`${BASE_URL}/my-stores`, { headers: await shopAuthHeaders() })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// Sent with the caller's Firebase ID token so the backend can verify the
// account claiming this shop, rather than trusting an email in the body.
// Tolerates an empty response body — the status is what matters here.
export async function linkStore(shop, email) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}/link-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ shop, email }),
  })
  if (!res.ok) throw new Error(`Failed to link store (${res.status})`)
}

export async function createShopifySubscription(shop, plan, billingCycle) {
  const res = await fetch(`${BASE_URL}/billing/shopify/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ shop, plan, billing_cycle: billingCycle }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to start subscription')
  return data
}

export async function confirmShopifySubscription(shop, plan) {
  const res = await fetch(`${BASE_URL}/billing/shopify/confirm?shop=${encodeURIComponent(shop)}&plan=${encodeURIComponent(plan)}`, { headers: await shopAuthHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to confirm subscription')
  return data
}

// The wallet belongs to the signed-in account, not to a store.
export async function fetchWallet() {
  const res = await fetch(`${BASE_URL}/wallet`, { headers: await shopAuthHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch wallet')
  return data
}

export async function createWalletTopupOrder(amount) {
  const res = await fetch(`${BASE_URL}/wallet/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ amount }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create top-up order')
  return data
}

// The server credits what Razorpay received, not an amount sent from here.
export async function verifyWalletTopup({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const res = await fetch(`${BASE_URL}/wallet/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Top-up verification failed')
  return data
}

// The signed-in account's Firebase token, which account endpoints (wallet,
// designs, manual orders) are keyed by; inside the Shopify admin, App Bridge's
// session token is added too for endpoints that act on a store.
async function shopAuthHeaders() {
  const headers = {}
  try {
    headers['Authorization'] = `Bearer ${await getToken()}`
  } catch { /* not signed in to Firebase; the session token may still suffice */ }
  if (window.shopify?.idToken) {
    try {
      headers['X-Shopify-Session-Token'] = await window.shopify.idToken()
    } catch { /* App Bridge unavailable; fall back to Firebase */ }
  }
  return headers
}

export async function fetchCatalogue() {
  const res = await fetch(`${BASE_URL}/catalogue`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load the catalogue')
  return Array.isArray(data) ? data : []
}

// Two steps: the backend hands out a presigned POST, then the file goes
// straight to S3 — print files are often bigger than the API accepts.
export async function uploadArtwork(file) {
  const res = await fetch(`${BASE_URL}/uploads/artwork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ content_type: file.type }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not start the upload')

  const form = new FormData()
  Object.entries(data.fields).forEach(([k, v]) => form.append(k, v))
  form.append('file', file)
  const upload = await fetch(data.url, { method: 'POST', body: form })
  if (!upload.ok) throw new Error('Upload failed. Files must be PNG or JPG and under 50 MB.')
  return data.key
}

export async function saveMerchantProduct(product) {
  const res = await fetch(`${BASE_URL}/merchant-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify(product),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to save the product')
  return data
}

// Designs belong to the signed-in account.
export async function fetchMerchantProducts() {
  const res = await fetch(`${BASE_URL}/merchant-products`, {
    headers: await shopAuthHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load your designs')
  return Array.isArray(data) ? data : []
}

export async function fetchProductMappings(shop) {
  const res = await fetch(`${BASE_URL}/product-mappings?shop=${encodeURIComponent(shop)}`, { headers: await shopAuthHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch products')
  return Array.isArray(data) ? data : []
}

// Merchants set the print file only; factory SKU and fulfilment cost are set
// by No Limit Studio in the admin app.
export async function updateProductMapping({ shop, shopifyProductId, printFileUrl }) {
  const res = await fetch(`${BASE_URL}/product-mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({
      shop,
      shopify_product_id: shopifyProductId,
      print_file_url: printFileUrl,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update product')
  return data
}

export async function fulfillOrder(shop, orderId) {
  const res = await fetch(`${BASE_URL}/orders/fulfill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ shop, order_id: orderId }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to send order to print factory')
    err.status = res.status
    err.details = data
    throw err
  }
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
    productId: item.product_id,
    sku:       item.sku || item.name,
    name:      item.name,
    qty:       Number(item.quantity) || 1,
    size:      item.variant_title || '—',
    color:     '—',
    printFile: item.print_file_url || null,
    image:     item.image_url || null,
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
    rawDate:   o.created_at,
    amount:    `${o.currency || 'INR'} ${parseFloat(o.total_price || 0).toFixed(2)}`,
    amountValue: parseFloat(o.total_price || 0),
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

// Orders a merchant places themselves, priced and paid from the wallet on
// the server; the browser only sends what was picked.
export async function quoteManualOrder(lines, shippingMethod) {
  const res = await fetch(`${BASE_URL}/manual-orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify({ lines, shipping_method: shippingMethod }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not price this order')
  return data
}

export async function placeManualOrder(order) {
  const res = await fetch(`${BASE_URL}/manual-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await shopAuthHeaders()) },
    body: JSON.stringify(order),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Could not place the order')
    err.status = res.status
    err.details = data
    throw err
  }
  return data
}

export async function fetchManualOrders() {
  const res = await fetch(`${BASE_URL}/manual-orders`, { headers: await shopAuthHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load your orders')
  return Array.isArray(data) ? data : []
}
