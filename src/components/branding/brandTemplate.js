// Draws a brand's hang tag / courier bag / thank-you card from a template:
// the same function paints the small live previews and the full-size print
// file, so what the brand sees is what gets printed.

export const STYLES = [
  { id: 'black', label: 'Black', bg: '#111111', ink: '#FFFFFF' },
  { id: 'cream', label: 'Cream', bg: '#EFE6D6', ink: '#141414' },
  { id: 'blue', label: 'Royal blue', bg: '#1F3FBF', ink: '#FFFFFF' },
  { id: 'stripes', label: 'Black stripes', bg: '#141414', ink: '#EFE6D6' },
  { id: 'orange', label: 'Orange box', bg: '#F26B1D', ink: '#141414' },
]

// Print size in pixels (300 DPI; bags at 150 DPI, plenty for big flat type).
export const PRINT_SIZE = {
  hang_tag: { w: 600, h: 1050, label: '2 × 3.5 in' },
  poly_bag: { w: 1500, h: 2100, label: '10 × 14 in print area' },
  thank_you_card: { w: 1800, h: 1200, label: '6 × 4 in' },
}

export const FONTS = ['400 40px Anton', '400 40px "Archivo Black"', '800 40px Inter', '600 40px Inter', '700 40px Fraunces']

export async function loadTemplateFonts() {
  if (!document.fonts?.load) return
  await Promise.all(FONTS.map(f => document.fonts.load(f).catch(() => null)))
}

function fontFor(style, role) {
  if (role === 'small') return { weight: '600', family: 'Inter, sans-serif' }
  if (style === 'blue') return { weight: '400', family: 'Anton, Impact, sans-serif' }
  if (style === 'black') return { weight: '400', family: '"Archivo Black", Inter, sans-serif' }
  return { weight: '800', family: 'Inter, sans-serif' }
}

// The biggest font size at which every line fits `maxW` (and the block `maxH`).
function fit(ctx, lines, font, maxW, maxH, lineGap = 1.05) {
  let size = maxH
  for (; size > 6; size -= Math.max(1, size * 0.04)) {
    ctx.font = `${font.weight} ${size}px ${font.family}`
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width))
    if (widest <= maxW && lines.length * size * lineGap <= maxH) break
  }
  return size
}

// "No Limit Studio" -> ["NO LIMIT", "STUDIO"]; one word stays one line.
function split(name) {
  const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean)
  if (words.length < 2) return words.length ? words : ['YOUR BRAND']
  let best = [words.join(' ')], diff = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ')
    if (Math.abs(a.length - b.length) < diff) { diff = Math.abs(a.length - b.length); best = [a, b] }
  }
  return best
}

function drawLines(ctx, lines, font, size, x, yTop, align, color, lineGap = 1.05) {
  ctx.font = `${font.weight} ${size}px ${font.family}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, x, yTop + i * size * lineGap))
  return lines.length * size * lineGap
}

/**
 * design: { product, style, brandName, tagline, handle, headline, logo (HTMLImageElement|null) }
 * preview: also draws the tag's punched hole (not part of the print file).
 */
export function renderDesign(canvas, design, { preview = false } = {}) {
  const w = canvas.width, h = canvas.height
  const ctx = canvas.getContext('2d')
  const st = STYLES.find(s => s.id === design.style) || STYLES[0]
  const u = Math.min(w, h) / 100 // 1% of the short side
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = st.bg
  ctx.fillRect(0, 0, w, h)

  if (st.id === 'stripes') {
    ctx.save()
    ctx.strokeStyle = st.ink
    ctx.lineWidth = u * 1.6
    for (let i = 0; i < 5; i++) {
      const y = h * 0.72 + i * u * 6
      ctx.beginPath(); ctx.moveTo(-u * 5, y + u * 18); ctx.lineTo(w + u * 5, y - u * 14); ctx.stroke()
    }
    ctx.restore()
  }

  const card = design.product === 'thank_you_card'
  const big = fontFor(st.id, 'big')
  const small = fontFor(st.id, 'small')
  const pad = u * (card ? 9 : 10)
  const left = st.id === 'cream' && !card
  const x = left ? pad : w / 2
  const align = left ? 'left' : 'center'
  const maxW = w - pad * 2

  if (card) {
    const head = (design.headline || 'THANK YOU').toUpperCase().split(/\n/)
    const headFont = st.id === 'cream' ? { weight: '700', family: 'Fraunces, Georgia, serif' } : big
    const headSize = fit(ctx, head, headFont, maxW, h * 0.28)
    const msg = design.tagline || 'We appreciate your order.'
    const msgSize = fit(ctx, [msg], small, maxW * 0.9, h * 0.07)
    const brand = (design.brandName || 'YOUR BRAND').toUpperCase()
    const brandSize = fit(ctx, [brand], { weight: '800', family: 'Inter, sans-serif' }, maxW * 0.7, h * 0.07)
    const block = head.length * headSize * 1.05 + msgSize * 2.2
    let y = (h - block) / 2 - h * 0.08
    y += drawLines(ctx, head, headFont, headSize, w / 2, y, 'center', st.ink)
    drawLines(ctx, [msg], small, msgSize, w / 2, y + msgSize * 0.8, 'center', st.ink)
    if (design.logo) {
      const lh = h * 0.12, lw = Math.min(maxW * 0.4, lh * (design.logo.width / design.logo.height))
      ctx.drawImage(design.logo, w / 2 - lw / 2, h * 0.78, lw, lw * (design.logo.height / design.logo.width))
    } else {
      drawLines(ctx, [brand], { weight: '800', family: 'Inter, sans-serif' }, brandSize, w / 2, h * 0.8, 'center', st.ink)
    }
  } else {
    const lines = st.id === 'stripes' || st.id === 'orange' ? [(design.brandName || 'YOUR BRAND').toUpperCase()] : split(design.brandName || '')
    const blockH = h * (st.id === 'blue' ? 0.42 : st.id === 'orange' || st.id === 'stripes' ? 0.1 : 0.2)
    const widthShare = st.id === 'blue' ? 0.96 : st.id === 'orange' ? 0.76 : st.id === 'cream' ? 0.78 : 0.84
    let size = fit(ctx, lines, big, maxW * widthShare, blockH)
    let logoH = 0
    if (design.logo) logoH = h * 0.16
    const extra = [design.tagline, design.handle].filter(Boolean)
    const smallSize = Math.min(size * 0.32, u * 5.2)
    const total = logoH + (logoH ? u * 5 : 0) + lines.length * size * 1.05 + (extra.length ? smallSize * 1.6 * extra.length + u * 3 : 0)
    let y = st.id === 'stripes' ? h * 0.42 - total / 2 : (h - total) / 2
    if (preview && design.product === 'hang_tag') y += u * 3
    if (design.logo) {
      const lw = Math.min(maxW * 0.5, logoH * (design.logo.width / design.logo.height))
      const lh2 = lw * (design.logo.height / design.logo.width)
      ctx.drawImage(design.logo, left ? pad : w / 2 - lw / 2, y + (logoH - lh2) / 2, lw, lh2)
      y += logoH + u * 5
    }
    if (st.id === 'orange') {
      ctx.font = `${big.weight} ${size}px ${big.family}`
      const tw = ctx.measureText(lines[0]).width
      ctx.strokeStyle = st.ink
      ctx.lineWidth = Math.max(2, u * 0.9)
      ctx.strokeRect(w / 2 - tw / 2 - size * 0.45, y - size * 0.32, tw + size * 0.9, size * 1.6)
      y += size * 0.12
    }
    y += drawLines(ctx, lines, big, size, x, y, align, st.ink)
    if (st.id === 'orange') y += size * 0.3
    extra.forEach((t, i) => drawLines(ctx, [t], small, smallSize, x, y + u * 3 + i * smallSize * 1.6, align, st.ink))
  }

  if (preview && design.product === 'hang_tag') {
    // The punched hole and a hint of string, for the preview only.
    ctx.fillStyle = '#E9E7E2'
    ctx.beginPath(); ctx.arc(w / 2, u * 9, u * 4, 0, Math.PI * 2); ctx.fill()
  }
}

// The full-size print file as a PNG File, ready to upload.
export async function printFile(design) {
  await loadTemplateFonts()
  const { w, h } = PRINT_SIZE[design.product]
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  renderDesign(canvas, design)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  const safe = (design.brandName || 'brand').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return new File([blob], `${safe}-${design.product}-${design.style}.png`, { type: 'image/png' })
}
