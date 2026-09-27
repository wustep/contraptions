import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, T0, knock, pluck } from '../music'
import { BRASS, GOLD, INK, IRON, PAPER, clamp, deep, pale, smooth } from '../look'

/**
 * The bows: the violins arrive. Either side of the mast a string frame hangs in the roof, four strings stretched
 * between two posts over two bridges, and over it a long bow on a carriage, the carriage on a rail hung from the
 * ceiling. One crank on the mast drives both carriages by rods: a down-bow across one bar, an up-bow across the next,
 * one whole bow for each turn of the drum, and since both rods ride one pin the two bows always go opposite ways (one
 * down while the other is up). The bow lies across the strings at a slant, and each string shivers where the hair is.
 *
 * Until the engine is let in its rails are lifted and the bows held off the strings; they lower as it is let in, and
 * the crank runs up from rest into step with the drum. The louder the orchestra, the harder the hair bites.
 */

const CYCLE = 2 * BAR
const OMEGA = (2 * Math.PI) / CYCLE
/** When the machine stops for good: the collapse. */
const STOP = 845
const STOP_RUN = 2.2

/** Heights below the box's top: the four strings, the body's face, the peg head. */
const STRINGS = [0.84, 0.92, 1.0, 1.08]
const FACE: [number, number] = [0.72, 1.2]
const HEAD: [number, number] = [0.83, 1.09]
/** The body's ends, its bridges, and the middle of where the bow crosses it (right side; the left is its mirror). */
const BODY: [number, number] = [1.74, 4.74]
const BRIDGES: [number, number] = [2.12, 4.6]
const CROSS = { x: 3.33, y: (STRINGS[0] + STRINGS[3]) / 2 }
/** The bow's slant across the strings (engaged), and how far the rail swings it up off them. */
const SLANT = (11 * Math.PI) / 180
const LIFT = (14 * Math.PI) / 180
/** From the rail down to the hair; the hair's length; the rail's pivot (x); the crank's height and throw. */
const DROP = 0.2
const HAIR = 2.1
const PIVOT_X = 0.72
const CRANK = { x: 0, y: 0.52 }
const THROW = 0.35

/** ∫ smoothstep from 0 to u. */
const S = (u: number): number => {
  const v = clamp(u)
  return v * v * v - (v * v * v * v) / 2
}

/** Seconds run at full speed since `a`: running up over `d`, and running down to rest from the collapse. */
function run(t: number, a: number, d: number): number {
  if (t <= a) return 0
  let s = d * S((t - a) / d) + Math.max(0, t - a - d)
  if (t > STOP) s -= STOP_RUN * S((t - STOP) / STOP_RUN) + Math.max(0, t - STOP - STOP_RUN)
  return s
}
/** How fast it is running, 0 to 1. */
const pace = (t: number, a: number, d: number): number => smooth(t, a, a + d) * (1 - smooth(t, STOP, STOP + STOP_RUN))

/** The rail's pivot, found so that the engaged hair line passes through the crossing's middle. */
const PIVOT = { x: PIVOT_X, y: CROSS.y - (DROP + Math.sin(SLANT) * (CROSS.x - PIVOT_X)) / Math.cos(SLANT) }
/** How far along the rail the carriage sits when the bow's middle is over the crossing, and the rod that puts it there. */
const ALONG_MID = Math.cos(SLANT) * (CROSS.x - PIVOT.x) + Math.sin(SLANT) * (CROSS.y - PIVOT.y) - HAIR / 2
const ROD = Math.hypot(PIVOT.x + Math.cos(SLANT) * ALONG_MID - CRANK.x, PIVOT.y + Math.sin(SLANT) * ALONG_MID - CRANK.y)

type Pt = { x: number; y: number }

/** A bar with rounded ends: an ink line under a narrower line of its fill. */
function bar(p: p5, k: number, a: Pt, b: Pt, w: number, fill: string, edge: number): void {
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(w * k + 2 * edge)
  p.line(a.x * k, a.y * k, b.x * k, b.y * k)
  p.stroke(fill)
  p.strokeWeight(w * k)
  p.line(a.x * k, a.y * k, b.x * k, b.y * k)
}

function quad(p: p5, k: number, q: Pt[]): void {
  p.quad(q[0].x * k, q[0].y * k, q[1].x * k, q[1].y * k, q[2].x * k, q[2].y * k, q[3].x * k, q[3].y * k)
}

export const bows: Engine = (p, c, _st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const y0 = e.box.y0
  const Y = (y: number): number => y0 + y
  const gild = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)
  const at = t - e.since
  // The crank: at rest on a dead centre until let in, then running up over two bars into step with the drum (a
  // down-bow from each odd bar's downbeat).
  const a = at + 0.5
  const runUp = 4
  const phi = OMEGA * (run(t, a, runUp) + a + runUp / 2 - T0)
  const going = pace(t, a, runUp)
  const push = clamp((e.amp - 0.72) / 0.26)
  const pin: Pt = { x: CRANK.x + THROW * Math.cos(phi + Math.PI), y: Y(CRANK.y) + THROW * Math.sin(phi + Math.PI) }
  // How hard the hair bites: with the bow's speed, a bite at each change of bow (the downbeat), and the orchestra.
  const bowSpeed = Math.abs(Math.sin(phi))
  const low = t < STOP ? pluck(t, 'low') : Infinity
  const bite = going * (0.4 + 0.6 * bowSpeed + 0.6 * knock(low, 0.3)) * (0.75 + 0.45 * push)
  // The rails: swung up before, lowered onto the strings as it is let in.
  const rail = SLANT - LIFT * (1 - e.on)
  const contact = clamp((e.on - 0.93) / 0.07)

  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.globalAlpha *= smooth(e.open, 0.75, 1)

  const color = e.color
  const wood = gild(color)
  const dark = gild(deep(color, 0.3))
  const ebony = deep(color, 0.75)
  const stickFill = gild(deep(color, 0.5))
  const iron = gild(pale(IRON, 0.25))
  const brass = gild(BRASS)
  const fine = weight * 0.5

  // Each side's kinematics, in its own frame (the left is drawn mirrored, so its pin is mirrored too).
  const sides = [1, -1].map((sx) => {
    const P = { x: pin.x * sx, y: pin.y }
    const O = { x: PIVOT.x, y: Y(PIVOT.y) }
    const u = { x: Math.cos(rail), y: Math.sin(rail) }
    const n = { x: -u.y, y: u.x }
    const dx = P.x - O.x
    const dy = P.y - O.y
    const along = u.x * dx + u.y * dy
    const d = along + Math.sqrt(Math.max(0, ROD * ROD - (dx * dx + dy * dy) + along * along))
    const C = { x: O.x + u.x * d, y: O.y + u.y * d }
    return { sx, O, u, n, C }
  })

  for (const s of sides) {
    p.push()
    p.scale(s.sx, 1)
    const { O, u, n, C } = s
    const seed = s.sx > 0 ? 0 : 1
    const Q = (al: number, ac: number): Pt => ({ x: C.x + u.x * al + n.x * ac, y: C.y + u.y * al + n.y * ac })
    const H0 = Q(0, DROP)

    // The body: a long box face in the storey's colour, a tailpiece at the inner end, a peg head and scroll at the
    // outer, and the two bridges.
    p.rectMode(p.CORNERS)
    solid(p, INK, weight, dark)
    p.rect((BODY[1] - 0.06) * k, Y(HEAD[0]) * k, (BODY[1] + 0.3) * k, Y(HEAD[1]) * k, 0.03 * k, 0.12 * k, 0.12 * k, 0.03 * k)
    solid(p, INK, weight * 0.8, dark)
    p.circle((BODY[1] + 0.3) * k, Y((HEAD[0] + HEAD[1]) / 2) * k, 0.2 * k)
    outline(p, INK, fine)
    p.circle((BODY[1] + 0.31) * k, Y((HEAD[0] + HEAD[1]) / 2 + 0.01) * k, 0.09 * k)
    for (const [px, up] of [[BODY[1] + 0.05, true], [BODY[1] + 0.17, false], [BODY[1] + 0.12, true], [BODY[1] + 0.0, false]] as const) {
      bar(p, k, { x: px, y: Y(up ? HEAD[0] : HEAD[1]) }, { x: px, y: Y(up ? HEAD[0] - 0.08 : HEAD[1] + 0.08) }, 0.035, brass, fine)
    }
    solid(p, INK, weight, wood)
    p.rect(BODY[0] * k, Y(FACE[0]) * k, BODY[1] * k, Y(FACE[1]) * k, 0.12 * k, 0.04 * k, 0.04 * k, 0.12 * k)
    solid(p, INK, fine, ebony)
    p.quad((BODY[0] + 0.06) * k, Y(STRINGS[0] - 0.02) * k, (BODY[0] + 0.26) * k, Y(STRINGS[0] - 0.035) * k, (BODY[0] + 0.26) * k, Y(STRINGS[3] + 0.035) * k, (BODY[0] + 0.06) * k, Y(STRINGS[3] + 0.02) * k)
    for (const bx of BRIDGES) {
      solid(p, INK, fine, ebony)
      p.rect((bx - 0.026) * k, Y(STRINGS[0] - 0.045) * k, (bx + 0.026) * k, Y(STRINGS[3] + 0.045) * k, 0.012 * k)
    }
    // The strings, from the tailpiece over the bridges to the pegs, shivering where the hair lies across them.
    const shiver = contact * bite
    const gut = gild(pale(BRASS, 0.5))
    for (let j = 0; j < STRINGS.length; j++) {
      const y = Y(STRINGS[j])
      const lam = (y - H0.y) / u.y
      const xj = H0.x + u.x * lam
      const touching = u.y > 0.01 && lam > 0.05 && lam < HAIR - 0.05 ? shiver : 0
      const amp = touching * (0.016 + 0.012 * push)
      const nut = Y((HEAD[0] + HEAD[1]) / 2 + (STRINGS[j] - CROSS.y) * 0.55)
      p.noFill()
      p.stroke(gut)
      p.strokeWeight(Math.max(1, weight * 0.75))
      p.beginShape()
      p.vertex((BODY[0] + 0.24) * k, y * k)
      const N = 32
      for (let i = 0; i <= N; i++) {
        const x = BRIDGES[0] + ((BRIDGES[1] - BRIDGES[0]) * i) / N
        const env = Math.exp(-(((x - xj) / 0.42) ** 2)) * Math.sin((Math.PI * i) / N)
        const wob = amp * env * Math.sin(2 * Math.PI * 11 * t + j * 2.1 + seed * 1.3) * Math.cos((x - xj) * 8)
        p.vertex(x * k, (y + wob) * k)
      }
      p.vertex((BODY[1] + 0.02) * k, nut * k)
      p.vertex((BODY[1] + 0.12 + 0.05 * j) * k, nut * k)
      p.endShape()
    }

    // The bow: its hair straight from the frog to the tip, its stick arched over it, the frog clamped in the carriage.
    const camber = 0.07 - 0.02 * push * contact
    bar(p, k, Q(0.02, DROP), Q(HAIR, DROP), 0.03, gild(pale(BRASS, 0.8)), weight * 0.45)
    const stick: Pt[] = []
    for (let i = 0; i <= 14; i++) {
      const f = i / 14
      stick.push(Q(0.1 + (HAIR - 0.12) * f, DROP - 0.11 + 0.035 * f - camber * Math.sin(Math.PI * f)))
    }
    p.noFill()
    for (const [w, col] of [[0.06 * k + 2 * weight * 0.6, INK], [0.06 * k, stickFill]] as const) {
      p.stroke(col)
      p.strokeWeight(w)
      p.beginShape()
      for (const q of stick) p.vertex(q.x * k, q.y * k)
      p.endShape()
    }
    // The tip's head, and the frog with its brass ferrule.
    solid(p, INK, fine, gild(PAPER))
    const tip = [Q(HAIR - 0.1, DROP - 0.085), Q(HAIR + 0.03, DROP - 0.09), Q(HAIR + 0.01, DROP + 0.01), Q(HAIR - 0.04, DROP)]
    quad(p, k, tip)
    solid(p, INK, weight * 0.7, ebony)
    quad(p, k, [Q(-0.03, DROP - 0.16), Q(0.2, DROP - 0.12), Q(0.22, DROP + 0.005), Q(-0.03, DROP + 0.005)])
    solid(p, INK, fine, brass)
    quad(p, k, [Q(0.19, DROP - 0.125), Q(0.26, DROP - 0.12), Q(0.26, DROP), Q(0.2, DROP)])

    // The rail: hung from the ceiling on a post, pivoted at its foot; the carriage runs on it and holds the frog.
    bar(p, k, { x: O.x, y: y0 - 0.05 }, O, 0.07, iron, weight * 0.6)
    bar(p, k, O, { x: O.x + u.x * 2.3, y: O.y + u.y * 2.3 }, 0.055, iron, weight * 0.6)
    bar(p, k, Q(0.06, 0), Q(0.06, DROP - 0.13), 0.04, brass, weight * 0.5)
    solid(p, INK, weight * 0.7, brass)
    quad(p, k, [Q(-0.14, -0.06), Q(0.16, -0.06), Q(0.16, 0.06), Q(-0.14, 0.06)])
    solid(p, INK, fine, brass)
    p.circle(O.x * k, O.y * k, 0.09 * k)
    p.pop()
  }

  // The rods from the one crank pin to both carriages.
  for (const s of sides) {
    const Cw = { x: s.C.x * s.sx, y: s.C.y }
    bar(p, k, pin, Cw, 0.05, iron, weight * 0.6)
    solid(p, INK, weight * 0.5, brass)
    p.circle(Cw.x * k, Cw.y * k, 0.075 * k)
  }
  // The crank on the mast: a sprocket on the chain, the crank's web and counterweight, and its pin.
  const hub = { x: CRANK.x, y: Y(CRANK.y) }
  p.push()
  p.translate(hub.x * k, hub.y * k)
  p.rotate(phi + Math.PI)
  solid(p, INK, weight * 0.8, gild(deep(BRASS, 0.2)))
  p.arc(0, 0, 0.4 * k, 0.4 * k, Math.PI / 2, (3 * Math.PI) / 2, p.CHORD)
  solid(p, INK, weight * 0.8, brass)
  p.beginShape()
  p.vertex(0, -0.1 * k)
  p.vertex(THROW * k, -0.055 * k)
  p.vertex(THROW * k, 0.055 * k)
  p.vertex(0, 0.1 * k)
  p.endShape(p.CLOSE)
  outline(p, INK, weight * 0.9)
  for (let i = 0; i < 10; i++) {
    const g = (i / 10) * Math.PI * 2
    p.line(Math.cos(g) * 0.1 * k, Math.sin(g) * 0.1 * k, Math.cos(g) * 0.14 * k, Math.sin(g) * 0.14 * k)
  }
  solid(p, INK, weight * 0.7, iron)
  p.circle(0, 0, 0.2 * k)
  p.pop()
  solid(p, INK, weight * 0.7, brass)
  p.circle(pin.x * k, pin.y * k, 0.1 * k)
  solid(p, INK, weight * 0.5, iron)
  p.circle(hub.x * k, hub.y * k, 0.07 * k)
  p.pop()
}
