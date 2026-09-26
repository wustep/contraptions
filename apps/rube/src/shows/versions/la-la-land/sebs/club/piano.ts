import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { easeInQuad, easeOutQuad } from '../../../../../../../../src/core/ease'
import { mixHex, type Pt } from '../../../../../parts'
import { glow, rgba, type Way } from '../kit'
import { G, hop } from '../physics'
import { SEBS_MAT } from '../worlds'
import { fold, isBlack, keyRest, keyX, PIANO } from './geometry'

/**
 * The piano: Seb's grand, seen from the keyboard, the show's signature machine.
 *
 * In front, the key row: the white keys' fronts, their tops a little seen, the black keys standing up behind. Round
 * it the case, its cheeks and key slip, the legs and the lyre with its pedals. Above the keys the fallboard, and
 * behind it the action laid open: a row of felt hammers, one over each key, under the strings, and the dampers
 * sitting on the strings. Over it all the music desk, and the lid raised like a sail on its prop.
 *
 * The thread plays it by hopping from key to key on the melody. A key he lands on goes down under him (he sinks
 * with it) and springs him off again; its hammer flies up to the string on the note and falls back to its check;
 * its damper lifts while it is down. The left hand is the piano's own: bass keys go down by themselves on the
 * strong low notes. Everything is drawn from the show's clock, so the piano looks right at any time.
 *
 * The same drawing stands at Seb's (a cold blue light on it) and in the dream at Lipton's (a warm lamp): only the
 * light it is handed changes.
 */

/* ------------------------------------------------------------------ the numbers */

const W = PIANO.keyW
const LOW = PIANO.low
const HIGH = PIANO.high
/** The keyboard's right edge: 24 white keys. */
const KX1 = 24 * W
const CX0 = PIANO.caseX0
const CX1 = PIANO.caseX1
/** The white keys' tops (the ball's floor), their fronts' foot, and how far back their tops are seen. */
const TOP = PIANO.whiteTop
const FRONT = 0.34
const BACK = -0.025
/** A black key: its top, its width. */
const BLACK_TOP = TOP - PIANO.blackRise
const BLACK_W = 0.128
/** How far a key goes down: a white key's front, a black key. */
export const DIP = 0.034
const DIP_BLACK = 0.026
/** Seconds a key takes to go down under him, and to come back up as he leaves it. */
export const DOWN = 0.055
export const UP = 0.05
/** The fallboard, the action window over it, the rim above that. */
const FALL0 = -0.3
const FALL1 = -0.07
const WIN0 = -1.08
const RIM = -1.2
/** The case's foot, the stage the legs stand on. */
const CASE_FOOT = 0.86
const STAGE = PIANO.stage
/** The action: the hammer rail, a hammer at rest (its head's top), its head, the string line. */
const RAIL = -0.35
const HEAD_TOP = -0.66
const HEAD_H = 0.19
const HEAD_W = 0.064
const STRING = -0.9
/** Dampers sit on the strings up to here (the top of a piano's treble has none). */
const DAMPED = 76
/** The lid: its hinge on the rim at the bass end; its raised front corner; the far corner seen under it. */
const HINGE: Pt = [CX0, RIM]
const LID_TIP: Pt = [5.42, PIANO.lidTop]
const LID_FAR: Pt = [5.12, -2.66]
/** The prop, from the rim to the lid's underside. */
const PROP0: Pt = [4.56, RIM]
const PROP1: Pt = [4.66, -2.56]
/** The music desk. */
const DESK: [number, number, number, number] = [1.44, -1.82, 3.84, RIM]

/** The keyboard's middle and the piano's, for lights and cameras. */
export const KEYS_MID = KX1 / 2
export const PIANO_MID: Pt = [(CX0 + CX1) / 2, (PIANO.lidTop + STAGE) / 2]

/* ------------------------------------------------------------------ what is played */

/**
 * A key going down: the note it sounds on (show seconds), when it is let go (it is back up by then, or, struck and
 * let go at once, a moment after), and whether the thread is on it. `s` is how hard.
 */
export interface Press {
  midi: number
  at: number
  until: number
  /** 'ride': he sits on it and it holds him down; 'tap': he bounces off it; 'self': no one at it. */
  how: 'ride' | 'tap' | 'self'
  s: number
}

/** Every key's presses, by key, in order of time: what the drawing reads. */
export interface Keys {
  byKey: Press[][]
  all: Press[]
}

export function keysOf(presses: Press[]): Keys {
  const byKey: Press[][] = Array.from({ length: HIGH - LOW + 1 }, () => [])
  const all = [...presses].sort((a, b) => a.at - b.at)
  for (const pr of all) byKey[fold(pr.midi) - LOW].push(pr)
  return { byKey, all }
}

/** How far down a key is at `t` for one press, 0..1. */
function down(pr: Press, t: number): number {
  if (t < pr.at) return 0
  if (pr.how === 'ride') {
    if (t < pr.at + DOWN) return easeOutQuad((t - pr.at) / DOWN)
    if (t < pr.until - UP) return 1
    if (t < pr.until) return 1 - easeInQuad((t - (pr.until - UP)) / UP)
    return 0
  }
  // Struck and let go: down fast, held a moment (a finger's), back up with a little weight.
  const hold = Math.max(0, pr.until - pr.at)
  const u = t - pr.at
  if (u < 0.035) return (pr.how === 'self' ? 0.85 : 1) * easeOutQuad(u / 0.035)
  if (u < 0.035 + hold) return pr.how === 'self' ? 0.85 : 1
  const v = (u - 0.035 - hold) / 0.09
  return v >= 1 ? 0 : (pr.how === 'self' ? 0.85 : 1) * (1 - easeInQuad(v))
}

/** The last press of a key begun by `t` (a hammer starts up a hair before its note), and the one before it. */
function latest(list: Press[], t: number): [Press | null, Press | null] {
  let a: Press | null = null
  let b: Press | null = null
  for (const pr of list) {
    if (pr.at - 0.03 > t) break
    b = a
    a = pr
  }
  return [a, b]
}

/** A key's depth at `t`, 0..1. */
function depth(list: Press[], t: number): number {
  const [a, b] = latest(list, t)
  return Math.max(a ? down(a, t) : 0, b ? down(b, t) : 0)
}

/**
 * A hammer's lift at `t`, 0 at rest to 1 on the string. It is thrown up so as to meet the string just after the
 * note (the eye takes the key going down first), falls back onto its check while the key is held, and drops to rest
 * when the key comes up.
 */
function lift(list: Press[], t: number): number {
  const [a] = latest(list, t)
  if (!a) return 0
  const hit = a.at + 0.012
  const u = t - hit
  if (u < 0) return easeInQuad(Math.max(0, 1 + u / 0.04))
  const held = a.how === 'ride' ? a.until : a.at + Math.max(0.12, a.until - a.at)
  const check = 0.28 * (1 - smooth01((t - held) / 0.12))
  // Off the string fast, a small rebound on the check, then still.
  return check + (1 - check) * Math.exp(-u / 0.035) + 0.05 * Math.exp(-u / 0.09) * Math.sin(Math.min(u, 0.4) * 40)
}

const smooth01 = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/** A damper's lift at `t`: up while its key is down, and a moment after. */
function damper(list: Press[], t: number): number {
  const [a, b] = latest(list, t)
  const one = (pr: Press | null): number => {
    if (!pr || t < pr.at) return 0
    const off = pr.how === 'ride' ? pr.until : pr.at + Math.max(0.2, pr.until - pr.at + 0.1)
    if (t < pr.at + 0.03) return (t - pr.at) / 0.03
    if (t < off) return 1
    return Math.max(0, 1 - (t - off) / 0.08)
  }
  return Math.max(one(a), one(b))
}

/** How recently a key's string was struck, 1 at the note and dying away (what makes it shimmer). */
function sounding(list: Press[], t: number): number {
  const [a] = latest(list, t)
  if (!a || t < a.at) return 0
  return Math.exp(-(t - a.at) / 0.45) * Math.min(1, 0.45 + a.s * 0.4)
}

/* ------------------------------------------------------------------ the thread at the keys */

/** The longest he is in the air between two notes: a longer gap, he sits on the key and holds it. */
export const FLIGHT = 0.42
/** Shorter than this on a key and he only bounces off it. */
const RIDE = DOWN + UP + 0.04

/** Where he sits on a key, and where he sits on it held down. */
export const restOn = (midi: number): Pt => keyRest(midi)
export const heldOn = (midi: number): Pt => {
  const [x, y] = keyRest(midi)
  return [x, y + (isBlack(fold(midi)) ? DIP_BLACK : DIP)]
}

export interface Note {
  t: number
  midi: number
  s: number
}

/**
 * The thread playing `notes` from a way he is already at (slot seconds; `begin` is the slot's start in show
 * seconds). He hops onto each note's key as it sounds; with time before the next he sits on it and it holds him
 * down, and springs him off; with less he bounces off it. The ways end on the last note's key at its note: `then`
 * says when he leaves it (show seconds, and he is sprung off it at rest by then), or 'tap' that he stays on it at
 * rest while it comes back up under him; without it he is left sitting on it held down. `seat` is a key he is
 * already sitting on as the ways begin.
 */
export function play(
  from: Way,
  notes: Note[],
  begin: number,
  opts: { then?: number | 'tap'; seat?: { press: Press; midi: number } } = {},
): { ways: Way[]; presses: Press[] } {
  const ways: Way[] = []
  const presses: Press[] = []
  const at = (t: number) => t - begin
  let cur: Way = from
  let sitting: { press: Press; midi: number } | null = opts.seat ?? null
  const leave = (by: number, flight: number): number => {
    // Take off `flight` before `by`; if he is sitting on a key held down, it springs him up to rest first.
    const off = by - flight
    if (sitting) {
      const pr = sitting.press
      const rest = off - pr.at
      if (rest >= RIDE) {
        pr.how = 'ride'
        pr.until = off
        const lastAt = ways.length ? ways[ways.length - 1].at : cur.at
        if (at(pr.at + DOWN) > lastAt + 1e-9) ways.push({ at: at(pr.at + DOWN), p: heldOn(sitting.midi), ease: 'out' })
        ways.push({ at: at(off - UP), p: heldOn(sitting.midi) })
        ways.push({ at: at(off), p: restOn(sitting.midi), ease: 'in' })
      } else {
        pr.how = 'tap'
        pr.until = pr.at + Math.max(0, rest)
        if (off > pr.at + 1e-6) ways.push({ at: at(off), p: restOn(sitting.midi) })
      }
    } else if (at(off) > cur.at + 1e-6) ways.push({ at: at(off), p: cur.p })
    return off
  }
  for (const n of notes) {
    const flight = Math.max(0, Math.min(FLIGHT, n.t - (sitting ? sitting.press.at : begin + cur.at)))
    const off = leave(n.t, flight)
    const last: Way = ways.length ? ways[ways.length - 1] : cur
    const fromWay: Way = { at: at(off), p: last.p }
    const land = restOn(n.midi)
    ways.push(hop(fromWay, land, at(n.t), G))
    const press: Press = { midi: fold(n.midi), at: n.t, until: n.t, how: 'tap', s: n.s }
    presses.push(press)
    sitting = { press, midi: n.midi }
    cur = ways[ways.length - 1]
  }
  const then = opts.then
  if (sitting && typeof then === 'number') leave(then, 0)
  else if (sitting && then === 'tap') {
    // He stays where he landed, and the key, struck, comes back up under him.
    sitting.press.how = 'tap'
    sitting.press.until = sitting.press.at
  } else if (sitting) {
    // Left on the key: it holds him down until whoever has him next says otherwise.
    sitting.press.how = 'ride'
    sitting.press.until = Infinity
    ways.push({ at: at(sitting.press.at + DOWN), p: heldOn(sitting.midi), ease: 'out' })
  }
  return { ways, presses }
}

/* ------------------------------------------------------------------ drawing */

/** The light the piano stands in: its colour, and how much of it (0..1). */
export interface PianoLight {
  color: string
  lit: number
}

const M = SEBS_MAT

/**
 * The piano, at show time `t`, in its own frame (the lowest key's left edge is x = 0, a ball on a white key is at
 * y = 0). `keys` says what is played; `light` is the light on it.
 */
export function drawPiano(p: p5, k: number, ink: string, weight: number, t: number, keys: Keys, light: PianoLight): void {
  const X = (v: number) => v * k
  const L = light.color
  const lit = light.lit
  const rect = (x0: number, y0: number, x1: number, y1: number, ...r: number[]) =>
    p.rect(X((x0 + x1) / 2), X((y0 + y1) / 2), X(x1 - x0), X(y1 - y0), ...r.map(X))
  const poly = (pts: Pt[]) => {
    p.beginShape()
    for (const [x, y] of pts) p.vertex(X(x), X(y))
    p.endShape(p.CLOSE)
  }
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const band = (x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
    const g = ctx.createLinearGradient(0, X(y0), 0, X(y1))
    for (const [o, c] of stops) g.addColorStop(o, c)
    ctx.fillStyle = g
    ctx.fillRect(X(x0), X(y0), X(x1 - x0), X(y1 - y0))
  }
  const sheen = (x0: number, y0: number, x1: number, y1: number, a: number, w = 0.55) => {
    p.stroke(rgba(L, a * lit))
    p.strokeWeight(weight * w)
    p.line(X(x0), X(y0), X(x1), X(y1))
  }

  // The tail leg, far behind, in the case's shadow.
  solid(p, ink, weight * 0.6, mixHex(M.lacquer, M.deep, 0.5))
  poly([[3.78, CASE_FOOT], [4.12, CASE_FOOT], [4.07, STAGE - 0.3], [3.83, STAGE - 0.3]])

  // The lid, raised like a sail: its polished underside toward us, lit along the raised edge; the prop under it.
  solid(p, ink, weight * 0.8, M.lacquer)
  poly([HINGE, LID_TIP, [LID_TIP[0] + 0.05, LID_TIP[1] + 0.08], LID_FAR])
  {
    const g = ctx.createLinearGradient(X(HINGE[0]), X(HINGE[1]), X(LID_TIP[0]), X(LID_TIP[1]))
    g.addColorStop(0, rgba(L, 0))
    g.addColorStop(0.55, rgba(L, 0.1 * lit))
    g.addColorStop(1, rgba(L, 0.32 * lit))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(X(HINGE[0] + 0.3), X(HINGE[1] - 0.12))
    ctx.lineTo(X(LID_TIP[0] - 0.05), X(LID_TIP[1] + 0.09))
    ctx.lineTo(X(LID_FAR[0] - 0.02), X(LID_FAR[1] - 0.04))
    ctx.closePath()
    ctx.fill()
  }
  sheen(HINGE[0] + 0.2, HINGE[1] - 0.08, LID_TIP[0] - 0.02, LID_TIP[1] + 0.02, 0.75, 0.5)
  solid(p, ink, weight * 0.5, M.lacquer)
  poly([[PROP0[0] - 0.03, PROP0[1]], [PROP0[0] + 0.03, PROP0[1]], [PROP1[0] + 0.025, PROP1[1]], [PROP1[0] - 0.025, PROP1[1]]])
  solid(p, ink, weight * 0.4, M.brass)
  rect(PROP1[0] - 0.035, PROP1[1] - 0.01, PROP1[0] + 0.035, PROP1[1] + 0.06, 0.01)

  // The music desk on the rim: a panel with a softly arched head, lit along it, on its ledge.
  const [d0, d1, d2, d3] = DESK
  solid(p, ink, weight * 0.8, M.lacquer)
  p.beginShape()
  p.vertex(X(d0), X(d3))
  p.vertex(X(d0), X(d1 + 0.12))
  p.bezierVertex(X(d0 + 0.6), X(d1 - 0.02), X(d2 - 0.6), X(d1 - 0.02), X(d2), X(d1 + 0.12))
  p.vertex(X(d2), X(d3))
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(rgba(L, 0.55 * lit))
  p.strokeWeight(weight * 0.5)
  p.beginShape()
  p.vertex(X(d0 + 0.08), X(d1 + 0.15))
  p.bezierVertex(X(d0 + 0.62), X(d1 + 0.03), X(d2 - 0.62), X(d1 + 0.03), X(d2 - 0.08), X(d1 + 0.15))
  p.endShape()
  band(d0 + 0.05, d1 + 0.1, d2 - 0.05, d3 - 0.1, [[0, rgba(L, 0.1 * lit)], [1, rgba(L, 0)]])
  solid(p, ink, weight * 0.6, M.lacquer)
  rect(d0 - 0.1, d3 - 0.1, d2 + 0.1, d3, 0.02)

  // The case, from the rim to its foot, its front all one piece.
  solid(p, ink, weight, M.lacquer)
  rect(CX0, RIM, CX1, CASE_FOOT, 0.06, 0.06, 0.03, 0.03)
  sheen(CX0 + 0.06, RIM + 0.03, CX1 - 0.06, RIM + 0.03, 0.8)
  band(CX0 + 0.04, 0.46, CX1 - 0.04, CASE_FOOT - 0.04, [[0, rgba(L, 0.16 * lit)], [0.35, rgba(L, 0.03 * lit)], [1, rgba(L, 0)]])
  outline(p, rgba(ink, 0.3), weight * 0.45)
  p.line(X(CX0 + 0.12), X(CASE_FOOT - 0.16), X(CX1 - 0.12), X(CASE_FOOT - 0.16))

  // The action, laid open behind the fallboard: in the dark of the case the plate's gold, the strings across it.
  solid(p, ink, weight * 0.6, M.deep)
  rect(0, WIN0, KX1, FALL0)
  band(0.02, WIN0 + 0.01, KX1 - 0.02, FALL0 - 0.01, [[0, rgba(M.brass, 0.42)], [0.3, rgba(M.brass, 0.2)], [0.75, rgba(M.brass, 0.04)], [1, rgba(M.brass, 0)]])
  const hammerOf = keys.byKey
  // The strings: wound brass in the bass, bright steel above; each shimmers a moment where it is struck.
  const split = keyX(60) - W / 2
  for (const [dy, a] of [[-0.028, 0.45], [0, 1], [0.024, 0.6]] as const) {
    p.stroke(rgba(M.brass, a))
    p.strokeWeight(weight * 0.55)
    p.line(X(0.02), X(STRING + dy), X(split), X(STRING + dy))
    p.stroke(rgba(M.ivory, 0.75 * a))
    p.strokeWeight(weight * 0.35)
    p.line(X(split), X(STRING + dy), X(KX1 - 0.02), X(STRING + dy))
  }
  for (let m = LOW; m <= HIGH; m++) {
    const s = sounding(hammerOf[m - LOW], t)
    if (s < 0.02) continue
    const x = keyX(m)
    const wob = 0.012 * s * Math.sin(t * 90 + m)
    p.stroke(rgba(m < 60 ? M.brass : M.ivory, 0.9 * s))
    p.strokeWeight(weight * (0.5 + 0.5 * s))
    p.noFill()
    p.beginShape()
    p.vertex(X(x - 0.2), X(STRING))
    p.quadraticVertex(X(x), X(STRING + wob * 2), X(x + 0.2), X(STRING))
    p.endShape()
    glow(p, k, x, STRING, 0.16, m < 60 ? M.brass : M.ivory, 0.3 * s, 1.4, 0.5)
  }
  // The dampers on the strings, each lifted on its wire while its key is down.
  const wood = mixHex(M.brass, M.deep, 0.45)
  for (let m = LOW; m <= DAMPED; m++) {
    const x = keyX(m)
    const up = damper(hammerOf[m - LOW], t) * 0.07
    const w = isBlack(m) ? 0.052 : 0.066
    p.stroke(rgba(ink, 0.22))
    p.strokeWeight(weight * 0.25)
    p.line(X(x), X(WIN0), X(x), X(STRING - 0.08 - up))
    p.noStroke()
    p.fill(mixHex(M.deep, M.felt, 0.22))
    rect(x - w / 2, STRING - 0.085 - up, x + w / 2, STRING - 0.03 - up, 0.01, 0.01, 0, 0)
    p.fill(rgba(M.felt, 0.85))
    rect(x - w / 2, STRING - 0.03 - up, x + w / 2, STRING - 0.012 - up)
  }
  // The hammer rail, and the hammers: a felt head on a wooden moulding, on a shank from the rail.
  solid(p, ink, weight * 0.45, mixHex(M.felt, M.deep, 0.6))
  rect(0.03, RAIL - 0.028, KX1 - 0.03, RAIL + 0.028, 0.02)
  const under = mixHex(M.felt, M.velvet, 0.45)
  for (let m = LOW; m <= HIGH; m++) {
    const x = keyX(m)
    const h = lift(hammerOf[m - LOW], t)
    const top = HEAD_TOP + (STRING - HEAD_TOP) * h
    p.stroke(wood)
    p.strokeWeight(weight * 0.4)
    p.line(X(x), X(RAIL - 0.02), X(x), X(top + HEAD_H))
    p.noStroke()
    p.fill(wood)
    rect(x - 0.026, top + HEAD_H - 0.05, x + 0.026, top + HEAD_H, 0.006)
    p.fill(h > 0.6 ? mixHex(M.felt, M.ivory, (h - 0.6) * 1.5) : M.felt)
    rect(x - HEAD_W / 2, top, x + HEAD_W / 2, top + HEAD_H - 0.045, HEAD_W / 2, HEAD_W / 2, 0.006, 0.006)
    p.fill(under)
    rect(x - HEAD_W / 2 + 0.013, top + 0.05, x + HEAD_W / 2 - 0.013, top + HEAD_H - 0.045)
  }
  band(0.02, FALL0 - 0.16, KX1 - 0.02, FALL0, [[0, rgba(M.lacquer, 0)], [1, rgba(M.lacquer, 0.7)]])

  // The fallboard, pushed back, and the strip of red felt along its foot.
  solid(p, ink, weight * 0.7, M.lacquer)
  rect(0, FALL0, KX1, FALL1)
  sheen(0.06, FALL0 + 0.025, KX1 - 0.06, FALL0 + 0.025, 0.7)
  // Its lacquer holds a dim reflection of the white keys.
  p.noStroke()
  p.fill(rgba(M.ivory, 0.07 + 0.05 * lit))
  for (let i = 0; i < 24; i++) rect(i * W + 0.012, FALL1 - 0.12, (i + 1) * W - 0.012, FALL1 - 0.034, 0.01, 0.01, 0, 0)
  p.fill(M.velvet)
  rect(0, FALL1 - 0.028, KX1, FALL1)

  // The keys, on the dark of the key bed, which shows between them.
  p.noStroke()
  p.fill(M.lacquer)
  rect(0, FALL1, KX1, FRONT + 0.012)
  const ivory = mixHex(M.ivory, L, 0.06 * lit)
  const tops = mixHex(M.ivory, M.felt, 0.3)
  const gap = 0.017
  for (let i = 0; i < 24; i++) {
    const m = whiteMidi(i)
    const d = depth(keys.byKey[m - LOW], t) * DIP
    const x0 = i * W + gap / 2
    const x1 = (i + 1) * W - gap / 2
    // Its top, a little seen from above and going back to the key bed (down at the front with the key); its front.
    p.fill(tops)
    poly([[x0, BACK], [x1, BACK], [x1, TOP + d], [x0, TOP + d]])
    p.fill(ivory)
    rect(x0, TOP + d, x1, FRONT + d, 0, 0, 0.026, 0.026)
    p.fill(rgba(M.felt, 0.5))
    rect(x0 + 0.012, FRONT + d - 0.034, x1 - 0.012, FRONT + d - 0.021, 0.006)
  }
  // The key bed's shadow over the backs of the white keys.
  band(0, BACK, KX1, TOP, [[0, rgba(M.lacquer, 0.55)], [1, rgba(M.lacquer, 0)]])
  const blackTop = mixHex(M.lacquer, L, 0.11 * lit)
  for (let m = LOW; m <= HIGH; m++) {
    if (!isBlack(m)) continue
    const x = keyX(m)
    const d = depth(keys.byKey[m - LOW], t) * DIP_BLACK
    // Its top going back, catching the light toward its front edge; its front standing on the white keys.
    p.fill(M.lacquer)
    rect(x - BLACK_W / 2, BACK - 0.02 + d * 0.4, x + BLACK_W / 2, TOP + 0.004, 0.02, 0.02, 0, 0)
    const g = ctx.createLinearGradient(0, X(BACK - 0.02), 0, X(BLACK_TOP + d))
    g.addColorStop(0, rgba(blackTop, 0))
    g.addColorStop(1, rgba(blackTop, 1))
    ctx.fillStyle = g
    ctx.fillRect(X(x - BLACK_W / 2 + 0.01), X(BACK - 0.01 + d * 0.4), X(BLACK_W - 0.02), X(BLACK_TOP + d - BACK + 0.01 - d * 0.4))
    sheen(x - BLACK_W / 2 + 0.016, BLACK_TOP + d, x + BLACK_W / 2 - 0.016, BLACK_TOP + d, 0.85, 0.4)
  }

  // The key slip under them, and the cheeks at either end.
  solid(p, ink, weight * 0.8, M.lacquer)
  rect(CX0, FRONT + 0.01, CX1, FRONT + 0.11, 0.015)
  sheen(CX0 + 0.05, FRONT + 0.03, CX1 - 0.05, FRONT + 0.03, 0.55)
  for (const [a, b] of [[CX0, 0], [KX1, CX1]] as const) {
    solid(p, ink, weight * 0.8, M.lacquer)
    rect(a, FALL0 - 0.02, b, FRONT + 0.11, 0.1, 0.1, 0.015, 0.015)
    sheen(a + 0.08, FALL0 + 0.01, b - 0.08, FALL0 + 0.01, 0.8)
  }

  // The legs, tapering to brass cups on the stage, and the lyre with its three pedals.
  for (const [a, b] of [[-0.4, 0.1], [5.18, 5.68]] as const) {
    solid(p, ink, weight * 0.8, M.lacquer)
    poly([[a, CASE_FOOT - 0.02], [b, CASE_FOOT - 0.02], [b - 0.08, STAGE - 0.12], [a + 0.08, STAGE - 0.12]])
    sheen(a + 0.09, CASE_FOOT + 0.08, a + 0.13, STAGE - 0.25, 0.45, 0.5)
    solid(p, ink, weight * 0.5, M.brass)
    rect(a + 0.07, STAGE - 0.13, b - 0.07, STAGE - 0.01, 0.015, 0.015, 0.03, 0.03)
  }
  const lx = KEYS_MID
  solid(p, ink, weight * 0.6, M.lacquer)
  for (const s of [-1, 1]) poly([[lx + s * 0.2, CASE_FOOT], [lx + s * 0.27, CASE_FOOT], [lx + s * 0.16, 2.32], [lx + s * 0.1, 2.32]])
  rect(lx - 0.36, 2.28, lx + 0.36, 2.42, 0.03)
  solid(p, ink, weight * 0.45, M.brass)
  for (const dx of [-0.21, 0, 0.21]) rect(lx + dx - 0.05, 2.4, lx + dx + 0.05, 2.47, 0.02)

  // The light on it: a soft pool over the keys and the fallboard.
  glow(p, k, KEYS_MID + 0.3, -0.25, 3.4, L, 0.1 * lit, 1.3, 0.55)
}

/** The i-th white key from the lowest, as MIDI. */
function whiteMidi(i: number): number {
  const steps = [0, 2, 4, 5, 7, 9, 11]
  return LOW + 12 * Math.floor(i / 7) + steps[i % 7]
}

/** The cells a piano claims, in its own frame. */
export const PIANO_CELLS: [number, number, number, number] = [CX0 - 0.5, PIANO.lidTop - 0.3, CX1 + 0.5, STAGE]
