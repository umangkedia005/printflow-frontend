// What printing one side costs (DTF), the same formula the backend charges:
//   base per printed side + rate x printed area (square inches), to the rupee.
// Each catalogue print area carries its rates (price_base / price_rate), set
// in Admin → Settings or overridden per area.
const r2 = n => Math.round(n * 100) / 100

export function areaRates(area) {
  return {
    base: Number(area?.price_base ?? area?.print_base ?? 47),
    rate: Number(area?.price_rate ?? area?.print_rate ?? 0.45),
  }
}

export function sidePrice(area, widthIn, heightIn) {
  const w = r2(Number(widthIn) || 0), h = r2(Number(heightIn) || 0)
  if (w <= 0 || h <= 0) return 0
  const { base, rate } = areaRates(area)
  return Math.round(base + rate * w * h)
}
