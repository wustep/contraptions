import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { G } from '../physics'
import {
  ABOARD,
  APEX,
  BIKE_X0,
  BOARD_DOWN,
  BOARD_X,
  CRASH,
  CRASH_X,
  CRESTS,
  ERUPT,
  FINAL,
  FLAKES,
  HUSH,
  KIDS,
  LANDS,
  POSTS,
  SADDLE,
  STRETCH,
  T1,
  TOY_LAND_X,
  bikeLevel,
  bikeX,
  boardS,
  ridgeY,
  roadAt,
} from './geo'
import { about, clamp01, disc, glow, lerp, rgba, shape, sm, stroke, type Pen } from './pen'
import { FAR_P, HZ, farFn, plumeMid, plumeTop } from './set'
import { ICE } from './theme'

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/* ------------------------------------------------------------------ the posts */

/** A reflector post at the road's far edge; its reflector flares as he goes by. */
export function drawPosts(pen: Pen, t: number, f: Frame): void {
  for (const post of POSTS) {
    const [x, y] = post.p
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const b = y - 0.27
    const h = 0.34
    stroke(pen, [[x, b], [x, b - h]], ICE.post, 0.045, 0, 'butt')
    stroke(pen, [[x, b - h + 0.02], [x, b - h + 0.09]], ICE.postBand, 0.047, 0, 'butt')
    disc(pen, [x, b - h + 0.13], 0.018, 0.022, ICE.reflector)
    const since = t - post.t
    if (since >= -0.03 && since < 0.6) {
      const a = since < 0 ? (since + 0.03) / 0.03 : Math.exp(-since / 0.16)
      glow(pen, [x, b - h + 0.13], 0.2, ICE.glint, 0.85 * a)
      stroke(pen, [[x - 0.09 * a, b - h + 0.13], [x + 0.09 * a, b - h + 0.13]], rgba(ICE.glint, 0.9 * a), 0.012)
    }
  }
}

/* ------------------------------------------------------------------ the sign */

export const SIGN_X = CRASH_X + 0.56
/** The sign at the ridge's edge: a pale triangle warning of the bends, on a post the bicycle's front wheel finds. */
export function drawSign(pen: Pen, t: number): void {
  const base: Pt = [SIGN_X, ridgeY(SIGN_X) - 0.24]
  const u = t - CRASH
  const lean = u < 0 ? 0 : 0.16 * (1 - Math.exp(-u / 0.06)) + 0.2 * Math.exp(-u / 0.55) * Math.sin(u * 15)
  about(pen, base, lean, () => {
    const k = pen.k
    stroke(pen, [[0, 0], [0, -0.82]], ICE.post, 0.05, 0, 'butt')
    const top = -1.12
    const tri: Pt[] = [[0, top], [0.21, top + 0.36], [-0.21, top + 0.36]]
    shape(pen, tri, ICE.sign, 1.1)
    shape(pen, [[0, top + 0.07], [0.15, top + 0.32], [-0.15, top + 0.32]], null, 1.4)
    // The bends: a winding line.
    const ctx = pen.p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.w * 1.3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-0.02 * k, (top + 0.3) * k)
    ctx.bezierCurveTo(0.08 * k, (top + 0.24) * k, -0.08 * k, (top + 0.2) * k, 0.02 * k, (top + 0.13) * k)
    ctx.stroke()
    ctx.restore()
  })
}

/* ------------------------------------------------------------------ the bicycle */

/** The bicycle: propped at the summit, ridden down the ridge, into the sign, and down on its side. */
export function drawBike(pen: Pen, t: number): void {
  const x = bikeX(t)
  const level = bikeLevel(x)
  const tilt = Math.atan2(ridgeY(x + 0.31) - ridgeY(x - 0.31), 0.62)
  const u = t - CRASH
  // After the sign: the rear kicks up over the front wheel and drops, then it goes down on its side.
  let pitch = 0
  let flat = 1
  if (u > 0) {
    pitch = u < 0.42 ? -0.42 * Math.sin((u / 0.42) * Math.PI) : 0
    flat = 1 - 0.72 * sm(u, 0.42, 0.78)
  }
  const roll = (x - BIKE_X0) / 0.2
  const pivot: Pt = u > 0 ? [x + 0.31, level] : [x, level]
  about(pen, pivot, tilt + pitch, () => {
    const o = u > 0 ? -0.31 : 0
    const W = 0.2
    const rear: Pt = [o - 0.31, -W]
    const front: Pt = [o + 0.31, -W]
    const bb: Pt = [o - 0.03, -W - 0.02]
    const seat: Pt = [o - 0.1, -0.46]
    const head: Pt = [o + 0.22, -0.47]
    const headLo: Pt = [o + 0.25, -0.38]
    const wheel = (c: Pt, spin: number, squash: number) => {
      disc(pen, c, W * squash, W, null, 1.2, ICE.tyre)
      disc(pen, c, W - 0.025, W - 0.025, null, 0.35, rgba(ICE.tyre, 0.6))
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI) / 3
        stroke(pen, [[c[0] - Math.cos(a) * (W - 0.03) * squash, c[1] - Math.sin(a) * (W - 0.03)], [c[0] + Math.cos(a) * (W - 0.03) * squash, c[1] + Math.sin(a) * (W - 0.03)]], rgba(ICE.tyre, 0.45), 0, 0.35)
      }
      disc(pen, c, 0.02, 0.02, ICE.tyre)
    }
    pen.p.push()
    pen.p.scale(1, flat)
    wheel(rear, roll, 1)
    // The front wheel, once it has met the post, is twisted: seen nearly edge on.
    wheel(front, u > 0 ? 0 : roll, u > 0 ? 1 - 0.55 * sm(u, 0, 0.1) : 1)
    stroke(pen, [rear, bb, seat, rear], ICE.frame, 0.035)
    stroke(pen, [seat, head], ICE.frame, 0.035)
    stroke(pen, [bb, headLo], ICE.frame, 0.035)
    stroke(pen, [head, headLo, front], ICE.frame, 0.03)
    // Saddle, bars, a crank, the basket.
    stroke(pen, [[seat[0] - 0.08, seat[1] - 0.025], [seat[0] + 0.05, seat[1] - 0.025]], ICE.grip, 0.04)
    stroke(pen, [head, [head[0] + 0.02, head[1] - 0.07], [head[0] - 0.06, head[1] - 0.1]], ICE.grip, 0.028)
    const crank = u > 0 ? 0.9 : roll * 0.55
    stroke(pen, [[bb[0] - Math.cos(crank) * 0.08, bb[1] - Math.sin(crank) * 0.08], [bb[0] + Math.cos(crank) * 0.08, bb[1] + Math.sin(crank) * 0.08]], ICE.grip, 0.022)
    shape(pen, [[head[0] + 0.05, head[1] - 0.03], [head[0] + 0.2, head[1] - 0.03], [head[0] + 0.18, head[1] + 0.08], [head[0] + 0.07, head[1] + 0.08]], rgba(ICE.frame, 0.25), 0.8)
    // The kickstand, down while it stands.
    if (t < SADDLE) stroke(pen, [bb, [bb[0] - 0.1, 0]], ICE.grip, 0.02)
    pen.p.pop()
  })
  // The toy, in the basket till the sign.
  if (t < CRASH) drawToy(pen, [x + 0.34, level - 0.6], -0.2 + tilt, 1)
}

/* ------------------------------------------------------------------ the toy */

/** The little stretchy figure: a strongman with arms that pull out. `stretch` is how far (1 is as he is made). */
export function drawToy(pen: Pen, c: Pt, a: number, stretch: number, s = 1): void {
  about(pen, c, a, () => {
    const arm = 0.05 * stretch
    stroke(pen, [[-arm, -0.075], [arm, -0.075]], ICE.toy, 0.022)
    shape(pen, [[-0.035, -0.08], [0.035, -0.08], [0.025, 0.0], [-0.025, 0.0]], ICE.toy)
    shape(pen, [[-0.028, -0.005], [0.028, -0.005], [0.03, 0.025], [-0.03, 0.025]], ICE.trunks)
    stroke(pen, [[-0.018, 0.02], [-0.022, 0.07]], ICE.toy, 0.02)
    stroke(pen, [[0.018, 0.02], [0.022, 0.07]], ICE.toy, 0.02)
    disc(pen, [0, -0.11], 0.026, 0.028, ICE.toy)
    disc(pen, [0, -0.125], 0.026, 0.014, ICE.grip)
  }, s, s)
}

/** Where the toy is: in the basket, thrown at the sign, on the road at the kids' feet, then up in the middle kid's hands. */
function toyAt(t: number): { p: Pt; a: number; stretch: number } | null {
  if (t < CRASH) return null
  const from: Pt = [CRASH_X + 0.34, bikeLevel(CRASH_X) - 0.6]
  const to: Pt = [TOY_LAND_X, ridgeY(TOY_LAND_X) - 0.31]
  if (t <= LANDS) {
    const T = LANDS - CRASH
    const u = t - CRASH
    const vy = (to[1] - from[1]) / T - 0.5 * G * T
    return { p: [from[0] + ((to[0] - from[0]) * u) / T, from[1] + vy * u + 0.5 * G * u * u], a: -0.2 + 9 * u, stretch: 1 }
  }
  const kid = KIDS[1]
  const kb = ridgeY(kid.x) - 0.3
  const hands: Pt = [kid.x, kb - kid.h - 0.05]
  // Picked up, then on the beat held high and pulled out wide; then waved slowly at him as he goes.
  const pick = sm(t, LANDS + 0.18, STRETCH - 0.12)
  const lie: Pt = [to[0], to[1]]
  const p: Pt = [lerp(lie[0], hands[0], pick), lerp(lie[1], hands[1], pick)]
  const a = lerp(Math.PI / 2 + 0.1, 0, pick)
  const since = t - STRETCH
  const stretch = since < 0 ? 1 : 1 + 2.4 * (1 - Math.exp(-since / 0.07)) - 0.5 * sm(since, 0.4, 1.2) + 0.25 * Math.exp(-since / 0.3) * Math.sin(since * 22)
  const wave = since > 0 ? 0.08 * Math.sin(since * 4.2) * sm(since, 0.8, 1.6) : 0
  return { p: [p[0] + wave * 0.3, p[1]], a: a + wave, stretch }
}

/* ------------------------------------------------------------------ the kids */

/** Three kids at the road's edge, drawn small and dark: the board's owner, the one who gets the toy, the little one. */
export function drawKids(pen: Pen, t: number): void {
  KIDS.forEach((kid, i) => {
    const base: Pt = [kid.x, ridgeY(kid.x) - 0.3]
    const h = kid.h
    const head = h * 0.17
    const hip = base[1] - h * 0.42
    const sh = base[1] - h * 0.74
    const sway = 0.012 * h * Math.sin(t * 1.3 + i * 2)
    // Legs, a body, a head.
    stroke(pen, [[kid.x - 0.05 * h, base[1]], [kid.x - 0.035 * h, hip]], ICE.kid, 0.06 * h)
    stroke(pen, [[kid.x + 0.05 * h, base[1]], [kid.x + 0.035 * h, hip]], ICE.kid, 0.06 * h)
    shape(pen, [[kid.x - 0.1 * h + sway, sh], [kid.x + 0.1 * h + sway, sh], [kid.x + 0.08 * h, hip + 0.02 * h], [kid.x - 0.08 * h, hip + 0.02 * h]], ICE.kid)
    const hc: Pt = [kid.x + sway * 1.4, sh - head * 0.95]
    disc(pen, hc, head * 0.85, head, ICE.kid)
    if (i === 2) disc(pen, [hc[0], hc[1] - head * 0.55], head * 0.9, head * 0.55, ICE.kid) // a woolly hat
    const shoulderL: Pt = [kid.x - 0.09 * h + sway, sh + 0.02 * h]
    const shoulderR: Pt = [kid.x + 0.09 * h + sway, sh + 0.02 * h]
    const armLen = h * 0.36
    if (i === 0) {
      // The board's owner: holds it upright beside him, then swings it down onto the road.
      const b = boardHeld(t)
      if (b.held) {
        stroke(pen, [shoulderL, b.hand], ICE.kid, 0.045 * kid.h)
        stroke(pen, [shoulderR, [shoulderR[0] + 0.02, shoulderR[1] + armLen]], ICE.kid, 0.045 * kid.h)
      } else {
        const wave = t > ABOARD + 0.4 && t < ABOARD + 3 ? Math.sin((t - ABOARD) * 7) * 0.25 : 0
        stroke(pen, [shoulderL, [shoulderL[0] - 0.02, shoulderL[1] + armLen]], ICE.kid, 0.045 * kid.h)
        stroke(pen, [shoulderR, [shoulderR[0] + Math.sin(0.4 + wave) * armLen * (t > ABOARD + 0.4 && t < ABOARD + 3 ? 1 : 0.1), shoulderR[1] + (t > ABOARD + 0.4 && t < ABOARD + 3 ? -armLen * 0.9 : armLen)]], ICE.kid, 0.045 * kid.h)
      }
    } else if (i === 1) {
      const toy = toyAt(t)
      const up = toy && t > LANDS ? sm(t, LANDS + 0.18, STRETCH - 0.12) : 0
      if (toy && up > 0) {
        const w = 0.05 * toy.stretch
        const ca = Math.cos(toy.a)
        const sa = Math.sin(toy.a)
        const handL: Pt = [toy.p[0] - w * ca, toy.p[1] - 0.075 - w * sa]
        const handR: Pt = [toy.p[0] + w * ca, toy.p[1] - 0.075 + w * sa]
        stroke(pen, [shoulderL, [lerp(shoulderL[0], handL[0], 0.5) - 0.02, lerp(shoulderL[1], handL[1], 0.5)], handL], ICE.kid, 0.045 * kid.h)
        stroke(pen, [shoulderR, [lerp(shoulderR[0], handR[0], 0.5) + 0.02, lerp(shoulderR[1], handR[1], 0.5)], handR], ICE.kid, 0.045 * kid.h)
      } else {
        stroke(pen, [shoulderL, [shoulderL[0] - 0.03, shoulderL[1] + armLen]], ICE.kid, 0.045 * kid.h)
        stroke(pen, [shoulderR, [shoulderR[0] + 0.03, shoulderR[1] + armLen]], ICE.kid, 0.045 * kid.h)
      }
    } else {
      // The little one: hands in pockets, then a wave as he goes by.
      const go = sm(t, ABOARD + 0.3, ABOARD + 0.6) * (1 - sm(t, ABOARD + 3.5, ABOARD + 4))
      stroke(pen, [shoulderL, [shoulderL[0] - 0.02, shoulderL[1] + armLen]], ICE.kid, 0.045 * kid.h)
      const wa = -Math.PI / 2 + 0.35 * Math.sin((t - ABOARD) * 8) * go
      const down: Pt = [shoulderR[0] + 0.02, shoulderR[1] + armLen]
      const up: Pt = [shoulderR[0] + Math.cos(wa) * armLen, shoulderR[1] + Math.sin(wa) * armLen]
      stroke(pen, [shoulderR, [lerp(down[0], up[0], go), lerp(down[1], up[1], go)]], ICE.kid, 0.045 * kid.h)
    }
  })
  const toy = toyAt(t)
  if (toy) drawToy(pen, toy.p, toy.a, toy.stretch)
}

/* ------------------------------------------------------------------ the board */

/** The board in the first kid's hands: upright, then swung down onto the road, landing flat on 57.3. */
function boardHeld(t: number): { held: boolean; c: Pt; a: number; hand: Pt } {
  const kid = KIDS[0]
  const base = ridgeY(kid.x) - 0.3
  const upright: Pt = [kid.x - 0.13, base - 0.3]
  const down: Pt = [BOARD_X, ridgeY(BOARD_X) - 0.075]
  const swing0 = BOARD_DOWN - 0.42
  const u = clamp01((t - swing0) / (BOARD_DOWN - swing0))
  const e = u * u
  const c: Pt = [lerp(upright[0], down[0], e), lerp(upright[1], down[1], e) - 0.18 * Math.sin(u * Math.PI)]
  const a = lerp(-Math.PI / 2 + 0.08, 0, e)
  const hand: Pt = [c[0] + 0.05, c[1] - 0.12 * (1 - e)]
  return { held: t < BOARD_DOWN, c, a, hand }
}

/** The longboard: in the kid's hands, slapped down, ridden all the way down to the shore. */
export function drawBoard(pen: Pen, t: number): void {
  let c: Pt
  let a: number
  let fore = 1
  if (t < BOARD_DOWN) {
    const b = boardHeld(t)
    c = b.c
    a = b.a
  } else if (t < ABOARD) {
    c = [BOARD_X, ridgeY(BOARD_X) - 0.075]
    a = Math.atan2(ridgeY(BOARD_X + 0.2) - ridgeY(BOARD_X - 0.2), 0.4)
  } else {
    const r = roadAt(boardS(t))
    c = [r.p[0], r.p[1] - 0.075]
    const cos = Math.cos(r.dir)
    // Round the hairpins it is seen end on: shorter, and level.
    fore = Math.max(0.3, Math.abs(cos))
    a = Math.atan((Math.sin(r.dir) * cos) / Math.max(0.12, cos * cos))
  }
  about(pen, c, a, () => {
    const L = 0.33
    stroke(pen, [[-L - 0.03, -0.045], [-L + 0.04, -0.015], [L - 0.04, -0.015], [L + 0.03, -0.045]], ICE.deck, 0.036)
    stroke(pen, [[-L + 0.06, -0.03], [L - 0.06, -0.03]], ICE.grip, 0.012)
    for (const wx of [-0.21, 0.21]) {
      stroke(pen, [[wx - 0.03, 0.0], [wx + 0.03, 0.0]], ICE.grip, 0.018)
      disc(pen, [wx, 0.028], 0.042, 0.042, ICE.tyre)
      disc(pen, [wx, 0.028], 0.016, 0.016, ICE.toy)
    }
  }, fore, 1)
  // The slap: a puff of grit as it lands, and as he lands on it.
  for (const s of [BOARD_DOWN, ABOARD]) {
    const u = t - s
    if (u >= 0 && u < 0.5) {
      const base: Pt = [BOARD_X, ridgeY(BOARD_X) + 0.01]
      for (let i = 0; i < 6; i++) {
        const dir = i < 3 ? -1 : 1
        const v = 0.25 + 0.3 * hash(i, s > BOARD_DOWN ? 2 : 1)
        disc(pen, [base[0] + dir * (0.3 + v * u), base[1] - 0.6 * v * u + 1.2 * u * u], 0.025 * (1 - u * 2), 0.02 * (1 - u * 2), rgba(ICE.gravel, 0.8 * (1 - u * 2)))
      }
    }
  }
}

/* ------------------------------------------------------------------ crests and turns */

/** Each crest and each hairpin's apex on the board: a little spray of grit off the wheels, and the air under them. */
export function drawCarves(pen: Pen, t: number): void {
  const marks = [...CRESTS, ...APEX]
  for (const m of marks) {
    const u = t - m
    if (u < 0 || u > 0.55) continue
    const r = roadAt(boardS(m))
    const turn = APEX.includes(m)
    const n = turn ? 9 : 5
    const back = Math.cos(r.dir) >= 0 ? -1 : 1
    for (let i = 0; i < n; i++) {
      const v = 0.3 + 0.6 * hash(i, Math.round(m * 10))
      const a = turn ? (hash(i, 7) - 0.5) * Math.PI : Math.PI * (back < 0 ? 1 : 0) + (hash(i, 8) - 0.5) * 1.2
      const x = r.p[0] + Math.cos(a) * v * u * (turn ? 1.2 : 0.8)
      const y = r.p[1] + 0.02 - 0.5 * v * u + 2.2 * u * u
      disc(pen, [x, y], 0.022 * (1 - u / 0.55), 0.018 * (1 - u / 0.55), rgba(ICE.gravel, 0.85 * (1 - u / 0.55)))
    }
  }
}

/* ------------------------------------------------------------------ the birds */

/** The flock over the ridge: they wheel in, and for a moment pull together into one round shape, and go. */
export function drawBirds(pen: Pen, t: number, f: Frame): void {
  const A = 97.0
  const B = 101.6
  if (t < A || t > B) return
  const far = farFn(f, 0.02, 0.02)
  const H = f.y1 - f.y0
  const u = (t - A) / (B - A)
  // The flock's centre sweeps right to left in a long arc.
  const cx = lerp(0.95, -1.0, u)
  const cy = -0.3 - 0.09 * Math.sin(u * Math.PI) + 0.03 * Math.sin(u * 7)
  const gather = sm(t, 98.4, 99.1) * (1 - sm(t, 99.7, 100.4))
  const N = 23
  for (let i = 0; i < N; i++) {
    const loose: [number, number] = [
      0.11 * Math.sin(i * 2.1 + t * 1.3) + 0.05 * Math.sin(i * 5.3 + t * 2.1),
      0.05 * Math.cos(i * 1.7 + t * 1.6) + 0.03 * Math.sin(i * 3.9 + t * 0.7),
    ]
    // The round shape: a filled disc of birds.
    const ra = i * 2.399
    const rr = 0.055 * Math.sqrt((i + 0.5) / N)
    const ring: [number, number] = [Math.cos(ra + t * 0.6) * rr, Math.sin(ra + t * 0.6) * rr * 0.95]
    const sx = cx + lerp(loose[0], ring[0], gather)
    const sy = cy + lerp(loose[1], ring[1], gather)
    const q = far(sx, sy)
    const flap = Math.sin(t * 14 + i * 1.3)
    const s = 0.008 * H
    stroke(pen, [[q[0] - s, q[1] - s * 0.5 * flap], [q[0], q[1]], [q[0] + s, q[1] - s * 0.5 * flap]], rgba(ICE.bird, 0.8), 0, 0.7)
  }
}

/* ------------------------------------------------------------------ the plane */

/** Sean's little plane: across the sky toward the plume, into it, and gone. */
export function drawPlane(pen: Pen, t: number, f: Frame): void {
  const A = HUSH + 0.9
  const B = HUSH + 6.2
  if (t < A || t > B) return
  const far = farFn(f, FAR_P[0], FAR_P[1])
  const H = f.y1 - f.y0
  const u = (t - A) / (B - A)
  const m = plumeMid(t)
  const from: [number, number] = [-0.9, HZ - 0.3]
  const sx = lerp(from[0], m[0] - 0.01, u)
  const sy = lerp(from[1], m[1], u) - 0.03 * Math.sin(u * Math.PI)
  const fade = 1 - sm(u, 0.86, 0.97)
  const q = far(sx, sy)
  const s = 0.012 * H * (1 - 0.35 * u)
  const tilt = Math.atan2((m[1] - from[1]) * 0.5, m[0] - from[0])
  about(pen, q, tilt, () => {
    stroke(pen, [[-s, 0], [s, 0]], rgba(ICE.plane, fade), 0, 1.2)
    stroke(pen, [[-s * 0.1, -s * 0.05], [-s * 0.25, -s * 0.5]], rgba(ICE.plane, fade), 0, 1)
    stroke(pen, [[-s * 0.85, 0], [-s * 1.0, -s * 0.4]], rgba(ICE.plane, fade), 0, 0.9)
  })
  void plumeTop
}

/* ------------------------------------------------------------------ the ash */

/** The ash coming down: a few flakes after the hush begins, thickening to the cut. Light grey, slow, drifting. */
export function drawAsh(pen: Pen, t: number, f: Frame): void {
  if (t < HUSH + 0.5) return
  const thick = sm(t, HUSH + 0.5, T1)
  const N = Math.floor(30 + 280 * thick)
  const span = 14
  for (let i = 0; i < N; i++) {
    const born = HUSH + 0.5 + 11 * hash(i, 61) * (i < 30 ? 0.3 : 1)
    if (t < born) continue
    const fall = 0.22 + 0.18 * hash(i, 62)
    const x0 = FINAL[0] + (hash(i, 63) - 0.5) * span
    const y = FINAL[1] - 6 + ((t - born) * fall + hash(i, 64) * 8) % 8
    const x = x0 + 0.15 * Math.sin(t * (0.6 + hash(i, 65)) + i)
    if (x < f.x0 - 0.2 || x > f.x1 + 0.2 || y < f.y0 - 0.2 || y > f.y1 + 0.2) continue
    const r = 0.012 + 0.022 * hash(i, 66)
    const a = 0.85 * sm(t - born, 0, 0.8)
    disc(pen, [x, y], r, r * 0.8, rgba(hash(i, 67) < 0.3 ? ICE.ashDark : ICE.ash, a))
  }
}

/** The flakes that land on the guitar's soft onsets: falling to their place by him, a breath of dust, and staying. */
export function drawLanding(pen: Pen, t: number, onHim: boolean): void {
  for (const fl of FLAKES) {
    if (fl.onHim !== onHim) continue
    const u = t - fl.t
    if (u < -2.4) continue
    const r = 0.026
    if (u < 0) {
      const y = fl.p[1] + u * 0.4
      const x = fl.p[0] + 0.06 * Math.sin(u * 2.4)
      disc(pen, [x, y], r, r * 0.8, rgba(ICE.ash, 0.95 * sm(u, -2.4, -1.8)))
      continue
    }
    disc(pen, fl.p, r * 1.05, r * 0.6, rgba(ICE.ash, 0.95))
    if (u < 0.5) {
      const a = 1 - u / 0.5
      disc(pen, fl.p, 0.03 + 0.12 * u, 0.012 + 0.04 * u, null, 0.6 * a, rgba(ICE.ash, 0.9 * a))
    }
  }
}

/** The haze the ash makes of the air as it thickens: the director's cover finishes it. */
export function drawHaze(pen: Pen, t: number, f: Frame): void {
  const a = 0.32 * sm(t, ERUPT + 6, T1)
  if (a <= 0) return
  shape(pen, [[f.x0 - 1, f.y0 - 1], [f.x1 + 1, f.y0 - 1], [f.x1 + 1, f.y1 + 1], [f.x0 - 1, f.y1 + 1]], rgba(ICE.ash, a))
}
