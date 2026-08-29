import type p5 from 'p5'
import { clipBox, outline, solid, teeth } from '../../core/draw'
import { clamp, easeInOutCubic, easeInQuad, easeOutCubic, seg } from '../../core/ease'
import type { Contraption } from '../../core/types'
import { BY, D, FLOOR, TW } from '../lanes'

/**
 * Reactors sit in cells next to the track and are touched off by the ball as
 * it passes. Each is grounded on the track itself — a Γ-mast planted on the
 * run's floor, a wheel whose blade sweeps the tube — so the contact is drawn
 * rather than implied, and nothing hangs bare in the air.
 *
 * An assembly necessarily crosses the seam between the reactor's cell and the
 * track's. It is drawn by BOTH cells, each clipped to its own footprint — the
 * same pattern as an elevator car straddling two cells — so the seam never
 * cuts it and neither machine's ink leaves its own cell. The reactor's draw
 * clips itself (see `framed`); the track cell draws its share via the
 * `mounts` on its state (track.ts), where the state carries `demo` so the
 * assembly comes unclipped and the track cell applies its own clip.
 *
 * A reactor's period is the interval between balls and its phase puts u = 0
 * at the moment of contact. Reaction windows are measured in FRAMES against
 * `state.frames` (the instance period), not in period fractions: a ball is
 * under a contact for ~22 frames, and a flick that lasted 0.3 of a 360-frame
 * period left levers deflected with no ball anywhere near.
 *
 * `face` is which side of the reactor the track is on. Above a run (face S)
 * the mast stands in front of the reactor down to the run's floor; below a
 * run (face N) a pedal pokes up through the floor; beside a fall or a lift
 * shaft (face E or W) an arm or blade reaches sideways into the tube.
 */

export type Face = 'N' | 'E' | 'S' | 'W'

export interface ReactorState {
  color: string
  face: Face
  /** Which way the ball travels past: +1 for east or south, -1 up a shaft. */
  dir: number
  /** The instance's period in frames. Reaction windows are frames of this. */
  frames?: number
  /**
   * Draw the whole assembly unclipped: set on catalog demos (whose composite
   * footprint holds both cells) and on the copies track cells draw, which
   * clip to their own cell instead.
   */
  demo?: boolean
  /** Half-width of the tube wall the furniture reaches to. TW for a fall. */
  wall?: number
  /** Dominoes: how many bars. */
  count?: number
}

export interface Reactor extends Contraption<ReactorState> {
  faces: Face[]
  /**
   * Where along the track cell's path the ball meets this reactor's contact,
   * as a fraction. Defaults to 0.5 on a run, 0.3 beside a fall.
   */
  contact?: number
}

/**
 * A flick, timed in frames so the reaction matches the ~22 frames the ball is
 * actually there: out over 12 frames, back between frames 16 and 64.
 */
function flick(u: number, frames = 240): number {
  const K = 1 / Math.max(frames, 64)
  return easeOutCubic(seg(u, 0, 12 * K)) - easeInOutCubic(seg(u, 16 * K, 64 * K))
}

/**
 * Clip the assembly to this machine's own footprint (`h` cells tall, for the
 * pinwheel whose blade tips poke past the top and bottom). Demos and
 * track-cell mounts pass through unclipped — they bring their own bounds.
 */
function framed(p: p5, s: ReactorState, k: number, h: number, fn: () => void): void {
  if (s.demo) fn()
  else clipBox(p, k, h * k, fn)
}

/** The run's floor in a face-S reactor's frame: masts are planted on it. */
const RUN_FLOOR_BELOW = 1 + FLOOR
/** Where the ball's top is, in a reactor's frame, for a run in the cell below. */
const BALL_TOP_BELOW = 1 + BY - D / 2
/** Where the ball's bottom is, for a run in the cell above. */
const BALL_BOTTOM_ABOVE = -1 + FLOOR

/**
 * The Γ-mast every face-S reactor stands on: planted on the run's floor, up
 * the downstream side, with an arm across at shoulder height. `lever` adds
 * the trip lever at the foot — the contact the passing ball shoves.
 */
function mast(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  color: string,
  s: ReactorState,
  u: number,
  lever: boolean,
  armY = 0.3,
): void {
  const dir = s.dir
  outline(p, ink, weight)
  p.line(0.24 * dir * k, RUN_FLOOR_BELOW * k, 0.24 * dir * k, armY * k)
  p.line(0.24 * dir * k, armY * k, 0, armY * k)
  if (!lever) return
  p.push()
  p.translate(0.24 * dir * k, 1.16 * k)
  p.rotate(flick(u, s.frames) * 0.5 * dir)
  outline(p, ink, weight)
  p.line(0, 0, -0.14 * dir * k, -0.1 * k)
  solid(p, ink, weight, color)
  p.circle(-0.14 * dir * k, -0.1 * k, 0.07 * k)
  p.pop()
}

/** A pin poking up through the floor of the run above, pressed as the ball rolls over. */
function pedal(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  color: string,
  s: ReactorState,
  u: number,
  x = 0,
): void {
  const press = flick(u, s.frames) * 0.05
  outline(p, ink, weight)
  p.line(x * k, -0.5 * k, x * k, (BALL_BOTTOM_ABOVE - 0.04 + press) * k)
  solid(p, ink, weight, color)
  p.rect(x * k, (BALL_BOTTOM_ABOVE - 0.04 + press) * k, 0.14 * k, 0.05 * k)
}

/** A bell hung from the mast's arm; the clapper hangs on down to the ball. */
export const bell: Reactor = {
  name: 'react-bell',
  label: 'Bell',
  faces: ['S'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'S', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) =>
    framed(p, s, k, 1, () => {
      const hit = 1 - seg(u, 0, 0.16)
      const swing = hit * 0.28 * Math.sin(hit * Math.PI * 4)
      const bw = 0.4
      const bh = 0.3
      // The arm sits a little higher than the common 0.3 so the peal's arcs
      // put ink in the bell's own cell too, not only in the run's airspace.
      mast(p, k, ink, weight, s.color, s, u, false, 0.18)
      if (hit > 0.02) {
        p.push()
        p.stroke(s.color)
        p.noFill()
        for (const side of [-1, 1]) {
          for (let i = 1; i <= 2; i++) {
            const r = bw * (0.9 + i * 0.3 + hit * 0.2) * k
            p.arc(side * bw * 0.4 * k, 0.58 * k, r, r, side > 0 ? -0.5 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.5)
          }
        }
        p.pop()
      }
      // Hung from the arm: a bracket, then the bell swinging about the joint.
      p.push()
      p.translate(0, 0.18 * k)
      p.rotate(swing)
      outline(p, ink, weight)
      p.line(0, 0, 0, 0.25 * k)
      p.translate(0, 0.25 * k)
      p.fill(s.color)
      p.beginShape()
      p.vertex((-bw / 2) * k, bh * k)
      p.bezierVertex((-bw / 2) * k, 0, -bw * 0.22 * k, 0, 0, 0)
      p.bezierVertex(bw * 0.22 * k, 0, (bw / 2) * k, 0, (bw / 2) * k, bh * k)
      p.endShape(p.CLOSE)
      p.line((-bw / 2) * k, bh * k, (bw / 2) * k, bh * k)
      p.pop()
      // The clapper is the contact: a short bare length below the lip, down
      // to the ball's crest, and the ball itself clears under the lip.
      p.push()
      p.translate(0, 0.56 * k)
      p.rotate(-s.dir * flick(u, s.frames) * 0.3)
      outline(p, ink, weight)
      p.line(0, 0, 0, (BALL_TOP_BELOW + 0.04 - 0.56) * k)
      solid(p, ink, weight, s.color)
      p.circle(0, (BALL_TOP_BELOW + 0.04 - 0.56) * k, 0.09 * k)
      p.pop()
    }),
}

/** A semaphore arm on the mast that the ball flips up as it goes by. */
export const flag: Reactor = {
  name: 'react-flag',
  label: 'Flag',
  faces: ['S'],
  rotations: [0],
  contact: 0.6,
  setup: ({ color }) => ({ color, face: 'S', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) =>
    framed(p, s, k, 1, () => {
      const up = flick(u, s.frames)
      mast(p, k, ink, weight, s.color, s, u, true)
      p.push()
      p.translate(0, 0.32 * k)
      p.scale(-s.dir, 1)
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
      p.circle(0, 0.32 * k, 0.09 * k)
    }),
}

/** A lamp on the mast that comes on when the ball trips its switch and fades. */
export const lamp: Reactor = {
  name: 'react-lamp',
  label: 'Lamp',
  faces: ['S'],
  rotations: [0],
  contact: 0.6,
  setup: ({ color }) => ({ color, face: 'S', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight, theme }) =>
    framed(p, s, k, 1, () => {
      const lit = 1 - easeInQuad(seg(u, 0.02, 0.6))
      const cy = 0.52
      mast(p, k, ink, weight, s.color, s, u, true)
      solid(p, ink, weight, ink)
      p.quad(-0.05 * k, 0.32 * k, 0.05 * k, 0.32 * k, 0.13 * k, 0.42 * k, -0.13 * k, 0.42 * k)
      if (lit > 0.02) {
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8
          const r1 = 0.3 * k
          const r2 = (0.3 + 0.14 * lit) * k
          p.line(Math.cos(a) * r1, cy * k + Math.sin(a) * r1, Math.cos(a) * r2, cy * k + Math.sin(a) * r2)
        }
        p.pop()
      }
      // Off, the bulb keeps its colour — theme.bg read as a hole in the paper.
      solid(p, ink, weight, s.color)
      p.circle(0, cy * k, 0.3 * k)
      if (lit > 0.02) {
        p.push()
        p.noStroke()
        p.fill(theme.bg)
        p.circle(-0.05 * k, 0.47 * k, 0.1 * k)
        p.pop()
      }
    }),
}

/** A wheel beside a fall, with one blade in the tube; the ball spins it a turn. */
export const pinwheel: Reactor = {
  name: 'react-pinwheel',
  label: 'Pinwheel',
  faces: ['E', 'W'],
  rotations: [0],
  // Blade tips sweep 0.12 past the cell's top and bottom edges into the free
  // row, where the neighbour draws over them; the sweep into the tube itself
  // is drawn by the fall cell (see mounts in track.ts).
  reach: 0.18,
  setup: ({ color }) => ({ color, face: 'W', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) =>
    framed(p, s, k, 1.24, () => {
      // Canonical: track to the west. The whole assembly mirrors for the east.
      const m = s.face === 'W' ? 1 : -1
      const hub = -0.26
      const spin = -Math.PI * 2 * easeOutCubic(seg(u, 0, 0.5)) * s.dir
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
        p.rect(-0.4 * k, 0, 0.44 * k, 0.08 * k)
        p.rotate(Math.PI / 2)
      }
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(hub * k, 0, 0.1 * k)
      p.pop()
    }),
}

/** A counter under the track that clicks over one notch per ball. */
export const ratchet: Reactor = {
  name: 'react-ratchet',
  label: 'Counter',
  faces: ['N'],
  rotations: [0],
  setup: ({ color }) => ({ color, face: 'N', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) =>
    framed(p, s, k, 1, () => {
      // One notch of eight per pass; the wheel is 8-fold symmetric so the loop closes.
      const step = easeInOutCubic(seg(u, 0.02, 0.14))
      const a = (step * Math.PI * 2) / 8
      pedal(p, k, ink, weight, s.color, s, u)
      outline(p, ink, weight)
      // Hangers bolt to the run's floor line above; the run draws the stub
      // on its side of the seam.
      p.line(-0.28 * k, BALL_BOTTOM_ABOVE * k, -0.28 * k, -0.16 * k)
      p.line(0.28 * k, BALL_BOTTOM_ABOVE * k, 0.28 * k, -0.16 * k)
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
    }),
}

/** Three chime rods hung under the track; the ball's pedal sets them swaying. */
export const chime: Reactor = {
  name: 'react-chime',
  label: 'Chime',
  faces: ['N'],
  rotations: [0],
  contact: 0.8,
  setup: ({ color }) => ({ color, face: 'N', dir: 1 }),
  draw: (p, s, { size: k, u, ink, weight }) =>
    framed(p, s, k, 1, () => {
      const f = s.frames ?? 240
      pedal(p, k, ink, weight, s.color, s, u, 0.3 * s.dir)
      outline(p, ink, weight)
      p.line(-0.26 * k, BALL_BOTTOM_ABOVE * k, -0.26 * k, -0.3 * k)
      p.line(0.26 * k, BALL_BOTTOM_ABOVE * k, 0.26 * k, -0.3 * k)
      p.line(-0.26 * k, -0.3 * k, 0.26 * k, -0.3 * k)
      const rods: [number, number][] = [
        [-0.15, 0.12],
        [0, 0.2],
        [0.15, 0.12],
      ]
      for (const [i, [x, tip]] of rods.entries()) {
        const sway = flick(u - (4 * i) / Math.max(f, 64), f)
        p.push()
        p.translate(x * k, -0.3 * k)
        p.rotate(s.dir * sway * 0.25)
        outline(p, ink, weight)
        p.line(0, 0, 0, (tip + 0.3) * k)
        solid(p, ink, weight, s.color)
        p.circle(0, (tip + 0.3) * k, 0.08 * k)
        p.pop()
      }
    }),
}

const DOM_H = 0.32
const DOM_W = 0.08
const DOM_FALL = 0.08
const DOM_REST = 0.62

/**
 * A row of bars on a ledge bolted to the tube wall. An L-shaped lever on a
 * stand reaches into the tube; the ball knocks its long arm and the short arm
 * tips the first bar.
 */
export const dominoes: Reactor = {
  name: 'react-dominoes',
  label: 'Dominoes',
  faces: ['W', 'E'],
  rotations: [0],
  setup: ({ color, rng }) => ({ color, face: 'W', dir: 1, count: rng.pick([5, 6]) }),
  draw: (p, s, { size: k, u, ink, weight }) =>
    framed(p, s, k, 1, () => {
      const count = s.count ?? 5
      const gap = 0.56 / (count - 1)
      const contact = Math.asin(clamp(gap / DOM_H, 0, 1))
      const lead = Math.sqrt(clamp(contact / DOM_REST, 0, 1))
      const m = s.face === 'W' ? 1 : -1
      const wall = s.wall ?? TW
      p.push()
      p.scale(m, 1)
      outline(p, ink, weight)
      p.line((-1 + wall) * k, FLOOR * k, 0.5 * k, FLOOR * k)
      // The lever on its stand: long arm into the tube, short arm at the bars.
      p.line(-0.44 * k, 0.16 * k, -0.44 * k, FLOOR * k)
      p.push()
      p.translate(-0.44 * k, 0.16 * k)
      p.rotate(flick(u, s.frames) * 0.5 * s.dir)
      outline(p, ink, weight)
      p.line(0, 0, -0.42 * k, -0.24 * k)
      p.line(0, 0, 0.16 * k, -0.14 * k)
      solid(p, ink, weight, s.color)
      p.circle(-0.42 * k, -0.24 * k, 0.07 * k)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(-0.44 * k, 0.16 * k, 0.06 * k)
      for (let i = 0; i < count; i++) {
        const x = -0.28 + gap * i
        const last = i === count - 1
        const start = 0.03 + i * lead * DOM_FALL
        const fallen = easeInQuad(seg(u, start, start + DOM_FALL))
        const riseAt = 0.5 + (count - 1 - i) * 0.03
        const rise = easeInOutCubic(seg(u, riseAt, riseAt + 0.1))
        p.push()
        p.translate(x * k, FLOOR * k)
        p.rotate((last ? 1 : DOM_REST) * fallen * (1 - rise))
        solid(p, ink, weight, s.color)
        p.rect(0, (-DOM_H / 2) * k, DOM_W * k, DOM_H * k)
        p.pop()
      }
      p.pop()
    }),
}

export const reactors: Reactor[] = [bell, flag, lamp, pinwheel, ratchet, chime, dominoes]
