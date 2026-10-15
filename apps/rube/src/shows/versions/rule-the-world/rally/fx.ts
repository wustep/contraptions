import { frame, scenery } from './kit'
import { energy, pulse, sway } from './depth'
import { live } from './live'
import { CRASH, CREDITS_AT, SEAM, WIN, at } from './music'
import { bloomAt } from './bloom'
import { ctxOf, mix, rgb } from './pen'
import type { WorldKey } from './worlds'

/**
 * The show's own light over every place, as a colourist would lay it: Marty's glow, and the grade.
 *
 * Marty is the one warm thing that goes everywhere, so he carries a little light with him: a soft orange glow on what
 * is round him, strongest in the dark places (the office at night, the road through New Jersey, the airfield) and a
 * breath on the pale ward, lifting on the beat.
 *
 * The grade is the picture's colour from section to section, so each place looks like its own reel: amber and brown in
 * the store before it opens; cold steel and teal in the London hall; the hotel's sick yellow-green going to moonlight
 * blue and the wet teal street; neon magenta over teal in the alley; night blue over fire in New Jersey; hard white
 * over bunting red in Tokyo, flaring gold on the winning point; and dawn in the ward, blue to rose to gold. It is laid
 * in soft light, a gradient from the top of the frame to the bottom, with two leaks of light drifting slowly round its
 * edges, which keep even a held frame breathing. It changes over a seam as the next place blooms open, and its strength
 * grows through the song: the last third is graded hardest.
 */

/* ------------------------------------------------------------------ Marty's glow */

const GLOW: Record<WorldKey, number> = { store: 0.26, london: 0.13, hotel: 0.2, alley: 0.16, jersey: 0.32, tokyo: 0.14, hospital: 0.1 }

export const glow = scenery<null>({
  name: 'fx-glow',
  draw: (p, _s, c) => {
    const show = live.show
    if (!show || live.painting) return
    live.stage = p
    const here = show.at(c.t)
    if (here.hidden || here.scale < 0.2) return
    const world = show.legs[show.owner(c.t)].world
    const k = c.k
    // As the camera comes away at the end he becomes a beacon at the glass: his light keeps its size on the screen.
    const f = frame(p, k)
    const out = Math.max(1, (f.y1 - f.y0) / 9)
    const a = Math.min(0.5, GLOW[world] * (0.85 + 0.3 * pulse(c.t, 0.3)) * Math.min(1, here.scale) * (1 + 0.6 * (out - 1)))
    const r = 1.15 * k * Math.max(0.6, here.scale) * out
    const x = here.x * k
    const y = here.y * k
    const ctx = ctxOf(p)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,140,60,${a})`)
    g.addColorStop(0.35, `rgba(242,106,27,${a * 0.38})`)
    g.addColorStop(1, 'rgba(242,106,27,0)')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
    ctx.restore()
  },
})

/* ------------------------------------------------------------------ the grade */

interface Grade {
  /** Soft-light colours at the top and the bottom of the frame, and how strongly they are laid. */
  top: string
  bottom: string
  a: number
  /** The two leaks of light round the edges: their colour and strength. */
  leak: string
  leakA: number
}

/** Each place's look, and how it moves within the place: show times and the grade from then on, eased between. */
const LOOKS: Record<WorldKey, [number, Grade][]> = {
  store: [
    [0, { top: '#6C88B0', bottom: '#4A3426', a: 0.3, leak: '#7FA6C8', leakA: 0.05 }],
    [at(5), { top: '#E0B070', bottom: '#4A3022', a: 0.34, leak: '#FFD48A', leakA: 0.07 }],
    [at(14), { top: '#D8A060', bottom: '#3A2418', a: 0.38, leak: '#FFC070', leakA: 0.07 }],
  ],
  london: [
    [SEAM.london, { top: '#A8C4D4', bottom: '#2E4A4C', a: 0.34, leak: '#DDEBF2', leakA: 0.06 }],
    [at(33), { top: '#B4CCD8', bottom: '#28423F', a: 0.38, leak: '#F2F6F0', leakA: 0.07 }],
    [at(41), { top: '#8CA4B4', bottom: '#1E3034', a: 0.42, leak: '#9AB4C4', leakA: 0.04 }],
  ],
  hotel: [
    [SEAM.hotel, { top: '#C8C870', bottom: '#4A4A22', a: 0.36, leak: '#E8E07A', leakA: 0.07 }],
    [at(45, 3), { top: '#7C98C8', bottom: '#22304A', a: 0.38, leak: '#AFC8F0', leakA: 0.06 }],
    [CRASH, { top: '#9AA8B8', bottom: '#3A3020', a: 0.36, leak: '#F0E0B0', leakA: 0.07 }],
    [at(51), { top: '#5E98A0', bottom: '#4A3818', a: 0.4, leak: '#FFB347', leakA: 0.07 }],
  ],
  alley: [
    [SEAM.alley, { top: '#D070B8', bottom: '#2A4A58', a: 0.36, leak: '#FF5FAE', leakA: 0.08 }],
    [at(61), { top: '#E080C0', bottom: '#245060', a: 0.4, leak: '#58D6D0', leakA: 0.09 }],
  ],
  jersey: [
    [SEAM.jersey, { top: '#34508C', bottom: '#20384A', a: 0.4, leak: '#FFE7B0', leakA: 0.06 }],
    [at(70), { top: '#2C4078', bottom: '#C8642C', a: 0.44, leak: '#FF8A3A', leakA: 0.11 }],
    [at(76), { top: '#2A3A70', bottom: '#B04A2A', a: 0.44, leak: '#FF5040', leakA: 0.1 }],
    [at(79), { top: '#2E4880', bottom: '#2A4A48', a: 0.42, leak: '#9AD0A8', leakA: 0.08 }],
  ],
  tokyo: [
    [SEAM.tokyo, { top: '#9098A8', bottom: '#301A1A', a: 0.42, leak: '#FFFFFF', leakA: 0.05 }],
    [at(85), { top: '#F0E4CC', bottom: '#8A2020', a: 0.4, leak: '#FFE6C0', leakA: 0.1 }],
    [WIN, { top: '#FFE6A8', bottom: '#A02A1E', a: 0.46, leak: '#FFD27A', leakA: 0.16 }],
    [at(92), { top: '#A8A8B0', bottom: '#3A1E1A', a: 0.4, leak: '#FFFFFF', leakA: 0.05 }],
  ],
  hospital: [
    [SEAM.hospital, { top: '#AABCD8', bottom: '#C8B4B0', a: 0.3, leak: '#F7B6A8', leakA: 0.07 }],
    [at(99), { top: '#F4D2B0', bottom: '#E8B0A0', a: 0.32, leak: '#FFD9A0', leakA: 0.1 }],
    [CREDITS_AT, { top: '#FFD89A', bottom: '#E8A890', a: 0.34, leak: '#FFE2A0', leakA: 0.12 }],
  ],
}
/** How long a look takes to become the next one inside a place. */
const SETTLE = 2.5

function lerpGrade(a: Grade, b: Grade, u: number): Grade {
  return { top: mix(a.top, b.top, u), bottom: mix(a.bottom, b.bottom, u), a: a.a + (b.a - a.a) * u, leak: mix(a.leak, b.leak, u), leakA: a.leakA + (b.leakA - a.leakA) * u }
}
function lookOf(world: WorldKey, t: number): Grade {
  const keys = LOOKS[world]
  let g = keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [at0, next] = keys[i]
    if (t < at0) break
    g = lerpGrade(g, next, Math.min(1, (t - at0) / SETTLE))
  }
  return g
}

const css = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}

export const grade = scenery<null>({
  name: 'fx-grade',
  draw: () => {},
  over: (p, _s, c) => {
    const show = live.show
    if (!show) return
    const t = c.t
    const world = show.legs[show.owner(t)].world
    let g = lookOf(world, t)
    // Over a seam the last place's look gives way as the ring opens.
    const b = bloomAt(t)
    if (b && b.u >= 0 && b.seam.to === world) g = lerpGrade(lookOf(b.seam.from, t), g, Math.min(1, b.u * 1.4))
    // The song builds, and so does the grade: the last third is laid hardest, and the leaks lift with the music.
    const build = 0.85 + 0.3 * Math.min(1, Math.max(0, (t - 30) / 170))
    const e = energy(t)
    const k = c.k
    const f = frame(p, k)
    const ctx = ctxOf(p)
    const [x0, y0, w, h] = [f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k]
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    const v = ctx.createLinearGradient(0, y0, 0, y0 + h)
    v.addColorStop(0, css(g.top, g.a * build))
    v.addColorStop(1, css(g.bottom, g.a * build))
    ctx.fillStyle = v
    ctx.fillRect(x0, y0, w, h)
    // Two leaks, one high on one side and one low on the other, each wandering slowly along its edge.
    ctx.globalCompositeOperation = 'lighter'
    const leakA = g.leakA * build * (0.75 + 0.5 * e) * (1 + 0.35 * pulse(t, 0.4) * Math.max(0, (t - 140) / 60))
    for (const [i, side] of [[0, 0], [1, 1]] as const) {
      const lx = x0 + w * (side ? 1.02 - 0.12 * (0.5 + 0.5 * sway(t, 7 + i, 23)) : -0.02 + 0.12 * (0.5 + 0.5 * sway(t, 9 + i, 19)))
      const ly = y0 + h * (side ? 0.78 + 0.14 * sway(t, 11 + i, 29) : 0.18 + 0.14 * sway(t, 13 + i, 31))
      const r = h * (0.55 + 0.1 * sway(t, 15 + i, 17))
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r)
      lg.addColorStop(0, css(g.leak, leakA))
      lg.addColorStop(0.5, css(g.leak, leakA * 0.35))
      lg.addColorStop(1, css(g.leak, 0))
      ctx.fillStyle = lg
      ctx.fillRect(lx - r, ly - r, 2 * r, 2 * r)
    }
    ctx.restore()
  },
})

