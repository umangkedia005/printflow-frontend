import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchCatalogue, SUPPORT_EMAIL, SUPPORT_PHONES } from '../utils/api'

// The public homepage: short and clear, in the spirit of Unitee's — a hero,
// three "what you get" blocks, real products, a few examples, FAQ, footer.
// Only true claims (India shipping, real prices, real catalogue).

const INK = '#172B15'
const SAGE = '#5E6F62'
const LINE = 'rgba(23,43,21,0.10)'
const LIME = '#B9F95D'
const CREAM = '#F6F5EF'

const PHONE = SUPPORT_PHONES[0]
const WHATSAPP = `https://wa.me/${PHONE.tel.replace(/\D/g, '')}?text=${encodeURIComponent("Hi No Limit Studio, I'd like to know more about printing for my brand.")}`

const BLOCKS = [
  {
    kicker: 'Go live in minutes',
    title: 'Start selling without stock',
    image: '/images/home/block-sofa.webp',
    points: ['No minimum order: print one piece or a thousand.', 'Pay per order from your wallet. No upfront inventory.', 'Connect your Shopify store and orders flow in automatically.'],
  },
  {
    kicker: 'Made for brands',
    title: 'Your designs, printed properly',
    image: '/images/home/block-printdetail.webp',
    points: ['Premium blanks: tees, oversized fits, hoodies, polos and more.', 'DTF printing on front, back and sleeves, priced by design size.', 'Your own hang tags, courier bags and thank-you cards.'],
  },
  {
    kicker: 'We handle the rest',
    title: 'Printed, packed and shipped',
    image: '/images/home/block-packaging.webp',
    points: ['Dispatched in about 48 hours across India.', 'Courier and tracking number emailed to you.', 'GST invoices for every order, in your dashboard.'],
  },
]

const STEPS = [
  ['Sign up free', 'Create your account in a minute. No card needed.'],
  ['Design your products', 'Pick a garment, place your artwork, set your prices.'],
  ['Get orders', 'From your Shopify store, or place them yourself from your wallet.'],
  ['We print & ship', 'Your customer gets it under your brand. You track it all.'],
]

const LOOKBOOK = [
  ['/images/home/look-red-tee.webp', 'Front print tee'],
  ['/images/home/look-print-closeup.webp', 'Print close-up'],
  ['/images/home/look-pink-tee.webp', 'Oversized tee'],
  ['/images/home/look-back-ticket.webp', 'Back print'],
  ['/images/home/look-hang-tag.webp', 'Your hang tags'],
  ['/images/home/look-back-olive.webp', 'Big back print'],
]

const FAQ = [
  ['How much does it cost?', 'Signing up is free. For each order you pay the garment price, printing and shipping, plus GST — all shown before you confirm. Shopify stores choose a monthly plan by order volume.'],
  ['Is there a minimum order?', 'No. You can order a single piece, including samples at a discount to check the quality first.'],
  ['Do I need a Shopify store?', 'No. You can place orders yourself from the dashboard. If you have a Shopify store, connect it and its orders come in automatically.'],
  ['Where do you ship, and how fast?', 'Anywhere in India. Orders are usually printed and dispatched within 48 hours, and we email the tracking number.'],
  ['Can I put my own brand on the parcel?', 'Yes. Order your own hang tags, courier bags and thank-you cards; we keep them and use them on your orders.'],
]

function Check() {
  return (
    <span aria-hidden="true" style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: LIME, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.6l4.5-5" stroke={INK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  )
}

function Button({ children, onClick, href, kind = 'primary', style: extra, ...rest }) {
  const style = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 26px', borderRadius: '999px',
    fontSize: '15px', fontWeight: 800, fontFamily: 'Inter, sans-serif', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    ...(kind === 'primary' ? { background: LIME, color: INK, border: `1px solid ${LIME}` }
      : kind === 'dark' ? { background: INK, color: '#FFFFFF', border: `1px solid ${INK}` }
        : { background: 'transparent', color: INK, border: `1.5px solid ${INK}` }),
    ...extra,
  }
  return href ? <a href={href} style={style} {...rest}>{children}</a> : <button onClick={onClick} style={style} {...rest}>{children}</button>
}

export default function HomePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [products, setProducts] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [open, setOpen] = useState(0)

  useEffect(() => { fetchCatalogue().then(list => setProducts(list.filter(b => !b.own))).catch(() => {}) }, [])

  const start = () => navigate(currentUser ? '/dashboard' : '/auth')
  const go = id => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const photoOf = (b, c) => c?.image_urls?.[b.views?.[0]?.id] || c?.image_url
  const fromPrice = b => {
    const p = b.variants.filter(v => v.in_stock !== false && Number(v.base_cost) > 0).map(v => Number(v.base_cost))
    return p.length ? Math.min(...p) : null
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, color: INK, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .nh-wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
        .nh-links a, .nh-links button { color: ${INK}; font-size: 14.5px; font-weight: 600; text-decoration: none; background: none; border: none; cursor: pointer; font-family: Inter, sans-serif; }
        .nh-hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; }
        .nh-block { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .nh-block.flip > :first-child { order: 2; }
        .nh-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .nh-products { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .nh-look { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
        .nh-foot { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 40px; }
        .nh-burger { display: none; }
        @media (max-width: 900px) {
          .nh-hero, .nh-block { grid-template-columns: 1fr; gap: 28px; }
          .nh-block.flip > :first-child { order: 0; }
          .nh-steps, .nh-products { grid-template-columns: 1fr 1fr; }
          .nh-look { grid-template-columns: repeat(3, 1fr); }
          .nh-foot { grid-template-columns: 1fr; gap: 24px; }
          .nh-links { display: none !important; }
          .nh-burger { display: inline-flex; }
          .nh-h1 { font-size: 40px !important; }
        }
        @media (max-width: 480px) {
          .nh-cta-row > * { width: 100%; }
          .nh-brand { font-size: 16px !important; }
          .nh-top-cta { padding: 9px 14px !important; font-size: 13px !important; }
          .nh-signin { display: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(246,245,239,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: `1px solid ${LINE}` }}>
        <div className="nh-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', height: '68px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: INK }}>
            <img src="/images/logo_new.jpg" alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
            <span className="nh-brand" style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: '19px', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>No Limit Studio</span>
          </a>
          <nav className="nh-links" style={{ display: 'flex', gap: '28px' }}>
            <button onClick={() => go('products')}>Catalogue</button>
            <button onClick={() => go('how')}>How it works</button>
            <button onClick={() => go('faq')}>FAQ</button>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">Book a call</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!currentUser && <button className="nh-signin" onClick={() => navigate('/auth')} style={{ background: 'none', border: 'none', color: INK, fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign in</button>}
            <Button className="nh-top-cta" onClick={start} style={{ padding: '10px 18px', fontSize: '14px' }}>{currentUser ? 'Dashboard' : 'Get started'}</Button>
            <button className="nh-burger" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}
              style={{ width: '40px', height: '40px', borderRadius: '10px', border: `1px solid ${LINE}`, background: '#FFFFFF', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke={INK} strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="nh-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '14px' }}>
            {[['Catalogue', () => go('products')], ['How it works', () => go('how')], ['FAQ', () => go('faq')]].map(([t, fn]) => (
              <button key={t} onClick={fn} style={{ textAlign: 'left', padding: '12px 4px', background: 'none', border: 'none', borderBottom: `1px solid ${LINE}`, fontSize: '16px', fontWeight: 700, color: INK, fontFamily: 'Inter, sans-serif' }}>{t}</button>
            ))}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 4px', fontSize: '16px', fontWeight: 700, color: INK, textDecoration: 'none', borderBottom: `1px solid ${LINE}` }}>Book a call</a>
            {!currentUser && <button onClick={() => navigate('/auth')} style={{ textAlign: 'left', padding: '12px 4px', background: 'none', border: 'none', fontSize: '16px', fontWeight: 700, color: INK, fontFamily: 'Inter, sans-serif' }}>Sign in</button>}
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="nh-wrap" style={{ padding: '64px 24px 72px' }}>
        <div className="nh-hero">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '999px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, color: SAGE, marginBottom: '22px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#39B54A' }} /> Print-on-demand for Indian brands
            </div>
            <h1 className="nh-h1" style={{ fontFamily: "'Fraunces', serif", fontSize: '54px', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-1.5px', margin: 0 }}>
              You build the brand.<br />We print, pack & ship.
            </h1>
            <p style={{ fontSize: '18px', lineHeight: 1.6, color: SAGE, margin: '22px 0 32px', maxWidth: '520px' }}>
              Design your products, sell them anywhere, and we handle everything from printing to your customer's doorstep. No stock, no minimum order.
            </p>
            <div className="nh-cta-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button onClick={start}>{currentUser ? 'Go to my dashboard' : 'Get started free'}</Button>
              <Button kind="outline" onClick={() => go('products')}>See the catalogue</Button>
            </div>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '20px', fontSize: '14px', fontWeight: 700, color: INK, textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.3 1.4 2.6 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.6.3.1.2.1.7-.1 1.3Z" /></svg>
              Questions? Chat with us on WhatsApp · {PHONE.display}
            </a>
          </div>
          <div style={{ position: 'relative' }}>
            <img src="/images/home/hero-sky.webp" alt="Three people in printed oversized tees sitting on a white wall under a blue sky" style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '28px', boxShadow: '0 30px 60px rgba(23,43,21,0.14)' }} />
            <div style={{ position: 'absolute', left: '-14px', bottom: '28px', background: '#FFFFFF', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 12px 30px rgba(23,43,21,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: LIME, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚚</span>
              <div><div style={{ fontSize: '13px', fontWeight: 800 }}>Dispatched in ~48 hours</div><div style={{ fontSize: '12px', color: SAGE }}>Ship wherever you want</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Three blocks */}
      <section style={{ background: '#FFFFFF', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
        <div className="nh-wrap" style={{ padding: '80px 24px', display: 'grid', gap: '88px' }}>
          {BLOCKS.map((b, i) => (
            <div key={b.title} className={`nh-block${i % 2 ? ' flip' : ''}`}>
              <img src={b.image} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '5 / 4', objectFit: 'cover', borderRadius: '24px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#39B54A' }}>{b.kicker}</div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '38px', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.6px', margin: '10px 0 22px' }}>{b.title}</h2>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {b.points.map(p => <div key={p} style={{ display: 'flex', gap: '12px', fontSize: '16px', lineHeight: 1.5, color: '#2E3B2D' }}><Check />{p}</div>)}
                </div>
                <div style={{ marginTop: '28px' }}><Button kind="dark" onClick={start}>Get started</Button></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real products */}
      <section id="products" className="nh-wrap" style={{ padding: '80px 24px 40px', scrollMarginTop: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '38px', fontWeight: 800, letterSpacing: '-0.6px', margin: 0 }}>Products you can print</h2>
            <p style={{ fontSize: '16px', color: SAGE, margin: '8px 0 0' }}>Garment prices before printing, GST and shipping.</p>
          </div>
          <Button kind="outline" onClick={start}>Start designing</Button>
        </div>
        <div className="nh-products">
          {(products.length ? products.slice(0, 8) : Array.from({ length: 4 }, () => null)).map((b, i) => (
            <button key={b?.blank_id || i} onClick={start} disabled={!b}
              style={{ textAlign: 'left', padding: '10px', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '20px', cursor: b ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', color: INK }}>
              <div style={{ aspectRatio: '1 / 1', borderRadius: '14px', background: '#F1F1EC', overflow: 'hidden' }}>
                {b && photoOf(b, b.colors[0]) && <img src={photoOf(b, b.colors[0])} alt={b.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ padding: '12px 6px 6px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, minHeight: '20px' }}>{b?.name || ' '}</div>
                {b && (
                  <>
                    <div style={{ display: 'flex', gap: '4px', margin: '8px 0' }}>
                      {b.colors.slice(0, 8).map(c => <span key={c.name} title={c.name} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex, border: '1px solid #D8D8D4' }} />)}
                      {b.colors.length > 8 && <span style={{ fontSize: '11px', color: SAGE }}>+{b.colors.length - 8}</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: SAGE }}>{[b.gsm && `${b.gsm} GSM`, b.fabric].filter(Boolean).join(' · ')}</div>
                    {fromPrice(b) != null && <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>From ₹{fromPrice(b)}</div>}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="nh-wrap" style={{ padding: '56px 24px 72px', scrollMarginTop: '80px' }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '38px', fontWeight: 800, letterSpacing: '-0.6px', margin: '0 0 28px' }}>How it works</h2>
        <div className="nh-steps">
          {STEPS.map(([t, d], i) => (
            <div key={t} style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '20px', padding: '22px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: INK, color: LIME, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
              <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '16px' }}>{t}</div>
              <div style={{ fontSize: '14.5px', color: SAGE, marginTop: '6px', lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section className="nh-wrap" style={{ padding: '0 24px 72px' }}>
        <div className="nh-look">
          {LOOKBOOK.map(([src, alt]) => <img key={src} src={src} alt={alt} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '16px' }} />)}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: '#FFFFFF', borderTop: `1px solid ${LINE}`, scrollMarginTop: '80px' }}>
        <div className="nh-wrap" style={{ padding: '72px 24px', maxWidth: '860px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '38px', fontWeight: 800, letterSpacing: '-0.6px', margin: '0 0 24px' }}>Questions</h2>
          {FAQ.map(([q, a], i) => (
            <div key={q} style={{ borderBottom: `1px solid ${LINE}` }}>
              <button onClick={() => setOpen(o => (o === i ? -1 : i))} aria-expanded={open === i}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '17px', fontWeight: 700, color: INK, fontFamily: 'Inter, sans-serif' }}>
                {q}<span style={{ fontSize: '22px', fontWeight: 400, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {open === i && <p style={{ margin: '0 0 20px', fontSize: '15.5px', lineHeight: 1.65, color: SAGE }}>{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="nh-wrap" style={{ padding: '72px 24px' }}>
        <div style={{ background: INK, borderRadius: '28px', padding: '56px 32px', textAlign: 'center', color: '#FFFFFF' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '40px', fontWeight: 800, letterSpacing: '-0.6px', margin: 0 }}>Ready to launch your brand?</h2>
          <p style={{ fontSize: '17px', color: '#B9C4B6', margin: '12px 0 28px' }}>Sign up free and design your first product today.</p>
          <div className="nh-cta-row" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={start}>{currentUser ? 'Go to my dashboard' : 'Get started free'}</Button>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 26px', borderRadius: '999px', border: '1.5px solid #FFFFFF', color: '#FFFFFF', fontSize: '15px', fontWeight: 800, textDecoration: 'none' }}>Book a call</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${LINE}`, background: CREAM }}>
        <div className="nh-wrap nh-foot" style={{ padding: '48px 24px 28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/images/logo_new.jpg" alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: '17px' }}>No Limit Studio</span>
            </div>
            <p style={{ fontSize: '14px', color: SAGE, lineHeight: 1.6, margin: '12px 0 0', maxWidth: '360px' }}>Print-on-demand and fulfilment for brands in India.</p>
          </div>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div style={{ fontWeight: 800 }}>Contact</div>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: SAGE, textDecoration: 'none' }}>{SUPPORT_EMAIL}</a>
            <a href={`tel:${PHONE.tel}`} style={{ color: SAGE, textDecoration: 'none' }}>{PHONE.display}</a>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ color: SAGE, textDecoration: 'none' }}>WhatsApp us</a>
          </div>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div style={{ fontWeight: 800 }}>Policies</div>
            {[['/privacy', 'Privacy Policy'], ['/terms', 'Terms and Conditions'], ['/refund', 'Refund Policy'], ['/cancellation', 'Cancellation Policy'], ['/shipping', 'Shipping and Delivery']].map(([href, t]) => (
              <a key={href} href={href} style={{ color: SAGE, textDecoration: 'none' }}>{t}</a>
            ))}
          </div>
        </div>
        <div className="nh-wrap" style={{ padding: '0 24px 28px', fontSize: '13px', color: SAGE }}>© {new Date().getFullYear()} No Limit Studio</div>
      </footer>
    </div>
  )
}
