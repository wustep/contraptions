import type p5 from 'p5'
import { R } from '../../../../parts'
import type { ShowPoint } from '../../../../show'
import { scenery, smooth } from './kit'

/**
 * Peer's rim: a thin warm near-white line just outside the ball's own cream outline, at every frame size, so a
 * stranger finds him in one glance. It is the brightest value in any frame: flame cores, lantern glass and the
 * furnace's white are all a step under it (`LAMP.core` and below).
 *
 * There is no light round him. An earlier key light (a soft pool 3.4 cells across, and the frame darkened beyond
 * four cells from him) read as a lens or a spotlight following him, a disc larger than any prop near him. The places
 * that went dark without it are lit by their own sets now: the hall's firelight down the hatch, the drum room's
 * embers up the mine's shaft, the heart's lit iron under whatever he rides.
 *
 * Drawn after every set and under the ball (the stage's `after`, in `draw`), so a set's `over` still covers it where
 * he is behind something. It fades while he is hidden (in a barrel, a pipe) and as the credits' crane pulls back.
 */

/** Where Peer is, what the engine draws (late-bound: the show is made after its stages). */
export interface KeyState {
  at: ((t: number) => ShowPoint) | null
}

/** The rim: a warm near-white a touch above `LAMP.core` (#FFD58A), and its width at 720p (px). */
export const RIM = '#FFF3DA'
const RIM_PX = 1.3

function visible(at: (t: number) => ShowPoint, T: number): number {
  // Averaged over a fifth of a second either side, so the rim fades as he goes out of sight instead of popping.
  let v = 0
  for (let i = -2; i <= 2; i++) {
    const pt = at(T + i * 0.1)
    v += pt.hidden || pt.scale <= 0.05 ? 0 : 1
  }
  return v / 5
}

export const keyLight = scenery<KeyState>({
  name: 'rim',
  draw(p: p5, s: KeyState, c) {
    const at = s.at
    if (!at) return
    const T = c.t
    // Gone as the credits' crane pulls back from him to the whole mountain.
    const fade = 1 - smooth(T, 155.5, 160.5)
    if (fade <= 0) return
    const here = at(T)
    if (here.hidden || here.scale <= 0.05) return
    const seen = visible(at, T) * fade
    if (seen <= 0.01) return
    const k = c.k
    // The ball's outline is `max(0.75, 0.037 k) * 0.8` px, centred on its edge; the rim starts at the outline's
    // outer edge and runs `RIM_PX` (at 720p) beyond it.
    const px = Math.max(1, (RIM_PX * p.height) / 720)
    const stroke = Math.max(0.75, k * 0.037) * 0.8
    const extra = stroke / 2 + px
    const d = 2 * R * k * here.scale
    const angle = Math.atan2(Math.sin(here.angle), here.placed.mirror * Math.cos(here.angle))
    p.push()
    p.translate(here.x * k, here.y * k)
    p.rotate(angle)
    p.noStroke()
    const rim = p.color(RIM)
    rim.setAlpha(255 * Math.min(1, seen))
    p.fill(rim)
    p.ellipse(0, 0, d * here.stretch + 2 * extra, d + 2 * extra)
    p.pop()
  },
})
