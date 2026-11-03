import { useEffect, useRef, useState } from 'react'
import GarmentMockup from './GarmentMockup'
import { uploadArtwork, saveMerchantProduct } from '../../utils/api'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const GOOD_DPI = 300

// The print area keeps its own measurements in inches; everything about the
// artwork's placement is stored in inches from its top-left corner too, so
// the preview, the backend check and the factory file all agree.
function clampPlacement(p, area, ratio) {
  const w = Math.min(p.w, area.width_in, area.height_in / ratio)
  const h = w * ratio
  return {
    w,
    x: Math.min(Math.max(p.x, 0), area.width_in - w),
    y: Math.min(Math.max(p.y, 0), area.height_in - h),
  }
}

function suggestedPrice(baseCost) {
  return Math.ceil((baseCost * 1.8) / 50) * 50 - 1
}

function readImageSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = url
  })
}

function Step({ n, title, children }) {
  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid #F0F0EC' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0A0A0A', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function DesignEditor({ blank, shopDomain, onClose, onSaved }) {
  const area = blank.print_areas[0]
  const sizesInStock = [...new Set(blank.variants.filter(v => v.in_stock).map(v => v.size))]

  const [previewColor, setPreviewColor] = useState(blank.colors[0].name)
  const [colors, setColors] = useState([blank.colors[0].name])
  const [sizes, setSizes] = useState(sizesInStock)
  const [title, setTitle] = useState(blank.name)
  const [description, setDescription] = useState('')
  const [prices, setPrices] = useState({})
  const [artwork, setArtwork] = useState(null)
  const [placement, setPlacement] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const [frameWidth, setFrameWidth] = useState(0)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Release the local preview when the image changes or the editor closes.
  useEffect(() => () => { if (artwork?.previewUrl) URL.revokeObjectURL(artwork.previewUrl) }, [artwork?.previewUrl])

  const box = area.mockup_box
  const boxPx = { left: box.x * frameWidth, top: box.y * frameWidth, width: box.w * frameWidth, height: box.h * frameWidth }
  const pxPerInch = boxPx.width / area.width_in
  const ratio = artwork ? artwork.px_h / artwork.px_w : 1
  const dpi = artwork && placement ? Math.round(artwork.px_w / placement.w) : null
  const minDpi = area.min_dpi || 150

  // Base cost per size is the dearest of the chosen colors, so a price that
  // clears it is profitable for every variant.
  function baseCostFor(size) {
    const costs = blank.variants.filter(v => v.size === size && colors.includes(v.color)).map(v => v.base_cost)
    return costs.length ? Math.max(...costs) : 0
  }
  function priceFor(size) {
    return prices[size] ?? suggestedPrice(baseCostFor(size))
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setUploadError('Use a PNG or JPG file. PNG with a transparent background prints best.')
    if (file.size > MAX_FILE_BYTES) return setUploadError('That file is over 50 MB.')

    const previewUrl = URL.createObjectURL(file)
    let size
    try {
      size = await readImageSize(previewUrl)
    } catch (err) {
      URL.revokeObjectURL(previewUrl)
      return setUploadError(err.message)
    }

    const r = size.h / size.w
    const fitWidth = Math.min(area.width_in, area.height_in / r) * 0.9
    setPlacement(clampPlacement({ w: fitWidth, x: (area.width_in - fitWidth) / 2, y: 1 }, area, r))
    setArtwork({ name: file.name, previewUrl, px_w: size.w, px_h: size.h, s3_key: null, uploading: true })

    try {
      const key = await uploadArtwork(shopDomain, file)
      setArtwork(a => (a?.previewUrl === previewUrl ? { ...a, s3_key: key, uploading: false } : a))
    } catch (err) {
      setUploadError(err.message)
      setArtwork(a => (a?.previewUrl === previewUrl ? { ...a, uploading: false } : a))
    }
  }

  function onPointerDown(e) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, from: placement }
  }
  function onPointerMove(e) {
    const drag = dragRef.current
    if (!drag || !pxPerInch) return
    setPlacement(clampPlacement({
      w: drag.from.w,
      x: drag.from.x + (e.clientX - drag.startX) / pxPerInch,
      y: drag.from.y + (e.clientY - drag.startY) / pxPerInch,
    }, area, ratio))
  }
  function onPointerUp() { dragRef.current = null }

  // Resize around the artwork's centre so it doesn't drift while scaling.
  function resizeTo(w) {
    setPlacement(p => {
      const cx = p.x + p.w / 2, cy = p.y + (p.w * ratio) / 2
      return clampPlacement({ w, x: cx - w / 2, y: cy - (w * ratio) / 2 }, area, ratio)
    })
  }

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const problems = []
  if (!artwork) problems.push('Upload your artwork')
  else if (artwork.uploading) problems.push('Waiting for the upload to finish')
  else if (!artwork.s3_key) problems.push('Upload the artwork again')
  if (dpi !== null && dpi < minDpi) problems.push(`Make the artwork smaller or use a higher-resolution file (${dpi} DPI, needs ${minDpi})`)
  if (!colors.length) problems.push('Pick at least one color')
  if (!sizes.length) problems.push('Pick at least one size')
  if (!title.trim()) problems.push('Add a product title')
  sizes.forEach(s => { if (!(priceFor(s) >= baseCostFor(s))) problems.push(`Price for ${s} is below the base cost`) })

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      await saveMerchantProduct({
        shop: shopDomain,
        blank_id: blank.blank_id,
        title: title.trim(),
        description: description.trim(),
        colors,
        sizes,
        prices: Object.fromEntries(sizes.map(s => [s, Number(priceFor(s))])),
        artwork: {
          [area.id]: {
            s3_key: artwork.s3_key, px_w: artwork.px_w, px_h: artwork.px_h,
            x_in: placement.x, y_in: placement.y, width_in: placement.w,
          },
        },
      })
      onSaved()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const previewHex = blank.colors.find(c => c.name === previewColor)?.hex || '#FFFFFF'
  const dpiTone = dpi === null ? null : dpi >= GOOD_DPI ? ['#F0FDF4', '#166534', 'Sharp print'] : dpi >= minDpi ? ['#FFF7ED', '#C2410C', 'Acceptable, may look soft up close'] : ['#FFF5F5', '#C53030', 'Too low to print']
  const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1.5px solid #E8E8E4', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="pf-editor" style={{ background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '1100px', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', animation: 'pf-fade-up 0.25s ease' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: '#0A0A0A' }}>Design: {blank.name}</h2>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '3px' }}>{area.label} print area · {area.width_in}″ × {area.height_in}″</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: '30px', height: '30px', background: '#F4F4F0', border: 'none', borderRadius: '8px', fontSize: '14px', color: '#888', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        <div className="pf-editor-body" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'auto' }}>
          <div style={{ flex: '1 1 55%', padding: '24px', minWidth: 0 }}>
            <div ref={frameRef} style={{ maxWidth: '560px', margin: '0 auto' }}>
              <GarmentMockup type={blank.mockup} color={previewHex} photoUrl={blank.mockup_images?.[previewColor]}>
                {frameWidth > 0 && (
                  <div style={{ position: 'absolute', ...boxPx, outline: '1.5px dashed rgba(59,130,246,0.7)', outlineOffset: '0' }}>
                    {!artwork && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '12px', color: 'rgba(59,130,246,0.9)', fontWeight: 600, padding: '8px' }}>
                        Print area
                      </div>
                    )}
                    {artwork && placement && (
                      <img
                        src={artwork.previewUrl}
                        alt="Your artwork"
                        draggable={false}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        style={{ position: 'absolute', left: placement.x * pxPerInch, top: placement.y * pxPerInch, width: placement.w * pxPerInch, height: placement.w * ratio * pxPerInch, cursor: 'move', touchAction: 'none', userSelect: 'none', opacity: artwork.uploading ? 0.6 : 1 }}
                      />
                    )}
                  </div>
                )}
              </GarmentMockup>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {blank.colors.map(c => (
                <button key={c.name} title={c.name} onClick={() => setPreviewColor(c.name)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: c.hex, border: previewColor === c.name ? '2px solid #0A0A0A' : '1px solid #D8D8D4', outline: previewColor === c.name ? '2px solid #FFFFFF' : 'none', outlineOffset: '-4px', cursor: 'pointer' }} />
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#BABAB6', marginTop: '8px' }}>Preview color: {previewColor} · drag the artwork to move it</p>
          </div>

          <div className="pf-editor-panel" style={{ flex: '0 0 380px', borderLeft: '1px solid #E8E8E4', padding: '0 24px 24px', overflowY: 'auto' }}>
            <Step n={1} title="Artwork">
              <label className="pf-btn-outline" style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer', fontSize: '13px', padding: '10px 16px' }}>
                {artwork ? 'Replace artwork' : 'Upload PNG or JPG'}
                <input type="file" accept="image/png,image/jpeg" onChange={handleFile} style={{ display: 'none' }} />
              </label>
              {uploadError && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '8px' }}>⚠ {uploadError}</div>}
              {artwork && (
                <>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {artwork.name} · {artwork.px_w}×{artwork.px_h}px {artwork.uploading ? '· uploading…' : artwork.s3_key ? '· uploaded ✓' : ''}
                  </div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', margin: '14px 0 6px' }}>
                    Width: {placement.w.toFixed(1)}″ × {(placement.w * ratio).toFixed(1)}″
                  </label>
                  <input type="range" min={1} max={Math.min(area.width_in, area.height_in / ratio)} step={0.1} value={placement.w} onChange={e => resizeTo(Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="pf-btn-outline" style={{ flex: 1, padding: '7px', fontSize: '12px' }} onClick={() => setPlacement(p => ({ ...p, x: (area.width_in - p.w) / 2 }))}>Center</button>
                    <button className="pf-btn-outline" style={{ flex: 1, padding: '7px', fontSize: '12px' }} onClick={() => setPlacement(clampPlacement({ w: area.width_in, x: 0, y: 0 }, area, ratio))}>Fill area</button>
                  </div>
                  {dpiTone && (
                    <div style={{ marginTop: '12px', background: dpiTone[0], color: dpiTone[1], borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600 }}>
                      {dpi} DPI · {dpiTone[2]}
                    </div>
                  )}
                </>
              )}
            </Step>

            <Step n={2} title="Colors">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {blank.colors.map(c => {
                  const on = colors.includes(c.name)
                  return (
                    <button key={c.name} onClick={() => { toggle(colors, setColors, c.name); setPreviewColor(c.name) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '100px', border: on ? '1.5px solid #0A0A0A' : '1px solid #E8E8E4', background: on ? '#FAFAF8' : '#FFFFFF', fontSize: '12px', fontWeight: 600, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex, border: '1px solid #D8D8D4' }} />
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </Step>

            <Step n={3} title="Sizes and prices">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {sizesInStock.map(s => {
                  const on = sizes.includes(s)
                  return (
                    <button key={s} onClick={() => toggle(sizes, setSizes, s)} style={{ minWidth: '42px', padding: '6px 10px', borderRadius: '8px', border: on ? '1.5px solid #0A0A0A' : '1px solid #E8E8E4', background: on ? '#0A0A0A' : '#FFFFFF', color: on ? '#FFFFFF' : '#555', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{s}</button>
                  )
                })}
              </div>
              {sizes.length > 0 && colors.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>{['Size', 'Base cost', 'Your price', 'Profit'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#BABAB6', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 4px 6px' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sizesInStock.filter(s => sizes.includes(s)).map(s => {
                      const base = baseCostFor(s)
                      const price = priceFor(s)
                      const profit = Number(price) - base
                      return (
                        <tr key={s} style={{ borderTop: '1px solid #F4F4F0' }}>
                          <td style={{ padding: '6px 4px', fontWeight: 700 }}>{s}</td>
                          <td style={{ padding: '6px 4px', color: '#999' }}>₹{base}</td>
                          <td style={{ padding: '6px 4px' }}>
                            <input type="number" min={base} value={price} onChange={e => setPrices(p => ({ ...p, [s]: e.target.value === '' ? '' : Number(e.target.value) }))} style={{ ...inputStyle, width: '84px', padding: '6px 8px', fontSize: '12px' }} />
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: profit >= 0 ? '#166534' : '#C53030' }}>₹{Number.isFinite(profit) ? profit : '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <p style={{ fontSize: '11px', color: '#BABAB6', marginTop: '8px' }}>Base cost covers printing and the blank; shipping and tax are charged separately.</p>
            </Step>

            <Step n={4} title="Product details">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} style={{ ...inputStyle, marginBottom: '12px' }} />
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </Step>

            <div style={{ paddingTop: '18px' }}>
              {saveError && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#C53030' }}>⚠ {saveError}</div>}
              {problems.length > 0 && <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>{problems[0]}</div>}
              <button className="pf-btn" onClick={handleSave} disabled={saving || problems.length > 0} style={{ width: '100%', padding: '13px', fontSize: '14px' }}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
