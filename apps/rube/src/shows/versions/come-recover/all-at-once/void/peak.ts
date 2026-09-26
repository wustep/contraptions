import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { googly } from '../fx'
import { box, carried, frame, part, type Ctx, type PartShot } from '../kit'
import { fall } from '../music'
import { HOME, JOY, VOID } from '../worlds'
import { BAGEL, bagelPose, driveBagel, drawBagel, drawThing } from './bagel'
import {
  centreAt,
  EYE_UP,
  GIVEN,
  givenAt,
  gulpAt,
  JOY_EYE as EYE_ON,
  joyLook,
  SPRAYS,
  CHUNKS,
  chunkAt,
  SPRAY_TIMES,
  seedAt,
  joyAt,
  joyEyeAt,
  evelynAt,
  PULLEY,
  RELEASE,
  RO1,
  RP,
  scaleAt,
  slackAt,
  ss,
  T_IN,
  T_OUT,
  TAUT,
  TUG,
  turnAt,
  WAY_X,
  waymondY,
  waymondAt,
  WAY_LINE,
  woundAt,
  windowAt,
  X_ROPE,
  ends,
  lipAt,
  S0,
} from './peakClock'

/**
 * PEAK: the brink, and the pull back (241.755 to 264.144). The machine and its clock are in `peakClock.ts`.
 *
 * They fall into the dark a beat apart, into the everything bagel's hole. Joy reaches the lip first and it starts
 * to take her; Evelyn lands, rolls down to her, and holds her there. Stillness. Then the camera draws back: a
 * clothesline is wound round the bagel's rim, running up to a pulley in the dark above, and Waymond, who has sat
 * on the pulley since the jump in, hops off and comes down on its other end. The slack runs out and the line snaps taut (beat 118); Evelyn pulls her
 * daughter back (118½), and the balance tips (119). Waymond goes down as the counterweight, the line runs off the
 * rim, and the bagel turns backwards, a lurch a beat. It gives Joy back first (she stirs, is half out, and pops
 * free on 122, the greatest hit), then everything else it swallowed, one thing a beat, last in first out, each
 * with a googly eye as it goes. Hanging from the line, it climbs it as it turns, and shrinks as it empties, the two
 * of them riding in its hole. A googly eye comes up out of the hole for Joy (134) and lands on her (136). The
 * line runs out on 151 and flies off; the bagel coasts, gives back the last few things, and closes its hole on
 * them notch by notch, until at the jump it is a washer's window with the two of them at the bottom of it.
 */

/** This leg's entry cell in the dark's own cells: the entry (the ball at (-0.5, 0) of the frame) two cells above the bagel's centre, over its hole. */
export const PEAK_AT: Pt = [BAGEL.at[0], BAGEL.at[1] - 2]
/** When Joy is given her googly eye: as her mother holds her in the bagel's hole, the eye it gives back lands on her. */
export const JOY_EYE = EYE_ON

/** Every strike this part makes, in show seconds: the line going taut, the tug, every beat from 119 to 159, and the seed sprays on the eighths. */
export const PEAK_HITS: number[] = [TAUT, TUG, ...Array.from({ length: 41 }, (_, i) => fall(119 + i)), ...SPRAY_TIMES].sort((a, b) => a - b)

/** From the machine's cells (rel: the bagel's resting centre) to this part's frame. */
const OFF: Pt = [BAGEL.at[0] - PEAK_AT[0], BAGEL.at[1] - PEAK_AT[1]]
const F = (p: Pt): Pt => [p[0] + OFF[0], p[1] + OFF[1]]

// The bagel is driven from a little before the jump in (the flicker before it shows this world) to past the jump out.
driveBagel({
  from: T_IN - 1.2,
  to: T_OUT + 0.5,
  pose: (t) => {
    const [dx, dy] = centreAt(t)
    return { turn: turnAt(t), scale: scaleAt(t), dx, dy, lit: 1, sweep: 1, pool: 0, gulp: gulpAt(t) }
  },
})

interface PeakState {
  begin: number
}

/* ------------------------------------------------------------------ colours: only the dark's and home's */

const ROPE = VOID.garlic
const IRON = VOID.poppy
const IRON_LIT = VOID.bagelRim
const PIN = HOME.wood
const SPRING = HOME.steel
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
/** The line's thickness, cells: a cord. */
const ROPE_W = 0.05
/** Joy as the dark draws her in: toward its violet. */
const DEEP = mixHex(VOID.glow, VOID.bagel, 0.55)
/** How much of the wound line shows at the rim where it leaves (radians): the rest is under the tie's turns. */
const WRAP_SHOWN = 0.75

/** Where each thing wears its googly eye (fractions of its size, in its own turn): on the ring of an onion, near a coin's rim, on a sock's cuff. */
const EYE_ON_THING: Partial<Record<string, Pt>> = {
  onion: [0.36, -0.14],
  coin: [0.2, -0.14],
  sock: [-0.12, -0.26],
  receipt: [0.02, -0.3],
  report: [-0.2, -0.1],
  trophy: [0, -0.28],
  pebble: [0.15, -0.1],
  dog: [0.36, -0.22],
  hotdog: [0.22, -0.02],
}

/* ------------------------------------------------------------------ drawing helpers */

function strokePath(p: p5, c: Ctx, pts: Pt[], wide = ROPE_W, twist = false): void {
  if (pts.length < 2) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const k = c.k
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.strokeStyle = c.ink
  ctx.lineWidth = wide * k + 1.6 * c.weight * 0.6
  ctx.stroke()
  ctx.strokeStyle = ROPE
  ctx.lineWidth = wide * k
  ctx.stroke()
  // Its lay: short slanted marks along it, where it is big enough on the screen to have any.
  if (twist && wide * k > 3) {
    ctx.strokeStyle = c.ink
    ctx.globalAlpha = 0.8
    ctx.lineWidth = Math.max(0.7, c.weight * 0.45)
    const step = wide * 1.5
    let carry = 0
    ctx.beginPath()
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]
      const [bx, by] = pts[i]
      const len = Math.hypot(bx - ax, by - ay)
      if (len < 1e-9) continue
      const tx = (bx - ax) / len
      const ty = (by - ay) / len
      let d = step - carry
      while (d <= len) {
        const mx = ax + tx * d
        const my = ay + ty * d
        const h = wide * 0.5
        ctx.moveTo((mx - ty * h - tx * h * 0.7) * k, (my + tx * h - ty * h * 0.7) * k)
        ctx.lineTo((mx + ty * h + tx * h * 0.7) * k, (my - tx * h + ty * h * 0.7) * k)
        d += step
      }
      carry = len - (d - step)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/** The pulley at its axle (frame cells), turned `a`: a grooved iron wheel in a strap, hung on a rod from high above. */
function drawPulley(p: p5, c: Ctx, at: Pt, a: number, top: number): void {
  const { k, ink, weight } = c
  const [x, y] = at
  const X = (v: number) => v * k
  // The rod it hangs from, up out of the frame.
  p.stroke(ink)
  p.strokeWeight(weight * 1.1)
  p.line(X(x), X(Math.min(y - RP - 0.5, top)), X(x), X(y - RP - 0.32))
  // The strap: from the axle up either side of the wheel to the hook.
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.fill(IRON_LIT)
  p.beginShape()
  p.vertex(X(x - 0.07), X(y))
  p.vertex(X(x - RP - 0.1), X(y - 0.1))
  p.vertex(X(x - 0.12), X(y - RP - 0.3))
  p.vertex(X(x + 0.12), X(y - RP - 0.3))
  p.vertex(X(x + RP + 0.1), X(y - 0.1))
  p.vertex(X(x + 0.07), X(y))
  p.vertex(X(x), X(y - RP - 0.1))
  p.endShape(p.CLOSE)
  // The wheel, its groove, four spokes and the hub.
  p.fill(IRON)
  p.stroke(ink)
  p.strokeWeight(weight)
  p.circle(X(x), X(y), X(2 * RP))
  p.noFill()
  p.strokeWeight(weight * 0.6)
  p.circle(X(x), X(y), X(2 * RP - 0.1))
  p.strokeWeight(weight * 0.8)
  for (let i = 0; i < 4; i++) {
    const s = a + (i * Math.PI) / 2
    p.line(X(x + 0.07 * Math.cos(s)), X(y + 0.07 * Math.sin(s)), X(x + (RP - 0.07) * Math.cos(s)), X(y + (RP - 0.07) * Math.sin(s)))
  }
  p.fill(IRON_LIT)
  p.circle(X(x), X(y), X(0.13))
}

/** A clothespin at (x, y) (frame cells), pointing `a`: two wooden legs and the spring between them. `open` 0..1. */
function drawPin(p: p5, c: Ctx, x: number, y: number, a: number, open = 0): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(PIN)
  for (const side of [-1, 1]) {
    p.push()
    p.rotate(side * (0.05 + 0.35 * open))
    p.rect(X(0.2), X(side * 0.035), X(0.42), X(0.065), X(0.02))
    p.pop()
  }
  p.fill(SPRING)
  p.circle(X(0.16), 0, X(0.08))
  p.pop()
}

/** A lump of the bagel's crust at (x, y) (frame cells), `size` across: its black, a lit edge, and a few seeds. */
function drawCrust(p: p5, c: Ctx, x: number, y: number, size: number, a: number, dark: number, seed: number): void {
  const { k, ink, weight } = c
  const u = size * k
  const h = (i: number) => ((Math.sin(seed * 91.7 + i * 17.3) * 43758.5453) % 1 + 1) % 1
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  p.stroke(rgba(ink, 0.9 * (1 - dark)))
  p.strokeWeight(Math.max(0.6, weight * 0.7))
  p.fill(mixHex(VOID.bagelRim, VOID.bagel, 0.35 + 0.5 * dark))
  p.beginShape()
  const n = 7
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2
    const r = 0.5 * (0.72 + 0.28 * h(i)) * (i % 2 ? 0.8 : 1)
    p.vertex(Math.cos(ang) * r * u, Math.sin(ang) * r * 0.72 * u)
  }
  p.endShape(p.CLOSE)
  // The glaze along its top edge, and its seeds.
  p.noFill()
  p.stroke(rgba(VOID.rimLight, 0.55 * (1 - dark)))
  p.strokeWeight(Math.max(0.6, weight * 0.8))
  p.arc(0, -0.05 * u, 0.62 * u, 0.4 * u, Math.PI * 1.15, Math.PI * 1.85)
  p.noStroke()
  p.fill(rgba(VOID.sesame, 0.95 * (1 - dark)))
  for (let i = 0; i < 3; i++) p.ellipse((h(i + 9) - 0.5) * 0.5 * u, (h(i + 19) - 0.5) * 0.3 * u, 0.2 * u, 0.09 * u)
  p.pop()
}

/* ------------------------------------------------------------------ the part */

export const peak = part<PeakState>(
  {
    name: 'peak',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      if (T < T_IN - 1.5 || T > T_OUT + 0.6) return
      const { k } = c
      const f = frame(p, k)
      const C = F(centreAt(T))
      const sc = scaleAt(T)
      const Ro = RO1 * sc
      const P = F(PULLEY)
      const xr = X_ROPE + OFF[0]
      const wy = waymondY(T) + OFF[1]

      // Each lurch smears the crust: the bagel as it was a few hundredths of a second ago, faint, over itself.
      for (let kk = 119; kk <= 150; kk++) {
        const x = T - fall(kk)
        if (x < 0) break
        if (x > 0.16) continue
        const ctx = p.drawingContext as CanvasRenderingContext2D
        for (const [back, a] of [[0.035, 0.34], [0.07, 0.18]] as const) {
          ctx.save()
          ctx.globalAlpha = a * (1 - x / 0.16)
          p.push()
          p.translate(OFF[0] * k, OFF[1] * k)
          drawBagel(p, k, c.ink, c.weight, bagelPose(T - back))
          p.pop()
          ctx.restore()
        }
      }

      // The line off the rim (the right strand, from the pulley down to where it leaves the bagel).
      if (T < RELEASE) {
        const pts: Pt[] = []
        const y0 = P[1]
        const y1 = C[1]
        const L = y1 - y0
        const n = 40
        // Unloaded it hangs a little loose and sways; taut, it twangs after the catch and after each lurch.
        const loose = 0.07 * (1 - ss((T - TAUT) / 0.05)) * Math.sin(T * 1.3)
        let twang = 0.05 * Math.exp(-Math.max(0, T - TAUT) / 0.18) * (T > TAUT ? 1 : 0)
        for (let kk = 119; kk <= 151; kk++) {
          const x = T - fall(kk)
          if (x < 0) break
          if (x < 0.8) twang += 0.016 * Math.exp(-x / 0.16)
        }
        for (let i = 0; i <= n; i++) {
          const v = i / n
          pts.push([xr + loose * Math.sin(Math.PI * v) + twang * Math.sin(Math.PI * v) * Math.sin(T * 60 + v * 2), y0 + L * v])
        }
        strokePath(p, c, pts, ROPE_W, true)
      } else {
        // The end flies off the rim and up over the pulley, and the line runs away down the other side.
        const x = T - RELEASE
        const yEnd = C[1] + (P[1] - C[1]) * Math.min(1, (x / 0.4) ** 1.6)
        if (x < 0.4) strokePath(p, c, [[xr, P[1]], [xr, yEnd]], ROPE_W, true)
        if (x < 0.4) drawPin(p, c, xr, yEnd + 0.05, Math.PI / 2, Math.min(1, x / 0.1))
      }

      // Over the pulley, and down to Waymond: slack in a loop while he sits on the pulley and falls, then straight.
      const arc: Pt[] = []
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI + (Math.PI * i) / 16
        arc.push([P[0] + RP * Math.cos(a), P[1] + RP * Math.sin(a)])
      }
      if (T < RELEASE + 0.4) strokePath(p, c, arc)
      const wx = WAY_X + OFF[0]
      const slack = slackAt(T)
      if (slack > 0.004) {
        // Slack: the line hangs in a loop from the pulley's side down and back up to him, straightening as he falls.
        const A: Pt = [wx, P[1]]
        const W: Pt = F(waymondAt(T))
        const L = WAY_LINE
        const bx = Math.min(A[0], W[0]) - 0.14
        const len = (yb: number) => Math.hypot(bx - A[0], yb - A[1]) + Math.hypot(W[0] - bx, W[1] - yb)
        let lo = Math.max(A[1], W[1])
        let hi = lo + L
        for (let i = 0; i < 30; i++) {
          const mid = (lo + hi) / 2
          if (len(mid) < L) lo = mid
          else hi = mid
        }
        const B: Pt = [bx, lo]
        const pts: Pt[] = []
        for (let i = 0; i <= 30; i++) {
          const u = i / 30
          // A quadratic through the three, rounded at the bottom.
          const a = (1 - u) * (1 - u)
          const b = 2 * u * (1 - u)
          const cq = u * u
          const ctrl: Pt = [2 * B[0] - (A[0] + W[0]) / 2, 2 * B[1] - (A[1] + W[1]) / 2]
          pts.push([a * A[0] + b * ctrl[0] + cq * W[0], a * A[1] + b * ctrl[1] + cq * W[1]])
        }
        strokePath(p, c, pts, ROPE_W, true)
      }
      // After the release its end goes over the pulley and away down with him.
      const gone = T - RELEASE - 0.4
      const top = gone > 0 ? P[1] + (waymondY(T) - waymondY(RELEASE + 0.4)) : P[1]
      if (slack <= 0.004) strokePath(p, c, [[wx, top], [wx, wy]], ROPE_W, true)
      const travel = waymondY(T) - waymondY(T_IN)
      drawPulley(p, c, P, -travel / RP, f.y0 - 1)

      // The close: the hole fills with the washer window's light, a step a beat, and the two of them stand against it.
      const win = windowAt(T)
      if (win > 0.003) {
        const h = BAGEL.hole * sc
        const ctx = p.drawingContext as CanvasRenderingContext2D
        const g = ctx.createRadialGradient(C[0] * k, (C[1] - 0.15 * h) * k, 0, C[0] * k, C[1] * k, h * k)
        g.addColorStop(0, rgba(HOME.glass, win * 0.9))
        g.addColorStop(0.7, rgba(HOME.glass, win * 0.65))
        g.addColorStop(1, rgba(HOME.glassDeep, win * 0.75))
        ctx.save()
        ctx.beginPath()
        ctx.arc(C[0] * k, C[1] * k, h * k * 0.995, 0, 2 * Math.PI)
        ctx.fillStyle = g
        ctx.fill()
        ctx.restore()
      }

      // The line wound on the rim: only its last turn shows, where it comes round the rim and leaves it; and its
      // tie, the clothespin, racing round the rim as it pays out.
      const wound = woundAt(T)
      if (wound > 0.002 && T < RELEASE) {
        const span = Math.min(wound, WRAP_SHOWN)
        const rr = Ro + ROPE_W * 0.55
        const pts: Pt[] = []
        const m = Math.max(8, Math.ceil(span * rr * 8))
        for (let i = 0; i <= m; i++) {
          const a = Math.PI - (span * i) / m
          pts.push([C[0] + rr * Math.cos(a), C[1] + rr * Math.sin(a)])
        }
        strokePath(p, c, pts, ROPE_W, true)
        const a = Math.PI - wound
        drawPin(p, c, C[0] + (Ro + 0.03) * Math.cos(a), C[1] + (Ro + 0.03) * Math.sin(a), a)
      }
    },
    over: (p, s, c) => {
      const T = s.begin + c.t
      if (T < T_IN - 1.5 || T > T_OUT + 0.6) return
      const { k, ink, weight } = c

      // The seeds it sprays out on the eighths.
      for (const sp of SPRAYS) {
        const x = T - sp.at
        if (x < 0 || x > 1.2) continue
        for (const sd of sp.seeds) {
          const w = seedAt(sp, sd, x)
          if (w.fade <= 0.01) continue
          const [px, py] = F(w.p)
          p.push()
          p.translate(px * k, py * k)
          p.rotate(w.angle)
          p.stroke(rgba(ink, 0.8 * w.fade))
          p.strokeWeight(Math.max(0.5, weight * 0.45))
          p.fill(rgba(sd.kind === 0 ? VOID.sesame : sd.kind === 1 ? VOID.garlic : VOID.onion, w.fade))
          const L = w.size * k
          if (sd.kind === 0) p.ellipse(0, 0, L, L * 0.48)
          else if (sd.kind === 1) p.quad(-L / 2, 0, 0, L * 0.3, L / 2, 0, 0, -L * 0.3)
          else p.triangle(-L / 2, L * 0.25, L / 2, L * 0.1, -L * 0.1, -L * 0.3)
          p.pop()
        }
      }

      // On the loudest beats, lumps of its crust and a small thing come out with the big one.
      for (const ch of CHUNKS) {
        const x = T - ch.at
        if (x < 0 || x > 2.2) continue
        const w = chunkAt(ch, x)
        const [px, py] = F(w.p)
        if (ch.thing) {
          drawThing(p, k, ink, weight, ch.thing, px, py, w.size, w.angle, w.dark, ch.seed % 3)
          if (x > 0.1) {
            const sc = Math.max(0.045, 0.13 * w.size) / (0.56 * R)
            const wob = 0.9 * Math.exp(-(x - 0.1) / 0.5) * Math.sin((x - 0.1) * 23)
            googly(p, k, ink, weight, px + 0.08 * w.size, py - 0.1 * w.size + 0.3 * R * sc, { x: wob, y: 1, hx: 0 }, sc)
          }
        } else drawCrust(p, c, px, py, w.size, w.angle, w.dark, ch.seed)
      }

      // Everything it gives back, each with a googly eye.
      for (const g of GIVEN) {
        const x = T - g.at
        if (x < 0 || x > 2.4) continue
        const w = givenAt(g, x)
        const [px, py] = F(w.p)
        drawThing(p, k, ink, weight, g.thing, px, py, w.size, w.angle, w.dark, g.variant)
        if (x > 0.1) {
          const pop = x < 0.26 ? 1 + 0.35 * Math.sin((Math.PI * (x - 0.1)) / 0.16) : 1
          const er = Math.max(0.045, 0.11 * w.size) * pop
          const cosA = Math.cos(w.angle)
          const sinA = Math.sin(w.angle)
          const [ex0, ey0] = EYE_ON_THING[g.thing] ?? [0.1, -0.12]
          const ox = ex0 * w.size
          const oy = ey0 * w.size
          const ex = px + ox * cosA - oy * sinA
          const ey = py + ox * sinA + oy * cosA
          // The pupil: flung outward as it is thrown, falling back to hang as it slows.
          const b = givenAt(g, Math.max(0, x - 0.06)).p
          const a2 = givenAt(g, Math.max(0, x - 0.12)).p
          const ax = (w.p[0] - 2 * b[0] + a2[0]) / 0.0036
          const ay = (w.p[1] - 2 * b[1] + a2[1]) / 0.0036
          let lx = -ax * 0.02
          let ly = 1 - ay * 0.02
          const m = Math.hypot(lx, ly) || 1
          lx /= m
          ly /= m
          const wob = 0.95 * Math.exp(-(x - 0.1) / 0.5) * Math.sin((x - 0.1) * 21)
          const sc = er / (0.56 * R)
          googly(p, k, ink, weight, ex, ey + 0.3 * R * sc, { x: lx + wob, y: ly, hx: 0 }, sc)
        }
      }

      // The eye it gives back for Joy, on its way to her.
      const e = joyEyeAt(T)
      if (e) {
        const [ex, ey] = F(e.p)
        const u = (T - EYE_UP) / (EYE_ON - EYE_UP)
        const sc = e.grow * (1 + 0.5 * (1 - u))
        const spinLook = { x: Math.sin(u * 9), y: Math.cos(u * 9), hx: 0 }
        googly(p, k, ink, weight, ex, ey + 0.3 * R * sc, spinLook, sc)
      }
    },
  },
  (slot) => {
    const begin = slot.begin
    const dur = slot.end - slot.begin
    const at = (x: number): Pt => F(evelynAt(begin + x))
    const segs = carried(at, 0, dur, Math.round(dur * 60))
    segs[0].from = [-0.5, 0]
    const last = F(ends().eve)
    segs[segs.length - 1].to = last
    return {
      cells: box(-17 + OFF[0], -12 + OFF[1], 10 + OFF[0], 12 + OFF[1], 2),
      exit: [last[0] + 0.5, last[1]],
      lane: { segs, fire: TAUT - begin },
      state: { begin },
      company: [
        {
          who: 'joy',
          from: T_IN - 1,
          to: T_OUT,
          at: (t) => {
            const [x, y] = F(joyAt(t))
            const look = joyLook(t)
            return look.scale === 1 && look.dim === 0 ? { x, y } : { x, y, scale: look.scale, color: mixHex(JOY, DEEP, look.dim) }
          },
        },
        // Waymond is up by the pulley from the jump in (he comes in with the world), and comes down on his line.
        { who: 'waymond', from: T_IN - 1, to: T_OUT, at: (t) => { const [x, y] = F(waymondAt(t)); return { x, y } } },
      ],
    }
  },
  (slot) => shotsFor(slot),
)

/** The camera, in the frame: down with them, close on the catch, back for the whole machine, in with them, and close on the window. */
function shotsFor(slot: { begin: number; end: number }): PartShot[] {
  const H = (p: Pt): Pt => F(p)
  const end = ends()
  // The catch is framed a little over the two of them on the lip.
  const catchY = lipAt(S0) - 0.18
  return [
    { t: 242.4, cells: 6.2, off: [0.1, 0.5] },
    // The catch: close on the two of them at the lip.
    { t: 243.6, cells: 3.4, hold: H([-0.05, catchY]), w: 0.9 },
    { t: 245.4, cells: 3.1, hold: H([-0.05, catchY]), w: 0.9 },
    // Back, as Waymond comes down, to the whole machine: pulley, line, rim, the two of them in the hole.
    { t: 246.4, cells: 5.4, hold: H([-1.4, -0.3]) },
    // Waymond caught by the line, and the tug: the line, his catch and the two of them in one frame.
    { t: 247.3, cells: 5.3, hold: H([-1.9, -0.5]) },
    { t: 247.62, cells: 5.0, hold: H([-1.7, -0.35]) },
    { t: 247.85, cells: 5.1, hold: H([-1.7, -0.4]) },
    // Open to the whole machine as the bagel turns back: pulley, Waymond going down, the line, the rim, the hole.
    { t: 248.6, cells: 8.2, hold: H([-1.4, -1.4]) },
    { t: 249.8, cells: 8.2, hold: H([-1.5, -1.5]) },
    { t: 251.0, cells: 7.9, hold: H([-1.7, -1.6]) },
    // In on mother and daughter for Joy's eye.
    { t: 252.4, cells: 5.0, off: [-0.3, -0.5] },
    { t: 253.6, cells: 3.4, off: [0.1, -0.3] },
    { t: 254.55, cells: 3.0, off: [0.12, -0.25] },
    { t: 255.3, cells: 3.3, off: [0.1, -0.3] },
    // Back out on the fountain.
    { t: 256.6, cells: 8.6, off: [0.3, -1.6] },
    { t: 259.4, cells: 8.8, off: [0.2, -1.5] },
    { t: 260.8, cells: 6.2, off: [0, -0.8] },
    // And close on the circle for the cut.
    { t: 262.55, cells: 3.0, hold: H(end.centre), w: 0.6 },
    { t: slot.end, cells: 2.4, hold: H(end.centre), w: 1 },
  ]
}
