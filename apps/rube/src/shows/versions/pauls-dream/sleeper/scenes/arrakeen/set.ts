import { cover, drift, fill, hash, layer, mix, poly, rect, rgba, vgrad, type Paint, type Pt, type View } from '../../paint'
import { dunes, hazeAt, sky, sunAt } from '../../world/desert'
import {
  FIELD, HALL, HALL_DOOR, LAMP, PALACE, PAD_X, ROOM, ROOM_DOOR, SLITS, TERRACE_Y, TOP_ROOMS, WEST_ROCK, EAST_ROCK,
  WEST_ROOM, WINDOW,
} from './geo'
import { inside, isNight, type Tone } from './look'
import { PAD } from '../../plan'

/**
 * Arrakeen: the bowl of rock, the city in it, the field and the palace. Everything the two Arrakeen scenes stand in,
 * by day and by night; what happens in it (the frigate, the hoist, the fires, the shield) is drawn by the scenes over
 * this.
 *
 * Depth is a few layers, each a flat fill paler toward the air the farther back it stands, each standing on its own
 * band of ground that runs down past the frame's foot so the nearer layer always has something to stand in front of:
 * the desert beyond the bowl, the bowl's far rim, two rows of the city, and the near plane (the field, the palace, the
 * rock walls at the bowl's edges).
 */

/** A mass of the city in a layer: its middle, half width, height (near-plane cells), a second tier, a lit slit at night. */
interface Block {
  x: number
  w: number
  h: number
  /** A narrower tier on top, this share of its height again (0 for none). */
  tier: number
  lit: number
}

function blocks(seed: number, x0: number, x1: number, hMin: number, hMax: number, wMin: number, wMax: number): Block[] {
  const out: Block[] = []
  let x = x0
  let i = 0
  while (x < x1) {
    const w = wMin + (wMax - wMin) * hash(i, seed, 1)
    const h = hMin + (hMax - hMin) * Math.pow(hash(i, seed, 2), 1.4)
    const tier = hash(i, seed, 6) < 0.45 ? 0.35 + 0.4 * hash(i, seed, 7) : 0
    out.push({ x: x + w / 2, w: w / 2, h, tier, lit: hash(i, seed, 3) })
    // Mostly shouldering into the next, so a row is a few great masses stepping up and down, not a row of boxes.
    x += w * 0.82 + (hash(i, seed, 4) < 0.8 ? 0 : 6 + 14 * hash(i, seed, 5))
    i++
  }
  return out
}

/**
 * The city behind the palace: a far row of a few huge angled masses nearly lost in the air, and a nearer one, larger and
 * a little clearer. `haze` is how far each goes into the air (it is more than its depth alone gives: Arrakeen's air is
 * thick with dust).
 */
const ROWS = [
  { d: 70, seed: 11, haze: 0.62, list: blocks(11, -200, 360, 7, 15, 44, 90) },
  { d: 24, seed: 12, haze: 0.3, list: blocks(12, -120, 260, 4, 10, 24, 52) },
]

/** The bowl's far rim: a ridge of red rock with flat tops (near-plane heights, at its depth). */
const RIM = { d: 150, base: 0 }
function rimCrest(x: number): number {
  const u = x / 38
  const step = Math.floor(u)
  const f = u - step
  const a = hash(step, 31)
  const b = hash(step + 1, 31)
  const e = f < 0.7 ? 0 : (f - 0.7) / 0.3
  const mesa = a + (b - a) * e * e * (3 - 2 * e)
  return -(22 + 22 * mesa + 4 * drift(x / 9, 32))
}

function inLayerRange(v: View, d: number): [number, number] {
  const L = layer(v, d)
  return [v.cx + (v.x0 - v.cx) / L.s, v.cx + (v.x1 - v.cx) / L.s]
}

/** One row of the city at its depth, standing on a band of its own ground. */
function cityRow(g: Paint, tone: Tone, row: (typeof ROWS)[number], night: boolean): void {
  const v = g.view
  const L = layer(v, row.d)
  const hz = row.haze
  const face = mix(tone.city, tone.air.haze, hz)
  const side = mix(tone.cityShade, tone.air.haze, hz * 0.85)
  const ground = mix(tone.cityShade, tone.air.haze, hz * 0.9)
  const [xa, xb] = inLayerRange(v, row.d)
  const ctx = g.ctx
  // Its ground, from its floor down past the frame's foot.
  const gy = L.y(0)
  if (gy < v.y1) {
    ctx.fillStyle = ground
    ctx.fillRect(v.x0 - 1, gy, v.w + 2, v.y1 - gy + 1)
  }
  for (const b of row.list) {
    if (b.x + b.w < xa - 2 || b.x - b.w > xb + 2) continue
    // A great battered mass: its sides lean in hard, the west one in shade (the light is from the east).
    const bat = b.w * 0.3
    const top = -b.h
    poly(ctx, [[b.x - b.w, 0.3], [b.x - b.w + bat, top], [b.x + b.w - bat, top], [b.x + b.w, 0.3]].map((p) => L.pt(p as Pt)))
    fill(ctx, face)
    poly(ctx, [[b.x - b.w, 0.3], [b.x - b.w + bat, top], [b.x - b.w + bat * 1.45, top], [b.x - b.w + bat * 0.45, 0.3]].map((p) => L.pt(p as Pt)))
    fill(ctx, side)
    if (b.tier > 0) {
      // A narrower tier stepped back on top of it.
      const tw = (b.w - bat) * 0.62
      const th = b.h * b.tier
      const tb = tw * 0.3
      poly(ctx, [[b.x - tw, top + 0.05], [b.x - tw + tb, top - th], [b.x + tw - tb, top - th], [b.x + tw, top + 0.05]].map((p) => L.pt(p as Pt)))
      fill(ctx, face)
      poly(ctx, [[b.x - tw, top + 0.05], [b.x - tw + tb, top - th], [b.x - tw + tb * 1.45, top - th], [b.x - tw + tb * 0.45, top + 0.05]].map((p) => L.pt(p as Pt)))
      fill(ctx, side)
    }
    // At night a lamp in a slit of a few of the near masses; by day nothing breaks the plain faces.
    if (night && row.d < 50 && b.lit > 0.7) {
      const sx = b.x + (hash(b.x * 7, row.seed) - 0.5) * b.w * 0.8
      const sy = -b.h * (0.4 + 0.3 * hash(b.x * 3, row.seed))
      rect(ctx, L.x(sx - 0.25), L.y(sy - 1.6), 0.5 * L.s, 1.6 * L.s)
      fill(ctx, mix(tone.lamp, tone.air.haze, hz * 0.7))
    }
  }
}

/** The bowl's far rim of rock, and the desert beyond it. */
function farRim(g: Paint, tone: Tone): void {
  const v = g.view
  // The open desert beyond the bowl, far off.
  dunes(g, tone.air, { d: 900, base: 0, amp: 30, len: 520, seed: 5 })
  const L = layer(v, RIM.d)
  const [xa, xb] = inLayerRange(v, RIM.d)
  // Sampled on a fixed grid of the rim's own cells, so its outline never slides along itself as the camera moves.
  const step = 1.5
  const pts: Pt[] = []
  for (let x = Math.floor(xa / step) * step - step; x <= xb + step; x += step) pts.push(L.pt([x, rimCrest(x)]))
  const foot = v.y1 + 1
  const ctx = g.ctx
  ctx.beginPath()
  ctx.moveTo(pts[0][0], foot)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(pts[pts.length - 1][0], foot)
  ctx.closePath()
  const hz = hazeAt(RIM.d)
  const top = Math.min(...pts.map((p) => p[1]))
  fill(ctx, vgrad(ctx, top, L.y(0), [[0, mix(tone.rock, tone.air.haze, hz * 0.85)], [1, mix(tone.rockShade, tone.air.haze, hz * 0.8)]]))
}

/** A near rock wall at the bowl's edge: a cliff from the floor up, its face in shade toward the city. */
function rockWall(g: Paint, tone: Tone, x0: number, x1: number, west: boolean, seed: number): void {
  const v = g.view
  if (x1 < v.x0 || x0 > v.x1) return
  const ctx = g.ctx
  const pts: Pt[] = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    // Rising from the city's side of the bowl to its rim.
    const into = west ? (x1 - x) / (x1 - x0) : (x - x0) / (x1 - x0)
    const rise = Math.min(1, into * 4)
    pts.push([x, -(34 * rise * rise * (3 - 2 * rise)) - 4 * drift(x / 6, seed) * rise])
  }
  ctx.beginPath()
  ctx.moveTo(x0, 1)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(x1, 1)
  ctx.closePath()
  fill(ctx, tone.rock)
  // The face toward the city, in shade.
  const face: Pt[] = pts.filter((_, i) => (west ? i > n * 0.62 : i < n * 0.38))
  if (face.length > 1) {
    ctx.beginPath()
    const edge = west ? face[face.length - 1][0] : face[0][0]
    ctx.moveTo(edge, 1)
    for (const p of face) ctx.lineTo(p[0] + (west ? -1.2 : 1.2) * (1 + p[1] / 34), p[1])
    for (let i = face.length - 1; i >= 0; i--) ctx.lineTo(face[i][0], face[i][1])
    ctx.closePath()
    fill(ctx, tone.rockShade)
  }
}

/** The field and the floor of the city under everything near. */
function floor(g: Paint, tone: Tone): void {
  const v = g.view
  if (v.y1 < 0) return
  const ctx = g.ctx
  ctx.fillStyle = mix(tone.cityShade, tone.floor, 0.5)
  ctx.fillRect(v.x0 - 1, 0, v.w + 2, v.y1 + 1)
  // The field's apron, a shade paler, its edges plain.
  rect(ctx, FIELD.x0, 0, FIELD.x1 - FIELD.x0, 0.35)
  fill(ctx, mix(tone.city, tone.floor, 0.35))
}

/** The palace whole, as it is seen from outside: one great sloped block, a few slits. */
function palaceWhole(g: Paint, tone: Tone, t: number): void {
  const ctx = g.ctx
  const night = isNight(t)
  poly(ctx, PALACE)
  fill(ctx, tone.facade)
  // The batters turning away from us, in shade on the west, the step down to the terrace, and the plinth.
  poly(ctx, [[56, 0], [62.5, -24], [65.2, -24], [59.6, 0]])
  fill(ctx, tone.facadeShade)
  poly(ctx, [[135, -14.8], [141, 0], [139.6, 0], [134.2, -14.8]])
  fill(ctx, mix(tone.facade, tone.facadeShade, 0.4))
  poly(ctx, [[99.2, -24], [100, -24], [100, -14.8], [99.2, -14.8]])
  fill(ctx, tone.facadeShade)
  rect(ctx, 58, -1.4, 82, 1.4)
  fill(ctx, mix(tone.facade, tone.facadeShade, 0.55))
  // The cornice: the roof's edge in the sky's light.
  poly(ctx, [[62.5, -24], [100, -24], [100, -23.6], [62.6, -23.6]])
  fill(ctx, mix(tone.facade, '#FFFFFF', night ? 0.03 : 0.12))
  // Tall slits: the hall's, the floors over it, Paul's room. At night the lit ones are the rooms with lamps.
  const slits: [number, number, number, number, boolean][] = [
    [72, -21, 0.5, 4.2, false], [80, -21, 0.5, 4.2, true], [88, -21, 0.5, 4.2, false],
    [70.5, -10.5, 0.5, 6, true], [91.5, -10.5, 0.5, 6, true],
    [94.9, -18.2, 0.5, 2.8, true], [120, -11.5, 0.4, 2.2, false],
  ]
  for (const [x, y, w, h, lit] of slits) {
    rect(ctx, x - w / 2, y, w, h)
    fill(ctx, night && lit ? tone.lamp : tone.slit)
  }
  pad(g, tone)
}

/** The ornithopters' pad on the terrace: a raised slab, a paler square. */
function pad(g: Paint, tone: Tone): void {
  const ctx = g.ctx
  poly(ctx, [[PAD_X[0], TERRACE_Y], [PAD_X[0] + 0.2, PAD[1]], [PAD_X[1] - 0.2, PAD[1]], [PAD_X[1], TERRACE_Y]])
  fill(ctx, mix(tone.facade, '#FFFFFF', isNight(g.t) ? 0.04 : 0.16))
}

/** The palace cut open: its stone where it is cut, and its rooms behind. */
function palaceCut(g: Paint, tone: Tone, t: number): void {
  const ctx = g.ctx
  const night = isNight(t)
  const box = (r: { x0: number; x1: number; floor: number; ceil: number }) => ctx.rect(r.x0, r.ceil, r.x1 - r.x0, r.floor - r.ceil)
  // The cut stone, with the rooms taken out of it (even-odd).
  ctx.beginPath()
  PALACE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  box({ x0: HALL.x0, x1: HALL.x1, floor: HALL.floor, ceil: HALL.ceil })
  ctx.rect(HALL_DOOR.x0, HALL_DOOR.top, HALL.x0 - HALL_DOOR.x0, -HALL_DOOR.top)
  box(ROOM)
  box(WEST_ROOM)
  box(TOP_ROOMS)
  ctx.rect(ROOM_DOOR.x0, ROOM_DOOR.top, ROOM_DOOR.x1 - ROOM_DOOR.x0, ROOM.floor - ROOM_DOOR.top)
  ctx.fillStyle = tone.cut
  ctx.fill('evenodd')
  // Its footings, in the same cut stone, down past the frame's foot: a stage taller than the frame sees more palace
  // under the floor, not empty ground.
  rect(ctx, 56, 0, 85, Math.max(1, g.view.y1 + 1))
  fill(ctx, tone.cut)
  rect(ctx, 56, 0, 85, 0.35)
  fill(ctx, mix(tone.cut, tone.floor, 0.35))

  // The rooms' back walls: lit toward the floor, dark toward the vault; their windows taken out (the air shows).
  const wall = (x0: number, y0: number, x1: number, y1: number, holes: [number, number, number, number][], lo: string, hi: string) => {
    ctx.beginPath()
    ctx.rect(x0, y0, x1 - x0, y1 - y0)
    for (const [hx, hy, hw, hh] of holes) ctx.rect(hx, hy, hw, hh)
    ctx.fillStyle = vgrad(ctx, y0, y1, [[0, hi], [1, lo]])
    ctx.fill('evenodd')
  }
  if (night) {
    // By night the hall is dark: its vault lost, its wall dim toward the floor; the one lamp's light is the scene's to draw.
    rect(ctx, HALL.x0, HALL.ceil, HALL.x1 - HALL.x0, HALL.floor - HALL.ceil)
    fill(ctx, vgrad(ctx, HALL.ceil, HALL.floor, [[0, '#07080B'], [0.55, '#101318'], [1, '#1B1C21']]))
  } else {
    // By day the same dark stone room, its vault lost overhead: the slits' light is all that lights it.
    rect(ctx, HALL.x0, HALL.ceil, HALL.x1 - HALL.x0, HALL.floor - HALL.ceil)
    fill(ctx, vgrad(ctx, HALL.ceil, HALL.floor, [[0, '#18130F'], [0.55, '#33291F'], [1, '#4E3F33']]))
  }
  hallWall(g, tone, night)
  wall(WEST_ROOM.x0, WEST_ROOM.ceil, WEST_ROOM.x1, WEST_ROOM.floor, night ? [] : [[76.8, -18.0, 0.45, 2.6]], night ? mix(tone.room, tone.lamp, 0.16) : tone.roomDark, mix(tone.roomDark, tone.cut, 0.3))
  wall(TOP_ROOMS.x0, TOP_ROOMS.ceil, TOP_ROOMS.x1, TOP_ROOMS.floor, night ? [] : [[80.8, -22.5, 0.45, 2.6], [92.8, -22.5, 0.45, 2.6]], night ? mix(tone.room, tone.lamp, 0.16) : tone.roomDark, mix(tone.roomDark, tone.cut, 0.3))
  wall(HALL_DOOR.x0, HALL_DOOR.top, HALL.x0, 0, [], mix(tone.roomDark, tone.cut, 0.3), mix(tone.roomDark, tone.cut, 0.5))
  wall(ROOM.x0, ROOM.ceil, ROOM.x1, ROOM.floor, [[WINDOW.x0, WINDOW.top, WINDOW.x1 - WINDOW.x0, WINDOW.foot - WINDOW.top]],
    night ? mix(tone.room, tone.lamp, 0.24) : tone.room, mix(tone.roomDark, tone.cut, 0.3))
  // Floors: a line of paler stone where each room meets its floor.
  for (const [x0, x1, y] of [[HALL_DOOR.x0, HALL.x1, 0], [ROOM.x0, ROOM_DOOR.x1, ROOM.floor], [WEST_ROOM.x0, WEST_ROOM.x1, WEST_ROOM.floor]] as [number, number, number][]) {
    rect(ctx, x0, y - 0.12, x1 - x0, 0.12)
    fill(ctx, tone.floor)
  }
  pad(g, tone)
}

/**
 * The great hall's back wall: four great piers, and by day the sun through slits in the vault falling down the wall in
 * long slanted bars and lying on the floor at their feet. The light is flat, on what it falls on; there is no beam in
 * the air.
 */
function hallWall(g: Paint, tone: Tone, night: boolean): void {
  const ctx = g.ctx
  for (const x of [68.6, 76.4, 85.6, 93.4]) {
    rect(ctx, x - 0.7, HALL.ceil, 1.4, -HALL.ceil)
    if (!night) {
      fill(ctx, vgrad(ctx, HALL.ceil, 0, [[0, '#130F0C'], [0.6, '#2E251E'], [1, '#4C3D31']]))
      continue
    }
    // By night a pier is a dark column going up into the dark, its edge toward the lamp catching a little of its light.
    fill(ctx, vgrad(ctx, HALL.ceil, 0, [[0, '#050608'], [0.6, '#0C0E12'], [1, '#17181C']]))
    const toward = x < LAMP[0] ? 1 : -1
    const near = Math.max(0, 1 - Math.abs(x - LAMP[0]) / 9)
    if (near > 0) {
      const ex = x + toward * 0.7 - (toward > 0 ? 0.16 : 0)
      rect(ctx, ex, LAMP[1] - 3.2, 0.16, -LAMP[1] + 3.2)
      fill(ctx, vgrad(ctx, LAMP[1] - 3.2, 0, [[0, rgba(tone.lamp, 0)], [0.5, rgba(tone.lamp, 0.42 * near)], [1, rgba(tone.lamp, 0.25 * near)]]))
    }
  }
  if (night) return
  const lean = 0.42
  for (const [x, w] of SLITS) {
    // From the vault's slit down the wall to the floor, leaning with the sun.
    const top = HALL.ceil + 0.2
    poly(ctx, [[x - w / 2, top], [x + w / 2, top], [x + w / 2 - lean * -top, -0.12], [x - w / 2 - lean * -top, -0.12]])
    fill(ctx, vgrad(ctx, top, 0, [[0, rgba('#F1DDB8', 0.24)], [1, rgba('#F1DDB8', 0.6)]]))
    const fx = x - lean * -top
    poly(ctx, [[fx - w / 2, -0.12], [fx + w / 2, -0.12], [fx + w * 1.6, 0], [fx - w * 0.4, 0]])
    fill(ctx, rgba('#F1DDB8', 0.6))
  }
}

/**
 * Everything behind the near plane: the air, the desert beyond, the rim, the city's rows; between them, what stands at
 * those depths (`between(near)`: the far side of the rim, then this side) and at each row (`atRow(d)`: its fires).
 */
export function drawBehind(g: Paint, tone: Tone, t: number, between?: (near: boolean) => void, atRow?: (d: number) => void): void {
  sky(g, tone.air)
  if (isNight(t)) moon(g)
  between?.(false)
  farRim(g, tone)
  between?.(true)
  for (const row of ROWS) {
    cityRow(g, tone, row, isNight(t))
    atRow?.(row.d)
  }
}

/** The near plane's set: the rock walls, the floor, and the palace (whole, or cut open). */
export function drawNear(g: Paint, tone: Tone, t: number): void {
  rockWall(g, tone, WEST_ROCK.x0, WEST_ROCK.x1, true, 41)
  rockWall(g, tone, EAST_ROCK.x0, EAST_ROCK.x1, false, 42)
  floor(g, tone)
  if (inside(t)) palaceCut(g, tone, t)
}

/**
 * The palace whole, when it is not cut open: drawn over the balls, since whoever is in its rooms is behind its face.
 * (Nobody stands in front of it while it is whole: the family is out on the field, the ornithopters on its roof.)
 */
export function drawPalaceWhole(g: Paint, tone: Tone, t: number): void {
  if (!inside(t)) palaceWhole(g, tone, t)
}

/**
 * Arrakis's first moon: a flat pale disc low over the rim, at the frame's own place (it is very far): where the erg's low
 * sun stands in its last frame, and as big, so through the dissolve into the night the sun becomes the moon.
 */
function moon(g: Paint): void {
  const [x, y, r] = sunAt(g.view, { x: 0.2, up: 0.12, r: 0.06 })
  g.ctx.beginPath()
  g.ctx.arc(x, y, r, 0, Math.PI * 2)
  fill(g.ctx, '#C9CDD2')
  // Its unlit side: a crescent from the rim to an elliptical terminator, a little tilted.
  g.ctx.beginPath()
  g.ctx.arc(x, y, r, -Math.PI / 2 - 0.25, Math.PI / 2 - 0.25)
  g.ctx.ellipse(x, y, r * 0.35, r, -0.25, Math.PI / 2, -Math.PI / 2, true)
  g.ctx.closePath()
  fill(g.ctx, rgba('#8B919B', 0.6))
}

/** A plain dark wash over the frame (for the picture behind a vision, never used as a flash). */
export function wash(g: Paint, color: string, a: number): void {
  if (a > 0.002) cover(g, rgba(color, a))
}
