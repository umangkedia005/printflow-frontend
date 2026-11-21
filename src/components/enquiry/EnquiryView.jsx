import { useEffect, useState } from 'react'
import { SUPPORT_EMAIL, SUPPORT_PHONES, fetchAccountSettings, sendEnquiry } from '../../utils/api'

// Bulk & Custom: a brand tells us about a bulk order, a custom product or
// private-label work. The form is emailed to the team (replying answers the
// brand); email, call and WhatsApp are right beside it.

const INK = '#172B15'
const SAGE = '#889B8E'
const LINE = 'rgba(23,43,21,0.08)'
const LIME = '#B9F95D'

const TYPES = [
  { id: 'bulk', title: 'Bulk order', text: 'Many pieces of your design at a better price per piece.',
    icon: <path d="M3 7.5 10 4l7 3.5-7 3.5zM3 7.5v5L10 16l7-3.5v-5M10 11v5" /> },
  { id: 'custom', title: 'Custom product', text: 'A garment, colour, fabric or print that isn’t in the catalogue.',
    icon: <path d="M7 3.5 3.5 5.5 5 9l1.5-.5V16h7V8.5L15 9l1.5-3.5L13 3.5c-.4 1.3-1.6 2-3 2s-2.6-.7-3-2z" /> },
  { id: 'brand', title: 'Brand / private label', text: 'Your labels, tags and packaging across your whole range.',
    icon: <><path d="M10.5 3H16v5.5L9 15.5 3.5 10z" /><circle cx="13" cy="6" r="1" /></> },
  { id: 'other', title: 'Something else', text: 'Partnerships, events, merch drops or anything else.',
    icon: <><circle cx="10" cy="10" r="6.5" /><path d="M8.2 8.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4M10 13.6v.1" /></> },
]
const TIMELINES = ['Within 2 weeks', 'Within a month', '1–3 months', 'Just exploring']

const label = { display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }
const input = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1px solid ${LINE}`, borderRadius: '11px', fontSize: '14px', color: INK, fontFamily: 'Inter, sans-serif', outline: 'none', background: '#FFFFFF' }
const card = { background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }

const phone = SUPPORT_PHONES[0]
const whatsapp = `https://wa.me/${phone.tel.replace(/\D/g, '')}?text=${encodeURIComponent("Hi No Limit Studio, I'd like to talk about a bulk / custom order.")}`

function Icon({ children, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}

const blank = email => ({ type: 'bulk', name: '', brand: '', phone: '', email: email || '', product: '', quantity: '', timeline: '', message: '' })

export default function EnquiryView({ accountEmail }) {
  const [form, setForm] = useState(() => blank(accountEmail))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  // Fill in what we already know from Settings (only empty fields).
  useEffect(() => {
    fetchAccountSettings().then(s => {
      const b = s.billing || {}, sh = s.shipping || {}
      setForm(f => ({
        ...f,
        brand: f.brand || sh.brand_name || b.business_name || '',
        phone: f.phone || b.phone || '',
        email: f.email || b.email || '',
      }))
    }).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Enter your name')
    if (form.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').length !== 10) return setError('Enter a 10-digit phone number')
    if (form.message.trim().length < 10) return setError('Tell us a little more about what you need')
    setSending(true)
    try {
      await sendEnquiry(form)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const type = TYPES.find(t => t.id === form.type)

  return (
    <div style={{ maxWidth: '1120px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '30px', fontWeight: 800, color: INK, margin: 0, letterSpacing: '-0.4px' }}>Bulk & custom orders</h1>
        <p style={{ fontSize: '14.5px', color: SAGE, margin: '6px 0 0', lineHeight: 1.6 }}>Planning something bigger or different? Tell us about it and our team will get back to you with options and a price.</p>
      </div>

      {/* What it's about: picking a card also sets the form. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        {TYPES.map(t => {
          const active = form.type === t.id
          return (
            <button key={t.id} type="button" onClick={() => { set({ type: t.id }); setSent(false) }} aria-pressed={active}
              style={{ ...card, textAlign: 'left', padding: '16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: active ? `2px solid ${INK}` : `1px solid ${LINE}`, background: active ? '#F6F9EF' : '#FFFFFF', display: 'flex', gap: '12px', alignItems: 'flex-start', transition: 'all 0.15s' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: active ? LIME : '#F4F5F0', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon>{t.icon}</Icon></span>
              <span>
                <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 800, color: INK }}>{t.title}</span>
                <span style={{ display: 'block', fontSize: '12.5px', color: SAGE, lineHeight: 1.5, marginTop: '3px' }}>{t.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '18px', alignItems: 'start' }} className="enquiry-grid">
        <div style={{ ...card, padding: '24px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: LIME, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Icon size={26}><path d="m5 10.5 3.2 3L15 6.5" strokeWidth="2" /></Icon>
              </div>
              <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '22px', fontWeight: 800, color: INK, margin: 0 }}>Enquiry sent</h2>
              <p style={{ fontSize: '14px', color: SAGE, lineHeight: 1.6, margin: '8px auto 20px', maxWidth: '380px' }}>
                Thanks, {form.name.split(' ')[0]}. We’ve emailed you a copy, and our team will get back to you soon on {form.email || 'email'} or {form.phone}.
              </p>
              <button type="button" onClick={() => { setForm(f => ({ ...blank(f.email), name: f.name, brand: f.brand, phone: f.phone })); setSent(false) }}
                style={{ border: `1px solid ${LINE}`, background: '#FFFFFF', color: INK, borderRadius: '11px', padding: '10px 18px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Send another enquiry</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div style={{ fontSize: '15px', fontWeight: 800, color: INK, marginBottom: '16px' }}>Tell us about your {type.title.toLowerCase()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label><span style={label}>Your name *</span>
                  <input style={input} value={form.name} maxLength={80} onChange={e => set({ name: e.target.value })} placeholder="e.g. Riya Sharma" autoComplete="name" /></label>
                <label><span style={label}>Brand name</span>
                  <input style={input} value={form.brand} maxLength={80} onChange={e => set({ brand: e.target.value })} placeholder="e.g. Riya Prints" /></label>
                <label><span style={label}>Phone *</span>
                  <input style={input} value={form.phone} maxLength={16} inputMode="tel" onChange={e => set({ phone: e.target.value })} placeholder="10-digit mobile" autoComplete="tel" /></label>
                <label><span style={label}>Email</span>
                  <input style={input} value={form.email} maxLength={120} type="email" onChange={e => set({ email: e.target.value })} placeholder="We reply here" autoComplete="email" /></label>
                <label><span style={label}>Product</span>
                  <input style={input} value={form.product} maxLength={120} onChange={e => set({ product: e.target.value })} placeholder="e.g. Oversized tees, hoodies" /></label>
                <label><span style={label}>Quantity (approx.)</span>
                  <input style={input} value={form.quantity} inputMode="numeric" onChange={e => set({ quantity: e.target.value.replace(/\D/g, '').slice(0, 7) })} placeholder="e.g. 300" /></label>
              </div>

              <div style={{ marginTop: '16px' }}>
                <span style={label}>When do you need it?</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {TIMELINES.map(t => {
                    const on = form.timeline === t
                    return (
                      <button key={t} type="button" onClick={() => set({ timeline: on ? '' : t })} aria-pressed={on}
                        style={{ border: on ? `1.5px solid ${INK}` : `1px solid ${LINE}`, background: on ? INK : '#FFFFFF', color: on ? '#FFFFFF' : INK, borderRadius: '100px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t}</button>
                    )
                  })}
                </div>
              </div>

              <label style={{ display: 'block', marginTop: '16px' }}><span style={label}>What do you need? *</span>
                <textarea style={{ ...input, minHeight: '120px', resize: 'vertical', lineHeight: 1.55 }} value={form.message} maxLength={2000} onChange={e => set({ message: e.target.value })}
                  placeholder="Colours, sizes, print positions, fabric, packaging, budget, a link to a reference… anything that helps us quote." /></label>
              <div style={{ fontSize: '11.5px', color: SAGE, textAlign: 'right', marginTop: '4px' }}>{form.message.length}/2000</div>

              {error && <div role="alert" style={{ background: '#FCEBEB', color: '#B42318', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', fontWeight: 600, marginTop: '10px' }}>{error}</div>}

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button type="submit" disabled={sending}
                  style={{ background: LIME, color: INK, border: 'none', borderRadius: '12px', padding: '13px 24px', fontSize: '14.5px', fontWeight: 800, cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'Inter, sans-serif', boxShadow: '0 6px 16px rgba(185,249,93,0.35)' }}>
                  {sending ? 'Sending…' : 'Send enquiry →'}
                </button>
                <span style={{ fontSize: '12.5px', color: SAGE }}>It goes straight to our team’s inbox.</span>
              </div>
            </form>
          )}
        </div>

        {/* Prefer to talk: email, call, WhatsApp, and what happens next. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ ...card, padding: '20px', background: INK, border: 'none', color: '#FFFFFF' }}>
            <div style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800 }}>Prefer to talk?</div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '6px 0 14px', lineHeight: 1.55 }}>Email or call us directly.</p>
            {[
              { href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Enquiry · ${type.title}`)}`, top: 'Email us', main: SUPPORT_EMAIL, icon: <><rect x="3" y="5" width="14" height="10" rx="2" /><path d="m3.5 6 6.5 5 6.5-5" /></> },
              { href: `tel:${phone.tel}`, top: 'Call us', main: phone.display, icon: <path d="M5.5 3.5h2l1 3-1.5 1a8 8 0 0 0 4.5 4.5l1-1.5 3 1v2a1.5 1.5 0 0 1-1.6 1.5A12 12 0 0 1 4 5.1 1.5 1.5 0 0 1 5.5 3.5z" /> },
              { href: whatsapp, top: 'WhatsApp', main: 'Chat with us', icon: <><path d="M4 16l1-3.2A6.5 6.5 0 1 1 7.4 15z" /><path d="M8 7.5c0 2.2 1.9 4.5 4.5 4.5l.7-1.3-1.4-.7-.6.6c-.9-.4-1.5-1-1.9-1.9l.6-.6-.7-1.4z" /></>, external: true },
            ].map(c => (
              <a key={c.top} href={c.href} {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.07)', color: '#FFFFFF', textDecoration: 'none', marginBottom: '8px' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}>
                <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: LIME, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18}>{c.icon}</Icon></span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{c.top}</span>
                  <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, overflowWrap: 'anywhere' }}>{c.main}</span>
                </span>
              </a>
            ))}
          </div>

          <div style={{ ...card, padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: INK, marginBottom: '12px' }}>What happens next</div>
            {['We read your enquiry and may call to understand it better.', 'You get options, samples if needed, and a price.', 'Once you approve, we make it and ship it.'].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: i < 2 ? '12px' : 0 }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#F4F5F0', color: INK, fontSize: '11.5px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: '#4A5548', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .enquiry-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
