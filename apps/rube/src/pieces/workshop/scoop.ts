import { outline, solid, teeth } from '../../../../../src/core/draw'
import { easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, rail, ramp, type Lane, type Pt, type Seg } from '../../parts'

/**
 * A bucket wheel. The ball rolls off the end of the rail into the top cup;
 * its weight turns the wheel, faster and faster, and the cup carries it
 * round the far side, its walls holding it in as the mouth tips over, until
 * near the bottom the mouth faces down and the ball drops out onto the rail
 * below — one floor down and facing back the way it came. The wheel,
 * unloaded, coasts the last of the half turn and the pawl catches it on
 * the hub's ratchet. Four cups on a hub inside a rim, on a post: a half
 * turn leaves the wheel exactly as it was.
 *
 * The cup's angle and the ball's path are built from the same curve, so
 * the ball sits in its seat for the whole ride.
 */
const CY = 0.49
const RIM = 0.4
/** The cups' seats are this far from the hub. */
const PATH = 0.25
/** A cup is a U round the seat: a bowl on the hub side, two walls reaching out toward the rim. */
const CUP = R + 0.02
const LIP = 0.075
const CUPS = 4
/** The wheel's angle, from the top, at which the mouth faces down enough for the ball to drop out. */
const OUT = (150 / 180) * Math.PI
/** Seconds under the ball's weight, from the top to OUT. The landing gives the wheel a kick, then the weight takes hold. */
const LOADED = 1.0
const KICK = 0.25
/** Coasting on to the half turn, starting at the loaded phase's final pace. */
const COAST = (LOADED * (Math.PI - OUT)) / ((1 + (1 - KICK)) * OUT)
const TURN = LOADED + COAST
/** The rail in ends here and the ball lobs off it into the cup. */
const EDGE = -CUP - 0.03
const V_IN = 1.2
const DROP = 0.12
/** Cartoon gravity for the drop out of the cup. */
const G = 14
/** The ratchet on the hub, and where the pawl's tip rests on it. */
const RATCHET = 0.07
const PAWL_AT = 0.95
const PIVOT: Pt = [0, CY + 0.14]

/** The seat of the cup that started at the top, once the wheel has turned by `a`. */
const seat = (a: number): Pt => [PATH * Math.sin(a), CY - PATH * Math.cos(a)]

/** The loaded phase's curve, 0 → 1: a kick from the landing, then ever faster under the weight. */
const loaded = (u: number): number => KICK * u + (1 - KICK) * u * u
/** Its inverse: when the wheel reaches fraction `f` of OUT. */
const loadedAt = (f: number): number => (-KICK + Math.sqrt(KICK * KICK + 4 * (1 - KICK) * f)) / (2 * (1 - KICK))

/** How far the wheel has turned, `since` seconds after the ball landed in the cup. */
const angleAt = (since: number): number => {
  if (since < 0) return 0
  if (since < LOADED) return OUT * loaded(since / LOADED)
  if (since < TURN) return OUT + (Math.PI - OUT) * easeOutQuad((since - LOADED) / COAST)
  const s = since - TURN
  return Math.PI + 0.05 * Math.exp(-s * 5) * Math.sin(s * 28)
}

/**
 * The ride, as chords round the seat's circle whose ends are reached at
 * exactly the moments the wheel's own curve puts the cup there.
 */
function ride(n: number): Seg[] {
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) {
    const t0 = LOADED * loadedAt(i / n)
    const t1 = LOADED * loadedAt((i + 1) / n)
    segs.push({ from: seat((OUT * i) / n), to: seat((OUT * (i + 1)) / n), dur: t1 - t0 })
  }
  return segs
}

/** One cup in its own frame: the seat at the origin, the hub down +y. A U open outward. */
function cup(p: import('p5'), k: number, ink: string, weight: number, color: string): void {
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex(-CUP * k, -LIP * k)
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (Math.PI * i) / 12
    p.vertex(Math.cos(a) * CUP * k, Math.sin(a) * CUP * k)
  }
  p.vertex(CUP * k, -LIP * k)
  p.endShape()
}

export const scoop = definePiece<{ color: string }>({
  name: 'scoop',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    const edge: Pt = [EDGE, 0]
    const top = seat(0)
    // Off the rail's end on a parabola that starts level and lands in the seat.
    const lob = fly(edge, top, -EDGE / V_IN, top[1] / 4)
    const out = seat(OUT)
    const land: Pt = [out[0] - 0.05, 1]
    const skipTo: Pt = [land[0] - 0.16, 1]
    const lane: Lane = {
      segs: [
        ramp([-0.5, 0], edge, ROLL, V_IN),
        lob,
        ...ride(20),
        { from: out, to: land, dur: DROP, arc: (G * DROP * DROP) / 8 },
        fly(land, skipTo, 0.08, 0.02),
        ramp(skipTo, [-0.5, 1], 2.0, ROLL),
      ],
      fire: (0.5 + EDGE) / ((ROLL + V_IN) / 2) + lob.dur,
    }
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const angle = angleAt(since)

    // The rail in stops short of the top cup; the rail out runs under the wheel; the post the wheel turns on.
    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, -0.5, 0.3, 1 + FLOOR)
    outline(p, ink, weight)
    p.line(0, CY * k, 0, 1.5 * k)
    p.line(-0.12 * k, 1.5 * k, 0.12 * k, 1.5 * k)

    // The pawl on the post, its tip on the ratchet; it lifts as each tooth goes by.
    let click = 0
    for (let i = 0; i < 8; i++) {
      const at = angle + (i * Math.PI * 2) / 8
      const d = Math.atan2(Math.sin(at - PAWL_AT), Math.cos(at - PAWL_AT))
      click = Math.max(click, Math.exp(-(d / 0.12) * (d / 0.12)))
    }
    const tip: Pt = [Math.cos(PAWL_AT) * (RATCHET + 0.015), CY + Math.sin(PAWL_AT) * (RATCHET + 0.015)]
    const arm = Math.hypot(tip[0] - PIVOT[0], tip[1] - PIVOT[1])
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(Math.atan2(tip[1] - PIVOT[1], tip[0] - PIVOT[0]) + 0.35 * click)
    solid(p, ink, weight, s.color)
    p.rect((arm / 2) * k, 0, (arm + 0.02) * k, 0.04 * k, 0.012 * k)
    p.pop()

    p.push()
    p.translate(0, CY * k)
    p.rotate(angle)
    // The rim, the cups on the hub, and the ratchet the hub turns.
    outline(p, ink, weight)
    p.circle(0, 0, RIM * 2 * k)
    for (let i = 0; i < CUPS; i++) {
      p.push()
      p.translate(0, -PATH * k)
      cup(p, k, ink, weight, s.color)
      p.pop()
      p.rotate((Math.PI * 2) / CUPS)
    }
    solid(p, ink, weight, bg)
    p.circle(0, 0, RATCHET * 2 * k)
    outline(p, ink, weight)
    teeth(p, RATCHET * k, 8, 0.02 * k)
    p.pop()
    p.fill(ink)
    p.noStroke()
    p.circle(0, CY * k, 0.04 * k)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.04 * k)
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The near side of the cup the ball rides in, so the ball sits *in* it.
    p.push()
    p.translate(0, CY * k)
    p.rotate(angleAt(since))
    p.translate(0, -PATH * k)
    solid(p, ink, weight, s.color)
    p.arc(0, 0, CUP * 2 * k, CUP * 2 * k, 0, Math.PI, p.OPEN)
    p.pop()
  },
})
