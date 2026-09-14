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

    // The body of the wave: from the seabed up its back, over the crest,
    // down the face a radius under the ball's line, to the deck below.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    p.vertex((LIP - 0.02) * k, 1.5 * k)
    p.vertex((LIP - 0.02) * k, -0.12 * k)
    p.bezierVertex((LIP + 0.02) * k, -0.44 * k, (LIP + 0.46) * k, -0.44 * k, (LIP + 0.46) * k, -0.22 * k)
    p.bezierVertex((LIP + 0.46) * k, -0.1 * k, (LIP + 0.36) * k, -0.14 * k, (LIP + 0.3) * k, -0.17 * k)
    p.bezierVertex((LIP + 0.2) * k, -0.04 * k, (LIP + 0.1) * k, 0.1 * k, LIP * k, R * k)
    for (let i = 1; i <= N; i++) {
      const [x, y] = facePt(i / N)
      p.vertex(x * k, (y + R) * k)
    }
    p.vertex(1.5 * k, 1.5 * k)
    p.endShape(p.CLOSE)
    p.pop()
    // The face and the curl in ink, and the foam along the crest.
    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i <= N; i++) {
      const [x, y] = facePt(i / N)
      p.vertex(x * k, (y + R) * k)
    }
    p.endShape()
    p.noFill()
    p.bezier((LIP - 0.02) * k, -0.12 * k, (LIP + 0.02) * k, -0.44 * k, (LIP + 0.46) * k, -0.44 * k, (LIP + 0.46) * k, -0.22 * k)
    p.bezier((LIP + 0.46) * k, -0.22 * k, (LIP + 0.46) * k, -0.1 * k, (LIP + 0.36) * k, -0.14 * k, (LIP + 0.3) * k, -0.17 * k)
    p.push()
    p.noStroke()
    p.fill(bg)
    for (const [dx, dy, r] of [
      [0.36, -0.3, 0.05],
      [0.44, -0.2, 0.04],
      [0.26, -0.36, 0.035],
      [0.18, -0.3, 0.03],
    ]) {
      p.circle((LIP + dx) * k, dy * k, r * 2 * k)
    }
    p.pop()
    // Where the water meets the pier below: the lower deck's line runs on from the face.
    rail(p, k, ink, weight, 1.42, 1.5, 1 + FLOOR)

    // Spray: drops thrown off behind the ball while it is on the face.
    const t0 = (0.5 + LIP) / ROLL
    const into = t - t0
    if (into > 0 && into < s.at[N] + 0.3) {
      p.push()
      p.noStroke()
      p.fill(bg)
      for (let j = 1; j <= 5; j++) {
        const back = into - j * 0.05
        if (back < 0 || back > s.at[N]) continue
        let i = 0
        while (i < N && s.at[i + 1] < back) i++
        const f = (i + (back - s.at[i]) / (s.at[i + 1] - s.at[i])) / N
        const [x, y] = facePt(f)
        const rise = 0.06 * j * (1 - j / 7)
        p.circle((x - 0.04 * j) * k, (y - R - rise) * k, (0.05 - j * 0.006) * k)
      }
      p.pop()
    }
    // The splash at the bottom as the ball runs out onto the deck.
    const land = s.at[N] - 0.15
    if (since > land - s.at[N >> 1] && since < land - s.at[N >> 1] + 0.3) {
      const f = over(since, land - s.at[N >> 1], land - s.at[N >> 1] + 0.3)
      p.push()
      p.stroke(bg)
      p.strokeWeight(weight)
      for (const a of [-2.4, -1.9, -1.3]) {
        const r0 = 0.16 + 0.14 * f
        p.line((1.3 + Math.cos(a) * r0) * k, (1 + Math.sin(a) * r0) * k, (1.3 + Math.cos(a) * (r0 + 0.06)) * k, (1 + Math.sin(a) * (r0 + 0.06)) * k)
      }
      p.pop()
    }
  },
})
