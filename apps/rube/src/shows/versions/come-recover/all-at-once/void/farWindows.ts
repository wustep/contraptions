import { clamp } from '../../../../../../../../src/core/ease'
import { frame, hash, scenery } from '../kit'
import { fall, JUMPS, ONSETS } from '../music'
import { sprites, TINTS } from '../home/multitude'
import { JOY_LIGHT } from './pullPath'

/**
 * Every life's window, far off in Jobu's dark.
 *
 * The show opens and ends in a night of lit windows, every one a laundromat in another life (`home/multitude.ts`). In
 * between, they are in the dark she falls into: when the surf's worlds collapse into her, the dark is full of them,
 * far off, and on each of the hush's quiet notes some of them go out, until on the last of them the dark is dark, and
 * the light that finds Joy on the bagel's crown is the only one left. Jobu's nothing.
 *
 * At the peak, as the bagel gives everything back in a radiance of every colour, they come on again, a few on every
 * beat, behind the radiance's beams: and at the end they are all there, round home.
 *
 * So far off that they keep their place in the frame however the camera moves (as the rocks' sun does), drawn first
 * in the dark, behind the bagel.
 */

const COUNT = 420
/** The hush's quiet notes, after the dark's first second: on each, its share of the windows goes out. */
const OUTS = ONSETS.filter((o) => o.t > JUMPS.void + 1 && o.t < JOY_LIGHT - 0.05).map((o) => o.t)
/** At the peak they come on again on the beats of the radiance. */
const ONS = Array.from({ length: 16 }, (_, i) => fall(142 + i))

interface Window {
  u: number
  v: number
  size: number
  b: number
  tint: number
  out: number
  on: number
  phase: number
}

const WINDOWS: Window[] = Array.from({ length: COUNT }, (_, i) => {
  const h = (n: number) => hash(i, n, 9191)
  let tint = 0
  let pick = h(4)
  for (let j = 0; j < TINTS.length; j++) {
    pick -= TINTS[j].share
    if (pick <= 0 || j === TINTS.length - 1) {
      tint = j
      break
    }
  }
  return {
    // Across a frame a little wider than the 16:9 one, so a wider stage is filled too.
    u: (h(1) - 0.5) * 2.2,
    v: (h(2) - 0.5) * 1.15,
    // Most of them points; a few nearer, a little bigger.
    size: 1 + 2.6 * Math.pow(h(3), 5),
    b: 0.6 + 0.4 * h(5),
    tint,
    out: OUTS.length ? OUTS[Math.floor(h(6) * OUTS.length)] + 0.12 * h(7) : JOY_LIGHT,
    on: ONS[Math.floor(h(8) * ONS.length)] + 0.15 * h(9),
    phase: h(10) * 6.28,
  }
})

const smooth = (x: number): number => {
  const u = clamp(x)
  return u * u * (3 - 2 * u)
}

/** How lit window `w` is at `t`. */
function litAt(w: Window, t: number): number {
  // In the dark from the surf's collapse, going out on its note in the hush.
  if (t >= JUMPS.void && t < JOY_LIGHT + 0.5) return smooth((t - JUMPS.void - 0.15) / 0.7) * (1 - smooth((t - w.out) / 0.35))
  // Back on at the peak, on its beat, and on until the dark's last frame.
  if (t >= ONS[0] - 0.1 && t < JUMPS.home) return smooth((t - w.on) / 0.4)
  return 0
}

export const farWindows = scenery<null>({
  name: 'far windows',
  draw: (p, _s, c) => {
    const t = c.t
    const inHush = t >= JUMPS.void && t < JOY_LIGHT + 0.5
    const inPeak = t >= ONS[0] - 0.1 && t < JUMPS.home
    if (!inHush && !inPeak) return
    const art = sprites()
    if (!art) return
    const { k } = c
    const f = frame(p, k)
    const W = f.x1 - f.x0
    const H = f.y1 - f.y0
    // The 16:9 frame's height, in cells: what their places are shares of.
    const S = Math.min(H, (W * 9) / 16)
    const px = 1 / k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    for (const w of WINDOWS) {
      const lit = litAt(w, t)
      if (lit <= 0.003) continue
      const x = f.cx + w.u * S * (8 / 9)
      const y = f.cy + w.v * S
      if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
      const r = 3.6 * w.size * px
      ctx.globalAlpha = clamp(lit * w.b * (1 + 0.08 * Math.sin(t * 0.8 + w.phase)))
      ctx.drawImage(art[w.tint], (x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
    }
    ctx.restore()
  },
})
