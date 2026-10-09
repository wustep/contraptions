import { mixHex } from '../../../../../parts'
import { frame, scenery } from '../kit'
import { DOJO, HIBACHI, HOME, HOTDOG, ROCKS, STAR, VOID } from '../worlds'
import { BAGEL, bagelPose, THING_WORLD } from './bagel'
import { GIVEN, RELEASE, T_OUT, turnAt } from './peakClock'

/**
 * The dark fills with every colour.
 *
 * The peak is the loudest passage of the cue, and it was the darkest picture in the show: the black bagel in the
 * black. Now, as the bagel gives back everything it swallowed, each thing comes out of the hole with a beam of its
 * own life's colour from the hole: a trophy and a flashbulb in the carpet's red and gold, a fan
 * and a shoe in the dojo's lacquer, the mustard and the hot dog in their pink and yellow, Raccacoonie's spatula and
 * shrimp in the griddle's flame, a pebble in the canyon's sand, the laundromat's socks and receipts in its lantern
 * gold and tile. Each beam flares as its thing bursts out and settles to a glow that stays, so beat by beat the
 * dark behind the bagel fills, until it stands black against a radiance of every life she has been. The beams wheel
 * slowly with the bagel as it turns back. When the line runs out and the bagel coasts and closes into a washer's
 * window, they draw in toward it and dim, and through the window it is home.
 *
 * Drawn behind the bagel, so it stands backlit in them and they come from behind its rim. Each beam is a narrow
 * share of the frame and they rise one a beat, a little under 2.5 a second, so the frame's light never swings as a
 * flash does; the settled glow is soft.
 */

const COLOUR: Record<string, string[]> = {
  laundromat: [HOME.gold, mixHex(HOME.tile, HOME.gold, 0.25)],
  premiere: [STAR.carpet, STAR.gold],
  dojo: [DOJO.lacquer, DOJO.gold],
  hotdog: ['#F59AB0', HOTDOG.mustard],
  hibachi: [HIBACHI.flame, HIBACHI.flameHot],
  rocks: [ROCKS.canyon, ROCKS.sand],
  everywhere: ['#E85FD0', '#3FE0D0'],
}

interface Beam {
  at: number
  dir: number
  color: string
  /** How wide it opens, radians either side of its line. */
  half: number
}

const BEAMS: Beam[] = GIVEN.map((g, i) => {
  const set = COLOUR[THING_WORLD[g.thing]] ?? COLOUR.laundromat
  // Round the whole circle, a golden step each, so the radiance fills all the way round and not only the side things
  // are thrown to.
  return { at: g.at, dir: -Math.PI / 2 + i * 2.399963, color: set[i % set.length], half: 0.075 + 0.05 * ((i * 0.618) % 1) }
})
const FROM = BEAMS.length ? BEAMS[0].at - 0.1 : Infinity

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
const ss = (u: number): number => {
  const x = Math.max(0, Math.min(1, u))
  return x * x * (3 - 2 * x)
}

/** A beam's strength `x` seconds after its thing came out: a flare that settles to a glow that stays. */
const strength = (x: number): number => (x <= 0 ? 0 : ss(x / 0.12) * (0.45 + 0.55 * Math.exp(-x / 0.55)))

/** How much of the radiance is left as the bagel coasts and closes into the window: it draws in and dims. */
const closing = (t: number): number => ss((t - RELEASE) / (T_OUT - RELEASE))

export const radiance = scenery<null>({
  name: 'radiance',
  draw: (p, _s, c) => {
    const t = c.t
    if (t < FROM || t > T_OUT + 0.05) return
    const pose = bagelPose(t)
    const k = c.k
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const cx = pose.dx * k
    const cy = pose.dy * k
    // Far enough to leave the frame whatever the camera is doing.
    const reach = Math.hypot(f.x1 - f.x0, f.y1 - f.y0) * k + BAGEL.r * pose.scale * k
    const inner = BAGEL.hole * pose.scale * k
    const close = closing(t)
    const wheel = 0.22 * (turnAt(t) - turnAt(FROM))
    ctx.save()
    // Only what is in the frame is painted: the beams reach far past it.
    ctx.beginPath()
    ctx.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    ctx.clip()
    ctx.globalCompositeOperation = 'screen'
    for (const b of BEAMS) {
      const a = strength(t - b.at) * (1 - 0.75 * close)
      if (a <= 0.004) continue
      const dir = b.dir - wheel
      const half = b.half * (1 - 0.55 * close)
      const len = reach * (1 - 0.6 * close)
      const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, len)
      g.addColorStop(0, rgba(b.color, 0.85 * a))
      g.addColorStop(0.35, rgba(b.color, 0.5 * a))
      g.addColorStop(1, rgba(b.color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, len, dir - half, dir + half)
      ctx.closePath()
      ctx.fill()
    }
    // A soft bloom of all of them together round the bagel, so the dark round it is lit and not only striped.
    const lit = Math.min(1, BEAMS.filter((b) => t > b.at).length / 12) * (1 - 0.6 * close)
    if (lit > 0.01) {
      const R = BAGEL.r * pose.scale * k
      const g = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.6)
      g.addColorStop(0, rgba(mixHex(VOID.rimLight, VOID.glow, 0.35), 0.22 * lit))
      g.addColorStop(1, rgba(VOID.glow, 0))
      ctx.fillStyle = g
      ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    }
    ctx.restore()
  },
})
