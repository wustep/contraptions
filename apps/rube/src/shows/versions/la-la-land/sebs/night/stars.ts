import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { box, carried, glow, knock, part, rgba, smooth, type PartShot } from '../kit'
import { MIA, NIGHT_MAT, SEB } from '../worlds'
import {
  APEX,
  centre,
  DARK,
  DIP,
  FLY_SET,
  FLY_SKY,
  groundUnder,
  KINDLE_HITS,
  LAST,
  LIFT,
  MIA_SPAN,
  miaAt,
  NIGHT_FROM,
  POLE,
  QUIET,
  scatter,
  sebAt,
  skyAngle,
  UPSTAGE,
} from './painted-waltz'
import { lampLight } from './stars-sky'

/**
 * The stars: the painted Paris flies out, and they are alone on a dark floor
 * under a sky that turns with them.
 *
 * On the stroke that starts this part the painted sky takes up on its lines
 * (the painted part draws the set going); on the next the rest of Paris goes
 * after it, and the lamps' light with it, and the wet cobbles are dark glass.
 * They push off it and float up (G_FLOAT) to hang in the sky, and the circle
 * they turn on stands up to face us. The melody lights a star round them on
 * each of its notes. The waltz grows: they climb and turn faster and wider,
 * the sky geared to them wheels until the stars draw arcs; a breath of quiet;
 * then the last swell lifts them to the pole of the sky, spinning, and on its
 * top he dips her and everything stops with them, the stars flaring. Held.
 * On the cue's last note she comes up out of the dip to him and they touch,
 * and the lights go.
 *
 * The floor holds all of it: the sky upside down, and the two of them.
 *
 * Its frame is laid at the painted part's exit; everything is drawn in the
 * NIGHT frame, moved by that one offset (`o`).
 */

/* ------------------------------------------------------------------ the stars they light */

interface Kindled {
  at: number
  /** Where it is in the sky's own turning frame, from the pole. */
  local: Pt
  size: number
  color: string
}

const rot = (q: Pt, a: number): Pt => [q[0] * Math.cos(a) - q[1] * Math.sin(a), q[0] * Math.sin(a) + q[1] * Math.cos(a)]
const inSky = (local: Pt, T: number): Pt => {
  const q = rot(local, skyAngle(T))
  return [POLE[0] + q[0], POLE[1] + q[1]]
}

/**
 * The notes' stars make a crown round the pole of the sky, which is where the
 * two of them are at the top of the swell. Each is placed by where the sky's
 * turning will have carried it by then, spread round by the golden angle,
 * and tried round that until it is lit in the picture near them, stays
 * clear of them to the end, and is not crowded by the others.
 */
export const KINDLED: Kindled[] = (() => {
  const out: Kindled[] = []
  const radii = [1.5, 1.75, 4.1, 4.5, 2.0]
  KINDLE_HITS.forEach((at, i) => {
    const c0 = centre(at)
    let chosen: Pt | null = null
    let fallback: { local: Pt; score: number } | null = null
    for (let j = 0; j < 36 && !chosen; j++) {
      const a = i * 2.39996 + 0.4 + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.17
      for (const r0 of radii) {
        const r = r0 + 0.12 * scatter(i, 200)
        const local = rot([r * Math.cos(a), r * Math.sin(a)], -skyAngle(DIP))
        const born = inSky(local, at)
        // In the picture when lit: near them, and a little above the floor's edge.
        let score = Math.min(3.1 - Math.abs(born[1] - c0[1]), 5.2 - Math.abs(born[0] - c0[0]))
        for (let t = at; t < DARK[1]; t += 0.1) {
          const q = inSky(local, t)
          const m = centre(t)
          score = Math.min(score, Math.hypot(q[0] - m[0], q[1] - m[1]) - 1.0, UPSTAGE - 1.2 - q[1])
        }
        for (const o of out) {
          for (const t of [at, DIP]) {
            const q = inSky(local, t)
            const w = inSky(o.local, t)
            score = Math.min(score, Math.hypot(q[0] - w[0], q[1] - w[1]) - 1.1)
          }
        }
        if (score > 0) {
          chosen = local
          break
        }
        if (!fallback || score > fallback.score) fallback = { local, score }
      }
    }
    const tone = scatter(i, 201)
    out.push({ at, local: chosen ?? fallback!.local, size: 0.028 + 0.016 * scatter(i, 202), color: tone < 0.45 ? NIGHT_MAT.gold : NIGHT_MAT.white })
  })
  return out
})()

/** A lit star: a point with four fine spikes that flare on its note and settle, and flare again at the top of the swell. */
function star(p: p5, k: number, x: number, y: number, s: Kindled, T: number, mirror: boolean): void {
  const since = T - s.at
  if (since < 0) return
  const lit = smooth(since, 0, 0.05)
  const flare = knock(since, 0.28) + 0.9 * knock(T - DIP, 0.45)
  const tw = 0.85 + 0.15 * Math.sin(T * 2.3 + s.at)
  const m = mirror ? 0.3 : 1
  const ctx = p.drawingContext as CanvasRenderingContext2D
  glow(p, k, x, y, 0.28 + 0.5 * flare, s.color, (0.22 + 0.35 * flare) * lit * m)
  const spike = (0.14 + 0.55 * flare) * tw * (mirror ? 0.6 : 1)
  const w = 0.012 + 0.01 * flare
  ctx.fillStyle = rgba(s.color, 0.9 * lit * m)
  ctx.beginPath()
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
    ctx.moveTo((x + dy * w) * k, (y - dx * w) * k)
    ctx.lineTo((x + dx * spike) * k, (y + dy * spike) * k)
    ctx.lineTo((x - dy * w) * k, (y + dx * w) * k)
  }
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x * k, y * k, (s.size + 0.012 * flare) * k, 0, Math.PI * 2)
  ctx.fill()
}

/* ------------------------------------------------------------------ the floor's reflections of them */

/** A ball in the floor: upside down about the floor under it, dimmer; smeared long on wet cobbles, sharp on the glass. */
function reflection(p: p5, k: number, ink: string, weight: number, color: string, at: Pt, ground: number, T: number): void {
  const y = 2 * ground - at[1]
  const high = ground - R - at[1]
  const wet = lampLight(T)
  const a = (0.34 - 0.14 * smooth(high, 0, 9)) * (1 - 0.25 * wet)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const stretch = 1 + 0.9 * wet
  ctx.save()
  ctx.beginPath()
  ctx.rect((at[0] - 1) * k, ground * k, 2 * k, 30 * k)
  ctx.clip()
  ctx.fillStyle = rgba(color, a)
  ctx.beginPath()
  ctx.ellipse(at[0] * k, (y + (stretch - 1) * R * 0.6) * k, R * k, R * stretch * k, 0, 0, Math.PI * 2)
  ctx.fill()
  if (wet < 0.98) {
    ctx.strokeStyle = rgba(ink, 0.22 * (1 - wet) * (a / 0.34))
    ctx.lineWidth = weight * 0.8
    ctx.stroke()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the part */

/** The set taking up on its lines (twice), the push off the floor, a star on each of the melody's notes, the dip, the touch. */
export const STARS_HITS = [FLY_SKY, FLY_SET, LIFT, ...KINDLE_HITS, DIP, LAST]

interface StarsState {
  begin: number
  /** The NIGHT frame's point this part's frame is laid at. */
  o: Pt
}

export const stars = part<StarsState>(
  {
    name: 'stars',
    draw(p, s, c) {
      const T = s.begin + c.t
      if (T < NIGHT_FROM) return
      const k = c.k
      p.push()
      p.rectMode(p.CORNER)
      p.ellipseMode(p.CENTER)
      p.translate(-s.o[0] * k, -s.o[1] * k)
      // The lit stars, and theirs in the floor.
      for (const q of KINDLED) {
        if (T < q.at) continue
        const [x, y] = inSky(q.local, T)
        star(p, k, x, y, q, T, false)
        star(p, k, x, 2 * UPSTAGE - y, q, T, true)
      }
      // The two of them in the floor.
      reflection(p, k, c.ink, c.weight, SEB, sebAt(T), groundUnder(T, 'seb'), T)
      if (T >= MIA_SPAN[0] && T < MIA_SPAN[1]) reflection(p, k, c.ink, c.weight, MIA, miaAt(T), groundUnder(T, 'mia'), T)
      // Where they push off, the glass takes the step: a soft light under them that spreads and goes.
      const step = knock(T - LIFT, 0.5) * smooth(T, LIFT - 0.05, LIFT)
      if (step > 0.01) {
        const cx = centre(LIFT)[0]
        glow(p, k, cx, 0.2, 0.7 + 1.4 * (1 - step), NIGHT_MAT.swirl, 0.35 * step, 1.8, 0.35)
      }
      p.pop()
    },
  },
  (slot) => {
    const span = slot.end - slot.begin
    const s0 = sebAt(slot.begin)
    const o: Pt = [s0[0] + 0.5, s0[1]]
    const at = (a: number): Pt => {
      const q = sebAt(slot.begin + a)
      return [q[0] - o[0], q[1] - o[1]]
    }
    const end = at(span)
    return {
      cells: box(-24 + 0.5, -26, 24, 16, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: carried(at, 0, span, Math.ceil(span * 40)), fire: 0 },
      state: { begin: slot.begin, o },
    }
  },
  (slot): PartShot[] => {
    const s0 = sebAt(slot.begin)
    const o: Pt = [s0[0] + 0.5, s0[1]]
    const here = (q: Pt): Pt => [q[0] - o[0], q[1] - o[1]]
    const on = (t: number, dy = 0, dx = 0): Pt => {
      const q = centre(t)
      return here([q[0] + dx, q[1] + dy])
    }
    /** The pair and their reflection both: held on the floor's line between them. */
    const both = (t: number): Pt => here([centre(t)[0], 0.1])
    return [
      // The set flying out above them.
      { t: FLY_SET + 0.6, cells: 9.6, hold: on(FLY_SET, -2.9) },
      { t: LIFT, cells: 9.0, hold: on(LIFT, -2.4) },
      // Up with them, to the top of the float.
      { t: APEX - 0.4, cells: 9.0, hold: on(APEX - 0.4, 1.4) },
      { t: 309.0, cells: 7.6, hold: on(309.0, 0.4) },
      { t: 313.6, cells: 8.0, hold: on(313.6, 0.2) },
      // The scale of it: the two of them high in the turning sky, and again in the floor.
      { t: 316.6, cells: 17.5, hold: both(316.6) },
      { t: 319.4, cells: 17.0, hold: both(319.4) },
      { t: 323.6, cells: 8.0, hold: on(323.6, 0.3) },
      // Close, in the quiet.
      { t: QUIET[0] + 1.2, cells: 4.8, hold: on(QUIET[0] + 1.2) },
      { t: QUIET[1], cells: 4.9, hold: on(QUIET[1]) },
      // The swell: out as they climb to the pole of the sky, the whole wheel round them.
      { t: 334.4, cells: 14.0, hold: on(334.4, 0.6) },
      { t: DIP, cells: 10.2, hold: on(DIP, 0.1) },
      // In on the held dip, and on the touch.
      { t: LAST, cells: 6.2, hold: on(LAST) },
      { t: DARK[1], cells: 5.6, hold: on(DARK[1]) },
    ]
  },
)
