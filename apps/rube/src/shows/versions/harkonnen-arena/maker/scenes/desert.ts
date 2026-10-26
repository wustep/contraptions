import { beatsIn } from '../music'
import { hold } from '../motion'
import { drawing, layer, noise1, poly, smooth, type Brush, type Pt } from '../paint'
import type { Scene } from '../scene'
import { T } from '../timeline'
import { SAND, depthScale, farDesert, frameH, horizonOf, paintFar, tiltOf } from '../world/land'
import type { SkyKey } from '../world/sky'
import { paintFlat, paintFunnelBack, paintFunnelFront } from './desert/ground'
import { paintDust, paintMawBack, paintMawFront } from './desert/maw'
import { CHANI_SEAT, LIFT_BEATS, PAUL_SEAT, ROCK, SWALLOW, W, XH, harvesterX } from './desert/plan'
import { paintCables, paintCarryall, paintHarvester, paintPlume } from './desert/rig'

/**
 * The deep desert, by day, on the chant and the first great blows (0 to 104.1).
 *
 *     0       two on a rock's lip, close; the camera draws back to the desert, vast, the harvester at work far off
 *    12.6     the machine close: crawling west, scoop down, its plume going up; the carryall high over it
 *    27.9     the first boom: the two of them on the rock's lip; sand runs off it; he looks east
 *    29.5     worm sign: a swell under the flat from the east, heaving on each boom
 *    44.5     the first great blow: the carryall comes down to the machine, its cables let down
 *    58.1     the second: the grapples take hold; it strains up on each beat of the drum
 *    71.7     the third: the sand goes down round the machine, a step a beat
 *    85.3     the fourth: the mouth stands up out of the funnel with the machine in it; the cables part; the carryall
 *             gets away; on every other beat of the drum the machine goes down its throat
 *    97.5     the fifth: back down, with the harvester in it, the dust going up; on 99.5 the rock again, far off
 */

const DAY: SkyKey[] = [
  // The sun is high over the deep desert, out of every frame: its heat is in the white of the sky.
  { t: 0, top: '#CDBDA6', low: '#EFDCC2', sun: { x: 0.84, y: -1, r: 0, color: '#FFF6E6' }, eclipse: 0 },
  { t: T.thumper, top: '#CBB79C', low: '#F0D8B8', sun: { x: 0.86, y: -1, r: 0, color: '#FFF3DE' }, eclipse: 0 },
]

/** The horizon's place in the frame through the scene: low in the wide shots, so the sky is most of them. */
const tilt = tiltOf([
  [0, 0.17],
  // In the close two-shot on the rock the horizon drops behind them, so they stand against the sky.
  [W.boom - 0.001, 0.17], [W.boom, 0.36], [W.sign - 0.001, 0.36], [W.sign, 0.17],
  [T.thumper, 0.17],
])
const FAR = farDesert(10)

function paintRock(b: Brush): void {
  const { ctx, view } = b
  if (view.x0 > 14 || view.x1 < -20) return
  poly(ctx, ROCK)
  ctx.fillStyle = b.c('#4E3122')
  ctx.fill()
  // Its top takes the sun, and its east cliff and the talus under it: the sun is to the east.
  poly(ctx, [[-15.2, -8.4], [-12.5, -9.3], [-8, -9.8], [-3, -10.2], [1.5, -10.0], [4.6, -10.3], [6.3, -10.05], [5.9, -9.6], [2, -9.55], [-4, -9.7], [-9, -9.2], [-13, -8.6]])
  ctx.fillStyle = b.c('#80543A')
  ctx.fill()
  poly(ctx, [[6.3, -10.05], [7.0, -8.6], [7.6, -6.0], [8.6, -4.2], [10.8, -2.2], [13.5, 0.4], [9.6, 0.4], [7.9, -2.4], [7.0, -5.0], [6.4, -8.0], [5.8, -9.7]])
  ctx.fillStyle = b.c('#6E4630')
  ctx.fill()
  // A band of harder stone across its west face.
  poly(ctx, [[-17.1, -4.8], [-6, -5.6], [5.2, -5.0], [6.95, -5.2], [6.75, -4.3], [-6, -4.7], [-17.4, -3.9]])
  ctx.fillStyle = b.c('#432A1D')
  ctx.fill()
}

/**
 * On each boom, a little sand runs off the lip under them: a thin stream down the cliff, thinning to nothing at its
 * falling head, its edges wavering, and its tail let go of the lip after a moment so the last of it falls away.
 */
function paintTrickle(b: Brush): void {
  const { ctx, t } = b
  if (t < W.boom - 0.1 || t > W.sign + 4) return
  for (const [i, at] of [W.boom, W.boom + 0.83].entries()) {
    const s = t - at
    if (s <= 0 || s > 2.6) continue
    const head = -10.0 + 3.2 * s * s
    const tail = -10.0 + 3.2 * Math.max(0, s - 0.9) ** 2
    if (head - tail < 0.05) continue
    const a = 0.6 * (1 - smooth(s, 1.6, 2.6))
    const m = 14
    const edge = (sgn: number): Pt[] => {
      const pts: Pt[] = []
      for (let j = 0; j <= m; j++) {
        const u = j / m
        const y = tail + (head - tail) * u
        const hw = 0.04 * (1 - 0.5 * u) * (1 + 0.45 * noise1((y - 6 * t) * 2, i * 7 + sgn))
        pts.push([6.03 + (y + 10) * 0.04 + sgn * hw, y])
      }
      return pts
    }
    const l = edge(-1)
    const r = edge(1)
    ctx.beginPath()
    ctx.moveTo(l[0][0], l[0][1])
    for (const p of l) ctx.lineTo(p[0], p[1])
    for (let j = m; j >= 0; j--) ctx.lineTo(r[j][0], r[j][1])
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, tail, 0, head)
    gr.addColorStop(0, b.ca(SAND.lit, a))
    gr.addColorStop(0.6, b.ca(SAND.lit, a * 0.5))
    gr.addColorStop(1, b.ca(SAND.lit, 0))
    ctx.fillStyle = gr
    ctx.fill()
  }
}

/** Everything that happens at the machine, in its order front to back. */
function paintEvent(b: Brush): void {
  paintFunnelBack(b, b.t)
  paintMawBack(b, b.t)
  paintHarvester(b, b.t)
  paintPlume(b, b.t)
  paintCables(b, b.t)
  paintCarryall(b, b.t)
  paintMawFront(b, b.t)
  paintFunnelFront(b, b.t)
  paintDust(b, b.t)
}

/**
 * Seen from the rock, the machine is far back on the flat: drawn in a layer a third the size of the action's plane, east
 * of the rock, so it sits small under its tall plume behind the two of them, and at the end the mouth's going down and
 * the dust are seen there.
 */
const FAR_D = 60
const FAR_X = 82
function paintFarOff(b: Brush, tl: number): void {
  layer(b, depthScale(frameH(b.view), FAR_D), horizonOf(b.view, tl), (lb) => {
    const { ctx, view } = lb
    ctx.save()
    ctx.translate(FAR_X - XH, 0)
    paintEvent(lb)
    ctx.restore()
    // Its own stretch of the flat, in front of whatever has gone down into it.
    ctx.fillStyle = lb.c(SAND.lit)
    ctx.fillRect(view.x0 - 1, 0, view.w + 2, Math.max(1, view.y1) + 1)
  })
}

/** The drum's beats while the sand goes down: the funnel takes a step on each. */
const STEPS = beatsIn('phrases', W.sink + 0.05, W.maw).map((x) => x.t)

export const desert: Scene = {
  key: 'desert',
  from: T.open,
  to: T.thumper,
  // They watch the machine; on the first boom he looks up the flat to the east, where it comes from.
  paul: [hold(PAUL_SEAT, T.open, W.boom + 0.15, 0), hold(PAUL_SEAT, W.boom + 0.15, W.maw, -0.32), hold(PAUL_SEAT, W.maw, T.thumper, 0.05)],
  chani: [hold(CHANI_SEAT, T.open, W.sign, 0), hold(CHANI_SEAT, W.sign, T.thumper, -0.2)],
  shots: [
    // Close on the two of them on the lip, drawing back until the desert is the frame, the machine far off under its
    // plume, and they are two specks on the rock.
    { t: W.open, cells: 4.6, at: [PAUL_SEAT[0] - 0.75, PAUL_SEAT[1] - 0.55] },
    { t: W.machine - 0.01, cells: 44, at: [14, -13.5] },
    // The machine close: low on its scoop biting the sand, craning up and back over the chant to the whole of it and its
    // plume going up.
    { t: W.machine, cut: true, cells: 11, at: [harvesterX(W.machine) - 7.5, -3.2] },
    { t: W.boom - 0.01, cells: 27, at: [harvesterX(W.boom) + 1, -11.5] },
    // The two of them on the lip, close.
    { t: W.boom, cut: true, cells: 4.6, at: [CHANI_SEAT[0] + 0.7, CHANI_SEAT[1] - 0.25] },
    { t: W.sign - 0.01, cells: 4.3, at: [CHANI_SEAT[0] + 0.75, CHANI_SEAT[1] - 0.2] },
    // Worm sign: the flat east of the machine, the swell coming in.
    // Low over the flat east of the machine and held still, so the swell's crest stands against the sky and it is seen to
    // travel: in from the east edge, across a desert that does not move, heaving on each boom.
    { t: W.sign, cut: true, cells: 58, at: [188, -10] },
    { t: W.alarm - 0.01, cells: 55, at: [184, -9.5] },
    // The alarm: the carryall coming down to the machine.
    { t: W.alarm, cut: true, cells: 46, at: [XH + 3, -20] },
    { t: W.lock - 0.01, cells: 40, at: [XH + 1, -16] },
    // Held: close enough to see the cables take the weight, and pushing in as it strains on each beat of the drum.
    { t: W.lock, cut: true, cells: 30, at: [XH, -11.5] },
    { t: W.sink - 0.01, cells: 23, at: [XH, -10.2] },
    // The sand going down: a slow push in on the machine in its funnel, the carryall straining over it.
    { t: W.sink, cut: true, cells: 50, at: [XH - 2, -12] },
    { t: W.maw - 0.01, cells: 34, at: [XH, -9.5] },
    // The mouth: wider, as it breaks the sand round the machine; craning up and back as it stands, then a slow push in
    // on it while the machine goes down its throat and it stands open.
    { t: W.maw, cut: true, cells: 46, at: [XH - 2, -11] },
    { t: W.maw + 6.5, cells: 54, at: [XH + 1, -17] },
    { t: W.gone - 0.01, cells: 46, at: [XH + 1, -18] },
    // The fifth blow: it goes straight back down with the machine in it, the dust going up.
    { t: W.after - 0.01, cells: 48, at: [XH + 1, -12.5] },
    // Gone: the desert again from far off, as at first.
    { t: W.after, cut: true, cells: 44, at: [14, -13.5] },
    { t: T.thumper, cells: 41, at: [14.5, -13] },
  ],
  back: [
    drawing('desert', 400, (b) => {
      if (b.t >= T.thumper) return
      paintFar(b, DAY, FAR, tilt(b.t))
      // In the wides from the rock, the machine is a long way off: the same machine, drawn far back.
      if (b.t < W.machine || b.t >= W.after) paintFarOff(b, tilt(b.t))
      paintFlat(b, b.t)
      if (b.t >= W.machine && b.t < W.after) paintEvent(b)
      paintRock(b)
    }),
  ],
  front: [
    drawing('desert-trickle', 400, (b) => {
      if (b.t >= T.thumper) return
      paintTrickle(b)
    }),
  ],
  overview: { x0: -40, y0: -60, x1: 160, y1: 10 },
  strikes: [
    ['the machine', W.machine],
    ['the first boom', W.boom],
    ['worm sign', W.sign],
    ['the alarm', W.alarm],
    ['the grapples', W.lock],
    ...LIFT_BEATS.map((t, i): [string, number] => [`heave ${i}`, t]),
    ['the sand goes down', W.sink],
    ...STEPS.map((t, i): [string, number] => [`step ${i}`, t]),
    ['the mouth', W.maw],
    ...SWALLOW.map((t, i): [string, number] => [`down its throat ${i}`, t]),
    ['swallowed', W.gone],
    ['the rock again', W.after],
  ],
}
