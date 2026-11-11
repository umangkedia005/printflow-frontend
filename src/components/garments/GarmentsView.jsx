import { useCallback, useEffect, useRef, useState } from 'react'
import DesignEditor from '../catalogue/DesignEditor'
import { fetchGarments, saveGarment, deleteGarment, uploadGarmentPhoto } from '../../utils/api'
import { INK, SAGE, LIME, LINE, SERIF, CARD, LABEL } from '../files/theme'

const TYPES = [
  ['tee', 'Round-neck T-shirt'],
  ['polo', 'Polo'],
  ['hoodie', 'Hoodie'],
]
const VIEWS = [['front', 'Front'], ['back', 'Back'], ['left-sleeve', 'Left sleeve'], ['right-sleeve', 'Right sleeve']]
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']
// Where printing goes by default on a square photo; the team fine-tunes it
// when reviewing. Mirrors TEMPLATES in the backend's garments.py.
const TEMPLATES = {
  tee: { front: [12, 16, 0.31, 0.24, 0.38], back: [12, 16, 0.31, 0.20, 0.38], 'left-sleeve': [3, 4, 0.40, 0.35, 0.20], 'right-sleeve': [3, 4, 0.40, 0.35, 0.20] },
  polo: { front: [10, 12, 0.33, 0.32, 0.34], back: [12, 16, 0.31, 0.20, 0.38], 'left-sleeve': [3, 4, 0.40, 0.35, 0.20], 'right-sleeve': [3, 4, 0.40, 0.35, 0.20] },
  hoodie: { front: [12, 10, 0.31, 0.30, 0.38], back: [12, 16, 0.31, 0.22, 0.38], 'left-sleeve': [3, 12, 0.44, 0.12, 0.12], 'right-sleeve': [3, 12, 0.44, 0.12, 0.12] },
}
const STATUS = {
  pending: ['Waiting for review', '#FFF7ED', '#C2410C'],
  approved: ['Approved', '#E6F4EA', '#137333'],
  rejected: ['Needs changes', '#FFF5F5', '#C53030'],
}
const typeName = t => (TYPES.find(([id]) => id === t) || [])[1] || t
// "₹299" or "₹299–₹349" across the sizes we priced; null until priced.
function priceRange(g) {
  const prices = Object.values(g.prices || {}).map(Number).filter(n => n > 0)
  if (!prices.length) return null
  const lo = Math.min(...prices), hi = Math.max(...prices)
  return lo === hi ? `₹${lo}` : `₹${lo}–₹${hi}`
}
const EMPTY = { name: '', type: 'tee', color: { name: '', hex: '#FFFFFF' }, sizes: ['S', 'M', 'L', 'XL'], photos: {} }

// A photo with the print box drawn on it (box = fractions of the square photo).
function PhotoWithBox({ url, box, label }) {
  return (
    <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '12px', overflow: 'hidden', background: '#F4F5F0' }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none', display: 'block' }} />}
      {url && box && (
        <div style={{ position: 'absolute', left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`, border: '1.5px dashed #2563EB', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#2563EB' }}>{label}</div>
      )}
    </div>
  )
}

// The photo with a print box the customer can drag (move) and resize from
// its corner. The box keeps the print area's proportions; its printed size in
// inches grows and shrinks with it.
function EditableBox({ url, box, wIn, hIn, onChange }) {
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const ratio = hIn / wIn
  const h = box.w * ratio
  const clamp = b => {
    const w = Math.min(Math.max(b.w, 0.05), 0.95, 1 / ratio)
    return { w, x: Math.min(Math.max(b.x, 0), 1 - w), y: Math.min(Math.max(b.y, 0), 1 - w * ratio) }
  }
  function start(e, mode) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const rect = frameRef.current.getBoundingClientRect()
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, box, size: rect.width }
  }
  function move(e) {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.startX) / d.size, dy = (e.clientY - d.startY) / d.size
    onChange(clamp(d.mode === 'move' ? { ...d.box, x: d.box.x + dx, y: d.box.y + dy } : { ...d.box, w: d.box.w + Math.max(dx, dy / ratio) }))
  }
  const stop = () => { dragRef.current = null }
  // Inches scale with the box: the standard box width is the standard size.
  const scale = box.w / (box.base || box.w)
  return (
    <div ref={frameRef} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '12px', overflow: 'hidden', background: '#F4F5F0', touchAction: 'none', userSelect: 'none' }}>
      <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none', display: 'block', pointerEvents: 'none' }} />
      <div onPointerDown={e => start(e, 'move')} style={{ position: 'absolute', left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${h * 100}%`, border: '1.5px dashed #2563EB', background: 'rgba(37,99,235,0.1)', cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#2563EB', textAlign: 'center' }}>
        {Number.isFinite(scale) ? `${(wIn * scale).toFixed(1)}″ × ${(hIn * scale).toFixed(1)}″` : ''}
        <div onPointerDown={e => start(e, 'resize')} title="Drag to resize" style={{ position: 'absolute', right: '-6px', bottom: '-6px', width: '12px', height: '12px', background: '#FFFFFF', border: '2px solid #2563EB', borderRadius: '3px', cursor: 'nwse-resize' }} />
      </div>
    </div>
  )
}

function templateBox(type, view) {
  const t = TEMPLATES[type]?.[view]
  if (!t) return null
  const [wIn, hIn, x, y, w] = t
  return { x, y, w, h: (w * hIn) / wIn, size: `${wIn}″ × ${hIn}″` }
}

function GarmentForm({ initial, onCancel, onSaved }) {
  const [g, setG] = useState(() => ({ ...EMPTY, ...initial, color: { ...EMPTY.color, ...(initial?.color || {}) }, photos: { ...(initial?.photos || {}) } }))
  // Local previews for photos uploaded in this session; saved ones use photo_urls.
  const [previews, setPreviews] = useState(() => ({ ...(initial?.photo_urls || {}) }))
  const [uploading, setUploading] = useState({})
  // Where the customer put each print box; starts at the type's standard spot.
  const [boxes, setBoxes] = useState(() => Object.fromEntries((initial?.areas || []).map(a => [a.view_id, { x: a.mockup_box.x, y: a.mockup_box.y, w: a.mockup_box.w }])))
  const boxFor = view => {
    const t = templateBox(g.type, view)
    if (!t) return null
    const b = boxes[view] || { x: t.x, y: t.y, w: t.w }
    return { ...b, base: t.w }
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = patch => setG(prev => ({ ...prev, ...patch }))

  async function addPhoto(view, file) {
    if (!file) return
    setError('')
    setUploading(u => ({ ...u, [view]: true }))
    try {
      const key = await uploadGarmentPhoto(file)
      setG(prev => ({ ...prev, photos: { ...prev.photos, [view]: key } }))
      setPreviews(p => ({ ...p, [view]: URL.createObjectURL(file) }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(u => ({ ...u, [view]: false }))
    }
  }
  function removePhoto(view) {
    setG(prev => { const photos = { ...prev.photos }; delete photos[view]; return { ...prev, photos } })
    setPreviews(p => { const next = { ...p }; delete next[view]; return next })
  }

  const busy = Object.values(uploading).some(Boolean)
  const problems = []
  if (!g.name.trim()) problems.push('a name')
  if (!g.color.name.trim()) problems.push('the colour name')
  if (!g.sizes.length) problems.push('at least one size')
  if (!g.photos.front) problems.push('a front photo')

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const positions = Object.fromEntries(VIEWS.filter(([v]) => g.photos[v]).map(([v]) => { const b = boxFor(v); return [v, { x: b.x, y: b.y, w: b.w }] }))
      await saveGarment({ garment_id: initial?.garment_id, name: g.name.trim(), type: g.type, color: { name: g.color.name.trim(), hex: g.color.hex }, sizes: g.sizes, photos: g.photos, positions })
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 0, color: SAGE, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '8px' }}>← Back to My garments</button>
      <h1 style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>{initial?.garment_id ? 'Edit garment' : 'Add your garment'}</h1>
      <p style={{ fontSize: '13px', color: SAGE, marginBottom: '20px' }}>Show us the garment you want. We review it, set where printing can go and its price, and let you know.</p>
      {initial?.status === 'rejected' && initial.note && (
        <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>Our note: {initial.note}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
        <div style={{ ...CARD, padding: '22px 24px' }}>
          <span style={LABEL}>Name</span>
          <input value={g.name} onChange={e => set({ name: e.target.value })} maxLength={60} placeholder="e.g. Cream oversized tee" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', marginBottom: '18px' }} />

          <span style={LABEL}>Type</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {TYPES.map(([id, label]) => (
              <button key={id} onClick={() => { if (id !== g.type) { set({ type: id }); setBoxes({}) } }} style={{ padding: '9px 14px', borderRadius: '10px', border: g.type === id ? `1px solid ${INK}` : `1px solid ${LINE}`, background: g.type === id ? INK : '#FFFFFF', color: g.type === id ? '#FFFFFF' : INK, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{label}</button>
            ))}
          </div>

          <span style={LABEL}>Colour</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
            <input type="color" value={g.color.hex} onChange={e => set({ color: { ...g.color, hex: e.target.value } })} aria-label="Pick the colour" style={{ width: '44px', height: '40px', padding: 0, border: `1px solid ${LINE}`, borderRadius: '10px', background: 'none', cursor: 'pointer' }} />
            <input value={g.color.name} onChange={e => set({ color: { ...g.color, name: e.target.value } })} maxLength={40} placeholder="Colour name, e.g. Cream" style={{ flex: 1, padding: '11px 14px', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
          </div>

          <span style={LABEL}>Sizes you want</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SIZES.map(s => {
              const on = g.sizes.includes(s)
              return <button key={s} onClick={() => set({ sizes: on ? g.sizes.filter(x => x !== s) : SIZES.filter(x => x === s || g.sizes.includes(x)) })} style={{ minWidth: '44px', padding: '8px 10px', borderRadius: '10px', border: on ? `1px solid ${INK}` : `1px solid ${LINE}`, background: on ? INK : '#FFFFFF', color: on ? '#FFFFFF' : INK, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{s}</button>
            })}
          </div>
        </div>

        <div style={{ ...CARD, padding: '22px 24px' }}>
          <span style={LABEL}>Photos · front is required</span>
          <p style={{ fontSize: '12px', color: SAGE, margin: '-2px 0 14px' }}>A plain photo of each side on a light background. Drag the dashed box to where you want printing, and its corner to resize. Our team checks it when reviewing.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {VIEWS.map(([view, label]) => {
              const box = templateBox(g.type, view)
              const placed = boxFor(view)
              const [wIn, hIn] = TEMPLATES[g.type][view]
              return (
                <div key={view}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>
                    <span>{label}</span>
                    {previews[view] && <button onClick={() => removePhoto(view)} style={{ background: 'none', border: 'none', color: '#C53030', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Remove</button>}
                  </div>
                  {previews[view] ? (
                    <EditableBox url={previews[view]} box={placed} wIn={wIn} hIn={hIn} onChange={b => setBoxes(all => ({ ...all, [view]: b }))} />
                  ) : (
                    <label style={{ aspectRatio: '1 / 1', borderRadius: '12px', border: '1.5px dashed rgba(23,43,21,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '12px', color: SAGE, cursor: 'pointer', padding: '8px' }}>
                      {uploading[view] ? 'Uploading…' : `+ ${label} photo`}
                      <input type="file" accept="image/png,image/jpeg" onChange={e => { addPhoto(view, e.target.files?.[0]); e.target.value = '' }} style={{ display: 'none' }} disabled={uploading[view]} />
                    </label>
                  )}
                  {box && <div style={{ fontSize: '11px', color: SAGE, marginTop: '4px' }}>{previews[view] ? 'Drag the box to move it, its corner to resize' : `Prints up to ${box.size}`}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {error && <div style={{ marginTop: '14px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
        <span style={{ fontSize: '12px', color: SAGE }}>{problems.length ? `Add ${problems.join(', ')}.` : "We'll email you once it's reviewed."}</span>
        <button disabled={!!problems.length || busy || saving} onClick={submit} style={{ background: LIME, color: INK, border: 'none', borderRadius: '12px', padding: '12px 20px', fontSize: '13px', fontWeight: 800, cursor: problems.length || busy || saving ? 'not-allowed' : 'pointer', opacity: problems.length || busy || saving ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>
          {saving ? 'Sending…' : 'Send for review'}
        </button>
      </div>
    </div>
  )
}

// onOrderPlain(blankId): open Create order with this garment as a plain line.
export default function GarmentsView({ onOrderPlain }) {
  const [garments, setGarments] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null) // {} for new, garment to edit
  const [designing, setDesigning] = useState(null)

  const load = useCallback(() => {
    fetchGarments()
      .then(list => { setGarments(list); setError('') })
      .catch(err => { setError(err.message); setGarments(g => g || []) })
  }, [])
  useEffect(() => { load() }, [load])

  async function remove(g) {
    if (!window.confirm(`Remove ${g.name}? Designs made on it can no longer be ordered.`)) return
    try {
      await deleteGarment(g.garment_id)
      setGarments(list => list.filter(x => x.garment_id !== g.garment_id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (designing) {
    return (
      <DesignEditor
        blank={designing}
        backLabel="Back to My garments"
        onClose={() => setDesigning(null)}
        onSaved={() => { setDesigning(null); setNotice('Design saved. Find it under Catalogue → My designs, or order it from Create order.') }}
      />
    )
  }
  if (editing) {
    return <GarmentForm initial={editing.garment_id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice("Sent for review. We'll email you when it's approved."); load() }} />
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>My garments</h1>
          <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Add the T-shirt, polo or hoodie style you want. Once we approve and price it, design on it or order it plain.</p>
        </div>
        <button onClick={() => setEditing({})} style={{ background: LIME, color: INK, border: 'none', borderRadius: '12px', padding: '11px 18px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Add garment</button>
      </div>

      <div style={{ ...CARD, padding: '16px 20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        {[
          ['1', 'Add your garment', 'Photos, type, colour and sizes'],
          ['2', 'We review and price it', 'We set where printing goes and the price per piece'],
          ['3', 'Design or order', 'Print your designs on it, or order it plain'],
        ].map(([n, title, desc]) => (
          <div key={n} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: INK, color: '#FFFFFF', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
            <div><div style={{ fontSize: '13px', fontWeight: 700, color: INK }}>{title}</div><div style={{ fontSize: '11.5px', color: SAGE, marginTop: '2px' }}>{desc}</div></div>
          </div>
        ))}
      </div>

      {notice && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#166534', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span>✓ {notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}

      {garments === null ? (
        <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>Loading your garments…</div>
      ) : garments.length === 0 ? (
        <div style={{ ...CARD, textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 800, color: INK }}>No garments yet</div>
          <div style={{ fontSize: '13px', color: SAGE, marginTop: '6px' }}>Add the T-shirt, polo or hoodie you want us to print on.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
          {garments.map(g => {
            const [label, bg, fg] = STATUS[g.status] || STATUS.pending
            const front = (g.areas || []).find(a => a.view_id === 'front')
            return (
              <div key={g.garment_id} style={{ ...CARD, padding: '14px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <PhotoWithBox url={g.photo_urls?.front} box={front?.mockup_box} />
                  <button onClick={() => remove(g)} title="Remove" aria-label={`Remove ${g.name}`} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '8px', fontSize: '12px', color: '#C53030', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.name}>{g.name}</div>
                  <span style={{ flexShrink: 0, background: bg, color: fg, padding: '3px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 700 }}>{label}</span>
                </div>
                <div style={{ fontSize: '12px', color: SAGE, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.color?.hex, border: '1px solid #D8D8D4' }} />
                  {typeName(g.type)} · {g.color?.name} · {(g.sizes || []).join(', ')}
                </div>
                {g.status === 'approved' && (
                  <div style={{ fontSize: '12px', color: INK, marginTop: '4px', lineHeight: 1.5 }}>
                    {priceRange(g) ? <div><strong>{priceRange(g)}</strong> per piece</div> : <div style={{ color: '#C2410C' }}>Price coming soon: we'll email you when it's set</div>}
                    <div>Prints on {(g.areas || []).map(a => `${a.label} (+₹${Number(a.print_cost)})`).join(', ')}</div>
                  </div>
                )}
                {g.note && <div style={{ fontSize: '12px', color: g.status === 'rejected' ? '#C53030' : SAGE, marginTop: '6px' }}>Note: {g.note}</div>}
                <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
                  {g.status === 'approved' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button disabled={!priceRange(g)} onClick={() => setDesigning(g.blank)} title={priceRange(g) ? undefined : 'Available once we set the price'} style={{ flex: 1, background: INK, color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '11px', fontSize: '13px', fontWeight: 800, cursor: priceRange(g) ? 'pointer' : 'not-allowed', opacity: priceRange(g) ? 1 : 0.4, fontFamily: 'Inter, sans-serif' }}>Design on it</button>
                      {onOrderPlain && priceRange(g) && <button className="pf-btn-outline" onClick={() => onOrderPlain(g.blank.blank_id)} style={{ flex: 1, padding: '10px', fontSize: '12px', whiteSpace: 'nowrap' }}>Order plain</button>}
                    </div>
                  ) : (
                    <button className="pf-btn-outline" onClick={() => setEditing(g)} style={{ width: '100%', padding: '10px', fontSize: '13px' }}>{g.status === 'rejected' ? 'Fix and resend' : 'Edit'}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
