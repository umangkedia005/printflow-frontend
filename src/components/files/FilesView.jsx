import { useCallback, useEffect, useRef, useState } from 'react'
import DesignEditor from '../catalogue/DesignEditor'
import { Modal, Thumb } from './FilePicker'
import { INK, SAGE, LIME, LINE, SERIF, CARD, LABEL } from './theme'
import { fetchArtworkFiles, uploadArtworkFile, deleteArtworkFile, fetchDesignableProducts, saveMerchantProduct } from '../../utils/api'
import { printSizeAt } from '../../utils/artworkImage'

const megabytes = b => `${(Number(b || 0) / 1024 / 1024).toFixed(1)} MB`
const baseName = name => name.replace(/\.[a-z0-9]+$/i, '')
const suggestedPrice = cost => Math.max(cost, Math.ceil((cost * 1.8) / 50) * 50 - 1)

function BlankGrid({ blanks, onPick, selectedId }) {
  if (!blanks.length) return <div style={{ textAlign: 'center', padding: '32px', color: SAGE, fontSize: '13px' }}>The catalogue is empty.</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
      {blanks.map(b => {
        const photo = b.colors[0]?.image_urls?.[b.views?.[0]?.id] || b.colors[0]?.image_url
        const selected = b.blank_id === selectedId
        return (
          <button key={b.blank_id} onClick={() => onPick(b)} style={{ textAlign: 'left', background: '#FFFFFF', border: selected ? `2px solid ${INK}` : `1px solid ${LINE}`, borderRadius: '16px', padding: selected ? '7px' : '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ aspectRatio: '1 / 1', borderRadius: '12px', background: '#F4F5F0', overflow: 'hidden' }}>
              {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none' }} />}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: INK, marginTop: '8px' }}>{b.name}</div>
            <div style={{ fontSize: '11px', color: SAGE }}>{b.own ? 'Your garment · printing only' : `${b.gsm} GSM · from ₹${Math.min(...b.variants.map(v => Number(v.base_cost)))}`}</div>
          </button>
        )
      })}
    </div>
  )
}

// Where the file goes when it's ordered without the designer: as big as fits
// the print area while staying sharp, centred, near the top.
function autoPlacement(file, area) {
  const r = file.px_h / file.px_w
  const minDpi = Number(area.min_dpi || 150)
  const fit = Math.min(area.width_in, area.height_in / r)
  const w = Math.min(fit, file.px_w / minDpi)
  return { w, x: (area.width_in - w) / 2, y: Math.min(1, Math.max(0, area.height_in - w * r) / 2), shrunk: w < fit - 0.01 }
}

function QuickOrder({ file, blanks, onClose, onReady }) {
  // With only one product to choose from, start with it picked.
  const only = blanks.length === 1 ? blanks[0] : null
  const [blank, setBlank] = useState(only)
  const [color, setColor] = useState(only?.colors[0]?.name || '')
  // Positions to print on (front, back, sleeves...); the same file goes on each.
  const [areaIds, setAreaIds] = useState(only?.print_areas[0] ? [only.print_areas[0].id] : [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function chooseBlank(b) {
    setBlank(b)
    setColor(b.colors[0]?.name || '')
    setAreaIds(b.print_areas[0] ? [b.print_areas[0].id] : [])
    setError('')
  }

  const toggleArea = id => setAreaIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))
  // In the catalogue's order, each with where the file lands on it.
  const placed = (blank?.print_areas || []).filter(a => areaIds.includes(a.id)).map(a => ({ area: a, place: autoPlacement(file, a) }))
  const printCost = placed.reduce((sum, p) => sum + Number(p.area.print_cost || 0), 0)
  const sizes = blank ? (blank.sizes?.length ? blank.sizes : [...new Set(blank.variants.map(v => v.size))])
    .filter(s => blank.variants.some(v => v.size === s && v.color === color && v.in_stock)) : []

  async function proceed() {
    setSaving(true)
    setError('')
    try {
      const cost = s => Number(blank.variants.find(v => v.size === s && v.color === color).base_cost) + printCost
      const { product_id } = await saveMerchantProduct({
        blank_id: blank.blank_id,
        title: `${baseName(file.name)} · ${blank.name}`,
        description: '',
        colors: [color],
        sizes,
        prices: Object.fromEntries(sizes.map(s => [s, suggestedPrice(cost(s))])),
        artwork: Object.fromEntries(placed.map(({ area, place }) => [area.id, { s3_key: file.s3_key, px_w: Number(file.px_w), px_h: Number(file.px_h), x_in: place.x, y_in: place.y, width_in: place.w }])),
      })
      onReady(product_id)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title="Order this design" subtitle={`${file.name} · choose what to print it on`} onClose={onClose} width={720}>
      <span style={LABEL}>1. Product{!blank && blanks.length > 1 ? ' · click one to choose it' : ''}</span>
      <BlankGrid blanks={blanks} onPick={chooseBlank} selectedId={blank?.blank_id} />

      {blank && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
          <div>
            <span style={LABEL}>2. Colour: {color}</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {blank.colors.map(c => (
                <button key={c.name} title={c.name} onClick={() => setColor(c.name)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.hex, border: color === c.name ? `2px solid ${INK}` : '1px solid #D8D8D4', outline: color === c.name ? '2px solid #FFFFFF' : 'none', outlineOffset: '-4px', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div>
            <span style={LABEL}>3. Print on · tick one or more</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {blank.print_areas.map(a => {
                const on = areaIds.includes(a.id)
                return (
                  <button key={a.id} onClick={() => toggleArea(a.id)} aria-pressed={on} style={{ padding: '8px 14px', borderRadius: '10px', border: on ? `1px solid ${INK}` : `1px solid ${LINE}`, background: on ? INK : '#FFFFFF', color: on ? '#FFFFFF' : INK, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {on ? '✓ ' : ''}{a.label}{Number(a.print_cost) ? ` · +₹${a.print_cost}` : ''}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {placed.length > 0 && (
        <div style={{ marginTop: '20px', background: '#F7F8F4', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: INK, lineHeight: 1.6 }}>
          {placed.map(({ area, place }) => (
            <div key={area.id}>
              <strong>{area.label}:</strong> centred, {place.w.toFixed(1)}″ × {(place.w * file.px_h / file.px_w).toFixed(1)}″
              {place.shrunk && <span style={{ color: '#C2410C' }}> (smaller than the area so it stays sharp)</span>}
            </div>
          ))}
          {printCost > 0 && <div style={{ marginTop: '4px' }}>Printing adds ₹{printCost} per piece.</div>}
          <div style={{ color: SAGE, marginTop: '4px' }}>Want a different file per position, or to move or resize it? Close this and use Design product instead.</div>
        </div>
      )}
      {blank && placed.length === 0 && <div style={{ marginTop: '12px', fontSize: '12px', color: '#C2410C' }}>Tick at least one position to print on.</div>}
      {blank && sizes.length === 0 && <div style={{ marginTop: '12px', fontSize: '12px', color: '#C53030' }}>This colour is out of stock in every size.</div>}
      {error && <div style={{ marginTop: '12px', fontSize: '12px', color: '#C53030' }}>⚠ {error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
        <span style={{ fontSize: '11px', color: SAGE }}>{blank ? 'Sizes and quantities are chosen on the next page.' : 'Choose a product above to continue.'}</span>
        <button disabled={!placed.length || !sizes.length || saving} onClick={proceed} style={{ background: LIME, color: INK, border: 'none', borderRadius: '12px', padding: '12px 20px', fontSize: '13px', fontWeight: 800, cursor: !placed.length || saving ? 'not-allowed' : 'pointer', opacity: !placed.length || !sizes.length || saving ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>
          {saving ? 'Preparing…' : 'Continue to order →'}
        </button>
      </div>
    </Modal>
  )
}

export default function FilesView({ onOrder }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploads, setUploads] = useState([]) // { id, name, error }
  const [dragging, setDragging] = useState(false)
  const [blanks, setBlanks] = useState([])
  const [pickBlankFor, setPickBlankFor] = useState(null)
  const [orderFile, setOrderFile] = useState(null)
  const [designing, setDesigning] = useState(null) // { blank, file }
  const inputRef = useRef(null)

  const load = useCallback(() => {
    fetchArtworkFiles()
      .then(list => { setFiles(list); setError('') })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetchDesignableProducts().then(setBlanks).catch(() => setBlanks([])) }, [])

  async function addFiles(list) {
    setNotice('')
    await Promise.all([...list].map(async file => {
      const id = `${Date.now()}-${Math.random()}`
      setUploads(u => [...u, { id, name: file.name }])
      try {
        const saved = await uploadArtworkFile(file)
        setFiles(f => [saved, ...f])
        setUploads(u => u.filter(x => x.id !== id))
      } catch (err) {
        setUploads(u => u.map(x => (x.id === id ? { ...x, error: err.message } : x)))
      }
    }))
  }

  async function remove(file) {
    if (!window.confirm(`Remove ${file.name} from My files? Designs and orders that already use it are not affected.`)) return
    try {
      await deleteArtworkFile(file.file_id)
      setFiles(f => f.filter(x => x.file_id !== file.file_id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (designing) {
    return (
      <DesignEditor
        blank={designing.blank}
        initialArtwork={designing.file}
        backLabel="Back to My files"
        onClose={() => setDesigning(null)}
        onSaved={() => { setDesigning(null); setNotice('Design saved. Find it under Catalogue → My designs.') }}
      />
    )
  }

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>My files</h1>
        <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Upload your designs once, then put them on any product or order them straight away.</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{ ...CARD, border: `1.5px dashed ${dragging ? INK : 'rgba(23,43,21,0.18)'}`, background: dragging ? '#F7FBEF' : '#FFFFFF', padding: '32px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: '20px' }}
      >
        <div style={{ fontFamily: SERIF, fontSize: '18px', fontWeight: 800, color: INK }}>Drop designs here or click to upload</div>
        <div style={{ fontSize: '12px', color: SAGE, marginTop: '6px' }}>PNG or JPG, up to 50 MB each. A transparent PNG at 300 DPI prints best.</div>
        <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg" onChange={e => { addFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
      </div>

      {uploads.map(u => (
        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background: u.error ? '#FFF5F5' : '#F7F8F4', border: `1px solid ${u.error ? '#FED7D7' : LINE}`, borderRadius: '12px', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: u.error ? '#C53030' : INK }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.error ? `⚠ ${u.name}: ${u.error}` : `Uploading ${u.name}…`}</span>
          {u.error && <button onClick={() => setUploads(x => x.filter(y => y.id !== u.id))} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#C53030', cursor: 'pointer' }}>✕</button>}
        </div>
      ))}

      {notice && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#166534', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span>✓ {notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {error && <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#C53030' }}>⚠ {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>Loading your files…</div>
      ) : files.length === 0 && !error ? (
        <div style={{ textAlign: 'center', padding: '48px', color: SAGE, fontSize: '13px' }}>No files yet. Upload your first design above.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {files.map(f => (
            <div key={f.file_id} style={{ ...CARD, padding: '14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative' }}>
                <Thumb file={f} />
                <button onClick={() => remove(f)} title="Remove from My files" aria-label={`Remove ${f.name}`} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '8px', fontSize: '12px', color: '#C53030', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: INK, marginTop: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</div>
              <div style={{ fontSize: '12px', color: SAGE, marginTop: '3px' }}>{f.px_w} × {f.px_h} px · {megabytes(f.bytes)}</div>
              <div style={{ fontSize: '12px', color: INK, marginTop: '3px', marginBottom: '14px' }}>Sharp up to {printSizeAt(f.px_w)}″ × {printSizeAt(f.px_h)}″</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button className="pf-btn-outline" onClick={() => setPickBlankFor(f)} style={{ flex: 1, padding: '10px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}>Design product</button>
                <button onClick={() => setOrderFile(f)} style={{ flex: 1, background: LIME, color: INK, border: 'none', borderRadius: '12px', padding: '10px 8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Order</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickBlankFor && (
        <Modal title="Choose a product" subtitle={`${pickBlankFor.name} will be placed on it; you can move and resize it next.`} onClose={() => setPickBlankFor(null)}>
          <BlankGrid blanks={blanks} onPick={b => { setDesigning({ blank: b, file: pickBlankFor }); setPickBlankFor(null) }} />
        </Modal>
      )}
      {orderFile && <QuickOrder file={orderFile} blanks={blanks} onClose={() => setOrderFile(null)} onReady={productId => { setOrderFile(null); onOrder(productId) }} />}
    </>
  )
}
