import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, ball, definePiece, fly, over, rail, roll, wait, type Lane, type Pt } from '../../../parts'
import { arch, crystal, deck, gear, spark, TWO } from './visual'

type Paint = { color: string; gem: string }
const cells: Pt[] = [[0, 0], [1, 0]]
const straight = (pause = 0): Lane => ({
  segs: [roll([-0.5, 0], [0.25, 0]), ...(pause ? [wait([0.25, 0], pause)] : []), roll([0.25, 0], [1.5, 0])],
  fire: 0.75 / ROLL,
})

/** Each step remembers a hit; the echo runs back across the bridge after the ball has gone. */
export const echoBridge = definePiece<Paint>({
  name: 'echo-bridge', weight: 1.2,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: straight(), state: { color, gem: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    const xs = [-0.15, 0.28, 0.71, 1.14]
    xs.forEach((x, i) => {
      const hit = (x + 0.5) / ROLL
      const echo = hit + 0.65 + (3 - i) * 0.14
      const dip = t < hit ? 0 : 0.06 * Math.exp(-(t - hit) * 8) * Math.sin((t - hit) * 24)
      solid(p, ink, weight, t > echo && t < echo + 0.25 ? s.gem : s.color)
      p.rect(x * k, (FLOOR + dip) * k, 0.35 * k, 0.08 * k, 0.012 * k)
      spark(p, k, ink, weight, x, FLOOR - 0.12, t - echo, s.gem)
    })
  },
})

/** The crystal stores two sparks in the ball; later locks can read and spend them. */
export const crystalBattery = definePiece<Paint>({
  name: 'crystal-battery', weight: 1.1, dynamic: true,
  place: ({ color, theme, ball: arriving, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const gem = theme.colors.find((c) => c !== arriving.color) ?? color
    const lane = straight(0.28)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, gem }, changes: [{ at: lane.fire + 0.17, charge: 2, color: gem }] }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    arch(p, k, ink, weight, s.color, 0.25, -0.42)
    crystal(p, k, ink, weight, s.gem, 0.25, -0.07, 0.36, over(t, 0.26, 0.47))
    for (const x of [-0.16, 0.66]) spark(p, k, ink, weight, x, -0.02, t - 0.37 - (x > 0 ? 0.09 : 0), s.gem)
  },
})

/** Two decoys peel off the geode. The middle ball inherits the thread and its stored spark. */
export const splitGeode = definePiece<Paint & { next: string; old: string }>({
  name: 'split-geode', weight: 0.9, dynamic: true,
  place: ({ color, theme, ball: arriving, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const next = theme.colors.find((c) => c !== arriving.color) ?? color
    const lane = straight(0.36)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, gem: theme.colors[2], next, old: arriving.color }, changes: [{ at: lane.fire + 0.28, relay: true, color: next, charge: Math.min(3, (arriving.charge ?? 0) + 1) }] }
  },
  draw: (p, s, { k, t, ink, weight, spin }) => {
    deck(p, k, ink, weight, s.color)
    crystal(p, k, ink, weight, s.gem, 0.25, -0.07, 0.42, over(t, 0.23, 0.55))
    const split = t - 0.57
    if (split >= 0 && split < 0.9) {
      const f = easeOutCubic(clamp(split / 0.9))
      for (const sign of [-1, 1]) ball(p, k, ink, weight, s.old, (0.25 + f * 0.76) * k, sign * (0.08 + 0.36 * Math.sin(f * Math.PI)) * k, spin(0.25 + f * 0.76), 1 - f * 0.83)
    }
    spark(p, k, ink, weight, 0.25, 0, split, s.next)
  },
})

/** A lock checks the incoming charge. It opens at once with a spark, or lifts slowly by counterweight. */
export const stoneLock = definePiece<Paint & { powered: boolean }>({
  name: 'stone-lock', weight: 1.1, dynamic: true,
  place: ({ color, theme, ball: arriving, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const powered = (arriving.charge ?? 0) > 0
    const lane = straight(powered ? 0.16 : 0.58)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, gem: theme.colors[1], powered }, changes: powered ? [{ at: lane.fire + 0.1, charge: (arriving.charge ?? 1) - 1 }] : [] }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    arch(p, k, ink, weight, s.color, 0.4)
    const lift = easeInOutSine(over(t, s.powered ? 0.34 : 0.62, s.powered ? 0.49 : 0.95))
    solid(p, ink, weight, s.gem)
    p.rect(0.4 * k, (-0.19 - lift * 0.44) * k, 0.5 * k, 0.54 * k, 0.025 * k)
    gear(p, k, ink, weight, s.color, 0.93, -0.38, 0.14, lift * TWO)
    if (s.powered) spark(p, k, ink, weight, 0.4, -0.24, t - 0.38, s.gem)
  },
})

const riseCells: Pt[] = [[0, 0], [0, -1], [1, -1]]
const rise: Lane = { segs: [roll([-0.5, 0], [-0.13, 0]), wait([-0.13, 0], 0.22), fly([-0.13, 0], [0.85, -1], 0.78, 0.43), roll([0.85, -1], [1.5, -1])], fire: 0.37 / ROLL + 0.22 }
/** A cage of bats catches the ball and carries it to an upper ledge. */
export const batLift = definePiece<Paint>({
  name: 'bat-lift', weight: 0.9, flight: true,
  place: ({ color, theme, fits }) => fits(riseCells, [2, -1]) ? { cells: riseCells, exit: { at: [2, -1], dir: 1 }, lane: rise, state: { color, gem: theme.colors[2] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, -0.13)
    deck(p, k, ink, weight, s.color, 0.82, 1.5, -1)
    outline(p, ink, weight)
    p.line(-0.13 * k, FLOOR * k, -0.13 * k, -1.18 * k)
    const f = easeInOutSine(over(t, rise.fire, rise.fire + 0.78))
    gear(p, k, ink, weight, s.gem, -0.13, -1.15, 0.18, f * Math.PI)
    const x = -0.05 + f * 0.87
    const y = -0.05 - f - 0.2 * Math.sin(f * Math.PI)
    outline(p, ink, weight)
    for (const dx of [-0.14, 0.14]) {
      p.arc((x + dx) * k, (y - 0.12) * k, 0.27 * k, 0.15 * k, Math.PI, TWO)
      p.line(x * k, y * k, (x + dx) * k, (y - 0.1) * k)
    }
  },
})

const downCells: Pt[] = [[0, 0], [1, 0], [1, 1]]
const down: Lane = { segs: [roll([-0.5, 0], [-0.08, 0]), fly([-0.08, 0], [0.93, 1], 0.65, 0.18), roll([0.93, 1], [1.5, 1])], fire: 0.42 / ROLL }
/** A tilting shale shelf drops the ball through a gap and catches it below. */
export const shaleFall = definePiece<Paint>({
  name: 'shale-fall', weight: 0.9, flight: true,
  place: ({ color, theme, fits }) => fits(downCells, [2, 1]) ? { cells: downCells, exit: { at: [2, 1], dir: 1 }, lane: down, state: { color, gem: theme.colors[3] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, -0.08)
    deck(p, k, ink, weight, s.gem, 0.87, 1.5, 1)
    p.push()
    p.translate(-0.08 * k, FLOOR * k)
    p.rotate(0.7 * easeOutCubic(over(t, down.fire, down.fire + 0.28)))
    solid(p, ink, weight, s.color)
    p.rect(0.29 * k, 0, 0.6 * k, 0.12 * k, 0.012 * k)
    p.pop()
    outline(p, ink, weight)
    p.line(-0.08 * k, FLOOR * k, -0.08 * k, 0.46 * k)
    spark(p, k, ink, weight, 0.93, 1, t - down.fire - 0.65, s.gem)
  },
})

/** A bell keeps ringing after the ball has left; its three nested rings are a little delayed. */
export const echoBell = definePiece<Paint>({
  name: 'echo-bell', weight: 1,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: straight(0.16), state: { color, gem: theme.colors[4] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    arch(p, k, ink, weight, s.color, 0.25, -0.58)
    const swing = t < 0.29 ? 0 : Math.sin((t - 0.29) * 15) * Math.exp(-(t - 0.29) * 2.5) * 0.16
    p.push()
    p.translate(0.25 * k, -0.49 * k)
    p.rotate(swing)
    solid(p, ink, weight, s.gem)
    p.arc(0, 0.2 * k, 0.34 * k, 0.36 * k, Math.PI, TWO)
    p.line(-0.2 * k, 0.2 * k, 0.2 * k, 0.2 * k)
    p.circle(0, 0.27 * k, 0.08 * k)
    p.pop()
    for (let i = 0; i < 3; i++) {
      const tau = t - 0.29 - i * 0.18
      if (tau < 0 || tau > 0.5) continue
      outline(p, s.gem, weight * (1 - tau * 1.5))
      p.arc(0.25 * k, -0.29 * k, (0.5 + tau) * k, (0.5 + tau) * k, -0.9, 0.9)
    }
  },
})

export const cavernBeats = [echoBridge, crystalBattery, splitGeode, stoneLock, batLift, shaleFall, echoBell]
