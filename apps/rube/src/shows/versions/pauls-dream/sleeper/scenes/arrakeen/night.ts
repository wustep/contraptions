import { drawFrigate, type FrigateLook } from '../../craft/frigate'
import { blob, drift, ellipse, fill, hash, layer, line, mix, poly, rect, rgba, ring, smooth, smoother, vgrad, type Layer, type Paint, type Pt } from '../../paint'
import { hazeAt } from '../../world/desert'
import { CHAIR, LAMP, ROOM, ROOM_DOOR, SHIELD, TOP_ROOMS, WEST_ROOM } from './geo'
import { ATTACK } from './times'

/**
 * The night: the house shield going out, the Harkonnen armada coming down out of the dark, the shells and the fires
 * they leave, the Duke's chair, the hall's lamps, and the gas from his tooth.
 *
 * Nothing here flashes. A hit is a fire that takes where the shell lands and spreads along the roof or ledge it fell
 * on, a sheet of flame with a slow uneven top under great masses of smoke; the fires stay. The shield is a thin pale
 * line, never a glow, and it goes out from its crown down. The gas is a few flat clouds that open and spread.
 */

/* ------------------------------------------------------------------ the shield */

export function drawShield(g: Paint, t: number): void {
  const from = ATTACK.from
  const out = ATTACK.shieldOut
  if (t < from || t > out + 1.6) return
  const ctx = g.ctx
  // Where the going-out has come down to: from over the crown on the blow to under the feet a second later, with a
  // short soft edge. Above it the shield is gone; below it, still there.
  const soft = 0.12
  const front = -soft - 0.01 + (1 + 2 * soft + 0.02) * smoother(t, out, out + 1.25)
  const at = (h: number) => smooth(h, front - soft, front + soft)
  const grad = (a: number, color: string): CanvasGradient => {
    const gr = ctx.createLinearGradient(0, -SHIELD.h, 0, 0)
    for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, rgba(color, a * at(i / 16)))
    return gr
  }
  // A pale veil inside its line, a few percent: the shield itself, there to be lost.
  ctx.beginPath()
  ctx.ellipse(SHIELD.cx, 0, SHIELD.w, SHIELD.h, 0, Math.PI, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = grad(0.08, '#A8BCD0')
  ctx.fill()
  // Its line, one stroke.
  ctx.beginPath()
  ctx.ellipse(SHIELD.cx, 0, SHIELD.w, SHIELD.h, 0, Math.PI, Math.PI * 2)
  ctx.strokeStyle = grad(0.45, '#B5C8DA')
  ctx.lineWidth = 2.2 * g.px
  ctx.stroke()
}

/* ------------------------------------------------------------------ the armada */

const HARK_SHIP: FrigateLook = { hull: '#2A2D33', belly: '#16181C', band: '#1E2126', port: '#8C6A3E', plume: '#4A4E56' }

/** The far ships: where each comes to (near-plane x and height at its depth), its depth, size, and when it starts down. */
const SHIPS = Array.from({ length: 7 }, (_, i) => ({
  x: 0 + i * 28 + 12 * (hash(i, 51) - 0.5),
  y: -40 - 24 * hash(i, 52),
  d: 60 + 150 * hash(i, 53),
  size: 1.7 + 1.0 * hash(i, 54),
  at: ATTACK.armada - 0.6 + 2.6 * hash(i, 55),
}))

/**
 * The near ships: two that come in low over the palace's roof as the armada arrives, so big that only their bellies
 * cross the top of the frame, sliding east and settling a little.
 */
const NEAR: { d: number; size: number; x0: number; x1: number; y0: number; y1: number }[] = [
  { d: 16, size: 2.3, x0: 18, x1: 100, y0: -47, y1: -42 },
  { d: 0, size: 2.0, x0: 34, x1: 112, y0: -40.5, y1: -37.4 },
]

function ship(g: Paint, L: Layer, x: number, y: number, size: number, look: FrigateLook, burn: number): void {
  const ctx = g.ctx
  ctx.save()
  ctx.translate(L.x(x), L.y(y))
  ctx.scale(L.s * size, L.s * size)
  drawFrigate({ ...g, px: g.px / (L.s * size) }, { x: 0, y: 0, burn }, look)
  ctx.restore()
}

/** The ships beyond the bowl's rim (`near` false), or this side of it. */
export function drawArmada(g: Paint, t: number, near: boolean): void {
  if (t < ATTACK.armada - 1) return
  // Far ones first.
  for (const s of [...SHIPS].sort((a, b) => b.d - a.d)) {
    if (near !== s.d <= 150) continue
    const L = layer(g.view, s.d)
    const down = smoother(t, s.at, s.at + 4.2)
    const y = s.y - 70 * (1 - down) + 0.4 * Math.sin((t - s.at) * 0.9 + s.x)
    const hz = hazeAt(s.d) * 0.7
    ship(g, L, s.x, y, s.size, { ...HARK_SHIP, hull: mix(HARK_SHIP.hull, '#1E2A3B', hz), belly: mix(HARK_SHIP.belly, '#1E2A3B', hz), band: mix(HARK_SHIP.band, '#1E2A3B', hz) }, 0.5 * (1 - down))
  }
}

/** The near ships, low over the roof: drawn after the city, before the near plane. */
export function drawNearShips(g: Paint, t: number): void {
  const a = ATTACK.armada - 0.8
  const b = ATTACK.sky + 1
  if (t < a || t > b + 6) return
  for (const n of NEAR) {
    const u = (t - a) / (b - a)
    const x = n.x0 + (n.x1 - n.x0) * u
    const y = n.y0 + (n.y1 - n.y0) * smoother(t, a, b)
    ship(g, layer(g.view, n.d), x, y, n.size, HARK_SHIP, 0.35)
  }
}

/* ------------------------------------------------------------------ shells and fires */

/**
 * Each hit: where it lands (near-plane cells at its depth, on the roof or ledge it burns along), its depth, how far
 * the fire spreads either way along the surface (`w`) and how tall it stands (`h`).
 */
const HITS: { t: number; x: number; y: number; d: number; w: number; h: number }[] = [
  { x: 40, y: -5.5, d: 24, w: 6, h: 2.6 },
  { x: 150, y: -7, d: 70, w: 11, h: 5 },
  { x: 89, y: -24, d: 0, w: 5.5, h: 1.7 },
  { x: 133, y: -5, d: 24, w: 6, h: 2.4 },
  { x: 60, y: -8, d: 70, w: 10, h: 4.6 },
  { x: 118, y: -9, d: 70, w: 9, h: 4.2 },
  { x: 96.5, y: -19.4, d: 0, w: 2.6, h: 0.9 },
  { x: 125.5, y: -14.8, d: 0, w: 3.4, h: 1.3 },
  { x: 128, y: -6, d: 24, w: 5, h: 2.2 },
].map((h, i) => ({ ...h, t: ATTACK.hits[i] }))

/**
 * A fire along a surface: a sheet of flame from `x0` to `x1` standing on `y`, its top a slow uneven edge, darker red
 * outside and paler toward its root. It moves the way a big fire does, slowly, and never flickers.
 */
function sheet(g: Paint, x0: number, x1: number, y: number, h: number, t: number, seed: number, fade: number): void {
  const ctx = g.ctx
  const layers: [number, string][] = [[1, '#6E1E0E'], [0.7, '#9C3315'], [0.42, '#C24A1B']]
  const n = Math.max(6, Math.ceil((x1 - x0) / Math.max(0.15, h * 0.35)))
  for (const [k, c] of layers) {
    const inset = (1 - k) * 0.35 * (x1 - x0) * 0.5
    const a = x0 + inset
    const b = x1 - inset
    if (b - a < 0.02) continue
    ctx.beginPath()
    ctx.moveTo(a, y + 0.02)
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const x = a + (b - a) * u
      const taper = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)))
      const wave = 0.75 + 0.25 * drift(x / Math.max(0.3, h * 1.2) + t * 0.45, seed)
      ctx.lineTo(x, y - h * k * wave * (0.7 + 0.3 * taper))
    }
    ctx.lineTo(b, y + 0.02)
    ctx.closePath()
    fill(ctx, rgba(c, fade))
  }
}

/** Smoke over a fire: a few great dark masses rolling up off it and leaning away east, growing, thinning. */
function smoke(g: Paint, x: number, y: number, w: number, h: number, age: number, seed: number, air: string, hz: number): void {
  const ctx = g.ctx
  const n = 4
  for (let i = 0; i < n; i++) {
    const life = (age * 0.12 + i / n) % 1
    if (age * 0.12 < i / n) continue
    const up = h * (1.2 + life * 9)
    const r = (w * 0.45 + h) * (0.6 + life * 1.6)
    const a = 0.62 * Math.sin(Math.PI * Math.min(1, life * 1.15)) * smooth(age, 0, 1.2)
    ellipse(ctx, x + up * 0.45 + drift(seed + i + age * 0.08, seed) * w * 0.3, y - up, r, r * 0.62, 0)
    fill(ctx, rgba(mix('#141316', air, hz), a))
  }
}

/** The shells in the air and the fires they leave, at the depth `d` only (so each is drawn in its own layer). */
export function drawFires(g: Paint, t: number, depth: (d: number) => boolean, air: string): void {
  for (const [i, h] of HITS.entries()) {
    if (!depth(h.d) || t < h.t - 1.1) continue
    const L = layer(g.view, h.d)
    const hz = hazeAt(h.d) * 0.8
    // The shell: down out of the dark from the armada's side, a short hot streak behind it.
    if (t < h.t) {
      const u = (t - (h.t - 1.1)) / 1.1
      const from: Pt = [h.x - 16, h.y - 26]
      const p = (v: number): Pt => [from[0] + (h.x - from[0]) * v, from[1] + (h.y - from[1]) * v * v]
      line(g, L.pt(p(Math.max(0, u - 0.12))), L.pt(p(u)), rgba('#E59A4A', 0.8 * (1 - hz)), 0.06 * L.s)
      continue
    }
    const age = t - h.t
    // It takes where it lands and spreads along the roof either way; it stands up tall at first and settles.
    const spread = h.w * (0.12 + 0.88 * (1 - Math.exp(-age / 2.4)))
    const tall = Math.min(h.h * (0.3 + 0.7 * smoother(age, 0, 0.5)), spread * 0.38)
    smoke(g, L.x(h.x), L.y(h.y), spread * L.s, tall * L.s, age, 70 + i, air, hz)
    sheet(g, L.x(h.x - spread), L.x(h.x + spread), L.y(h.y), tall * L.s, t, 80 + i, 1 - hz * 0.55)
  }
}

/* ------------------------------------------------------------------ the hall and Paul's room by night */

/**
 * The hall's one lamp by night: a tall iron stand under the bull, a shallow bowl, and a low flame in it, deep orange
 * and flat, that leans when the palace is struck and leans again on the blow after the Duke's death.
 */
export function drawHallLamp(g: Paint, t: number, iron: string): void {
  const ctx = g.ctx
  const [x, y] = LAMP
  line(g, [x, 0], [x, y + 0.12], iron, 0.05)
  poly(ctx, [[x - 0.3, 0], [x + 0.3, 0], [x + 0.08, -0.12], [x - 0.08, -0.12]])
  fill(ctx, iron)
  poly(ctx, [[x - 0.3, y], [x + 0.3, y], [x + 0.17, y + 0.16], [x - 0.17, y + 0.16]])
  fill(ctx, iron)
  const lean = 0.08 * (ring(t, ATTACK.fall, 0.7, 0.9) + 0.6 * ring(t, ATTACK.bite, 1.2, 0.4))
  const h = 0.11 + 0.015 * drift(t * 0.5, 7)
  // A low flat lens of flame in the bowl, deep orange, rounded: no peak.
  blob(ctx, [[x - 0.22, y + 0.01], [x - 0.14 + lean, y - h], [x + 0.14 + lean, y - h], [x + 0.22, y + 0.01]])
  fill(ctx, '#A9441A')
  blob(ctx, [[x - 0.12, y + 0.01], [x - 0.06 + lean, y - h * 0.6], [x + 0.06 + lean, y - h * 0.6], [x + 0.12, y + 0.01]])
  fill(ctx, '#C25A21')
}
/**
 * The lamp's light where it falls, under the balls, flat: a lit ellipse on the floor round the chair (two steps of
 * light, a short soft edge), and a trapezoid of light thrown up the wall from the flame, its sides straight, fading
 * toward its top over the bull. The rest of the hall is left dark.
 */
export function drawHallPool(g: Paint, lamp: string): void {
  const ctx = g.ctx
  const [x, y] = LAMP
  const flame = y - 0.1
  // Up the wall from the flame: narrow at the bowl, wide over the bull, straight-sided.
  const top = -4.3
  poly(ctx, [[x - 0.26, flame], [x + 0.26, flame], [x + 1.25, top], [x - 1.25, top]])
  fill(ctx, (() => {
    const gr = ctx.createLinearGradient(0, flame, 0, top)
    gr.addColorStop(0, rgba(lamp, 0.24))
    gr.addColorStop(0.65, rgba(lamp, 0.15))
    gr.addColorStop(1, rgba(lamp, 0))
    return gr
  })())
  // On the floor round the chair and the lamp's foot: an outer step and an inner one.
  for (const [rx, ry, a] of [[2.5, 0.34, 0.16], [2.1, 0.27, 0.14], [1.4, 0.2, 0.12]] as [number, number, number][]) {
    ellipse(ctx, x - 0.3, 0.12, rx, ry, 0)
    fill(ctx, rgba(lamp, a))
  }
}
/**
 * Over the bull (hung at `top`, its plaque's top): the lamp's light from below on it, flat, on the underside of its
 * muzzle, the lower face and the undersides of the horns' sweep. The bull itself is drawn dim; this is all that is lit.
 */
export function underlightBull(g: Paint, top: Pt, lamp: string, swing = 0): void {
  const ctx = g.ctx
  ctx.save()
  ctx.translate(top[0], top[1])
  ctx.rotate(swing)
  // The lower face and the muzzle, as the bull's own shapes give them.
  blob(ctx, [[-0.15, 0.62], [0.15, 0.62], [0.13, 0.84], [0.1, 0.95], [0, 0.98], [-0.1, 0.95], [-0.13, 0.84]])
  fill(ctx, rgba(lamp, 0.26))
  ellipse(ctx, 0, 0.93, 0.11, 0.055, 0)
  fill(ctx, rgba(lamp, 0.42))
  // The horns' undersides, where they leave the head.
  for (const s of [-1, 1]) {
    blob(ctx, [[0.18 * s, 0.38], [0.36 * s, 0.25], [0.5 * s, 0.17], [0.4 * s, 0.26], [0.24 * s, 0.38]])
    fill(ctx, rgba(lamp, 0.35))
  }
  ctx.restore()
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

/** The rooms over the hall and over Paul's: a lamp on a low table in each, so a tall stage sees a palace lived in. */
export function drawUpperRooms(g: Paint, lamp: string, wood: string): void {
  const ctx = g.ctx
  for (const [x, f] of [[84.5, WEST_ROOM.floor], [93.5, TOP_ROOMS.floor], [72.5, TOP_ROOMS.floor]] as [number, number][]) {
    rect(ctx, x - 0.35, f - 0.42, 0.7, 0.42)
    fill(ctx, wood)
    poly(ctx, [[x - 0.25, f - 0.42], [x + 0.25, f - 0.42], [x + 0.15, f - 0.62], [x - 0.15, f - 0.62]])
    fill(ctx, mix(wood, '#000000', 0.3))
    ellipse(ctx, x, f - 0.63, 0.2, 0.05, 0)
    fill(ctx, lamp)
  }
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
  return times.map((t, i) => ({ t, dx: 0.3 + 1.0 * hash(i, 91), dy: -0.2 - 0.5 * hash(i, 92), r: i === 0 ? 0.45 : 0.8 + 0.8 * hash(i, 93) + (i === times.length - 1 ? 0.9 : 0) }))
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

/* ------------------------------------------------------------------ the fire's light in Paul's room */

/**
 * Over the balls in Paul's room once the city is burning: the fire's light coming in at the window, a flat warm wash
 * over the room and whoever is in it, as strong as the fires are big; and on the blast over the window, dust sifting
 * down from the ceiling.
 */
export function drawRoomLight(g: Paint, t: number): void {
  const ctx = g.ctx
  const light = smooth(t, ATTACK.hits[0], ATTACK.hits[5] + 1.5)
  if (light > 0.002) {
    rect(ctx, ROOM.x0, ROOM.ceil, ROOM.x1 - ROOM.x0, ROOM.floor - ROOM.ceil)
    fill(ctx, rgba('#E2782C', 0.16 * light))
  }
  const age = t - ATTACK.hits[6]
  if (age > 0 && age < 2) {
    // A soft band, thickest at its middle, fading out above and below: no edge to it.
    const y = ROOM.ceil + (ROOM.floor - ROOM.ceil) * smooth(age, 0, 1.4)
    const a = 0.28 * (1 - smooth(age, 0.5, 2))
    rect(ctx, ROOM.x0, y - 1.3, ROOM.x1 - ROOM.x0, 1.6)
    fill(ctx, vgrad(ctx, y - 1.3, y + 0.3, [[0, rgba('#BBA588', 0)], [0.6, rgba('#BBA588', a)], [1, rgba('#BBA588', 0)]]))
  }
}

