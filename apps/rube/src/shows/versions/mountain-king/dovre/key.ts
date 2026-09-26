import type p5 from 'p5'
import { R } from '../../../../parts'
import type { ShowPoint } from '../../../../show'
import { scenery, smooth } from './kit'
import { LAST1, LAST2, P, SILENCE } from './music'

/**
 * The key light: Peer's own light, so a stranger finds him in one glance in any frame. Nothing in the mountain is
 * lit by him otherwise; the brightest things are the fires and the lamps, the warm orange nearest his red, and he
 * sank into them (a 20-37 px dot at 720p through the tune, 4-15 px in the widest frames).
 *
 * Three things, drawn after every set and under the ball (the stage's `after`, in `draw`, so a set's `over` still
 * covers it where he is behind something):
 *
 * - a soft pool round him, 1.6 cells across its flat top's edge: no core (it is flat where he is and falls off by
 *   smoothstep), so it never reads as a second ball; screen-blended, warm amber inside the mountain, a cool moonlight
 *   outside it (before the tunnels and from the silence on);
 * - the rest of the frame darkened a little (13%) beyond about four cells from him, so he is always in the lightest
 *   part of it (less in wide frames, none at 16 cells or more, where the story is the place);
 * - in a wide frame (9 cells or more) his cream rim a little wider, drawn as a ring under the ball.
 *
 * It fades while he is hidden (in a barrel, a pipe), and fades out as the credits' crane pulls back to the mountain
 * (the pool sooner: from his landing in the hollow, warmed to the dawn meanwhile).
 */

/** Where Peer is, what the engine draws (late-bound: the show is made after its stages). */
export interface KeyState {
  at: ((t: number) => ShowPoint) | null
}

/** The pool's flat top reaches this far (cells), then falls off by smoothstep to `POOL`. */
const FLAT = 0.55
const POOL = 1.7
/** How strong the pool is (screen), and the darkening beyond `NEAR`. */
const STRENGTH = 0.27
const DARK = 0.13
const NEAR = 4

/** Warm inside the mountain, cool outside it (0 outside, 1 inside). */
function inside(T: number): number {
  const into = smooth(T, P[2] - 1.2, P[2] + 0.4)
  const out = smooth(T, SILENCE, LAST1)
  return into * (1 - out)
}

const WARM = [247, 184, 102]
const COOL = [168, 186, 222]
/** Outside after the blow-out the moonlight warms to the dawn's, so no cold grey disc sits on the morning sky. */
const DAWN = [242, 196, 141]

function visible(at: (t: number) => ShowPoint, T: number): number {
  // Averaged over a fifth of a second either side, so the light fades as he goes out of sight instead of popping.
  let v = 0
  for (let i = -2; i <= 2; i++) {
    const pt = at(T + i * 0.1)
    v += pt.hidden || pt.scale <= 0.05 ? 0 : 1
  }
  return v / 5
}

export const keyLight = scenery<KeyState>({
  name: 'key light',
  draw(p: p5, s: KeyState, c) {
    const at = s.at
    if (!at) return
    const T = c.t
    // Gone as the credits' crane pulls back from him to the whole mountain.
    const fade = 1 - smooth(T, 155.5, 160.5)
    if (fade <= 0) return
    const here = at(T)
    const k = c.k
    const x = here.x * k
    const y = here.y * k
    const seen = visible(at, T) * fade
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const cells = p.height / k

    ctx.save()
    // The frame darkened beyond a few cells from him (wider in a wide frame, so a wide is not a spotlight).
    // (Not in the widest frames: there the story is the place, not him.)
    const dark = DARK * fade * (1 - smooth(cells, 11, 16))
    if (dark > 0.005) {
      const near = Math.max(NEAR, cells * 0.2) * k
      const far = near * 1.9
      const g = ctx.createRadialGradient(x, y, near, x, y, far)
      g.addColorStop(0, 'rgba(0, 0, 0, 0)')
      g.addColorStop(0.5, `rgba(0, 0, 0, ${(dark * 0.5).toFixed(3)})`)
      g.addColorStop(1, `rgba(0, 0, 0, ${dark.toFixed(3)})`)
      ctx.fillStyle = g
      const span = (cells * 2 + 20) * k
      ctx.fillRect(x - span, y - span, 2 * span, 2 * span)
    }
    // The pool: flat where he is, then a smoothstep to nothing. Gone soon after he lands in the hollow (153.2): out
    // on the hillside at dawn the day lights him, and the pool only sat on the sky under the first card.
    // (Out under the open sky after the last chord it is fainter, and warms to the dawn as he flies, so no cold grey
    // disc rides with him across the sky.)
    const pool = seen * (1 - smooth(T, 153.2, 155.0)) * (1 - 0.4 * smooth(T, LAST2, LAST2 + 0.8))
    if (pool > 0.01) {
      const w = inside(T)
      const morn = smooth(T, 150.2, 151.8)
      const out = COOL.map((v, i) => v + (DAWN[i] - v) * morn)
      const rgb = WARM.map((v, i) => Math.round(out[i] + (v - out[i]) * w)).join(', ')
      const a = STRENGTH * pool * (0.85 + 0.15 * w)
      const g = ctx.createRadialGradient(x, y, 0, x, y, POOL * k)
      g.addColorStop(0, `rgba(${rgb}, ${a.toFixed(3)})`)
      g.addColorStop(FLAT / POOL, `rgba(${rgb}, ${a.toFixed(3)})`)
      for (let i = 1; i <= 6; i++) {
        const u = i / 6
        const f = 1 - u * u * (3 - 2 * u)
        g.addColorStop(FLAT / POOL + (1 - FLAT / POOL) * u, `rgba(${rgb}, ${(a * f).toFixed(3)})`)
      }
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, POOL * k, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()

    // A wider cream rim in a wide frame: a ring under the ball, the ball's own shape (stretched along its line).
    const wide = Math.max(0, Math.min(1, (cells - 9) / 7))
    if (wide > 0 && !here.hidden && here.scale > 0.05 && seen > 0.01) {
      const extra = (0.4 + 0.9 * wide) * Math.max(1, k / 60)
      const d = 2 * R * k * here.scale
      const angle = Math.atan2(Math.sin(here.angle), here.placed.mirror * Math.cos(here.angle))
      p.push()
      p.translate(x, y)
      p.rotate(angle)
      p.noStroke()
      const ink = p.color(c.ink)
      ink.setAlpha(255 * Math.min(1, seen) * 0.9)
      p.fill(ink)
      p.ellipse(0, 0, d * here.stretch + 2 * extra, d + 2 * extra)
      p.pop()
    }
  },
})
