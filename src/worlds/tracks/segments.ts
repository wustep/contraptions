import type p5 from 'p5'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import type { Contraption } from '../../core/types'
import { BY, D, FLOOR } from '../lanes'

/**
 * Track cells. Each draws only the surface the ball runs on — the ball itself
 * is drawn by the world's overlay, so the track never has to agree with itself
 * about where a ball is. Canonical orientations run west to east and north to
 * south; the composer mirrors an instance to get the other hand.
 */

export interface SegState {
  color: string
  /** Which surface this flat carries. */
  variant: 'rail' | 'conveyor' | 'gate'
}

/** Ball-centre radius of the landing's quarter turn. */
export const LAND_R = BY

const floorLine = (p: p5, k: number, x1: number, x2: number, y = FLOOR) =>
  p.line(x1 * k, y * k, x2 * k, y * k)

/** A flat run, west to east: a rail, a belt, or a flap the ball pushes through. */
export const flat: Contraption<SegState> = {
  name: 'track-flat',
  label: 'Run',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    outline(p, ink, weight)
    if (s.variant === 'conveyor') {
      const r = 0.08
      floorLine(p, k, -0.3, 0.3)
      floorLine(p, k, -0.3, 0.3, FLOOR + r * 2)
      for (const x of [-0.3, 0.3]) {
        p.push()
        p.translate(x * k, (FLOOR + r) * k)
        p.rotate(u * Math.PI * 2 * 9)
        outline(p, ink, weight)
        p.circle(0, 0, r * 2 * k)
        p.line(-r * k, 0, r * k, 0)
        p.line(0, -r * k, 0, r * k)
        p.pop()
      }
      floorLine(p, k, -0.5, -0.3)
      floorLine(p, k, 0.3, 0.5)
      return
    }
    floorLine(p, k, -0.5, 0.5)
    p.line(0, FLOOR * k, 0, 0.5 * k)
    if (s.variant === 'gate') {
      // A flap hinged above the floor; the ball shoulders it open on the way
      // through and it swings shut behind. u is local to the ball's passing.
      const open = easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.1, 0.24))
      p.push()
      p.translate(0.06 * k, -0.1 * k)
      p.rotate(open * 1.1)
      outline(p, ink, weight)
      p.line(0, -0.15 * k, 0, 0)
      solid(p, ink, weight, s.color)
      p.rect(0, (FLOOR + 0.1 - 0.02) * k * 0.5, 0.07 * k, (FLOOR + 0.1) * k - 0.04 * k)
      p.pop()
      p.line(0.06 * k, -0.25 * k, 0.06 * k, -0.5 * k)
    }
  },
}

/** A quarter-pipe: in from above, out to the east. */
export const landing: Contraption<SegState> = {
  name: 'track-landing',
  label: 'Landing',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, _s, { size: k, ink, weight }) => {
    outline(p, ink, weight)
    p.line(-0.12 * k, -0.5 * k, -0.12 * k, 0)
    p.arc(LAND_R * k, 0, (LAND_R + D / 2) * 2 * k, (LAND_R + D / 2) * 2 * k, Math.PI / 2, Math.PI)
    floorLine(p, k, LAND_R, 0.5)
  },
}

/** The floor ends and the ball goes over, in from the west. */
export const dropoff: Contraption<SegState> = {
  name: 'track-drop',
  label: 'Drop',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, _s, { size: k, ink, weight }) => {
    outline(p, ink, weight)
    floorLine(p, k, -0.5, -0.06)
    p.line(-0.06 * k, FLOOR * k, -0.06 * k, (FLOOR + 0.08) * k)
    p.line(-0.32 * k, FLOOR * k, -0.32 * k, 0.5 * k)
  },
}

/** A vertical tube. */
export const fall: Contraption<SegState> = {
  name: 'track-fall',
  label: 'Tube',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, _s, { size: k, ink, weight }) => {
    outline(p, ink, weight)
    p.line(-0.17 * k, -0.5 * k, -0.17 * k, 0.5 * k)
    p.line(0.17 * k, -0.5 * k, 0.17 * k, 0.5 * k)
    p.line(-0.24 * k, 0, -0.17 * k, 0)
    p.line(0.17 * k, 0, 0.24 * k, 0)
  },
}

const LIFT_X = 0.26

/** The rising side of a bucket elevator. */
export const liftShaft: Contraption<SegState> = {
  name: 'track-lift',
  label: 'Lift',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, _s, { size: k, ink, weight }) => {
    outline(p, ink, weight)
    p.line(-LIFT_X * k, -0.5 * k, -LIFT_X * k, 0.5 * k)
    p.line(LIFT_X * k, -0.5 * k, LIFT_X * k, 0.5 * k)
  },
}

/** Ball rolls in from the east onto the elevator and is carried up. */
export const liftBottom: Contraption<SegState> = {
  name: 'track-lift-in',
  label: 'Lift In',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    outline(p, ink, weight)
    floorLine(p, k, 0.5, 0.2)
    p.line(-LIFT_X * k, -0.5 * k, -LIFT_X * k, (FLOOR + 0.02) * k)
    p.line(LIFT_X * k, -0.5 * k, LIFT_X * k, (FLOOR + 0.02) * k)
    p.arc(0, (FLOOR + 0.02) * k, LIFT_X * 2 * k, LIFT_X * 2 * k, 0, Math.PI)
    p.push()
    p.translate(0, (FLOOR + 0.02) * k)
    p.rotate(-u * Math.PI * 2)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.14 * k)
    p.line(-0.07 * k, 0, 0.07 * k, 0)
    p.pop()
  },
}

/** The elevator's top: the ball comes up, tips off the bucket, rolls out east. */
export const liftTop: Contraption<SegState> = {
  name: 'track-lift-out',
  label: 'Lift Out',
  setup: ({ color }) => ({ color, variant: 'rail' }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    outline(p, ink, weight)
    p.line(-LIFT_X * k, 0.5 * k, -LIFT_X * k, -0.1 * k)
    p.line(LIFT_X * k, 0.5 * k, LIFT_X * k, -0.1 * k)
    p.arc(0, -0.1 * k, LIFT_X * 2 * k, LIFT_X * 2 * k, Math.PI, Math.PI * 2)
    floorLine(p, k, 0.18, 0.5)
    p.line(0.18 * k, FLOOR * k, 0.18 * k, 0.5 * k)
    p.push()
    p.translate(0, -0.1 * k)
    p.rotate(-u * Math.PI * 2)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.14 * k)
    p.line(-0.07 * k, 0, 0.07 * k, 0)
    p.pop()
  },
}
