import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../src/core/ease'
import { ROLL, definePiece, fly, over, rail, roll, wait, type Lane, type Pt } from '../../../parts'
import { arch, deck, gear, spark, TWO } from './visual'

type Metal = { color: string; hot: string }
const cells: Pt[] = [[0, 0], [1, 0]]
const path = (pause = 0): Lane => ({ segs: [roll([-0.5, 0], [0.2, 0]), ...(pause ? [wait([0.2, 0], pause)] : []), roll([0.2, 0], [1.5, 0])], fire: 0.7 / ROLL })

/** Two lever strokes pump three units of pressure into the ball. */
export const pressurePump = definePiece<Metal>({
  name: 'pressure-pump', weight: 1.1, dynamic: true,
  place: ({ color, theme, ball, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const hot = theme.colors.find((c) => c !== ball.color) ?? color
    const lane = path(0.42)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, hot }, changes: [{ at: lane.fire + 0.35, charge: 3, color: hot }] }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    solid(p, ink, weight, s.hot)
    p.rect(0.2 * k, -0.24 * k, 0.68 * k, 0.43 * k, 0.07 * k)
    const stroke = Math.sin(over(t, 0.28, 0.7) * Math.PI * 2) * 0.11
    outline(p, ink, weight)
    p.line(0.2 * k, (-0.25 + stroke) * k, 0.2 * k, -0.7 * k)
    p.line(-0.13 * k, -0.7 * k, 0.53 * k, -0.7 * k)
    gear(p, k, ink, weight, s.color, 0.7, -0.31, 0.17, over(t, 0.28, 0.7) * TWO)
    for (let i = 0; i < 3; i++) spark(p, k, ink, weight, 0.72 + i * 0.13, -0.12, t - 0.43 - i * 0.09, s.hot)
  },
})

/** The charged ball opens the high pipe. An empty ball takes the low bypass. Both rejoin the rail. */
export const selectorValve = definePiece<Metal & { high: boolean }>({
  name: 'selector-valve', weight: 1.15, dynamic: true,
  place: ({ color, theme, ball, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const high = (ball.charge ?? 0) > 0
    const bend: Pt = [0.66, high ? -0.35 : 0.3]
    const lane: Lane = { segs: [roll([-0.5, 0], [0.1, 0]), roll([0.1, 0], bend, 1.9), roll(bend, [1.18, 0], 1.9), roll([1.18, 0], [1.5, 0])], fire: 0.6 / ROLL }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, hot: theme.colors[1], high }, changes: high ? [{ at: lane.fire + 0.22, charge: (ball.charge ?? 1) - 1 }] : [] }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    outline(p, ink, weight * 2)
    p.line(0.1 * k, 0, 0.66 * k, -0.35 * k)
    p.line(0.66 * k, -0.35 * k, 1.18 * k, 0)
    p.line(0.1 * k, 0, 0.66 * k, 0.3 * k)
    p.line(0.66 * k, 0.3 * k, 1.18 * k, 0)
    solid(p, ink, weight, s.hot)
    p.circle(0.1 * k, 0, 0.25 * k)
    p.push()
    p.translate(0.1 * k, 0)
    p.rotate((s.high ? -0.4 : 0.35) * easeOutCubic(over(t, 0.22, 0.45)))
    p.rect(0.19 * k, 0, 0.4 * k, 0.07 * k, 0.02 * k)
    p.pop()
    spark(p, k, ink, weight, 0.66, s.high ? -0.35 : 0.3, t - 0.56, s.hot)
  },
})

/** Three pistons remember their separate blows; their crankshaft turns only after the last. */
export const pistonBank = definePiece<Metal>({
  name: 'piston-bank', weight: 1.1,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: path(0.25), state: { color, hot: theme.colors[3] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    outline(p, ink, weight)
    p.line(-0.17 * k, -0.57 * k, 1.19 * k, -0.57 * k)
    for (let i = 0; i < 3; i++) {
      const x = -0.05 + i * 0.47
      const hit = 0.22 + i * 0.2
      const down = t < hit ? 0 : Math.sin(Math.PI * over(t, hit, hit + 0.25)) * 0.28
      solid(p, ink, weight, s.hot)
      p.rect(x * k, (-0.38 + down) * k, 0.23 * k, 0.2 * k, 0.02 * k)
      outline(p, ink, weight)
      p.line(x * k, -0.57 * k, x * k, (-0.48 + down) * k)
      spark(p, k, ink, weight, x, -0.14, t - hit, s.hot)
    }
    gear(p, k, ink, weight, s.color, 1.26, -0.56, 0.18, over(t, 0.63, 1.02) * TWO)
  },
})

const upper: Pt[] = [[0, 0], [0, -1], [1, -1]]
const wheelLane: Lane = { segs: [roll([-0.5, 0], [-0.07, 0]), wait([-0.07, 0], 0.18), fly([-0.07, 0], [0.92, -1], 0.85, 0.23), roll([0.92, -1], [1.5, -1])], fire: 0.43 / ROLL + 0.18 }
/** A toothed wheel catches the ball in a pocket and rolls it up one floor. */
export const flywheel = definePiece<Metal>({
  name: 'boiler-flywheel', weight: 0.9, flight: true,
  place: ({ color, theme, fits }) => fits(upper, [2, -1]) ? { cells: upper, exit: { at: [2, -1], dir: 1 }, lane: wheelLane, state: { color, hot: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, -0.07)
    deck(p, k, ink, weight, s.color, 0.91, 1.5, -1)
    const turn = easeInOutSine(over(t, wheelLane.fire, wheelLane.fire + 0.85))
    gear(p, k, ink, weight, s.hot, 0.2, -0.48, 0.47, turn * Math.PI * 1.5, 12)
    outline(p, ink, weight)
    p.line(0.2 * k, -0.48 * k, 0.2 * k, 0.48 * k)
    p.line(0.2 * k, -0.48 * k, 0.92 * k, -1 * k)
  },
})

const jetLane: Lane = { segs: [roll([-0.5, 0], [0.08, 0]), wait([0.08, 0], 0.19), fly([0.08, 0], [1.06, -1], 0.61, 0.72), roll([1.06, -1], [1.5, -1])], fire: 0.58 / ROLL + 0.19 }
/** The ball plugs a steam jet, then the stored pressure kicks it onto a catwalk. */
export const steamJet = definePiece<Metal & { strong: boolean }>({
  name: 'steam-jet', weight: 0.95, flight: true, dynamic: true,
  place: ({ color, theme, ball, fits }) => {
    if (!fits(upper, [2, -1])) return null
    const strong = (ball.charge ?? 0) > 0
    return { cells: upper, exit: { at: [2, -1], dir: 1 }, lane: jetLane, state: { color, hot: theme.colors[4], strong }, changes: strong ? [{ at: jetLane.fire, charge: (ball.charge ?? 1) - 1 }] : [] }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.08)
    deck(p, k, ink, weight, s.color, 1.03, 1.5, -1)
    solid(p, ink, weight, s.hot)
    p.rect(0.08 * k, 0.29 * k, 0.25 * k, 0.4 * k, 0.04 * k)
    const blast = over(t, jetLane.fire, jetLane.fire + 0.18) * (1 - over(t, jetLane.fire + 0.39, jetLane.fire + 0.73))
    outline(p, ink, weight * (s.strong ? 1.4 : 0.8))
    for (let i = 0; i < 5; i++) {
      const x = 0.08 + (i - 2) * 0.06
      p.line(x * k, 0.05 * k, (x + (i - 2) * 0.04 * blast) * k, (-0.2 - 0.57 * blast) * k)
    }
    spark(p, k, ink, weight, 0.08, 0, t - jetLane.fire, s.hot)
  },
})

const lower: Pt[] = [[0, 0], [1, 0], [1, 1]]
const dumpLane: Lane = { segs: [roll([-0.5, 0], [0.03, 0]), wait([0.03, 0], 0.17), fly([0.03, 0], [1.01, 1], 0.59, 0.12), roll([1.01, 1], [1.5, 1])], fire: 0.53 / ROLL + 0.17 }
/** A safety valve releases pressure through a lower chute. */
export const reliefValve = definePiece<Metal & { pressure: number }>({
  name: 'relief-valve', weight: 0.9, flight: true, dynamic: true,
  place: ({ color, theme, ball, fits }) => fits(lower, [2, 1]) ? { cells: lower, exit: { at: [2, 1], dir: 1 }, lane: dumpLane, state: { color, hot: theme.colors[2], pressure: ball.charge ?? 0 }, changes: [{ at: dumpLane.fire, charge: 0 }] } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.03)
    deck(p, k, ink, weight, s.color, 1, 1.5, 1)
    arch(p, k, ink, weight, s.hot, 0.03, -0.33)
    const open = easeOutCubic(over(t, dumpLane.fire, dumpLane.fire + 0.17))
    solid(p, ink, weight, s.hot)
    p.rect((0.32 + open * 0.31) * k, 0.2 * k, 0.45 * k, 0.11 * k, 0.02 * k)
    gear(p, k, ink, weight, s.color, 0.71, 0.39, 0.15, open * TWO)
    for (let i = 0; i < Math.min(3, s.pressure + 1); i++) spark(p, k, ink, weight, 0.2 + i * 0.18, 0.5, t - dumpLane.fire - i * 0.12, s.hot)
  },
})

/** A heated belt carries the ball past three windows; the last is bright after it passes. */
export const furnaceBelt = definePiece<Metal>({
  name: 'furnace-belt', weight: 1,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: path(), state: { color, hot: theme.colors[2] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    solid(p, ink, weight, s.hot)
    p.rect(0.48 * k, 0.35 * k, 1.75 * k, 0.21 * k, 0.04 * k)
    for (let i = 0; i < 3; i++) {
      const x = -0.14 + i * 0.59
      const lit = clamp((t - (x + 0.5) / ROLL) * 5)
      solid(p, ink, weight * 0.7, lit ? s.hot : s.color)
      p.rect(x * k, 0.35 * k, 0.4 * k, 0.13 * k, 0.02 * k)
      outline(p, ink, weight * 0.8)
      p.line(x * k, 0.12 * k, x * k, 0.25 * k)
    }
    gear(p, k, ink, weight, s.color, 1.23, 0.35, 0.15, t > 0 ? t * 2 : 0)
  },
})

export const boilerBeats = [pressurePump, selectorValve, pistonBank, flywheel, steamJet, reliefValve, furnaceBelt]
