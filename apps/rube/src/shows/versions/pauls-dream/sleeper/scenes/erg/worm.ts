import { drawPour, drawSlump, drawWorm } from '../../craft/worm'
import { blob, fill, rgba, smooth, type Paint, type Pt } from '../../paint'
import { G } from '../../path'
import { T, WORM, curve } from './geo'

/**
 * The first worm, as it moves (the drawing is the show's one sandworm, `craft/worm.ts`). It comes up out of the sand
 * east of the harvester like a tower, shut, sand pouring off it; it stands far over everything as its petals peel open;
 * it bends over in one arch and comes down on the harvester mouth first, its maw wider than the harvester is long, and
 * the rest of it follows its head down into the sand the way a train follows its rails.
 *
 * The rails: from under the sand at the worm's base straight up (swaying a little while it stands), a half circle over to
 * the west, and straight down through the harvester into the sand. The body is the `LENGTH` cells of rail behind the
 * head; nothing under the sand is drawn.
 */

const UP = 56
const R_ARC = (WORM.base - WORM.plunge) / 2
const ARC = Math.PI * R_ARC
const TOP = 3 - UP
const LENGTH = 160
/** The maw's rim, wide open: its mouth wider than the harvester is long. */
const MAW = 17.5

/** Its radius `back` cells behind the head: a little narrower at the head, thicker where it leaves the sand. */
const radius = (back: number): number => 9.6 + 3.0 * smooth(back, 2, 52) - 5 * smooth(back, LENGTH - 16, LENGTH)

/** The radius where it comes out of the sand: for its shadow and the slump round its foot. */
export const RADIUS = radius(UP)

/** How far its standing column sways east (+) or west at the top: nothing by the time the arch begins. */
function sway(t: number): number {
  const up = smooth(t, T.rise, T.rise + 1.6) * (1 - smooth(t, 178.2, T.arch))
  return up * (2.0 * Math.sin((2 * Math.PI * (t - T.rise)) / 4.6 + 0.6) + 1.6 * smooth(t, 177.2, 178.6))
}

/** Where the rail is at length `s` from its start under the sand at `t`, and which way it runs there. */
export function rail(s: number, t = 0): { p: Pt; d: Pt } {
  if (s <= UP) {
    const a = sway(t)
    const u = s / UP
    const dx = (2 * a * u) / UP
    const l = Math.hypot(dx, 1)
    return { p: [WORM.base + a * u * u, 3 - s], d: [dx / l, -1 / l] }
  }
  if (s <= UP + ARC) {
    const a = (s - UP) / R_ARC
    return { p: [WORM.plunge + R_ARC + R_ARC * Math.cos(a), TOP - R_ARC * Math.sin(a)], d: [-Math.sin(a), -Math.cos(a)] }
  }
  return { p: [WORM.plunge, TOP + (s - UP - ARC)], d: [0, 1] }
}
const S_OUT = 3
const S_IN = UP + ARC - TOP

/** How far along its rail the head is. */
const head = curve([
  [T.rise - 0.4, 0], [T.rise, S_OUT], [172.2, 40], [173.6, 50], [176.0, 53.5], [T.arch, 55], [T.over, UP + ARC * 0.33], [T.down, UP + ARC],
  [185.6, UP + ARC + 28], [T.swallow, S_IN - 0.4], [188.6, S_IN + 22], [191.6, S_IN + LENGTH + 4],
])

/** How far open the maw is: its petals peel back as it stands, and it goes down open over what it takes. */
const openAt = (t: number): number => smooth(t, 171.4, 175.2)

/** Whether any of it is out of the sand at `t`. */
export const out = (t: number): boolean => head(t) > S_OUT && head(t) - LENGTH < S_IN

/** How high its top stands at `t` (cells over the sand; 0 when none of it is up). */
export function height(t: number): number {
  const s = head(t)
  if (s <= S_OUT) return 0
  if (s <= UP) return s - S_OUT + MAW * 0.4 * openAt(t)
  return UP - S_OUT + R_ARC + RADIUS
}

/** Where the middle of its maw is at `t`. */
export function maw(t: number): Pt {
  return rail(head(t), t).p
}

/** Toward the sun (up and east). */
const SUN: Pt = [0.78, -0.62]

/** The worm at `t`, and the sand it pours, over the sand at y = 0. */
export function drawErgWorm(g: Paint, t: number, sand: string, shade: string): void {
  // The slump round its foot while it stands, behind it.
  const stand = smooth(t, T.rise, T.rise + 1.0) * (1 - smooth(t, T.over, T.down))
  drawSlump(g, [WORM.base, 0.2], RADIUS, stand, sand, shade)
  if (!out(t)) return
  const s1 = head(t)
  const lo = Math.max(S_OUT - 2, s1 - LENGTH)
  const hi = Math.min(s1, S_IN + 2)
  if (hi <= lo) return
  const spine: Pt[] = []
  const n = Math.max(8, Math.ceil((hi - lo) / 1.0))
  for (let i = 0; i <= n; i++) spine.push(rail(lo + ((hi - lo) * i) / n, t).p)
  const d = rail(hi, t).d
  // Raised over them it is seen a little from below its open side; side on (the arch), three-quarter; coming down, its
  // rim is seen nearly edge on, a bell going down over the harvester.
  const facing = d[1] < -0.5 ? 0.42 : 0.14 + 0.4 * Math.abs(d[0])
  const worm = {
    spine,
    radius: (back: number) => radius(back + (s1 - hi)),
    mouth: s1 <= S_IN + 1 ? { open: openAt(t), facing, size: MAW } : undefined,
    sun: SUN,
    ground: 0.4,
    phase: s1 - hi,
  }
  drawWorm(g, worm)
  // Sand pouring off it as it comes up and stands, thinning as it settles.
  const pour = smooth(t, T.rise, T.rise + 0.4) * (1 - 0.6 * smooth(t, 173.5, 176)) * (1 - smooth(t, 178.5, T.arch))
  drawPour(g, worm, pour, t, [[0.62, 1], [0.8, -1], [0.92, 1]], sand, 0)
}

/** Sand thrown up where it breaks the surface and where it goes back in: great flat sheets that rise and fall. */
interface Sheet {
  at: number
  x: number
  /** Which way it is thrown (radians from straight up, + east), how fast, and how wide its foot. */
  lean: number
  v: number
  foot: number
}
const SHEETS: Sheet[] = [
  { at: T.rise - 0.05, x: WORM.base - 14, lean: -0.42, v: 26, foot: 11 },
  { at: T.rise, x: WORM.base + 14, lean: 0.4, v: 27, foot: 11.5 },
  { at: T.rise + 0.2, x: WORM.base - 19, lean: -0.75, v: 18, foot: 8 },
  { at: T.rise + 0.3, x: WORM.base + 19, lean: 0.8, v: 17, foot: 8 },
  { at: 186.6, x: WORM.plunge - 17, lean: -0.55, v: 24, foot: 12 },
  { at: T.swallow, x: WORM.plunge + 17, lean: 0.5, v: 26, foot: 12 },
  { at: T.swallow + 0.3, x: WORM.plunge - 22, lean: -0.9, v: 17, foot: 9 },
  { at: T.swallow + 0.5, x: WORM.plunge + 22, lean: 0.85, v: 17, foot: 9 },
]

export function drawSheets(g: Paint, t: number, sand: string): void {
  const ctx = g.ctx
  for (const sh of SHEETS) {
    const s = t - sh.at
    const life = (2 * sh.v * Math.cos(sh.lean)) / G + 1.2
    if (s <= 0 || s > life) continue
    // Its crest goes up and out along a throw, under the show's gravity, and its sand thins as it falls.
    const vx = sh.v * Math.sin(sh.lean)
    const vy = -sh.v * Math.cos(sh.lean)
    const cx = sh.x + vx * s
    const cy = Math.min(0, vy * s + 0.5 * G * s * s)
    const a = 0.55 * smooth(s, 0, 0.15) * (1 - smooth(s, life * 0.45, life))
    if (a <= 0.003) continue
    const half = sh.foot * (0.5 + 0.5 * smooth(s, 0, 0.6))
    blob(ctx, [
      [sh.x - half, 0.4],
      [sh.x - half * 0.55 + (cx - sh.x) * 0.35, cy * 0.45],
      [cx - half * 0.25, cy],
      [cx + half * 0.25, cy - 0.6],
      [sh.x + half * 0.55 + (cx - sh.x) * 0.35, cy * 0.5],
      [sh.x + half, 0.4],
    ])
    fill(ctx, rgba(sand, a))
  }
}

/** How much sand is heaped round the worm's base while it stands, and how deep the hole it goes down into. */
export function heap(t: number, x: number): number {
  const up = smooth(t, T.rise, T.rise + 0.8) * (1 - smooth(t, T.over, 183.5))
  const atBase = up * 2.4 * Math.exp(-(((x - WORM.base) / 18) ** 2))
  const sink = smooth(t, 186.4, 189.0) * (1 - 0.7 * smooth(t, 190, 197))
  const hole = sink * 3.4 * Math.exp(-(((x - WORM.plunge) / 18) ** 2))
  return -atBase + hole
}

/** How far the harvester has gone down: nothing until the maw's rim is down round it on the sand, then down with it. */
export function swallowed(t: number): number {
  if (head(t) < UP + ARC) return 0
  return Math.max(0, maw(t)[1])
}
