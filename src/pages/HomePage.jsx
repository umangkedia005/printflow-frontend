import { useNavigate } from 'react-router-dom'
import StoreConnectForm from '../components/StoreConnectForm'
import { useAuth } from '../contexts/AuthContext'

const STATS = [
  { value: '10K+', label: 'Stores connected' },
  { value: '2M+',  label: 'Orders fulfilled' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.9★', label: 'Merchant rating' },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Instant Integration',
    desc: 'Connect your Shopify store in seconds via secure OAuth — no code, no plugins.',
  },
  {
    icon: '📦',
    title: 'Auto Fulfillment',
    desc: 'Every order is automatically received, queued, and shipped with real-time tracking.',
  },
  {
    icon: '🎨',
    title: 'Your Brand',
    desc: 'Premium printing and branded packaging that feels like luxury to your customers.',
  },
]

const HomePage = () => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, sans-serif', color: '#0A0A0A' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,250,248,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E8E8E4',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#BABAB6' }}>{currentUser?.email}</span>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: '#0A0A0A', color: 'white',
                border: 'none', borderRadius: '8px',
                padding: '7px 16px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              Dashboard →
            </button>
            <button
              onClick={logout}
              style={{
                background: 'transparent', color: '#888',
                border: '1px solid #E8E8E4', borderRadius: '8px',
                padding: '7px 14px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#CCC'; e.currentTarget.style.color = '#333' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E8E8E4'; e.currentTarget.style.color = '#888' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* Hero */}
        <section style={{ padding: '90px 0 72px', textAlign: 'center', animation: 'pf-fade-up 0.5s ease' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#FFFFFF', border: '1px solid #E8E8E4',
            borderRadius: '100px', padding: '5px 14px',
            marginBottom: '32px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: '12px', color: '#555', fontWeight: 500 }}>
              Shopify Print-on-Demand Platform
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 800, lineHeight: 1.05,
            letterSpacing: '-2px', color: '#0A0A0A',
            marginBottom: '24px',
          }}>
            Your store.<br />
            <span style={{ color: '#555' }}>Our fulfilment.</span><br />
            Zero friction.
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#888', maxWidth: '520px',
            margin: '0 auto 56px',
            lineHeight: 1.7,
          }}>
            Connect your Shopify store once and let PrintFlow handle manufacturing,
            printing, and worldwide shipping — all under your brand.
          </p>

          {/* Stats */}
          <div style={{
            display: 'inline-flex', gap: '1px',
            background: '#E8E8E4', borderRadius: '14px',
            overflow: 'hidden', marginBottom: '72px',
            border: '1px solid #E8E8E4',
          }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                background: '#FFFFFF', padding: '18px 28px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#0A0A0A', marginBottom: '2px' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '11px', color: '#BABAB6', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Connect card */}
          <div style={{
            maxWidth: '440px', margin: '0 auto 96px',
            background: '#FFFFFF',
            border: '1px solid #E8E8E4',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)',
            textAlign: 'left',
          }}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <div style={{
                width: '44px', height: '44px',
                background: '#F4F4F0', border: '1px solid #E8E8E4',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', margin: '0 auto 14px',
              }}>🔗</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#0A0A0A', marginBottom: '4px' }}>
                Connect Your Store
              </h2>
              <p style={{ fontSize: '13px', color: '#999' }}>OAuth-secured · Takes 30 seconds</p>
            </div>

            <StoreConnectForm />

            <div style={{
              display: 'flex', justifyContent: 'center', gap: '20px',
              marginTop: '20px', paddingTop: '20px',
              borderTop: '1px solid #F0F0EC',
            }}>
              {['🔒 Secure OAuth', '✓ No credit card', '⚡ Instant setup'].map(t => (
                <span key={t} style={{ fontSize: '11px', color: '#BABAB6', whiteSpace: 'nowrap' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '80px',
            textAlign: 'left',
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                border: '1px solid #E8E8E4',
                borderRadius: '14px',
                padding: '28px',
              }}>
                <div style={{
                  width: '44px', height: '44px',
                  background: '#F4F4F0', border: '1px solid #E8E8E4',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', marginBottom: '18px',
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: '#0A0A0A', marginBottom: '8px' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E8E4', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            width: '22px', height: '22px', background: '#0A0A0A', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: 'white',
          }}>✦</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#0A0A0A' }}>
            PrintFlow
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#BABAB6' }}>
          © 2026 PrintFlow. Print-on-Demand Platform for Shopify Merchants.
        </p>
      </footer>
    </div>
  )
}

export default HomePage
