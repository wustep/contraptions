import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, mixHex, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { iceBlue, snowAt, snowWhite } from './snow'

/**
 * An ice floe. The track runs out onto a shelf of ice at the edge of a
 * lead of open water three cells wide, and a slab that has calved off the
 * shelf lies against it, its top level with the track. The ball rolls onto
 * the slab's near end. That end dips under it, and the ball's way, which
 * the slab takes off it, sets the slab adrift: slowly, since it is heavy,
 * and faster as the ball rolls on along it. The slab levels as the ball
 * crosses its middle and goes down by the head as it nears the far end, and
 * fetches up against the far shelf, its head riding up level on the shelf's
 * foot, just as the ball gets there; the ball rolls off onto the shelf and
 * on, and the slab lies where it fetched up, nodding itself still.
 *
 * One motion for slab and ball. The slab's drift is a function of time, its
 * trim and its heave a sprung thing's answer to where the ball is on it,
 * worked out once; the ball's lane is its place along the slab's top as the
 * slab is drawn, so it never leaves the ice.
 */
/** The shelves' faces, the water's line between them, and the pool's floor. */
const NEAR = -0.12
const FAR = 2.12
const WATER = 0.29
const BED = 0.5
/** The slab: how long, how thick, and the crack between it and a shelf it lies against. */
const LEN = 1.2
const THICK = 0.31
const CRACK = 0.012
const X_ON = NEAR + CRACK
const X_OFF = FAR - CRACK
const RUN = X_OFF - LEN - X_ON
/** The ball's pace: what it comes aboard with, what the slab has taken off it, and what it has as it leaves. */
const V_TAKEN = 1.7
const V_OFF = 2.15
const TAKE = 0.3
const T_ON = (X_ON + 0.5) / ROLL
const CROSS = TAKE + (X_OFF - X_ON - (TAKE * (ROLL + V_TAKEN)) / 2) / ((V_TAKEN + V_OFF) / 2)
const T_OFF = T_ON + CROSS
/** How far the slab trims with the ball at its end, how far the ball's weight sinks it, and how soon its head rides up on the far shelf's foot. */
const TRIM = 0.085
const SINK = 0.018
const GROUND = 0.16

/** How far the ball has come since it came aboard: its pace eased from one to the next, which is a cubic's integral. */
const eased = (f: number) => f * f * f - (f * f * f * f) / 2
function ballRun(tau: number): number {
  if (tau <= TAKE) return ROLL * tau + (V_TAKEN - ROLL) * TAKE * eased(tau / TAKE)
  const rest = CROSS - TAKE
  const u = Math.min(tau, CROSS) - TAKE
  return (TAKE * (ROLL + V_TAKEN)) / 2 + V_TAKEN * u + (V_OFF - V_TAKEN) * rest * eased(u / rest)
}
/** How far the slab has drifted: a heavy thing's soft start, way still on at the far shelf, and a nod against it. */
function driftAt(t: number): number {
  const tau = t - T_ON
  if (tau <= 0) return 0
  if (tau < CROSS) {
    const f = tau / CROSS
    return RUN * (1.6 * f * f - 0.6 * f * f * f)
  }
  const s = tau - CROSS
  return RUN - 0.02 * Math.exp(-s * 4) * Math.abs(Math.sin(s * 8))
}
/** How far along the slab the ball is, from its near end; off either end when it is not aboard. */
const alongAt = (t: number): number => (t < T_ON ? -1 : t > T_OFF ? LEN + 1 : X_ON + ballRun(t - T_ON) - (X_ON + driftAt(t)))

/**
 * The slab's trim (its near end down, as a slope) and heave (down), worked
 * out once in small steps: two damped springs, each answering the ball's
 * weight where it stands, and a jolt as the slab fetches up.
 */
const STEP = 1 / 480
const SETTLE = 4
const TABLE: [trim: number, heave: number][] = (() => {
  const out: [number, number][] = []
  let trim = 0
  let dTrim = 0
  let heave = 0
  let dHeave = 0
  const n = Math.ceil((CROSS + SETTLE) / STEP)
  for (let i = 0; i <= n; i++) {
    out.push([trim, heave])
    const t = T_ON + i * STEP
    const s = alongAt(t)
    const aboard = s >= 0 && s <= LEN
    const wantTrim = aboard ? TRIM * (1 - (2 * s) / LEN) : 0
    const wantHeave = aboard ? SINK : 0
    dTrim += (64 * (wantTrim - trim) - 2 * 0.42 * 8 * dTrim) * STEP
    dHeave += (110 * (wantHeave - heave) - 2 * 0.5 * 10.5 * dHeave) * STEP
    // Fetched up: the head stops, and the tail kicks up a little.
    if (Math.abs(t - T_OFF) < STEP / 2) dTrim -= 0.4
    trim += dTrim * STEP
    heave += dHeave * STEP
  }
  return out
})()

/** The slab as it lies at `t`: where its near end's top corner is, its slope (near end down), and the height of its middle. */
function slabAt(t: number): { x: number; slope: number; mid: number } {
  const x = X_ON + driftAt(t)
  const at = clamp((t - T_ON) / STEP, 0, TABLE.length - 1)
  const i = Math.min(TABLE.length - 2, Math.floor(at))
  const f = at - i
  const trim = TABLE[i][0] + (TABLE[i + 1][0] - TABLE[i][0]) * f
  const heave = TABLE[i][1] + (TABLE[i + 1][1] - TABLE[i][1]) * f
  // Its two ends' heights; the head rides up level on the far shelf's foot as it fetches up, and stays there.
  const tail = heave + (trim * LEN) / 2
  const w = clamp((t - (T_OFF - GROUND)) / GROUND)
  const head = (heave - (trim * LEN) / 2) * (1 - w * w * (3 - 2 * w))
  return { x, slope: (tail - head) / LEN, mid: (tail + head) / 2 }
}

/** The ball on the slab's top. */
function ballAt(t: number): Pt {
  const slab = slabAt(t)
  const s = alongAt(t)
  return [slab.x + s, slab.mid - slab.slope * (s - LEN / 2)]
}

const RIDE = trace(ballAt, T_ON, T_OFF, 56)
const LANE: Lane = {
  segs: [roll([-0.5, 0], [X_ON, 0], ROLL), ...RIDE, ramp(RIDE[RIDE.length - 1].to, [2.5, 0], V_OFF, ROLL)],
  fire: T_ON,
}

/** The slab in its own frame, from the middle of its top: a flat back, chipped shoulders, and a belly shorter than its back. */
function slabShape(p: p5, k: number): void {
  const h = LEN / 2
  p.beginShape()
  p.vertex(-h * k, 0)
  p.vertex(h * k, 0)
  p.vertex(h * k, 0.1 * k)
  p.vertex((h - 0.05) * k, 0.21 * k)
  p.vertex((h - 0.15) * k, THICK * k)
  p.vertex((-h + 0.2) * k, THICK * k)
  p.vertex((-h + 0.06) * k, 0.23 * k)
  p.vertex(-h * k, 0.12 * k)
  p.endShape(p.CLOSE)
}

/** A shelf: the snow humped up from the ground's line to the track's level, flat to the water's edge, and a face of ice down to the ground's line. `side` is -1 for the near one. */
function shelf(p: p5, k: number, ink: string, weight: number, white: string, edge: number, face: number, ground: number): void {
  const rise = edge + (face - edge) * 0.55
  solid(p, ink, weight, white)
  p.beginShape()
  p.vertex(edge * k, ground * k)
  p.bezierVertex(((edge + rise) / 2) * k, ground * k, ((edge + rise) / 2) * k, FLOOR * k, rise * k, FLOOR * k)
  p.vertex(face * k, FLOOR * k)
  p.vertex(face * k, ground * k)
  p.endShape(p.CLOSE)
}

/** Ripples per cell on the water's line. A whole number, so it joins up. */
const waterAt = (x: number) => WATER + 0.01 * Math.sin(x * Math.PI * 4)

export const floe = definePiece<{ white: string; water: string }>({
  name: 'floe',
  weight: 0.9,
  place: ({ fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    // Ice is white and the lead is the palette's bluest, whatever the map hands the piece.
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { white: snowWhite(theme), water: iceBlue(theme) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const ground = snowAt(-0.5)

    // The lead: open water between the two shelves' faces, down to its bed.
    p.noStroke()
    p.fill(s.water)
    p.beginShape()
    const n = 60
    for (let i = 0; i <= n; i++) {
      const x = NEAR + ((FAR - NEAR) * i) / n
      p.vertex(x * k, waterAt(x) * k)
    }
    p.vertex(FAR * k, BED * k)
    p.vertex(NEAR * k, BED * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.line(NEAR * k, BED * k, FAR * k, BED * k)
    p.line(NEAR * k, ground * k, NEAR * k, BED * k)
    p.line(FAR * k, ground * k, FAR * k, BED * k)

    // The shelves: the snow humped up to the track's level at the water's edge, each with a face of ice.
    shelf(p, k, ink, weight, s.white, -0.5, NEAR, ground)
    shelf(p, k, ink, weight, s.white, 2.5, FAR, ground)
    rail(p, k, ink, weight, -0.5, NEAR)
    rail(p, k, ink, weight, FAR, 2.5)

    // The slab, and the part of it under the water in the water's own tint.
    const slab = slabAt(t)
    const pose = () => {
      p.translate((slab.x + LEN / 2) * k, (FLOOR + slab.mid) * k)
      p.rotate(-Math.atan(slab.slope))
    }
    p.push()
    pose()
    solid(p, ink, weight, s.white)
    slabShape(p, k)
    p.pop()
    p.push()
    ctx.save()
    ctx.beginPath()
    ctx.rect(NEAR * k, (WATER + 0.012) * k, (FAR - NEAR) * k, (BED - WATER) * k)
    ctx.clip()
    pose()
    solid(p, ink, weight, mixHex(s.white, s.water, 0.45))
    slabShape(p, k)
    ctx.restore()
    p.pop()

    // The water's line, in front of the slab.
    outline(p, ink, weight * 0.8)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = NEAR + ((FAR - NEAR) * i) / n
      p.vertex(x * k, waterAt(x) * k)
    }
    p.endShape()
  },
})
