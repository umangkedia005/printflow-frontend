import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const STEPS = [
  { icon: '🔄', title: 'Syncing Products', desc: 'Your Shopify product catalog is being imported automatically.' },
  { icon: '⚡', title: 'Webhooks Active',  desc: 'New orders will be received and queued for production instantly.' },
  { icon: '🖨️', title: 'Print & Ship',    desc: 'We manufacture, print, and ship orders under your brand.' },
  { icon: '📍', title: 'Tracking Updates', desc: 'Tracking numbers are pushed back to your Shopify store.' },
]

const SuccessPage = () => {
  const [searchParams] = useSearchParams()
  const [shopDomain, setShopDomain] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const shop = searchParams.get('shop')
    if (shop) {
      setShopDomain(shop)
      localStorage.setItem('pf_shop', shop)
    }
  }, [searchParams])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, sans-serif', color: '#0A0A0A' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid #E8E8E4',
        background: '#FFFFFF',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center',
          height: '60px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: '#0A0A0A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', color: 'white',
            }}>✦</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#0A0A0A' }}>
              PrintFlow
            </span>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '600px', margin: '0 auto',
        padding: '64px 24px',
        animation: 'pf-fade-up 0.4s ease',
      }}>

        {/* Success card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E8E8E4',
          borderRadius: '20px',
          padding: '48px',
          textAlign: 'center',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          {/* Check */}
          <div style={{
            width: '64px', height: '64px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '26px', fontWeight: 800,
            color: '#0A0A0A', marginBottom: '10px',
            letterSpacing: '-0.3px',
          }}>
            Store Connected!
          </h1>

          {shopDomain && (
            <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.6, marginBottom: '32px' }}>
              <strong style={{ color: '#0A0A0A', fontWeight: 600 }}>{shopDomain}</strong>
              {' '}is now live on PrintFlow.
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="pf-btn"
              style={{ padding: '12px 28px' }}
            >
              Go to Dashboard →
            </button>
            {shopDomain && (
              <a
                href={`https://${shopDomain}/admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="pf-btn-outline"
                style={{ padding: '12px 28px' }}
              >
                Open Shopify Admin ↗
              </a>
            )}
          </div>
        </div>

        {/* What happens next */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E8E8E4',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#BABAB6', marginBottom: '20px',
          }}>
            What happens next
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '14px 16px',
                background: '#FAFAF8',
                border: '1px solid #F0F0EC',
                borderRadius: '12px',
              }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  background: '#FFFFFF', border: '1px solid #E8E8E4',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px',
                }}>{step.icon}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A', marginBottom: '3px' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support links */}
        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          {['Documentation', 'Contact Support', 'Video Tutorial'].map(l => (
            <a key={l} href="#" style={{
              fontSize: '12px', color: '#BABAB6',
              textDecoration: 'none', fontWeight: 500,
              transition: 'color 0.15s',
            }}
              onMouseOver={e => e.target.style.color = '#555'}
              onMouseOut={e => e.target.style.color = '#BABAB6'}
            >{l}</a>
          ))}
        </div>
      </main>
    </div>
  )
}

export default SuccessPage
