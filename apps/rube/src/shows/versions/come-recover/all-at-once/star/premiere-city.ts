import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex, type Pt } from '../../../../../parts'
import { depth, hash, smooth, type Ctx, type Frame } from '../kit'
import { STAR } from '../worlds'
import { DROP, EDGE_X, LANDING, NOSING, TERRACE_R, TOUCH, alleyTime } from './premiere-clock'
import { INK, NIGHT, WALL, rgba, smear } from './premiere-light'

/**
 * The city round the alley, at its own depths: what the alley's walls stand in front of, and what stands in front of
 * them.
 *
 * The alley's back wall is two buildings. Over the steps a tall one, its fire escape going up out of sight; then the
 * laundromat, one storey, its roof just over its window, ending in a corner short of the lower lane. Over the
 * laundromat's roof is the night: a rain sky lit from under by the city, low cloud going over, and the city in two
 * depths (far towers in the haze, and nearer roofs with a water tank and a chimney). Past its corner the lower lane
 * opens deep: a tenement across the way with a fire escape and washing on it, lit rooms, a shop's shutter half up on
 * warm light, a sign of red glass tube, and the city again beyond. Each depth moves with the camera at its own pace
 * (`depth` in the kit), so the alley is a place in a city, not a flat.
 *
 * In front of all of it, nearer the lens than the alley: a line of washing across the top of the wide shot, a bin on
 * the lower lane, and a nearer, sparser rain.
 *
 * Everything here keeps the alley's own clock (`alleyTime`): when time slows round the two of them, the cloud, the
 * washing and the steam slow with it.
 */

/** The tall building over the steps ends here, and the laundromat begins. */
export const JOINT = 24.75
/** The laundromat's roof (the top of its parapet), and its corner short of the lower lane. */
export const ROOF = LANDING - 4.15
export const CORNER = TERRACE_R + 0.72
/** The lower lane past the terrace. */
const LOWER = LANDING + 3.3

/** Where the skyline layers sit as drawn: the camera's centre in the wide shot (71 s). The lane's: in the descent. */
const SKY_REF: Pt = [24.4, 0.8]
const LANE_REF: Pt = [28.5, 4.3]

/* ------------------------------------------------------------------ paints */

/** The rain sky: deep blue up high, and low down a haze the city's sodium light paints from under. */
const SKY_HIGH = mixHex(NIGHT, STAR.wet, 0.62)
const SKY_LOW = mixHex(mixHex(mixHex(NIGHT, STAR.wet, 0.9), STAR.rain, 0.16), mixHex(STAR.gold, STAR.neonPink, 0.35), 0.22)
const CLOUD = mixHex(NIGHT, STAR.wet, 0.78)
const CLOUD_LIT = mixHex(CLOUD, mixHex(STAR.gold, STAR.neonPink, 0.4), 0.3)
/** Far towers, veiled by the rain's haze; nearer roofs, darker; the tenement across the lane, nearer still. */
const FAR = mixHex(SKY_LOW, NIGHT, 0.42)
const MID = mixHex(NIGHT, STAR.wet, 0.5)
const MID_EDGE = mixHex(MID, STAR.rain, 0.22)
const TENEMENT = mixHex(mixHex(WALL, NIGHT, 0.22), mixHex(STAR.carpetDeep, NIGHT, 0.4), 0.18)
const TENEMENT_DEEP = mixHex(TENEMENT, NIGHT, 0.35)
const IRON_FAR = mixHex(NIGHT, STAR.wet, 0.32)
/** Lit rooms: lamp-warm, and here and there the blue of a set left on. */
const ROOM_WARM = mixHex(STAR.gold, STAR.spot, 0.45)
const ROOM_TV = mixHex(STAR.neonTeal, STAR.rain, 0.55)
const NEAR = mixHex(NIGHT, STAR.wet, 0.22)

/* ------------------------------------------------------------------ the layers, back to front */

/** The sky over the roofs: its gradient, and low cloud going over on the wind, lit from below. */
function sky(p: p5, k: number, tau: number): void {
  depth(p, k, 0.08, SKY_REF, (f) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, -5 * k, 0, 1.5 * k)
    g.addColorStop(0, SKY_HIGH)
    g.addColorStop(1, SKY_LOW)
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    // Three banks of cloud, long and low, each going over at its own pace, wrapping round a span wider than any frame.
    p.noStroke()
    for (let b = 0; b < 3; b++) {
      const y = -2.45 + 0.42 * b
      const span = 26
      const drift = tau * (0.05 + 0.025 * b)
      for (let i = 0; i < 5; i++) {
        const base = 14 + i * (span / 5) + 2.1 * hash(i, b, 5)
        const x = ((((base + drift - 14) % span) + span) % span) + 14
        if (x + 3 < f.x0 || x - 3 > f.x1) continue
        const w = 2.6 + 1.4 * hash(i, b, 6)
        const h = 0.22 + 0.12 * hash(i, b, 7)
        p.fill(rgba(CLOUD, 0.55))
        p.ellipse(x * k, y * k, w * k, h * k)
        p.ellipse((x - w * 0.3) * k, (y + 0.08) * k, w * 0.6 * k, h * 0.8 * k)
        // The underside, lit by the city.
        p.fill(rgba(CLOUD_LIT, 0.35))
        p.ellipse(x * k, (y + h * 0.28) * k, w * 0.86 * k, h * 0.42 * k)
      }
    }
  })
}

/** A window grid on a front from x0 to x1, its top at `top`, down to `bottom`: most dark, some lit, decided by `seed`. */
function windows(p: p5, k: number, x0: number, x1: number, top: number, bottom: number, w: number, h: number, dx: number, dy: number, seed: number, lit: number, dark: string, tau: number): void {
  p.noStroke()
  const cols = Math.max(1, Math.floor((x1 - x0 - 0.1) / dx))
  const pad = (x1 - x0 - (cols - 1) * dx) / 2
  for (let r = 0; top + 0.25 + r * dy < bottom; r++) {
    const y = top + 0.25 + r * dy
    for (let c = 0; c < cols; c++) {
      const x = x0 + pad + c * dx
      const h1 = hash(c, r, seed)
      let on = h1 < lit
      // A few rooms turn their light on or off while she is here, each at its own moment of the alley's slow time.
      const turn = hash(c, r, seed + 1)
      if (turn < 0.06) on = (tau + 40 * turn) % 23 < 15
      if (!on) {
        p.fill(dark)
      } else {
        const tv = hash(c, r, seed + 2) < 0.18
        p.fill(tv ? rgba(ROOM_TV, 0.42 + 0.12 * Math.sin(tau * 9 + c * 3 + r)) : rgba(ROOM_WARM, 0.5 + 0.3 * hash(c, r, seed + 3)))
      }
      p.rect(x * k, y * k, w * k, h * k)
    }
  }
}

/** The far city: towers in the haze, their windows a grain of light, and a mast's red lamp turning over slowly. */
function farCity(p: p5, k: number, tau: number): void {
  depth(p, k, 0.28, SKY_REF, (f) => {
    if (f.y0 > -0.4) return
    const dark = mixHex(FAR, NIGHT, 0.18)
    let x = 13
    for (let i = 0; x < 42; i++) {
      const w = 0.7 + 1.0 * hash(i, 1, 81)
      const roof = -1.0 - 1.4 * hash(i, 2, 81) * hash(i, 5, 81) - 0.35 * hash(i, 6, 81)
      if (x + w > f.x0 - 0.5 && x < f.x1 + 0.5) {
        p.noStroke()
        p.fill(FAR)
        p.rect((x + w / 2) * k, ((roof + 3) / 2) * k, w * k, (3 - roof) * k)
        // A setback on some, or a spire.
        if (hash(i, 3, 81) < 0.35) p.rect((x + w / 2) * k, (roof - 0.18) * k, w * 0.55 * k, 0.36 * k)
        else if (hash(i, 3, 81) < 0.45) p.rect((x + w / 2) * k, (roof - 0.5) * k, 0.05 * k, 1.0 * k)
        windows(p, k, x + 0.08, x + w - 0.08, roof, 2.2, 0.07, 0.09, 0.2, 0.26, 90 + i, 0.16, dark, tau)
      }
      x += w + 0.25 + 0.7 * hash(i, 4, 81)
    }
    // The mast on the tallest roof in the wide shot's sky: its lamp comes up and goes down, slow, as such lamps do.
    const mx = 28.6
    const my = -3.55
    if (mx > f.x0 && mx < f.x1) {
      p.fill(FAR)
      p.rect(mx * k, (my + 0.9) * k, 1.3 * k, 1.8 * k)
      p.stroke(FAR)
      p.strokeWeight(Math.max(1, 0.035 * k))
      p.line(mx * k, my * k, mx * k, (my - 1.1) * k)
      p.noStroke()
      const beat = 0.5 + 0.5 * Math.cos(tau * 2.4)
      p.fill(rgba(mixHex(STAR.carpet, STAR.neonPink, 0.3), 0.25 + 0.6 * beat * beat))
      p.circle(mx * k, (my - 1.12) * k, 0.07 * k)
    }
  })
}

/** Nearer roofs over the laundromat: a water tank on its stand, a stair's bulkhead, a chimney's thin smoke. */
function midRoofs(p: p5, k: number, weight: number, tau: number): void {
  depth(p, k, 0.55, SKY_REF, (f) => {
    if (f.y0 > ROOF) return
    const ink = rgba(INK, 0.18)
    const w = weight * 0.5
    // The block behind the laundromat, in steps.
    const blocks: [number, number, number][] = [
      [24.2, 26.1, -1.18],
      [26.1, 27.4, -1.02],
      [27.4, 30.6, -1.3],
      [30.6, 33.5, -1.12],
    ]
    for (const [a, b, top] of blocks) {
      if (b < f.x0 - 0.5 || a > f.x1 + 0.5) continue
      solid(p, ink, w, MID)
      p.rect(((a + b) / 2) * k, ((top + 1.5) / 2) * k, (b - a) * k, (1.5 - top) * k)
      p.noStroke()
      p.fill(MID_EDGE)
      p.rect(((a + b) / 2) * k, (top + 0.03) * k, (b - a) * k, 0.06 * k)
      windows(p, k, a + 0.15, b - 0.15, top + 0.05, 1.2, 0.16, 0.2, 0.42, 0.52, 120 + Math.round(a * 10), 0.24, mixHex(MID, NIGHT, 0.25), tau)
    }
    // The water tank: staves and hoops on a stand of legs, a conical lid.
    const tx = 28.35
    const tb = -1.3
    solid(p, ink, w, mixHex(MID, STAR.carpetDeep, 0.12))
    for (const lx of [-0.32, 0, 0.32]) p.rect((tx + lx) * k, (tb - 0.22) * k, 0.05 * k, 0.44 * k)
    p.rect(tx * k, (tb - 0.44) * k, 0.86 * k, 0.05 * k)
    p.rect(tx * k, (tb - 0.84) * k, 0.76 * k, 0.76 * k, 0.04 * k)
    p.triangle((tx - 0.44) * k, (tb - 1.2) * k, (tx + 0.44) * k, (tb - 1.2) * k, tx * k, (tb - 1.5) * k)
    outline(p, ink, w)
    for (const hy of [-0.6, -0.84, -1.08]) p.line((tx - 0.38) * k, (tb + hy) * k, (tx + 0.38) * k, (tb + hy) * k)
    // A stair's bulkhead, its door lit at the crack; and a chimney with its smoke going off on the wind.
    solid(p, ink, w, MID)
    p.rect(25.3 * k, -1.4 * k, 0.7 * k, 0.5 * k)
    p.noStroke()
    p.fill(rgba(ROOM_WARM, 0.55))
    p.rect(25.45 * k, -1.33 * k, 0.04 * k, 0.3 * k)
    solid(p, ink, w, mixHex(MID, STAR.carpetDeep, 0.2))
    p.rect(31.9 * k, -1.4 * k, 0.26 * k, 0.7 * k)
    p.noStroke()
    for (let i = 0; i < 6; i++) {
      const u = ((tau * 0.22 + i / 6) % 1 + 1) % 1
      p.fill(rgba(mixHex(CLOUD, STAR.rain, 0.25), 0.3 * (1 - u)))
      p.ellipse((31.9 + 0.9 * u + 0.08 * Math.sin(tau + i)) * k, (-1.8 - 0.8 * u) * k, (0.16 + 0.4 * u) * k, (0.12 + 0.22 * u) * k)
    }
  })
}

/**
 * Past the laundromat's corner, across the lower lane: a tenement with a fire escape and washing out on it, rooms lit
 * and dark, a shop at its foot with its shutter half up on warm light, and a sign of red glass tube on a bracket. Behind
 * it the city goes on.
 */
const TEN = { x0: CORNER - 0.6, x1: CORNER + 4.2, roof: -1.45, floors: [0.15, 1.35, 2.55, 3.75] }
const SIGN = { x: TEN.x1 - 0.65, y0: 2.0, y1: 4.25 }
/** When the room over the shop puts its light on (just after the two of them touch, unseen), and out after she is gone. */
const ROOM_ON = TOUCH + 0.6
const ROOM_OFF = DROP + 2.4

function laneView(p: p5, k: number, weight: number, t: number, tau: number): void {
  // A second, further row of fronts down the lane, half as near.
  depth(p, k, 0.5, LANE_REF, (f) => {
    if (f.x1 < CORNER - 1.5) return
    const fronts: [number, number, number][] = [
      [CORNER + 2.4, CORNER + 4.3, -2.2],
      [CORNER + 4.3, CORNER + 6.6, -1.2],
      [CORNER + 6.6, CORNER + 8.4, -2.6],
      [CORNER + 8.4, CORNER + 11, -1.8],
    ]
    for (const [a, b, top] of fronts) {
      if (b < f.x0 || a > f.x1) continue
      solid(p, rgba(INK, 0.15), weight * 0.5, mixHex(MID, SKY_LOW, 0.2))
      p.rect(((a + b) / 2) * k, ((top + LOWER + 1) / 2) * k, (b - a) * k, (LOWER + 1 - top) * k)
      windows(p, k, a + 0.15, b - 0.15, top, LOWER - 0.6, 0.2, 0.26, 0.48, 0.62, 150 + Math.round(a * 7), 0.3, mixHex(MID, NIGHT, 0.2), tau)
    }
    // A street lamp further down the lane, and its pool on the wet.
    const lx = CORNER + 5.2
    p.stroke(IRON_FAR)
    p.strokeWeight(Math.max(1, 0.06 * k))
    p.line(lx * k, (LOWER - 3.2) * k, lx * k, LOWER * k)
    p.line(lx * k, (LOWER - 3.2) * k, (lx - 0.4) * k, (LOWER - 3.3) * k)
    p.noStroke()
    p.fill(STAR.spot)
    p.ellipse((lx - 0.42) * k, (LOWER - 3.22) * k, 0.18 * k, 0.08 * k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, (LOWER - 3.2) * k, 0, LOWER * k)
    g.addColorStop(0, rgba(STAR.spot, 0.16))
    g.addColorStop(1, rgba(STAR.spot, 0.04))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((lx - 0.5) * k, (LOWER - 3.18) * k)
    ctx.lineTo((lx - 0.34) * k, (LOWER - 3.18) * k)
    ctx.lineTo((lx + 0.5) * k, LOWER * k)
    ctx.lineTo((lx - 1.3) * k, LOWER * k)
    ctx.closePath()
    ctx.fill()
  })

  // The tenement across the lane.
  depth(p, k, 0.78, LANE_REF, (f) => {
    if (f.x1 < TEN.x0 || f.x0 > TEN.x1 + 0.5) return
    const ink = rgba(INK, 0.28)
    const w = weight * 0.6
    const cx = (TEN.x0 + TEN.x1) / 2
    solid(p, ink, w, TENEMENT)
    p.rect(cx * k, ((TEN.roof + LOWER + 1) / 2) * k, (TEN.x1 - TEN.x0) * k, (LOWER + 1 - TEN.roof) * k)
    // Its cornice, and a course at each floor.
    solid(p, ink, w, mixHex(TENEMENT, STAR.rain, 0.18))
    p.rect(cx * k, (TEN.roof + 0.06) * k, (TEN.x1 - TEN.x0 + 0.2) * k, 0.14 * k)
    p.stroke(rgba(INK, 0.1))
    p.strokeWeight(Math.max(1, w))
    for (const fy of TEN.floors) p.line(TEN.x0 * k, (fy + 0.05) * k, TEN.x1 * k, (fy + 0.05) * k)
    // Rooms: two to a floor either side of the fire escape's windows, each with its sill; some lit with a curtain half
    // drawn, the one over the shop on its own clock.
    const cols = [TEN.x0 + 0.55, TEN.x0 + 1.5, TEN.x0 + 2.75, TEN.x0 + 3.75]
    TEN.floors.concat([-0.95]).forEach((fy, r) => {
      cols.forEach((wx, c) => {
        const wy = fy - 0.5
        let on = hash(c, r, 211) < 0.6
        if (r === 3 && c === 2) on = t >= ROOM_ON && t < ROOM_OFF
        p.noStroke()
        p.fill(on ? rgba(ROOM_WARM, 0.78) : TENEMENT_DEEP)
        p.rect(wx * k, wy * k, 0.46 * k, 0.6 * k)
        if (on) {
          // The curtain, and a shade of someone's room behind it.
          p.fill(rgba(mixHex(STAR.carpet, ROOM_WARM, 0.35), 0.75))
          const side = hash(c, r, 212) < 0.5 ? -1 : 1
          p.rect((wx + side * 0.13) * k, wy * k, 0.2 * k, 0.6 * k)
          // At one, someone stands looking out at the rain, the light behind them, a curl of smoke going up.
          if (r === 2 && c === 3) {
            p.fill(mixHex(TENEMENT_DEEP, NIGHT, 0.45))
            const lean = 0.02 * Math.sin(tau * 0.6)
            p.ellipse((wx - 0.06 + lean) * k, (wy - 0.08) * k, 0.13 * k, 0.15 * k)
            p.rect((wx - 0.06 + lean * 0.5) * k, (wy + 0.15) * k, 0.24 * k, 0.3 * k, 0.08 * k, 0.08 * k, 0, 0)
            for (let j = 0; j < 4; j++) {
              const u = ((tau * 0.35 + j / 4) % 1 + 1) % 1
              p.fill(rgba(STAR.cream, 0.22 * (1 - u)))
              p.circle((wx + 0.08 + 0.05 * Math.sin(tau * 2 + j * 2)) * k, (wy - 0.02 - 0.3 * u) * k, (0.025 + 0.04 * u) * k)
            }
          }
        }
        solid(p, ink, w * 0.7, mixHex(TENEMENT, STAR.rain, 0.12))
        p.rect(wx * k, (wy + 0.33) * k, 0.56 * k, 0.06 * k)
      })
    })
    // The fire escape up its face: a landing at each floor, its rail, and the stair zigzagging between them, in iron.
    const ex0 = TEN.x0 + 1.05
    const ex1 = TEN.x0 + 3.25
    outline(p, rgba(IRON_FAR, 0.95), Math.max(1, 0.03 * k))
    for (let i = 0; i < TEN.floors.length; i++) {
      const fy = TEN.floors[i]
      p.line(ex0 * k, fy * k, ex1 * k, fy * k)
      p.line(ex0 * k, (fy - 0.42) * k, ex1 * k, (fy - 0.42) * k)
      for (let x = ex0; x <= ex1 + 1e-6; x += (ex1 - ex0) / 8) p.line(x * k, (fy - 0.42) * k, x * k, fy * k)
      if (i > 0) {
        const up = TEN.floors[i - 1]
        const a = i % 2 ? ex0 + 0.2 : ex1 - 0.2
        const b = i % 2 ? ex1 - 0.5 : ex0 + 0.5
        p.line(a * k, fy * k, b * k, up * k)
      }
    }
    // Washing out on the fire escape's rail, stirring in the wet air.
    const wash: [number, number, string][] = [
      [ex0 + 0.4, TEN.floors[1], mixHex(STAR.cream, TENEMENT, 0.45)],
      [ex0 + 0.85, TEN.floors[1], mixHex(STAR.carpet, TENEMENT, 0.4)],
      [ex1 - 0.5, TEN.floors[2], mixHex(STAR.rain, TENEMENT, 0.4)],
    ]
    wash.forEach(([wx, fy, col], i) => {
      const sway = 0.06 * Math.sin(tau * 1.1 + i * 1.7)
      p.push()
      p.translate(wx * k, (fy - 0.42) * k)
      p.rotate(sway)
      solid(p, ink, w * 0.6, col)
      p.rect(0, 0.2 * k, 0.3 * k, 0.4 * k, 0.02 * k)
      p.pop()
    })
    // An air conditioner under a lit window, dripping.
    const ax = cols[3]
    const ay = TEN.floors[0] + 0.3
    solid(p, ink, w * 0.7, mixHex(TENEMENT, STAR.rain, 0.25))
    p.rect(ax * k, ay * k, 0.42 * k, 0.26 * k)
    const drip = (tau * 0.9) % 1
    p.noStroke()
    p.fill(rgba(STAR.rain, 0.7 * (1 - drip)))
    p.circle((ax + 0.15) * k, (ay + 0.15 + 2.2 * drip * drip) * k, 0.04 * k)
    // The shop at its foot: a shutter half up, warm light under it, thrown out across the lane's wet.
    const sx = TEN.x0 + 2.2
    const sTop = LOWER - 1.25
    solid(p, ink, w, mixHex(TENEMENT, STAR.gold, 0.12))
    p.rect(sx * k, (sTop - 0.12) * k, 2.2 * k, 0.26 * k)
    p.noStroke()
    p.fill(rgba(ROOM_WARM, 0.36))
    p.rect(sx * k, (sTop + 0.75) * k, 1.9 * k, 1.0 * k)
    // Inside, under the shutter: shelves of jars and tins, and a bare bulb on its flex.
    p.fill(rgba(mixHex(TENEMENT_DEEP, STAR.carpetDeep, 0.3), 0.85))
    for (const sy of [sTop + 0.62, sTop + 0.95]) p.rect(sx * k, sy * k, 1.9 * k, 0.04 * k)
    for (let i = 0; i < 9; i++) {
      const jx = sx - 0.85 + i * 0.21
      const jh = 0.1 + 0.07 * hash(i, 1, 231)
      p.fill(rgba([STAR.carpet, STAR.gold, STAR.cream, STAR.neonTeal][i % 4], 0.35))
      p.rect(jx * k, (sTop + 0.6 - jh / 2) * k, 0.12 * k, jh * k)
      p.fill(rgba([STAR.gold, STAR.carpet, STAR.rain][i % 3], 0.3))
      p.rect((jx + 0.05) * k, (sTop + 0.93 - jh / 2) * k, 0.11 * k, jh * k)
    }
    p.fill(rgba(STAR.spot, 0.9))
    p.circle((sx + 0.4) * k, (sTop + 0.5) * k, 0.07 * k)
    p.fill(mixHex(TENEMENT_DEEP, STAR.rain, 0.12))
    p.rect(sx * k, (sTop + 0.2) * k, 1.9 * k, 0.4 * k)
    p.stroke(rgba(INK, 0.15))
    p.strokeWeight(Math.max(1, w * 0.6))
    for (let y = sTop + 0.06; y < sTop + 0.4; y += 0.08) p.line((sx - 0.95) * k, y * k, (sx + 0.95) * k, y * k)
    // The sign: a bracket off the wall and a tall board of red glass tube, a few strokes of a name, lit and humming.
    const s = SIGN
    solid(p, ink, w, IRON_FAR)
    p.rect((s.x + 0.25) * k, (s.y0 + 0.05) * k, 0.5 * k, 0.05 * k)
    solid(p, ink, w, mixHex(TENEMENT_DEEP, NIGHT, 0.3))
    p.rect(s.x * k, ((s.y0 + s.y1) / 2) * k, 0.48 * k, (s.y1 - s.y0) * k, 0.04 * k)
    const hum = 0.88 + 0.12 * Math.sin(t * 31) * Math.sin(t * 4.1)
    const tube = rgba(mixHex(STAR.carpet, STAR.neonPink, 0.55), 0.85 * hum)
    p.noFill()
    p.stroke(tube)
    p.strokeWeight(Math.max(1, 0.035 * k))
    for (let i = 0; i < 3; i++) {
      const gy = s.y0 + 0.4 + i * 0.68
      p.line((s.x - 0.12) * k, gy * k, (s.x + 0.12) * k, gy * k)
      p.line(s.x * k, (gy - 0.18) * k, s.x * k, (gy + 0.22) * k)
      if (i !== 1) p.line((s.x - 0.12) * k, (gy + 0.16) * k, (s.x + 0.1) * k, (gy + 0.22) * k)
      else p.rect(s.x * k, (gy + 0.1) * k, 0.2 * k, 0.16 * k)
    }
  })
}

/** Draws every layer behind the alley's walls, kept to the alley's side of the theatre's corner. */
export function drawCity(p: p5, c: Ctx, t: number, f: Frame): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = Math.max(EDGE_X + 0.3, f.x0 - 1)
  if (f.x1 < x0) return
  const tau = alleyTime(t)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * c.k, (f.y0 - 1) * c.k, (f.x1 + 1 - x0) * c.k, (f.y1 - f.y0 + 2) * c.k)
  ctx.clip()
  // Only where the walls leave something to see: over the laundromat's roof, or past its corner.
  if (f.y0 < ROOF || f.x1 > CORNER) {
    sky(p, c.k, tau)
    farCity(p, c.k, tau)
    midRoofs(p, c.k, c.weight, tau)
    laneView(p, c.k, c.weight, t, tau)
  }
  ctx.restore()
}

/** The tenement's lights, given back by the lower lane's wet (in the alley's plane, where the lane is). */
export function laneShine(p: p5, c: Ctx, t: number, f: Frame): void {
  if (f.x1 < CORNER || f.y1 < LOWER) return
  const k = c.k
  // Where the layer drew the shop and the sign at this camera (the same shift `depth` gave it).
  const dx = (f.cx - LANE_REF[0]) * (1 - 0.78)
  const sx = TEN.x0 + 2.2 + dx
  smear(p, sx * k, (LOWER + 0.02) * k, 2.0 * k, 0.5 * k, ROOM_WARM, 0.28)
  smear(p, (SIGN.x + dx) * k, (LOWER + 0.02) * k, 0.4 * k, 0.6 * k, mixHex(STAR.carpet, STAR.neonPink, 0.55), 0.3 * (0.88 + 0.12 * Math.sin(t * 31)))
}

/* ------------------------------------------------------------------ on the walls, and the life in the alley */

/** A poster for her picture pasted on the tall building's wall, rain-soaked, a corner come away and stirring. */
const POSTER = { x: 24.22, y: 1.92, w: 0.5, h: 0.72 }

export function poster(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const { x, y, w, h } = POSTER
  const tau = alleyTime(t)
  const faded = (hex: string, u = 0.42) => mixHex(hex, WALL, Math.min(1, u + 0.32))
  // An older bill under it, torn, showing at its edge.
  p.noStroke()
  p.fill(faded(STAR.cream, 0.6))
  p.quad((x - w / 2 - 0.12) * k, (y - h / 2 + 0.2) * k, (x - w / 2 + 0.1) * k, (y - h / 2 + 0.12) * k, (x - w / 2 + 0.05) * k, (y + h / 2 - 0.05) * k, (x - w / 2 - 0.1) * k, (y + h / 2 - 0.2) * k)
  // The bill: her picture's night, the gold moon over two ridges, and a band of title in the carpet's red.
  solid(p, rgba(INK, 0.3), weight * 0.5, faded(STAR.velvet, 0.3))
  p.rect(x * k, y * k, w * k, h * k)
  p.noStroke()
  p.fill(faded(STAR.gold, 0.35))
  p.circle((x + 0.08) * k, (y - 0.15) * k, 0.18 * k)
  p.fill(faded(NIGHT, 0.2))
  p.triangle((x - 0.23) * k, (y + 0.14) * k, (x - 0.03) * k, (y - 0.12) * k, (x + 0.15) * k, (y + 0.14) * k)
  p.fill(faded(STAR.carpetDeep, 0.25))
  p.triangle((x - 0.06) * k, (y + 0.14) * k, (x + 0.12) * k, (y - 0.05) * k, (x + 0.23) * k, (y + 0.14) * k)
  p.fill(faded(STAR.cream, 0.45))
  p.rect(x * k, (y + 0.25) * k, (w - 0.14) * k, 0.07 * k)
  // The rain's streaks down it.
  p.stroke(rgba(STAR.rain, 0.12))
  p.strokeWeight(Math.max(1, 0.012 * k))
  for (let i = 0; i < 4; i++) {
    const sx = x - w / 2 + 0.07 + i * 0.12
    p.line(sx * k, (y - h / 2 + 0.1 * hash(i, 3)) * k, sx * k, (y + h / 2) * k)
  }
  // Its top right corner, come away from the wall, lifting and settling.
  const lift = 0.35 + 0.15 * Math.sin(tau * 1.3) + 0.08 * Math.sin(tau * 3.1)
  const cx = x + w / 2
  const cy = y - h / 2
  p.noStroke()
  p.fill(mixHex(WALL, NIGHT, 0.2))
  p.triangle((cx - 0.17) * k, cy * k, cx * k, cy * k, cx * k, (cy + 0.17) * k)
  solid(p, rgba(INK, 0.3), weight * 0.4, faded(STAR.cream, 0.4))
  p.triangle((cx - 0.17) * k, cy * k, cx * k, (cy + 0.17) * k, (cx - 0.17 + 0.15 * Math.cos(lift)) * k, (cy + 0.17 - 0.15 * Math.sin(lift) - 0.08) * k)
}

/** The laundromat's dryer vent, low on its wall by the window, breathing warm air out into the rain. */
export const VENT: Pt = [27.75, 2.86]

export function vent(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const [vx, vy] = VENT
  const tau = alleyTime(t)
  // The hood, and its flap lifting on each breath.
  solid(p, rgba(INK, 0.4), weight * 0.6, mixHex(STAR.wet, STAR.rain, 0.12))
  p.rect(vx * k, vy * k, 0.34 * k, 0.24 * k, 0.03 * k)
  p.stroke(rgba(NIGHT, 0.6))
  p.strokeWeight(Math.max(1, weight * 0.4))
  for (const ly of [-0.05, 0.02]) p.line((vx - 0.12) * k, (vy + ly) * k, (vx + 0.12) * k, (vy + ly) * k)
  const breath = 0.5 + 0.5 * Math.sin(tau * 2.2)
  p.push()
  p.translate((vx - 0.17) * k, (vy + 0.12) * k)
  p.rotate(-0.25 * breath)
  solid(p, rgba(INK, 0.4), weight * 0.5, mixHex(STAR.wet, STAR.rain, 0.22))
  p.rect(0.17 * k, 0.03 * k, 0.34 * k, 0.06 * k)
  p.pop()
}

/** The vent's steam, going up past the window and off on the wind; caught by the lamp where it crosses its light. */
export function steam(p: p5, c: Ctx, t: number, lit: (x: number, y: number) => number): void {
  const { k } = c
  const [vx, vy] = VENT
  const tau = alleyTime(t)
  p.noStroke()
  const n = 16
  for (let i = 0; i < n; i++) {
    const life = 3.6
    const u = (((tau + (i / n) * life) % life) + life) % life / life
    const x = vx - 0.08 + 0.7 * u * u + 0.1 * Math.sin(tau * 0.9 + i * 2.3) * u + 0.06 * (hash(i, 1, 91) - 0.5)
    const y = vy - 0.1 - 1.7 * u
    const r = 0.07 + 0.36 * u * (0.8 + 0.4 * hash(i, 2, 91))
    const a = 0.085 * smooth(u, 0, 0.1) * (1 - u) * (1 - u)
    const l = clamp(lit(x, y))
    const col = mixHex(mixHex(STAR.rain, STAR.cream, 0.35), STAR.spot, 0.6 * l)
    p.fill(rgba(col, a * (1 + 0.8 * l)))
    p.ellipse(x * k, y * k, 2 * r * k, 1.5 * r * k)
    p.fill(rgba(col, 0.6 * a * (1 + 0.8 * l)))
    p.ellipse((x - 0.03) * k, (y + 0.02) * k, 1.2 * r * k, 0.9 * r * k)
  }
}

/**
 * The rain striking the wet: rings that open and fade on the landing's paving and the steps' treads. `at` is the rain's
 * own time (held, when the picture is step-printed); `lit` says how much light is there to see them by.
 */
export function ripples(p: p5, c: Ctx, at: number, f: Frame, lit: (x: number, y: number) => number): void {
  const { k } = c
  const tau = alleyTime(at)
  const on = smooth(at, 69.2, 70.2)
  if (on <= 0) return
  p.noFill()
  p.strokeWeight(Math.max(1, 0.012 * k))
  const spans: [number, number, number][] = [[NOSING[5] + 0.05, TERRACE_R - 0.1, LANDING]]
  for (const [a, b, face] of spans) {
    const x0 = Math.max(a, f.x0 - 0.3)
    const x1 = Math.min(b, f.x1 + 0.3)
    if (x1 <= x0 || face < f.y0 || face > f.y1 + 0.5) continue
    const n = Math.ceil((b - a) * 3)
    for (let i = 0; i < n; i++) {
      const life = 0.55 + 0.35 * hash(i, 1, 61)
      const cyc = (tau + hash(i, 2, 61) * 5) / life
      const u = cyc - Math.floor(cyc)
      const round = Math.floor(cyc)
      const x = a + (b - a) * hash(i, round, 62)
      if (x < x0 || x > x1) continue
      const y = face + 0.08 + 0.3 * hash(i, round, 63)
      const l = clamp(lit(x, face - 0.3))
      p.stroke(rgba(l > 0.05 ? STAR.spot : STAR.rain, (0.1 + 0.32 * l) * (1 - u) * on))
      p.ellipse(x * k, y * k, (0.03 + 0.2 * u) * k, (0.012 + 0.05 * u) * k)
    }
  }
}

/* ------------------------------------------------------------------ nearer than the alley */

/** A line of washing strung across, nearer the lens than the alley, high in the wide shot: the camera passes under it. */
const LINE: { a: Pt; b: Pt; sag: number } = { a: [26.7, -2.12], b: [31.8, -1.98], sag: 0.24 }
const GARMENTS: { at: number; kind: number; col: string }[] = [
  { at: 0.14, kind: 0, col: mixHex(STAR.carpetDeep, NEAR, 0.55) },
  { at: 0.36, kind: 1, col: mixHex(STAR.wet, NEAR, 0.3) },
  { at: 0.58, kind: 2, col: mixHex(STAR.velvet, NEAR, 0.4) },
  { at: 0.8, kind: 0, col: mixHex(STAR.rain, NEAR, 0.65) },
]

function lineAt(u: number): Pt {
  const { a, b, sag } = LINE
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + sag * 4 * u * (1 - u)]
}

function washingLine(p: p5, k: number, weight: number, tau: number): void {
  depth(p, k, 1.5, SKY_REF, (f) => {
    if (f.y0 > LINE.b[1] + 0.9 || f.x1 < LINE.a[0] || f.x0 > LINE.b[0]) return
    const rim = rgba(mixHex(STAR.rain, SKY_LOW, 0.4), 0.5)
    outline(p, mixHex(NEAR, NIGHT, 0.3), Math.max(1, 0.022 * k))
    p.noFill()
    p.beginShape()
    for (let i = 0; i <= 16; i++) {
      const [x, y] = lineAt(i / 16)
      p.vertex(x * k, y * k)
    }
    p.endShape()
    GARMENTS.forEach((g, i) => {
      const [x, y] = lineAt(g.at)
      const sway = 0.07 * Math.sin(tau * 1.25 + i * 1.9) + 0.03 * Math.sin(tau * 2.9 + i)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(sway)
      solid(p, rim, weight * 0.8, g.col)
      if (g.kind === 0) {
        // A shirt, hung by its tail: body and two sleeves.
        p.rect(0, 0.28 * k, 0.42 * k, 0.5 * k, 0.03 * k)
        p.rect(-0.27 * k, 0.12 * k, 0.14 * k, 0.24 * k, 0.03 * k)
        p.rect(0.27 * k, 0.12 * k, 0.14 * k, 0.24 * k, 0.03 * k)
      } else if (g.kind === 1) {
        // A towel, folded over the line.
        p.rect(0, 0.3 * k, 0.5 * k, 0.6 * k, 0.02 * k)
      } else {
        // A qipao: its high collar, the long fitted body, and the hem's flare.
        p.beginShape()
        p.vertex(-0.08 * k, 0)
        p.vertex(0.08 * k, 0)
        p.vertex(0.2 * k, 0.16 * k)
        p.vertex(0.15 * k, 0.55 * k)
        p.vertex(0.2 * k, 0.95 * k)
        p.vertex(-0.2 * k, 0.95 * k)
        p.vertex(-0.15 * k, 0.55 * k)
        p.vertex(-0.2 * k, 0.16 * k)
        p.endShape(p.CLOSE)
      }
      // Two pegs.
      p.noStroke()
      p.fill(mixHex(NEAR, STAR.cream, 0.25))
      p.rect(-0.12 * k, 0, 0.04 * k, 0.12 * k)
      p.rect(0.12 * k, 0, 0.04 * k, 0.12 * k)
      p.pop()
      // A drip off its hem now and then.
      const d = ((tau * 0.7 + i * 0.37) % 1 + 1) % 1
      const hem = g.kind === 2 ? 0.95 : g.kind === 1 ? 0.6 : 0.53
      p.noStroke()
      p.fill(rgba(STAR.rain, 0.55 * (1 - d)))
      p.circle(x * k, (y + hem + 1.6 * d * d) * k, 0.045 * k)
    })
  })
}

/** A dustbin and a box on the lower lane, nearer than the alley: it comes into the corner of the frame as she goes. */
function nearBin(p: p5, k: number, weight: number): void {
  depth(p, k, 1.38, LANE_REF, (f) => {
    const bx = CORNER + 3.25
    if (f.x1 < bx - 0.6 || f.y1 < LOWER - 1.2) return
    p.push()
    p.translate(bx * k, LOWER * k)
    p.scale(0.72)
    p.translate(-bx * k, -LOWER * k)
    const ink = mixHex(NEAR, NIGHT, 0.4)
    const rim = rgba(mixHex(ROOM_WARM, STAR.rain, 0.5), 0.55)
    solid(p, rim, weight, NEAR)
    // The bin: a ribbed can, its lid knocked askew.
    p.quad((bx - 0.42) * k, (LOWER - 1.05) * k, (bx + 0.42) * k, (LOWER - 1.05) * k, (bx + 0.36) * k, (LOWER + 0.1) * k, (bx - 0.36) * k, (LOWER + 0.1) * k)
    outline(p, rgba(ink, 0.9), weight * 0.6)
    for (let i = 1; i < 4; i++) p.line((bx - 0.4 + 0.01 * i) * k, (LOWER - 1.05 + 0.28 * i) * k, (bx + 0.4 - 0.01 * i) * k, (LOWER - 1.05 + 0.28 * i) * k)
    p.push()
    p.translate((bx + 0.05) * k, (LOWER - 1.12) * k)
    p.rotate(-0.16)
    solid(p, rim, weight, mixHex(NEAR, STAR.rain, 0.12))
    p.rect(0, 0, 1.0 * k, 0.1 * k, 0.03 * k)
    p.rect(0, -0.08 * k, 0.2 * k, 0.07 * k, 0.02 * k)
    p.pop()
    // A sodden box leaning on it.
    solid(p, rim, weight * 0.8, mixHex(NEAR, STAR.carpetDeep, 0.25))
    p.quad((bx + 0.38) * k, (LOWER - 0.62) * k, (bx + 1.05) * k, (LOWER - 0.55) * k, (bx + 1.0) * k, (LOWER + 0.1) * k, (bx + 0.36) * k, (LOWER + 0.1) * k)
    p.pop()
  })
}

/**
 * The nearer rain: fewer drops, longer and a little brighter, falling faster across the frame than the alley's own.
 * `held` is the rain's time (the step-printed step, or the show's), `a` how much of it.
 */
function nearRain(p: p5, k: number, held: number, a: number, lit: (x: number, y: number) => number, ground: (x: number) => number): void {
  const on = smooth(held, 68.95, 69.85) * a
  if (on <= 0) return
  depth(p, k, 1.6, SKY_REF, (f) => {
    const tau = alleyTime(held)
    const period = 7
    const gap = 0.55
    const wind = 0.1
    const len = 0.5
    p.strokeWeight(Math.max(1, 0.02 * k))
    for (let j = Math.floor((f.x0 - 1) / gap); j <= Math.ceil((f.x1 + 0.5) / gap); j++) {
      const x = j * gap + hash(j, 0, 77) * gap
      const phase = hash(j, 1, 77) * period + 16 * tau * (0.9 + 0.2 * hash(j, 2, 77))
      for (let y = (((phase % period) + period) % period) + Math.floor((f.y0 - 1) / period) * period; y < f.y1 + 1; y += period) {
        if (y < f.y0 - 1) continue
        const bx = x + wind * (y - f.y0)
        // Lit by whatever light the alley has where the drop is seen against it (the layer's point carried back into
        // the alley's plane: the shift `depth` gave it, worked back from the layer's own frame).
        const back = (1 - 1.6) / 1.6
        const wx = bx + (f.cx - SKY_REF[0]) * back
        const wy = y + (f.cy - SKY_REF[1]) * back
        // Not over the ground where it is cut open (the terrace, the drain): the rain falls in the alley's air.
        if (wy + len > ground(wx)) continue
        const l = clamp(lit(wx, wy))
        p.stroke(rgba(l > 0.05 ? STAR.spot : STAR.rain, (0.14 + 0.3 * l) * on))
        p.line(bx * k, y * k, (bx - wind * len) * k, (y + len) * k)
      }
    }
  })
}

/** Everything nearer the lens than the alley, over the ball. `held` and `step` are the rain's (step-printing). */
export function drawNear(p: p5, c: Ctx, t: number, held: number, step: number, lit: (x: number, y: number) => number, ground: (x: number) => number): void {
  const tau = alleyTime(t)
  washingLine(p, c.k, c.weight, tau)
  nearBin(p, c.k, c.weight)
  if (step < 0.999) nearRain(p, c.k, t, 1 - step, lit, ground)
  if (step > 0.001) {
    nearRain(p, c.k, held, step, lit, ground)
    nearRain(p, c.k, held - 1 / 6, 0.45 * step, lit, ground)
  }
}
