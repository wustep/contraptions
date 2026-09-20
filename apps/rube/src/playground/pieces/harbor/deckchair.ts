import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutQuad, lerp } from '../../../../../../src/core/ease'
import { R, ROLL, chain, definePiece, fly, over, rail, ramp, rankBy, roll, type Lane, type Pt, type Seg } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from '../../../pieces/harbor/sea'

/**
 * A deckchair. It stands in the shallows at the deck's end with its feet
 * on the sand and its back to the pier, the top bar of its back level with
 * the deck, so the striped canvas runs straight on from the planks and down
 * into its sag. The ball rolls off the deck onto the canvas and down into
 * the sag with a thump; the strut jumps its notch; and the chair does what
 * deckchairs do: the two frames snap shut like a jaw. The pocket of canvas
 * closes to a wedge under the ball and spits it out of the top like a pip,
 * up past the low front bar and over the water in a high arc onto the far
 * deck, a cell on or two. The chair stands shut for a moment, a tall thin
 * thing on four feet together, and keels over into the shallows, where it
 * lies folded.
 *
 * The chair is two frames crossed on one pin, posed by one angle; the canvas
 * hangs between their tops, one length of cloth whatever the angle, so it
 * sags deeper as the tops come together. The ball's seat is the bottom of
 * that sag.
 */
export interface DeckchairState {
  color: string
  /** How far the far deck is: a cell of water, or two. */
  far: 1 | 2
}

/** The deck's end, and the sand the chair stands on. */
const EDGE = -0.24
const SAND = 0.5
/** The pin the frames cross on; their reach from it, up to the tops and down to the feet. */
const PIN_X = 0.2
const BACK = 0.47
const SEAT = 0.27
const LEG = 0.25
/** The frames' angle off the sand: set up, and snapped shut. */
const OPEN = 0.5
const SHUT = 1.49
/** The canvas, top bar to front bar, and how thick it is drawn. */
const CLOTH = 0.78
const THICK = 0.07
const BANDS = 7

/** The chair's frame at angle `a`: the two tops, the pin and the two feet. */
function frameAt(a: number): { back: Pt; front: Pt; pin: Pt; footE: Pt; footW: Pt } {
  const pinY = SAND - LEG * Math.sin(a)
  return {
    back: [PIN_X - BACK * Math.cos(a), pinY - BACK * Math.sin(a)],
    front: [PIN_X + SEAT * Math.cos(a), pinY - SEAT * Math.sin(a)],
    pin: [PIN_X, pinY],
    footE: [PIN_X + LEG * Math.cos(a), SAND],
    footW: [PIN_X - LEG * Math.cos(a), SAND],
  }
}

/**
 * The canvas between two bars: a parabola of the cloth's own length. `n`
 * points from the back bar to the front bar; the sag is whatever takes up
 * the slack, found by bisection on the curve's length.
 */
function clothBetween(a: Pt, b: Pt, n = 18): Pt[] {
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1])
  const curve = (sag: number): Pt[] => {
    const pts: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const u = i / n
      pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sag * 4 * u * (1 - u)])
    }
    return pts
  }
  if (chord >= CLOTH) return curve(0)
  const lengthOf = (pts: Pt[]) => pts.reduce((sum, q, i) => (i ? sum + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), 0)
  let lo = 0
  let hi = CLOTH
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (lengthOf(curve(mid)) < CLOTH) lo = mid
    else hi = mid
  }
  return curve((lo + hi) / 2)
}

/** The ball's way down the canvas set up: a radius off the cloth, from the top bar to the bottom of the sag. */
const DOWN: Pt[] = (() => {
  const f = frameAt(OPEN)
  const cloth = clothBetween(f.back, f.front, 36)
  const low = cloth.reduce((best, q, i) => (q[1] > cloth[best][1] ? i : best), 0)
  const off = R + THICK / 2
  return cloth.slice(0, low + 1).map(([x, y], i): Pt => {
    const a = cloth[Math.max(0, i - 1)]
    const b = cloth[Math.min(cloth.length - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    return [x + ((b[1] - a[1]) / len) * off, y - ((b[0] - a[0]) / len) * off]
  })
})()

/** Off the deck onto the top of the canvas, down it into the sag, a beat, and the snap. */
const SLIDE = 0.2
const SETTLE = 0.2
const T_SEAT = (DOWN[0][0] + 0.5) / ROLL + SLIDE
const FIRE = T_SEAT + SETTLE
/** The jaw shuts in this long; the ball is clear of the front bar well inside it. */
const SNAP = 0.13
const SPIT = 0.07
const FLIGHT = 0.42
const LOFT = 0.42
/** Shut, it stands this long, and takes this long to keel over. */
const STAND = 0.45
const KEEL = 0.5

/** The frames' angle at `t`. */
const angleAt = (t: number): number => (t < FIRE ? OPEN : lerp(OPEN, SHUT, easeInQuad(over(t, FIRE, FIRE + SNAP))))
/** How far it has keeled over about its east foot, in radians. */
const tipAt = (t: number): number => (Math.PI / 2 - 0.06) * easeInQuad(over(t, FIRE + SNAP + STAND, FIRE + SNAP + STAND + KEEL))

const REST = DOWN[DOWN.length - 1]
/** Where the closing wedge has pushed the ball to when it lets it go: up the pocket, level with the front bar. */
const SPAT: Pt = (() => {
  const f = frameAt(lerp(OPEN, SHUT, easeInQuad(SPIT / SNAP)))
  return [PIN_X + 0.03, f.front[1] - R * 0.4]
})()

function laneTo(far: 1 | 2): Lane {
  const land: Pt = [far + 0.12, 0]
  // Off the planks onto the top of the canvas, and down it: quick down the slope, all its way taken off it in the sag.
  const n = DOWN.length - 1
  const down: Seg[] = [roll([-0.5, 0], DOWN[0], ROLL), ...chain(DOWN, SLIDE, (i) => (i > n - 5 ? 1.15 - 0.2 * (i - (n - 5)) : 1.15))]
  return {
    segs: [
      ...down,
      // The thump: the sag gives under it and comes back.
      { from: REST, to: [REST[0], REST[1] + 0.02], dur: SETTLE * 0.3, ease: 'out' },
      { from: [REST[0], REST[1] + 0.02], to: REST, dur: SETTLE * 0.7, ease: 'inout' },
      // Squeezed up the closing pocket, faster and faster, and spat out of the top.
      { from: REST, to: SPAT, dur: SPIT, ease: 'in' },
      fly(SPAT, land, FLIGHT, LOFT),
      fly(land, [land[0] + 0.1, 0], 0.06, 0.015),
      ramp([land[0] + 0.1, 0], [far + 0.5, 0], far === 1 ? 1.7 : 2.2, ROLL),
    ],
    fire: FIRE,
  }
}
const LANES = { 1: laneTo(1), 2: laneTo(2) }

/** A frame member from a to b: a batten, all ink at this size. */
function batten(p: p5, k: number, ink: string, weight: number, a: Pt, b: Pt): void {
  outline(p, ink, weight * 1.5)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** The canvas along `pts`: a band of cloth in stripes, colour and paper by turns, one ink line round it. */
function canvas(p: p5, k: number, ink: string, weight: number, color: string, bg: string, pts: Pt[]): void {
  const n = pts.length - 1
  const normal = (i: number): Pt => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [(-(b[1] - a[1]) / len) * (THICK / 2), ((b[0] - a[0]) / len) * (THICK / 2)]
  }
  const strip = (i0: number, i1: number) => {
    p.beginShape()
    for (let i = i0; i <= i1; i++) p.vertex((pts[i][0] + normal(i)[0]) * k, (pts[i][1] + normal(i)[1]) * k)
    for (let i = i1; i >= i0; i--) p.vertex((pts[i][0] - normal(i)[0]) * k, (pts[i][1] - normal(i)[1]) * k)
    p.endShape(p.CLOSE)
  }
  p.noStroke()
  for (let b = 0; b < BANDS; b++) {
    p.fill(b % 2 ? bg : color)
    strip(Math.round((b * n) / BANDS), Math.round(((b + 1) * n) / BANDS))
  }
  outline(p, ink, weight * 0.7)
  strip(0, n)
}

export const deckchair = definePiece<DeckchairState>({
  name: 'deckchair',
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    for (const far of rankBy(rng, [1, 2] as const, () => 1)) {
      const cells: Pt[] = [[0, 0]]
      for (let i = 1; i <= far; i++) cells.push([i, 0])
      const exit: Pt = [far + 1, 0]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: LANES[far], state: { color: bodyColor(theme, color, ball.color), far } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const x1 = s.far + 0.5
    const east = s.far - 0.1
    const f = frameAt(angleAt(t))
    const tip = tipAt(t)

    // The two piers, and the sand under the shallows.
    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, -0.38)
    rail(p, k, ink, weight, east, x1)
    piling(p, k, ink, weight, east + 0.12)
    seabed(p, k, ink, weight, -0.5, x1, SAND)

    // The chair, in its own frame: shut, it keels over about its east foot, canvas and all.
    p.push()
    p.translate(f.footE[0] * k, f.footE[1] * k)
    p.rotate(tip)
    p.translate(-f.footE[0] * k, -f.footE[1] * k)
    // The frames behind the canvas: the back, from its top bar down to the east foot, and the seat, from the front bar to the west foot.
    batten(p, k, ink, weight, f.back, f.footE)
    batten(p, k, ink, weight, f.front, f.footW)
    if (tip === 0) {
      // The strut: from a third of the way down the back to its notch on the seat's tail; knocked out, it hangs down the back.
      const hinge: Pt = [lerp(f.back[0], f.pin[0], 0.3), lerp(f.back[1], f.pin[1], 0.3)]
      const notch: Pt = [lerp(f.pin[0], f.footW[0], 0.62), lerp(f.pin[1], f.footW[1], 0.62)]
      const out = easeOutQuad(over(t, FIRE, FIRE + 0.05))
      const hang: Pt = [hinge[0] + 0.02, hinge[1] + Math.hypot(notch[0] - hinge[0], notch[1] - hinge[1])]
      outline(p, ink, weight)
      p.line(hinge[0] * k, hinge[1] * k, lerp(notch[0], hang[0], out) * k, lerp(notch[1], hang[1], out) * k)
    }
    canvas(p, k, ink, weight, s.color, bg, clothBetween(f.back, f.front))
    // The two bars the canvas is slung from, end on.
    solid(p, ink, weight, bg)
    p.circle(f.back[0] * k, f.back[1] * k, 0.055 * k)
    p.circle(f.front[0] * k, f.front[1] * k, 0.055 * k)
    p.pop()

    // The shallows, in front of its legs; a slap of water where it comes down.
    water(p, k, ink, weight, -0.5, x1)
    const down = FIRE + SNAP + STAND + KEEL
    splash(p, k, seaWater(theme), weight, f.footE[0] + 0.35, WATER, clamp((t - down + 0.06) / 0.5), 0.9)
  },
})
