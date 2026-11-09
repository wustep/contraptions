import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import type { Pt } from '../../../../../parts'
import { alpha } from '../kit'

/**
 * Cooper's watch: the one he gives Murph, the one on her shelf, and the one
 * whose second hand carries the message in the tesseract. After the
 * Hamilton Khaki Field that Murph wears in the film, but drawn the way the
 * show draws everything, flat and plain: a round steel case with a crown at
 * three, a black dial with tan bars at the quarters and tan dots between,
 * two plain tan hands at 7:37, a thin silver second hand, and a black strap.
 * No numbers and no words.
 *
 * The second hand does not sweep. It sits at 45 seconds and ticks forward and
 * back in Morse: the film's message, STAY, in the code's own proportions (a
 * dash three dots long, a dot between the marks of a letter, three between
 * letters, seven between words). A key throws it forward three and a half marks
 * with a snap and a hair of overshoot, and it stays there for the key's
 * length, so a dot is a flick and a dash a held jump: the difference is seen,
 * not counted. `from` holds it still until the message starts, for the
 * tesseract, where it is sent.
 *
 * It is stood up on a shelf, face out, its strap a closed loop behind it.
 */

/** Where it stands on Murph's bookcase: the left end of the top shelf, in the shelf's own cells (the top board's surface at -0.82). */
export const WATCH_ON_SHELF: Pt = [-0.25, -0.82]
/** Its case's radius, in cells: small, as a watch is. */
export const WATCH_R = 0.075

const STEEL = '#C4C9CF'
const STEEL_LIGHT = '#EEF1F4'
const DIAL = '#16181B'
const LUME = '#D8B888'
/** The lume as it shows in the dark. */
const LUME_LIT = '#EBD9A8'
const SILVER = '#DCE0E4'
const STRAP = '#17171A'

export interface WatchStyle {
  /** The case's radius, in cells. */
  r?: number
  /** A glint on the glass, 0..1. */
  glint?: number
  /** Show time from which the second hand ticks its Morse, from the message's start; before it, still at 45. Left out, it always ticks. */
  from?: number
  /**
   * In the dark (the opening's first seconds): only what shows there, at this strength, 0..1. The lume of the marks
   * and the two hands, and the first light along the steel of the case and the second hand. Drawn over the dark.
   */
  night?: number
}

/* ------------------------------------------------------------------ the second hand, in Morse */

/** STAY, in Morse, over and over. */
const MORSE = '... - .- -.--'
/** The code's unit: a dot. A word takes 35 of them, 3.85 s, and seven more go by before it starts again. */
export const MORSE_UNIT = 0.11
/** How far a key throws the hand forward of 45, in marks (seconds of the dial). */
export const MORSE_SWING = 3.5
/** Each key of one word: when the hand goes forward and when it comes back, in seconds from the word's start. */
export const STAY_KEYS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = []
  let t = 0
  for (const ch of MORSE) {
    if (ch === ' ') {
      // Between letters, three units: one is already there after the last mark.
      t += 2 * MORSE_UNIT
      continue
    }
    const len = (ch === '.' ? 1 : 3) * MORSE_UNIT
    out.push([t, t + len])
    t += len + MORSE_UNIT
  }
  return out
})()
/** One word, first key down to last key up; and the word with the gap after it. */
export const STAY_LENGTH = STAY_KEYS[STAY_KEYS.length - 1][1]
export const STAY_PERIOD = STAY_LENGTH + 7 * MORSE_UNIT

/** A step the hand takes: there in under three hundredths of a second, a hair past, and still. */
const snap = (s: number): number => (s <= 0 ? 0 : 1 - Math.exp(-s / 0.016) * Math.cos(s * 58))

/** How far the second hand is forward of 45, `t` seconds after the message started: 0 at rest, 1 on a key. */
export function keyed(t: number): number {
  if (t < 0) return 0
  const u = t % STAY_PERIOD
  let on = 0
  for (const [a, b] of STAY_KEYS) on += snap(u - a) - snap(u - b)
  return on
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
  const D = r * 0.8
  const at = (a: number, rr: number): [number, number] => [X(Math.sin(a) * rr), X(cy - Math.cos(a) * rr)]
  // A small, precise thing: its lines are finer than the room's.
  const fine = Math.min(weight * 0.55, Math.max(0.6, R * 0.05))

  // The hours: tan bars at twelve, three, six and nine, tan dots between. No numbers, no words: it is the show's
  // watch, drawn as the show draws, not a catalogue's.
  const marks = (fill: string | p5.Color) => {
    p.noStroke()
    p.fill(fill as string)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      if (i % 3 === 0) {
        p.push()
        p.translate(...at(a, D * 0.74))
        p.rotate(a)
        p.rect(0, 0, Math.max(1.2, X(D * 0.1)), Math.max(2, X(D * 0.28)), Math.max(0.5, X(D * 0.03)))
        p.pop()
      } else {
        const [nx, ny] = at(a, D * 0.78)
        p.circle(nx, ny, Math.max(1, X(D * 0.11)))
      }
    }
  }
  // The hands, at 7:37: two plain tapered hands, the hour short and broad, the minute long and slim.
  const hourA = ((7 + 37 / 60) / 12) * Math.PI * 2
  const minA = (37 / 60) * Math.PI * 2
  const hand = (a: number, pts: [number, number][], fill: string | p5.Color, inked: boolean) => {
    p.push()
    p.translate(0, X(cy))
    p.rotate(a)
    if (inked) solid(p, ink, Math.max(0.4, fine * 0.5), fill as string)
    else {
      p.noStroke()
      p.fill(fill as string)
    }
    p.beginShape()
    for (const [hx, hy] of pts) p.vertex(X(hx * D), X(-hy * D))
    p.endShape(p.CLOSE)
    p.pop()
  }
  const hands = (fill: string | p5.Color, inked: boolean) => {
    hand(hourA, [[0, -0.1], [0.08, 0.02], [0.05, 0.42], [0, 0.52], [-0.05, 0.42], [-0.08, 0.02]], fill, inked)
    hand(minA, [[0, -0.12], [0.055, 0.02], [0.03, 0.72], [0, 0.82], [-0.03, 0.72], [-0.055, 0.02]], fill, inked)
  }
  // The second hand: thin silver, with a tail, at 45, thrown forward on each key of the Morse.
  const second = (stroke: string | p5.Color) => {
    const on = style.from === undefined ? keyed(t) : keyed(t - style.from)
    const secA = ((45 + MORSE_SWING * on) / 60) * Math.PI * 2
    p.stroke(stroke as string)
    p.strokeWeight(Math.max(0.6, R * 0.025))
    const [sx, sy] = at(secA, D * 0.88)
    const [tx, ty] = at(secA + Math.PI, D * 0.22)
    p.line(tx, ty, sx, sy)
    p.noStroke()
    p.fill(stroke as string)
    p.circle(0, X(cy), Math.max(1.5, X(r * 0.1)))
  }
  // The first light along the polished bezel.
  const bezelLight = (stroke: string | p5.Color) => {
    p.noFill()
    p.stroke(stroke as string)
    p.strokeWeight(Math.max(0.8, R * 0.06))
    p.arc(0, X(cy), X(2 * r * 0.92), X(2 * r * 0.92), Math.PI * 1.05, Math.PI * 1.55)
  }

  // In the dark, over it: the lume, and what little light there is on the steel.
  const night = style.night ?? 0
  if (night > 0) {
    if (R > 6) bezelLight(alpha(p, STEEL_LIGHT, 0.4 * night))
    marks(alpha(p, LUME_LIT, 0.8 * night))
    hands(alpha(p, LUME_LIT, 0.8 * night), false)
    second(alpha(p, STEEL_LIGHT, 0.95 * night))
    p.pop()
    return
  }

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
  }
  // Below: from the six o'clock lug down to the shelf, a touch wider as it comes to rest on it.
  band(cy + r * 1.05, 0, lug * 0.96, lug * 1.02, 'down')
  // Above: up from the twelve o'clock lug and away behind, narrowing, with its keeper.
  band(cy - r * 1.9, cy - r * 1.05, lug * 0.8, lug * 0.96, 'up')
  solid(p, ink, edgeW, STRAP)
  p.rect(0, X(cy - r * 1.42), X(lug * 0.98), X(r * 0.16), X(r * 0.04))

  // The lugs, top and bottom, where the strap meets the case.
  solid(p, ink, fine, STEEL)
  for (const s of [-1, 1]) p.rect(0, X(cy + s * r * 0.98), X(lug * 0.95), X(r * 0.3), X(r * 0.06))
  // The crown at three: knurled.
  solid(p, ink, fine, STEEL)
  p.rect(X(r * 1.1), X(cy), X(r * 0.3), X(r * 0.42), X(r * 0.06))
  // The case: steel, a polished bezel with a highlight.
  solid(p, ink, fine * 1.3, STEEL)
  p.circle(0, X(cy), X(2 * r))
  if (R > 6) bezelLight(alpha(p, STEEL_LIGHT, 0.9))
  // The dial: black.
  solid(p, ink, fine * 0.6, DIAL)
  p.circle(0, X(cy), X(2 * D))
  marks(LUME)
  hands(LUME, true)
  second(SILVER)
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
