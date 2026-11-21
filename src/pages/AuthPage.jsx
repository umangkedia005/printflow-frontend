import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [isLogin, setIsLogin]   = useState(true)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const { currentUser, login, signup, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true })
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

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(`Google sign-in failed. ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left: Form panel ── */}
      <div style={{
        width: '50%', flexShrink: 0,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 64px',
      }} className="auth-form-panel">

        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo */}
          <div style={{ marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="/images/logo_new.jpg" 
              alt="No Limit Studio" 
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <span style={{ fontFamily: "'Fraunces', sans-serif", fontWeight: 800, fontSize: '18px', color: '#172B15', letterSpacing: '-0.5px' }}>
              No Limit Studio
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: "'Fraunces', sans-serif",
            fontSize: '26px', fontWeight: 800,
            color: '#172B15', letterSpacing: '-0.4px',
            marginBottom: '6px',
          }}>
            {isLogin ? 'Welcome back!' : 'Create account'}
          </h1>
          <p style={{ fontSize: '14px', color: '#71717A', marginBottom: '32px', lineHeight: 1.5 }}>
            {isLogin ? 'Login to your dashboard.' : 'Start your print-on-demand journey.'}
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FFF5F5', border: '1px solid #FED7D7',
              borderRadius: '8px', padding: '10px 14px',
              marginBottom: '20px', fontSize: '13px', color: '#C53030',
              display: 'flex', alignItems: 'center', gap: '7px',
              fontWeight: 500
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '13px',
              background: '#FFFFFF', border: '1.5px solid rgba(23,43,21,0.12)', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, color: '#172B15',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              marginBottom: '24px',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#172B15'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(23,43,21,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: '#EFEFED' }} />
            <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 700, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#EFEFED' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter Username or Email"
                style={{
                  width: '100%', padding: '14px 16px', boxSizing: 'border-box',
                  border: '1.5px solid rgba(23,43,21,0.12)', borderRadius: '10px',
                  fontSize: '14px', color: '#172B15', outline: 'none',
                  fontFamily: 'Inter, sans-serif', background: '#FAFAF8',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#39B54A'; e.target.style.boxShadow = '0 0 0 3px rgba(57,181,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(23,43,21,0.12)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ marginBottom: '8px', position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter Password"
                style={{
                  width: '100%', padding: '14px 44px 14px 16px', boxSizing: 'border-box',
                  border: '1.5px solid rgba(23,43,21,0.12)', borderRadius: '10px',
                  fontSize: '14px', color: '#172B15', outline: 'none',
                  fontFamily: 'Inter, sans-serif', background: '#FAFAF8',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#39B54A'; e.target.style.boxShadow = '0 0 0 3px rgba(57,181,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(23,43,21,0.12)'; e.target.style.boxShadow = 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#A1A1AA', fontSize: '13px', padding: 0,
                }}
              >{showPass ? '○' : '●'}</button>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: '12px', color: '#39B54A', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: '#B9F95D', color: '#172B15',
                border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 750,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(185,249,93,0.2)',
                marginBottom: '14px',
              }}
              onMouseOver={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,249,93,0.3)' } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.2)' }}
            >
              {loading ? (
                <>
                  <span style={{ width: '14px', height: '14px', border: '2px solid rgba(23,43,21,0.2)', borderTop: '2px solid #172B15', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite' }} />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Login →' : 'Create account →'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#71717A', marginTop: '8px' }}>
            {isLogin ? 'New to No Limit Studio? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39B54A', fontWeight: 700, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}
            >
              {isLogin ? 'Signup' : 'Log in'}
            </button>
          </p>

        </div>
      </div>

      {/* ── Right: a real product photo, a short message and true points. ── */}
      <div className="auth-visual-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#172B15', minHeight: '100vh' }}>
        <img src="/images/auth_flatlay.webp" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        {/* Darkens the bottom so the text reads on any photo. */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,24,14,0) 45%, rgba(12,24,14,0.45) 65%, rgba(12,24,14,0.85) 100%)' }} />

        {/* How an order looks in the dashboard (illustration). */}
        <div style={{ position: 'absolute', top: '7%', right: '7%', width: '250px', background: 'rgba(255,255,255,0.96)', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 18px 40px rgba(0,0,0,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#889B8E', letterSpacing: '0.04em' }}>NEW ORDER</span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#2B5BA8', background: '#EAF0FA', padding: '2px 8px', borderRadius: '100px' }}>Printing</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#172B15', marginTop: '6px' }}>Oversized hoodie × 2</div>
          <div style={{ height: '6px', background: '#EEF0EA', borderRadius: '100px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: '#B9F95D', borderRadius: '100px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#889B8E', marginTop: '6px', fontWeight: 600 }}>
            <span>Queued</span><span style={{ color: '#172B15' }}>Printing</span><span>Shipped</span>
          </div>
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '7%', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.96)', borderRadius: '14px', padding: '10px 14px', boxShadow: '0 14px 32px rgba(0,0,0,0.22)' }}>
          <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#B9F95D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🚚</span>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#172B15' }}>Shipped · tracking emailed</div>
            <div style={{ fontSize: '11px', color: '#889B8E' }}>Under your brand name</div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '8%', color: '#FFFFFF' }}>
          <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '38px', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.1, margin: 0 }}>
            Your brand.<br /><span style={{ color: '#B9F95D' }}>Printed & shipped.</span>
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, margin: '12px 0 20px', maxWidth: '440px' }}>
            Design your products and sell anywhere. We print, pack and ship every order for you.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['No minimum order', 'Dispatched in ~48 hours', 'Shipping across India'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '100px', padding: '7px 13px', fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
                <span style={{ color: '#B9F95D', fontWeight: 900 }}>✓</span>{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .auth-visual-panel { display: none !important; }
          .auth-form-panel { width: 100% !important; padding: 40px 24px !important; }
        }
      `}</style>
    </div>
  )
}
