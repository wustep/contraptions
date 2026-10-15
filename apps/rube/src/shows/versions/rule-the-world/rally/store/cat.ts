import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { lastOf } from '../kit'
import { at, a } from '../music'
import { blob, ctxOf, ease, ellipse, flash, rgba, shape, type Pen } from '../pen'
import { BOLTS, CLOCK_SIX, DIAL_AT, DOWN, FLOOR, INTO, MURRAY_STEPS, PART1, SWUNG, WAY } from './geo'

/**
 * The store's morning, besides Marty: its cat, and a mouse.
 *
 * The cat bolted when the bat fired and came back to the fitting chairs (`life.ts`). As the two of them sit on the
 * carton it puts its head through the bottom of the stockroom's curtain, comes out and sits to watch them; when he goes
 * it trots after him, in at the office door behind him, across the floor to Murray's desk, and up onto it, where it
 * sits by the lamp through the whole of the safe, its head going up and down with him on the dial, its ears back at
 * the bolts. At six it hears Murray: it gets up, drops off the desk and trots out to the door to meet him, its tail up.
 *
 * The mouse lives under the stockroom's shelving: it comes out along the boards while the two of them sit, sniffs at
 * the carton, sits up; and is gone back under the shelf the moment the cat's head comes through the curtain.
 */

const INK = '#0C0908'
/** Its eye: a dull yellow-green, an eye's colour, not a light. */
const EYE = '#8E9448'
const MOUSE = '#4E443A'

/** The boards it walks on, a little in front of the wall's foot; Murray's desk top. */
const WALK = FLOOR + 0.1
const DESK_Y = 0.15
const DESK_X = 27.74
const DESK_FOOT = 27.25

/** Its times. */
const PEEK = at(12, 1)
const OUT = at(12, 3)
const SAT = OUT + 0.55
const UP = DOWN - 0.2
const DOORWAY = at(14, 2) + 0.1
const AT_DESK = at(15, 1) - 0.05
const LEAP = at(15, 3) - 0.3
const ON_DESK = at(15, 3)
const STAND = MURRAY_STEPS[0]
const DROP = MURRAY_STEPS[1]
const LANDED = DROP + 0.3
const GONE = MURRAY_STEPS[6]

/** When it washes, on the desk. */
const WASHES: [number, number][] = [[at(21, 3) + 0.3, at(22, 1) - 0.1], [at(22, 3), at(22, 4) + 0.3]]

const SIT_X = 16.2
const DOOR_X = 22.7
/** Where the curtain's two halves meet (`draw.ts`), and where it parts round its head. */
const PARTING = (PART1[0] + PART1[1]) / 2

/** How far the curtain's near half is pushed aside at its foot by the cat's head coming through (0 to 1). */
export function catPart(t: number): number {
  if (t < PEEK - 0.15 || t > SAT + 0.4) return 0
  return ease((t - PEEK + 0.15) / 0.35) * (1 - ease((t - OUT - 0.35) / 0.6))
}

interface Pose {
  x: number
  /** Its feet. */
  y: number
  /** Which way it faces: 1 right, -1 left. */
  dir: number
  /** 0 standing, 1 sitting. */
  sit: number
  /** Its stride's phase, and how much it strides (0 still). */
  gait: number
  stride: number
  /** Its head lifted (+) or lowered (-), cells. */
  look: number
  /** Its ears laid back, 0 to 1. */
  ears: number
  /** Its tail up (walking, greeting) 0 to 1. */
  tailUp: number
  /** It is coming through the curtain: only what is past the parting shows. */
  peek?: number
  /** How low it creeps, cells. */
  low?: number
  /** Washing: its head down to a forepaw lifted to it, 0 to 1. */
  wash?: number
}

const lerp = (p: number, q: number, u: number) => p + (q - p) * u
/** Marty, for where it looks. */
const marty = (t: number): Pt => WAY.at(t)

/** Where the cat is and what it is doing at `t`, or null when it is not in the stockroom or the office. */
function catAt(t: number): Pose | null {
  if (t < PEEK - 0.15 || t > GONE) return null
  const base: Pose = { x: SIT_X, y: WALK, dir: 1, sit: 1, gait: 0, stride: 0, look: 0, ears: 0, tailUp: 0 }
  // Its head lifted toward him, or lowered, as he is above it or below.
  const lookAt = (hy: number) => Math.max(-0.035, Math.min(0.035, -(marty(t)[1] - hy) * 0.04))
  // Its head through the curtain where it parts at the foot, looking at the two of them; then out, and down to sit.
  if (t < OUT) {
    const u = ease((t - PEEK + 0.15) / 0.4)
    return { ...base, x: PARTING - 0.12 + 0.24 * u, sit: 0, peek: 1, low: 0.05, look: 0.01 * sway(t, 3, 2.1) }
  }
  if (t < SAT) {
    const u = (t - OUT) / (SAT - OUT)
    return { ...base, x: lerp(PARTING + 0.12, SIT_X, ease(u)), sit: ease((u - 0.6) / 0.4), gait: (t - OUT) * 14, stride: 1 - ease((u - 0.6) / 0.4), tailUp: 0.4, peek: 1, low: 0.05 * (1 - ease(u / 0.6)) }
  }
  // Sitting, watching them, its head following him; it gets up as he goes, and trots after him.
  if (t < UP) return { ...base, look: lookAt(WALK - 0.36) * 0.7 }
  if (t < AT_DESK) {
    const u = (t - UP) / (AT_DESK - UP)
    // Across the stockroom, through the door just behind him, across the office to the foot of the desk.
    const k = (t - UP) / (DOORWAY - UP)
    const x = t < DOORWAY ? lerp(SIT_X, DOOR_X, ease(Math.min(1, k)) * 0.15 + Math.min(1, k) * 0.85) : lerp(DOOR_X, DESK_FOOT, ease((t - DOORWAY) / (AT_DESK - DOORWAY)) * 0.3 + ((t - DOORWAY) / (AT_DESK - DOORWAY)) * 0.7)
    const stop = ease((u - 0.92) / 0.08)
    return { ...base, x, sit: stop, gait: (t - UP) * 15, stride: 1 - stop, tailUp: 0.85 }
  }
  // At the desk's foot, then up onto it (into the close shot on the dial), and sits, facing him.
  if (t < LEAP) return { ...base, x: DESK_FOOT, dir: -1, sit: 1, look: 0.03 }
  if (t < ON_DESK) {
    const u = (t - LEAP) / (ON_DESK - LEAP)
    const x = lerp(DESK_FOOT, DESK_X, u)
    const y = lerp(WALK, DESK_Y, u) - 0.55 * Math.sin(Math.PI * u)
    return { ...base, x, y, dir: -1, sit: 0, stride: 0.3, gait: 1.2, tailUp: 0.6 }
  }
  if (t < STAND) {
    const hy = DESK_Y - 0.36
    // The bolts, and the door swung wide: ears back, a flinch.
    const bolts = flash(t - BOLTS, 0.5)
    const swung = flash(t - SWUNG, 0.4)
    const into = ease((t - INTO) / 0.3) * (1 - ease((t - INTO - 2.5) / 1))
    const settle = ease((t - ON_DESK) / 0.25)
    // At six, the clock: its head up and round toward the door, listening for him.
    const six = ease((t - CLOCK_SIX) / 0.4)
    // While he sits in the bills it washes a paw, an eye on him between licks.
    const wash = WASHES.reduce((m, [a0, a1]) => Math.max(m, ease((t - a0) / 0.3) * (1 - ease((t - a1) / 0.3))), 0)
    // The safe's door swung wide and banging on its stop: it springs up on all fours, lands, and sits again slowly.
    const j = (t - SWUNG) / 0.38
    const jump = j > 0 && j < 1 ? 0.13 * Math.sin(Math.PI * j) : 0
    const stood = ease(j / 0.15) * (1 - ease((t - SWUNG - 0.7) / 0.6))
    return { ...base, x: DESK_X - 0.03 * into + 0.05 * stood, y: DESK_Y - jump, dir: -1, sit: settle * (1 - stood), look: lookAt(hy) * (1 - six) + 0.03 * six + 0.02 * swung, ears: Math.max(bolts, swung * 0.6), wash, tailUp: stood * 0.7 }
  }
  // Six: Murray's step. It gets up, drops off the desk and trots to the door to meet him, tail up.
  if (t < DROP) return { ...base, x: DESK_X, y: DESK_Y, dir: -1, sit: 1 - ease((t - STAND) / 0.3), look: 0.02, tailUp: ease((t - STAND) / 0.4) }
  if (t < LANDED) {
    const u = (t - DROP) / (LANDED - DROP)
    return { ...base, x: lerp(DESK_X, DESK_X - 0.55, u), y: lerp(DESK_Y, WALK, u * u) - 0.12 * Math.sin(Math.PI * u), dir: -1, sit: 0, stride: 0.4, gait: 2, tailUp: 0.8 }
  }
  const u = (t - LANDED) / (GONE - LANDED)
  return { ...base, x: lerp(DESK_X - 0.55, DOOR_X - 0.4, u), dir: -1, sit: 0, gait: (t - LANDED) * 12, stride: 1, tailUp: 1 }
}

/** The cat's ears twitch at each click of the dial. */
const twitchAt = (t: number): number => {
  const { ago } = lastOf(DIAL_AT, t)
  return ago < 0.3 ? flash(ago, 0.08) : 0
}

/** A black cat side on, its feet at (x, y), from a pose. */
function cat(pen: Pen, t: number, o: Pose): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const d = o.dir
  const s = o.sit
  const X = (dx: number) => o.x + d * dx
  // Body: long and level standing, upright and rounder sitting.
  const breath = 0.006 * Math.sin(t * 2.4)
  const low = o.low ?? 0
  const bodyC: Pt = [X(lerp(0, -0.03, s)), o.y - lerp(0.17, 0.13, s) + low]
  const brx = lerp(0.17, 0.11, s)
  const bry = lerp(0.07, 0.115, s) + breath
  // Head: forward and level standing, up over the chest sitting.
  const head: Pt = [X(lerp(0.2, 0.055, s)), o.y - lerp(0.25, 0.345, s) - o.look + low * 0.8]
  const ink = INK
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgba(pen, ink, 1)
  // Legs: walking, two pairs swinging opposite; sitting, the forelegs straight down from the chest.
  if (s < 0.95) {
    ctx.lineWidth = 0.032 * k
    ctx.beginPath()
    for (const [dx, ph] of [[0.11, 0], [0.07, Math.PI], [-0.11, Math.PI], [-0.14, 0]] as const) {
      const sw = 0.055 * o.stride * Math.sin(o.gait + ph)
      const hip: Pt = [X(dx * (1 - s * 0.5)), o.y - 0.15 + low]
      const foot: Pt = [X(dx * (1 - s * 0.5) + sw), o.y - 0.01 + 0.025 * o.stride * Math.max(0, Math.sin(o.gait + ph + 1.4))]
      ctx.moveTo(hip[0] * k, hip[1] * k)
      ctx.lineTo(foot[0] * k, foot[1] * k)
    }
    ctx.globalAlpha = 1 - s
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.restore()
  if (s > 0.05) {
    // Sitting: the haunch round on the boards, the back rising to the neck, the chest down to the forepaws together.
    const b = breath * 2
    blob(pen, [
      [X(-0.15), o.y],
      [X(-0.165), o.y - 0.08],
      [X(-0.12), o.y - 0.18 - b],
      [X(-0.035), o.y - 0.27 - b],
      [X(0.04), o.y - 0.3 - b],
      [X(0.085), o.y - 0.23 - b],
      [X(0.09), o.y - 0.11],
      [X(0.075), o.y - 0.015],
      [X(0.115), o.y],
    ].map(([x, y]) => [o.x + (x - o.x) * s, o.y + (y - o.y) * s] as Pt), ink, 1)
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgba(pen, ink, 1)
  // The tail: up and hooked when it walks (or comes to greet him), round its feet when it sits, the tip flicking.
  const flick = 0.045 * sway(t, 5, 1.7) + 0.035 * Math.max(0, Math.sin(t * 4.3)) ** 8
  const rump: Pt = [X(-lerp(0.16, 0.13, s)), o.y - lerp(0.19, 0.06, s) + low]
  const up = o.tailUp * (1 - s)
  const tail: Pt[] = s > 0.5
    ? [rump, [X(-0.2), o.y - 0.02], [X(-0.05), o.y - 0.005], [X(0.12 + flick), o.y - 0.03 - flick]]
    : [rump, [X(-0.22 - 0.06 * (1 - up)), o.y - 0.2 - 0.12 * up], [X(-0.24 - 0.12 * (1 - up)), o.y - 0.24 - 0.22 * up + 0.06 * (1 - up)], [X(-0.2 - 0.14 * (1 - up) + flick), o.y - 0.25 - 0.3 * up + 0.1 * (1 - up)]]
  ctx.lineWidth = 0.03 * k
  ctx.beginPath()
  ctx.moveTo(tail[0][0] * k, tail[0][1] * k)
  ctx.bezierCurveTo(tail[1][0] * k, tail[1][1] * k, tail[2][0] * k, tail[2][1] * k, tail[3][0] * k, tail[3][1] * k)
  ctx.stroke()
  ctx.restore()
  if (s < 0.95) {
    ellipse(pen, bodyC, brx, bry, ink)
    // Neck to head.
    ellipse(pen, [X(0.13), o.y - 0.21 - o.look * 0.5 + low * 0.9], 0.055, 0.06, ink)
  }
  const wash = o.wash ?? 0
  if (wash > 0.01) {
    // The paw lifted to the mouth, the head ducked to it, the lick going.
    const lick = 0.012 * Math.sin(t * 13) * wash
    head[0] += d * 0.01 * wash
    head[1] += 0.05 * wash + lick
    const paw: Pt = [X(0.09), o.y - 0.17 - 0.06 * wash]
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(pen, ink, 1)
    ctx.lineWidth = 0.034 * k
    ctx.beginPath()
    ctx.moveTo(X(0.06) * k, (o.y - 0.12) * k)
    ctx.lineTo(paw[0] * k, paw[1] * k)
    ctx.stroke()
    ctx.restore()
  }
  ellipse(pen, head, 0.068, 0.058, ink)
  // The muzzle, and the ears: pricked, flicking back at a click, laid flat at a fright.
  ellipse(pen, [head[0] + d * 0.055, head[1] + 0.018], 0.03, 0.022, ink)
  const tw = twitchAt(t)
  const back = Math.max(o.ears, tw * 0.5)
  for (const [ex, lift] of [[-0.03, 1], [0.025, 0.9]] as const) {
    const bx = head[0] + d * ex
    const tip: Pt = [bx - d * (0.01 + 0.05 * back), head[1] - 0.1 * lift + 0.05 * back]
    shape(pen, [[bx - 0.025, head[1] - 0.035], [bx + 0.025, head[1] - 0.04], tip], ink)
  }
  ellipse(pen, [head[0] + d * 0.03, head[1] - 0.008], 0.011, 0.008 * (0.3 + 0.7 * (1 - back)), EYE)
}

/** The cat coming through the curtain (its head first, then the rest of it): drawn over the curtain, cut at its parting. */
export function drawCatThrough(pen: Pen, t: number): void {
  const o = catAt(t)
  if (!o || o.peek === undefined) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  // Only what has come out past the parting shows; the rest of it is still in the store behind the velvet.
  ctx.beginPath()
  ctx.rect((PARTING - 0.02) * k, (FLOOR - 0.7) * k, 2 * k, 0.9 * k)
  ctx.clip()
  cat(pen, t, o)
  ctx.restore()
}

/** The cat everywhere else: out in the stockroom, and in the office (drawn before Murray's shadow, which falls on it). */
export function drawCatAbout(pen: Pen, t: number): void {
  const o = catAt(t)
  if (!o || o.peek !== undefined) return
  cat(pen, t, o)
}

/* ------------------------------------------------------------------ the mouse */

const MOUSE_OUT = at(11, 1) + 0.1
const MOUSE_STOP = a(11, 2)
const MOUSE_UP = at(11, 4)
const MOUSE_HOME = PEEK + 0.45
const HOLE = 19.75
const SNIFF = 18.43

/** The mouse under the stockroom's shelving: out along the boards to the carton, a sniff, up on its haunches, and back. */
export function drawMouse(pen: Pen, t: number): void {
  if (t < MOUSE_OUT || t > MOUSE_HOME + 0.1) return
  let x = SNIFF
  let dir = -1
  let up = 0
  let run = 0
  if (t < MOUSE_STOP) {
    const u = (t - MOUSE_OUT) / (MOUSE_STOP - MOUSE_OUT)
    x = lerp(HOLE, SNIFF, ease(u) * 0.3 + u * 0.7)
    run = 1 - ease((u - 0.8) / 0.2)
  } else if (t < PEEK + 0.12) {
    // Up on its haunches; down again with a start at the cat's head through the curtain.
    up = ease((t - MOUSE_UP) / 0.15) * (1 - ease((t - PEEK) / 0.1))
  } else {
    // And home at a run.
    const u = (t - PEEK - 0.12) / (MOUSE_HOME - PEEK - 0.12)
    dir = 1
    x = lerp(SNIFF, HOLE, u)
    run = 1
  }
  const y = FLOOR + 0.06
  // Out of the dark under the shelf and back into it.
  const seen = Math.min(1, Math.max(0, (HOLE - x) / 0.25))
  const nose = 0.006 * Math.sin(t * 31) * (1 - run)
  const hop = run * 0.012 * Math.abs(Math.sin(t * 26))
  const col = rgba(pen, MOUSE, seen)
  const { k } = pen
  const ctx = ctxOf(pen.p)
  // Its tail, a thin curve along the boards behind it.
  ctx.save()
  ctx.strokeStyle = rgba(pen, MOUSE, 0.85 * seen)
  ctx.lineWidth = Math.max(0.6, 0.008 * k)
  ctx.beginPath()
  ctx.moveTo((x - dir * 0.05) * k, (y - 0.015) * k)
  ctx.quadraticCurveTo((x - dir * 0.12) * k, (y + 0.005 + 0.01 * Math.sin(t * 5)) * k, (x - dir * 0.17) * k, (y - 0.01) * k)
  ctx.stroke()
  ctx.restore()
  if (up > 0.02) {
    // Sat up on its haunches, sniffing the air.
    ellipse(pen, [x, y - 0.035 - 0.02 * up], 0.032, 0.035 + 0.012 * up, col)
    ellipse(pen, [x + dir * (0.02 - 0.01 * up), y - 0.075 - 0.035 * up + nose], 0.022, 0.02, col)
    ellipse(pen, [x + dir * 0.0, y - 0.1 - 0.035 * up], 0.01, 0.012, col)
    return
  }
  ellipse(pen, [x, y - 0.025 - hop], 0.05, 0.026, col)
  ellipse(pen, [x + dir * 0.048, y - 0.022 - hop + nose], 0.024, 0.017, col)
  ellipse(pen, [x + dir * 0.03, y - 0.045 - hop], 0.011, 0.013, col)
}
