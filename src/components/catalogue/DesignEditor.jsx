import { useEffect, useRef, useState } from 'react'
import GarmentMockup from './GarmentMockup'
import { uploadArtworkFile, saveMerchantProduct } from '../../utils/api'
import { FilePicker } from '../files/FilePicker'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const GOOD_DPI = 300
const PREVIEW = '__preview'
const FULL_PHOTO = { x: 0, y: 0, w: 1 }
const ZOOM_STEP = 2.5
const MIN_VIEW = 0.12

// Keep a zoomed view (a square part of the photo) inside the photo.
function clampView(v) {
  const w = Math.min(1, Math.max(MIN_VIEW, v.w))
  return { w, x: Math.min(Math.max(v.x, 0), 1 - w), y: Math.min(Math.max(v.y, 0), 1 - w) }
}

// Each print area keeps its own measurements in inches; the artwork's
// placement is stored in inches from the area's top-left corner too, so the
// preview, the backend check and the factory file all agree.
// Artwork can be moved and sized freely, like any design tool: whatever
// falls outside the print area is shown faded and isn't printed. It just has
// to keep MIN_OVERLAP inches inside so it can't be lost off the garment.
const MIN_OVERLAP = 0.5
const MAX_SCALE = 2

function clampPlacement(p, area, ratio) {
  const maxW = MAX_SCALE * Math.max(area.width_in, area.height_in / ratio)
  const w = Math.min(Math.max(p.w, 0.5), maxW)
  const h = w * ratio
  return {
    w,
    x: Math.min(Math.max(p.x, MIN_OVERLAP - w), area.width_in - MIN_OVERLAP),
    y: Math.min(Math.max(p.y, MIN_OVERLAP - h), area.height_in - MIN_OVERLAP),
  }
}

// The part of the artwork that lands inside the print area, in inches.
function printedSize(p, area, ratio) {
  const h = p.w * ratio
  return {
    w: Math.max(0, Math.min(p.x + p.w, area.width_in) - Math.max(p.x, 0)),
    h: Math.max(0, Math.min(p.y + h, area.height_in) - Math.max(p.y, 0)),
    clipped: p.x < -0.01 || p.y < -0.01 || p.x + p.w > area.width_in + 0.01 || p.y + h > area.height_in + 0.01,
  }
}

// About 1.8× cost, ending in 49 or 99; never below the cost itself (a ₹0
// cost, e.g. a garment the customer supplies with nothing printed yet, would
// otherwise come out as -1).
function suggestedPrice(cost) {
  return Math.max(cost, Math.ceil((cost * 1.8) / 50) * 50 - 1)
}

function readImageSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = url
  })
}

function Card({ n, title, children }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {n && <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#172B15', color: '#B9F95D', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>}
        <span style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '17px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.2px' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// initialArtwork: a My files entry to start with on the first print area.
export default function DesignEditor({ blank, onClose, onSaved, initialArtwork = null, backLabel = 'Back to catalogue' }) {
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
  // Where the merchant has zoomed to; null means the area's starting view.
  const [view, setView] = useState(null)
  const [panning, setPanning] = useState(false)
  // Keyed by print area id.
  const [artworks, setArtworks] = useState({})
  const [placements, setPlacements] = useState({})
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pickingFile, setPickingFile] = useState(false)

  const dragRef = useRef(null)
  const panRef = useRef(null)
  const pageRef = useRef(null)

  // Opening the designer replaces the catalogue; start at its top.
  useEffect(() => { pageRef.current?.scrollIntoView({ block: 'start' }) }, [])
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

    placeOn(target, { name: file.name, previewUrl, px_w: size.w, px_h: size.h, s3_key: null, uploading: true })

    // Only apply the result if this file is still the one in that area.
    // Uploads also land in My files, so they can be reused later.
    const settle = patch => setArtworks(a => (a[target.id]?.previewUrl === previewUrl ? { ...a, [target.id]: { ...a[target.id], ...patch } } : a))
    try {
      settle({ s3_key: (await uploadArtworkFile(file)).s3_key, uploading: false })
    } catch (err) {
      setUploadError(err.message)
      settle({ uploading: false })
    }
  }

  // Put artwork on a print area, centred and a little smaller than the area.
  function placeOn(target, art) {
    const r = art.px_h / art.px_w
    const fitWidth = Math.min(target.width_in, target.height_in / r) * 0.9
    const startY = Math.min(1, Math.max(0, target.height_in - fitWidth * r) / 2)
    setPlacements(p => ({ ...p, [target.id]: clampPlacement({ w: fitWidth, x: (target.width_in - fitWidth) / 2, y: startY }, target, r) }))
    setArtworks(a => ({ ...a, [target.id]: art }))
  }

  const fromLibrary = f => ({ name: f.name, previewUrl: f.url, px_w: Number(f.px_w), px_h: Number(f.px_h), s3_key: f.s3_key, uploading: false })

  function pickFile(f) {
    setPickingFile(false)
    setUploadError('')
    placeOn(area, fromLibrary(f))
  }

  useEffect(() => {
    if (initialArtwork) placeOn(areas[0], fromLibrary(initialArtwork))
    // Only when the designer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function removeArtwork() {
    const without = obj => Object.fromEntries(Object.entries(obj).filter(([id]) => id !== area.id))
    setArtworks(without)
    setPlacements(without)
  }

  // The print box's rendered width gives the screen-pixels-per-inch for
  // dragging at any zoom. `corner` is set when a resize handle is dragged:
  // [-1|1, -1|1] for left/right and top/bottom, the opposite corner staying put.
  function onPointerDown(e, corner = null) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const pxPerInch = e.currentTarget.closest('[data-print-box]').getBoundingClientRect().width / area.width_in
    dragRef.current = { startX: e.clientX, startY: e.clientY, from: placement, pxPerInch, corner }
  }
  function onPointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    const dx = (e.clientX - drag.startX) / drag.pxPerInch
    const dy = (e.clientY - drag.startY) / drag.pxPerInch
    const f = drag.from
    let next
    if (drag.corner) {
      const [sx, sy] = drag.corner
      const w = Math.max(0.5, f.w + (sx * dx + (sy * dy) / ratio) / 2)
      next = { w, x: sx < 0 ? f.x + f.w - w : f.x, y: sy < 0 ? f.y + (f.w - w) * ratio : f.y }
    } else {
      next = { w: f.w, x: f.x + dx, y: f.y + dy }
    }
    setPlacements(p => ({ ...p, [area.id]: clampPlacement(next, area, ratio) }))
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
  function switchTab(id) {
    setTab(id)
    setView(null)
  }

  // Click the photo to zoom in on that spot (click again to zoom back out),
  // drag it to look around while zoomed, like a shop's product gallery.
  const startView = area.zoom || FULL_PHOTO
  const shownView = view || startView
  const zoomedIn = shownView.w < startView.w - 0.001

  function zoomBy(factor, center) {
    const v = shownView
    const c = center || { x: v.x + v.w / 2, y: v.y + v.w / 2 }
    const w = Math.min(1, v.w / factor)
    setView(clampView({ w, x: c.x - w / 2, y: c.y - w / 2 }))
  }
  function onPhotoPointerDown(e) {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { x: e.clientX, y: e.clientY, from: shownView, rect, moved: false }
  }
  function onPhotoPointerMove(e) {
    const pan = panRef.current
    if (!pan) return
    const dx = e.clientX - pan.x, dy = e.clientY - pan.y
    if (!pan.moved && Math.abs(dx) + Math.abs(dy) < 5) return
    if (!pan.moved) { pan.moved = true; setPanning(true) }
    const perPx = pan.from.w / pan.rect.width
    setView(clampView({ w: pan.from.w, x: pan.from.x - dx * perPx, y: pan.from.y - dy * perPx }))
  }
  function onPhotoPointerUp(e) {
    const pan = panRef.current
    panRef.current = null
    setPanning(false)
    if (!pan || pan.moved) return
    if (zoomedIn) return setView(null)
    const v = shownView
    zoomBy(ZOOM_STEP, {
      x: v.x + ((e.clientX - pan.rect.left) / pan.rect.width) * v.w,
      y: v.y + ((e.clientY - pan.rect.top) / pan.rect.width) * v.w,
    })
  }

  function renderArea(a, zoom, interactive) {
    const art = artworks[a.id], p = placements[a.id], b = a.mockup_box
    const pct = n => `${n * 100}%`
    const smooth = interactive && !panning
    const artBox = art && p && {
      position: 'absolute', maxWidth: 'none',
      left: pct(p.x / a.width_in), top: pct(p.y / a.height_in),
      width: pct(p.w / a.width_in), height: pct((p.w * (art.px_h / art.px_w)) / a.height_in),
    }
    return (
      <div key={a.id} data-print-box style={{ position: 'absolute', left: pct((b.x - zoom.x) / zoom.w), top: pct((b.y - zoom.y) / zoom.w), width: pct(b.w / zoom.w), height: pct(b.h / zoom.w), outline: interactive ? '1.5px dashed rgba(59,130,246,0.8)' : 'none', transition: smooth ? 'all 0.28s ease' : 'none' }}>
        {interactive && !art && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '12px', color: 'rgba(59,130,246,0.95)', fontWeight: 600, padding: '4px', background: 'rgba(59,130,246,0.06)', overflow: 'hidden' }}>
            {a.label}
          </div>
        )}
        {artBox && interactive && (
          // Whole artwork, faded: what lies outside the print area won't print.
          <img
            src={art.previewUrl}
            alt={`${a.label} artwork`}
            draggable={false}
            onPointerDown={e => onPointerDown(e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ ...artBox, cursor: 'move', touchAction: 'none', userSelect: 'none', opacity: 0.35 }}
          />
        )}
        {artBox && (
          // The printed part at full strength, cut to the print area.
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <img src={art.previewUrl} alt="" draggable={false} style={{ ...artBox, userSelect: 'none', opacity: art.uploading ? 0.6 : 1 }} />
          </div>
        )}
        {artBox && interactive && (
          <div style={{ ...artBox, outline: '1px solid #2563EB', pointerEvents: 'none' }}>
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => (
              <span
                key={`${sx}${sy}`}
                onPointerDown={e => onPointerDown(e, [sx, sy])}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ position: 'absolute', width: '12px', height: '12px', background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: '3px', boxSizing: 'border-box', left: sx < 0 ? '-6px' : 'auto', right: sx > 0 ? '-6px' : 'auto', top: sy < 0 ? '-6px' : 'auto', bottom: sy > 0 ? '-6px' : 'auto', cursor: sx === sy ? 'nwse-resize' : 'nesw-resize', pointerEvents: 'auto', touchAction: 'none' }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Every view that has a print area, each with all of its areas drawn on it.
  const previewViews = views.filter(v => areas.some(a => viewOf(a) === v.id))

  const dpiTone = dpi === null ? null : dpi >= GOOD_DPI ? ['#F0FDF4', '#166534', 'Sharp print'] : dpi >= minDpi ? ['#FFF7ED', '#C2410C', 'Acceptable, may look soft up close'] : ['#FFF5F5', '#C53030', 'Too low to print']
  const inputStyle = { width: '100%', padding: '11px 14px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', color: '#172B15', background: '#FFFFFF' }
  const chip = on => ({ padding: '7px 14px', borderRadius: '10px', border: on ? '1px solid #172B15' : '1px solid rgba(23,43,21,0.1)', background: on ? '#172B15' : '#FFFFFF', color: on ? '#FFFFFF' : '#172B15', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' })

  // A page in the dashboard (not a pop-up): the product on the left, and the
  // steps plus a running print cost summary on the right, like an order form.
  const fromCost = Math.min(...sizesInStock.filter(sz => sizes.includes(sz)).map(costFor).filter(Number.isFinite))

  return (
    <div ref={pageRef} style={{ scrollMarginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, color: '#889B8E', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '8px' }}>← {backLabel}</button>
          <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '28px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px' }}>Design: {blank.name}</h1>
          <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500, marginTop: '4px' }}>{(blank.own ? ['Your garment', blank.category] : [blank.gsm && `${blank.gsm} GSM`, blank.fabric, blank.fit]).filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <div className="pf-design-grid">
        <div className="pf-design-sticky" style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {areas.map(a => (
                <button key={a.id} onClick={() => switchTab(a.id)} style={chip(!previewing && a.id === area.id)}>
                  {a.label}{artworks[a.id] ? ' ✓' : ''}
                </button>
              ))}
              {areas.length > 1 && <button onClick={() => switchTab(PREVIEW)} style={chip(previewing)}>Preview all</button>}
            </div>

            {previewing ? (
              <div style={{ display: 'grid', gridTemplateColumns: previewViews.length > 1 ? '1fr 1fr' : '1fr', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
                {previewViews.map(v => (
                  <div key={v.id}>
                    <GarmentMockup type={blank.mockup} color={previewHex} photoUrl={photoFor(v.id)}>
                      {areas.filter(a => viewOf(a) === v.id).map(a => renderArea(a, FULL_PHOTO, false))}
                    </GarmentMockup>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#889B8E', marginTop: '6px', fontWeight: 600 }}>{v.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
                <div
                  onPointerDown={onPhotoPointerDown}
                  onPointerMove={onPhotoPointerMove}
                  onPointerUp={onPhotoPointerUp}
                  onPointerCancel={() => { panRef.current = null; setPanning(false) }}
                  style={{ cursor: panning ? 'grabbing' : zoomedIn ? 'zoom-out' : 'zoom-in', touchAction: 'none', userSelect: 'none' }}
                >
                  <GarmentMockup type={blank.mockup} color={previewHex} photoUrl={photoFor(viewOf(area))} zoom={shownView} smooth={!panning}>
                    {renderArea(area, shownView, true)}
                  </GarmentMockup>
                </div>
                <div style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(23,43,21,0.08)', borderRadius: '10px', padding: '3px' }}>
                  {[['−', 'Zoom out', () => zoomBy(1 / 1.6)], ['+', 'Zoom in', () => zoomBy(1.6)], ['⤢', 'Fit', () => setView(null)]].map(([sym, title, fn]) => (
                    <button key={title} title={title} aria-label={title} onClick={fn} style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', borderRadius: '7px', fontSize: '15px', color: '#333', cursor: 'pointer' }}>{sym}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {blank.colors.map(c => (
                <button key={c.name} title={c.name} onClick={() => setPreviewColor(c.name)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: c.hex, border: previewColor === c.name ? '2px solid #172B15' : '1px solid #D8D8D4', outline: previewColor === c.name ? '2px solid #FFFFFF' : 'none', outlineOffset: '-4px', cursor: 'pointer' }} />
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#889B8E', marginTop: '8px' }}>
              Preview color: {previewColor}{previewing ? '' : ' · drag the artwork to move it · click the photo to zoom'}
            </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <Card n={1} title="Product details">
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>Product name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} placeholder="Kunal & Divya anniversary polo" style={{ ...inputStyle, marginBottom: '12px' }} />
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Shown on your store's product page" style={{ ...inputStyle, resize: 'vertical' }} />
            <p style={{ fontSize: '11px', color: '#889B8E', marginTop: '6px' }}>This is the name your customers see in your Shopify store.</p>
          </Card>

            {previewing ? (
              <Card n={2} title="Print summary">
                {areas.map(a => {
                  const art = artworks[a.id], p = placements[a.id]
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid rgba(23,43,21,0.08)' }}>
                      <span style={{ fontWeight: 600, color: art ? '#172B15' : '#A9B6AC' }}>{a.label}</span>
                      <span style={{ color: '#889B8E' }}>{art && p ? (ps => `${ps.w.toFixed(1)}″ × ${ps.h.toFixed(1)}″${Number(a.print_cost) ? ` · +₹${a.print_cost}` : ''}`)(printedSize(p, a, art.px_h / art.px_w)) : 'Not printed'}</span>
                    </div>
                  )
                })}
              </Card>
            ) : (
              <Card n={2} title={`Artwork: ${area.label}`}>
                <label className="pf-btn-outline" style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer', fontSize: '13px', padding: '10px 16px' }}>
                  {artwork ? `Replace ${area.label.toLowerCase()} artwork` : `Upload ${area.label.toLowerCase()} artwork (PNG or JPG)`}
                  <input type="file" accept="image/png,image/jpeg" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                <button onClick={() => setPickingFile(true)} style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', color: '#172B15', fontSize: '12px', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Choose from My files
                </button>
                {pickingFile && <FilePicker onPick={pickFile} onClose={() => setPickingFile(false)} />}
                <p style={{ fontSize: '11px', color: '#889B8E', marginTop: '6px' }}>
                  {areas.length > 1 && !artwork ? 'Optional. Leave it empty to print nothing here. ' : ''}
                  {Number(area.print_cost) ? `Printing here adds ₹${area.print_cost} to the cost.` : ''}
                </p>
                {uploadError && <div style={{ fontSize: '12px', color: '#C53030', marginTop: '8px' }}>⚠ {uploadError}</div>}
                {artwork && placement && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: '#889B8E', marginTop: '8px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {artwork.name} · {artwork.px_w}×{artwork.px_h}px {artwork.uploading ? '· uploading…' : artwork.s3_key ? '· uploaded ✓' : ''}
                      </span>
                      <button onClick={removeArtwork} style={{ background: 'none', border: 'none', color: '#C53030', fontSize: '11px', cursor: 'pointer', padding: 0, flexShrink: 0 }}>Remove</button>
                    </div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px', marginTop: '16px' }}>
                      Artwork size: {placement.w.toFixed(1)}″ × {(placement.w * ratio).toFixed(1)}″
                    </label>
                    <input type="range" min={0.5} max={MAX_SCALE * Math.max(area.width_in, area.height_in / ratio)} step={0.1} value={placement.w} onChange={e => resizeTo(Number(e.target.value))} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="pf-btn-outline" style={{ flex: 1, padding: '7px', fontSize: '12px' }} onClick={() => setPlacement(p => ({ ...p, x: (area.width_in - p.w) / 2 }))}>Center</button>
                      <button className="pf-btn-outline" style={{ flex: 1, padding: '7px', fontSize: '12px' }} onClick={() => setPlacement(() => { const w = Math.min(area.width_in, area.height_in / ratio); return { w, x: (area.width_in - w) / 2, y: 0 } })}>Fit to area</button>
                    </div>
                    {printedSize(placement, area, ratio).clipped && (
                      <div style={{ marginTop: '12px', background: '#FFF7ED', color: '#C2410C', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600 }}>
                        Part of the artwork is outside the print area. The faded part won't be printed; {(() => { const ps = printedSize(placement, area, ratio); return `${ps.w.toFixed(1)}″ × ${ps.h.toFixed(1)}″ will.` })()}
                      </div>
                    )}
                    {dpiTone && (
                      <div style={{ marginTop: '12px', background: dpiTone[0], color: dpiTone[1], borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600 }}>
                        {dpi} DPI · {dpiTone[2]}
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}

            <Card n={3} title="Colors">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {blank.colors.map(c => {
                  const on = colors.includes(c.name)
                  return (
                    <button key={c.name} onClick={() => { toggle(colors, setColors, c.name); setPreviewColor(c.name) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '100px', border: on ? '1.5px solid #172B15' : '1px solid rgba(23,43,21,0.08)', background: on ? '#FAFAF8' : '#FFFFFF', fontSize: '12px', fontWeight: 600, color: '#172B15', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex, border: '1px solid #D8D8D4' }} />
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card n={4} title="Sizes and prices">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {sizesInStock.map(s => (
                  <button key={s} onClick={() => toggle(sizes, setSizes, s)} style={{ ...chip(sizes.includes(s)), minWidth: '42px' }}>{s}</button>
                ))}
              </div>
              {sizes.length > 0 && colors.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>{['Size', 'Cost', 'Your price', 'Profit'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#889B8E', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 4px 6px' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sizesInStock.filter(s => sizes.includes(s)).map(s => {
                      const cost = costFor(s)
                      const price = priceFor(s)
                      const profit = Number(price) - cost
                      return (
                        <tr key={s} style={{ borderTop: '1px solid rgba(23,43,21,0.08)' }}>
                          <td style={{ padding: '6px 4px', fontWeight: 700 }}>{s}</td>
                          <td style={{ padding: '6px 4px', color: '#889B8E' }}>₹{cost}</td>
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
              <p style={{ fontSize: '11px', color: '#889B8E', marginTop: '8px' }}>
                Cost is the blank{printCost ? ` plus ₹${printCost} for the printed areas` : ' and printing'}; shipping and tax are charged separately.
              </p>
            </Card>

          <Card title="Print details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {areas.map(a => {
                const art = artworks[a.id], p = placements[a.id]
                return (
                  <div key={a.id} style={{ border: '1px solid rgba(23,43,21,0.08)', borderRadius: '10px', padding: '10px 12px', background: art ? '#FFFFFF' : '#FAFAF8' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: art ? '#172B15' : '#A9B6AC' }}>{a.label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#889B8E', marginTop: '6px' }}><span>Size</span><span>{art && p ? (ps => `${ps.w.toFixed(1)}″ × ${ps.h.toFixed(1)}″`)(printedSize(p, a, art.px_h / art.px_w)) : '—'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#889B8E', marginTop: '2px' }}><span>Cost</span><span>{art ? `+₹${Number(a.print_cost || 0)}` : '—'}</span></div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(23,43,21,0.08)', marginTop: '14px', paddingTop: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#172B15' }}>Total cost per item</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#172B15' }}>{Number.isFinite(fromCost) ? `from ₹${fromCost}` : '—'} <span style={{ fontSize: '11px', fontWeight: 500, color: '#889B8E' }}>+ tax + shipping</span></span>
            </div>
          </Card>

          <div className="pf-design-save" style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)', padding: '18px 22px' }}>
            {saveError && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#C53030' }}>⚠ {saveError}</div>}
            {problems.length > 0 && <div style={{ fontSize: '12px', color: '#889B8E', marginBottom: '10px' }}>{problems[0]}</div>}
            <button className="pf-btn" onClick={handleSave} disabled={saving || problems.length > 0} style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 800, background: '#B9F95D', color: '#172B15', borderRadius: '14px', boxShadow: '0 6px 18px rgba(185,249,93,0.35)' }}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
