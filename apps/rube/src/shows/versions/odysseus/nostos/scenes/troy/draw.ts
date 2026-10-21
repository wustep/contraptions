import { curve, region, ring, smooth, standing, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import type { Placed } from '../../../../../../plan'
import type { Pt } from '../../path'
import { END } from '../../voyage'
import { brazierLight, drawBrazier, drawBucketBack, drawBucketFront, drawFires, drawStatue, drawSteps, drawTemple, drawTower, drawTownBehind } from './city'
import { FORECOURT, PLINTH } from './geo'
import { BRAZIER } from './city'
import { drawCrowd, drawTrojans, spearsInside } from './crowd'
import { drawHost } from './host'
import { drawSack as drawKilling } from './sack'
import { drawHorse, horseAt } from './horse'
import { drawGround, drawInland, drawLogs, drawRopes, drawTroyFar } from './land'
import { HATCH_OPENS, LAUNCH, PLANK_FOOT, PLANK_TOP, ROPE_ENDS, ROPE_SET, ROPE_THROWN, SLIPS, headAt, onRope, ropeLoad, statueTilt } from './plan'
import { MAT, burning, firelight, night, sun, tone } from './tone'

/**
 * Troy's drawings, in the order they stand: the land going away inland, Troy far off from the sea, the town in its
 * ranks, the ground cut open, the temple, the steps and the lower town, the gate tower, the bucket, the logs and the
 * ropes, the horse, Athena and her brazier, the fires and the torches. Over the ships, the boarding plank; over the
 * balls, the bucket's front staves and the ground under the waterline.
 */

const TROY = region(-70, -14, 14, 6, 2)

/** The horse's look at `t`: the dusk's sun on its seaward side, then the brazier's fire; its hatch, open from the night's first notes. */
function drawTheHorse(g: Paint): void {
  const { t, view } = g
  const p = horseAt(t)
  if (p.x < view.x0 - 4 || p.x > view.x1 + 4) return
  const fire = t > M.answer - 1
  const lit = fire ? Math.min(1, brazierLight(t) * 1.2 + firelight(p.x, t) * 0.6) : Math.min(1, sun(t) * 2)
  drawHorse(g, p, {
    ink: '#0E0E10',
    hide: tone(MAT.hide, t, { fire: fire ? firelight(p.x, t) * 0.25 : 0 }),
    inner: tone(MAT.inner, t, { fire: fire ? brazierLight(t) * 0.25 : 0 }),
    lightDir: 1,
    light: fire ? '#E58A45' : '#F2C48C',
    lit,
    wet: t < M.answer ? 1 - 0.4 * smooth(t, 8, 34) : 0.35,
    hatch: smooth(t, HATCH_OPENS, HATCH_OPENS + 0.45) + 0.06 * Math.max(0, ring(t, HATCH_OPENS + 0.45, 2.2, 0.3)),
    slivers: fire ? 0.25 + 0.4 * brazierLight(t) : sun(t) * 1.8,
    inside: fire ? undefined : (toLocal) => spearsInside(g, toLocal),
  })
}

/** The rope from the hatch to Athena's neck: thrown out in an arc, dipping under whoever rides it, and slipping off her. */
function drawRope(g: Paint): void {
  const { ctx, t } = g
  if (t < ROPE_THROWN || t > 140) return
  const { a, b } = ROPE_ENDS
  const color = tone('#6E5A42', t, { fire: brazierLight(t) * 0.6 })
  if (t < ROPE_SET) {
    // In the air: its end flying from the hatch to her neck, the rope trailing it in a slack curve.
    const u = smooth(t, ROPE_THROWN, ROPE_SET)
    const end: Pt = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - 0.45 * Math.sin(Math.PI * u)]
    const mid: Pt = [(a[0] + end[0]) / 2, Math.max(a[1], end[1]) + 0.15 * (1 - u)]
    curve(ctx, [a, mid, end])
    stroke(g, color, 1.7)
    return
  }
  if (t < SLIPS) {
    const load = ropeLoad(t)
    const tilt = statueTilt(t)
    const anchor: Pt = [b[0] + Math.sin(tilt) * (PLINTH.top - b[1]), b[1]]
    if (load) {
      const c = onRope(load.u, 0, load.sag)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(c[0], c[1])
      ctx.lineTo(anchor[0], anchor[1])
    } else {
      curve(ctx, [a, [(a[0] + anchor[0]) / 2, (a[1] + anchor[1]) / 2 + 0.03], anchor])
    }
    stroke(g, color, 1.7)
    // Its loop round her neck.
    ctx.beginPath()
    ctx.ellipse(anchor[0], anchor[1] + 0.02, 0.045, 0.02, 0, 0, Math.PI * 2)
    stroke(g, color, 1.5)
    return
  }
  // Slipped off: it falls and hangs from the hatch to the pavement, swinging a little and settling.
  const u = smooth(t, SLIPS, SLIPS + 0.6)
  const swing = 0.12 * Math.exp(-(t - SLIPS) / 1.2) * Math.sin((t - SLIPS) * 4.2)
  const foot: Pt = [a[0] + 0.15 + swing, FORECOURT.y]
  const end: Pt = [b[0] + (foot[0] - b[0]) * u, b[1] + (foot[1] - b[1]) * u]
  curve(ctx, [a, [(a[0] + end[0]) / 2 + 0.05, (a[1] + end[1]) / 2 + 0.08 * (1 - u)], end])
  stroke(g, color, 1.7)
}

function drawAthena(g: Paint): void {
  const h = headAt(g.t)
  drawStatue(g, { at: h.at, turn: h.turn, on: true, tilt: statueTilt(g.t) })
}

/** The plank from the sand to his ship's stern; when she is pushed off it drops and is left lying on the beach. */
function drawPlank(g: Paint): void {
  const { ctx, t, view } = g
  if (t < 118 || view.x1 < PLANK_FOOT[0] - 1) return
  const away = smooth(t, LAUNCH - 0.1, LAUNCH + 0.7)
  const top: Pt = [PLANK_TOP[0] - away * 0.6, PLANK_TOP[1] + away * 0.3]
  ctx.beginPath()
  ctx.moveTo(PLANK_FOOT[0], PLANK_FOOT[1] - 0.01)
  ctx.lineTo(top[0], top[1])
  ctx.lineTo(top[0], top[1] + 0.05)
  ctx.lineTo(PLANK_FOOT[0], PLANK_FOOT[1] + 0.04)
  ctx.closePath()
  ctx.fillStyle = tone(MAT.timber, t, { lit: 0.6 })
  ctx.fill()
  stroke(g, tone('#1E1610', t), 1.4)
}

/** The brazier's fire and the fires of the sack: drawn among the city. */
function drawSack(g: Paint): void {
  drawFires(g)
}

export function troyPieces(): { back: Placed[]; mid: Placed[]; front: Placed[] } {
  const back: Placed[] = [
    standing('troy-inland', TROY, END, (g) => {
      drawInland(g)
      drawTroyFar(g)
    }),
    standing('troy-town', TROY, END, (g) => drawTownBehind(g)),
    standing('troy-crowd', TROY, END, (g) => {
      drawCrowd(g)
      drawHost(g)
    }),
    standing('troy-ground', TROY, END, (g) => drawGround(g)),
    standing('troy-height', TROY, END, (g) => {
      drawTemple(g)
      drawSteps(g)
    }),
    // The Trojans and the Greeks in the street and on the height: in front of the houses and the steps, behind the gate
    // tower (the Greeks come in round its foot) and behind the horse and Athena.
    standing('troy-sack', TROY, END, (g) => drawKilling(g)),
    standing('troy-tower', TROY, END, (g) => {
      drawTower(g)
      drawBucketBack(g)
    }),
    standing('troy-beach', TROY, END, (g) => {
      drawLogs(g)
      drawRopes(g)
      drawTrojans(g)
    }),
    standing('troy-horse', TROY, END, (g) => {
      drawTheHorse(g)
      drawRope(g)
      drawAthena(g)
      drawBrazier(g)
      drawSack(g)
    }),
  ]
  const mid: Placed[] = [standing('troy-plank', TROY, END, (g) => drawPlank(g))]
  const front: Placed[] = [
    standing('troy-under', TROY, END, null, (g) => drawGround(g, true)),
    standing('troy-bucket', TROY, END, null, (g) => drawBucketFront(g)),
  ]
  return { back, mid, front }
}

export { BRAZIER, burning, night }
