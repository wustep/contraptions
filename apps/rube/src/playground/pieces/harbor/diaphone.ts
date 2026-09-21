import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, flick, fly, mixHex, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, luminance, piling, seaWater, seabed, water } from '../../../pieces/harbor/sea'

/**
 * A diaphone, a foghorn that works like a pop-gun. The deck stops, and off
 * its end a brass horn stands in deep water on a stout post. It is one bent
 * tube. At the near end a bell opens to the sky just under the deck's end,
 * like a funnel. The bore goes straight down from it, round a bend a floor
 * down, and up again as a long cone at a slant, over a crook, to a wide
 * mouth that looks out across the water at the far pier. Over the bell, from
 * a gallows stepped in the crotch of the bend, hangs a plunger as wide as
 * the bore, sat on a catch whose trip arm lies out across the bell.
 *
 * The near half of the horn is cut away, so all of it is in plain sight.
 * The ball rolls off the deck's end into the bell, knocks the trip arm
 * aside on its way in, runs down the bore and rocks to rest in the bottom
 * of the bend. The catch is gone from under the plunger. It teeters on its
 * cord, the reel lets it go, slowly and then faster and faster, into the
 * bell and down the bore, and the air shut in between it and the ball
 * darkens as it is squeezed. The plunger stops dead at the end of the
 * straight and the air goes on. The ball is shot round the bend, up the
 * cone and out of the mouth, low and fast over the open water onto the far
 * deck. The horn kicks back on its post and rings, the sea shakes where it
 * stands, the sound goes out in widening arcs, and a while later the reel
 * winds the plunger back up out of the bell and the catch swings in under
 * it.
 *
 * The ball never touches the plunger. The air does the work. The ball's
 * place along the tube's centre line is one function of time and the
 * plunger's place on the same line is another. The horn is drawn from that
 * line and the lane is traced along it, so the ball is always in the middle
 * of the bore.
 */

/** Cartoon gravity, the same as the breach's. */
const G = 22
/** Where the deck stops, and the bed of the sea, a floor down. */
const EDGE = -0.27
const BED = 1.5

/** The tube's centre line starts at the middle of the bell's rim, here, and goes straight down. */
const BX = 0.12
const RIM = 0.24
/** The bend. Its centre is this far down, which is where the straight ends, and this is its radius. */
const CY = 0.7
const RB = 0.28
/** The far arm leaves the bend rising this steeply, runs straight this far, and turns over on a crook of this radius to aim this far above the water. */
const RISE = (62 * Math.PI) / 180
const NECK = 0.74
const CROOK = 0.5
const AIM = (38 * Math.PI) / 180
/** Past the crook the mouth runs straight on, this far. */
const FLARE = 0.15
/** How far across the bore, the bell's rim and the mouth are, and how thick the brass is in the tube and at the two lips. */
const BORE = 0.34
const BELL = 0.52
const MOUTH = 0.72
const WALL = 0.09
const LIP = 0.05
/** The far arm is a cone. The bore has grown this much a side by the time it flares, and the flare takes this much of its length. */
const CONE = 0.04
const FLARED = 0.36

/** Distances along the centre line from the rim, to where the bell has narrowed to the bore, the bend's start, its bottom and its end, the crook's start and end, and the mouth. */
const S_THROAT = 0.34
const S_BEND = CY - RIM
const S_LOW = S_BEND + (RB * Math.PI) / 2
const S_ARM = S_BEND + RB * (Math.PI / 2 + RISE)
const S_CROOK = S_ARM + NECK
const S_AIM = S_CROOK + CROOK * (RISE - AIM)
const S_MOUTH = S_AIM + FLARE

/** Which way the centre line is heading at `s`, straight down, round the bend, up the neck or over the crook. */
const headingAt = (s: number): number =>
  s <= S_BEND ? Math.PI / 2 : s <= S_ARM ? Math.PI / 2 - (s - S_BEND) / RB : s <= S_CROOK ? -RISE : s <= S_AIM ? -RISE + (s - S_CROOK) / CROOK : -AIM
/** The centre line itself, walked out from the rim in small steps. */
const STEP = 0.004
const LINE: Pt[] = (() => {
  const pts: Pt[] = [[BX, RIM]]
  for (let i = 0; i * STEP < S_MOUTH + 0.1; i++) {
    const h = headingAt((i + 0.5) * STEP)
    pts.push([pts[i][0] + Math.cos(h) * STEP, pts[i][1] + Math.sin(h) * STEP])
  }
  return pts
})()
/** The point `s` along the centre line. Above the rim the line goes straight on up, which is where the plunger hangs. */
function lineAt(s: number): Pt {
  if (s <= 0) return [BX, RIM + s]
  const i = Math.min(LINE.length - 2, Math.floor(s / STEP))
  const f = s / STEP - i
  return [LINE[i][0] + (LINE[i + 1][0] - LINE[i][0]) * f, LINE[i][1] + (LINE[i + 1][1] - LINE[i][1]) * f]
}
/** Half the bore at `s`. The bell's funnel, the plain tube, a slow cone up the far arm, and the flare at the mouth. */
function boreAt(s: number): number {
  const bell = 1 - over(s, 0, S_THROAT)
  const flare = over(s, S_MOUTH - FLARED, S_MOUTH)
  return BORE / 2 + ((BELL - BORE) / 2) * bell * bell + CONE * over(s, S_ARM, S_MOUTH - FLARED) + ((MOUTH - BORE) / 2 - CONE) * flare ** 3
}
/** How thick the brass is at `s`. */
const brassAt = (s: number): number => LIP + (WALL - LIP) * Math.min(over(s, 0, S_THROAT), 1 - 0.4 * over(s, S_MOUTH - 0.2, S_MOUTH))
/** A point `off` to the side of the centre line at `s`. Positive is the outside of the bend, the horn's keel. */
function wallAt(s: number, off: number): Pt {
  const [x, y] = lineAt(s)
  const h = headingAt(s)
  return [x - Math.sin(h) * off, y + Math.cos(h) * off]
}

/** The four edges of the horn's two walls from rim to mouth. The keel's outside and inside, then the back's inside and outside. */
const EDGES = 90
const edge = (off: (s: number) => number): Pt[] => Array.from({ length: EDGES + 1 }, (_, i) => wallAt((S_MOUTH * i) / EDGES, off((S_MOUTH * i) / EDGES)))
const KEEL = edge((s) => boreAt(s) + brassAt(s))
const KEEL_IN = edge(boreAt)
const BACK_IN = edge((s) => -boreAt(s))
const BACK = edge((s) => -boreAt(s) - brassAt(s))
/** Where the keel goes down through the surface of the sea, and where it comes up through it again. */
const AWASH: number[] = KEEL.filter((pt, i) => i > 0 && KEEL[i - 1][1] < WATER !== pt[1] < WATER).map((pt) => pt[0])

/** The head of the post, under the bottom of the bend. The horn rocks about it. */
const HEAD: Pt = [BX + RB, CY + RB + BORE / 2 + WALL - 0.01]

/** Off the deck's end the ball falls under gravity, and the funnel takes its way forward off it, so that it is over the bore by the time it is in the throat. */
const T_EDGE = (EDGE + 0.5) / ROLL
const FUNNEL = 1.6
const T_DROP = (FUNNEL * (BX - EDGE)) / ROLL
const dropAt = (t: number): Pt => {
  const u = t - T_EDGE
  return [EDGE + (BX - EDGE) * (1 - (1 - over(u, 0, T_DROP)) ** FUNNEL), 0.5 * G * u * u]
}
/** It joins the centre line here, at this pace. */
const T_IN = T_EDGE + T_DROP
const S_IN = dropAt(T_IN)[1] - RIM
const V_IN = G * T_DROP

/** In the tube it is a marble in a bowl. It rocks about the bend's bottom this quickly, and the rocking dies away this fast. */
const ROCK = 10
const DAMP = 7
/** The boom. The ball has come to rest by then. */
const FIRE = T_IN + 0.6
/** Where the far deck starts, where its piling stands, and where the ball comes down on it. */
const PIER = 1.94
const PIER_POST = 2.3
const LAND: Pt = [2.16, 0]
/** The pace out of the mouth that carries a ball from there to the far deck under that gravity. */
const V_MOUTH = (() => {
  const [mx, my] = lineAt(S_MOUTH)
  const d = LAND[0] - mx
  return Math.sqrt((G * d * d) / (2 * Math.cos(AIM) ** 2 * (LAND[1] - my + Math.tan(AIM) * d)))
})()
/** The shot. The air has the ball up to pace this soon, the climb takes this much a second back off it, and so it starts out this fast to leave at the pace the flight needs. */
const SNAP = 0.03
const CLIMB = 12
const SHOT = (from: number) => CLIMB * SNAP + Math.sqrt((CLIMB * SNAP) ** 2 + V_MOUTH ** 2 + 2 * CLIMB * (S_MOUTH - from))

/** The ball along the centre line from the moment it joins it, rocking to rest and then shot. */
function ballS(t: number): number {
  const rock = (u: number) => S_LOW + Math.exp(-DAMP * u) * ((S_IN - S_LOW) * Math.cos(ROCK * u) + ((V_IN + DAMP * (S_IN - S_LOW)) / ROCK) * Math.sin(ROCK * u))
  if (t <= FIRE) return rock(t - T_IN)
  const u = t - FIRE
  const from = rock(FIRE - T_IN)
  return from + SHOT(from) * (u - SNAP * (1 - Math.exp(-u / SNAP))) - 0.5 * CLIMB * u * u
}
/** When its centre is in the plane of the mouth. */
const T_OUT = (() => {
  let t = FIRE
  while (ballS(t) < S_MOUTH) t += 0.0005
  return t
})()

/** At the boom the horn kicks back this far about the head of its post and comes back slowly. Once the ball is out it rings. */
const KICK = 0.032
const kickAt = (t: number): number => (t < FIRE ? 0 : KICK * (flick(t - FIRE, 0.06, 0.2, 1.0) + 0.4 * Math.exp(-(t - T_OUT) * 3.5) * Math.sin((t - T_OUT) * 52) * over(t, T_OUT, T_OUT + 0.04)))
/** A point of the horn, kicked. */
function kicked([x, y]: Pt, t: number): Pt {
  const a = kickAt(t)
  const dx = x - HEAD[0]
  const dy = y - HEAD[1]
  return [HEAD[0] + dx * Math.cos(a) + dy * Math.sin(a), HEAD[1] - dx * Math.sin(a) + dy * Math.cos(a)]
}
/** The ball in the horn. */
const inHorn = (t: number): Pt => kicked(lineAt(ballS(t)), t)

/** Out of the mouth it is a thrown thing. The flight takes up the pace and the heading it left the horn with. */
const OFF = inHorn(T_OUT)
const V_OFF: Pt = (() => {
  const a = inHorn(T_OUT - 0.002)
  return [(OFF[0] - a[0]) / 0.002, (OFF[1] - a[1]) / 0.002]
})()
const FLIGHT = (LAND[0] - OFF[0]) / V_OFF[0]
const LOFT = (LAND[1] - OFF[1] - V_OFF[1] * FLIGHT) / 4

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    ...trace(dropAt, T_EDGE, T_IN, 14),
    ...trace(inHorn, T_IN, FIRE, 48),
    ...trace(inHorn, FIRE, T_OUT, 28),
    fly(OFF, LAND, FLIGHT, LOFT),
    ramp(LAND, [2.5, 0], V_OFF[0], ROLL),
  ],
  fire: FIRE,
}

/** How long the plunger is, where its face hangs over the bell, and where in the tube the air stops it. */
const PLUNGER = 0.19
const HANG = -0.4
const STOP = S_BEND - 0.02
/** The gallows is a mast stepped in the crotch of the bend, here, with a beam back over the bell at this height and a reel this big at its end for the cord. */
const GALLOWS = 0.47
const BEAM = -0.44
const REEL = 0.045
/** The catch is a crank on the mast, pivoted here. Its trip arm lies out across the bell to here, which makes it this long and this far off the plumb when it is cocked. Its finger, this long, lies under the plunger's corner. */
const CRANK: Pt = [GALLOWS, RIM + HANG + 0.025]
const TRIP: Pt = [0.08, 0.12]
const ARM_LEN = Math.hypot(TRIP[0] - CRANK[0], TRIP[1] - CRANK[1])
const COCKED = Math.atan2(CRANK[0] - TRIP[0], TRIP[1] - CRANK[1])
const FINGER = 0.24
/** The ball reaches the trip arm's end. */
const T_KNOCK = (() => {
  let t = T_EDGE
  while (t < T_IN && Math.hypot(dropAt(t)[0] - TRIP[0], dropAt(t)[1] - TRIP[1]) > R + 0.01) t += 0.001
  return t
})()
/** Knocked, the crank swings like the pendulum it is, this quick and this damped, starting at the pace of the blow. */
const SWING = 8
const SLOW = 6
const BLOW = 6
/** The plunger is wound back up between these, a little past its seat, and let down onto the catch. */
const T_WIND = FIRE + 1.5
const T_HOME = FIRE + 2.9
const T_SEAT = T_HOME + 0.25

/** The trip arm's angle off the plumb, toward the deck. */
function crankAt(t: number): number {
  if (t < T_KNOCK) return COCKED
  const u = t - T_KNOCK
  const hung = Math.exp(-SLOW * u) * (COCKED * Math.cos(SWING * u) + ((SLOW * COCKED - BLOW) / SWING) * Math.sin(SWING * u))
  return hung + (COCKED - hung) * easeInOutSine(over(t, T_HOME - 0.05, T_HOME + 0.15))
}
/** The finger is out from under the plunger once the arm has swung in to here. */
const FREE = 0.42
const T_LET = (() => {
  let t = T_KNOCK
  while (crankAt(t) > FREE) t += 0.001
  return t
})()
/** The plunger's face along the centre line. It hangs, falls faster and faster, stops dead on the air with one short bounce, and is wound home. */
function faceAt(t: number): number {
  if (t < T_LET) return HANG
  if (t < FIRE) return HANG + (STOP - HANG) * over(t, T_LET, FIRE) ** 3
  const u = t - FIRE
  const down = STOP - 0.05 * Math.exp(-u * 7) * Math.abs(Math.sin(u * 13))
  if (t < T_WIND) return down
  if (t < T_HOME) return down + (HANG - 0.03 - down) * easeInOutSine(over(t, T_WIND, T_HOME))
  return HANG - 0.03 * (1 - easeInOutSine(over(t, T_HOME + 0.1, T_SEAT)))
}

/** The sound is this many arcs off the mouth, this far apart in time, each going out this far in this long. */
const RINGS = 3
const RING_GAP = 0.11
const RING_OUT = 0.4
const RING_T = 0.5

export const diaphone = definePiece<{ color: string; plunger: string }>({
  name: 'diaphone',
  weight: 0.8,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [3, 0])) return null
    const brass = bodyColor(theme, color, ball.color)
    // The plunger is a weight, so the heaviest colour left: the one furthest from the paper that is neither the brass nor the ball.
    const off = (c: string) => Math.abs(luminance(c) - luminance(theme.bg))
    const plunger = theme.colors.filter((c) => c !== brass && c !== ball.color).sort((a, b) => off(b) - off(a))[0] ?? theme.ink
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: brass, plunger } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)
    const v = (pt: Pt) => p.vertex(pt[0] * k, pt[1] * k)

    // The deck in on its long piling, the deep bed, the far deck on the shelf where the bed comes up again, and the sea across all of it.
    seabed(p, k, ink, weight, -0.5, 1.5, BED)
    seabed(p, k, ink, weight, 1.5, 2.5)
    outline(p, ink, weight)
    p.line(1.5 * k, 0.5 * k, 1.5 * k, BED * k)
    water(p, k, ink, weight, -0.5, 2.5)
    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, -0.4, FLOOR, BED)
    rail(p, k, ink, weight, PIER, 2.5)
    piling(p, k, ink, weight, PIER_POST)

    // The sea where the horn stands in it, shaken by the kick. A ring goes out from each place the keel breaks the surface.
    const ring = (x: number, f: number, size: number) => {
      if (f <= 0 || f >= 1) return
      p.noFill()
      p.stroke(sea)
      p.strokeWeight(weight * 0.8 * (1 - f))
      p.ellipse(x * k, WATER * k, (0.2 + 0.4 * f) * size * k, (0.05 + 0.08 * f) * size * k)
    }
    for (const x of AWASH) ring(x, over(since, 0.03, 0.75), 1)
    // And a smaller one round the far piling when the ball comes down on the planks over it.
    ring(PIER_POST, over(t, T_OUT + FLIGHT, T_OUT + FLIGHT + 0.6), 0.7)

    // The post the horn stands on.
    solid(p, ink, weight, ink)
    p.rect(HEAD[0] * k, ((HEAD[1] + BED) / 2) * k, 0.07 * k, (BED - HEAD[1]) * k)
    outline(p, ink, weight)
    p.line((HEAD[0] - 0.1) * k, BED * k, (HEAD[0] + 0.1) * k, BED * k)

    // Everything else is the horn's, and kicks with it.
    p.push()
    p.translate(HEAD[0] * k, HEAD[1] * k)
    p.rotate(-kickAt(t))
    p.translate(-HEAD[0] * k, -HEAD[1] * k)

    // The gallows, behind the horn. The mast comes up out of the crotch of the bend and the beam runs back over the bell.
    const face = faceAt(t)
    outline(p, ink, weight * 1.2)
    p.line(GALLOWS * k, (CY - 0.02) * k, GALLOWS * k, BEAM * k)
    p.line(GALLOWS * k, BEAM * k, (BX + REEL) * k, BEAM * k)

    // The horn in section. The bore in paper, the two walls in brass either side of it, and their four edges in ink, left open at the rim and at the mouth.
    const band = (a: Pt[], b: Pt[]) => {
      p.beginShape()
      a.forEach(v)
      b.slice().reverse().forEach(v)
      p.endShape(p.CLOSE)
    }
    p.noStroke()
    p.fill(bg)
    band(KEEL_IN, BACK_IN)
    p.fill(s.color)
    band(KEEL, KEEL_IN)
    band(BACK, BACK_IN)

    // The air shut in between the plunger and the ball. It is darker the harder it is squeezed, thins as it drives the ball out, and is gone once the mouth is open.
    const sealed = face > S_THROAT && t < T_OUT + 0.2
    if (sealed) {
      const far = t < T_OUT ? ballS(t) : S_MOUTH
      const full = S_LOW - S_THROAT
      const dense = (full / (far - face)) * (1 - over(t, T_OUT, T_OUT + 0.2))
      p.fill(mixHex(bg, ink, Math.min(0.5, 0.14 * dense)))
      const m = Math.max(2, Math.ceil((far - face) / 0.03))
      p.beginShape()
      for (let i = 0; i <= m; i++) v(wallAt(face + ((far - face) * i) / m, boreAt(face + ((far - face) * i) / m)))
      for (let i = m; i >= 0; i--) v(wallAt(face + ((far - face) * i) / m, -boreAt(face + ((far - face) * i) / m)))
      p.endShape(p.CLOSE)
    }

    outline(p, ink, weight)
    for (const line of [KEEL, KEEL_IN, BACK_IN, BACK]) {
      p.beginShape()
      line.forEach(v)
      p.endShape()
    }
    for (const i of [0, EDGES]) {
      p.line(KEEL[i][0] * k, KEEL[i][1] * k, KEEL_IN[i][0] * k, KEEL_IN[i][1] * k)
      p.line(BACK[i][0] * k, BACK[i][1] * k, BACK_IN[i][0] * k, BACK_IN[i][1] * k)
    }
    // The far half of each rim, seen a little from in front, so the two ends read as round.
    for (const [i, h] of [[0, -Math.PI / 2], [EDGES, -AIM]] as const) {
      const mx = (KEEL_IN[i][0] + BACK_IN[i][0]) / 2
      const my = (KEEL_IN[i][1] + BACK_IN[i][1]) / 2
      const wide = Math.hypot(KEEL_IN[i][0] - BACK_IN[i][0], KEEL_IN[i][1] - BACK_IN[i][1])
      p.push()
      p.translate(mx * k, my * k)
      p.rotate(h)
      outline(p, ink, weight * 0.8)
      p.arc(0, 0, wide * 0.22 * k, wide * k, -Math.PI / 2, Math.PI / 2)
      p.pop()
    }

    // The plunger on its cord, and the reel the cord comes off, turning as it pays out.
    const top = RIM + face - PLUNGER
    outline(p, ink, weight * 0.8)
    p.line(BX * k, (BEAM + REEL) * k, BX * k, (top - 0.03) * k)
    // Let go, it teeters on the cord until the bell takes it.
    const loose = t - T_LET
    const teeter = loose < 0 ? 0 : 0.14 * Math.exp(-loose * 3) * Math.sin(loose * 17) * (1 - over(face, HANG + 0.1, -PLUNGER * 0.5))
    p.push()
    p.translate(BX * k, (top - 0.03) * k)
    p.rotate(teeter)
    solid(p, ink, weight, s.plunger)
    p.rect(0, (0.03 + PLUNGER / 2) * k, (BORE - 0.03) * k, PLUNGER * k, 0.02 * k)
    solid(p, ink, weight * 0.8, bg)
    p.circle(0, 0.015 * k, 0.04 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle((BX + REEL) * k, BEAM * k, REEL * 2 * k)
    const turn = (face - HANG) / REEL
    p.noStroke()
    p.fill(ink)
    p.circle((BX + REEL + Math.cos(turn) * REEL * 0.5) * k, (BEAM + Math.sin(turn) * REEL * 0.5) * k, 0.02 * k)

    // The catch. Finger and trip arm are one crank, and the knob on the arm's end is what the ball knocks.
    const a = crankAt(t)
    const tip: Pt = [CRANK[0] - Math.sin(a) * ARM_LEN, CRANK[1] + Math.cos(a) * ARM_LEN]
    const b = a + (Math.PI / 2 - COCKED)
    outline(p, ink, weight * 1.1)
    p.line(CRANK[0] * k, CRANK[1] * k, tip[0] * k, tip[1] * k)
    p.line(CRANK[0] * k, CRANK[1] * k, (CRANK[0] - Math.sin(b) * FINGER) * k, (CRANK[1] + Math.cos(b) * FINGER) * k)
    solid(p, ink, weight, s.plunger)
    p.circle(tip[0] * k, tip[1] * k, 0.05 * k)
    solid(p, ink, weight, ink)
    p.circle(CRANK[0] * k, CRANK[1] * k, 0.035 * k)

    // The sound: arcs off the mouth, one after another, widening and thinning to nothing, and cut short under the cell's roof.
    if (since > 0 && since < RING_T + RINGS * RING_GAP) {
      const [mx, my] = lineAt(S_MOUTH)
      const cx = mx - Math.cos(AIM) * MOUTH * 0.35
      const cy = my + Math.sin(AIM) * MOUTH * 0.35
      p.noFill()
      p.stroke(s.color)
      for (let i = 0; i < RINGS; i++) {
        const f = over(since - 0.04 - i * RING_GAP, 0, RING_T)
        if (f <= 0 || f >= 1) continue
        const r = MOUTH / 2 + RING_OUT * easeOutCubic(f)
        const roof = Math.asin(Math.min(1, (cy + 0.42) / r))
        p.strokeWeight(weight * 1.6 * (1 - f))
        p.arc(cx * k, cy * k, r * 2 * k, r * 2 * k, -Math.min(AIM + 0.55, roof), -AIM + 0.55)
      }
    }
    p.pop()
  },
})
