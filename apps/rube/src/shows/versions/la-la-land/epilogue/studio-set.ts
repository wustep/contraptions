import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp, lerp } from '../../../../../../../src/core/ease'
import { FLOOR, R, type Pt } from '../../../../parts'
import { alpha, frame, hash, knock, lastOf, smooth, type Ctx } from './kit'
import { batten, beam, flat, glow, hexA } from './rig'
import { PAINT } from './worlds'
import {
  ARM, ARM_LEN, ARM_PIVOT, BANK_X, BANKS, BATTEN2_X0, BATTEN2_X1, BATTEN_Y, BLACK, BLAST, BRUTE, BRUTE_OFF, BRUTE_X, BRUTE_Y, BUFFER, CHAIRS, CLAPS, CRANK, DIM,
  DOOR, DOOR_TOP, FAN_ON, FAN_R, FAN_X, FAN_Y, FLASHES, FLAT1_X0, FLAT1_X1, FLAT_TOP, GATE_L, GATE_LEN, GATE_R, GATE_TOP, GUSTS, LIGHTS, OUT_DOOR, PANEL0, PANEL_GAP,
  PANEL_W, PLAT_BACK0, PLAT_LEN, PLAT_TOP, RAIL_Y, RAIN, RAIN_X0, RAIN_X1, RAIN_Y, RED, SLATES, SPOT, SPOT_X, SPOT_Y, TAIL, TRACK0, TRACK1, UNISON, WALL_IN, WALL_OUT,
  WALL_T, WINCH_X, dollyDip, dollyRun, gateDrop, heroAt, miaAt, panelRock, rampAngle,
} from './studio-motion'

/**
 * The studio, drawn: the gate, the stage cut open with its two roller doors,
 * the first bay (a day flat, the batten of lamps, the brute, the dolly on its
 * track, the winch, the chairs), the second (the wind machine, the row of
 * night flats, the rain rig). Everything behind the balls in `drawStudio`;
 * the light and the weather over them in `drawStudioOver`.
 */

/** The set is lit from the first beat to the last: dark before, dark after. */
export const lit = (T: number): number => (T < LIGHTS ? 0 : smooth(T, LIGHTS, LIGHTS + 0.08) * (1 - smooth(T, BLACK - 0.07, BLACK)))

/* ------------------------------------------------------------------ mechanisms */

/** The barrier arm: level across the gate, then up on the beat, a small overshoot, settled. Radians up from level. */
function armAngle(T: number): number {
  const a = T - ARM
  if (a <= 0) return 0
  return (Math.PI / 2) * (1 - Math.exp(-a / 0.11) * Math.cos(a * 9))
}

/** A roller door's curtain, 0 down to 1 up: fast up, gathering, a touch of bounce at the top. */
function doorUp(T: number, at: number): number {
  const a = T - at
  if (a <= 0) return 0
  const u = 1 - Math.exp(-a / 0.1) * (1 + a / 0.1)
  return u - 0.02 * Math.exp(-a / 0.3) * Math.sin(a * 12) * smooth(a, 0.2, 0.4)
}

/** The slate's stick: open and waiting, snapped shut on the bar with a chatter, then opening again for the next take. */
function slateOpen(T: number): number {
  const { i, ago } = lastOf(SLATES, T)
  let open: number
  if (i < 0) open = 0.6
  else if (ago < 0.4) open = 0.07 * Math.exp(-ago / 0.08) * Math.abs(Math.sin(ago * 40))
  else if (i === SLATES.length - 1) open = 0
  else open = 0.6 * smooth(ago, 0.4, 1.5)
  // The snap itself: shut in the last twentieth of a second, so the clap lands on the bar.
  const next = SLATES.find((t) => t > T)
  if (next !== undefined && next - T < 0.05) open = Math.min(open, 0.6 * ((next - T) / 0.05))
  return open
}

/** A bank of lamps: dark, struck on its beat, dimmed after the take. */
function bankOn(i: number, T: number): number {
  const on = smooth(T, BANKS[i], BANKS[i] + 0.03)
  return on * (1 - 0.75 * smooth(T, DIM, DIM + 0.35))
}
/**
 * Its beam swings from straight down to ahead, with a little overshoot, once struck; then it holds on the two of
 * them as the dolly carries them along, until the set goes quiet. Radians from vertical, toward +x.
 */
function bankAim(i: number, T: number): number {
  const a = T - BANKS[i]
  if (a <= 0) return -0.15
  const swung = -0.15 + 0.75 * (1 - Math.exp(-a / 0.2) * (1 + a / 0.2)) + 0.1 * Math.exp(-a / 0.3) * Math.sin(a * 8)
  const [hx, hy] = heroAt(Math.min(T, DIM))
  const track = clamp(Math.atan2(hx - BANK_X[i], hy - (BATTEN_Y + 0.2)), -1.05, 1.05)
  return lerp(swung, track, smooth(a, 0.7, 1.6))
}

const bruteOn = (T: number): number => smooth(T, BRUTE, BRUTE + 0.03) * (1 - smooth(T, BRUTE_OFF, BRUTE_OFF + 0.03))
/** Where the brute looks: at where they are as it strikes; then a grip pans it after them until it goes out. */
function bruteTarget(T: number): Pt {
  const a = T - BRUTE
  const struck = heroAt(BRUTE + 0.15)
  if (a <= 0.5) return struck
  const [hx, hy] = heroAt(Math.min(T, BRUTE_OFF))
  const u = smooth(a, 0.5, 1.3)
  return [lerp(struck[0], hx, u), lerp(struck[1], hy, u)]
}

/** The follow spot's target on the floor: hunting from the brute's going out, then a snap onto her. */
function spotTarget(T: number): Pt {
  const her = miaAt(T)
  if (T >= SPOT) return her
  const u = smooth(T, BRUTE_OFF + 0.1, SPOT - 0.12)
  const hunt = lerp(BANK_X[1] + 1.2, her[0] - 0.7, u)
  const snap = clamp((T - (SPOT - 0.12)) / 0.12)
  return [lerp(hunt, her[0], snap), lerp(FLOOR, her[1], snap)]
}
const spotOn = (T: number): number => 0.35 * smooth(T, BRUTE_OFF + 0.1, BRUTE_OFF + 0.4) + 0.65 * smooth(T, SPOT, SPOT + 0.03)

/** A chair's seat: up and waiting; slammed down on its beat and back up; all down together on the unison. Radians up from level. */
function seatAngle(i: number, T: number): number {
  const UP = -1.35
  // Down in the last twentieth of a second so the slap lands on the beat; a chatter after it.
  const slam = (a: number) => (a < 0 ? UP * clamp(-a / 0.05) : 0.12 * Math.exp(-a / 0.07) * Math.abs(Math.sin(a * 45)))
  const c = T - CLAPS[i]
  const u = T - UNISON
  if (u >= -0.05) return slam(u)
  if (c < -0.05) return UP
  if (c < 0.3) return slam(c)
  return UP * smooth(c, 0.3, 0.42)
}

/** The wind: the switch, the blades winding up, the blast, and the steady blow after it. 0..1. */
export function wind(T: number): number {
  const up = 0.12 * smooth(T, FAN_ON + 0.1, BLAST)
  const b = T - BLAST
  if (b <= 0) return up
  return 0.55 + 0.45 * Math.exp(-b / 1.2) * smooth(b, 0, 0.12) + 0.45 * (1 - smooth(b, 0, 0.12)) * 0.4
}
/** The fan's turn: from the switch, faster each moment to the blast, then steady. Radians. */
function fanTurn(T: number): number {
  const a = T - FAN_ON
  if (a <= 0) return 0
  const s = BLAST - FAN_ON
  if (a < s) return 0.5 * 22 * (a * a) / s
  return 0.5 * 22 * s + 22 * (a - s)
}

/** Lightning: a flash on each of the four, decaying fast. */
export function flash(T: number): number {
  let f = 0
  for (const t of FLASHES) {
    const a = T - t
    if (a > 0 && a < 0.5) f += Math.exp(-a / 0.08)
  }
  return Math.min(1, f)
}

/* ------------------------------------------------------------------ behind the balls */

export function drawStudio(p: p5, T: number, c: Ctx): void {
  const { k, ink, weight } = c
  const L = lit(T)
  if (L <= 0) return
  const X = (v: number) => v * k
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.globalAlpha = L

  // The stage floor, from the gate to the far wall.
  outline(p, ink, weight)
  p.line(X(Math.max(-0.5, f.x0)), X(FLOOR), X(Math.min(WALL_OUT + 0.6, f.x1)), X(FLOOR))

  if (f.x0 < WALL_IN + 2) drawGate(p, T, c)
  if (f.x1 > FLAT1_X0 - 1 && f.x0 < FLAT1_X1 + 1) drawBayOne(p, T, c)
  if (f.x1 > TRACK0 - 1 && f.x0 < WINCH_X + 1) drawTrackAndDolly(p, T, c)
  if (f.x1 > FAN_X - 2) drawBayTwo(p, T, c)
  if (f.x0 < WALL_IN + 2) drawWall(p, T, c, WALL_IN, DOOR, true)
  if (f.x1 > WALL_OUT - 2) drawWall(p, T, c, WALL_OUT, OUT_DOOR, false)
  p.pop()
  void X
}

/** The studio gate: two pillars with lamps, an arch, and the barrier arm. */
function drawGate(p: p5, T: number, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // Lamps on the pillars: they blaze as the set comes up.
  for (const x of [GATE_L, GATE_R]) glow(p, c, x, GATE_TOP - 0.12, 0.7, 0.45, PAINT.gold)
  solid(p, ink, weight, PAINT.cream)
  for (const x of [GATE_L, GATE_R]) {
    p.rect(X(x), X((GATE_TOP + FLOOR) / 2), X(0.3), X(FLOOR - GATE_TOP))
    p.rect(X(x), X(GATE_TOP - 0.05), X(0.42), X(0.1))
  }
  // The arch between them, a shallow curve, and its small keystone.
  outline(p, ink, weight * 1.1)
  p.noFill()
  p.arc(X((GATE_L + GATE_R) / 2), X(GATE_TOP + 0.35), X(GATE_R - GATE_L + 0.1), X(1.3), Math.PI + 0.25, Math.PI * 2 - 0.25)
  solid(p, ink, weight * 0.8, PAINT.gold)
  p.rect(X((GATE_L + GATE_R) / 2), X(GATE_TOP - 0.34), X(0.16), X(0.2))
  // The lamp heads.
  solid(p, ink, weight * 0.8, PAINT.gold)
  for (const x of [GATE_L, GATE_R]) p.ellipse(X(x), X(GATE_TOP - 0.16), X(0.18), X(0.14))
  // The barrier arm on its pivot box, up on the beat.
  const a = armAngle(T)
  solid(p, ink, weight, PAINT.timber)
  p.rect(X(ARM_PIVOT[0] + 0.02), X(ARM_PIVOT[1] + 0.05), X(0.2), X(0.3))
  p.push()
  p.translate(X(ARM_PIVOT[0]), X(ARM_PIVOT[1]))
  p.rotate(a)
  solid(p, ink, weight, PAINT.cream)
  p.rect(X(-ARM_LEN / 2), 0, X(ARM_LEN), X(0.09), X(0.02))
  p.noStroke()
  p.fill(PAINT.red)
  p.rect(X(-ARM_LEN + 0.13), 0, X(0.22), X(0.09 - weight / k))
  p.rect(X(-ARM_LEN / 2), 0, X(0.22), X(0.09 - weight / k))
  p.pop()
  solid(p, ink, weight * 0.8, PAINT.cream)
  p.circle(X(ARM_PIVOT[0]), X(ARM_PIVOT[1]), X(0.09))
}

/** A wall of the stage, cut through, with a roller door in it and its drum above; the near one has the red lamp. */
function drawWall(p: p5, T: number, c: Ctx, x: number, at: number, near: boolean): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const top = -9
  solid(p, ink, weight, PAINT.deep)
  // The wall above the door, and the door's jambs.
  p.rect(X(x + WALL_T / 2), X((top + DOOR_TOP - 0.55) / 2), X(WALL_T), X(DOOR_TOP - 0.55 - top))
  // The door's jambs, down to the floor.
  outline(p, ink, weight * 0.8)
  p.line(X(x), X(DOOR_TOP - 0.55), X(x), X(FLOOR))
  p.line(X(x + WALL_T), X(DOOR_TOP - 0.55), X(x + WALL_T), X(FLOOR))
  // The curtain: slats, from the drum down to where its foot is.
  const u = doorUp(T, at)
  const foot = FLOOR + (DOOR_TOP - FLOOR) * u
  if (foot > DOOR_TOP + 0.02) {
    solid(p, ink, weight, PAINT.timber)
    p.rect(X(x + WALL_T / 2), X((DOOR_TOP + foot) / 2), X(WALL_T), X(foot - DOOR_TOP))
    outline(p, ink, weight * 0.5)
    for (let y = DOOR_TOP + 0.18; y < foot - 0.05; y += 0.18) p.line(X(x + 0.03), X(y), X(x + WALL_T - 0.03), X(y))
    outline(p, ink, weight)
    p.line(X(x - 0.02), X(foot), X(x + WALL_T + 0.02), X(foot))
  }
  // The drum in its housing at the top, turning as the curtain winds on.
  solid(p, ink, weight, PAINT.deep)
  p.rect(X(x + WALL_T / 2), X(DOOR_TOP - 0.28), X(WALL_T + 0.34), X(0.56))
  p.push()
  p.translate(X(x + WALL_T / 2), X(DOOR_TOP - 0.28))
  p.rotate(near ? (u * (FLOOR - DOOR_TOP)) / 0.22 : (-u * (FLOOR - DOOR_TOP)) / 0.22)
  solid(p, ink, weight * 0.8, PAINT.timber)
  p.circle(0, 0, X(0.44))
  outline(p, ink, weight * 0.6)
  p.line(X(-0.2), 0, X(0.2), 0)
  p.pop()
  // The lamp over the near door: red once they are rolling.
  if (near) {
    const on = smooth(T, RED, RED + 0.03)
    if (on > 0) glow(p, c, x + WALL_T / 2, DOOR_TOP - 0.85, 0.45, 0.5 * on, PAINT.red)
    solid(p, ink, weight * 0.8, on > 0.5 ? PAINT.red : PAINT.deep)
    p.rect(X(x + WALL_T / 2), X(DOOR_TOP - 0.85), X(0.2), X(0.16), X(0.03))
  }
}

/** The first bay: the day flat, the batten and its three banks, the brute, the follow spot's stand, the chairs. */
function drawBayOne(p: p5, T: number, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  flat(p, c, FLAT1_X0, FLAT_TOP, FLAT1_X1 - FLAT1_X0, FLOOR - FLAT_TOP, PAINT.sea, PAINT.cream)
  // A painted sun, and its painted glow: flat rings of the sky's own paint.
  p.noStroke()
  p.fill(hexA(PAINT.gold, 0.35))
  p.circle(X(8.6), X(-1.7), X(1.7))
  solid(p, ink, weight * 0.7, PAINT.gold)
  p.circle(X(8.6), X(-1.7), X(1.1))
  // The batten and the banks hung from it.
  batten(p, c, FLAT1_X0 + 0.2, FLAT1_X1 - 0.2, BATTEN_Y)
  for (let i = 0; i < BANK_X.length; i++) {
    const on = bankOn(i, T)
    const aim = bankAim(i, T)
    for (const dx of [-0.36, 0, 0.36]) lamp(p, c, BANK_X[i] + dx, BATTEN_Y, aim, on)
  }
  // The brute: a big square head on a stand at the front, aimed up the track.
  const bo = bruteOn(T)
  outline(p, ink, weight)
  p.line(X(BRUTE_X), X(FLOOR), X(BRUTE_X), X(BRUTE_Y + 0.2))
  p.line(X(BRUTE_X - 0.28), X(FLOOR), X(BRUTE_X + 0.28), X(FLOOR))
  p.push()
  p.translate(X(BRUTE_X), X(BRUTE_Y))
  const target = bruteTarget(T)
  p.rotate(Math.atan2(target[1] - BRUTE_Y, target[0] - BRUTE_X))
  solid(p, ink, weight, PAINT.deep)
  p.rect(X(-0.05), 0, X(0.5), X(0.5), X(0.03))
  solid(p, ink, weight * 0.7, bo > 0.5 ? PAINT.beam : PAINT.timber)
  p.rect(X(0.2), 0, X(0.06), X(0.4))
  p.pop()
  if (bo > 0) glow(p, c, BRUTE_X + 0.25, BRUTE_Y, 0.7, 0.45 * bo, PAINT.beam)
  // The follow spot on its tall stand, at the front, its head turned to where it looks.
  const so = spotOn(T)
  outline(p, ink, weight)
  p.line(X(SPOT_X), X(FLOOR), X(SPOT_X), X(SPOT_Y + 0.12))
  p.line(X(SPOT_X - 0.3), X(FLOOR), X(SPOT_X + 0.3), X(FLOOR))
  p.line(X(SPOT_X - 0.16), X(FLOOR - 0.5), X(SPOT_X), X(FLOOR - 0.75))
  const st = spotTarget(T)
  p.push()
  p.translate(X(SPOT_X), X(SPOT_Y))
  p.rotate(Math.atan2(st[1] - SPOT_Y, st[0] - SPOT_X))
  solid(p, ink, weight, PAINT.deep)
  p.rect(X(0.05), 0, X(0.5), X(0.24), X(0.04))
  solid(p, ink, weight * 0.7, so > 0.3 ? PAINT.beam : PAINT.timber)
  p.rect(X(0.3), 0, X(0.05), X(0.2))
  p.pop()
  if (so > 0) glow(p, c, SPOT_X + 0.3, SPOT_Y, 0.5, 0.4 * so, PAINT.beam)
  // Six folding chairs at the flat's foot, behind where the dolly comes to rest.
  for (let i = 0; i < CHAIRS.length; i++) chair(p, c, CHAIRS[i], seatAngle(i, T))
}

/** A lamp hung under a batten: the yoke, the can, aimed `aim` from straight down, lit `on`. */
function lamp(p: p5, c: Ctx, x: number, y: number, aim: number, on: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  outline(p, ink, weight * 0.7)
  p.line(X(x), X(y), X(x), X(y + 0.18))
  p.push()
  p.translate(X(x), X(y + 0.2))
  p.rotate(-aim)
  solid(p, ink, weight * 0.8, PAINT.deep)
  p.quad(X(-0.1), 0, X(0.1), 0, X(0.15), X(0.32), X(-0.15), X(0.32))
  p.noStroke()
  p.fill(on > 0.02 ? hexA(PAINT.beam, 0.25 + 0.75 * on) : PAINT.timber)
  p.rect(0, X(0.3), X(0.26), X(0.05))
  p.pop()
  if (on > 0.02) glow(p, c, x + Math.sin(aim) * 0.32, y + 0.2 + Math.cos(aim) * 0.32, 0.4, 0.35 * on, PAINT.beam)
}

/** A folding chair, its seat hinged at the back: `angle` up from level. */
function chair(p: p5, c: Ctx, x: number, angle: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const seat = -0.42
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.7)
  p.noFill()
  p.line(X(x - 0.15), X(FLOOR), X(x + 0.13), X(seat))
  p.line(X(x + 0.15), X(FLOOR), X(x - 0.13), X(seat))
  p.line(X(x - 0.13), X(seat), X(x - 0.15), X(seat - 0.4))
  p.push()
  p.translate(X(x - 0.15), X(seat))
  p.rotate(angle)
  solid(p, ink, weight * 0.7, PAINT.timber)
  p.rect(X(0.17), X(-0.03), X(0.34), X(0.06), X(0.01))
  p.pop()
}

/** The track with its joints, the dolly (platform, tail ramp, front gate, the camera, the slate), the cable and the winch. */
function drawTrackAndDolly(p: p5, T: number, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // Sleepers and the rail, in sections that meet at the joints the wheels drop.
  const run = dollyRun(T)
  const dip = dollyDip(T)
  outline(p, ink, weight * 0.6)
  for (let x = TRACK0 + 0.2; x < TRACK1; x += 0.56) p.line(X(x), X(RAIL_Y), X(x), X(FLOOR))
  outline(p, ink, weight)
  const joints: number[] = []
  for (let x = TRACK0; x < TRACK1 - 0.05; x += 0.5623) joints.push(x)
  p.line(X(TRACK0), X(RAIL_Y), X(TRACK1), X(RAIL_Y))
  outline(p, ink, weight * 0.6)
  for (const x of joints) p.line(X(x), X(RAIL_Y - 0.03), X(x), X(RAIL_Y + 0.03))
  // The buffer at the end.
  solid(p, ink, weight, PAINT.red)
  p.rect(X(TRACK1 + 0.05), X(RAIL_Y - 0.15), X(0.1), X(0.3), X(0.02))
  // The winch: a drum on a frame, the crank on it, and the cable to the dolly's front.
  const drum: Pt = [WINCH_X, -0.32]
  outline(p, ink, weight)
  p.line(X(drum[0] - 0.2), X(FLOOR), X(drum[0]), X(drum[1]))
  p.line(X(drum[0] + 0.2), X(FLOOR), X(drum[0]), X(drum[1]))
  const turn = run / 0.2
  p.push()
  p.translate(X(drum[0]), X(drum[1]))
  p.rotate(turn)
  solid(p, ink, weight * 0.8, PAINT.timber)
  p.circle(0, 0, X(0.4))
  outline(p, ink, weight)
  p.line(0, 0, X(0.3), 0)
  p.line(X(0.3), 0, X(0.3), X(-0.12))
  p.pop()
  // The pawl clacks on the take-up.
  const clack = knock(T - CRANK, 0.12)
  outline(p, ink, weight)
  p.line(X(drum[0] + 0.24), X(drum[1] - 0.28 + clack * 0.06), X(drum[0] + 0.1), X(drum[1] - 0.17 + clack * 0.03))
  solid(p, ink, weight * 0.8, PAINT.cream)
  p.circle(X(drum[0]), X(drum[1]), X(0.08))
  // The dolly.
  const back = PLAT_BACK0 + run
  const front = back + PLAT_LEN
  outline(p, ink, weight * 0.6)
  p.line(X(front), X(PLAT_TOP + 0.06 + dip), X(drum[0] - 0.02), X(drum[1] - 0.2))
  p.push()
  p.translate(0, X(dip))
  // The wheels on the rail.
  for (const u of [0.25, PLAT_LEN - 0.25]) {
    solid(p, ink, weight, ink)
    p.circle(X(back + u), X(RAIL_Y - 0.1), X(0.2))
    solid(p, ink, weight * 0.6, PAINT.cream)
    p.circle(X(back + u), X(RAIL_Y - 0.1), X(0.1))
  }
  // The platform, and the tail ramp hinged at its back.
  solid(p, ink, weight, PAINT.timber)
  p.rect(X(back + PLAT_LEN / 2), X(PLAT_TOP + 0.04), X(PLAT_LEN), X(0.08))
  p.quad(X(back - TAIL), X(FLOOR - 0.01), X(back), X(PLAT_TOP), X(back), X(PLAT_TOP + 0.08), X(back - TAIL + 0.08), X(FLOOR + 0.03))
  // The front gate: a low rail of a gate, up; dropped, it lies as the ramp off.
  const drop = gateDrop(T)
  p.push()
  p.translate(X(front), X(PLAT_TOP))
  p.rotate(-Math.PI / 2 + (Math.PI / 2 + rampAngle()) * drop)
  solid(p, ink, weight, PAINT.timber)
  p.rect(X(GATE_LEN / 2), 0, X(GATE_LEN), X(0.06))
  outline(p, ink, weight * 0.7)
  p.line(X(0.05), X(-0.05), X(GATE_LEN - 0.05), X(-0.05))
  p.line(X(0.05), X(-0.05), X(0.05), X(0.05))
  p.line(X(GATE_LEN - 0.05), X(-0.05), X(GATE_LEN - 0.05), X(0.05))
  p.pop()
  // The camera at the back: a head on a post, the box, the lens forward, the magazine's two rolls turning while it runs.
  const cx = back + 0.55
  outline(p, ink, weight)
  p.line(X(cx), X(PLAT_TOP), X(cx), X(-0.56))
  p.line(X(cx - 0.18), X(PLAT_TOP), X(cx + 0.18), X(PLAT_TOP))
  solid(p, ink, weight, PAINT.deep)
  p.rect(X(cx), X(-0.74), X(0.5), X(0.36), X(0.03))
  p.rect(X(cx + 0.35), X(-0.72), X(0.22), X(0.14))
  const rolling = T > SLATES[0] && T < BUFFER
  const spin = rolling ? (T - SLATES[0]) * 2.2 : T < BUFFER ? 0 : (BUFFER - SLATES[0]) * 2.2
  for (const dx of [-0.13, 0.15]) {
    p.push()
    p.translate(X(cx + dx), X(-1.06))
    p.rotate(spin)
    solid(p, ink, weight * 0.8, PAINT.deep)
    p.circle(0, 0, X(0.3))
    outline(p, ink, weight * 0.5)
    p.line(X(-0.1), 0, X(0.1), 0)
    p.pop()
  }
  // The slate at the front, on its stick: the board, and the stick that snaps.
  const sx = front - 0.22
  outline(p, ink, weight)
  p.line(X(sx), X(PLAT_TOP), X(sx), X(-0.82))
  solid(p, ink, weight, PAINT.deep)
  p.rect(X(sx), X(-0.98), X(0.46), X(0.3), X(0.02))
  const open = slateOpen(T)
  p.push()
  p.translate(X(sx - 0.23), X(-1.13))
  p.rotate(-open)
  solid(p, ink, weight, PAINT.deep)
  p.rect(X(0.23), X(-0.04), X(0.46), X(0.08))
  p.noStroke()
  p.fill(PAINT.cream)
  for (const u of [0.06, 0.2, 0.34]) p.rect(X(u + 0.05), X(-0.04), X(0.08), X(0.08 - weight / k))
  p.pop()
  p.pop()
}

/** The second bay: the wind machine, the row of night flats, the rain rig, the batten. */
function drawBayTwo(p: p5, T: number, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  batten(p, c, BATTEN2_X0, BATTEN2_X1, BATTEN_Y)
  // The flats, each rocking on its foot as the gust reaches it; lightning over the row.
  const h = FLOOR - FLAT_TOP
  for (let i = 0; i < GUSTS.length; i++) {
    const x0 = PANEL0 + i * (PANEL_W + PANEL_GAP)
    p.push()
    p.translate(X(x0 + PANEL_W / 2), X(FLOOR))
    p.rotate(panelRock(i, T))
    flat(p, c, -PANEL_W / 2, -h, PANEL_W, h, PAINT.violet, PAINT.sea)
    p.pop()
  }
  const fl = flash(T)
  if (fl > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = hexA(PAINT.beam, 0.6 * fl)
    ctx.fillRect(X(PANEL0 - 0.1), X(FLAT_TOP - 0.1), X(GUSTS.length * (PANEL_W + PANEL_GAP) + 0.1), X(h + 0.1))
    ctx.restore()
  }
  // The rain rig: a pipe with its nozzles, hung under the batten.
  outline(p, ink, weight * 0.9)
  p.line(X(RAIN_X0), X(RAIN_Y), X(RAIN_X1), X(RAIN_Y))
  for (const x of [RAIN_X0 + 0.3, RAIN_X1 - 0.3]) p.line(X(x), X(RAIN_Y), X(x), X(BATTEN_Y))
  for (let x = RAIN_X0 + 0.21; x < RAIN_X1; x += 0.42) p.line(X(x), X(RAIN_Y), X(x), X(RAIN_Y + 0.08))
  // The wind machine: a big fan in a ring on a stand, its blades a blur once it is going.
  outline(p, ink, weight)
  p.line(X(FAN_X), X(FLOOR), X(FAN_X), X(FAN_Y + FAN_R - 0.1))
  p.line(X(FAN_X - 0.4), X(FLOOR), X(FAN_X + 0.4), X(FLOOR))
  p.line(X(FAN_X - 0.25), X(FLOOR - 0.6), X(FAN_X), X(FLOOR - 0.95))
  solid(p, ink, weight, PAINT.deep)
  p.circle(X(FAN_X), X(FAN_Y), X(FAN_R * 2))
  const turn = fanTurn(T)
  const w = wind(T)
  p.push()
  p.translate(X(FAN_X), X(FAN_Y))
  p.rotate(turn)
  // Four blades, seen face on: paddles from the hub; faster, they smear into a disc.
  const blur = clamp(w / 0.3)
  solid(p, ink, weight * (1 - 0.5 * blur), PAINT.timber)
  for (let i = 0; i < 4; i++) {
    p.push()
    p.rotate((i * Math.PI) / 2)
    p.beginShape()
    p.vertex(X(0.1), X(-0.06))
    p.vertex(X(FAN_R - 0.12), X(-0.22))
    p.vertex(X(FAN_R - 0.06), X(0.05))
    p.vertex(X(0.1), X(0.1))
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.pop()
  if (blur > 0) {
    p.noStroke()
    p.fill(hexA(PAINT.timber, 0.45 * blur))
    p.circle(X(FAN_X), X(FAN_Y), X((FAN_R - 0.08) * 2))
  }
  outline(p, ink, weight * 1.2)
  p.noFill()
  p.circle(X(FAN_X), X(FAN_Y), X(FAN_R * 2))
  solid(p, ink, weight, PAINT.cream)
  p.circle(X(FAN_X), X(FAN_Y), X(0.18))
  // The switch box on the stand: its lever thrown on the beat.
  const thrown = smooth(T, FAN_ON - 0.06, FAN_ON)
  solid(p, ink, weight * 0.8, PAINT.deep)
  p.rect(X(FAN_X + 0.02), X(FLOOR - 0.32), X(0.14), X(0.2), X(0.02))
  outline(p, ink, weight)
  p.line(X(FAN_X + 0.02), X(FLOOR - 0.32), X(FAN_X + 0.02 + 0.16 * (1 - thrown)), X(FLOOR - 0.32 - 0.16 * thrown - 0.06 * (1 - thrown)))
}

/* ------------------------------------------------------------------ over the balls */

export function drawStudioOver(p: p5, T: number, c: Ctx): void {
  const { k } = c
  const L = lit(T)
  if (L <= 0) return
  const X = (v: number) => v * k
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.globalAlpha = L
  // The banks' beams, swung onto the set.
  if (f.x1 > FLAT1_X0 - 1 && f.x0 < FLAT1_X1 + 2) {
    for (let i = 0; i < BANK_X.length; i++) {
      const on = bankOn(i, T)
      if (on <= 0) continue
      const aim = bankAim(i, T)
      for (const dx of [-0.36, 0, 0.36]) {
        const x = BANK_X[i] + dx
        const y = BATTEN_Y + 0.2
        const len = FLOOR - y
        beam(p, c, [x + Math.sin(aim) * 0.32, y + Math.cos(aim) * 0.32], [x + Math.tan(aim) * len, FLOOR], 1.1, 0.14 * on)
      }
    }
    const bo = bruteOn(T)
    if (bo > 0) beam(p, c, [BRUTE_X + 0.25, BRUTE_Y], bruteTarget(T), 0.9, 0.3 * bo)
  }
  // The follow spot: its beam, and the pool of light on her.
  const so = spotOn(T)
  if (so > 0) {
    const st = spotTarget(T)
    beam(p, c, [SPOT_X + 0.3, SPOT_Y], st, 0.6 + 0.2 * (1 - so), 0.34 * so)
    if (T >= SPOT) glow(p, c, st[0], st[1], 0.42, 0.5 * smooth(T, SPOT, SPOT + 0.04), PAINT.beam)
  }
  // The wind: streaks from the fan, running down the bay.
  const w = wind(T)
  if (w > 0.02 && f.x1 > FAN_X) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    p.strokeWeight(c.weight * 0.6)
    const L2 = WALL_OUT - FAN_X - 0.6
    const v = 6 + 5 * w
    for (let i = 0; i < 12; i++) {
      const phase = (((T - FAN_ON) * v * (0.85 + 0.3 * hash(i, 6)) + hash(i, 3) * L2) % L2 + L2) % L2
      const x = FAN_X + 0.75 + phase
      const y = FAN_Y + (hash(i, 4) - 0.5) * 1.5 + 0.09 * (x - FAN_X)
      const len = (0.6 + 1.1 * w) * (0.7 + 0.6 * hash(i, 5))
      const fade = smooth(phase, 0, 0.6) * (1 - smooth(phase, L2 - 1.5, L2))
      p.stroke(alpha(p, PAINT.cream, 0.5 * w * fade))
      p.line(X(x), X(y), X(x + len), X(y + 0.09 * len))
    }
    ctx.restore()
  }
  // The rain, let down from the pipe and slanted by the wind.
  const ra = T - RAIN
  if (ra > 0 && f.x1 > RAIN_X0 - 1) {
    const drop = FLOOR - RAIN_Y
    const front = Math.min(drop, ra * 5.5)
    p.strokeWeight(c.weight * 0.55)
    p.stroke(alpha(p, PAINT.beam, 0.55))
    const slant = 0.35 * w
    let n = 0
    for (let x = RAIN_X0 + 0.21; x < RAIN_X1; x += 0.42, n++) {
      for (let j = 0; j < 3; j++) {
        const d = (((ra * 5.5 + hash(n, j + 11) * drop) % drop) + drop) % drop
        if (d > front) continue
        const y = RAIN_Y + d
        p.line(X(x + slant * d), X(y), X(x + slant * (d + 0.16)), X(y + 0.16))
      }
    }
  }
  p.pop()
  void R
}
