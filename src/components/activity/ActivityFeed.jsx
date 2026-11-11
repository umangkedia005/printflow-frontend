import { useCallback, useEffect, useState } from 'react'
import { fetchActivity } from '../../utils/api'

const INK = '#172B15', SAGE = '#889B8E', LINE = 'rgba(23,43,21,0.08)'
const SERIF = "'Fraunces', sans-serif"

// Icon, background and colour for each kind of event.
const KIND = {
  order_placed:   ['🧾', '#F4F5F0', INK],
  order_received: ['🛍', '#EFF6FF', '#1D4ED8'],
  order_printing: ['🖨', '#EFF6FF', '#1D4ED8'],
  order_shipped:  ['🚚', '#F5F3FF', '#5B21B6'],
  order_delivered:['✓', '#E6F4EA', '#137333'],
  wallet_topup:   ['₹', '#E6F4EA', '#137333'],
  wallet_charge:  ['₹', '#F4F5F0', INK],
  wallet_refund:  ['↩', '#E6F4EA', '#137333'],
  low_wallet:     ['!', '#FFF7ED', '#C2410C'],
}

function when(at) {
  const t = new Date(at)
  if (Number.isNaN(t.getTime())) return ''
  const mins = Math.round((Date.now() - t.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`
  return t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: t.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

// The account's real activity: orders, shipping and wallet, newest first.
export default function ActivityFeed({ onTopUp }) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetchActivity()
      .then(list => { setEvents(list); setError('') })
      .catch(err => { setError(err.message); setEvents(e => e || []) })
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>Notifications</h1>
          <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Your orders, shipping and wallet activity. We email you the important ones too.</p>
        </div>
        <button onClick={load} className="pf-btn-outline" style={{ padding: '8px 14px', fontSize: '12px', flexShrink: 0 }}>Refresh</button>
      </div>

      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)', overflow: 'hidden' }}>
        {events === null ? (
          <div style={{ padding: '48px', textAlign: 'center', color: SAGE, fontSize: '13px' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 800, color: INK }}>Nothing yet</div>
            <div style={{ fontSize: '13px', color: SAGE, marginTop: '6px' }}>Orders, shipping updates and wallet top-ups will show up here.</div>
          </div>
        ) : events.map((e, i) => {
          const [icon, bg, fg] = KIND[e.type] || ['•', '#F4F5F0', INK]
          return (
            <div key={`${e.type}-${e.order_id || ''}-${e.at}-${i}`} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '16px 20px', borderBottom: i < events.length - 1 ? `1px solid ${LINE}` : 'none' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: INK }}>{e.title}</div>
                {(e.detail || e.url) && (
                  <div style={{ fontSize: '12px', color: SAGE, marginTop: '3px' }}>
                    {e.detail}
                    {e.url && <> {e.detail ? '· ' : ''}<a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: INK, fontWeight: 700 }}>Track ↗</a></>}
                  </div>
                )}
                {e.type === 'low_wallet' && onTopUp && (
                  <button onClick={onTopUp} style={{ marginTop: '8px', background: '#B9F95D', color: INK, border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Top up wallet</button>
                )}
              </div>
              <div style={{ fontSize: '11px', color: SAGE, whiteSpace: 'nowrap', flexShrink: 0 }}>{when(e.at)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
