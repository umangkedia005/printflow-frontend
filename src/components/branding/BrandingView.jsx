import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchBranding, placeBrandingOrder, setBrandingUse, uploadArtwork, openInvoice } from '../../utils/api'
import { ARTWORK_TYPES, MAX_ARTWORK_BYTES } from '../../utils/artworkImage'
import TemplateBuilder from './TemplateBuilder'
import { printFile } from './brandTemplate'
import { fetchAccountSettings } from '../../utils/api'

// Branding → Hang Tags / Packaging. Bought in bulk: pick a size and a
// quantity, upload artwork, pay from the wallet. We check the artwork, make
// them and keep them for your orders ("Use on my orders").

const INK = '#172B15'
const SAGE = '#889B8E'
const LINE = 'rgba(23,43,21,0.08)'
const LIME = '#B9F95D'

const COPY = {
  hang_tag: {
    title: 'Hang Tags',
    intro: 'Your own printed hang tags, attached to every piece we ship for you.',
    sides: [['front', 'Front artwork'], ['back', 'Back artwork (optional)']],
    left: 'Tags left', unit: 'tags',
    useHint: "We'll attach your tag to every garment in your orders.",
    examples: [['/images/branding/tag-black.jpg', 'Classic black tag'], ['/images/branding/tags-colours.jpg', 'Four colour styles']],
  },
  poly_bag: {
    title: 'Packaging',
    intro: 'Custom printed courier bags with your brand, so every parcel arrives in your packaging.',
    sides: [['front', 'Bag artwork']],
    left: 'Bags left', unit: 'bags',
    useHint: "We'll pack your orders in your own courier bags.",
    examples: [['/images/branding/bag-black.jpg', 'Bold logo on black'], ['/images/branding/bags-colours.jpg', 'Four colour styles']],
  },
  thank_you_card: {
    title: 'Thank You Cards',
    intro: 'A printed thank-you card in every parcel, so your customers remember your brand.',
    sides: [['front', 'Front artwork'], ['back', 'Back artwork (optional)']],
    left: 'Cards left', unit: 'cards',
    useHint: "We'll put your card in every parcel we ship for you.",
    examples: [['/images/branding/card-black.jpg', 'Simple black card'], ['/images/branding/cards-styles.jpg', 'Three styles']],
  },
}
const STATUS = {
  review: ['Checking artwork', '#FFF7ED', '#C2410C'],
  production: ['In production', '#EAF0FA', '#2B5BA8'],
  ready: ['Ready · in stock', '#F0FDF4', '#166534'],
  rejected: ['Needs changes · refunded', '#FFF5F5', '#C53030'],
}
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const card = { background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '20px', padding: '22px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }

// Full-screen view of an example, above the top bar and sidebar (rendered on
// <body>, outside the page's own layers). ✕, Esc or the background close it.
function ImageViewer({ src, caption, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [onClose])
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={caption} onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(10,14,10,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 16px 24px' }}>
      <button onClick={onClose} aria-label="Close" autoFocus
        style={{ position: 'absolute', top: '14px', right: '14px', width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#FFFFFF', color: INK, fontSize: '18px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>✕</button>
      <img src={src} alt={caption} onClick={onClose}
        style={{ maxWidth: 'min(92vw, 900px)', maxHeight: 'calc(100vh - 130px)', objectFit: 'contain', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', cursor: 'zoom-out', background: '#F4F4F0' }} />
      {caption && <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, marginTop: '14px', textAlign: 'center' }}>{caption}</div>}
    </div>,
    document.body,
  )
}

function Toggle({ on, disabled, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label="Use on my orders" disabled={disabled} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, width: '46px', height: '26px', borderRadius: '100px', border: 'none', padding: '3px', cursor: disabled ? 'not-allowed' : 'pointer', background: on ? INK : '#D6D6CF', opacity: disabled ? 0.5 : 1, transition: 'background 0.2s' }}>
      <span style={{ display: 'block', width: '20px', height: '20px', borderRadius: '50%', background: '#FFFFFF', transform: on ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

function Upload({ label, value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function pick(file) {
    if (!file) return
    setErr('')
    if (!ARTWORK_TYPES.includes(file.type)) return setErr('Use a PNG or JPG file.')
    if (file.size > MAX_ARTWORK_BYTES) return setErr('The file is too big (50 MB max).')
    setBusy(true)
    try {
      const key = await uploadArtwork(file)
      onChange({ key, preview: URL.createObjectURL(file), name: file.name })
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>{label}</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1.5px dashed ${value ? '#8BC34A' : 'rgba(23,43,21,0.18)'}`, borderRadius: '14px', padding: '12px', cursor: 'pointer', background: value ? '#F7FCEF' : '#FAFBF7' }}>
        <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e => pick(e.target.files?.[0])} />
        <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: value ? `#FFFFFF url("${value.preview}") center/contain no-repeat` : '#EEF0EA', border: `1px solid ${LINE}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: SAGE }}>{value ? '' : '+'}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{busy ? 'Uploading…' : value ? value.name : 'Upload PNG or JPG'}</div>
          <div style={{ fontSize: '11.5px', color: SAGE }}>{value ? 'Click to replace' : 'Print-ready, 300 DPI'}</div>
        </div>
      </label>
      {err && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '6px' }}>{err}</div>}
    </div>
  )
}

export default function BrandingView({ product, walletBalance, onWalletChanged, onTopUp }) {
  const copy = COPY[product]
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [sizeId, setSizeId] = useState(null)
  const [qty, setQty] = useState(null)
  const [art, setArt] = useState({})
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [notice, setNotice] = useState('')
  const [useError, setUseError] = useState('')
  const [zoom, setZoom] = useState(null)
  // "template": type the brand name and pick a style; "upload": own artwork.
  const [mode, setMode] = useState('template')
  const [design, setDesign] = useState({ style: 'black', brandName: '', tagline: '', handle: '', headline: '', logo: null })
  useEffect(() => {
    // Start from the brand name in Settings → Billing Details.
    fetchAccountSettings().then(st => { const n = st?.billing?.business_name; if (n) setDesign(d => (d.brandName ? d : { ...d, brandName: n })) }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchBranding().then(d => {
      setData(d)
      const first = d.catalog[product]?.sizes?.[0]
      if (first) { setSizeId(first.id); setQty(first.tiers[0]?.qty) }
    }).catch(e => setError(e.message))
  }, [product])

  if (error) return <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>
  if (!data) return <div style={{ textAlign: 'center', padding: '64px', color: SAGE, fontSize: '13px' }}>Loading…</div>

  const info = data.catalog[product]
  const stock = data.stock[product]
  const size = info.sizes.find(s => s.id === sizeId)
  const tier = size?.tiers.find(t => t.qty === qty)
  const baseUnit = size ? Number(size.tiers[0].price) / size.tiers[0].qty : 0
  const orders = data.orders.filter(o => o.product === product)
  // Prices are plus GST.
  const gstPct = Number(info.gst_pct ?? 18)
  const gst = tier ? Math.round(Number(tier.price) * gstPct) / 100 : 0
  const total = tier ? Number(tier.price) + gst : 0
  const short = tier && total > Number(walletBalance || 0)
  const ready = mode === 'template' ? design.brandName.trim().length > 0 : !!art.front

  async function toggleUse(on) {
    setUseError('')
    try {
      const res = await setBrandingUse(product, on)
      setData(d => ({ ...d, stock: res.stock }))
    } catch (e) { setUseError(e.message) }
  }

  async function place() {
    setPlacing(true); setPlaceError(''); setNotice('')
    try {
      let order = { product, size_id: sizeId, qty, notes }
      if (mode === 'template') {
        // Make the full-size print file from the template and upload it.
        const key = await uploadArtwork(await printFile({ ...design, product }))
        const { logo, brandName, ...rest } = design
        order = { ...order, artwork_front: key, design: { mode: 'template', brand_name: brandName, ...rest, has_logo: !!logo } }
      } else {
        order = { ...order, artwork_front: art.front?.key, artwork_back: art.back?.key }
      }
      const res = await placeBrandingOrder(order)
      setData(d => ({ ...d, orders: [res.order, ...d.orders] }))
      setArt({}); setNotes('')
      setNotice(`Order ${res.order.order_id} placed: ${rupees(res.order.total ?? res.order.price)} paid from your wallet. We'll check the design and email you.`)
      onWalletChanged?.()
    } catch (e) {
      setPlaceError(e.message)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: SAGE }}>Branding</div>
        <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', margin: '2px 0 4px' }}>{copy.title}</h1>
        <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>{copy.intro}</p>
      </div>
      {/* How it works: we keep their branded items and use them for them. */}
      <div className="pf-grid-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          ['1', 'Order & design', `Pick a size and quantity, then use a template with your brand name or upload your design.`],
          ['2', 'We print & keep them', `We check your design, print your ${copy.unit} and store them for you. No need to send anything.`],
          ['3', 'We use them for you', copy.useHint + ` Switch on "Use on my orders"; "${copy.left}" goes down as we use them.`],
        ].map(([n, title, text]) => (
          <div key={n} style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '14px 16px', display: 'flex', gap: '12px' }}>
            <span style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', background: LIME, color: INK, fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
            <div><div style={{ fontSize: '13.5px', fontWeight: 800, color: INK }}>{title}</div><div style={{ fontSize: '12px', color: SAGE, marginTop: '3px', lineHeight: 1.5 }}>{text}</div></div>
          </div>
        ))}
      </div>
      {/* Examples: ideas for what theirs could look like. */}
      <div style={{ ...card, marginBottom: '16px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '16px', fontWeight: 800, color: INK }}>Examples</h2>
          <span style={{ fontSize: '12px', color: SAGE }}>With your own brand name: use a template below or upload your design. Tap to enlarge.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
          {copy.examples.map(([src, caption]) => (
            <button key={src} onClick={() => setZoom({ src, caption })} style={{ padding: 0, border: `1px solid ${LINE}`, borderRadius: '14px', overflow: 'hidden', background: '#F4F4F0', cursor: 'zoom-in', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
              <img src={src} alt={caption} loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
              <span style={{ display: 'block', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: INK, background: '#FFFFFF' }}>{caption}</span>
            </button>
          ))}
        </div>
      </div>
      {zoom && <ImageViewer src={zoom.src} caption={zoom.caption} onClose={() => setZoom(null)} />}
      {notice && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#166534' }}>{notice}</div>}

      {/* Stock + use on orders */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE }}>{copy.left}</div>
          <div style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '28px', fontWeight: 800, color: stock.left > 0 && stock.left <= data.low_left ? '#C2410C' : INK }}>{stock.left.toLocaleString('en-IN')}</div>
          {stock.left > 0 && stock.left <= data.low_left && <div style={{ fontSize: '12px', color: '#C2410C', fontWeight: 600 }}>Running low: order more below</div>}
          {stock.left === 0 && <div style={{ fontSize: '12px', color: SAGE }}>Order your first batch below.</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '420px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: INK }}>Use on my orders <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', marginLeft: '4px', background: stock.use_on_orders ? '#F0FDF4' : '#F4F4F0', color: stock.use_on_orders ? '#166534' : '#8A8A85' }}>{stock.use_on_orders ? 'Active' : 'Off'}</span></div>
            <div style={{ fontSize: '12px', color: SAGE, marginTop: '2px' }}>{copy.useHint}</div>
            {useError && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '2px' }}>{useError}</div>}
          </div>
          <Toggle on={stock.use_on_orders} disabled={stock.left <= 0 && !stock.use_on_orders} onChange={toggleUse} />
        </div>
      </div>

      {/* Order */}
      <div className="pf-grid-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start', marginBottom: '16px' }}>
        <div style={card}>
          <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: INK, marginBottom: '4px' }}>Order {copy.unit}</h2>
          {info.description && <p style={{ fontSize: '12.5px', color: SAGE, margin: '0 0 6px' }}>{info.description}</p>}
          <div style={{ display: 'inline-block', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#92400E', margin: '6px 0 16px' }}><strong>Made to order:</strong> ready in {info.lead_min && info.lead_min !== info.lead_max ? `${info.lead_min}–${info.lead_max}` : (info.lead_max || info.lead_days)} working days after we approve your design.</div>

          {!info.sizes.length ? (
            <div style={{ border: '1.5px dashed rgba(23,43,21,0.15)', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', fontSize: '13px', color: SAGE }}>Prices coming soon. We'll have sizes and quantities here shortly.</div>
          ) : (
            <>
              <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Size</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {info.sizes.map(s => (
                  <button key={s.id} onClick={() => { setSizeId(s.id); setQty(s.tiers[0]?.qty) }} style={{ padding: '9px 14px', borderRadius: '11px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: s.id === sizeId ? `1.5px solid ${INK}` : `1px solid ${LINE}`, background: s.id === sizeId ? '#F6F7F2' : '#FFFFFF', color: INK }}>{s.label}</button>
                ))}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Quantity</div>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '18px' }}>
                {size?.tiers.map(t => {
                  const unit = Number(t.price) / t.qty
                  const save = baseUnit ? Math.round((1 - unit / baseUnit) * 100) : 0
                  const active = t.qty === qty
                  return (
                    <button key={t.qty} onClick={() => setQty(t.qty)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'left', border: active ? `2px solid ${INK}` : `1px solid ${LINE}`, background: '#FFFFFF' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: INK, minWidth: '70px' }}>{t.qty.toLocaleString('en-IN')}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: INK }}>{rupees(t.price)} <span style={{ fontSize: '11px', fontWeight: 600, color: SAGE }}>+ GST</span></span>
                        <span style={{ display: 'block', fontSize: '11.5px', color: SAGE }}>{rupees(unit)} / {copy.unit.slice(0, -1)}</span>
                      </span>
                      {save > 0 && <span style={{ fontSize: '11.5px', fontWeight: 700, color: INK, background: '#F4F5F0', padding: '4px 10px', borderRadius: '100px' }}>Save {save}%</span>}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Your design</div>
              <div style={{ display: 'inline-flex', background: '#F4F5F0', borderRadius: '12px', padding: '4px', marginBottom: '14px' }}>
                {[['template', 'Use a template'], ['upload', 'Upload my design']].map(([id, text]) => (
                  <button key={id} onClick={() => setMode(id)} style={{ padding: '8px 14px', border: 'none', borderRadius: '9px', background: mode === id ? '#FFFFFF' : 'transparent', boxShadow: mode === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', fontSize: '13px', fontWeight: mode === id ? 800 : 600, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{text}</button>
                ))}
              </div>
              {mode === 'template' ? (
                <div style={{ marginBottom: '14px' }}><TemplateBuilder product={product} value={design} onChange={setDesign} /></div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {copy.sides.map(([side, text]) => <Upload key={side} label={text} value={art[side]} onChange={v => setArt(a => ({ ...a, [side]: v }))} />)}
                </div>
              )}
              <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Notes for our team (optional)</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="e.g. colours to match, where the QR code should go"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: '11px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: INK, resize: 'vertical', outline: 'none' }} />
            </>
          )}
        </div>

        <div style={{ ...card, position: 'sticky', top: '88px' }}>
          <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: INK, marginBottom: '12px' }}>Summary</h2>
          {[['Product', copy.title], ['Size', size?.label || '—'], ['Quantity', tier ? tier.qty.toLocaleString('en-IN') : '—'], ['Per piece', tier ? `${rupees(Number(tier.price) / tier.qty)} + GST` : '—'], ['Price', tier ? rupees(tier.price) : '—'], [`GST (${gstPct}%)`, tier ? rupees(gst) : '—']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: SAGE, padding: '5px 0' }}><span>{k}</span><span style={{ color: INK, fontWeight: 600 }}>{v}</span></div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${LINE}`, marginTop: '8px', paddingTop: '12px' }}>
            <span style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: INK }}>Total</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: INK }}>{rupees(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${short ? '#FED7D7' : LINE}`, background: short ? '#FFF5F5' : '#FAFBF7', borderRadius: '14px', padding: '12px 14px', marginTop: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: INK }}>Wallet</div>
              <div style={{ fontSize: '11px', color: short ? '#C53030' : SAGE }}>Balance {rupees(walletBalance)}{short ? ` · ${rupees(total - Number(walletBalance || 0))} short` : ''}</div>
            </div>
            <button onClick={onTopUp} style={{ background: 'none', border: `1px solid ${INK}`, borderRadius: '10px', padding: '7px 12px', fontSize: '12px', fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Top up</button>
          </div>
          {placeError && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '10px 14px', marginTop: '12px', fontSize: '12px', color: '#C53030' }}>⚠ {placeError}</div>}
          {tier && !ready && <div style={{ fontSize: '12px', color: SAGE, marginTop: '12px' }}>{mode === 'template' ? 'Type your brand name to order.' : 'Upload your artwork to order.'}</div>}
          <button className="pf-btn" onClick={place} disabled={!tier || !ready || placing || short} style={{ width: '100%', marginTop: '12px', padding: '14px', fontSize: '14px', fontWeight: 800, background: LIME, color: INK, borderRadius: '14px' }}>
            {placing ? (mode === 'template' ? 'Making your print file…' : 'Placing order…') : `Pay ${tier ? rupees(total) : ''} from wallet`}
          </button>
          <div style={{ fontSize: '11px', color: SAGE, marginTop: '8px', lineHeight: 1.5 }}>If we can't approve your artwork, the full amount goes back to your wallet.</div>
        </div>
      </div>

      {/* Past orders */}
      <div style={card}>
        <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: INK, marginBottom: '12px' }}>Your {copy.unit} orders</h2>
        {!orders.length ? <div style={{ fontSize: '13px', color: SAGE }}>No orders yet.</div> : orders.map((o, i) => {
          const [label, bg, fg] = STATUS[o.status] || STATUS.review
          return (
            <div key={o.order_id} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '12px 0', borderTop: i ? `1px solid ${LINE}` : 'none', flexWrap: 'wrap' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', border: `1px solid ${LINE}`, background: `#FAFBF7 url("${o.artwork_urls?.front || ''}") center/contain no-repeat`, flexShrink: 0 }} />
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: INK }}>{o.size_label} × {Number(o.qty).toLocaleString('en-IN')} · {rupees(o.total ?? o.price)}</div>
                <div style={{ fontSize: '11.5px', color: SAGE }}>{o.order_id} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                {o.status === 'rejected' && o.reason && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '2px' }}>What to change: {o.reason}</div>}
                {(o.status === 'production' || o.status === 'ready') && <button onClick={() => openInvoice('branding', o.order_id).catch(e => setPlaceError(e.message))} style={{ marginTop: '4px', background: 'none', border: 'none', padding: 0, color: INK, fontWeight: 700, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>⬇ Tax invoice</button>}
              </div>
              <span style={{ background: bg, color: fg, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
