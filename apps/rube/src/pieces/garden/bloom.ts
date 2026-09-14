import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, arcPts, catchBend, chain, definePiece, over, rail, ramp, roll, segTime, type Pt, type Seg } from '../../parts'
import { leaf, pot } from './green'

/**
 * A trumpet flower as tall as the path, its bloom open to the sky and
 * its throat over a hollow stem. The rail ends at the lip of a petal;
 * the ball rolls in and goes round and down the inside of the bloom,
 * tighter and faster, in view the whole way, through the throat, down
 * the stem, and out of a bend at the root onto the path a floor down —
 * on, or back the way it came. The flower nods as the ball goes through.
 */
const RIM_Y = 0.02
const RIM_HALF = 0.42
const THROAT_Y = 0.4
const THROAT_HALF = 0.1
const ENTRY_X = -0.3
const TURNS = 3.2
const ORBIT = 1.35
const ARC = 0.24
const TUBE = R

function orbit(): Seg[] {
  const n = 44
  const dt = ORBIT / n
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const y = RIM_Y + (THROAT_Y - 0.08 - RIM_Y) * Math.pow(f, 1.35)
    const amp = 0.28 * (1 - 0.9 * f) + 0.02
    const phase = Math.PI + Math.PI * 2 * TURNS * Math.pow(f, 1.5)
    pts.push([Math.cos(phase) * amp, y])
  }
  return chain(pts, ORBIT).map((seg) => ({ ...seg, dur: dt }))
}

export const flowerBloom = definePiece<{ color: string; turn: 1 | -1 }>({
  name: 'bloom',
  weight: 1,
  place: ({ rng, color, fits }) => {
    for (const turn of rng.shuffle([1, -1] as const)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      if (!fits(cells, [turn, 1])) continue
      const round = orbit()
      const last = round[round.length - 1].to
      const depth = 1 - ARC - last[1]
      const fallDur = Math.sqrt((2 * depth) / 24)
      const vEnd = (2 * depth) / fallDur
      const bend = chain(arcPts(turn * ARC, 1 - ARC, ARC, Math.PI * (turn > 0 ? 1 : 0), Math.PI / 2, 4), ((Math.PI / 2) * ARC) / (vEnd * 0.85))
      const segs: Seg[] = [
        roll([-0.5, 0], [ENTRY_X, RIM_Y], ROLL),
        ...round,
        { from: last, to: [0, 1 - ARC], dur: fallDur, ease: 'in' },
        ...bend,
        ramp([turn * ARC, 1], [turn * 0.5, 1], ROLL * 1.4, ROLL),
      ]
      const fire = segTime(segs) - segTime(bend) - segs[segs.length - 1].dur - fallDur
      return { cells, exit: { at: [turn, 1], dir: turn }, lane: { segs, fire }, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const { turn } = s
    rail(p, k, ink, weight, -0.5, -RIM_HALF)
    // The nod: the whole flower on its stem bows as the ball goes through the throat.
    const nod = since > -0.2 && since < 0.6 ? 0.06 * Math.sin((since + 0.2) * 12) * (1 - over(since, -0.2, 0.6)) : 0
    p.push()
    p.translate(0, THROAT_Y * k)
    p.rotate(nod)
    p.translate(0, -THROAT_Y * k)
    // The bloom: a paper trumpet behind the ball, with petal ribs converging on the throat.
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-RIM_HALF * k, RIM_Y * k)
    p.bezierVertex(-RIM_HALF * 0.7 * k, (RIM_Y + 0.14) * k, -THROAT_HALF * 1.6 * k, (THROAT_Y - 0.12) * k, -THROAT_HALF * k, THROAT_Y * k)
    p.vertex(THROAT_HALF * k, THROAT_Y * k)
    p.bezierVertex(THROAT_HALF * 1.6 * k, (THROAT_Y - 0.12) * k, RIM_HALF * 0.7 * k, (RIM_Y + 0.14) * k, RIM_HALF * k, RIM_Y * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.8)
    for (const f of [-0.5, 0, 0.5]) {
      p.line(f * RIM_HALF * k, (RIM_Y + 0.03) * k, f * THROAT_HALF * 0.8 * k, (THROAT_Y - 0.02) * k)
    }
    // The rim: five petal lobes seen from a little above, in the colour, open in the middle.
    solid(p, ink, weight, s.color)
    for (let i = 0; i < 5; i++) {
      const x = -RIM_HALF + (RIM_HALF * 2 * (i + 0.5)) / 5
      p.ellipse(x * k, (RIM_Y - 0.02) * k, 0.22 * k, 0.12 * k)
    }
    solid(p, ink, weight, bg)
    p.ellipse(0, RIM_Y * k, (RIM_HALF * 2 - 0.16) * k, 0.06 * k)
    p.pop()
    // The stem: a tube the ball's width from the throat to the bend, with two leaves.
    outline(p, ink, weight)
    for (const x of [-TUBE, TUBE]) p.line(x * k, THROAT_Y * k, x * k, (1 - ARC) * k)
    leaf(p, k, ink, weight, s.color, TUBE, 0.62, 0.22, -0.5)
    leaf(p, k, ink, weight, s.color, -TUBE, 0.5, 0.2, Math.PI + 0.5)
    // The pot at the root, and the bend out of it onto the path.
    pot(p, k, ink, weight, s.color, 0, 1.5, 0.44, 0.3)
    const squash = since < 0 ? 0 : 1 - over(since, 0.1, 0.45)
    p.push()
    p.translate(0, 1 * k)
    catchBend(p, k, ink, weight, s.color, turn, ARC, squash)
    p.pop()
  },
})
