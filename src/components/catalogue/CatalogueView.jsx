import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import GarmentMockup from './GarmentMockup'
import DesignEditor from './DesignEditor'
import DesignMockup from './DesignMockup'
import { fetchDesignableProducts, fetchMerchantProducts } from '../../utils/api'

function SizeChartModal({ blank, onClose }) {
  const chart = blank.size_chart
  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', animation: 'pf-fade-up 0.25s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(23,43,21,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: '#172B15' }}>Size chart</h2>
            <p style={{ fontSize: '12px', color: '#889B8E', marginTop: '3px' }}>{blank.name} · garment measurements in {chart.unit === 'in' ? 'inches' : chart.unit}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: '30px', height: '30px', background: '#F4F4F0', border: 'none', borderRadius: '8px', fontSize: '14px', color: '#888', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>{['Size', ...chart.columns].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 6px', fontSize: '10px', fontWeight: 600, color: '#889B8E', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(23,43,21,0.08)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(chart.rows).map(([size, values]) => (
                <tr key={size} style={{ borderBottom: '1px solid rgba(23,43,21,0.08)' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 700 }}>{size}</td>
                  {values.map((v, i) => <td key={i} style={{ padding: '8px 6px', color: '#172B15' }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  , document.body)
}

// Like Unitee: one section per product, one card per colour ("Black
// Fleece Pullover Hoodie"), each with its own Design / Order plain.
const priceOf = variants => {
  const ok = variants.filter(v => v.in_stock !== false && Number(v.base_cost) > 0).map(v => Number(v.base_cost))
  return ok.length ? Math.min(...ok) : null
}

function ColourCard({ blank, color, onDesign, onOrderPlain }) {
  const variants = blank.variants.filter(v => v.color === color.name)
  const price = priceOf(variants)
  const out = variants.length > 0 && variants.every(v => v.in_stock === false)
  const photo = color.image_urls?.[blank.views?.[0]?.id] || color.image_url
  // "Black Fleece Pullover Hoodie", unless the name already says the colour.
  const fullName = blank.name.toLowerCase().includes(color.name.toLowerCase()) ? blank.name : `${color.name} ${blank.name}`
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.07)', borderRadius: '18px', padding: '10px', display: 'flex', flexDirection: 'column', boxShadow: '0 6px 20px rgba(23,43,21,0.02)', minWidth: 0 }}>
      <div style={{ position: 'relative', opacity: out ? 0.55 : 1 }}>
        <GarmentMockup type={blank.mockup} color={color.hex} photoUrl={photo} />
        {out && <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', color: '#C53030', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '100px' }}>Out of stock</span>}
      </div>
      <div style={{ padding: '10px 4px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color.hex, border: '1px solid #D8D8D4', flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#172B15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{color.name}</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#889B8E', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fullName}>{fullName}</div>
        <div style={{ fontSize: '12px', color: '#172B15', margin: '8px 0 10px' }}>{price == null ? (out ? 'Back soon' : 'Price coming soon') : <>From <strong>₹{price}</strong> + tax</>}</div>
        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
          {/* No print areas set up yet: it can only be ordered plain. */}
          <button className="pf-btn" onClick={onDesign} disabled={out || !blank.print_areas?.length} title={blank.print_areas?.length ? 'Design' : 'Print positions not set up yet'} style={{ flex: 1, padding: '9px 6px', fontSize: '12px', fontWeight: 800, background: '#172B15', color: '#FFFFFF', borderRadius: '10px' }}>{blank.print_areas?.length ? 'Design' : 'Plain only'}</button>
          {onOrderPlain && price != null && <button className="pf-btn-outline" onClick={onOrderPlain} disabled={out} title="Order plain (no print)" style={{ flex: 1, padding: '9px 6px', fontSize: '12px', borderRadius: '10px' }}>Plain</button>}
        </div>
      </div>
    </div>
  )
}

function ProductSection({ blank, onDesign, onSizeChart, onOrderPlain }) {
  const sizes = [...new Set(blank.variants.map(v => v.size))]
  const fromCost = priceOf(blank.variants)
  const meta = blank.own ? ['Your garment', blank.category] : [blank.gsm && `${blank.gsm} GSM`, blank.fabric, blank.fit]
  return (
    <section style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(23,43,21,0.08)' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '20px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.3px' }}>{blank.name}</h2>
          <div style={{ fontSize: '12.5px', color: '#889B8E', marginTop: '3px' }}>
            {[...meta, sizes.length ? `${sizes[0]}–${sizes[sizes.length - 1]}` : null, `${blank.colors.length} colour${blank.colors.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            {fromCost != null && <> · from <strong style={{ color: '#172B15' }}>₹{fromCost}</strong> + tax</>}
          </div>
        </div>
        {blank.size_chart && <button onClick={onSizeChart} style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.12)', borderRadius: '9px', padding: '7px 12px', fontSize: '12px', fontWeight: 700, color: '#172B15', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Size chart</button>}
      </div>
      <div className="pf-cards-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))', gap: '12px' }}>
        {blank.colors.map(c => (
          <ColourCard key={c.name} blank={blank} color={c} onDesign={() => onDesign(c.name)} onOrderPlain={onOrderPlain && (() => onOrderPlain(c.name))} />
        ))}
      </div>
    </section>
  )
}

const KIND = { tee: 'T-shirts', hoodie: 'Hoodies', polo: 'Polos' }
const kindOf = b => (b.own ? 'My garments' : b.category || (/pet/i.test(b.name) ? 'Pet wear' : KIND[b.mockup] || 'Other'))

// onOrderPlain(blankId, color): open Create order with this product/colour as a plain line.
// onOrderDesign(productId): open Create order with this saved design.
export default function CatalogueView({ onOrderPlain, onOrderDesign }) {
  const [tab, setTab] = useState('catalogue')
  const [blanks, setBlanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [designing, setDesigning] = useState(null)
  const [sizeChartFor, setSizeChartFor] = useState(null)
  const [designs, setDesigns] = useState([])
  const [designsError, setDesignsError] = useState('')
  const [notice, setNotice] = useState('')
  const [kind, setKind] = useState('all')

  useEffect(() => {
    fetchDesignableProducts()
      .then(setBlanks)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const loadDesigns = useCallback(() => {
    fetchMerchantProducts()
      .then(list => { setDesigns(list); setDesignsError('') })
      .catch(err => setDesignsError(err.message))
  }, [])

  useEffect(() => { loadDesigns() }, [loadDesigns])

  if (designing) {
    return (
      <DesignEditor
        blank={designing.blank}
        initialColor={designing.color}
        design={designing.design || null}
        backLabel={designing.design ? 'Back to My designs' : 'Back to catalogue'}
        onClose={() => setDesigning(null)}
        onSaved={() => {
          setNotice(designing.design ? `${designing.design.title} saved.` : 'Draft saved. Find it under My designs.')
          setDesigning(null)
          setTab('designs')
          loadDesigns()
        }}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const kinds = [...new Set(blanks.map(kindOf))]
  const visible = blanks.filter(b => (kind === 'all' || kindOf(b) === kind)
    && (!q || [b.name, b.category, b.fabric, ...b.colors.map(c => c.name)].some(s => s?.toLowerCase().includes(q))))
  const blankName = id => blanks.find(b => b.blank_id === id)?.name || id

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '26px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '4px' }}>Catalogue</h1>
          <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500 }}>Pick a blank, add your artwork, and set your prices.</p>
        </div>
        <div style={{ display: 'flex', background: '#F4F4F0', borderRadius: '10px', padding: '3px' }}>
          {[['catalogue', 'Catalogue'], ['designs', `My designs${designs.length ? ` (${designs.length})` : ''}`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: tab === id ? '#FFFFFF' : 'transparent', boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', fontSize: '12px', fontWeight: 600, color: tab === id ? '#172B15' : '#889B8E', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{label}</button>
          ))}
        </div>
      </div>

      {notice && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#166534', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span>✓ {notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {tab === 'catalogue' && (
        <>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products or colours…" style={{ width: '100%', maxWidth: '360px', padding: '11px 14px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', marginBottom: '12px', fontFamily: 'Inter, sans-serif' }} />
          {kinds.length > 1 && (
            <div className="pf-scroll-x" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {['all', ...kinds].map(k => (
                <button key={k} onClick={() => setKind(k)} style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${kind === k ? '#172B15' : 'rgba(23,43,21,0.12)'}`, background: kind === k ? '#172B15' : '#FFFFFF', color: kind === k ? '#FFFFFF' : '#172B15', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {k === 'all' ? `All (${blanks.reduce((n, b) => n + b.colors.length, 0)})` : `${k} (${blanks.filter(b => kindOf(b) === k).reduce((n, b) => n + b.colors.length, 0)})`}
                </button>
              ))}
            </div>
          )}
          {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#889B8E', fontSize: '13px' }}>Loading catalogue…</div>
          ) : visible.length === 0 && !error ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#889B8E', fontSize: '13px' }}>{q ? 'No products match your search.' : 'The catalogue is empty.'}</div>
          ) : (
            <div>
              {visible.map(b => <ProductSection key={b.blank_id} blank={b} onDesign={color => setDesigning({ blank: b, color })} onSizeChart={() => setSizeChartFor(b)} onOrderPlain={onOrderPlain && (color => onOrderPlain(b.blank_id, color))} />)}
            </div>
          )}
        </>
      )}

      {tab === 'designs' && (
        <>
          {designsError && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#C53030' }}>⚠ {designsError}</div>}
          {designs.length === 0 && !designsError ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#889B8E', fontSize: '13px' }}>No designs yet. Pick a product from the catalogue to start.</div>
          ) : (
            <div className="pf-cards-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
              {designs.map(d => {
                const blank = blanks.find(b => b.blank_id === d.blank_id)
                return (
                  <div key={d.product_id} style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                    <button onClick={() => blank && setDesigning({ blank, design: d })} disabled={!blank} title={blank ? 'Edit this design' : 'This product is no longer in the catalogue'}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: blank ? 'pointer' : 'default', textAlign: 'left' }}>
                      <DesignMockup design={d} blank={blank} />
                    </button>
                    <div className="pf-name-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      <span title="Saved here; not published to a Shopify store yet" style={{ flexShrink: 0, background: '#F4F4F0', color: '#172B15', padding: '3px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#889B8E', marginTop: '4px', marginBottom: '12px' }}>{blankName(d.blank_id)} · {d.colors.length} color{d.colors.length === 1 ? '' : 's'} · {d.sizes.join(', ')}</div>
                    {d.prices && Object.keys(d.prices).length > 0 && <div style={{ fontSize: '12px', color: '#172B15', marginTop: '-6px', marginBottom: '12px' }}>Selling price {[...new Set(Object.values(d.prices).map(Number))].sort((a, b) => a - b).map(p => `₹${p}`).join(' – ')}</div>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      {blank && <button onClick={() => setDesigning({ blank, design: d })} style={{ flex: 1, padding: '11px', fontSize: '13px', fontWeight: 700, background: '#FFFFFF', color: '#172B15', border: '1px solid rgba(23,43,21,0.15)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Edit</button>}
                      {onOrderDesign && <button className="pf-btn" onClick={() => onOrderDesign(d.product_id)} style={{ flex: 1, padding: '11px', fontSize: '13px', fontWeight: 800, background: '#B9F95D', color: '#172B15', borderRadius: '12px' }}>Order</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {sizeChartFor && <SizeChartModal blank={sizeChartFor} onClose={() => setSizeChartFor(null)} />}
    </>
  )
}
