import { drawFrigate, type FrigateLook } from '../../craft/frigate'
import { blob, drift, ellipse, fill, hash, layer, line, mix, poly, rect, rgba, ring, smooth, smoother, stroke, type Paint, type Pt } from '../../paint'
import { hazeAt } from '../../world/desert'
import { CHAIR, HALL, ROOM, ROOM_DOOR, SHIELD } from './geo'
import { ATTACK } from './times'

/**
 * The night: the house shield going out, the Harkonnen armada coming down out of the dark, the shells and the fires
 * they leave, the Duke's chair, the hall's lamps, and the gas from his tooth.
 *
 * Nothing here flashes. A hit is a flame that grows in a quarter of a second to a little over its size and settles to
 * burning, and its smoke rises; the fires stay. The shield is a thin pale line, never a glow, and it goes out from its
 * crown down. The gas is a few flat clouds that open and spread.
 */

/* ------------------------------------------------------------------ the shield */

export function drawShield(g: Paint, t: number): void {
  const from = ATTACK.from
  const out = ATTACK.shieldOut
  if (t < from || t > out + 3) return
  const p = smooth(t, out, out + 2.2)
  const ctx = g.ctx
  const n = 48
  // A faint flat body to it, gone first.
  ctx.beginPath()
  ctx.ellipse(SHIELD.cx, 0, SHIELD.w, SHIELD.h, 0, Math.PI, Math.PI * 2)
  ctx.closePath()
  fill(ctx, rgba('#9DB3C9', 0.035 * (1 - smooth(p, 0, 0.35))))
  // The line, a segment at a time: the crown goes out first, the feet last.
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI
    const a1 = Math.PI + ((i + 1) / n) * Math.PI
    const h = Math.abs(Math.sin((a0 + a1) / 2))
    const gone = smooth(p, (1 - h) * 0.6, (1 - h) * 0.6 + 0.4)
    const a = 0.42 * (1 - gone)
    if (a <= 0.004) continue
    ctx.beginPath()
    ctx.ellipse(SHIELD.cx, 0, SHIELD.w, SHIELD.h, 0, a0, a1)
    stroke(g, rgba('#B5C8DA', a), 0.11)
  }
}

/* ------------------------------------------------------------------ the armada */

const HARK_SHIP: FrigateLook = { hull: '#2A2D33', belly: '#16181C', band: '#1E2126', port: '#8C6A3E', plume: '#4A4E56' }

/** The ships: where each comes to (near-plane x and height at its depth), its depth, size, and when it starts down. */
const SHIPS = Array.from({ length: 7 }, (_, i) => ({
  x: 0 + i * 28 + 12 * (hash(i, 51) - 0.5),
  y: -40 - 24 * hash(i, 52),
  d: 60 + 150 * hash(i, 53),
  size: 1.7 + 1.0 * hash(i, 54),
  at: ATTACK.armada - 0.6 + 2.6 * hash(i, 55),
}))

/** The ships beyond the bowl's rim (`near` false), or this side of it. */
export function drawArmada(g: Paint, t: number, near: boolean): void {
  if (t < ATTACK.armada - 1) return
  const ctx = g.ctx
  // Far ones first.
  for (const s of [...SHIPS].sort((a, b) => b.d - a.d)) {
    if (near !== s.d <= 150) continue
    const L = layer(g.view, s.d)
    const down = smoother(t, s.at, s.at + 4.2)
    const y = s.y - 70 * (1 - down) + 0.4 * Math.sin((t - s.at) * 0.9 + s.x)
    const hz = hazeAt(s.d) * 0.7
    const look: FrigateLook = { ...HARK_SHIP, hull: mix(HARK_SHIP.hull, '#1E2A3B', hz), belly: mix(HARK_SHIP.belly, '#1E2A3B', hz), band: mix(HARK_SHIP.band, '#1E2A3B', hz) }
    ctx.save()
    ctx.translate(L.x(s.x), L.y(y))
    ctx.scale(L.s * s.size, L.s * s.size)
    drawFrigate({ ...g, px: g.px / (L.s * s.size) }, { x: 0, y: 0, burn: 0.5 * (1 - down) }, look)
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ shells and fires */

/** Each hit: where (near-plane cells at its depth), its depth, and how big a fire it leaves. */
const HITS: { t: number; x: number; y: number; d: number; size: number }[] = [
  { x: 40, y: -5.5, d: 24, size: 4.0 },
  { x: 150, y: -7, d: 70, size: 5.5 },
  { x: 90, y: -24, d: 0, size: 1.6 },
  { x: 133, y: -5, d: 24, size: 3.6 },
  { x: 96.5, y: -21.2, d: 0, size: 1.3 },
  { x: 18, y: -9, d: 70, size: 6.0 },
  { x: 131.5, y: -14.8, d: 0, size: 1.2 },
  { x: 47, y: 0, d: 0, size: 2.2 },
  { x: 25, y: -3.2, d: 0, size: 2.6 },
  { x: 84, y: -24, d: 0, size: 1.5 },
].map((h, i) => ({ ...h, t: ATTACK.hits[i] }))

/** Fire: a few flat tongues, the outer a deep orange, the core paler; slow, never flickering. */
function flame(g: Paint, x: number, y: number, s: number, t: number, seed: number): void {
  const ctx = g.ctx
  const tongues: [number, string][] = [[1, '#B9471B'], [0.7, '#E07C2E'], [0.4, '#F2B354']]
  for (const [k, c] of tongues) {
    const pts: Pt[] = []
    const n = 9
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI
      const lick = 1 + 0.35 * drift(t * 0.9 + i * 1.7, seed + i)
      const r = s * k * (i === 0 || i === n - 1 ? 0.9 : 1)
      pts.push([x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 1.5 * lick])
    }
    pts.push([x + s * k * 0.8, y + 0.15 * s], [x - s * k * 0.8, y + 0.15 * s])
    blob(ctx, pts)
    fill(ctx, c)
  }
}

/** Smoke from a fire: dark rounded masses rising from it, growing, leaning with the wind, thinning. */
function smoke(g: Paint, x: number, y: number, s: number, age: number, seed: number, air: string, hz: number): void {
  const ctx = g.ctx
  const n = 6
  for (let i = 0; i < n; i++) {
    const life = (age * 0.35 + i / n) % 1
    if (age * 0.35 < i / n) continue
    const up = life * 9 * s
    const r = s * (0.7 + life * 2.2)
    const a = 0.55 * (1 - life) * smooth(age, 0, 1)
    ellipse(ctx, x + up * 0.35 + drift(seed + i + age * 0.2, seed) * s, y - 1.2 * s - up, r, r * 0.8, 0)
    fill(ctx, rgba(mix('#1C1B1E', air, hz), a))
  }
}

/** The shells in the air and the fires they leave, at the depth `d` only (so each is drawn in its own layer). */
export function drawFires(g: Paint, t: number, depth: (d: number) => boolean, air: string): void {
  const ctx = g.ctx
  for (const [i, h] of HITS.entries()) {
    if (!depth(h.d) || t < h.t - 1.1) continue
    const L = layer(g.view, h.d)
    const hz = hazeAt(h.d) * 0.8
    // The shell: coming down out of the dark from the armada's side, a short hot streak behind it.
    if (t < h.t) {
      const u = (t - (h.t - 1.1)) / 1.1
      const from: Pt = [h.x - 16, h.y - 26]
      const p = (v: number): Pt => [from[0] + (h.x - from[0]) * v, from[1] + (h.y - from[1]) * v * v]
      const [ax, ay] = p(Math.max(0, u - 0.12))
      const [bx, by] = p(u)
      line(g, L.pt([ax, ay]), L.pt([bx, by]), rgba('#E59A4A', 0.8 * (1 - hz)), 0.06 * L.s)
      continue
    }
    const age = t - h.t
    // It takes, a little past its size, and settles to burning.
    const s = h.size * L.s * (smoother(age, 0, 0.25) * (1 + 0.25 * Math.exp(-age / 0.5)))
    smoke(g, L.x(h.x), L.y(h.y), h.size * L.s, age, 70 + i, air, hz)
    ctx.save()
    if (hz > 0.01) ctx.globalAlpha = 1 - hz * 0.6
    flame(g, L.x(h.x), L.y(h.y), s, t, 80 + i)
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the hall and Paul's room by night */

/** The hall's lamps: bowls on chains from the vault, swinging when the palace is struck. */
const LAMPS = [76.2, 85.8]
export function drawLamps(g: Paint, t: number, lamp: string, iron: string): void {
  for (const [i, x] of LAMPS.entries()) {
    const sway = 0.08 * (ring(t, ATTACK.fall, 0.55, 1.6) + 0.4 * ring(t, ATTACK.hits[2], 0.6, 1.2)) * (i ? -1 : 1)
    const top: Pt = [x, HALL.ceil]
    const len = 8.4
    const bx = x + Math.sin(sway) * len
    const by = HALL.ceil + Math.cos(sway) * len
    line(g, top, [bx, by], iron, 0.035)
    poly(g.ctx, [[bx - 0.42, by], [bx + 0.42, by], [bx + 0.24, by + 0.28], [bx - 0.24, by + 0.28]])
    fill(g.ctx, iron)
    ellipse(g.ctx, bx, by, 0.4, 0.09, 0)
    fill(g.ctx, lamp)
  }
}

/** Paul's room: a low bed by its west wall, a lamp on a low table by the window. */
export function drawRoom(g: Paint, lamp: string, wood: string): void {
  const ctx = g.ctx
  const f = ROOM.floor
  rect(ctx, ROOM.x0 + 0.3, f - 0.34, 2.4, 0.34)
  fill(ctx, wood)
  rect(ctx, ROOM.x0 + 0.3, f - 0.44, 2.4, 0.1)
  fill(ctx, mix(wood, '#C9B9A0', 0.35))
  rect(ctx, 91.75, f - 0.42, 0.7, 0.42)
  fill(ctx, wood)
  poly(ctx, [[91.85, f - 0.42], [92.35, f - 0.42], [92.25, f - 0.62], [91.95, f - 0.62]])
  fill(ctx, mix(wood, '#000000', 0.3))
  ellipse(ctx, 92.1, f - 0.63, 0.2, 0.05, 0)
  fill(ctx, lamp)
}

/** Paul's door, in the east wall onto the terrace: shut, then broken in and lying on the room's floor. */
export function drawDoor(g: Paint, t: number, wood: string): void {
  const ctx = g.ctx
  const fallen = smoother(t, ATTACK.door, ATTACK.door + 0.32)
  const h = ROOM.floor - ROOM_DOOR.top
  // Hinged at its foot on the room's side, it falls in, west, onto the floor.
  ctx.save()
  ctx.translate(ROOM_DOOR.x0 + 0.05, ROOM.floor)
  ctx.rotate((-Math.PI / 2) * fallen + 0.05 * ring(t, ATTACK.door + 0.32, 2.4, 0.18))
  rect(ctx, 0, -h, 0.2, h)
  fill(ctx, wood)
  ctx.restore()
}

/** The Duke's chair, high-backed, under the bull's head. */
export function drawChair(g: Paint, wood: string): void {
  const ctx = g.ctx
  const [x] = CHAIR
  rect(ctx, x - 0.42, -1.45, 0.14, 1.45)
  fill(ctx, wood)
  rect(ctx, x - 0.42, -0.36, 0.86, 0.1)
  fill(ctx, wood)
  for (const lx of [x - 0.38, x + 0.36]) {
    rect(ctx, lx, -0.27, 0.07, 0.27)
    fill(ctx, wood)
  }
}

/** The bonds across him: two dark straps over the ball, drawn over it. */
export function drawStraps(g: Paint, at: Pt, r: number, color: string): void {
  for (const dy of [-0.35, 0.3]) line(g, [at[0] - r * 1.05, at[1] + dy * r], [at[0] + r * 1.05, at[1] + dy * r], color, 0.035)
}

/* ------------------------------------------------------------------ the gas */

/** Puffs of the gas from his tooth: when each opens, where it drifts from, how big it grows. */
const PUFFS = (() => {
  const times = [ATTACK.bite, ATTACK.gas[0], ATTACK.gas[1], ATTACK.guards[0], ATTACK.guards[1], ATTACK.flee, ATTACK.death]
  return times.map((t, i) => ({ t, dx: (hash(i, 91) - 0.4) * 1.6, dy: -0.2 - 0.5 * hash(i, 92), r: i === 0 ? 0.45 : 0.8 + 0.8 * hash(i, 93) + (i === times.length - 1 ? 0.9 : 0) }))
})()

export function drawGas(g: Paint, t: number, from: Pt): void {
  if (t < ATTACK.bite) return
  const ctx = g.ctx
  for (const [i, p] of PUFFS.entries()) {
    const age = t - p.t
    if (age <= 0) continue
    const grow = 1 - Math.exp(-age / 1.1)
    const r = p.r * grow + 0.08 * age
    const ry = r * 0.5
    const x = from[0] + p.dx * (0.4 + grow) + 0.12 * drift(age * 0.3, 95 + i)
    // Heavy: it lies low and spreads along the floor more than it rises.
    const y = Math.min(-ry * 0.8, from[1] + p.dy * 0.5 - 0.1 * age)
    blob(ctx, [
      [x - r, y + ry * 0.2], [x - r * 0.6, y - ry * 0.8], [x, y - ry], [x + r * 0.65, y - ry * 0.75], [x + r, y + ry * 0.15],
      [x + r * 0.55, y + ry * 0.7], [x - r * 0.5, y + ry * 0.7],
    ])
    fill(ctx, rgba('#A3AE92', 0.1 * smooth(age, 0, 0.5)))
  }
}

