import { beat } from '../music'
import { drawing, inView, layer, mix, smooth, type Brush } from '../paint'
import type { Scene } from '../scene'
import { depthScale, frameH, horizonOf } from '../world/land'
import { skyOf } from '../world/sky'
import { BLOCK_TAKEN, paintCamp, paintSmallShip, toppled } from './charge/camp'
import { paintPuff, type Puff } from './charge/dust'
import { chaniMoves, fremen, paulMoves, STRIDE_BEATS } from './charge/people'
import { B, BREACH, EMPEROR, FROM, GROUND_SWELLS, SHIP1, SHIP2_HIT, TO, ground } from './charge/plan'
import { basinFill, paintSkirt, paintStormSky, sandAt, SKY, tiltAt } from './charge/storm'
import { ENDING_SHOTS, paintEnding } from './charge/ending'
import { paintFarWorm, paintLead, SECOND, THIRD, type Far } from './charge/worms'

/**
 * The charge, and after it (262.9 to the end).
 *
 *   262.9   a dissolve from the arena's white sky: the basin before Arrakeen under the storm, the dark wall of it in the
 *           west, its crest catching the last light; in the east, on the pale floor, the Emperor's camp
 *   266.4   the lead worm comes out of the storm's skirt; the camera goes in to it
 *   270.4   alongside it as it runs, Paul and Chani on its back; the second worm out behind it
 *   272.2   close on the two of them riding, the storm behind
 *   274.6   the first block of Sardaukar taken, the first ship's legs on 275.1, down on 276.9
 *   279.2   the Fremen on foot pour out of the dust across the floor, a stride a beat; the second worm, its riders on
 *           its back, runs on beyond them and knocks the second ship over (282.7, down 284.4)
 *   284.4   with the lead worm up to the great ship, and on the peak (288.5) it rears, its mouth wide, sand pouring off
 *   292.5   down onto it; the ship goes over, and lands on 295.4; the worm settles
 *   296.6   close: the worm lowers them to the sand; on 304.0 they get down, and go up onto the rise
 *   306.2   wide: the worms go down into the sand; the third ship down; the storm settling
 *   312.3   the last beat: the evening, on a dune above the field, the sun low in the west, the worms' trails out on the
 *           flat and the great ship on its side far off. Paul on the crest; the end credits; Chani goes down the long
 *           slope alone toward the sun, smaller and smaller, and he turns to look after her
 */

/** The worms beyond the action's plane, each with a small ship in its layer that it knocks over. */
const FAR: Far[] = [
  { spec: SECOND, d: 12, riders: [27.6, 30, 32.4], ship: { x: 9098, h: 10, w: 3.4, hit: SHIP2_HIT, land: B.run } },
  { spec: THIRD, d: 100, riders: [28.5, 31.5, 34.5], ship: { x: 9104, h: 13, w: 4.2, hit: beat('charge', 63), land: beat('charge', 66) } },
]

/** Where dust goes up: in the action's plane, and in each far layer. */
const PUFFS: Puff[] = [
  { x: SHIP1.x + SHIP1.w / 2 + SHIP1.h * 0.55, y: 0, at: B.ship1Down, size: 11, drift: 1.2, behind: true },
  { x: EMPEROR.x + EMPEROR.w / 2 + 9, y: 0, at: B.ground, size: 22, drift: 1.4, life: 5, behind: true },
  ...BLOCK_TAKEN.map((t, i): Puff => ({ x: [9031, 9054][i] + 3, y: 0, at: t, size: 7, drift: 1.5, life: 2.6 })),
]
const FAR_PUFFS: Puff[][] = FAR.map((c) => [
  { x: c.ship.x + c.ship.w / 2 + c.ship.h * 0.55, y: 0, at: c.ship.land, size: 11, drift: 1.2 },
])

/** The floor's swells and the rise in the action's plane, each with its face turned from the low western light shaded. */
function paintSwells(b: Brush): void {
  const { ctx, t } = b
  const sand = sandAt(t)
  for (const s of GROUND_SWELLS) {
    const x0 = s.x - s.w
    const x1 = s.x + s.w
    if (!inView(b.view, x0, -s.h, x1, 0.5)) continue
    const n = 32
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
    // The east face: darkest under the crest, gone by its foot.
    ctx.beginPath()
    ctx.moveTo(x1, 0.05)
    for (let i = 0; i <= n / 2; i++) {
      const x = x1 - ((x1 - s.x) * i) / (n / 2)
      ctx.lineTo(x, ground(x))
    }
    ctx.quadraticCurveTo(s.x + s.w * 0.3, -s.h * 0.2, s.x + s.w * 0.55, 0.05)
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, -s.h, 0, 0.05)
    gr.addColorStop(0, b.ca(sand.shade, 0.3))
    gr.addColorStop(1, b.ca(sand.shade, 0))
    ctx.fillStyle = gr
    ctx.fill()
  }
}

/** A brush whose colours go `d`-far toward the air: a far thing is paler, not lighter or darker. */
function hazed(b: Brush, d: number): Brush {
  const air = mix(skyOf(SKY, b.t).low, sandAt(b.t).far, 0.3)
  // In the evening the far wreckage goes into the low light: a shape on the horizon, not a thing to look at.
  const pale = Math.min(0.66, 0.12 + d / 220) + (0.92 - Math.min(0.66, 0.12 + d / 220)) * smooth(b.t, 311, 321)
  return { ...b, c: (hex) => b.c(mix(hex, air, pale)), ca: (hex, a) => b.ca(mix(hex, air, pale), a) }
}

/** Clip to what is above the sand in the action's plane (the floor, its swells, and the rise). */
function aboveSand(b: Brush): void {
  const { ctx, view } = b
  const n = 90
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
  // The last image is a place of its own: the sky and the far flat, and its own dune, trails and far wreck.
  if (t >= B.last) {
    paintEnding(b, mix(skyOf(SKY, t).low, sandAt(t).far, 0.3))
    return
  }
  const hy = horizonOf(b.view, tiltAt(t))
  const sand = sandAt(t)
  // The far layers, the furthest first; each worm's buried half under its layer's sand. The far riders keep their own
  // colour a little more than the dust round them, so they are seen on their worm's back.
  for (const c of [FAR[1], FAR[0]]) {
    layer(b, depthScale(frameH(b.view), c.d), hy, (near) => {
      const lb = hazed(near, c.d)
      const riders = hazed(near, c.d * 0.4)
      paintSmallShip(lb, c.ship.x, c.ship.h, c.ship.w, toppled(t, c.ship.hit, c.ship.land))
      lb.ctx.save()
      lb.ctx.beginPath()
      lb.ctx.rect(lb.view.x0 - 5, lb.view.y0 - 400, lb.view.w + 10, -lb.view.y0 + 400.15)
      lb.ctx.clip()
      paintFarWorm(lb, c, riders)
      lb.ctx.restore()
      for (const p of FAR_PUFFS[FAR.indexOf(c)]) paintPuff(lb, p, sand.far)
      // The near layer has its share of the storm's skirt; so far back the skirt is lost in the wall itself.
      if (c.d < 50) paintSkirt(lb)
    })
  }
  paintSwells(b)
  // The dust of the falls goes up behind the hulls, so a fallen ship stays one dark shape in it.
  for (const p of PUFFS) if (p.behind) paintPuff(b, p, sand.lit)
  paintCamp(b)
  b.ctx.save()
  aboveSand(b)
  paintLead(b)
  b.ctx.restore()
  for (const p of PUFFS) if (!p.behind) paintPuff(b, p, sand.lit)
}

/** Paul, for the camera that goes with him. */
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
    // The basin under the storm: the dark wall in the west, the camp on the pale floor in the east; as the lead worm
    // comes out of the skirt, the camera goes in to it.
    { t: FROM, cut: true, cells: 92, at: [8980, -28] },
    { t: BREACH, cells: 86, at: [8988, -26] },
    { t: B.w2 - 0.01, cells: 50, at: [8986, -15] },
    // Alongside it as it runs, the floor's swells going by under it, Paul and Chani on its back.
    { t: B.w2, cut: true, cells: 26, track: paulAt, off: [10, 3.5] },
    { t: B.close - 0.01, cells: 25, track: paulAt, off: [9.5, 3.4] },
    // Close on the two of them riding, the storm behind them.
    // (A track leads what it follows a little, so at the worm's pace the frame is set back to keep them in its middle.)
    { t: B.close, cut: true, cells: 3.7, track: paulAt, off: [-1.15, -0.4] },
    { t: B.rankA - 0.01, cells: 3.4, track: paulAt, off: [-1.05, -0.35] },
    // With the worm, ahead of it, as it goes through the first block and the first ship.
    { t: B.rankA, cut: true, cells: 30, track: paulAt, off: [11, 3] },
    { t: B.wave - 0.01, cells: 29, track: paulAt, off: [10.5, 2.8] },
    // The charge: the Fremen pouring out of the dust across the floor, the second worm beyond them; going with them.
    { t: B.wave, cut: true, cells: 25, at: [8994, -6] },
    { t: B.run - 0.01, cells: 24, at: [9020, -5.6] },
    // With the lead worm up to the great ship, and held there as it rears over it and brings it down.
    { t: B.run, cut: true, cells: 42, track: paulAt, off: [22, -3] },
    { t: B.peak, cells: 40, at: [9100, -16] },
    { t: B.crash, cells: 40, at: [9106, -15.5] },
    { t: B.cutClose - 0.01, cells: 39, at: [9113, -14.5] },
    // Close: on the worm's back as it lowers them; down; up onto the rise.
    { t: B.cutClose, cut: true, cells: 6.6, track: paulAt, off: [1.1, 0.5] },
    { t: B.dive - 0.01, cells: 6.2, track: paulAt, off: [0.9, 0.3] },
    // Wide: the worms going down, the storm settling over the field.
    { t: B.dive, cut: true, cells: 84, at: [9078, -26] },
    { t: B.last - 0.01, cells: 92, at: [9082, -28] },
    // The last image: on a dune above the field, Paul on its crest; slowly back, and still.
    ...ENDING_SHOTS,
  ],
  back: [drawing('charge', TO, paint)],
  front: [drawing('charge-skirt', TO, (b) => {
    if (b.t < FROM) return
    paintSkirt(b)
  })],
  overview: { x0: 8860, y0: -90, x1: 9180, y1: 12 },
  strikes: [
    ['the lead worm out of the storm', BREACH],
    ['alongside', B.w2],
    ['the third worm', B.w3],
    ['close on them', B.close],
    ['the first block', B.rankA],
    ['the first ship struck', B.ship1],
    ['the first ship down', B.ship1Down],
    ['the charge', B.wave],
    ['the second ship struck', SHIP2_HIT],
    ['the second ship down; up to the great ship', B.run],
    ['the peak: it rears', B.peak],
    ['down onto the ship', B.crash],
    ['the great ship down', B.ground],
    ['close', B.cutClose],
    ['the third ship struck', beat('charge', 63)],
    ['the third ship down', beat('charge', 66)],
    ['down off the worm', B.off],
    ['the worms go down', B.dive],
    ['the last beat', B.last],
    ...STRIDE_BEATS.map((t, i): [string, number] => [`stride ${i}`, t]),
  ],
}

