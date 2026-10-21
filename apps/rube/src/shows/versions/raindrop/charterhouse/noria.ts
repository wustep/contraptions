import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { clamp, disc, easeIn, mix, part, poly, rect, rgba, smooth, timber, turn, type Brush } from './brush'
import { GULLY, NORIA, SLING } from './geo'
import { at } from './music'
import { rainAt, stormAt, tones } from './look'

/**
 * The wheel in the gully: a timber wheel with clay pots lashed round its rim, turned by the torrent, every pot
 * scooping at the bottom and spilling at the top. The second crescendo is its climb: the chute drops the ball into
 * the lowest pot on bar 51, and the wheel, quickening as the torrent swells, carries it up the west side to the
 * top, where it spills into the spoon of a sling on the frame over the gully. The wheel's pots have been filling
 * the sling's counterweight all along; on the fortissimo's downbeat (bar 56) the latch gives, the counterweight
 * falls, and the ball goes over the gully to the gate.
 */

/** The ball boards the lowest pot on bar 51 and is at the top, spilling, a little before bar 56. */
export const BOARD = at(51, 0)
export const SPILL = at(55, 3)
export const FIRE = at(56, 0)
/** The pot the ball rides, its angle (radians, y down: π/2 is the bottom) at boarding and at the top. */
const BOARD_ANGLE = (143 / 180) * Math.PI
const TOP_ANGLE = (3 / 2) * Math.PI

/** The wheel's turn, radians, so pot 0 is at BOARD_ANGLE at BOARD and at the top at SPILL; quickening between. */
export function wheelAngle(t: number): number {
  const T = SPILL - BOARD
  const span = TOP_ANGLE - BOARD_ANGLE
  // ω goes from w0 to w1 across the climb; its integral over T must be `span`.
  const w0 = 0.12
  const w1 = (2 * span) / T - w0
  if (t <= BOARD) return BOARD_ANGLE + w0 * (t - BOARD)
  if (t <= SPILL) {
    const u = t - BOARD
    return BOARD_ANGLE + w0 * u + ((w1 - w0) * u * u) / (2 * T)
  }
  return TOP_ANGLE + w1 * (t - SPILL)
}

/** Pot `k`'s mouth on the rim at `t`. */
export function potAt(k: number, t: number): Pt {
  const a = wheelAngle(t) + (k * Math.PI * 2) / NORIA.pots
  return [NORIA.x + Math.cos(a) * NORIA.r, NORIA.y + Math.sin(a) * NORIA.r]
}

/** The ball in pot 0, riding up. */
export function inPot(t: number): Pt {
  const [x, y] = potAt(0, t)
  const a = wheelAngle(t)
  // In the pot's mouth: a little outside the rim, pots being lashed on the rim's outer face.
  return [x + Math.cos(a) * 0.35, y + Math.sin(a) * 0.35 - R * 0.6]
}

/* ------------------------------------------------------------------ the sling */

/** The sling's arm: where its long end (the spoon) points, radians. Resting west and a little up; then thrown. */
const REST = Math.PI + 0.18
const STOP = Math.PI * 1.62
export const RELEASE = REST + 0.46
export function slingAngle(t: number): number {
  // The latch strains as the counterweight fills; on the downbeat it goes, over in a fifth of a second.
  if (t < FIRE) return REST - 0.03 * smooth(t, SPILL - 3, FIRE) - 0.012 * Math.sin(t * 9) * smooth(t, SPILL - 2, FIRE)
  const u = clamp((t - FIRE) / 0.2)
  const a = REST + (STOP - REST) * easeIn(u)
  return t > FIRE + 0.2 ? STOP - 0.06 * Math.exp(-(t - FIRE - 0.2) * 6) * Math.abs(Math.sin((t - FIRE - 0.2) * 20)) : a
}
/** The time the spoon passes the release angle: the ball goes. */
export const LET_GO = FIRE + 0.2 * Math.sqrt((RELEASE - REST) / (STOP - REST))

/** The spoon's bowl at `t`. */
export function spoonAt(t: number): Pt {
  const a = slingAngle(t)
  return [SLING.pivot[0] + Math.cos(a) * SLING.long, SLING.pivot[1] + Math.sin(a) * SLING.long - R - 0.1]
}

/** How full the counterweight's bucket is. */
const weightFull = (t: number): number => clamp(0.15 + smooth(t, BOARD - 6, FIRE) * 0.85) * (1 - smooth(t, FIRE + 0.4, FIRE + 3))

export function drawNoria(b: Brush, t: number): void {
  const c = tones(t)
  const { x, y, r, pots } = NORIA
  const a = wheelAngle(t)
  // Wet timber holds a little of the sky: lighter than the rock behind it.
  const wood = mix(mix(c.wood, c.plaster, 0.3), c.skyLow, 0.15)
  const ink = c.ink
  const g = b.g
  // The axle's trestle, from the gully's two walls.
  timber(b, x, y, x - 8.6, y - 3.5, mix(wood, ink, 0.3), ink, 0.32)
  timber(b, x, y, x + 8.2, y - 2.6, mix(wood, ink, 0.3), ink, 0.32)
  // The rim: two rings, and the spokes between them and the hub; a line of ink round each.
  const ring = (rr: number, w: number) => {
    g.lineWidth = w + 0.07
    g.strokeStyle = ink
    g.beginPath()
    g.arc(x, y, rr, 0, Math.PI * 2)
    g.stroke()
    g.lineWidth = w
    g.strokeStyle = wood
    g.stroke()
  }
  for (let k = 0; k < 8; k++) {
    const s = a + (k * Math.PI) / 4
    timber(b, x + Math.cos(s) * 0.6, y + Math.sin(s) * 0.6, x + Math.cos(s) * (r - 0.1), y + Math.sin(s) * (r - 0.1), mix(wood, ink, 0.12), ink, 0.15)
  }
  ring(r, 0.26)
  ring(r - 0.55, 0.14)
  disc(b, x, y, 0.8, ink)
  disc(b, x, y, 0.72, mix(wood, ink, 0.25))
  disc(b, x, y, 0.22, c.iron)
  // The pots: clay jars lashed to the rim, mouths leading, each full on the way up, empty on the way down.
  const clay = mix(mix(c.tile, c.stone, 0.15), c.plaster, 0.12)
  for (let k = 0; k < pots; k++) {
    const s = a + (k * Math.PI * 2) / pots
    const px = x + Math.cos(s) * (r + 0.3)
    const py = y + Math.sin(s) * (r + 0.3)
    // The jar's axis lies along the rim; its mouth leads, so it scoops at the bottom and spills past the top.
    const jar = turn([[-0.55, -0.32], [0.35, -0.38], [0.6, -0.22], [0.6, 0.22], [0.35, 0.38], [-0.55, 0.32]], s + Math.PI / 2, 0, 0, px, py)
    part(b, jar, clay, ink, 0.035)
    const mouth = turn([[0.6, -0.24], [0.68, -0.24], [0.68, 0.24], [0.6, 0.24]], s + Math.PI / 2, 0, 0, px, py)
    poly(b, mouth, mix(clay, c.ink, 0.35))
    // Spilling at the top: a short fall of water out of the mouth.
    const side = Math.sin(s)
    const cos = Math.cos(s)
    if (side < -0.82 && cos > -0.1) {
      const m = mouth[1]
      g.fillStyle = rgba(mix(c.waterLight, c.rain, 0.35), 0.5)
      g.fillRect(m[0] - 0.06, m[1], 0.12, 1.2 + clamp(stormAt(t)) * 0.8)
    }
  }
  // The torrent breaking on the paddles at the bottom.
  const s = clamp(stormAt(t) * 0.7 + rainAt(t) * 0.5)
  g.fillStyle = rgba(mix(c.waterLight, c.rain, 0.5), 0.3 + 0.3 * s)
  for (let k = 0; k < 5; k++) {
    const u = (t * 1.3 + k * 0.21) % 1
    g.beginPath()
    g.ellipse(x - 2 + k * 1.1 + u * 0.5, GULLY.bed - 2.6 - s * 0.6, 0.6 + u * 0.7, 0.18, 0, 0, Math.PI * 2)
    g.fill()
  }
}

/** The sling's frame over the gully, its arm, its spoon and its counterweight. In front of the wheel. */
export function drawSling(b: Brush, t: number): void {
  const c = tones(t)
  const [px, py] = SLING.pivot
  const ink = c.ink
  const wood = mix(mix(c.wood, c.plaster, 0.28), c.skyLow, 0.12)
  // The frame: legs down to the gully's east wall, a cross-tree.
  timber(b, px, py, px + 2.4, py + 7.2, mix(wood, ink, 0.3), ink, 0.26)
  timber(b, px, py, px + 4.6, py + 4.6, mix(wood, ink, 0.3), ink, 0.26)
  timber(b, px + 1.2, py + 3.6, px + 3.6, py + 3.6, mix(wood, ink, 0.35), ink, 0.18)
  // The stop the arm is thrown against: a post with a pad of rope.
  const stop = [px + Math.cos(STOP) * 2.2, py + Math.sin(STOP) * 2.2]
  timber(b, px + 0.25, py + 0.1, stop[0] + 0.25, stop[1] + 0.1, mix(wood, ink, 0.3), ink, 0.16)
  // The arm.
  const a = slingAngle(t)
  const tip: Pt = [px + Math.cos(a) * SLING.long, py + Math.sin(a) * SLING.long]
  const tail: Pt = [px - Math.cos(a) * SLING.short, py - Math.sin(a) * SLING.short]
  // The counterweight: a bucket hung from the short arm, filling from the wheel's spill.
  const bx = tail[0]
  const by = tail[1] + 0.45
  timber(b, tail[0], tail[1], bx, by, c.iron, ink, 0.05)
  part(b, [[bx - 0.62, by], [bx + 0.62, by], [bx + 0.5, by + 1.25], [bx - 0.5, by + 1.25]], mix(wood, ink, 0.25), ink, 0.04)
  const f = weightFull(t)
  if (f > 0.02) rect(b, bx - 0.5, by + 1.2 - 1.05 * f, bx + 0.5, by + 1.2, mix(c.water, c.glass, 0.25))
  for (const hy of [0.25, 0.95]) rect(b, bx - 0.6 + hy * 0.1, by + hy, bx + 0.6 - hy * 0.1, by + hy + 0.08, c.iron)
  timber(b, tail[0], tail[1], tip[0], tip[1], wood, ink, 0.26, 'round')
  // The spoon: a shallow cup at the tip.
  const cup = turn([[-0.45, 0], [0.45, 0], [0.36, 0.24], [-0.36, 0.24]], a + Math.PI / 2, 0, 0, tip[0], tip[1] - 0.1)
  part(b, cup, mix(wood, ink, 0.2), ink, 0.04)
  disc(b, px, py, 0.2, c.iron)
}

export { rect }
