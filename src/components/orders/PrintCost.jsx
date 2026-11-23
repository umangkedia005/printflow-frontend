import { useEffect, useState } from 'react'
import { fetchFulfillQuote } from '../../utils/api'

const METHODS = [['surface', 'Surface', '4 to 7 days'], ['air', 'Air', '2 to 4 days']]

// Before a Shopify order goes to print: the shipping choice and what it will
// take from the wallet (product + GST + shipping + GST on shipping).
// The amount comes from the server and is sent back with the confirmation, so
// the brand is never charged anything other than what it saw here.

const INK = '#172B15', SAGE = '#889B8E', LINE = 'rgba(23,43,21,0.08)'
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Row({ label, value, strong, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0', fontSize: strong ? '14px' : '12.5px', fontWeight: strong ? 800 : 500, color: tone || (strong ? INK : SAGE) }}>
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
      <span style={{ flexShrink: 0, color: tone || INK }}>{value}</span>
    </div>
  )
}

function Notice({ children, action }) {
  return (
    <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '10px 12px', marginTop: '10px', fontSize: '12.5px', color: '#9A3412', lineHeight: 1.5 }}>
      {children}
      {action}
    </div>
  )
}

// refreshKey: changes when a send fails, so the amounts are read again.
export default function PrintCost({ shop, orderId, sending, refreshKey, onSend, onTopUp }) {
  const [loaded, setLoaded] = useState(null)
  // null until the brand picks: the server preselects the order's method.
  const [picked, setPicked] = useState(null)
  const choice = picked?.orderId === orderId ? picked.method : null

  useEffect(() => {
    let stale = false
    fetchFulfillQuote(shop, orderId, choice)
      .then(quote => { if (!stale) setLoaded({ orderId, choice, quote, error: '' }) })
      .catch(err => { if (!stale) setLoaded({ orderId, choice, quote: null, error: err.message }) })
    return () => { stale = true }
  }, [shop, orderId, choice, refreshKey])

  const current = loaded?.orderId === orderId && (!choice || loaded.choice === choice) ? loaded : null
  const quote = current?.quote
  const error = current?.error

  const buttonText = sending ? 'Sending…'
    : !current ? 'Checking the cost…'
    : quote?.can_send ? `Pay ${rupees(quote.total)} & Send to Print Factory →`
    : 'Send to Print Factory'

  const selected = choice || quote?.shipping_method || loaded?.quote?.shipping_method
  const prices = quote?.options || (loaded?.orderId === orderId ? loaded.quote?.options : null)

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, marginBottom: '6px' }}>Shipping</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {METHODS.map(([id, label, days]) => (
          <button key={id} onClick={() => setPicked({ orderId, method: id })} disabled={sending} aria-pressed={selected === id}
            style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '9px 12px', borderRadius: '12px', border: selected === id ? `1.5px solid ${INK}` : '1px solid rgba(23,43,21,0.12)', background: selected === id ? '#F6F7F2' : '#FFFFFF', cursor: sending ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: INK }}>{label}</div>
            <div style={{ fontSize: '11px', color: SAGE, marginTop: '2px' }}>{days}{prices && !quote?.missing?.length ? ` · ${rupees(prices[id])}` : ''}</div>
          </button>
        ))}
      </div>
      <div style={{ border: `1px solid ${LINE}`, borderRadius: '12px', padding: '12px 14px', background: '#FAFBF7' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, marginBottom: '6px' }}>Cost to print this order</div>
        {!current && <div style={{ fontSize: '12.5px', color: SAGE, padding: '6px 0' }}>Checking the cost…</div>}
        {error && <div style={{ fontSize: '12.5px', color: '#C53030', padding: '6px 0' }}>Couldn't load the cost: {error}</div>}
        {quote && (
          <>
            {quote.lines.map((l, i) => <Row key={i} label={`${l.name} × ${l.qty}`} value={rupees(l.amount)} />)}
            {quote.missing.map(name => <Row key={name} label={name} value="Price pending" tone="#C2410C" />)}
            {!quote.missing.length && (
              <>
                <Row label={`GST on product (${quote.product_tax_rates.join('% + ')}%)`} value={rupees(quote.product_tax)} />
                <Row label={`Shipping (${quote.shipping_method === 'air' ? 'Air' : 'Surface'})`} value={rupees(quote.shipping)} />
                <Row label={`GST on shipping (${quote.shipping_tax_pct}%)`} value={rupees(quote.shipping_tax)} />
              </>
            )}
            <div style={{ borderTop: `1px solid ${LINE}`, margin: '6px 0' }} />
            <Row label="You pay from wallet" value={quote.missing.length ? '—' : rupees(quote.total)} strong />
            <Row label="Wallet balance" value={rupees(quote.balance)} />
            {!quote.missing.length && quote.short <= 0 && <Row label="Balance after" value={rupees(quote.balance_after)} />}
          </>
        )}
      </div>

      {quote?.blocked && <Notice>{quote.blocked}</Notice>}
      {quote && !quote.blocked && quote.missing.length > 0 && <Notice>Waiting for our team to set the price for this product. You can send it to print once it's set.</Notice>}
      {quote && !quote.blocked && !quote.missing.length && quote.short > 0 && (
        <Notice action={
          <button onClick={onTopUp} style={{ display: 'block', marginTop: '6px', background: 'none', border: 'none', padding: 0, color: '#9A3412', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Top up wallet →</button>
        }>Your wallet is {rupees(quote.short)} short for this order.</Notice>
      )}

      <button
        className="pf-btn"
        disabled={sending || !quote?.can_send}
        onClick={() => onSend(quote.total, quote.shipping_method)}
        style={{ width: '100%', padding: '13px', marginBottom: '10px', marginTop: '12px', opacity: sending || !quote?.can_send ? 0.55 : 1, cursor: sending || !quote?.can_send ? 'not-allowed' : 'pointer' }}
      >
        {buttonText}
      </button>
    </div>
  )
}
