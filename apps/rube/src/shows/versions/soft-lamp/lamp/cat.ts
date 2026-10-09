import { sweepAt } from './decor'
import { MOMENTS, flashAt, shootAt } from './sky'
import { REACHES, handAt, petAt } from './hands'
import { CAT } from './desk'
import { catInViewAt } from './camera'
import { TRACKS, barTime, beatOf, drumsAt, grooving, smooth, trackAt, type Track } from './music'
import { LANDINGS, LAPS, ballAt } from './route'
import { rgba } from './canvas'
import { hash, lampAt, lightAt, lit } from './world'

/**
 * The cat: a ginger kitten loafed on the desk between the mug and the books, under the sill, its face to the room.
 *
 * It has one job, and it is the audience's. It watches the ball: its head and eyes follow it, a little behind, as a
 * cat's do (along the sill over its head, down the stair beside it, into the cup); it blinks, and now and then slowly,
 * the way a cat says it is content; an ear flicks when the ball knocks the pot. And through a groove, a phrase at a
 * time, it either keeps watching or shuts its eyes and nods along on the beat, its tail tip swaying with it, as anyone
 * listening does. It breathes. Now and then, watching, it washes: a paw licked and drawn over an ear. When the last track's drums leave it puts its head down and sleeps, as the ball does in
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

/**
 * Where it is looking: the ball, a little behind (its eyes lead its head); or, while a car's lights cross the wall,
 * those; or a flash of lightning in the clouds; or, late in the night, a shooting star through the window, and where it
 * went.
 */
function gaze(t: number, lag: number): { x: number; y: number } {
  const ball = ballGaze(t, lag)
  const sw = sweepAt(t - 0.35)
  const k = Math.min(1, sw.a * 1.6)
  const g = { x: ball.x + (sw.x - ball.x) * k, y: ball.y + (sw.y - ball.y) * k }
  const st = shootAt(t - 0.3)
  const s = { x: g.x + (st.x - g.x) * st.a, y: g.y + (st.y - g.y) * st.a }
  const fl = flashAt(t)
  const f = { x: s.x + (fl.x - s.x) * fl.look, y: s.y + (fl.y - s.y) * fl.look }
  // A hand coming in: it watches that, mostly.
  const h = handAt(t - 0.25)
  const hk = 0.8 * h.a
  return { x: f.x + (h.x - f.x) * hk, y: f.y + (h.y - f.y) * hk }
}

function ballGaze(t: number, lag: number): { x: number; y: number } {
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
function vibing(tr: Track, phrase: number): number {
  // It plays to the camera: likelier to be lost in it through a phrase the camera spends looking at it.
  const mid = barTime(tr, tr.entry + phrase * 8 + 4)
  return hash(tr.n, phrase, 97) < (catInViewAt(mid) ? 0.8 : 0.25) ? 1 : 0
}
export function vibeAt(t: number): number {
  const tr = trackAt(t)
  const lap = LAPS[tr.n]
  const bar = Math.floor(beatOf(tr, t) / 4)
  if (!lap || t < lap.cup + 4 * tr.period || (lap.lob !== null && t > lap.lob - 4 * tr.period) || !grooving(tr, bar)) return 0
  const phrase = Math.floor((bar - tr.entry) / 8)
  const start = barTime(tr, tr.entry + phrase * 8)
  const was = phrase > 0 ? vibing(tr, phrase - 1) : 0
  const now = vibing(tr, phrase)
  // Into it and out of it gently, and out of it again ahead of the lob, or a break.
  const v = was + (now - was) * smooth(t, start, start + 1.5 * tr.period)
  const nextBar = barTime(tr, bar + 1)
  const breakAhead = !grooving(tr, bar + 1) ? smooth(t, nextBar - 2 * tr.period, nextBar - 0.5 * tr.period) : 0
  const lobAhead = lap.lob !== null ? smooth(t, lap.lob - 8 * tr.period, lap.lob - 5 * tr.period) : 0
  return v * (1 - breakAhead) * (1 - lobAhead) * Math.min(1, (t - lap.cup - 4 * tr.period) / 2)
}

/**
 * Its yawns: a few through the night, more of them late, each a good three seconds, while the ball sits and the camera
 * is on it (a yawn comes over a nod, too).
 */
export const YAWNS: number[] = [2, 4, 6, 8, 9, 10].map((n) => {
  const lap = LAPS[n]
  const tr = TRACKS[n]
  // A while after the ball has settled, while the camera is on it.
  for (let k = 0; k < 40; k++) {
    const at = lap.cup + 10 + k * 4 * tr.period + hash(n, k, 99) * 2
    if (REACHES.some((r) => at > r.at - 5 && at < r.at + r.dur + 3)) continue
    if (catInViewAt(at) && catInViewAt(at + 3.2) && (lap.lob === null || at + 4 < lap.lob - 8 * tr.period)) return at
  }
  return -100
})
export function yawnAt(t: number): number {
  for (const at of YAWNS) {
    const s = (t - at) / 3.2
    if (s >= 0 && s <= 1) return Math.min(1, 2.2 * Math.sin(Math.PI * s) ** 2)
  }
  return 0
}

/** How long a wash takes: the paw up to its chin, four licks, the paw over its ear, and down. */
const WASH = 6
/**
 * Its washes: four through the night, each in a phrase it spends watching rather than nodding along, while the ball
 * sits and the camera is on it all the while, clear of its yawns and of the lob.
 */
export const WASHES: number[] = [1, 3, 5, 7].map((n) => {
  const lap = LAPS[n]
  const tr = TRACKS[n]
  for (let k = 0; k < 60; k++) {
    const at = lap.cup + 14 + k * 2 * tr.period + hash(n, k, 131) * 1.5
    if (lap.lob !== null && at + WASH + 2 > lap.lob - 8 * tr.period) break
    if (!catInViewAt(at) || !catInViewAt(at + WASH)) continue
    if (YAWNS.some((y) => Math.abs(y - at) < WASH + 6)) continue
    if (REACHES.some((r) => at > r.at - WASH - 4 && at < r.at + r.dur + 4)) continue
    let still = true
    for (let s = at - 1; s <= at + WASH + 1; s += 0.5) if (vibeAt(s) > 0.02 || sweepAt(s).a > 0.02) still = false
    if (still) return at
  }
  return -100
})

/**
 * Where a wash is at `t`: how far into it (0, none, to 1) the cat is (`k`, eased in and out), where its paw is (`paw`,
 * 0 tucked, 1 at its chin, 2 over its ear), and how far out its tongue is (`lick`).
 */
export function washAt(t: number): { k: number; paw: number; lick: number } {
  for (const at of WASHES) {
    const s = t - at
    if (s < 0 || s > WASH) continue
    const k = smooth(s, 0, 0.6) * (1 - smooth(s, WASH - 0.7, WASH))
    let paw: number
    if (s < 0.8) paw = smooth(s, 0, 0.8)
    else if (s < 3.8) paw = 1 - 0.12 * Math.abs(Math.sin(((s - 0.8) / 3) * Math.PI * 4))
    else if (s < 5.2) paw = 1 + Math.sin(((s - 3.8) / 1.4) * Math.PI)
    else paw = 1 - smooth(s, 5.2, WASH)
    const lick = s > 0.8 && s < 3.8 ? Math.max(0, Math.sin(((s - 0.8) / 3) * Math.PI * 4)) ** 2 : 0
    return { k, paw, lick }
  }
  return { k: 0, paw: 0, lick: 0 }
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

/** An ear flick, after the ball knocks the pot or lands on the sill, or at a flash of lightning. */
function flickAt(t: number): number {
  let f = 0
  for (const at of MOMENTS.lightning) {
    const s = t - at - 0.2
    if (s >= 0 && s < 2) f += Math.exp(-s / 0.25) * Math.sin(s * 26)
  }
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
  // A shooting star, or lightning, brings it out of the music to look, and it goes back in after.
  // A scratch under the chin: it shuts its eyes and leans into the hand.
  const pet = petAt(t) * (1 - sleepAt(t))
  const vibe = vibeAt(t) * (1 - shootAt(t - 0.3).a) * (1 - flashAt(t).look) * (1 - handAt(t).a)
  const yawn = yawnAt(t) * (1 - sleep)
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

  // The head: it turns to the ball, and when it sleeps it comes down onto its paws; washing, it dips to the paw with
  // each lick, and leans into it as the paw goes over its ear.
  const wash = washAt(t)
  const over = Math.max(0, wash.paw - 1)
  const hx0 = CAT.head.x
  const hy0 = CAT.head.y - 0.025 * pet + 0.26 * sleep + 0.006 * breath + 0.028 * vibe * nodAt(t) - 0.03 * yawn + wash.k * (0.03 + 0.02 * wash.lick + 0.02 * over)
  const look = gaze(t, 0.22)
  const dx = look.x - hx0
  const dy = look.y - hy0
  const d = Math.hypot(dx, dy) || 1
  const awake = 1 - sleep
  const watch = awake * (1 - vibe) * (1 - yawn) * (1 - wash.k) * (1 - pet)
  const lx = (dx / d) * watch
  const ly = (dy / d) * watch + 0.25 * vibe * awake
  const hx = hx0 + lx * 0.035
  const hy = hy0 + ly * 0.02
  const tilt = lx * 0.12 - ly * 0.06 - yawn * 0.12 + sleep * 0.3 + vibe * awake * 0.08 * Math.sin((Math.PI * beatOf(tr, t)) / 2) +
    wash.k * (0.1 + 0.22 * over) + pet * (0.2 + 0.03 * Math.sin(t * 2.2))
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
    ctx.rotate(side * 0.25 + (side > 0 ? flick * 0.35 : 0) - side * sleep * 0.25 + side * yawn * 0.3 + side * pet * 0.2)
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

  // The eyes: round and open as it watches; the upper lid comes down over them to blink, so a blink caught halfway is
  // sleepy, never cross; shut in the content arch while it nods along, and shut soft as it sleeps or yawns.
  const open = Math.max(0, (1 - blinkAt(t)) * awake * (1 - vibe) * (1 - yawn) * (1 - wash.k) * (1 - pet))
  const happy = (vibe > 0.5 || pet > 0.5) && sleep < 0.5 && yawn < 0.3 && wash.k < 0.3
  const px = lx * 0.022
  const py = ly * 0.016
  const RXE = 0.058
  const RYE = 0.054
  for (const side of [-1, 1]) {
    const ex = side * 0.095
    const ey = -0.01
    if (open > 0.12) {
      const lidY = ey - RYE + 2 * RYE * (1 - open) * 0.9
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(ex, ey, RXE, RYE, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = EYE
      ctx.fillRect(ex - 0.07, ey - 0.07, 0.14, 0.14)
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
      // The lid, as far down as it is.
      const lid = () => {
        ctx.beginPath()
        ctx.moveTo(ex - 0.08, ey - 0.08)
        ctx.lineTo(ex + 0.08, ey - 0.08)
        ctx.lineTo(ex + 0.08, lidY)
        ctx.quadraticCurveTo(ex, lidY + 0.03 * (1 - open), ex - 0.08, lidY)
        ctx.closePath()
      }
      if (open < 0.97) {
        lid()
        ctx.fillStyle = fur(0.5 + 0.5 * ((ex + RX) / (2 * RX)))
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(ex - 0.08, lidY)
        ctx.quadraticCurveTo(ex, lidY + 0.03 * (1 - open), ex + 0.08, lidY)
        ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
        ctx.lineWidth = lw * 0.8
        ctx.stroke()
      }
      ctx.restore()
      // The eye's upper line.
      ctx.beginPath()
      ctx.ellipse(ex, ey, RXE, RYE, 0, Math.PI, Math.PI * 2)
      ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
      ctx.lineWidth = lw * 0.8
      ctx.stroke()
    } else {
      // Shut: a soft downward curve asleep, blinking or yawning; nodding along, the content arch of a smile.
      ctx.beginPath()
      ctx.moveTo(ex - 0.045, ey + (happy ? 0.012 : -0.002))
      ctx.quadraticCurveTo(ex, ey + (happy ? -0.03 : 0.028), ex + 0.045, ey + (happy ? 0.012 : -0.002))
      ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
      ctx.lineWidth = lw * 0.8
      ctx.stroke()
    }
  }
  // A yawn: the mouth wide, the pink of it, two small teeth.
  if (yawn > 0.05) {
    ctx.beginPath()
    ctx.ellipse(0, 0.1 + 0.03 * yawn, 0.045 + 0.01 * yawn, 0.065 * yawn, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#4A1E2A'
    ctx.fill()
    ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
    ctx.lineWidth = lw * 0.6
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, 0.1 + 0.03 * yawn + 0.035 * yawn, 0.03, 0.022 * yawn, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#D9727C'
    ctx.fill()
    ctx.fillStyle = '#F6EEE0'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * 0.03, 0.1 + 0.03 * yawn - 0.065 * yawn + 0.004)
      ctx.lineTo(side * 0.022, 0.1 + 0.03 * yawn - 0.065 * yawn + 0.024 * yawn)
      ctx.lineTo(side * 0.014, 0.1 + 0.03 * yawn - 0.065 * yawn + 0.008)
      ctx.fill()
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
  if (yawn < 0.3) {
    ctx.beginPath()
    ctx.moveTo(0, 0.075)
    ctx.quadraticCurveTo(-0.01, 0.105, -0.035, 0.1)
    ctx.moveTo(0, 0.075)
    ctx.quadraticCurveTo(0.01, 0.105, 0.035, 0.1)
    ctx.strokeStyle = 'rgba(26, 21, 38, 0.8)'
    ctx.lineWidth = lw * 0.5
    ctx.stroke()
  }
  // Washing: the tip of its tongue, out to the paw with each lick.
  if (wash.lick > 0.15) {
    ctx.beginPath()
    ctx.ellipse(0.012, 0.112 + 0.012 * wash.lick, 0.018, 0.012 + 0.012 * wash.lick, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#D9727C'
    ctx.fill()
    ctx.strokeStyle = 'rgba(26, 21, 38, 0.8)'
    ctx.lineWidth = lw * 0.4
    ctx.stroke()
  }
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

  // Washing: the near foreleg, up from its chest to its chin, then over its ear, the paw's pad toward its face.
  if (wash.k > 0.01 && wash.paw > 0.02) {
    const p = Math.min(1, wash.paw)
    // From the shoulder, under its ruff: only the forearm shows, bent up to the face.
    const from = { x: chest - 0.1, y: -0.24 }
    const chin = { x: hx + 0.085, y: hy + 0.15 }
    const ear = { x: hx + 0.2, y: hy - 0.02 }
    const rest = { x: chest - 0.08, y: -0.08 }
    const px = rest.x + (chin.x - rest.x) * p + (ear.x - chin.x) * over
    const py = rest.y + (chin.y - rest.y) * p + (ear.y - chin.y) * over
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    // Round the outside of its cheek as it goes over the ear, not across its face.
    ctx.quadraticCurveTo(from.x + 0.07 + over * 0.2, (from.y + py) / 2 + 0.03, px, py)
    ctx.lineWidth = 0.085
    ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
    ctx.stroke()
    ctx.lineWidth = 0.085 - lw * 2
    ctx.strokeStyle = lit('#B49276', CREAM_FUR, l)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(px, py, 0.055, 0.045, -0.5 - over * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = lit('#B49276', CREAM_FUR, l)
    ctx.fill()
    ctx.lineWidth = lw * 0.7
    ctx.stroke()
  }
}
