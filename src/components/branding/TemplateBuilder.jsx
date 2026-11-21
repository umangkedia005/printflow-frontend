import { useEffect, useRef, useState } from 'react'
import { STYLES, PRINT_SIZE, renderDesign, loadTemplateFonts } from './brandTemplate'

// "Use a template": type the brand name (and a line or two), pick a style,
// see it live on the tag / bag / card. The print file is made from this
// when ordering.

const INK = '#172B15'
const SAGE = '#889B8E'
const LINE = 'rgba(23,43,21,0.08)'
const input = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: '10px', fontSize: '13.5px', color: INK, fontFamily: 'Inter, sans-serif', outline: 'none', background: '#FFFFFF' }

// A live drawing of the design; `scale` sets its on-screen size.
export function DesignCanvas({ design, height = 220, fontsReady }) {
  const ref = useRef(null)
  const size = PRINT_SIZE[design.product]
  const ratio = size.w / size.h
  const h = height, w = Math.round(height * ratio)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = w * dpr; c.height = h * dpr
    renderDesign(c, design, { preview: true })
  }, [design, w, h, fontsReady])
  const rounded = design.product === 'hang_tag' ? '10px' : design.product === 'thank_you_card' ? '8px' : '6px'
  return (
    <div style={{ position: 'relative', width: `${w}px`, maxWidth: '100%' }}>
      {design.product === 'hang_tag' && (
        <svg viewBox="0 0 40 46" style={{ position: 'absolute', left: '50%', top: `-${Math.round(h * 0.16)}px`, width: `${Math.round(h * 0.2)}px`, transform: 'translateX(-50%)', pointerEvents: 'none' }} aria-hidden="true">
          <path d="M20 44 C 6 30, 8 6, 20 4 C 32 6, 34 30, 20 44" fill="none" stroke="#1b1b1b" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )}
      <canvas ref={ref} style={{ display: 'block', width: `${w}px`, maxWidth: '100%', height: 'auto', aspectRatio: `${ratio}`, borderRadius: rounded, boxShadow: design.product === 'poly_bag' ? 'inset 0 0 0 1px rgba(0,0,0,.06), 0 10px 24px rgba(0,0,0,.18)' : '0 8px 20px rgba(0,0,0,.16)' }} />
    </div>
  )
}

export default function TemplateBuilder({ product, value, onChange }) {
  const [fontsReady, setFontsReady] = useState(false)
  const [logoName, setLogoName] = useState('')
  useEffect(() => { loadTemplateFonts().then(() => setFontsReady(true)) }, [])
  // Updates from the latest design, so quick changes never undo each other.
  const set = patch => onChange(d => ({ ...d, ...patch }))
  const card = product === 'thank_you_card'

  function pickLogo(file) {
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return
    const img = new Image()
    img.onload = () => { set({ logo: img }); setLogoName(file.name) }
    img.src = URL.createObjectURL(file)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <label><span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Brand name</span>
          <input style={input} value={value.brandName} maxLength={40} onChange={e => set({ brandName: e.target.value })} placeholder="e.g. Riya Prints" /></label>
        {card && <label><span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Big text</span>
          <input style={input} value={value.headline} maxLength={30} onChange={e => set({ headline: e.target.value })} placeholder="THANK YOU" /></label>}
        <label><span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>{card ? 'Message' : 'Small line (optional)'}</span>
          <input style={input} value={value.tagline} maxLength={80} onChange={e => set({ tagline: e.target.value })} placeholder={card ? 'We appreciate your order.' : 'e.g. Made in India'} /></label>
        {!card && <label><span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Instagram / website (optional)</span>
          <input style={input} value={value.handle} maxLength={60} onChange={e => set({ handle: e.target.value })} placeholder="@riyaprints" /></label>}
        <div>
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>Logo (optional)</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ ...input, cursor: 'pointer', color: value.logo ? INK : SAGE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={e => pickLogo(e.target.files?.[0])} />
              {value.logo ? logoName : 'Upload PNG (transparent works best)'}
            </label>
            {value.logo && <button onClick={() => { set({ logo: null }); setLogoName('') }} style={{ border: `1px solid ${LINE}`, background: '#FFFFFF', borderRadius: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '12px', color: '#C53030', fontFamily: 'Inter, sans-serif' }}>Remove</button>}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '8px' }}>Style</div>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '16px' }}>
        {STYLES.map(st => {
          const active = value.style === st.id
          return (
            <button key={st.id} onClick={() => set({ style: st.id })} title={st.label}
              style={{ flexShrink: 0, padding: '12px 10px 8px', paddingTop: product === 'hang_tag' ? '22px' : '12px', border: active ? `2px solid ${INK}` : `1px solid ${LINE}`, borderRadius: '14px', background: active ? '#F6F7F2' : '#FAFAF8', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif' }}>
              <DesignCanvas design={{ ...value, product, style: st.id }} height={card ? 70 : 104} fontsReady={fontsReady} />
              <span style={{ fontSize: '11.5px', fontWeight: active ? 800 : 600, color: INK }}>{st.label}</span>
            </button>
          )
        })}
      </div>

      <div style={{ background: '#EEECE6', borderRadius: '16px', padding: product === 'hang_tag' ? '56px 16px 24px' : '24px 16px', display: 'flex', justifyContent: 'center' }}>
        <DesignCanvas design={{ ...value, product }} height={card ? 210 : 300} fontsReady={fontsReady} />
      </div>
      <div style={{ fontSize: '11.5px', color: SAGE, marginTop: '8px', textAlign: 'center' }}>Live preview · printed at {PRINT_SIZE[product].label} · our team checks it before printing</div>
    </div>
  )
}
