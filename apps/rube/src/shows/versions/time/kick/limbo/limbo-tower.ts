import { mixHex, type Pt } from '../../../../../parts'
import { bloom, pool, top } from '../cast'
import { frame } from '../kit'
import { LIMBO, SLEEP } from '../worlds'
import {
  ANNEX,
  CABIN,
  CW,
  FLOORS,
  FLOOR_SLAB,
  GROUND,
  HATCH,
  LADDER,
  ROOF,
  ROOM,
  SLOT,
  TABLE,
  TOP_AT,
  TOWER,
  WHEEL,
  WINDOW,
  bolt,
  brake,
  cabinY,
  curtain,
  cutaway,
  gateRoom,
  gateSea,
  hatch,
  lamp,
  lerp,
  lever,
  topPose,
  weightY,
  wheelAngle,
} from './limbo-geo'
import { box, disc, faded, line, shape, soft, vwash, type Pen } from './limbo-pen'

type Frame = ReturnType<typeof frame>

/**
 * The tower they built (the LIMBO builder's): brutalist concrete on the column, their room at the top behind the long
 * lit window, and on its sea side the lift tower with the great wheel on it. When he is inside, its front is cut away
 * like a doll's house: the lift in its shaft, the weight in its slot at the room's left, the dark floors below, and
 * the room (the table, the two chairs, the top, the lamp, the ladder to the roof).
 */

const CONCRETE = LIMBO.concrete
const CONCRETE_DUSK = mixHex(LIMBO.concreteDark, LIMBO.seaDeep, 0.3)
const CONCRETE_DARK = LIMBO.concreteDark
const SHAFT = mixHex(LIMBO.concreteDark, SLEEP.deep, 0.6)
const IRON = mixHex(LIMBO.concreteDark, SLEEP.deep, 0.45)
const ROOM_WALL = mixHex(LIMBO.house, LIMBO.skyWarm, 0.35)
const ROOM_WALL_DIM = mixHex(ROOM_WALL, LIMBO.concreteDark, 0.45)
const FLOORBOARD = mixHex(LIMBO.table, LIMBO.house, 0.35)
const GLASS_DARK = mixHex(LIMBO.concreteDark, SLEEP.mid, 0.4)
const CURTAIN = mixHex(LIMBO.house, LIMBO.foam, 0.5)
/** The rope: pale steel, so it reads against the dark shaft. */
const ROPE = mixHex(LIMBO.concrete, LIMBO.foam, 0.45)

/** Is the tower (x from -3 to 2) in view? */
const seen = (f: Frame): boolean => f.x1 > ANNEX.x0 - 1.5 && f.x0 < TOWER.x1 + 1.5 && f.y1 > WHEEL.y - WHEEL.r - 1 && f.y0 < GROUND + 3

/* ------------------------------------------------------------------ the wheel */

function drawWheel(pen: Pen, t: number): void {
  const { x, y, r } = WHEEL
  // Its frame on the lift tower's roof: two legs to the axle.
  shape(
    pen,
    [
      [x - 0.46, ANNEX.top],
      [x - 0.07, y],
      [x + 0.07, y],
      [x + 0.46, ANNEX.top],
      [x + 0.34, ANNEX.top],
      [x, y + 0.14],
      [x - 0.34, ANNEX.top],
    ],
    IRON,
    0.7,
  )
  disc(pen, [x, y], r, mixHex(IRON, LIMBO.sky, 0.25), 0.8)
  disc(pen, [x, y], r * 0.8, null, 0.5)
  const a = wheelAngle(t)
  for (let i = 0; i < 6; i++) {
    const s = a + (i * Math.PI) / 3
    line(pen, [x + Math.cos(s) * 0.07, y + Math.sin(s) * 0.07], [x + Math.cos(s) * r * 0.8, y + Math.sin(s) * r * 0.8], pen.ink, 0.55)
  }
  disc(pen, [x, y], 0.07, IRON, 0.6)
}

/* ------------------------------------------------------------------ the structure (always seen) */

function drawShell(pen: Pen, t: number): void {
  const { x0, x1, wall, roofSlab } = TOWER
  // The lift tower's top, above the main roof: its walls and its roof slab, the wheel on it.
  box(pen, ANNEX.x0, ANNEX.top, ANNEX.x1 + 0.0, ANNEX.top + 0.22, CONCRETE, 0.8)
  box(pen, ANNEX.x0, ANNEX.top + 0.22, ANNEX.x0 + ANNEX.wall, GROUND, CONCRETE, 0.7)
  box(pen, ANNEX.x1 - 0.1, ANNEX.top + 0.22, ANNEX.x1, ROOF - 1.06, CONCRETE, 0.7)
  // The main tower's roof slab: the grating over the weight's slot, and the hatch.
  box(pen, x0, ROOF, SLOT.x0, ROOF + roofSlab, CONCRETE, 0.8)
  box(pen, SLOT.x1, ROOF, HATCH.x0, ROOF + roofSlab, CONCRETE, 0.8)
  box(pen, HATCH.x1, ROOF, x1, ROOF + roofSlab, CONCRETE, 0.8)
  for (let gx = SLOT.x0 + 0.04; gx < SLOT.x1; gx += 0.075) line(pen, [gx, ROOF + 0.01], [gx, ROOF + 0.07], IRON, 0.45)
  line(pen, [SLOT.x0, ROOF + 0.02], [SLOT.x1, ROOF + 0.02], IRON, 0.6)
  // The hatch: dark when open, its lid standing up on its hinge.
  const h = hatch(t)
  box(pen, HATCH.x0, ROOF, HATCH.x1, ROOF + roofSlab, h > 0.02 ? SLEEP.deep : CONCRETE_DARK, 0.6)
  const lidA = h * 1.35
  const hw = HATCH.x1 - HATCH.x0
  shape(
    pen,
    [
      [HATCH.x1, ROOF],
      [HATCH.x1 - Math.cos(lidA) * hw, ROOF - Math.sin(lidA) * hw],
      [HATCH.x1 - Math.cos(lidA) * hw + Math.sin(lidA) * 0.05, ROOF - Math.sin(lidA) * hw - Math.cos(lidA) * 0.05],
      [HATCH.x1 + Math.sin(lidA) * 0.05, ROOF - Math.cos(lidA) * 0.05],
    ],
    CONCRETE_DARK,
    0.6,
  )
  // A low lip at the roof's edge.
  box(pen, x1 - 0.06, ROOF - 0.05, x1, ROOF, CONCRETE, 0.5)
  // The side walls, cut, down into the ground, and the floors' slabs.
  box(pen, x0, ROOF + roofSlab, x0 + wall, GROUND, CONCRETE, 0.7)
  box(pen, x1 - wall, ROOF + roofSlab, x1, GROUND, CONCRETE, 0.7)
  for (const fy of FLOORS) {
    if (fy === ROOM) {
      box(pen, x0, fy, SLOT.x0, fy + FLOOR_SLAB, CONCRETE, 0.7)
      box(pen, SLOT.x1, fy, x1, fy + FLOOR_SLAB, CONCRETE, 0.7)
    } else box(pen, fy === GROUND ? ANNEX.x0 : SLOT.x1, fy, x1, fy + FLOOR_SLAB, CONCRETE, 0.7)
  }
  // The step up from the sand to the lift tower's sea door.
  shape(
    pen,
    [
      [ANNEX.x0 - 0.6, GROUND + 0.16],
      [ANNEX.x0, GROUND],
      [ANNEX.x0, GROUND + 0.18],
      [ANNEX.x0 - 0.6, GROUND + 0.24],
    ],
    CONCRETE,
    0.6,
  )
  drawWheel(pen, t)
}

/* ------------------------------------------------------------------ inside: the floors, the shaft, the slot */

function drawInside(pen: Pen): void {
  // The weight's slot below the room: a dark shaft.
  box(pen, SLOT.x0, ROOM + FLOOR_SLAB, SLOT.x1, ROOM + 3.6, SHAFT, 0)
  // The lift's shaft, the whole height of the lift tower.
  box(pen, ANNEX.x0 + ANNEX.wall, ANNEX.top + 0.22, ANNEX.x1, GROUND, SHAFT, 0)
  line(pen, [CABIN.x - CABIN.w / 2 - 0.03, ANNEX.top + 0.22], [CABIN.x - CABIN.w / 2 - 0.03, GROUND], IRON, 0.5)
  line(pen, [CABIN.x + CABIN.w / 2 + 0.03, ANNEX.top + 0.22], [CABIN.x + CABIN.w / 2 + 0.03, GROUND], IRON, 0.5)
  // The wall between the shaft and the tower, with its doorways at the room and on the roof.
  box(pen, ANNEX.x1 - 0.0, ROOF + TOWER.roofSlab, ANNEX.x1 + 0.2, ROOM - 1.08, CONCRETE, 0.6)
  box(pen, ANNEX.x1, ROOM + FLOOR_SLAB, ANNEX.x1 + 0.2, GROUND, CONCRETE, 0.6)
  // The sea door, in the lift tower's outer wall.
  box(pen, ANNEX.x0 - 0.01, GROUND - 1.08, ANNEX.x0 + ANNEX.wall + 0.01, GROUND, SHAFT, 0)
}

/* ------------------------------------------------------------------ the room */

function drawRoom(pen: Pen, t: number, glow: number): void {
  const lit = Math.min(1, glow)
  const { x0, x1, wall } = TOWER
  const ceil = ROOF + TOWER.roofSlab
  // The back wall, warm where the lamp is, with the long window cut in it (the far sea and the city show through).
  const wallCol = mixHex(ROOM_WALL_DIM, ROOM_WALL, lit)
  box(pen, x0 + wall, ceil, x1 - wall, WINDOW.y0, wallCol, 0)
  box(pen, x0 + wall, WINDOW.y1, x1 - wall, ROOM, wallCol, 0)
  box(pen, SLOT.x1, WINDOW.y0, WINDOW.x0, WINDOW.y1, wallCol, 0)
  box(pen, WINDOW.x1, WINDOW.y0, x1 - wall, WINDOW.y1, wallCol, 0)
  box(pen, x0 + wall, WINDOW.y0, SLOT.x0, WINDOW.y1, wallCol, 0)
  // The slot at the room's left, where the weight comes down through the room: its back darker.
  box(pen, SLOT.x0, ceil, SLOT.x1, WINDOW.y1, mixHex(wallCol, CONCRETE_DARK, 0.5), 0)
  box(pen, SLOT.x0, WINDOW.y1, SLOT.x1, ROOM, mixHex(wallCol, CONCRETE_DARK, 0.5), 0)
  line(pen, [SLOT.x1, ceil], [SLOT.x1, ROOM], mixHex(pen.ink, wallCol, 0.4), 0.45)
  // The window's frame: slim mullions, the sill.
  box(pen, WINDOW.x0, WINDOW.y0, WINDOW.x1, WINDOW.y1, null, 0.8)
  for (const q of [1 / 3, 2 / 3]) {
    const mx = lerp(WINDOW.x0, WINDOW.x1, q)
    line(pen, [mx, WINDOW.y0], [mx, WINDOW.y1], pen.ink, 0.55)
  }
  box(pen, WINDOW.x0 - 0.05, WINDOW.y1, WINDOW.x1 + 0.05, WINDOW.y1 + 0.06, wallCol, 0.6)
  // The glass: a faint cool sheen over the view, and the lamp's glow in it.
  vwash(pen, WINDOW.x0, WINDOW.x1, WINDOW.y0, WINDOW.y1, [
    [0, LIMBO.glass, 0.12],
    [1, LIMBO.glass, 0.04],
  ])
  // The curtain at the window's right end, lifted by the sea's breath on the chords.
  const cu = curtain(t)
  const cx0 = WINDOW.x1 - 0.2
  const cx1 = WINDOW.x1 + 0.04
  const swing = -0.42 * cu
  const cpts: Pt[] = [[cx0, WINDOW.y0 - 0.05], [cx1, WINDOW.y0 - 0.05]]
  for (let j = 0; j <= 8; j++) {
    const q = j / 8
    cpts.push([cx1 + swing * q * q * 0.6, lerp(WINDOW.y0, WINDOW.y1 + 0.02, q) - Math.abs(swing) * q * q * 0.18])
  }
  for (let j = 8; j >= 0; j--) {
    const q = j / 8
    cpts.push([cx0 + swing * q * q, lerp(WINDOW.y0, WINDOW.y1 + 0.02, q) - Math.abs(swing) * q * q * 0.3])
  }
  shape(pen, cpts, CURTAIN, 0.5, mixHex(pen.ink, CURTAIN, 0.4))
  // The floor's boards.
  box(pen, SLOT.x1, ROOM - 0.03, x1 - wall, ROOM + 0.01, FLOORBOARD, 0)
  // The ladder up to the hatch.
  const lx0 = LADDER.x - LADDER.w / 2
  const lx1 = LADDER.x + LADDER.w / 2
  line(pen, [lx0, ceil], [lx0, ROOM], IRON, 0.7)
  line(pen, [lx1, ceil], [lx1, ROOM], IRON, 0.7)
  for (let y = ROOM - 0.3; y > ceil + 0.1; y -= 0.34) line(pen, [lx0, y], [lx1, y], IRON, 0.55)
  // The lamp: a cord from the ceiling, a shade (not round), and its light: the one warm light in limbo.
  const lampY = 76.25
  line(pen, [TABLE.x, ceil], [TABLE.x, lampY - 0.2], pen.ink, 0.5)
  shape(
    pen,
    [
      [TABLE.x - 0.07, lampY - 0.2],
      [TABLE.x + 0.07, lampY - 0.2],
      [TABLE.x + 0.2, lampY],
      [TABLE.x - 0.2, lampY],
    ],
    mixHex(LIMBO.roof, LIMBO.lamp, 0.25),
    0.6,
  )
  pool(pen.p, pen.k, [TABLE.x, ROOM - TABLE.h], 0.75, 0.18, LIMBO.lamp, 0.35 * glow)
  pool(pen.p, pen.k, [TABLE.x, ROOM], 1.3, 0.12, LIMBO.lamp, 0.25 * glow)
  // The chairs: his (its back to the left), hers (its back to the right).
  const seat = ROOM - 0.26
  for (const [cx, side] of [
    [TABLE.x - TABLE.w / 2 - 0.2, -1],
    [TABLE.x + TABLE.w / 2 + 0.2, 1],
  ] as const) {
    const back = cx + side * 0.16
    box(pen, cx - 0.16, seat - 0.04, cx + 0.16, seat + 0.02, LIMBO.table, 0.55)
    line(pen, [back, seat + 0.02], [back, ROOM], LIMBO.table, 0.9)
    line(pen, [cx - side * 0.14, seat + 0.02], [cx - side * 0.14, ROOM], LIMBO.table, 0.9)
    line(pen, [back, seat], [back + side * 0.05, seat - 0.55], LIMBO.table, 1.1)
  }
  // The table.
  const tt = ROOM - TABLE.h
  box(pen, TABLE.x - TABLE.w / 2, tt, TABLE.x + TABLE.w / 2, tt + 0.06, LIMBO.table, 0.7)
  for (const lx of [TABLE.x - TABLE.w / 2 + 0.06, TABLE.x + TABLE.w / 2 - 0.1]) box(pen, lx, tt + 0.06, lx + 0.04, ROOM, LIMBO.table, 0.5)
  // The top: lying on its side until he sets it spinning; then it spins, and never slows.
  const tp = topPose(t)
  if (tp.lying > 0.02) {
    const lean = 1.32 * tp.lying
    top(pen.p, pen.k, [TOP_AT[0] - 0.08 * tp.lying, TOP_AT[1] - 0.02 * tp.lying], 0, lean, 0, pen.ink, 1, 0)
  } else {
    top(pen.p, pen.k, TOP_AT, tp.phase, 0.03, t * 1.2 * Math.PI * 2, pen.ink, 1, 0.6)
  }
  bloom(pen.p, pen.k, [TABLE.x, lampY + 0.12], 1.1, LIMBO.lamp, 0.28 * glow)
}

/* ------------------------------------------------------------------ the lift and the weight */

function drawLift(pen: Pen, t: number): void {
  const cy = cabinY(t)
  const cx0 = CABIN.x - CABIN.w / 2
  const cx1 = CABIN.x + CABIN.w / 2
  const ctop = cy - CABIN.h
  // The rope, from the wheel to the cabin's crown.
  line(pen, [WHEEL.x - WHEEL.r, WHEEL.y], [WHEEL.x - WHEEL.r, ctop - 0.12], ROPE, 0.8)
  // The cabin: an iron cage, its back a grille, its floor and crown plates; a small lamp in its crown.
  box(pen, cx0, ctop, cx1, cy, mixHex(SHAFT, IRON, 0.5), 0)
  for (let gx = cx0 + 0.1; gx < cx1 - 0.05; gx += 0.14) line(pen, [gx, ctop + 0.08], [gx, cy - 0.06], mixHex(IRON, LIMBO.concrete, 0.25), 0.4)
  box(pen, cx0 - 0.02, ctop - 0.02, cx1 + 0.02, ctop + 0.08, IRON, 0.7)
  box(pen, cx0 - 0.02, cy - 0.06, cx1 + 0.02, cy + 0.04, IRON, 0.7)
  shape(
    pen,
    [
      [CABIN.x - 0.12, ctop - 0.02],
      [CABIN.x, ctop - 0.14],
      [CABIN.x + 0.12, ctop - 0.02],
    ],
    IRON,
    0.6,
  )
  // The catch at the foot of the shaft that holds the cabin down until it is let go.
  const b = brake(t)
  const hx = cx0 + 0.12
  const pivot: Pt = [hx - 0.08, GROUND + 0.02]
  const a = -Math.PI / 2 + (1 - b) * 0.9
  const tip: Pt = [pivot[0] + Math.cos(a) * 0.42, pivot[1] + Math.sin(a) * 0.42]
  line(pen, pivot, tip, IRON, 1.6)
  line(pen, tip, [tip[0] + 0.14 * Math.cos(a + Math.PI / 2), tip[1] + 0.14 * Math.sin(a + Math.PI / 2)], IRON, 1.6)
  disc(pen, pivot, 0.045, IRON, 0.5)
  // The weight in its slot: a concrete block on a deck, hung on the rope's two falls round a block under it.
  const wy = weightY(t)
  const wx0 = CW.x - CW.w / 2
  const wx1 = CW.x + CW.w / 2
  line(pen, [WHEEL.x + WHEEL.r, WHEEL.y], [SLOT.x0 + 0.03, ROOF], ROPE, 0.8)
  line(pen, [SLOT.x0 + 0.03, ROOF], [SLOT.x0 + 0.03, wy + CW.h + 0.08], ROPE, 0.8)
  line(pen, [SLOT.x1 - 0.03, ROOF + TOWER.roofSlab], [SLOT.x1 - 0.03, wy + CW.h + 0.08], ROPE, 0.8)
  line(pen, [SLOT.x0 + 0.03, wy + CW.h + 0.08], [SLOT.x1 - 0.03, wy + CW.h + 0.08], ROPE, 0.8)
  box(pen, wx0, wy, wx1, wy + CW.h, mixHex(CONCRETE, CONCRETE_DARK, 0.35), 0.7)
  box(pen, wx0 - 0.03, wy - 0.02, wx1 + 0.03, wy + 0.05, IRON, 0.6)
  box(pen, CW.x - 0.12, wy + CW.h + 0.03, CW.x + 0.12, wy + CW.h + 0.12, IRON, 0.5)
  line(pen, [wx0 + 0.04, wy + 0.3], [wx1 - 0.04, wy + 0.3], mixHex(pen.ink, CONCRETE, 0.5), 0.4)
  line(pen, [wx0 + 0.04, wy + 0.62], [wx1 - 0.04, wy + 0.62], mixHex(pen.ink, CONCRETE, 0.5), 0.4)
}

/** The bolt, the lever and the cabin's gates: drawn over him, since they are in front of him. */
function drawLiftFront(pen: Pen, t: number): void {
  const cy = cabinY(t)
  const cx0 = CABIN.x - CABIN.w / 2
  const cx1 = CABIN.x + CABIN.w / 2
  const ctop = cy - CABIN.h
  // The cage's corner posts.
  line(pen, [cx0, ctop], [cx0, cy], IRON, 1.0)
  line(pen, [cx1, ctop], [cx1, cy], IRON, 1.0)
  // The gates: grilles that drop into the cabin's two doorways (the sea side, the room side).
  for (const [x, open] of [
    [cx0, gateSea(t)],
    [cx1, gateRoom(t)],
  ] as const) {
    const drop = 1 - open
    if (drop < 0.02) continue
    const gy1 = ctop + 0.08 + (CABIN.h - 0.14) * drop
    box(pen, x - 0.045, ctop + 0.08, x + 0.045, gy1, null, 0.6, IRON)
    for (let y = ctop + 0.16; y < gy1 - 0.02; y += 0.12) {
      line(pen, [x - 0.045, y], [x + 0.045, y + 0.06], IRON, 0.45)
      line(pen, [x + 0.045, y], [x - 0.045, y + 0.06], IRON, 0.45)
    }
  }
  // The bolt at the room: a bar shot from the cabin's post across the doorway into the weight's deck.
  const bo = bolt(t)
  const by = ROOM - 0.42
  const near = Math.abs(cy - ROOM) < 0.02
  if (near || bo > 0.01) {
    const bx0 = cx1 - 0.16
    const bx1 = lerp(cx1 + 0.02, SLOT.x0 + 0.06, bo)
    box(pen, bx0, by - 0.03, bx1, by + 0.03, IRON, 0.6)
    box(pen, cx1 - 0.18, by - 0.07, cx1 - 0.02, by + 0.07, IRON, 0.6)
    // Its keeper on the weight's deck post.
    const wy = weightY(t)
    line(pen, [SLOT.x0 + 0.04, wy], [SLOT.x0 + 0.04, wy - 0.5], IRON, 0.8)
    box(pen, SLOT.x0 + 0.01, by - 0.06, SLOT.x0 + 0.1, by + 0.06, null, 0.6, IRON)
  }
  // The lever on the post: home, taken, pulled.
  const lv = lever(t)
  const pv: Pt = [cx1 - 0.1, cy - 0.62]
  const la = -Math.PI / 2 + 0.35 - lv * 1.15
  line(pen, pv, [pv[0] + Math.cos(la) * 0.28, pv[1] + Math.sin(la) * 0.28], IRON, 1.1)
  disc(pen, [pv[0] + Math.cos(la) * 0.28, pv[1] + Math.sin(la) * 0.28], 0.035, IRON, 0.5)
}

/* ------------------------------------------------------------------ the front, over everything inside */

/** Faint horizontal lines of board-formed concrete across a stretch of a front, where they can be seen. */
function boards(pen: Pen, x0: number, x1: number, y0: number, y1: number): void {
  if (pen.k <= 26) return
  const board = mixHex(CONCRETE_DUSK, pen.ink, 0.35)
  for (let y = ROOF + 0.33; y < y1 - 0.05; y += 0.32) if (y > y0 + 0.05) line(pen, [x0 + 0.03, y], [x1 - 0.03, y], board, 0.3)
}

/**
 * The tower's front below their room: always there (the doll's house opens only where he is: the lift, the room). A
 * dark slit runs down it under the weight's slot: what goes down there goes into the dark.
 */
function drawFrontLower(pen: Pen): void {
  const { x0, x1 } = TOWER
  const top = ROOM + FLOOR_SLAB
  box(pen, x0, top, x1, GROUND, CONCRETE_DUSK, 0.8)
  vwash(pen, x0, x1, top, GROUND, [
    [0, LIMBO.skyWarm, 0.1],
    [1, LIMBO.seaDeep, 0.12],
  ])
  for (const fy of FLOORS) if (fy < ROOM - 0.01 || fy > ROOM + 0.01) line(pen, [x0, fy], [x1, fy], mixHex(pen.ink, CONCRETE_DUSK, 0.45), 0.55)
  for (let i = 0; i < 3; i++) {
    const fl = FLOORS[i]
    const ceil = FLOORS[i + 1] + FLOOR_SLAB
    for (const wx of [-0.38, 0.32, 1.0]) box(pen, wx - 0.2, ceil + 0.55, wx + 0.2, fl - 0.75, GLASS_DARK, 0.6)
  }
  boards(pen, x0, x1, top, GROUND)
  // The slit: black under the room's floor, fading into the concrete further down.
  box(pen, SLOT.x0, top, SLOT.x1, top + 2.6, SLEEP.deep, 0.6)
  vwash(pen, SLOT.x0 + 0.01, SLOT.x1 - 0.01, top + 1.6, top + 2.6, [
    [0, SLEEP.deep, 0],
    [1, CONCRETE_DUSK, 1],
  ])
}

/** The tower's front at their room: the long lit window. Cut away when he is inside. */
function drawFrontUpper(pen: Pen, lit: number): void {
  const { x0, x1 } = TOWER
  const bottom = ROOM + FLOOR_SLAB
  box(pen, x0, ROOF, x1, bottom, CONCRETE_DUSK, 0.8)
  vwash(pen, x0, x1, ROOF, bottom, [
    [0, LIMBO.skyWarm, 0.18],
    [1, LIMBO.skyWarm, 0.1],
  ])
  boards(pen, x0, x1, ROOF, WINDOW.y0 - 0.1)
  // The lit window: their room.
  box(pen, WINDOW.x0 - 0.4, WINDOW.y0, WINDOW.x1, WINDOW.y1, GLASS_DARK, 0)
  vwash(pen, WINDOW.x0 - 0.4, WINDOW.x1, WINDOW.y0, WINDOW.y1, [
    [0, LIMBO.lamp, 0.85 * lit],
    [1, mixHex(LIMBO.lamp, LIMBO.skyWarm, 0.5), 0.95 * lit],
  ])
  box(pen, WINDOW.x0 - 0.4, WINDOW.y0, WINDOW.x1, WINDOW.y1, null, 0.8)
  for (const q of [0.25, 0.5, 0.75]) {
    const mx = lerp(WINDOW.x0 - 0.4, WINDOW.x1, q)
    line(pen, [mx, WINDOW.y0], [mx, WINDOW.y1], pen.ink, 0.55)
  }
  line(pen, [x0, ROOF + 0.02], [x1, ROOF + 0.02], mixHex(LIMBO.skyWarm, CONCRETE, 0.3), 0.8)
}

/** The lift tower's front: plain concrete, a slot window, its sea side catching the afterglow. Cut away when he rides it. */
function drawFrontAnnex(pen: Pen): void {
  box(pen, ANNEX.x0, ANNEX.top, ANNEX.x1, GROUND, CONCRETE_DUSK, 0.8)
  box(pen, (ANNEX.x0 + ANNEX.x1) / 2 - 0.1, ANNEX.top + 1.0, (ANNEX.x0 + ANNEX.x1) / 2 + 0.1, GROUND - 1.4, GLASS_DARK, 0.6)
  boards(pen, ANNEX.x0, ANNEX.x1, ANNEX.top, GROUND)
  vwash(pen, ANNEX.x0, ANNEX.x0 + 0.12, ANNEX.top, GROUND, [
    [0, LIMBO.skyWarm, 0.4],
    [1, LIMBO.skyWarm, 0.15],
  ])
}

/* ------------------------------------------------------------------ the whole tower */

/** The tower, behind the balls: the shell, and inside it as far as it is cut away. */
export function drawTowerBack(pen: Pen, t: number, f: Frame): void {
  if (!seen(f)) return
  const cut = cutaway(t)
  if (cut > 0.001) {
    drawInside(pen)
    drawRoom(pen, t, lamp(t))
    drawLift(pen, t)
  }
  drawShell(pen, t)
}

/** Over the balls: what is in front of them in the lift, the dark they go down into, and the tower's front. */
export function drawTowerFront(pen: Pen, t: number, f: Frame): void {
  if (!seen(f)) return
  const cut = cutaway(t)
  if (cut > 0.001) {
    drawLiftFront(pen, t)
    // The dark under the room, in the weight's slot: whatever goes down there is gone.
    vwash(pen, SLOT.x0, SLOT.x1, ROOM - 0.25, ROOM + FLOOR_SLAB, [
      [0, SLEEP.deep, 0],
      [1, SLEEP.deep, 0.85],
    ])
    // The ladder's corner under the hatch is out of the lamp's light.
    soft(pen, LADDER.x, (ROOF + ROOM) / 2 - 0.4, 0.42, 1.5, SLEEP.deep, 0.35)
  }
  // The front of the tower: below the room always; the lift and the room closing over when he is not inside.
  drawFrontLower(pen)
  faded(pen, 1 - cut, () => {
    drawFrontUpper(pen, Math.min(1, lamp(t)))
    drawFrontAnnex(pen)
  })
  // The lit window's glow into the dusk, seen from outside.
  if (cut < 0.999) bloom(pen.p, pen.k, [(WINDOW.x0 + WINDOW.x1) / 2 - 0.2, (WINDOW.y0 + WINDOW.y1) / 2], 2.6, LIMBO.lamp, 0.22 * (1 - cut) * lamp(t))
}
