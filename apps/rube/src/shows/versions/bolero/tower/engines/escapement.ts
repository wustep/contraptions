import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, STROKES, T0, lastIndex } from '../music'
import { BRASS, GOLD, INK, IRON, PAPER, clamp, easeOut, deep, pale, ring, smooth } from '../look'

/**
 * Storey 0, the flute's and the clarinet's: a clockmaker's escapement on the mast, ticking the side drum.
 *
 * Left of the mast, a small pinion on a swing arm sits in the mast's drive chain and turns a brass escape wheel of 24
 * fine teeth, one tooth a stroke, so it goes round once every two bars (as the drum's own pin wheel does). An anchor
 * arched over the wheel rocks from pallet to pallet on every stroke, letting it through a tooth at a time, the
 * triplets as quick triple ticks; its long crutch reaches across the mast to the balance on the right, a thin ring on
 * its own cock, which swings slow and wide, once a bar, and takes a small kick from the crutch at each tick.
 *
 * Before it is let in, a little latch holds the anchor and the pinion is swung clear of the chain; as it is let in
 * the latch lifts, the pinion rolls round into the chain, and the clock starts, its balance gathering its swing over
 * the first bars. It all swings wider as the orchestra grows.
 */

const TEETH = 24
/** The escape wheel: its teeth's tips and roots, and the rim inside them. */
const TIP = 0.165
const ROOT = 0.138
const RIM = 0.112
/** The pinion: its leaves' tips and roots, and how far its middle is from the wheel's. */
const PIN_TIP = 0.06
const PIN_ROOT = 0.042
const MESH = 0.2
/** How far round the swing arm holds the pinion, clear of the chain, before it is let in (radians). */
const SWUNG = 0.9
/** The anchor's arch over the wheel, and how far its pallets reach either side of the top (radians). */
const ARCH = 0.205
const SPAN = 0.78
/** The balance's ring, and how far from its staff the crutch holds its hairspring's stud. */
const BR = 0.205
const STUD = 0.12
/** The chain's step, seconds (as the mast's). */
const STEP = 0.07
/** How long after it is let in the clock is running (the latch up, the pinion in the chain). */
const START = 0.8

const side = (n: number): number => (n % 2 === 0 ? 1 : -1)
const ease = (u: number): number => {
  const v = clamp(u)
  return v * v * (3 - 2 * v)
}

/** Teeth the wheel has been let through since `from`: one a stroke, each eased like the chain's step. */
function ticks(t: number, from: number): number {
  const n = lastIndex(STROKES, t)
  const n0 = lastIndex(STROKES, from)
  if (n <= n0) return 0
  return n - n0 - 1 + ease((t - STROKES[n]) / STEP)
}

/** The anchor's rock, radians (positive tips its right pallet down): over to the other pallet on each stroke, a quick drop and a small damped recoil. */
function anchorAngle(t: number, from: number, a: number): number {
  const n = lastIndex(STROKES, t)
  const n0 = lastIndex(STROKES, from)
  if (n <= n0) return side(n0) * a
  const u = ease((t - STROKES[n]) / 0.05)
  let angle = side(n) * a * (2 * u - 1)
  for (let j = n; j > Math.max(n0, n - 3); j--) angle += side(j) * a * 0.3 * ring(t - STROKES[j] - 0.05, 9, 0.07)
  return angle
}

/** The balance's swing, radians: slow and wide, once a bar, gathered from rest when the clock starts, with a small kick from the crutch on each tick. */
function balanceAngle(t: number, from: number, amp: number): number {
  const s = t - from
  if (s <= 0) return 0
  const env = (1 - Math.exp(-s / 2.2)) * smooth(s, 0, 0.6) * (t > 845 ? Math.exp(-(t - 845) / 0.9) : 1)
  const swing = (0.32 + 0.78 * amp) * Math.sin((2 * Math.PI * (t - T0)) / BAR)
  const n = lastIndex(STROKES, t)
  const n0 = lastIndex(STROKES, from)
  let kick = 0
  for (let j = n; j > Math.max(n0, n - 3); j--) {
    const ago = t - STROKES[j]
    kick -= side(j) * (1 - Math.exp(-ago / 0.015)) * Math.exp(-ago / 0.1)
  }
  return env * swing + (0.05 + 0.06 * amp) * kick
}

/** Polylines drawn as one piece: the ink under all of them first, then the fill, so their joins are clean. */
function limbs(p: p5, k: number, edge: number, w: number, fill: string, lines: [number, number][][]): void {
  p.noFill()
  for (const pass of [0, 1]) {
    p.stroke(pass ? fill : INK)
    p.strokeWeight(w * k + (pass ? 0 : 2 * edge))
    for (const pts of lines) {
      p.beginShape()
      for (const [x, y] of pts) p.vertex(x * k, y * k)
      p.endShape()
    }
  }
}

export const escapement: Engine = (p, c, _st, t, e) => {
  const grow = easeOut(smooth(e.open, 0.75, 1))
  if (grow <= 0) return
  const { k, weight } = c
  const fine = weight * 0.45
  const tint = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)
  const { y0, y1 } = e.box
  const mid = (y0 + y1) / 2
  const at = t - e.since
  const from = at + START

  // Where everything is: the wheel left of the mast with the anchor hung over it, the balance right of it.
  const E = { x: -0.045 - PIN_TIP * 0.55 - MESH, y: y0 + 0.31 }
  const A = { x: E.x, y: E.y - ARCH - 0.04 }
  const B = { x: 0.6, y: mid }

  // What it is doing.
  const lift = smooth(e.on, 0, 0.55)
  const swing = smooth(e.on, 0.2, 0.85)
  const psi = SWUNG * (1 - swing)
  const turned = (ticks(t, from) * 2 * Math.PI) / TEETH
  const alpha = anchorAngle(t, from, 0.075 + 0.05 * e.amp)
  const theta = balanceAngle(t, from, e.amp)

  const brass = tint(BRASS)
  const paleBrass = tint(pale(BRASS, 0.3))
  const steel = tint(pale(IRON, 0.4))
  const leaf = tint(e.color)
  const jewel = tint(deep(e.color, 0.6))

  p.push()
  p.translate(0, mid * k)
  p.scale(grow)
  p.translate(0, -mid * k)

  // The cocks, hung from the ceiling: the balance's, and the anchor's.
  solid(p, INK, fine, steel)
  p.quad((B.x - 0.055) * k, (y0 - 0.06) * k, (B.x + 0.055) * k, (y0 - 0.06) * k, (B.x + 0.014) * k, B.y * k, (B.x - 0.014) * k, B.y * k)
  p.quad((A.x - 0.05) * k, (y0 - 0.06) * k, (A.x + 0.05) * k, (y0 - 0.06) * k, (A.x + 0.014) * k, A.y * k, (A.x - 0.014) * k, A.y * k)

  // The balance: a thin ring on three arms.
  p.push()
  p.translate(B.x * k, B.y * k)
  p.rotate(theta)
  outline(p, INK, weight * 0.5)
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
    p.line(Math.cos(a) * 0.03 * k, Math.sin(a) * 0.03 * k, Math.cos(a) * (BR - 0.01) * k, Math.sin(a) * (BR - 0.01) * k)
  }
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(0.034 * k + 2 * fine)
  p.circle(0, 0, BR * 2 * k)
  p.stroke(leaf)
  p.strokeWeight(0.034 * k)
  p.circle(0, 0, BR * 2 * k)
  // Its timing screws, a pair at each arm, so the swing reads.
  solid(p, INK, fine * 0.8, brass)
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
    for (const d of [-0.2, 0.2]) p.circle(Math.cos(a + d) * (BR + 0.024) * k, Math.sin(a + d) * (BR + 0.024) * k, 0.026 * k)
  }
  p.pop()

  // The pinion on its swing arm (pivoted on the wheel's arbor, behind it), rolled round into the chain as it is let in.
  const P = { x: E.x + Math.cos(psi) * MESH, y: E.y + Math.sin(psi) * MESH }
  const ratio = MESH / (MESH - (PIN_TIP + PIN_ROOT) / 2) - 1
  const pinTurn = (psi - SWUNG) * (1 + ratio) - turned * ratio
  limbs(p, k, fine, 0.03, steel, [[[E.x, E.y], [P.x, P.y]]])
  p.push()
  p.translate(P.x * k, P.y * k)
  p.rotate(pinTurn)
  solid(p, INK, fine, brass)
  p.beginShape()
  const leaves = 8
  for (let i = 0; i < leaves; i++) {
    const a = (i * 2 * Math.PI) / leaves
    const h = Math.PI / leaves
    p.vertex(Math.cos(a - h * 0.5) * PIN_ROOT * k, Math.sin(a - h * 0.5) * PIN_ROOT * k)
    p.vertex(Math.cos(a - h * 0.3) * PIN_TIP * k, Math.sin(a - h * 0.3) * PIN_TIP * k)
    p.vertex(Math.cos(a + h * 0.3) * PIN_TIP * k, Math.sin(a + h * 0.3) * PIN_TIP * k)
    p.vertex(Math.cos(a + h * 0.5) * PIN_ROOT * k, Math.sin(a + h * 0.5) * PIN_ROOT * k)
  }
  p.endShape(p.CLOSE)
  solid(p, INK, fine, steel)
  p.circle(0, 0, 0.024 * k)
  p.pop()

  // The escape wheel: 24 fine teeth leaning the way it turns, on four crossed spokes.
  p.push()
  p.translate(E.x * k, E.y * k)
  p.rotate(turned)
  solid(p, INK, fine, brass)
  p.beginShape()
  const pitch = (2 * Math.PI) / TEETH
  for (let i = 0; i < TEETH; i++) {
    const a = i * pitch
    p.vertex(Math.cos(a) * ROOT * k, Math.sin(a) * ROOT * k)
    p.vertex(Math.cos(a + pitch * 0.72) * TIP * k, Math.sin(a + pitch * 0.72) * TIP * k)
    p.vertex(Math.cos(a + pitch * 0.8) * ROOT * k, Math.sin(a + pitch * 0.8) * ROOT * k)
  }
  p.endShape(p.CLOSE)
  solid(p, INK, fine, PAPER)
  p.circle(0, 0, RIM * 2 * k)
  const spokes: [number, number][][] = []
  for (let i = 0; i < 2; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2
    spokes.push([[-Math.cos(a) * RIM, -Math.sin(a) * RIM], [Math.cos(a) * RIM, Math.sin(a) * RIM]])
  }
  limbs(p, k, fine, 0.024, brass, spokes)
  solid(p, INK, fine, paleBrass)
  p.circle(0, 0, 0.06 * k)
  p.pop()

  // The anchor: an arch over the wheel on its pivot, a pallet hanging from each end into the teeth, and its crutch
  // across the mast to the balance, where it carries the stud of the balance's hairspring: each tick moves the stud,
  // and the spring passes the kick on to the balance, which swings on at its own slow pace.
  const S0 = { x: B.x - STUD - A.x, y: B.y - A.y }
  p.push()
  p.translate(A.x * k, A.y * k)
  p.rotate(alpha)
  const cy = E.y - A.y
  const arch: [number, number][] = []
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 - SPAN + (2 * SPAN * i) / 12
    arch.push([Math.cos(a) * ARCH, cy + Math.sin(a) * ARCH])
  }
  const heel: [number, number] = [Math.sin(SPAN) * ARCH, cy - Math.cos(SPAN) * ARCH]
  limbs(p, k, fine, 0.022, steel, [[heel, [S0.x, S0.y]]])
  limbs(p, k, fine, 0.042, steel, [arch, [[0, 0], [0, cy - ARCH]]])
  const pallets: [number, number][][] = [-1, 1].map((s) => {
    const a = -Math.PI / 2 + s * SPAN
    return [
      [Math.cos(a) * (ARCH - 0.005), cy + Math.sin(a) * (ARCH - 0.005)],
      [Math.cos(a) * (TIP - 0.014), cy + Math.sin(a) * (TIP - 0.014)],
    ]
  })
  limbs(p, k, fine, 0.022, jewel, pallets)
  solid(p, INK, fine, paleBrass)
  p.circle(0, 0, 0.048 * k)
  p.pop()
  // Where the crutch has the stud now, and the hairspring from the balance's collet out to it.
  const S = { x: A.x + S0.x * Math.cos(alpha) - S0.y * Math.sin(alpha), y: A.y + S0.x * Math.sin(alpha) + S0.y * Math.cos(alpha) }
  const r1 = Math.hypot(S.x - B.x, S.y - B.y)
  const a1 = Math.atan2(S.y - B.y, S.x - B.x)
  const sweep = 2 * Math.PI * 0.75 + (((a1 - theta) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  outline(p, deep(IRON, 0.3), fine)
  p.beginShape()
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    const r = 0.028 + (r1 - 0.028) * u
    const a = theta + u * sweep
    p.vertex((B.x + Math.cos(a) * r) * k, (B.y + Math.sin(a) * r) * k)
  }
  p.endShape()
  solid(p, INK, fine * 0.8, jewel)
  p.circle(S.x * k, S.y * k, 0.026 * k)
  solid(p, INK, fine, brass)
  p.circle(B.x * k, B.y * k, 0.045 * k)

  // The latch: a little hooked lever that holds the anchor's arch until the engine is let in, then lifts clear.
  const Lp = { x: A.x - 0.19, y: A.y + 0.012 }
  const la = -0.7 * lift + 0.03
  const lx = Lp.x + Math.cos(la) * 0.12
  const ly = Lp.y + Math.sin(la) * 0.12
  limbs(p, k, fine, 0.02, steel, [
    [
      [Lp.x - Math.cos(la) * 0.045, Lp.y - Math.sin(la) * 0.045],
      [lx, ly],
      [lx + Math.cos(la + 1.4) * 0.03, ly + Math.sin(la + 1.4) * 0.03],
    ],
  ])
  solid(p, INK, fine, paleBrass)
  p.circle(Lp.x * k, Lp.y * k, 0.03 * k)

  p.pop()
}
