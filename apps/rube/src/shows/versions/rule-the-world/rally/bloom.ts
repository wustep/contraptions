import type p5 from 'p5'
import { R, type PieceCtx } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Universe } from '../../../../universe'
import { frame, hash, scenery } from './kit'
import { live } from './live'
import { BEAT, SEAM } from './music'
import { ctxOf, rgb } from './pen'
import type { WorldKey } from './worlds'

/**
 * The blooms: every change of place is an event, never a cut. Marty is at rest at every seam (`seams.ts`), and the
 * camera carries his place on the screen across, so the change can open out of him: for a beat before it the place he
 * is leaving gathers its light in on him (its edges going down, a glow of the next place's colour round him); on the
 * downbeat the next place bursts out of him in a ring of its own light, and the place he is leaving is pushed out past
 * the lens as the ring opens, darkening as it goes, until the ring has passed the corners and he is somewhere else.
 *
 * The place being left is drawn live, over the new one and outside the ring, from its own pieces at show time: its
 * lamps still flicker and its people still move while it goes. The ring and the sparks it throws are each place's own
 * colours, so each seam is its own event: paper-white into the cold hall in London, the hotel's sick yellow, neon on
 * the wet street into the alley, headlights into the night, flash-bulb white and bunting red into Tokyo, and dawn.
 */

interface Seam {
  at: number
  from: WorldKey
  to: WorldKey
  /** The ring's colour, its glow, and the sparks it throws. */
  ring: string
  glow: string
  sparks: string[]
}

export const BLOOMS: Seam[] = [
  { at: SEAM.london, from: 'store', to: 'london', ring: '#F6F2E4', glow: '#CFE3F0', sparks: ['#FFF4D6', '#CFE3F0', '#E9DCC4'] },
  { at: SEAM.hotel, from: 'london', to: 'hotel', ring: '#ECE38A', glow: '#C9C46A', sparks: ['#E8E2A8', '#B9B27A'] },
  { at: SEAM.alley, from: 'hotel', to: 'alley', ring: '#FF5FAE', glow: '#58D6D0', sparks: ['#9FD4FF', '#FF5FAE', '#58D6D0'] },
  { at: SEAM.jersey, from: 'alley', to: 'jersey', ring: '#FFE7B0', glow: '#FFB347', sparks: ['#FFB347', '#FFE7B0', '#FF7A2A'] },
  { at: SEAM.tokyo, from: 'jersey', to: 'tokyo', ring: '#FFFFFF', glow: '#FFE6C0', sparks: ['#FFFFFF', '#E8423A', '#F2C14E'] },
  { at: SEAM.hospital, from: 'tokyo', to: 'hospital', ring: '#FFD9A0', glow: '#F7B6A8', sparks: ['#FFE9C4', '#F7C987', '#F7B6A8'] },
]

/** How long the ring takes to pass the corners, and how long before the seam the place gathers in on him. */
export const OPEN = 1.6
export const GATHER = 2 * BEAT

/** The bloom at `t`: which seam, and how far into its gathering (`pre`, 0 to 1, before) or its opening (`u`, after). */
export function bloomAt(t: number): { seam: Seam; pre: number; u: number } | null {
  for (const seam of BLOOMS) {
    if (t >= seam.at - GATHER && t < seam.at) return { seam, pre: (t - (seam.at - GATHER)) / GATHER, u: -1 }
    if (t >= seam.at && t < seam.at + OPEN) return { seam, pre: 1, u: (t - seam.at) / OPEN }
  }
  return null
}

/** The drawings that are this show's own light over a place, which a place being left does not bring with it. */
const OVERLAYS = new Set(['vignette', 'credits', 'fx-bloom', 'fx-grade', 'fx-glow', 'fx-finale'])

const css = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}

/** Every piece of a place, drawn at show time `t` as the stage would, in the current transform (its cells). */
function drawPlace(p: p5, u: Universe, t: number, k: number): void {
  const view = frame(p, k)
  const theme = u.theme
  const weight = Math.max(0.75, k * 0.037) * (theme.weight ?? 1)
  const first = u.pieces[0]?.col ?? 0
  const pad = 1.5
  const visible = u.pieces.filter(
    (pl) => !OVERLAYS.has(pl.piece.name) && pl.cells.some(([c, r]) => c >= view.x0 - pad && c <= view.x1 + pad && r >= view.y0 - pad && r <= view.y1 + pad),
  )
  const ctxFor = (pl: Placed): PieceCtx => {
    const local = t - pl.start
    return {
      k,
      t: local,
      since: local - pl.lane.fire,
      ink: theme.ink,
      bg: theme.bg,
      weight,
      color: pl.ballIn.color,
      theme,
      spin: (x) => {
        const turned = (pl.col + pl.mirror * x - first) / R
        return pl.mirror > 0 ? turned : Math.PI - turned
      },
    }
  }
  for (const which of ['draw', 'over'] as const) {
    for (const pl of visible) {
      const fn = pl.piece[which]
      if (!fn) continue
      p.push()
      p.translate(pl.col * k, pl.row * k)
      p.scale(pl.mirror, 1)
      fn.call(pl.piece, p, pl.state, ctxFor(pl))
      p.pop()
    }
  }
}

/** Fast out, slow to settle: the ring is past halfway in a quarter of its time. */
const burst = (u: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 2.4)
const smooth = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

export const bloom = scenery<null>({
  name: 'fx-bloom',
  draw: () => {},
  over: (p, _s, c) => {
    const show = live.show
    const b = bloomAt(c.t)
    if (!show || !b || live.painting) return
    const t = c.t
    const { seam } = b
    const here = show.legs[show.owner(t)].world
    const k = c.k
    const ctx = ctxOf(p)
    const f = frame(p, k)
    const hero = show.where(t)
    // The corner of the frame farthest from him: how far the ring has to go.
    const reach = Math.max(...[[f.x0, f.y0], [f.x1, f.y0], [f.x0, f.y1], [f.x1, f.y1]].map(([x, y]) => Math.hypot(x - hero[0], y - hero[1]))) * 1.04
    const [mx, my] = [hero[0] * k, hero[1] * k]

    if (b.u < 0) {
      // Gathering, in the place he is leaving: its edges go down round him, and the next place's light comes up on him.
      if (here !== seam.from) return
      const g = smooth(b.pre)
      const inner = reach * (1 - 0.72 * g)
      const dark = ctx.createRadialGradient(mx, my, Math.max(0.2, inner * 0.35) * k, mx, my, Math.max(0.5, inner) * k)
      dark.addColorStop(0, 'rgba(6,5,8,0)')
      dark.addColorStop(1, `rgba(6,5,8,${0.5 * g})`)
      ctx.save()
      ctx.fillStyle = dark
      ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, (0.5 + 0.9 * g) * k)
      halo.addColorStop(0, css(seam.glow, 0.5 * g * g))
      halo.addColorStop(1, css(seam.glow, 0))
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = halo
      ctx.fillRect(mx - 1.5 * k, my - 1.5 * k, 3 * k, 3 * k)
      ctx.restore()
      return
    }

    // Opening, in the place he has come to. The place he left is drawn outside the ring, pushed past the lens.
    if (here !== seam.to) return
    const old = show.universeOf(seam.from)
    const into = show.owner(t)
    const shift = show.shift(into - 1, into)
    const u = b.u
    const r = 0.32 + (reach - 0.32) * burst(u)
    if (old && r < reach) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
      ctx.arc(mx, my, r * k, 0, Math.PI * 2, true)
      ctx.clip('evenodd')
      ctx.fillStyle = old.theme.bg
      ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
      p.push()
      // Pushed out past the lens about him, as if the camera went on through it.
      const z = 1 + 0.42 * u * u
      p.translate(mx, my)
      p.scale(z)
      p.translate(-mx, -my)
      // His place there is his place here: the old place's cells moved by the cut.
      p.translate(shift[0] * k, shift[1] * k)
      drawPlace(p, old, t, k)
      p.pop()
      // And going down as it goes.
      ctx.fillStyle = `rgba(6,5,8,${0.55 * smooth(u * 1.3)})`
      ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
      ctx.restore()
    }

    // The ring: a band of the new place's light at the edge, bright as it starts, thinning as it goes.
    const fade = 1 - smooth((u - 0.55) / 0.45)
    const width = (0.14 + 0.1 * r) * (1 - 0.4 * u)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const band = ctx.createRadialGradient(mx, my, Math.max(0, r - width * 2.2) * k, mx, my, (r + width) * k)
    band.addColorStop(0, css(seam.glow, 0))
    band.addColorStop(0.72, css(seam.glow, 0.35 * fade))
    band.addColorStop(0.9, css(seam.ring, 0.85 * fade))
    band.addColorStop(1, css(seam.ring, 0))
    ctx.fillStyle = band
    const box = (r + width) * k
    ctx.fillRect(mx - box, my - box, 2 * box, 2 * box)
    ctx.strokeStyle = css(seam.ring, 0.9 * fade)
    ctx.lineWidth = Math.max(1, k * 0.016)
    ctx.beginPath()
    ctx.arc(mx, my, r * k, 0, Math.PI * 2)
    ctx.stroke()

    // The flash on the downbeat, out of him.
    const flash = Math.exp(-(t - seam.at) / 0.12)
    if (flash > 0.01) {
      const fl = ctx.createRadialGradient(mx, my, 0, mx, my, 1.4 * k)
      fl.addColorStop(0, css(seam.ring, 0.55 * flash))
      fl.addColorStop(0.3, css(seam.glow, 0.22 * flash))
      fl.addColorStop(1, css(seam.glow, 0))
      ctx.fillStyle = fl
      ctx.fillRect(mx - 1.4 * k, my - 1.4 * k, 2.8 * k, 2.8 * k)
    }

    // Sparks thrown off the ring: each flies out ahead of it on its own line, long while it is fast, and burns out.
    ctx.lineCap = 'round'
    const n = 42
    const since = t - seam.at
    for (let ci = 0; ci < seam.sparks.length; ci++) {
      ctx.strokeStyle = css(seam.sparks[ci], 0.8 * fade)
      ctx.lineWidth = Math.max(1, k * 0.022)
      ctx.beginPath()
      for (let i = ci; i < n; i += seam.sparks.length) {
        const h1 = hash(i, 5, Math.round(seam.at))
        const h2 = hash(i, 6, Math.round(seam.at))
        const h3 = hash(i, 7, Math.round(seam.at))
        // Launched off the ring a little after the downbeat, each at its own moment, and flying on at its own speed.
        const born = 0.04 + 0.3 * h2
        const age = since - born
        if (age <= 0 || age > 0.9) continue
        const a = h1 * Math.PI * 2 + 0.2 * Math.sin(i)
        const at0 = 0.32 + (reach - 0.32) * burst(born / OPEN)
        const v = (2.5 + 7 * h3) * (0.6 + 0.08 * reach)
        const rr = at0 + v * (1 - Math.exp(-age * 2.2)) / 2.2
        const len = Math.min(rr - 0.2, (0.08 + 0.32 * h3) * Math.exp(-age * 2.4))
        if (len < 0.02) continue
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        ctx.moveTo(mx + ca * rr * k, my + sa * rr * k)
        ctx.lineTo(mx + ca * (rr - len) * k, my + sa * (rr - len) * k)
      }
      ctx.stroke()
    }
    ctx.restore()
  },
})

