import GarmentMockup from './GarmentMockup'

const FULL_PHOTO = { x: 0, y: 0, w: 1 }

// A saved design as it will look printed: the product photo in the design's
// first colour, on the first side it prints on, with the artwork placed
// where it prints and cut to the print area (the part outside isn't printed).
// Falls back to the bare artwork if the product isn't available.
export default function DesignMockup({ design, blank }) {
  const artwork = design.artwork || {}
  const areas = (blank?.print_areas || []).filter(a => artwork[a.id])
  if (!blank || !areas.length) {
    const first = Object.values(artwork)[0]
    return (
      <div style={{ aspectRatio: '1 / 1', background: '#F4F5F0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {first?.preview_url && <img src={first.preview_url} alt="" style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }} />}
      </div>
    )
  }

  const views = blank.views?.length ? blank.views : [{ id: 'main' }]
  const viewOf = a => a.view_id || views[0].id
  const viewId = viewOf(areas[0])
  const sides = new Set(areas.map(viewOf)).size
  const color = blank.colors.find(c => c.name === design.colors?.[0]) || blank.colors[0]
  const photo = color?.image_urls?.[viewId] || (viewId === views[0].id ? color?.image_url : undefined)
  const pct = n => `${n * 100}%`

  return (
    <div style={{ position: 'relative' }}>
      <GarmentMockup type={blank.mockup} color={color?.hex || '#FFFFFF'} photoUrl={photo}>
        {areas.filter(a => viewOf(a) === viewId).map(a => {
          const art = artwork[a.id], b = a.mockup_box
          const ratio = Number(art.px_h) / Number(art.px_w)
          return (
            <div key={a.id} style={{ position: 'absolute', left: pct((b.x - FULL_PHOTO.x) / FULL_PHOTO.w), top: pct(b.y), width: pct(b.w), height: pct(b.h), overflow: 'hidden' }}>
              <img src={art.preview_url} alt="" draggable={false} style={{ position: 'absolute', maxWidth: 'none', left: pct(art.x_in / a.width_in), top: pct(art.y_in / a.height_in), width: pct(art.width_in / a.width_in), height: pct((art.width_in * ratio) / a.height_in) }} />
            </div>
          )
        })}
      </GarmentMockup>
      {sides > 1 && <span style={{ position: 'absolute', left: '8px', bottom: '8px', background: 'rgba(255,255,255,0.92)', color: '#172B15', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px' }}>+{sides - 1} side{sides > 2 ? 's' : ''}</span>}
    </div>
  )
}
