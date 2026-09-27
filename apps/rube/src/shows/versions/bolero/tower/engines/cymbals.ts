import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, type PieceCtx } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, bar } from '../music'
import { BRASS, GOLD, INK, IRON, clamp, deep, pale, ring, smooth } from '../look'

/**
 * Storey 8, the first tutti: a pair of crash cymbals, clashed on every downbeat (the strings' low pluck).
 *
 * Each plate is bolted to the head of a lazy-tongs arm (the scissor arm), hung from a hanger out toward the storey's
 * side: its upper pins run level, and when its base's lower pin is hauled up its slot the X's flatten and the arm
 * shoots in toward the mast. The haul is a wire along the ceiling, over a sheave at the mast top, down to a crosshead
 * riding under a cam on the mast; the cam turns once a bar, its lobe pushing the crosshead down through the last beat
 * so both arms reach in together and the plates meet in front of the mast on the downbeat. Then the lobe's cliff lets
 * go, and the arms' own spring throws them out past open and brings them back, slowly, to wait. The plates shiver.
 *
 * Until it is let in, a latch holds the crosshead up (the arms open) and the cam still; the latch swings clear as it
 * is let in and the cam takes up its turn.
 */

// Cells. x from the mast, y down from the box's top (just under the ceiling).
/** A scissor bar, pin to pin; the X's in each arm. */
const L = 0.9
const N = 5
/** How tall the arms stand open (their X's steep) and shut (reaching in). */
const H_OPEN = 0.86
const H_SHUT = 0.66
const W_OPEN = Math.sqrt(L * L - H_OPEN * H_OPEN)
const W_SHUT = Math.sqrt(L * L - H_SHUT * H_SHUT)
/** The arms' upper pins' line, which stays level; the plates' middle; half a plate. */
const TOP = 0.56
const MID = 0.98
const PLATE = 0.5
/** A plate's bow, its metal, its bell, and from its rim to the head it is bolted to. */
const SAG = 0.07
const THICK = 0.085
const RIM = 0.012
const BELL_R = 0.15
const BELL_H = 0.075
const BOSS = 0.05
const TO_HEAD = SAG + THICK + RIM + BELL_H + BOSS + 0.03
/** Where each arm's base hangs: far enough out that, shut, the plates' rims meet at the mast. */
const BASE = TO_HEAD + N * W_SHUT
/** The wires' run under the ceiling; the sheaves. */
const WIRE = 0.08
const SHEAVE_X = 0.3
const SHEAVE_R = 0.06
const PULLEY_R = 0.07
/** The cam on the mast: its middle, its base circle, its lobe's rise; the crosshead's roller. */
const CAM_Y = 0.2
const CAM_R = 0.1
const CAM_LIFT = 0.1
const ROLLER = 0.04
/** The lobe rises over the last quarter bar or so before the downbeat. */
const RAMP = 0.26
/** The collapse's downbeat: the last clash, and the cam coasts to a stop. */
const END = bar(339)

/** The cam's turn in bars (the clash where it is whole): still, held, until let in; then a bar a bar. */
function phase(t: number, since: number): number {
  const drive = (s: number): number => (s <= 0 ? 0 : s < 1 ? s ** 3 - s ** 4 / 2 : s - 0.5)
  // Let in on a downbeat, the cam stands a fifth of a turn past its lobe, so it comes round on the next.
  const rest = 0.5 / BAR
  if (t <= END) return rest + drive(since) / BAR
  return rest + (drive(END - (t - since)) + 0.25 * (1 - Math.exp(-(t - END) / 0.25))) / BAR
}

/** The lobe under the crosshead at `f` of a turn: nothing, then rising faster and faster into the downbeat. */
const lobe = (f: number): number => {
  const u = clamp((f - 1 + RAMP) / RAMP)
  return u * u
}

/** After a clash (`s` seconds ago): thrown out past open at once, then home slowly, with a little swing. */
function release(s: number, amp: number): number {
  if (!Number.isFinite(s) || s < 0) return 0
  const o = 0.3 + 0.12 * amp
  return (1 + o) * Math.exp(-s / 0.06) - o * Math.exp(-s / 0.5) + 0.05 * Math.exp(-s / 0.5) * Math.sin(2 * Math.PI * 1.4 * s)
}

type Pt = [number, number]

/** A flat bar with an ink edge. */
function rod(p: p5, c: PieceCtx, a: Pt, b: Pt, wid: number, fill: string): void {
  const { k, weight } = c
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(wid * k + weight * 1.6)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.stroke(fill)
  p.strokeWeight(Math.max(0.6, wid * k))
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

function pin(p: p5, c: PieceCtx, at: Pt, r = 0.03): void {
  solid(p, INK, c.weight * 0.6, BRASS)
  p.circle(at[0] * c.k, at[1] * c.k, r * 2 * c.k)
}

/** A cymbal seen edge on: its rim line on x = 0, its face dished toward +x (away from its partner), thick at the middle and thin at the rim, the bell and the strap's boss behind. */
function plate(p: p5, c: PieceCtx, fill: string, sag: number): void {
  const { k, weight } = c
  const R = PLATE
  const M = 18
  const v = (y: number): number => Math.max(0, 1 - (y / R) ** 2)
  const face = (y: number): number => sag * v(y)
  const back = (y: number): number => sag * v(y) + THICK * v(y) ** 0.7 + RIM
  solid(p, INK, weight, fill)
  p.beginShape()
  for (let i = 0; i <= M; i++) {
    const y = -R + (2 * R * i) / M
    p.vertex(face(y) * k, y * k)
  }
  for (let i = M; i >= 0; i--) {
    const y = -R + (2 * R * i) / M
    p.vertex(back(y) * k, y * k)
  }
  p.endShape(p.CLOSE)
  // The lathe's line along it.
  outline(p, deep(fill, 0.3), weight * 0.45)
  p.beginShape()
  for (let i = 3; i <= M - 3; i++) {
    const y = -R + (2 * R * i) / M
    p.vertex((face(y) + (back(y) - face(y)) * 0.42) * k, y * k)
  }
  p.endShape()
  // The bell, a dome in the middle of its back.
  const bx = back(0) - (weight * 0.4) / k
  solid(p, INK, weight, fill)
  p.arc(bx * k, 0, BELL_H * 2 * k, BELL_R * 2 * k, -Math.PI / 2, Math.PI / 2, p.CHORD)
  // The strap's boss: a leather pad knotted through the bell.
  solid(p, INK, weight * 0.8, '#6E4B32')
  p.rectMode(p.CORNERS)
  p.rect((bx + BELL_H - 0.012) * k, -0.06 * k, (bx + BELL_H + BOSS) * k, 0.06 * k, 0.015 * k)
}

export const cymbals: Engine = (p, c, _st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const unfold = smooth(e.open, 0.75, 1)
  const y0 = e.box.y0
  const Y = (y: number): number => (y0 + y) * k
  const X = (x: number): number => x * k
  const at = (x: number, y: number): Pt => [x, y0 + y]
  const tint = (hex: string, f = 0.5): string => (e.gold > 0 ? mixHex(hex, GOLD, f * e.gold) : hex)

  // The drive: the cam's turn, the lobe under the crosshead, and the throw after the last clash.
  const P = phase(t, e.since)
  const f = P - Math.floor(P)
  const since = t > END ? t - END : P >= 1 ? f * BAR : Infinity
  const shut = clamp(lobe(f) + release(since, e.amp), -0.6, 1)
  const w = Math.max(0.02, (W_OPEN + shut * (W_SHUT - W_OPEN)) * unfold)
  const h = Math.sqrt(L * L - w * w)
  const hit = Number.isFinite(since) ? since : Infinity
  const loud = 0.6 + 0.4 * e.amp
  const shiver = loud * (0.09 * ring(hit, 6.5, 0.32) + 0.035 * ring(hit, 2.1, 0.8))
  const flutter = 1 + 0.35 * ring(hit, 12, 0.22)
  const fresh = Number.isFinite(hit) ? Math.exp(-hit / 0.22) : 0

  const armFill = tint(e.color)
  const iron = pale(IRON, 0.35)

  // Each arm unfolds from where its hanger meets the ceiling.
  const grow = (side: number, draw: () => void): void => {
    p.push()
    p.translate(X(side * BASE), Y(-0.08))
    p.scale(unfold)
    p.translate(-X(side * BASE), -Y(-0.08))
    draw()
    p.pop()
  }

  // The hangers from the ceiling, each with its pulley, and the wire down its slot to the base's lower pin.
  for (const side of [-1, 1]) {
    const xb = side * BASE
    const px = xb - side * PULLEY_R
    const py = WIRE + PULLEY_R
    grow(side, () => {
      solid(p, INK, weight * 0.8, iron)
      p.rectMode(p.CORNERS)
      p.rect(X(xb - 0.045), Y(-0.08), X(xb + 0.045), Y(TOP + 0.95), 0.02 * k)
      outline(p, INK, weight * 0.5)
      p.line(X(xb), Y(TOP + 0.6), X(xb), Y(TOP + 0.9))
      // The pulley at its head, turning as the wire runs.
      const turn = ((H_OPEN - h) / PULLEY_R) * -side
      solid(p, INK, weight * 0.8, pale(IRON, 0.6))
      p.circle(X(px), Y(py), PULLEY_R * 2 * k)
      outline(p, INK, weight * 0.5)
      for (const a of [turn, turn + Math.PI]) p.line(X(px), Y(py), X(px + Math.cos(a) * PULLEY_R * 0.8), Y(py + Math.sin(a) * PULLEY_R * 0.8))
      pin(p, c, at(px, py), 0.022)
      outline(p, INK, weight * 0.55)
      p.line(X(xb), Y(py), X(xb), Y(TOP + h))
    })
    // The wire in along the ceiling to the mast, run out as the arm unfolds.
    outline(p, INK, weight * 0.55)
    const from = side * SHEAVE_X
    p.line(X(from), Y(WIRE), X(from + (px - from) * smooth(unfold, 0.3, 1)), Y(WIRE))
  }

  // The mast's works: a yoke carrying the two sheaves, the cam, the crosshead riding under it.
  p.push()
  p.translate(0, Y(CAM_Y))
  p.scale(unfold)
  p.translate(0, -Y(CAM_Y))
  const ride = CAM_R + CAM_LIFT * clamp(shut, 0, 1)
  const cross = CAM_Y + ride + ROLLER
  const yokeY = WIRE + SHEAVE_R
  solid(p, INK, weight * 0.8, pale(IRON, 0.3))
  p.rectMode(p.CORNERS)
  p.rect(X(-SHEAVE_X - 0.14), Y(yokeY - 0.025), X(SHEAVE_X + 0.14), Y(yokeY + 0.025), 0.02 * k)
  // The latch: an L hung from the yoke, its foot under the crosshead's end until the engine is let in; then swung out.
  const free = smooth(e.on, 0, 0.8)
  const lp: Pt = [SHEAVE_X + 0.11, yokeY]
  const la = Math.PI / 2 - 0.62 * free
  const drop = CAM_Y + CAM_R + 2 * ROLLER + 0.035 - yokeY
  const heel: Pt = [lp[0] + Math.cos(la) * drop, lp[1] + Math.sin(la) * drop]
  const toe: Pt = [heel[0] + Math.cos(la + Math.PI / 2) * 0.15, heel[1] + Math.sin(la + Math.PI / 2) * 0.15]
  rod(p, c, at(lp[0], lp[1]), at(heel[0], heel[1]), 0.032, deep(IRON, 0.05))
  rod(p, c, at(heel[0], heel[1]), at(toe[0], toe[1]), 0.032, deep(IRON, 0.05))
  pin(p, c, at(lp[0], lp[1]), 0.02)
  // The wires from the crosshead's ends up over the sheaves.
  outline(p, INK, weight * 0.55)
  for (const side of [-1, 1]) {
    const ix = side * (SHEAVE_X - SHEAVE_R)
    p.line(X(ix), Y(cross), X(ix), Y(yokeY))
  }
  for (const side of [-1, 1]) {
    const sx = side * SHEAVE_X
    const turn = ((H_OPEN - h) / SHEAVE_R) * side
    solid(p, INK, weight * 0.8, pale(IRON, 0.6))
    p.circle(X(sx), Y(yokeY), SHEAVE_R * 2 * k)
    outline(p, INK, weight * 0.45)
    p.line(X(sx + Math.cos(turn) * SHEAVE_R * 0.8), Y(yokeY + Math.sin(turn) * SHEAVE_R * 0.8), X(sx - Math.cos(turn) * SHEAVE_R * 0.8), Y(yokeY - Math.sin(turn) * SHEAVE_R * 0.8))
    pin(p, c, at(sx, yokeY), 0.02)
  }
  // The crosshead and its roller.
  solid(p, INK, weight, deep(IRON, 0.1))
  p.rect(X(-(SHEAVE_X - SHEAVE_R) - 0.02), Y(cross - 0.028), X(SHEAVE_X - SHEAVE_R + 0.02), Y(cross + 0.028), 0.015 * k)
  solid(p, INK, weight * 0.7, BRASS)
  p.circle(0, Y(cross - ROLLER * 0.2), ROLLER * 2 * k)
  // The cam: a lobe that rises round to the bottom as the downbeat comes, then a cliff.
  p.push()
  p.translate(0, Y(CAM_Y))
  p.rotate(2 * Math.PI * P)
  solid(p, INK, weight, tint(pale(e.color, 0.25)))
  p.beginShape()
  const S = 60
  for (let i = 0; i <= S; i++) {
    const g = Math.min(i / S, 1 - 1e-4)
    const a = Math.PI / 2 - 2 * Math.PI * g
    const r = CAM_R + CAM_LIFT * lobe(g)
    p.vertex(Math.cos(a) * r * k, Math.sin(a) * r * k)
  }
  p.endShape(p.CLOSE)
  solid(p, INK, weight * 0.7, BRASS)
  p.circle(0, 0, 0.07 * k)
  p.pop()
  p.pop()

  // The scissor arms: the rising bars behind, the falling in front, a brass pin at every joint.
  for (const side of [-1, 1]) {
    grow(side, () => {
      const xb = side * BASE
      const dir = -side
      const xs = Array.from({ length: N + 1 }, (_, i) => xb + dir * i * w)
      for (let i = 0; i < N; i++) rod(p, c, at(xs[i], TOP + h), at(xs[i + 1], TOP), 0.075, deep(armFill, 0.15))
      for (let i = 0; i < N; i++) rod(p, c, at(xs[i], TOP), at(xs[i + 1], TOP + h), 0.075, armFill)
      for (let i = 0; i <= N; i++) {
        pin(p, c, at(xs[i], TOP))
        pin(p, c, at(xs[i], TOP + h))
        if (i < N) pin(p, c, at((xs[i] + xs[i + 1]) / 2, TOP + h / 2), 0.026)
      }
      // The head: a slotted block the plate is bolted to.
      const xt = xs[N]
      solid(p, INK, weight, deep(IRON, 0.05))
      p.rectMode(p.CORNERS)
      p.rect(X(xt - 0.035), Y(TOP - 0.06), X(xt + 0.035), Y(TOP + H_OPEN + 0.08), 0.02 * k)
      pin(p, c, at(xt, TOP))
      pin(p, c, at(xt, TOP + h))

      // The plate, on the head's inner side, shivering after each clash.
      p.push()
      p.translate(X(xt), Y(MID))
      p.rotate(side * shiver)
      p.translate(X(dir * TO_HEAD), 0)
      p.scale(side, 1)
      const fill = mixHex(tint(mixHex(BRASS, GOLD, 0.35), 0.3), '#FFF4DC', 0.5 * fresh)
      plate(p, c, fill, SAG * flutter)
      p.pop()
      pin(p, c, at(xt, MID), 0.028)
    })
  }
}
