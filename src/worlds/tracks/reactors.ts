import type p5 from 'p5'
import { outline, solid, teeth } from '../../core/draw'
import { clamp, easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import type { Contraption } from '../../core/types'
import { FLOOR } from '../lanes'

/**
 * Reactors sit in cells next to the track and are touched off by the ball as
 * it passes. Each has a feeler that reaches into the track cell to the ball's
 * height, so the contact is drawn rather than implied.
 *
 * A reactor's period is the interval between balls and its phase puts u = 0
 * at the moment of contact, so every one of these is written against a local
 * clock that starts when the ball arrives.
 */

export type Face = 'N' | 'E' | 'S' | 'W'

export interface ReactorState {
  color: string
  /** Which side of this cell the track is on. */
  face: Face
}

export interface Reactor extends Contraption<ReactorState> {
  faces: Face[]
}

/** A flick: out fast, back with a little settle. */
const flick = (u: number) => easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.09, 0.3))

/**
 * A lever hanging from the cell's bottom edge into the track below, knocked
 * aside by the ball. Drawn in whatever frame the caller has set up.
 */
function feeler(p: p5, k: number, ink: string, weight: number, color: string, u: number): void {
  p.push()
  p.translate(0, 0.5 * k)
  p.rotate(-flick(u) * 0.9)
  outline(p, ink, weight)
  p.line(0, 0, 0, 0.22 * k)
  solid(p, ink, weight, color)
  p.circle(0, 0.22 * k, 0.07 * k)
  p.pop()
}

/** A bell hung above the track; the feeler doubles as its clapper rod. */
export const bell: Reactor = {
  name: 'react-bell',
  label: 'Bell',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S' }),
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
    // The clapper hangs on down through the floor to meet the ball.
    p.push()
    p.translate(0, (-0.4 + bh) * k)
    p.rotate(-flick(u) * 0.5)
    outline(p, ink, weight)
    p.line(0, 0, 0, (0.9 - bh) * k)
    solid(p, ink, weight, s.color)
    p.circle(0, (0.9 - bh) * k, 0.08 * k)
    p.pop()
  },
}

/** A semaphore arm that the ball flips up as it goes by. */
export const flag: Reactor = {
  name: 'react-flag',
  label: 'Flag',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S' }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const up = easeOutCubic(seg(u, 0, 0.08)) - easeInOutCubic(seg(u, 0.5, 0.75))
    outline(p, ink, weight)
    p.line(0, 0.5 * k, 0, -0.1 * k)
    feeler(p, k, ink, weight, s.color, u)
    p.push()
    p.translate(0, -0.1 * k)
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
    p.circle(0, -0.1 * k, 0.09 * k)
  },
}

/** A lamp that comes on when the ball trips its switch and fades. */
export const lamp: Reactor = {
  name: 'react-lamp',
  label: 'Lamp',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S' }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const lit = 1 - easeInQuad(seg(u, 0.02, 0.6))
    outline(p, ink, weight)
    p.line(0, 0.5 * k, 0, 0.05 * k)
    feeler(p, k, ink, weight, s.color, u)
    if (lit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        const r1 = 0.24 * k
        const r2 = (0.24 + 0.16 * lit) * k
        p.line(Math.cos(a) * r1, -0.12 * k + Math.sin(a) * r1, Math.cos(a) * r2, -0.12 * k + Math.sin(a) * r2)
      }
      p.pop()
    }
    solid(p, ink, weight, lit > 0.02 ? s.color : theme.bg)
    p.circle(0, -0.12 * k, 0.36 * k)
  },
}

/** A wheel beside a fall, spun by the ball on its way down. */
export const pinwheel: Reactor = {
  name: 'react-pinwheel',
  label: 'Pinwheel',
  faces: ['E', 'W'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'E' }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const dir = s.face === 'E' ? -1 : 1
    const spin = dir * Math.PI * 2 * easeOutCubic(seg(u, 0, 0.55))
    const fx = s.face === 'E' ? 1 : -1
    outline(p, ink, weight)
    p.line(0, 0.5 * k, 0, 0)
    p.line(-0.2 * k, 0.5 * k, 0.2 * k, 0.5 * k)
    p.push()
    p.rotate(spin)
    outline(p, ink, weight)
    p.circle(0, 0, 0.4 * k)
    teeth(p, 0.2 * k, 6, 0.24 * k)
    p.pop()
    // One blade tip reaches into the tube.
    void fx
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.12 * k)
  },
}

/** A counter that clicks over one notch per ball. */
export const ratchet: Reactor = {
  name: 'react-ratchet',
  label: 'Counter',
  faces: ['N'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'N' }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // One notch of eight per pass; the wheel is 8-fold symmetric so the loop closes.
    const step = easeInOutCubic(seg(u, 0.02, 0.14))
    const a = (step * Math.PI * 2) / 8
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    // The pawl arm reaches up through the ceiling to the ball.
    p.push()
    p.translate(0, -0.5 * k)
    p.rotate(flick(u) * 0.8)
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.22 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -0.22 * k, 0.07 * k)
    p.pop()
    p.line(0, -0.5 * k, 0, -0.2 * k)
    p.push()
    p.translate(0, 0.12 * k)
    p.rotate(a)
    outline(p, ink, weight)
    p.circle(0, 0, 0.5 * k)
    teeth(p, 0.25 * k, 8, 0.07 * k)
    solid(p, ink, weight, s.color)
    p.line(0, 0, 0.25 * k, 0)
    p.circle(0.25 * k, 0, 0.09 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, 0.12 * k, 0.09 * k)
  },
}

const DOM_H = 0.32
const DOM_W = 0.08
const DOM_FALL = 0.08
const DOM_REST = 0.85

/** A row of bars beside the track; a feeler from the ball's side knocks the first. */
export const dominoes: Reactor = {
  name: 'react-dominoes',
  label: 'Dominoes',
  faces: ['W', 'E'],
  rotations: [0],
  setup: ({ color, rng }) => ({ color, face: 'W', count: rng.pick([5, 6]) }) as ReactorState,
  draw: (p, s, { size: k, u, ink, weight }) => {
    const count = (s as ReactorState & { count: number }).count
    const gap = 0.6 / (count - 1)
    const contact = Math.asin(clamp(gap / DOM_H, 0, 1))
    const lead = Math.sqrt(clamp(contact / DOM_REST, 0, 1))
    const dir = s.face === 'W' ? 1 : -1
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, 0.5 * k, FLOOR * k)
    // The feeler is a lever at floor level, pivoted at the track edge.
    p.push()
    p.translate(-dir * 0.5 * k, FLOOR * k)
    p.rotate(dir * flick(u) * 0.7)
    outline(p, ink, weight)
    p.line(0, 0, -dir * 0.14 * k, -0.34 * k)
    p.line(0, 0, dir * 0.12 * k, -0.2 * k)
    p.pop()
    for (let i = 0; i < count; i++) {
      const x = dir * (-0.25 + gap * i)
      const last = i === count - 1
      const start = 0.02 + i * lead * DOM_FALL
      const drop = easeInQuad(seg(u, start, start + DOM_FALL))
      const riseAt = 0.6 + (count - 1 - i) * 0.03
      const rise = easeInOutCubic(seg(u, riseAt, riseAt + 0.1))
      p.push()
      p.translate(x * k, FLOOR * k)
      p.rotate(dir * (last ? 1 : DOM_REST) * drop * (1 - rise))
      solid(p, ink, weight, s.color)
      p.rect(0, (-DOM_H / 2) * k, DOM_W * k, DOM_H * k)
      p.pop()
    }
    void lerp
  },
}

export const reactors: Reactor[] = [bell, flag, lamp, pinwheel, ratchet, dominoes]
