import { sweepAt } from './decor'
import { MOMENTS, flashAt, shootAt } from './sky'
import { REACHES, handAt, petAt } from './hands'
import { mothAt } from './moth'
import { rimAt } from './rim'
import { CAT, WALKMAN } from './desk'
import { camera, catInViewAt } from './camera'
import { TRACKS, barTime, beatOf, drumsAt, grooving, smooth, trackAt, type Track } from './music'
import { LANDINGS, LAPS, ballAt, machineBusy } from './route'
import { rgba } from './canvas'
import { LAMP_ON, hash, lampAt, lightAt, lit } from './world'

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
/**
 * The climb: once the last track's drums have gone and the ball sits in the cup for good, the sill is the kitten's. It
 * gets up, walks to the books, hops onto the top one and up onto the sill (the ball's stair, the other way), turns,
 * walks along the sill under the window, turns round as a cat does before it lies down, settles, looks up at the moon,
 * and sleeps there. Seconds from `CLIMB`.
 */
export const CLIMB = barTime(LAST, LAST.exit) + 7
const C_CX = (CAT.x0 + CAT.chest) / 2
const SILL_DX = 1.58
const SIT_DX = -0.7
const MOON_AT = { x: -0.84, y: -5.0 }

/** Where it is on its way up: offset, facing (scale across, 1 right, -1 left), on its feet, reaching, walking. */
export function climbAt(t: number): { dx: number; dy: number; face: number; up: number; out: number; walk: number; phase: number; look: { x: number; y: number }; lookK: number } {
  const s = t - CLIMB
  const none = { dx: 0, dy: 0, face: 1, up: 0, out: 0, walk: 0, phase: 0, look: { x: 0, y: 0 }, lookK: 0 }
  if (s <= 0) return none
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u
  const ease = (a: number, b: number) => smooth(s, a, b)
  const arc = (a: number, b: number, h: number) => (s > a && s < b ? -h * Math.sin((Math.PI * (s - a)) / (b - a)) : 0)
  // Across, and up.
  let dx = lerp(0, 0.78, ease(0.8, 2.6))
  dx = lerp(dx, 2.12, ease(2.8, 3.6))
  dx = lerp(dx, SILL_DX, ease(5.0, 5.8))
  dx = lerp(dx, SIT_DX, ease(6.0, 8.4))
  let dy = lerp(0, -0.92, ease(2.8, 3.6))
  dy = lerp(dy, -1.42, ease(5.0, 5.8))
  dy += arc(2.8, 3.6, 0.3) + arc(5.0, 5.8, 0.25)
  // Turning: across through nothing, a cat turning round in place, seen side on.
  const turn = (a: number, b: number) => Math.cos(Math.PI * ease(a, b))
  let face = turn(4.0, 4.35)
  if (s > 8.6) face = -turn(8.6, 8.95)
  face = Math.sign(face || 1) * Math.max(0.25, Math.abs(face))
  // Before each hop it gathers itself, low on its haunches, and it lands with a give in its legs.
  const gather = (a: number) => smooth(s, a - 0.35, a - 0.05) * (1 - smooth(s, a - 0.05, a + 0.08))
  const give = (b: number) => (s > b && s < b + 0.35 ? Math.sin((Math.PI * (s - b)) / 0.35) : 0)
  const crouch = Math.max(gather(2.8), gather(5.0), 0.6 * give(3.6), 0.6 * give(5.8))
  const up = ease(0, 0.8) * (1 - ease(9.4, 10.2)) * (1 - 0.5 * crouch)
  const out = 0.45 * (Math.max(0, -arc(2.8, 3.6, 1)) + Math.max(0, -arc(5.0, 5.8, 1)))
  const walk = Math.max(ease(0.8, 1.1) * (1 - ease(2.3, 2.6)), ease(6.0, 6.3) * (1 - ease(8.1, 8.4)))
  // Where it looks: ahead, the way it goes; then, settled, up at the moon.
  const ahead = { x: C_CX + dx + Math.sign(face) * 2, y: dy - 0.5 }
  const moon = ease(10.2, 10.8)
  const look = { x: ahead.x + (MOON_AT.x - ahead.x) * moon, y: ahead.y + (MOON_AT.y - ahead.y) * moon }
  return { dx, dy, face, up, out, walk, phase: s * 9, look, lookK: ease(0.3, 0.8) }
}

const SLEEP_FROM = CLIMB + 13.3
/**
 * How asleep it is: at the start too, curled in the dark before the lamp, until the lamp comes on and it wakes; and
 * at the end, on the sill.
 */
export const sleepAt = (t: number): number => Math.max(1 - smooth(t, LAMP_ON + 0.6, LAMP_ON + 3.0), smooth(t, SLEEP_FROM, SLEEP_FROM + 6))
/** Waking, it yawns, as the first chord rings out. */
const WAKE_YAWN = LAMP_ON + 3.3

/** Where the Walkman is, for its glance at a new track. */
const WALKMAN_AT = { x: (WALKMAN.x0 + WALKMAN.x1) / 2, y: -WALKMAN.h / 2 }

/**
 * A new track: as each one after the first begins, out of the breath between, the kitten hears it, its ears come up
 * and forward and it glances at the Walkman a moment or two, then goes back to the ball. 0 to 1.
 */
export function newTrackAt(t: number): number {
  for (const tr of TRACKS) {
    if (tr.n === 0) continue
    const s = t - tr.from - 0.25
    if (s < 0 || s > 3.4) continue
    return smooth(s, 0, 0.35) * (1 - smooth(s, 2.2, 3.4))
  }
  return 0
}

/** Once, asleep, it dreams: an ear and the tip of its tail twitch, twice, and are still. */
const DREAM = SLEEP_FROM + 6.5
function dreamAt(t: number): number {
  let d = 0
  for (const at of [DREAM, DREAM + 0.7]) {
    const s = t - at
    if (s > 0 && s < 1.2) d += Math.exp(-s / 0.18) * Math.sin(s * 34)
  }
  return d
}

/**
 * Where it is looking: the ball, a little behind (its eyes lead its head); or, while a car's lights cross the wall,
 * those; or a flash of lightning in the clouds; or, late in the night, a shooting star through the window, and where it
 * went.
 */
function gaze(t: number, lag: number): { x: number; y: number } {
  const b0 = ballGaze(t, lag)
  // A new track: a glance at the Walkman it is coming from.
  const n = newTrackAt(t)
  const ball = { x: b0.x + (WALKMAN_AT.x - b0.x) * 0.85 * n, y: b0.y + (WALKMAN_AT.y - b0.y) * 0.85 * n }
  const sw = sweepAt(t - 0.35)
  const k = Math.min(1, sw.a * 1.6)
  const g = { x: ball.x + (sw.x - ball.x) * k, y: ball.y + (sw.y - ball.y) * k }
  const st = shootAt(t - 0.3)
  const s = { x: g.x + (st.x - g.x) * st.a, y: g.y + (st.y - g.y) * st.a }
  const fl = flashAt(t)
  const f = { x: s.x + (fl.x - s.x) * fl.look, y: s.y + (fl.y - s.y) * fl.look }
  // The moth, when it flies: now and then, a while at a time, its eyes go to it (a cat cannot leave a moth be).
  const m = mothAt(t - 0.2)
  const keen = mothKeen(t)
  const f0 = { x: f.x + (m.x - f.x) * keen, y: f.y + (m.y - f.y) * keen }
  // A hand coming in: it watches that, mostly.
  const h = handAt(t - 0.25)
  const hk = 0.8 * h.a
  const g1 = { x: f0.x + (h.x - f0.x) * hk, y: f0.y + (h.y - f0.y) * hk }
  // On its way to the sill, where it is going; then the moon.
  const c = climbAt(t)
  return { x: g1.x + (c.look.x - g1.x) * c.lookK, y: g1.y + (c.look.y - g1.y) * c.lookK }
}

/** How taken it is with the moth, 0 to 1: for spells of half a minute or so, while the moth flies. */
function mothKeen(t: number): number {
  const m = mothAt(t - 0.2)
  return m.a * m.fly * (1 - m.glass) * smooth(Math.sin(t * 0.21) + Math.sin(t * 0.13 + 1), 0.6, 1.1)
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
    if (REACHES.some((r) => at > r.at - 8 && at < r.at + r.dur + 10)) continue
    if (catInViewAt(at) && catInViewAt(at + 3.2) && (lap.lob === null || at + 4 < lap.lob - 8 * tr.period)) return at
  }
  return -100
})
export function yawnAt(t: number): number {
  for (const at of [WAKE_YAWN, ...YAWNS]) {
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
export const WASHES: number[] = [[1, 2], [3, 4], [5, 6], [7, 8]].map((tracks) => {
  for (const n of tracks) {
    const at = washIn(n)
    if (at > 0) return at
  }
  return -100
})

/** The first moment in track `n` a wash fits, or -100. */
function washIn(n: number): number {
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
}

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

/** How long a stretch takes: up onto its feet, the front stretched out long with a yawn, and back down. */
const STRETCH = 6.8
/** Everything a stretch reaches to: the cat's box, and its front paws out along the desk toward the books. */
const STRETCH_BOX: [number, number, number, number] = [CAT.x0 - 0.3, -1.25, CAT.chest + 0.6, 0.05]
/**
 * Its stretches: twice through the night, as a cat does now and then after lying still a long while, each in a phrase
 * it spends watching (never nodding along), while the camera holds the whole of it, the paws stretched out included;
 * clear of its yawns and washes, the hand, the lob, a car's lights and the sky's moments.
 */
export const STRETCHES: number[] = [[3, 4, 5], [8, 9, 10]].map((tracks) => {
  for (const n of tracks) {
    const at = stretchIn(n)
    if (at > 0) return at
  }
  return -100
})

/** The first moment in track `n` a stretch fits, or -100. */
function stretchIn(n: number): number {
  const lap = LAPS[n]
  const tr = TRACKS[n]
  const [bx0, by0, bx1, by1] = STRETCH_BOX
  const held = (from: number, to: number) => {
    for (let s = from; s <= to; s += 0.5) {
      const c = camera(s)
      const hh = c.cells / 2
      const hw = (hh * 16) / 9
      if (bx0 < c.x - hw + 0.1 || bx1 > c.x + hw - 0.1 || by0 < c.y - hh + 0.1 || by1 > c.y + hh) return false
    }
    return true
  }
  const sky = [...MOMENTS.lightning, ...MOMENTS.shooting]
  for (let k = 0; k < 80; k++) {
    const at = lap.cup + 12 + k * 2 * tr.period + hash(n, k, 151) * 1.5
    if (lap.lob !== null && at + STRETCH + 2 > lap.lob - 8 * tr.period) break
    if ([...YAWNS, ...WASHES].some((m) => m > at - 10 && m < at + STRETCH + 6)) continue
    if (REACHES.some((r) => r.at < at + STRETCH + 6 && r.at + r.dur > at - 6)) continue
    if (sky.some((m) => m > at - 12 && m < at + STRETCH + 10)) continue
    if (machineBusy(at, at + STRETCH)) continue
    if (!held(at - 1, at + STRETCH + 1)) continue
    let still = true
    for (let s = at - 1; s <= at + STRETCH + 1; s += 0.5) if (vibeAt(s) > 0.02 || sweepAt(s).a > 0.02) still = false
    if (still) return at
  }
  return -100
}

/**
 * Where a stretch is at `t`: how far up onto its feet (`up`), how far its front is stretched out along the desk, chest
 * down and rear up (`out`), and the yawn that comes with it at full stretch (`yawn`).
 */
export function stretchAt(t: number): { up: number; out: number; yawn: number } {
  for (const at of STRETCHES) {
    const s = t - at
    if (s < 0 || s > STRETCH) continue
    const up = smooth(s, 0.2, 1.3) * (1 - smooth(s, 5.4, 6.7))
    const out = smooth(s, 1.3, 2.6) * (1 - smooth(s, 3.7, 5.0))
    const yawn = Math.min(1, 2 * Math.max(0, Math.sin(Math.PI * Math.max(0, Math.min(1, (s - 1.9) / 2.2)))) ** 2)
    return { up, out, yawn }
  }
  return { up: 0, out: 0, yawn: 0 }
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
  const c = climbAt(t)
  if (c.dx === 0 && c.dy === 0 && c.face === 1) return catAt(ctx, lw, t, c)
  // Moved: the same drawing, carried, and turned about its middle. On the sill, its own soft shadow under it.
  ctx.save()
  ctx.translate(c.dx + C_CX, c.dy)
  if (c.dy < -1.3) {
    const g = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.6)
    g.addColorStop(0, 'rgba(14, 9, 26, 0.35)')
    g.addColorStop(1, 'rgba(14, 9, 26, 0)')
    ctx.fillStyle = g
    ctx.save()
    ctx.scale(1, 0.12)
    ctx.fillRect(-0.6, -0.6, 1.2, 1.2)
    ctx.restore()
  }
  ctx.scale(c.face, 1)
  ctx.translate(-C_CX, 0)
  catAt(ctx, lw, t, c)
  ctx.restore()
}

/** Whether, and how far, it has left its place on the desk: for its shadows there (`shade.ts`). */
export const awayAt = (t: number): number => smooth(t, CLIMB + 0.8, CLIMB + 1.6)

function catAt(ctx: Ctx, lw: number, t: number, c: ReturnType<typeof climbAt>): void {
  const lamp = lampAt(t)
  const sleep = sleepAt(t)
  const breath = Math.sin((2 * Math.PI * t) / (3.4 + sleep * 1.4))
  const l = Math.min(1, lightAt(CAT.chest + c.dx, -0.4 + c.dy) * lamp * 1.6 + 0.12)
  const fur = (k = 1) => lit(FUR, FUR_LIT, l * k)
  const { x0, chest, top } = CAT

  // Its tail, curled round the front of it, the tip lifting and settling.
  // A shooting star, or lightning, brings it out of the music to look, and it goes back in after.
  // A scratch under the chin: it shuts its eyes and leans into the hand.
  const pet = petAt(t) * (1 - sleepAt(t))
  const vibe = vibeAt(t) * (1 - shootAt(t - 0.3).a) * (1 - flashAt(t).look) * (1 - handAt(t).a) * (1 - mothKeen(t))
  // Stretching: up on its feet, the body lifted and tipped forward (chest down, rear up) about its rear, and longer;
  // the head down and forward with it, the eyes shut in a yawn.
  const s0 = stretchAt(t)
  const st = { up: Math.max(s0.up, c.up), out: Math.max(s0.out, c.out), yawn: s0.yawn }
  // Walking, the legs go by turns.
  const step = (i: number) => c.walk * 0.07 * Math.sin(c.phase + i * Math.PI)
  const L = 0.27 * st.up
  const tipF = 0.17 * st.out
  const long = 1 + 0.14 * st.out
  const REAR = x0 + 0.12
  const T = (x: number, y: number) => {
    const u = (x - REAR) * long
    return { x: REAR + u * Math.cos(tipF) - y * Math.sin(tipF), y: u * Math.sin(tipF) + y * Math.cos(tipF) - L }
  }
  const yawn = Math.max(yawnAt(t), st.yawn) * (1 - sleep)
  const tr = trackAt(t)
  // The tip lifts and settles on its own, or, nodding along, sways a bar at a time.
  const idle = 0.5 + 0.5 * Math.sin(t * 0.9 + Math.sin(t * 0.31) * 2)
  const sway = 0.5 + 0.5 * Math.sin((Math.PI * beatOf(tr, t)) / 2)
  const lift = (idle * (1 - vibe) + sway * vibe) * (1 - sleep)
  const tip = { x: chest - 0.2, y: -0.11 - 0.12 * lift }
  // Stretching, it goes up behind it instead, a question mark, its tip curling.
  const mix = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: a.x + (b.x - a.x) * st.up, y: a.y + (b.y - a.y) * st.up })
  const curl = Math.sin(t * 2.4) * 0.04
  const t0 = mix({ x: x0 + 0.08, y: -0.08 }, T(x0 + 0.02, -0.22))
  const t1 = mix({ x: x0 + 0.2, y: 0.02 }, T(x0 - 0.22, -0.4))
  const t2 = mix({ x: chest - 0.55, y: 0.0 }, { x: x0 - 0.3, y: -0.82 - L })
  const t3 = mix(tip, { x: x0 - 0.08 + curl, y: -1.02 - L })
  ctx.beginPath()
  ctx.moveTo(t0.x, t0.y)
  ctx.bezierCurveTo(t1.x, t1.y, t2.x, t2.y, t3.x, t3.y)
  ctx.lineWidth = 0.13
  ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
  ctx.stroke()
  ctx.lineWidth = 0.13 - lw * 2
  ctx.strokeStyle = fur(0.8)
  ctx.stroke()

  // Its legs, when it is up: the hind pair straight down under its rear, the fore pair under its chest, stretched out
  // along the desk at full stretch, the near of each pair a shade lighter.
  if (st.up > 0.01) {
    const leg = (from: { x: number; y: number }, to: { x: number; y: number }, w: number, k: number, bend = 0) => {
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      // Reaching out, a foreleg bends at the elbow, low, and lies along the desk to the paw.
      if (bend > 0) ctx.quadraticCurveTo(from.x + (to.x - from.x) * 0.3, to.y - 0.02, to.x, to.y)
      else ctx.lineTo(to.x, to.y)
      ctx.lineWidth = w
      ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
      ctx.stroke()
      ctx.lineWidth = w - lw * 2
      ctx.strokeStyle = fur(k)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(to.x + 0.02, to.y - 0.025, 0.055, 0.03, 0, 0, Math.PI * 2)
      ctx.fillStyle = lit('#B49276', CREAM_FUR, l * k)
      ctx.fill()
      ctx.lineWidth = lw * 0.7
      ctx.stroke()
    }
    for (const [i, [hx, k]] of ([[x0 + 0.42, 0.45], [x0 + 0.24, 0.6]] as const).entries()) {
      const hip = T(hx, -0.08)
      leg(hip, { x: hip.x - 0.02 + step(i), y: -0.005 }, 0.15, k)
    }
    for (const [i, [fx, k, ahead]] of ([[chest - 0.06, 0.7, 0.04], [chest - 0.2, 0.95, 0]] as const).entries()) {
      const sh = T(fx, -0.08)
      leg(sh, { x: sh.x + (0.42 + ahead) * st.out + 0.02 + step(i + 1), y: -0.005 }, 0.13, k, st.out)
    }
  }

  // The body: a loaf, breathing; up on its feet, lifted and tipped as it stretches.
  ctx.save()
  ctx.translate(REAR, -L)
  ctx.rotate(tipF)
  ctx.scale(long, 1)
  ctx.translate(-REAR, 0)
  ctx.scale(1, 1 + 0.018 * breath)
  // Lying, its underside is the desk; up on its feet, a belly, rounded up at either end.
  const lifted = smooth(st.up, 0, 0.3)
  const body = () => {
    const rb = -0.09 * lifted
    ctx.beginPath()
    ctx.moveTo(x0 + 0.06 + 0.06 * lifted, rb)
    ctx.bezierCurveTo(x0 - 0.06, -0.14 + rb, x0 - 0.02, top + 0.02, x0 + 0.3, top)
    ctx.bezierCurveTo(x0 + 0.62, top - 0.04, chest - 0.12, top - 0.02, chest, -0.38)
    ctx.bezierCurveTo(chest + 0.07, -0.25, chest + 0.06, -0.06 + rb, chest - 0.02 - 0.08 * lifted, rb)
    ctx.quadraticCurveTo((x0 + chest) / 2, 0.035 * lifted, x0 + 0.06 + 0.06 * lifted, rb)
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
  // The window's light along its back (`rim.ts`): peach at dusk, cool at night, pale under the moon.
  const rim = rimAt(t)
  ctx.strokeStyle = rgba(rim.color, 0.55 * rim.a)
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
  // The paws, tucked under its chest (until it is up on them).
  ctx.globalAlpha = 1 - smooth(st.up, 0, 0.25)
  ctx.beginPath()
  ctx.ellipse(chest - 0.13, -0.045, 0.1, 0.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = lit('#B49276', CREAM_FUR, l)
  ctx.fill()
  ctx.lineWidth = lw * 0.7
  ctx.stroke()
  ctx.restore()

  // Asleep, its tail comes round the front of it, along the desk, and its tip tucks up under its chin.
  const wrap = smooth(sleep, 0.3, 1)
  if (wrap > 0.01) {
    // It comes round (and, waking, goes back) along the desk: its tip from its rear to under its chin.
    const len = wrap
    const from = { x: x0 + 0.1, y: -0.05 }
    const reach = x0 + 0.3 + (chest + 0.02 - x0 - 0.3) * len
    const c1 = { x: x0 + 0.1 + (reach - x0 - 0.1) * 0.35, y: 0.0 }
    const c2 = { x: x0 + 0.1 + (reach - x0 - 0.1) * 0.75, y: 0.0 }
    const end = { x: reach, y: -0.06 - 0.1 * len - 0.04 * Math.abs(dreamAt(t - 0.15)) }
    ctx.save()
    ctx.globalAlpha = smooth(wrap, 0, 0.12)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y)
    ctx.lineCap = 'round'
    ctx.lineWidth = 0.12
    ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
    ctx.stroke()
    ctx.lineWidth = 0.12 - lw * 2
    ctx.strokeStyle = fur(0.85)
    ctx.stroke()
    // Its tip a shade darker, as a ginger's is.
    ctx.beginPath()
    ctx.arc(end.x, end.y, 0.06 - lw, 0, Math.PI * 2)
    ctx.fillStyle = lit(FUR_DARK, FUR, l)
    ctx.fill()
    ctx.restore()
  }

  // The head: it turns to the ball, and when it sleeps it comes down onto its paws; washing, it dips to the paw with
  // each lick, and leans into it as the paw goes over its ear.
  const wash = washAt(t)
  const over = Math.max(0, wash.paw - 1)
  const hx0 = CAT.head.x
  const hy0 = CAT.head.y - 0.025 * pet + 0.26 * sleep + 0.006 * breath + 0.028 * vibe * nodAt(t) - 0.03 * yawn + wash.k * (0.03 + 0.02 * wash.lick + 0.02 * over)
  // Its gaze, in its own frame: carried and turned as it is.
  const gz = gaze(t, 0.22)
  const look = { x: C_CX + (gz.x - c.dx - C_CX) * Math.sign(c.face), y: gz.y - c.dy }
  const dx = look.x - hx0
  const dy = look.y - hy0
  const d = Math.hypot(dx, dy) || 1
  const awake = 1 - sleep
  const watch = awake * (1 - vibe) * (1 - yawn) * (1 - wash.k) * (1 - pet)
  const lx = (dx / d) * watch
  const ly = (dy / d) * watch + 0.25 * vibe * awake
  // With the body as it stretches: down and forward, over its outstretched paws.
  const carried = T(hx0, hy0 + 0.02)
  const hx = carried.x + lx * 0.035 + 0.12 * st.out
  const hy = carried.y - 0.02 + ly * 0.02 + 0.1 * st.out
  const tilt = lx * 0.12 - ly * 0.06 - yawn * 0.12 + sleep * 0.3 + vibe * awake * 0.08 * Math.sin((Math.PI * beatOf(tr, t)) / 2) +
    wash.k * (0.1 + 0.32 * over) + pet * (0.2 + 0.03 * Math.sin(t * 2.2)) + tipF * 0.6
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(tilt)
  const RX = 0.25
  const RY = 0.215
  // The ears, the near one flicking.
  const flick = flickAt(t) * awake + dreamAt(t) * sleep
  const perk = newTrackAt(t) * awake * (1 - yawn) * (1 - wash.k)
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * 0.14, -0.13)
    // Hearing a new track, both ears come up and turn a little forward.
    ctx.rotate(side * 0.25 + (side > 0 ? flick * 0.35 : 0) - side * sleep * 0.25 + side * yawn * 0.3 + side * pet * 0.2 - side * 0.14 * perk)
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
  // The window's light over the top of its head.
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.beginPath()
  ctx.ellipse(0, 0, RX - lw * 1.4, RY - lw * 1.4, 0, Math.PI * 1.08, Math.PI * 1.92)
  ctx.strokeStyle = rgba(rim.color, 0.45 * rim.a)
  ctx.lineWidth = lw * 1.4
  ctx.stroke()
  ctx.restore()
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
  const px = lx * 0.03
  const py = ly * 0.026
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
    // Up the side of its head and over the ear: the wipe that is the wash.
    const ear = { x: hx + 0.13, y: hy - 0.19 }
    const rest = { x: chest - 0.08, y: -0.08 }
    const px = rest.x + (chin.x - rest.x) * p + (ear.x - chin.x) * over
    const py = rest.y + (chin.y - rest.y) * p + (ear.y - chin.y) * over
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    // Round the outside of its cheek as it goes over the ear, not across its face.
    // Over the ear, the forearm bends round the outside of its cheek, not across its face.
    const bend = { x: from.x + 0.07 + over * (hx + 0.36 - from.x - 0.07), y: (from.y + py) / 2 + 0.03 + over * 0.08 }
    ctx.quadraticCurveTo(bend.x, bend.y, px, py)
    ctx.lineWidth = 0.1
    ctx.strokeStyle = 'rgba(26, 21, 38, 1)'
    ctx.stroke()
    ctx.lineWidth = 0.1 - lw * 2
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
