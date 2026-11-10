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
