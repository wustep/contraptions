import type p5 from 'p5'
import { laneAt, mixHex, type Lane, type Pt } from '../../../../../parts'
import { drawCalcifer, drawTurnip, drawWings } from '../cast'
import { alpha, box, carried, frame, hash, part, smooth, type Company, type PartShot } from '../kit'
import { CASTLE, puff, drawLeg } from '../wastes/castle'
import { CALCIFER, HOWL, HOWL_BIRD, WASTES } from '../worlds'
import { COLLAPSE_HITS, drawCollapse } from './plank-collapse'
import { drawBack, drawGround, STONES } from './plank-land'
import {
  BUCKLE, BX0, BX_IMP, c, calciferAt, deck, DECK, DOWN, drive, FOOTFALLS, FREE, GO, ground, HEART, HOWL_IN, HOWL_LAND,
  howlAt, IMPACT, LAND, legAt, LEGS, LIFT_OUT, onDeck, PUT, sophieAt, STIR, T0, T1, turnipAt, wingsAt, YG,
} from './plank-rig'

/**
 * The castle falls apart; the plank on legs; the heart given back; the slide to the cliff; the cadenza
 * (243.635 → 292.734): the plank builder's.
 *
 * On the climax she is standing where the hearth was, holding Calcifer, and without its fire the castle comes down
 * round her, a piece a bar (`plank-collapse.ts`), until nothing is left but the floor she stands on: one plank on
 * four legs. She sets Calcifer back in his grate at its front and he drives it: a boiler pipe to a cylinder under
 * the boards, a rod to a crank at each near hip, a stroke a bar. It runs across the wastes, a pair of feet down on
 * every downbeat. On the accents Howl the bird comes down out of the sky, spent, onto its prow, on the loudest note.
 * She lifts Calcifer out (the legs falter and stumble to a stop at the brow), carries him along the deck to Howl,
 * raises him, and on 272.370 gives him back his heart: Calcifer goes into his chest, Howl's colour comes back and
 * his wings fold away, and Calcifer comes out again free, a small star, and flies up out of sight. Her curse breaks
 * (the show turns her bright silver). The plank, its fire gone, sits down on its folded legs and slides down the
 * long slope, bumping over the stones on the bars, onto the ledge, toward the edge; Turnip Head, at the brink,
 * braces on his pole and stops it (283.353). The cadenza is stillness: the plank at rest at the edge, the little
 * star come back to turn in the sky over them on the high notes, Howl stirring beside her.
 *
 * The part's frame: Sophie comes in at (-0.5, 0) at rest; the wastes' ground under the castle is `YG` below. Its
 * origin is `PLANK_AT` in the wastes, far from the hills. Its motion is all in `plank-rig.ts`.
 */

/** Where the collapse leg starts in the wastes world: far from the hills, so the two castles are never both in view. */
export const PLANK_AT: Pt = [400, 0]

/**
 * How the plank ends (the part's frame, cells), for the finale to build the castle again on it: the deck's top from
 * its back end to its front, the ground under it, the cliff's edge, where Sophie and Howl are, where Turnip Head
 * stands (the foot of his pole) and where the little star is turning.
 */
export const PLANK_END = (() => {
  const d = deck(T1)
  const back = onDeck(T1, DECK.back, 0, d)
  const front = onDeck(T1, DECK.front, 0, d)
  return {
    deck: { x0: back[0], x1: front[0], y: back[1] },
    /** The deck's middle (u = 0), on the boards; the castle's own origin x is here. */
    middle: [d.x, d.y] as Pt,
    ground: LAND.ledge,
    edge: LAND.edge,
    sophie: sophieAt(T1),
    howl: howlAt(T1),
    turnip: turnipAt(T1).at,
    star: calciferAt(T1).at,
    /** The legs' hips (deck cells) and where the sat legs' feet are, so the finale can stand them up again. */
    hips: LEGS.map((l) => [l.u, l.v] as Pt),
  }
})()

/**
 * What of this part the stage draws after its slot, while the finale has the same place: the land (yes) and the
 * plank at rest at the edge, Turnip Head and the little star. The finale may turn any of them off (e.g.
 * `PLANK_AFTER.plank = false` once it draws the castle round the plank, `PLANK_AFTER.star = false` when Calcifer comes
 * back down).
 */
export const PLANK_AFTER = { land: true, plank: true, turnip: true, star: true }

/* ------------------------------------------------------------------ drawing the plank */

const IRON = WASTES.iron
const IRON_DARK = WASTES.ironDark

/** The deck and its keel, the engine under it, drawn in deck cells. */
export function drawDeck(p: p5, k: number, W: number, ink: string) {
  const X = (v: number) => v * k
  p.push()
  p.strokeJoin(p.ROUND)
  // The keel: an iron beam under the boards, the hips in it.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(IRON_DARK)
  p.beginShape()
  p.vertex(X(DECK.back + 0.55), X(DECK.boards))
  p.vertex(X(DECK.front - 0.45), X(DECK.boards))
  p.vertex(X(DECK.front - 0.75), X(DECK.keel + 0.12))
  p.vertex(X(DECK.back + 0.85), X(DECK.keel + 0.12))
  p.endShape(p.CLOSE)
  // The boards: the room's floor, broken off at both ends.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(WASTES.wood)
  p.beginShape()
  p.vertex(X(DECK.back), X(0))
  p.vertex(X(DECK.front), X(0))
  p.vertex(X(DECK.front + 0.12), X(0.07))
  p.vertex(X(DECK.front - 0.05), X(0.12))
  p.vertex(X(DECK.front + 0.08), X(DECK.boards))
  p.vertex(X(DECK.back + 0.1), X(DECK.boards))
  p.vertex(X(DECK.back - 0.16), X(0.14))
  p.vertex(X(DECK.back + 0.02), X(0.09))
  p.vertex(X(DECK.back - 0.1), X(0.03))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.5)
  for (let u = DECK.back + 0.9; u < DECK.front - 0.3; u += 1.15) p.line(X(u), X(0.03), X(u), X(DECK.boards - 0.03))
  p.line(X(DECK.back + 0.1), X(0.11), X(DECK.front - 0.1), X(0.11))
  p.pop()
}

/**
 * The engine: Calcifer's grate feeds two brass steam pipes that run along the keel's face to the near hips, and on
 * into the legs' own knee pistons (the castle's legs). Drawn in deck cells.
 */
export function drawPipes(p: p5, k: number, W: number, ink: string, heat: number) {
  const X = (v: number) => v * k
  const y = DECK.keel - 0.2
  p.push()
  p.noFill()
  p.strokeJoin(p.ROUND)
  const brass = mixHex(WASTES.brass, CALCIFER.body, 0.25 * heat)
  for (const [col, w] of [[ink, 2.8], [brass, 1.6]] as [string, number][]) {
    p.stroke(col)
    p.strokeWeight(W * w)
    // Down from the grate over the boards' edge.
    p.beginShape()
    p.vertex(X(DECK.grate + 0.22), X(-0.05))
    p.bezierVertex(X(DECK.grate + 0.42), X(0.02), X(DECK.grate + 0.3), X(y), X(DECK.grate), X(y))
    p.endShape()
    // Along the keel either way to the hips.
    p.line(X(LEGS[1].u + 0.55), X(y), X(LEGS[0].u - 0.55), X(y))
  }
  // A valve at the grate's foot, and collars where the pipes go into the hips.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(WASTES.brass)
  p.rect(X(DECK.grate - 0.12), X(y - 0.1), X(0.24), X(0.2), X(0.04))
  p.fill(IRON_DARK)
  for (const u of [LEGS[1].u + 0.55, LEGS[0].u - 0.55]) p.rect(X(u - 0.07), X(y - 0.09), X(0.14), X(0.18), X(0.03))
  p.pop()
}

/** Where a leg's knee is (the castle's own bend: backwards), for the steam out of it. */
function kneeOf(hip: Pt, foot: Pt): Pt {
  const th = CASTLE.thigh
  const sh = CASTLE.shin
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const d = Math.max(Math.abs(th - sh) + 0.01, Math.min(th + sh - 0.01, Math.hypot(dx, dy)))
  const a = Math.atan2(dy, dx)
  const off = Math.acos(Math.max(-1, Math.min(1, (th * th + d * d - sh * sh) / (2 * th * d))))
  return [hip[0] + Math.cos(a + off) * th, hip[1] + Math.sin(a + off) * th]
}

/** Calcifer's grate at the plank's front: a squat iron basket with a brass rim, embers in it while he is. */
export function drawGrate(p: p5, k: number, W: number, ink: string, t: number, lit: number, weak: number) {
  const X = (v: number) => v * k
  const u = DECK.grate
  p.push()
  p.strokeJoin(p.ROUND)
  if (lit > 0.01) {
    const col = mixHex(CALCIFER.body, CALCIFER.weak, weak)
    p.noStroke()
    for (let i = 0; i < 3; i++) {
      p.fill(alpha(p, i % 2 ? CALCIFER.edge : col, 0.9 * lit))
      p.ellipse(X(u - 0.13 + i * 0.13), X(-0.19), X(0.16 + 0.03 * Math.sin(t * 5 + i)), X(0.08))
    }
  }
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(IRON_DARK)
  p.beginShape()
  p.vertex(X(u - 0.3), X(-0.21))
  p.vertex(X(u + 0.3), X(-0.21))
  p.vertex(X(u + 0.22), X(-0.02))
  p.vertex(X(u - 0.22), X(-0.02))
  p.endShape(p.CLOSE)
  p.fill(WASTES.brass)
  p.rect(X(u - 0.33), X(-0.25), X(0.66), X(0.06), X(0.03))
  p.pop()
}

/* ------------------------------------------------------------------ the part */

interface PlankState {
  begin: number
}

export const plank = part<PlankState>(
  {
    name: 'plank',
    draw: (p, s, c0) => {
      const { k, weight: W, ink } = c0
      const t = s.begin + c0.t
      if (t < T0 - 1) return
      const f = frame(p, k)
      p.push()
      p.rectMode(p.CORNER)
      if (PLANK_AFTER.land || t <= T1) {
        drawBack(p, k, W, ink, f)
        drawGround(p, k, W, ink, f)
      }
      const plankOn = t <= T1 || PLANK_AFTER.plank
      const d = deck(t)
      const legs = LEGS.map((_, i) => legAt(t, i, d))
      const sit = smooth(t, BUCKLE, DOWN)
      const legCol = (far: boolean) => (far ? mixHex(IRON_DARK, WASTES.night, 0.2) : IRON)
      if (plankOn) {
        // The far legs, behind everything of the castle.
        LEGS.forEach((leg, i) => {
          if (leg.far) drawLeg(p, k, W, ink, legs[i].hip, legs[i].foot, legCol(true), Math.max(legs[i].air * 0.8, sit * 0.35))
        })
      }
      // The wreck on the moor: gone once the finale calls its pieces home (far out of shot by then).
      if (t <= T1 || PLANK_AFTER.plank) drawCollapse(p, k, W, ink, t, f)
      if (plankOn) {
        LEGS.forEach((leg, i) => {
          if (!leg.far) drawLeg(p, k, W, ink, legs[i].hip, legs[i].foot, legCol(false), Math.max(legs[i].air * 0.8, sit * 0.35))
        })
        p.push()
        p.translate(d.x * k, d.y * k)
        p.rotate(d.rot)
        drawDeck(p, k, W, ink)
        drawPipes(p, k, W, ink, drive(t))
        p.pop()
        p.push()
        p.translate(d.x * k, d.y * k)
        p.rotate(d.rot)
        const cal = calciferAt(t)
        const inGrate = t >= PUT && t < LIFT_OUT + 0.1
        drawGrate(p, k, W, ink, t, inGrate ? 1 : 0.15 + 0.2 * smooth(t, T0, T0 + 1), cal.weak)
        p.pop()
        steamAndDust(p, k, t, legs)
      }
      // Calcifer.
      const cal = calciferAt(t)
      if (cal.shown && (t <= T1 || PLANK_AFTER.star)) {
        if (cal.star > 0) drawStar(p, k, t, cal.at, cal.star)
        p.push()
        p.translate(cal.at[0] * k, cal.at[1] * k)
        drawCalcifer(p, k, W, ink, { t, size: cal.size, weak: cal.weak, look: cal.look, lean: cal.lean, mouth: cal.mouth, shut: cal.shut })
        p.pop()
      }
      // The heart: a warm light through Howl as Calcifer goes into him, and a flare as he comes out free.
      const hu = t - HEART
      if (hu > -0.05 && hu < 2) {
        const [hx, hy] = howlAt(t)
        puff(p, k, hx, hy, 0.75 + 0.5 * Math.min(1, hu + 0.05), CALCIFER.core, 0.32 * Math.exp(-Math.max(0, hu) / 0.55) * smooth(hu, -0.05, 0.02))
      }
      const fu = t - FREE
      if (fu > 0 && fu < 1) {
        const [hx, hy] = howlAt(FREE)
        puff(p, k, hx, hy - 0.2, 0.5 + fu * 0.6, CALCIFER.body, 0.3 * Math.exp(-fu / 0.25))
      }
      // Howl's wings, under his ball.
      if (t >= HOWL_IN && t <= T1 + 0.5) {
        const w = wingsAt(t)
        if (w.spread > 0.01) {
          const [hx, hy] = howlAt(t)
          p.push()
          p.translate(hx * k, hy * k)
          drawWings(p, k, W, ink, { t, spread: w.spread, flap: Math.asin(Math.max(-1, Math.min(1, w.beat))), heading: w.heading })
          p.pop()
        }
      }
      // Turnip Head at the edge.
      if (PLANK_AFTER.turnip || t <= T1) {
        const th = turnipAt(t)
        if (th.at[0] > f.x0 - 2 && th.at[0] < f.x1 + 2) {
          p.push()
          p.translate(th.at[0] * k, th.at[1] * k)
          drawTurnip(p, k, W, ink, { t, hop: th.hop, height: th.height, lean: th.lean })
          p.pop()
        }
      }
      pebbles(p, k, W, ink, t)
      p.pop()
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const segs = carried((u) => sophieAt(slot.begin + u), 0, dur, Math.round(dur * 40))
    const lane: Lane = { segs, fire: 0 }
    const end = laneAt(lane, dur)
    const howl: Company = {
      who: 'howl',
      from: HOWL_IN,
      to: slot.end,
      at: (t) => {
        const [x, y] = howlAt(t)
        return { x, y, color: mixHex(HOWL_BIRD, HOWL, smooth(t, HEART, HEART + 1.5)) }
      },
    }
    // The stones on the slope, where it bumps.
    STONES.length = 0
    for (let n = 31; n <= 36; n++) {
      const tf = c(n)
      const x = legAt(tf, 0).foot[0] + 0.35
      STONES.push({ x, r: 0.16 + 0.05 * (n % 3) })
    }
    return {
      cells: box(-30, -30, LAND.edge + 30, YG + 24, 2),
      exit: [end.x + 0.5, end.y] as Pt,
      lane,
      state: { begin: slot.begin },
      company: [howl],
    }
  },
  (slot) => {
    const her0 = sophieAt(T0)
    const end = sophieAt(T1)
    const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
    const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
    const lock: Pt = [BX_IMP + 3.1, end[1] - 0.85]
    return [
      // The collapse: out from her and him to the whole castle coming down, then in again as the plank stands.
      hold(244.35, 4.8, [her0[0] + 0.25, her0[1] - 0.9]),
      hold(247.4, 25, [BX0 - 1.5, -2.8]),
      hold(250.7, 22, [BX0 + 0.5, -1.5]),
      hold(252.3, 14, [BX0 + 2, 2.8]),
      // The run: with it, ahead of it, low enough for the feet.
      follow(253.8, 11.5, [2.4, 2.8]),
      follow(257.5, 10.5, [2.7, 2.6]),
      follow(262.3, 10.5, [2.6, 2.5]),
      // Howl out of the sky: up to meet him; then in on the two of them.
      follow(264.4, 11.5, [1.6, 0.3]),
      follow(266.4, 8.5, [2.3, 0.8]),
      follow(269.2, 6.0, [1.6, 0.2]),
      follow(271.4, 4.0, [0.6, -0.35]),
      follow(272.8, 3.7, [0.45, -0.5]),
      follow(274.4, 5.2, [0.8, -0.4]),
      // The slide: with it, then a locked-off wide it crosses into, and a slow push in through the cadenza.
      follow(276.9, 7.5, [2.2, -0.4]),
      follow(279.6, 8.2, [2.8, -0.3]),
      hold(281.3, 8.8, lock),
      hold(285.9, 8.6, [lock[0] + 0.1, lock[1] + 0.05]),
      hold(slot.end, 5, [end[0] + 0.4, end[1] - 0.8]),
    ]
  },
)

/* ------------------------------------------------------------------ steam, dust and pebbles */

/** Steam from the cylinder on every footfall while Calcifer drives it; dust where the feet land and where it slides. */
function steamAndDust(p: p5, k: number, t: number, legs: { hip: Pt; foot: Pt }[]) {
  const dr = drive(t)
  const dustCol = mixHex(WASTES.rock, WASTES.mist, 0.5)
  for (const ff of FOOTFALLS) {
    const a = t - ff.t
    if (a < 0 || a > 1.6) continue
    const leg = LEGS[ff.leg]
    // Dust off the foot.
    for (let j = 0; j < 3; j++) {
      const side = j % 2 ? 1 : -1
      puff(p, k, ff.x + 0.4 + side * (0.3 + a * (0.9 + j * 0.3)), ground(ff.x) - 0.12 - a * 0.3 * (1 + j * 0.3), 0.28 + a * 0.7, dustCol, 0.38 * (1 - a / 1.6) * (leg.far ? 0.55 : 1), 0.6)
    }
    // Steam out of its knee as it lands, trailing back: Calcifer's heat, driving it.
    if (!leg.far && dr > 0.02 && a < 1.2) {
      const [kx, ky] = kneeOf(legs[ff.leg].hip, legs[ff.leg].foot)
      for (let j = 0; j < 3; j++) {
        const g = a * (0.8 + 0.3 * j)
        puff(p, k, kx - 0.3 - g * 1.6 - j * 0.15, ky - 0.15 - g * 1.0, 0.25 + g * 0.7, WASTES.steam, 0.55 * dr * (1 - a / 1.2) * (1 - j * 0.25))
      }
    }
  }
  // The first stroke: a great breath of steam out of both near knees.
  const a0 = t - GO
  if (a0 > 0 && a0 < 1.8) {
    for (const i of [0, 1]) {
      const [kx, ky] = kneeOf(legs[i].hip, legs[i].foot)
      puff(p, k, kx - a0 * 0.8, ky - 0.2 - a0 * 0.8, 0.4 + a0 * 1.0, WASTES.steam, 0.6 * (1 - a0 / 1.8))
    }
  }
  // Sat down: a thump of dust along its length; then sliding, a trail of it from under the legs.
  const da = t - DOWN
  if (da > 0 && da < 2.5) {
    for (let i = 0; i < 6; i++) {
      const [x] = onDeck(DOWN, -4.6 + i * 1.8, 0, deck(DOWN))
      puff(p, k, x + (i - 2.5) * da * 0.25, ground(x) - 0.2 - da * 0.35, 0.5 + da * 0.8, dustCol, 0.4 * Math.exp(-da / 0.9), 0.7)
    }
  }
  if (t > DOWN + 0.2 && t < IMPACT + 2.5) {
    for (let j = 0; j < 12; j++) {
      const s = t - j * 0.16
      if (s < DOWN + 0.35 || s > IMPACT) continue
      const age = t - s
      const [x] = onDeck(s, LEGS[1].u - 3.8, 0, deck(s))
      const speed = Math.abs(deck(s + 0.05).x - deck(s - 0.05).x) / 0.1
      puff(p, k, x - age * 0.4, ground(x) - 0.15 - age * 0.25, 0.3 + age * 0.55, dustCol, 0.3 * Math.min(1, speed / 2) * Math.max(0, 1 - age / 1.9), 0.65)
    }
  }
  // The stop: dust thrown up against him, off the lip.
  const ia = t - IMPACT
  if (ia > 0 && ia < 2.4) {
    for (let i = 0; i < 4; i++) {
      puff(p, k, LAND.th - 0.5 - i * 0.4 + ia * 0.2 * i, LAND.ledge - 0.3 - ia * (0.4 + 0.2 * i), 0.35 + ia * 0.7, dustCol, 0.42 * Math.exp(-ia / 0.8), 0.8)
    }
  }
}

/** On the stop, a few stones knocked off the lip go over the edge and down the cliff: the drop, shown. */
function pebbles(p: p5, k: number, W: number, ink: string, t: number) {
  const a = t - IMPACT
  if (a < 0 || a > 3) return
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(WASTES.rockDark)
  const sizes = [0.13, 0.08, 0.18]
  sizes.forEach((r, i) => {
    const vx = 0.5 + 0.4 * hash(i, 31)
    const vy = -0.8 - 0.6 * hash(i, 32)
    const x = LAND.edge - 0.1 + vx * a
    const y = LAND.ledge - LAND.lip - 0.05 + vy * a + 0.5 * 9 * a * a
    p.push()
    p.translate(x * k, y * k)
    p.rotate(a * (3 + i))
    p.beginShape()
    for (let j = 0; j < 5; j++) {
      const an = (j / 5) * Math.PI * 2
      const rr = r * (0.75 + 0.35 * hash(i, j, 33))
      p.vertex(Math.cos(an) * rr * k, Math.sin(an) * rr * 0.8 * k)
    }
    p.endShape(p.CLOSE)
    p.pop()
  })
  p.pop()
}

/** Calcifer as a star: fine rays that flare on the cadenza's high notes (and a soft light), never a disc. */
const TWINKLES = [286.383, 286.923, 287.364, 288.943, 289.814, 291.677]
export function drawStar(p: p5, k: number, t: number, at: Pt, star: number) {
  let flare = 0.35
  for (const tw of TWINKLES) {
    const u = t - tw
    if (u >= 0) flare = Math.max(flare, 0.35 + 0.65 * Math.exp(-u / 0.5))
  }
  const [x, y] = at
  puff(p, k, x, y - 0.12, 0.45 + 0.25 * flare, CALCIFER.core, 0.22 * star * flare)
  p.push()
  p.noStroke()
  p.translate(x * k, (y - 0.12) * k)
  p.rotate(0.3 * Math.sin(t * 0.8))
  for (let i = 0; i < 4; i++) {
    const len = (i % 2 ? 0.26 : 0.4) * (0.6 + 0.6 * flare) * star
    p.fill(alpha(p, CALCIFER.core, 0.85 * star))
    p.rotate(Math.PI / 2)
    p.triangle(-0.02 * k, 0, 0.02 * k, 0, 0, -len * k)
  }
  p.pop()
}

/** Every strike of this part, in show seconds. */
export const PLANK_HITS: number[] = (() => {
  const hits = new Set<number>(COLLAPSE_HITS)
  // Calcifer set back in the grate; the first stroke.
  hits.add(PUT)
  hits.add(GO)
  // Every footfall of the run, a pair a bar (10 to 26).
  for (const ff of FOOTFALLS) hits.add(ff.t)
  // Howl: his last wingbeats, down on the prow, slumped.
  for (const t of [264.649, 265.427, HOWL_LAND, c(21, 2)]) hits.add(t)
  // She lifts Calcifer out; she raises him; the heart; he comes out free.
  for (const t of [LIFT_OUT, c(26, 2), c(26, 3), HEART, FREE]) hits.add(t)
  // The legs give; it sits down; over the stones; stopped.
  for (let n = 28; n <= 37; n++) if (n !== 29) hits.add(c(n))
  // Turnip Head's hops land, and he plants his pole.
  for (const n of [33, 34, 35, 36]) hits.add(c(n, 3))
  // The cadenza: the star turns on the high notes; Howl stirs.
  for (const t of TWINKLES) hits.add(t)
  hits.add(STIR)
  return [...hits].sort((a, b) => a - b)
})()

