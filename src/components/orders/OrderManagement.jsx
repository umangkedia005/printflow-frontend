import { useEffect, useMemo, useState } from 'react'
import { fetchOrderManagement, openInvoice } from '../../utils/api'

// Order Management: all of a brand's orders in one place (manual, sample and
// Shopify), with how much they've ordered and spent for any period.

const INK = '#172B15'
const SAGE = '#889B8E'
const LINE = 'rgba(23,43,21,0.08)'

const STATUS = {
  awaiting: ['Awaiting print', '#FFF7ED', '#C2410C'],
  queued: ['Queued', '#F4F4F0', '#4A5548'],
  printing: ['Printing', '#EAF0FA', '#2B5BA8'],
  shipped: ['In transit', '#F3EEFB', '#6D3FC0'],
  delivered: ['Delivered', '#F0FDF4', '#166534'],
}
const TABS = [['all', 'All orders'], ['awaiting', 'Awaiting print'], ['queued', 'Queued'], ['printing', 'Printing'], ['shipped', 'In transit'], ['delivered', 'Delivered']]
const TYPES = { shopify: 'Shopify', manual: 'Manual', sample: 'Sample' }

const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const day = iso => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const localDay = iso => (iso ? ymd(new Date(iso)) : '')

function presets() {
  const now = new Date()
  const firstThis = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0)
  const d30 = new Date(now); d30.setDate(now.getDate() - 29)
  return [
    ['All time', '', ''],
    ['This month', ymd(firstThis), ymd(now)],
    ['Last month', ymd(firstLast), ymd(lastOfLast)],
    ['Last 30 days', ymd(d30), ymd(now)],
  ]
}

function toCsv(rows) {
  const cell = v => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['Order', 'Type', 'Store', 'Date', 'Customer', 'City', 'Pieces', 'Products', 'Status', 'Order total (your customer)', 'Paid from wallet', 'Invoice number', 'Courier', 'Tracking number', 'Reference']
  const body = rows.map(r => [
    r.order_name, TYPES[r.type], r.shop || '', localDay(r.created_at), r.customer, r.city || '', r.pieces, r.products.join('; '),
    STATUS[r.status]?.[0] || r.status, r.type === 'shopify' ? r.order_total : '', r.paid ?? '', r.invoice_number || '', r.tracking?.courier || '', r.tracking?.number || '', r.reference || '',
  ])
  return [head, ...body].map(line => line.map(cell).join(',')).join('\r\n')
}

function Stat({ label, value, hint, accent }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '18px', padding: '16px 18px', minWidth: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '24px', fontWeight: 800, color: accent || INK, marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {hint && <div style={{ fontSize: '11.5px', color: SAGE, marginTop: '2px' }}>{hint}</div>}
    </div>
  )
}

const control = { padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: '11px', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: INK, background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }

export default function OrderManagement({ onOpenOrders }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('all')
  const [tab, setTab] = useState('all')
  const [invoiceError, setInvoiceError] = useState('')
  const invoice = id => { setInvoiceError(''); openInvoice('order', id).catch(e => setInvoiceError(e.message)) }

  useEffect(() => {
    fetchOrderManagement().then(setData).catch(e => setError(e.message))
  }, [])

  // Date range, type and search shape the totals; the status tab only the list.
  const inRange = useMemo(() => (data?.orders || []).filter(r => {
    const d = localDay(r.created_at)
    if (from && d < from) return false
    if (to && d > to) return false
    if (type !== 'all' && r.type !== type) return false
    if (q) {
      const hay = `${r.order_name} ${r.order_id} ${r.customer} ${r.reference || ''} ${r.tracking?.number || ''}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }), [data, from, to, type, q])
  const rows = tab === 'all' ? inRange : inRange.filter(r => r.status === tab)
  const count = t => (t === 'all' ? inRange.length : inRange.filter(r => r.status === t).length)

  const pieces = inRange.reduce((n, r) => n + r.pieces, 0)
  const paidRows = inRange.filter(r => r.paid != null)
  const spent = paidRows.reduce((n, r) => n + Number(r.paid), 0)
  const awaiting = count('awaiting')

  function download() {
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `orders-${from || 'start'}-to-${to || ymd(new Date())}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const activePreset = presets().find(([, f, t]) => f === from && t === to)?.[0]

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>Order Management</h1>
        <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Every order you've placed or received, and how much you've spent on printing.</p>
      </div>

      <div className="pf-cards-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Stat label="Orders" value={inRange.length.toLocaleString('en-IN')} hint={activePreset || (from || to ? 'In the dates chosen' : 'All time')} />
        <Stat label="Pieces" value={pieces.toLocaleString('en-IN')} hint="Garments ordered" />
        <Stat label="Spent on printing" value={rupees(spent)} hint="Paid from your wallet" />
        <Stat label="Avg per order" value={rupees(paidRows.length ? spent / paidRows.length : 0)} hint={awaiting ? `${awaiting} awaiting print` : 'Across paid orders'} accent={undefined} />
      </div>

      <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '18px', padding: '14px', marginBottom: '16px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by order number, customer, reference or tracking number" style={{ ...control, width: '100%', background: '#FAFBF7' }} />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: SAGE, fontWeight: 600 }}>From <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={control} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: SAGE, fontWeight: 600 }}>To <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={control} /></label>
          <select value={type} onChange={e => setType(e.target.value)} style={control}>
            <option value="all">All order types</option>
            <option value="shopify">Shopify orders</option>
            <option value="manual">Manual orders</option>
            <option value="sample">Samples</option>
          </select>
          <button onClick={download} disabled={!rows.length} className="pf-btn" style={{ marginLeft: 'auto', padding: '10px 16px', fontSize: '13px', fontWeight: 700, background: INK, color: '#FFFFFF', borderRadius: '11px' }}>⬇ Download Excel ({rows.length})</button>
        </div>
        <div className="pf-scroll-x" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          {presets().map(([label, f, t]) => (
            <button key={label} onClick={() => { setFrom(f); setTo(t) }} style={{ padding: '5px 11px', borderRadius: '100px', border: `1px solid ${activePreset === label ? INK : LINE}`, background: activePreset === label ? INK : '#FFFFFF', color: activePreset === label ? '#FFFFFF' : '#4A5548', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="pf-scroll-x" style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${LINE}`, marginBottom: '14px', flexWrap: 'wrap' }}>
        {TABS.map(([id, label]) => {
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 12px', border: 'none', borderBottom: `2px solid ${active ? INK : 'transparent'}`, background: 'none', color: active ? INK : SAGE, fontSize: '13px', fontWeight: active ? 800 : 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '-1px' }}>
              {label} <span style={{ fontSize: '11px', fontWeight: 700, color: id === 'awaiting' && count(id) ? '#C2410C' : SAGE }}>{count(id)}</span>
            </button>
          )
        })}
      </div>

      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}
      {invoiceError && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#C53030' }}>⚠ {invoiceError}</div>}
      {tab === 'awaiting' && rows.length > 0 && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', fontSize: '12.5px', color: '#9A3412', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          These Shopify orders haven't been sent to print yet. Open one under Orders and click "Send to Print Factory".
          {onOpenOrders && <button onClick={onOpenOrders} style={{ background: '#9A3412', color: '#FFFFFF', border: 'none', borderRadius: '9px', padding: '7px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Go to Orders</button>}
        </div>
      )}

      <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '18px', overflow: 'hidden' }}>
        {!data && !error ? (
          <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>Loading your orders…</div>
        ) : !rows.length ? (
          <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>{data?.orders?.length ? 'No orders match these filters.' : 'No orders yet.'}</div>
        ) : (
          <>
            <div className="pf-mobile-only">
              {rows.map((r, i) => {
                const [label, bg, fg] = STATUS[r.status] || STATUS.queued
                return (
                  <div key={r.order_id} style={{ padding: '14px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: INK, fontSize: '13px' }}>{r.order_name} <TypeTag type={r.type} /></span>
                      <span style={{ background: bg, color: fg, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: INK, marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.pieces} pc · {r.products[0] || '—'}{r.products.length > 1 ? ` +${r.products.length - 1}` : ''}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '4px', fontSize: '12px', color: SAGE }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customer}{r.city ? `, ${r.city}` : ''} · {day(r.created_at)}</span>
                      <span style={{ flexShrink: 0, fontWeight: 800, color: r.paid == null ? SAGE : INK }}>{r.paid == null ? 'Not paid yet' : rupees(r.paid)}</span>
                    </div>
                    {r.invoiceable && <button onClick={() => invoice(r.order_id)} style={{ marginTop: '8px', background: 'none', border: `1px solid ${LINE}`, borderRadius: '8px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>⬇ Invoice</button>}
                  </div>
                )
              })}
            </div>
            <div className="pf-desktop-only" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '940px' }}>
                <thead>
                  <tr style={{ background: '#FAFBF7' }}>
                    {['Order', 'Date', 'Customer', 'Products', 'Pieces', 'Order total', 'Paid from wallet', 'Status', 'Invoice'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const [label, bg, fg] = STATUS[r.status] || STATUS.queued
                    return (
                      <tr key={r.order_id} style={{ borderBottom: `1px solid ${LINE}` }}>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 800, color: INK, whiteSpace: 'nowrap' }}>{r.order_name}<div style={{ marginTop: '3px' }}><TypeTag type={r.type} /></div></td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px', color: INK, whiteSpace: 'nowrap' }}>{day(r.created_at)}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px', color: INK }}>{r.customer}<div style={{ fontSize: '11px', color: SAGE }}>{r.city || ''}</div></td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: INK, maxWidth: '240px' }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.products.join('\n')}>{r.products[0] || '—'}</div>{r.products.length > 1 && <div style={{ fontSize: '11px', color: SAGE }}>+{r.products.length - 1} more</div>}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: INK }}>{r.pieces}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12.5px', color: SAGE, whiteSpace: 'nowrap' }}>{r.type === 'shopify' ? rupees(r.order_total) : '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 800, color: r.paid == null ? SAGE : INK, whiteSpace: 'nowrap' }}>{r.paid == null ? 'Not paid yet' : rupees(r.paid)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: bg, color: fg, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
                          {r.tracking?.url && <a href={r.tracking.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: INK, fontWeight: 700 }}>Track ↗</a>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {r.invoiceable
                            ? <button onClick={() => invoice(r.order_id)} title={r.invoice_number || 'Tax invoice'} style={{ background: 'none', border: `1px solid ${LINE}`, borderRadius: '8px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>⬇ Download</button>
                            : <span style={{ fontSize: '11px', color: SAGE }}>After printing</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <p style={{ fontSize: '11.5px', color: SAGE, marginTop: '10px' }}>"Order total" is what your customer paid on Shopify; "Paid from wallet" is what printing and shipping cost you. The Excel file is a CSV that opens in Excel or Google Sheets.</p>
    </div>
  )
}

function TypeTag({ type }) {
  const style = {
    shopify: ['#F4F4F0', '#4A5548'],
    manual: ['#FDF6E3', '#8A6A12'],
    sample: ['#EAF0FA', '#2B5BA8'],
  }[type] || ['#F4F4F0', '#4A5548']
  return <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', background: style[0], color: style[1], verticalAlign: 'middle' }}>{TYPES[type] || type}</span>
}
