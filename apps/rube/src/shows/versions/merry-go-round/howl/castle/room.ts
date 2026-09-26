import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, scenery } from '../kit'
import { level, SEAM } from '../music'
import { ROOM } from '../worlds'

/**
 * The castle's one room (canonical: the door builder owns this file; the plank builder's hearth part plays in it
 * too). A doll's house cut open: the back wall with the door on the left (the door itself is drawn by whichever
 * part is in the room, with `drawDoor` at `ROOM_AT.door`, since its opening and dial are theirs), the table, the
 * hearth in the middle where Calcifer lives (his log at `ROOM_AT.log`), the sink under the window, the stair up on
 * the right, beams and hanging clutter under the ceiling. The director wrote this first version so the show runs.
 *
 * Coordinates are cells from the room's origin, which the score puts at `ROOM_ORIGIN` in the room world: a ball
 * standing on the floor has its centre at y = 0 (the floor's surface is y = 0.13). Visited twice: at breakfast
 * (151.998 → 178.051: dark, then the morning through the window) and in the war (237.0 → 243.635: night, the
 * window red with fire). Lit by show time; draw nothing that belongs to only one visit.
 */

export const ROOM_AT = {
  floor: 0,
  ground: 0.13,
  ceil: -4.3,
  /** The walls' inner faces. */
  wallL: -2.0,
  wallR: 14.6,
  /** The door's sill (the opening centred on this x). */
  door: [0.3, 0.13] as Pt,
  /** The table's top: its ends and its height. */
  table: [2.4, 4.4, -0.62] as [number, number, number],
  /** The hearth: the fireplace's opening (x0, x1, top), and the log Calcifer sits on (his base). */
  hearth: [5.6, 7.6, -1.5] as [number, number, number],
  log: [6.6, -0.12] as Pt,
  /** The sink's rim, and the window over it (x0, x1, y0, y1). */
  sink: [8.6, 9.8, -0.75] as [number, number, number],
  window: [8.5, 9.9, -3.2, -1.7] as [number, number, number, number],
  /** The stair: from the floor at x0 up to the landing at x1, y. */
  stair: [10.6, 13.4, -3.4] as [number, number, number],
}

/** Where the room stands in the room world. */
export const ROOM_ORIGIN: Pt = [0, 0]

/** How lit the room is at show time `t`: 0 dark, 1 full morning. */
export function morningAt(t: number): number {
  if (t < SEAM.morning - 1) return 0
  if (t < 200) return Math.max(0, Math.min(1, (t - SEAM.morning) / 9))
  return 0
}
/** The war's red through the window, 0..1. */
export const warAt = (t: number): number => (t > SEAM.hearth - 2 && t < SEAM.plank + 1 ? 1 : 0)

export const room = scenery<null>({
  name: 'room',
  draw: (p, _s, c) => {
    const { k, weight: W, ink, t } = c
    const f = frame(p, k)
    const day = morningAt(t)
    const war = warAt(t)
    const R = ROOM_AT
    const dark = 0.62 * (1 - day)
    const tone = (hex: string) => mixHex(mixHex(hex, ROOM.night, dark), '#5A1E14', war * 0.25)
    p.push()
    p.rectMode(p.CORNER)
    // Outside the room: the night, or the wastes by day (only seen past the cut walls).
    p.noStroke()
    p.fill(tone(ROOM.soot))
    p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    // The back wall.
    p.fill(tone(ROOM.plaster))
    p.rect(R.wallL * k, R.ceil * k, (R.wallR - R.wallL) * k, (R.ground - R.ceil) * k)
    // The floor, in boards.
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(tone(ROOM.wood))
    p.rect((R.wallL - 0.4) * k, R.ground * k, (R.wallR - R.wallL + 0.8) * k, 0.7 * k)
    p.stroke(alpha(p, ink, 0.35))
    p.strokeWeight(W * 0.5)
    for (let x = R.wallL; x < R.wallR; x += 1.3) p.line(x * k, (R.ground + 0.05) * k, (x + 0.2) * k, (R.ground + 0.65) * k)
    // The ceiling's beams, and the cut walls either side.
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(tone(ROOM.woodDark))
    p.rect((R.wallL - 0.4) * k, (R.ceil - 0.5) * k, (R.wallR - R.wallL + 0.8) * k, 0.5 * k)
    for (let x = R.wallL + 1; x < R.wallR; x += 2.6) p.rect(x * k, R.ceil * k, 0.3 * k, 0.28 * k)
    p.rect((R.wallL - 0.4) * k, R.ceil * k, 0.4 * k, (R.ground - R.ceil) * k)
    p.rect(R.wallR * k, R.ceil * k, 0.4 * k, (R.ground - R.ceil) * k)
    // The window over the sink: the morning, or the fire of the war.
    const [wx0, wx1, wy0, wy1] = R.window
    const outside = war > 0 ? mixHex('#3A1A16', '#E0703A', 0.5 + 0.5 * Math.sin(t * 7)) : mixHex('#20263A', ROOM.window, day)
    p.fill(outside)
    p.rect(wx0 * k, wy0 * k, (wx1 - wx0) * k, (wy1 - wy0) * k)
    p.line(((wx0 + wx1) / 2) * k, wy0 * k, ((wx0 + wx1) / 2) * k, wy1 * k)
    p.line(wx0 * k, ((wy0 + wy1) / 2) * k, wx1 * k, ((wy0 + wy1) / 2) * k)
    // The sink.
    const [sx0, sx1, sy] = R.sink
    p.fill(tone(ROOM.cloth))
    p.rect(sx0 * k, sy * k, (sx1 - sx0) * k, (R.ground - sy) * k)
    p.fill(tone('#D8DCDC'))
    p.rect((sx0 - 0.08) * k, (sy - 0.1) * k, (sx1 - sx0 + 0.16) * k, 0.14 * k)
    // The table and two chairs.
    const [tx0, tx1, ty] = R.table
    p.fill(tone(ROOM.wood))
    p.rect(tx0 * k, ty * k, (tx1 - tx0) * k, 0.12 * k)
    p.rect((tx0 + 0.12) * k, (ty + 0.12) * k, 0.1 * k, (R.ground - ty - 0.12) * k)
    p.rect((tx1 - 0.22) * k, (ty + 0.12) * k, 0.1 * k, (R.ground - ty - 0.12) * k)
    // The hearth: a brick chimney breast up to the ceiling, the opening dark, the grate and the log.
    const [hx0, hx1, htop] = R.hearth
    p.fill(tone(ROOM.brick))
    p.rect((hx0 - 0.5) * k, R.ceil * k, (hx1 - hx0 + 1) * k, (R.ground - R.ceil) * k)
    p.fill(tone(ROOM.hearth))
    p.beginShape()
    p.vertex(hx0 * k, R.ground * k)
    p.vertex(hx0 * k, (htop + 0.3) * k)
    p.quadraticVertex(((hx0 + hx1) / 2) * k, (htop - 0.2) * k, hx1 * k, (htop + 0.3) * k)
    p.vertex(hx1 * k, R.ground * k)
    p.endShape(p.CLOSE)
    p.fill(tone(ROOM.woodDark))
    p.rect((hx0 - 0.7) * k, (htop - 0.22) * k, (hx1 - hx0 + 1.4) * k, 0.22 * k)
    // The grate and the log (Calcifer is drawn by the parts, on `ROOM_AT.log`).
    const [lx, ly] = R.log
    p.fill(tone('#2A2A2E'))
    p.rect((lx - 0.5) * k, (ly + 0.05) * k, 1.0 * k, 0.1 * k)
    p.fill(tone(ROOM.woodDark))
    p.rect((lx - 0.35) * k, (ly - 0.07) * k, 0.7 * k, 0.14 * k, 0.07 * k)
    // The hearth's glow on the floor and the wall, with the music (Calcifer is the room's light).
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const glow = 0.25 + 0.35 * level(t)
    const g = ctx.createRadialGradient(lx * k, (ly - 0.3) * k, 0, lx * k, (ly - 0.3) * k, 4.5 * k)
    g.addColorStop(0, `rgba(255, 160, 80, ${glow * (1 - 0.5 * day)})`)
    g.addColorStop(1, 'rgba(255, 160, 80, 0)')
    ctx.fillStyle = g
    ctx.fillRect((lx - 4.5) * k, (ly - 4.8) * k, 9 * k, 9 * k)
    // The stair up to the landing on the right.
    const [s0, s1, sLand] = R.stair
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(tone(ROOM.woodDark))
    p.beginShape()
    const n = 9
    p.vertex(s0 * k, R.ground * k)
    for (let i = 0; i < n; i++) {
      const x = s0 + ((s1 - s0) * i) / n
      const y = R.ground + ((sLand - R.ground) * (i + 1)) / n
      p.vertex(x * k, y * k)
      p.vertex((x + (s1 - s0) / n) * k, y * k)
    }
    p.vertex(R.wallR * k, sLand * k)
    p.vertex(R.wallR * k, R.ground * k)
    p.endShape(p.CLOSE)
    // Hanging clutter: bunches of herbs and a pan or two from the beams.
    p.strokeWeight(W * 0.6)
    for (const [x, len, col] of [[1.6, 0.7, '#7E8F5E'], [3.6, 0.5, '#9C7A4E'], [8.0, 0.8, '#7E8F5E'], [11.8, 0.6, ROOM.copper]] as [number, number, string][]) {
      p.line(x * k, R.ceil * k, x * k, (R.ceil + len) * k)
      p.fill(tone(col))
      // A bunch hung head down: a narrow wedge, never a round thing the size of a ball.
      p.triangle((x - 0.13) * k, (R.ceil + len) * k, (x + 0.13) * k, (R.ceil + len) * k, x * k, (R.ceil + len + 0.45) * k)
    }
    // The morning's light: a shaft from the window across the floor.
    if (day > 0.01) {
      p.noStroke()
      p.fill(alpha(p, ROOM.sun, 0.22 * day))
      p.quad(wx0 * k, wy1 * k, wx1 * k, wy1 * k, (wx1 - 2.2) * k, R.ground * k, (wx0 - 3.2) * k, R.ground * k)
    }
    p.pop()
  },
})

/** The cells the room covers, for its standing piece. */
export const ROOM_BOX = { x0: -4, y0: -7, x1: 17, y1: 3 }
