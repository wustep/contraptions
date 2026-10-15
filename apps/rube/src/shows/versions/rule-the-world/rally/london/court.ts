import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { ellipse, line, mix, path, rect, shape, type Pen } from '../pen'
import { ballAt, CATCH, DIES, FEED, FLOOR_BACK, LUNGE, OUT } from './geo'
import { C } from './palette'

/**
 * The court's own people, on the strip of floor between the barrier and the tables: a ball boy kneeling at each end
 * of the court, his head going with the ball (the one past the final's table up and after Marty's winner as it goes
 * by Endo, and back down when Endo has it); the referee walking out to the semifinal's table and a steward going off
 * past the final's as the hall is seen whole between the matches. And after the loss, a programme thrown down from
 * the gallery onto the floorboards.
 */

const FEET = FLOOR_BACK + 0.14

/* ------------------------------------------------------------------ the ball boys */

/** Each ball boy: where he kneels, and (the right-hand one) his dash after the winner and back. */
const BOYS = [-2.6, 19.6]
function boyAt(i: number, t: number): { x: number; stand: number; run: number } {
  const home = BOYS[i]
  if (i === 0) return { x: home, stand: 0, run: 0 }
  const stand = smooth(t, LUNGE - 0.05, LUNGE + 0.2) * (1 - smooth(t, FEED + 0.9, FEED + 1.3))
  const out = smooth(t, LUNGE + 0.1, OUT[1] + 0.15) * (1 - smooth(t, CATCH + 0.15, FEED + 0.9))
  const x = home - 1.15 * out
  // How fast he is going, for his stride.
  const went = (s: number) => smooth(s, LUNGE + 0.1, OUT[1] + 0.15) - smooth(s, CATCH + 0.15, FEED + 0.9)
  return { x, stand, run: Math.min(1, Math.abs(went(t + 0.05) - went(t - 0.05)) * 6) }
}

export function ballBoys(pen: Pen, t: number, f: { x0: number; x1: number }): void {
  const ball = ballAt(t - 0.1)
  for (let i = 0; i < BOYS.length; i++) {
    const { x, stand, run } = boyAt(i, t)
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const look = Math.max(-1, Math.min(1, (ball[0] - x) / 3))
    // Kneeling on one knee (stand 0), or up and running (1).
    const hipY = FEET - 0.36 - 0.3 * stand
    const shY = hipY - 0.5
    const lean = -0.06 * look * (1 - stand) - 0.1 * run * Math.sign(look || 1)
    const hip: Pt = [x, hipY]
    const sh: Pt = [x + lean, shY]
    const phase = t * 14
    const sock = mix(C.whiteShade, C.gallery, 0.35)
    if (stand < 0.5) {
      // The knee down behind, the other foot planted in front.
      path(pen, [hip, [x + 0.14, FEET - 0.04], [x + 0.32, FEET - 0.02]], C.shorts, 5)
      path(pen, [hip, [x - 0.16, hipY + 0.06], [x - 0.18, FEET - 0.03]], C.shorts, 5)
      line(pen, [x - 0.18, FEET - 0.2], [x - 0.18, FEET - 0.03], sock, 3.4)
    } else {
      for (const sd of [-1, 1]) {
        const swing = 0.16 * run * Math.sin(phase + (sd > 0 ? 0 : Math.PI))
        const foot: Pt = [x + sd * 0.07 + swing, FEET - 0.03 - 0.06 * run * Math.max(0, Math.sin(phase + (sd > 0 ? 0 : Math.PI)))]
        path(pen, [hip, [(hip[0] + foot[0]) / 2 - 0.03, (hip[1] + foot[1]) / 2], foot], C.shorts, 5)
        line(pen, [foot[0], foot[1] - 0.16], foot, sock, 3.4)
      }
    }
    // The sweater, the arms (hands on his knee, or swinging).
    shape(pen, [[hip[0] - 0.15, hip[1] + 0.04], [sh[0] - 0.17, sh[1] + 0.04], [sh[0] + 0.17, sh[1] + 0.04], [hip[0] + 0.15, hip[1] + 0.04]], C.sweater)
    const hand: Pt = stand < 0.5 ? [x - 0.14, hipY + 0.04] : [x + 0.12 * run * Math.sin(phase), hipY + 0.02]
    path(pen, [[sh[0] - 0.12, sh[1] + 0.06], [sh[0] - 0.16, (sh[1] + hand[1]) / 2], hand], C.sweater, 4)
    ellipse(pen, hand, 0.035, 0.035, C.skinDim)
    const head: Pt = [sh[0] + 0.02 * look, sh[1] - 0.17]
    ellipse(pen, head, 0.1, 0.115, C.skinDim)
    ellipse(pen, [head[0] - 0.03 * look, head[1] - 0.06], 0.1, 0.065, '#3A2E25')
    ellipse(pen, [head[0] + 0.07 * look, head[1] + 0.02], 0.022, 0.026, mix(C.skinDim, C.skin, 0.4))
  }
}

/* ------------------------------------------------------------------ the officials */

/** Each official's walk: show times and where he is (eased between, standing on each key). */
const WALKS: { keys: [number, number][]; board: boolean }[] = [
  // The referee, out from the far left to stand by the semifinal's table once it is over.
  { keys: [[0, -6.5], [67.55, -6.5], [71.6, 3.4]], board: true },
  // A steward, done with the umpire's chair, going off behind the final's table as the hall waits for it.
  { keys: [[0, 10.4], [67.2, 10.4], [71.2, 22]], board: false },
]
function walkAt(keys: [number, number][], t: number): { x: number; v: number } {
  const xAt = (s: number): number => {
    if (s <= keys[0][0]) return keys[0][1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, x1] = keys[i]
      if (s <= t1) {
        const [t0, x0] = keys[i - 1]
        const u = (s - t0) / (t1 - t0)
        // An easy start and stop, a steady walk between.
        const v = 1 / 0.85
        const e = u < 0.15 ? (v * u * u) / 0.3 : u > 0.85 ? 1 - (v * (1 - u) * (1 - u)) / 0.3 : v * (u - 0.075)
        return x0 + (x1 - x0) * e
      }
    }
    return keys[keys.length - 1][1]
  }
  return { x: xAt(t), v: (xAt(t + 0.05) - xAt(t - 0.05)) / 0.1 }
}

export function officials(pen: Pen, t: number, f: { x0: number; x1: number }): void {
  const ball = ballAt(t - 0.15)
  for (const [i, w] of WALKS.entries()) {
    const { x, v } = walkAt(w.keys, t)
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const walking = Math.min(1, Math.abs(v) * 2)
    const dir = v < -0.02 ? -1 : v > 0.02 ? 1 : ball[0] < x ? -1 : 1
    // His stride goes with the floor under him: a step every 0.42 cells.
    const ph = (x / 0.42) * Math.PI
    const hip: Pt = [x, FEET - 1.12 + 0.02 * walking * Math.abs(Math.cos(ph))]
    const sh: Pt = [x + 0.04 * dir * walking, hip[1] - 0.9]
    for (const sd of [-1, 1]) {
      const s = Math.sin(ph + (sd > 0 ? 0 : Math.PI))
      const foot: Pt = [x + 0.22 * walking * s + sd * 0.04 * (1 - walking), FEET - 0.03 - 0.05 * walking * Math.max(0, -Math.cos(ph + (sd > 0 ? 0 : Math.PI)))]
      path(pen, [hip, [(hip[0] + foot[0]) / 2 + 0.04 * dir, (hip[1] + foot[1]) / 2], foot], sd > 0 ? '#3C3E3D' : '#323433', 6.5)
      rect(pen, foot[0] - 0.06 + 0.04 * dir, foot[1] - 0.05, foot[0] + 0.06 + 0.04 * dir, foot[1], '#121212')
    }
    // The blazer, the white shirt and tie at its neck; the club badge on its pocket.
    shape(pen, [[hip[0] - 0.2, hip[1] + 0.1], [sh[0] - 0.24, sh[1] + 0.06], [sh[0] - 0.1, sh[1]], [sh[0] + 0.1, sh[1]], [sh[0] + 0.24, sh[1] + 0.06], [hip[0] + 0.2, hip[1] + 0.1]], C.blazer)
    shape(pen, [[sh[0] - 0.07, sh[1]], [sh[0] + 0.07, sh[1]], [sh[0], sh[1] + 0.2]], C.white)
    line(pen, [sh[0], sh[1] + 0.02], [sh[0], sh[1] + 0.18], C.pennantRed, 1.4)
    ellipse(pen, [sh[0] - 0.11 * dir, sh[1] + 0.32], 0.035, 0.035, C.brass)
    // His arms: swinging as he walks, or behind his back; the referee's board in his hand.
    for (const sd of [-1, 1]) {
      const s = Math.sin(ph + (sd > 0 ? Math.PI : 0)) * walking
      const hand: Pt = [sh[0] + sd * 0.14 + 0.16 * s * dir, hip[1] + 0.02 - 0.06 * (1 - walking)]
      path(pen, [[sh[0] + sd * 0.2, sh[1] + 0.08], [sh[0] + sd * 0.22 + 0.06 * s * dir, (sh[1] + hand[1]) / 2], hand], C.blazer, 4.4)
      if (w.board && sd === 1) rect(pen, hand[0] - 0.02, hand[1] - 0.2, hand[0] + 0.06, hand[1] + 0.12, '#CFC8B4')
      ellipse(pen, hand, 0.04, 0.04, C.skinDim)
    }
    const look = Math.max(-1, Math.min(1, (ball[0] - x) / 3))
    const facing = walking > 0.3 ? dir : look
    const head: Pt = [sh[0] + 0.03 * facing, sh[1] - 0.2]
    ellipse(pen, head, 0.12, 0.14, C.skinDim)
    ellipse(pen, [head[0] - 0.04 * facing, head[1] - 0.07], 0.12, 0.08, i === 0 ? C.hairGrey : '#3B3129')
    ellipse(pen, [head[0] + 0.09 * facing, head[1] + 0.02], 0.025, 0.03, mix(C.skinDim, C.skin, 0.4))
  }
}

/* ------------------------------------------------------------------ the thrown programme */

/** After the loss someone in the gallery throws his programme down; it flutters to the floorboards near Marty. */
const THROWN = DIES + 1.55
const LANDS = THROWN + 1.9
const FROM: Pt = [4.35, -1.35]
const TO: Pt = [5.15, FEET - 0.03]
export function programme(pen: Pen, t: number): void {
  if (t < THROWN) return
  const u = Math.min(1, (t - THROWN) / (LANDS - THROWN))
  const col = mix(C.floor, C.programme, 0.62)
  const { p, k } = pen
  if (u >= 1) {
    // Lying open on the boards.
    shape(pen, [[TO[0] - 0.17, TO[1]], [TO[0] - 0.12, TO[1] - 0.035], [TO[0] + 0.15, TO[1] - 0.03], [TO[0] + 0.18, TO[1]]], col)
    line(pen, [TO[0] - 0.01, TO[1] - 0.034], [TO[0], TO[1]], mix(col, C.floor, 0.5), 0.6)
    return
  }
  // Up a little off the throw, then down, swinging side to side and turning over as it falls.
  const fall = u * u * (3 - 2 * u)
  const x = FROM[0] + (TO[0] - FROM[0]) * u + 0.2 * Math.sin(u * 9) * (1 - u)
  const y = FROM[1] + (TO[1] - FROM[1]) * fall - 0.35 * Math.sin(Math.PI * Math.min(1, u * 2.2)) * (1 - u)
  const spin = u * 11 + 0.6
  p.push()
  p.translate(x * k, y * k)
  p.rotate(0.5 * Math.sin(u * 8) + 0.2 * hash(3, 4, 5))
  p.scale(Math.max(0.15, Math.abs(Math.cos(spin))), 1)
  rect(pen, -0.13, -0.17, 0.13, 0.17, col)
  line(pen, [0, -0.17], [0, 0.17], mix(col, C.floor, 0.4), 0.5)
  p.pop()
}
