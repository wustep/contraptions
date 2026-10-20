import { circle, fill, mix, poly, rect, rgba, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import {
  AXE,
  AXES,
  BOW,
  COLUMNS,
  CRANK,
  DOOR_E,
  DOOR_W,
  GATE,
  HALL,
  HEARTH,
  ROOM,
  ROOM_DOOR,
  SLAB,
  STAIRS,
  STAIRWELL,
  DAIS,
  TERRACE,
  TOP,
  TRIAL,
  WALL,
  WELL,
  WINDOW,
} from './geo'
import { drawLoom } from './loom'
import {
  BRONZE,
  BRONZE_LIGHT,
  CLOTH,
  COLUMN,
  COLUMN_CAP,
  EMBER,
  FIRE,
  FIRE_CORE,
  MADDER,
  PETROL,
  PLASTER,
  PLASTER_BACK,
  STONE,
  STONE_SHADE,
  TIMBER,
  TIMBER_LIGHT,
  againstSun,
  indoors,
  nightness,
  outdoors,
} from './look'
import { ARROW, armTip, arrowShown, arrowTail, arrowY, axeShiver, axeUp, drawOf, NOCK0, plateEnd } from './rig'

/**
 * The palace, cut open like a doll's house: its front wall taken away, so the hall, the stairs, Penelope's room and the
 * terrace are seen at once. Drawn in two passes round the balls: what they stand in front of first (`drawPalace`), and
 * what stands in front of them after (`overPalace`): the walls' cut ends, the slabs, the axes in their trench, the
 * arrow.
 *
 * Out of doors the stone takes the sky's light; indoors at night the hearth and the lamps light the plaster, a flat warm
 * tone, no glow. The fire is three flat tongues that lean and flicker slowly.
 */

const ink = (t: number) => mix('#2A231C', '#120E0B', nightness(t))
const IN_VIEW = (g: Paint) => !(g.view.x1 < 812 || g.view.x0 > 831 || g.view.y0 > -8.4 || g.view.y1 < -13)

export function drawPalace(g: Paint): void {
  if (!IN_VIEW(g)) return
  // In the west, at the end, the house is seen from the sea against the sunset: one dark shape on the cliff, shut.
  if (g.t >= TRIAL.fade) {
    drawSilhouette(g)
    return
  }
  drawCourtyard(g)
  drawShell(g)
  drawHallInside(g)
  drawRoomInside(g)
  drawStairs(g)
  drawRig(g)
  // Once the arrow is spent (from the cut back to the hall), the axes stand behind whoever comes among them: the three
  // of them meet there.
  if (g.t >= TRIAL.erupts) drawAxes(g)
}

/* ------------------------------------------------------------------ the shell */

/** The outside: the hall's floor slab cut, the terrace's back parapet, the roof over the room. */
function drawShell(g: Paint): void {
  const { ctx, t } = g
  const stone = outdoors(STONE, t)
  const shade = outdoors(STONE_SHADE, t)
  rect(ctx, HALL.x0 - WALL, HALL.floor, HALL.x1 - HALL.x0 + 2 * WALL, SLAB)
  fill(ctx, shade)
  rect(ctx, TERRACE.x0, TERRACE.y - 0.26, TERRACE.x1 - TERRACE.x0 + WALL, 0.26)
  fill(ctx, stone)
  rect(ctx, TERRACE.x0, TERRACE.y - 0.31, TERRACE.x1 - TERRACE.x0 + WALL, 0.05)
  fill(ctx, shade)
  rect(ctx, ROOM.x0 - WALL, ROOM.ceil - SLAB, ROOM.x1 - ROOM.x0 + 2 * WALL, SLAB)
  fill(ctx, stone)
  rect(ctx, ROOM.x0 - WALL - 0.06, ROOM.ceil - SLAB - 0.06, ROOM.x1 - ROOM.x0 + 2 * WALL + 0.12, 0.07)
  fill(ctx, shade)
}

/** The courtyard: its back wall face-on, from the gate to the hall, and the gate's posts and lintel. */
function drawCourtyard(g: Paint): void {
  const { ctx, t } = g
  const [x0] = GATE.wall
  rect(ctx, x0, TOP - GATE.wallH, HALL.x0 - x0, GATE.wallH)
  fill(ctx, mix(outdoors(STONE, t), outdoors(STONE_SHADE, t), 0.35))
  rect(ctx, x0, TOP - GATE.wallH - 0.06, HALL.x0 - x0, 0.06)
  fill(ctx, outdoors(STONE_SHADE, t))
  const timber = outdoors(TIMBER, t)
  for (const side of [-1, 1]) {
    rect(ctx, GATE.x + side * GATE.half - (side < 0 ? 0.09 : 0), TOP - GATE.h, 0.09, GATE.h)
    fill(ctx, timber)
  }
  rect(ctx, GATE.x - GATE.half - 0.14, TOP - GATE.h - 0.09, 2 * GATE.half + 0.28, 0.09)
  fill(ctx, timber)
}

/* ------------------------------------------------------------------ the hall */

function drawHallInside(g: Paint): void {
  const { ctx, t } = g
  // The back wall: plaster, a petrol-blue dado, a red frieze under the beams.
  rect(ctx, HALL.x0, HALL.ceil, HALL.x1 - HALL.x0, HALL.floor - HALL.ceil)
  fill(ctx, indoors(PLASTER_BACK, t))
  rect(ctx, HALL.x0, HALL.floor - 0.22, HALL.x1 - HALL.x0, 0.22)
  fill(ctx, indoors(PETROL, t))
  rect(ctx, HALL.x0, HALL.ceil + SLAB + 0.05, HALL.x1 - HALL.x0, 0.08)
  fill(ctx, indoors(MADDER, t))
  rect(ctx, HALL.x0, HALL.ceil + SLAB, HALL.x1 - HALL.x0, 0.05)
  fill(ctx, indoors(TIMBER, t))
  // The doors' light: the courtyard's to the east, the evening's (or the night's) to the west.
  rect(ctx, HALL.x0 - WALL, HALL.floor - DOOR_E.h, WALL, DOOR_E.h)
  fill(ctx, outdoors('#8E979C', t))
  rect(ctx, HALL.x1, HALL.floor - DOOR_W.h, WALL, DOOR_W.h)
  fill(ctx, mix(outdoors('#9AA7B0', t), '#E9B98A', 0.25 * (1 - nightness(t))))
  drawHearth(g)
  for (const x of [820.0, 824.0]) drawLamp(g, x, HALL.floor - 0.9)
  for (const x of COLUMNS) drawColumn(g, x, HALL.floor, HALL.ceil + SLAB + 0.05)
  drawDais(g)
}

function drawHearth(g: Paint): void {
  const { ctx, t } = g
  const x = HEARTH.x
  const y = HALL.floor
  ctx.beginPath()
  ctx.ellipse(x, y - 0.04, HEARTH.half, 0.07, 0, 0, Math.PI * 2)
  fill(ctx, indoors(STONE_SHADE, t))
  rect(ctx, x - HEARTH.half, y - 0.1, 2 * HEARTH.half, 0.08)
  fill(ctx, indoors(STONE, t))
  drawFire(g, x, y - 0.1, 0.24, 1)
}

/** A fire: three flat tongues on an ember bed, leaning and flickering slowly. `h` is its height, `a` how much burns. */
export function drawFire(g: Paint, x: number, y: number, h: number, a: number): void {
  const { ctx, t } = g
  if (a <= 0.01) return
  rect(ctx, x - h * 0.7, y - h * 0.12, h * 1.4, h * 0.12)
  fill(ctx, rgba(EMBER, a))
  const tongues: [number, number, number, string][] = [
    [-0.32, 0.7, 1.7, FIRE],
    [0.28, 0.62, 2.3, FIRE],
    [0, 1, 1.3, FIRE_CORE],
  ]
  for (const [dx, hh, f, c] of tongues) {
    const lean = 0.12 * Math.sin(t * f + dx * 9)
    const tall = h * hh * (0.88 + 0.12 * Math.sin(t * f * 1.7 + dx * 5)) * a
    const bx = x + dx * h
    ctx.beginPath()
    ctx.moveTo(bx - h * 0.28, y)
    ctx.quadraticCurveTo(bx - h * 0.26, y - tall * 0.55, bx + lean * h, y - tall)
    ctx.quadraticCurveTo(bx + h * 0.26, y - tall * 0.5, bx + h * 0.28, y)
    ctx.closePath()
    fill(ctx, rgba(c, a))
  }
}

function drawLamp(g: Paint, x: number, y: number): void {
  const { ctx, t } = g
  ctx.beginPath()
  ctx.moveTo(x - 0.09, y + 0.14)
  ctx.lineTo(x - 0.09, y - 0.04)
  ctx.arc(x, y - 0.04, 0.09, Math.PI, 0)
  ctx.lineTo(x + 0.09, y + 0.14)
  ctx.closePath()
  fill(ctx, indoors('#9C8466', t))
  ctx.beginPath()
  ctx.ellipse(x, y + 0.1, 0.06, 0.025, 0, 0, Math.PI * 2)
  fill(ctx, indoors('#7A4A2C', t))
  const n = nightness(t)
  if (n > 0.2) {
    const flick = 0.008 * Math.sin(t * 7.3 + x)
    ctx.beginPath()
    ctx.moveTo(x - 0.018, y + 0.08)
    ctx.quadraticCurveTo(x - 0.02, y + 0.03, x + flick, y - 0.01)
    ctx.quadraticCurveTo(x + 0.02, y + 0.03, x + 0.018, y + 0.08)
    fill(ctx, rgba(FIRE_CORE, Math.min(1, (n - 0.2) * 2)))
  }
}

/** A Knossos column: the shaft red and wider at the top, a black cushion capital, a black base. */
function drawColumn(g: Paint, x: number, foot: number, head: number): void {
  const { ctx, t } = g
  const top = head + 0.08
  poly(ctx, [[x - 0.085, top], [x + 0.085, top], [x + 0.06, foot - 0.04], [x - 0.06, foot - 0.04]])
  fill(ctx, indoors(COLUMN, t))
  ctx.beginPath()
  ctx.ellipse(x, head + 0.05, 0.13, 0.05, 0, 0, Math.PI * 2)
  fill(ctx, indoors(COLUMN_CAP, t))
  rect(ctx, x - 0.11, head - 0.01, 0.22, 0.04)
  fill(ctx, indoors(COLUMN_CAP, t))
  rect(ctx, x - 0.08, foot - 0.04, 0.16, 0.04)
  fill(ctx, indoors(COLUMN_CAP, t))
}

/** The suitors' dais: a stone platform along the back wall, rugs on it, their cups and bowls along its back edge. */
function drawDais(g: Paint): void {
  const { ctx, t } = g
  const { x0, x1, top } = DAIS
  rect(ctx, x0, top, x1 - x0, HALL.floor - top)
  fill(ctx, indoors(STONE_SHADE, t))
  rect(ctx, x0, top, x1 - x0, 0.04)
  fill(ctx, indoors(STONE, t))
  // Two rugs hanging over its front, petrol and madder.
  rect(ctx, x0 + 0.25, top + 0.04, 1.0, 0.24)
  fill(ctx, indoors(PETROL, t))
  rect(ctx, x0 + 1.55, top + 0.04, 1.05, 0.24)
  fill(ctx, indoors(MADDER, t))
  // Cups and bowls on the back of it, behind where they sit.
  const things: [number, number, number][] = [
    [x0 + 0.35, 0.05, 0.04],
    [x0 + 0.95, 0.06, 0.03],
    [x0 + 1.5, 0.045, 0.045],
    [x0 + 2.1, 0.06, 0.03],
    [x0 + 2.6, 0.045, 0.04],
  ]
  for (const [x, w, h] of things) {
    ctx.beginPath()
    ctx.ellipse(x, top, w, h, 0, Math.PI, 0)
    fill(ctx, indoors(h > 0.035 ? BRONZE : '#8C5A3C', t))
  }
}

/* ------------------------------------------------------------------ the room */

function drawRoomInside(g: Paint): void {
  const { ctx, t } = g
  rect(ctx, ROOM.x0, ROOM.ceil, ROOM.x1 - ROOM.x0, ROOM.floor - ROOM.ceil)
  fill(ctx, indoors(PLASTER, t))
  rect(ctx, ROOM.x0, ROOM.ceil, ROOM.x1 - ROOM.x0, 0.05)
  fill(ctx, indoors(TIMBER, t))
  // The window east, over the sea towards Troy; the door west, onto the terrace.
  rect(ctx, ROOM.x0 - WALL, WINDOW.y0, WALL, WINDOW.y1 - WINDOW.y0)
  fill(ctx, outdoors('#A9B6BE', t))
  rect(ctx, ROOM.x1, ROOM.floor - ROOM_DOOR.h, WALL, ROOM_DOOR.h)
  fill(ctx, outdoors('#8D98A3', t))
  drawLamp(g, ROOM.x0 + 1.75, ROOM.floor - 0.62)
  rect(ctx, ROOM.x0 + 2.7, ROOM.floor - 0.2, 0.5, 0.2)
  fill(ctx, indoors(TIMBER_LIGHT, t))
  rect(ctx, ROOM.x0 + 2.7, ROOM.floor - 0.2, 0.5, 0.035)
  fill(ctx, indoors(TIMBER, t))
  drawLoom(g)
}

/* ------------------------------------------------------------------ the stairs */

const RUN = (STAIRS.x1 - STAIRS.x0) / STAIRS.steps
const RISE = (HALL.floor - ROOM.floor) / STAIRS.steps

/** Stone stairs up the back wall into the room: a solid flight, each tread a ball's step. */
function drawStairs(g: Paint): void {
  const { ctx, t } = g
  const pts: Pt[] = [[STAIRS.x0, HALL.floor]]
  for (let i = 0; i < STAIRS.steps; i++) {
    const x = STAIRS.x0 + i * RUN
    const y = HALL.floor - (i + 1) * RISE
    pts.push([x, y], [x + RUN, y])
  }
  pts.push([STAIRS.x1, HALL.floor])
  poly(ctx, pts)
  fill(ctx, indoors(STONE_SHADE, t))
  for (let i = 0; i < STAIRS.steps; i++) {
    rect(ctx, STAIRS.x0 + i * RUN, HALL.floor - (i + 1) * RISE, RUN, 0.03)
    fill(ctx, indoors(STONE, t))
  }
}

/** Where a ball stands on step `i` (0 the lowest, steps - 1 the top, in the room). */
export function stepAt(i: number): Pt {
  return [STAIRS.x0 + (i + 0.5) * RUN, HALL.floor - (i + 1) * RISE - 0.13]
}

/* ------------------------------------------------------------------ the bow and its crank */

function drawRig(g: Paint): void {
  const { ctx, t } = g
  const k = ink(t)
  const timber = indoors(TIMBER, t)
  // The crank: its block, the plate out west, the arm up, and the cord from the arm's tip to the string.
  const [px, py] = plateEnd(t)
  const [ax, ay] = armTip(t)
  rect(ctx, CRANK.x - 0.06, CRANK.y, 0.12, HALL.floor - CRANK.y)
  fill(ctx, indoors(STONE_SHADE, t))
  ctx.beginPath()
  ctx.moveTo(CRANK.x, CRANK.y)
  ctx.lineTo(px, py)
  stroke(g, timber, 3.4)
  rect(ctx, px - 0.09, py - 0.025, 0.18, 0.03)
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(-Math.atan2(CRANK.y - py, px - CRANK.x))
  rect(ctx, -0.1, -0.03, 0.18, 0.035)
  fill(ctx, indoors(BRONZE, t))
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(CRANK.x, CRANK.y)
  ctx.lineTo(ax, ay)
  stroke(g, timber, 3.0)
  circle(ctx, CRANK.x, CRANK.y, 0.03)
  fill(ctx, indoors(BRONZE, t))
  const nock = NOCK0 + drawOf(t)
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(nock, BOW.y)
  stroke(g, indoors('#3A2E22', t), 1.1)
  // The bow's stand: a post from the floor to the grip, with feet.
  rect(ctx, BOW.x - 0.02, BOW.y, 0.04, HALL.floor - BOW.y)
  fill(ctx, timber)
  rect(ctx, BOW.x - 0.12, HALL.floor - 0.03, 0.24, 0.03)
  fill(ctx, timber)
  // The bow: horn and wood, recurved, pointing east, its limbs bending as the string comes west; the red string.
  const flex = (nock - NOCK0) * 0.35
  const tip = (s: number): Pt => [BOW.x + 0.03 + flex * 0.5, BOW.y + s * (BOW.half - flex * 0.15)]
  const top = tip(-1)
  const bot = tip(1)
  ctx.beginPath()
  ctx.moveTo(top[0], top[1])
  ctx.bezierCurveTo(BOW.x - 0.12 - flex * 0.2, BOW.y - BOW.half * 0.75, BOW.x - 0.05, BOW.y - 0.1, BOW.x - 0.03, BOW.y)
  ctx.bezierCurveTo(BOW.x - 0.05, BOW.y + 0.1, BOW.x - 0.12 - flex * 0.2, BOW.y + BOW.half * 0.75, bot[0], bot[1])
  stroke(g, timber, 4.2)
  ctx.beginPath()
  ctx.moveTo(top[0], top[1])
  ctx.lineTo(nock, BOW.y)
  ctx.lineTo(bot[0], bot[1])
  stroke(g, indoors(MADDER, t), 1.5)
  rect(ctx, BOW.x - 0.05, BOW.y - 0.04, 0.05, 0.08)
  fill(ctx, indoors(BRONZE, t))
  void k
}

/* ------------------------------------------------------------------ in front of the balls */

/** The walls' cut ends, the slabs, the axes in their trench, and the arrow: everything the balls pass behind. */
/** The house as a silhouette: the courtyard wall, the hall, the room over its east half and the terrace's parapet. */
function drawSilhouette(g: Paint): void {
  const { ctx, t } = g
  ctx.beginPath()
  ctx.rect(GATE.wall[0], TOP - GATE.wallH, HALL.x0 - GATE.wall[0], GATE.wallH)
  ctx.rect(HALL.x0 - WALL, HALL.ceil - SLAB, HALL.x1 - HALL.x0 + 2 * WALL, HALL.floor - HALL.ceil + SLAB + 0.01)
  ctx.rect(ROOM.x0 - WALL, ROOM.ceil - SLAB, ROOM.x1 - ROOM.x0 + 2 * WALL, ROOM.floor - ROOM.ceil + SLAB + 0.01)
  ctx.rect(TERRACE.x0, TERRACE.y - 0.31, TERRACE.x1 - TERRACE.x0 + WALL, 0.32)
  fill(ctx, againstSun(STONE_SHADE, t))
}

export function overPalace(g: Paint): void {
  if (!IN_VIEW(g) || g.t >= TRIAL.fade) return
  const { ctx, t } = g
  const stone = outdoors(STONE, t)
  const shade = outdoors(STONE_SHADE, t)
  // In front of the balls while the arrow goes through them; behind after (`drawPalace`).
  if (t < TRIAL.erupts) drawAxes(g)
  // The floor's cut face over the trench, deep enough there that a lying axe is down in it, out of sight, until it
  // swings up.
  rect(ctx, AXES[AXES.length - 1] - 0.5, HALL.floor, AXES[0] - AXES[AXES.length - 1] + 1.0, SLAB + 0.08)
  fill(ctx, shade)
  drawArrow(g)
  // The hall's walls' cut ends: over each door, the wall to the slab.
  rect(ctx, HALL.x0 - WALL, HALL.ceil, WALL, HALL.floor - HALL.ceil - DOOR_E.h)
  fill(ctx, stone)
  rect(ctx, HALL.x1, HALL.ceil, WALL, HALL.floor - HALL.ceil - DOOR_W.h)
  fill(ctx, stone)
  // The slab between the hall and the room and terrace, cut, with its openings: the stairwell and the light well.
  const slab = (x0: number, x1: number) => {
    rect(ctx, x0, HALL.ceil, x1 - x0, SLAB)
    fill(ctx, shade)
  }
  slab(HALL.x0 - WALL, STAIRWELL.x0)
  slab(STAIRWELL.x1, WELL.x - WELL.half)
  slab(WELL.x + WELL.half, HALL.x1 + WALL)
  // The room's walls' cut ends: under and over the window, over the door.
  rect(ctx, ROOM.x0 - WALL, ROOM.ceil, WALL, WINDOW.y0 - ROOM.ceil)
  fill(ctx, stone)
  rect(ctx, ROOM.x0 - WALL, WINDOW.y1, WALL, ROOM.floor - WINDOW.y1)
  fill(ctx, stone)
  rect(ctx, ROOM.x1, ROOM.ceil, WALL, ROOM.floor - ROOM.ceil - ROOM_DOOR.h)
  fill(ctx, stone)
  // The courtyard's front wall, cut, east of the gate.
  const [x0] = GATE.wall
  rect(ctx, x0, TOP - GATE.wallH, GATE.x - GATE.half - x0, GATE.wallH)
  fill(ctx, stone)
  rect(ctx, x0, TOP - GATE.wallH - 0.05, GATE.x - GATE.half - x0, 0.05)
  fill(ctx, shade)
  void CLOTH
}

/**
 * Twelve axes in a trench along the floor: a haft and a bronze double head with a round eye in it, at the arrow's
 * height when the axe stands. Lying, each lies along the trench with its head to the west; raised, it swings up on
 * its foot.
 */
function drawAxes(g: Paint): void {
  const { ctx, t } = g
  rect(ctx, AXES[AXES.length - 1] - 0.2, HALL.floor - 0.006, AXES[0] - AXES[AXES.length - 1] + 0.4, 0.02)
  fill(ctx, indoors('#4A3B2C', t))
  const bronze = indoors(BRONZE, t)
  const light = indoors(BRONZE_LIGHT, t)
  const haft = indoors(TIMBER_LIGHT, t)
  const hole = indoors(PLASTER_BACK, t)
  for (let i = 0; i < AXES.length; i++) {
    const up = axeUp(i, t)
    const a = (1 - up) * (Math.PI / 2) + axeShiver(i, t)
    ctx.save()
    ctx.translate(AXES[i], HALL.floor + AXE.sunk)
    ctx.rotate(a)
    rect(ctx, -0.014, -AXE.haft, 0.028, AXE.haft)
    fill(ctx, haft)
    // The head: a bronze blade flaring west, its round eye at the arrow's height on the haft's line.
    const hy = -AXE.haft - 0.05
    ctx.beginPath()
    ctx.moveTo(-0.035, hy - 0.05)
    ctx.lineTo(0.05, hy - 0.045)
    ctx.quadraticCurveTo(0.09, hy - 0.08, 0.12, hy - 0.095)
    ctx.quadraticCurveTo(0.1, hy, 0.12, hy + 0.095)
    ctx.quadraticCurveTo(0.09, hy + 0.08, 0.05, hy + 0.045)
    ctx.lineTo(-0.035, hy + 0.05)
    ctx.closePath()
    fill(ctx, bronze)
    rect(ctx, 0.1, hy - 0.09, 0.022, 0.18)
    fill(ctx, light)
    circle(ctx, 0, hy, 0.026)
    fill(ctx, hole)
    ctx.restore()
  }
}

/** The arrow: laid on the string through the trial; then gone east through the axes' eyes and out of the door. */
function drawArrow(g: Paint): void {
  const { ctx, t } = g
  if (!arrowShown(t)) return
  const tail = arrowTail(t)
  const head = tail - ARROW
  const y = arrowY(t)
  ctx.beginPath()
  ctx.moveTo(tail, y)
  ctx.lineTo(head + 0.04, y)
  stroke(g, indoors('#6C5236', t), 1.5)
  poly(ctx, [[head, y], [head + 0.06, y - 0.022], [head + 0.06, y + 0.022]])
  fill(ctx, indoors(BRONZE_LIGHT, t))
  poly(ctx, [[tail, y], [tail - 0.07, y - 0.03], [tail - 0.09, y], [tail - 0.07, y + 0.03]])
  fill(ctx, indoors(CLOTH, t))
}
