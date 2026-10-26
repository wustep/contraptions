import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { DARK } from '../worlds'

/**
 * The dark: what the frame is filled with above the cloud. Just over the
 * deck it is still a deep blue with the cloud tops below; higher, black,
 * and the stars come out in three depths that drift at three speeds. The
 * Earth is a curve under everything while the ball is near it, and slips
 * away once the ring has it.
 */
export interface VoidState {
  /** The top of the cloud deck, in world cells. */
  deck: number
  /** Show time from which the Earth is let go. */
  leave: number
}

const LAYERS = [
  { f: 0.04, size: 1.2, cell: 0.9, a: 0.55 },
  { f: 0.1, size: 1.7, cell: 1.4, a: 0.75 },
  { f: 0.22, size: 2.4, cell: 2.3, a: 0.95 },
]

export const voidSky = scenery<VoidState>({
  name: 'void',
  draw: (p: p5, s, c) => {
    const { k, t } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // Height over the deck: 0 in the cloud, 1 well up.
    const up = smooth(s.deck - f.cy, 0, 18)
    const low = mixHex('#27477A', DARK.deep, up)
    const high = mixHex('#15254A', '#070A14', up)
    const g = ctx.createLinearGradient(0, X(f.y0), 0, X(f.y1))
    g.addColorStop(0, high)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))

    // Stars, three depths. Each layer is a tiling of cells with a star or none, offset by how far it drifts.
    p.noStroke()
    const shown = smooth(s.deck - f.cy, 2, 10)
    // A star is a few pixels at any scale, so at Overview's (2 to 13 px a cell, the whole world in the frame) they would
    // be a solid speckle, and 25,000 fills a frame (4 frames a second). They go below 14 px a cell; no real view comes
    // that far out (the widest, on a 320 px phone, is 17).
    const sparse = smooth(k, 10, 14)
    for (let l = 0; sparse > 0 && l < LAYERS.length; l++) {
      const L = LAYERS[l]
      const ox = f.cx * (1 - L.f)
      const oy = f.cy * (1 - L.f)
      const c0 = Math.floor((f.x0 - ox) / L.cell) - 1
      const c1 = Math.ceil((f.x1 - ox) / L.cell) + 1
      const r0 = Math.floor((f.y0 - oy) / L.cell) - 1
      const r1 = Math.ceil((f.y1 - oy) / L.cell) + 1
      for (let i = c0; i <= c1; i++) {
        for (let j = r0; j <= r1; j++) {
          if (hash(i, j, l * 7 + 1) > 0.55) continue
          const x = ox + (i + hash(i, j, l * 7 + 2)) * L.cell
          const y = oy + (j + hash(i, j, l * 7 + 3)) * L.cell
          // Steady: out here there is no air to make them twinkle.
          const strength = L.a * shown * sparse * (0.5 + hash(i, j, l * 7 + 4) * 0.5)
          const size = L.size * (0.6 + hash(i, j, l * 7 + 5) * 0.7)
          // Pinpoints, all of them: no star blooms. (Painted straight onto the canvas: a p5 colour a star is the costliest
          // thing in the frame.)
          ctx.fillStyle = `rgba(${hash(i, j, 31) < 0.3 ? '143, 198, 230' : '244, 238, 223'}, ${Math.min(1, strength)})`
          ctx.beginPath()
          ctx.arc(X(x), X(y), size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // The Earth: a curve along the foot of the frame that bends more the higher we are, and is let go of later.
    const gone = smooth(t, s.leave, s.leave + 6)
    if (gone >= 1) return
    drawMoon(p, c, f, s, gone)
    drawEarth(p, c, f, s, gone)
  },
})

type Frame = ReturnType<typeof frame>
type Drawn = { k: number; t: number; weight: number }

/** How much of the camera's move the Earth's ground makes: more than the stars, since it is nearer. */
const GROUND_F = 0.3
/** The weather's drift over the ground, cells a second along the limb. */
const WEATHER_V = 0.22

/**
 * The Earth under the orbit. Not a floor: a planet, its curve tighter the higher we climb, until it is a disc in the
 * corner. The sun is low on the left, so the day is on the left and the night comes across from the right, with the
 * lights of towns on it. The ground slides back under the orbit and the weather slides over the ground, each at its
 * own pace, so even a held frame is moving. The air is a thin bright line at the limb, not a glow.
 */
function drawEarth(p: p5, c: Drawn, f: Frame, s: VoidState, gone: number): void {
  const { k, t } = c
  const X = (x: number) => x * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rise = Math.max(0, s.deck - f.cy)
  const half = (f.y1 - f.y0) / 2
  // Just over the cloud it is a wide curve along the foot of the frame; climbing, it draws in to a disc in the corner.
  const w = (f.x1 - f.x0) / 2
  const settle = smooth(rise, 2, 22)
  const R = 70 - 56 * settle
  const ax = f.cx - w * 0.62 * settle
  const top = f.cy + half * (0.84 - 0.12 * settle) + gone * half * 1.2
  const cx = ax - R * 0.35 * settle
  const cy = top + R * (1 - 0.1 * settle)
  const on = 1 - gone
  // Which way round the limb the frame looks: the angles of its corners about the planet's middle.
  let th0 = Infinity
  let th1 = -Infinity
  for (const [x, y] of [[f.x0, f.y0], [f.x1, f.y0], [f.x0, f.y1], [f.x1, f.y1], [Math.max(f.x0, Math.min(f.x1, cx)), f.y0]]) {
    const a = Math.atan2(y - cy, x - cx)
    th0 = Math.min(th0, a)
    th1 = Math.max(th1, a)
  }
  // The night's edge: a line a little right of the frame's middle, leaning with the light from the low left.
  const nx = f.cx + w * 0.38
  const lean = 0.3
  const night = (x: number, y: number) => (x - nx) * Math.cos(lean) + (y - (cy - R)) * Math.sin(lean)
  // A place on the surface: `u` along the limb (cells) and `d` in from it.
  const at = (u: number, d: number): [number, number] => {
    const r = R - d
    const a = -Math.PI / 2 + u / R
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const ground = -(GROUND_F * f.cx + 0.08 * t)
  const u0 = (th0 + Math.PI / 2) * R - 2
  const u1 = (th1 + Math.PI / 2) * R + 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(X(cx), X(cy), X(R), 0, Math.PI * 2)
  ctx.clip()
  // The sea: daylight skims the limb; it deepens away from it.
  const ocean = ctx.createRadialGradient(X(cx - R * 0.3), X(cy - R * 0.85), 0, X(cx), X(cy), X(R * 1.1))
  ocean.addColorStop(0, '#497DA9')
  ocean.addColorStop(0.32, '#2B507D')
  ocean.addColorStop(0.7, '#142A49')
  ocean.addColorStop(1, '#0B152B')
  ctx.fillStyle = ocean
  ctx.fillRect(X(cx - R), X(cy - R), X(2 * R), X(2 * R))
  // Land: long low shapes along the curve, squeezed toward the limb, sliding back under the orbit.
  const LAND = 9
  const towns: [number, number, number][] = []
  for (let i = Math.floor((u0 - ground) / LAND) - 1; i <= Math.ceil((u1 - ground) / LAND); i++) {
    if (hash(i, 3, 61) > 0.62) continue
    const mid = ground + (i + 0.2 + 0.6 * hash(i, 4, 61)) * LAND
    const len = (0.3 + 0.45 * hash(i, 5, 61)) * LAND
    const d0 = 0.08 + 0.5 * hash(i, 6, 61) ** 2
    const d1 = d0 + 0.25 + 1.6 * hash(i, 7, 61)
    ctx.fillStyle = `rgba(${hash(i, 8, 61) < 0.4 ? '125, 116, 87' : '79, 108, 96'}, ${0.7 * on})`
    ctx.beginPath()
    const N = 14
    for (let j = 0; j <= N; j++) {
      const e = Math.sin((Math.PI * j) / N)
      const [x, y] = at(mid - len / 2 + (len * j) / N, d0 + (d1 - d0) * 0.5 * (1 - e) + 0.12 * (hash(i, j, 62) - 0.5) * e)
      ctx.lineTo(X(x), X(y))
    }
    for (let j = N; j >= 0; j--) {
      const e = Math.sin((Math.PI * j) / N)
      const [x, y] = at(mid - len / 2 + (len * j) / N, d1 - (d1 - d0) * 0.5 * (1 - e) + 0.3 * (hash(i, j, 63) - 0.5) * e)
      ctx.lineTo(X(x), X(y))
    }
    ctx.closePath()
    ctx.fill()
    // Its towns, for the night side.
    for (let j = 0; j < 9; j++) towns.push([mid + (hash(i, j, 64) - 0.5) * len * 0.8, d0 + (0.15 + 0.5 * hash(i, j, 65)) * (d1 - d0), hash(i, j, 66)])
  }
  // Weather: rows of broken cloud over it, each row drifting at its own pace, and here and there a heap of cumulus.
  ctx.lineCap = 'round'
  for (let row = 0; row < 8; row++) {
    const d = 0.12 + 0.18 * row + 0.05 * row * row
    const P = 2.4 + 0.5 * row
    const drift = ground - WEATHER_V * (0.4 + 0.9 * hash(row, 71)) * t
    for (let i = Math.floor((u0 - drift) / P) - 1; i <= Math.ceil((u1 - drift) / P); i++) {
      if (hash(i, row, 72) > 0.62) continue
      const um = drift + (i + hash(i, row, 73)) * P
      const len = (0.35 + 0.6 * hash(i, row, 74)) * P
      const thick = (0.016 + 0.05 * hash(i, row, 75)) * (0.6 + 0.25 * row)
      const a = (0.16 + 0.22 * hash(i, row, 76)) * on
      const am = -Math.PI / 2 + um / R
      ctx.strokeStyle = `rgba(211, 227, 232, ${a})`
      ctx.lineWidth = X(thick)
      ctx.beginPath()
      ctx.arc(X(cx), X(cy), X(R - d), am - len / 2 / R, am + len / 2 / R)
      ctx.stroke()
      if (row >= 1 && hash(i, row, 77) > 0.72) {
        // A heap of cumulus on the band: flat lobes, squashed toward the limb.
        ctx.fillStyle = `rgba(228, 238, 240, ${Math.min(1, a * 1.3)})`
        const squash = 0.22 + 0.1 * row
        const turn = am + Math.PI / 2
        ctx.beginPath()
        for (let j = 0; j < 4; j++) {
          const [x, y] = at(um + (j - 1.5) * len * 0.16, d - 0.02 * j)
          const big = (0.12 + 0.12 * hash(i, j, 78)) * (0.7 + 0.2 * row)
          ctx.moveTo(X(x + big * Math.cos(turn)), X(y + big * Math.sin(turn)))
          ctx.ellipse(X(x), X(y), X(big), X(big * squash), turn, 0, Math.PI * 2)
        }
        ctx.fill()
      }
    }
  }
  // The night, across from the right: a strip of dusk, then dark, and the towns lit on it.
  ctx.save()
  ctx.translate(X(nx), X(cy - R))
  ctx.rotate(lean)
  // One soft ramp from day into night across the dusk: two flat steps of shade read as two seams down the planet.
  const ng = ctx.createLinearGradient(X(-1.1), 0, X(0.5), 0)
  ng.addColorStop(0, 'rgba(8, 14, 32, 0)')
  ng.addColorStop(1, `rgba(8, 14, 32, ${0.62 * on})`)
  ctx.fillStyle = ng
  ctx.fillRect(X(-1.1), X(-2), X(2 * R + 5.1), X(2 * R + 4))
  ctx.restore()
  for (const [u, d, h] of towns) {
    const [x, y] = at(u, d)
    const into = night(x, y)
    if (into < 0.15) continue
    ctx.fillStyle = `rgba(${h < 0.7 ? '233, 168, 90' : '242, 213, 152'}, ${(0.3 + 0.35 * h) * smooth(into, 0.15, 0.9) * on})`
    ctx.beginPath()
    ctx.arc(X(x), X(y), Math.max(0.5, X(0.01 + 0.009 * h)), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // The air: a thin bright line at the limb and a fainter one over it, flat, dimmer over the night.
  let term = Math.PI
  for (let a = th0 - 0.05; a < th1 + 0.05; a += 0.002) {
    if (night(cx + Math.cos(a) * R, cy + Math.sin(a) * R) > 0) {
      term = a
      break
    }
  }
  p.noFill()
  p.strokeCap(p.SQUARE)
  // (Day, dimming through the dusk as the ground does, to night: one stroke each, its light turning with the angle, so
  // it fades rather than stepping where the dusk begins and ends.)
  const dusk = 0.7 / R
  const TAU = Math.PI * 2
  const ice = DARK.ice.slice(1).match(/../g)!.map((h) => parseInt(h, 16)).join(', ')
  for (const [dr, wd, a] of [[0.05, 0.1, 0.5], [0.19, 0.16, 0.16]] as [number, number, number][]) {
    // Stops round the planet's middle, from where the dusk begins on the day side.
    const from = term - 1.6 * dusk
    const g = ctx.createConicGradient(from, X(cx), X(cy))
    const span = 2.3 * dusk
    for (let i = 0; i <= 8; i++) {
      const u = i / 8
      g.addColorStop((u * span) / TAU, `rgba(${ice}, ${a * (1 - 0.7 * smooth(u, 0, 1)) * on})`)
    }
    // Round the far side of the planet, out of any frame, from night back to day.
    g.addColorStop((span + 1.8) / TAU, `rgba(${ice}, ${a * 0.3 * on})`)
    g.addColorStop((TAU - 1.8) / TAU, `rgba(${ice}, ${a * on})`)
    ctx.strokeStyle = g
    ctx.lineWidth = X(wd)
    ctx.beginPath()
    ctx.arc(X(cx), X(cy), X(R + dr), th0 - 0.05, th1 + 0.05)
    ctx.stroke()
  }
  p.stroke(alpha(p, DARK.ice, 0.75 * on))
  p.strokeWeight(Math.max(0.8, c.weight * 0.7))
  p.circle(X(cx), X(cy), X(R * 2))
}

/** The Moon, far off and small over the Earth's limb, lit from the low left, a little more than half full: it barely moves for the camera. */
const MOON_F = 0.06
const MOON: [number, number] = [3.5, -3.75]
const MOON_R = 0.34
function drawMoon(p: p5, c: Drawn, f: Frame, s: VoidState, gone: number): void {
  const { k } = c
  const X = (x: number) => x * k
  const shown = smooth(s.deck - f.cy, 3, 10) * (1 - gone)
  if (shown <= 0.01) return
  const mx = f.cx * (1 - MOON_F) + MOON[0]
  const my = f.cy * (1 - MOON_F) + MOON[1]
  if (mx + MOON_R < f.x0 || mx - MOON_R > f.x1 || my + MOON_R < f.y0 || my - MOON_R > f.y1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalAlpha *= shown
  // Its night side, barely there by earthshine.
  p.noStroke()
  p.fill(alpha(p, '#8C93A6', 0.12))
  p.circle(X(mx), X(my), X(2 * MOON_R))
  // The lit part: the sunward half and, past the terminator's bulge, a little more.
  const lit = () => {
    ctx.beginPath()
    ctx.arc(X(mx), X(my), X(MOON_R), Math.PI / 2, (Math.PI * 3) / 2)
    ctx.ellipse(X(mx), X(my), X(MOON_R * 0.42), X(MOON_R), 0, -Math.PI / 2, Math.PI / 2)
    ctx.closePath()
  }
  lit()
  ctx.fillStyle = '#CFC8B6'
  ctx.fill()
  ctx.save()
  ctx.clip()
  // Its seas.
  p.fill('#A8A291')
  for (const [ox, oy, rx, ry] of [[-0.12, -0.1, 0.13, 0.09], [0.05, -0.16, 0.08, 0.06], [-0.02, 0.07, 0.15, 0.08], [0.14, 0.12, 0.07, 0.05]]) {
    p.ellipse(X(mx + ox), X(my + oy), X(rx * 2), X(ry * 2))
  }
  ctx.restore()
  lit()
  ctx.strokeStyle = 'rgba(236, 229, 211, 0.5)'
  ctx.lineWidth = Math.max(0.6, c.weight * 0.45)
  ctx.stroke()
  ctx.restore()
}
