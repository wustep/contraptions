import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { hash } from '../kit'
import { at } from '../music'
import { ctxOf, ellipse, line, mix, rect, rgba, shape, type Pen } from '../pen'
import { CEIL, FLOOR } from './geo'

/**
 * The office's left wall, by the door: the radiator under the clock, coming up for the morning. The super has the
 * boiler going before six, and the steam comes up the riser in knocks, a knock on the bar's downbeat; at each one the
 * air vent on its end column spits a little steam, which goes up the wall and away. Murray's scarf, left over the riser
 * last night, hangs over it and stirs in the warm air going up. It gives no light: the door's light and the lamp's are
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
const STEAM = '#C8C2B4'
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
  drawSteam(pen, t)
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

/** The vent's spit of steam at each knock, going up the wall and thinning. */
function drawSteam(pen: Pen, t: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const STEPS = 4
  const buckets: number[][] = Array.from({ length: STEPS }, () => [])
  for (const kt of KNOCKS) {
    const s = t - kt
    if (s < 0 || s > 2.2) continue
    for (let i = 0; i < 14; i++) {
      // Each wisp leaves the vent in the first moment, then rises and spreads on the warm air.
      const born = 0.25 * hash(i, kt | 0, 41)
      const u = (s - born) / 1.9
      if (u <= 0 || u >= 1) continue
      const x = VENT[0] + 0.03 + 0.18 * u + (hash(i, kt | 0, 42) - 0.5) * 0.22 * u + 0.04 * Math.sin(u * 6 + i)
      const y = VENT[1] - 0.06 - 1.1 * u * (0.7 + 0.5 * hash(i, kt | 0, 43))
      const a = Math.min(1, u * 8) * (1 - u) ** 1.3
      const r = 0.035 + 0.12 * u
      buckets[Math.min(STEPS - 1, Math.floor(a * STEPS))].push(x * k, y * k, r * k)
    }
  }
  ctx.save()
  for (let b = 0; b < STEPS; b++) {
    const list = buckets[b]
    if (!list.length) continue
    ctx.fillStyle = rgba(pen, STEAM, 0.3 * ((b + 0.6) / STEPS))
    ctx.beginPath()
    for (let i = 0; i < list.length; i += 3) {
      ctx.moveTo(list[i] + list[i + 2], list[i + 1])
      ctx.arc(list[i], list[i + 1], list[i + 2], 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.restore()
}
