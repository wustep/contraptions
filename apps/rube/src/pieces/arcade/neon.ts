import type p5 from 'p5'
import type { Theme } from '../../../../../src/core/themes'
import { solid } from '../../../../../src/core/draw'
import { clamp, easeOutCubic } from '../../../../../src/core/ease'
import { mixHex } from '../../parts'

/**
 * The arcade's shared vocabulary: glow, marquee lights, and a score that
 * pops off whatever the ball just hit. The palettes here are dark, so a
 * colour laid down with a soft halo reads as a lit tube or a lamp; the
 * halo is the only translucency in the show, and it stays here. The
 * halos are kept close and faint: a lamp is lit, not a searchlight, and
 * the ball must still be the brightest thing on the floor.
 *
 * What is lit has to have something dark to be lit against. The colours
 * are pale and so is the ink, so a colour on ink, or on a body of its own
 * colour, is lost: a display is a dark window its digits light in, a
 * marquee on a cabinet sits in a dark recess, and a score carries a rim of
 * the paper so it reads over whatever it pops across. Separation, not
 * brightness, is what makes these read.
 */

/** A soft halo behind something lit: a few rings of the colour, fading out. `f` is the brightness. */
export function glow(p: p5, k: number, color: string, x: number, y: number, r: number, f = 1): void {
  if (f <= 0.01) return
  p.push()
  p.noStroke()
  for (let i = 3; i >= 1; i--) {
    const c = p.color(color)
    c.setAlpha(11 * f * (4 - i))
    p.fill(c)
    p.circle(x * k, y * k, r * 2 * (0.6 + i * 0.38) * k)
  }
  p.pop()
}

/**
 * A lamp: a dot in the colour when lit, paper when not, with a halo when
 * lit. A small lamp's outline thins with it, so that the fill — which is
 * what says whether it is lit — is not swallowed by its own rim: at the
 * show's line weight a lamp under a twentieth of a cell was all ink.
 */
export function lamp(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x: number, y: number, r: number, lit: number): void {
  if (lit > 0.05) glow(p, k, color, x, y, r * 1.4, lit)
  solid(p, ink, weight * 0.8 * Math.min(1, r / 0.04), lit > 0.5 ? color : bg)
  p.circle(x * k, y * k, r * 2 * k)
}

/**
 * A row of marquee lamps from x0 to x1 at y, `n` of them, chasing with `t`
 * when `on`. On a body painted the lamps' own colour a lit lamp vanishes
 * into it, so a marquee there sits in a dark recess `band` tall — the
 * paper, let into the body like the striker's face — and the lamps read
 * lit or dark against it whatever the body's colour.
 */
export function marquee(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x0: number, x1: number, y: number, n: number, t: number, on = true, band = 0): void {
  if (band > 0) {
    p.noStroke()
    p.fill(bg)
    p.rect(((x0 + x1) / 2) * k, y * k, (x1 - x0) * k, band * k, 0.015 * k)
  }
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n
    const lit = on ? (Math.floor(t * 6 + i) % 3 === 0 ? 1 : 0) : 0
    lamp(p, k, ink, weight, color, bg, x, y, 0.026, lit)
  }
}

/** A lit tube: the colour with a halo, from (x0, y0) to (x1, y1). `f` is how lit. */
export function tube(p: p5, k: number, ink: string, weight: number, color: string, x0: number, y0: number, x1: number, y1: number, f = 1): void {
  p.push()
  if (f > 0.02) {
    const halo = p.color(color)
    halo.setAlpha(40 * f)
    p.stroke(halo)
    p.strokeWeight(weight * 3.2)
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  p.stroke(f > 0.5 ? color : ink)
  p.strokeWeight(weight * 1.3)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  p.pop()
}

/* 3×5 bitmap digits, for the score that pops off a hit. Rows top to bottom, bits left to right. */
const GLYPHS: Record<string, number[]> = {
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b001, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  '+': [0b000, 0b010, 0b111, 0b010, 0b000],
  x: [0b000, 0b101, 0b010, 0b101, 0b000],
}

/** How far a digit's dark rim reaches past its pixels, in pixels. */
const RIM = 0.24

/**
 * Bitmap text centred on (x, y), each pixel `px` cells, in the colour. A
 * piece facing the other way is drawn mirrored, but its numbers still read
 * left to right: the text undoes whatever flip the canvas is under. With a
 * `rim` the glyphs are first laid down in that colour a shade wider, so the
 * text stands as one silhouette on whatever is behind it — pins, a rail,
 * another piece's lines — rather than dissolving into them.
 */
export function digits(p: p5, k: number, color: string, x: number, y: number, text: string, px: number, rim?: string): void {
  const w = text.length * 4 - 1
  const flip = (p.drawingContext as CanvasRenderingContext2D).getTransform().a < 0 ? -1 : 1
  const cells: [number, number][] = []
  for (let c = 0; c < text.length; c++) {
    const g = GLYPHS[text[c]]
    if (!g) continue
    for (let r = 0; r < 5; r++) {
      for (let b = 0; b < 3; b++) {
        if (g[r] & (1 << (2 - b))) cells.push([(c * 4 + b - w / 2 + 0.5) * px, (r - 2) * px])
      }
    }
  }
  p.push()
  p.translate(x * k, y * k)
  p.scale(flip, 1)
  p.noStroke()
  if (rim) {
    p.fill(rim)
    for (const [gx, gy] of cells) p.rect(gx * k, gy * k, px * k * (1 + 2 * RIM), px * k * (1 + 2 * RIM))
  }
  p.fill(color)
  for (const [gx, gy] of cells) p.rect(gx * k, gy * k, px * k * 0.98, px * k * 0.98)
  p.pop()
}

/**
 * A score popping off (x, y): rises `rise` cells, holds, fades, over `dur`
 * seconds from the moment `since` = 0. It carries a rim of the paper so it
 * reads over whatever it pops across, and fades as one with it. Call it
 * from a piece's `scores` pass, never its `draw`: the show runs that pass
 * last of all, over every piece and the ball, so a score popping up into
 * the cell above is never behind the machine that stands there.
 */
export function score(p: p5, k: number, color: string, bg: string, x: number, y: number, text: string, since: number, dur = 0.8, rise = 0.18): void {
  if (since < 0 || since > dur) return
  const f = since / dur
  const up = easeOutCubic(clamp(f * 1.6))
  const alpha = 255 * (1 - clamp((f - 0.6) / 0.4))
  const c = p.color(color)
  c.setAlpha(alpha)
  const rim = p.color(bg)
  rim.setAlpha(alpha)
  digits(p, k, c.toString(), x, y - 0.22 - rise * up, text, 0.03, rim.toString())
}

/**
 * A display: a dark window in an ink frame with digits in it, lit in the
 * colour when the machine has something to say and dim when it is idle.
 * The window is dark so the digits read whatever colour the machine is
 * painted; a colour on the pale ink was lost whenever the colour was pale
 * too.
 */
export function display(p: p5, k: number, ink: string, weight: number, bg: string, x: number, y: number, w: number, h: number, text: string, color: string, lit: boolean, px = 0.022): void {
  solid(p, ink, weight, bg)
  p.rect(x * k, y * k, w * k, h * k, 0.01 * k)
  digits(p, k, lit ? color : mixHex(bg, ink, 0.42), x, y, text, px)
}

/** A cabinet: a box with a rounded top edge and a darker base band, in the colour. */
export function cabinet(p: p5, k: number, ink: string, weight: number, color: string, x: number, y0: number, y1: number, w: number): void {
  solid(p, ink, weight, color)
  p.rect(x * k, ((y0 + y1) / 2) * k, w * k, (y1 - y0) * k, 0.03 * k)
  p.fill(ink)
  p.noStroke()
  p.rect(x * k, (y1 - 0.03) * k, w * k, 0.04 * k)
}

/**
 * A flash off (x, y) in the colour: the arcade's hit mark. One ring that
 * leaves the ball's rim, thins and fades within about a ball's width, so
 * the hit is read and gone before the ball is; a hoop hanging in the air
 * after the ball has left is not a hit.
 */
export function flash(p: p5, k: number, color: string, weight: number, x: number, y: number, since: number, dur = 0.2, r0 = 0.12, r1 = 0.24): void {
  if (since < 0 || since > dur) return
  const f = since / dur
  const c = p.color(color)
  c.setAlpha(255 * (1 - f) * (1 - f))
  p.push()
  p.noFill()
  p.stroke(c)
  p.strokeWeight(weight * (1.3 - 0.7 * f))
  p.circle(x * k, y * k, (r0 + (r1 - r0) * easeOutCubic(f)) * 2 * k)
  p.pop()
}

/**
 * Water's colour in this palette: the bluest. The dunk tank's water and
 * the flume's splash are painted in it, so a splash never borrows the
 * colour of the machine that threw it up and reads as bits of it flying.
 */
export function arcadeWater(theme: Theme): string {
  const blueness = (hex: string) => parseInt(hex.slice(5, 7), 16) - parseInt(hex.slice(1, 3), 16)
  return [...theme.colors].sort((a, b) => blueness(b) - blueness(a))[0]
}
