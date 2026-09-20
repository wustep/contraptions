import type p5 from 'p5'
import type { Theme } from '../../../../../../src/core/themes'
import { brass, ivory } from './hall'

/**
 * What the first batch of the hall's pieces share: which colour a part is
 * when the map's own would be the ball's, and a metal rod drawn as a thing
 * with two edges rather than as a line.
 */

/** `want`, unless the ball or a neighbouring part already has it; then the first of the palette that neither has. */
export function partColor(theme: Theme, want: string, ...taken: string[]): string {
  if (!taken.includes(want)) return want
  return theme.colors.find((c) => !taken.includes(c)) ?? want
}

/** Brass for a part, but never the ball's colour nor a neighbour's. */
export const brassFor = (theme: Theme, ...taken: string[]): string => partColor(theme, brass(theme), ...taken)

/** Ivory for a part, but never the ball's colour nor a neighbour's. */
export const ivoryFor = (theme: Theme, ...taken: string[]): string => partColor(theme, ivory(theme), ...taken)

/** A rod through `pts`: the colour inside two ink edges, `w` cells thick. Open, its ends round. */
export function rod(p: p5, k: number, ink: string, weight: number, color: string, pts: [number, number][], w: number): void {
  const path = () => {
    p.noFill()
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
  }
  p.stroke(ink)
  p.strokeWeight(w * k + weight * 2)
  path()
  p.stroke(color)
  p.strokeWeight(w * k)
  path()
}
