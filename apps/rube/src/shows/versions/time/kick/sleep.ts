import type { Pt } from '../../../../parts'
import { bloom, rgba } from './cast'
import { box, frame, hash, scenery } from './kit'
import { DOWN, SLEEP_BANDS, UP, type Crossing } from './stack'
import { SLEEP } from './worlds'

/**
 * The dark of sleep between two levels (the director's): a band of deep night under each level's ground and over the
 * next one's sky, feathered into both so neither ends on a ruled line, with a few motes drifting in it as dust drifts in
 * a dark room. It is drawn after every part of the dream and before the balls, so a level's ground or sky never shows
 * a hard edge where it meets it, and the ball is seen crossing it: going down, a slow wake of pale light behind him;
 * thrown up, a streak.
 */

/** How far the dark feathers into the level over it and the one under it, cells. */
const FEATHER = 1.4

const CROSSINGS: (Crossing & { up: boolean })[] = [
  ...Object.values(DOWN).map((c) => ({ ...c, up: false })),
  ...Object.values(UP).map((c) => ({ ...c, up: true })),
]

export const sleep = scenery<null>({
  name: 'sleep',
  draw: (p, _s, c) => {
    const { k, t } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const x0 = (f.x0 - 1) * k
    const w = (f.x1 - f.x0 + 2) * k
    for (const band of SLEEP_BANDS) {
      const top = band.top - FEATHER
      const bottom = band.bottom + FEATHER
      if (bottom < f.y0 - 1 || top > f.y1 + 1) continue
      const g = ctx.createLinearGradient(0, top * k, 0, bottom * k)
      const edge = FEATHER / (bottom - top)
      g.addColorStop(0, rgba(SLEEP.mid, 0))
      g.addColorStop(edge, rgba(SLEEP.mid, 0.96))
      g.addColorStop(0.5, rgba(SLEEP.deep, 1))
      g.addColorStop(1 - edge, rgba(SLEEP.mid, 0.96))
      g.addColorStop(1, rgba(SLEEP.mid, 0))
      ctx.save()
      ctx.fillStyle = g
      ctx.fillRect(x0, top * k, w, (bottom - top) * k)
      ctx.restore()
      // The motes: a few dozen pale specks drifting slowly sideways and up, each fading in and out.
      const span = band.bottom - band.top
      for (let i = 0; i < 140; i++) {
        const sx = -70 + hash(i, 1, band.mid) * 150
        const drift = ((t * (0.08 + 0.12 * hash(i, 2, band.mid)) + hash(i, 3, band.mid) * 7) % 7) / 7
        const x = sx + drift * 2.2
        if (x < f.x0 - 1 || x > f.x1 + 1) continue
        const y = band.top + 0.3 + ((hash(i, 4, band.mid) * span - drift * 0.9 + span) % span)
        const a = 0.16 * Math.sin(Math.PI * drift) * (0.4 + 0.6 * hash(i, 5, band.mid))
        const r = (0.018 + 0.02 * hash(i, 6, band.mid)) * k
        ctx.fillStyle = rgba(SLEEP.mote, a)
        ctx.beginPath()
        ctx.arc(x * k, y * k, Math.max(0.6, r), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Where he crosses: going down, a soft pale wake that opens round him and fades; thrown up, a brief bright one.
    for (const cr of CROSSINGS) {
      const u = t - cr.t
      if (u < -0.8 || u > 2.2) continue
      const at: Pt = [cr.at[0], cr.at[1] + cr.v[1] * u * 0.3]
      const a = cr.up ? 0.5 * Math.exp(-Math.abs(u) / 0.25) : 0.22 * Math.exp(-Math.abs(u) / 0.7)
      // Seen from far off (the great wides), a thrown one is a spark climbing through the dark: its glow grows with the
      // frame so it is still found at a hundred cells.
      const far = Math.max(1, (f.y1 - f.y0) / 24)
      bloom(p, k, at, (cr.up ? 1.6 : 2.4) * (cr.up ? far : 1), SLEEP.mote, a * (cr.up ? Math.min(1.6, 0.8 + far * 0.2) : 1))
    }
  },
})

/** The cells the dark claims: enough of every band, across the whole width a level may be seen at. */
export const SLEEP_CELLS: Pt[] = SLEEP_BANDS.flatMap((b) => box(-70, b.top - 2, 80, b.bottom + 2, 3))
