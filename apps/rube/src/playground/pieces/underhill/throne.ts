import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, ball, definePiece, fly, over, rail, roll, wait, type Lane, type Pt } from '../../../parts'
import { arch, crystal, deck, gear, spark, TWO } from './visual'

type Gold = { color: string; gold: string }
const cells: Pt[] = [[0, 0], [1, 0]]
const straight = (hold = 0): Lane => ({ segs: [roll([-0.5, 0], [0.25, 0]), ...(hold ? [wait([0.25, 0], hold)] : []), roll([0.25, 0], [1.5, 0])], fire: 0.75 / ROLL })

/** Each bead of the counter clicks over after the ball passes it. Its count remains visible. */
export const royalAbacus = definePiece<Gold>({
  name: 'royal-abacus', weight: 1.1,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: straight(), state: { color, gold: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    outline(p, ink, weight)
    for (const y of [-0.26, -0.48]) p.line(-0.24 * k, y * k, 1.19 * k, y * k)
    for (let i = 0; i < 5; i++) {
      const x = -0.1 + i * 0.28
      const counted = t > (x + 0.5) / ROLL
      solid(p, ink, weight, counted ? s.gold : s.color)
      p.circle((x + (counted ? 0.1 : 0)) * k, -0.26 * k, 0.15 * k)
      p.circle((x - (counted ? 0.06 : 0)) * k, -0.48 * k, 0.12 * k)
    }
    solid(p, ink, weight, s.gold)
    for (const x of [-0.3, 1.26]) p.rect(x * k, -0.37 * k, 0.07 * k, 0.39 * k)
  },
})

/** Three tumblers read the ball's charge. With enough charge they click at once; otherwise the ball waits as a crank turns them. */
export const combinationVault = definePiece<Gold & { charge: number }>({
  name: 'combination-vault', weight: 1.1, dynamic: true,
  place: ({ color, theme, ball, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const charge = ball.charge ?? 0
    const lane = straight(charge >= 2 ? 0.2 : 0.72)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, gold: theme.colors[1], charge }, changes: charge >= 2 ? [{ at: lane.fire + 0.18, charge: charge - 2 }] : [] }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    arch(p, k, ink, weight, s.gold, 0.42, -0.75)
    const start = s.charge >= 2 ? 0.3 : 0.7
    const open = easeInOutSine(over(t, start, start + 0.26))
    solid(p, ink, weight, s.gold)
    p.rect(0.42 * k, (-0.27 - 0.48 * open) * k, 0.6 * k, 0.67 * k, 0.03 * k)
    for (let i = 0; i < 3; i++) gear(p, k, ink, weight * 0.7, s.color, 0.04 + i * 0.36, -0.56, 0.1, TWO * over(t, start + i * 0.06, start + i * 0.06 + 0.18), 8)
    if (s.charge >= 2) spark(p, k, ink, weight, 0.42, -0.27, t - start, s.gold)
  },
})

/** A mirrored hall sends two visible copies down side corridors; they reunite after the arch. */
export const mirrorHall = definePiece<Gold & { next: string }>({
  name: 'mirror-hall', weight: 1, dynamic: true,
  place: ({ color, theme, ball: arriving, fits }) => {
    if (!fits(cells, [2, 0])) return null
    const next = theme.colors.find((c) => c !== arriving.color) ?? color
    const lane = straight(0.3)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, gold: theme.colors[1], next }, changes: [{ at: lane.fire + 0.23, relay: true, color: next, charge: Math.min(3, (arriving.charge ?? 0) + 1) }] }
  },
  draw: (p, s, { k, t, ink, weight, spin, color }) => {
    deck(p, k, ink, weight, s.color)
    for (const side of [-1, 1]) {
      solid(p, ink, weight, s.gold)
      p.beginShape()
      p.vertex(0.1 * k, side * 0.06 * k)
      p.vertex(0.95 * k, side * 0.37 * k)
      p.vertex(1.12 * k, side * 0.43 * k)
      p.vertex(0.25 * k, side * 0.13 * k)
      p.endShape(p.CLOSE)
      const f = clamp((t - 0.43) / 0.75)
      if (f > 0 && f < 1) ball(p, k, ink, weight, color, (0.25 + f * 0.82) * k, side * (0.1 + Math.sin(f * Math.PI) * 0.28) * k, spin(f), 0.85 * Math.sin(Math.PI * f))
    }
    crystal(p, k, ink, weight, s.next, 0.25, -0.3, 0.22, over(t, 0.4, 0.65))
  },
})

const upper: Pt[] = [[0, 0], [0, -1], [1, -1]]
const swingLane: Lane = { segs: [roll([-0.5, 0], [-0.08, 0]), wait([-0.08, 0], 0.2), fly([-0.08, 0], [0.93, -1], 0.8, 0.55), roll([0.93, -1], [1.5, -1])], fire: 0.42 / ROLL + 0.2 }
/** The ball swings on a chandelier's pendulum to the upper balcony. */
export const chandelier = definePiece<Gold>({
  name: 'chandelier', weight: 0.9, flight: true,
  place: ({ color, theme, fits }) => fits(upper, [2, -1]) ? { cells: upper, exit: { at: [2, -1], dir: 1 }, lane: swingLane, state: { color, gold: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, -0.08)
    deck(p, k, ink, weight, s.color, 0.91, 1.5, -1)
    const f = easeInOutSine(over(t, swingLane.fire, swingLane.fire + 0.8))
    const angle = -0.68 + f * 1.55
    p.push()
    p.translate(0.39 * k, -1.45 * k)
    p.rotate(angle)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.91 * k)
    solid(p, ink, weight, s.gold)
    p.arc(0, 0.9 * k, 0.62 * k, 0.28 * k, 0, Math.PI)
    for (const x of [-0.25, 0, 0.25]) p.circle(x * k, 0.89 * k, 0.08 * k)
    p.pop()
  },
})

const lower: Pt[] = [[0, 0], [1, 0], [1, 1]]
const trapLane: Lane = { segs: [roll([-0.5, 0], [0.02, 0]), wait([0.02, 0], 0.13), fly([0.02, 0], [0.96, 1], 0.56, 0.08), roll([0.96, 1], [1.5, 1])], fire: 0.52 / ROLL + 0.13 }
/** Two hinged leaves drop apart, then close after the ball lands beneath the throne. */
export const royalTrapdoor = definePiece<Gold>({
  name: 'royal-trapdoor', weight: 1, flight: true,
  place: ({ color, theme, fits }) => fits(lower, [2, 1]) ? { cells: lower, exit: { at: [2, 1], dir: 1 }, lane: trapLane, state: { color, gold: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.02)
    deck(p, k, ink, weight, s.color, 0.93, 1.5, 1)
    const open = easeOutCubic(over(t, trapLane.fire, trapLane.fire + 0.15)) * (1 - easeInOutSine(over(t, trapLane.fire + 0.72, trapLane.fire + 0.98)))
    for (const side of [-1, 1]) {
      p.push()
      p.translate((0.02 + side * 0.28) * k, FLOOR * k)
      p.rotate(side * open * 0.75)
      solid(p, ink, weight, s.gold)
      p.rect(0, 0, 0.55 * k, 0.1 * k, 0.01 * k)
      p.pop()
    }
    outline(p, ink, weight)
    p.line(-0.23 * k, 0.49 * k, -0.23 * k, 0.96 * k)
    p.line(0.48 * k, 0.49 * k, 0.48 * k, 0.96 * k)
    spark(p, k, ink, weight, 0.96, 1, t - trapLane.fire - 0.56, s.gold)
  },
})

const crownLane: Lane = { segs: [roll([-0.5, 0], [0.02, 0]), wait([0.02, 0], 0.24), fly([0.02, 0], [1.05, 0], 0.64, 0.78), roll([1.05, 0], [1.5, 0])], fire: 0.52 / ROLL + 0.24 }
/** A crown opens like a spring, throwing the ball across the throne room. */
export const crownSling = definePiece<Gold>({
  name: 'crown-sling', weight: 0.95, flight: true,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: crownLane, state: { color, gold: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    const throwOut = easeOutCubic(over(t, crownLane.fire, crownLane.fire + 0.19))
    solid(p, ink, weight, s.gold)
    p.beginShape()
    p.vertex(-0.23 * k, 0.18 * k)
    p.vertex(-0.22 * k, (-0.24 - throwOut * 0.18) * k)
    p.vertex(-0.06 * k, (-0.04 - throwOut * 0.18) * k)
    p.vertex(0.06 * k, (-0.36 - throwOut * 0.22) * k)
    p.vertex(0.17 * k, (-0.04 - throwOut * 0.18) * k)
    p.vertex(0.28 * k, (-0.24 - throwOut * 0.18) * k)
    p.vertex(0.28 * k, 0.18 * k)
    p.endShape(p.CLOSE)
    spark(p, k, ink, weight, 0.02, 0, t - crownLane.fire, s.gold)
  },
})

/** A gong answers the incoming ball with a delayed double strike. */
export const kingsGong = definePiece<Gold>({
  name: 'kings-gong', weight: 1,
  place: ({ color, theme, fits }) => fits(cells, [2, 0]) ? { cells, exit: { at: [2, 0], dir: 1 }, lane: straight(0.18), state: { color, gold: theme.colors[1] } } : null,
  draw: (p, s, { k, t, ink, weight }) => {
    deck(p, k, ink, weight, s.color)
    arch(p, k, ink, weight, s.color, 0.32, -0.62)
    solid(p, ink, weight, s.gold)
    p.circle(0.32 * k, -0.29 * k, 0.49 * k)
    p.fill(s.color)
    p.noStroke()
    p.circle(0.32 * k, -0.29 * k, 0.14 * k)
    const strike = over(t, 0.28, 0.38) * (1 - over(t, 0.52, 0.72))
    outline(p, ink, weight)
    p.line((0.93 - strike * 0.22) * k, 0.15 * k, (0.48 - strike * 0.04) * k, -0.25 * k)
    for (let i = 0; i < 2; i++) spark(p, k, ink, weight, 0.32, -0.29, t - 0.36 - i * 0.27, s.gold)
  },
})

export const throneBeats = [royalAbacus, combinationVault, mirrorHall, chandelier, royalTrapdoor, crownSling, kingsGong]
