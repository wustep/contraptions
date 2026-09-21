import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, mixHex, over, rail, roll, type Lane, type PieceCtx, type Pt } from '../../parts'
import { arcadeWater, lamp, score } from './neon'

/**
 * A hall of mirrors. Three funhouse glasses stand on their feet behind the
 * lane, each bent a different way and cut to the shape of its bend: a
 * barrel, an hourglass, a ribbon. The ball rolls past in front of them at
 * the lane's own pace, and in each glass as it passes goes something that is
 * and is not the ball: squat and very wide in the barrel, a tall thin candle
 * in the hourglass, and in the ribbon a thing bent into an S that ripples as
 * it goes. A glass brightens while there is somebody in it and the lamp on
 * its frame's head lights, and it pays as the ball goes by, more at each
 * glass than the last: ten, twenty, thirty. Nothing here touches the ball;
 * the ball is the cause.
 *
 * A reflection is drawn from the lane: where the ball is, that is where it
 * is, well up the glass as a mirror leaning back would have it, so that the
 * ball is never standing in front of its own face; in the ball's own colour
 * with its outline and its dot, as big as the glass over the ball lets it
 * be, and clipped to the pane: in at one edge, out at the other. The glass
 * is kept dark enough for it: the arcade's colours are pale, and an image on
 * a pale glass is lost.
 */
type Bend = 'barrel' | 'hourglass' | 'ribbon'
const BENDS: Bend[] = ['barrel', 'hourglass', 'ribbon']
/** A pane: from its head to its foot, and half as wide as this where it is not bent. */
const HEAD = -0.425
const FOOT = 0.33
const HALF = 0.34
/** The lamp on a frame's head, let into it so that the head of the glass can stand as high as the cell lets it. */
const LAMP = 0.06
const LAMP_Y = HEAD - 0.013
/** How much of the ink is in a glass standing empty, and in one with somebody in it; and how much of the palette's blue, which is what makes it glass. */
const GLASS = [0.26, 0.4]
const BLUE = 0.22

/** A pane's two edges at height `y`: the left and the right, for a pane centred on `cx`. */
function edges(bend: Bend, cx: number, y: number): [number, number] {
  const v = (y - (HEAD + FOOT) / 2) / ((FOOT - HEAD) / 2)
  if (bend === 'barrel') {
    const w = HALF * (0.8 + 0.2 * Math.cos((v * Math.PI) / 2))
    return [cx - w, cx + w]
  }
  if (bend === 'hourglass') {
    const w = HALF * (1 - 0.22 * Math.cos((v * Math.PI) / 2))
    return [cx - w, cx + w]
  }
  const lean = 0.04 * Math.sin(v * Math.PI * 1.5)
  return [cx - HALF * 0.9 + lean, cx + HALF * 0.9 + lean]
}

/** A pane's outline as a closed path on the canvas: down its left edge, back up its right. */
function pane(p: p5, k: number, bend: Bend, cx: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const n = 16
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const y = HEAD + ((FOOT - HEAD) * i) / n
    const x = edges(bend, cx, y)[0]
    if (i === 0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  for (let i = n; i >= 0; i--) {
    const y = HEAD + ((FOOT - HEAD) * i) / n
    ctx.lineTo(edges(bend, cx, y)[1] * k, y * k)
  }
  ctx.closePath()
}

/**
 * What each glass makes of a ball: how much wider, how much taller, how far
 * up the glass its middle stands, and how far an S-bend throws its sides.
 */
const SHAPES: Record<Bend, { fx: number; fy: number; up: number; wave: number }> = {
  barrel: { fx: 2.3, fy: 0.8, up: 0.28, wave: 0 },
  hourglass: { fx: 0.64, fy: 1.42, up: 0.2, wave: 0 },
  ribbon: { fx: 0.95, fy: 1.25, up: 0.225, wave: 0.075 },
}

/** The ball as a glass shows it, over the ball at `x`: its outline, and its dot where the ball's own is. */
function reflection(p: p5, k: number, ink: string, weight: number, color: string, bend: Bend, x: number, spin: number): void {
  const { fx, fy, up, wave } = SHAPES[bend]
  // The S: one whole wave from the image's head to its foot, and it runs through the image as the ball goes.
  const bent = (dx: number, dy: number): Pt => [x + dx * fx + wave * Math.sin((dy / R) * Math.PI + x * 9), -up + dy * fy]
  solid(p, ink, weight, color)
  p.beginShape()
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const [vx, vy] = bent(Math.cos(a) * R, Math.sin(a) * R)
    p.vertex(vx * k, vy * k)
  }
  p.endShape(p.CLOSE)
  const [dx, dy] = bent(Math.cos(spin) * R * 0.48, Math.sin(spin) * R * 0.48)
  p.fill(ink)
  p.noStroke()
  p.ellipse(dx * k, dy * k, 2 * R * 0.2 * Math.max(fx, 0.8) * k, 2 * R * 0.2 * Math.max(fy, 0.8) * k)
}

const LANE: Lane = { segs: [roll([-0.5, 0], [2.5, 0], ROLL)], fire: 2.5 / ROLL }
/** When the ball is dead in front of each glass. */
const FRONT = [0, 1, 2].map((cx) => (cx + 0.5) / ROLL)
/** The lane's length in seconds: there is nobody in any glass after it. */
const SPAN = 3 / ROLL
/** What each glass pays, and where it pops from: over the glass, where the fifty always did, whatever the frames have grown to since. */
const PAYS = [10, 20, 30]
const SCORE_Y = -0.37

export const mirrors = definePiece<{ color: string }>({
  name: 'mirrors',
  points: PAYS.reduce((a, b) => a + b, 0),
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, c: PieceCtx) => {
    const { k, t, ink, bg, weight, color, theme } = c
    const blue = arcadeWater(theme)
    const here = t >= 0 && t <= SPAN
    const bx = -0.5 + ROLL * t
    BENDS.forEach((bend, i) => {
      // How much of the ball stands before this glass: all of it over the pane, none a ball's width off its edge.
      const near = here ? 1 - over(Math.abs(bx - i), HALF - R, HALF + R) : 0
      // The frame's feet, the pane, and the lamp on its head.
      outline(p, ink, weight)
      for (const dx of [-0.17, 0.17]) {
        p.line((i + dx) * k, FOOT * k, (i + dx) * k, 0.5 * k)
        p.line((i + dx - 0.05) * k, 0.5 * k, (i + dx + 0.05) * k, 0.5 * k)
      }
      // The pane is painted on the canvas itself, behind p5's back; the pop at the end hands p5 its colours back, or the next fill it thinks it has already set is never set, and an unlit lamp is filled with glass.
      const ctx = p.drawingContext as CanvasRenderingContext2D
      p.push()
      pane(p, k, bend, i)
      ctx.fillStyle = mixHex(mixHex(bg, ink, GLASS[0] + (GLASS[1] - GLASS[0]) * near), blue, BLUE)
      ctx.fill()
      // The reflection, clipped to the pane: only while the ball is somewhere it could be seen in it.
      const reach = HALF + R * SHAPES[bend].fx + SHAPES[bend].wave
      if (here && Math.abs(bx - i) < reach) {
        p.push()
        pane(p, k, bend, i)
        ctx.clip()
        reflection(p, k, ink, weight, color, bend, bx, c.spin(bx))
        p.pop()
      }
      pane(p, k, bend, i)
      ctx.strokeStyle = s.color
      ctx.lineWidth = weight * 2.2
      ctx.lineJoin = 'round'
      ctx.stroke()
      pane(p, k, bend, i)
      ctx.strokeStyle = ink
      ctx.lineWidth = weight * 0.6
      ctx.stroke()
      p.pop()
      // Lit while the ball is before the glass, and a moment dying after it has gone.
      const gone = FRONT[i] + HALF / ROLL
      lamp(p, k, ink, weight, s.color, bg, i, LAMP_Y, LAMP, near > 0.5 ? 1 : t > gone ? 1 - over(t, gone, gone + 0.35) : 0)
    })
    rail(p, k, ink, weight, -0.5, 2.5)
  },
  // Over each glass as the ball is dead in front of it, each more than the last.
  scores: (p, s, { k, t, bg }) => PAYS.forEach((n, i) => score(p, k, s.color, bg, i, SCORE_Y, `+${n}`, t - FRONT[i])),
})
