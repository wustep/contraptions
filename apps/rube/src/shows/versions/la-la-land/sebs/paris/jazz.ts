import type { Pt } from '../../../../../parts'
import type p5 from 'p5'
import { box, carried, frame, glow, hash, part, rgba, route, smooth, type Way } from '../kit'
import { AT, paris } from '../music'
import { CLUB_MAT as M } from '../worlds'
import { hop } from '../physics'
import {
  BALLOONS, DARK, drawClub, drawLamp, FLASHES, PIVOT, HANDOFF, J0, LAND_X1, LEAVE, LIGHTS, MEET, MIA_STEPS, miaAt, SEESAW_T, seat, SLAM, SNARE_T,
  SOLO_LANDINGS, stepBall, STEP_T, VALVE_T,
} from './jazz-club'

/**
 * The Paris club (214.877 → 239.444, the band at 122.8 bpm). Through the red
 * door on the kick, the two of them; it slams behind them and the bulbs come
 * on over a red cellar. He goes down the stair on the drum fill, a step an
 * eighth, and lands on the band: a see-saw whose ends play the hi-hat and
 * the kick, which he bounces from end to end on the swing, with the trumpet
 * high over its pivot and the snare's stick on the band's accents. Her
 * premiere is up on the landing: flash guns come down from the vault and
 * fire on the beats as she crosses it, and at the top of the stair the knot
 * of a bunch of balloons slips and they go up into the vault. She comes
 * down, lands on the other end as he lands on his, and they ride it together
 * to the band's last chord. (The room and all its machines are
 * `jazz-club.ts`, shared with the trumpet.)
 */

interface JazzState {
  begin: number
}

/** Every strike: the door, the lights, the stair (his steps and hers), every end of the see-saw, the flashes, the balloons, the snare, the band's valves. */
export const JAZZ_HITS: number[] = [...new Set([SLAM, LIGHTS, ...STEP_T, ...MIA_STEPS, ...SEESAW_T, ...FLASHES, BALLOONS, ...SNARE_T, ...VALVE_T.filter((t) => t < AT.trumpet)])].sort((a, b) => a - b)

/**
 * The house: the club is his, in Paris, and it is full. A row of them at the little tables nearest us, black against
 * the room along the foot of the picture, nearer than anything else so they slide a little faster than it as the
 * camera goes; the bulbs warm the tops of their heads, a candle and a glass glint on each table, and they nod on the
 * band's beat, each in their own time. When the room goes dark for the trumpet they are only shapes, the spot's
 * light just catching the heads nearest it.
 */
const HOUSE = Array.from({ length: 30 }, (_, i) => ({
  x: -6 + i * 0.62 + 0.25 * (hash(i, 71) - 0.5),
  size: 0.85 + 0.3 * hash(i, 72),
  lag: 0.02 + 0.09 * hash(i, 73),
  nods: hash(i, 74) < 0.7,
  table: i % 3 === 1,
}))
const BEATS = Array.from({ length: 120 }, (_, k) => paris(k)).filter((b) => b > LIGHTS && b < DARK[0])
function drawHouse(p: p5, k: number, t: number): void {
  if (t < LIGHTS - 0.2 || t > 268.3) return
  const f = frame(p, k)
  const fh = f.y1 - f.y0
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const lit = smooth(t, LIGHTS - 0.1, LIGHTS + 0.3) * (1 - smooth(t, DARK[0], DARK[1]))
  const dark = smooth(t, DARK[0], DARK[1])
  for (const h of HOUSE) {
    // Nearer than the room: it slides past faster.
    const x = f.cx + (h.x - f.cx) * 1.35
    if (x < f.x0 - 0.5 || x > f.x1 + 0.5) continue
    const s = 1.25 * h.size * fh
    let nod = 0
    if (h.nods && lit > 0) for (const b of BEATS) { const d = t - b - h.lag; if (d > 0 && d < 0.4) nod = Math.max(nod, Math.exp(-d / 0.12)) }
    const base = f.y1 + 0.01 * fh
    const headY = base - 0.075 * s + 0.006 * s * nod
    const r = 0.03 * s
    ctx.fillStyle = rgba(M.black, 0.94)
    ctx.beginPath()
    ctx.ellipse(x * k, (base - 0.02 * s) * k, 0.07 * s * k, 0.045 * s * k, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x * k, headY * k, r * k, 0, Math.PI * 2)
    ctx.fill()
    // Warm on the top of the head from the bulbs; in the dark, the spot just catching the nearest.
    const near = Math.max(0, 1 - Math.abs(x - PIVOT[0]) / 2.2)
    const rim = 0.45 * lit + 0.35 * dark * near
    if (rim > 0.02) {
      ctx.strokeStyle = rgba(lit > 0.5 ? M.bulb : M.spot, rim)
      ctx.lineWidth = Math.max(1, 0.006 * s * k)
      ctx.beginPath()
      ctx.arc(x * k, headY * k, r * k, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    }
    if (h.table) {
      const tx = x + 0.3 * s * 0.25
      const ty = base - 0.05 * s
      ctx.fillStyle = rgba(M.black, 0.96)
      ctx.fillRect((tx - 0.05 * s) * k, ty * k, 0.1 * s * k, 0.008 * s * k)
      const flame = (1 - 0.7 * dark) * (0.85 + 0.15 * Math.sin(t * 9 + h.x * 3))
      glow(p, k, tx - 0.02 * s, ty - 0.012 * s, 0.05 * s, M.bulb, 0.5 * flame)
      ctx.fillStyle = rgba(M.bulb, 0.9 * flame)
      ctx.beginPath()
      ctx.arc((tx - 0.02 * s) * k, (ty - 0.01 * s) * k, 0.004 * s * k, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgba(M.brass, 0.55 * flame)
      ctx.fillRect((tx + 0.02 * s) * k, (ty - 0.02 * s) * k, 0.008 * s * k, 0.02 * s * k)
    }
  }
}

export const jazz = part<JazzState>(
  {
    name: 'jazz',
    flight: true,
    draw(p, s, c) {
      const t = c.t + s.begin
      p.rectMode(p.CORNER)
      drawClub(p, c.k, c.weight, t)
      drawLamp(p, c.k, c.weight, t)
    },
    over(p, s, c) {
      drawHouse(p, c.k, c.t + s.begin)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // Out of the door, easing to a stop at the edge of the landing, and off it on the fill.
    const edge: Pt = [LAND_X1 - 0.18, 0]
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: 1.022, p: edge, ramp: [1.8, 0] }, { at: at(LEAVE), p: edge }]
    STEP_T.forEach((t, i) => ways.push(hop(ways[ways.length - 1], stepBall(i + 1), at(t))))
    // End to end on the see-saw, alone; then onto his end as she lands on hers.
    for (const [t, e] of SOLO_LANDINGS) ways.push(hop(ways[ways.length - 1], seat(e, t), at(t)))
    ways.push(hop(ways[ways.length - 1], seat(1, MEET), at(MEET)))
    const ride = (u: number): Pt => seat(1, u + slot.begin)
    const segs = [...route(ways), ...carried(ride, at(MEET), at(slot.end), Math.ceil((slot.end - MEET) * 40))]
    return {
      cells: box(-4, -4, 9, 3.5),
      exit: [HANDOFF[0] + 0.5, HANDOFF[1]],
      lane: { segs, fire: at(SOLO_LANDINGS[0][0]) },
      state: { begin: slot.begin },
      company: [{ from: J0, to: slot.end, who: 'mia', at: miaAt }],
    }
  },
  (slot) => [
    // Through the red: the door, close; the lights come up and the camera opens on the cellar below.
    { t: slot.begin, cells: 3.6, hold: [-0.3, -0.5] },
    { t: LIGHTS - 0.05, cells: 3.9, hold: [-0.1, -0.45] },
    { t: LEAVE + 0.1, cells: 6.2, hold: [1.4, 0.55] },
    // Close on the band while he plays it alone: the see-saw big in frame, the trumpet over it, drifting along the kit.
    { t: SOLO_LANDINGS[1][0], cells: 3.75, hold: [4.5, 1.5] },
    { t: 222.6, cells: 3.55, hold: [4.75, 1.55] },
    // Up to the landing for her premiere, two levels in one frame: her by the door above, his see-saw still going in the
    // corner below, so when the net lets go she comes down to someone.
    { t: 224.0, cells: 5.8, hold: [1.4, 0.3] },
    { t: FLASHES[0] + 0.1, cells: 5.6, hold: [1.2, 0.5] },
    { t: FLASHES[5], cells: 5.6, hold: [1.3, 0.55] },
    // The balloons go, and she comes down to him.
    { t: BALLOONS + 0.5, cells: 6.0, hold: [1.7, 0.2] },
    { t: 230.0, cells: 5.8, hold: [2.5, 0.7] },
    { t: 231.3, cells: 5.3, hold: [3.4, 1.1] },
    // Close on the two of them riding it; back a little and up to the trumpet as the lights go.
    { t: MEET + 0.2, cells: 3.75, hold: [4.6, 1.55] },
    { t: 235.6, cells: 3.5, hold: [4.45, 1.52] },
    { t: slot.end - 0.05, cells: 3.86, hold: [4.18, 1.22] },
  ],
)
