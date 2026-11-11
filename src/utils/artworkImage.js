export const MAX_ARTWORK_BYTES = 50 * 1024 * 1024
export const ARTWORK_TYPES = ['image/png', 'image/jpeg']

export function readImageSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, img })
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = url
  })
}

// A small PNG (transparency kept) for the My files grid, so it doesn't load
// 50 MB originals just to show thumbnails.
export function makeThumbnail(img, max = 480) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob ? new File([blob], 'thumb.png', { type: 'image/png' }) : null), 'image/png'))
}

// Largest size the file prints well at, in inches.
export const printSizeAt = (px, dpi = 300) => (px / dpi).toFixed(1)

// Garment photos are shown square (print boxes are fractions of a square
// photo), so pad them to a square on their own background and shrink them.
export async function squarePhoto(file, maxPx = 1600) {
  const url = URL.createObjectURL(file)
  try {
    const { img } = await readImageSize(url)
    const w = img.naturalWidth, h = img.naturalHeight
    const size = Math.min(Math.max(w, h), maxPx)
    const scale = size / Math.max(w, h)
    const probe = document.createElement('canvas')
    probe.width = probe.height = 1
    const pctx = probe.getContext('2d')
    pctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1)
    const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = a < 250 ? '#FFFFFF' : `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, 0, size, size)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) throw new Error('Could not prepare this photo.')
    return new File([blob], 'garment.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
