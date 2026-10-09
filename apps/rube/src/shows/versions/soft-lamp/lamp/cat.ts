import { CAT } from './desk'
import { TRACKS, barTime, beatOf, drumsAt, grooving, smooth, trackAt } from './music'
import { LANDINGS, LAPS, ballAt } from './route'
import { rgba } from './sky'
import { hash, lampAt, lightAt, lit } from './world'

/**
 * The cat: a ginger kitten loafed on the desk between the mug and the books, under the sill, its face to the room.
 *
 * It has one job, and it is the audience's. It watches the ball: its head and eyes follow it, a little behind, as a
 * cat's do (along the sill over its head, down the stair beside it, into the cup); it blinks, and now and then slowly,
 * the way a cat says it is content; an ear flicks when the ball knocks the pot. And through a groove, a phrase at a
 * time, it either keeps watching or shuts its eyes and nods along on the beat, its tail tip swaying with it, as anyone
 * listening does. It breathes. When the last track's drums leave it puts its head down and sleeps, as the ball does in
 * the cup.
 *
 * Every part of it is a function of show time, so a scrub back is the same cat.
 */

type Ctx = CanvasRenderingContext2D

const FUR = '#8E5434'
const FUR_LIT = '#EDA468'
const FUR_DARK = '#6A3A26'
const CREAM_FUR = '#E9C9A2'
const EYE = '#C8D27A'

/** When it falls asleep: once the last track's drums have gone. */
const LAST = TRACKS[TRACKS.length - 1]
const SLEEP_FROM = barTime(LAST, LAST.exit) + 3
export const sleepAt = (t: number): number => smooth(t, SLEEP_FROM, SLEEP_FROM + 9)

/** Where it is looking: the ball, a little behind (its eyes lead its head). */
function gaze(t: number, lag: number): { x: number; y: number } {
  let x = 0
  let y = 0
  let w = 0
  for (let i = 0; i < 5; i++) {
    const b = ballAt(Math.max(0, t - lag * (0.4 + i * 0.4)))
    const k = 1 / (1 + i)
    x += b.x * k
    y += b.y * k
    w += k
  }
  return { x: x / w, y: y / w }
}

/**
 * How far it is lost in the music, 0 (watching) to 1 (eyes shut, nodding along): through the groove, while the ball
 * sits in the cup, a phrase (eight bars) at a time, each phrase its own choice; eased in and out over a beat and a bit.
 */
function vibing(n: number, phrase: number): number {
  return hash(n, phrase, 97) < 0.5 ? 1 : 0
}
export function vibeAt(t: number): number {
  const tr = trackAt(t)
  const lap = LAPS[tr.n]
  const bar = Math.floor(beatOf(tr, t) / 4)
  if (!lap || t < lap.cup + 4 * tr.period || (lap.lob !== null && t > lap.lob - 4 * tr.period) || !grooving(tr, bar)) return 0
  const phrase = Math.floor((bar - tr.entry) / 8)
  const start = barTime(tr, tr.entry + phrase * 8)
  const was = phrase > 0 ? vibing(tr.n, phrase - 1) : 0
  const now = vibing(tr.n, phrase)
  // Into it and out of it gently, and out of it again ahead of the lob, or a break.
  const v = was + (now - was) * smooth(t, start, start + 1.5 * tr.period)
  const nextBar = barTime(tr, bar + 1)
  const breakAhead = !grooving(tr, bar + 1) ? smooth(t, nextBar - 2 * tr.period, nextBar - 0.5 * tr.period) : 0
  const lobAhead = lap.lob !== null ? smooth(t, lap.lob - 8 * tr.period, lap.lob - 5 * tr.period) : 0
  return v * (1 - breakAhead) * (1 - lobAhead) * Math.min(1, (t - lap.cup - 4 * tr.period) / 2)
}

/** Its nod along, 0 to 1, deepest just after each beat. */
function nodAt(t: number): number {
  const tr = trackAt(t)
  const b = beatOf(tr, t)
  const f = b - Math.floor(b)
  return drumsAt(t) * Math.exp(-((f - 0.12) ** 2) / 0.03) + drumsAt(t) * 0.25 * Math.exp(-((f - 1.12) ** 2) / 0.03)
}

/** Its blinks: a quick one every few seconds, at its own times, and now and then a slow one. */
function blinkAt(t: number): number {
  const k = Math.floor(t / 4.3)
  const at = k * 4.3 + hash(k, 91) * 3
  const slow = hash(k, 92) < 0.25
  const d = slow ? 1.4 : 0.22
  const s = t - at
  if (s < 0 || s > d) return 0
  return Math.sin((Math.PI * s) / d) ** (slow ? 1 : 2)
}

/** An ear flick, after the ball knocks the pot or lands on the sill. */
function flickAt(t: number): number {
  let f = 0
  for (let i = LANDINGS.length - 1; i >= 0; i--) {
    const l = LANDINGS[i]
    const s = t - l.t - 0.08
    if (s < 0) continue
    if (s > 2) break
    if (l.on === 'pot' || l.on === 'sill') f += Math.exp(-s / 0.18) * Math.sin(s * 30)
  }
  return f
}

export function cat(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const sleep = sleepAt(t)
  const breath = Math.sin((2 * Math.PI * t) / (3.4 + sleep * 1.4))
  const l = Math.min(1, lightAt(CAT.chest, -0.4) * lamp * 1.6 + 0.12)
  const fur = (k = 1) => lit(FUR, FUR_LIT, l * k)
  const { x0, chest, top } = CAT

  // Its tail, curled round the front of it, the tip lifting and settling.
  const vibe = vibeAt(t)
  const tr = trackAt(t)
  // The tip lifts and settles on its own, or, nodding along, sways a bar at a time.
  const idle = 0.5 + 0.5 * Math.sin(t * 0.9 + Math.sin(t * 0.31) * 2)
  const sway = 0.5 + 0.5 * Math.sin((Math.PI * beatOf(tr, t)) / 2)
  const lift = (idle * (1 - vibe) + sway * vibe) * (1 - sleep)
  const tip = { x: chest - 0.2, y: -0.11 - 0.12 * lift }
  ctx.beginPath()
  ctx.moveTo(x0 + 0.08, -0.08)
  ctx.bezierCurveTo(x0 + 0.2, 0.02, chest - 0.55, 0.0, tip.x, tip.y)
  ctx.lineWidth = 0.13
  ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
  ctx.stroke()
  ctx.lineWidth = 0.13 - lw * 2
  ctx.strokeStyle = fur(0.8)
  ctx.stroke()

  // The body: a loaf, breathing.
  ctx.save()
  ctx.translate(0, 0)
  ctx.scale(1, 1 + 0.018 * breath)
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(x0 + 0.06, 0)
    ctx.bezierCurveTo(x0 - 0.06, -0.14, x0 - 0.02, top + 0.02, x0 + 0.3, top)
    ctx.bezierCurveTo(x0 + 0.62, top - 0.04, chest - 0.12, top - 0.02, chest, -0.38)
    ctx.bezierCurveTo(chest + 0.07, -0.25, chest + 0.06, -0.06, chest - 0.02, 0)
    ctx.closePath()
  }
  body()
  const g = ctx.createLinearGradient(x0, 0, chest, 0)
  g.addColorStop(0, fur(0.35))
  g.addColorStop(1, fur(1))
  ctx.fillStyle = g
  ctx.fill()
  // Its stripes, across the back.
  ctx.save()
  body()
  ctx.clip()
  ctx.strokeStyle = rgba(FUR_DARK, 0.55)
  ctx.lineWidth = 0.05
  for (let i = 0; i < 4; i++) {
    const sx = x0 + 0.2 + i * 0.2
    ctx.beginPath()
    ctx.moveTo(sx, top - 0.05)
    ctx.quadraticCurveTo(sx + 0.06, top + 0.12, sx + 0.02, top + 0.24)
    ctx.stroke()
  }
  // The window's cool light along its back.
  ctx.strokeStyle = rgba('#A8A8E6', 0.22)
  ctx.lineWidth = 0.05
  ctx.beginPath()
  ctx.moveTo(x0 + 0.05, top + 0.12)
  ctx.bezierCurveTo(x0 + 0.1, top, x0 + 0.5, top - 0.03, chest - 0.2, top + 0.02)
  ctx.stroke()
  ctx.restore()
  body()
  ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
  ctx.lineWidth = lw
  ctx.stroke()
  // Its chest's ruff, under its chin: what the head sits on.
  ctx.beginPath()
  ctx.ellipse(chest - 0.08, -0.34, 0.15, 0.22, -0.15, 0, Math.PI * 2)
  ctx.fillStyle = lit('#A88A70', CREAM_FUR, l * 0.9)
  ctx.fill()
  // The paws, tucked under its chest.
  ctx.beginPath()
  ctx.ellipse(chest - 0.13, -0.045, 0.1, 0.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = lit('#B49276', CREAM_FUR, l)
  ctx.fill()
  ctx.lineWidth = lw * 0.7
  ctx.stroke()
  ctx.restore()

  // The head: it turns to the ball, and when it sleeps it comes down onto its paws.
  const hx0 = CAT.head.x
  const hy0 = CAT.head.y + 0.26 * sleep + 0.006 * breath + 0.028 * vibe * nodAt(t)
  const look = gaze(t, 0.22)
  const dx = look.x - hx0
  const dy = look.y - hy0
  const d = Math.hypot(dx, dy) || 1
  const awake = 1 - sleep
  const watch = awake * (1 - vibe)
  const lx = (dx / d) * watch
  const ly = (dy / d) * watch + 0.25 * vibe * awake
  const hx = hx0 + lx * 0.035
  const hy = hy0 + ly * 0.02
  const tilt = lx * 0.12 - ly * 0.06 + sleep * 0.3 + vibe * awake * 0.08 * Math.sin((Math.PI * beatOf(tr, t)) / 2)
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(tilt)
  const RX = 0.25
  const RY = 0.215
  // The ears, the near one flicking.
  const flick = flickAt(t) * awake
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * 0.14, -0.13)
    ctx.rotate(side * 0.25 + (side > 0 ? flick * 0.35 : 0) - side * sleep * 0.25)
    ctx.beginPath()
    ctx.moveTo(-0.085, 0.04)
    ctx.quadraticCurveTo(-0.04, -0.12, 0.0, -0.16)
    ctx.quadraticCurveTo(0.05, -0.1, 0.085, 0.04)
    ctx.closePath()
    ctx.fillStyle = fur(side > 0 ? 1 : 0.6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
    ctx.lineWidth = lw
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-0.04, 0.02)
    ctx.quadraticCurveTo(-0.01, -0.07, 0.0, -0.1)
    ctx.quadraticCurveTo(0.025, -0.06, 0.04, 0.02)
    ctx.fillStyle = rgba('#E59A8C', 0.7)
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath()
  ctx.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2)
  const hg = ctx.createLinearGradient(-RX, 0, RX, 0)
  hg.addColorStop(0, fur(0.5))
  hg.addColorStop(1, fur(1))
  ctx.fillStyle = hg
  ctx.fill()
  ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
  ctx.lineWidth = lw
  ctx.stroke()
  // Its forehead's stripes, and the cream of its muzzle.
  ctx.strokeStyle = rgba(FUR_DARK, 0.6)
  ctx.lineWidth = 0.03
  for (const sx of [-0.06, 0, 0.06]) {
    ctx.beginPath()
    ctx.moveTo(sx, -RY + 0.03)
    ctx.lineTo(sx * 0.8, -RY + 0.1)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.ellipse(0, 0.09, 0.13, 0.085, 0, 0, Math.PI * 2)
  ctx.fillStyle = lit('#A88A70', CREAM_FUR, l)
  ctx.fill()

  // The eyes: open as wide as it is interested, heavy while the ball sits, shut to blink and to sleep.
  const open = Math.max(0, (1 - blinkAt(t)) * awake * (1 - vibe))
  const happy = vibe > 0.5 && sleep < 0.5
  const px = lx * 0.022
  const py = ly * 0.016
  for (const side of [-1, 1]) {
    const ex = side * 0.095
    const ey = -0.01
    if (open > 0.08) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(ex, ey, 0.058, 0.054 * open, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = EYE
      ctx.fillRect(ex - 0.06, ey - 0.06, 0.12, 0.12)
      // Wide pupils in the dark.
      ctx.fillStyle = '#16121F'
      ctx.beginPath()
      ctx.ellipse(ex + px, ey + py, 0.03, 0.045, 0, 0, Math.PI * 2)
      ctx.fill()
      // The lamp, caught in them.
      ctx.fillStyle = rgba('#FFF4E0', 0.9)
      ctx.beginPath()
      ctx.arc(ex + px + 0.012, ey + py - 0.016, 0.009, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      // The upper lid's line.
      ctx.beginPath()
      ctx.ellipse(ex, ey, 0.058, 0.054 * open, 0, Math.PI, Math.PI * 2)
      ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
      ctx.lineWidth = lw * 0.8
      ctx.stroke()
    } else {
      // Shut: a soft downward curve asleep or blinking; nodding along, the content arch of a smile.
      ctx.beginPath()
      ctx.moveTo(ex - 0.045, ey + (happy ? 0.012 : -0.002))
      ctx.quadraticCurveTo(ex, ey + (happy ? -0.03 : 0.028), ex + 0.045, ey + (happy ? 0.012 : -0.002))
      ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
      ctx.lineWidth = lw * 0.8
      ctx.stroke()
    }
  }
  // Nose and mouth.
  ctx.beginPath()
  ctx.moveTo(-0.022, 0.05)
  ctx.lineTo(0.022, 0.05)
  ctx.lineTo(0, 0.075)
  ctx.closePath()
  ctx.fillStyle = '#D9877E'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, 0.075)
  ctx.quadraticCurveTo(-0.01, 0.105, -0.035, 0.1)
  ctx.moveTo(0, 0.075)
  ctx.quadraticCurveTo(0.01, 0.105, 0.035, 0.1)
  ctx.strokeStyle = 'rgba(26, 21, 38, 0.8)'
  ctx.lineWidth = lw * 0.5
  ctx.stroke()
  // Whiskers, faint.
  ctx.strokeStyle = rgba('#F3E6D2', 0.35)
  ctx.lineWidth = 0.008
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * 0.1, 0.08 + k * 0.025)
      ctx.quadraticCurveTo(side * 0.24, 0.06 + k * 0.04, side * 0.33, 0.075 + k * 0.07)
      ctx.stroke()
    }
  }
  ctx.restore()
}
