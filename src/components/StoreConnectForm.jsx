import { useState } from 'react'

const StoreConnectForm = () => {
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const validateShopDomain = (domain) => {
    const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!clean.endsWith('.myshopify.com')) return false
    return clean.replace('.myshopify.com', '').length > 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!shopDomain.trim()) {
      setError('Please enter your Shopify store domain')
      return
    }

    const clean = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    if (!validateShopDomain(clean)) {
      setError('Enter a valid domain — e.g. yourstore.myshopify.com')
      return
    }

    setIsLoading(true)
    const apiUrl = import.meta.env.VITE_API_URL || 'https://85q0wnxzx3.execute-api.ap-south-1.amazonaws.com/dev'
    window.location.href = `${apiUrl}/auth?shop=${clean}`
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', textAlign: 'left' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '11px', 
          fontWeight: 700, 
          color: '#B9F95D', 
          marginBottom: '8px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Shopify store URL
        </label>
        
        {/* Input Frame with Premium HTTPS prefix */}
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#506556', 
            fontSize: '13px',
            fontWeight: 600,
            pointerEvents: 'none',
            userSelect: 'none'
          }}>
            https://
          </span>
          <input
            type="text"
            value={shopDomain}
            onChange={e => { setShopDomain(e.target.value); setError('') }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="yourstore.myshopify.com"
            disabled={isLoading}
            style={{
              width: '100%',
              background: '#17231A',
              border: isFocused ? '1.5px solid #B9F95D' : '1.5px solid rgba(185, 249, 93, 0.15)',
              borderRadius: '12px',
              color: '#E6ECE8',
              padding: '14px 16px 14px 72px', // space for prefix
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              transition: 'all 0.25s ease',
              boxShadow: isFocused 
                ? '0 0 15px rgba(185, 249, 93, 0.15), inset 0 2px 4px rgba(0,0,0,0.2)' 
                : 'inset 0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </div>
        
        {error && (
          <p style={{ 
            marginTop: '9px', 
            fontSize: '13px', 
            color: '#FF7D7D', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: 500
          }}>
            <span style={{ fontSize: '14px' }}>⚠</span> {error}
          </p>
        )}
      </div>

      <button 
        type="submit" 
        disabled={isLoading} 
        style={{ 
          width: '100%', 
          padding: '15px', 
          fontSize: '14px',
          fontWeight: 750,
          background: '#B9F95D',
          color: '#172B15',
          border: 'none',
          borderRadius: '12px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 4px 12px rgba(185,249,93,0.15)',
          opacity: isLoading ? 0.6 : 1
        }}
        onMouseOver={e => {
          if (!isLoading) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(185,249,93,0.3)';
            e.currentTarget.style.filter = 'brightness(1.05)';
          }
        }}
        onMouseOut={e => {
          if (!isLoading) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.15)';
            e.currentTarget.style.filter = 'brightness(1)';
          }
        }}
      >
        {isLoading ? (
          <>
            <span style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid rgba(23,43,21,0.2)', 
              borderTop: '2px solid #172B15', 
              borderRadius: '50%', 
              animation: 'pf-spin 0.7s linear infinite', 
              flexShrink: 0 
            }} />
            Connecting Store...
          </>
        ) : (
          <>
            Connect My Store
            <span style={{ transition: 'transform 0.2s' }} className="pf-btn-arrow">→</span>
          </>
        )}
      </button>

      <style>{`
        button:hover .pf-btn-arrow {
          transform: translateX(3px);
        }
      `}</style>
    </form>
  )
}

export default StoreConnectForm
