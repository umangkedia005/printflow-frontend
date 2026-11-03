// Flat garment drawings used when a blank has no photo for a color. They are
// drawn on a 1000×1000 canvas so a print area's mockup_box (fractions of a
// square product photo) lines up the same way on either.
const SHAPES = {
  tee: {
    body: 'M420 130 Q500 185 580 130 L750 165 L870 330 L785 390 L710 330 L710 900 L290 900 L290 330 L215 390 L130 330 L250 165 Z',
    details: ['M420 130 Q500 205 580 130', 'M290 330 L290 345', 'M710 330 L710 345', 'M175 352 L262 395', 'M825 352 L738 395'],
  },
  hoodie: {
    body: 'M380 160 L250 200 L150 560 L120 820 L200 830 L250 600 L280 420 L280 880 L720 880 L720 420 L750 600 L800 830 L880 820 L850 560 L750 200 L620 160 Q630 40 500 40 Q370 40 380 160 Z',
    details: ['M420 165 Q500 85 580 165 Q500 215 420 165 Z', 'M370 680 L630 680 L670 820 L330 820 Z', 'M280 840 L720 840', 'M465 200 L460 300', 'M535 200 L540 300'],
  },
}

const FULL_PHOTO = { x: 0, y: 0, w: 1 }

// Seams need to stay visible on both white and black fabric.
function isDark(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 110
}

// `zoom` shows a square part of the photo (fractions of it), e.g. just the
// front of a photo that shows front and back side by side. Children are laid
// over the visible frame.
export default function GarmentMockup({ type, color, photoUrl, zoom = FULL_PHOTO, children }) {
  const shape = SHAPES[type] || SHAPES.tee
  const line = isDark(color) ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)'
  const gradientId = `shade-${type}`
  // maxWidth: Tailwind's base styles cap img/svg at 100%, which would undo the zoom.
  const zoomed = {
    position: 'absolute',
    maxWidth: 'none',
    width: `${100 / zoom.w}%`,
    height: `${100 / zoom.w}%`,
    left: `${(-zoom.x / zoom.w) * 100}%`,
    top: `${(-zoom.y / zoom.w) * 100}%`,
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: photoUrl ? '#FFFFFF' : '#F4F4F0', borderRadius: '12px', overflow: 'hidden' }}>
      {photoUrl ? (
        <img src={photoUrl} alt="" draggable={false} style={{ ...zoomed, objectFit: 'cover', userSelect: 'none' }} />
      ) : (
        <svg viewBox="0 0 1000 1000" style={zoomed} aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
              <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <path d={shape.body} fill={color} stroke={line} strokeWidth="4" strokeLinejoin="round" />
          <path d={shape.body} fill={`url(#${gradientId})`} />
          {shape.details.map(d => <path key={d} d={d} fill="none" stroke={line} strokeWidth="4" strokeLinecap="round" />)}
        </svg>
      )}
      {children}
    </div>
  )
}
