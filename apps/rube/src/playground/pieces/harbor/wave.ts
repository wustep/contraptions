import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, over, rail, roll, type Lane, type Pt, type Seg } from '../../../parts'
import { WATER, piling, seaColor, water } from '../../../pieces/harbor/sea'

/**
 * A wave. The pier stops, and where the next cell should be a swell has
 * risen out of the sea: a long back climbing from the waterline behind the
 * pier's end, a crest curling over at the top, and a face running down a
 * floor to the deck below. The ball rolls off the pier into the hollow
 * under the curl and rides the face down, fast in the steep middle, easing
 * off at the bottom, with spray coming off behind it. No mechanism; the
 * sea is the machine here.
 *
 * It is one shape, and the sea's: it stands on the harbor's own waterline,
 * which it leaves at one edge of its cells and comes back to at the other,
 * so it has no wall and no floor — it is the line every other pier stands
 * over, lifted. One ink line goes all the way round it.
 *
 * The wave is never still. The face the ball rides is fixed — the lane is
 * drawn from it — but the rest moves on the piece's own clock, as one
 * circulation: a swell runs up the back into the crest, the crest heaves
 * with it, the lip reaches forward and draws back a little behind that,
 * and the foam along the crest — scallops of paper standing proud of the
 * edge — travels over the top and down the lip to its tip. Streaks of
 * water climb the face into the curl, against the ball.
 */
const LIP = -0.22
/** How far down the face the underside of the curl comes in to meet it. */
const HOLLOW = 0.11
/** Where the face hands the ball to the lower deck. */
const FOOT = 1.2
const END: Pt = [1.5, 1]
const N = 28
const PEAK = 4.6
/** The sea the wave stands on: the lower floor's waterline, wave for wave with `water`. */
const SEA = 1 + WATER
const seaAt = (x: number) => SEA + 0.022 * Math.sin(x * Math.PI * 6)
/** Where the back leaves the sea. The waterline starts here too: left of it there is no pier to run under. */
const TOE = LIP - 0.24

/** The face: a cosine S-curve from the pier's lip to the deck below. */
const facePt = (f: number): Pt => [LIP + (FOOT - LIP) * f, (END[1] * (1 - Math.cos(Math.PI * f))) / 2]

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

const cubic = (a: Pt, b: Pt, c: Pt, d: Pt, u: number): Pt => {
  const w = 1 - u
  return [
    w * w * w * a[0] + 3 * w * w * u * b[0] + 3 * w * u * u * c[0] + u * u * u * d[0],
    w * w * w * a[1] + 3 * w * w * u * b[1] + 3 * w * u * u * c[1] + u * u * u * d[1],
  ]
}
const sample = (a: Pt, b: Pt, c: Pt, d: Pt, n: number, from = 1): Pt[] => {
  const out: Pt[] = []
  for (let i = from; i <= n; i++) out.push(cubic(a, b, c, d, i / n))
  return out
}

/**
 * The wave's outline at a moment, clockwise from where it leaves the sea:
 * up the back, over the crest, down the lip to its tip, back along the
 * underside of the curl to the pier's end, down the face, and under the
 * lower deck to the sea again. `crest` is the run of it the foam rides,
 * from the shoulder of the back to the tip.
 */
function shapeAt(t: number): { pts: Pt[]; crest: Pt[] } {
  const ph = t * 3.6
  const heave = Math.sin(ph)
  const lick = Math.sin(ph - 1.0)
  // The back passes behind the pier's end; the curl hangs over the first of
  // the face, thick where it leaves the back and thinning to its tip.
  const neck: Pt = [LIP - 0.14, 0.1]
  const top: Pt = [LIP + 0.3 + 0.015 * heave, -0.455 + 0.02 * heave]
  const brow: Pt = [LIP + 0.7 + 0.03 * heave, -0.17 + 0.02 * heave]
  const tip: Pt = [LIP + 0.52 - 0.045 * lick, -0.04 + 0.02 * lick]
  const [hx, hy] = facePt(HOLLOW)

  const back = sample([TOE, seaAt(TOE)], [TOE + 0.07, SEA], [neck[0] - 0.03, 0.95], neck, 18, 0)
  // A swell running up the back into the crest: a bulge along the line's
  // normal, nothing at the sea and nothing at the neck, so both ends hold.
  for (let i = 1; i < back.length - 1; i++) {
    const u = i / (back.length - 1)
    const dx = back[i + 1][0] - back[i - 1][0]
    const dy = back[i + 1][1] - back[i - 1][1]
    const len = Math.hypot(dx, dy) || 1
    const bulge = 0.02 * Math.sin(Math.PI * u) * Math.sin(u * 7 - ph)
    back[i] = [back[i][0] + (dy / len) * bulge, back[i][1] - (dx / len) * bulge]
  }
  const shoulder = sample(neck, [neck[0] + 0.02, -0.3], [top[0] - 0.22, top[1]], top, 10)
  const lip = sample(top, [top[0] + 0.24, top[1]], [brow[0], brow[1] - 0.18], brow, 10)
  const curl = sample(brow, [brow[0], brow[1] + 0.13], [tip[0] + 0.14, tip[1] + 0.03], tip, 8)
  const under = sample(tip, [tip[0] + 0.13, tip[1] - 0.12], [hx + 0.01, -0.4], [hx, hy + R], 14)
  const face: Pt[] = []
  for (let i = Math.ceil(HOLLOW * N); i <= N; i++) {
    const [x, y] = facePt(i / N)
    if (x > hx) face.push([x, y + R])
  }
  // Off the face and under the lower deck, down to the sea at the cell's edge.
  const foot = sample([FOOT, END[1] + R], [FOOT + 0.14, END[1] + R], [1.5 - 0.16, SEA], [1.5, SEA], 8)
  return { pts: [...back, ...shoulder, ...lip, ...curl, ...under, ...face, ...foot], crest: [...shoulder.slice(3), ...lip, ...curl] }
}

/** Distances along a sampled path, for spacing things evenly by length. */
function lengths(pts: Pt[]): number[] {
  const along = [0]
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return along
}
/** The point `f` of the way along a sampled path. */
function alongPath(pts: Pt[], along: number[], f: number): Pt {
  const want = f * along[along.length - 1]
  let i = 1
  while (i < pts.length - 1 && along[i] < want) i++
  const g = over(want, along[i - 1], along[i])
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * g, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * g]
}

export const wave = definePiece<{ color: string; at: number[] }>({
  name: 'wave',
  weight: 1,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    const { segs, at } = ride()
    const lane: Lane = {
      segs: [roll([-0.5, 0], [LIP, 0], ROLL), ...segs, roll([FOOT, END[1]], END, ROLL)],
      fire: (0.5 + LIP) / ROLL + at[N >> 1],
    }
    return { cells, exit: { at: [2, 1], dir: 1 }, lane, state: { color: seaColor(theme, color, ball.color), at } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { pts, crest } = shapeAt(t)

    // The pilings first: they go down through the wave to the bed, and are
    // seen where they come out of it, below the waterline.
    piling(p, k, ink, weight, LIP - 0.06, FLOOR, 1.5)
    piling(p, k, ink, weight, 1.42, 1 + FLOOR, 1.5)

    // Foam, first and under the water: scallops of paper along the crest,
    // so only what stands proud of the edge is seen and the silhouette
    // itself froths. They travel over the top and down the lip, swelling
    // out of the back's shoulder and running out to nothing at the tip.
    const along = lengths(crest)
    const n = 7
    solid(p, ink, weight, bg)
    for (let i = 0; i < n; i++) {
      const f = (((t * 0.3 + i / n) % 1) + 1) % 1
      const r = 0.058 * Math.min(1, f / 0.2, (1 - f) / 0.25)
      if (r < 0.012) continue
      const [x, y] = alongPath(crest, along, f)
      p.circle(x * k, y * k, r * 2 * k)
    }

    // The water: one shape on the sea's own line, one ink line round it.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    // Back along the waterline, wave for wave with `water`, so the fill's foot is the line's.
    for (let i = 1; i < 48; i++) {
      const x = 1.5 - ((1.5 - TOE) * i) / 48
      p.vertex(x * k, seaAt(x) * k)
    }
    p.endShape(p.CLOSE)
    p.pop()

    // Streaks of water climbing the face into the curl: three, at three
    // depths under the surface, in the paper's colour on the body.
    p.push()
    p.stroke(bg)
    p.strokeWeight(weight * 0.9)
    p.noFill()
    for (let j = 0; j < 3; j++) {
      const g = 0.08 + 0.84 * (1 - ((((t * 0.4 + j / 3) % 1) + 1) % 1))
      const depth = 0.1 + 0.07 * j
      const half = 0.045 * Math.min(1, (g - 0.08) / 0.1, (0.92 - g) / 0.1)
      if (half <= 0.004) continue
      p.beginShape()
      for (let i = 0; i <= 4; i++) {
        const [x, y] = facePt(g - half + (2 * half * i) / 4)
        p.vertex(x * k, (y + R + depth) * k)
      }
      p.endShape()
    }
    p.pop()

    outline(p, ink, weight)
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
    water(p, k, ink, weight, TOE, 1.5, SEA)

    // The pier the ball comes off, its line carried on through the neck of
    // the wave to where the face comes out from under the curl, so the ball
    // always has a line under it; and the deck it runs out on.
    outline(p, ink, weight)
    p.beginShape()
    p.vertex(-0.5 * k, FLOOR * k)
    for (let i = 0; i <= Math.ceil(HOLLOW * N); i++) {
      const [x, y] = facePt(Math.min(HOLLOW, i / N))
      p.vertex(x * k, (y + R) * k)
    }
    p.endShape()
    rail(p, k, ink, weight, FOOT - 0.02, 1.5, 1 + FLOOR)

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
    // The splash where the face runs out onto the deck.
    const land = s.at[N] - s.at[N >> 1] - 0.1
    if (since > land && since < land + 0.3) {
      const f = over(since, land, land + 0.3)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-2.4, -1.9, -1.3]) {
        const r0 = 0.16 + 0.14 * f
        p.line((FOOT - 0.1 + Math.cos(a) * r0) * k, (1 + Math.sin(a) * r0) * k, (FOOT - 0.1 + Math.cos(a) * (r0 + 0.06)) * k, (1 + Math.sin(a) * (r0 + 0.06)) * k)
      }
      p.pop()
    }
  },
})
