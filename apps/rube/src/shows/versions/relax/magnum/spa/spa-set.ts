import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { bloom, flashBurst, pool, rgba } from '../cast'
import { hash } from '../kit'
import { level } from '../music'
import { SPA } from '../worlds'
import { BALCONY, CAB, clamp01, DOOR_X, DOORS, DRYER, FLOOR_Y, PRESS_FLASH, ROBES, sm, STRIPS, STRIPS_X, windAt, X_END, XT } from './spa-geo'
import { ctxOf, box, line, polyline, shape, vwash, type Pen } from './spa-kit'

/**
 * The spa's room (the set, handed show time): black marble to a dark ceiling, a wainscot with a brass rail, candles in
 * niches, a floor of black gloss, and in front of it all a long teal pool lit from under. The spa's door at the head
 * of the line (a cross wall, the lobby's warm light beyond it), and at the far end of the way out its front door (a
 * cross wall whose leaf the dryer's gust blows open on bar 39, the bright street beyond). Along the way out, white
 * robes on hooks and the strips of towel across it, stirred by the gust that comes with him.
 */

export const CEIL = -4.7
export const RAIL_Y = -1.35
export const FLOOR_LIP = 0.42
/** The door he came in by: a cross wall, the doorway under its lintel. */
export const DOOR0 = { x: -1.3, lintel: FLOOR_Y - 2.45 }
const WALL_T = 0.34
const LINTEL = FLOOR_Y - 2.3

/** A dark between marble and water, for depths. */
export const DEEP = mixHex(SPA.marble, SPA.tile, 0.3)
const WALL_LOW = mixHex(SPA.tile, SPA.marble, 0.25)
const POOL_DEEP = mixHex(SPA.water, SPA.marble, 0.88)
const POOL_MID = mixHex(SPA.water, SPA.marble, 0.6)

/** The candles along the wall: niches, spaced round the machines and the balcony. */
const CANDLES: number[] = (() => {
  const out: number[] = []
  const skip: [number, number][] = [
    [DOOR0.x - 0.7, DOOR0.x + 0.5],
    [CAB.x0 - 0.45, CAB.x1 + 0.45],
    [BALCONY.x0 - 0.6, BALCONY.x1 + 0.6],
    [XT - 0.9, XT + 0.9],
    [DRYER.x - 0.7, DRYER.x + 0.7],
    [STRIPS_X - 0.5, STRIPS_X + 0.5],
    [DOOR_X - 0.9, X_END + 20],
    ...ROBES.map((x): [number, number] => [x - 0.45, x + 0.45]),
  ]
  for (let x = -3.4; x < X_END + 6; x += 2.55) if (!skip.some(([a, b]) => x > a && x < b)) out.push(x)
  return out
})()
const NICHE_Y = -2.05

function flameAt(i: number, t: number): number {
  // A candle's breathing: slow, uneven, never a strobe.
  return 0.82 + 0.1 * Math.sin(t * 2.3 + i * 1.7) + 0.08 * Math.sin(t * 5.1 + i * 3.1)
}

function drawCandle(pen: Pen, x: number, i: number, t: number): void {
  const { p } = pen
  // The niche: an arched recess, deeper than the wall.
  const w = 0.34
  const top = NICHE_Y - 0.36
  const bot = NICHE_Y + 0.28
  p.noStroke()
  p.fill(DEEP)
  p.beginShape()
  p.vertex((x - w / 2) * pen.k, bot * pen.k)
  p.vertex((x - w / 2) * pen.k, (top + w / 2) * pen.k)
  for (let a = Math.PI; a <= 2 * Math.PI + 1e-6; a += Math.PI / 10) p.vertex((x + (Math.cos(a) * w) / 2) * pen.k, (top + w / 2 + (Math.sin(a) * w) / 2) * pen.k)
  p.vertex((x + w / 2) * pen.k, bot * pen.k)
  p.endShape(p.CLOSE)
  line(pen, [x - w / 2 - 0.04, bot], [x + w / 2 + 0.04, bot], SPA.brass, 0.6)
  const f = flameAt(i, t)
  // The gust going by leans the flame over, his way, and it gutters a little.
  const wind = windAt(x, t)
  const lean = 0.09 * wind
  const g = f * (1 - 0.35 * wind)
  bloom(p, pen.k, [x, NICHE_Y - 0.02], 0.95, SPA.candle, 0.2 * g)
  bloom(p, pen.k, [x + lean * 0.5, NICHE_Y - 0.08], 0.28, SPA.candle, 0.45 * g)
  box(pen, x - 0.04, NICHE_Y + 0.02, x + 0.04, bot, SPA.towel, 0)
  const fx = x + 0.008 * Math.sin(t * 4 + i)
  shape(
    pen,
    [
      [fx + lean, NICHE_Y - 0.13 * f + 0.04 * wind],
      [fx + 0.03, NICHE_Y - 0.04],
      [fx, NICHE_Y + 0.01],
      [fx - 0.03, NICHE_Y - 0.04],
    ],
    SPA.candle,
    0,
  )
}

/** A candle's light down the floor's black gloss: a soft smear. */
function floorShine(pen: Pen, x: number, i: number, t: number): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const f = flameAt(i, t)
  const g = ctx.createLinearGradient(0, FLOOR_Y * k, 0, FLOOR_LIP * k)
  g.addColorStop(0, rgba(SPA.candle, 0.16 * f))
  g.addColorStop(1, rgba(SPA.candle, 0))
  ctx.save()
  ctx.beginPath()
  ctx.rect((x - 0.4) * k, FLOOR_Y * k, 0.8 * k, (FLOOR_LIP - FLOOR_Y) * k)
  ctx.clip()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x * k, FLOOR_Y * k, 0.24 * k, 0.26 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A cross wall at `x`, from the ceiling down to its lintel: seen edge on, a band of marble with a brass architrave. */
function crossWall(pen: Pen, x: number, lintel: number): void {
  box(pen, x - WALL_T / 2, CEIL - 1, x + WALL_T / 2, lintel, WALL_LOW, 0.7)
  box(pen, x - WALL_T / 2 - 0.06, lintel - 0.12, x + WALL_T / 2 + 0.06, lintel, SPA.brass, 0.6)
  box(pen, x - WALL_T / 2 - 0.04, FLOOR_Y - 0.04, x + WALL_T / 2 + 0.04, FLOOR_Y + 0.02, SPA.brass, 0)
}

/** A glass door leaf hinged at `hinge` (x) at the wall's face, `open` 0 (shut, edge on) .. 1 (swung out face on, toward `side`). */
function leaf(pen: Pen, hinge: number, side: 1 | -1, top: number, open: number): void {
  const wide = 0.06 + 0.7 * Math.sin((clamp01(open) * Math.PI) / 2)
  const x0 = side > 0 ? hinge : hinge - wide
  const x1 = side > 0 ? hinge + wide : hinge
  const y0 = top + 0.04
  const y1 = FLOOR_Y - 0.01
  // Frosted glass in a slim brass frame, a brass push bar across it and a kick plate at its foot.
  vwash(pen, x0, x1, y0, y1, [
    [0, SPA.steam, 0.3],
    [1, SPA.steam, 0.14],
  ])
  box(pen, x0, y0, x1, y1, null, 1.4, SPA.brass)
  if (wide > 0.2) {
    box(pen, x0 + 0.05, y0 + 1.2, x1 - 0.05, y0 + 1.27, SPA.brass, 0)
    box(pen, x0, y1 - 0.22, x1, y1, SPA.brass, 0)
  }
}

/** The spa's door, behind him at the head of the line: an arch in the back wall, a brass frame, warm light inside. */
function drawDoorway(pen: Pen, t: number): void {
  const x = DOOR0.x
  const hw = 0.66
  const top = DOOR0.lintel
  const arch: Pt[] = [[x - hw, FLOOR_Y]]
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (Math.PI * i) / 18
    arch.push([x + Math.cos(a) * hw, top + hw + Math.sin(a) * hw])
  }
  arch.push([x + hw, FLOOR_Y])
  shape(pen, arch, mixHex(SPA.mud, SPA.marble, 0.55), 0)
  vwash(pen, x - hw, x + hw, top, FLOOR_Y, [
    [0, SPA.marble, 0.4],
    [0.5, SPA.candle, 0.08],
    [1, SPA.candle, 0.38],
  ])
  const f = 0.9 + 0.1 * Math.sin(t * 1.7)
  pool(pen.p, pen.k, [x, FLOOR_Y + 0.05], 1.25, 0.14, SPA.candle, 0.3 * f)
  bloom(pen.p, pen.k, [x, FLOOR_Y - 0.6], 1.1, SPA.candle, 0.12 * f)
  // Its frame: brass, a keystone at the top of the arch.
  const frameOut = arch.map(([ax, ay]): Pt => [x + (ax - x) * 1.1, ay < FLOOR_Y - 0.01 ? top + hw + (ay - top - hw) * 1.1 - 0.02 : ay])
  shape(pen, frameOut, null, 1.6, SPA.brass)
  box(pen, x - 0.08, top - 0.12, x + 0.08, top + 0.06, SPA.brass, 0.5)
}

/** A white robe on its hook, the gust lifting its hem and sleeves his way as it goes by. */
function drawRobe(pen: Pen, x: number, t: number, i: number): void {
  const hook: Pt = [x, -1.8]
  const wind = windAt(x, t)
  const sway = 0.02 * Math.sin(t * 1.1 + i * 2)
  const lift = 0.5 * wind * (0.85 + 0.15 * Math.sin((t - i) * 11))
  const len = 1.2
  const { p, k } = pen
  p.push()
  p.translate(hook[0] * k, hook[1] * k)
  // The body swings about the hook; the hem swings further (a cloth, not a board).
  const bend = (u: number): Pt => {
    const a = sway + lift * u * u
    return [Math.sin(a) * len * u, 0.1 + Math.cos(a) * len * u]
  }
  const half = (u: number) => (u < 0.08 ? 0.07 + u * 2.4 : 0.26 + 0.05 * u)
  const pts: Pt[] = []
  for (let s = 0; s <= 10; s++) {
    const u = s / 10
    const c = bend(u)
    pts.push([c[0] - half(u), c[1]])
  }
  for (let s = 10; s >= 0; s--) {
    const u = s / 10
    const c = bend(u)
    pts.push([c[0] + half(u) + 0.03 * Math.sin(u * 6 + t * 3) * wind, c[1]])
  }
  shape(pen, pts, SPA.towel, 0.5)
  // Its sleeves, hanging at its sides, lifted with it.
  for (const side of [-1, 1]) {
    const sh = bend(0.09)
    const s0: Pt = [sh[0] + side * 0.26, sh[1]]
    const a = sway + lift * 0.5 + side * 0.12
    const s1: Pt = [s0[0] + Math.sin(a) * 0.55 + side * 0.06, s0[1] + Math.cos(a) * 0.55]
    shape(
      pen,
      [
        [s0[0] - 0.06, s0[1]],
        [s0[0] + 0.06, s0[1]],
        [s1[0] + 0.07, s1[1]],
        [s1[0] - 0.07, s1[1]],
      ],
      SPA.towelShade,
      0.45,
    )
  }
  // The collar's V, and the tie at the waist.
  const n = bend(0.0)
  const v = bend(0.32)
  polyline(pen, [[n[0] - 0.1, n[1] + 0.02], [v[0], v[1]], [n[0] + 0.1, n[1] + 0.02]], SPA.towelShade, 0.7)
  const w = bend(0.45)
  line(pen, [w[0] - half(0.45), w[1]], [w[0] + half(0.45), w[1]], SPA.towelShade, 1.0)
  line(pen, [w[0] + 0.05, w[1]], [w[0] + 0.1 + 0.2 * lift, w[1] + 0.2], SPA.towelShade, 0.8)
  line(pen, [0, -0.06], [0, 0.1], SPA.brass, 0.8)
  p.pop()
}

/** Outside the front door: the night street, the spa's light spilling out on it, and one photographer waiting, camera up. */
const PRESS: { x: number; top: number; hair: 'quiff' | 'bob'; cam: boolean; fires: number[] }[] = [
  { x: 1.55, top: 1.84, hair: 'quiff', cam: true, fires: PRESS_FLASH },
]
const NIGHT = mixHex(SPA.marble, SPA.steelDark, 0.35)
const MASS = SPA.marble
/** A shooter's head (its middle) and the flash gun's reflector over the camera. */
const headOf = (s: (typeof PRESS)[number]): Pt => [DOOR_X + s.x, FLOOR_Y - s.top + 0.22]
const reflectorOf = (s: (typeof PRESS)[number]): Pt => {
  const [hx, hy] = headOf(s)
  return [hx - 0.34, hy - 0.36]
}
function drawOutside(pen: Pen, out: number, x1: number, open: number): void {
  const { p, k } = pen
  const X = (v: number) => v * k
  box(pen, out, CEIL - 1, x1 + 1, FLOOR_Y, NIGHT, 0)
  vwash(pen, out, x1 + 1, CEIL - 1, FLOOR_Y, [
    [0, SPA.marble, 0.5],
    [1, SPA.steelDark, 0.25],
  ])
  // The pavement, wet: the door's light on it.
  box(pen, out, FLOOR_Y, x1 + 1, FLOOR_LIP + 3, mixHex(SPA.marble, SPA.tile, 0.5), 0)
  line(pen, [out, FLOOR_Y], [x1 + 1, FLOOR_Y], SPA.marbleVein, 0.9)
  pool(p, k, [out + 0.9, FLOOR_Y + 0.08], 1.6, 0.14, SPA.candle, 0.14 + 0.2 * open)
  // The press, facing the door: one dark mass of shoulders, heads and hats, arms up and cameras at their faces,
  // outlined together and filled together so only its outer edge catches the door's light.
  const shapes = () => {
    p.rectMode(p.CENTER)
    for (const s of PRESS) {
      const [hx, hy] = headOf(s)
      const sy = hy + 0.5
      p.rect(X(hx + 0.05), X((sy + FLOOR_Y) / 2), X(0.74), X(FLOOR_Y - sy))
      p.ellipse(X(hx + 0.05), X(sy), X(0.84), X(0.4))
      p.rect(X(hx), X(hy + 0.26), X(0.16), X(0.2))
      p.ellipse(X(hx), X(hy), X(0.32), X(0.4))
      // Bare heads: a quiff swept up at the front, or a bob to the jaw.
      if (s.hair === 'quiff') p.quad(X(hx - 0.16), X(hy - 0.08), X(hx - 0.2), X(hy - 0.25), X(hx + 0.02), X(hy - 0.28), X(hx + 0.12), X(hy - 0.12))
      else p.ellipse(X(hx + 0.03), X(hy + 0.02), X(0.42), X(0.44))
      if (!s.cam) continue
      // The arm up to the camera; the camera at the face; the flash gun's stem up to its reflector.
      p.quad(X(hx - 0.3), X(sy + 0.02), X(hx - 0.42), X(sy - 0.12), X(hx - 0.2), X(hy + 0.12), X(hx - 0.08), X(hy + 0.28))
      p.rect(X(hx - 0.24), X(hy + 0.05), X(0.36), X(0.24), X(0.03))
      p.rect(X(hx - 0.34), X(hy - 0.2), X(0.04), X(0.28))
      const [rx, ry] = reflectorOf(s)
      p.rect(X(rx), X(ry), X(0.16), X(0.1), X(0.03))
    }
  }
  // The rim: the mass drawn once a little toward the door in the door's light, then over it in the dark, so the light
  // shows only on the edges that face it.
  const rim = 0.25 + 0.55 * open
  p.push()
  p.translate(-0.035 * k, -0.01 * k)
  p.noStroke()
  p.fill(rgba(SPA.candle, rim))
  shapes()
  p.pop()
  p.noStroke()
  p.fill(MASS)
  shapes()
  // The reflectors: dull steel in the dark.
  for (const s of PRESS.filter((q) => q.cam)) box(pen, reflectorOf(s)[0] - 0.06, reflectorOf(s)[1] - 0.035, reflectorOf(s)[0] + 0.06, reflectorOf(s)[1] + 0.035, SPA.steelDark, 0)
}
/** The press's flashes, over them (and over the door's light). */
function drawFlashes(pen: Pen, t: number): void {
  for (const s of PRESS) for (const f of s.fires) flashBurst(pen.p, pen.k, reflectorOf(s), t - f, 1.5)
}

export function drawSet(p: p5, k: number, t: number, ink: string, weight: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const pen: Pen = { p, k, ink, w: weight }
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const out = DOOR_X + WALL_T / 2
  const inX1 = Math.min(x1, out)
  p.push()
  // The wainscot: a band of paler marble to the brass rail, the upper wall black; faint panel seams above.
  box(pen, x0, RAIL_Y, inX1, FLOOR_Y, WALL_LOW, 0)
  for (let x = Math.floor(x0 / 2.4) * 2.4; x < inX1; x += 2.4) {
    line(pen, [x, CEIL + 0.2], [x, RAIL_Y - 0.12], SPA.marbleVein, 0.45)
    line(pen, [x + 1.2, RAIL_Y + 0.12], [x + 1.2, FLOOR_Y - 0.1], SPA.marbleVein, 0.35)
  }
  line(pen, [x0, CEIL + 0.2], [inX1, CEIL + 0.2], SPA.marbleVein, 0.5)
  box(pen, x0, RAIL_Y - 0.05, inX1, RAIL_Y + 0.02, SPA.brass, 0)
  // The pool's light, up from under, on the wall's foot.
  vwash(pen, x0, inX1, RAIL_Y - 0.6, FLOOR_LIP, [
    [0, SPA.waterLight, 0],
    [0.75, SPA.waterLight, 0.05],
    [1, SPA.waterLight, 0.09],
  ])
  // The candles, the robes.
  CANDLES.forEach((x, i) => {
    if (x < x0 - 1 || x > x1 + 1) return
    drawCandle(pen, x, i, t)
  })
  ROBES.forEach((x, i) => {
    if (x < x0 - 1 || x > x1 + 1) return
    drawRobe(pen, x, t, i)
  })
  // The floor: black gloss, its lip over the water.
  box(pen, x0, FLOOR_Y, x1, FLOOR_LIP, SPA.marble, 0)
  line(pen, [x0, FLOOR_Y], [x1, FLOOR_Y], SPA.marbleVein, 0.9)
  CANDLES.forEach((x, i) => {
    if (x < x0 - 1 || x > x1 + 1) return
    floorShine(pen, x, i, t)
  })
  box(pen, x0, FLOOR_LIP - 0.05, inX1, FLOOR_LIP, SPA.brass, 0)
  // The pool: teal lit from lamps under the water at its lip, going dark as it goes down; its surface moving.
  const pb = Math.max(FLOOR_LIP + 0.5, f.y1 + 0.2)
  if (inX1 > x0) {
    vwash(pen, x0, inX1, FLOOR_LIP, pb, [
      [0, POOL_MID, 1],
      [Math.min(1, 0.35 / (pb - FLOOR_LIP)), mixHex(SPA.water, SPA.marble, 0.45), 1],
      [Math.min(1, 1.1 / (pb - FLOOR_LIP)), POOL_DEEP, 1],
      [1, POOL_DEEP, 1],
    ])
    for (let x = Math.floor(x0 / 2.8) * 2.8 + 1.1; x < inX1; x += 2.8) {
      const i = Math.round(x / 2.8)
      const glow = 0.22 + 0.05 * Math.sin(t * 0.9 + i) + 0.08 * level(t)
      bloom(p, k, [x, FLOOR_LIP + 0.45], 1.1, SPA.waterLight, glow * 0.45)
      pool(p, k, [x, FLOOR_LIP + 0.45], 0.4, 0.1, SPA.waterLight, glow * 0.8)
    }
    // The shine on its surface: soft bands drifting along under the lip.
    const ctx = ctxOf(p)
    ctx.save()
    for (let j = 0; j < 3; j++) {
      const y = FLOOR_LIP + 0.07 + j * 0.1
      const g = ctx.createLinearGradient(x0 * k, 0, inX1 * k, 0)
      const n = 14
      for (let s = 0; s <= n; s++) {
        const xx = x0 + ((inX1 - x0) * s) / n
        const w = 0.5 + 0.5 * Math.sin(xx * (1.3 + j * 0.4) + t * (0.8 + j * 0.3) + j * 2)
        g.addColorStop(s / n, rgba(SPA.waterLight, 0.14 * w * w * (1 - j * 0.3)))
      }
      ctx.fillStyle = g
      ctx.fillRect(x0 * k, (y - 0.025) * k, (inX1 - x0) * k, 0.05 * k)
    }
    ctx.restore()
  }

  // The door he came in by: an arched doorway in the back wall, the lobby's warm light in it, spilling out on the floor.
  if (DOOR0.x > x0 - 2 && DOOR0.x < x1 + 2) drawDoorway(pen, t)
  // The front door: shut until the gust blows it open on bar 39; the bright street beyond.
  if (DOOR_X > x0 - 3 && DOOR_X < x1 + 3) {
    const open = sm(t, DOORS - 0.1, DOORS + 0.5)
    const settle = t > DOORS + 0.5 ? 0.05 * Math.exp(-(t - DOORS - 0.5) / 0.3) * Math.sin((t - DOORS - 0.5) * 12) : 0
    if (x1 > out) drawOutside(pen, out, x1, open)
    // Its light in through the door as it opens, on the floor inside.
    pool(p, k, [DOOR_X - 0.9, FLOOR_Y + 0.05], 1.5, 0.15, SPA.towel, 0.25 * open)
    bloom(p, k, [DOOR_X - 0.2, FLOOR_Y - 0.9], 1.6, SPA.towel, 0.12 * open)
    crossWall(pen, DOOR_X, LINTEL)
    leaf(pen, out, 1, LINTEL, open + settle)
    if (x1 > out) drawFlashes(pen, t)
  }
  // The strips of towel across the way out: a fringe hung from a brass bar; he pushes through on bar 38.
  if (STRIPS_X > x0 - 2 && STRIPS_X < x1 + 2) drawStrips(pen, t)
  p.pop()
}

/** The strips: eight of them, hung in two ranks; pushed through, they swing out his way and fall back. */
function drawStrips(pen: Pen, t: number): void {
  const top = -1.25
  const x = STRIPS_X
  box(pen, x - 0.28, top - 0.07, x + 0.28, top, SPA.brass, 0.6)
  // How far the fringe is swung (radians, his way), pushed and falling back.
  const u = t - STRIPS
  const swing = u < -0.12 ? 0.15 * windAt(x, t) : u < 0 ? 0.25 * ((u + 0.12) / 0.12) : 0.25 + 0.3 * Math.exp(-u / 0.5) * Math.cos(u * 5.5) - 0.25 * sm(t, STRIPS, STRIPS + 1.6)
  for (let i = 0; i < 8; i++) {
    const xi = x - 0.22 + (i % 4) * 0.13 + (i < 4 ? 0 : 0.06)
    const a = swing * (0.8 + 0.4 * hash(i, 5)) + 0.02 * Math.sin(t * 1.3 + i)
    const len = FLOOR_Y - 0.08 - top
    const w = 0.07
    const bx = xi + Math.sin(a) * len
    const by = top + Math.cos(a) * len
    shape(
      pen,
      [
        [xi - w / 2, top],
        [xi + w / 2, top],
        [bx + w / 2, by],
        [bx - w / 2, by],
      ],
      i < 4 ? SPA.towelShade : SPA.towel,
      0.4,
    )
  }
}
