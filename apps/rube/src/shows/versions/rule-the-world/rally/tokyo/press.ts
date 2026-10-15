import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { WIN } from '../music'
import { ctxOf, type Pen } from '../pen'
import { box, Fills, oval, poly, toned } from './batch'
import { BELL, BOW1, BOW2, BOW2_UP, FLASH_WIN, FLOOR, LIGHTS_DOWN, PICK, POWER, RALLY, SERVE, SET } from './geo'
import { lit, sectionOf } from './mood'
import { C } from './palette'

/**
 * The press at the court's side: two photographers past the judges' table and two past the barrier boards, one of each
 * pair kneeling, in dark suits and hats, each with his press camera and the round reflector of its flash. They shoot
 * the exhibition's bell and bow, Marty's power shots and a stroke here and there, everything on the winner, and the
 * bow at the end; after each shot the hand goes to the reflector for a new bulb. A shot is the bulb white in its
 * reflector for a tenth of a second, a little light on the man behind it, and nothing hanging in the air.
 */

interface Snapper {
  x: number
  kneel: boolean
  /** Which way he faces: 1 toward the table on his right. */
  face: number
  seed: number
}
const PRESS: Snapper[] = [
  { x: -5.45, kneel: true, face: 1, seed: 1 },
  { x: -6.45, kneel: false, face: 1, seed: 2 },
  { x: 8.3, kneel: true, face: -1, seed: 3 },
  { x: 9.4, kneel: false, face: -1, seed: 4 },
]
const SCALE = 0.8
/** Where their feet are: on the floor a little back from the near line. */
const FEET = FLOOR - 0.24

/** The moments the press might shoot, and how likely each is to. */
const MOMENTS: [number, number][] = [
  [BELL, 1],
  [BOW1, 1],
  [SERVE, 0.6],
  ...RALLY.map((t): [number, number] => [t, 0.28]),
  ...POWER.map((t): [number, number] => [t + 0.02, 1]),
  [WIN + 0.03, 1],
  ...FLASH_WIN.map((t): [number, number] => [t, 0.7]),
  [PICK, 0.7],
  [SET, 0.9],
  [BOW2, 1],
  [BOW2_UP, 0.6],
]
/** Each one's shots: the moments he takes, never two within a bulb's change of each other. */
const SHOTS: number[][] = PRESS.map((p) => {
  const out: number[] = []
  const sorted = [...MOMENTS].sort((a, b) => a[0] - b[0])
  sorted.forEach(([t, prob], i) => {
    if (hash(i, p.seed, 7) >= prob) return
    if (out.length && t - out[out.length - 1] < 0.75) return
    out.push(t + 0.04 * hash(i, p.seed, 9))
  })
  return out
})

export function drawPress(pen: Pen, t: number, f: { x0: number; x1: number; y0: number; y1: number }): void {
  const { k } = pen
  const fills = new Fills()
  const lines = new Fills()
  const thin = new Fills()
  let any = false
  PRESS.forEach((p, n) => {
    if (p.x + 1 < f.x0 || p.x - 1 > f.x1 || FEET - 2 > f.y1) return
    any = true
    // His last shot, and the flash of it; the bulb changed after.
    let last = -Infinity
    for (const s of SHOTS[n]) if (s <= t) last = s
    const fl = Math.exp(-(t - last) / 0.09)
    const swap = Math.max(0, Math.sin(Math.PI * Math.max(0, Math.min(1, (t - last - 0.25) / 0.7))))
    const aim = smooth(t, BELL - 0.7, BELL - 0.25) * (1 - smooth(t, LIGHTS_DOWN[2], LIGHTS_DOWN[3] + 0.5))
    const L = Math.min(1, lit(sectionOf(p.x), t)) * 0.55 + 0.22
    const lightUp = Math.min(1, L + 0.35 * fl)
    const s = SCALE
    const fx = p.face
    const X = (x: number) => p.x + fx * x * s
    const Y = (y: number) => FEET + y * s
    const pt = (x: number, y: number): Pt => [X(x), Y(y)]
    const breathe = 0.012 * Math.sin(t * 1.7 + p.seed)
    const hip: Pt = p.kneel ? pt(-0.05, -0.55) : pt(0, -0.88)
    const sh: Pt = p.kneel ? pt(0.06, -1.2 + breathe) : pt(0.1, -1.58 + breathe)
    const head: Pt = [sh[0] + fx * 0.06 * s, sh[1] - 0.26 * s]
    const suit = toned(pen, C.suit, lightUp)
    const legs = lines.at(toned(pen, C.trousers, lightUp))
    if (p.kneel) {
      const knee: Pt = pt(0.3, -0.5)
      legs.moveTo(hip[0] * k, hip[1] * k)
      legs.lineTo(knee[0] * k, knee[1] * k)
      legs.lineTo(X(0.32) * k, Y(0) * k)
      legs.moveTo(hip[0] * k, hip[1] * k)
      legs.lineTo(X(-0.3) * k, Y(-0.06) * k)
      legs.lineTo(X(-0.62) * k, Y(0) * k)
    } else {
      legs.moveTo(hip[0] * k, hip[1] * k)
      legs.lineTo(X(0.14) * k, Y(0) * k)
      legs.moveTo(hip[0] * k, hip[1] * k)
      legs.lineTo(X(-0.12) * k, Y(0) * k)
    }
    // The coat, the head and his hat.
    poly(fills.at(suit), k, 0, 0, [hip[0] - 0.2 * s, hip[1] + 0.1 * s, sh[0] - 0.22 * s, sh[1], sh[0] + 0.22 * s, sh[1], hip[0] + 0.2 * s, hip[1] + 0.1 * s])
    oval(fills.at(toned(pen, C.skin, lightUp)), k, head[0], head[1], 0.13 * s, 0.15 * s)
    const hat = fills.at(toned(pen, '#2B2622', lightUp))
    box(hat, k, head[0] - 0.22 * s, head[1] - 0.12 * s, head[0] + 0.22 * s, head[1] - 0.08 * s)
    poly(hat, k, 0, 0, [head[0] - 0.13 * s, head[1] - 0.1 * s, head[0] - 0.11 * s, head[1] - 0.27 * s, head[0] + 0.12 * s, head[1] - 0.27 * s, head[0] + 0.14 * s, head[1] - 0.1 * s])
    // The camera: up to his eye to shoot, at his chest otherwise, a little down while the bulb is changed.
    const up = aim * (1 - 0.35 * swap)
    const cam: Pt = [head[0] + fx * (0.26 - 0.06 * (1 - up)) * s, head[1] + (0.04 + 0.42 * (1 - up)) * s]
    const arms = lines.at(suit)
    arms.moveTo(sh[0] * k, sh[1] * k)
    arms.lineTo(cam[0] * k, (cam[1] + 0.12 * s) * k)
    const dish: Pt = [cam[0] - fx * 0.02 * s, cam[1] - 0.3 * s]
    const free: Pt = swap > 0.1 ? [dish[0] - fx * 0.1 * s, dish[1] + 0.05 * s] : [cam[0] - fx * 0.1 * s, cam[1] + 0.1 * s]
    arms.moveTo((sh[0] - fx * 0.05 * s) * k, sh[1] * k)
    arms.lineTo(free[0] * k, free[1] * k)
    box(fills.at(toned(pen, '#121214', 0.8 + 0.2 * lightUp)), k, cam[0] - 0.15 * s, cam[1] - 0.12 * s, cam[0] + 0.15 * s, cam[1] + 0.12 * s)
    oval(fills.at(toned(pen, C.ironHi, lightUp)), k, cam[0] + fx * 0.15 * s, cam[1], 0.04 * s, 0.08 * s)
    // The reflector on its bracket, edge-on; the bulb in it white as it fires.
    const br = thin.at(toned(pen, C.ironHi, lightUp))
    br.moveTo(cam[0] * k, (cam[1] - 0.12 * s) * k)
    br.lineTo(dish[0] * k, dish[1] * k)
    oval(fills.at(fl > 0.33 ? toned(pen, C.bulb, 1) : toned(pen, '#C8CCD0', 0.35 + 0.5 * lightUp)), k, dish[0] + fx * 0.04 * s, dish[1], 0.06 * s, 0.19 * s)
  })
  if (!any) return
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.lineCap = 'round'
  lines.stroke(ctx, pen.w * 2.6)
  thin.stroke(ctx, pen.w * 0.8)
  fills.fill(ctx)
  ctx.restore()
}
