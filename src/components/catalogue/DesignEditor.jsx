import { useEffect, useRef, useState } from 'react'
import GarmentMockup from './GarmentMockup'
import { uploadArtwork, saveMerchantProduct } from '../../utils/api'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const GOOD_DPI = 300
const PREVIEW = '__preview'
const FULL_PHOTO = { x: 0, y: 0, w: 1 }

// Each print area keeps its own measurements in inches; the artwork's
// placement is stored in inches from the area's top-left corner too, so the
// preview, the backend check and the factory file all agree.
function clampPlacement(p, area, ratio) {
  const w = Math.min(p.w, area.width_in, area.height_in / ratio)
  const h = w * ratio
  return {
    w,
    x: Math.min(Math.max(p.x, 0), area.width_in - w),
    y: Math.min(Math.max(p.y, 0), area.height_in - h),
  }
}

function suggestedPrice(cost) {
  return Math.ceil((cost * 1.8) / 50) * 50 - 1
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
  const areas = blank.print_areas
  const views = blank.views?.length ? blank.views : [{ id: 'main', label: 'Main' }]
  const viewOf = a => a.view_id || views[0].id
  const sizesInStock = blank.sizes?.length
    ? blank.sizes.filter(s => blank.variants.some(v => v.size === s && v.in_stock))
    : [...new Set(blank.variants.filter(v => v.in_stock).map(v => v.size))]

  const [previewColor, setPreviewColor] = useState(blank.colors[0].name)
  const [colors, setColors] = useState([blank.colors[0].name])
  const [sizes, setSizes] = useState(sizesInStock)
  const [title, setTitle] = useState(blank.name)
  const [description, setDescription] = useState('')
  const [prices, setPrices] = useState({})
  const [tab, setTab] = useState(areas[0].id)
  // Keyed by print area id.
  const [artworks, setArtworks] = useState({})
  const [placements, setPlacements] = useState({})
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const dragRef = useRef(null)
  const previewUrlsRef = useRef([])

  // Release every local preview when the editor closes.
  useEffect(() => () => previewUrlsRef.current.forEach(u => URL.revokeObjectURL(u)), [])

  const previewing = tab === PREVIEW
  const area = areas.find(a => a.id === tab) || areas[0]
  const artwork = artworks[area.id]
  const placement = placements[area.id]
  const ratio = artwork ? artwork.px_h / artwork.px_w : 1
  const minDpi = area.min_dpi || 150
  const dpi = artwork && placement ? Math.round(artwork.px_w / placement.w) : null

  const previewEntry = blank.colors.find(c => c.name === previewColor)
  const previewHex = previewEntry?.hex || '#FFFFFF'
  const photoFor = viewId => previewEntry?.image_urls?.[viewId] || (viewId === views[0].id ? previewEntry?.image_url : undefined)

  const placedAreas = areas.filter(a => artworks[a.id])
  const printCost = placedAreas.reduce((sum, a) => sum + Number(a.print_cost || 0), 0)

  // Cost per size: the dearest of the chosen colors plus every printed area,
  // so a price that clears it is profitable for every variant.
  function costFor(size) {
    const costs = blank.variants.filter(v => v.size === size && colors.includes(v.color)).map(v => v.base_cost)
    return (costs.length ? Math.max(...costs) : 0) + printCost
  }
  function priceFor(size) {
    return prices[size] ?? suggestedPrice(costFor(size))
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setUploadError('Use a PNG or JPG file. PNG with a transparent background prints best.')
    if (file.size > MAX_FILE_BYTES) return setUploadError('That file is over 50 MB.')

    const target = area
    const previewUrl = URL.createObjectURL(file)
    previewUrlsRef.current.push(previewUrl)
    let size
    try {
      size = await readImageSize(previewUrl)
    } catch (err) {
      return setUploadError(err.message)
    }

    const r = size.h / size.w
    const fitWidth = Math.min(target.width_in, target.height_in / r) * 0.9
    const startY = Math.min(1, Math.max(0, target.height_in - fitWidth * r) / 2)
    setPlacements(p => ({ ...p, [target.id]: clampPlacement({ w: fitWidth, x: (target.width_in - fitWidth) / 2, y: startY }, target, r) }))
    setArtworks(a => ({ ...a, [target.id]: { name: file.name, previewUrl, px_w: size.w, px_h: size.h, s3_key: null, uploading: true } }))

    // Only apply the result if this file is still the one in that area.
    const settle = patch => setArtworks(a => (a[target.id]?.previewUrl === previewUrl ? { ...a, [target.id]: { ...a[target.id], ...patch } } : a))
    try {
      settle({ s3_key: await uploadArtwork(shopDomain, file), uploading: false })
    } catch (err) {
      setUploadError(err.message)
      settle({ uploading: false })
    }
  }

  function removeArtwork() {
    const without = obj => Object.fromEntries(Object.entries(obj).filter(([id]) => id !== area.id))
    setArtworks(without)
    setPlacements(without)
  }

  // The artwork sits inside its print box, so the box's rendered width gives
  // the screen-pixels-per-inch for dragging at any zoom.
  function onPointerDown(e) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const pxPerInch = e.currentTarget.parentElement.getBoundingClientRect().width / area.width_in
    dragRef.current = { startX: e.clientX, startY: e.clientY, from: placement, pxPerInch }
  }
  function onPointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    setPlacements(p => ({
      ...p,
      [area.id]: clampPlacement({
        w: drag.from.w,
        x: drag.from.x + (e.clientX - drag.startX) / drag.pxPerInch,
        y: drag.from.y + (e.clientY - drag.startY) / drag.pxPerInch,
      }, area, ratio),
    }))
  }
  function onPointerUp() { dragRef.current = null }

  function setPlacement(update) {
    setPlacements(p => ({ ...p, [area.id]: clampPlacement(update(p[area.id]), area, ratio) }))
  }
  // Resize around the artwork's centre so it doesn't drift while scaling.
  function resizeTo(w) {
    setPlacement(p => {
      const cx = p.x + p.w / 2, cy = p.y + (p.w * ratio) / 2
      return { w, x: cx - w / 2, y: cy - (w * ratio) / 2 }
    })
  }

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const problems = []
  if (!placedAreas.length) problems.push('Upload artwork for at least one print area')
  placedAreas.forEach(a => {
    const art = artworks[a.id]
    const d = Math.round(art.px_w / placements[a.id].w)
    if (art.uploading) problems.push(`Waiting for the ${a.label} upload to finish`)
    else if (!art.s3_key) problems.push(`Upload the ${a.label} artwork again`)
    if (d < (a.min_dpi || 150)) problems.push(`${a.label}: make the artwork smaller or use a higher-resolution file (${d} DPI)`)
  })
  if (!colors.length) problems.push('Pick at least one color')
  if (!sizes.length) problems.push('Pick at least one size')
  if (!title.trim()) problems.push('Add a product title')
  sizes.forEach(s => { if (!(priceFor(s) >= costFor(s))) problems.push(`Price for ${s} is below the cost`) })

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
        artwork: Object.fromEntries(placedAreas.map(a => {
          const art = artworks[a.id], p = placements[a.id]
          return [a.id, { s3_key: art.s3_key, px_w: art.px_w, px_h: art.px_h, x_in: p.x, y_in: p.y, width_in: p.w }]
        })),
      })
      onSaved()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Positions are percentages of the visible frame, so the same markup works
  // in the large editor and in the small preview tiles.
  function renderArea(a, zoom, interactive) {
    const art = artworks[a.id], p = placements[a.id], b = a.mockup_box
    const pct = n => `${n * 100}%`
    return (
      <div key={a.id} style={{ position: 'absolute', left: pct((b.x - zoom.x) / zoom.w), top: pct((b.y - zoom.y) / zoom.w), width: pct(b.w / zoom.w), height: pct(b.h / zoom.w), outline: interactive ? '1.5px dashed rgba(59,130,246,0.8)' : 'none' }}>
        {interactive && !art && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '12px', color: 'rgba(59,130,246,0.95)', fontWeight: 600, padding: '4px', background: 'rgba(59,130,246,0.06)', overflow: 'hidden' }}>
            {a.label}
          </div>
        )}
        {art && p && (
          <img
            src={art.previewUrl}
            alt={`${a.label} artwork`}
            draggable={false}
            onPointerDown={interactive ? onPointerDown : undefined}
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={interactive ? onPointerUp : undefined}
            onPointerCancel={interactive ? onPointerUp : undefined}
            style={{ position: 'absolute', maxWidth: 'none', left: pct(p.x / a.width_in), top: pct(p.y / a.height_in), width: pct(p.w / a.width_in), height: pct((p.w * (art.px_h / art.px_w)) / a.height_in), cursor: interactive ? 'move' : 'default', touchAction: 'none', userSelect: 'none', opacity: art.uploading ? 0.6 : 1 }}
          />
        )}
      </div>
    )
  }

  // Every view that has a print area, each with all of its areas drawn on it.
  const previewViews = views.filter(v => areas.some(a => viewOf(a) === v.id))

  const dpiTone = dpi === null ? null : dpi >= GOOD_DPI ? ['#F0FDF4', '#166534', 'Sharp print'] : dpi >= minDpi ? ['#FFF7ED', '#C2410C', 'Acceptable, may look soft up close'] : ['#FFF5F5', '#C53030', 'Too low to print']
  const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1.5px solid #E8E8E4', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const chip = on => ({ padding: '6px 12px', borderRadius: '8px', border: on ? '1.5px solid #0A0A0A' : '1px solid #E8E8E4', background: on ? '#0A0A0A' : '#FFFFFF', color: on ? '#FFFFFF' : '#555', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="pf-editor" style={{ background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '1100px', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', animation: 'pf-fade-up 0.25s ease' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '18px', fontWeight: 800, color: '#0A0A0A' }}>Design: {blank.name}</h2>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '3px' }}>{areas.map(a => `${a.label} ${a.width_in}″ × ${a.height_in}″`).join(' · ')}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: '30px', height: '30px', background: '#F4F4F0', border: 'none', borderRadius: '8px', fontSize: '14px', color: '#888', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        <div className="pf-editor-body" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'auto' }}>
          <div style={{ flex: '1 1 55%', padding: '20px 24px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {areas.map(a => (
                <button key={a.id} onClick={() => setTab(a.id)} style={chip(!previewing && a.id === area.id)}>
                  {a.label}{artworks[a.id] ? ' ✓' : ''}
                </button>
              ))}
              {areas.length > 1 && <button onClick={() => setTab(PREVIEW)} style={chip(previewing)}>Preview all</button>}
            </div>

            {previewing ? (
              <div style={{ display: 'grid', gridTemplateColumns: previewViews.length > 1 ? '1fr 1fr' : '1fr', gap: '12px', maxWidth: '520px', margin: '0 auto' }}>
                {previewViews.map(v => (
                  <div key={v.id}>
                    <GarmentMockup type={blank.mockup} color={previewHex} photoUrl={photoFor(v.id)}>
                      {areas.filter(a => viewOf(a) === v.id).map(a => renderArea(a, FULL_PHOTO, false))}
                    </GarmentMockup>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', marginTop: '6px', fontWeight: 600 }}>{v.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                <GarmentMockup type={blank.mockup} color={previewHex} photoUrl={photoFor(viewOf(area))} zoom={area.zoom || FULL_PHOTO}>
                  {renderArea(area, area.zoom || FULL_PHOTO, true)}
                </GarmentMockup>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {blank.colors.map(c => (
                <button key={c.name} title={c.name} onClick={() => setPreviewColor(c.name)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: c.hex, border: previewColor === c.name ? '2px solid #0A0A0A' : '1px solid #D8D8D4', outline: previewColor === c.name ? '2px solid #FFFFFF' : 'none', outlineOffset: '-4px', cursor: 'pointer' }} />
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#BABAB6', marginTop: '8px' }}>
              Preview color: {previewColor}{previewing ? '' : ' · drag the artwork to move it'}
            </p>
          </div>

          <div className="pf-editor-panel" style={{ flex: '0 0 380px', borderLeft: '1px solid #E8E8E4', padding: '0 24px 24px', overflowY: 'auto' }}>
            {previewing ? (
              <Step n={1} title="Print summary">
                {areas.map(a => {
                  const art = artworks[a.id], p = placements[a.id]
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #F4F4F0' }}>
                      <span style={{ fontWeight: 600, color: art ? '#0A0A0A' : '#BABAB6' }}>{a.label}</span>
                      <span style={{ color: '#999' }}>{art && p ? `${p.w.toFixed(1)}″ × ${(p.w * art.px_h / art.px_w).toFixed(1)}″${Number(a.print_cost) ? ` · +₹${a.print_cost}` : ''}` : 'Not printed'}</span>
                    </div>
                  )
                })}
              </Step>
            ) : (
              <Step n={1} title={`Artwork: ${area.label}`}>
                <label className="pf-btn-outline" style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer', fontSize: '13px', padding: '10px 16px' }}>
                  {artwork ? `Replace ${area.label.toLowerCase()} artwork` : `Upload ${area.label.toLowerCase()} artwork (PNG or JPG)`}
                  <input type="file" accept="image/png,image/jpeg" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                <p style={{ fontSize: '11px', color: '#BABAB6', marginTop: '6px' }}>
                  {areas.length > 1 && !artwork ? 'Optional. Leave it empty to print nothing here. ' : ''}
                  {Number(area.print_cost) ? `Printing here adds ₹${area.print_cost} to the cost.` : ''}
                </p>
                {uploadError && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '8px' }}>⚠ {uploadError}</div>}
                {artwork && placement && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: '#999', marginTop: '8px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {artwork.name} · {artwork.px_w}×{artwork.px_h}px {artwork.uploading ? '· uploading…' : artwork.s3_key ? '· uploaded ✓' : ''}
                      </span>
                      <button onClick={removeArtwork} style={{ background: 'none', border: 'none', color: '#C53030', fontSize: '11px', cursor: 'pointer', padding: 0, flexShrink: 0 }}>Remove</button>
                    </div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', margin: '14px 0 6px' }}>
                      Width: {placement.w.toFixed(1)}″ × {(placement.w * ratio).toFixed(1)}″
                    </label>
                    <input type="range" min={0.5} max={Math.min(area.width_in, area.height_in / ratio)} step={0.1} value={placement.w} onChange={e => resizeTo(Number(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="pf-btn-outline" style={{ flex: 1, padding: '7px', fontSize: '12px' }} onClick={() => setPlacement(p => ({ ...p, x: (area.width_in - p.w) / 2 }))}>Center</button>
                      <button className="pf-btn-outline" style={{ flex: 1, padding: '7px', fontSize: '12px' }} onClick={() => setPlacement(() => ({ w: area.width_in, x: 0, y: 0 }))}>Fill area</button>
                    </div>
                    {dpiTone && (
                      <div style={{ marginTop: '12px', background: dpiTone[0], color: dpiTone[1], borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600 }}>
                        {dpi} DPI · {dpiTone[2]}
                      </div>
                    )}
                  </>
                )}
              </Step>
            )}

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
                {sizesInStock.map(s => (
                  <button key={s} onClick={() => toggle(sizes, setSizes, s)} style={{ ...chip(sizes.includes(s)), minWidth: '42px' }}>{s}</button>
                ))}
              </div>
              {sizes.length > 0 && colors.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>{['Size', 'Cost', 'Your price', 'Profit'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#BABAB6', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 4px 6px' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sizesInStock.filter(s => sizes.includes(s)).map(s => {
                      const cost = costFor(s)
                      const price = priceFor(s)
                      const profit = Number(price) - cost
                      return (
                        <tr key={s} style={{ borderTop: '1px solid #F4F4F0' }}>
                          <td style={{ padding: '6px 4px', fontWeight: 700 }}>{s}</td>
                          <td style={{ padding: '6px 4px', color: '#999' }}>₹{cost}</td>
                          <td style={{ padding: '6px 4px' }}>
                            <input type="number" min={cost} value={price} onChange={e => setPrices(p => ({ ...p, [s]: e.target.value === '' ? '' : Number(e.target.value) }))} style={{ ...inputStyle, width: '84px', padding: '6px 8px', fontSize: '12px' }} />
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: profit >= 0 ? '#166534' : '#C53030' }}>₹{Number.isFinite(profit) ? profit : '–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <p style={{ fontSize: '11px', color: '#BABAB6', marginTop: '8px' }}>
                Cost is the blank{printCost ? ` plus ₹${printCost} for the printed areas` : ' and printing'}; shipping and tax are charged separately.
              </p>
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
