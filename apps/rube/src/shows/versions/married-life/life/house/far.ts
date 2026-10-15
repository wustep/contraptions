import type p5 from 'p5'
import { hash } from '../kit'

/**
 * A far side along a horizon: neighbours' roofs among their trees, soft and unlined like the church's far trees, so a
 * set stands in a town and not on a stage. The street's (`front.ts`) and the yard's behind the house cut open
 * (`inside.ts`) are two rows of it, each its own run of lots.
 */
export interface Lot {
  x: number
  w: number
  h: number
  roof: number
  tree: boolean
  chimney: number
  /** The row's scale, for its trim. */
  s: number
}

/** A row of lots from `from` to `to` (in lots, `step` cells apart), each `scale` of the street's; `seed` picks the row. */
export function farRow(from: number, to: number, step = 0.85, scale = 1, seed = 0): Lot[] {
  const out: Lot[] = []
  for (let i = from; i <= to; i++) {
    const x = i * step + hash(i, 81, seed) * 0.4 * scale
    // A neighbour's house now and then, and here and there an old tree standing over the rest.
    const house = hash(i, 82, seed) < 0.36 && i % 2 === 0
    const tall = !house && hash(i, 80, seed) < 0.2
    out.push({
      x,
      w: scale * (house ? 1.7 + hash(i, 83, seed) * 0.9 : tall ? 1.0 + hash(i, 84, seed) * 0.35 : 1.0 + hash(i, 84, seed) * 0.7),
      h: scale * (house ? 1.05 + hash(i, 85, seed) * 0.6 : tall ? 2.1 + hash(i, 86, seed) * 0.9 : 0.8 + hash(i, 86, seed) * 0.8),
      roof: scale * (0.55 + hash(i, 87, seed) * 0.35),
      tree: !house,
      chimney: hash(i, 88, seed) < 0.5 ? scale * (0.25 + hash(i, 89, seed) * 0.4) : -1,
      s: scale,
    })
  }
  // Trees first, so each house stands whole in front of them (behind a tall tree a house was a chimney poking up
  // beside it, a stray post in a close).
  return out.sort((a, b) => Number(b.tree) - Number(a.tree))
}

/**
 * The row on the horizon `G`, as much of it as lies between `x0` and `x1`: the hedges and gardens they stand in, one
 * low band under all of them so no sky shows between their feet; the trees; the houses, gabled end-on, with a
 * chimney, and their windows and door in `pane`.
 */
export function drawFar(p: p5, k: number, row: Lot[], G: number, x0: number, x1: number, tree: string, house: string, pane: string, band = 0.32): void {
  p.noStroke()
  p.fill(tree)
  p.rect((x0 - 1) * k, (G - band) * k, (x1 - x0 + 2) * k, (band + 0.02) * k)
  for (const b of row) {
    if (b.x + b.w < x0 - 1 || b.x - b.w > x1 + 1) continue
    if (b.tree) {
      p.fill(tree)
      p.ellipse(b.x * k, (G - b.h * 0.42) * k, b.w * k, b.h * k)
      p.ellipse((b.x + b.w * 0.28) * k, (G - b.h * 0.3) * k, b.w * 0.7 * k, b.h * 0.7 * k)
    } else {
      const l = b.x - b.w / 2
      const r = b.x + b.w / 2
      const eave = G - b.h
      const ridge = eave - b.roof
      const s = b.s
      p.fill(house)
      p.rect(l * k, eave * k, b.w * k, (G - eave) * k)
      p.triangle((l - 0.12 * s) * k, (eave + 0.02 * s) * k, b.x * k, ridge * k, (r + 0.12 * s) * k, (eave + 0.02 * s) * k)
      if (b.chimney > 0) p.rect((b.x + b.w * 0.18) * k, (ridge + b.roof * 0.25 - b.chimney) * k, 0.18 * s * k, (b.chimney + b.roof * 0.4) * k)
      // Its windows and door, faint in the haze (a close sees a neighbour's wall, not a grey slab).
      p.fill(pane)
      const ww = Math.min(0.32 * s, b.w * 0.17)
      for (const u of [-0.27, 0.27]) p.rect((b.x + u * b.w - ww / 2) * k, (eave + b.h * 0.22) * k, ww * k, b.h * 0.26 * k)
      p.rect((b.x - 0.12 * s) * k, (G - b.h * 0.42) * k, 0.24 * s * k, b.h * 0.42 * k)
    }
  }
}
