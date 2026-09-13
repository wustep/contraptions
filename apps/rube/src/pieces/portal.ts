import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, easeOutCubic, easeOutQuad } from '../../../../src/core/ease'
import { FLOOR, ROLL, TRANSIT, burst, definePiece, over, rail, roll, type Lane, type Placement, type Pt } from '../parts'

/**
 * A portal: a standing ring with a hole in the world inside it. The ball
 * rolls up, is drawn out into a streak and pulled into the vortex; somewhere
 * else the vortex flares and spits it out onto a rail. Every section of the
 * chain starts and ends with one. The pair at a universe's edges is the
 * bigger kind — a gate with an outer ring, antennae, and a beam — so a hop
 * between worlds reads as a bigger event than a hop between rooms.
 *
 * Entry and exit are told apart three ways: the chevrons on the rail march
 * toward an exit ring and away from an entry ring; the control box stands
 * on the far side from the ball's path; and the vortex spins inward at an
 * exit and outward at an entry.
 *
 * The planner places portals by hand, so the piece weighs nothing.
 */
export interface PortalState {
  color: string
  /** 'in': the ball comes out of this one. 'out': it goes in. */
  kind: 'in' | 'out'
  /** The gate between universes. */
  hop: boolean
}

/** Where the ring stands, off the cell's centre toward the side the ball crosses. */
const RX = 0.12
const RING = { w: 0.4, h: 0.64 }
const GATE = { w: 0.48, h: 0.62 }
const BAND = 0.06
/** Where on the rail the pull begins, or the push ends. */
const REACH = 0.24
/** The void's centre sits a little above the ball's line; the ball is drawn up into it. */
const LIFT = 0.06

const ringOf = (s: PortalState) => (s.hop ? GATE : RING)
const centreY = (s: PortalState) => FLOOR - ringOf(s).h / 2 + (s.hop ? 0.01 : 0)

export function portalPlacement(kind: 'in' | 'out', hop: boolean, color: string): Placement<PortalState> {
  const state: PortalState = { color, kind, hop }
  const x = kind === 'in' ? -RX : RX
  const cy = centreY(state)
  const eye: Pt = [x, cy + LIFT]
  const lane: Lane =
    kind === 'in'
      ? {
          segs: [
            { from: eye, to: [x + REACH, 0], dur: TRANSIT, ease: 'out', portal: 'in' },
            roll([x + REACH, 0], [0.5, 0], ROLL),
          ],
          fire: 0,
        }
      : {
          segs: [
            roll([-0.5, 0], [x - REACH, 0], ROLL),
            { from: [x - REACH, 0], to: eye, dur: TRANSIT, ease: 'in', portal: 'out' },
          ],
          fire: (0.5 + x - REACH) / ROLL,
        }
  return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state }
}

/** A point on an ellipse of half-axes (a, b) at angle `th`. */
const onEllipse = (cx: number, cy: number, a: number, b: number, th: number): Pt => [
  cx + Math.cos(th) * a,
  cy + Math.sin(th) * b,
]

/** `n` dashes around an ellipse, each `len` radians long, rotated by `phase`. */
function dashes(p: any, k: number, cx: number, cy: number, a: number, b: number, n: number, len: number, phase: number): void {
  const steps = 4
  for (let i = 0; i < n; i++) {
    const th0 = phase + (i / n) * Math.PI * 2
    p.beginShape()
    for (let j = 0; j <= steps; j++) {
      const [x, y] = onEllipse(cx, cy, a, b, th0 + (len * j) / steps)
      p.vertex(x * k, y * k)
    }
    p.endShape()
  }
}

export const portal = definePiece<PortalState>({
  name: 'portal',
  weight: 0,
  place: () => null,
  draw: (p, s, { k, t, since, ink, bg, weight, color }) => {
    const x = s.kind === 'in' ? -RX : RX
    const { w, h } = ringOf(s)
    const cy = centreY(s)
    const a = w / 2
    const b = h / 2
    const ia = a - BAND
    const ib = b - BAND
    const out = s.kind === 'out'
    /** Which way the ball travels past this ring: an exit is approached from the west, an entry leaves to the east. */
    const far = out ? 1 : -1

    // How worked up the portal is: an exit charges as the ball approaches
    // and flares as it takes it; an entry flares as it delivers.
    const charge = out ? over(since, -0.8, 0) * (1 - over(since, TRANSIT, TRANSIT + 0.6)) : 1 - over(since, -0.5, 0.7)
    const spin = t * (0.9 + 5 * charge) * (out ? 1 : -1)

    // The rail, up to the ring or away from it.
    if (out) rail(p, k, ink, weight, -0.5, x)
    else rail(p, k, ink, weight, x, 0.5)

    // Chevrons under the rail, marching the way the ball goes.
    p.push()
    p.stroke(s.color)
    p.strokeWeight(weight)
    p.noFill()
    const march = (t * 1.4) % 1
    for (let i = 0; i < 3; i++) {
      const cx = out ? x - REACH - 0.26 + ((i + march) % 3) * 0.09 : x + REACH + 0.04 + ((i + march) % 3) * 0.09
      const cyv = FLOOR + 0.07
      p.line((cx - 0.03 * far) * k, (cyv - 0.03) * k, (cx + 0.02 * far) * k, cyv * k)
      p.line((cx - 0.03 * far) * k, (cyv + 0.03) * k, (cx + 0.02 * far) * k, cyv * k)
    }
    p.pop()

    // The plinth: a slab under the ring, riveted, with a cable to the control box.
    const bx = x + far * (a + 0.16)
    solid(p, ink, weight, s.color)
    p.rect(x * k, (FLOOR + 0.06) * k, (w + 0.16) * k, 0.1 * k, 0.02 * k)
    p.fill(ink)
    p.noStroke()
    for (const dx of [-0.3, 0.3]) p.circle((x + dx * a * 2) * k, (FLOOR + 0.06) * k, 0.025 * k)
    outline(p, ink, weight)
    p.line(x * k, (FLOOR + 0.11) * k, x * k, 0.5 * k)
    p.line((x - 0.14) * k, 0.5 * k, (x + 0.14) * k, 0.5 * k)
    // The control box on the far side, with a light that blinks and a dial.
    p.line((x + far * (a + 0.08)) * k, (FLOOR + 0.02) * k, bx * k, (FLOOR + 0.02) * k)
    solid(p, ink, weight, bg)
    p.rect(bx * k, (FLOOR - 0.06) * k, 0.13 * k, 0.16 * k, 0.015 * k)
    outline(p, ink, weight)
    p.line((bx - 0.04) * k, (FLOOR - 0.02) * k, (bx + 0.04) * k, (FLOOR - 0.02) * k)
    p.line((bx - 0.04) * k, (FLOOR + 0.01) * k, (bx + 0.04) * k, (FLOOR + 0.01) * k)
    const blink = ((t * (1 + 6 * charge)) % 1) < 0.5
    solid(p, ink, weight, blink ? s.color : bg)
    p.circle(bx * k, (FLOOR - 0.09) * k, 0.045 * k)

    if (s.hop) {
      // The gate's extras: an outer ring of longer dashes turning the other
      // way, and two antennae at the shoulders with lights on them.
      outline(p, ink, weight * 0.9)
      dashes(p, k, x, cy, a + 0.11, b + 0.1, 6, 0.55, -spin * 0.5)
      for (const side of [-1, 1]) {
        const ax = x + side * (a + 0.03)
        const ay = cy - b * 0.55
        outline(p, ink, weight)
        p.line(ax * k, ay * k, (ax + side * 0.07) * k, (ay - 0.1) * k)
        solid(p, ink, weight, blink === side > 0 ? s.color : bg)
        p.circle((ax + side * 0.07) * k, (ay - 0.1) * k, 0.045 * k)
      }
    }

    // The energy ring: dashes just outside the band, turning, and three
    // motes chasing each other round it the other way.
    outline(p, ink, weight)
    dashes(p, k, x, cy, a + 0.05, b + 0.05, 12, 0.28, spin)
    for (let i = 0; i < 3; i++) {
      const [mx, my] = onEllipse(x, cy, a + 0.09, b + 0.09, -spin * 1.3 + (i / 3) * Math.PI * 2)
      solid(p, ink, weight * 0.8, i === 0 ? color : s.color)
      p.circle(mx * k, my * k, (0.035 + 0.02 * charge) * k)
    }

    // The ring, and the hole in the world inside it.
    solid(p, ink, weight, s.color)
    p.ellipse(x * k, cy * k, w * k, h * k)
    p.fill(ink)
    p.ellipse(x * k, cy * k, ia * 2 * k, ib * 2 * k)

    // The eye, brightening with the charge, under the arms.
    if (charge > 0.02) {
      const glow = p.color(s.color)
      glow.setAlpha(200 * easeOutQuad(charge))
      p.push()
      p.noStroke()
      p.fill(glow)
      p.ellipse(x * k, (cy + LIFT * 0.5) * k, ia * 0.5 * charge * k, ib * 0.5 * charge * k)
      p.pop()
    }
    // The vortex: three arms spiralling into the centre, in the ring's colour.
    p.push()
    p.noFill()
    p.stroke(s.color)
    p.strokeWeight(weight * (0.8 + 0.7 * charge))
    for (let arm = 0; arm < 3; arm++) {
      p.beginShape()
      const turns = 1.6
      const n = 22
      for (let j = 0; j <= n; j++) {
        const f = j / n
        const th = spin * 1.6 + (arm / 3) * Math.PI * 2 + f * turns * Math.PI * 2
        const r = 0.92 * (1 - f * 0.92)
        const [px, py] = onEllipse(x, cy, ia * r, ib * r, th)
        p.vertex(px * k, py * k)
      }
      p.endShape()
    }
    p.pop()

    // The event.
    if (out) {
      // Speed lines converging on the eye while the ball is pulled in.
      if (since > 0 && since < TRANSIT + 0.15) {
        const f = over(since, 0, TRANSIT + 0.15)
        p.push()
        p.stroke(color)
        p.strokeWeight(weight)
        burst(p, x * k, (cy + LIFT) * k, (0.16 + 0.26 * (1 - f)) * k, (0.3 + 0.32 * (1 - f)) * k, 8, -spin * 0.3)
        p.pop()
      }
      // The shock as the ball is gone: a ring out, the eye flashing.
      if (since > TRANSIT - 0.02 && since < TRANSIT + 0.45) {
        const f = easeOutCubic(over(since, TRANSIT - 0.02, TRANSIT + 0.45))
        p.push()
        p.noFill()
        p.stroke(ink)
        p.strokeWeight(weight * 1.6 * (1 - f))
        p.ellipse(x * k, cy * k, (w + 0.6 * f) * k, (h + 0.6 * f) * k)
        p.stroke(s.color)
        p.strokeWeight(weight * (1 - f))
        p.ellipse(x * k, cy * k, (w + 0.3 * f) * k, (h + 0.3 * f) * k)
        p.pop()
      }
    } else {
      // The eye swells before it delivers, so a cut to a new room is never a cut to nothing.
      if (since > -0.45 && since < 0) {
        const f = easeInQuad(over(since, -0.45, 0))
        p.push()
        p.noStroke()
        p.fill(s.color)
        p.ellipse(x * k, (cy + LIFT * 0.5) * k, ia * 2 * f * k, ib * 2 * f * k)
        p.pop()
      }
      // Ripples and sparks going out as the ball is pushed through.
      if (since >= 0 && since < 0.6) {
        const f = over(since, 0, 0.6)
        const e = easeOutCubic(f)
        p.push()
        p.noFill()
        for (let i = 0; i < 2; i++) {
          const g = Math.max(0, e - i * 0.25)
          p.stroke(i ? s.color : ink)
          p.strokeWeight(weight * 1.4 * (1 - g))
          p.ellipse(x * k, cy * k, (w + 0.7 * g) * k, (h + 0.7 * g) * k)
        }
        p.stroke(color)
        p.strokeWeight(weight)
        burst(p, x * k, (cy + LIFT) * k, (0.2 + 0.3 * e) * k, (0.26 + 0.42 * e) * k, 8, spin * 0.3 + 0.2)
        p.pop()
      }
    }

    // The gate's arcs: lightning from the antennae to the ring while it works.
    if (s.hop) {
      const arcs = out ? over(since, -0.3, 0) * (1 - over(since, TRANSIT + 0.2, TRANSIT + 0.7)) : over(since, -0.4, -0.1) * (1 - over(since, 0.3, 0.8))
      if (arcs > 0.02) {
        p.push()
        p.noFill()
        for (const side of [-1, 1]) {
          const ax = x + side * (a + 0.1)
          const ay = cy - b * 0.55 - 0.1
          const [tx, ty] = onEllipse(x, cy, a + 0.02, b + 0.02, -Math.PI / 2 + side * 0.7)
          for (const pass of [0, 1]) {
            p.stroke(pass ? s.color : ink)
            p.strokeWeight(weight * (pass ? 0.7 : 1.3) * arcs)
            p.beginShape()
            p.vertex(ax * k, ay * k)
            for (let j = 1; j < 5; j++) {
              const f = j / 5
              const wob = Math.sin(t * 61 + j * 2.3 + side * 5 + pass) * 0.03
              p.vertex((ax + (tx - ax) * f + wob) * k, (ay + (ty - ay) * f + wob * 0.7) * k)
            }
            p.vertex(tx * k, ty * k)
            p.endShape()
          }
        }
        p.pop()
      }
    }
  },
})
