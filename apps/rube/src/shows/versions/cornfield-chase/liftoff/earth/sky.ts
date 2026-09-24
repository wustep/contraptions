import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, scenery, smooth } from '../kit'
import { DUST } from '../worlds'
import { GHOST_REST } from './house'

/**
 * The farm's sky, drawn behind everything, filling whatever the frame is.
 * It keeps time twice: the day comes up over the piano, from the blue before
 * dawn to the dusty white of noon, and the higher the camera goes the deeper
 * the blue gets, which is all the launch needs of it on this side of the
 * cloud.
 *
 * Behind the machine, far off and slower than it: the horizon, a few
 * telegraph poles along a road, a water tower, and the dust wall that stands
 * on the edge of every day there.
 */

/** Where the land meets the sky, in the world's cells, at the nearest. */
export const HORIZON = 1.13
/** How much of the camera's move the far distance makes, across and up. */
const FAR_X = 0.22
const FAR_Y = 0.3
/** The top of the cloud: above this, the farm's sky is no longer drawn. */
export const CLOUD_BASE = -26

interface SkyState {
  /** Show time the rocket is inside the cloud: what the white is timed on. */
  cloud: number
}

const lerp3 = (a: string, b: string, c: string, u: number) => (u < 0.5 ? mixHex(a, b, u * 2) : mixHex(b, c, (u - 0.5) * 2))

export const sky = scenery<SkyState>({
  name: 'sky',
  draw: (p, _s, c) => {
    const { k, t, ink } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    // The day: night-blue to dawn to the flat light of the dust years.
    const day = smooth(t, 0, 14)
    const noon = smooth(t, 20, 45)
    let top = lerp3('#56637A', '#BFC6C2', DUST.sky, (day + noon) / 2)
    let low = lerp3('#B79E86', '#F2DDB8', '#EDDFC0', (day + noon) / 2)
    // Height: the higher the frame, the deeper the blue.
    const up = smooth(-f.cy, 4, 24)
    top = mixHex(top, '#4F79A0', up)
    low = mixHex(low, '#9CB9CC', up)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const hy = f.cy + (HORIZON - f.cy) * FAR_Y
    const g = ctx.createLinearGradient(0, X(f.y0), 0, X(Math.max(f.y0 + 0.1, hy)))
    g.addColorStop(0, top)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))

    // The sun: low, pale, a disc behind the dust.
    const sunX = f.cx - 3.2 + 0.1 * t * 0.02
    const sunY = hy - 0.4 - 1.6 * smooth(t, 2, 30)
    p.noStroke()
    p.fill(alpha(p, '#FFF3D1', 0.35 * day * (1 - up)))
    p.circle(X(sunX), X(sunY), X(0.75))
    p.fill(alpha(p, '#FFF7E4', 0.6 * day * (1 - up)))
    p.circle(X(sunX), X(sunY), X(0.46))

    if (hy > f.y1 + 1) return
    // The dust wall on the horizon: a long low bank, growing over the chase.
    const storm = 0.35 + 0.65 * smooth(t, 36, 80)
    const shift = f.cx * (1 - FAR_X)
    p.fill(alpha(p, '#CDB48A', 0.55 * storm))
    p.beginShape()
    p.vertex(X(f.x0 - 1), X(hy))
    for (let x = Math.floor(f.x0) - 1; x <= f.x1 + 1; x += 0.5) {
      const wx = x - shift
      const hgt = 0.35 + 0.5 * storm * (0.6 + 0.4 * Math.sin(wx * 0.37) + 0.25 * Math.sin(wx * 1.3 + 1))
      p.vertex(X(x), X(hy - hgt))
    }
    p.vertex(X(f.x1 + 1), X(hy))
    p.endShape(p.CLOSE)

    // The land: from the horizon down, the far corn a wash with a grain to it.
    p.fill(DUST.husk)
    p.rect(X(f.cx), X(hy + (f.y1 - hy + 2) / 2), X(f.x1 - f.x0 + 2), X(f.y1 - hy + 2))
    p.stroke(alpha(p, '#B69A5A', 0.55))
    p.strokeWeight(Math.max(1, k * 0.01))
    for (let row = 0; row < 3; row++) {
      const y = hy + 0.08 + row * 0.16
      const gap = 0.13 + row * 0.06
      for (let x = Math.floor((f.x0 - shift) / gap) * gap; x < f.x1 - shift + gap; x += gap) {
        const sx = x + shift
        p.line(X(sx), X(y), X(sx), X(y - 0.05 - row * 0.02))
      }
    }
    p.stroke(ink)
    p.strokeWeight(Math.max(1, k * 0.018))
    p.line(X(f.x0), X(hy), X(f.x1), X(hy))

    // A road's telegraph poles, and a water tower, all far and slow.
    const poles = 0.45
    const pshift = f.cx * (1 - poles)
    const py = f.cy + (HORIZON - f.cy) * 0.5
    p.stroke(alpha(p, ink, 0.55))
    p.strokeWeight(Math.max(1, k * 0.012))
    p.noFill()
    const span = 3.4
    const first = Math.floor((f.x0 - pshift) / span) - 1
    for (let i = first; i <= first + Math.ceil((f.x1 - f.x0) / span) + 2; i++) {
      const x = i * span + pshift
      p.line(X(x), X(py), X(x), X(py - 1.05))
      p.line(X(x - 0.14), X(py - 0.95), X(x + 0.14), X(py - 0.95))
      const nx = x + span
      p.beginShape()
      for (let j = 0; j <= 10; j++) {
        const u = j / 10
        p.vertex(X(x + (nx - x) * u), X(py - 0.95 + 0.18 * 4 * u * (1 - u)))
      }
      p.endShape()
    }
    const tx = 14 + f.cx * (1 - 0.15)
    p.stroke(alpha(p, ink, 0.45))
    p.fill(alpha(p, DUST.shade, 0.6))
    const ty = f.cy + (HORIZON - f.cy) * 0.22
    for (const dx of [-0.25, 0.25]) p.line(X(tx + dx), X(ty), X(tx + dx * 0.6), X(ty - 0.9))
    p.ellipse(X(tx), X(ty - 1.05), X(0.8), X(0.36))
    p.line(X(tx - 0.4), X(ty - 1.05), X(tx - 0.4), X(ty - 0.95))
  },
})

/**
 * Before the first light. Over everything, the ball too: the dark lifts over
 * the first bars, and last of all off the window side of the room, where the
 * light comes from.
 */
/** The ghost's rest on the top shelf, in world cells (`GHOST_REST` from the shelf entered at 0, -2): the dark is least round it. */
const GHOST = [GHOST_REST[0], -2 + GHOST_REST[1]]

export const dawn = scenery<null>({
  name: 'dawn',
  draw: () => {},
  over: (p: p5, _s, c) => {
    const { k, t } = c
    const dark = 1 - smooth(t, 0.4, 5.6)
    if (dark <= 0) return
    const f = frame(p, k)
    const X = (x: number) => x * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // Darkest away from the ghost on the top shelf: until the window catches up, it is the room's light.
    const [gx, gy] = GHOST
    const g = ctx.createRadialGradient(X(gx), X(gy), X(0.12), X(gx), X(gy), X(3.2))
    g.addColorStop(0, `rgba(24, 28, 44, ${0.1 * dark})`)
    g.addColorStop(0.25, `rgba(24, 28, 44, ${0.6 * dark})`)
    g.addColorStop(1, `rgba(20, 22, 36, ${0.92 * dark})`)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))
  },
})
