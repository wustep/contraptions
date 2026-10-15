import type p5 from 'p5'
import { R, type PieceCtx } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Universe } from '../../../../universe'
import { frame, scenery } from './kit'
import { live } from './live'
import { BEAT, SEAM } from './music'
import { ctxOf } from './pen'
import type { WorldKey } from './worlds'

/**
 * The irises: every change of place is a move, never a plain cut, and a plain one, the way a picture of 1952 would
 * have made it. Marty is at rest at every seam (`seams.ts`) and the camera carries his place on the screen across, so
 * the change can open out of him: for two beats before it the edges of the place he is leaving go down round him; on
 * the downbeat the next place opens out of him in a circle, an iris with a thin dark rim, and the place he is leaving
 * is pushed out past the lens round it and goes dim as the circle opens, until it has passed the corners and he is
 * somewhere else.
 *
 * The place being left is drawn live, over the new one and outside the circle, from its own pieces at show time: its
 * people still move while it goes. There is no light in it: no ring of light, no flash, nothing thrown off the edge.
 * Into Tokyo the circle is the airliner's round window he is sitting in.
 */

interface Seam {
  at: number
  from: WorldKey
  to: WorldKey
}

export const IRISES: Seam[] = [
  { at: SEAM.london, from: 'store', to: 'london' },
  { at: SEAM.hotel, from: 'london', to: 'hotel' },
  { at: SEAM.alley, from: 'hotel', to: 'alley' },
  { at: SEAM.jersey, from: 'alley', to: 'jersey' },
  { at: SEAM.tokyo, from: 'jersey', to: 'tokyo' },
  { at: SEAM.hospital, from: 'tokyo', to: 'hospital' },
]

/** How long the circle takes to pass the corners, and how long before the seam the place's edges go down. */
export const OPEN = 1.5
export const GATHER = 2 * BEAT

/** The iris at `t`: which seam, and how far into its closing (`pre`, 0 to 1, before) or its opening (`u`, after). */
export function irisAt(t: number): { seam: Seam; pre: number; u: number } | null {
  for (const seam of IRISES) {
    if (t >= seam.at - GATHER && t < seam.at) return { seam, pre: (t - (seam.at - GATHER)) / GATHER, u: -1 }
    if (t >= seam.at && t < seam.at + OPEN) return { seam, pre: 1, u: (t - seam.at) / OPEN }
  }
  return null
}

/** The drawings that are this show's own over a place, which a place being left does not bring with it. */
const OVERLAYS = new Set(['vignette', 'credits', 'fx-iris', 'fx-grade', 'fx-finale'])

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

/** Quick out of him, slowing as it reaches the corners. */
const opening = (u: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 2.2)
const smooth = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

export const iris = scenery<null>({
  name: 'fx-iris',
  draw: () => {},
  over: (p, _s, c) => {
    const show = live.show
    const b = irisAt(c.t)
    if (!show || !b || live.painting) return
    const t = c.t
    const { seam } = b
    const here = show.legs[show.owner(t)].world
    const k = c.k
    const ctx = ctxOf(p)
    const f = frame(p, k)
    const hero = show.where(t)
    // The corner of the frame farthest from him: how far the circle has to go.
    const reach = Math.max(...[[f.x0, f.y0], [f.x1, f.y0], [f.x0, f.y1], [f.x1, f.y1]].map(([x, y]) => Math.hypot(x - hero[0], y - hero[1]))) * 1.02
    const [mx, my] = [hero[0] * k, hero[1] * k]
    const [x0, y0, w, h] = [f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k]

    if (b.u < 0) {
      // Before: in the place he is leaving, its edges go down round him.
      if (here !== seam.from) return
      const g = smooth(b.pre)
      const inner = reach * (1 - 0.6 * g)
      const dark = ctx.createRadialGradient(mx, my, Math.max(0.2, inner * 0.4) * k, mx, my, Math.max(0.5, inner) * k)
      dark.addColorStop(0, 'rgba(8,7,10,0)')
      dark.addColorStop(1, `rgba(8,7,10,${0.38 * g})`)
      ctx.save()
      ctx.fillStyle = dark
      ctx.fillRect(x0, y0, w, h)
      ctx.restore()
      return
    }

    // After: in the place he has come to. The place he left is drawn outside the circle, pushed past the lens.
    if (here !== seam.to) return
    const old = show.universeOf(seam.from)
    const into = show.owner(t)
    const shift = show.shift(into - 1, into)
    const u = b.u
    const r = 0.3 + (reach - 0.3) * opening(u)
    if (!old || r >= reach) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0, y0, w, h)
    ctx.arc(mx, my, r * k, 0, Math.PI * 2, true)
    ctx.clip('evenodd')
    ctx.fillStyle = old.theme.bg
    ctx.fillRect(x0, y0, w, h)
    p.push()
    // Pushed out past the lens about him, as if the camera went on through it.
    const z = 1 + 0.32 * u * u
    p.translate(mx, my)
    p.scale(z)
    p.translate(-mx, -my)
    // His place there is his place here: the old place's cells moved by the cut.
    p.translate(shift[0] * k, shift[1] * k)
    drawPlace(p, old, t, k)
    p.pop()
    // Going dim as it goes, darkest by the circle's edge, as the inside of a lens is.
    ctx.fillStyle = `rgba(8,7,10,${0.45 * smooth(u * 1.3)})`
    ctx.fillRect(x0, y0, w, h)
    const rim = ctx.createRadialGradient(mx, my, r * k, mx, my, (r + 0.6) * k)
    rim.addColorStop(0, 'rgba(8,7,10,0.35)')
    rim.addColorStop(1, 'rgba(8,7,10,0)')
    ctx.fillStyle = rim
    ctx.fillRect(mx - (r + 0.6) * k, my - (r + 0.6) * k, 2 * (r + 0.6) * k, 2 * (r + 0.6) * k)
    ctx.restore()
    // The rim: a thin dark line where the two places meet.
    ctx.save()
    ctx.strokeStyle = 'rgba(8,7,10,0.55)'
    ctx.lineWidth = Math.max(1, k * 0.018)
    ctx.beginPath()
    ctx.arc(mx, my, r * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  },
})
