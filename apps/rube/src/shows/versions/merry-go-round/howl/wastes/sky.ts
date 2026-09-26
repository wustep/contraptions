import { mixHex } from '../../../../../parts'
import { frame, scenery } from '../kit'
import { SEAM } from '../music'
import { WASTES } from '../worlds'

/**
 * The wastes' sky (the director's): a gradient over the whole frame, by show time, under everything the parts draw.
 * The hills and the castle walk in an afternoon that goes to dusk and night (107.9 → 152); the collapse is a grey
 * morning after the war that clears as the plank runs (243.6 → 292); the flight is a clean blue going to an evening,
 * deep at the top and gold low down, under the credits. Parts draw their own land, clouds and weather over it.
 */

/** [show time, top, bottom] keys; the colours blend between them. */
const KEYS: [number, string, string][] = [
  [0, WASTES.skyHigh, WASTES.sky],
  [SEAM.hills, WASTES.skyHigh, WASTES.sky],
  [134, WASTES.skyHigh, mixHex(WASTES.sky, WASTES.dusk, 0.3)],
  [142, mixHex(WASTES.skyHigh, WASTES.night, 0.5), WASTES.dusk],
  [148, WASTES.night, mixHex(WASTES.night, WASTES.dusk, 0.35)],
  [160, WASTES.night, WASTES.night],
  [SEAM.plank - 0.1, mixHex(WASTES.grey, WASTES.night, 0.35), WASTES.grey],
  [262, WASTES.grey, mixHex(WASTES.grey, WASTES.sky, 0.5)],
  [285, WASTES.skyHigh, WASTES.sky],
  [SEAM.flight + 4, WASTES.blue, mixHex(WASTES.sky, WASTES.cloud, 0.4)],
  // The flight into the evening: the top of the sky deepening (the credits' words are set over it), gold low down.
  [306, mixHex(WASTES.blue, WASTES.night, 0.28), mixHex(WASTES.sky, WASTES.gold, 0.4)],
  [318, mixHex(WASTES.skyHigh, WASTES.night, 0.5), mixHex(WASTES.gold, WASTES.dusk, 0.2)],
  [336, mixHex(WASTES.night, WASTES.skyHigh, 0.38), mixHex(WASTES.dusk, WASTES.gold, 0.5)],
]

/** The sky's top and bottom colours at show time `t`. */
export function wastesSky(t: number): { top: string; low: string } {
  if (t <= KEYS[0][0]) return { top: KEYS[0][1], low: KEYS[0][2] }
  for (let i = 1; i < KEYS.length; i++) {
    if (t <= KEYS[i][0]) {
      const [t0, a0, b0] = KEYS[i - 1]
      const [t1, a1, b1] = KEYS[i]
      const u = (t - t0) / Math.max(1e-6, t1 - t0)
      return { top: mixHex(a0, a1, u), low: mixHex(b0, b1, u) }
    }
  }
  const last = KEYS[KEYS.length - 1]
  return { top: last[1], low: last[2] }
}

/** How dark the wastes are at `t` (0 day, 1 night): for parts to dim their land and light their windows. */
export function wastesNight(t: number): number {
  if (t < 136 || t > SEAM.plank + 2) return 0
  if (t < 148) return (t - 136) / 12
  return 1
}

export const sky = scenery<null>({
  name: 'wastes-sky',
  draw: (p, _s, c) => {
    const { k, t } = c
    const f = frame(p, k)
    const { top, low } = wastesSky(t)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
    g.addColorStop(0, top)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  },
})
