import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, mixHex, post, rail, ramp, rankBy, trace, type Lane, type Pt } from '../../../parts'
import { gardenGreen, leaf, nearestHue, soil, tuft } from '../../../pieces/garden/green'

/**
 * A Venus flytrap on a tall stalk, rooted a floor down. Its trap gapes at
 * the path's end like a jaw: the lower lobe held level with the path, the
 * upper, a dome, thrown back, and a row of teeth along the near rim of
 * each. The ball rolls onto the lower lobe and stops among the trigger
 * hairs; they bend; the dome snaps down over it and the teeth lace shut in
 * front of the ball, which is seen through them from there on, the trap cut
 * open to us the way the chest and the pond are. A caught ball is heavy: the
 * stalk bows over under it, slowly and then not, and lowers the shut trap a
 * whole floor, the head coming round to face on when that is the way the
 * ball is to go. It sways to a stop with its chin on the path below; the
 * trap gapes again and the ball rolls out down the lower lobe and away.
 * The plant stays bowed, its mouth open on the path.
 *
 * The head is one thing in its own frame: where its seat is, how far it has
 * come round, how wide it gapes, how far its chin has dropped about the
 * hinge. The ball is on the lower lobe in that frame, so the lane is the
 * head's own motion until the lobe lets it go.
 */
export interface FlytrapState {
  color: string
  mouth: string
  turn: 1 | -1
}

/** The trap, along the lower lobe from the ball's seat: the hinge behind it, the tip before it; and how thick a lobe is. */
const HINGE = 0.25
const TIP = -0.27
const JAW = HINGE - TIP
const LOBE = 0.07
/** The dome's crown over the lower lobe when it is shut, and how far it is thrown back, radians. */
const CROWN = 2 * R + 0.06
const GAPE = 0.95
/** The root of the stalk, on the ground a floor down. */
const ROOT: Pt = [0.06, 1.5]
/** The path's end, a hair short of the lower lobe's tip. */
const RAIL_END = TIP - 0.015
/** How far the chin drops about the hinge once the trap is down, radians: the slope the ball rolls out down. */
const DROOP = 0.17
/** The seat stops this far short of a whole floor, so the dropped chin comes down level with the path below. */
const SHORT = JAW * Math.sin(DROOP)

const ARRIVE = arriveAt(0)
const SNAP = ARRIVE + 0.12
const SNAP_T = 0.07
const BOW = SNAP + 0.24
const BOW_T = 0.95
const LANDS = BOW + BOW_T
const OPENS = LANDS + 0.12
const OPEN_T = 0.16
const SHEDS = OPENS + 0.07
/** How hard the ball is sent down the dropped lobe, cells a second squared. */
const SHED = 7
const LEAVES = SHEDS + Math.sqrt((2 * -TIP) / SHED)

interface Head {
  /** The ball's seat: its centre when it sits in the middle of a level lower lobe. */
  at: Pt
  /** 1 with the mouth toward the way the ball came, -1 come right round, and edge on between. */
  face: number
  /** How far the dome is thrown back, radians, and how far the chin has dropped. */
  open: number
  droop: number
}

function headAt(t: number, turn: 1 | -1): Head {
  const shut = t < SNAP ? 0 : easeOutQuad(clamp((t - SNAP) / SNAP_T)) - 0.07 * Math.exp(-(t - SNAP) * 16) * Math.sin((t - SNAP) * 48)
  const again = t < OPENS ? 0 : 0.8 * (easeOutQuad(clamp((t - OPENS) / OPEN_T)) + 0.1 * Math.exp(-(t - OPENS) * 8) * Math.sin((t - OPENS) * 22))
  const open = GAPE * (t < OPENS ? 1 - shut : again)
  // The lobe gives a hair as the ball comes onto it, and jumps at the snap.
  const give = 0.012 * clamp((t - ARRIVE + 0.1) / 0.1) + (t < SNAP ? 0 : 0.014 * Math.exp(-(t - SNAP) * 10) * Math.sin((t - SNAP) * 38))
  if (t < BOW) return { at: [0, give], face: 1, open, droop: 0 }
  // Slowly and then not, and a sway where it stops.
  const u = clamp((t - BOW) / BOW_T)
  const f = 0.3 * u * u * u + 0.7 * u * u * (3 - 2 * u)
  const after = Math.max(0, t - LANDS)
  const sway = 0.03 * Math.exp(-after * 5) * Math.sin(after * 13)
  const round = turn > 0 ? Math.cos(Math.PI * easeInOutSine(clamp((u - 0.12) / 0.62))) : 1
  return { at: [0, 0.012 + (1 - SHORT - 0.012) * f + sway], face: round, open, droop: DROOP * easeInOutSine(clamp((u - 0.5) / 0.5)) }
}

/** How far down the lower lobe from its seat the ball is at piece time `t`. */
const alongAt = (t: number): number => (t < SHEDS ? 0 : Math.min(-TIP, 0.5 * SHED * Math.pow(t - SHEDS, 2)))

/** The ball: a radius off the lower lobe, which drops about the hinge, in a head that may have come round. */
function ballAt(t: number, turn: 1 | -1): Pt {
  const h = headAt(t, turn)
  const r = HINGE + alongAt(t)
  const x = HINGE - r * Math.cos(h.droop) - R * Math.sin(h.droop)
  const y = r * Math.sin(h.droop) - R * Math.cos(h.droop)
  return [h.at[0] + h.face * x, h.at[1] + R + y]
}

function laneFor(turn: 1 | -1): Lane {
  return {
    segs: [
      ...arrive([-0.5, 0], [0, 0]),
      ...trace((t) => ballAt(t, turn), ARRIVE, LEAVES, Math.round((LEAVES - ARRIVE) * 70)),
      ramp(ballAt(LEAVES, turn), [turn * 0.5, 1], SHED * (LEAVES - SHEDS), ROLL),
    ],
    fire: SNAP,
  }
}
const LANES: Record<string, Lane> = { '1': laneFor(1), '-1': laneFor(-1) }

/** The lower lobe in the head's frame: a shallow dish seen from the side, hinge at the right, its inside along y = 0. */
function lowerLobe(p: p5, k: number): void {
  p.beginShape()
  p.vertex(HINGE * k, 0)
  p.vertex(TIP * k, 0)
  p.bezierVertex((TIP + 0.02) * k, LOBE * 1.1 * k, (TIP + 0.18) * k, LOBE * 1.35 * k, 0.03 * k, LOBE * 1.3 * k)
  p.bezierVertex(0.16 * k, LOBE * 1.25 * k, HINGE * k, LOBE * 0.8 * k, HINGE * k, 0)
  p.endShape(p.CLOSE)
}

/** The dome, shut, in the head's frame: its far half, inside showing, from the hinge over the crown to the tip. */
function dome(p: p5, k: number, ink: string, weight: number, skin: string, inside: string): void {
  const mid = (HINGE + TIP) / 2
  const arch = (lift: number) => {
    p.beginShape()
    p.vertex(HINGE * k, 0)
    p.bezierVertex((HINGE + 0.015) * k, -lift * 0.75 * k, (mid + 0.14) * k, -lift * k, mid * k, -lift * k)
    p.bezierVertex((mid - 0.14) * k, -lift * k, (TIP - 0.015) * k, -lift * 0.75 * k, TIP * k, 0)
    p.endShape(p.CLOSE)
  }
  solid(p, ink, weight, skin)
  arch(CROWN + LOBE)
  solid(p, ink, weight * 0.8, inside)
  arch(CROWN - 0.01)
}

/** The teeth along a near rim in the head's frame, standing `len` off it; `side` 1 stands them up off the lower lobe. */
function teeth(p: p5, k: number, side: 1 | -1, len: number): void {
  for (let i = 0; i < 5; i++) {
    const x = TIP + 0.04 + i * 0.09 + (side > 0 ? 0 : 0.045)
    p.line(x * k, 0, (x - 0.012) * k, -side * len * k)
  }
}

/** Into the head's frame: the seat's foot on the lower lobe, the head come round, the chin dropped about the hinge. */
function inHead(p: p5, k: number, h: Head): void {
  p.translate(h.at[0] * k, (h.at[1] + R) * k)
  // Edge on it is still a thing with a thickness.
  p.scale(Math.sign(h.face || 1) * Math.max(0.12, Math.abs(h.face)), 1)
  p.translate(HINGE * k, 0)
  p.rotate(-h.droop)
  p.translate(-HINGE * k, 0)
}

export const flytrap = definePiece<FlytrapState>({
  name: 'flytrap',
  weight: 1,
  place: ({ rng, fits, theme, ball }) => {
    for (const turn of rankBy(rng, [1, -1] as const, () => 1)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      const exit: Pt = [turn, 1]
      if (!fits(cells, exit)) continue
      // A flytrap is green outside and red inside, whatever the map hands the piece; a ball of either meets a deeper one.
      const green = gardenGreen(theme)
      const red = nearestHue(theme, 355, undefined, 50)
      return {
        cells,
        exit: { at: exit, dir: turn },
        lane: LANES[String(turn)],
        state: { color: ball.color === green ? mixHex(green, theme.ink, 0.28) : green, mouth: red === ball.color ? mixHex(red, theme.ink, 0.3) : red, turn },
      }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const { turn } = s
    const h = headAt(t, turn)
    // The ground a floor down, the path in on its long stake, and the path out below, where the chin comes down.
    soil(p, k, ink, weight, -0.5, 0.5, 1.5)
    tuft(p, k, ink, weight, turn > 0 ? -0.3 : 0.38, 1.5, 0.1, 0.02)
    post(p, k, ink, weight, -0.44, FLOOR, 1.5)
    rail(p, k, ink, weight, -0.5, RAIL_END)
    const chin = JAW * Math.cos(DROOP) - HINGE + 0.015
    if (turn > 0) {
      rail(p, k, ink, weight, chin, 0.5, 1 + FLOOR)
      post(p, k, ink, weight, 0.43, 1 + FLOOR, 1.5)
    } else rail(p, k, ink, weight, -0.5, -chin, 1 + FLOOR)

    // The stalk, from its rosette to the hinge: bowed further the lower the head has come.
    const hinge: Pt = [h.at[0] + h.face * HINGE, h.at[1] + R + LOBE * 0.4]
    leaf(p, k, ink, weight, s.color, ROOT[0], ROOT[1] - 0.012, 0.27, -0.3, 0.34)
    leaf(p, k, ink, weight, s.color, ROOT[0], ROOT[1] - 0.012, 0.25, Math.PI + 0.35, 0.34)
    const low = clamp(h.at[1])
    const side = turn > 0 ? 1 - 2 * low : 1
    outline(p, ink, weight * 1.5)
    p.noFill()
    p.bezier(ROOT[0] * k, ROOT[1] * k, (ROOT[0] + 0.12 * side) * k, (0.85 - 0.55 * low) * k, (hinge[0] + side * (0.1 + 0.25 * low)) * k, (hinge[1] + 0.45 - 1.0 * low) * k, hinge[0] * k, hinge[1] * k)

    // The head, behind the ball: the dome with its inside showing, thrown back or shut, and the lower lobe.
    p.push()
    inHead(p, k, h)
    p.push()
    p.translate(HINGE * k, 0)
    p.rotate(h.open)
    p.translate(-HINGE * k, 0)
    dome(p, k, ink, weight, s.color, s.mouth)
    p.pop()
    solid(p, ink, weight, s.color)
    lowerLobe(p, k)
    // The trigger hairs, bent flat by the ball.
    if (t < SNAP + 0.04) {
      const bent = clamp((t - ARRIVE + 0.18) / 0.16)
      outline(p, ink, weight * 0.7)
      for (const x of [-0.1, 0.09]) p.line(x * k, 0, (x + 0.055 * bent) * k, -0.07 * (1 - bent * 0.8) * k)
    }
    p.pop()
  },
  over: (p, _s, { k, t, ink, weight }) => {
    const h = headAt(t, _s.turn)
    // The teeth of the near rims, in front of the ball: standing apart, and laced shut.
    p.push()
    inHead(p, k, h)
    outline(p, ink, weight * 0.9)
    teeth(p, k, 1, 0.14)
    p.translate(HINGE * k, 0)
    p.rotate(h.open)
    p.translate(-HINGE * k, 0)
    teeth(p, k, -1, 0.1)
    p.pop()
  },
})
