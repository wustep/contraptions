import type p5 from 'p5'
import { mixHex } from '../../../../parts'
import { frame, hash, scenery, smooth } from '../liftoff/kit'
import { HORIZON } from '../liftoff/earth/sky'
import type { VoidState } from '../liftoff/space/sky'
import { grid } from './look'
import { RAMPS } from './palette'

/**
 * The pixel take's own skies, in place of Liftoff's (`index.ts` swaps them in): the same places, the same clock and
 * the same parallax, but staged as a game's backdrops. Flat fills only, no alpha and no gradients: a sky is stacked
 * bands, a cloud is a stepped heap of two tones, the far land is a run of stair-stepped mesas, and a star is exactly
 * one block of the grid (`look.ts`), snapped to it.
 */

const { night, navy, sky: day, dust, corn, rust, dusk, steel, bone } = RAMPS

/** How much of the camera's move the far distance makes, across and up (as Liftoff's sky). */
const FAR_X = 0.22
const FAR_Y = 0.3

/** Band edges above the horizon, in cells: a game sky is a stack of flat stripes, narrowest at the bottom. */
const BANDS = [0.35, 0.8, 1.4, 2.2, 3.3, 4.8, 7]

/** The sky's stripes, horizon first, at each time of day, and high over the farm. */
const SKY = {
  night: [dusk[1], night[3], night[3], night[2], night[2], night[1], night[1], night[0]],
  dawn: [rust[4], dusk[4], dusk[3], dusk[2], navy[3], navy[2], navy[1], navy[1]],
  noon: [dust[5], dust[5], day[2], day[2], day[1], day[1], day[0], day[0]],
  high: [day[1], day[0], day[0], navy[3], navy[3], navy[2], navy[2], navy[1]],
}
const SKIES = [SKY.night, SKY.dawn, SKY.noon]

interface SkyState {
  cloud: number
}

/** The farm's sky: the day coming up over the piano, deepening as the camera climbs, with clouds, mesas and a road. */
export const farmSky = scenery<SkyState>({
  name: 'sky',
  draw: (p, _s, c) => {
    const { k, t, ink } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const day0 = smooth(t, 0, 14)
    const noon = smooth(t, 20, 45)
    const up = smooth(-f.cy, 4, 24)
    const hy = f.cy + (HORIZON - f.cy) * FAR_Y
    // The sky is a stack of stripes, each a paint. Time moves a stripe from one ramp to the next, the lowest first,
    // so the day comes up as a game's does: a band at a time.
    const phase = day0 + noon
    const height = up * SKIES.length
    const stripe = (i: number) => {
      const lift = Math.max(0, Math.min(1, height * 0.5 - (SKY.night.length - 1 - i) * 0.12))
      const when = Math.min(2, Math.floor(phase * 1.5 + i * 0.12 + 0.2))
      const ramp = lift > 0.5 ? SKY.high : SKIES[when]
      return ramp[Math.min(ramp.length - 1, i)]
    }
    p.noStroke()
    const n = SKY.night.length
    p.fill(stripe(n - 1))
    p.rect(X((f.x0 + f.x1) / 2), X((f.y0 + hy) / 2), X(f.x1 - f.x0 + 2), X(hy - f.y0 + 2))
    for (let i = n - 2; i >= 0; i--) {
      const yb = hy - BANDS[i]
      p.fill(stripe(i))
      p.rect(X((f.x0 + f.x1) / 2), X((yb + hy) / 2), X(f.x1 - f.x0 + 2), X(hy - yb))
    }

    // The sun: a disc with a ring of glare round it, both flat.
    const sunX = f.cx - 3.2
    const sunY = hy - 0.4 - 1.6 * smooth(t, 2, 30)
    if (day0 > 0.05 && up < 0.9) {
      p.fill(phase < 0.6 ? rust[4] : corn[4])
      p.circle(X(sunX), X(sunY), X(0.95))
      p.fill(phase < 0.6 ? corn[4] : bone[0])
      p.circle(X(sunX), X(sunY), X(0.6))
    }

    // Clouds, far and slow: stepped heaps, the light on top and a shade along the foot.
    const cshift = f.cx * (1 - 0.1) + t * 0.04
    const lit = phase < 0.6 ? dusk[4] : bone[0]
    const shade = phase < 0.6 ? dusk[3] : up > 0.5 ? day[1] : dust[4]
    const c0 = Math.floor((f.x0 - cshift) / 5) - 1
    for (let i = c0; i <= c0 + Math.ceil((f.x1 - f.x0) / 5) + 2; i++) {
      if (hash(i, 3, 61) < 0.35) continue
      const cx = cshift + i * 5 + hash(i, 1, 61) * 2
      const cy = hy - 1.6 - hash(i, 2, 61) * 2.2 + (f.cy - hy) * 0.15
      const wide = 0.9 + hash(i, 4, 61) * 1.1
      p.fill(lit)
      p.rect(X(cx), X(cy), X(wide * 2), X(0.36))
      p.rect(X(cx - wide * 0.25), X(cy - 0.26), X(wide * 1.1), X(0.3))
      p.rect(X(cx + wide * 0.1), X(cy - 0.46), X(wide * 0.5), X(0.24))
      p.fill(shade)
      p.rect(X(cx + 0.05), X(cy + 0.2), X(wide * 1.8), X(0.12))
    }

    if (hy > f.y1 + 1) return
    // The dust wall on the horizon, as mesas: flat tops, stair-stepped sides, growing over the chase.
    const storm = 0.35 + 0.65 * smooth(t, 36, 80)
    const shift = f.cx * (1 - FAR_X)
    const STEP = 0.4
    p.fill(dust[3])
    for (let x = Math.floor((f.x0 - shift) / STEP) * STEP - STEP; x <= f.x1 - shift + STEP; x += STEP) {
      const wx = Math.round(x / STEP)
      const swell = 0.6 + 0.4 * Math.sin(wx * 0.15) + 0.25 * Math.sin(wx * 0.52 + 1)
      const hgt = Math.round((0.3 + 0.55 * storm * swell) / 0.15) * 0.15
      p.rect(X(x + shift + STEP / 2), X(hy - hgt / 2), X(STEP + 0.02), X(hgt))
    }
    p.fill(dust[4])
    for (let x = Math.floor((f.x0 - shift) / STEP) * STEP - STEP; x <= f.x1 - shift + STEP; x += STEP) {
      const wx = Math.round(x / STEP)
      const swell = 0.6 + 0.4 * Math.sin(wx * 0.15) + 0.25 * Math.sin(wx * 0.52 + 1)
      const hgt = Math.round((0.3 + 0.55 * storm * swell) / 0.15) * 0.15
      p.rect(X(x + shift + STEP / 2), X(hy - hgt + 0.04), X(STEP + 0.02), X(0.08))
    }

    // The land: three flat bands to the foot of the frame, and rows of furrow marks.
    const bands = [dust[4], dust[3], corn[2], dust[2]]
    const depth = [0, 0.18, 0.55, 1.3]
    for (let i = 0; i < bands.length; i++) {
      const y0 = hy + depth[i]
      p.fill(bands[i])
      p.rect(X((f.x0 + f.x1) / 2), X((y0 + f.y1 + 2) / 2), X(f.x1 - f.x0 + 2), X(f.y1 + 2 - y0))
    }
    p.fill(dust[2])
    for (let r = 0; r < 3; r++) {
      const y = hy + 0.26 + r * 0.32
      const gap = 0.5 + r * 0.25
      const off = shift * (1 + r * 0.3)
      for (let x = Math.floor((f.x0 - off) / gap) * gap; x < f.x1 - off + gap; x += gap) {
        p.rect(X(x + off), X(y), X(0.14 + r * 0.04), X(0.05 + r * 0.02))
      }
    }
    p.fill(ink)
    p.rect(X((f.x0 + f.x1) / 2), X(hy), X(f.x1 - f.x0 + 2), X(0.035))

    // The road's telegraph poles, and a water tower: solid posts and a flat tank.
    const pshift = f.cx * (1 - 0.45)
    const py = f.cy + (HORIZON - f.cy) * 0.5
    const span = 3.4
    const pole = dust[1]
    const first = Math.floor((f.x0 - pshift) / span) - 1
    for (let i = first; i <= first + Math.ceil((f.x1 - f.x0) / span) + 2; i++) {
      const x = i * span + pshift
      p.fill(pole)
      p.rect(X(x), X(py - 0.52), X(0.07), X(1.05))
      p.rect(X(x), X(py - 0.95), X(0.36), X(0.06))
      p.noFill()
      p.stroke(pole)
      p.strokeWeight(X(0.03))
      p.beginShape()
      for (let j = 0; j <= 8; j++) {
        const v = j / 8
        p.vertex(X(x + span * v), X(py - 0.95 + 0.18 * 4 * v * (1 - v)))
      }
      p.endShape()
      p.noStroke()
    }
    const tx = 14 + f.cx * (1 - 0.15)
    const ty = f.cy + (HORIZON - f.cy) * 0.22
    p.fill(dust[1])
    for (const dx of [-0.25, 0.25]) p.rect(X(tx + dx * 0.8), X(ty - 0.45), X(0.07), X(0.9))
    p.rect(X(tx), X(ty - 1.05), X(0.82), X(0.36))
    p.fill(dust[2])
    p.rect(X(tx), X(ty - 1.17), X(0.82), X(0.12))
    p.fill(dust[1])
    p.rect(X(tx), X(ty - 1.3), X(0.5), X(0.1))
  },
})

/** A star's look: one block, a cross of five, or a cross with long arms. */
const CROSS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
const BIG = [...CROSS, [2, 0], [-2, 0], [0, 2], [0, -2]]

/** Stars in three depths, as Liftoff's, but each one a block of the grid; the Earth as banded flat discs. */
export const voidSky = scenery<VoidState>({
  name: 'void',
  draw: (p: p5, s, c) => {
    const { k } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // Just over the deck, the deep blue; higher, the black. Flat stripes down the frame.
    const up = smooth(s.deck - f.cy, 0, 18)
    const high = mixHex(navy[1], night[0], up)
    const low = mixHex(navy[2], night[1], up)
    p.noStroke()
    const n = 5
    for (let i = 0; i < n; i++) {
      p.fill(mixHex(high, low, i / (n - 1)))
      const y0 = f.y0 + ((f.y1 - f.y0) * i) / n
      p.rect(X((f.x0 + f.x1) / 2), X(y0 + (f.y1 - f.y0) / n / 2), X(f.x1 - f.x0 + 2), X((f.y1 - f.y0) / n + 0.02))
    }

    // Stars: placed in cells as Liftoff's are, then drawn in the canvas's own pixels, snapped to the grid's blocks.
    const shown = smooth(s.deck - f.cy, 2, 10)
    const B = grid.block || Math.max(2, Math.round((Math.min(p.width / (16 / 9), p.height) * p.pixelDensity()) / 108))
    const m = ctx.getTransform()
    if (shown > 0.2) {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const LAYERS = [{ f: 0.04, cell: 0.9 }, { f: 0.1, cell: 1.4 }, { f: 0.22, cell: 2.3 }]
      for (let l = 0; l < LAYERS.length; l++) {
        const L = LAYERS[l]
        const ox = f.cx * (1 - L.f)
        const oy = f.cy * (1 - L.f)
        const c0 = Math.floor((f.x0 - ox) / L.cell) - 1
        const c1 = Math.ceil((f.x1 - ox) / L.cell) + 1
        const r0 = Math.floor((f.y0 - oy) / L.cell) - 1
        const r1 = Math.ceil((f.y1 - oy) / L.cell) + 1
        for (let i = c0; i <= c1; i++) {
          for (let j = r0; j <= r1; j++) {
            const keep = hash(i, j, l * 7 + 1)
            // Fewer as the dark comes in from the blue, so the field fills in rather than fades in.
            if (keep > 0.5 * shown) continue
            const x = (ox + (i + hash(i, j, l * 7 + 2)) * L.cell) * k
            const y = (oy + (j + hash(i, j, l * 7 + 3)) * L.cell) * k
            const px = m.a * x + m.c * y + m.e
            const py = m.b * x + m.d * y + m.f
            const bx = grid.x + Math.floor((px - grid.x) / B) * B
            const by = grid.y + Math.floor((py - grid.y) / B) * B
            const kind = hash(i, j, l * 7 + 5)
            const shape = l === 2 && kind > 0.9 ? BIG : l >= 1 && kind > 0.75 ? CROSS : null
            const tint = hash(i, j, 31)
            if (shape) {
              // A cross: its arms a step dimmer than its heart.
              ctx.fillStyle = l === 2 ? day[0] : steel[3]
              for (const [dx, dy] of shape) ctx.fillRect(bx + dx * B, by + dy * B, B, B)
              ctx.fillStyle = bone[0]
            } else {
              ctx.fillStyle = l === 0 ? steel[2] : tint < 0.25 ? day[1] : tint < 0.32 ? corn[3] : bone[0]
            }
            ctx.fillRect(bx, by, B, B)
          }
        }
      }
      ctx.restore()
    }

    // The Earth: where Liftoff's is, a disc of flat bands lit from its top left, with a ring of air round it.
    const gone = smooth(c.t, s.leave, s.leave + 6)
    if (gone >= 1) return
    const rise = Math.max(0, s.deck - f.cy)
    const half = (f.y1 - f.y0) / 2
    const w = (f.x1 - f.x0) / 2
    const settle = smooth(rise, 2, 22)
    const R = 70 - 56 * settle
    const ax = f.cx - w * 0.62 * settle
    const top = f.cy + half * (0.84 - 0.12 * settle) + gone * half * 1.2
    const cx = ax - R * 0.35 * settle
    const cy = top + R * (1 - 0.1 * settle)
    p.fill(navy[2])
    p.circle(X(cx), X(cy), X(2 * (R + 0.7)))
    p.fill(day[0])
    p.circle(X(cx), X(cy), X(2 * (R + 0.3)))
    ctx.save()
    ctx.beginPath()
    ctx.arc(X(cx), X(cy), X(R), 0, Math.PI * 2)
    ctx.clip()
    p.fill(night[1])
    p.circle(X(cx), X(cy), X(2 * R))
    const lx = cx - R * 0.3
    const ly = cy - R * 0.85
    for (const [rr, col] of [[1.0, navy[0]], [0.7, navy[1]], [0.42, navy[2]], [0.2, navy[3]]] as const) {
      p.fill(col)
      p.circle(X(lx), X(ly), X(2 * R * 1.1 * rr))
    }
    // Weather: broken bands of cloud along the curve, solid.
    p.noFill()
    p.strokeCap(p.SQUARE)
    for (let i = 0; i < 12; i++) {
      if (hash(i, 7) < 0.4) continue
      const rr = R - 0.25 - i * 0.3 - hash(i, 9) * 0.2
      const span = (0.8 + hash(i, 5) * 3.4) / rr
      const a0 = -Math.PI / 2 + ((hash(i, 3) - 0.5) * 16 - (f.cx - cx) * 0.02) / rr
      p.stroke(i < 4 ? day[2] : day[0])
      p.strokeWeight(X(0.06 + 0.06 * hash(i, 8)))
      p.arc(X(cx), X(cy), X(rr * 2), X(rr * 2), a0, a0 + span)
    }
    ctx.restore()
    p.strokeCap(p.ROUND)
    p.noStroke()
  },
})
