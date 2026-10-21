import { clamp01, hash, mix, type Brush, type Pt } from '../paint'

/**
 * Shai-Hulud, the maker: one animal, drawn the same wherever it is (the harvester's mouth, the ride, the charge).
 *
 * Seen from the side its body is a great tube along a spine, its skin the grey-ochre of old stone, ringed with plates
 * that overlap like armour. The light is from above, so its back is paler than its belly. Each ring is a band across the
 * tube, bowed as a ring on a tube is seen; between two rings a dark seam, the gap a hook goes into. A ring's place along
 * the body is fixed to the body, so as the worm moves the rings move with it.
 *
 * Seen end on, its mouth: a round maw, a lip of plates round it, rings of fine teeth going down into the dark.
 *
 * Sizes are in cells (a cell is about seven metres): a ridden worm is 7 to 9 cells through, a harvester's worm more.
 */

export const SKIN = { back: '#8B7763', side: '#6F5D4C', belly: '#4A3D33', seam: '#2B221C', plate: '#9A8670', flesh: '#C57E68', throat: '#1A120E' }

export interface Body {
  /** The spine, head first, in cells, sampled finely enough to bend smoothly (a point every half cell or so). */
  spine: Pt[]
  /** The tube's radius at each spine point. */
  radius: number[]
  /**
   * How far along the body its rings have moved past the spine's first point, cells: the worm's own travel, so the rings
   * stay on the body as the spine slides through the sand. Rings are every `ring` cells of body.
   */
  travel: number
  ring?: number
  /** How far it has rolled, radians: the seams' shading turns with it (0 upright). */
  roll?: number
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const norm = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}

/** Arc length along the spine to each point. */
function lengths(spine: Pt[]): number[] {
  const out = [0]
  for (let i = 1; i < spine.length; i++) out.push(out[i - 1] + Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]))
  return out
}

/** The normal at each spine point, turned so it points up the screen (the worm's back). */
function normals(spine: Pt[]): Pt[] {
  return spine.map((_, i) => {
    const a = spine[Math.max(0, i - 1)]
    const b = spine[Math.min(spine.length - 1, i + 1)]
    const [tx, ty] = norm(sub(b, a))
    let n: Pt = [ty, -tx]
    if (n[1] > 0) n = [-n[0], -n[1]]
    return n
  })
}

/** The body from the side: skin, back, belly, and the rings with their seams. */
export function paintBody(b: Brush, w: Body): void {
  const { ctx } = b
  const n = w.spine.length
  if (n < 2) return
  const N = normals(w.spine)
  const top: Pt[] = w.spine.map((p, i) => [p[0] + N[i][0] * w.radius[i], p[1] + N[i][1] * w.radius[i]])
  const bot: Pt[] = w.spine.map((p, i) => [p[0] - N[i][0] * w.radius[i], p[1] - N[i][1] * w.radius[i]])
  const outline = () => {
    ctx.beginPath()
    ctx.moveTo(top[0][0], top[0][1])
    for (let i = 1; i < n; i++) ctx.lineTo(top[i][0], top[i][1])
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1])
    ctx.closePath()
  }
  // The side, then the back's pale band and the belly's dark one, each a strip along the spine.
  outline()
  ctx.fillStyle = b.c(SKIN.side)
  ctx.fill()
  const band = (from: number, to: number, color: string) => {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const r = w.radius[i]
      const x = w.spine[i][0] + N[i][0] * r * from
      const y = w.spine[i][1] + N[i][1] * r * from
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    for (let i = n - 1; i >= 0; i--) {
      const r = w.radius[i]
      ctx.lineTo(w.spine[i][0] + N[i][0] * r * to, w.spine[i][1] + N[i][1] * r * to)
    }
    ctx.closePath()
    ctx.fillStyle = b.c(color)
    ctx.fill()
  }
  band(0.35, 1, SKIN.back)
  band(-1, -0.55, SKIN.belly)
  // The rings: every `ring` cells of body, from the travel, a bowed band with a dark seam on its trailing edge.
  const L = lengths(w.spine)
  const ring = w.ring ?? 2.2
  const k0 = Math.ceil((w.travel - L[n - 1]) / ring)
  const k1 = Math.floor(w.travel / ring)
  let j = 0
  for (let kk = k1; kk >= k0; kk--) {
    const s = w.travel - kk * ring
    while (j < n - 2 && L[j + 1] < s) j++
    const f = clamp01((s - L[j]) / Math.max(1e-6, L[j + 1] - L[j]))
    const p: Pt = [w.spine[j][0] + (w.spine[j + 1][0] - w.spine[j][0]) * f, w.spine[j][1] + (w.spine[j + 1][1] - w.spine[j][1]) * f]
    const r = w.radius[j] + (w.radius[j + 1] - w.radius[j]) * f
    const nn = N[j]
    const tng = norm(sub(w.spine[j + 1], w.spine[j]))
    // A ring on a tube seen from the side bows toward the head; how much, with the tube's turn toward us.
    const bow = r * 0.22
    const a: Pt = [p[0] + nn[0] * r, p[1] + nn[1] * r]
    const c: Pt = [p[0] - nn[0] * r, p[1] - nn[1] * r]
    const mid: Pt = [p[0] - tng[0] * bow, p[1] - tng[1] * bow]
    const plateW = ring * 0.42
    // The plate: a paler band just behind the seam.
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.quadraticCurveTo(mid[0] * 2 - (a[0] + c[0]) / 2, mid[1] * 2 - (a[1] + c[1]) / 2, c[0], c[1])
    ctx.lineTo(c[0] + tng[0] * plateW, c[1] + tng[1] * plateW)
    ctx.quadraticCurveTo(mid[0] * 2 - (a[0] + c[0]) / 2 + tng[0] * plateW, mid[1] * 2 - (a[1] + c[1]) / 2 + tng[1] * plateW, a[0] + tng[0] * plateW, a[1] + tng[1] * plateW)
    ctx.closePath()
    const shade = 0.12 + 0.1 * hash(kk, 3)
    ctx.fillStyle = b.ca(mix(SKIN.plate, SKIN.side, shade), 0.32)
    ctx.fill()
    // The seam.
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.quadraticCurveTo(mid[0] * 2 - (a[0] + c[0]) / 2, mid[1] * 2 - (a[1] + c[1]) / 2, c[0], c[1])
    ctx.strokeStyle = b.ca(SKIN.seam, 0.7)
    ctx.lineWidth = Math.max(1.25 * b.px, r * 0.026)
    ctx.stroke()
  }
}

/**
 * The mouth, end on: centre `x, y`, radius `r`, squashed to `tilt` (1 seen straight down its throat, toward 0 seen
 * edge on). `open` 0 to 1 opens the lip back from the teeth. Drawn as rings of plates, then the teeth going down into the
 * dark, then the throat.
 */
export function paintMouth(b: Brush, x: number, y: number, r: number, tilt: number, open = 1): void {
  const { ctx } = b
  const ry = Math.max(0.05, tilt)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry)
  // The lip.
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.plate)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.side)
  ctx.fill()
  // The throat, and the teeth in rings round it.
  const inner = r * (0.86 - 0.12 * (1 - open))
  ctx.beginPath()
  ctx.arc(0, 0, inner, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.flesh)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, inner * 0.78, 0, Math.PI * 2)
  ctx.fillStyle = b.c(mix(SKIN.flesh, SKIN.throat, 0.55))
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, inner * 0.5, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.throat)
  ctx.fill()
  const teeth = 48
  ctx.strokeStyle = b.c('#E7DAC6')
  ctx.lineWidth = Math.max(1.25 * b.px, r * 0.012)
  ctx.beginPath()
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2 + hash(i, 5) * 0.03
    const r0 = inner * (0.97 - 0.05 * hash(i, 6))
    const r1 = inner * (0.66 + 0.06 * hash(i, 7))
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
  }
  ctx.stroke()
  ctx.restore()
}
