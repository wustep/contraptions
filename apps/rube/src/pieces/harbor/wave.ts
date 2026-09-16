import { outline } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, rail, roll, type Lane, type Pt, type Seg } from '../../parts'
import { piling, seaColor, seabed } from './sea'

/**
 * A wave. The pier stops, and where the next cell should be a swell has
 * risen: a face of water curling over at the top, running down two cells
 * and one floor to the deck below. The ball rolls off the lip onto the
 * face and rides it down, fast in the steep middle, easing off at the
 * bottom, with spray coming off behind it. No mechanism; the sea is the
 * machine here.
 *
 * The wave is never still. The face the ball rides is fixed — the lane is
 * drawn from it — but everything above and inside it moves on the piece's
 * own clock: the crest heaves and the lip reaches and draws back; froth
 * rolls up the back, over the top and off the tip of the lip into the
 * tube; streaks of water climb the face into the curl. One circulation,
 * the way a breaking wave's water goes, and the ball rides down against
 * it.
 */
const LIP = -0.15
const END: Pt = [1.5, 1]
const N = 28
const PEAK = 4.6

/** The face: a cosine S-curve from the lip to the deck below. */
const facePt = (f: number): Pt => [LIP + (END[0] - LIP) * f, (END[1] * (1 - Math.cos(Math.PI * f))) / 2]

/** The ride down the face: rail pace at the lip, PEAK in the middle, rail pace at the bottom. */
function ride(): { segs: Seg[]; at: number[] } {
  const segs: Seg[] = []
  const at: number[] = [0]
  let acc = 0
  for (let i = 0; i < N; i++) {
    const a = facePt(i / N)
    const b = facePt((i + 1) / N)
    const f = (i + 0.5) / N
    const v = ROLL + (PEAK - ROLL) * Math.sin(Math.PI * f)
    const dur = Math.hypot(b[0] - a[0], b[1] - a[1]) / v
    segs.push({ from: a, to: b, dur })
    acc += dur
    at.push(acc)
  }
  return { segs, at }
}

/**
 * The crest at a moment: the back of the swell rising from the pier's edge
 * to a top, the lip coming forward and down, and the tongue curling back
 * over the face. Two cubics, given as their control points. The swell
 * heaves on a slow beat and the tongue reaches and draws back a little
 * behind it, so the top is never a dead edge.
 */
interface Crest {
  root: Pt
  c1: Pt
  c2: Pt
  brow: Pt
  c3: Pt
  c4: Pt
  tip: Pt
}
function crestAt(t: number): Crest {
  const ph = t * 3.6
  const heave = Math.sin(ph)
  const lick = Math.sin(ph - 1.0)
  return {
    root: [LIP - 0.02, -0.12],
    c1: [LIP + 0.02, -0.44 + 0.02 * heave],
    c2: [LIP + 0.46 + 0.02 * heave, -0.44 + 0.025 * heave],
    brow: [LIP + 0.46 + 0.02 * heave, -0.22 + 0.015 * heave],
    c3: [LIP + 0.46 + 0.02 * heave, -0.1 + 0.01 * heave],
    c4: [LIP + 0.36 - 0.015 * lick, -0.14 + 0.005 * lick],
    tip: [LIP + 0.3 - 0.035 * lick, -0.17 + 0.012 * lick],
  }
}

const cubic = (a: Pt, b: Pt, c: Pt, d: Pt, u: number): Pt => {
  const w = 1 - u
  return [
    w * w * w * a[0] + 3 * w * w * u * b[0] + 3 * w * u * u * c[0] + u * u * u * d[0],
    w * w * w * a[1] + 3 * w * w * u * b[1] + 3 * w * u * u * c[1] + u * u * u * d[1],
  ]
}

/**
 * The froth's way: up the back, over the crest, down the lip to the tip,
 * and off it — a short fall back and down into the tube. Sampled, with the
 * distance along it, so froth can be spaced evenly by length.
 */
function frothWay(c: Crest): { pts: Pt[]; along: number[]; tipAt: number } {
  const pts: Pt[] = []
  // From a little way up the back — the foot of the back is behind the piling.
  for (let i = 4; i <= 16; i++) pts.push(cubic(c.root, c.c1, c.c2, c.brow, i / 16))
  for (let i = 1; i <= 8; i++) pts.push(cubic(c.brow, c.c3, c.c4, c.tip, i / 8))
  const tipIndex = pts.length - 1
  for (let i = 1; i <= 6; i++) {
    const u = i / 6
    pts.push([c.tip[0] - 0.13 * u, c.tip[1] + 0.02 * u + 0.14 * u * u])
  }
  const along = [0]
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, along, tipAt: along[tipIndex] / along[along.length - 1] }
}

/** A point `f` of the way along a sampled path, and the unit normal to its right (inward, for a path going clockwise). */
function alongPath(pts: Pt[], along: number[], f: number): { at: Pt; inward: Pt } {
  const want = f * along[along.length - 1]
  let i = 1
  while (i < pts.length - 1 && along[i] < want) i++
  const g = over(want, along[i - 1], along[i])
  const dx = pts[i][0] - pts[i - 1][0]
  const dy = pts[i][1] - pts[i - 1][1]
  const len = Math.hypot(dx, dy) || 1
  return {
    at: [pts[i - 1][0] + dx * g, pts[i - 1][1] + dy * g],
    inward: [-dy / len, dx / len],
  }
}

export const wave = definePiece<{ color: string; at: number[] }>({
  name: 'wave',
  weight: 1,
  flight: true,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    const { segs, at } = ride()
    const lane: Lane = {
      segs: [roll([-0.5, 0], [LIP, 0], ROLL), ...segs],
      fire: (0.5 + LIP) / ROLL + at[N >> 1],
    }
    return { cells, exit: { at: [2, 1], dir: 1 }, lane, state: { color: seaColor(theme, color), at } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The pier the ball comes off, and the seabed the wave stands on.
    rail(p, k, ink, weight, -0.5, LIP)
    piling(p, k, ink, weight, LIP - 0.06, FLOOR, 1.5)
    seabed(p, k, ink, weight, LIP - 0.1, 1.5, 1.5)

    const c = crestAt(t)
    // The body of the wave: from the seabed up its back, over the crest,
    // down the face a radius under the ball's line, to the deck below.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    p.vertex((LIP - 0.02) * k, 1.5 * k)
    p.vertex(c.root[0] * k, c.root[1] * k)
    p.bezierVertex(c.c1[0] * k, c.c1[1] * k, c.c2[0] * k, c.c2[1] * k, c.brow[0] * k, c.brow[1] * k)
    p.bezierVertex(c.c3[0] * k, c.c3[1] * k, c.c4[0] * k, c.c4[1] * k, c.tip[0] * k, c.tip[1] * k)
    p.bezierVertex((LIP + 0.2) * k, -0.04 * k, (LIP + 0.1) * k, 0.1 * k, LIP * k, R * k)
    for (let i = 1; i <= N; i++) {
      const [x, y] = facePt(i / N)
      p.vertex(x * k, (y + R) * k)
    }
    p.vertex(1.5 * k, 1.5 * k)
    p.endShape(p.CLOSE)
    p.pop()

    // Streaks of water climbing the face into the curl: three, at three
    // depths under the surface, in the paper's colour on the body.
    p.push()
    p.stroke(bg)
    p.strokeWeight(weight * 0.9)
    p.noFill()
    for (let j = 0; j < 3; j++) {
      const g = 1 - (((t * 0.4 + j / 3) % 1) + 1) % 1
      const depth = 0.09 + 0.07 * j
      const half = 0.04 * Math.min(1, g / 0.1, (1 - g) / 0.1)
      if (half <= 0.004) continue
      p.beginShape()
      for (let i = 0; i <= 4; i++) {
        const [x, y] = facePt(g - half + (2 * half * i) / 4)
        p.vertex(x * k, (y + R + depth) * k)
      }
      p.endShape()
    }
    p.pop()

    // The face and the curl in ink.
    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i <= N; i++) {
      const [x, y] = facePt(i / N)
      p.vertex(x * k, (y + R) * k)
    }
    p.endShape()
    p.noFill()
    p.bezier(c.root[0] * k, c.root[1] * k, c.c1[0] * k, c.c1[1] * k, c.c2[0] * k, c.c2[1] * k, c.brow[0] * k, c.brow[1] * k)
    p.bezier(c.brow[0] * k, c.brow[1] * k, c.c3[0] * k, c.c3[1] * k, c.c4[0] * k, c.c4[1] * k, c.tip[0] * k, c.tip[1] * k)

    // Froth: patches of foam in the paper's colour rolling up the back,
    // over the crest and down the lip, each straddling the edge so the
    // silhouette itself froths, and sliding off the tip into the tube,
    // where they are paper on paper and gone. Evenly spaced along the way,
    // on a steady cycle.
    const way = frothWay(c)
    p.push()
    p.noStroke()
    p.fill(bg)
    const n = 5
    for (let i = 0; i < n; i++) {
      const f = (((t * 0.35 + i / n + ((i * 5) % 3) * 0.02) % 1) + 1) % 1
      const r = 0.042 * (0.8 + 0.1 * ((i * 7) % 3)) * Math.min(1, f / 0.12)
      if (r < 0.006) continue
      const { at, inward } = alongPath(way.pts, way.along, f)
      const sink = f > way.tipAt ? 0 : r * (0.2 + 0.4 * ((i * 3) % 2))
      p.circle((at[0] + inward[0] * sink) * k, (at[1] + inward[1] * sink) * k, r * 2 * k)
    }
    p.pop()

    // Where the water meets the pier below: the lower deck's line runs on from the face.
    rail(p, k, ink, weight, 1.42, 1.5, 1 + FLOOR)

    // Spray: drops of water thrown off behind the ball while it is on the face, in the water's colour.
    const t0 = (0.5 + LIP) / ROLL
    const into = t - t0
    if (into > 0 && into < s.at[N] + 0.3) {
      p.push()
      p.noStroke()
      p.fill(s.color)
      for (let j = 1; j <= 5; j++) {
        const back = into - j * 0.05
        if (back < 0 || back > s.at[N]) continue
        let i = 0
        while (i < N && s.at[i + 1] < back) i++
        const f = (i + (back - s.at[i]) / (s.at[i + 1] - s.at[i])) / N
        const [x, y] = facePt(f)
        // Each drop on its own little arc, scattered a touch so they do not line up, and small at either end of the ride.
        const rise = 0.06 * j * (1 - j / 7) + 0.025 * Math.sin(j * 2.4)
        const d = (0.05 - j * 0.007) * Math.min(1, back / 0.08, (s.at[N] - back) / 0.12)
        p.circle((x - 0.04 * j - 0.015 * ((j * 3) % 2)) * k, (y - R - rise) * k, d * k)
      }
      p.pop()
    }
    // The splash at the bottom as the ball runs out onto the deck.
    const land = s.at[N] - 0.15
    if (since > land - s.at[N >> 1] && since < land - s.at[N >> 1] + 0.3) {
      const f = over(since, land - s.at[N >> 1], land - s.at[N >> 1] + 0.3)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-2.4, -1.9, -1.3]) {
        const r0 = 0.16 + 0.14 * f
        p.line((1.3 + Math.cos(a) * r0) * k, (1 + Math.sin(a) * r0) * k, (1.3 + Math.cos(a) * (r0 + 0.06)) * k, (1 + Math.sin(a) * (r0 + 0.06)) * k)
      }
      p.pop()
    }
  },
})
