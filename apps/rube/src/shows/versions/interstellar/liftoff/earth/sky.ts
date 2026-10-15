import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { DUST } from '../worlds'
import { base, crows, dustWall, farmsteads, freight, groundOf, type Far } from './far'
import { WINDOW } from './house'
import { dayAt, windAt } from './light'

/**
 * The farm's sky, drawn behind everything, filling whatever the frame is.
 * It keeps time twice: the day goes by over Act I (`light.ts`), from the blue
 * before dawn through the bleached white of noon to the ochre of the storm
 * light at the launch, and the higher the camera goes the deeper the blue
 * gets, which is all the climb needs of it on this side of the cloud.
 *
 * Behind the machine, far off and slower than it (`far.ts`): the dust wall on
 * the horizon, a low bank in the morning and a storm towering behind the
 * launch; farmsteads and windmills, a freight in the morning, a few
 * telegraph poles along a road, a water tower, crows; and past the dam,
 * NASA's base.
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

export const sky = scenery<SkyState>({
  name: 'sky',
  draw: (p, _s, c) => {
    const { k, t, ink } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const day = dayAt(t)
    // Height: the higher the frame, the deeper the blue.
    const up = smooth(-f.cy, 4, 24)
    const top = mixHex(day.top, '#4F79A0', up)
    const low = mixHex(day.low, '#9CB9CC', up)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const hy = f.cy + (HORIZON - f.cy) * FAR_Y
    const g = ctx.createLinearGradient(0, X(f.y0), 0, X(Math.max(f.y0 + 0.1, hy)))
    g.addColorStop(0, top)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))

    // The sun: a flat disc behind the dust, low on the left in the morning, overhead at noon, coming down on the left
    // and going orange into the wall by the launch. A thin step of haze round it, no glow.
    const lit = smooth(t, 0, 14) * (1 - up)
    const sunX = f.cx + day.sunX
    const sunY = hy - day.sunUp - 0.4 * (1 - smooth(t, 2, 30))
    p.noStroke()
    p.fill(alpha(p, day.sun, 0.16 * lit))
    p.circle(X(sunX), X(sunY), X(day.sunR * 3.1))
    p.fill(alpha(p, mixHex(day.sun, '#FFFFFF', 0.25), 0.62 * lit + 0.25 * day.warm * (1 - up)))
    p.circle(X(sunX), X(sunY), X(day.sunR * 2))

    if (hy > f.y1 + 1) return
    const far: Far = { p, c, ctx, f, hy, day, up }
    // The dust wall on the horizon: a low bank in the morning, a storm towering behind the launch.
    dustWall(far)

    // The land: from the horizon down, the far corn a wash with a grain to it.
    const land = ctx.createLinearGradient(0, X(hy), 0, X(Math.max(hy + 0.1, f.y1)))
    land.addColorStop(0, day.land[0])
    land.addColorStop(0.35, day.land[1])
    land.addColorStop(1, day.land[2])
    ctx.fillStyle = land
    ctx.fillRect(X(f.x0 - 1), X(hy), X(f.x1 - f.x0 + 2), X(Math.max(0.1, f.y1 - hy + 2)))
    // The wall's shadow, come out over the far land ahead of it.
    const shade = smooth(t, 62, 84) * (1 - up)
    if (shade > 0) {
      const sg = ctx.createLinearGradient(0, X(hy), 0, X(hy + 1.6))
      sg.addColorStop(0, `rgba(122, 82, 50, ${0.32 * shade})`)
      sg.addColorStop(1, 'rgba(122, 82, 50, 0)')
      ctx.fillStyle = sg
      ctx.fillRect(X(f.x0 - 1), X(hy), X(f.x1 - f.x0 + 2), X(1.6))
    }
    const shift = f.cx * (1 - FAR_X)
    p.stroke(alpha(p, mixHex('#B69A5A', '#8E6A44', day.warm), 0.55))
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

    // Far off along the horizon: farmsteads, windmills turning, a grain elevator, and in the morning a freight.
    farmsteads(far)
    freight(far)

    // A road's telegraph poles, and a water tower, all far and slow.
    const poles = 0.45
    const pshift = f.cx * (1 - poles)
    const py = groundOf(far, poles)
    p.stroke(alpha(p, ink, 0.55))
    p.strokeWeight(Math.max(1, k * 0.012))
    p.noFill()
    const span = 3.4
    const first = Math.floor((f.x0 - pshift) / span) - 1
    // The wires sway a little in the wind, more as it gets up.
    const sway = 0.03 + 0.05 * day.warm
    for (let i = first; i <= first + Math.ceil((f.x1 - f.x0) / span) + 2; i++) {
      const x = i * span + pshift
      p.line(X(x), X(py), X(x), X(py - 1.05))
      p.line(X(x - 0.14), X(py - 0.95), X(x + 0.14), X(py - 0.95))
      const nx = x + span
      const sag = 0.18 + sway * Math.sin(t * 1.1 + i * 1.7)
      p.beginShape()
      for (let j = 0; j <= 10; j++) {
        const u = j / 10
        p.vertex(X(x + (nx - x) * u), X(py - 0.95 + sag * 4 * u * (1 - u)))
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

    // Past the dam, NASA's base: its hangar, water tower, radar, tanks, blockhouse, the crews' road and the floodlights.
    base(far)
    // Crows now and then, crossing; a big flock ahead of the storm.
    crows(far)

    // Windborne dust in the distance, on the wind; indexed in world space so seeking gives the same air.
    p.noStroke()
    const drift = windAt(t)
    const firstDust = Math.floor(f.x0 - shift - drift) - 1
    const storm = 0.35 + 0.65 * day.storm
    for (let i = firstDust; i <= Math.ceil(f.x1 - shift - drift) + 1; i++) {
      for (let j = 0; j < 3; j++) {
        const x = shift + drift + i + hash(i, j, 81)
        const y = hy - 0.06 - hash(i, j, 82) * 1.15 + 0.04 * Math.sin(t * 0.5 + i)
        p.fill(alpha(p, j ? DUST.light : DUST.wood, (0.12 + 0.2 * hash(i, j, 83)) * storm * (1 - up)))
        p.ellipse(X(x), X(y), X(0.014 + 0.018 * hash(i, j, 84) + 0.03 * day.warm), X(0.009))
      }
    }
  },
})

/**
 * Before the first light. Over everything, the ball too: the dark lifts over
 * the first bars, least of all where the first light comes in, by the window,
 * and he sits at the end of the top shelf nearest it. (It used to be least
 * round him, a pocket of light on the ball that read as a spotlight.)
 */
const PANE = [(WINDOW.x0 + WINDOW.x1) / 2, (WINDOW.y0 + WINDOW.y1) / 2]

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
    // Darkest away from the window: the room is lit by the dawn coming in at it, not by him.
    const [wx, wy] = PANE
    const g = ctx.createRadialGradient(X(wx), X(wy), X(0.3), X(wx), X(wy), X(4.6))
    g.addColorStop(0, `rgba(24, 28, 44, ${0.12 * dark})`)
    g.addColorStop(0.3, `rgba(24, 28, 44, ${0.5 * dark})`)
    g.addColorStop(1, `rgba(20, 22, 36, ${0.92 * dark})`)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))
  },
})
