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

function BlankCard({ blank, onDesign, onSizeChart, onOrderPlain }) {
  const sizes = [...new Set(blank.variants.map(v => v.size))]
  const fromCost = Math.min(...blank.variants.map(v => v.base_cost))
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)', padding: '14px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative' }}>
        <GarmentMockup type={blank.mockup} color={blank.colors[0].hex} photoUrl={blank.colors[0].image_urls?.[blank.views?.[0]?.id] || blank.colors[0].image_url} />
        {blank.size_chart && (
          <button onClick={onSizeChart} style={{ position: 'absolute', top: '10px', right: '10px', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, color: '#172B15', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Size chart</button>
        )}
      </div>
      <div style={{ padding: '14px 4px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '17px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.2px' }}>{blank.name}</div>
        <div style={{ fontSize: '12px', color: '#889B8E', marginTop: '4px' }}>{blank.own ? `Your garment · ${blank.category} | ${sizes[0]}–${sizes[sizes.length - 1]}` : `${blank.gsm} GSM | ${sizes[0]}–${sizes[sizes.length - 1]} | ${blank.fabric}`}</div>
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
          {blank.colors.map(c => <span key={c.name} title={c.name} style={{ width: '14px', height: '14px', borderRadius: '50%', background: c.hex, border: '1px solid #D8D8D4' }} />)}
        </div>
        <div style={{ fontSize: '12px', color: '#172B15', marginTop: '10px', marginBottom: '14px' }}>{blank.own ? 'You supply the garment · printing only' : <>Base cost from <strong style={{ color: '#172B15' }}>₹{fromCost}</strong> + tax</>}</div>
        <button className="pf-btn" onClick={onDesign} style={{ marginTop: 'auto', width: '100%', padding: '12px', fontSize: '13px', fontWeight: 800, background: '#172B15', color: '#FFFFFF', borderRadius: '12px' }}>Design now</button>
        {/* Plain, unprinted pieces: only our stock (customers already own their garments). */}
        {!blank.own && onOrderPlain && <button className="pf-btn-outline" onClick={onOrderPlain} style={{ width: '100%', padding: '10px', fontSize: '12px', marginTop: '8px' }}>Order plain (no print)</button>}
      </div>
    </div>
  )
}

// onOrderPlain(blankId): open Create order with this product as a plain line.
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
        blank={designing}
        onClose={() => setDesigning(null)}
        onSaved={() => {
          setDesigning(null)
          setNotice('Draft saved. Find it under My designs.')
          setTab('designs')
          loadDesigns()
        }}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const visible = blanks.filter(b => !q || [b.name, b.category, b.fabric].some(s => s?.toLowerCase().includes(q)))
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
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" style={{ width: '100%', maxWidth: '360px', padding: '11px 14px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', marginBottom: '20px', fontFamily: 'Inter, sans-serif' }} />
          {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#889B8E', fontSize: '13px' }}>Loading catalogue…</div>
          ) : visible.length === 0 && !error ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#889B8E', fontSize: '13px' }}>{q ? 'No products match your search.' : 'The catalogue is empty.'}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
              {visible.map(b => <BlankCard key={b.blank_id} blank={b} onDesign={() => setDesigning(b)} onSizeChart={() => setSizeChartFor(b)} onOrderPlain={onOrderPlain && (() => onOrderPlain(b.blank_id))} />)}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
              {designs.map(d => {
                const blank = blanks.find(b => b.blank_id === d.blank_id)
                return (
                  <div key={d.product_id} style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                    <DesignMockup design={d} blank={blank} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      <span title="Saved here; not published to a Shopify store yet" style={{ flexShrink: 0, background: '#F4F4F0', color: '#172B15', padding: '3px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#889B8E', marginTop: '4px', marginBottom: '12px' }}>{blankName(d.blank_id)} · {d.colors.length} color{d.colors.length === 1 ? '' : 's'} · {d.sizes.join(', ')}</div>
                    {onOrderDesign && <button className="pf-btn" onClick={() => onOrderDesign(d.product_id)} style={{ marginTop: 'auto', width: '100%', padding: '11px', fontSize: '13px', fontWeight: 800, background: '#B9F95D', color: '#172B15', borderRadius: '12px' }}>Order</button>}
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
