import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchCatalogue, fetchMerchantProducts, quoteManualOrder, placeManualOrder, fetchManualOrders } from '../../utils/api'

const INK = '#172B15', SAGE = '#889B8E', LIME = '#B9F95D', LINE = 'rgba(23,43,21,0.08)'
const CARD = { background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }
const SERIF = "'Fraunces', sans-serif"
const LABEL = { display: 'block', fontSize: '11px', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }
const INPUT = { width: '100%', padding: '11px 14px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', color: INK, background: '#FFFFFF' }
const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
const STATUS = {
  queued: ['Queued', '#FFF7ED', '#C2410C'],
  printing: ['Printing', '#EFF6FF', '#1D4ED8'],
  shipped: ['Shipped', '#F5F3FF', '#5B21B6'],
  delivered: ['Delivered', '#E6F4EA', '#137333'],
}
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Card({ title, action, children, style }) {
  return (
    <div style={{ ...CARD, padding: '22px 24px', ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 800, color: INK }}>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, optional, children, wide }) {
  return (
    <label style={{ display: 'block', gridColumn: wide ? '1 / -1' : 'auto' }}>
      <span style={LABEL}>{label}{optional && <span style={{ textTransform: 'none', fontWeight: 500 }}> (optional)</span>}</span>
      {children}
    </label>
  )
}

// What a line can be ordered in: a design in the colours and sizes the
// merchant chose for it, a blank in any in-stock colour and size.
function optionsFor(item, kind) {
  if (kind === 'design') return { colors: item.colors || [], sizes: item.sizes || [] }
  const inStock = (item.variants || []).filter(v => v.in_stock)
  const sizes = item.sizes?.length ? item.sizes : [...new Set(inStock.map(v => v.size))]
  return { colors: item.colors.map(c => c.name), sizes: sizes.filter(s => inStock.some(v => v.size === s)) }
}

function ProductPicker({ designs, blanks, onPick, onClose }) {
  const [tab, setTab] = useState('designs')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const blankName = id => blanks.find(b => b.blank_id === id)?.name || ''
  const items = tab === 'designs'
    ? designs.filter(d => !q || d.title.toLowerCase().includes(q))
    : blanks.filter(b => !q || b.name.toLowerCase().includes(q))

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '640px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 800, color: INK }}>Select product</h2>
          <button onClick={onClose} aria-label="Close" style={{ width: '32px', height: '32px', background: '#F4F5F0', border: 'none', borderRadius: '10px', fontSize: '14px', color: INK, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '22px', padding: '18px 28px 0', borderBottom: `1px solid ${LINE}` }}>
          {[['designs', `My designs (${designs.length})`], ['blanks', `Blank products (${blanks.length})`]].map(([id, text]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? INK : 'transparent'}`, padding: '0 2px 12px', fontSize: '14px', fontWeight: 700, color: tab === id ? INK : SAGE, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{text}</button>
          ))}
        </div>
        <div style={{ padding: '16px 28px', background: '#FAFBF7', borderBottom: `1px solid ${LINE}` }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === 'designs' ? 'Search your designs' : 'Search blank products'} style={INPUT} autoFocus />
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 28px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {items.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: SAGE, fontSize: '13px' }}>
              {tab === 'designs' && designs.length === 0 ? 'No designs yet. Create one from the Catalogue first.' : 'Nothing matches your search.'}
            </div>
          )}
          {items.map(item => {
            const kind = tab === 'designs' ? 'design' : 'blank'
            const image = kind === 'design'
              ? Object.values(item.artwork || {})[0]?.preview_url
              : item.colors[0]?.image_urls?.[item.views?.[0]?.id] || item.colors[0]?.image_url
            return (
              <button key={kind === 'design' ? item.product_id : item.blank_id} onClick={() => onPick(item, kind)} style={{ textAlign: 'left', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ aspectRatio: '1 / 1', borderRadius: '12px', background: '#F4F5F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {image && <img src={image} alt="" style={{ width: kind === 'design' ? '75%' : '100%', height: kind === 'design' ? '75%' : '100%', objectFit: kind === 'design' ? 'contain' : 'cover' }} />}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: INK, marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kind === 'design' ? item.title : item.name}</div>
                <div style={{ fontSize: '11px', color: SAGE, marginTop: '2px' }}>{kind === 'design' ? blankName(item.blank_id) : `${item.gsm} GSM · no print`}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CreateOrder({ shopDomain, walletBalance, onTopUp, onPlaced, onCancel }) {
  const [designs, setDesigns] = useState([])
  const [blanks, setBlanks] = useState([])
  const [picking, setPicking] = useState(false)
  const [lines, setLines] = useState([])
  const [method, setMethod] = useState('surface')
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [address, setAddress] = useState({ reference: '', name: '', email: '', phone: '', address1: '', address2: '', city: '', state: '', pincode: '' })
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMerchantProducts(shopDomain).then(setDesigns).catch(() => setDesigns([]))
    fetchCatalogue().then(setBlanks).catch(() => setBlanks([]))
  }, [shopDomain])

  const payload = useMemo(() => lines.map(l => (
    l.kind === 'design'
      ? { type: 'design', product_id: l.ref, color: l.color, size: l.size, qty: Number(l.qty) }
      : { type: 'blank', blank_id: l.ref, color: l.color, size: l.size, qty: Number(l.qty) }
  )), [lines])

  // Re-price shortly after any change; the server is the source of truth.
  useEffect(() => {
    if (!payload.length || payload.some(l => !(l.qty >= 1))) return
    let stale = false
    const t = setTimeout(() => {
      quoteManualOrder(shopDomain, payload, method)
        .then(res => { if (!stale) { setQuote(res); setQuoteError('') } })
        .catch(err => { if (!stale) { setQuote(null); setQuoteError(err.message) } })
    }, 300)
    return () => { stale = true; clearTimeout(t) }
  }, [payload, method, shopDomain])

  function addLine(item, kind) {
    const { colors, sizes } = optionsFor(item, kind)
    const image = kind === 'design'
      ? Object.values(item.artwork || {})[0]?.preview_url
      : item.colors[0]?.image_urls?.[item.views?.[0]?.id] || item.colors[0]?.image_url
    setLines(ls => [...ls, {
      key: `${Date.now()}-${Math.random()}`,
      kind, ref: kind === 'design' ? item.product_id : item.blank_id,
      name: kind === 'design' ? item.title : item.name,
      image, colors, sizes, color: colors[0], size: sizes[0], qty: 1,
    }])
    setPicking(false)
  }
  const setLine = (key, patch) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = key => {
    setLines(ls => ls.filter(l => l.key !== key))
    if (lines.length === 1) setQuote(null)
  }

  const total = quote ? Number(quote.quote.total) : 0
  const short = quote && total > Number(walletBalance || 0)
  const setA = (k, v) => setAddress(a => ({ ...a, [k]: v }))

  const missing = []
  if (!lines.length) missing.push('Add at least one product')
  if (!address.name.trim()) missing.push("Enter the customer's full name")
  if (address.phone.replace(/\D/g, '').slice(-10).length !== 10) missing.push('Enter a 10-digit phone number')
  if (!address.address1.trim() || !address.city.trim() || !address.state.trim()) missing.push('Enter the address, city and state')
  if (!/^[1-9][0-9]{5}$/.test(address.pincode.trim())) missing.push('Enter a 6-digit pincode')

  async function handlePlace() {
    setPlacing(true)
    setError('')
    try {
      const { reference, ...addr } = address
      const res = await placeManualOrder({ shop: shopDomain, lines: payload, shipping_method: method, address: addr, reference })
      onPlaced(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  const priceOf = i => quote?.lines?.[i]?.price

  return (
    <div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 0, color: SAGE, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '8px' }}>← Back to orders</button>
      <h1 style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 800, color: INK, letterSpacing: '-0.5px' }}>Create new order</h1>
      <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500, margin: '4px 0 22px' }}>Order your own designs or blank products. It's paid from your wallet and printed like any other order.</p>

      <div className="pf-design-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <Card title="Your products" action={
            <button onClick={() => setPicking(true)} style={{ background: INK, color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Add product</button>
          }>
            {lines.length === 0 ? (
              <div style={{ border: '1.5px dashed rgba(23,43,21,0.15)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: INK, fontWeight: 600 }}>No products added yet</div>
                <div style={{ fontSize: '12px', color: SAGE, marginTop: '4px' }}>Click Add product to pick one of your designs or a blank.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lines.map((l, i) => (
                  <div key={l.key} style={{ display: 'flex', gap: '14px', alignItems: 'center', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '12px', flexWrap: 'wrap' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#F4F5F0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {l.image && <img src={l.image} alt="" style={{ width: l.kind === 'design' ? '80%' : '100%', height: l.kind === 'design' ? '80%' : '100%', objectFit: l.kind === 'design' ? 'contain' : 'cover' }} />}
                    </div>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                      <div style={{ fontSize: '11px', color: SAGE, marginTop: '2px' }}>{l.kind === 'design' ? 'Your design' : 'Blank, no print'}{priceOf(i) != null ? ` · ${rupees(priceOf(i))} each` : ''}</div>
                    </div>
                    <select value={l.color} onChange={e => setLine(l.key, { color: e.target.value })} style={{ ...INPUT, width: 'auto', padding: '8px 10px' }}>{l.colors.map(c => <option key={c}>{c}</option>)}</select>
                    <select value={l.size} onChange={e => setLine(l.key, { size: e.target.value })} style={{ ...INPUT, width: 'auto', padding: '8px 10px' }}>{l.sizes.map(s => <option key={s}>{s}</option>)}</select>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px' }}>
                      <button onClick={() => setLine(l.key, { qty: Math.max(1, Number(l.qty) - 1) })} aria-label="Fewer" style={{ width: '32px', height: '36px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: INK }}>−</button>
                      <input value={l.qty} onChange={e => setLine(l.key, { qty: e.target.value.replace(/\D/g, '').slice(0, 3) })} aria-label="Quantity" style={{ width: '38px', border: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: INK, outline: 'none' }} />
                      <button onClick={() => setLine(l.key, { qty: Math.min(500, Number(l.qty || 0) + 1) })} aria-label="More" style={{ width: '32px', height: '36px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: INK }}>+</button>
                    </div>
                    <div style={{ width: '90px', textAlign: 'right', fontSize: '14px', fontWeight: 800, color: INK }}>{priceOf(i) != null ? rupees(priceOf(i) * Number(l.qty || 0)) : '—'}</div>
                    <button onClick={() => removeLine(l.key)} aria-label="Remove" style={{ border: 'none', background: 'none', color: '#C53030', cursor: 'pointer', fontSize: '15px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {quoteError && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '10px' }}>⚠ {quoteError}</div>}
          </Card>

          <Card title="Shipping details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <Field label="Reference ID" optional><input style={INPUT} value={address.reference} onChange={e => setA('reference', e.target.value)} placeholder="Your own order number" /></Field>
              <Field label="Full name"><input style={INPUT} value={address.name} onChange={e => setA('name', e.target.value)} placeholder="Riya Kapoor" autoComplete="name" /></Field>
              <Field label="Email" optional><input style={INPUT} type="email" value={address.email} onChange={e => setA('email', e.target.value)} placeholder="riya@example.com" autoComplete="email" /></Field>
              <Field label="Phone number"><input style={INPUT} type="tel" value={address.phone} onChange={e => setA('phone', e.target.value)} placeholder="98765 43210" autoComplete="tel" /></Field>
              <Field label="Address line 1" wide><input style={INPUT} value={address.address1} onChange={e => setA('address1', e.target.value)} placeholder="House number, street" autoComplete="address-line1" /></Field>
              <Field label="Address line 2" optional wide><input style={INPUT} value={address.address2} onChange={e => setA('address2', e.target.value)} placeholder="Landmark, area" autoComplete="address-line2" /></Field>
              <Field label="City"><input style={INPUT} value={address.city} onChange={e => setA('city', e.target.value)} placeholder="Pune" autoComplete="address-level2" /></Field>
              <Field label="State">
                <select style={INPUT} value={address.state} onChange={e => setA('state', e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Pincode"><input style={INPUT} inputMode="numeric" value={address.pincode} onChange={e => setA('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="411001" autoComplete="postal-code" /></Field>
            </div>
          </Card>
        </div>

        <div className="pf-design-sticky" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Order summary">
            {[
              ['Subtotal', quote?.quote.subtotal],
              ['Shipping', quote?.quote.shipping],
              [`Product tax (${quote?.quote.product_tax_pct ?? 5}%)`, quote?.quote.product_tax],
              [`Shipping tax (${quote?.quote.shipping_tax_pct ?? 18}%)`, quote?.quote.shipping_tax],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: SAGE, padding: '6px 0' }}><span>{k}</span><span style={{ color: INK, fontWeight: 600 }}>{rupees(v)}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${LINE}`, marginTop: '8px', paddingTop: '12px' }}>
              <span style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 800, color: INK }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: INK }}>{rupees(total)}</span>
            </div>

            <span style={{ ...LABEL, marginTop: '20px' }}>Shipping</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['surface', 'Surface', 'Cheaper, 4 to 7 days'], ['air', 'Air', 'Faster, 2 to 4 days']].map(([id, text, hint]) => (
                <button key={id} onClick={() => setMethod(id)} style={{ flex: 1, textAlign: 'left', padding: '10px 12px', borderRadius: '14px', border: method === id ? `1.5px solid ${INK}` : '1px solid rgba(23,43,21,0.1)', background: method === id ? '#F6F7F2' : '#FFFFFF', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: INK }}>{text}</div>
                  <div style={{ fontSize: '11px', color: SAGE, marginTop: '2px' }}>{hint}</div>
                </button>
              ))}
            </div>

            <span style={{ ...LABEL, marginTop: '20px' }}>Payment</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${short ? '#FED7D7' : LINE}`, background: short ? '#FFF5F5' : '#FAFBF7', borderRadius: '14px', padding: '12px 14px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: INK }}>Wallet</div>
                <div style={{ fontSize: '11px', color: short ? '#C53030' : SAGE, marginTop: '2px' }}>Balance {rupees(walletBalance)}{short ? ` · ${rupees(total - Number(walletBalance || 0))} short` : ''}</div>
              </div>
              <button onClick={onTopUp} style={{ background: 'none', border: `1px solid ${INK}`, borderRadius: '10px', padding: '7px 12px', fontSize: '12px', fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Top up</button>
            </div>
            <div style={{ fontSize: '11px', color: SAGE, marginTop: '8px' }}>Prepaid only: your customer isn't charged on delivery.</div>
          </Card>

          <div className="pf-design-save" style={{ ...CARD, padding: '18px 22px' }}>
            {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#C53030' }}>⚠ {error}</div>}
            {(missing.length > 0 || short) && <div style={{ fontSize: '12px', color: SAGE, marginBottom: '10px' }}>{missing[0] || 'Top up your wallet to place this order'}</div>}
            <button onClick={handlePlace} disabled={placing || missing.length > 0 || !quote || short} className="pf-btn" style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 800, background: LIME, color: INK, borderRadius: '14px', boxShadow: '0 6px 18px rgba(185,249,93,0.35)' }}>
              {placing ? 'Placing order…' : `Place order${quote ? ` · ${rupees(total)}` : ''}`}
            </button>
          </div>
        </div>
      </div>

      {picking && <ProductPicker designs={designs} blanks={blanks} onPick={addLine} onClose={() => setPicking(false)} />}
    </div>
  )
}

export default function ManualOrdersView({ shopDomain, walletBalance, onWalletChanged, onTopUp }) {
  const [creating, setCreating] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    if (!shopDomain) return
    fetchManualOrders(shopDomain)
      .then(list => { setOrders(list); setError('') })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [shopDomain])
  useEffect(() => { load() }, [load])

  if (creating) {
    return (
      <CreateOrder
        shopDomain={shopDomain}
        walletBalance={walletBalance}
        onTopUp={onTopUp}
        onCancel={() => setCreating(false)}
        onPlaced={res => {
          setCreating(false)
          setNotice(`Order ${res.order_id} placed. ${rupees(res.total)} was paid from your wallet.`)
          onWalletChanged()
          load()
        }}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Orders you place yourself, for samples, offline or social media customers.</p>
        <button onClick={() => { setNotice(''); setCreating(true) }} style={{ background: LIME, color: INK, border: 'none', borderRadius: '12px', padding: '11px 18px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Create order</button>
      </div>
      {notice && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#166534' }}>✓ {notice}</div>}
      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: SAGE, fontSize: '13px' }}>Loading your orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 800, color: INK }}>Place your first order</div>
            <div style={{ fontSize: '13px', color: SAGE, marginTop: '6px' }}>Order your designs or blanks for anyone, paid from your wallet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr>{['Order', 'Items', 'Ship to', 'Total', 'Status', 'Placed'].map(h => <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${LINE}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const ship = o.raw?.shipping_address || {}
                  const [label, bg, fg] = STATUS[o.status] || STATUS.queued
                  const items = o.items || []
                  return (
                    <tr key={o.order_id} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: INK, fontSize: '13px' }}>{o.order_id}</div>
                        {o.reference && <div style={{ fontSize: '11px', color: SAGE }}>Ref {o.reference}</div>}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex' }}>
                            {items.slice(0, 3).map((it, i) => (
                              <div key={i} style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#F4F5F0', border: '2px solid #FFFFFF', marginLeft: i ? '-10px' : 0, overflow: 'hidden' }}>
                                {it.image_url && <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: '12px', color: INK }}>{items.reduce((n, it) => n + Number(it.quantity || 0), 0)} item(s)<div style={{ fontSize: '11px', color: SAGE }}>{items[0]?.name}{items.length > 1 ? ` +${items.length - 1}` : ''}</div></div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12px', color: INK }}>{ship.name}<div style={{ fontSize: '11px', color: SAGE }}>{[ship.city, ship.zip].filter(Boolean).join(' ')}</div></td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 800, color: INK }}>{rupees(o.total_price)}</td>
                      <td style={{ padding: '14px 18px' }}><span style={{ background: bg, color: fg, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{label}</span></td>
                      <td style={{ padding: '14px 18px', fontSize: '12px', color: SAGE }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
