import { frame, scenery } from './kit'
import { live } from './live'
import { CRASH, CREDITS_AT, SEAM, WIN, at } from './music'
import { irisAt } from './iris'
import { prepareRooms } from './finale'
import { ctxOf, mix, rgb } from './pen'
import type { WorldKey } from './worlds'

/**
 * The grade: the picture's colour from section to section, as a colourist would lay it, so each place looks like its
 * own reel: amber and brown in the store before it opens; cold steel and teal in the London hall; the hotel's sick
 * yellow-green going to moonlight blue and the wet teal street; neon magenta over teal in the alley; night blue over
 * fire in New Jersey; hard white over bunting red in Tokyo, warming to gold on the winning point; and dawn in the
 * ward, blue to rose to gold. It is colour and nothing else: laid in soft light, a gradient from the top of the frame
 * to the bottom, changing over a seam as the next place opens, and laid a little harder as the song builds.
 */

/* ------------------------------------------------------------------ the grade */

interface Grade {
  /** Soft-light colours at the top and the bottom of the frame, and how strongly they are laid. */
  top: string
  bottom: string
  a: number
}

/** Each place's look, and how it moves within the place: show times and the grade from then on, eased between. */
const LOOKS: Record<WorldKey, [number, Grade][]> = {
  store: [
    [0, { top: '#6C88B0', bottom: '#4A3426', a: 0.3 }],
    [at(5), { top: '#E0B070', bottom: '#4A3022', a: 0.34 }],
    [at(14), { top: '#D8A060', bottom: '#3A2418', a: 0.38 }],
  ],
  london: [
    [SEAM.london, { top: '#A8C4D4', bottom: '#2E4A4C', a: 0.34 }],
    [at(33), { top: '#B4CCD8', bottom: '#28423F', a: 0.38 }],
    [at(41), { top: '#8CA4B4', bottom: '#1E3034', a: 0.42 }],
  ],
  hotel: [
    [SEAM.hotel, { top: '#C8C870', bottom: '#4A4A22', a: 0.36 }],
    [at(45, 3), { top: '#7C98C8', bottom: '#22304A', a: 0.38 }],
    [CRASH, { top: '#9AA8B8', bottom: '#3A3020', a: 0.36 }],
    [at(51), { top: '#5E98A0', bottom: '#4A3818', a: 0.4 }],
  ],
  alley: [
    [SEAM.alley, { top: '#D070B8', bottom: '#2A4A58', a: 0.36 }],
    [at(61), { top: '#E080C0', bottom: '#245060', a: 0.4 }],
  ],
  jersey: [
    [SEAM.jersey, { top: '#34508C', bottom: '#20384A', a: 0.4 }],
    [at(70), { top: '#2C4078', bottom: '#C8642C', a: 0.44 }],
    [at(76), { top: '#2A3A70', bottom: '#B04A2A', a: 0.44 }],
    [at(79), { top: '#2E4880', bottom: '#2A4A48', a: 0.42 }],
  ],
  tokyo: [
    [SEAM.tokyo, { top: '#9098A8', bottom: '#301A1A', a: 0.42 }],
    [at(85), { top: '#F0E4CC', bottom: '#8A2020', a: 0.4 }],
    [WIN, { top: '#FFE6A8', bottom: '#A02A1E', a: 0.46 }],
    [at(92), { top: '#A8A8B0', bottom: '#3A1E1A', a: 0.4 }],
  ],
  hospital: [
    [SEAM.hospital, { top: '#AABCD8', bottom: '#C8B4B0', a: 0.3 }],
    [at(99), { top: '#F4D2B0', bottom: '#E8B0A0', a: 0.32 }],
    [CREDITS_AT, { top: '#FFD89A', bottom: '#E8A890', a: 0.34 }],
  ],
}
/** How long a look takes to become the next one inside a place. */
const SETTLE = 2.5

function lerpGrade(a: Grade, b: Grade, u: number): Grade {
  return { top: mix(a.top, b.top, u), bottom: mix(a.bottom, b.bottom, u), a: a.a + (b.a - a.a) * u }
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
    if (!show || live.painting) return
    // The stage, for the finale's rooms, which are painted ahead in the page's idle time (`finale.ts`).
    live.stage = p
    prepareRooms(p)
    const t = c.t
    const world = show.legs[show.owner(t)].world
    let g = lookOf(world, t)
    // Over a seam the last place's look gives way as the circle opens.
    const b = irisAt(t)
    if (b && b.u >= 0 && b.seam.to === world) g = lerpGrade(lookOf(b.seam.from, t), g, Math.min(1, b.u * 1.4))
    // The song builds, and so does the grade: the last third is laid hardest.
    const build = 0.85 + 0.3 * Math.min(1, Math.max(0, (t - 30) / 170))
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
    ctx.restore()
  },
})

