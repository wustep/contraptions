import type p5 from 'p5'
import { R } from '../../../../../parts'
import { rgba } from '../cast'
import { frame } from '../kit'
import { SEAM, nearestBeat } from '../music'
import { HOUSE, VALLEY } from '../worlds'
import { FLOOR, NEWS_X, ss } from './time'
import { HEAD, WIN_X } from './room'

/**
 * They come for her (106.742 → 110.655): the night the shells came, the lake house dark but for the television, still
 * on the news, and Louise where she was before it. On the beat (107.752) a light comes up over the lake beyond the long
 * window, low and white, a red light winking under it: a helicopter. Its searchlight sweeps in through the glass along
 * the floor, and on the chord (108.716) it finds her and holds, the room white round her, her shadow thrown long. On
 * the beat (109.679) she goes, rolling out along the floor to the left, the light after her; and the show cuts to
 * Montana as she drops out of that helicopter's door onto the meadow (a scale cut out to the camp).
 *
 * The house's world cells, as the room has them; she rests on the floor at y = 0.
 */

const b = (t: number): number => nearestBeat(t)

export const RC = {
  in: SEAM.recruit,
  light: b(107.752),
  found: b(108.716),
  go: b(109.679),
  out: SEAM.camp,
}
/** Every strike: the light over the lake, the beam finding her, her going. */
export const RECRUIT_HITS = [RC.light, RC.found, RC.go]

/** How fast she is going at the cut: as she leaves the door in Montana (`valley/paths.ts`, OUT_V). */
const OUT_V = 2.7
const ACC = OUT_V / (RC.out - RC.go)

/** Louise on the floor: where she was before the television, until she goes, evenly faster, to the left. */
export function recruitX(T: number): number {
  const u = Math.max(0, T - RC.go)
  return NEWS_X - 0.5 * ACC * u * u
}

/** The helicopter's lamp, out over the lake beyond the glass (cells, in the window): rising into view, hovering. */
function lamp(T: number): { x: number; y: number; a: number } {
  const up = ss(T, RC.light - 0.5, RC.light + 0.6)
  const drift = 0.25 * ss(T, RC.light, RC.out)
  return { x: -3.4 + drift, y: -0.55 - 0.45 * up, a: up }
}
/** Where the searchlight's pool is on the floor: sweeping in from the left along it, onto her, and after her. */
function pool(T: number): { x: number; a: number } {
  const on = ss(T, RC.light + 0.15, RC.light + 0.5)
  const sweep = ss(T, RC.light + 0.15, RC.found)
  const from = -5.2
  const x = from + (recruitX(T) - from) * sweep
  return { x, a: on }
}
/** How white the room is with the light in it: up as it finds her. */
const flood = (T: number): number => ss(T, RC.found - 0.12, RC.found + 0.18) * (1 - 0.25 * ss(T, RC.go, RC.out))

/** Drawn in the room, before the balls: the lamp over the lake, the beam through the glass, its pool on the floor. */
export function drawRecruit(p: p5, k: number, T: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const px = (v: number) => v * k
  const L = lamp(T)
  const P = pool(T)
  const fl = flood(T)
  ctx.save()
  if (L.a > 0.01) {
    // The lamp, low over the water, seen through the glass (so only in it): a hard white point in a wide halo, its
    // light lying on the lake under it.
    ctx.save()
    ctx.beginPath()
    ctx.rect(px(WIN_X[0]), px(HEAD), px(WIN_X[1] - WIN_X[0]), px(FLOOR - HEAD))
    ctx.clip()
    const halo = ctx.createRadialGradient(px(L.x), px(L.y), 0, px(L.x), px(L.y), px(1.6))
    halo.addColorStop(0, rgba('#FFFFFF', 0.95 * L.a))
    halo.addColorStop(0.08, rgba(VALLEY.floodlight, 0.62 * L.a))
    halo.addColorStop(0.4, rgba(VALLEY.floodlight, 0.12 * L.a))
    halo.addColorStop(1, rgba(VALLEY.floodlight, 0))
    ctx.fillStyle = halo
    ctx.fillRect(px(L.x - 1.6), px(L.y - 1.6), px(3.2), px(3.2))
    // Its light on the water: a soft column from the far shore down, fading to its sides as well as down (a hard-sided
    // bar of it read as a post standing in the lake).
    ctx.save()
    ctx.beginPath()
    ctx.rect(px(L.x - 0.3), px(-0.42), px(0.6), px(0.4))
    ctx.clip()
    ctx.translate(px(L.x), px(-0.42))
    ctx.scale(1, 0.37 / 0.11)
    const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, px(0.11))
    streak.addColorStop(0, rgba(VALLEY.floodlight, 0.38 * L.a))
    streak.addColorStop(0.5, rgba(VALLEY.floodlight, 0.14 * L.a))
    streak.addColorStop(1, rgba(VALLEY.floodlight, 0))
    ctx.fillStyle = streak
    ctx.fillRect(-px(0.11), 0, px(0.22), px(0.11))
    ctx.restore()
    // Its red light, winking on the beats.
    const wink = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (T - RC.light) / 0.98)
    ctx.fillStyle = rgba('#D0453A', 0.8 * L.a * wink)
    ctx.beginPath()
    ctx.arc(px(L.x + 0.32), px(L.y + 0.1), Math.max(1, px(0.025)), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  if (P.a > 0.01 && L.a > 0.01) {
    // The beam: from the lamp through the glass and down to the floor, soft, wider where it lands.
    const top = Math.max(HEAD, L.y)
    const w0 = 0.12
    const w1 = 0.95
    // Feathered: nested wedges, faint at the widest, so the beam has no edge in the air (one wedge was a hard-sided
    // blade laid across the window and the room).
    const n = 12
    for (let j = 0; j < n; j++) {
      const wide = 1.35 - (0.75 * j) / (n - 1)
      const g = ctx.createLinearGradient(0, px(top), 0, px(FLOOR))
      g.addColorStop(0, rgba(VALLEY.floodlight, (0.05 * P.a) / n))
      g.addColorStop(1, rgba(VALLEY.floodlight, ((0.2 + 0.16 * fl) * P.a) / n))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(px(L.x - w0 * wide), px(top))
      ctx.lineTo(px(L.x + w0 * wide), px(top))
      ctx.lineTo(px(P.x + w1 * wide), px(FLOOR))
      ctx.lineTo(px(P.x - w1 * wide), px(FLOOR))
      ctx.closePath()
      ctx.fill()
    }
    // The pool it makes on the oak, coming toward us.
    ctx.save()
    ctx.translate(px(P.x), px(FLOOR + 0.18))
    ctx.scale(1, 0.32)
    const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, px(1.4))
    pg.addColorStop(0, rgba('#FFFFFF', (0.38 + 0.3 * fl) * P.a))
    pg.addColorStop(0.5, rgba(VALLEY.floodlight, 0.14 * P.a))
    pg.addColorStop(1, rgba(VALLEY.floodlight, 0))
    ctx.fillStyle = pg
    ctx.fillRect(-px(1.4), -px(1.4), px(2.8), px(2.8))
    ctx.restore()
    // Her shadow, thrown long away from the light across the floor toward us.
    const x = recruitX(T)
    if (Math.abs(P.x - x) < 1.2) {
      const near = 1 - Math.abs(P.x - x) / 1.2
      ctx.save()
      ctx.translate(px(x + 0.15), px(FLOOR + 0.3))
      ctx.rotate(0.35)
      ctx.scale(1, 0.22)
      const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, px(0.9))
      sg.addColorStop(0, rgba(HOUSE.night, 0.45 * near * P.a))
      sg.addColorStop(1, rgba(HOUSE.night, 0))
      ctx.fillStyle = sg
      ctx.fillRect(-px(0.9), -px(0.9), px(1.8), px(1.8))
      ctx.restore()
    }
  }
  // The room taking the light: everything a little whiter while it is in the room.
  if (fl > 0.01) {
    ctx.fillStyle = rgba(VALLEY.floodlight, 0.18 * fl)
    ctx.fillRect(px(f.x0 - 1), px(f.y0 - 1), px(f.x1 - f.x0 + 2), px(f.y1 - f.y0 + 2))
  }
  ctx.restore()
}

/** Drawn over the balls: the glare where the light comes through the glass, on her as she is in it. */
export function drawRecruitOver(p: p5, k: number, T: number): void {
  const fl = flood(T)
  if (fl <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const px = (v: number) => v * k
  const x = recruitX(T)
  const g = ctx.createRadialGradient(px(x), px(-R), 0, px(x), px(-R), px(0.7))
  g.addColorStop(0, rgba('#FFFFFF', 0.22 * fl))
  g.addColorStop(1, rgba('#FFFFFF', 0))
  ctx.fillStyle = g
  ctx.fillRect(px(x - 0.7), px(-R - 0.7), px(1.4), px(1.4))
}
