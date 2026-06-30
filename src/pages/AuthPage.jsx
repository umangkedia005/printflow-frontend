import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FEATURES = [
  { icon: '⚡', text: 'Orders fulfilled in 24–48 hours' },
  { icon: '🖨️', text: 'Premium print quality, every time' },
  { icon: '📦', text: 'White-label packaging under your brand' },
  { icon: '📍', text: 'Live tracking pushed to Shopify' },
]

export default function AuthPage() {
  const [isLogin, setIsLogin]   = useState(true)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const { currentUser, login, signup, loginWithGoogle, loginWithApple } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) await login(email, password)
      else await signup(email, password)
    } catch (err) {
      setError(isLogin ? 'Invalid email or password.' : err.message)
      setLoading(false)
    }
  }

  async function handleSocialLogin(provider) {
    setError('')
    setLoading(true)
    try {
      if (provider === 'google') await loginWithGoogle()
      if (provider === 'apple')  await loginWithApple()
    } catch (err) {
      setError(`${provider} sign-in failed. ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '48%', flexShrink: 0,
        background: '#0A0A0A',
        display: 'flex', flexDirection: 'column',
        padding: '48px',
        position: 'relative', overflow: 'hidden',
      }}
        className="auth-left-panel"
      >
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', top: '-120px', left: '-120px',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(120,80,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(255,120,50,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', color: '#0A0A0A', fontWeight: 800, flexShrink: 0,
          }}>✦</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'white', letterSpacing: '-0.2px' }}>
            No Limit Studio
          </span>
        </div>

        {/* Main copy */}
        <div style={{ marginTop: 'auto', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '100px', padding: '5px 14px', marginBottom: '28px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.04em' }}>
              Print-on-demand for Shopify
            </span>
          </div>

          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '36px', fontWeight: 800,
            color: 'white', lineHeight: 1.15,
            letterSpacing: '-0.8px', marginBottom: '20px',
          }}>
            Your brand.<br />Our factory.<br />
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Zero limits.</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                }}>{f.icon}</div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
          © 2026 No Limit Studio · Trusted by 10,000+ Shopify merchants
        </p>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        background: '#FAFAF8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: '380px', animation: 'pf-fade-up 0.4s ease' }}>

          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '24px', fontWeight: 800,
              color: '#0A0A0A', letterSpacing: '-0.4px', marginBottom: '6px',
            }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ fontSize: '13px', color: '#999' }}>
              {isLogin ? 'Sign in to your No Limit Studio account.' : 'Start your print-on-demand journey.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FFF5F5', border: '1px solid #FED7D7',
              borderRadius: '8px', padding: '10px 14px',
              marginBottom: '20px', fontSize: '13px', color: '#C53030',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Social */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px 14px',
                background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '10px',
                fontSize: '13px', fontWeight: 500, color: '#333',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.12s, box-shadow 0.12s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#C8C8C4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E8E8E4'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px 14px',
                background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '10px',
                fontSize: '13px', fontWeight: 500, color: '#333',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.12s, box-shadow 0.12s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#C8C8C4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E8E8E4'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0A">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
              </svg>
              Apple
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E8E8E4' }} />
            <span style={{ fontSize: '11px', color: '#C8C8C4', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E8E8E4' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>Email</label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pf-input"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pf-input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#C8C8C4', fontSize: '13px', padding: 0, lineHeight: 1,
                  }}
                >{showPass ? '○' : '●'}</button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pf-btn"
              style={{ width: '100%', padding: '13px', fontSize: '14px' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite', flexShrink: 0 }} />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                isLogin ? 'Sign in →' : 'Create account →'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#999' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A0A0A', fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>

        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
