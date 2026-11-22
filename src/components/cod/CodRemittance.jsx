import { useEffect, useMemo, useState } from 'react'
import { fetchCodRemittance } from '../../utils/api'

// COD Remittance: the brand's cash-on-delivery orders. The courier collects
// the selling price, pays it to No Limit Studio, and we transfer it (minus the
// COD fee) to the brand's bank account. Returned parcels (RTO) pay nothing.

const INK = '#172B15', SAGE = '#889B8E', LINE = 'rgba(23,43,21,0.08)'
const SERIF = "'Fraunces', sans-serif"
const INPUT = { padding: '10px 14px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', color: INK, background: '#FFFFFF' }

const STAGE = {
  awaiting_delivery: ['Awaiting delivery', '#F4F4F0', '#4A5548', 'The parcel is on its way; the courier collects on delivery.'],
  delivered: ['Delivered · with courier', '#FFF7ED', '#C2410C', 'Delivered and cash collected. The courier pays us in about 7 to 10 days, then we pay you.'],
  remitted: ['Payout due', '#EAF0FA', '#2B5BA8', 'The courier has paid us. Your payout is on its way to your bank account.'],
  paid: ['Paid to you', '#F0FDF4', '#166534', 'Transferred to your bank account.'],
  rto: ['Returned (RTO)', '#FFF5F5', '#C53030', 'The parcel came back, so nothing was collected. The return shipping was charged to your wallet.'],
}
const TABS = [['all', 'All'], ['pending', 'Pending'], ['paid', 'Paid'], ['rto', 'Returned']]
const PENDING = ['awaiting_delivery', 'delivered', 'remitted']

const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const day = iso => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const localDay = iso => (iso ? ymd(new Date(iso)) : '')

function toCsv(rows) {
  const cell = v => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['Order', 'Store', 'Order date', 'Customer', 'City', 'AWB', 'Collected on delivery', 'Paid online', 'COD fee', 'You get', 'Status', 'Delivered', 'Payout date', 'Payout UTR', 'Payout ID']
  const body = rows.map(r => [
    r.order_name, r.shop || 'Manual order', localDay(r.created_at), r.customer, r.city || '', r.awb || '', r.amount, r.prepaid, r.stage === 'rto' ? 0 : r.fee, r.net,
    STAGE[r.stage]?.[0] || r.stage, localDay(r.delivered_at), r.payout?.date || '', r.payout?.utr || '', r.payout?.payout_id || '',
  ])
  return [head, ...body].map(line => line.map(cell).join(',')).join('\r\n')
}

function SummaryCard({ label, value, hint, tint, accent }) {
  return (
    <div style={{ background: tint, borderRadius: '18px', padding: '20px 22px', minWidth: 0, border: `1px solid ${LINE}` }}>
      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4A5548' }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: '30px', fontWeight: 800, color: accent, marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      <div style={{ fontSize: '12px', color: SAGE, marginTop: '4px' }}>{hint}</div>
    </div>
  )
}

function Stage({ stage }) {
  const [label, bg, fg, title] = STAGE[stage] || STAGE.awaiting_delivery
  return <span title={title} style={{ background: bg, color: fg, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
}

export default function CodRemittance({ onOpenSettings, onCreateOrder }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tab, setTab] = useState('all')

  useEffect(() => {
    fetchCodRemittance().then(setData).catch(e => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data?.orders || []).filter(r => {
      const d = localDay(r.created_at)
      if (from && d < from) return false
      if (to && d > to) return false
      return !s || [r.order_name, r.order_id, r.customer, r.awb, r.payout?.utr].some(v => String(v || '').toLowerCase().includes(s))
    })
  }, [data, q, from, to])
  const rows = tab === 'all' ? filtered : filtered.filter(r => (tab === 'pending' ? PENDING.includes(r.stage) : r.stage === tab))
  const count = t => (t === 'all' ? filtered.length : filtered.filter(r => (t === 'pending' ? PENDING.includes(r.stage) : r.stage === t)).length)

  function download() {
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cod-remittance-${ymd(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary = data?.summary
  return (
    <div>
      <h1 style={{ fontFamily: SERIF, fontSize: '28px', fontWeight: 800, color: INK, letterSpacing: '-0.5px' }}>COD Remittance</h1>
      <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500, margin: '4px 0 20px', maxWidth: '720px', lineHeight: 1.55 }}>
        For cash-on-delivery orders the courier collects your selling price from the customer. Once the courier pays us, we transfer it to your bank account, minus a {data ? rupees(data.cod_fee) : '₹40'} COD fee per order.
      </p>

      {data && !data.has_bank && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '14px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: '220px' }}>Add your bank account so we can pay your COD money to you.</span>
          {onOpenSettings && <button onClick={onOpenSettings} style={{ background: INK, color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Add bank details</button>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px', maxWidth: '720px' }}>
        <SummaryCard label="Total paid remittance" value={rupees(summary?.paid)} hint={`${summary?.paid_orders ?? 0} order${summary?.paid_orders === 1 ? '' : 's'} settled`} tint="#FBF5FF" accent="#7E22CE" />
        <SummaryCard label="Pending remittances" value={rupees(summary?.pending)} hint={`${summary?.pending_orders ?? 0} order${summary?.pending_orders === 1 ? '' : 's'}`} tint="#F0F6FF" accent="#1D4ED8" />
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order, customer, AWB or UTR" style={{ ...INPUT, flex: '1 1 260px', minWidth: 0 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: SAGE }}>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={INPUT} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: SAGE }}>To <input type="date" value={to} onChange={e => setTo(e.target.value)} style={INPUT} /></label>
        <button onClick={download} disabled={!rows.length} style={{ background: rows.length ? INK : '#C9CFC6', color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '11px 16px', fontSize: '13px', fontWeight: 700, cursor: rows.length ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>⬇ Download report</button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {TABS.map(([id, text]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} style={{ background: tab === id ? INK : '#FFFFFF', color: tab === id ? '#FFFFFF' : INK, border: `1px solid ${tab === id ? INK : LINE}`, borderRadius: '100px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{text} {count(id)}</button>
        ))}
      </div>

      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}

      <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '18px', overflow: 'hidden' }}>
        {!data && !error ? (
          <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>Loading…</div>
        ) : !rows.length ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 800, color: INK }}>{data?.orders?.length ? 'No COD orders match these filters.' : 'No COD orders yet'}</div>
            {!data?.orders?.length && (
              <div style={{ fontSize: '13px', color: SAGE, marginTop: '6px', lineHeight: 1.55 }}>
                Cash-on-delivery orders from your Shopify store show up here by themselves.
                {onCreateOrder && <> You can also <button onClick={onCreateOrder} style={{ background: 'none', border: 'none', padding: 0, color: INK, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>create an order</button> and choose Cash on delivery.</>}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="pf-mobile-only">
              {rows.map((r, i) => (
                <div key={r.order_id} style={{ padding: '14px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, color: INK, fontSize: '13px' }}>{r.order_name}</span>
                    <Stage stage={r.stage} />
                  </div>
                  <div style={{ fontSize: '12px', color: SAGE, marginTop: '4px' }}>{r.customer}{r.city ? `, ${r.city}` : ''} · {day(r.created_at)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12.5px', color: INK }}>
                    <span>Collect {rupees(r.amount)}{r.stage !== 'rto' && <span style={{ color: SAGE }}> − {rupees(r.fee)} fee</span>}</span>
                    <b>{rupees(r.net)}</b>
                  </div>
                  {r.payout && <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '4px' }}>Paid {r.payout.date} · UTR {r.payout.utr}</div>}
                </div>
              ))}
            </div>
            <div className="pf-desktop-only" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#FAFBF7' }}>
                    {['Order', 'Date', 'Customer', 'Collected', 'COD fee', 'You get', 'Status', 'Payout'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.order_id} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 800, color: INK, whiteSpace: 'nowrap' }}>{r.order_name}<div style={{ fontSize: '11px', fontWeight: 500, color: SAGE }}>{r.shop ? r.shop.replace('.myshopify.com', '') : 'Manual order'}{r.awb ? ` · AWB ${r.awb}` : ''}</div></td>
                      <td style={{ padding: '12px 14px', fontSize: '12.5px', color: INK, whiteSpace: 'nowrap' }}>{day(r.created_at)}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12.5px', color: INK, whiteSpace: 'nowrap' }}>{r.customer}<div style={{ fontSize: '11px', color: SAGE }}>{r.city || ''}</div></td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: INK, whiteSpace: 'nowrap' }}>{rupees(r.amount)}{Number(r.prepaid) > 0 && <div style={{ fontSize: '11px', color: SAGE }}>+ {rupees(r.prepaid)} paid online</div>}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12.5px', color: SAGE, whiteSpace: 'nowrap' }}>{r.stage === 'rto' ? '—' : `− ${rupees(r.fee)}`}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 800, color: r.stage === 'rto' ? SAGE : INK, whiteSpace: 'nowrap' }}>{rupees(r.net)}</td>
                      <td style={{ padding: '12px 14px' }}><Stage stage={r.stage} /></td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: INK, whiteSpace: 'nowrap' }}>{r.payout ? <>{day(r.payout.date)}<div style={{ fontSize: '11px', color: SAGE }}>UTR {r.payout.utr}</div></> : <span style={{ color: SAGE }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <p style={{ fontSize: '11.5px', color: SAGE, marginTop: '10px', lineHeight: 1.55 }}>
        Printing, shipping and GST for COD orders are paid from your wallet when the order is placed, like any order. If a parcel comes back (RTO), nothing is collected and the return shipping is charged to your wallet.
      </p>
    </div>
  )
}
