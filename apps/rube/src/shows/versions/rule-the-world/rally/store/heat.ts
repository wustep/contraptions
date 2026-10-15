import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { at } from '../music'
import { ellipse, line, mix, rect, shape, type Pen } from '../pen'
import { CEIL, FLOOR } from './geo'

/**
 * The office's left wall, by the door: the radiator under the clock, coming up for the morning. The super has the
 * boiler going before six, and the steam comes up the riser in knocks, a knock on the bar's downbeat that jolts the
 * columns a hair. Murray's scarf, left over the riser last night, hangs over it, stirs in the warm air going up, and
 * lifts at each knock. No steam is seen: the hotel's radiator lost its puffs as idle motion, and so does this one. It gives no light: the door's light and the lamp's are
 * on it, and it is dark iron in the dark.
 */

const X0 = 23.48
const X1 = 24.48
const TOP = 0.52
const RISER = 24.68
const VENT: Pt = [X1 - 0.08, TOP - 0.06]
const IRON = '#3A362F'
const IRON_HI = '#5A5446'
const IRON_DARK = '#1E1B17'
const SCARF = '#5E2A22'
const SCARF_BAND = '#A88A5A'

/** The knocks: the downbeat of every bar from "Welcome" (14) to the seam. */
const KNOCKS = Array.from({ length: 11 }, (_, i) => at(14 + i, 1))

/** How hard the radiator has just knocked, 0 to 1, dying away. */
function knock(t: number): number {
  let k = 0
  for (const kt of KNOCKS) if (t >= kt && t < kt + 0.6) k = Math.max(k, Math.exp(-(t - kt) / 0.12))
  return k
}

export function drawRadiator(pen: Pen, t: number): void {
  // The riser up the wall to the ceiling, its valve, and the radiator's columns on their foot rail.
  rect(pen, RISER - 0.04, CEIL, RISER + 0.04, TOP + 0.25, IRON_DARK)
  rect(pen, RISER - 0.06, TOP + 0.12, RISER + 0.06, TOP + 0.3, IRON)
  ellipse(pen, [RISER, TOP + 0.08], 0.09, 0.025, IRON_HI)
  line(pen, [X1 - 0.04, TOP + 0.21], [RISER, TOP + 0.21], IRON_DARK, 1.2)
  const n = 10
  const w = (X1 - X0) / n
  // A knock jolts the columns a hair.
  const jolt = 0.006 * knock(t)
  for (let i = 0; i < n; i++) {
    const cx = X0 + (i + 0.5) * w
    shape(pen, [[cx - w * 0.42, FLOOR - 0.12], [cx - w * 0.42, TOP + 0.05 - jolt], [cx - w * 0.3, TOP - jolt], [cx + w * 0.3, TOP - jolt], [cx + w * 0.42, TOP + 0.05 - jolt], [cx + w * 0.42, FLOOR - 0.12]], IRON)
    rect(pen, cx - w * 0.36, TOP + 0.06, cx - w * 0.24, FLOOR - 0.16, IRON_HI)
  }
  rect(pen, X0 - 0.02, FLOOR - 0.14, X1 + 0.02, FLOOR - 0.08, IRON_DARK)
  for (const fx of [X0 + 0.05, X1 - 0.12]) rect(pen, fx, FLOOR - 0.08, fx + 0.07, FLOOR, IRON_DARK)
  // The vent on its end column, by the riser: a little brass bottle.
  rect(pen, VENT[0] - 0.025, VENT[1], VENT[0] + 0.025, TOP + 0.02, mix(IRON_HI, '#8A7040', 0.5))
  // Murray's gloves, left on top to dry.
  shape(pen, [[X0 + 0.25, TOP - 0.01], [X0 + 0.28, TOP - 0.06], [X0 + 0.52, TOP - 0.07], [X0 + 0.56, TOP - 0.01]], '#2A2018')
  shape(pen, [[X0 + 0.4, TOP - 0.06], [X0 + 0.44, TOP - 0.11], [X0 + 0.65, TOP - 0.1], [X0 + 0.67, TOP - 0.05]], '#33271D')
  drawScarf(pen, t)
}

/** The scarf over the riser: two ends hanging, stirring in the warm air off the radiator, lifting a little at a knock. */
function drawScarf(pen: Pen, t: number): void {
  const hook: Pt = [RISER, -0.55]
  const lift = 0.05 * knock(Math.max(0, t - 0.15))
  for (const [side, len, seed] of [[-1, 0.92, 1], [1, 0.7, 2]] as const) {
    const pts: Pt[] = []
    const n = 8
    for (let j = 0; j <= n; j++) {
      const u = j / n
      // The warm air pushes the free end out from the wall and up: more the lower it hangs, the nearer the radiator.
      const stir = (0.03 * sway(t, seed * 3.1, 2.3) + 0.02 * sway(t, seed * 5.3, 0.9)) * u * u - lift * u * u
      pts.push([hook[0] + side * (0.05 + 0.03 * u) + stir, hook[1] + len * u - lift * u * u * 0.6])
    }
    const left: Pt[] = pts.map(([x, y]): Pt => [x - 0.055, y])
    const right: Pt[] = pts.map(([x, y]): Pt => [x + 0.055, y]).reverse()
    shape(pen, [...left, ...right], SCARF)
    // Its bands near the end, and the fringe.
    const end = pts[n]
    const near = pts[n - 1]
    shape(pen, [[near[0] - 0.055, near[1] + 0.02], [near[0] + 0.055, near[1] + 0.02], [end[0] + 0.055, end[1] - 0.05], [end[0] - 0.055, end[1] - 0.05]], SCARF_BAND)
    for (let f = -2; f <= 2; f++) line(pen, [end[0] + f * 0.022, end[1]], [end[0] + f * 0.022 + 0.01 * sway(t, f + seed, 1.3), end[1] + 0.06], SCARF, 0.4)
  }
  ellipse(pen, hook, 0.06, 0.04, mix(SCARF, '#000000', 0.25))
}
