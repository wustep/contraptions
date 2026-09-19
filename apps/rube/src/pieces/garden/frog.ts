import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, laneAt, over, post, rail, ramp, rankBy, wait, type Lane, type PieceCtx, type Pt } from '../../parts'
import { tuft } from './green'

/**
 * A frog on a lily pad, a floor or two above the path. The ball rolls onto
 * a flat stone under it and stops. The frog has watched it all the way in;
 * it leans out over the edge of its pad, its throat swells, its mouth comes
 * open — and the tongue comes down the whole drop in a blink, sticks to the
 * top of the ball, goes taut, and snaps back with the ball on the end of
 * it, up into the mouth, which shuts on it. The frog sits back with its
 * cheeks full, thinks about it, does not care for it, and — ptui — spits
 * it out along the path, on or back the way it came, and watches it go.
 *
 * The frog is one drawing in its own frame, facing the way out, leaning
 * about its front feet; where the mouth is comes from that same pose, so
 * the ball is hauled to exactly where the mouth is waiting, rides back in
 * it as the frog sits up, and leaves from between the jaws.
 */
export interface FrogState {
  color: string
  tongue: string
  floors: number
  turn: 1 | -1
}

/* ------------------------------------------------------------------ the frog, in its own frame */

/** Origin at the front feet on the pad; x toward the way out, y up the page negative. */
const FEET_X = -0.17
const HINGE: Pt = [-0.07, -0.19]
/** The ball's seat between the jaws, this far out from the hinge along the mouth. */
const SEAT = 0.12
const JAW = 0.25
/** How far it leans out over the edge to aim down the drop. */
const LEAN = 0.72

/** Where the ball sits in the mouth, in the piece's frame for a frog facing +x on floor 0, leaning by `phi`. */
function mouthAt(phi: number): Pt {
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  const hx = HINGE[0] * c - HINGE[1] * s
  const hy = HINGE[0] * s + HINGE[1] * c
  return [FEET_X + hx + SEAT * c, FLOOR + hy + SEAT * s]
}

/* ------------------------------------------------------------------ timing */

const ARRIVE = arriveAt(0)
/** The frog aims, its throat swelling; the tongue is out in SHOT and taut for STICK. */
const AIM = 0.34
const SHOT = 0.07
const STICK = 0.07
const FIRE = ARRIVE + AIM
const T_HAUL = FIRE + SHOT + STICK
const haulTime = (floors: number) => 0.2 + 0.1 * floors
/** Sitting back up with its mouth full, thinking about it, and the spit. */
const ROCK = 0.22
const HOLD = 0.3
const SPIT = 0.13
const LAND = 0.33

const lanes = new Map<string, Lane>()
function laneFor(floors: number, turn: 1 | -1): Lane {
  const key = `${floors}:${turn}`
  const had = lanes.get(key)
  if (had) return had
  const lift = ([x, y]: Pt): Pt => [turn * x, y - floors]
  const caught = lift(mouthAt(LEAN))
  const held = lift(mouthAt(0))
  const lane: Lane = {
    segs: [
      ...arrive([-0.5, 0], [0, 0]),
      wait([0, 0], AIM + SHOT + STICK),
      // Up on the tongue, faster and faster, into the mouth.
      { from: [0, 0], to: caught, dur: haulTime(floors), ease: 'in' },
      { from: caught, to: held, dur: ROCK, ease: 'inout', hidden: true },
      wait(held, HOLD, { hidden: true }),
      // Ptui: out level, dropping onto the rail.
      fly(held, [turn * LAND, -floors], SPIT, (-floors - held[1]) / 4),
      ramp([turn * LAND, -floors], [turn * 0.5, -floors], (LAND - mouthAt(0)[0]) / SPIT, ROLL),
    ],
    fire: FIRE,
  }
  lanes.set(key, lane)
  return lane
}

interface Pose {
  lean: number
  gape: number
  throat: number
  cheeks: number
  blink: number
}

function poseAt(t: number, floors: number): Pose {
  const caught = T_HAUL + haulTime(floors)
  const up = caught + ROCK
  const spit = up + HOLD
  const lean =
    t < caught ? LEAN * easeInOutSine(over(t, ARRIVE * 0.4, ARRIVE + 0.12))
    : t < up ? LEAN * (1 - easeInOutSine(over(t, caught, up)))
    // The spit rocks it back on its haunches, and it settles.
    : t < spit ? 0
    : -0.16 * Math.exp(-(t - spit) * 5) * Math.cos((t - spit) * 9)
  const gape =
    t < FIRE - 0.1 ? 0
    : t < caught ? easeOutCubic(over(t, FIRE - 0.1, FIRE))
    : t < spit - 0.04 ? 1 - over(t, caught, caught + 0.04)
    : t < spit + 0.12 ? 0.85 * easeOutCubic(over(t, spit - 0.04, spit))
    : 0.85 * (1 - easeInOutSine(over(t, spit + 0.12, spit + 0.45)))
  // It breathes all the time; the throat fills right up before the shot.
  const breath = 0.3 + 0.25 * Math.sin(t * 3.1)
  const throat = t > ARRIVE && t < FIRE ? lerp(breath, 1, easeInOutSine(over(t, ARRIVE, FIRE - 0.05))) : t >= FIRE && t < spit + 0.3 ? 0.15 : breath
  const cheeks = t < caught ? 0 : t < spit ? Math.min(1, over(t, caught, caught + 0.05)) : 1 - over(t, spit, spit + 0.06)
  // A slow blink now and then; eyes shut tight on the spit.
  const idle = ((t % 3.7) + 3.7) % 3.7
  const blink = t > spit - 0.05 && t < spit + 0.18 ? 1 : idle < 0.12 && (t < 0 || t > spit + 1) ? 1 : 0
  return { lean, gape, throat, cheeks, blink }
}

export const frog = definePiece<FrogState>({
  name: 'frog',
  weight: 1,
  flight: true,
  place: ({ rng, color, fits, taste, theme }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const tongue = rng.pick(theme.colors.filter((c) => c !== color))
      return { cells, exit: { at: exit, dir: turn }, lane: laneFor(floors, turn), state: { color, tongue, floors, turn } }
    }
    return null
  },
  draw: (p, s, c) => {
    const { k, t, ink, bg, weight } = c
    const { floors, turn } = s
    const top = -floors
    const pose = poseAt(t, floors)

    // The path in, onto the flat stone the ball stops on, with a lip at its far side; the ground.
    rail(p, k, ink, weight, -0.5, -0.17)
    solid(p, ink, weight, bg)
    p.rect(0.01 * k, (FLOOR + 0.035) * k, 0.38 * k, 0.07 * k, 0.03 * k)
    p.ellipse(0.18 * k, (FLOOR - 0.005) * k, 0.06 * k, 0.05 * k)
    post(p, k, ink, weight, 0.01, FLOOR + 0.07, 0.5)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)

    p.push()
    p.scale(turn, 1)
    // A reed up from the ground under the way out, swaying; it stops well short of the rail.
    {
      const x = 0.33
      const tipX = x + 0.02 * Math.sin(t * 1.2) * floors
      const tipY = top + 0.42
      outline(p, ink, weight)
      p.noFill()
      p.beginShape()
      p.vertex(x * k, 0.5 * k)
      p.quadraticVertex(x * k, (0.5 + tipY) * 0.5 * k, tipX * k, tipY * k)
      p.endShape()
      solid(p, ink, weight, ink)
      p.ellipse(tipX * k, (tipY + 0.09) * k, 0.05 * k, 0.15 * k)
    }
    tuft(p, k, ink, weight, 0.26, 0.5, 0.1, 0.02)
    // The way out, on a long stake.
    rail(p, k, ink, weight, 0.15, 0.5, top + FLOOR)
    post(p, k, ink, weight, 0.45, top + FLOOR, 0.5)
    // The lily pad on its stalk, up from the ground behind the path.
    outline(p, ink, weight * 1.2)
    p.noFill()
    p.beginShape()
    p.vertex(-0.36 * k, 0.5 * k)
    p.quadraticVertex(-0.42 * k, (top / 2 + 0.3) * k, -0.3 * k, (top + FLOOR + 0.04) * k)
    p.endShape()
    solid(p, ink, weight, bg)
    p.ellipse(-0.3 * k, (top + FLOOR + 0.025) * k, 0.38 * k, 0.055 * k)
    // The inside of the mouth, behind the ball: the jaws close in front of it.
    if (pose.gape > 0.02) {
      frogFrame(p, k, top, pose.lean, () => {
        const [up, down] = jaws(pose)
        p.noStroke()
        p.fill(ink)
        p.beginShape()
        p.vertex(HINGE[0] * k, HINGE[1] * k)
        p.vertex((HINGE[0] + Math.cos(-up) * JAW * 0.96) * k, (HINGE[1] + Math.sin(-up) * JAW * 0.96) * k)
        p.vertex((HINGE[0] + Math.cos(down) * JAW * 0.9) * k, (HINGE[1] + Math.sin(down) * JAW * 0.9) * k)
        p.endShape(p.CLOSE)
      })
    }
    p.pop()
  },
  over: (p, s, c) => {
    const { k, t, since, ink, weight } = c
    const { floors, turn } = s
    const top = -floors
    const pose = poseAt(t, floors)
    const lane = laneFor(floors, turn)

    p.push()
    p.scale(turn, 1)
    // The tongue: down the drop in a blink, taut on the ball, and back with it.
    const mouth = mouthAt(pose.lean)
    const root: Pt = [mouth[0] - 0.02, mouth[1] + top]
    const hauled = t - T_HAUL
    let tip: Pt | null = null
    if (since >= 0 && hauled < 0) tip = [lerp(root[0], 0, easeOutCubic(over(since, 0, SHOT))), lerp(root[1], -R, easeOutCubic(over(since, 0, SHOT)))]
    else if (hauled >= 0 && hauled < haulTime(floors)) {
      const at = laneAt(lane, t)
      tip = [turn * at.x, at.y - R]
    }
    if (tip && tip[1] > root[1] + 0.02) {
      // Slack on the way down, a line when it is pulling.
      const slack = since < SHOT ? 0.06 * Math.sin(over(since, 0, SHOT) * Math.PI) : 0
      for (const [col, w] of [
        [ink, 3.4],
        [s.tongue, 1.7],
      ] as [string, number][]) {
        p.noFill()
        p.stroke(col)
        p.strokeWeight(weight * w)
        p.beginShape()
        p.vertex(root[0] * k, root[1] * k)
        p.quadraticVertex(((root[0] + tip[0]) / 2 + slack) * k, ((root[1] + tip[1]) / 2) * k, tip[0] * k, tip[1] * k)
        p.endShape()
      }
      solid(p, ink, weight * 0.8, s.tongue)
      p.ellipse(tip[0] * k, (tip[1] + 0.012) * k, 0.1 * k, 0.05 * k)
    }

    // Where it is looking: at the ball, wherever the ball is.
    const at = laneAt(lane, clamp(t, 0, 99))
    const hidden = at.hidden
    const look: Pt = hidden ? [0.4, 0.2] : [turn * at.x - (FEET_X + 0.02), at.y - (top - 0.16)]
    frogFrame(p, k, top, pose.lean, () => body(p, s.color, c, pose, look))
    p.pop()
  },
})

/** Run `fn` in the frog's own frame: origin at its front feet on the pad, leaning about them. */
function frogFrame(p: p5, k: number, top: number, lean: number, fn: () => void): void {
  p.push()
  p.translate(FEET_X * k, (top + FLOOR) * k)
  p.rotate(lean)
  fn()
  p.pop()
}

/** How far the upper and the lower jaw swing off the mouth's line. */
const jaws = (pose: Pose): [number, number] => [0.75 * pose.gape, 0.45 * pose.gape]

/** The frog, in its own frame. `look` is where the ball is from its eye, in the piece's frame. */
function body(p: p5, color: string, { k, ink, bg, weight }: PieceCtx, pose: Pose, look: Pt): void {
  const [up, down] = jaws(pose)
  // The hind leg, folded: a fat thigh and a long foot flat on the pad. It straightens a little as the frog leans out.
  solid(p, ink, weight, color)
  p.ellipse(-0.2 * k, -0.018 * k, 0.24 * k, 0.04 * k)
  p.push()
  p.translate(-0.3 * k, -0.04 * k)
  p.rotate(-0.55 - pose.lean * 0.3)
  p.ellipse(0.09 * k, 0, 0.22 * k, 0.12 * k)
  p.pop()
  // The body, front raised.
  p.push()
  p.translate(-0.13 * k, -0.125 * k)
  p.rotate(-0.32)
  p.ellipse(0, 0, 0.38 * k, 0.23 * k)
  p.pop()
  // The front leg down to the pad, and its foot.
  outline(p, ink, weight * 3)
  p.line(-0.04 * k, -0.07 * k, 0, -0.02 * k)
  p.stroke(color)
  p.strokeWeight(weight * 1.3)
  p.line(-0.04 * k, -0.07 * k, 0, -0.02 * k)
  solid(p, ink, weight, color)
  p.ellipse(0.025 * k, -0.014 * k, 0.09 * k, 0.03 * k)

  // The throat: pale, swelling and sinking as it breathes, full before the shot, stretched round the ball after.
  const sac = 0.045 + 0.04 * pose.throat + 0.035 * pose.cheeks
  solid(p, ink, weight, bg)
  p.circle((HINGE[0] + 0.07) * k, (HINGE[1] + 0.045 + sac * 0.45) * k, sac * 2 * k)

  // The lower jaw: pale, hinged at the corner of the mouth.
  const fat = 1 + 0.7 * pose.cheeks
  p.push()
  p.translate(HINGE[0] * k, HINGE[1] * k)
  p.rotate(down)
  solid(p, ink, weight, bg)
  p.arc((JAW / 2) * k, 0, JAW * k, 0.1 * fat * k, 0, Math.PI, p.CHORD)
  p.pop()
  // The head: a dome over the mouth's line, the eye standing up out of it.
  p.push()
  p.translate(HINGE[0] * k, HINGE[1] * k)
  p.rotate(-up)
  solid(p, ink, weight, color)
  p.arc((JAW / 2 - 0.02) * k, 0, (JAW + 0.04) * k, 0.2 * (1 + 0.25 * pose.cheeks) * k, Math.PI, Math.PI * 2, p.CHORD)
  // A nostril.
  p.noStroke()
  p.fill(ink)
  p.circle((JAW - 0.035) * k, -0.04 * k, 0.014 * k)
  const ex = 0.06
  const ey = -0.105
  solid(p, ink, weight, bg)
  p.circle(ex * k, ey * k, 0.105 * k)
  if (pose.blink > 0.5) {
    solid(p, ink, weight, color)
    p.circle(ex * k, ey * k, 0.105 * k)
    outline(p, ink, weight * 0.8)
    p.line((ex - 0.04) * k, (ey + 0.005) * k, (ex + 0.04) * k, (ey + 0.005) * k)
  } else {
    // The pupil, turned toward the ball; the head's own turn is undone so it points true.
    const a = Math.atan2(look[1], look[0]) - pose.lean + up
    p.noStroke()
    p.fill(ink)
    p.ellipse((ex + Math.cos(a) * 0.022) * k, (ey + Math.sin(a) * 0.022) * k, 0.05 * k, 0.05 * k)
  }
  p.pop()
}
