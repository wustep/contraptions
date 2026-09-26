import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, scenery } from '../kit'
import { SEAM } from '../music'
import { TOWN } from '../worlds'

/**
 * The hatter's town (canonical: the town builder owns this file; the sky builder and the war builder play in this
 * town too, and use these constants and nothing else of it). Standing scenery for the whole town world, drawn from
 * show time: the sky over everything, the hat shop cut open like a doll's house (its workroom and counter, the
 * house over it), its door in its right-hand wall, and the street outside it with the houses across the way. The
 * director wrote this first version so the show runs; the town builder makes it beautiful.
 *
 * Coordinates are the town world's cells, which are the shop part's own frame: Sophie starts the show at (-0.5, 0),
 * at the left end of the workroom. A ball on the floor or the cobbles has its centre at y = 0.
 *
 * The town is seen four times, lit by show time: dawn (0 → 38.3, the hat shop and the street), noon (38.3 → 85.8,
 * the alley and the sky over the roofs: the sky builder's, far to the right and up), night (85.8 → 107.9, the
 * shop, the curse) and the war (205.86 → 237.0: the street at night under the bombers: the war builder's).
 */

export const TOWN_AT = {
  floor: 0,
  ground: 0.13,
  /** The shop, cut open: its back wall from x0 to x1, its ceiling (the house goes on up to `roof`). */
  shop: [-2.0, 8.4] as [number, number],
  ceil: -3.4,
  roof: -9.5,
  /** The counter (x0, x1, top) where the curse finds her. */
  counter: [3.2, 5.2, -0.72] as [number, number, number],
  /** The door in the shop's right-hand wall: the wall from x0 to x1, the opening's height. Out onto the street. */
  wall: [8.4, 8.75] as [number, number],
  doorTop: -2.2,
  /** The street: cobbles from the door to the alley's mouth, where the sky builder takes over. */
  street: [8.75, 26.0] as [number, number],
  /** The houses across the street: their fronts stand this far back (drawn behind the street). */
  across: -12,
}

/** Where the night leg (the curse) starts in the town: Sophie at rest at the counter. */
export const CURSE_AT: Pt = [4.2, 0]
/** Where the war leg (the raid) starts: just outside the shop's door, on the street. */
export const RAID_AT: Pt = [9.4, 0]

/** The sky's light at show time `t`: dawn, noon, night, war. */
export function skyAt(t: number): { top: string; low: string; dark: number; war: number } {
  if (t < SEAM.alley - 1) return { top: mixHex(TOWN.dawn, TOWN.day, t / 60), low: TOWN.dawn, dark: 0.1 * (1 - t / 38), war: 0 }
  if (t < SEAM.curse) return { top: '#9FC6E0', low: TOWN.day, dark: 0, war: 0 }
  if (t < 150) return { top: TOWN.nightHigh, low: TOWN.night, dark: 1, war: 0 }
  return { top: TOWN.nightHigh, low: mixHex(TOWN.night, TOWN.ember, 0.35), dark: 1, war: 1 }
}

/** How open the shop's door is at show time `t` (out at the end of the morning, out and in during the war). */
export function doorAt(t: number): number {
  const pulse = (a: number, b: number) => Math.max(0, Math.min(1, Math.min((t - a) / 0.5, (b - t) / 0.6)))
  return Math.max(pulse(29, 33), pulse(SEAM.raid - 0.8, SEAM.raid + 1.2), pulse(SEAM.hearth - 1.2, SEAM.hearth + 0.5), pulse(SEAM.hills - 1.5, SEAM.hills + 0.3))
}

export const town = scenery<null>({
  name: 'town',
  draw: (p, _s, c) => {
    const { k, weight: W, ink, t } = c
    const f = frame(p, k)
    const sky = skyAt(t)
    const tone = (hex: string) => mixHex(hex, TOWN.night, sky.dark * 0.6)
    const A = TOWN_AT
    const ctx = p.drawingContext as CanvasRenderingContext2D
    p.push()
    p.rectMode(p.CORNER)
    // The sky: a gradient over the whole frame.
    const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
    g.addColorStop(0, sky.top)
    g.addColorStop(1, sky.low)
    ctx.fillStyle = g
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    // The houses across the street: a row of tall narrow fronts, slate roofs, lit windows at night.
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    for (let i = -4; i < 14; i++) {
      const x = i * 2.4
      const h = 6.5 + hash(i, 3) * 3.5
      const col = [TOWN.plaster, TOWN.rose, TOWN.shutter, TOWN.plasterShade][Math.floor(hash(i, 5) * 4)]
      p.fill(tone(mixHex(col, '#B8C4CC', 0.35)))
      p.rect(x * k, (A.ground - h) * k, 2.4 * k, h * k)
      p.fill(tone(TOWN.slateDark))
      p.triangle((x - 0.1) * k, (A.ground - h) * k, (x + 2.5) * k, (A.ground - h) * k, (x + 1.2) * k, (A.ground - h - 1.6) * k)
      for (let r = 0; r < 3; r++) {
        const on = sky.dark > 0.5 && hash(i, r) > 0.45
        p.fill(on ? TOWN.glow : tone(TOWN.slate))
        p.rect((x + 0.45) * k, (A.ground - h + 1 + r * 1.9) * k, 0.5 * k, 0.8 * k)
        p.rect((x + 1.45) * k, (A.ground - h + 1 + r * 1.9) * k, 0.5 * k, 0.8 * k)
      }
    }
    // The street: cobbles.
    p.fill(tone(TOWN.cobble))
    p.rect((f.x0 - 1) * k, A.ground * k, (f.x1 - f.x0 + 2) * k, (f.y1 - A.ground + 1) * k)
    p.stroke(alpha(p, ink, 0.25))
    p.strokeWeight(W * 0.5)
    for (let x = Math.floor(f.x0); x < f.x1; x += 0.6) p.line(x * k, (A.ground + 0.25) * k, (x + 0.3) * k, (A.ground + 0.25) * k)
    // The hat shop, cut open: its back wall, floor, ceiling, and the house above it.
    const [s0] = A.shop
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(tone(TOWN.plaster))
    p.rect(s0 * k, A.roof * k, (A.wall[1] - s0) * k, (A.ground - A.roof) * k)
    p.fill(tone(TOWN.slate))
    p.triangle((s0 - 0.5) * k, A.roof * k, (A.wall[1] + 0.5) * k, A.roof * k, ((s0 + A.wall[1]) / 2) * k, (A.roof - 3) * k)
    p.fill(tone(TOWN.timber))
    p.rect(s0 * k, A.ceil * k, (A.wall[1] - s0) * k, 0.3 * k)
    p.rect((s0 - 0.3) * k, A.roof * k, 0.3 * k, (A.ground - A.roof) * k)
    // The shop's right wall with its door (the leaf swings in, shown as the opening going dark to light).
    const [w0, w1] = A.wall
    const open = doorAt(t)
    p.fill(tone(TOWN.timber))
    p.rect(w0 * k, A.roof * k, (w1 - w0) * k, (A.doorTop - A.roof) * k)
    p.fill(mixHex(tone(TOWN.timberDark), sky.low, open))
    p.rect(w0 * k, A.doorTop * k, (w1 - w0) * k, (A.ground - A.doorTop) * k)
    // The counter.
    const [c0, c1, ctop] = A.counter
    p.fill(tone(TOWN.timber))
    p.rect(c0 * k, ctop * k, (c1 - c0) * k, (A.ground - ctop) * k)
    // The upstairs windows, lit at night.
    for (const x of [0.5, 3.5, 6.2]) {
      p.fill(sky.dark > 0.5 ? TOWN.glow : tone(TOWN.shutter))
      p.rect(x * k, (A.roof + 1.8) * k, 1.2 * k, 1.6 * k)
    }
    // The war's glow on the street, low and red.
    if (sky.war > 0) {
      const w = ctx.createLinearGradient(0, (A.ground - 8) * k, 0, A.ground * k)
      w.addColorStop(0, 'rgba(240, 120, 50, 0)')
      w.addColorStop(1, `rgba(240, 120, 50, ${0.18 + 0.08 * Math.sin(t * 5)})`)
      ctx.fillStyle = w
      ctx.fillRect(f.x0 * k, (A.ground - 8) * k, (f.x1 - f.x0) * k, 8 * k)
    }
    p.pop()
  },
})

/** The cells the town's scenery claims (it draws wherever the camera goes in the town). */
export const TOWN_BOX = { x0: -30, y0: -60, x1: 170, y1: 12 }
