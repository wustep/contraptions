import { mixHex } from '../../../../parts'
import { rgba } from './canvas'
import { camera, catInViewAt } from './camera'
import { GLASS } from './desk'
import { smooth } from './music'
import { cloudAt, hash, lampAt, nightAt, rainAt, skyAt } from './world'

/**
 * The view through the glass, a function of show time: the sky from dusk into night, the clouds coming over and
 * clearing, the stars and the moon when it is clear, a plane now and then, the city across the street with its windows
 * lit and going out (and one of them, close, someone's: `neighbour`), the rain falling past, and on the glass the beads.
 *
 * It is what changes slowest in the show: the half hour is one evening, and the window is its clock.
 */

type Ctx = CanvasRenderingContext2D


const W = GLASS.x1 - GLASS.x0
const H = GLASS.y1 - GLASS.y0

/** The night through the glass, clipped to it. */
export function night(ctx: Ctx, t: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(GLASS.x0, GLASS.y0, W, H)
  ctx.clip()
  const sky = skyAt(t)
  const cloud = cloudAt(t)
  const g = ctx.createLinearGradient(0, GLASS.y0, 0, GLASS.y1 - 0.6)
  g.addColorStop(0, sky.top)
  g.addColorStop(0.5, sky.mid)
  g.addColorStop(1, sky.low)
  ctx.fillStyle = g
  ctx.fillRect(GLASS.x0, GLASS.y0, W, H)
  stars(ctx, t, cloud)
  moon(ctx, t, cloud)
  birds(ctx, t, sky.dusk)
  plane(ctx, t, cloud)
  clouds(ctx, t, cloud, sky)
  city(ctx, t, sky)
  rain(ctx, t)
  drops(ctx, t, rainAt(t))
  // The room in the glass: the lamp's warmth caught faintly in the pane nearest it.
  const lamp = lampAt(t)
  const r = ctx.createRadialGradient(GLASS.x1 - 0.25, GLASS.y1 - 0.7, 0.02, GLASS.x1 - 0.25, GLASS.y1 - 0.7, 1.1)
  r.addColorStop(0, rgba('#F4B27A', 0.12 * lamp))
  r.addColorStop(1, rgba('#F4B27A', 0))
  ctx.fillStyle = r
  ctx.fillRect(GLASS.x0, GLASS.y0, W, H)
  ctx.restore()
}

/** How long a shooting star takes to cross, seconds. */
const SHOOT = 0.9
/** Where a shooting star that starts at `at` is, `u` of the way along its streak. */
function shootPath(at: number, u: number): { x: number; y: number } {
  // In the sky the window's look and the room's frame show (not the glass's very top, above both), over the roofs.
  return { x: GLASS.x0 + 0.4 + (at % 7) * 0.25 + u * 1.3, y: GLASS.y0 + 1.2 + (at % 3) * 0.15 + u * 0.55 }
}

/**
 * When the shooting stars cross: three, late, in a clear sky, played to the camera as the cat's moments are, each at a
 * moment the frame holds both the whole of its streak and the cat (so the cat can be seen to look up at it), a few
 * minutes apart, the last before the cat goes to sleep. Worked out once, at load.
 */
const SHOOTS: number[] = (() => {
  const out: number[] = []
  const seen = (at: number) => {
    for (const u of [0, 1]) {
      const p = shootPath(at, u)
      for (const s of [at, at + SHOOT]) {
        const c = camera(s)
        const hh = c.cells / 2
        const hw = (hh * 16) / 9
        if (Math.abs(p.x - 0.25 - c.x) > hw - 0.1 || Math.abs(p.y - c.y) > hh - 0.1) return false
      }
    }
    return true
  }
  for (let at = 1300; at < 1786 && out.length < 3; at += 1) {
    if (out.length && at < out[out.length - 1] + 120) continue
    if (nightAt(at) < 0.6 || cloudAt(at) > 0.35) continue
    if (!catInViewAt(at) || !catInViewAt(at + 3) || !seen(at)) continue
    out.push(at)
  }
  return out
})()

/**
 * Where a shooting star went, for the cat to look at: from the moment it starts until a couple of seconds after it has
 * gone (a cat stares at where a thing vanished), with how much it has the cat's eye (0 to 1).
 */
export function shootAt(t: number): { x: number; y: number; a: number } {
  for (const at of SHOOTS) {
    const s = t - at
    if (s < 0 || s > SHOOT + 2.4) continue
    const p = shootPath(at, Math.min(1, s / SHOOT))
    const a = smooth(s, 0, 0.25) * (1 - smooth(s, SHOOT + 1.4, SHOOT + 2.4))
    return { x: p.x, y: p.y, a }
  }
  return { x: 0, y: 0, a: 0 }
}

/** How dark the sky is for stars: none at dusk, all of them by the blue hour's end. */
const darkAt = (t: number): number => smooth(nightAt(t), 0.06, 0.22)

function stars(ctx: Ctx, t: number, cloud: number): void {
  const a0 = darkAt(t) * Math.max(0, 1 - cloud * 1.15)
  if (a0 <= 0.01) return
  for (let i = 0; i < 46; i++) {
    const x = GLASS.x0 + hash(i, 61) * W
    const y = GLASS.y0 + hash(i, 62) ** 1.4 * (H - 1.4)
    const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + hash(i, 63) * 1.7) + hash(i, 64) * 6.3)
    const r = 0.007 + hash(i, 65) ** 3 * 0.014
    ctx.fillStyle = rgba(hash(i, 66) < 0.2 ? '#FFD9B8' : '#E6E8FF', a0 * tw * (0.5 + 0.5 * hash(i, 67)))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Late in the night, in the clear, a shooting star now and then.
  for (const at of SHOOTS) {
    const s = t - at
    if (s < 0 || s > SHOOT) continue
    const u = s / SHOOT
    const { x, y } = shootPath(at, u)
    const g = ctx.createLinearGradient(x, y, x - 0.5, y - 0.21)
    const a = a0 * Math.sin(Math.PI * u)
    g.addColorStop(0, rgba('#FFFFFF', a))
    g.addColorStop(1, rgba('#FFFFFF', 0))
    ctx.strokeStyle = g
    ctx.lineWidth = 0.014
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 0.5, y - 0.21)
    ctx.stroke()
  }
}

/** The moon: it rises into the right-hand pane over the last part of the night, a soft full moon with a halo. */
function moon(ctx: Ctx, t: number, cloud: number): void {
  const n = nightAt(t)
  const up = smooth(n, 0.5, 0.6)
  if (up <= 0) return
  const u = Math.max(0, (n - 0.5) / 0.5)
  const x = GLASS.x1 - 0.55 - u * 0.75
  const y = GLASS.y1 - 1.6 - u * 2.0
  const a = up * (1 - 0.82 * cloud)
  const halo = ctx.createRadialGradient(x, y, 0.15, x, y, 1.2)
  halo.addColorStop(0, rgba('#E9E3FF', 0.32 * a))
  halo.addColorStop(0.4, rgba('#B4B3E8', 0.1 * a))
  halo.addColorStop(1, rgba('#B4B3E8', 0))
  ctx.fillStyle = halo
  ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6)
  ctx.fillStyle = rgba('#F6F0DD', a)
  ctx.beginPath()
  ctx.arc(x, y, 0.19, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba('#D6CCB4', 0.55 * a)
  for (const [dx, dy, r] of [[-0.05, -0.04, 0.05], [0.06, 0.03, 0.035], [-0.02, 0.08, 0.03]]) {
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Birds going home across the dusk: two small flocks, one under the title and one as the first track ends, wings beating, then gliding. */
function birds(ctx: Ctx, t: number, dusk: number): void {
  if (dusk < 0.2) return
  for (const [at, y0, n] of [[4, -4.25, 5], [98, -3.75, 3]] as const) {
    const s = t - at
    const dur = 26
    if (s < 0 || s > dur) continue
    const u = s / dur
    for (let i = 0; i < n; i++) {
      // A loose V: each a little behind and to one side of the one ahead, and each its own beat.
      const back = i * 0.16
      const side = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.09
      const x = GLASS.x0 - 0.4 + u * (W + 0.8) - back
      const y = y0 + side + Math.sin(s * 0.9 + i) * 0.03 - u * 0.35
      const beat = Math.sin(s * (7 + i * 0.6) + i * 1.7)
      const glide = (Math.floor(s / 2.2 + i * 0.3) % 2) === 1
      const wing = glide ? 0.15 : 0.35 * beat
      const span = 0.07
      ctx.beginPath()
      ctx.moveTo(x - span, y - wing * span)
      ctx.quadraticCurveTo(x - span * 0.4, y - 0.02 - wing * span * 0.3, x, y)
      ctx.quadraticCurveTo(x + span * 0.4, y - 0.02 - wing * span * 0.3, x + span, y - wing * span)
      ctx.strokeStyle = rgba('#2A2140', 0.85 * Math.min(1, dusk * 1.5))
      ctx.lineWidth = 0.013
      ctx.stroke()
    }
  }
}

/** Now and then a plane, high and slow, its strobe blinking: only seen when the sky is clear enough. */
function plane(ctx: Ctx, t: number, cloud: number): void {
  const EVERY = 173
  const k = Math.floor(t / EVERY)
  const s = t - k * EVERY - 20
  const dur = 34
  if (s < 0 || s > dur) return
  const a = Math.max(0, 1 - cloud * 1.3) * (0.5 + 0.5 * darkAt(t) + 0.3 * (1 - darkAt(t)))
  if (a <= 0.02) return
  const dir = hash(k, 71) < 0.5 ? 1 : -1
  const u = s / dur
  const x = dir > 0 ? GLASS.x0 - 0.2 + u * (W + 0.4) : GLASS.x1 + 0.2 - u * (W + 0.4)
  const y = GLASS.y0 + 0.35 + hash(k, 72) * 1.2 - u * 0.25
  ctx.fillStyle = rgba('#FF6B6B', 0.75 * a)
  ctx.beginPath()
  ctx.arc(x, y, 0.012, 0, Math.PI * 2)
  ctx.fill()
  const strobe = (s % 1.3) < 0.09 ? 1 : 0
  if (strobe) {
    const g = ctx.createRadialGradient(x + 0.03 * dir, y, 0, x + 0.03 * dir, y, 0.07)
    g.addColorStop(0, rgba('#FFFFFF', a))
    g.addColorStop(1, rgba('#FFFFFF', 0))
    ctx.fillStyle = g
    ctx.fillRect(x - 0.1, y - 0.1, 0.2, 0.2)
  }
}

/**
 * The clouds: long soft banks drifting slowly right, as many as the cover asks. At dusk they are lit from under in
 * peach and rose; at night they are a little paler than the sky, lit by the city.
 */
function clouds(ctx: Ctx, t: number, cover: number, sky: { top: string; mid: string; dusk: number }): void {
  const lit = mixHex('#2C2E4E', '#E7A08E', sky.dusk)
  const body = mixHex('#232543', '#6E5A8E', sky.dusk)
  for (let i = 0; i < 9; i++) {
    const has = Math.max(0, Math.min(1, (cover - i / 9) * 6))
    if (has <= 0) continue
    const span = W + 3
    const x = GLASS.x0 - 1.5 + ((hash(i, 81) * span + t * (0.012 + hash(i, 82) * 0.01)) % span)
    const y = GLASS.y0 + 0.4 + hash(i, 83) * (H - 2.2)
    const w = 0.9 + hash(i, 84) * 1.2
    for (let j = 0; j < 4; j++) {
      const cx = x + (j - 1.5) * w * 0.3 + hash(i, j, 85) * 0.1
      const cy = y - Math.sin((j / 3) * Math.PI) * 0.12 * w
      const r = w * (0.28 + 0.12 * hash(i, j, 86))
      const g = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r)
      g.addColorStop(0, rgba(body, 0.55 * has))
      g.addColorStop(0.6, rgba(body, 0.35 * has))
      g.addColorStop(1, rgba(body, 0))
      ctx.fillStyle = g
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      // The underside, lit.
      const u = ctx.createRadialGradient(cx, cy + r * 0.35, 0, cx, cy + r * 0.35, r * 0.7)
      u.addColorStop(0, rgba(lit, 0.3 * has))
      u.addColorStop(1, rgba(lit, 0))
      ctx.fillStyle = u
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
  }
}

/**
 * The city across the street, low in the pane: two rows of roofs, the far one paler. Its windows come on through the
 * dusk and go out, one by one, through the night; a few are the cool flicker of a screen. On the tallest roof a red
 * light blinks.
 */
function city(ctx: Ctx, t: number, sky: { low: string; dusk: number }): void {
  const n = nightAt(t)
  const far = mixHex('#2B2850', '#463E6E', sky.dusk)
  const near = mixHex('#17162C', '#2A2445', sky.dusk)
  let tallest = { x: 0, y: 0 }
  for (const [row, color, base, tall] of [[0, far, -1.9, 1.15], [1, near, -1.35, 0.85]] as const) {
    let x = GLASS.x0 - 0.3
    let i = 0
    while (x < GLASS.x1 + 0.3) {
      const w = 0.45 + hash(i, row, 7) * 0.7
      const h = 0.25 + hash(i, row, 11) * tall
      ctx.fillStyle = color
      ctx.fillRect(x, base - h, w, h + 2)
      if (row === 0 && base - h < tallest.y) tallest = { x: x + w / 2, y: base - h }
      // A water tank or a stair head on some roofs.
      if (hash(i, row, 17) < 0.3) ctx.fillRect(x + w * 0.2, base - h - 0.12, 0.14, 0.13)
      const cols = Math.max(1, Math.floor(w / 0.16))
      const rows = Math.max(1, Math.floor(h / 0.17))
      for (let a = 0; a < cols; a++) {
        for (let b = 0; b < rows; b++) {
          const key = hash(i * 31 + a, b + row * 17, 3)
          if (key > 0.26) continue
          const on = 4 + hash(i * 31 + a, b + row * 17, 9) * 110
          const out = 0.3 + hash(i * 31 + a, b + row * 17, 5) * 0.95
          if (t < on || n > out) continue
          const fade = Math.min(1, (t - on) * 2) * Math.min(1, (out - n) * 30)
          const screen = key < 0.035
          const flick = screen ? 0.75 + 0.25 * Math.sin(t * 7 + a * 3 + b) * Math.sin(t * 2.3 + i) : 1
          const c = screen ? '#9DB4F2' : hash(i, a + b, 19) < 0.3 ? '#F0A867' : '#F7C98A'
          ctx.fillStyle = rgba(c, (row ? 0.75 : 0.45) * fade * flick)
          ctx.fillRect(x + 0.06 + a * 0.16, base - h + 0.08 + b * 0.17, 0.065, 0.075)
        }
      }
      x += w + 0.02 + hash(i, row, 13) * 0.12
      i++
    }
  }
  // The red light on the tallest roof: on a little over half a second in every two.
  const blink = Math.max(0, Math.sin((t * Math.PI) / 1.1)) ** 3
  const g = ctx.createRadialGradient(tallest.x, tallest.y - 0.03, 0, tallest.x, tallest.y - 0.03, 0.08)
  g.addColorStop(0, rgba('#FF5A4E', 0.9 * blink))
  g.addColorStop(0.3, rgba('#FF5A4E', 0.35 * blink))
  g.addColorStop(1, rgba('#FF5A4E', 0))
  ctx.fillStyle = g
  ctx.fillRect(tallest.x - 0.15, tallest.y - 0.2, 0.3, 0.3)
  // The neighbour's window, before the glow, so the haze over the roofs lies over its wall as over the rest.
  neighbour(ctx, t, sky)
  // The city's glow over the roofs.
  const glow = ctx.createLinearGradient(0, GLASS.y1 - 2.1, 0, GLASS.y1)
  glow.addColorStop(0, rgba('#B7779A', 0))
  glow.addColorStop(1, rgba('#B7779A', 0.1 * (1 - sky.dusk)))
  ctx.fillStyle = glow
  ctx.fillRect(GLASS.x0, GLASS.y1 - 2.1, W, 2.1)
}

/**
 * One window across the street, close enough to see into: the neighbour's, up late too. Its light comes on in the dusk
 * and goes out a little before ours goes down. A thin curtain is drawn across its left. Now and then someone crosses
 * behind it, and once, in the heaviest of the rain, stops at the glass to look out at it a while; twice a cat walks
 * along its sill, sits, its tail tip going, and walks off. Small, and seldom: the city's one other person, not a
 * second show.
 */
const FLAT = { x0: -1.05, x1: -0.69, y0: -1.98, y1: -1.73 }
const FLAT_ON = 38
const FLAT_OFF = 1652

/** Whether the camera's frame shows the neighbour's window, with its light round it, through all of `t` to `t + dur`. */
function flatSeen(t: number, dur: number): boolean {
  for (let s = t; s <= t + dur; s += 0.5) {
    const c = camera(s)
    const hh = c.cells / 2
    const hw = (hh * 16) / 9
    if (FLAT.x0 - 0.1 < c.x - hw || FLAT.x1 + 0.1 > c.x + hw || FLAT.y0 - 0.1 < c.y - hh || FLAT.y1 + 0.05 > c.y + hh) return false
  }
  return true
}

const WALK = 3.6
const LOOK = 7
const CAT_WALK = 2.4

/**
 * When someone crosses (and which way, and how long they stop at the glass), and when the cat comes and goes: played
 * to the camera as the kitten on the desk is, each at a moment the frame holds the window for all of it, a few minutes
 * apart. The one who stops to look out does it in the heaviest rain the camera gives a window for.
 */
const { PASSES, SITS } = (() => {
  const passes: [number, 1 | -1, number][] = []
  let last = -Infinity
  for (let t = FLAT_ON + 120; t < FLAT_OFF - 30 && passes.length < 6; t += 1) {
    if (t - last < 210 || !flatSeen(t, WALK + 1)) continue
    passes.push([t, passes.length % 2 ? -1 : 1, 0])
    last = t
  }
  // The look: of the times the window is in frame long enough, the wettest, kept clear of the others.
  let best = -1
  let bestRain = 0.4
  for (let t = FLAT_ON + 120; t < FLAT_OFF - 30; t += 1) {
    const r = rainAt(t)
    if (r <= bestRain || passes.some(([p]) => Math.abs(p - t) < 60) || !flatSeen(t, WALK + LOOK + 1)) continue
    best = t
    bestRain = r
  }
  if (best > 0) passes.push([best, -1, LOOK])
  passes.sort((a, b) => a[0] - b[0])
  // The cat: two visits of two minutes or more, each arrival and leaving in frame.
  const sits: [number, number][] = []
  for (let t = 520; t < FLAT_OFF - 200 && sits.length < 2; t += 1) {
    if (sits.length && t < sits[sits.length - 1][1] + 240) continue
    if (passes.some(([p]) => Math.abs(p - t) < 15) || !flatSeen(t, CAT_WALK + 1)) continue
    for (let u = t + 120; u < t + 260; u += 1) {
      if (!passes.some(([p]) => Math.abs(p - u) < 15) && flatSeen(u - CAT_WALK - 1, CAT_WALK + 1)) {
        sits.push([t, u])
        break
      }
    }
  }
  return { PASSES: passes, SITS: sits }
})()

function neighbour(ctx: Ctx, t: number, sky: { dusk: number }): void {
  const { x0, x1, y0, y1 } = FLAT
  const w = x1 - x0
  const h = y1 - y0
  const on = Math.min(1, Math.max(0, (t - FLAT_ON) / 1.2)) * Math.min(1, Math.max(0, (FLAT_OFF - t) / 0.8))
  // The wall round it, so the city's small windows keep clear of it, and its frame.
  ctx.fillStyle = mixHex('#17162C', '#2A2445', sky.dusk)
  ctx.fillRect(x0 - 0.06, y0 - 0.06, w + 0.12, h + 0.1)
  // Its frame, and unlit, the glass: dim, holding a little of the dusk while there is one, dark only at night.
  const unlit = (night: string, dusk: string) => mixHex(night, dusk, sky.dusk)
  ctx.fillStyle = rgba(unlit('#0E0C1C', '#2A2444'), 0.9)
  ctx.fillRect(x0 - 0.015, y0 - 0.015, w + 0.03, h + 0.03)
  // The room inside: dark, or lit by a lamp somewhere on its right; a low, deep amber, so it sits among the city's
  // lights and never outshines the ball (bright enough that what crosses it reads).
  const room = ctx.createRadialGradient(x1 - 0.06, y0 + h * 0.55, 0.02, x1 - 0.06, y0 + h * 0.55, w * 1.1)
  room.addColorStop(0, mixHex(unlit('#1C1830', '#4A3E62'), '#D9985C', on))
  room.addColorStop(0.6, mixHex(unlit('#1A162C', '#433858'), '#A86640', on))
  room.addColorStop(1, mixHex(unlit('#16142A', '#3A3050'), '#5E3430', on))
  ctx.fillStyle = room
  ctx.fillRect(x0, y0, w, h)
  if (on > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0, y0, w, h)
    ctx.clip()
    const shadow = rgba('#2A1610', 0.82 * on)
    // Someone crossing, head and shoulders, a little bob in their step.
    for (const [at, dir, stop] of PASSES) {
      const walk = WALK
      const s = t - at
      if (s < 0 || s > walk + stop) continue
      const u = s < walk / 2 ? s / walk : s < walk / 2 + stop ? 0.5 : (s - stop) / walk
      const px = dir > 0 ? x0 - 0.08 + u * (w + 0.16) : x1 + 0.08 - u * (w + 0.16)
      const moving = s < walk / 2 || s > walk / 2 + stop
      const bob = moving ? Math.abs(Math.sin(s * 5.2)) * 0.008 : 0
      const head = y0 + 0.075 - bob
      ctx.fillStyle = shadow
      ctx.beginPath()
      ctx.arc(px, head, 0.032, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(px - 0.075, y1 + 0.02)
      ctx.quadraticCurveTo(px - 0.075, head + 0.045, px, head + 0.04)
      ctx.quadraticCurveTo(px + 0.075, head + 0.045, px + 0.075, y1 + 0.02)
      ctx.closePath()
      ctx.fill()
    }
    // The cat: walks in from the right along the sill, sits, its tail tip flicking, and goes the way it came.
    for (const [from, to] of SITS) {
      if (t < from || t > to) continue
      const walk = CAT_WALK
      const sitX = x0 + w * 0.62
      const inU = Math.min(1, (t - from) / walk)
      const outU = Math.max(0, (t - (to - walk)) / walk)
      const cx = sitX + (1 - smoothStep(inU, 0, 1)) * (x1 + 0.08 - sitX) + smoothStep(outU, 0, 1) * (x1 + 0.08 - sitX)
      const sitting = inU >= 1 && outU <= 0
      const base = y1 - 0.004
      ctx.fillStyle = rgba('#2A1610', 0.9 * on)
      ctx.beginPath()
      // Sitting, it is upright, a pear; walking, it is long and low.
      if (sitting) ctx.ellipse(cx, base - 0.035, 0.028, 0.036, 0, 0, Math.PI * 2)
      else ctx.ellipse(cx, base - 0.025, 0.045, 0.022, 0, 0, Math.PI * 2)
      ctx.fill()
      const hx = sitting ? cx - 0.004 : cx - 0.04
      const hy = sitting ? base - 0.08 : base - 0.05
      ctx.beginPath()
      ctx.arc(hx, hy, 0.02, 0, Math.PI * 2)
      ctx.moveTo(hx - 0.019, hy - 0.006)
      ctx.lineTo(hx - 0.014, hy - 0.034)
      ctx.lineTo(hx - 0.004, hy - 0.016)
      ctx.moveTo(hx + 0.019, hy - 0.006)
      ctx.lineTo(hx + 0.014, hy - 0.034)
      ctx.lineTo(hx + 0.004, hy - 0.016)
      ctx.fill()
      // The tail: round its feet when it sits, the tip going; out behind when it walks.
      const flick = sitting ? Math.sin(t * 2.1) * Math.max(0, Math.sin(t * 0.43)) : 0
      ctx.strokeStyle = rgba('#2A1610', 0.9 * on)
      ctx.lineWidth = 0.011
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (sitting) {
        ctx.moveTo(cx + 0.02, base - 0.006)
        ctx.quadraticCurveTo(cx + 0.06, base - 0.004, cx + 0.058 + flick * 0.01, base - 0.03 - Math.abs(flick) * 0.012)
      } else {
        ctx.moveTo(cx + 0.04, base - 0.03)
        ctx.quadraticCurveTo(cx + 0.075, base - 0.05, cx + 0.085, base - 0.075)
      }
      ctx.stroke()
    }
    // The curtain across its left, thin, lit through.
    const c = ctx.createLinearGradient(x0, 0, x0 + w * 0.34, 0)
    c.addColorStop(0, rgba('#E8C4A0', 0.4 * on))
    c.addColorStop(1, rgba('#E8C4A0', 0.18 * on))
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + w * 0.34, y0)
    ctx.quadraticCurveTo(x0 + w * 0.26, y0 + h * 0.6, x0 + w * 0.3, y1)
    ctx.lineTo(x0, y1)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // Its light, a little out onto the wet night.
    const halo = ctx.createRadialGradient((x0 + x1) / 2, (y0 + y1) / 2, 0.05, (x0 + x1) / 2, (y0 + y1) / 2, 0.45)
    halo.addColorStop(0, rgba('#F2B36E', 0.05 * on))
    halo.addColorStop(1, rgba('#F2B36E', 0))
    ctx.fillStyle = halo
    ctx.fillRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1)
  }
  // The mullion across it, and its sill.
  ctx.fillStyle = rgba(unlit('#0E0C1C', '#2A2444'), 0.9)
  ctx.fillRect((x0 + x1) / 2 - 0.007, y0, 0.014, h)
  ctx.fillStyle = mixHex('#2A2445', '#4A4060', sky.dusk)
  ctx.fillRect(x0 - 0.03, y1, w + 0.06, 0.022)
}

/** The rain falling past: thin, faint, fast, slanting a little with the wind. As many as the weather has. */
function rain(ctx: Ctx, t: number): void {
  const count = 150 * rainAt(t)
  ctx.lineWidth = 0.012
  ctx.lineCap = 'round'
  const HH = H + 0.6
  for (let i = 0; i < 150; i++) {
    const a = Math.min(1, count - i)
    if (a <= 0) break
    const speed = 6.2 + hash(i, 1) * 2.4
    const len = 0.28 + hash(i, 2) * 0.3
    const y = GLASS.y0 - 0.3 + ((hash(i, 3) * HH + t * speed) % HH)
    const x = GLASS.x0 + hash(i, 4) * (W + 0.6) - 0.3 - (y - GLASS.y0) * 0.1
    ctx.strokeStyle = rgba('#B6C0E6', (0.08 + 0.09 * hash(i, 5)) * a)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - len * 0.1, y - len)
    ctx.stroke()
  }
}

const smoothStep = (x: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/**
 * The drops on the glass. Each bead gathers where it lands, sits, and some go: a bead's life is its own length, and at
 * its end it runs down the pane in fits and starts, leaving a faint wet line, and is gone; then it lands again
 * somewhere else. As the rain eases they stop landing, and those on the glass dry where they are.
 */
function drops(ctx: Ctx, t: number, rain: number): void {
  // The glass stays wet a while after the rain: how many beads there are follows the rain a minute behind.
  const wet = Math.max(rain, rainAt(t - 40) * 0.8, rainAt(t - 80) * 0.5)
  const count = 150 * wet
  for (let i = 0; i < 160; i++) {
    const a = Math.min(1, count - i)
    if (a <= 0) break
    const life = 26 + hash(i, 21) * 40
    const u = (t + hash(i, 22) * life) / life
    const k = Math.floor(u)
    const f = u - k
    const x0 = GLASS.x0 + 0.04 + hash(i, k, 23) * (W - 0.08)
    const y0 = GLASS.y0 + 0.1 + hash(i, k, 24) * (H - 0.2)
    const r = 0.012 + hash(i, k, 25) ** 2 * 0.03
    const runs = hash(i, k, 26) < 0.3 && r > 0.02 && rain > 0.15
    let size = r * Math.min(1, (f * life) / 2)
    let y = y0
    let x = x0
    let alpha = a
    if (runs) {
      const run = Math.max(0, (f - 0.72) / 0.28)
      if (run > 0) {
        const n = 3
        const s = run - Math.sin(2 * Math.PI * n * run) / (2 * Math.PI * n)
        const dist = Math.min(H - (y0 - GLASS.y0), 0.9 + hash(i, k, 27) * 1.8)
        y = y0 + s * dist
        x = x0 + Math.sin(s * 5 + i) * 0.02
        size *= 1 - 0.3 * run
        alpha *= 1 - smoothStep(run, 0.8, 1)
        ctx.strokeStyle = rgba('#6F78A6', 0.3 * alpha)
        ctx.lineWidth = size * 0.9
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    } else {
      alpha *= 1 - smoothStep(f, 0.92, 1)
    }
    if (size < 0.004) continue
    const warm = Math.max(0, Math.min(1, (x - GLASS.x0) / W))
    ctx.fillStyle = rgba(mixHex('#8790BE', '#C69A86', warm * 0.55), 0.32 * alpha)
    ctx.beginPath()
    ctx.ellipse(x, y, size * 0.82, size, 0, 0, Math.PI * 2)
    ctx.fill()
    if (size > 0.02) {
      ctx.fillStyle = rgba(mixHex('#D3D7F5', '#F4C799', warm), 0.5 * alpha)
      ctx.beginPath()
      ctx.arc(x + size * 0.25, y - size * 0.4, size * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
