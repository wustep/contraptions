import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { alpha, box, carried, frame, hash, part, type Company, type Ctx, type PartShot } from '../kit'
import { TOWN } from '../worlds'
import { drawBlob, drawSoldier } from './figures'
import { ALLEY_EXIT, BLOBS, BLOCK, FLICK, howlAlley, LIFT, MARCH, MATCH, OOZE, PASSAGE, SOLDIER_A, SOLDIER_B, sophieAlley, SQUELCH } from './path'
import { drawSet, lightAt } from './set'

/**
 * The alley, on the held D (38.28 → 49.035): the sky builder's.
 *
 * She comes in from the hat shop's street walking right, out of the sun into the shade of a lane between tall
 * houses. On the held D's first note a soldier leaning on the wall strikes a match for his pipe (38.278). She slows;
 * on 41.378 the two push off the wall and stamp into her way, and she stops short and shrinks back. Howl has been
 * coming up behind her from out of shot, quick, and eases in at her side; on 42.94 he nods, and the soldiers jerk
 * stiff as boards, about-face on the next note and march off a step a note into the side passage, and are gone.
 * The two walk on. On 44.722 a blob man oozes out of the wall behind them, a stain that stands up; they hurry; on
 * 45.946 two more ooze out ahead: cornered. The soft notes are the blob men's lurching steps closing in (46.643,
 * 47.177, 47.671), their arms coming up. She presses back against Howl. On 49.035, the waltz's first downbeat, the
 * two step up into the air (the skywalk's first step, from this lane's last place), and the blob men's arms stretch
 * up after them and fall short, and they sink back into the stones.
 *
 * The set (every house right of the street, the tower, the square, the café) is drawn here, from `set.ts`.
 */

interface AlleyState {
  begin: number
}

/** Every strike: the match, the block, the flick, the march, the two oozings, the blob men's steps, the lift. */
export const ALLEY_HITS: number[] = [MATCH, BLOCK, FLICK, ...MARCH, OOZE, BLOBS[1].at, ...SQUELCH, LIFT]

/* ------------------------------------------------------------------ the soldiers */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const sm = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** A crisp step from 0 to 1 at `s` = 0: critically damped, no overshoot. */
const step = (s: number, tau = 0.04): number => (s <= 0 ? 0 : 1 - Math.exp(-s / tau) * (1 + s / tau))
/** A small ring after a stop. */
const ring = (s: number, a: number, w: number, tau: number): number => (s <= 0 ? 0 : a * Math.exp(-s / tau) * Math.sin(w * s))

interface Soldier {
  x: number
  face: number
  lean: number
  stride: number
  cross: number
  arm: number
  stiff: number
  light: number
  lift: number
}

/** Where each soldier is and how he stands at show time `t`. `who` 0 is the smoker, 1 his mate. */
function soldierAt(who: 0 | 1, t: number): Soldier {
  const S = who === 0 ? SOLDIER_A : SOLDIER_B
  // Their marches: the smoker takes four steps, his mate three and goes first into the passage.
  const falls = who === 0 ? MARCH.slice(1) : MARCH.slice(1, 4)
  const pace = 0.35
  const push = step(t - (BLOCK - 0.28), 0.09)
  let x = S.lean + (S.block - S.lean) * sm(t, BLOCK - 0.3, BLOCK)
  // Lounging, then pushed off the wall and leaning in at her; Howl's spell snaps them upright and stiff.
  const stiff = step(t - FLICK, 0.025)
  const lean = (-0.09 * (1 - push) + 0.07 * push) * (1 - stiff) - ring(t - FLICK, 0.05, 30, 0.1)
  const cross = (who === 0 ? 1 : 0.65) * (1 - push)
  let arm = 0
  if (who === 0) arm = 0.72 * (sm(t, MATCH - 0.35, MATCH - 0.05) - sm(t, MATCH + 1.3, MATCH + 1.8))
  else arm = 0.95 * sm(t, BLOCK - 0.1, BLOCK + 0.15)
  // The about-face on the first note after the spell, a heel-turn.
  const turn = sm(t, MARCH[0] - 0.07, MARCH[0] + 0.05)
  const face = -Math.cos(Math.PI * turn)
  // The march: a stiff step landing on each note.
  let stride = 0
  let lift = 0.03 * stiff * (1 - turn)
  for (let j = 0; j < falls.length; j++) {
    const a = j === 0 ? MARCH[0] + 0.06 : falls[j - 1]
    const b = falls[j]
    if (t >= a && t < b) {
      const u = (t - a) / (b - a)
      stride = 0.26 * (1 - 2 * u) * (j % 2 ? -1 : 1)
      lift = 0.035 * Math.sin(Math.PI * u)
    }
    x += pace * sm(t, a, b)
  }
  const lastFall = falls[falls.length - 1]
  if (t >= lastFall) stride = 0.26 * (falls.length % 2 ? -1 : 1) * Math.exp(-(t - lastFall) / 0.12)
  // Into the dark of the passage: they dim and go.
  const [p0, p1] = PASSAGE
  const inDoor = clamp01((x - (p0 + 0.15)) / (p1 - p0 - 0.35))
  const gone = who === 0 ? sm(t, MARCH[4] - 0.05, MARCH[4] + 0.4) : sm(t, MARCH[3] - 0.1, MARCH[3] + 0.35)
  const light = 1 - Math.max(gone, inDoor * 0.35)
  return { x, face, lean, stride, cross, arm, stiff, light, lift }
}

function drawSoldiers(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const L = lightAt(t)
  for (const who of [1, 0] as const) {
    const s = soldierAt(who, t)
    if (s.light <= 0.01) continue
    p.push()
    p.translate(s.x * k, (0.13 - s.lift) * k)
    p.scale(Math.max(0.06, Math.abs(s.face)), 1)
    drawSoldier(p, k, weight, ink, {
      face: s.face < 0 ? -1 : 1,
      lean: s.lean,
      stride: s.stride,
      cross: s.cross,
      arm: s.arm,
      stiff: s.stiff,
      pipe: who === 0,
      light: s.light,
      dark: L.dark,
    })
    p.pop()
  }
  // The match: a flare on the note, a small flame held to the pipe, shaken out; the pipe's smoke after it.
  const A = soldierAt(0, t)
  const bowl: Pt = [A.x - 0.2, -1.07 + 0.13]
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (t >= MATCH && t < MATCH + 1.5 && A.light > 0.5) {
    const age = t - MATCH
    const f = Math.exp(-age / 0.1) * 0.8 + 0.45 * (1 - sm(t, MATCH + 1.05, MATCH + 1.35))
    if (f > 0.02) {
      const at: Pt = [bowl[0] - 0.05, bowl[1] - 0.02]
      const g = ctx.createRadialGradient(at[0] * k, at[1] * k, 0, at[0] * k, at[1] * k, 0.32 * k)
      g.addColorStop(0, `rgba(255, 214, 140, ${0.45 * f})`)
      g.addColorStop(1, 'rgba(255, 214, 140, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.fillRect((at[0] - 0.32) * k, (at[1] - 0.32) * k, 0.64 * k, 0.64 * k)
      ctx.restore()
      p.noStroke()
      p.fill(alpha(p, TOWN.fire, Math.min(1, f * 1.4)))
      const h = 0.07 + 0.05 * f
      p.beginShape()
      p.vertex((at[0] - 0.025) * k, at[1] * k)
      p.quadraticVertex((at[0] - 0.03) * k, (at[1] - h * 0.6) * k, at[0] * k, (at[1] - h) * k)
      p.quadraticVertex((at[0] + 0.03) * k, (at[1] - h * 0.6) * k, (at[0] + 0.025) * k, at[1] * k)
      p.endShape(p.CLOSE)
      p.fill(alpha(p, TOWN.fireHot, Math.min(1, f * 1.4)))
      p.ellipse(at[0] * k, (at[1] - h * 0.3) * k, 0.025 * k, 0.05 * k)
    }
  }
  if (t > MATCH + 0.3 && t < MARCH[4] + 1.5) {
    // Pipe smoke: soft wisps rising and spreading from the bowl, a new one every so often, until the spell.
    p.noStroke()
    for (let i = 0; i < 9; i++) {
      const born = MATCH + 0.35 + i * 0.55
      const age = t - born
      if (age < 0 || age > 3 || born > FLICK) continue
      const src = soldierAt(0, born)
      const x0 = src.x - 0.21
      const y = -0.97 - 0.28 * age
      const x = x0 + 0.1 * Math.sin(age * 2 + i) + 0.05 * age
      const r = 0.05 + 0.07 * age
      const a = 0.22 * (1 - age / 3) * Math.min(1, age * 4)
      p.fill(alpha(p, TOWN.plaster, a))
      p.ellipse(x * k, y * k, 2 * r * k, 1.6 * r * k)
    }
  }
}

/* ------------------------------------------------------------------ the blob men */

function blobAt(i: number, t: number) {
  const b = BLOBS[i]
  const since = t - b.at
  if (since < 0) return null
  // Out of the wall: on the note his dark shape swells out of the plaster at full height, and solidifies.
  const solid = step(since - 0.08, 0.14)
  let x = b.x
  let squash = 0
  let lean = 0
  for (let j = 1; j < b.steps.length; j++) {
    const land = SQUELCH[j - 1]
    const a = land - 0.38
    x += (b.steps[j] - b.steps[j - 1]) * sm(t, a, land)
    if (t >= land) squash += Math.exp(-(t - land) / 0.14)
    if (t >= a && t < land) lean += Math.sin(((t - a) / (land - a)) * Math.PI) * 0.12
  }
  x += (b.rest - b.steps[b.steps.length - 1]) * sm(t, SQUELCH[2] + 0.1, LIFT - 0.1)
  // Arms up after them at the lift, falling short; then they slump and sink back into the stones.
  const reach = 0.25 * solid + 0.75 * sm(t, SQUELCH[0] - 0.3, SQUELCH[2]) + sm(t, LIFT - 0.05, LIFT + 0.5) - 1.3 * sm(t, LIFT + 0.85, LIFT + 1.5)
  const sink = sm(t, LIFT + 1.3, LIFT + 3.0)
  const up = 1 - sink
  return { x, up, solid, squash: Math.min(1, squash + 0.8 * (1 - solid)), lean: lean * b.face, reach: Math.max(0, reach), face: b.face, since, sink }
}

function drawBlobs(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const L = lightAt(t)
  BLOBS.forEach((b, i) => {
    const s = blobAt(i, t)
    if (!s || s.sink >= 1) return
    // His wet print on the plaster: it spreads on the note, and drains away down the wall once he has stepped out.
    const spread = Math.min(1, s.since / 0.1)
    const stain = spread * (0.75 - 0.45 * s.solid) * Math.exp(-Math.max(0, s.since - 0.5) / 0.9)
    if (stain > 0.01) {
      p.push()
      p.translate(b.x * k, 0.02 * k)
      p.scale(1.12, 0.6 + 0.4 * spread)
      drawBlob(p, k, weight, ink, { face: b.face, t, seed: i * 3 + 1, up: 1, print: true, light: stain, dark: L.dark })
      p.pop()
      p.noStroke()
      p.fill(alpha(p, TOWN.blob, 0.6 * stain))
      for (let d = 0; d < 3; d++) {
        const dx = (d - 1) * 0.13 + 0.05 * hash(i, d)
        const y0 = -0.35 - 0.3 * hash(i, d, 3)
        const len = 0.1 + 0.3 * Math.min(1, s.since / 1.4) * (0.5 + 0.5 * hash(i, d, 2))
        const x = b.x + dx
        p.triangle((x - 0.03) * k, y0 * k, (x + 0.03) * k, y0 * k, x * k, (y0 + len) * k)
      }
    }
    if (s.solid <= 0.01) return
    p.push()
    p.translate(s.x * k, 0.01 * k)
    drawBlob(p, k, weight, ink, { face: s.face, t, seed: i * 3 + 1, up: s.up, squash: s.squash, lean: s.lean, reach: s.reach, light: s.solid, dark: L.dark })
    p.pop()
  })
}

/* ------------------------------------------------------------------ the part */

export const alley = part<AlleyState>(
  {
    name: 'alley',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const f = frame(p, c.k)
      drawSet(p, c, t, f)
      p.push()
      p.rectMode(p.CORNER)
      if (t > 20 && t < MARCH[4] + 2) drawSoldiers(p, c, t)
      if (t > OOZE - 0.1 && t < LIFT + 3.2) drawBlobs(p, c, t)
      p.pop()
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const at = (s: number): Pt => sophieAlley(slot.begin + s)
    const segs = carried(at, 0, dur, 240)
    const company: Company[] = [
      {
        who: 'howl',
        from: 39.3,
        to: slot.end,
        at: (t) => {
          const h = howlAlley(t)
          return h ? { x: h[0], y: h[1] } : null
        },
      },
    ]
    return {
      // The whole town right of the street is this part's to draw: the lane, the roofs, the tower, the square, the café.
      cells: box(-1, -18, 66, 2),
      exit: ALLEY_EXIT,
      lane: { segs, fire: Math.max(0, BLOCK - slot.begin) },
      state: { begin: slot.begin },
      company,
    }
  },
  (): PartShot[] => [
    { t: 39.4, cells: 4.7, off: [0.9, -0.8] },
    { t: 41.1, cells: 4.3, hold: [2.15, -0.82], w: 0.85 },
    { t: 42.9, cells: 4.2, hold: [2.3, -0.8], w: 0.9 },
    { t: 44.6, cells: 5.0, hold: [3.15, -0.95], w: 0.9 },
    { t: 46.4, cells: 6.0, hold: [4.3, -1.35], w: 1 },
    // On a follow the moment before the lift, so the camera rises with them into the air without a check.
    { t: 48.7, cells: 5.7, off: [4.8 - (ALLEY_EXIT[0] - 0.5), -1.6] },
  ],
)
