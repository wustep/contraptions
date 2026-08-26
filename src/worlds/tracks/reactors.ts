import type p5 from 'p5'
import { outline, solid, teeth } from '../../core/draw'
import { clamp, easeInOutCubic, easeInQuad, easeOutCubic, seg } from '../../core/ease'
import type { Contraption } from '../../core/types'
import { BY, D, FLOOR } from '../lanes'

/**
 * Reactors sit in cells next to the track and are touched off by the ball as
 * it passes. Each has a feeler that reaches into the track cell as far as the
 * ball, so the contact is drawn rather than implied.
 *
 * A reactor's period is the interval between balls and its phase puts u = 0
 * at the moment of contact, so every one of these is written against a local
 * clock that starts when the ball arrives.
 *
 * `face` is which side of the reactor the track is on. Above a run (face S)
 * a feeler hangs down to the ball; below a run (face N) a pedal pokes up
 * through the floor; beside a fall (face E or W) an arm reaches sideways into
 * the tube.
 */

export type Face = 'N' | 'E' | 'S' | 'W'

export interface ReactorState {
  color: string
  face: Face
  /** Which way the ball travels past, +1 for east or south. */
  dir: number
}

export interface Reactor extends Contraption<ReactorState> {
  faces: Face[]
}

/** A flick: out fast, back with a little settle. */
const flick = (u: number) => easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.09, 0.3))

/** Where the ball's top is, in a reactor's frame, for a run in the cell below. */
const BALL_TOP_BELOW = 1 + BY - D / 2
/** Where the ball's bottom is, for a run in the cell above. */
const BALL_BOTTOM_ABOVE = -1 + FLOOR

/** A rod hanging from the cell's bottom edge down to the ball in the run below. */
function hangingFeeler(p: p5, k: number, ink: string, weight: number, color: string, s: ReactorState, u: number): void {
  p.push()
  p.translate(0, 0.5 * k)
  p.rotate(-s.dir * flick(u) * 0.55)
  outline(p, ink, weight)
  p.line(0, 0, 0, (BALL_TOP_BELOW - 0.5 + 0.04) * k)
  solid(p, ink, weight, color)
  p.circle(0, (BALL_TOP_BELOW - 0.5 + 0.04) * k, 0.08 * k)
  p.pop()
}

/** A pin poking up through the floor of the run above, pressed as the ball rolls over. */
function pedal(p: p5, k: number, ink: string, weight: number, color: string, u: number): void {
  const press = flick(u) * 0.05
  outline(p, ink, weight)
  p.line(0, -0.5 * k, 0, (BALL_BOTTOM_ABOVE - 0.04 + press) * k)
  solid(p, ink, weight, color)
  p.rect(0, (BALL_BOTTOM_ABOVE - 0.04 + press) * k, 0.14 * k, 0.05 * k)
}

/** A bell hung above the track; the clapper rod hangs on down to the ball. */
export const bell: Reactor = {
  name: 'react-bell',
  label: 'Bell',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const hit = 1 - seg(u, 0, 0.16)
    const swing = hit * 0.28 * Math.sin(hit * Math.PI * 4)
    const bw = 0.4
    const bh = 0.3
    outline(p, ink, weight)
    p.line(-0.5 * k, -0.5 * k, 0.5 * k, -0.5 * k)
    if (hit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 2; i++) {
          const r = bw * (0.9 + i * 0.3 + hit * 0.2) * k
          p.arc(side * bw * 0.4 * k, -0.15 * k, r, r, side > 0 ? -0.5 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.5)
        }
      }
      p.pop()
    }
    p.push()
    p.translate(0, -0.5 * k)
    p.rotate(swing)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.1 * k)
    p.translate(0, 0.1 * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-bw / 2) * k, bh * k)
    p.bezierVertex((-bw / 2) * k, 0, -bw * 0.22 * k, 0, 0, 0)
    p.bezierVertex(bw * 0.22 * k, 0, (bw / 2) * k, 0, (bw / 2) * k, bh * k)
    p.endShape(p.CLOSE)
    p.line((-bw / 2) * k, bh * k, (bw / 2) * k, bh * k)
    p.pop()
    // The clapper: hinged inside the bell, hanging on through the floor to the ball.
    p.push()
    p.translate(0, (-0.4 + bh * 0.5) * k)
    p.rotate(-s.dir * flick(u) * 0.4)
    outline(p, ink, weight)
    p.line(0, 0, 0, (BALL_TOP_BELOW + 0.04 + 0.4 - bh * 0.5) * k)
    solid(p, ink, weight, s.color)
    p.circle(0, (BALL_TOP_BELOW + 0.04 + 0.4 - bh * 0.5) * k, 0.09 * k)
    p.pop()
  },
}

/** A semaphore arm that the ball flips up as it goes by. */
export const flag: Reactor = {
  name: 'react-flag',
  label: 'Flag',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const up = easeOutCubic(seg(u, 0, 0.08)) - easeInOutCubic(seg(u, 0.5, 0.75))
    outline(p, ink, weight)
    p.line(0, 0.5 * k, 0, 0.05 * k)
    hangingFeeler(p, k, ink, weight, s.color, s, u)
    p.push()
    p.translate(0, 0.05 * k)
    p.rotate(-up * 1.2)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, 0)
    p.vertex(0.38 * k, 0)
    p.vertex(0.3 * k, 0.11 * k)
    p.vertex(0.38 * k, 0.22 * k)
    p.vertex(0, 0.22 * k)
    p.endShape(p.CLOSE)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, 0.05 * k, 0.09 * k)
  },
}

/** A lamp that comes on when the ball trips its switch and fades. */
export const lamp: Reactor = {
  name: 'react-lamp',
  label: 'Lamp',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const lit = 1 - easeInQuad(seg(u, 0.02, 0.6))
    const cy = 0.02
    outline(p, ink, weight)
    p.line(0, 0.5 * k, 0, (cy + 0.18) * k)
    hangingFeeler(p, k, ink, weight, s.color, s, u)
    if (lit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        const r1 = 0.24 * k
        const r2 = (0.24 + 0.16 * lit) * k
        p.line(Math.cos(a) * r1, cy * k + Math.sin(a) * r1, Math.cos(a) * r2, cy * k + Math.sin(a) * r2)
      }
      p.pop()
    }
    solid(p, ink, weight, lit > 0.02 ? s.color : theme.bg)
    p.circle(0, cy * k, 0.36 * k)
  },
}

/** A wheel beside a fall, with one blade in the tube; the ball spins it a turn. */
export const pinwheel: Reactor = {
  name: 'react-pinwheel',
  label: 'Pinwheel',
  faces: ['E', 'W'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'W', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Canonical: track to the west. The whole cell is mirrored for the east.
    const m = s.face === 'W' ? 1 : -1
    const hub = -0.26
    const spin = -Math.PI * 2 * easeOutCubic(seg(u, 0, 0.5))
    p.push()
    p.scale(m, 1)
    outline(p, ink, weight)
    p.line(hub * k, 0, hub * k, 0.5 * k)
    p.line((hub - 0.14) * k, 0.5 * k, (hub + 0.14) * k, 0.5 * k)
    p.push()
    p.translate(hub * k, 0)
    p.rotate(spin)
    outline(p, ink, weight)
    p.circle(0, 0, 0.28 * k)
    for (let i = 0; i < 4; i++) {
      solid(p, ink, weight, s.color)
      p.rect(-0.4 * k, 0, 0.5 * k, 0.08 * k)
      p.rotate(Math.PI / 2)
    }
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(hub * k, 0, 0.1 * k)
    p.pop()
  },
}

/** A counter under the track that clicks over one notch per ball. */
export const ratchet: Reactor = {
  name: 'react-ratchet',
  label: 'Counter',
  faces: ['N'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'N', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // One notch of eight per pass; the wheel is 8-fold symmetric so the loop closes.
    const step = easeInOutCubic(seg(u, 0.02, 0.14))
    const a = (step * Math.PI * 2) / 8
    pedal(p, k, ink, weight, s.color, u)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    p.line(0, -0.5 * k, 0, -0.16 * k)
    p.push()
    p.translate(0, 0.1 * k)
    p.rotate(a)
    outline(p, ink, weight)
    p.circle(0, 0, 0.5 * k)
    teeth(p, 0.25 * k, 8, 0.07 * k)
    solid(p, ink, weight, s.color)
    p.line(0, 0, 0.25 * k, 0)
    p.circle(0.25 * k, 0, 0.09 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, 0.1 * k, 0.09 * k)
  },
}

const DOM_H = 0.32
const DOM_W = 0.08
const DOM_FALL = 0.08
const DOM_REST = 0.85

/**
 * A row of bars beside a fall. An L-shaped lever reaches into the tube; the
 * ball knocks its long arm down and the short arm tips the first bar.
 */
export const dominoes: Reactor = {
  name: 'react-dominoes',
  label: 'Dominoes',
  faces: ['W', 'E'],
  rotations: [0],
  setup: ({ color, rng }) => ({ color, face: 'W', dir: 1, count: rng.pick([5, 6]) }) as ReactorState,
  draw: (p, s, { size: k, u, ink, weight }) => {
    const count = (s as ReactorState & { count: number }).count
    const gap = 0.56 / (count - 1)
    const contact = Math.asin(clamp(gap / DOM_H, 0, 1))
    const lead = Math.sqrt(clamp(contact / DOM_REST, 0, 1))
    const m = s.face === 'W' ? 1 : -1
    p.push()
    p.scale(m, 1)
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, 0.5 * k, FLOOR * k)
    // The lever, hinged at the edge: long arm into the tube, short arm at the bars.
    p.push()
    p.translate(-0.5 * k, 0.16 * k)
    p.rotate(flick(u) * 0.5)
    outline(p, ink, weight)
    p.line(0, 0, -0.42 * k, -0.24 * k)
    p.line(0, 0, 0.16 * k, -0.14 * k)
    solid(p, ink, weight, s.color)
    p.circle(-0.42 * k, -0.24 * k, 0.07 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(-0.5 * k, 0.16 * k, 0.06 * k)
    for (let i = 0; i < count; i++) {
      const x = -0.28 + gap * i
      const last = i === count - 1
      const start = 0.03 + i * lead * DOM_FALL
      const fallen = easeInQuad(seg(u, start, start + DOM_FALL))
      const riseAt = 0.62 + (count - 1 - i) * 0.03
      const rise = easeInOutCubic(seg(u, riseAt, riseAt + 0.1))
      p.push()
      p.translate(x * k, FLOOR * k)
      p.rotate((last ? 1 : DOM_REST) * fallen * (1 - rise))
      solid(p, ink, weight, s.color)
      p.rect(0, (-DOM_H / 2) * k, DOM_W * k, DOM_H * k)
      p.pop()
    }
    p.pop()
  },
}

export const reactors: Reactor[] = [bell, flag, lamp, pinwheel, ratchet, dominoes]
