import type { Light } from '../../light'
import { box, circle, fill, hash, ink, lit, mix, poly, pool, rgba, smooth, sway, vgrad, type Paint } from '../../paint'
import { BATH, SEA_Y } from '../../geo'

/**
 * The bathhouse, from the south: its front to us, the bridge running into its door at the west end, its east end out
 * over the sea. Storey on storey, each a little narrower, each a band of paper screens behind a red balcony rail under
 * its own green copper roof with the eaves turned up; the great curved gable over the door; on the great roof two
 * turrets and Yubaba's western rooms with their dome; the boiler room's chimney up the east end, smoking; and under it
 * all the dark forest of its footings going down to the water.
 *
 * By day the screens are paper; at night every one is lit, warm, and the lanterns along its eaves are in. It is drawn
 * whole, and a scene that goes inside it has the front taken away there (`Cut`): the wall over the great bath's hall,
 * her room, the boiler room. What is inside is the scene's own drawing, under this one.
 */

export interface Cut {
  /** How far the front is away over the great bath's hall, her room, and the boiler room: 0 whole, 1 gone. */
  hall: number
  room: number
  boiler: number
}

export const WHOLE: Cut = { hall: 0, room: 0, boiler: 0 }

const RED = '#B4432F'
const RED_DARK = '#7E2A1F'
const PLASTER = '#E7DDC6'
const COPPER = '#4F8B78'
const COPPER_DARK = '#2D5B4D'
const TIMBER = '#3B2A21'
const PAPER = '#ECE2C6'
const LAMPLIT = '#F4C67C'
const LINE = '#2A1712'

/** The storeys over the hall's: [x0, x1] of each, from the second up. Each is a balcony band under its roof. */
export const UPPER: [number, number][] = [
  [55.0, 70.5],
  [55.6, 70.5],
  [56.4, 69.6],
  [57.4, 68.4],
]

/** The lamps along the eaves, and the screens, as the evening lights them. */
export const lampsOn = (L: Light) => smooth(L.lamps, 0.15, 0.85)

/** A green copper roof over `x0..x1` at eave height `y`, `rise` tall, its ends turned up, projecting `over`. */
export function roof(g: Paint, L: Light, x0: number, x1: number, y: number, rise: number, over = 0.45): void {
  const { ctx } = g
  const c = lit(COPPER, L.ambient, 0.15)
  const under = lit(COPPER_DARK, L.ambient, 0.1)
  const line = mix(LINE, L.top, 0.25)
  const a = x0 - over
  const b = x1 + over
  // The eave's underside, a dark band, then the roof's face sweeping up to its ridge, the ends lifted.
  poly(ctx, [[a + 0.15, y], [b - 0.15, y], [b - 0.15, y + 0.1], [a + 0.15, y + 0.1]])
  fill(ctx, under)
  ctx.beginPath()
  ctx.moveTo(a - 0.18, y - 0.22)
  ctx.quadraticCurveTo(a + 0.3, y + 0.03, a + 0.75, y + 0.03)
  ctx.lineTo(b - 0.75, y + 0.03)
  ctx.quadraticCurveTo(b - 0.3, y + 0.03, b + 0.18, y - 0.22)
  ctx.quadraticCurveTo(b - 0.25, y - rise * 0.5, b - over - 0.15, y - rise)
  ctx.lineTo(a + over + 0.15, y - rise)
  ctx.quadraticCurveTo(a + 0.25, y - rise * 0.5, a - 0.18, y - 0.22)
  ctx.closePath()
  fill(ctx, c)
  ink(g, line, 1.7)
  // A lighter band along the eave's lip, where the light catches it.
  ctx.beginPath()
  ctx.moveTo(a - 0.14, y - 0.2)
  ctx.quadraticCurveTo(a + 0.3, y - 0.01, a + 0.75, y - 0.01)
  ctx.lineTo(b - 0.75, y - 0.01)
  ctx.quadraticCurveTo(b - 0.3, y - 0.01, b + 0.14, y - 0.2)
  ink(g, lit('#7DB3A0', L.ambient, 0.2), 2.4)
}

/** A band of paper screens between `x0` and `x1`, `y0` to `y1`: paper by day, lit at night, panel by panel. */
function screens(g: Paint, L: Light, x0: number, x1: number, y0: number, y1: number, seed: number): void {
  const { ctx } = g
  const on = lampsOn(L)
  const n = Math.max(2, Math.round((x1 - x0) / 0.62))
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    // Each comes on at its own point in the evening's lighting; a few are dark all night.
    const dark = hash(i, seed + 7) < 0.12
    const mine = dark ? 0.12 * on : smooth(on, hash(i, seed) * 0.5, hash(i, seed) * 0.5 + 0.45)
    box(ctx, x0 + i * w, y0, w, y1 - y0, mix(lit(PAPER, L.ambient, 0.1), LAMPLIT, mine))
  }
  // The screens' frames: a thin dark line between panels and one across, no finer lattice.
  const line = mix(lit(RED_DARK, L.ambient), '#7A3F1C', on * 0.4)
  for (let i = 1; i < n; i++) {
    poly(ctx, [[x0 + i * w, y0], [x0 + i * w, y1]], false)
    ink(g, line, 1.2)
  }
  poly(ctx, [[x0, y0 + (y1 - y0) * 0.38], [x1, y0 + (y1 - y0) * 0.38]], false)
  ink(g, line, 1)
}

/** An upper storey: a band of screens set back behind red posts and a red balcony rail, the floor's edge under it. */
function upper(g: Paint, L: Light, x0: number, x1: number, y0: number, y1: number, seed: number): void {
  const { ctx } = g
  const red = lit(RED, L.ambient, 0.1)
  box(ctx, x0, y0, x1 - x0, y1 - y0, lit(PLASTER, L.ambient, 0.1))
  screens(g, L, x0 + 0.08, x1 - 0.08, y0 + 0.16, y1 - 0.12, seed)
  // Posts.
  const n = Math.max(2, Math.round((x1 - x0) / 1.55))
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    box(ctx, x - 0.065, y0, 0.13, y1 - y0, red)
  }
  // The balcony: its floor's edge, the rail, and the balusters, all red.
  box(ctx, x0 - 0.1, y1 - 0.06, x1 - x0 + 0.2, 0.1, lit(RED_DARK, L.ambient, 0.1))
  box(ctx, x0 - 0.1, y1 - 0.42, x1 - x0 + 0.2, 0.065, red)
  for (let x = x0 + 0.15; x < x1; x += 0.36) box(ctx, x - 0.02, y1 - 0.4, 0.04, 0.34, red)
}

/** The hall's storey at the bridge's level: tall, red-framed, its great windows lit, a band of red over them. */
function ground(g: Paint, L: Light, x0: number, x1: number): void {
  const { ctx } = g
  const y0 = BATH.floors[1]
  const y1 = BATH.floor
  const red = lit(RED, L.ambient, 0.1)
  box(ctx, x0, y0, x1 - x0, y1 - y0, lit(PLASTER, L.ambient, 0.1))
  // Two tiers of tall windows, the gallery's and the floor's, between big posts.
  const posts = [x0, 58.4, 61.0, 63.6, 66.2, 68.8, x1]
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i] + 0.25
    const b = posts[i + 1] - 0.25
    if (b - a < 0.3 || (a < BATH.door + 1.3 && b > BATH.door - 1.3)) continue
    screens(g, L, a, b, y0 + 0.4, BATH.gallery - 0.15, i * 3 + 51)
    screens(g, L, a, b, BATH.gallery + 0.35, y1 - 0.25, i * 3 + 52)
  }
  box(ctx, x0, BATH.gallery - 0.12, x1 - x0, 0.32, red)
  box(ctx, x0, y0, x1 - x0, 0.22, red)
  for (const x of posts) box(ctx, x - 0.11, y0, 0.22, y1 - y0, red)
}

/** The footings: dark posts and braces from the floor down to the water, the dark between them. */
function footings(g: Paint, L: Light, cut: Cut): void {
  const { ctx } = g
  const top = BATH.floor
  const bottom = SEA_Y + 0.4
  ctx.fillStyle = vgrad(ctx, top, bottom, [
    [0, lit('#2E221B', L.ambient)],
    [1, lit('#17110C', L.ambient)],
  ])
  ctx.fillRect(BATH.x0 + 0.3, top, BATH.x1 - BATH.x0 - 0.6, bottom - top)
  const post = lit('#5A4232', L.ambient)
  const brace = lit('#4A3628', L.ambient)
  const xs: number[] = []
  for (let x = BATH.x0 + 0.45; x < BATH.x1; x += 1.55) xs.push(x)
  for (let y = top + 0.15; y < bottom - 0.5; y += 1.45) {
    box(ctx, BATH.x0 + 0.3, y, BATH.x1 - BATH.x0 - 0.6, 0.1, brace)
    // Crossed braces in each bay.
    for (let i = 0; i + 1 < xs.length; i++) {
      ctx.lineWidth = 0.07
      ctx.strokeStyle = brace
      ctx.beginPath()
      ctx.moveTo(xs[i], y + 0.1)
      ctx.lineTo(xs[i + 1], y + 1.45)
      ctx.moveTo(xs[i + 1], y + 0.1)
      ctx.lineTo(xs[i], y + 1.45)
      ctx.stroke()
    }
  }
  for (const x of xs) box(ctx, x - 0.1, top, 0.2, bottom - top, post)
  // The boiler room's front at the footings' east foot: brick, a small door, a window red with the fire.
  const b = BATH.boiler
  const a = 1 - cut.boiler
  if (a > 0.01) {
    ctx.save()
    ctx.globalAlpha = a
    box(ctx, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, lit('#7A4A36', L.ambient))
    for (let y = b.y0 + 0.32; y < b.y1; y += 0.32) {
      poly(ctx, [[b.x0, y], [b.x1, y]], false)
      ink(g, lit('#5E3626', L.ambient), 1)
    }
    box(ctx, b.x0 + 0.8, b.y1 - 0.75, 0.42, 0.75, lit('#2A1A12', L.ambient))
    box(ctx, b.x0 + 2.4, b.y0 + 0.55, 1.4, 0.65, mix(lit('#3A2A20', L.ambient), '#E8925A', 0.55 + 0.45 * lampsOn(L)))
    roof(g, L, b.x0, b.x1, b.y0, 0.35, 0.2)
    ctx.restore()
  }
}

/** The great curved gable over the door, and the door with its curtain. */
function entrance(g: Paint, L: Light): void {
  const { ctx } = g
  const x = BATH.door
  const y = BATH.floor
  const red = lit(RED, L.ambient, 0.1)
  const line = mix(LINE, L.top, 0.2)
  // The porch's posts and the door.
  box(ctx, x - 1.15, y - 2.4, 0.2, 2.4, red)
  box(ctx, x + 0.95, y - 2.4, 0.2, 2.4, red)
  const on = lampsOn(L)
  box(ctx, x - 0.95, y - 2.1, 1.9, 2.1, mix(lit('#2E201A', L.ambient), '#E9B26A', on * 0.75))
  // The curtain: deep blue, split in two, with the hot spring's sign on it in white, stirring.
  const stir = 0.02 * sway(g.t, 0.3, 4)
  for (const s of [-1, 1]) {
    poly(ctx, [[x + s * 0.02, y - 2.1], [x + s * 0.93, y - 2.1], [x + s * 0.93 + stir, y - 1.05], [x + s * 0.02 + stir, y - 1.05]])
    fill(ctx, lit('#2C3D6B', L.ambient, 0.1))
  }
  // The sign: a round bath with three curls of steam, drawn, not written.
  const sx = x
  const sy = y - 1.5
  ctx.beginPath()
  ctx.ellipse(sx, sy + 0.12, 0.2, 0.08, 0, 0, Math.PI)
  ink(g, lit('#EFE8DA', L.ambient, 0.2), 3)
  for (const d of [-0.12, 0, 0.12]) {
    ctx.beginPath()
    ctx.moveTo(sx + d, sy + 0.06)
    ctx.bezierCurveTo(sx + d - 0.06, sy - 0.04, sx + d + 0.06, sy - 0.1, sx + d, sy - 0.2)
    ink(g, lit('#EFE8DA', L.ambient, 0.2), 2.6)
  }
  // The gable: a great curved roof swelling up over the door, green, its board red with a gold boss.
  const top = y - 3.75
  const c = lit(COPPER, L.ambient, 0.15)
  ctx.beginPath()
  ctx.moveTo(x - 1.9, y - 2.35)
  ctx.bezierCurveTo(x - 1.3, y - 2.42, x - 0.9, top + 0.05, x, top - 0.12)
  ctx.bezierCurveTo(x + 0.9, top + 0.05, x + 1.3, y - 2.42, x + 1.9, y - 2.35)
  ctx.lineTo(x + 1.72, y - 2.18)
  ctx.bezierCurveTo(x + 1.2, y - 2.25, x + 0.8, top + 0.34, x, top + 0.22)
  ctx.bezierCurveTo(x - 0.8, top + 0.34, x - 1.2, y - 2.25, x - 1.72, y - 2.18)
  ctx.closePath()
  fill(ctx, c)
  ink(g, line, 1.8)
  ctx.beginPath()
  ctx.moveTo(x - 1.55, y - 2.2)
  ctx.bezierCurveTo(x - 1.1, y - 2.25, x - 0.72, top + 0.42, x, top + 0.3)
  ctx.bezierCurveTo(x + 0.72, top + 0.42, x + 1.1, y - 2.25, x + 1.55, y - 2.2)
  ctx.closePath()
  fill(ctx, red)
  circle(ctx, x, top + 0.75, 0.15)
  fill(ctx, lit('#D9A73E', L.ambient, 0.2))
  ink(g, line, 1.2)
}

/** A turret on the great roof: a little red-and-white tower under a steep green cap. */
function turret(g: Paint, L: Light, x: number, base: number, h: number): void {
  const { ctx } = g
  const line = mix(LINE, L.top, 0.25)
  box(ctx, x - 0.45, base - h, 0.9, h, lit(PLASTER, L.ambient, 0.1))
  screens(g, L, x - 0.32, x + 0.32, base - h + 0.2, base - 0.15, Math.round(x * 10))
  box(ctx, x - 0.5, base - h, 0.12, h, lit(RED, L.ambient, 0.1))
  box(ctx, x + 0.38, base - h, 0.12, h, lit(RED, L.ambient, 0.1))
  ctx.beginPath()
  ctx.moveTo(x - 0.8, base - h + 0.05)
  ctx.quadraticCurveTo(x - 0.35, base - h - 0.15, x, base - h - 0.9)
  ctx.quadraticCurveTo(x + 0.35, base - h - 0.15, x + 0.8, base - h + 0.05)
  ctx.closePath()
  fill(ctx, lit(COPPER, L.ambient, 0.15))
  ink(g, line, 1.5)
}

/** Yubaba's rooms on top: a western house of pale stone with arched windows and a green dome. */
function crown(g: Paint, L: Light): void {
  const { ctx } = g
  const x0 = 60.3
  const x1 = 65.5
  const y0 = BATH.top
  const y1 = BATH.roofs + 0.3
  const stone = lit('#D8CDB6', L.ambient, 0.1)
  const line = mix(LINE, L.top, 0.25)
  box(ctx, x0, y0, x1 - x0, y1 - y0, stone)
  ink(g, line, 1.4)
  const on = lampsOn(L)
  for (let i = 0; i < 4; i++) {
    const wx = x0 + 0.55 + i * 1.14
    ctx.beginPath()
    ctx.moveTo(wx, y1 - 0.3)
    ctx.lineTo(wx, y0 + 0.65)
    ctx.arc(wx + 0.24, y0 + 0.65, 0.24, Math.PI, 0)
    ctx.lineTo(wx + 0.48, y1 - 0.3)
    ctx.closePath()
    fill(ctx, mix(lit('#3E3A44', L.ambient), '#F0C27E', on * (i === 1 || i === 2 ? 1 : 0.5)))
    ink(g, line, 1.2)
  }
  box(ctx, x0 - 0.15, y0 - 0.12, x1 - x0 + 0.3, 0.16, lit('#BFB29A', L.ambient, 0.1))
  // The dome, and a gold spire on it.
  ctx.beginPath()
  ctx.moveTo(x0 + 0.1, y0 - 0.1)
  ctx.bezierCurveTo(x0 + 0.4, y0 - 1.25, x1 - 0.4, y0 - 1.25, x1 - 0.1, y0 - 0.1)
  ctx.closePath()
  fill(ctx, lit(COPPER, L.ambient, 0.15))
  ink(g, line, 1.6)
  const cx = (x0 + x1) / 2
  poly(ctx, [[cx - 0.1, y0 - 0.95], [cx + 0.1, y0 - 0.95], [cx, BATH.peak]])
  fill(ctx, lit('#C99A3A', L.ambient, 0.2))
}

/** The chimney up the east end. */
function chimney(g: Paint, L: Light): void {
  const { ctx } = g
  const c = BATH.chimney
  box(ctx, c.x - c.w / 2, c.y1, c.w, c.y0 - c.y1, lit('#8A4B36', L.ambient))
  ctx.fillStyle = vgrad(ctx, c.y1, c.y0, [
    [0, rgba('#000000', 0)],
    [1, rgba('#000000', 0.3)],
  ])
  ctx.fillRect(c.x - c.w / 2, c.y1, c.w, c.y0 - c.y1)
  box(ctx, c.x - c.w / 2 - 0.1, c.y1 - 0.12, c.w + 0.2, 0.18, lit('#5E3022', L.ambient))
  for (let y = c.y1 + 0.8; y < c.y0; y += 1.6) box(ctx, c.x - c.w / 2, y, c.w, 0.06, lit('#6A3828', L.ambient))
}

/** The smoke off the chimney: soft rounds going up and leaning away east, growing and thinning. */
export function drawSmoke(g: Paint, L: Light): void {
  const { ctx } = g
  const c = BATH.chimney
  const col = mix(lit('#B9B4AE', L.ambient), L.haze, 0.25)
  for (let i = 0; i < 9; i++) {
    const period = 9
    const age = (g.t + i * (period / 9)) % period
    const u = age / period
    const x = c.x + u * 3.2 + 0.25 * Math.sin(age * 0.7 + i)
    const y = c.y1 - 0.2 - u * 3.6
    const r = 0.28 + u * 0.9
    circle(ctx, x, y, r)
    fill(ctx, rgba(col, 0.42 * (1 - u) * smooth(age, 0, 0.8)))
  }
}

/** The lanterns along the main eave, lit at dusk with the screens. */
function eaveLamps(g: Paint, L: Light): void {
  const { ctx } = g
  const on = lampsOn(L)
  const y = BATH.floors[1] + 0.34
  for (let i = 0; i < 9; i++) {
    const x = BATH.x0 + 1.5 + i * 1.6
    if (Math.abs(x - BATH.door) < 1.9) continue
    const swing = 0.012 * sway(g.t, 0.4, i)
    poly(ctx, [[x, y - 0.24], [x + swing, y - 0.15]], false)
    ink(g, lit(LINE, L.ambient), 1.1)
    ctx.beginPath()
    ctx.ellipse(x + swing, y, 0.11, 0.14, 0, 0, Math.PI * 2)
    fill(ctx, mix(lit('#B8392B', L.ambient), '#F6AE5C', on))
  }
}

/** Draw `fn` with the front away inside the box (alpha `a`): whole outside it, faded inside it. */
function withHole(ctx: CanvasRenderingContext2D, hole: [number, number, number, number] | null, a: number, fn: () => void): void {
  if (!hole || a <= 0.001) {
    fn()
    return
  }
  const [x0, y0, x1, y1] = hole
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100)
  ctx.rect(x1, y0, x0 - x1, y1 - y0)
  ctx.clip('evenodd')
  fn()
  ctx.restore()
  if (a < 0.999) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0, y0, x1 - x0, y1 - y0)
    ctx.clip()
    ctx.globalAlpha = 1 - a
    fn()
    ctx.restore()
  }
}

/**
 * The whole building, front and footings, roofs and crown, chimney; its front away where a scene has gone in (`cut`).
 * What is behind a cut is the scene's to draw, under this.
 */
export function drawBathhouse(g: Paint, L: Light, cut: Cut = WHOLE): void {
  const { ctx } = g
  footings(g, L, cut)
  chimney(g, L)
  const hall = BATH.hall
  withHole(ctx, [hall.x0, hall.y0, hall.x1, hall.y1], cut.hall, () => ground(g, L, BATH.x0, BATH.x1))
  UPPER.forEach(([x0, x1], i) => {
    const y1 = BATH.floors[i + 1]
    const y0 = BATH.floors[i + 2]
    const r = BATH.room
    const hole: [number, number, number, number] | null = i === 1 ? [r.x0, r.y0, r.x1, r.y1] : null
    withHole(ctx, hole, i === 1 ? cut.room : 0, () => upper(g, L, x0, x1, y0, y1, i * 13 + 1))
  })
  // The roofs, top down so each lower one's eave lies over the storey under the one above.
  roof(g, L, UPPER[3][0] - 0.2, UPPER[3][1] + 0.2, BATH.floors[5], BATH.floors[5] - BATH.roofs, 0.55)
  turret(g, L, 58.6, BATH.floors[5] - 0.6, 1.0)
  turret(g, L, 67.2, BATH.floors[5] - 0.6, 1.0)
  crown(g, L)
  for (let i = 2; i >= 0; i--) roof(g, L, UPPER[i][0], UPPER[i][1], BATH.floors[i + 2], 0.42, 0.42)
  roof(g, L, BATH.x0, BATH.x1, BATH.floors[1], 0.5, 0.5)
  entrance(g, L)
  eaveLamps(g, L)
  // Her balcony: a ledge off the east end of the third storey, red-railed, on struts.
  const b = BATH.balcony
  box(ctx, b.x0 - 0.05, b.y, b.x1 - b.x0, 0.12, lit(TIMBER, L.ambient))
  const red = lit(RED, L.ambient, 0.1)
  box(ctx, b.x0, b.y - 0.38, b.x1 - b.x0, 0.065, red)
  for (let x = b.x0 + 0.2; x <= b.x1 - 0.05; x += 0.36) box(ctx, x - 0.02, b.y - 0.38, 0.04, 0.38, red)
  poly(ctx, [[b.x0, b.y + 0.12], [b.x1 - 0.3, b.y + 0.12], [b.x0, b.y + 0.9]])
  fill(ctx, lit(TIMBER, L.ambient))
}

/** Warm light from the door laid on the bridge's boards at night. */
export function drawDoorLight(g: Paint, L: Light): void {
  pool(g.ctx, BATH.door - 1.2, BATH.floor + 0.02, 2.4, '#F2BE76', 0.45 * lampsOn(L), 0.22)
}
