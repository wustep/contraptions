import { fill, mix, rect, stroke, type Paint } from '../../draw'
import { GATE, HALL, ROOM, SLAB, TERRACE, TOP, WALL } from './geo'
import { drawScrub } from './island'
import { SCRUB, SCRUB_DARK, STONE, STONE_DEEP, STONE_SHADE, againstSun, outdoors } from './look'

/**
 * The house as a hilltop fortress-home, round the rooms cut open for the story: what stands behind them and beside
 * them, and the ground it is built on. Limestone blocks in courses; stacked flat-roofed masses at different heights, each
 * with a crenellated edge; a squat tower on the east corner over the courtyard; a stair-head on the terrace; a square
 * bastion standing apart to the west, joined to the hall by a low curtain wall; small dark square windows; and under it
 * all, terraced walls stepping down the hill's face, with scrub on their steps.
 *
 * All of it stands behind the action's plane (drawn before the balls), clear of the rooms, the doors and the east
 * window, so nothing the story does is hidden.
 */

/** The squat tower on the house's east corner, over the courtyard's west end, flush with the room's east wall. */
export const TOWER = { x0: 816.25, x1: ROOM.x0 - WALL, top: -13.0 }
/** The stair-head on the terrace, against the room's west wall: a block a storey lower than the room. */
export const HEAD = { x0: ROOM.x1 + WALL, x1: 823.55, top: -11.62 }
/** The bastion to the west, square and apart, short of the olive on the west cliff's top. */
export const BASTION = { x0: 827.95, x1: 828.78, top: -10.2 }
/** The curtain wall from the hall's west wall to the bastion. */
export const CURTAIN = { x0: HALL.x1 + WALL, x1: BASTION.x0, top: TOP - 0.52 }
/** The terraced walls the house stands on, stepping down the hill's face: each a course of walling a little wider. */
export const TERRACES = [
  { x0: GATE.wall[0] - 0.45, x1: BASTION.x1 + 0.45, y0: TOP, y1: TOP + 0.36 },
  { x0: GATE.wall[0] - 1.1, x1: BASTION.x1 + 1.45, y0: TOP + 0.36, y1: TOP + 0.78 },
] as const
/** The merlons along a crenellated edge: each `MERLON.w` wide and `MERLON.h` high, `MERLON.gap` apart (about). */
export const MERLON = { w: 0.14, h: 0.12, gap: 0.12 }
/** The highest and lowest the house goes, and its west and east ends, for the palace's own in-view test. */
export const KEEP_SPAN = { x0: TERRACES[1].x0, x1: TERRACES[1].x1, top: TOWER.top - MERLON.h, foot: TERRACES[1].y1 }

/**
 * A crenellated edge from x0 to x1 standing on y, added to the current path: a merlon at each end and even between.
 * `within` keeps only what of that row falls between its two x (a nearer wall laid over the same row: its merlons are
 * the row's own, so the two never stand doubled out of step).
 */
export function merlons(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, within?: [number, number]): void {
  const n = Math.max(2, Math.round((x1 - x0 + MERLON.gap) / (MERLON.w + MERLON.gap)))
  const step = (x1 - x0 - MERLON.w) / (n - 1)
  for (let i = 0; i < n; i++) {
    let a = x0 + i * step
    let b = a + MERLON.w
    if (within) {
      a = Math.max(a, within[0])
      b = Math.min(b, within[1])
      if (b - a < 0.005) continue
    }
    ctx.rect(a, y - MERLON.h, b - a, MERLON.h + 0.005)
  }
}

/**
 * A wall face of coursed limestone: the face, then the joints, its courses laid up from its foot and its blocks set
 * from a fixed line in the world, every other course a half block over (so they never swim as the camera moves).
 */
function coursed(g: Paint, x0: number, y0: number, x1: number, y1: number, face: string, row = 0.2, block = 0.44): void {
  const { ctx } = g
  rect(ctx, x0, y0, x1 - x0, y1 - y0)
  fill(ctx, face)
  ctx.save()
  rect(ctx, x0, y0, x1 - x0, y1 - y0)
  ctx.clip()
  ctx.beginPath()
  let k = Math.round(y1 / row)
  for (let yb = y1; yb > y0 + 0.03; yb -= row, k--) {
    const yt = yb - row
    if (yt > y0 + 0.03) {
      ctx.moveTo(x0, yt)
      ctx.lineTo(x1, yt)
    }
    const off = (((k % 2) + 2) % 2) * block * 0.5
    for (let x = Math.ceil((x0 - off) / block) * block + off; x < x1; x += block) {
      ctx.moveTo(x, Math.max(y0, yt))
      ctx.lineTo(x, yb)
    }
  }
  stroke(g, mix(face, outdoors(STONE_DEEP, g.t), 0.42), 0.8)
  ctx.restore()
}

/** A small dark square window centred on (x, y). */
function window(g: Paint, x: number, y: number, s: number): void {
  rect(g.ctx, x - s / 2, y - s / 2, s, s)
  fill(g.ctx, mix(outdoors(STONE_DEEP, g.t), '#15110E', 0.72))
}

/** A flat-roofed mass from the ground (or `foot`) to `top`, coursed, with its coping and its merlons. */
function mass(g: Paint, x0: number, x1: number, top: number, foot: number, face: string): void {
  const { ctx, t } = g
  coursed(g, x0, top, x1, foot, face)
  rect(ctx, x0 - 0.03, top, x1 - x0 + 0.06, 0.06)
  fill(ctx, outdoors(STONE_SHADE, t))
  ctx.beginPath()
  merlons(ctx, x0 - 0.03, x1 + 0.03, top)
  fill(ctx, face)
}

/** Everything of the fortress that stands behind the rooms and beside them, and the terraces under it. */
export function drawKeep(g: Paint): void {
  const { ctx, t } = g
  const stone = outdoors(STONE, t)
  // The masses behind the rooms a step darker than the walls in front of them, so the near walls stand out of them.
  const back = mix(stone, outdoors(STONE_SHADE, t), 0.55)
  // The terraces, the lower first (it stands out further down the hill), each a step darker as it goes down, with the
  // scrub on the lower one's step where it reaches past the upper one.
  const [upper, lower] = TERRACES
  coursed(g, lower.x0, lower.y0, lower.x1, lower.y1, mix(stone, outdoors(STONE_SHADE, t), 0.75))
  for (const [a, b] of [[lower.x0, upper.x0], [upper.x1, lower.x1]]) {
    rect(ctx, a, lower.y0, b - a, 0.06)
    fill(ctx, againstSun(SCRUB, t))
  }
  coursed(g, upper.x0, upper.y0, upper.x1, upper.y1, mix(stone, outdoors(STONE_SHADE, t), 0.5))
  rect(ctx, upper.x0, upper.y0, upper.x1 - upper.x0, 0.05)
  fill(ctx, outdoors(STONE_SHADE, t))
  for (const [x, r] of [[lower.x0 + 0.35, 0.2], [upper.x0 - 0.42, 0.16], [upper.x1 + 0.3, 0.17], [lower.x1 - 0.3, 0.21]] as const) {
    drawScrub(g, x, lower.y0, r, x < upper.x0 ? SCRUB_DARK : SCRUB)
  }
  // The tower on the east corner, two small windows up its face.
  mass(g, TOWER.x0, TOWER.x1, TOWER.top, TOP, back)
  const tx = (TOWER.x0 + TOWER.x1) / 2
  window(g, tx, -11.0, 0.17)
  window(g, tx, -12.25, 0.17)
  // The stair-head on the terrace, behind its parapet.
  mass(g, HEAD.x0, HEAD.x1, HEAD.top, TERRACE.y, back)
  window(g, (HEAD.x0 + HEAD.x1) / 2, -11.33, 0.13)
  // The curtain wall and the bastion to the west.
  mass(g, CURTAIN.x0, CURTAIN.x1 + 0.02, CURTAIN.top, TOP, mix(back, outdoors(STONE_SHADE, t), 0.3))
  mass(g, BASTION.x0, BASTION.x1, BASTION.top, TOP, back)
  window(g, (BASTION.x0 + BASTION.x1) / 2, -9.62, 0.15)
}

/**
 * The fortress's outline added to the current path, for the house seen dark against the sunset at the end. Not the
 * terraces: against the sun they are the hill's, dark with its rock (in the house's own dark they stood out of the cliff's
 * top as a square block).
 */
export function keepOutline(ctx: CanvasRenderingContext2D): void {
  for (const m of [TOWER, BASTION, CURTAIN]) {
    ctx.rect(m.x0 - 0.03, m.top, m.x1 - m.x0 + 0.06, TOP - m.top + 0.01)
    merlons(ctx, m.x0 - 0.03, m.x1 + 0.03, m.top)
  }
  ctx.rect(HEAD.x0, HEAD.top, HEAD.x1 - HEAD.x0, TERRACE.y - HEAD.top)
  merlons(ctx, HEAD.x0 - 0.03, HEAD.x1 + 0.03, HEAD.top)
  merlons(ctx, ROOM.x0 - WALL - 0.06, ROOM.x1 + WALL + 0.06, ROOM.ceil - SLAB - 0.06)
  merlons(ctx, TERRACE.x0, TERRACE.x1 + WALL, TERRACE.y - 0.31)
  merlons(ctx, GATE.wall[0], HALL.x0 - WALL, TOP - GATE.wallH - 0.06)
}
