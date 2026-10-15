import type { Pt } from '../../../../../parts'
import { layer, sway, type Frame } from '../depth'
import { hash } from '../kit'
import { glow, mix, type Pen } from '../pen'
import { AY, ROAD } from './geo'
import { chase, drawMistFront } from './airfield'
import { F, fireAt, fireLight } from './fire'
import { bag, blade, box, disc, fill, poly } from './ink'

/**
 * What passes between the camera and the night, drawn over everything at the foot of the picture, dark and soft: the
 * bank of the verge going by faster than the road (`D` 1.5), its grass, a fence post now and then while they drive, a
 * broken rail fence along the farm, the airfield's edge lights on their stalks; and the mist in front. Nothing in it
 * ever reaches up past the road's surface where it is in the picture, so it never comes up to Marty.
 */

const D = 1.5
const ANCHOR: Pt = [0, AY]
/** The bank's top in its own cells: at the foot of the picture on the road, and lower as the camera climbs. */
const BANK = AY + 2.4
/** How high anything on the bank may reach in the world: a little under the road's surface. */
const CEILING = ROAD + 0.14
/** Where along the bank (its own cells) the road gives way to the farm, and the farm to the airfield. */
const FARM_FROM = 44
const FIELD_FROM = 82

const N = {
  bank: '#020605',
  soft: '#0B1714',
}

export function drawNear(pen: Pen, t: number, f: Frame): void {
  drawMistFront(pen, t, f)
  const fire = fireAt(t)
  const light = Math.min(1, fireLight(t))
  layer(
    pen,
    f,
    D,
    (g) => {
      // The bank where the camera has put it, but never more than a sliver of the picture's foot.
      const bank = Math.max(BANK, g.y1 - 0.085 * (g.y1 - g.y0))
      if (bank - 1.3 > g.y1) return
      // How tall things on the bank may be, here: up to the ceiling in the world.
      const lift = g.cy - f.cy
      const room = Math.max(0, bank - (CEILING + lift))
      if (room < 0.08) return
      const cap = (h: number) => Math.min(h, room)
      const core = bag()
      const soft = bag()
      // The bank itself, rolling a little.
      core.moveTo(g.x0 - 1, g.y1 + 2)
      for (let x = Math.floor(g.x0 / 0.6) * 0.6 - 0.6; x <= g.x1 + 0.6; x += 0.6) core.lineTo(x, bank + 0.12 * Math.sin(x * 0.7) + 0.06 * Math.sin(x * 2.3))
      core.lineTo(g.x1 + 1, g.y1 + 2)
      core.closePath()
      // Grass in tufts, now and then a taller one: swaying in the wind, and soft with being so near.
      for (let i = Math.floor(g.x0 / 0.32) - 2; i <= Math.ceil(g.x1 / 0.32) + 2; i++) {
        const h0 = hash(i, 601)
        if (h0 < 0.18) continue
        const x = i * 0.32 + 0.25 * hash(i, 602)
        const base = bank + 0.12 * Math.sin(x * 0.7) + 0.06 * Math.sin(x * 2.3) + 0.04
        const tall = h0 > 0.9 ? 1.5 : 1
        const blades = 2 + Math.floor(hash(i, 603) * 3)
        const wind = 0.06 * sway(t, i * 0.37, 3.2) + 0.03
        let tallest = 0
        for (let j = 0; j < blades; j++) {
          const h = cap((0.3 + 0.48 * hash(i, j, 604)) * tall) * (0.9 + 0.1 * hash(i, j, 606))
          const lean = (hash(i, j, 605) - 0.5) * 0.3 * h + wind * h * 1.6
          blade(core, x + (j - blades / 2) * 0.05, base, 0.05 + 0.015 * tall, h, lean)
          tallest = Math.max(tallest, h)
        }
        // The tuft's blur: one soft shape round it.
        blade(soft, x - 0.02, base + 0.02, 0.34, tallest * 1.04, wind * tallest * 1.6)
      }
      // Along the road, a fence post now and then; along the farm, a broken rail fence; along the airfield, its edge
      // lights on their stalks.
      const lights: Pt[] = []
      for (let i = Math.floor(g.x0 / 2.4) - 1; i <= Math.ceil(g.x1 / 2.4) + 1; i++) {
        const x = i * 2.4 + 0.8 * hash(i, 611)
        if (x < FARM_FROM) {
          if (hash(i, 612) > 0.4) continue
          const lean = (hash(i, 613) - 0.5) * 0.08
          const h = cap(1.0)
          poly(core, [[x - 0.09, bank + 0.2], [x - 0.08 + lean, bank - h], [x + 0.08 + lean, bank - h - 0.03], [x + 0.09, bank + 0.2]])
          poly(soft, [[x - 0.16, bank + 0.2], [x - 0.15 + lean, bank - h - 0.04], [x + 0.15 + lean, bank - h - 0.07], [x + 0.16, bank + 0.2]])
        } else if (x < FIELD_FROM) {
          // A broken rail fence: a post, and a rail sagging off it to the next, now and then down.
          if (hash(i, 614) > 0.6) continue
          const h = cap(0.75)
          const lean = (hash(i, 616) - 0.5) * 0.1
          poly(core, [[x - 0.08, bank + 0.2], [x - 0.07 + lean, bank - h], [x + 0.07 + lean, bank - h], [x + 0.08, bank + 0.2]])
          poly(soft, [[x - 0.14, bank + 0.2], [x - 0.13 + lean, bank - h - 0.04], [x + 0.13 + lean, bank - h - 0.04], [x + 0.14, bank + 0.2]])
          if (hash(i, 617) < 0.6) {
            const drop = hash(i, 618) * 0.3
            poly(core, [[x, bank - h * 0.7], [x + 2.2, bank - h * 0.7 + drop], [x + 2.2, bank - h * 0.7 + drop + 0.07], [x, bank - h * 0.7 + 0.07]])
          }
        } else if (hash(i, 615) < 0.75) {
          const h = cap(0.42)
          box(core, x - 0.035, bank - h, x + 0.035, bank + 0.1)
          lights.push([x, bank - h - 0.05])
        }
      }
      if (fire > 0) fill(pen, soft, mix(N.soft, F.red, 0.5), 0.4 + 0.2 * light * fire)
      else fill(pen, soft, N.soft, 0.42)
      fill(pen, core, N.bank, 0.97)
      // The edge lights, so near they are only a haze of light round a point: brightest as the flasher goes along
      // them on the beats.
      const heads = bag()
      for (const [x, y] of lights) {
        const k = chase(t, x + f.cx * (1 - D))
        glow(pen, [x, y], 0.32 + 0.25 * k, k > 0.3 ? '#F2F4FF' : '#9FB8FF', 0.16 + 0.36 * k)
        disc(heads, x, y, 0.03)
      }
      fill(pen, heads, '#DCE6FF', 0.9)
    },
    ANCHOR,
  )
}
