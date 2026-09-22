import recording from '../../../../../../docs/promo/cornfield-chase-zimmer.mp3'
import type p5 from 'p5'
import type { Theme } from '../../../../../../src/core/themes'
import { R, ball, laneAt, laneTime, type BallState, type Lane, type Piece, type PieceCtx, type Pt, type Seg } from '../../../parts'
import type { Box, Placed } from '../../../plan'
import { Show, type ShowPoint } from '../../../show'
import type { Universe } from '../../../universe'
import type { Backdrop, World } from '../../../worlds'
import type { Framing, Performance } from '../../registry'

/**
 * Cornfield Chase, as two voices on one clock.
 *
 * The hero ball plays the arpeggio. A ghost actor plays the bass. They share
 * one horizontal progress — the hero's lane x — and differ in height, in how
 * often they strike, and in the size of the machine that receives the hit.
 * Nothing here is sampled from a mutable trail: a frame is a function of
 * show time, so a scrub backward shows the same echoes the playhead did.
 *
 * The pulse is the piano band's period over the chase, phase-aligned to the
 * recording. It is one grid for both voices, not a transcription of every note.
 */

/** Seconds into the recording at which the show's zero falls. The dense chase. */
export const AUDIO_OFFSET = 70.146
/** The shared note pulse, in seconds. Bass strikes are whole counts of it. */
export const PULSE = 0.176
/** Cells per second along the shared horizontal. */
const SPEED = 2.5
const ORIGIN = 1.8
/** How long the clip holds, in seconds of the recording from `AUDIO_OFFSET`. */
export const DURATION = 48

const ARP_RAIL = 0.28
const BASS_RAIL = 1.86
/** Where the ghost rides between mouths: on the bass rail, as the hero sits on a note. */
const BASS_RIDE = BASS_RAIL - R

/** How early a target is allowed to be seen, and how long the ink of a hit takes to leave. */
const ARP_LEAD = 0.7
const BASS_LEAD = 1.45
const ARP_FADE = 0.26
const BASS_FADE = 0.42
const ARP_ECHO = 0.85
const BASS_ECHO = 1.7

/**
 * Cells the composed frame shows top to bottom, before Zoom. Zoom divides by
 * 1.5 (`stage.ts`). 6.3 leaves both lanes inside that tighter frame, with the
 * next targets still ahead of the ball.
 */
const CAM_CELLS = 6.3
const CAM_Y = 0.5
const LEAD = 1.0

const HERO = '#E24E2A'
const ARP = '#F0B429'
const BASS = '#1B4F6B'

const theme: Theme = {
  name: 'chase',
  label: 'Chase',
  bg: '#F3EEE4',
  ink: '#1A1714',
  colors: [HERO, ARP, BASS, '#C4552A'],
  weight: 1.15,
  note: 'Warm paper and heavy ink, so a zoomed frame still reads.',
}

/** A rising figure, then the hand drops back toward the rail. All of it sits above the rail. */
const SHAPE = [-0.22, -0.46, -0.7, -0.96, -0.58, -0.34]

type Kind = 'note' | 'portal' | 'disk' | 'anvil'

interface Hit {
  t: number
  x: number
  y: number
  r: number
  kind: Kind
}

const xAt = (t: number): number => ORIGIN + SPEED * t

function mouthOf(kind: Kind): { y: number; r: number } {
  // The ghost aims at the centre of the silhouette. Portals stand tallest.
  if (kind === 'portal') return { y: BASS_RAIL - 0.02 - 0.46, r: 0.5 }
  if (kind === 'disk') return { y: BASS_RAIL - 0.05 - 0.4, r: 0.4 }
  return { y: BASS_RAIL - 0.18, r: 0.48 }
}

function bassKind(n: number, gap: number): Kind {
  // A portal needs room. The climax tightens the bass and drops to disk and anvil.
  if (gap < 2.15) return n % 2 ? 'anvil' : 'disk'
  return (['portal', 'disk', 'anvil'] as const)[n % 3]
}

function buildScore(): { arp: Hit[]; bass: Hit[] } {
  const arp: Hit[] = []
  const bass: Hit[] = []
  const n = Math.floor((DURATION - 0.12) / PULSE)
  for (let i = 0; i <= n; i++) {
    const t = i * PULSE
    const x = xAt(t)
    // The opening states the figure on the even pulses. The chase then fills every one.
    if (i >= 64 || i % 2 === 0) {
      const step = i % 6
      arp.push({ t, x, y: ARP_RAIL + SHAPE[step], r: step === 0 ? 0.2 : 0.145, kind: 'note' })
    }
    const every = i < 64 ? 8 : i < 176 ? 6 : 4
    if (i % every === 0) {
      const prev = bass[bass.length - 1]
      const gap = prev ? x - prev.x : 99
      if (gap >= 1.72) {
        const kind = bassKind(bass.length, gap)
        const mouth = mouthOf(kind)
        bass.push({ t, x, y: mouth.y, r: mouth.r, kind })
      }
    }
  }
  return { arp, bass }
}

const { arp, bass } = buildScore()

function buildLane(): Lane {
  const segs: Seg[] = []
  for (let i = 0; i < arp.length - 1; i++) {
    const a = arp[i]
    const b = arp[i + 1]
    const dur = b.t - a.t
    // Arc lifts the hop. It does not move x, so the ghost stays locked to the hero.
    segs.push({ from: [a.x, a.y], to: [b.x, b.y], dur, arc: Math.min(0.16, 0.04 + dur * 0.1) })
  }
  const last = arp[arp.length - 1]
  segs.push({ from: [last.x, last.y], to: [xAt(DURATION), last.y], dur: DURATION - last.t })
  return { segs, fire: 0 }
}

const lane: Lane = buildLane()

function smooth(u: number): number {
  const t = Math.max(0, Math.min(1, u))
  return t * t * (3 - 2 * t)
}

/** 0 before the target is allowed on stage, 1 at the strike and after. */
function shown(age: number, lead: number, fade: number): number {
  if (age >= 0) return 1
  const seen = age + lead
  if (seen <= 0) return 0
  return smooth(seen / fade)
}

function tint(p: p5, hex: string, alpha: number) {
  const c = p.color(hex)
  c.setAlpha(Math.max(0, Math.min(255, alpha)))
  return c
}

function ring(p: p5, k: number, hex: string, weight: number, x: number, y: number, age: number, decay: number, r0: number, grow: number, maxA: number): void {
  if (age < 0 || age > decay) return
  const u = age / decay
  p.noFill()
  p.stroke(tint(p, hex, Math.pow(1 - u, 1.55) * maxA))
  p.strokeWeight(Math.max(1.25, weight * (1.55 - 0.7 * u)))
  p.circle(x * k, y * k, (r0 + grow * u) * 2 * k)
}

function ticks(p: p5, k: number, ink: string, weight: number, x: number, y: number, r: number, age: number, alpha: number): void {
  if (alpha < 8) return
  const spin = age * 2.2
  p.stroke(tint(p, ink, alpha))
  p.strokeWeight(Math.max(1, weight * 0.85))
  p.noFill()
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * Math.PI * 2
    const r0 = r + 0.05
    const r1 = r0 + 0.11
    p.line((x + Math.cos(a) * r0) * k, (y + Math.sin(a) * r0) * k, (x + Math.cos(a) * r1) * k, (y + Math.sin(a) * r1) * k)
  }
}

function notehead(p: p5, c: PieceCtx, hit: Hit, age: number): void {
  const wake = shown(age, ARP_LEAD, ARP_FADE)
  if (wake <= 0) return
  const { k, ink, weight } = c
  const a = Math.round(255 * wake)
  const struck = age >= 0
  p.stroke(tint(p, ink, a))
  p.strokeWeight(weight * (struck ? 1.15 : 1.35))
  p.line(hit.x * k, hit.y * k, hit.x * k, ARP_RAIL * k)
  if (struck) p.fill(tint(p, ARP, a))
  else p.noFill()
  p.circle(hit.x * k, hit.y * k, hit.r * 2 * k)
  if (!struck) ticks(p, k, ink, weight, hit.x, hit.y, hit.r, age, Math.round(a * 0.85))
}

function portal(p: p5, c: PieceCtx, hit: Hit, age: number): void {
  const wake = shown(age, BASS_LEAD, BASS_FADE)
  if (wake <= 0) return
  const { k, ink, bg, weight } = c
  const a = Math.round(255 * wake)
  const struck = age >= 0
  const rw = 0.78
  const rh = 0.92
  const stroke = tint(p, ink, a)
  p.stroke(stroke)
  p.strokeWeight(weight * 1.9)
  if (struck) p.fill(tint(p, BASS, a))
  else p.noFill()
  p.ellipse(hit.x * k, hit.y * k, rw * k, rh * k)
  // The mouth is paper, so the ghost reads as inside the ring rather than on a disk.
  p.fill(tint(p, bg, a))
  p.stroke(stroke)
  p.strokeWeight(weight * 1.25)
  p.ellipse(hit.x * k, hit.y * k, (rw - 0.24) * k, (rh - 0.22) * k)
  p.stroke(stroke)
  p.strokeWeight(weight * 1.8)
  const foot = hit.y + rh / 2
  p.line(hit.x * k, foot * k, hit.x * k, BASS_RAIL * k)
  p.line((hit.x - 0.22) * k, BASS_RAIL * k, (hit.x + 0.26) * k, BASS_RAIL * k)
  if (!struck) ticks(p, k, ink, weight, hit.x, hit.y, rw / 2, age, Math.round(a * 0.9))
}

function disk(p: p5, c: PieceCtx, hit: Hit, age: number): void {
  const wake = shown(age, BASS_LEAD, BASS_FADE)
  if (wake <= 0) return
  const { k, ink, weight } = c
  const a = Math.round(255 * wake)
  const struck = age >= 0
  p.stroke(tint(p, ink, a))
  p.strokeWeight(weight * 1.85)
  p.line(hit.x * k, (hit.y + hit.r) * k, hit.x * k, BASS_RAIL * k)
  if (struck) p.fill(tint(p, BASS, a))
  else p.noFill()
  p.circle(hit.x * k, hit.y * k, hit.r * 2 * k)
  if (!struck) ticks(p, k, ink, weight, hit.x, hit.y, hit.r, age, Math.round(a * 0.9))
}

function anvil(p: p5, c: PieceCtx, hit: Hit, age: number): void {
  const wake = shown(age, BASS_LEAD, BASS_FADE)
  if (wake <= 0) return
  const { k, ink, weight } = c
  const a = Math.round(255 * wake)
  const struck = age >= 0
  const w = 0.92
  const h = 0.36
  const hw = w / 2
  const hh = h / 2
  p.stroke(tint(p, ink, a))
  p.strokeWeight(weight * 1.75)
  if (struck) p.fill(tint(p, BASS, a))
  else p.noFill()
  // A block with a horn in the direction of travel, sitting on the rail.
  p.beginShape()
  p.vertex((hit.x - hw) * k, (hit.y + hh) * k)
  p.vertex((hit.x + hw + 0.16) * k, (hit.y + hh) * k)
  p.vertex((hit.x + hw) * k, (hit.y - hh) * k)
  p.vertex((hit.x - hw + 0.1) * k, (hit.y - hh) * k)
  p.endShape(p.CLOSE)
  if (!struck) ticks(p, k, ink, weight, hit.x, hit.y, w / 2, age, Math.round(a * 0.75))
}

function echo(p: p5, c: PieceCtx, hit: Hit, age: number): void {
  const { k, ink, weight } = c
  if (hit.kind === 'note') {
    ring(p, k, ink, weight, hit.x, hit.y, age, ARP_ECHO, hit.r + 0.02, 0.34, 210)
    ring(p, k, ARP, weight * 0.8, hit.x, hit.y, age, ARP_ECHO * 0.72, hit.r * 0.4, 0.16, 160)
    return
  }
  // A stamp that stays put, then a slower ring that walks out: the hit, and its afterimage.
  if (age >= 0 && age <= BASS_ECHO) {
    const u = age / BASS_ECHO
    p.noStroke()
    p.fill(tint(p, BASS, Math.pow(1 - u, 1.25) * 90))
    p.circle(hit.x * k, hit.y * k, hit.r * 1.15 * 2 * k)
  }
  ring(p, k, ink, weight * 1.3, hit.x, hit.y, age, BASS_ECHO, hit.r, 0.72, 220)
  ring(p, k, BASS, weight, hit.x, hit.y, age, BASS_ECHO * 0.62, hit.r * 0.55, 0.28, 180)
}

/** The ghost's height: up into the next mouth, then back down onto the rail. Its x is the hero's. */
function ghostAt(t: number): { x: number; y: number; scale: number } {
  const x = laneAt(lane, t).x
  let y = BASS_RIDE
  let prev: Hit | null = null
  let next: Hit | null = null
  for (const hit of bass) {
    if (hit.t <= t) prev = hit
    else {
      next = hit
      break
    }
  }
  const fall = 0.24
  const rise = 0.5
  if (prev && t - prev.t < fall) y = prev.y + (BASS_RIDE - prev.y) * smooth((t - prev.t) / fall)
  if (next && next.t - t < rise) {
    const rising = BASS_RIDE + (next.y - BASS_RIDE) * smooth(1 - (next.t - t) / rise)
    if (Math.abs(rising - BASS_RIDE) >= Math.abs(y - BASS_RIDE)) y = rising
  }
  let scale = 1.42
  if (prev) {
    const age = t - prev.t
    if (age < 0.18) scale += 0.4 * (1 - age / 0.18)
  }
  return { x, y, scale }
}

function paint(p: p5, c: PieceCtx): void {
  const { k, ink, weight, t } = c
  const x0 = xAt(0) - 1
  const x1 = xAt(DURATION) + 1
  p.stroke(ink)
  p.strokeWeight(weight * 1.05)
  p.line(x0 * k, ARP_RAIL * k, x1 * k, ARP_RAIL * k)
  p.strokeWeight(weight * 2.15)
  p.line(x0 * k, BASS_RAIL * k, x1 * k, BASS_RAIL * k)

  for (const hit of bass) echo(p, c, hit, t - hit.t)
  for (const hit of arp) echo(p, c, hit, t - hit.t)
  for (const hit of bass) {
    const age = t - hit.t
    if (hit.kind === 'portal') portal(p, c, hit, age)
    else if (hit.kind === 'anvil') anvil(p, c, hit, age)
    else disk(p, c, hit, age)
  }
  for (const hit of arp) notehead(p, c, hit, t - hit.t)

  const ghost = ghostAt(t)
  ball(p, k, ink, weight * 1.2, BASS, ghost.x * k, ghost.y * k, 0, ghost.scale, 1, 0, true)
}

const stagePiece: Piece<null> = {
  name: 'voices',
  weight: 0,
  place: () => null,
  draw(p, _state, c) {
    paint(p, c)
  },
}

const hero: BallState = { color: HERO, ghost: false, id: 0 }

const cells: Pt[] = []
const reach = xAt(DURATION) + 2
for (let x = 0; x <= reach; x += 2) cells.push([x, -1], [x, 1], [x, 3])

const placed: Placed = {
  piece: stagePiece,
  state: null,
  col: 0,
  row: 0,
  mirror: 1,
  cells,
  lane,
  start: 0,
  span: DURATION,
  ballIn: hero,
  changes: [],
  points: 0,
}

const world: World = {
  name: 'cornfield',
  label: 'Cornfield',
  note: 'Two voices on one progress.',
  themes: [theme],
  backdrops: ['plain'] as Backdrop[],
  pieces: [],
  tastes: { arranged: {} },
}

const bounds: Box = { x0: -1.5, y0: -2, x1: reach, y1: 4 }

const stage: Universe = {
  index: 0,
  seed: 'cornfield-voices',
  world,
  theme,
  taste: 'arranged',
  ballColor: HERO,
  backdrop: 'plain',
  pieces: [placed],
  box: bounds,
  journey: DURATION,
  bounds,
}

function problems(): string[] {
  const out: string[] = []
  const span = laneTime(lane)
  if (Math.abs(span - DURATION) > 1e-6) out.push(`lane is ${span}s, show is ${DURATION}s`)
  for (const hit of bass) {
    if (Math.abs(laneAt(lane, hit.t).x - hit.x) > 0.03) out.push(`bass at ${hit.t.toFixed(3)}s is off the hero's x`)
  }
  for (let i = 1; i < bass.length; i++) {
    if (bass[i].x - bass[i - 1].x < 1.7) out.push('two bass silhouettes share a cell')
  }
  if (!arp.length || !bass.length) out.push('a voice has no strikes')
  return out
}

const broken = problems()
if (broken.length) throw new Error(`Cornfield voices: ${broken.join('; ')}`)

/** One world, one kinematic lane. The picture is whatever `at` says, at any time. */
export class VoicesShow extends Show {
  constructor() {
    super('cornfield-voices')
  }

  override worldAt(_index: number): World {
    return world
  }

  override universe(_index: number): Universe {
    return stage
  }

  override begin(_index: number): number {
    return 0
  }

  override indexAt(_time: number): number {
    return 0
  }

  override at(time: number): ShowPoint {
    const t = clampTime(time)
    return { ...laneAt(lane, t), placed, ball: hero, universe: stage, local: t, begin: 0 }
  }

  /** Follow the shared progress, a little ahead, so the waking targets sit in frame. */
  cameraAt(time: number): Framing {
    const here = laneAt(lane, clampTime(time))
    return { x: here.x + LEAD, y: CAM_Y, cells: CAM_CELLS }
  }
}

function clampTime(time: number): number {
  return Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0))
}

const show = new VoicesShow()

export const performance: Performance = {
  show,
  duration: DURATION,
  camera: (t) => show.cameraAt(t),
  soundtrack: {
    src: recording,
    offset: AUDIO_OFFSET,
    credit: 'Hans Zimmer — Cornfield Chase, from Interstellar (2014). Private tech demo; not for public Shows.',
    href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
  },
}
