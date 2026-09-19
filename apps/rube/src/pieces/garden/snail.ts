import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, mixHex, over, rail, ramp, wait, type Lane, type Pt, type Seg } from '../../parts'
import { soil } from './green'

/**
 * A snail on the path, watching the ball come. Its body runs back from
 * under the shell to a thin tail and sweeps up the shell's back, and the
 * ball rolls up that sweep and over the top of the shell, with just enough
 * in it to stop there. The eyes go in at the weight. Then the snail sets
 * off, in no hurry at all: the head reaches forward, the shell follows, the
 * tail catches up, three times over, and a glossy trail is left behind.
 *
 * It stops. The eyes come out, and turn up to look at what it has been
 * carrying. That will do. It bows: the head goes down and in, the body
 * heaves the shell forward over it, and the ball is thrown off the front,
 * over the ducked head, and drops to the path beyond. The snail straightens
 * up and puts its eyes out to watch it go.
 *
 * The ball's whole way is worked out from the same shapes the snail is
 * drawn with, under one gravity: up the sweep and over the shell as far as
 * its speed will carry it, forward with the tipping shell until it comes
 * away, and a fall from there to the path.
 */

/* ------------------------------------------------------------------ the snail */

/** The shell: its radius, and its centre, on the foot a little above the path. */
const SR = 0.17
const CY = FLOOR - 0.025 - SR
/** The ball on top of the shell. */
const RIDE = CY - SR - R
/** The body, from the shell's centre line: the tail's tip, the foot's thickness, the head. */
const TAIL = -0.5
const FOOT = 0.06
const HEAD = 0.3
const HEAD_R = 0.06
/** How high the head is carried on its neck, how low it goes for the bow, and how far it pulls in. */
const HEAD_UP = 0.16
const HEAD_DOWN = 0.06
const TUCK = 0.1
/** Where the tail curls up to meet the back of the shell, as an angle on the shell (y down, π straight back). */
const JOIN = Math.PI + 0.22
/** The shell tips forward about its front foot. */
const PIVOT: Pt = [0.1, FLOOR - 0.025]

/** Gravity, cells per second squared, for the climb, the roll and the fall alike; and how hard the shell grips the ball. */
const G = 10
const GRIP = 30
/** The snail's way along the path: from here, this far, in this many pulls. */
const START = 0
const CRAWL_D = 0.72
const END = START + CRAWL_D
const PULLS = 3
const CRAWL = 1.2
/** The head leads each pull, and the tail follows, by this long. */
const LEAD = 0.13
/** Settling under the ball; looking up at it; the bow, and how far the shell tips. */
const SETTLE = 0.22
const LOOK = 0.42
const TIP = 0.18
const TILT = 0.5
/** How long the bow is held, and the straightening up after. */
const HOLD = 0.5
const RISE = 0.5

const rot = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

/** The shell's centre when the snail is at `xs` with the shell tipped `a` forward about its front foot. */
function shellCentre(xs: number, a: number): Pt {
  const [dx, dy] = rot([-PIVOT[0], CY - PIVOT[1]], a)
  return [xs + PIVOT[0] + dx, PIVOT[1] + dy]
}

/**
 * The tail: flat along the path from its tip, then curling up the back of
 * the shell to meet it running along its surface, so a ball can roll from
 * one onto the other.
 */
function sweep(xt: number, c: Pt, a: number): [Pt, Pt, Pt, Pt] {
  const th = JOIN + a
  const j: Pt = [c[0] + SR * Math.cos(th), c[1] + SR * Math.sin(th)]
  const down = 0.75 * (FLOOR - j[1])
  return [[xt, FLOOR], [lerp(xt, j[0], 0.6), FLOOR], [j[0] + Math.sin(th) * down, j[1] - Math.cos(th) * down], j]
}

const cubic = ([a, b, c, d]: [Pt, Pt, Pt, Pt], u: number): Pt => {
  const v = 1 - u
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]
}

/* ------------------------------------------------------------------ the ball's way */

/**
 * Up the sweep and over the shell, as the snail waits at START. The ball's
 * centre is where a ball resting on the surface below it would be; its
 * speed is what is left of ROLL after the climb, so it tops out at rest.
 */
function climb(): Seg[] {
  const c = shellCentre(START, 0)
  const tail = sweep(START + TAIL, c, 0)
  const surface: Pt[] = []
  for (let i = 0; i <= 80; i++) surface.push(cubic(tail, i / 80))
  for (let i = 1; i <= 80; i++) {
    const th = JOIN + ((1.5 * Math.PI - JOIN) * i) / 80
    surface.push([c[0] + SR * Math.cos(th), c[1] + SR * Math.sin(th)])
  }
  const rest = (x: number) => {
    let y = 0
    for (const [sx, sy] of surface) {
      const dx = sx - x
      if (Math.abs(dx) < R) y = Math.min(y, sy - Math.sqrt(R * R - dx * dx))
    }
    return y
  }
  // Walk it finely, then take points evenly along the way.
  const fine: Pt[] = []
  for (let i = 0; i <= 400; i++) {
    const x = lerp(-0.5, START, i / 400)
    fine.push([x, i === 400 ? RIDE : rest(x)])
  }
  const along = [0]
  for (let i = 1; i < fine.length; i++) along.push(along[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]))
  const total = along[along.length - 1]
  const pts: Pt[] = []
  for (let n = 0, i = 0; n <= 18; n++) {
    const want = (total * n) / 18
    while (i < along.length - 2 && along[i + 1] < want) i++
    const f = clamp((want - along[i]) / (along[i + 1] - along[i] || 1))
    pts.push([lerp(fine[i][0], fine[i + 1][0], f), lerp(fine[i][1], fine[i + 1][1], f)])
  }
  // A little to spare at the top, lost in the last few hundredths of a cell.
  const lift = -RIDE + 0.03
  const speed = ([, y]: Pt) => ROLL * Math.sqrt(Math.max(0, 1 + y / lift))
  const segs: Seg[] = []
  for (let i = 1; i < pts.length; i++) segs.push(ramp(pts[i - 1], pts[i], speed(pts[i - 1]), i === pts.length - 1 ? 0 : speed(pts[i])))
  return segs
}

/** Where the snail's shell is along the path: three pulls, each eased in and out. */
const pull = (u: number) => {
  if (u >= 1) return 1
  const n = Math.floor(u * PULLS)
  return (n + easeInOutSine(u * PULLS - n)) / PULLS
}

/** How far the shell is tipped `tau` seconds into the bow. */
const tilt = (tau: number) =>
  tau <= 0 ? 0
  : tau < TIP ? TILT * easeInOutSine(tau / TIP)
  : tau < TIP + HOLD ? TILT
  : TILT * (1 - easeInOutSine(over(tau, TIP + HOLD, TIP + HOLD + RISE)))

/**
 * Off the tipping shell. The ball rides the ring round the shell's centre,
 * which moves as the shell tips; the shell's surface drags it forward while
 * it is moving faster than the ball, never holds it back, and the ball
 * keeps what it has been given. When the heave slows the shell no longer
 * holds the ball down, and it comes away with the speed the heave gave it:
 * a fall to the path, where it lands running and picks up to ROLL.
 */
function rollOff(): { segs: Seg[]; leave: number } {
  const ring = SR + R
  const dt = 1 / 480
  const centre = (tau: number) => shellCentre(END, tilt(tau))
  const pos = (tau: number, psi: number): Pt => {
    const c = centre(tau)
    return [c[0] + ring * Math.sin(psi), c[1] - ring * Math.cos(psi)]
  }
  const pivot: Pt = [END + PIVOT[0], PIVOT[1]]
  let psi = 0
  let w = 0
  let tau = 0
  let v: Pt = [0, 0]
  const segs: Seg[] = []
  let from = pos(0, 0)
  let since = 0
  while (tau < 2) {
    const c0 = centre(tau - dt)
    const c1 = centre(tau)
    const c2 = centre(tau + dt)
    const acc: Pt = [(c2[0] - 2 * c1[0] + c0[0]) / (dt * dt), (c2[1] - 2 * c1[1] + c0[1]) / (dt * dt)]
    const vc: Pt = [(c2[0] - c0[0]) / (2 * dt), (c2[1] - c0[1]) / (2 * dt)]
    const e: Pt = [Math.cos(psi), Math.sin(psi)]
    const u: Pt = [Math.sin(psi), -Math.cos(psi)]
    // The shell's surface under the ball, turning about the front foot.
    const spin = (tilt(tau + dt) - tilt(tau - dt)) / (2 * dt)
    const sx = c1[0] + SR * u[0] - pivot[0]
    const sy = c1[1] + SR * u[1] - pivot[1]
    v = [vc[0] + ring * w * e[0], vc[1] + ring * w * e[1]]
    const slip = (v[0] + spin * sy) * e[0] + (v[1] - spin * sx) * e[1]
    const pull = (5 / 7) * G * Math.sin(psi) - (acc[0] * e[0] + acc[1] * e[1]) - GRIP * Math.min(0, slip)
    const normal = G * Math.cos(psi) - ring * w * w + acc[0] * u[0] + acc[1] * u[1]
    if (normal <= 0 && tau > 0) break
    w += (pull / ring) * dt
    psi += w * dt
    tau += dt
    since += dt
    if (since > 1 / 60) {
      const to = pos(tau, psi)
      segs.push({ from, to, dur: since })
      from = to
      since = 0
    }
  }
  const here = pos(tau, psi)
  if (since > 0) segs.push({ from, to: here, dur: since })
  // The fall: from where it came away, with the speed it had, to the path.
  const [vx, vy] = v
  const T = (-vy + Math.sqrt(vy * vy - 2 * G * here[1])) / G
  const land: Pt = [here[0] + vx * T, 0]
  segs.push(fly(here, land, T, (G * T * T) / 8))
  segs.push(ramp(land, [1.5, 0], vx, ROLL))
  return { segs, leave: tau + T }
}

const CLIMB = climb()
const T_TOP = CLIMB.reduce((sum, s) => sum + s.dur, 0)
const T_CRAWL = T_TOP + SETTLE
const T_STOP = T_CRAWL + CRAWL
const T_BOW = T_STOP + LOOK
const OFF = rollOff()
/** When the ball has landed and rolled clear, and the snail can look up after it. */
const T_CLEAR = T_BOW + OFF.leave + 0.08

const LANE: Lane = {
  segs: [
    ...CLIMB,
    wait([START, RIDE], SETTLE),
    ...Array.from({ length: PULLS }, (_, i): Seg => ({
      from: [START + (CRAWL_D * i) / PULLS, RIDE],
      to: [START + (CRAWL_D * (i + 1)) / PULLS, RIDE],
      dur: CRAWL / PULLS,
      ease: 'inout',
    })),
    wait([END, RIDE], LOOK),
    ...OFF.segs,
  ],
  fire: T_CRAWL,
}

/* ------------------------------------------------------------------ the piece */

export const snail = definePiece<{ color: string }>({
  name: 'snail',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // Head, shell and tail each take the pulls in turn, so the body stretches and gathers.
    const along = (lag: number) => START + CRAWL_D * pull(over(t - lag, T_CRAWL, T_STOP))
    const xs = along(0)
    const xh = along(-LEAD) + HEAD
    const xt = along(LEAD) + TAIL
    const a = tilt(t - T_BOW)
    const bow = a / TILT
    const c = shellCentre(xs, a)
    const body = mixHex(s.color, bg, 0.62)

    rail(p, k, ink, weight, -0.5, 1.5)
    soil(p, k, ink, weight, -0.5, 1.5)

    // The trail, from where the tail was to where it is: a glossy ribbon, a bead where each pull ended.
    const x0 = START + TAIL
    if (xt > x0 + 0.01) {
      p.push()
      const slime = p.color(mixHex(s.color, bg, 0.3))
      slime.setAlpha(150)
      p.stroke(slime)
      p.strokeCap(p.ROUND)
      p.strokeWeight(0.045 * k)
      p.line(x0 * k, (FLOOR - 0.018) * k, xt * k, (FLOOR - 0.018) * k)
      p.noStroke()
      p.fill(slime)
      for (let i = 1; i < PULLS; i++) {
        const bx = x0 + (CRAWL_D * i) / PULLS
        if (bx < xt - 0.04) p.ellipse(bx * k, (FLOOR - 0.03) * k, 0.07 * k, 0.05 * k)
      }
      const gloss = p.color(bg)
      gloss.setAlpha(200)
      p.stroke(gloss)
      p.strokeWeight(0.012 * k)
      p.line((x0 + 0.03) * k, (FLOOR - 0.028) * k, Math.max(x0 + 0.03, xt - 0.06) * k, (FLOOR - 0.028) * k)
      p.pop()
    }

    // The head, carried up on its neck, or down and pulled in for the bow.
    const headY = FLOOR - lerp(HEAD_UP, HEAD_DOWN, bow)
    const hx = xh - TUCK * bow
    const out =
      t < T_TOP - 0.04 ? 1
      : t < T_STOP ? lerp(1, 0.18, clamp((t - T_TOP + 0.04) / 0.08))
      : t < T_BOW ? lerp(0.18, 1, easeInOutSine(over(t, T_STOP, T_STOP + 0.2)))
      : t < T_CLEAR ? lerp(1, 0.3, clamp((t - T_BOW) / 0.08))
      : lerp(0.3, 1, easeInOutSine(over(t, T_CLEAR, T_CLEAR + 0.25)))
    const up = easeInOutSine(over(t, T_STOP + 0.1, T_STOP + 0.3)) * (1 - over(t, T_BOW, T_BOW + 0.1))
    const aim = -1.15 - 0.55 * up + 0.35 * bow
    const ball = laneAt(LANE, t)
    const eye = (dx: number, len: number) => {
      const bx = hx + dx
      const by = headY - HEAD_R * 0.85
      const ex = bx + Math.cos(aim) * len * out
      const ey = by + Math.sin(aim) * len * out
      outline(p, ink, weight)
      p.line(bx * k, by * k, ex * k, ey * k)
      solid(p, ink, weight, bg)
      p.circle(ex * k, ey * k, 0.06 * k)
      // The pupils follow the ball while it is near, and look ahead otherwise.
      const near = t > -0.5 && t < T_BOW + OFF.leave + 0.4
      const lx = near ? ball.x - ex : 1
      const ly = near ? ball.y - ey : 0.15
      const d = Math.hypot(lx, ly) || 1
      p.fill(ink)
      p.noStroke()
      p.circle((ex + (0.013 * lx) / d) * k, (ey + (0.013 * ly) / d) * k, 0.026 * k)
    }

    // The far stalk, behind the head.
    eye(-0.04, 0.19)

    // The body: along the path from the tail to the chin, up the neck and over the head, down under the shell, and the tail curling up its back.
    const [t0, c1, c2, j] = sweep(xt, c, a)
    const r = HEAD_R
    solid(p, ink, weight, body)
    p.beginShape()
    p.vertex(xt * k, FLOOR * k)
    p.vertex((hx + 0.08) * k, FLOOR * k)
    p.bezierVertex((hx + 0.12) * k, (FLOOR - 0.05) * k, (hx + r + 0.03) * k, (headY + 0.03) * k, (hx + r) * k, headY * k)
    p.bezierVertex((hx + r) * k, (headY - r * 1.35) * k, (hx - r) * k, (headY - r * 1.35) * k, (hx - r) * k, headY * k)
    p.bezierVertex((hx - r) * k, (headY + 0.06) * k, (hx - 0.1) * k, (FLOOR - FOOT) * k, (xs + 0.08) * k, (FLOOR - FOOT) * k)
    p.vertex(j[0] * k, j[1] * k)
    p.bezierVertex(c2[0] * k, c2[1] * k, c1[0] * k, c1[1] * k, t0[0] * k, t0[1] * k)
    p.endShape(p.CLOSE)

    // The shell, and its spiral from the mouth at the front of its foot, round and in.
    solid(p, ink, weight, s.color)
    p.circle(c[0] * k, c[1] * k, SR * 2 * k)
    outline(p, ink, weight)
    p.noFill()
    p.beginShape()
    for (let i = 0; i <= 40; i++) {
      const f = i / 40
      const th = 0.9 + a - f * Math.PI * 2.4
      const r = SR * (0.94 - 0.8 * f)
      p.vertex((c[0] - 0.012 * f + Math.cos(th) * r) * k, (c[1] - 0.012 * f + Math.sin(th) * r) * k)
    }
    p.endShape()

    // The near stalk, in front.
    eye(0.01, 0.22)
  },
})
