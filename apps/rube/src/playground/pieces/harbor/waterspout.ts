import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, lerp } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../../parts'
import { WATER, piling, seaWater, seabed, water } from '../../../pieces/harbor/sea'

/**
 * A waterspout. Off the deck's end the sea is open, and a waterspout stands
 * on it under its own small cloud, two floors up or three: a funnel of
 * water, thin as a rope at the sea and wide at the cloud, turning. As the
 * ball comes along the deck the spout's foot comes across the water to meet
 * it, takes it off the deck's end, and winds it up: round the front, round
 * the back, round the front, wider and higher every turn as the foot wanders
 * back out to sea, and at the top of the last turn it lets the ball go off
 * its front, onward, onto the deck up there. Then it has nothing left in
 * it: the funnel thins to a thread from the foot up and is gone, and the
 * cloud is only a cloud.
 *
 * The funnel's axis, its width and the ball's turn about it are functions of
 * time and height; the ball's lane is traced from them, so what is seen from
 * the side is the helix itself: across and back, climbing. Going round the
 * back the ball is behind the water's streaks, and round the front before
 * them.
 */
export interface SpoutState {
  floors: 2 | 3
}

const EDGE = -0.14
/** Where the cloud hangs, and so where the funnel's head is; where its foot waits, comes to, and wanders back to. */
const CLOUD_X = 0.6
const FAR = 1.02
const NEAR = 0.17
const BACK = 0.5
/** The funnel's half width at the sea and at the cloud. */
const THIN = 0.05
const WIDE = 0.25
/** The deck above, its piling, and cartoon gravity for the last little flight onto it. */
const SHELF_X = 0.96
const POST_X = 1.34
const G = 22
/** How fast the streaks go round. */
const TURN = 9.8

interface Spout {
  floors: 2 | 3
  /** The cloud's flat underside. */
  base: number
  tGrab: number
  tGo: number
  lane: Lane
  /** The foot's place at `t`; how much of the funnel is left, 1 to 0; the ball's turn about the axis. */
  foot(t: number): number
  left(t: number): number
  phase(t: number): number
}

function build(floors: 2 | 3): Spout {
  const base = -floors - 0.36
  const turns = floors + 0.25
  const tEdge = (EDGE + 0.5) / ROLL
  const pull = 0.17
  const tGrab = tEdge + pull
  const climb = 0.62 * floors + 0.2
  const tGo = tGrab + climb
  /** The ball's height on the way up: from just under the deck's line to just over the deck above, gathering pace. */
  const y0 = 0.03
  const y1 = -floors - 0.1
  const heightAt = (t: number) => {
    const u = over(t, tGrab, tGo)
    return lerp(y0, y1, 0.45 * u + 0.55 * u * u)
  }
  const foot = (t: number) => {
    if (t < tGrab) return lerp(FAR, NEAR, easeInOutSine(over(t, tEdge - 1.1, tEdge)))
    return lerp(NEAR, BACK, easeInOutSine(over(t, tGrab, tGo + 0.4)))
  }
  const left = (t: number) => 1 - over(t, tGo + 0.15, tGo + 1.05)
  const phase = (t: number) => Math.PI + (turns * 2 * Math.PI - Math.PI / 2 + Math.PI / 2) * over(t, tGrab, tGo)
  // The last quarter turn brings it to the front going on: the turn starts at the west, and ends a quarter past a whole number.
  const ballAt = (t: number): Pt => {
    const y = heightAt(t)
    const a = phase(t)
    return [axisAt(foot(t), base, y) + orbitAt(base, y) * Math.cos(a), y]
  }
  const ride = trace(ballAt, tGrab, tGo, Math.round(turns * 18))
  const off = ride[ride.length - 1]
  // Let go: a thrown thing from here, at the pace the last of the turn gave it.
  const dt = off.dur
  const vx = (off.to[0] - off.from[0]) / dt
  const vy = (off.to[1] - off.from[1]) / dt
  const flight = (-vy + Math.sqrt(vy * vy + 2 * G * (-floors - off.to[1]))) / G
  const land: Pt = [Math.min(1.28, off.to[0] + vx * flight), -floors]
  const lane: Lane = {
    segs: [
      roll([-0.5, 0], [EDGE, 0], ROLL),
      ramp([EDGE, 0], ride[0].from, ROLL, 0.9),
      ...ride,
      fly(off.to, land, flight, (G * flight * flight) / 8),
      fly(land, [land[0] + 0.08, -floors], 0.05, 0.012),
      ramp([land[0] + 0.08, -floors], [1.5, -floors], 1.9, ROLL),
    ],
    fire: tGrab,
  }
  return { floors, base, tGrab, tGo, lane, foot, left, phase }
}

/** How far up the funnel `y` is: 0 at the sea, 1 at the cloud. */
const upAt = (base: number, y: number) => clamp((WATER - y) / (WATER - base))
/** The funnel's axis at height `y`: from its foot, bending over to the cloud. */
const axisAt = (footX: number, base: number, y: number) => lerp(footX, CLOUD_X, Math.pow(upAt(base, y), 0.75))
/** Its half width there, and how far off the axis the ball goes round: on the water's skin, never inside a foot thinner than itself. */
const widthAt = (base: number, y: number) => lerp(THIN, WIDE, Math.pow(upAt(base, y), 1.25))
const orbitAt = (base: number, y: number) => widthAt(base, y) * 0.85 + 0.055

const SPOUTS = { 2: build(2), 3: build(3) }

/** The streaks on the funnel's near side: three ropes of water wound round it, turning. Drawn before the ball, and again over it when it is round the back. */
function streaks(p: p5, k: number, color: string, weight: number, sp: Spout, t: number): void {
  const left = sp.left(t)
  if (left <= 0) return
  const footX = sp.foot(t)
  p.noFill()
  p.stroke(color)
  p.strokeWeight(weight * 1.15)
  const n = 26 * sp.floors
  for (let band = 0; band < 3; band++) {
    let open = false
    for (let i = 0; i <= n; i++) {
      const y = lerp(WATER, sp.base, i / n)
      const up = upAt(sp.base, y)
      const a = (band / 3) * Math.PI * 2 + up * sp.floors * 5.2 - t * TURN
      const near = Math.sin(a) < -0.12 && up > 1 - left
      if (near && !open) p.beginShape()
      if (!near && open) p.endShape()
      open = near
      if (near) p.vertex((axisAt(footX, sp.base, y) + widthAt(sp.base, y) * left * Math.cos(a) * 0.96) * k, y * k)
    }
    if (open) p.endShape()
  }
}

export const waterspout = definePiece<SpoutState>({
  name: 'waterspout',
  weight: 0.7,
  flight: true,
  place: ({ rng, fits }) => {
    for (const floors of rankBy(rng, [2, 3] as const, (f) => (f === 2 ? 1.4 : 1))) {
      const cells: Pt[] = []
      for (let r = 0; r <= floors; r++) cells.push([0, -r], [1, -r])
      const exit: Pt = [2, -floors]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: SPOUTS[floors].lane, state: { floors } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const sp = SPOUTS[s.floors]
    const top = -s.floors
    const left = sp.left(t)
    const footX = sp.foot(t)

    // The deck in; the deck above on its long piling; the bed of the sea under both.
    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, -0.36)
    rail(p, k, ink, weight, SHELF_X, 1.5, top + FLOOR)
    piling(p, k, ink, weight, POST_X, top + FLOOR, 0.5)
    seabed(p, k, ink, weight, -0.5, 1.5)

    // The funnel: paper inside one line, thin at the sea and wide at the cloud, a slow wave going up it. It thins away from the foot up.
    if (left > 0) {
      const n = 22 * s.floors
      const edge = (side: 1 | -1, i: number): Pt => {
        const y = lerp(WATER, sp.base, i / n)
        const up = upAt(sp.base, y)
        const wave = 0.012 * Math.sin(up * 9 - t * 6) * (1 - up)
        const gone = clamp((up - (1 - left)) / 0.2)
        return [axisAt(footX, sp.base, y) + wave + side * widthAt(sp.base, y) * left * gone, y]
      }
      solid(p, ink, weight, bg)
      p.beginShape()
      for (let i = 0; i <= n; i++) p.vertex(edge(-1, i)[0] * k, edge(-1, i)[1] * k)
      for (let i = n; i >= 0; i--) p.vertex(edge(1, i)[0] * k, edge(1, i)[1] * k)
      p.endShape(p.CLOSE)
      streaks(p, k, seaWater(theme), weight, sp, t)
    }

    // The cloud it hangs from: flat underneath, three lobes on top, one line round it.
    const cy = sp.base
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex((CLOUD_X - 0.34) * k, cy * k)
    p.bezierVertex((CLOUD_X - 0.4) * k, (cy - 0.1) * k, (CLOUD_X - 0.26) * k, (cy - 0.14) * k, (CLOUD_X - 0.19) * k, (cy - 0.09) * k)
    p.bezierVertex((CLOUD_X - 0.16) * k, (cy - 0.17) * k, (CLOUD_X + 0.08) * k, (cy - 0.17) * k, (CLOUD_X + 0.1) * k, (cy - 0.09) * k)
    p.bezierVertex((CLOUD_X + 0.2) * k, (cy - 0.15) * k, (CLOUD_X + 0.4) * k, (cy - 0.09) * k, (CLOUD_X + 0.34) * k, cy * k)
    p.endShape(p.CLOSE)

    // The sea, heaped up a little round the spout's foot while there is one.
    water(p, k, ink, weight, -0.5, 1.5)
    if (left > 0.3) {
      outline(p, ink, weight * 0.8)
      for (const side of [-1, 1]) {
        p.beginShape()
        p.vertex((footX + side * 0.16) * k, (WATER + 0.005) * k)
        p.quadraticVertex((footX + side * 0.07) * k, (WATER - 0.005) * k, (footX + side * THIN * 1.1) * k, (WATER - 0.07) * k)
        p.endShape()
      }
    }
  },
  over: (p, s, { k, t, weight, theme }) => {
    // Round the back, the ball is behind the water.
    const sp = SPOUTS[s.floors]
    if (t > sp.tGrab && t < sp.tGo && Math.sin(sp.phase(t)) > 0) streaks(p, k, seaWater(theme), weight, sp, t)
  },
})
