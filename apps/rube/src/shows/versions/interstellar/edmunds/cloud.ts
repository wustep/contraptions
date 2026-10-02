import type p5 from 'p5'
import { alpha, frame, hash, scenery, smooth } from './kit'

/**
 * The cloud deck the rocket goes through: the one seam between the farm and
 * the dark. It is drawn the same in both universes, over everything, the
 * rocket included (the farm sees its shaded underside, the dark its lit
 * tops), and at the moment the rocket is inside it the frame is cloud, one
 * flat white, in both. That is when the stage changes universe, so the
 * change of ink never shows.
 *
 * It is a deck of cumulus in three layers, one behind another, each a run of
 * puffs of every size over a flat base, drifting slowly at its own pace.
 * Only the outside of each layer is inked, once, so the puffs read as one
 * body. Their tops catch the light; their bases are in shade.
 *
 * The rocket bores a hole in it: the hole opens as the nose meets the base,
 * a collar of vapour rolls up and out round it as the rocket goes through,
 * and it closes again slowly behind, over seconds.
 */
export interface CloudState {
  /** The middle of the deck, in world cells. */
  deck: number
  /** Show time the rocket is inside it. */
  punch: number
  /** The rocket's base and lean, in world cells, and its length: its shadow in the cloud is drawn from this. */
  rocket: (t: number) => { base: [number, number]; lean: number }
  length: number
}

export const WHITE = '#F1EDE3'
const DEPTH = 1.1
/** The deck's tones: lit tops, the body, the shade under it. */
const LIT = '#FBF8F1'
const BODY = '#ECE6DA'
const SHADE = '#D5CEC0'
const FAR = '#E2DCD0'

interface Layer {
  /** How far up (negative) or down its top sits from the deck's top, its puffs' size, its drift, its tone, and its seed. */
  dy: number
  size: number
  drift: number
  tone: string
  seed: number
  /** Its base, from the deck's middle. */
  base: number
}
/** Behind to in front: the far layer peeks over the top, the near one makes the base. */
const LAYERS: Layer[] = [
  { dy: -0.3, size: 1.25, drift: 0.035, tone: FAR, seed: 11, base: 0.35 },
  { dy: 0, size: 1.0, drift: 0.06, tone: BODY, seed: 23, base: 0.8 },
  { dy: 0.42, size: 0.8, drift: 0.1, tone: BODY, seed: 37, base: DEPTH },
]

/** When the rocket's nose meets the deck's base, and when its base clears the top: found once, from its flight. */
let timesFor: { nose: number; clear: number; key: string } | null = null
function passage(s: CloudState): { nose: number; clear: number } {
  const key = `${s.deck}|${s.punch}|${s.length}`
  if (timesFor && timesFor.key === key) return timesFor
  let nose = s.punch - 0.4
  let clear = s.punch + 0.6
  for (let t = s.punch - 4; t < s.punch; t += 0.01) {
    const { base, lean } = s.rocket(t)
    if (base[1] - Math.cos(lean) * s.length <= s.deck + DEPTH) {
      nose = t
      break
    }
  }
  for (let t = s.punch; t < s.punch + 4; t += 0.01) {
    if (s.rocket(t).base[1] <= s.deck - DEPTH) {
      clear = t
      break
    }
  }
  timesFor = { nose, clear, key }
  return timesFor
}

export const cloud = scenery<CloudState>({
  name: 'cloud',
  draw: () => {},
  over: (p: p5, s, c) => {
    const { k, t, ink, weight } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const near = f.y1 > s.deck - DEPTH - 1.5 && f.y0 < s.deck + DEPTH + 1
    if (near) {
      // The hole the rocket bores: where, how wide, and its collar of vapour.
      const { nose, clear } = passage(s)
      const at = s.rocket(Math.min(Math.max(t, nose), clear))
      // The hole runs along the rocket's axis, so it leans as the rocket does: its middle at a height y.
      const slope = Math.max(-1.5, Math.min(1.5, Math.tan(at.lean)))
      const hx0 = at.base[0] + slope * (at.base[1] - s.deck)
      const hxAt = (y: number) => hx0 + slope * (s.deck - y)
      const open = smooth(t, nose - 0.05, nose + 0.3)
      const closing = 1 - 0.8 * smooth(t, clear + 0.4, clear + 5)
      const hw = 0.72 * open * closing
      const x0 = Math.floor(f.x0) - 2
      const x1 = Math.ceil(f.x1) + 2
      const top = s.deck - DEPTH
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const quad = (pts: [number, number][]) => {
        p.beginShape()
        for (const [x, y] of pts) p.vertex(X(x), X(y))
        p.endShape(p.CLOSE)
      }
      for (const L of LAYERS) {
        // The puffs along its top: a few big domes and smaller ones between, jittered, breathing a little; none inside the hole.
        const step = 0.62 * L.size
        const puffs: { x: number; y: number; r: number }[] = []
        const i0 = Math.floor((x0 - t * L.drift) / step) - 1
        const i1 = Math.ceil((x1 - t * L.drift) / step) + 1
        for (let i = i0; i <= i1; i++) {
          const big = hash(i, L.seed, 4) > 0.72
          const r = L.size * (big ? 0.62 + 0.2 * hash(i, L.seed) : 0.34 + 0.24 * hash(i, L.seed) ** 1.4) * (1 + 0.035 * Math.sin(t * 0.45 + i * 1.7))
          const x = i * step + t * L.drift + (hash(i, L.seed, 2) - 0.5) * step * 0.7
          const y = top + L.dy + r * 0.9 + (hash(i, L.seed, 3) - 0.5) * 0.14
          if (Math.abs(x - hxAt(y)) < hw + r * 0.4) continue
          puffs.push({ x, y, r })
        }
        const baseY = s.deck + L.base
        const bodyTop = top + L.dy + 0.45 * L.size
        // The hole's walls are cloud too: billows of every size down each side of it, bulging a little into it.
        const rims: { x: number; y: number; r: number }[] = []
        if (hw > 0.02) {
          for (const side of [-1, 1]) {
            let y = bodyTop
            for (let j = 0; j < 12; j++) {
              const r = L.size * (0.2 + 0.2 * hash(j, L.seed, side > 0 ? 5 : 6))
              y += r * (j === 0 ? 0.3 : 0.8)
              if (y > baseY - r * 0.5) break
              const x = hxAt(y) + side * (hw + r * (0.05 + 0.25 * hash(j, L.seed, 7)))
              rims.push({ x, y, r })
              y += r * 0.8
            }
          }
        }
        const all = puffs.concat(rims)
        // The body: one flat-bottomed band, or two either side of the hole, their inner edges leaning with it.
        const pieces: [number, number][][] = hw > 0.02
          ? [
              [[x0, bodyTop], [hxAt(bodyTop) - hw, bodyTop], [hxAt(baseY) - hw, baseY], [x0, baseY]],
              [[hxAt(bodyTop) + hw, bodyTop], [x1, bodyTop], [x1, baseY], [hxAt(baseY) + hw, baseY]],
            ]
          : [[[x0, bodyTop], [x1, bodyTop], [x1, baseY], [x0, baseY]]]
        const shape = (grow: number) => {
          for (const q of pieces) {
            const cx = q.reduce((a, v) => a + v[0], 0) / q.length
            const cy = q.reduce((a, v) => a + v[1], 0) / q.length
            quad(q.map(([x, y]) => [x + Math.sign(x - cx) * grow, y + Math.sign(y - cy) * grow]))
          }
          for (const q of all) p.circle(X(q.x), X(q.y), X(2 * (q.r + grow)))
        }
        // The outline, once, round the whole layer: everything drawn a hair bigger in ink, then the body over it.
        p.noStroke()
        p.fill(alpha(p, ink, L === LAYERS[0] ? 0.26 : 0.42))
        shape(Math.max(0.012, (weight * 0.7) / k))
        p.fill(L.tone)
        shape(0)
        // The light on the domes' tops (the walls of the hole are in their own shade), and the shade along the base.
        p.fill(alpha(p, LIT, L === LAYERS[0] ? 0.5 : 0.85))
        for (const q of puffs) p.circle(X(q.x - q.r * 0.12), X(q.y - q.r * 0.18), X(2 * q.r * 0.74))
        p.fill(alpha(p, SHADE, 0.55))
        for (const q of rims) p.circle(X(q.x - Math.sign(q.x - hxAt(q.y)) * q.r * 0.25), X(q.y + q.r * 0.2), X(2 * q.r * 0.6))
        ctx.save()
        const sy = baseY - 0.55 * L.size
        const g = ctx.createLinearGradient(0, X(sy), 0, X(baseY))
        g.addColorStop(0, 'rgba(213, 206, 192, 0)')
        g.addColorStop(1, `rgba(${parseInt(SHADE.slice(1, 3), 16)}, ${parseInt(SHADE.slice(3, 5), 16)}, ${parseInt(SHADE.slice(5, 7), 16)}, 0.9)`)
        ctx.fillStyle = g
        const bands: [number, number][][] = hw > 0.02
          ? [
              [[x0, sy], [hxAt(sy) - hw, sy], [hxAt(baseY) - hw, baseY], [x0, baseY]],
              [[hxAt(sy) + hw, sy], [x1, sy], [x1, baseY], [hxAt(baseY) + hw, baseY]],
            ]
          : [[[x0, sy], [x1, sy], [x1, baseY], [x0, baseY]]]
        for (const q of bands) {
          ctx.beginPath()
          q.forEach(([x, y], n) => (n ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))))
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
      // The vapour collar: soft billows thrown up and out from the hole's rim as the rocket goes through, swelling
      // and thinning as they settle back over the deck. Vapour, so no ink.
      if (hw > 0.05) {
        const age = t - nose
        const roll = smooth(age, 0, 0.9)
        const thin = 1 - smooth(age, 0.8, 4.5)
        if (thin > 0) {
          p.noStroke()
          for (const side of [-1, 1]) {
            for (let j = 0; j < 3; j++) {
              const r = (0.3 + 0.14 * hash(j, side > 0 ? 71 : 72)) * (1 + 0.7 * smooth(age, 0, 3))
              const out = hw + roll * (0.2 + 0.35 * j) + 0.25 * smooth(age, 0.6, 4)
              const up = (0.25 + 0.2 * hash(j, 73)) * roll * (1 - 0.7 * smooth(age, 1, 4.5))
              const y = top - up + j * 0.1 + r * 0.3
              const x = hxAt(y) + side * out
              p.fill(alpha(p, WHITE, 0.55 * thin * closing))
              p.circle(X(x), X(y), X(2 * r * 1.15))
              p.fill(alpha(p, LIT, 0.8 * thin * closing))
              p.circle(X(x), X(y), X(2 * r))
            }
          }
        }
      }
      // Thin wisps, drifting ahead of the deck along its top and its base.
      p.noStroke()
      for (let i = 0; i < 6; i++) {
        const wx = x0 + ((hash(i, 81) * (x1 - x0) + t * (0.12 + 0.05 * hash(i, 82))) % (x1 - x0))
        const wy = (hash(i, 83) > 0.5 ? top - 0.15 : s.deck + DEPTH + 0.1) + (hash(i, 84) - 0.5) * 0.2
        p.fill(alpha(p, WHITE, 0.45))
        p.ellipse(X(wx), X(wy), X(0.9 + hash(i, 85) * 0.8), X(0.07))
      }
    }
    // Inside it: the frame is cloud for a moment (full only for an instant, which is when the stage changes
    // universe), with the rocket's shadow going up through it and the glow of its flame under it, drawn the
    // same in both universes so nothing jumps.
    const d = t - s.punch
    const white = d < 0 ? 1 - smooth(-d, 0.025, 0.26) : 1 - smooth(d, 0.025, 0.34)
    if (white > 0) {
      p.push()
      p.noStroke()
      p.fill(alpha(p, WHITE, white))
      p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
      const { base, lean } = s.rocket(t)
      const ux = Math.sin(lean)
      const uy = -Math.cos(lean)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const g = ctx.createRadialGradient(X(base[0]), X(base[1]), 0, X(base[0]), X(base[1]), X(1.6))
      g.addColorStop(0, `rgba(244, 178, 74, ${0.55 * white})`)
      g.addColorStop(1, 'rgba(244, 178, 74, 0)')
      ctx.save()
      ctx.fillStyle = g
      ctx.fillRect(X(base[0] - 1.6), X(base[1] - 1.6), X(3.2), X(3.2))
      ctx.restore()
      p.stroke(alpha(p, '#8E8A80', 0.42 * white))
      p.strokeWeight(X(0.62))
      p.strokeCap(p.ROUND)
      p.line(X(base[0] + ux * 0.35), X(base[1] + uy * 0.35), X(base[0] + ux * (s.length - 0.45)), X(base[1] + uy * (s.length - 0.45)))
      p.pop()
    }
  },
})
