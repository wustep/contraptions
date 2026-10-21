import { clamp01, line, noise1, poly, smooth, smoother, type Brush, type Pt } from '../../paint'
import { LIFT_BEATS, RIG, W, XH, harvesterAt, heave } from './plan'

/**
 * The machines: the harvester, the carryall over it, the cables between them, and the harvester's plume.
 *
 * The harvester is a long crawler of dark iron on four tracks, its scoop down at its west end, its stack at the east,
 * a superstructure over the hull; lit from the east, so its east faces are a shade paler. The carryall is a long frame
 * with an engine at each end and its cockpit forward, hanging in the sky until it is called. Their one job each: the
 * harvester is the Harkonnen machine the desert takes; the carryall comes for it and cannot save it.
 */

const IRON = '#3C332C'
const IRON_LIT = '#5A4C40'
const IRON_DARK = '#231C17'
const SPICE = '#C4683A'

/** The harvester at `t`, drawn about its middle, its tracks' foot at its y. */
export function paintHarvester(b: Brush, t: number): void {
  const { ctx } = b
  const { x, y, tilt } = harvesterAt(t)
  const L = RIG.len / 2
  const H = RIG.h
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  // The scoop: a boom down from the hull's west end to the sand, while it works.
  const working = 1 - smooth(t, W.lock - 2, W.lock + 1)
  const scoop: Pt[] = [[-L + 0.6, -2.2], [-L - 2.6 * working - 0.8, -0.2 - 0.8 * (1 - working)], [-L - 1.6 * working - 0.4, -0.2 - 0.8 * (1 - working)], [-L + 1.2, -3.2]]
  poly(ctx, scoop)
  ctx.fillStyle = b.c(IRON_DARK)
  ctx.fill()
  // The hull and the superstructure.
  poly(ctx, [[-L, -1.6], [-L + 0.4, -3.9], [-L + 1.6, -4.3], [L - 0.6, -4.3], [L, -3.6], [L, -1.6]])
  ctx.fillStyle = b.c(IRON)
  ctx.fill()
  poly(ctx, [[-L + 3.2, -4.3], [-L + 4.6, -H], [L - 3.2, -H], [L - 1.6, -4.3]])
  ctx.fillStyle = b.c(IRON)
  ctx.fill()
  // The east faces, where the sun is.
  poly(ctx, [[L - 0.6, -4.3], [L, -3.6], [L, -1.6], [L - 0.55, -1.6]])
  ctx.fillStyle = b.c(IRON_LIT)
  ctx.fill()
  poly(ctx, [[L - 3.2, -H], [L - 1.6, -4.3], [L - 2.2, -4.3], [L - 3.5, -H + 0.25]])
  ctx.fillStyle = b.c(IRON_LIT)
  ctx.fill()
  // A band of windows along the superstructure, dark; and the stack.
  poly(ctx, [[-L + 5.0, -H + 0.9], [L - 4.0, -H + 0.9], [L - 4.0, -H + 1.35], [-L + 5.0, -H + 1.35]])
  ctx.fillStyle = b.c(IRON_DARK)
  ctx.fill()
  poly(ctx, [[L - 5.6, -H], [L - 5.4, -H - 1.9], [L - 4.3, -H - 1.9], [L - 4.1, -H]])
  ctx.fillStyle = b.c(IRON_DARK)
  ctx.fill()
  // The tracks: four units, their pads going round while it crawls.
  const crawl = 0.08 * Math.min(t, W.lock)
  for (let i = 0; i < 4; i++) {
    const x0 = -L + 0.3 + i * (2 * L - 0.6) / 4
    const w = (2 * L - 0.6) / 4 - 0.35
    poly(ctx, [[x0 + 0.3, 0], [x0 + w - 0.3, 0], [x0 + w, -0.8], [x0 + w - 0.2, -1.6], [x0 + 0.2, -1.6], [x0, -0.8]])
    ctx.fillStyle = b.c(IRON_DARK)
    ctx.fill()
    ctx.beginPath()
    const pad = 0.55
    const off = (crawl % pad) / pad
    for (let k = -1; k < w / pad + 1; k++) {
      const px = x0 + (k + off) * pad
      if (px < x0 + 0.15 || px > x0 + w - 0.15) continue
      ctx.moveTo(px, -0.05)
      ctx.lineTo(px, -0.35)
    }
    ctx.strokeStyle = b.c(IRON_LIT)
    ctx.lineWidth = Math.max(1.25 * b.px, 0.06)
    ctx.stroke()
  }
  ctx.restore()
}

/** Where the stack's mouth is at `t`, in the world. */
function stackAt(t: number): Pt {
  const { x, y, tilt } = harvesterAt(t)
  const lx = RIG.len / 2 - 4.85
  const ly = -RIG.h - 1.9
  return [x + lx * Math.cos(tilt) - ly * Math.sin(tilt), y + lx * Math.sin(tilt) + ly * Math.cos(tilt)]
}

/**
 * The plume: spice dust out of the stack, going up and leaning away west on the wind, widening as it goes, its far end
 * thinning into the sky. One ribbon, its edges moving slowly; it stops when the machine is held, and what is up drifts
 * on and thins.
 */
export function paintPlume(b: Brush, t: number): void {
  const { ctx } = b
  const on = 1 - smooth(t, W.lock, W.lock + 6)
  const left = 1 - smooth(t, W.lock + 2, W.sink + 6)
  if (left <= 0.002) return
  const [sx, sy] = stackAt(Math.min(t, W.lock))
  const drift = Math.max(0, t - W.lock) * 1.6
  const n = 26
  const len = 34
  const edge = (side: number): Pt[] => {
    const pts: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const s = i / n
      // The column rises, then bends over west on the wind.
      const cx = sx - len * 1.05 * Math.pow(s, 1.5) - drift
      const cy = sy - len * 0.62 * Math.pow(s, 0.75) - drift * 0.15
      const w = 0.55 + 4.6 * Math.pow(s, 1.1)
      const wob = 0.45 * w * noise1(s * 3 - t * 0.35, side > 0 ? 3 : 7)
      // Torn from the stack's end once it stops: the near end goes up after the rest.
      const gone = (1 - on) * clamp01(1 - s * 1.4)
      pts.push([cx + side * (w + wob) * 0.35, cy + side * (w + wob) * 0.9 - gone * 6])
    }
    return pts
  }
  const top = edge(-1)
  const bot = edge(1)
  for (const [k, a, wide] of [[0, 0.32, 1.0], [1, 0.42, 0.55]] as [number, number, number][]) {
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const mx = (top[i][0] + bot[i][0]) / 2
      const my = (top[i][1] + bot[i][1]) / 2
      const px = mx + (top[i][0] - mx) * wide
      const py = my + (top[i][1] - my) * wide
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    for (let i = n; i >= 0; i--) {
      const mx = (top[i][0] + bot[i][0]) / 2
      const my = (top[i][1] + bot[i][1]) / 2
      ctx.lineTo(mx + (bot[i][0] - mx) * wide, my + (bot[i][1] - my) * wide)
    }
    ctx.closePath()
    const gr = ctx.createLinearGradient(sx, sy, sx - len * 1.05 - drift, sy - len * 0.62)
    gr.addColorStop(0, b.ca(SPICE, a * left * (k ? on * 0.8 + 0.2 : 1)))
    gr.addColorStop(0.55, b.ca(SPICE, a * 0.75 * left))
    gr.addColorStop(1, b.ca(SPICE, 0))
    ctx.fillStyle = gr
    ctx.fill()
  }
}

/** The carryall: where its middle is at `t`. Hanging high and turning slowly; down to the machine on the alarm. */
export function carryallAt(t: number): { x: number; y: number; a: number } {
  const idle: Pt = [XH + 30 + 7 * Math.sin(t * 0.11), -42 + 1.2 * Math.sin(t * 0.27)]
  const over: Pt = [XH + 0.4, -17]
  const down = smoother(t, W.alarm, W.lock - 1.5)
  let x = idle[0] + (over[0] - idle[0]) * down
  let y = idle[1] + (over[1] - idle[1]) * down
  // Held: it strains up a little on each beat of the drum, and is dragged down as the sand goes.
  for (const at of LIFT_BEATS) y -= 0.35 * heave(t, at)
  y += 2.2 * smooth(t, W.sink, W.maw)
  // Let go: it springs up and away west, banking.
  const free = Math.max(0, t - W.maw)
  x -= free * free * 0.55
  y -= free * 3.2 + free * free * 0.35
  const a = -0.18 * smooth(t, W.maw, W.maw + 2.5) + 0.04 * Math.sin(t * 0.3) * (1 - down)
  return { x, y, a }
}

export function paintCarryall(b: Brush, t: number): void {
  const { ctx } = b
  const { x, y, a } = carryallAt(t)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  const dark = b.c('#2A2522')
  const mid = b.c('#3E3631')
  // The spine, the cockpit forward (west), the two engines slung at its ends.
  poly(ctx, [[-7.2, -0.3], [-6.4, -0.9], [6.6, -0.9], [7.4, -0.3], [6.6, 0.35], [-6.4, 0.35]])
  ctx.fillStyle = mid
  ctx.fill()
  poly(ctx, [[-8.6, -0.1], [-7.6, -1.0], [-6.2, -1.1], [-6.0, 0.3], [-7.6, 0.4]])
  ctx.fillStyle = dark
  ctx.fill()
  for (const ex of [-4.6, 4.6]) {
    poly(ctx, [[ex - 1.5, 0.2], [ex + 1.5, 0.2], [ex + 1.7, 1.1], [ex - 1.7, 1.1]])
    ctx.fillStyle = dark
    ctx.fill()
    line(b, [ex, 0.35], [ex, -0.9], '#2A2522', 0.18)
  }
  // Its wings, thin and long, seen nearly edge on.
  poly(ctx, [[-2.5, -0.95], [3.5, -0.95], [5.8, -1.35], [-1.2, -1.3]])
  ctx.fillStyle = mid
  ctx.fill()
  ctx.restore()
}

/**
 * The cables: let down from the carryall's belly on the alarm, taut from the lock, and slack when it lets go, falling
 * away with the machine.
 */
export function paintCables(b: Brush, t: number): void {
  if (t < W.alarm + 1.5 || t > W.maw + 2.2) return
  // Parted, they fall slack into the mouth with the machine and are lost in it.
  const seen = 1 - smooth(t, W.maw + 0.6, W.maw + 2.2)
  const c = carryallAt(t)
  const h = harvesterAt(t)
  const ends: [Pt, Pt][] = [-4.6, 4.6].map((ex, i) => {
    const ca = Math.cos(c.a)
    const sa = Math.sin(c.a)
    const top: Pt = [c.x + ex * ca - 1.1 * sa, c.y + ex * sa + 1.1 * ca]
    const hx = (i ? 1 : -1) * 5.6
    const hy = -RIG.h
    const bottom: Pt = [h.x + hx * Math.cos(h.tilt) - hy * Math.sin(h.tilt), h.y + hx * Math.sin(h.tilt) + hy * Math.cos(h.tilt)]
    return [top, bottom]
  })
  const lowered = smoother(t, W.alarm + 1.5, W.lock)
  const parted = t > W.maw
  for (const [top, bottom] of ends) {
    // While being let down, the cable hangs from the belly to its hook, short of the machine.
    let end: Pt = [top[0] + (bottom[0] - top[0]) * lowered, top[1] + (bottom[1] - top[1]) * lowered]
    let from = top
    if (parted) {
      // Parted at the belly: the cable stays hooked to the machine and its free end falls after it.
      const s = t - W.maw
      from = [top[0] + (bottom[0] - top[0]) * clamp01(s * 0.5) + s * 0.8, top[1] + 7 * s * s * 0.5]
      end = bottom
      if (from[1] > end[1]) from = [end[0], end[1] - 0.3]
    }
    // A taut cable is straight; a let-down or parted one sags.
    const sag = parted ? 1.6 : 0.35 * (1 - smooth(t, W.lock - 0.5, W.lock + 0.3)) + 0.04
    const mid: Pt = [(from[0] + end[0]) / 2 + sag * 0.6, (from[1] + end[1]) / 2 + sag]
    b.ctx.beginPath()
    b.ctx.moveTo(from[0], from[1])
    b.ctx.quadraticCurveTo(mid[0], mid[1], end[0], end[1])
    b.ctx.strokeStyle = b.ca('#1F1A17', seen)
    b.ctx.lineWidth = Math.max(1.25 * b.px, 0.09)
    b.ctx.stroke()
  }
}
