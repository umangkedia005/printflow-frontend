import { useCallback, useEffect, useState } from 'react'
import { fetchCatalogue } from '../../utils/api'

// Stock Level: how much of each catalogue garment is available, per colour
// and size. The team updates the numbers; customers see a level only.

const INK = '#172B15'
const SAGE = '#889B8E'
const LINE = 'rgba(23,43,21,0.08)'

const LEVELS = {
  healthy: { label: 'Healthy stock', short: 'Healthy', color: '#3FA66B', bg: '#EEF8F1', fill: 1 },
  moderate: { label: 'Moderate stock', short: 'Moderate', color: '#D9A21B', bg: '#FDF6E3', fill: 0.66 },
  low: { label: 'Low stock', short: 'Low', color: '#E07B2E', bg: '#FDF0E6', fill: 0.33 },
  out: { label: 'Out of stock', short: 'Out', color: '#D64545', bg: '#FCEBEB', fill: 0 },
}
const FILTERS = ['all', 'healthy', 'moderate', 'low', 'out']
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']
const bySize = (a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99)

const levelOf = v => v.stock_level || (v.in_stock === false ? 'out' : 'healthy')

function Bar({ size, level }) {
  const l = LEVELS[level]
  return (
    <div title={`Size ${size}: ${l.label}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '34px' }}>
      <div style={{ position: 'relative', width: '22px', height: '74px', borderRadius: '11px', background: level === 'out' ? '#FFFFFF' : '#EEF0EA', border: level === 'out' ? `1.5px dashed ${l.color}` : '1px solid rgba(23,43,21,0.05)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${l.fill * 100}%`, background: l.color, borderRadius: '11px', transition: 'height 0.3s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 800, color: level === 'out' ? l.color : INK }}>{size}</span>
    </div>
  )
}

function ProductCard({ blank }) {
  const colors = blank.colors || []
  const [colorName, setColorName] = useState(colors[0]?.name)
  const color = colors.find(c => c.name === colorName) || colors[0]
  const variants = (blank.variants || []).filter(v => v.color === color?.name).sort((a, b) => bySize(a.size, b.size))
  const photo = color?.image_urls?.[blank.views?.[0]?.id] || color?.image_url
  const outCount = variants.filter(v => levelOf(v) === 'out').length

  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '20px', padding: '18px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#F4F5F0', overflow: 'hidden', flexShrink: 0 }}>
          {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14.5px', fontWeight: 800, color: INK, lineHeight: 1.3 }}>{blank.name}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {blank.gsm && <span style={{ fontSize: '11px', fontWeight: 700, color: '#4A5548', background: '#F4F5F0', padding: '3px 8px', borderRadius: '7px' }}>{blank.gsm} GSM</span>}
            {blank.fabric && <span style={{ fontSize: '11px', fontWeight: 600, color: SAGE, background: '#F9FAF6', padding: '3px 8px', borderRadius: '7px' }}>{blank.fabric}</span>}
          </div>
        </div>
      </div>

      {colors.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {colors.map(c => (
            <button key={c.name} type="button" title={c.name} aria-label={`Show ${c.name}`} onClick={() => setColorName(c.name)}
              style={{ width: '18px', height: '18px', padding: 0, borderRadius: '50%', background: c.hex, border: '1px solid #D8D8D4', cursor: 'pointer', boxShadow: c.name === color?.name ? `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${INK}` : 'none' }} />
          ))}
          <span style={{ fontSize: '12px', color: SAGE, marginLeft: '4px' }}>{color?.name}</span>
        </div>
      )}

      <div style={{ background: '#FAFBF7', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '16px 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '6px', flexWrap: 'wrap' }}>
          {variants.map(v => <Bar key={v.size} size={v.size} level={levelOf(v)} />)}
        </div>
      </div>
      {outCount > 0 && <div style={{ fontSize: '12px', color: LEVELS.out.color, fontWeight: 600 }}>{outCount === variants.length ? 'Out of stock in this colour' : `${outCount} size${outCount > 1 ? 's' : ''} out of stock in ${color?.name}`}</div>}
    </div>
  )
}

export default function StockLevel() {
  const [blanks, setBlanks] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(true)

  const load = useCallback(() => {
    fetchCatalogue()
      .then(list => { setBlanks((list || []).filter(b => !b.own)); setError('') })
      .catch(e => setError(e.message))
      .finally(() => setRefreshing(false))
  }, [])
  useEffect(() => { load() }, [load])

  const matches = (b, f) => f === 'all' || (b.variants || []).some(v => levelOf(v) === f)
  const searched = (blanks || []).filter(b => !q || `${b.name} ${b.gsm || ''} ${b.fabric || ''}`.toLowerCase().includes(q.toLowerCase()))
  const shown = searched.filter(b => matches(b, filter))
  const count = f => searched.filter(b => matches(b, f)).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>Stock Level</h1>
          <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Stock and size availability for every product in the catalogue.</p>
        </div>
        <button onClick={() => { setRefreshing(true); load() }} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '11px', padding: '9px 15px', fontSize: '13px', fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>↻</span>{refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '18px', padding: '14px', marginBottom: '18px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products by name, GSM or fabric…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: `1px solid ${LINE}`, borderRadius: '11px', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', color: INK, outline: 'none', background: '#FAFBF7' }} />
        <div className="pf-scroll-x" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          {FILTERS.map(f => {
            const active = filter === f
            const l = LEVELS[f]
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  border: active ? `1.5px solid ${l ? l.color : INK}` : `1px solid ${l ? l.bg : LINE}`, background: active ? (l ? l.bg : INK) : (l ? l.bg : '#FFFFFF'), color: l ? l.color : (active ? '#FFFFFF' : INK) }}>
                {l && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: l.color }} />}
                {f === 'all' ? `All products (${count('all')})` : `${l.label} (${count(f)})`}
              </button>
            )
          })}
        </div>
      </div>

      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}
      {!blanks && !error && <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>Loading stock…</div>}
      {blanks && !shown.length && <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>{searched.length ? 'No products at this stock level.' : 'No products match your search.'}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))', gap: '16px' }}>
        {shown.map(b => <ProductCard key={b.blank_id} blank={b} />)}
      </div>
    </div>
  )
}
