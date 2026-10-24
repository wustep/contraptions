import type { Light } from '../../light'
import { box, circle, ellipse, fill, ink, lit, mix, poly, rgba, smooth, type Paint } from '../../paint'
import { BATH } from '../../geo'

/**
 * Her room, at the bathhouse's east end on the third storey, seen with its front cut away: tatami, paper screens on its
 * back wall, the bedding rolled against the west wall, and in the east wall the door out to the balcony, with a
 * wooden shutter in the lintel over it that drops on a cord. The day comes in at the door; the shutter shuts it out.
 */

const R = BATH.room
const D = BATH.door2
const WOOD = '#5A4030'
const PLASTER = '#E2D7BF'
const SCREEN = '#EDE3C8'
const TATAMI = '#CFC690'
const LINE = '#2A1A12'

/** The cord's toggle, hanging inside by the door: she knocks it and the shutter drops. */
export const TOGGLE: [number, number] = [D.x0 - 0.22, -5.92]

/** The room behind its cut-away front: under the balls. */
export function drawRoom(g: Paint, L: Light): void {
  const { ctx } = g
  const line = mix(LINE, L.top, 0.2)
  // The back wall: paper screens between dark posts, lit from the day outside.
  box(ctx, R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, lit(PLASTER, L.ambient, 0.3))
  const n = 5
  const w = (D.x0 - R.x0 - 0.3) / n
  for (let i = 0; i < n; i++) {
    const x = R.x0 + 0.15 + i * w
    box(ctx, x + 0.03, R.y0 + 0.2, w - 0.06, 0.62, lit(SCREEN, L.ambient, 0.4))
    poly(ctx, [[x + w / 2, R.y0 + 0.2], [x + w / 2, R.y0 + 0.82]], false)
    ink(g, lit('#9C8A6A', L.ambient, 0.3), 1)
  }
  for (let i = 0; i <= n; i++) box(ctx, R.x0 + 0.13 + i * w, R.y0, 0.05, R.y1 - R.y0, lit(WOOD, L.ambient, 0.2))
  // The ceiling's beam, the floor: a tatami's pale gold with its dark border, and the boards under it.
  box(ctx, R.x0, R.y0, R.x1 - R.x0, 0.1, lit(WOOD, L.ambient, 0.2))
  box(ctx, R.x0, R.y1 - 0.05, D.x0 - R.x0, 0.05, lit(TATAMI, L.ambient, 0.3))
  for (let x = R.x0 + 0.9; x < D.x0; x += 0.9) box(ctx, x, R.y1 - 0.05, 0.03, 0.05, lit('#3E4A30', L.ambient, 0.2))
  box(ctx, R.x0, R.y1, R.x1 - R.x0, 0.1, lit('#3A2A20', L.ambient, 0.2))
  // The bedding, rolled against the west wall: a cream roll with a blue band, and a small chest.
  ellipse(ctx, R.x0 + 0.45, R.y1 - 0.14, 0.3, 0.12)
  fill(ctx, lit('#E8E0CC', L.ambient, 0.3))
  ink(g, line, 1.1)
  box(ctx, R.x0 + 0.25, R.y1 - 0.25, 0.08, 0.22, lit('#3C4E7A', L.ambient, 0.3))
  box(ctx, R.x0 + 0.85, R.y1 - 0.3, 0.42, 0.3, lit('#6A4A32', L.ambient, 0.2))
  ink(g, line, 1)
  // The west wall's edge.
  box(ctx, R.x0 - 0.06, R.y0, 0.1, R.y1 - R.y0 + 0.1, lit(WOOD, L.ambient, 0.2))
}

/**
 * The east wall over the balls and the dragon: its lintel over the door, the post under the lintel's end, the shutter
 * as far down as it has dropped (`shut`, 0 up to 1 down), and the cord with its toggle (knocked at `knock`).
 */
export function drawEastWall(g: Paint, L: Light, shut: number, knock: number): void {
  const { ctx, t } = g
  const line = mix(LINE, L.top, 0.2)
  const wall = lit(PLASTER, L.ambient, 0.15)
  // With the shutter down the day is shut out: the room and all in it a shade dimmer.
  if (shut > 0.01) {
    ctx.fillStyle = rgba(mix(L.shade, '#2A1A12', 0.5), 0.24 * smooth(shut, 0, 1))
    ctx.fillRect(R.x0 - 0.06, R.y0, D.x0 - R.x0 + 0.06, R.y1 - R.y0)
  }
  // The wall above the door, and its lintel.
  box(ctx, D.x0, R.y0, D.x1 - D.x0, D.top - R.y0, wall)
  box(ctx, D.x0 - 0.04, D.top - 0.08, D.x1 - D.x0 + 0.08, 0.1, lit(WOOD, L.ambient, 0.2))
  // The shutter: boards, dropping out of the lintel to the floor.
  const h = (R.y1 - D.top) * smooth(shut, 0, 1)
  if (h > 0.005) {
    box(ctx, D.x0 + 0.03, D.top, D.x1 - D.x0 - 0.04, h, lit('#7A5A40', L.ambient, 0.2))
    poly(ctx, [[D.x0 + 0.03, D.top], [D.x0 + 0.03, D.top + h], [D.x1 - 0.01, D.top + h], [D.x1 - 0.01, D.top]])
    ink(g, line, 1.2)
  }
  // The cord, from the lintel down to its toggle, swinging when it is knocked.
  const swing = knock > 0 && t > knock ? 0.1 * Math.sin((t - knock) * 9) * Math.exp(-(t - knock) / 0.5) : 0
  const tx = TOGGLE[0] + swing
  const ty = TOGGLE[1] - (knock > 0 ? 0.08 * smooth(t, knock, knock + 0.12) * (1 - smooth(t, knock + 0.3, knock + 0.8)) : 0)
  poly(ctx, [[D.x0 - 0.05, D.top + 0.02], [tx, ty]], false)
  ink(g, lit('#C9B38A', L.ambient, 0.3), 1.3)
  circle(ctx, tx, ty + 0.03, 0.035)
  fill(ctx, lit('#8A2E22', L.ambient, 0.2))
}
