import type p5 from 'p5'
import { rgba } from '../cast'
import { hash } from '../kit'

/**
 * A person in silhouette (the AWARDS builder's): head, neck and shoulders in one outline, never a disc on a block,
 * filled with whatever fill is set. `top` is the top of the head, `S` the size (1: a head 0.27 across), `bottom` where
 * the body is cut off. Laid side by side in one fill, a row of them is one mass. `style` gives the head its hair: bare,
 * a quiff, a bob, a bun, or a cap (a fashion crowd, not a 1940s one: no hats but the odd cap).
 */
export function person(p: p5, k: number, x: number, top: number, S: number, bottom: number, style = 0): void {
  const X = (v: number) => v * k
  const cy = top + 0.17 * S
  const rx = 0.135 * S
  const ry = 0.17 * S
  const ys = top + 0.37 * S
  p.beginShape()
  p.vertex(X(x - 0.34 * S), X(bottom))
  p.vertex(X(x - 0.34 * S), X(ys + 0.17 * S))
  p.bezierVertex(X(x - 0.335 * S), X(ys + 0.03 * S), X(x - 0.24 * S), X(ys - 0.01 * S), X(x - 0.11 * S), X(ys - 0.035 * S))
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (0.7 + (1.6 * i) / 14)
    p.vertex(X(x + rx * Math.cos(a)), X(cy + ry * Math.sin(a)))
  }
  p.vertex(X(x + 0.11 * S), X(ys - 0.035 * S))
  p.bezierVertex(X(x + 0.24 * S), X(ys - 0.01 * S), X(x + 0.335 * S), X(ys + 0.03 * S), X(x + 0.34 * S), X(ys + 0.17 * S))
  p.vertex(X(x + 0.34 * S), X(bottom))
  p.endShape(p.CLOSE)
  if (style === 1) {
    // A quiff, swept up and forward.
    p.push()
    p.translate(X(x + 0.035 * S), X(top + 0.03 * S))
    p.rotate(-0.35)
    p.ellipse(0, 0, X(0.19 * S), X(0.09 * S))
    p.pop()
  } else if (style === 2) {
    // A bob: the hair fuller than the head, cut at the jaw.
    p.ellipse(X(x), X(cy + 0.015 * S), X(0.33 * S), X(0.33 * S))
  } else if (style === 3) {
    // A bun at the back of the head.
    p.circle(X(x - 0.115 * S), X(top + 0.075 * S), X(0.1 * S))
  } else if (style === 4) {
    // A cap: its peak out over the brow.
    p.rect(X(x - 0.02 * S), X(top + 0.075 * S), X(0.23 * S), X(0.035 * S), X(0.015 * S))
  }
}

/** A head's hair, picked by index: mostly bare heads, some quiffs and bobs, a few buns, the odd cap. */
export const hairOf = (i: number, salt = 0): number => {
  const h = hash(i, 11, salt)
  return h < 0.48 ? 0 : h < 0.64 ? 1 : h < 0.8 ? 2 : h < 0.92 ? 3 : 4
}

/** Light caught along the top of a person's head and shoulders, only where light falls (`a` is how much). */
export function personRim(p: p5, k: number, x: number, top: number, S: number, color: string, a: number): void {
  if (a <= 0.03) return
  const X = (v: number) => v * k
  const cy = top + 0.17 * S
  const ys = top + 0.37 * S
  p.noFill()
  p.stroke(rgba(color, Math.min(1, a)))
  p.strokeWeight(Math.max(1, X(0.02 * S)))
  p.arc(X(x), X(cy), X(0.27 * S), X(0.34 * S), Math.PI * 1.2, Math.PI * 1.8)
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex(X(x + s * 0.3 * S), X(ys + 0.07 * S))
    p.bezierVertex(X(x + s * 0.27 * S), X(ys), X(x + s * 0.2 * S), X(ys - 0.012 * S), X(x + s * 0.13 * S), X(ys - 0.03 * S))
    p.endShape()
  }
}
