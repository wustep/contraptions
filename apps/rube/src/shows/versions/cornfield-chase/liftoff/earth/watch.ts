import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import type { Pt } from '../../../../../parts'
import { alpha } from '../kit'

/**
 * Cooper's watch: the one he gives Murph, the one on her shelf, and the one
 * whose second hand carries the message in the tesseract. After the
 * Hamilton Khaki Field that Murph wears in the film:
 *
 * - a round steel case with a polished bezel and a knurled crown at three;
 * - a black dial with large tan Arabic numerals, 1 to 12, and an outer
 *   minute track numbered 05 to 60;
 * - HAMILTON under the twelve and KHAKI AUTOMATIC over the six, in small
 *   capitals (drawn as strokes: the show's canvas sets no type);
 * - a tan cathedral hour hand and a tan syringe minute hand, set at 7:37,
 *   and a thin silver second hand;
 * - a black leather strap with cream stitching.
 *
 * The second hand does not sweep. It sits at 45 seconds and ticks back and
 * forth, a second each way, in Morse: the film's message. `twitch` adds to
 * it, for the tesseract, where the message is sent.
 *
 * It is stood up on a shelf, face out, its strap a closed loop behind it.
 * The detail is drawn to the size it is on the screen: the words and the
 * minute track's numbers only when there are pixels enough for them.
 */

/** Where it stands on Murph's bookcase: the left end of the top shelf, in the shelf's own cells (the top board's surface at -0.82). */
export const WATCH_ON_SHELF: Pt = [-0.25, -0.82]
/** Its case's radius, in cells: small, as a watch is. */
export const WATCH_R = 0.075

const STEEL = '#C4C9CF'
const STEEL_DARK = '#8B9199'
const STEEL_LIGHT = '#EEF1F4'
const DIAL = '#16181B'
const LUME = '#D8B888'
const SILVER = '#DCE0E4'
const STRAP = '#17171A'
const STITCH = '#E6DCC4'

export interface WatchStyle {
  /** The case's radius, in cells. */
  r?: number
  /** A glint on the glass, 0..1. */
  glint?: number
  /** Extra seconds on the second hand (the message being sent), added to its Morse tick. */
  twitch?: number
}

/* ------------------------------------------------------------------ the second hand, in Morse */

/** STAY, in Morse, over and over: dot, dash; each a tick forward held for its length, then back. */
const MORSE = '... - .- -.--'
const DOT = 0.22
const DASH = 0.6
const GAP = 0.22
const LETTER = 0.6
const WORD = 1.6
const KEYS: [number, number][] = (() => {
  const out: [number, number][] = []
  let t = 0
  for (let i = 0; i < MORSE.length; i++) {
    const ch = MORSE[i]
    if (ch === ' ') {
      t += LETTER - GAP
      continue
    }
    const len = ch === '.' ? DOT : DASH
    out.push([t, t + len])
    t += len + GAP
  }
  out.push([t + WORD, t + WORD])
  return out
})()
const PERIOD = KEYS[KEYS.length - 1][0]

/** How far the second hand is forward of 45 at show time `t`: 0 at rest, 1 on a key, with a quick ease each way. */
function keyed(t: number): number {
  const u = ((t % PERIOD) + PERIOD) % PERIOD
  const edge = 0.035
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, b] = KEYS[i]
    if (u < a - edge || u > b + edge) continue
    const up = Math.min(1, Math.max(0, (u - a + edge) / edge))
    const down = Math.min(1, Math.max(0, (b + edge - u) / edge))
    return Math.min(up, down)
  }
  return 0
}

/* ------------------------------------------------------------------ small strokes: the numerals and the words */

type Glyph = [number, number][][]
/** Strokes in a box 0..0.6 wide, 0..1 tall, y down. */
const GLYPHS: Record<string, Glyph> = {
  '0': [[[0.3, 0.02], [0.08, 0.2], [0.03, 0.5], [0.08, 0.8], [0.3, 0.98], [0.52, 0.8], [0.57, 0.5], [0.52, 0.2], [0.3, 0.02]]],
  '1': [[[0.12, 0.22], [0.34, 0.03], [0.34, 0.97]]],
  '2': [[[0.05, 0.22], [0.16, 0.05], [0.42, 0.04], [0.55, 0.2], [0.53, 0.38], [0.05, 0.96], [0.58, 0.96]]],
  '3': [[[0.05, 0.12], [0.22, 0.03], [0.46, 0.06], [0.55, 0.22], [0.48, 0.42], [0.26, 0.49], [0.5, 0.56], [0.58, 0.76], [0.46, 0.94], [0.22, 0.98], [0.03, 0.88]]],
  '4': [[[0.46, 0.97], [0.46, 0.03], [0.02, 0.68], [0.6, 0.68]]],
  '5': [[[0.55, 0.04], [0.13, 0.04], [0.08, 0.44], [0.34, 0.39], [0.55, 0.54], [0.56, 0.8], [0.36, 0.97], [0.05, 0.9]]],
  '6': [[[0.5, 0.07], [0.3, 0.03], [0.1, 0.24], [0.04, 0.6], [0.12, 0.9], [0.3, 0.98], [0.5, 0.88], [0.56, 0.66], [0.42, 0.5], [0.2, 0.51], [0.06, 0.66]]],
  '7': [[[0.03, 0.04], [0.58, 0.04], [0.24, 0.97]]],
  '8': [[[0.3, 0.48], [0.1, 0.36], [0.1, 0.14], [0.3, 0.03], [0.5, 0.14], [0.5, 0.36], [0.3, 0.48], [0.07, 0.62], [0.07, 0.86], [0.3, 0.98], [0.53, 0.86], [0.53, 0.62], [0.3, 0.48]]],
  '9': [[[0.54, 0.34], [0.4, 0.5], [0.18, 0.49], [0.05, 0.32], [0.12, 0.1], [0.3, 0.02], [0.5, 0.1], [0.56, 0.36], [0.48, 0.72], [0.3, 0.95], [0.08, 0.93]]],
  H: [[[0.05, 0.02], [0.05, 0.98]], [[0.55, 0.02], [0.55, 0.98]], [[0.05, 0.5], [0.55, 0.5]]],
  A: [[[0.02, 0.98], [0.3, 0.02], [0.58, 0.98]], [[0.13, 0.64], [0.47, 0.64]]],
  M: [[[0.03, 0.98], [0.06, 0.02], [0.3, 0.7], [0.54, 0.02], [0.57, 0.98]]],
  I: [[[0.3, 0.02], [0.3, 0.98]]],
  L: [[[0.08, 0.02], [0.08, 0.98], [0.55, 0.98]]],
  T: [[[0.02, 0.03], [0.58, 0.03]], [[0.3, 0.03], [0.3, 0.98]]],
  O: [[[0.3, 0.02], [0.07, 0.2], [0.03, 0.5], [0.07, 0.8], [0.3, 0.98], [0.53, 0.8], [0.57, 0.5], [0.53, 0.2], [0.3, 0.02]]],
  N: [[[0.05, 0.98], [0.05, 0.02], [0.55, 0.98], [0.55, 0.02]]],
  K: [[[0.07, 0.02], [0.07, 0.98]], [[0.55, 0.02], [0.07, 0.6]], [[0.22, 0.46], [0.57, 0.98]]],
  U: [[[0.05, 0.02], [0.05, 0.7], [0.18, 0.95], [0.42, 0.95], [0.55, 0.7], [0.55, 0.02]]],
  C: [[[0.55, 0.18], [0.4, 0.03], [0.2, 0.05], [0.05, 0.3], [0.05, 0.7], [0.2, 0.95], [0.4, 0.97], [0.55, 0.82]]],
}

/** A string of strokes, centred on (x, y), `h` tall, in pixels. */
function strokes(p: p5, text: string, x: number, y: number, h: number, tracking = 0.25): void {
  const w = h * 0.6
  const step = w + h * tracking
  const total = step * text.length - h * tracking
  let left = x - total / 2
  for (const ch of text) {
    const g = GLYPHS[ch]
    if (g) {
      for (const line of g) {
        p.beginShape()
        for (const [gx, gy] of line) p.vertex(left + gx * h, y - h / 2 + gy * h)
        p.endShape()
      }
    }
    left += step
  }
}

/* ------------------------------------------------------------------ the watch */

/**
 * Draw the watch standing with its foot at (x, y), in the caller's cells. `t` is show time,
 * for the second hand's Morse.
 */
export function drawWatch(p: p5, k: number, ink: string, weight: number, x: number, y: number, t: number, style: WatchStyle = {}): void {
  const r = style.r ?? WATCH_R
  const X = (v: number) => v * k
  /** The case's radius on the screen, in pixels: how much detail there is room for. */
  const R = X(r)
  p.push()
  p.translate(X(x), X(y))
  const cy = -(r + r * 0.72)
  const lug = r * 0.92

  // The strap: black alligator leather, a cream stitch running a hair in from each edge. On a shelf it stands the way
  // a buckled watch stands, the band a closed loop behind the case: from the front we see it rise from the twelve
  // o'clock lug and bend away behind, and come down from the six o'clock lug to the shelf and turn back along it.
  const edgeW = Math.min(weight * 0.55, Math.max(0.6, R * 0.05))
  const band = (top: number, bottom: number, wTop: number, wBottom: number, cap: 'up' | 'down') => {
    // A band between two widths, its far end rounded where it turns away from us.
    solid(p, ink, edgeW, STRAP)
    p.beginShape()
    p.vertex(X(-wBottom / 2), X(bottom))
    p.vertex(X(-wTop / 2), X(top))
    if (cap === 'up') p.bezierVertex(X(-wTop / 2), X(top - r * 0.2), X(wTop / 2), X(top - r * 0.2), X(wTop / 2), X(top))
    else p.vertex(X(wTop / 2), X(top))
    p.vertex(X(wBottom / 2), X(bottom))
    if (cap === 'down') p.bezierVertex(X(wBottom / 2), X(bottom + r * 0.12), X(-wBottom / 2), X(bottom + r * 0.12), X(-wBottom / 2), X(bottom))
    p.endShape(p.CLOSE)
    // Where it turns away, it darkens: a shade across its far end.
    p.noStroke()
    p.fill(alpha(p, '#000000', 0.35))
    if (cap === 'up') p.rect(0, X(top + r * 0.08), X(wTop * 0.9), X(r * 0.16), X(r * 0.08))
    if (cap === 'down') p.rect(0, X(bottom - r * 0.06), X(wBottom * 0.9), X(r * 0.12), X(r * 0.06))
    // The alligator's scales: a few soft bars across, when there is room to see them.
    if (R > 26) {
      p.stroke(alpha(p, '#3A3A40', 0.9))
      p.strokeWeight(Math.max(0.4, R * 0.012))
      const n = Math.max(2, Math.round(Math.abs(bottom - top) / (r * 0.2)))
      for (let i = 1; i < n; i++) {
        const y = top + ((bottom - top) * i) / n
        const w = wTop + ((wBottom - wTop) * i) / n
        p.line(X(-w * 0.32), X(y), X(w * 0.32), X(y))
      }
    }
    // The stitch, cream, just in from each edge: fine dashes when there is room, a fine line when not.
    if (R > 8) {
      p.stroke(alpha(p, STITCH, 0.95))
      p.strokeWeight(Math.max(0.5, R * (R > 26 ? 0.022 : 0.03)))
      const inset = 0.13
      for (const side of [-1, 1]) {
        const x0 = side * (wBottom / 2) * (1 - inset * 2)
        const x1 = side * (wTop / 2) * (1 - inset * 2)
        if (R > 26) {
          const n = Math.max(3, Math.round(Math.abs(bottom - top) / (r * 0.09)))
          for (let i = 0; i < n; i += 2) {
            const u0 = i / n
            const u1 = Math.min(1, (i + 1) / n)
            p.line(X(x0 + (x1 - x0) * u0), X(bottom + (top - bottom) * u0), X(x0 + (x1 - x0) * u1), X(bottom + (top - bottom) * u1))
          }
        } else p.line(X(x0), X(bottom), X(x1), X(top))
      }
    }
  }
  // Below: from the six o'clock lug down to the shelf, a touch wider as it comes to rest on it.
  band(cy + r * 1.05, 0, lug * 0.96, lug * 1.02, 'down')
  // Above: up from the twelve o'clock lug and away behind, narrowing, with its keeper.
  band(cy - r * 1.9, cy - r * 1.05, lug * 0.8, lug * 0.96, 'up')
  solid(p, ink, edgeW, STRAP)
  p.rect(0, X(cy - r * 1.42), X(lug * 0.98), X(r * 0.16), X(r * 0.04))

  // A small, precise thing: its lines are finer than the room's.
  const fine = Math.min(weight * 0.55, Math.max(0.6, R * 0.05))
  // The lugs, top and bottom, where the strap meets the case.
  solid(p, ink, fine, STEEL)
  for (const s of [-1, 1]) p.rect(0, X(cy + s * r * 0.98), X(lug * 0.95), X(r * 0.3), X(r * 0.06))
  // The crown at three: knurled.
  solid(p, ink, fine, STEEL)
  p.rect(X(r * 1.1), X(cy), X(r * 0.3), X(r * 0.42), X(r * 0.06))
  if (R > 10) {
    p.stroke(alpha(p, STEEL_DARK, 0.9))
    p.strokeWeight(Math.max(0.5, R * 0.018))
    for (let i = -2; i <= 2; i++) p.line(X(r * 0.98), X(cy + i * r * 0.07), X(r * 1.24), X(cy + i * r * 0.07))
  }
  // The case: steel, a polished bezel with a highlight.
  solid(p, ink, fine * 1.3, STEEL)
  p.circle(0, X(cy), X(2 * r))
  if (R > 6) {
    p.noFill()
    p.stroke(alpha(p, STEEL_LIGHT, 0.9))
    p.strokeWeight(Math.max(0.8, R * 0.06))
    p.arc(0, X(cy), X(2 * r * 0.92), X(2 * r * 0.92), Math.PI * 1.05, Math.PI * 1.55)
    p.stroke(alpha(p, STEEL_DARK, 0.8))
    p.arc(0, X(cy), X(2 * r * 0.92), X(2 * r * 0.92), Math.PI * 0.05, Math.PI * 0.55)
  }
  // The dial: black.
  const D = r * 0.8
  solid(p, ink, fine * 0.6, DIAL)
  p.circle(0, X(cy), X(2 * D))
  const at = (a: number, rr: number): [number, number] => [X(Math.sin(a) * rr), X(cy - Math.cos(a) * rr)]

  // The minute track: sixty fine ticks round the edge, and 05 to 60 in it when there is room.
  if (R > 16) {
    p.stroke(alpha(p, SILVER, 0.75))
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      const five = i % 5 === 0
      p.strokeWeight(Math.max(0.4, R * (five ? 0.02 : 0.012)))
      const [ax, ay] = at(a, D * 0.97)
      const [bx, by] = at(a, D * (five ? 0.86 : 0.9))
      p.line(ax, ay, bx, by)
    }
  }
  if (R > 70) {
    p.noFill()
    p.stroke(alpha(p, SILVER, 0.8))
    p.strokeWeight(Math.max(0.4, R * 0.01))
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const [nx, ny] = at(a, D * 0.8)
      strokes(p, String(i * 5).padStart(2, '0'), nx, ny, X(D * 0.075), 0.2)
    }
  }
  // The hours: large tan Arabic numerals; small, tan dots when the watch is small on the screen.
  if (R > 14) {
    p.noFill()
    p.stroke(LUME)
    p.strokeWeight(Math.max(0.7, R * 0.034))
    p.strokeCap(p.ROUND)
    p.strokeJoin(p.ROUND)
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const [nx, ny] = at(a, D * (R > 70 ? 0.6 : 0.64))
      strokes(p, String(i), nx, ny, X(D * (R > 70 ? 0.17 : 0.19)), 0.1)
    }
  } else {
    p.noStroke()
    p.fill(LUME)
    for (let i = 0; i < 12; i++) {
      const [nx, ny] = at((i / 12) * Math.PI * 2, D * 0.72)
      p.circle(nx, ny, Math.max(1, X(D * 0.14)))
    }
  }
  // HAMILTON under the twelve, KHAKI and AUTOMATIC over the six: words when there is room, a hint when not.
  if (R > 45) {
    p.noFill()
    p.stroke(alpha(p, SILVER, 0.9))
    p.strokeWeight(Math.max(0.5, R * 0.016))
    strokes(p, 'HAMILTON', 0, X(cy - D * 0.3), X(D * 0.085), 0.3)
    strokes(p, 'KHAKI', 0, X(cy + D * 0.24), X(D * 0.06), 0.3)
    strokes(p, 'AUTOMATIC', 0, X(cy + D * 0.34), X(D * 0.05), 0.3)
  } else if (R > 16) {
    p.stroke(alpha(p, SILVER, 0.55))
    p.strokeWeight(Math.max(0.5, R * 0.03))
    p.line(X(-D * 0.2), X(cy - D * 0.3), X(D * 0.2), X(cy - D * 0.3))
    p.line(X(-D * 0.14), X(cy + D * 0.28), X(D * 0.14), X(cy + D * 0.28))
  }

  // The hands, at 7:37: a tan cathedral hour hand, a tan syringe minute hand.
  const hourA = ((7 + 37 / 60) / 12) * Math.PI * 2
  const minA = (37 / 60) * Math.PI * 2
  const hand = (a: number, pts: [number, number][], fill: string) => {
    p.push()
    p.translate(0, X(cy))
    p.rotate(a)
    solid(p, ink, Math.max(0.4, fine * 0.5), fill)
    p.beginShape()
    for (const [hx, hy] of pts) p.vertex(X(hx * D), X(-hy * D))
    p.endShape(p.CLOSE)
    p.pop()
  }
  // Cathedral: a spear with a window below its tip.
  hand(hourA, [[0, -0.12], [0.07, 0.05], [0.06, 0.3], [0.1, 0.4], [0, 0.55], [-0.1, 0.4], [-0.06, 0.3], [-0.07, 0.05]], LUME)
  if (R > 20) {
    p.push()
    p.translate(0, X(cy))
    p.rotate(hourA)
    p.noStroke()
    p.fill(DIAL)
    p.beginShape()
    for (const [hx, hy] of [[0, 0.33], [0.04, 0.4], [0, 0.47], [-0.04, 0.4]]) p.vertex(X(hx * D), X(-hy * D))
    p.endShape(p.CLOSE)
    p.pop()
  }
  // Syringe: a thin shaft with a slim bulb near its tip.
  hand(minA, [[0, -0.14], [0.035, 0.05], [0.025, 0.55], [0.055, 0.66], [0, 0.86], [-0.055, 0.66], [-0.025, 0.55], [-0.035, 0.05]], LUME)
  // The second hand: thin silver, with a tail, ticking at 45 in Morse.
  const sec = 45 + keyed(t) + (style.twitch ?? 0)
  const secA = (sec / 60) * Math.PI * 2
  p.stroke(SILVER)
  p.strokeWeight(Math.max(0.6, R * 0.025))
  const [sx, sy] = at(secA, D * 0.88)
  const [tx, ty] = at(secA + Math.PI, D * 0.22)
  p.line(tx, ty, sx, sy)
  p.noStroke()
  p.fill(SILVER)
  p.circle(0, X(cy), Math.max(1.5, X(r * 0.1)))
  // The glass's glint.
  const g = style.glint ?? 0.35
  if (g > 0.01) {
    p.noFill()
    p.stroke(alpha(p, '#FFFFFF', 0.55 * g))
    p.strokeWeight(Math.max(0.8, X(r * 0.08)))
    p.arc(0, X(cy), X(2 * D * 0.86), X(2 * D * 0.86), Math.PI * 1.12, Math.PI * 1.42)
  }
  outline(p, ink, weight * 0.5)
  p.pop()
}
