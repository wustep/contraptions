import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { CODA, CODA_CHORDS, FF, LAST1, LAST2, level, SILENCE } from './music'
import type { Pen } from './troll'
import { STONE } from './worlds'

/**
 * The canonical rock: how every part draws the inside of the mountain, so the tunnels, the hall and the levels
 * under it are one stone. The paper is solid rock (`STONE.deep`); a room is a hollow in it: its back wall a step
 * lighter (`STONE.dark`), its floors and ledges lighter again where the light reaches (`STONE.mid`, the lip
 * `STONE.light`). No outlines round a room's hollow (a cave has no ink edge); ink goes on the things in it.
 *
 * And the one shake: `quake(t)`, which every set applies (translate by it) so the whole mountain moves as one when
 * the trolls pound and when it comes down.
 */

/* ------------------------------------------------------------------ the shake */

/**
 * How far the mountain is shaken at show time `t`, in cells: [dx, dy]. Nothing through the soft statements; a
 * rumble growing with the loudness through the fortissimo (from `FF`); a jolt on each of the coda's chords, decaying
 * over half a second; stillness in the silence; the roll's shudder; the two last chords. Continuous: a pure
 * function of time. Multiply by how much your set should feel it (a hanging lantern more, a floor less).
 */
export function quake(t: number): Pt {
  let a = 0
  if (t > FF - 1) a += 0.012 * Math.max(0, Math.min(1, (t - FF + 1) / 3)) * level(t)
  if (t >= CODA - 0.02) {
    for (const c of CODA_CHORDS) {
      const d = t - c.t
      if (d >= 0 && d < 1.5) a += 0.07 * Math.min(1.4, c.g) * Math.exp(-d / 0.35)
    }
    if (t > SILENCE + 1.1 && t < LAST1) a += 0.02 * Math.max(0, Math.min(1, (t - SILENCE - 1.1) / 1.2))
    for (const c of [LAST1, LAST2]) {
      const d = t - c
      if (d >= 0 && d < 2.5) a += 0.1 * Math.exp(-d / 0.5)
    }
  }
  if (a <= 0) return [0, 0]
  return [a * (Math.sin(t * 61.3) + 0.5 * Math.sin(t * 97.1)), a * (Math.sin(t * 53.7 + 1) + 0.5 * Math.sin(t * 89.9 + 2))]
}

/* ------------------------------------------------------------------ the hollow */

/**
 * A room's hollow in the rock: the polygon `pts` (cells, closed) filled with the back wall's colour, `lit` 0..1 of
 * the way from unlit (a step above the paper, so the shape reads faintly in a wide shot) to lantern-lit.
 */
export function hollow(p: p5, c: Pen, pts: Pt[], lit: number): void {
  const k = c.k
  p.push()
  p.noStroke()
  p.fill(mixHex(mixHex(STONE.deep, STONE.dark, 0.45), STONE.dark, Math.max(0, Math.min(1, lit))))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/**
 * A floor, ledge or step: a slab from x0 to x1 whose top is at y (the ball rolls at y - R… i.e. a ball resting on
 * it has its centre at y - 0.13), `depth` cells thick, its top lip lit by `lit`.
 */
export function slab(p: p5, c: Pen, x0: number, x1: number, y: number, depth: number, lit: number, seed = 0): void {
  const k = c.k
  const face = mixHex(STONE.dark, STONE.mid, Math.max(0, Math.min(1, lit)))
  const lip = mixHex(STONE.mid, STONE.light, Math.max(0, Math.min(1, lit)))
  p.push()
  p.noStroke()
  p.fill(face)
  // The underside is ragged, the top is flat: a floor you can roll on.
  p.beginShape()
  p.vertex(x0 * k, y * k)
  p.vertex(x1 * k, y * k)
  const n = Math.max(2, Math.round((x1 - x0) * 1.5))
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const r = 0.5 + 0.5 * Math.sin(seed * 12.9 + i * 2.3) * Math.sin(seed * 3.1 + i * 1.7)
    p.vertex((x0 + (x1 - x0) * u) * k, (y + depth * (0.7 + 0.3 * r)) * k)
  }
  p.endShape(p.CLOSE)
  p.fill(lip)
  p.rectMode(p.CORNER)
  p.rect(x0 * k, y * k, (x1 - x0) * k, Math.max(1, 0.06 * k))
  p.pop()
}

/* ------------------------------------------------------------------ stalactites and drips */

/** A stalactite hanging from (x, y) on a ceiling, `len` long, `w` wide at the root: a tapering spike with a wet tip. */
export function stalactite(p: p5, c: Pen, x: number, y: number, len: number, w: number, lit: number, seed = 0): void {
  const k = c.k
  const body = mixHex(STONE.dark, STONE.mid, Math.max(0, Math.min(1, lit)))
  const bend = 0.06 * Math.sin(seed * 7.7) * len
  p.push()
  p.translate(x * k, y * k)
  p.noStroke()
  p.fill(body)
  p.beginShape()
  p.vertex((-w / 2) * k, 0)
  p.bezierVertex((-w * 0.45) * k, len * 0.35 * k, (-w * 0.12 + bend) * k, len * 0.75 * k, bend * k, len * k)
  p.bezierVertex((w * 0.12 + bend) * k, len * 0.75 * k, (w * 0.45) * k, len * 0.35 * k, (w / 2) * k, 0)
  p.endShape(p.CLOSE)
  // The wet tip catches the light.
  const tip = p.color(STONE.wet)
  tip.setAlpha(255 * (0.25 + 0.55 * lit))
  p.fill(tip)
  p.beginShape()
  p.vertex((bend - w * 0.09) * k, len * 0.8 * k)
  p.vertex(bend * k, len * k)
  p.vertex((bend + w * 0.09) * k, len * 0.8 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** A stalagmite rising from (x, y) on a floor. */
export function stalagmite(p: p5, c: Pen, x: number, y: number, len: number, w: number, lit: number, seed = 0): void {
  p.push()
  p.translate(x * c.k, y * c.k)
  p.scale(1, -1)
  stalactite(p, c, 0, 0, len, w, lit, seed)
  p.pop()
}

/**
 * A drop of water falling from a stalactite's tip at (x, y) to a floor `fall` cells below, landing at show time
 * `at`: it swells on the tip for the second before, falls (gravity 12), and splashes. Small and pointed, never a
 * bead: a drop is a fraction of Peer's size. Draw it for any `t`; it is nothing outside that window.
 */
export function drip(p: p5, c: Pen, x: number, y: number, fall: number, at: number, t: number): void {
  const k = c.k
  const T = Math.sqrt((2 * fall) / 12)
  const d = t - (at - T)
  const col = p.color(STONE.wet)
  p.push()
  p.noStroke()
  if (d < 0 && d > -1.2) {
    const s = 1 + d / 1.2
    col.setAlpha(200 * s)
    p.fill(col)
    p.ellipse(x * k, (y + 0.02 * s) * k, 0.035 * k * s, 0.05 * k * s)
  } else if (d >= 0 && d < T) {
    const yy = y + 0.5 * 12 * d * d
    col.setAlpha(220)
    p.fill(col)
    p.ellipse(x * k, yy * k, 0.03 * k, 0.07 * k)
  } else if (d >= T && d < T + 0.35) {
    // The splash: two tiny flecks thrown up and out, and gone.
    const u = (d - T) / 0.35
    col.setAlpha(200 * (1 - u))
    p.fill(col)
    for (const s of [-1, 1]) p.ellipse((x + s * 0.12 * u) * k, (y + fall - 0.1 * Math.sin(u * Math.PI)) * k, 0.025 * k, 0.025 * k)
  }
  p.pop()
}
