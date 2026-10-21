import { beat } from '../music'
import { drawing, inView, layer, mix, smooth, type Brush } from '../paint'
import type { Scene } from '../scene'
import { depthScale, frameH, horizonOf } from '../world/land'
import { BLOCK_TAKEN, paintCamp, paintSmallShip, toppled } from './charge/camp'
import { paintPuff, type Puff } from './charge/dust'
import { chaniMoves, fremen, paulMoves, STRIDE_BEATS } from './charge/people'
import { B, BREACH, EMPEROR, FROM, RISE, SHIP1, SHIP2_HIT, TO, ground } from './charge/plan'
import { basinFill, paintSkirt, paintStormSky, sandAt, SKY, TILT } from './charge/storm'
import { skyOf } from '../world/sky'
import { FAR_WORMS, paintFarWorm, paintLead } from './charge/worms'

/**
 * The charge, and after it (262.9 to the end).
 *
 *   262.9   a dissolve from the arena's white sky: the basin before Arrakeen under the storm, vast; the wall of dust in
 *           the west higher than the frame, and in the east the Emperor's camp, his great ship over it
 *   266.4   the lead worm comes out of the storm's skirt, Paul and Chani on its back; 270.4 and 271.6, two more behind
 *   272.8   with them: the first block of Sardaukar taken on 274.6, the first ship's legs on 275.1, down on 276.9
 *   279.2   wide: the far worms through the far blocks; the second ship down (280.5, 282.1); the Fremen on foot behind
 *   288.5   the peak: under the great ship the lead worm rears, higher than it, its mouth open
 *   292.5   down onto it; the ship goes over, and lands on 295.4
 *   296.6   close: the worm lowers them to the sand; on 304.0 they get down, and go up onto the rise
 *   306.2   wide: the worms go down into the sand; the third ship down; the storm thinning
 *   312.3   the last beat: the evening. Paul on the rise; the storm gone by; the end credits; Chani goes west,
 *           alone, and he turns to look after her
 */

/** The far layers: a small ship in each, knocked down by that layer's worm. */
const FAR_CAMP = [
  { fw: FAR_WORMS[0], ship: { x: 9031, h: 14, w: 4.4, hit: SHIP2_HIT, land: beat('charge', 31) } },
  { fw: FAR_WORMS[1], ship: { x: 9104, h: 13, w: 4.2, hit: beat('charge', 63), land: beat('charge', 66) } },
]

/** Where dust goes up: in the action's plane, and in each far layer. */
const PUFFS: Puff[] = [
  { x: SHIP1.x + SHIP1.w / 2 + SHIP1.h * 0.55, y: 0, at: B.ship1Down, size: 11, drift: 1.2, behind: true },
  { x: EMPEROR.x + EMPEROR.w / 2 + 9, y: 0, at: B.ground, size: 22, drift: 1.4, life: 5, behind: true },
  ...BLOCK_TAKEN.map((t, i): Puff => ({ x: [9031, 9056][i] + 3, y: 0, at: t, size: 7, drift: 1.5, life: 2.6 })),
]
const FAR_PUFFS: Puff[][] = FAR_CAMP.map((c) => [
  { x: c.ship.x + c.ship.w / 2 + c.ship.h * 0.55, y: 0, at: c.ship.land, size: 11, drift: 1.2 },
])

/** The rise in the action's plane: the sand heaped up, its west face turned from the light. */
function paintRise(b: Brush): void {
  const { ctx, t } = b
  const sand = sandAt(t)
  const x0 = RISE.x - RISE.w
  const x1 = RISE.x + RISE.w
  if (!inView(b.view, x0, -RISE.h, x1, 0.5)) return
  const n = 40
  ctx.beginPath()
  ctx.moveTo(x0, 0.4)
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    ctx.lineTo(x, ground(x))
  }
  ctx.lineTo(x1, 0.4)
  ctx.closePath()
  ctx.fillStyle = basinFill(b)
  ctx.fill()
  // The west face, turned from the evening light: darkest under the crest, gone by its foot.
  ctx.beginPath()
  ctx.moveTo(x0, 0.05)
  for (let i = 0; i <= n / 2; i++) {
    const x = x0 + ((RISE.x - x0) * i) / (n / 2)
    ctx.lineTo(x, ground(x))
  }
  ctx.quadraticCurveTo(RISE.x - RISE.w * 0.3, -RISE.h * 0.2, RISE.x - RISE.w * 0.55, 0.05)
  ctx.closePath()
  const gr = ctx.createLinearGradient(0, -RISE.h, 0, 0.05)
  gr.addColorStop(0, b.ca(sand.shade, 0.34))
  gr.addColorStop(1, b.ca(sand.shade, 0))
  ctx.fillStyle = gr
  ctx.fill()
}

/** A brush whose colours go `d`-far toward the air: a far thing is paler, not lighter or darker. */
function hazed(b: Brush, d: number): Brush {
  const air = mix(skyOf(SKY, b.t).low, sandAt(b.t).far, 0.3)
  // In the evening the far wreckage goes into the low light: a shape on the horizon, not a thing to look at.
  const pale = Math.min(0.66, 0.25 + d / 240) + 0.22 * smooth(b.t, 312, 322)
  return { ...b, c: (hex) => b.c(mix(hex, air, pale)), ca: (hex, a) => b.ca(mix(hex, air, pale), a) }
}

/** Clip to what is above the sand in the action's plane (the flat, and the rise). */
function aboveSand(b: Brush): void {
  const { ctx, view } = b
  const n = 60
  ctx.beginPath()
  ctx.moveTo(view.x0 - 2, view.y0 - 400)
  ctx.lineTo(view.x1 + 2, view.y0 - 400)
  for (let i = n; i >= 0; i--) {
    const x = view.x0 - 2 + ((view.w + 4) * i) / n
    ctx.lineTo(x, ground(x) + 0.05)
  }
  ctx.closePath()
  ctx.clip()
}

function paint(b: Brush): void {
  const t = b.t
  if (t < FROM) return
  paintStormSky(b)
  const hy = horizonOf(b.view, TILT)
  const sand = sandAt(t)
  // The far layers, the furthest first; each worm's buried half under its layer's sand.
  for (const c of [FAR_CAMP[1], FAR_CAMP[0]]) {
    layer(b, depthScale(frameH(b.view), c.fw.d), hy, (near) => {
      // Aerial perspective: everything in the layer goes toward the storm's air by its distance.
      const lb = hazed(near, c.fw.d)
      paintSmallShip(lb, c.ship.x, c.ship.h, c.ship.w, toppled(t, c.ship.hit, c.ship.land))
      lb.ctx.save()
      lb.ctx.beginPath()
      lb.ctx.rect(lb.view.x0 - 5, lb.view.y0 - 400, lb.view.w + 10, -lb.view.y0 + 400.15)
      lb.ctx.clip()
      paintFarWorm(lb, c.fw)
      lb.ctx.restore()
      for (const p of FAR_PUFFS[FAR_CAMP.indexOf(c)]) paintPuff(lb, p, sand.far)
      paintSkirt(lb)
    })
  }
  paintRise(b)
  // The dust of the falls goes up behind the hulls, so a fallen ship stays one dark shape in it.
  for (const p of PUFFS) if (p.behind) paintPuff(b, p, sand.lit)
  paintCamp(b)
  b.ctx.save()
  aboveSand(b)
  paintLead(b)
  b.ctx.restore()
  for (const p of PUFFS) if (!p.behind) paintPuff(b, p, sand.lit)
}

/** Paul, steadied a little for the camera that goes with him. */
const paulAt = (t: number): [number, number] => {
  const m = paulMoves.find((x) => t >= x.t0 && t <= x.t1) ?? (t < FROM ? paulMoves[0] : paulMoves[paulMoves.length - 1])
  return m.at(Math.max(m.t0, Math.min(m.t1, t)))
}

export const charge: Scene = {
  key: 'charge',
  from: FROM,
  to: TO,
  paul: paulMoves,
  chani: chaniMoves,
  actors: fremen,
  dissolves: [[FROM, 2.2]],
  shots: [
    // The basin, vast: the storm in the west higher than the frame; across it to the camp in the east.
    { t: FROM, cut: true, cells: 92, at: [8972, -28] },
    { t: B.cutTrack - 0.01, cells: 84, at: [9058, -24] },
    // With the lead worm, ahead of it, as it goes through the first block and the first ship.
    { t: B.cutTrack, cut: true, cells: 30, track: paulAt, off: [11, 3] },
    { t: B.cutWide - 0.01, cells: 29, track: paulAt, off: [10.5, 2.8] },
    // Wide over the camp, pushing in on the great ship as the lead worm comes up to it.
    { t: B.cutWide, cut: true, cells: 76, at: [9068, -23] },
    { t: B.peak - 0.01, cells: 54, at: [9094, -17] },
    // The peak: low by the great ship, the worm rearing over it; down on it; the ship going over.
    { t: B.peak, cut: true, cells: 42, at: [9103, -15.5] },
    { t: B.crash, cells: 41, at: [9107, -15] },
    { t: B.cutClose - 0.01, cells: 40, at: [9114, -14] },
    // Close: on the worm's back as it lowers them, the field behind; down; up onto the rise.
    { t: B.cutClose, cut: true, cells: 13, track: paulAt, off: [2.4, -3.4] },
    { t: B.dive - 0.01, cells: 11, track: paulAt, off: [1.8, -2.6] },
    // Wide: the worms going down, the storm thinning over the field.
    { t: B.dive, cut: true, cells: 84, at: [9078, -26] },
    { t: B.last - 0.01, cells: 92, at: [9082, -28] },
    // The evening: Paul on the rise, the sky clearing over him for the credits; slowly back as she goes.
    { t: B.last, cut: true, cells: 14, at: [9093, -5.4] },
    { t: 330, cells: 22, at: [9092, -7.8] },
    { t: TO, cells: 30, at: [9090, -9.8] },
  ],
  back: [drawing('charge', TO, paint)],
  front: [drawing('charge-skirt', TO, (b) => {
    if (b.t < FROM) return
    paintSkirt(b)
  })],
  overview: { x0: 8860, y0: -90, x1: 9180, y1: 12 },
  strikes: [
    ['the lead worm out of the storm', BREACH],
    ['the second worm', B.w2],
    ['the third worm', B.w3],
    ['with them', B.cutTrack],
    ['the first block', B.rankA],
    ['the first ship struck', B.ship1],
    ['the first ship down', B.ship1Down],
    ['wide', B.cutWide],
        ['the second ship struck', SHIP2_HIT],
    ['the second ship down', beat('charge', 31)],
        ['the peak: it rears', B.peak],
    ['down onto the ship', B.crash],
    ['the great ship down', B.ground],
    ['close', B.cutClose],
    ['the third ship struck', beat('charge', 63)],
    ['the third ship down', beat('charge', 66)],
    ['down off the worm', B.off],
    ['the worms go down', B.dive],
    ['the second worm down', B.dive2],
    ['the last beat', B.last],
    ...STRIDE_BEATS.map((t, i): [string, number] => [`stride ${i}`, t]),
  ],
}

