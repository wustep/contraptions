import type p5 from 'p5'
import { FLOOR, mixHex, type Pt, type Seg } from '../../../../../parts'
import { box, knock, part, smooth, type PartShot } from '../kit'
import { DOOR } from '../cast'
import { level, SEAM } from '../music'
import { G } from '../physics'
import { CASTLE, drawCastle, drawChimneyFire } from './castle'
import { WASTES } from '../worlds'
import { FOG_WIDE, laneThrough, TURNIP_TO_WALK } from './hills'
import { drawFog, drawPlume, drawTurnipAt } from './hills-land'
import {
  ABOARD_KEYS, castleAt, CATCH, CLIMB, DROP, HILLTOP, LAST, LATCH, onCastle, ROAR, SETTLE, sophieAboard,
  stepAt, TAKEOFF, TURNIP_LANDINGS, W, WIDE,
} from './walk-plan'

/**
 * The castle walking (121.15 → 151.998): the castle builder's. The castle comes up out of the fog over the hill she
 * stands on, a footfall on every downbeat of the waltz, steam from its knees and dust from its feet; its body
 * passes over her and a great foot swings over her head. On bar 66 its stair drops out of the porch, section after
 * section, and swings; on bar 68 she jumps for its foot as it comes by, and climbs, a hop a beat, tread to tread,
 * onto the porch. On bar 71 Calcifer roars: fire out of the chimney, two bursts of black smoke, and the castle
 * lurches and lengthens its stride; Turnip Head, who hopped after it, falls behind. Big strides across the wastes
 * into the dusk (131.4, 133.7, 135.9 the loudest), the stair wound up; night comes, the windows light one by one.
 * It slows, and on the waltz's last note (148.8) it sits down on its folded legs. In the stop the door's latch
 * lifts, a crack of firelight; on the pickup (151.5) it swings wide, and on the flow's first note she is over the
 * threshold, walking in.
 *
 * The frame's origin is the hills part's exit (`HILLTOP` plus half a cell); everything is worked out in the
 * wastes' own cells (`walk-plan.ts`) and moved.
 */

/** This part's origin in the wastes' cells. */
const O: Pt = [HILLTOP[0] + 0.5, HILLTOP[1]]
const w = (p: Pt): Pt => [p[0] - O[0], p[1] - O[1]]

/** The roar's two blasts of fire ([time, strength, how long it takes to die back]). */
const ROARS_FIRE: [number, number, number][] = [[ROAR[0], 1, 0.55], [ROAR[1], 0.85, 0.8]]
function roarFire(T: number): number {
  let f = 0
  for (const [at, s, tau] of ROARS_FIRE) f = Math.max(f, s * knock(T - at, tau))
  return f
}

/** The first and last footfall it strikes (bars 65 → 88). */
const FEET = Array.from({ length: 24 }, (_, i) => W(65 + i))

export const walk = part<null>(
  {
    name: 'walk',
    draw: (p, _s, c) => {
      const T = SEAM.walk + c.t
      const { k } = c
      p.push()
      p.translate(-O[0] * k, -O[1] * k)
      const cs = castleAt(T)
      if ((cs.pose.haze ?? 0) < 0.985) {
        p.push()
        p.translate(cs.at[0] * k, cs.at[1] * k)
        // From nightfall the door stands ajar on the room's warm light (Markl's left it off the latch), until the latch.
        // The latch then opens it on from there, and the pickup flings it wide.
        const ajar = AJAR * ajarAt(T)
        const pose = { ...cs.pose, door: ajar + (cs.pose.door ?? 0) * (1 - ajar) }
        drawCastle(p, k, c.weight, c.ink, pose)
        p.pop()
        if ((cs.pose.haze ?? 0) < 0.4) drawLantern(p, k, c.weight, c.ink, T)
        drawPlume(p, k, T)
        // Calcifer's roar: his fire out of the chimney, the same fire as the last chord's.
        const fire = roarFire(T)
        if (fire > 0.01) {
          const [ex, ey] = onCastle(T, CASTLE.chimney)
          drawChimneyFire(p, k, T, ex, ey, fire, ROARS_FIRE)
        }
      }
      drawFog(p, k, T)
      if (T >= TURNIP_TO_WALK) drawTurnipAt(p, k, c.weight, c.ink, T)
      p.pop()
    },
  },
  (slot) => {
    const start: Pt = [-0.5, 0]
    const onPlate = w(sophieAboard(CATCH))
    const T = CATCH - TAKEOFF
    const segs: Seg[] = [
      { from: start, to: start, dur: TAKEOFF - slot.begin },
      { from: start, to: onPlate, dur: T, arc: (G * T * T) / 8 },
      ...laneThrough(sophieAboard, ABOARD_KEYS, CATCH, slot.end, O),
    ]
    const end = w(sophieAboard(slot.end))
    return {
      cells: box(-52 - O[0], -36 - O[1], 132 - O[0], 8 - O[1], 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: CATCH - slot.begin },
      state: null,
    }
  },
  (slot): PartShot[] => {
    const door = (T: number, dx: number, dy: number): Pt => {
      const [x, y] = onCastle(T, CASTLE.door)
      return w([x + dx, y - FLOOR + dy])
    }
    // Her on the hilltop (the lane's start) with the framing's centre moved off her.
    const hill = (dx: number, dy: number): Pt => [-0.5 + dx, dy]
    // The wide: the whole castle, feet to flag, at one size on the roar and the third great stride.
    const WHOLE = 30
    // The close: her on the porch a little left of middle, a touch low (the lantern, the hull and the door over and
    // beside her, the legs and the wastes going by under the porch), the camera riding with her, so each drop and heave of the hull reads
    // as her dipping and lifting in the frame.
    const CLOSE = 5.6
    const close: Pt = [0.1 * CLOSE * (16 / 9), -0.04 * CLOSE]
    // The third great stride is watched from a lock-off: the castle crosses it past the thorn tree (world x 47),
    // whole from its feet to its flag, its feet a cell and a half above the frame's foot.
    const past = castleAt(W(78)).at
    const cross = w([48, past[1] + 1.7 - WHOLE / 2])
    // Where the castle sits down in the night: the whole of it, centred on its seat, a little lower in the frame than
    // in the strides' (the porch comes down as it sits, and she with it).
    const seat = castleAt(SETTLE + 1).at
    const NIGHT = WHOLE + 2
    const night = w([seat[0] + 0.4, seat[1] + 3.5 - NIGHT / 2])
    // Under the porch at night: her high in the frame, the great legs striding under her into the dark (at 7.6 cells
    // she holds the lead's floor, 12 px at 640x360).
    const UNDER = 7.6
    const under: Pt = [0.12 * UNDER * (16 / 9), 0.23 * UNDER]
    return [
      // The hills' wide of the castle out of the fog holds through its first stride out of it (W65, this seam); on the
      // next footfall, as the stair drops, a cut in to her on the hilltop, low in the frame: the legs stamping round
      // her and the belly over her, cropped by the top; the stair drops into the frame over her, and in on her a
      // little as she jumps for its foot.
      { t: DROP - 0.03, cells: FOG_WIDE[2].cells, hold: w(FOG_WIDE[2].at) },
      { t: DROP, cells: 7.3, hold: hill(-0.2, -2.0), cut: true },
      { t: CATCH, cells: 6.9, hold: hill(0.35, -2.1) },
      // Up the stair with her, a tread a beat, to the porch.
      { t: CLIMB[2], cells: 6.4, off: [0.75, -0.85] },
      { t: CLIMB[6], cells: CLOSE, off: close },
      // Calcifer's roar (128.0): a cut out to the whole castle, his fire leaping out of the chimney at the top of the
      // frame, the first time we see the engine; on the next footfall back in to her on the porch.
      { t: ROAR[0], cells: 28.4, off: [2.9, -6.0], cut: true },
      { t: W(72), cells: CLOSE, off: close, cut: true },
      // The great strides are one phrase building to the third (135.94, the loudest): the first two (131.43, 133.72)
      // ridden aboard with no cut, the porch dropping under her on each (the gait's heavier drop) and the camera riding
      // it, a short dip and a long rise; then one cut out, on the third, to the lock-off past the thorn tree, held
      // while the whole castle strides across it into the dusk, and back in to her two bars later (W80).
      { t: W(74) - 0.4, cells: CLOSE - 0.1, off: close },
      { t: W(76) + 0.5, cells: CLOSE - 0.3, off: [close[0], close[1] + 0.05] },
      { t: W(78) - 0.03, cells: CLOSE - 0.35, off: [close[0], close[1] + 0.05] },
      { t: W(78), cells: WHOLE, hold: cross, cut: true },
      { t: W(80) - 0.03, cells: WHOLE - 0.4, hold: [cross[0] + 0.6, cross[1] + 0.1] },
      // Night comes on her: in close under the lantern as the dusk deepens and the windows light, the door easing
      // ajar beside her; a slow breath in and out.
      { t: W(80), cells: CLOSE, off: close, cut: true },
      { t: 141.0, cells: 5.2, off: [0.1 * 5.2 * (16 / 9), -0.04 * 5.2] },
      { t: 144.2, cells: 5.5, off: [0.1 * 5.5 * (16 / 9), -0.04 * 5.5] },
      // On a footfall, a cut down under the porch: her high in the frame, the great legs walking on under her into the
      // dark as it slows.
      { t: W(86), cells: UNDER, off: under, cut: true },
      { t: W(87) + 0.6, cells: UNDER + 0.15, off: [under[0], under[1] + 0.1] },
      // On the last footfall, out to the whole castle small against the night, its windows lit, folding down onto its
      // seat; on the last note (the sit), back in to her on the porch beside the door, and on to the door as the latch
      // lifts and it opens on the room's light.
      { t: LAST, cells: NIGHT, hold: night, cut: true },
      { t: SETTLE - 0.2, cells: NIGHT - 1.2, hold: [night[0], night[1] + 0.5] },
      { t: SETTLE, cells: 6.0, hold: door(SETTLE, -0.55, -0.9), cut: true },
      { t: LATCH, cells: 5.4, hold: door(LATCH, 0.1, -0.95) },
      { t: slot.end, cells: 4, off: [0.9, -0.7] },
    ]
  },
)

/**
 * Every strike of this part, in show seconds: every footfall from bar 65 to 88, the stair's drop, her jump onto it
 * and her climb, the roar, Turnip Head's landings behind it, the belly on the ground, the latch and the door.
 */
export const WALK_HITS: number[] = [...new Set([...FEET, DROP, TAKEOFF, CATCH, ...CLIMB, ...ROAR, ...TURNIP_LANDINGS.filter((t) => t > SEAM.walk), SETTLE, LATCH, WIDE])].sort((a, b) => a - b)

/** How far the door stands ajar at night (the latch, 150.686, then opens it on to about a third). */
const AJAR = 0.2
/** The door easing ajar as night comes (from 139.6), and held there. */
const ajarAt = (T: number): number => smooth(T, 139.6, 141.2)

/**
 * The porch lantern: a small square brass lantern hung on a short chain from the left end of the hood over the door,
 * two cells over where she rides, swinging to the gait. Lit as she climbs, and full as the dusk comes on, its light
 * falls down: a flat warm pool on the porch planks round her feet, while the iron right behind her stays in shade,
 * so at night she reads pale on dark, never lost on lit grey iron. From nightfall a blade of warm light from
 * the door standing ajar falls across the porch planks behind her. (Square, and two cells over her head: never a
 * round bright thing near her.)
 */
function drawLantern(p: p5, k: number, weight: number, ink: string, T: number): void {
  const [dx, dy] = CASTLE.door
  const hook = onCastle(T, [dx - 0.9, dy - 2.62])
  // It swings on its chain to the gait: the body surges and checks on every stride (quick mid-stride, slow as a foot
  // lands), so the lantern lags it and swings back; wider on the loud strides, still once it has sat.
  const still = 1 - smooth(T, SETTLE - 0.6, SETTLE + 1.6)
  const angle = (0.07 + 0.2 * level(T)) * Math.sin(2 * Math.PI * stepAt(T) - 2.2) * still
  const L = 0.28
  const lx = hook[0] - L * Math.sin(angle)
  const ly = hook[1] + L * Math.cos(angle)
  // Lit as she climbs to it (so she reads against the grey iron from the porch on), and full as the dusk comes.
  const lit = Math.max(0.6 * smooth(T, CLIMB[0], CLIMB[5]), smooth(T, 136.4, 139.6))
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  // How dark it has got: the pool reads, and the iron behind her goes into shadow, as the dusk comes on.
  const dusk = smooth(T, 136.4, 139.6)
  if (lit > 0.01) {
    // The iron right behind her in the shade of the lantern's cap and the hood (the light falls down, not back): a
    // soft darkening at her height, wider than tall, so her silver reads pale on dark iron, never on lit iron.
    const [px, py] = onCastle(T, [CASTLE.ride[0], CASTLE.ride[1] - FLOOR])
    if (dusk > 0.01) {
      ctx.save()
      ctx.translate(X(px), X(py - 0.06))
      ctx.scale(1, 0.72)
      const d = ctx.createRadialGradient(0, 0, 0, 0, 0, X(0.75))
      d.addColorStop(0, `rgba(18, 20, 30, ${0.5 * dusk})`)
      d.addColorStop(0.45, `rgba(18, 20, 30, ${0.36 * dusk})`)
      d.addColorStop(1, 'rgba(18, 20, 30, 0)')
      ctx.fillStyle = d
      ctx.fillRect(X(-0.75), X(-0.75), X(1.5), X(1.5))
      ctx.restore()
    }
    // The lantern's pool on the porch: a flat warm oval on the planks round her feet (and down the planks' face),
    // brightest round her and running out along the porch toward the door (it stops short of the porch's open end), never up the wall behind her.
    const [fx, fy] = onCastle(T, CASTLE.ride)
    const glow = lit * (0.3 + 0.7 * dusk)
    ctx.save()
    ctx.translate(X(fx + 0.2), X(fy + 0.03))
    ctx.scale(1, 0.17)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, X(1.05))
    g.addColorStop(0, `rgba(255, 214, 148, ${0.85 * glow})`)
    g.addColorStop(0.4, `rgba(255, 204, 136, ${0.55 * glow})`)
    g.addColorStop(1, 'rgba(255, 190, 120, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(-1.05), X(-1.05), X(2.1), X(2.1))
    ctx.restore()
    // A faint warm wash round the lantern itself and the hood it hangs from, gone before it reaches her.
    const h = ctx.createRadialGradient(X(lx), X(ly + 0.1), 0, X(lx), X(ly + 0.1), X(1.1))
    h.addColorStop(0, `rgba(255, 206, 140, ${0.16 * lit})`)
    h.addColorStop(1, 'rgba(255, 190, 120, 0)')
    ctx.fillStyle = h
    ctx.fillRect(X(lx - 1.1), X(ly - 1.0), X(2.2), X(2.2))
  }
  const ajar = ajarAt(T)
  if (ajar > 0.01) {
    // The blade from the door ajar: the gap at the opening's free (right) edge lit from the room, and out of it
    // across the planks toward and under her, brightest at the gap and fading as it goes.
    const gap = DOOR.w * (1 - Math.cos((AJAR * ajar * Math.PI) / 2 * 0.96)) + 0.015
    const edge = dx + DOOR.w / 2
    const q = [onCastle(T, [edge - gap, dy - DOOR.h]), onCastle(T, [edge, dy - DOOR.h]), onCastle(T, [edge, dy]), onCastle(T, [edge - gap, dy])]
    // (Once the latch lifts, the room itself shows in the widening gap.)
    ctx.fillStyle = `rgba(255, 216, 150, ${0.9 * ajar * (1 - smooth(T, LATCH, LATCH + 0.45))})`
    ctx.beginPath()
    q.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))))
    ctx.closePath()
    ctx.fill()
    const sill = onCastle(T, [edge - gap / 2, dy])
    const gapX = sill[0]
    const top = sill[1] - 0.03
    const g = ctx.createLinearGradient(X(gapX), 0, X(gapX - 2.1), 0)
    g.addColorStop(0, `rgba(255, 214, 150, ${0.62 * ajar})`)
    g.addColorStop(0.3, `rgba(255, 204, 138, ${0.36 * ajar})`)
    g.addColorStop(1, 'rgba(255, 196, 128, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(X(gapX + gap / 2), X(top))
    ctx.lineTo(X(gapX - gap / 2), X(top))
    ctx.lineTo(X(gapX - 2.1), X(top + 0.14))
    ctx.lineTo(X(gapX - 2.1), X(top + 0.23))
    ctx.lineTo(X(gapX + gap / 2), X(top + 0.23))
    ctx.closePath()
    ctx.fill()
  }
  // Its chain, and the lantern: a brass cap, four glass panes lit from within, a brass foot, hanging plumb from
  // the chain's end as it swings.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.line(X(hook[0]), X(hook[1]), X(lx), X(ly))
  p.translate(X(lx), X(ly))
  p.rotate(angle)
  p.rectMode(p.CENTER)
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(WASTES.ironDark, WASTES.window, 0.85 * lit))
  p.rect(0, X(0.14), X(0.15), X(0.2), X(0.02))
  p.fill(WASTES.brass)
  p.triangle(X(-0.11), X(0.04), X(0.11), X(0.04), 0, X(-0.06))
  p.rect(0, X(0.26), X(0.17), X(0.04))
  p.pop()
  if (lit > 0.01) {
    const cx = lx - 0.14 * Math.sin(angle)
    const cy = ly + 0.14 * Math.cos(angle)
    const g = ctx.createRadialGradient(X(cx), X(cy), 0, X(cx), X(cy), X(0.45))
    g.addColorStop(0, `rgba(255, 227, 163, ${0.4 * lit})`)
    g.addColorStop(1, 'rgba(255, 227, 163, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(cx - 0.45), X(cy - 0.45), X(0.9), X(0.9))
  }
}
