import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { KICK, KIT_FLOOR, SNARE, drawStick, type KitPiece } from '../drums'
import type { Ctx } from '../kit'
import { CYMBALS, KICKS, SNARES, level } from '../music'
import { KIT } from '../worlds'
import { NOD_BACK } from './conductor'
import { CHORD_HIT, CUT, F_FLY, F_LEAP, F_SEATED, ROLL, STICKS_UP } from './finale-clock'
import { LIMP, NECK, SHOULDER_AT, ampOf, clampBlock, elbowOf, liftShape, smoother, tube, upSign } from './solo-rig'
import { HOLD, STICK, TARGETS, type Arm, type Grip } from './solo-score'

/**
 * The finale's machine: the drummer's frame from the solo (`solo-rig.ts`, drawn the same way, from the same parts),
 * flown in again for the end. A yoke on two lines from the flies, a cup where his head goes, two long jointed arms
 * with a stick in each grip, a steel shin down behind the snare onto the kick's pedal.
 *
 * It comes down as the metronome goes into the stage; he leaps up into its cup on a big kick and it plays the kick
 * drum's march (the shin every kick, the house's left arm the toms on the loud ones, the right the hi-hat between);
 * the long roll (both sticks on the snare, too fast to count: a blur, nothing struck); the last fill; on the last
 * stroke both sticks come up and are held there, high, through the silence; the band's chord (the crash and the
 * ride together, the kick); a cymbal roll under the held chord; and the cut-off: both sticks down, and stop. It
 * stays there, still, as the hall goes dark.
 *
 * Every pose is a function of show time, in the kit's frame (`drums.ts`), so the lane and the drawing agree.
 */

type Limb = 'left' | 'right' | 'foot'
interface Stroke {
  t: number
  piece: KitPiece
  limb: Limb
  s: number
}

/* ------------------------------------------------------------------ the score */

/** Seconds an arm needs between two strokes: a wrist's rebound, plus the time to carry the stick across. */
function needs(a: Grip | undefined, b: Grip): number {
  if (!a) return 0
  const d = Math.hypot(a.grip[0] - b.grip[0], a.grip[1] - b.grip[1])
  return d < 0.01 ? 0.062 : 0.11 + 0.1 * d
}

/** Who plays which of the recording's strokes, from the moment he is in the cup to the cut-off. */
function assign(): Stroke[] {
  const out: Stroke[] = []
  const last: Record<Arm, { t: number; g?: Grip }> = { left: { t: -Infinity }, right: { t: -Infinity } }
  const can = (arm: Arm, piece: KitPiece, t: number) => t - last[arm].t >= needs(last[arm].g, TARGETS[arm][piece]!)
  const play = (arm: Arm, piece: KitPiece, t: number, s: number) => {
    out.push({ t, piece, limb: arm, s })
    last[arm] = { t, g: TARGETS[arm][piece] }
  }
  // The kick drum's march: the shin on every kick; the loud ones the left arm's toms as well, rack and floor in
  // turn; the right arm the hi-hat on the others.
  let tom: KitPiece = 'floor'
  let lastFoot = -Infinity
  for (const o of KICKS) {
    if (o.t < F_SEATED - 0.01 || o.t > ROLL[0] + 0.02 || o.s < 0.8) continue
    if (o.t - lastFoot >= 0.085) {
      out.push({ t: o.t, piece: 'kick', limb: 'foot', s: o.s })
      lastFoot = o.t
    }
    const next: KitPiece = tom === 'rack' ? 'floor' : 'rack'
    if (o.s >= 1.4 && can('left', next, o.t)) {
      tom = next
      play('left', next, o.t, o.s)
    } else if (can('right', 'hat', o.t)) play('right', 'hat', o.t, o.s)
  }
  // The long roll: the shin on its few kicks; the sticks are a blur on the snare (drawn, not struck).
  for (const o of KICKS) if (o.t > ROLL[0] + 0.3 && o.t < ROLL[1] - 0.1 && o.s >= 0.8) out.push({ t: o.t, piece: 'kick', limb: 'foot', s: o.s })
  // The last fill: the snare the left arm's, the cymbals the right's, down the toms at the end, the kick the shin's.
  const fill = [...KICKS.map((o) => ({ ...o, band: 'kick' })), ...SNARES.map((o) => ({ ...o, band: 'snare' })), ...CYMBALS.map((o) => ({ ...o, band: 'cymbal' }))]
    .filter((o) => o.t > ROLL[1] - 0.02 && o.t < STICKS_UP - 0.05 && o.s >= 0.75)
    .sort((a, b) => a.t - b.t)
  for (const o of fill) {
    if (o.band === 'kick') {
      if (o.t - lastFoot >= 0.085) {
        out.push({ t: o.t, piece: 'kick', limb: 'foot', s: o.s })
        lastFoot = o.t
      }
      continue
    }
    if (o.band === 'cymbal') {
      const piece: KitPiece = o.s >= 1.15 ? 'crash' : 'hat'
      if (can('right', piece, o.t)) play('right', piece, o.t, o.s)
      continue
    }
    // The run down the toms, 540.3 to 541.0: the left arm rack, rack, floor; the right arm the snare between.
    if (o.t > 540.2 && o.t < 541.1) {
      const piece: KitPiece = o.t < 540.55 ? 'rack' : 'floor'
      if (can('left', piece, o.t)) play('left', piece, o.t, o.s)
      else if (can('right', 'snare', o.t)) play('right', 'snare', o.t, o.s)
      continue
    }
    if (can('left', 'snare', o.t)) play('left', 'snare', o.t, o.s)
    else if (can('right', 'snare', o.t)) play('right', 'snare', o.t, o.s)
  }
  // The last stroke before the silence, both hands; the band's chord, crash and ride together and the kick; the
  // cut-off, the crash and the snare and the kick.
  const force = (t: number, list: [Limb, KitPiece][]) => {
    for (const [limb, piece] of list) {
      const i = out.findIndex((s) => s.limb === limb && Math.abs(s.t - t) < 0.02)
      if (i >= 0) out.splice(i, 1)
      out.push({ t, piece, limb, s: 1.8 })
      if (limb !== 'foot') last[limb] = { t, g: TARGETS[limb][piece] }
    }
  }
  force(STICKS_UP, [['left', 'snare'], ['right', 'crash']])
  force(CHORD_HIT, [['left', 'ride'], ['right', 'crash'], ['foot', 'kick']])
  force(CUT, [['left', 'snare'], ['right', 'crash'], ['foot', 'kick']])
  return out.sort((a, b) => a.t - b.t)
}

/** Every stroke the frame plays, in order, with who plays it. */
export const FRAME_STROKES: readonly Stroke[] = assign()
const ARM: Record<Arm, Stroke[]> = { left: FRAME_STROKES.filter((s) => s.limb === 'left'), right: FRAME_STROKES.filter((s) => s.limb === 'right') }
const FOOT = FRAME_STROKES.filter((s) => s.limb === 'foot')

/** The accents his head bounces on: the frame's loudest strokes, a quarter second apart at least. */
const ACCENTS: { t: number; a: number }[] = (() => {
  const order = [...FRAME_STROKES].filter((s) => s.s >= 1.1).sort((a, b) => b.s - a.s)
  const pick: Stroke[] = []
  for (const s of order) if (pick.every((p) => Math.abs(p.t - s.t) >= 0.24)) pick.push(s)
  return pick.sort((a, b) => a.t - b.t).map((s) => ({ t: s.t, a: clamp((s.s - 0.8) / 1.2) }))
})()

/* ------------------------------------------------------------------ the frame */

/** How far above its playing height the frame is: in the flies, then down as the metronome goes, and there to the end. */
export function rigDrop(T: number): number {
  if (T <= F_FLY[0]) return -9
  if (T >= F_FLY[1]) return 0
  const u = (T - F_FLY[0]) / (F_FLY[1] - F_FLY[0])
  return -9 * Math.pow(1 - u, 3)
}
export const rigOut = (T: number): boolean => T <= F_FLY[0]

/** His head's bounce at `T`: down on each accent, up between; thrown back on the chord; held up in the silence. */
function bob(T: number): number {
  let j = 0
  while (j < ACCENTS.length && ACCENTS[j].t <= T) j++
  let v = 0
  if (j > 0 && j < ACCENTS.length) {
    const a = ACCENTS[j - 1]
    const b = ACCENTS[j]
    const gap = b.t - a.t
    if (gap < 1.2) v = -clamp(0.035 + 0.11 * gap, 0.04, 0.12) * (0.55 + 0.45 * b.a) * liftShape((T - a.t) / gap)
  }
  // The silence: up, and held, like a breath.
  const held = smoother((T - STICKS_UP) / 0.35) * (1 - smoother((T - (CHORD_HIT - 0.12)) / 0.12))
  // The chord: thrown back, and slowly down.
  const thrown = T >= CHORD_HIT ? 0.2 * Math.exp(-(T - CHORD_HIT) / 0.5) * clamp((T - CHORD_HIT) / 0.05) : 0
  // His nod back to Fletcher.
  const nod = 0.11 * Math.sin(Math.PI * clamp((T - NOD_BACK[0]) / (NOD_BACK[1] - NOD_BACK[0]))) ** 2
  // The roll: a tremble with it.
  const tremble = T > ROLL[0] && T < ROLL[1] ? 0.012 * Math.sin(T * 47) * level(T) : 0
  return (T < CUT + 0.02 ? v : 0) - 0.09 * held - thrown + nod + tremble
}

/** Awake (1) or limp (0): the arms come up as he leaps for the cup. */
const awake = (T: number): number => smoother((T - (F_LEAP + 0.04)) / (F_SEATED - F_LEAP - 0.08))

/** His head (the ball's centre) in the cup, in the kit's frame. */
export function headAt(T: number): Pt {
  const w = smoother((T - F_SEATED) / 0.3)
  // His answer to Fletcher's nod: the ball tips in the cup toward him (the house's right) as it dips.
  const tip = 0.075 * Math.sin(Math.PI * clamp((T - (NOD_BACK[0] - 0.25)) / (NOD_BACK[1] - NOD_BACK[0] + 0.5))) ** 2
  return [NECK[0] + tip, NECK[1] + bob(T) * w + rigDrop(T)]
}

function shoulder(arm: Arm, T: number): Pt {
  const w = smoother((T - F_SEATED) / 0.3)
  return [NECK[0] + SHOULDER_AT[arm][0], NECK[1] + SHOULDER_AT[arm][1] + bob(T) * 0.35 * w + rigDrop(T)]
}

/* ------------------------------------------------------------------ the arms */

interface ArmPose {
  grip: Pt
  ang: number
  /** Ghost strokes either side of the stick while it is a blur (the roll). */
  blur: number
}

/** An arm playing its strokes: the rebound and the carry to the next, as the solo's frame plays them. */
function playPose(arm: Arm, T: number): Grip {
  const list = ARM[arm]
  let j = 0
  while (j < list.length && list[j].t <= T) j++
  const prev = j > 0 ? list[j - 1] : { ...list[0], t: list[0].t - 0.6, s: 0.6 }
  const next = j < list.length ? list[j] : { ...list[list.length - 1], t: list[list.length - 1].t + 0.6, s: 0.6 }
  const a = TARGETS[arm][prev.piece]!
  const b = TARGETS[arm][next.piece]!
  const gap = next.t - prev.t
  const u = clamp((T - prev.t) / gap)
  const e = smoother((u - 0.12) / 0.76)
  const dist = Math.hypot(b.grip[0] - a.grip[0], b.grip[1] - a.grip[1])
  const amp = ampOf(Math.min(gap, 0.8), next.s)
  const L = liftShape(u)
  const sign = upSign(a.ang) + (upSign(b.ang) - upSign(a.ang)) * e
  return {
    grip: [a.grip[0] + (b.grip[0] - a.grip[0]) * e, a.grip[1] + (b.grip[1] - a.grip[1]) * e - 0.2 * dist * Math.sin(Math.PI * e) - 0.3 * amp * L],
    ang: a.ang + (b.ang - a.ang) * e + sign * 0.72 * amp * L,
  }
}

/** Both sticks up, held high off the last stroke: the drummer waiting for the band. */
const UP: Record<Arm, Grip> = {
  left: { grip: [NECK[0] + SHOULDER_AT.left[0] - 0.55, NECK[1] + SHOULDER_AT.left[1] - 0.55], ang: -Math.PI / 2 - 0.55 },
  right: { grip: [NECK[0] + SHOULDER_AT.right[0] + 0.55, NECK[1] + SHOULDER_AT.right[1] - 0.55], ang: -Math.PI / 2 + 0.55 },
}

const mix = (a: Grip, b: Grip, u: number): Grip => ({ grip: [a.grip[0] + (b.grip[0] - a.grip[0]) * u, a.grip[1] + (b.grip[1] - a.grip[1]) * u], ang: a.ang + (b.ang - a.ang) * u })

/** A stick on `piece` trembling: a roll, `size` its lift, `phase` which hand. */
function trembling(arm: Arm, piece: KitPiece, T: number, size: number, phase: number): Grip {
  const g = TARGETS[arm][piece]!
  const w = 0.5 + 0.5 * Math.sin(2 * Math.PI * 7 * T + phase)
  return { grip: [g.grip[0], g.grip[1] - size * w], ang: g.ang + upSign(g.ang) * 1.6 * size * w }
}

/** An arm's pose at `T`, in the kit's frame. */
function armPose(arm: Arm, T: number): ArmPose {
  const s = shoulder(arm, T)
  const limp: Grip = { grip: [s[0] + LIMP[arm].off[0], s[1] + LIMP[arm].off[1]], ang: LIMP[arm].ang }
  const w = awake(T)
  if (w <= 0) {
    const settle = T > F_FLY[1] - 0.3 ? 0.07 * Math.exp(-(T - F_FLY[1] + 0.3) / 0.5) * Math.sin((T - F_FLY[1] + 0.3) * 6.5) : 0
    return { grip: [limp.grip[0] + settle * 0.5, limp.grip[1]], ang: limp.ang + settle, blur: 0 }
  }
  const drop = rigDrop(T)
  const phase = arm === 'left' ? 0 : Math.PI
  let g: Grip = playPose(arm, T)
  let blur = 0
  // The long roll: both sticks on the snare, a blur, growing with the music.
  const inRoll = smoother((T - ROLL[0]) / 0.25) * (1 - smoother((T - (ROLL[1] - 0.2)) / 0.25))
  if (inRoll > 0) {
    const size = 0.05 + 0.05 * level(T)
    g = mix(g, trembling(arm, 'snare', T, size, phase), inRoll)
    blur = size * inRoll
  }
  // The silence: up off the last stroke and held; down into the chord.
  if (T > STICKS_UP) {
    const up = smoother((T - STICKS_UP - 0.04) / 0.45) * (1 - smoother((T - (CHORD_HIT - 0.16)) / 0.16))
    const hold: Grip = { grip: [UP[arm].grip[0], UP[arm].grip[1] + 0.02 * Math.sin(T * 5 + phase)], ang: UP[arm].ang }
    g = mix(g, hold, up)
  }
  // The held chord: a cymbal roll, the crash and the ride, under it; into the cut-off's last stroke.
  if (T > CHORD_HIT + 0.12 && T < CUT - 0.3) {
    const on = smoother((T - CHORD_HIT - 0.12) / 0.3)
    const piece: KitPiece = arm === 'left' ? 'ride' : 'crash'
    const size = 0.03 + 0.03 * clamp((T - CHORD_HIT) / (CUT - CHORD_HIT))
    g = mix(g, trembling(arm, piece, T, size, phase), on * (1 - smoother((T - (CUT - 0.6)) / 0.3)))
    blur = size * on
  }
  // After the cut-off: still, the sticks where they stopped, the arms settling a little in the dark.
  if (T >= CUT) {
    const at = playPose(arm, CUT)
    const sag = 0.05 * smoother((T - CUT - 2) / 3)
    g = { grip: [at.grip[0], at.grip[1] + sag], ang: at.ang }
    blur = 0
  }
  return {
    grip: [limp.grip[0] + (g.grip[0] - limp.grip[0]) * w, limp.grip[1] + (g.grip[1] + drop - limp.grip[1]) * w],
    ang: limp.ang + (g.ang - limp.ang) * w,
    blur,
  }
}

/* ------------------------------------------------------------------ the foot */

/** How far the pedal's footboard is pressed at `T` (the hall's kit presses it the same way on the same strokes). */
function pedalPress(T: number): number {
  let last = -Infinity
  for (const s of FOOT) {
    if (s.t > T) break
    last = s.t
  }
  const since = T - last
  return since >= 0 && since < 0.4 ? Math.exp(-since / 0.06) : 0
}
const footDown = (T: number): number => smoother((T - (F_SEATED - 0.6)) / 0.7)
function footLift(T: number): number {
  let j = 0
  while (j < FOOT.length && FOOT[j].t <= T) j++
  if (T >= CUT || j === 0 || j === FOOT.length) return 0.02
  const a = FOOT[j - 1]
  const b = FOOT[j]
  const gap = Math.min(0.6, b.t - a.t)
  return clamp(0.02 + 0.2 * gap, 0.03, 0.13) * (0.7 + 0.3 * clamp(b.s / 1.6)) * liftShape(clamp((T - a.t) / gap))
}

/* ------------------------------------------------------------------ drawing */

function drawArm(p: p5, c: Ctx, arm: Arm, T: number): void {
  const pose = armPose(arm, T)
  const s = shoulder(arm, T)
  const w = pose.grip
  const e = elbowOf(s, w, arm === 'left' ? 1 : -1)
  tube(p, c, s, e, 4.4)
  tube(p, c, e, w, 3.8)
  clampBlock(p, c, e, Math.atan2(w[1] - e[1], w[0] - e[0]), 0.15, 0.12)
  const butt = (g: Pt, ang: number): Pt => [g[0] - Math.cos(ang) * HOLD, g[1] - Math.sin(ang) * HOLD]
  // A roll's blur: the stick's ghost at the top and bottom of its tremble, faint, behind the stick itself.
  if (pose.blur > 0.004) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalAlpha = 0.3
    for (const d of [-1, 1]) {
      const dy = d * pose.blur * 0.5
      const da = -upSign(pose.ang) * d * pose.blur * 0.8
      drawStick(p, c, butt([w[0], w[1] + dy], pose.ang + da), pose.ang + da, STICK)
    }
    ctx.restore()
  }
  drawStick(p, c, butt(w, pose.ang), pose.ang, STICK)
  clampBlock(p, c, w, pose.ang, 0.15, 0.11)
}

function drawFrame(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const L = shoulder('left', T)
  const R = shoulder('right', T)
  const mid: Pt = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 0.05]
  // The lines, up out of sight, fading into the dark above the light.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const q of [L, R]) {
    const g = ctx.createLinearGradient(0, (q[1] - 5) * k, 0, q[1] * k)
    g.addColorStop(0, 'rgba(183, 178, 167, 0)')
    g.addColorStop(1, 'rgba(183, 178, 167, 0.5)')
    ctx.save()
    ctx.strokeStyle = g
    ctx.lineWidth = weight * 0.8
    ctx.beginPath()
    ctx.moveTo(q[0] * k, (q[1] - 5) * k)
    ctx.lineTo(q[0] * k, q[1] * k)
    ctx.stroke()
    ctx.restore()
  }
  p.noFill()
  for (const [w, col] of [[5.4, ink], [3.0, KIT.chrome]] as const) {
    p.stroke(col)
    p.strokeWeight(weight * w)
    p.bezier(L[0] * k, L[1] * k, (L[0] + 0.3) * k, (mid[1] - 0.12) * k, (R[0] - 0.3) * k, (mid[1] - 0.12) * k, R[0] * k, R[1] * k)
  }
  const cup: Pt = [mid[0], mid[1] - 0.09]
  solid(p, ink, weight * 0.8, KIT.lacquer)
  p.arc(cup[0] * k, cup[1] * k, 0.42 * k, 0.26 * k, 0.05, Math.PI - 0.05, p.CHORD)
}

function drawFoot(p: p5, c: Ctx, T: number): void {
  const down = footDown(T)
  if (down <= 0.001) return
  const { k, ink, weight } = c
  const heel: Pt = [KICK.x + 0.55, KIT_FLOOR - 0.02]
  const tilt = -0.22 + 0.16 * pedalPress(T)
  const along = (d: number, up: number): Pt => [heel[0] + Math.cos(tilt) * d + Math.sin(tilt) * up, heel[1] + Math.sin(tilt) * d - Math.cos(tilt) * up]
  const lift = footLift(T) + (1 - down) * 1.6
  const sole0 = along(0.25, 0.045 + lift)
  const sole1 = along(0.52, 0.045 + lift)
  const top1 = along(0.47, 0.15 + lift)
  const top0 = along(0.31, 0.25 + lift)
  const ankle = along(0.41, 0.21 + lift)
  const hidden = SNARE.top + SNARE.depth + SNARE.w * 0.11 * 0.8
  const top: Pt = [ankle[0] + 0.07, hidden]
  if (ankle[1] <= top[1] + 0.02) return
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect((top[0] - 1) * k, hidden * k, 2 * k, 3 * k)
  ctx.clip()
  tube(p, c, [top[0], hidden - 0.2], ankle, 3.8)
  solid(p, ink, weight * 0.8, KIT.lacquer)
  p.quad(sole0[0] * k, sole0[1] * k, sole1[0] * k, sole1[1] * k, top1[0] * k, top1[1] * k, top0[0] * k, top0[1] * k)
  clampBlock(p, c, ankle, Math.atan2(top[1] - ankle[1], top[0] - ankle[0]), 0.12, 0.11)
  p.pop()
}

/** The whole machine at `T`, in the kit's frame. */
export function drawFinaleRig(p: p5, c: Ctx, T: number): void {
  if (rigOut(T)) return
  p.push()
  p.rectMode(p.CORNER)
  drawFoot(p, c, T)
  drawFrame(p, c, T)
  drawArm(p, c, 'left', T)
  drawArm(p, c, 'right', T)
  const L = shoulder('left', T)
  const R = shoulder('right', T)
  for (const q of [L, R]) clampBlock(p, c, q, Math.atan2(R[1] - L[1], R[0] - L[0]), 0.2, 0.15)
  p.pop()
}

