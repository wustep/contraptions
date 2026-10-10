import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawShell, mix, rgba } from '../cast'
import { frame, hash, smooth } from '../kit'
import { SHELL, VALLEY } from '../worlds'
import { A, CLOUD_HIGH, CLOUD_LOW, daylight, deckAt, G, hingeAt, LIFT, MEADOW, pedalAt, PEDAL, rampFrame, SHELL_X, shellAt, shellSeen, slotAt, SLOT_W, TENTS } from './geo'
import { drawHeli, heliAt, washAt } from './heli'
import { drawAir, drawBreak, drawBreakSky, drawFarShafts, drawHaze, drawRays, drawShadows, drawSunlight, drawSunWash, drawValleyShade, sunAt } from './light'
import { herArrive, herSuited, HER_IN, HER_OUT, ianArrive, IAN_EXIT } from './paths'
import { drawSuit } from '../chamber/set'

/**
 * Montana, by show time (the VALLEY builder's): a green valley under low cloud, its walls going up into it, fog lying
 * on the meadow and along the slopes, the camp at the shell's foot, and the shell. The arrival is an overcast day;
 * the going is the morning after, grey until the shell has gone, and then the daylight.
 */

type Ctx = CanvasRenderingContext2D
type Frame = ReturnType<typeof frame>

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const ease = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/* ------------------------------------------------------------------ noise */

function vnoise(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash(i, seed, 7) * (1 - u) + hash(i + 1, seed, 7) * u
}
const fbm = (x: number, seed: number) => vnoise(x, seed) * 0.58 + vnoise(x * 2.13, seed + 1) * 0.28 + vnoise(x * 4.41, seed + 2) * 0.14

/* ------------------------------------------------------------------ the light */

/** The going is the morning after (paler, cooler); the arrival an overcast day. */
const morning = (t: number) => (t > 250 ? 1 : 0)

/** A colour in the light at `t`: the morning after is paler (the sun is a pass of its own, `drawSunWash`). */
function lit(c: string, t: number, _sun = 0): string {
  return mix(c, VALLEY.fog, 0.1 * morning(t))
}

/** How far the frame is from the valley floor, as a share: 0 close (a few cells), 1 the great wide. */
const farness = (f: Frame) => smooth(f.y1 - f.y0, 14, 110)

/* ------------------------------------------------------------------ soft shapes */

/** A soft round blob: an ellipse filled with a radial fade from `a` at its middle to nothing at its edge. */
function blob(ctx: Ctx, k: number, x: number, y: number, rx: number, ry: number, color: string, a: number, core = 0.35): void {
  if (a <= 0.003 || rx <= 0 || ry <= 0) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(core, rgba(color, a * 0.85))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** A silhouette across the frame: from `yAt(x)` down to `bottom`, sampled finely enough for the frame. */
function silhouette(ctx: Ctx, k: number, f: Frame, yAt: (x: number) => number, bottom: number, fill: string | CanvasGradient, x0 = -Infinity, x1 = Infinity): void {
  const a = Math.max(f.x0 - 1, x0)
  const b = Math.min(f.x1 + 1, x1)
  if (b <= a) return
  const step = Math.max((f.x1 - f.x0) / 260, 0.06)
  ctx.beginPath()
  ctx.moveTo(a * k, bottom * k)
  for (let x = a; x <= b + step; x += step) ctx.lineTo(Math.min(x, b) * k, yAt(Math.min(x, b)) * k)
  ctx.lineTo(b * k, bottom * k)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/**
 * Strata: long low banks of cloud or fog lying along a height, each a soft ellipse many times wider than it is tall,
 * spaced unevenly and drifting (the upper ones faster). Never a row of dots: each is long, and they overlap.
 */
function strata(ctx: Ctx, k: number, f: Frame, t: number, o: { y: number; spread: number; len: number; tall: number; color: string; a: number; seed: number; drift: number; gap?: number }): void {
  const reach = o.len * 1.6
  if (o.y - o.spread - o.tall * 2 > f.y1 || o.y + o.spread + o.tall * 2 < f.y0) return
  const step = o.len * (o.gap ?? 0.55)
  const drift = t * o.drift
  const i0 = Math.floor((f.x0 - reach - drift) / step)
  const i1 = Math.ceil((f.x1 + reach - drift) / step)
  if (i1 - i0 > 140) return
  for (let i = i0; i <= i1; i++) {
    const s = hash(i, o.seed, 1)
    if (s < 0.18) continue
    const x = i * step + drift + (hash(i, o.seed, 2) - 0.5) * step * 1.3
    const y = o.y + (hash(i, o.seed, 3) - 0.5) * 2 * o.spread
    const len = o.len * (0.55 + 0.9 * hash(i, o.seed, 4))
    blob(ctx, k, x, y, len, o.tall * (0.6 + 0.7 * hash(i, o.seed, 5)), o.color, o.a * (0.45 + 0.55 * s), 0.25)
  }
}

/* ------------------------------------------------------------------ the land's shape */

/** Ridged noise: sharp crests, rounded hollows. */
const ridged = (x: number, seed: number) => 1 - Math.abs(2 * vnoise(x, seed) - 1)
/** The valley's high walls, going up into the cloud: height above the meadow. */
function highWalls(x: number): number {
  const left = x < -20 ? Math.pow(-20 - x, 1.05) * 0.78 : 0
  const right = x > 26 ? Math.pow(x - 26, 1.05) * 0.74 : 0
  const edge = smooth(Math.abs(x - 3), 18, 40)
  return left + right + edge * (16 * ridged(x / 23, 21) + 7 * ridged(x / 8.5, 24) + 2.5 * fbm(x / 2.5, 25))
}
/** The spurs coming down to the meadow on either side, nearer: steeper, lower. */
function spurs(x: number): number {
  const left = x < -36 ? Math.pow(-36 - x, 1.08) * 0.62 : 0
  const right = x > 42 ? Math.pow(x - 42, 1.08) * 0.6 : 0
  const edge = smooth(Math.abs(x - 3), 32, 52)
  return Math.max(0, left + right - 1.5 + edge * (8 * ridged(x / 11, 22) + 3 * ridged(x / 4, 26) + 1.2 * fbm(x / 1.6, 27)))
}
/** The far end of the valley behind the shell's foot: low hills in the haze. */
const farEnd = (x: number) => 2.4 + 4.2 * fbm(x / 15, 11) + 1.4 * fbm(x / 4.5, 12)
/** The range beyond the valley's end, lost in the cloud: pale, far. */
const farRange = (x: number) => 24 + 14 * ridged(x / 19, 15) + 6 * ridged(x / 7, 16) + 2 * fbm(x / 2.2, 17)
/** The trees along the far side of the meadow, behind the camp: rounded crowns of every size. */
const treeline = (x: number) => {
  const crowns = (scale: number, seed: number, h: number) => {
    const i = Math.floor(x / scale)
    const fx = x / scale - i
    return h * (0.4 + 0.6 * hash(i, seed, 1)) * Math.sqrt(Math.max(0, 1 - (2 * fx - 1) ** 2))
  }
  return 0.55 + 0.7 * fbm(x / 5, 14) + Math.max(crowns(0.55, 13, 0.32), crowns(0.83, 18, 0.4) - 0.08)
}

/** The ridge nearest us, down the right of the picture: the helicopter comes round its shoulder. Its line, world y. */
const softplus = (v: number, w: number) => w * Math.log(1 + Math.exp(v / w))
function nearRidge(x: number): number {
  return -19 - 2.4 * fbm(x / 9, 31) - 3.5 * smooth(x, 95, 150) + 1.25 * softplus(76 - x, 7) + 1.4 * (fbm(x / 3, 33) - 0.5)
}

/* ------------------------------------------------------------------ the sky and the cloud */

function drawSky(ctx: Ctx, k: number, f: Frame, t: number): void {
  const d = daylight(t)
  const g = ctx.createLinearGradient(0, CLOUD_HIGH * k, 0, MEADOW * k)
  g.addColorStop(0, lit(VALLEY.skyHigh, t))
  g.addColorStop(0.7, lit(VALLEY.sky, t, d.sun * 0.35))
  g.addColorStop(1, lit(mix(VALLEY.sky, VALLEY.fog, 0.45), t, d.sun * 0.5))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
}

/** The cloud deck's far body: long strata along it, behind the shell. */
function drawCloudBack(ctx: Ctx, k: number, f: Frame, t: number): void {
  if (f.y0 > CLOUD_LOW + 8) return
  const d = daylight(t)
  const body = lit(VALLEY.cloud, t, d.glow * 0.4)
  const shade = lit(VALLEY.cloudShade, t)
  const top = Math.min(f.y0 - 1, CLOUD_HIGH - 20)
  const g = ctx.createLinearGradient(0, (CLOUD_LOW + 4) * k, 0, CLOUD_HIGH * k)
  g.addColorStop(0, rgba(shade, 0))
  g.addColorStop(0.4, rgba(mix(shade, body, 0.3), 0.55))
  g.addColorStop(1, rgba(body, 1))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, CLOUD_HIGH * k, (f.x1 - f.x0 + 2) * k, (CLOUD_LOW + 4 - CLOUD_HIGH) * k)
  ctx.fillStyle = body
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (CLOUD_HIGH - top + 0.5) * k)
  // Strata along it: shaded undersides low, pale bodies higher, drifting down the valley at their own speeds.
  strata(ctx, k, f, t, { y: -104, spread: 8, len: 60, tall: 9, color: body, a: 0.5, seed: 41, drift: 0.5 })
  strata(ctx, k, f, t, { y: -86, spread: 7, len: 48, tall: 6, color: body, a: 0.45, seed: 42, drift: 0.38 })
  strata(ctx, k, f, t, { y: -70, spread: 6, len: 40, tall: 4.2, color: mix(shade, body, 0.35), a: 0.35, seed: 43, drift: 0.3 })
  strata(ctx, k, f, t, { y: -56, spread: 5, len: 34, tall: 3, color: shade, a: 0.28, seed: 44, drift: 0.24 })
  drawBreakSky(ctx, k, t)
}

/** The cloud deck's near veil, in front of the shell: its crown goes up into it. Smooth, as the television had it. */
function drawCloud(ctx: Ctx, k: number, f: Frame, t: number): void {
  if (f.y0 > CLOUD_LOW + 8) return
  const d = daylight(t)
  const top = Math.min(f.y0 - 1, CLOUD_HIGH - 20)
  const body = lit(VALLEY.cloud, t, d.glow * 0.4)
  const shade = lit(VALLEY.cloudShade, t)
  const g = ctx.createLinearGradient(0, CLOUD_LOW * k, 0, CLOUD_HIGH * k)
  g.addColorStop(0, rgba(shade, 0))
  g.addColorStop(0.2, rgba(shade, 0.22))
  g.addColorStop(0.42, rgba(mix(shade, body, 0.35), 0.62))
  g.addColorStop(0.7, rgba(mix(shade, body, 0.6), 0.88))
  g.addColorStop(1, rgba(body, 0.96))
  // One fill, the deck's top held on above CLOUD_HIGH by the gradient itself: as two, a ramp up to it and a flat
  // fill over it, their half-cell overlap was cloud laid twice, a bright line straight across the shell.
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (CLOUD_LOW - top) * k)
  drawHeave(ctx, k, t, true)
  // The daylight: a glow behind the cloud where the shell went in, then the cloud opening there and the sun through.
  if (d.glow > 0 || d.sun > 0) drawBreak(ctx, k, t)
}

/**
 * The cloud taking the shell: as it pushes up into the deck, the cloud it shoulders aside rolls out from behind it along
 * the deck's underside, once on each of two beats (drawn behind the shell); on the chord it is gone, and the cloud
 * closes over where it went (drawn in front).
 */
function drawHeave(ctx: Ctx, k: number, t: number, front: boolean): void {
  const body = lit(VALLEY.cloud, t)
  const shade = lit(VALLEY.cloudShade, t)
  if (front) {
    // Gone: the cloud closes over the place it went, and goes on churning there through the hush, folding in on
    // itself, darker underneath, until it tears open in the same place.
    const s = t - G.gone
    const span = G.sun + 4 - G.gone
    if (s < -0.05 || s > span) return
    // After the break it thins away, slowly: no light of its own.
    const a = smooth(s, -0.05, 0.4) * (1 - smooth(t, G.sun + 0.3, G.sun + 4))
    const u = clamp01(s / span)
    const gx = SHELL_X - 1
    const gy = -54
    // Heavier as it gathers: the cloud there thick and dark underneath, the light behind it.
    // Only a little darker than the deck round it, and many soft billows run together, so it is weather and never a
    // thing: no lens, no single dark disc in the sky.
    const heavy = mix(shade, VALLEY.steelDark, 0.08 + 0.1 * u)
    blob(ctx, k, gx, gy - 2 + 2 * u, 34 - 5 * u, 10, heavy, (0.22 + 0.12 * u) * a, 0.2)
    for (let i = 0; i < 12; i++) {
      const turn = (i % 2 ? 1 : -1) * s * (0.2 + 0.04 * (i % 6))
      const ang = i * 0.53 + 0.7 * hash(i, 97, 3) + turn
      const r = (17 - 6 * u) * (0.45 + 0.55 * hash(i, 97, 1))
      const x = gx + Math.cos(ang) * r * 1.5
      const y = gy - 3 + Math.sin(ang) * r * 0.42 + 1.5 * u
      const size = 8 + 8 * hash(i, 97, 2)
      blob(ctx, k, x, y + 1.4, size * 1.1, 4.6 + 1.6 * hash(i, 97, 4), heavy, 0.28 * a, 0.2)
      blob(ctx, k, x + 0.8, y - 0.8, size * 0.95, 3.8 + 1.4 * hash(i, 97, 5), mix(body, heavy, 0.15 + 0.2 * u), 0.4 * a, 0.25)
    }
    return
  }
  for (const at of [G.heave1, G.heave2]) {
    const s = t - at
    if (s < -0.05 || s > 3.6) continue
    const u = ease(s / 3.4)
    const a = smooth(s, -0.05, 0.35) * Math.pow(1 - clamp01(s / 3.6), 1.3)
    const y = at === G.heave1 ? -50 : -55
    for (const dir of [-1, 1]) {
      const x = SHELL_X + dir * (16 + 30 * u)
      blob(ctx, k, x, y + 2.2, 24 + 9 * u, 4.4, mix(shade, VALLEY.ridgeFar, 0.35), 0.62 * a, 0.3)
      blob(ctx, k, x - dir * 3, y - 0.6, 22 + 9 * u, 3.8, body, 0.95 * a, 0.4)
    }
  }
}

/* ------------------------------------------------------------------ the land */

/** A fill going up a slope: its colour at the meadow, paling into the air with height. */
function slopeFill(ctx: Ctx, k: number, t: number, base: string, high: string, top = CLOUD_LOW - 10): CanvasGradient {
  const g = ctx.createLinearGradient(0, MEADOW * k, 0, top * k)
  g.addColorStop(0, lit(base, t))
  g.addColorStop(0.55, lit(mix(base, high, 0.45), t))
  g.addColorStop(1, lit(high, t))
  return g
}

function drawLand(ctx: Ctx, k: number, f: Frame, t: number): void {
  const d = daylight(t)
  const far = farness(f)
  if (f.y0 < MEADOW) {
    // The range beyond the valley's end, far and pale, its tops in the cloud.
    silhouette(ctx, k, f, (x) => MEADOW - farRange(x), MEADOW + 1, slopeFill(ctx, k, t, mix(VALLEY.ridgeFar, VALLEY.sky, 0.42 - 0.2 * d.sun), mix(VALLEY.ridgeFar, VALLEY.sky, 0.72 - 0.25 * d.sun), -50))
    // The valley's high walls on either side, going up into the cloud.
    silhouette(ctx, k, f, (x) => MEADOW - (highWalls(x) + farEnd(x) * 1.5 + 6), MEADOW + 1, slopeFill(ctx, k, t, mix(VALLEY.ridgeFar, VALLEY.ridge, 0.3 + 0.3 * d.sun), mix(VALLEY.ridgeFar, VALLEY.sky, 0.5 - 0.25 * d.sun)))
    // The cloud's skirt along them.
    strata(ctx, k, f, t, { y: -34, spread: 7, len: 22, tall: 3.2, color: lit(VALLEY.fog, t), a: 0.42 * (1 - 0.6 * d.sun), seed: 51, drift: 0.2 })
    // The far end of the valley, low in the haze behind the shell's foot.
    silhouette(ctx, k, f, (x) => MEADOW - farEnd(x), MEADOW + 1, slopeFill(ctx, k, t, mix(VALLEY.ridge, VALLEY.fog, 0.3 - 0.15 * d.sun), mix(VALLEY.ridge, VALLEY.fog, 0.5 - 0.2 * d.sun), MEADOW - 8))
    // The spurs, nearer and darker, coming down to the meadow on either side.
    silhouette(ctx, k, f, (x) => MEADOW - spurs(x), MEADOW + 1, slopeFill(ctx, k, t, mix(VALLEY.hill, VALLEY.ridge, 0.35), mix(VALLEY.ridge, VALLEY.sky, 0.4)))
    strata(ctx, k, f, t, { y: -14, spread: 5, len: 16, tall: 2.2, color: lit(VALLEY.fog, t), a: 0.38 * (1 - 0.6 * d.sun), seed: 52, drift: 0.16 })
    // The trees along the far side of the meadow, dark at their feet, hazier at their crowns.
    const tg = ctx.createLinearGradient(0, (MEADOW - 2) * k, 0, MEADOW * k)
    const clear = 1 - 0.55 * d.sun
    tg.addColorStop(0, lit(mix(mix(VALLEY.hill, VALLEY.meadowDark, 0.3), VALLEY.fog, (0.25 + 0.3 * far) * clear), t))
    tg.addColorStop(1, lit(mix(mix(VALLEY.meadowDark, VALLEY.oliveDark, 0.35), VALLEY.fog, (0.1 + 0.3 * far) * clear), t))
    // In the daylight, the haze behind them shines, shafts slanting through it: the trees dark against it, rimmed.
    drawHaze(ctx, k, f, t)
    drawFarShafts(ctx, k, f, t)
    silhouette(ctx, k, f, (x) => MEADOW - treeline(x), MEADOW + 0.5, tg)
    const close = 1 - smooth(f.y1 - f.y0, 10, 30)
    if (d.sun > 0.01 && close > 0.01) {
      // Light through the leaves at the crowns' edge, soft into them: a glow, not a drawn line.
      for (const [w, a] of [[0.025, 0.32], [0.07, 0.2], [0.16, 0.1]] as const) rim(ctx, k, f, (x) => MEADOW - treeline(x), w, rgba(VALLEY.floodlight, a * d.sun * close))
    }
  }
  // The meadow toward us: pale in the haze at the valley floor, darker nearer, with the shadows of the cloud on it.
  if (f.y1 > MEADOW) {
    const g = ctx.createLinearGradient(0, MEADOW * k, 0, (MEADOW + 55) * k)
    g.addColorStop(0, lit(mix(VALLEY.meadow, VALLEY.grass, 0.45), t))
    g.addColorStop(0.08, lit(VALLEY.meadow, t))
    g.addColorStop(0.5, lit(mix(VALLEY.meadow, VALLEY.meadowDark, 0.65), t))
    g.addColorStop(1, lit(mix(VALLEY.meadowDark, VALLEY.oliveDark, 0.45), t))
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, MEADOW * k, (f.x1 - f.x0 + 2) * k, (Math.max(f.y1, MEADOW) - MEADOW + 1) * k)
    if (f.y1 > MEADOW + 3) {
      strata(ctx, k, f, t, { y: 14, spread: 9, len: 26, tall: 4, color: VALLEY.meadowDark, a: 0.3, seed: 56, drift: 0.3 })
      strata(ctx, k, f, t, { y: 26, spread: 10, len: 30, tall: 5, color: VALLEY.meadowDark, a: 0.3, seed: 57, drift: 0.34 })
    }
  }
}

/** A rim of light along a silhouette's top edge, `w` cells deep. */
function rim(ctx: Ctx, k: number, f: Frame, yAt: (x: number) => number, w: number, fill: string): void {
  const step = Math.max((f.x1 - f.x0) / 260, 0.04)
  ctx.beginPath()
  let first = true
  for (let x = f.x0 - 1; x <= f.x1 + 1 + step; x += step) {
    const y = yAt(x)
    if (first) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
    first = false
  }
  for (let x = f.x1 + 1 + step; x >= f.x0 - 1 - step; x -= step) ctx.lineTo(x * k, (yAt(x) + w) * k)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** The mist lying on the valley floor, in front of everything on it: long low banks, thinning in the daylight. */
function drawFloorMist(ctx: Ctx, k: number, f: Frame, t: number): void {
  const d = daylight(t)
  const thin = 1 - 0.5 * d.sun
  const col = mix(lit(VALLEY.fog, t), VALLEY.floodlight, 0.45 * d.sun)
  const far = farness(f)
  // Along the far side of the meadow, among the camp: only seen from away.
  strata(ctx, k, f, t, { y: MEADOW - 1.6, spread: 0.8, len: 9, tall: 1.4, color: col, a: 0.4 * thin * far, seed: 53, drift: 0.2 })
  // Low over the valley floor toward us.
  if (f.y1 > MEADOW + 2) {
    strata(ctx, k, f, t, { y: 6, spread: 3, len: 20, tall: 2.4, color: col, a: 0.36 * thin, seed: 54, drift: 0.26 })
    strata(ctx, k, f, t, { y: 19, spread: 6, len: 30, tall: 3.6, color: col, a: 0.3 * thin, seed: 55, drift: 0.32 })
  }
}

/** The grass at the meadow's edge, seen close: blades of every height, leaning with the air. */
function drawGrass(ctx: Ctx, k: number, f: Frame, t: number): void {
  const tall = f.y1 - f.y0
  if (tall > 26 || f.y0 > MEADOW + 2 || f.y1 < MEADOW - 1) return
  const fade = 1 - smooth(tall, 16, 26)
  const step = 0.11
  const i0 = Math.floor(f.x0 / step) - 2
  const i1 = Math.ceil(f.x1 / step) + 2
  const dark = lit(mix(VALLEY.meadowDark, VALLEY.hill, 0.3), t)
  const pale = lit(VALLEY.grass, t)
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = i0; i <= i1; i++) {
    const x = i * step + (hash(i, 71, 1) - 0.5) * step
    const h = 0.05 + 0.2 * Math.pow(hash(i, 71, 2), 1.8)
    const lean = 0.25 * Math.sin(t * 0.8 + x * 0.6) + windAt(t, x) * 1.2
    const base = MEADOW + 0.02 + 0.04 * hash(i, 71, 3)
    const sun = sunAt(t, x)
    const tip = hash(i, 71, 4) > 0.5 ? pale : dark
    ctx.strokeStyle = rgba(sun > 0.01 ? mix(tip, VALLEY.lamp, 0.55 * sun) : tip, 0.85 * fade)
    ctx.lineWidth = Math.max(0.6, 0.022 * k)
    ctx.beginPath()
    ctx.moveTo(x * k, base * k)
    ctx.quadraticCurveTo((x + lean * h * 0.4) * k, (base - h * 0.6) * k, (x + lean * h) * k, (base - h) * k)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * The grass of the meadow toward us, seen close in the going: tufts in rows that grow and spread as they come nearer
 * (the ground seen a little from above), leaning in the air. `each` is told every tuft: where, how tall, its seed.
 */
function tufts(f: Frame, each: (x: number, y: number, h: number, i: number, j: number) => void): void {
  let y = MEADOW + 0.1
  let j = 0
  while (y < f.y1 + 0.4 && j < 60) {
    const depth = Math.min(4, y - MEADOW)
    const dx = 0.15 + 0.12 * depth
    const size = 0.07 + 0.075 * depth
    const i0 = Math.floor(f.x0 / dx) - 1
    const i1 = Math.ceil(f.x1 / dx) + 1
    for (let i = i0; i <= i1; i++) each(i * dx + (hash(i, j, 81) - 0.5) * dx, y + (hash(i, j, 83) - 0.5) * 0.08, size * (0.55 + 0.8 * hash(i, j, 82)), i, j)
    y += 0.13 + 0.1 * depth
    j++
  }
}
const fieldFade = (f: Frame, t: number) => (t > 300 ? 1 - smooth(f.y1 - f.y0, 11, 18) : 0)

function drawField(ctx: Ctx, k: number, f: Frame, t: number): void {
  const fade = fieldFade(f, t)
  if (fade <= 0.01 || f.y1 < MEADOW + 0.2) return
  const dark = rgba(mix(VALLEY.meadowDark, VALLEY.hill, 0.3), 0.42 * fade)
  const pale = rgba(mix(VALLEY.grass, VALLEY.meadow, 0.3), 0.5 * fade)
  ctx.save()
  ctx.lineCap = 'round'
  let row = -1
  const flush = () => {
    ctx.strokeStyle = dark
    ctx.stroke(darkPath)
    ctx.strokeStyle = pale
    ctx.stroke(palePath)
  }
  let darkPath = new Path2D()
  let palePath = new Path2D()
  tufts(f, (x, y, h, i, j) => {
    if (j !== row) {
      if (row >= 0) flush()
      darkPath = new Path2D()
      palePath = new Path2D()
      ctx.lineWidth = Math.max(0.6, (0.018 + 0.012 * Math.min(4, y - MEADOW)) * k)
      row = j
    }
    const lean = 0.3 * Math.sin(t * 0.7 + x * 0.5 + y) + 0.15
    for (let b = 0; b < 2; b++) {
      const path = hash(i, j * 3 + b, 84) > 0.5 ? palePath : darkPath
      const bx = x + (b - 0.5) * h * 0.25
      const bl = lean + (b - 0.5) * 0.5
      path.moveTo(bx * k, y * k)
      path.quadraticCurveTo((bx + bl * h * 0.35) * k, (y - h * 0.6) * k, (bx + bl * h) * k, (y - h) * k)
    }
  })
  if (row >= 0) flush()
  ctx.restore()
}

/** How hard the air pushes the grass at `x`: the rotor's wash, the shell's wake as it goes (signed: + to the right). */
function windAt(t: number, x: number): number {
  let w = 0
  const wash = washAt(t)
  if (wash > 0.01) {
    const hx = heliAt(t).p[0]
    const dx = x - hx
    w += Math.sign(dx) * wash * Math.exp(-Math.abs(dx) / 3.5) * (0.8 + 0.2 * Math.sin(t * 40 + x))
  }
  if (t > G.wake && t < G.wake + 3.5) {
    const u = (t - G.wake) / 3
    const front = 3 + 55 * ease(u)
    const dx = Math.abs(x - SHELL_X)
    w += Math.sign(x - SHELL_X || 1) * 0.9 * Math.exp(-((dx - front) ** 2) / 30) * (1 - clamp01(u))
  }
  return w
}

/* ------------------------------------------------------------------ the camp */

function tentPath(ctx: Ctx, k: number, x: number, w: number, h: number): void {
  const eave = h * 0.58
  ctx.beginPath()
  ctx.moveTo((x - w / 2) * k, MEADOW * k)
  ctx.lineTo((x - w / 2) * k, (MEADOW - eave) * k)
  ctx.lineTo((x - w * 0.12) * k, (MEADOW - h) * k)
  ctx.lineTo((x + w * 0.12) * k, (MEADOW - h) * k)
  ctx.lineTo((x + w / 2) * k, (MEADOW - eave) * k)
  ctx.lineTo((x + w / 2) * k, MEADOW * k)
  ctx.closePath()
}

function drawTent(ctx: Ctx, k: number, t: number, i: number, front: boolean): void {
  const { x, w, h } = TENTS[i]
  const d = daylight(t)
  const sun = d.sun * 0.4 * smooth(Math.abs(x), 45, 10)
  const face = lit(VALLEY.canvas, t, sun)
  const shade = lit(VALLEY.canvasShade, t, sun * 0.5)
  if (!front) blob(ctx, k, x, MEADOW + 0.05, w * 0.75, 0.22, VALLEY.oliveDark, 0.35, 0.5)
  tentPath(ctx, k, x, w, h)
  const g = ctx.createLinearGradient((x - w / 2) * k, 0, (x + w / 2) * k, 0)
  g.addColorStop(0, face)
  g.addColorStop(0.55, face)
  g.addColorStop(1, shade)
  ctx.fillStyle = g
  ctx.fill()
  // The roof's slopes a shade darker than the walls.
  ctx.fillStyle = rgba(VALLEY.canvasShade, 0.35)
  ctx.beginPath()
  ctx.moveTo((x - w / 2) * k, (MEADOW - h * 0.58) * k)
  ctx.lineTo((x - w * 0.12) * k, (MEADOW - h) * k)
  ctx.lineTo((x + w * 0.12) * k, (MEADOW - h) * k)
  ctx.lineTo((x + w / 2) * k, (MEADOW - h * 0.58) * k)
  ctx.lineTo((x + w / 2) * k, (MEADOW - h * 0.52) * k)
  ctx.lineTo((x - w / 2) * k, (MEADOW - h * 0.52) * k)
  ctx.closePath()
  ctx.fill()
  // Its door: a dark triangle of the open flap, on its right (the decon tent's doors are at its ends).
  if (i === 0) return
  const dx = x + w / 2 - 0.35
  ctx.fillStyle = mix(VALLEY.oliveDark, VALLEY.shellDark, 0.5)
  ctx.beginPath()
  ctx.moveTo((dx - 0.3) * k, MEADOW * k)
  ctx.lineTo((dx - 0.05) * k, (MEADOW - h * 0.55) * k)
  ctx.lineTo((dx + 0.22) * k, MEADOW * k)
  ctx.closePath()
  ctx.fill()
}

function drawTruck(ctx: Ctx, k: number, t: number, x: number, face: 1 | -1): void {
  const d = daylight(t)
  const body = lit(VALLEY.olive, t, d.sun * 0.4 * 0.3)
  const dark = VALLEY.oliveDark
  const y = MEADOW
  ctx.fillStyle = dark
  ctx.fillRect((x - 1.6) * k, (y - 0.55) * k, 3.2 * k, 0.25 * k)
  ctx.fillStyle = lit(mix(VALLEY.olive, VALLEY.canvasShade, 0.35), t)
  ctx.beginPath()
  const bx0 = face > 0 ? x - 1.55 : x - 0.3
  ctx.moveTo(bx0 * k, (y - 0.55) * k)
  ctx.lineTo(bx0 * k, (y - 1.35) * k)
  ctx.quadraticCurveTo((bx0 + 0.92) * k, (y - 1.55) * k, (bx0 + 1.85) * k, (y - 1.35) * k)
  ctx.lineTo((bx0 + 1.85) * k, (y - 0.55) * k)
  ctx.closePath()
  ctx.fill()
  const cx0 = face > 0 ? x + 0.4 : x - 1.55
  ctx.fillStyle = body
  ctx.fillRect(cx0 * k, (y - 1.15) * k, 1.15 * k, 0.65 * k)
  ctx.fillStyle = mix(VALLEY.sky, VALLEY.steelDark, 0.5)
  ctx.fillRect((cx0 + (face > 0 ? 0.55 : 0.12)) * k, (y - 1.05) * k, 0.45 * k, 0.28 * k)
  ctx.fillStyle = mix(VALLEY.shellDark, dark, 0.3)
  for (const wx of [x - 1.05, x + 0.95]) {
    ctx.beginPath()
    ctx.arc(wx * k, (y - 0.24) * k, 0.24 * k, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The decon tent's end flaps: each flicks out as someone goes through its door, and swings back, damped. */
function drawFlaps(ctx: Ctx, k: number, t: number): void {
  const { x, w, h } = TENTS[0]
  const kick = (at: number) => (t > at ? Math.exp(-(t - at) / 0.55) * Math.abs(Math.sin((t - at) * 5.5 + 0.35)) : 0)
  const ends: [number, number, number][] = [
    [x - w / 2, -1, Math.max(kick(IAN_EXIT), kick(HER_OUT))],
    [x + w / 2, 1, kick(HER_IN)],
  ]
  for (const [ex, dir, swing] of ends) {
    const out = 0.62 * Math.min(1, swing)
    if (out < 0.01) continue
    ctx.fillStyle = lit(mix(VALLEY.canvasShade, VALLEY.canvas, 0.3), t)
    ctx.beginPath()
    ctx.moveTo(ex * k, (MEADOW - h * 0.58) * k)
    ctx.lineTo((ex + dir * out) * k, (MEADOW - 0.08) * k)
    ctx.lineTo(ex * k, MEADOW * k)
    ctx.closePath()
    ctx.fill()
  }
}

/** Whether the decon tent's canvas stands in front of them (while they pass through it, in the arrival). */
const deconOver = (t: number) => t > A.bass - 1 && t < A.end + 1

function drawCamp(ctx: Ctx, k: number, f: Frame, t: number): void {
  if (f.y1 < MEADOW - 4 || f.y0 > MEADOW + 2) return
  for (let i = 1; i < TENTS.length; i++) drawTent(ctx, k, t, i, false)
  drawTruck(ctx, k, t, -21.2, 1)
  drawTruck(ctx, k, t, 34.2, -1)
  // The pad the helicopter comes down over: a square of matting.
  ctx.fillStyle = lit(mix(VALLEY.road, VALLEY.oliveDark, 0.35), t)
  ctx.fillRect(7.9 * k, (MEADOW - 0.02) * k, 3.4 * k, 0.09 * k)
  // The decon tent: its shadow and flaps under them, its canvas over them while they go through it. By the morning
  // after, it has been struck.
  if (t > 200) return
  blob(ctx, k, TENTS[0].x, MEADOW + 0.05, TENTS[0].w * 0.75, 0.22, VALLEY.oliveDark, 0.35, 0.5)
  drawFlaps(ctx, k, t)
  if (!deconOver(t)) drawTent(ctx, k, t, 0, true)
}

/* ------------------------------------------------------------------ the lift */

function drawLift(ctx: Ctx, k: number, t: number): void {
  const deck = deckAt(t)
  const d = daylight(t)
  const slot = slotAt(t)
  const sun = d.sun * 0.4 * 0.8
  const steel = lit(VALLEY.steel, t, sun)
  const steelDark = lit(VALLEY.steelDark, t, sun * 0.5)
  const x = LIFT.x
  // The base: a steel skid on the meadow, with its outrigger pads.
  blob(ctx, k, x, MEADOW + 0.06, 2.4, 0.3, VALLEY.oliveDark, 0.4, 0.5)
  ctx.fillStyle = steelDark
  ctx.fillRect((x - LIFT.baseHalf) * k, LIFT.baseTop * k, 2 * LIFT.baseHalf * k, (MEADOW - LIFT.baseTop) * k)
  ctx.fillStyle = mix(steelDark, VALLEY.shellDark, 0.4)
  for (const s of [-1, 1]) ctx.fillRect((x + s * LIFT.baseHalf - (s > 0 ? 0.3 : 0)) * k, (MEADOW - 0.07) * k, 0.3 * k, 0.07 * k)
  ctx.fillStyle = steel
  ctx.fillRect((x - LIFT.baseHalf) * k, LIFT.baseTop * k, 2 * LIFT.baseHalf * k, 0.05 * k)
  // The scissor: six stages of crossed arms, from the base up to the deck's underside.
  const y0 = LIFT.baseTop
  const y1 = deck + LIFT.thick
  const n = LIFT.stages
  const hs = (y0 - y1) / n
  const L = 1.9
  const w = Math.sqrt(Math.max(0.01, L * L - hs * hs))
  const xl = x - w / 2
  const xr = x + w / 2
  const arm = Math.max(1, 0.085 * k)
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const ya = y0 - i * hs
    const yb = ya - hs
    ctx.strokeStyle = steelDark
    ctx.lineWidth = arm
    ctx.beginPath()
    ctx.moveTo(xr * k, ya * k)
    ctx.lineTo(xl * k, yb * k)
    ctx.stroke()
    ctx.strokeStyle = steel
    ctx.beginPath()
    ctx.moveTo(xl * k, ya * k)
    ctx.lineTo(xr * k, yb * k)
    ctx.stroke()
  }
  ctx.fillStyle = mix(steelDark, VALLEY.shellDark, 0.5)
  for (let i = 0; i < n; i++) {
    const ym = y0 - (i + 0.5) * hs
    ctx.fillRect((x - 0.035) * k, (ym - 0.035) * k, 0.07 * k, 0.07 * k)
  }
  // The pins at the arms' ends, where each stage joins the next: linked arms, so folded flat it is a lift's stack and
  // not a coil. (With pins only at the crossings, the light and dark arms folded into one zigzag, a spring.)
  for (let i = 0; i <= n; i++) {
    const yj = y0 - i * hs
    for (const xj of [xl, xr]) {
      ctx.fillStyle = mix(steelDark, VALLEY.shellDark, 0.55)
      ctx.beginPath()
      ctx.arc(xj * k, yj * k, Math.max(1.2, 0.07 * k), 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = steel
      ctx.beginPath()
      ctx.arc(xj * k, yj * k, Math.max(0.5, 0.03 * k), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // The ram: from the base up to the second stage's crossing.
  const ramTop: Pt = [x + 0.02, y0 - 1.5 * hs]
  const ramFoot: Pt = [x - w * 0.36, y0 - 0.02]
  ctx.strokeStyle = mix(steelDark, VALLEY.shellDark, 0.35)
  ctx.lineWidth = Math.max(1, 0.13 * k)
  ctx.beginPath()
  ctx.moveTo(ramFoot[0] * k, ramFoot[1] * k)
  ctx.lineTo((ramFoot[0] + (ramTop[0] - ramFoot[0]) * 0.55) * k, (ramFoot[1] + (ramTop[1] - ramFoot[1]) * 0.55) * k)
  ctx.stroke()
  ctx.strokeStyle = steel
  ctx.lineWidth = Math.max(0.8, 0.06 * k)
  ctx.beginPath()
  ctx.moveTo((ramFoot[0] + (ramTop[0] - ramFoot[0]) * 0.5) * k, (ramFoot[1] + (ramTop[1] - ramFoot[1]) * 0.5) * k)
  ctx.lineTo(ramTop[0] * k, ramTop[1] * k)
  ctx.stroke()
  // The deck: a steel slab, its top lit by the slot once it opens, its toe-board darker.
  const top = mix(steel, SHELL.glow, 0.35 * slot.light * smooth(-deck, 1.5, 3))
  ctx.fillStyle = mix(steelDark, VALLEY.shellDark, 0.25)
  ctx.fillRect((x - LIFT.half) * k, deck * k, 2 * LIFT.half * k, LIFT.thick * k)
  ctx.fillStyle = top
  ctx.fillRect((x - LIFT.half) * k, deck * k, 2 * LIFT.half * k, 0.04 * k)
  // The ramps: planks hinged at the deck's ends, lying on the meadow or standing as its gates.
  for (const side of ['ian', 'her'] as const) {
    const [hx, hy] = hingeAt(t, side)
    const { u, n: nn } = rampFrame(t, side)
    const len = LIFT.ramp
    const th = 0.075
    ctx.fillStyle = steel
    ctx.beginPath()
    ctx.moveTo(hx * k, hy * k)
    ctx.lineTo((hx + u[0] * len) * k, (hy + u[1] * len) * k)
    ctx.lineTo((hx + u[0] * len - nn[0] * th) * k, (hy + u[1] * len - nn[1] * th) * k)
    ctx.lineTo((hx - nn[0] * th) * k, (hy - nn[1] * th) * k)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = steelDark
    ctx.fillRect((hx - 0.045) * k, (hy - 0.045) * k, 0.09 * k, 0.09 * k)
  }
  // The hose along the grass to the pedal's housing, and the pedal. Thin and down in the grass, the grass's own dark:
  // thick and near black on top of it, it ran to her and not to the pedal under her, a leash.
  ctx.strokeStyle = mix(VALLEY.oliveDark, VALLEY.shellDark, 0.25)
  ctx.lineWidth = Math.max(0.8, 0.028 * k)
  ctx.beginPath()
  ctx.moveTo((x + LIFT.baseHalf) * k, (MEADOW - 0.06) * k)
  ctx.bezierCurveTo((x + LIFT.baseHalf + 0.6) * k, (MEADOW + 0.04) * k, (PEDAL.x1 - 0.2) * k, (MEADOW + 0.04) * k, (PEDAL.x1 + 0.1) * k, (MEADOW - 0.03) * k)
  ctx.stroke()
  const press = pedalAt(t)
  const endY = MEADOW - 0.05 - PEDAL.rise * (1 - press)
  // The housing the pedal is hinged on and the hose goes into: a box, its top catching the light.
  ctx.fillStyle = steelDark
  ctx.fillRect((PEDAL.x1 - 0.08) * k, (MEADOW - 0.13) * k, 0.28 * k, 0.13 * k)
  ctx.fillStyle = steel
  ctx.fillRect((PEDAL.x1 - 0.08) * k, (MEADOW - 0.13) * k, 0.28 * k, Math.max(1, 0.025 * k))
  ctx.fillStyle = steel
  ctx.beginPath()
  ctx.moveTo(PEDAL.x1 * k, (MEADOW - 0.05) * k)
  ctx.lineTo(PEDAL.x0 * k, endY * k)
  ctx.lineTo(PEDAL.x0 * k, (endY + 0.05) * k)
  ctx.lineTo(PEDAL.x1 * k, MEADOW * k)
  ctx.closePath()
  ctx.fill()
}

/* ------------------------------------------------------------------ the shell and what falls from it */

function drawTheShell(ctx: Ctx, p: p5, k: number, f: Frame, t: number): void {
  const s = shellAt(t)
  const seen = shellSeen(t)
  if (seen <= 0.002) return
  const slot = slotAt(t)
  const [cx, cy] = s.c
  if (cy + s.h / 2 < f.y0 - 2 || cy - s.h / 2 > f.y1 + 2) return
  // Under it on the meadow: the dark it holds over the grass.
  const low = smooth(-(cy + s.h / 2), 40, 5)
  blob(ctx, k, cx, MEADOW + 0.4, 26, 3.2, VALLEY.meadowDark, 0.35 * seen * low, 0.3)
  drawShell(p, k, cx, cy, s.h, { light: 0.62, side: -0.5, mist: 0.16, mistColor: lit(VALLEY.fog, t), slot: slot.open > 0.1 ? slot.open : 0, slotLight: 0.14 * slot.light, alpha: seen, vapour: s.vapour })
  // The air between us and it, seen from away: the same shape, paled a little toward the sky.
  const haze = 0.1 * farness(f)
  if (haze > 0.004) {
    const hc = lit(mix(VALLEY.sky, VALLEY.fog, 0.4), t)
    drawShell(p, k, cx, cy, s.h, { light: 0, body: hc, rim: hc, dark: hc, alpha: seen * haze })
  }
  // The throat under the slot, down through the belly, so the lift can rise into it: open as the slot opens.
  const belly = cy + s.h / 2
  const foot = belly - 0.035 * s.h
  const w = SLOT_W
  const doors = smooth(slot.open, 0.12, 0.8)
  if (doors > 0.01) {
    const tall = 0.045 * s.h * slot.open
    ctx.save()
    ctx.globalAlpha *= seen
    const g = ctx.createLinearGradient(0, foot * k, 0, belly * k)
    g.addColorStop(0, SHELL.dark)
    g.addColorStop(1, mix(SHELL.dark, VALLEY.shellDark, 0.6))
    ctx.fillStyle = g
    ctx.beginPath()
    const r = Math.min(0.3, w / 2)
    // The throat the full width of the slot cut above it, coming up out of the dark as the doors part: opened from
    // its middle it stood narrow under the wide cut, a T.
    const hw = w / 2
    ctx.globalAlpha *= doors
    ctx.moveTo((cx - hw) * k, (foot + 0.02) * k)
    ctx.lineTo((cx - hw) * k, (belly - 0.1 - r) * k)
    ctx.quadraticCurveTo((cx - hw) * k, (belly - 0.08) * k, (cx - hw + r) * k, (belly - 0.08) * k)
    ctx.lineTo((cx + hw - r) * k, (belly - 0.08) * k)
    ctx.quadraticCurveTo((cx + hw) * k, (belly - 0.08) * k, (cx + hw) * k, (belly - 0.1 - r) * k)
    ctx.lineTo((cx + hw) * k, (foot + 0.02) * k)
    ctx.closePath()
    ctx.fill()
    // Its cut faces: the stone's thickness catching a little of the light inside, down either side.
    const edge = Math.max(0.04, 0.05 * w)
    for (const side of [-1, 1]) {
      const ex = cx + side * (hw - edge / 2)
      const eg = ctx.createLinearGradient(0, (foot - tall) * k, 0, belly * k)
      eg.addColorStop(0, rgba(SHELL.wallLit, 0.9 * doors))
      eg.addColorStop(1, rgba(SHELL.wallLit, 0.25 * doors))
      ctx.fillStyle = eg
      ctx.fillRect((ex - edge / 2) * k, (foot - tall) * k, edge * k, (belly - 0.12 - (foot - tall)) * k)
    }
    // The light from inside: pale high up the slot, fading down it into the dark.
    if (slot.light > 0.01) {
      ctx.save()
      ctx.beginPath()
      ctx.rect((cx - hw) * k, (foot - tall) * k, 2 * hw * k, tall * k)
      ctx.clip()
      const top = foot - tall
      ctx.save()
      ctx.translate(cx * k, top * k)
      ctx.scale(1, 1.6)
      const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.9 * k)
      lg.addColorStop(0, rgba(SHELL.glow, 0.6 * slot.light))
      lg.addColorStop(0.5, rgba(SHELL.fogLit, 0.18 * slot.light))
      lg.addColorStop(1, rgba(SHELL.fogLit, 0))
      ctx.fillStyle = lg
      ctx.fillRect(-w * k, -w * k, 2 * w * k, 2 * w * k)
      ctx.restore()
      ctx.restore()
    }
    ctx.restore()
  }
  if (slot.light > 0.01 && slot.open > 0.001 && doors < 0.99) {
    // A crack of light at the doors' seam, before they part: a thin bright line, soft at its ends. It goes as the
    // throat comes, handing over to it: put out the moment the throat began, the seam went dark between them.
    ctx.save()
    ctx.globalAlpha *= seen * (1 - doors)
    ctx.globalCompositeOperation = 'screen'
    const sy = foot - 0.03
    const lw = w * (0.35 + 0.65 * smooth(slot.open, 0, 0.1))
    const lg = ctx.createLinearGradient((cx - lw / 2) * k, 0, (cx + lw / 2) * k, 0)
    lg.addColorStop(0, rgba(SHELL.glow, 0))
    lg.addColorStop(0.25, rgba(SHELL.glow, 0.95 * slot.light))
    lg.addColorStop(0.75, rgba(SHELL.glow, 0.95 * slot.light))
    lg.addColorStop(1, rgba(SHELL.glow, 0))
    ctx.fillStyle = lg
    ctx.fillRect((cx - lw / 2) * k, (sy - 0.035) * k, lw * k, 0.07 * k)
    // Its light on the hull round it, soft all round: a flat pale block behind the line, with edges of its own, read
    // as something stuck on the hull, a scratch, not light coming through a seam.
    ctx.save()
    ctx.translate(cx * k, sy * k)
    ctx.scale(1, 0.32)
    const hr = lw * 0.85 * k
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, hr)
    halo.addColorStop(0, rgba(SHELL.fogLit, 0.3 * slot.light))
    halo.addColorStop(1, rgba(SHELL.fogLit, 0))
    ctx.fillStyle = halo
    ctx.fillRect(-hr, -hr, 2 * hr, 2 * hr)
    ctx.restore()
    ctx.restore()
  }
}

/** The slot's light falling from the belly: down the lift to a pool on the meadow. */
function drawSpill(ctx: Ctx, k: number, t: number): void {
  const slot = slotAt(t)
  const s = shellAt(t)
  if (slot.light <= 0.01 || slot.open < 0.05) return
  const belly = s.c[1] + s.h / 2
  const a = slot.light * shellSeen(t) * smooth(slot.open, 0.05, 0.7)
  const w0 = SLOT_W * 0.45
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  // Feathered: nested cones, faint at the widest, so the light has no edge in the air.
  const n = 5
  for (let j = 0; j < n; j++) {
    const wide = 1.35 - (0.75 * j) / (n - 1)
    const g = ctx.createLinearGradient(0, belly * k, 0, MEADOW * k)
    g.addColorStop(0, rgba(SHELL.fogLit, (0.2 * a) / n))
    g.addColorStop(1, rgba(SHELL.fogLit, (0.04 * a) / n))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((SHELL_X - w0 * wide) * k, belly * k)
    ctx.lineTo((SHELL_X + w0 * wide) * k, belly * k)
    ctx.lineTo((SHELL_X + 2.4 * wide) * k, (MEADOW + 0.2) * k)
    ctx.lineTo((SHELL_X - 2.4 * wide) * k, (MEADOW + 0.2) * k)
    ctx.closePath()
    ctx.fill()
  }
  blob(ctx, k, SHELL_X, MEADOW + 0.1, 5.5, 0.8, SHELL.fogLit, 0.26 * a, 0.3)
  ctx.restore()
}

/* ------------------------------------------------------------------ what the air does */

/** The fog the shell pushes out from under it as it comes to rest, rolling out along the meadow both ways. */
function drawSettle(ctx: Ctx, k: number, t: number): void {
  const s = t - A.settle
  if (s < -0.1 || s > 6.5) return
  const u = clamp01(s / 6)
  const front = 6 + 78 * (1 - Math.pow(1 - u, 2.2))
  const a = 0.75 * smooth(s, -0.1, 0.45) * (1 - u) ** 1.1
  const col = lit(VALLEY.fog, t)
  // A bank piling up under the belly as it pushes down, then rolling out both ways, its front the highest.
  blob(ctx, k, SHELL_X, MEADOW - 2.2, 16 + 10 * u, 4 * (1 - u) + 1, col, 0.55 * a, 0.3)
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = SHELL_X + dir * (front - i * 7)
      if (dir * (x - SHELL_X) < 3) continue
      const lead = 1 - i / 6
      blob(ctx, k, x, MEADOW - 1.8 - 1.6 * lead, 12 + 3 * i, 3 + 1.6 * lead, col, a * (0.45 + 0.55 * lead), 0.3)
    }
  }
}

/** The rotor's wash on the meadow: the grass pressed flat and pale under it, a little mist blown out sideways. */
function drawWash(ctx: Ctx, k: number, t: number): void {
  const w = washAt(t)
  if (w <= 0.01) return
  const hx = heliAt(t).p[0]
  blob(ctx, k, hx + 0.3, MEADOW + 0.12, 3.8 * (0.6 + 0.4 * w), 0.35, VALLEY.grass, 0.55 * w, 0.4)
  const col = lit(VALLEY.fog, t)
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.9 + i * 0.25) % 1
    for (const dir of [-1, 1]) {
      const x = hx + 0.3 + dir * (1.2 + ph * 4.5)
      // Coming up from nothing as it is blown out, as well as going: at full strength from its first frame, each puff
      // popped into being by the rotor.
      blob(ctx, k, x, MEADOW - 0.25 - ph * 0.5, 1.1 + ph * 1.4, 0.35 + ph * 0.3, col, 0.4 * w * (1 - ph) * Math.min(1, ph / 0.2), 0.3)
    }
  }
}

/** As the shell goes up into the cloud, the air it draws after it sweeps out across the meadow from under it. */
function drawWake(ctx: Ctx, k: number, t: number): void {
  const s = t - G.wake
  if (s < 0 || s > 3.5) return
  const u = clamp01(s / 3)
  const front = 3 + 55 * ease(u)
  const a = 0.5 * smooth(s, 0, 0.3) * (1 - u)
  const col = lit(VALLEY.fog, t)
  for (const dir of [-1, 1]) {
    blob(ctx, k, SHELL_X + dir * front, MEADOW - 1.6, 13, 2.8, col, a * 1.1, 0.3)
    blob(ctx, k, SHELL_X + dir * front * 0.85, MEADOW + 1.5, 11, 1.6, VALLEY.grass, a * 0.7, 0.3)
  }
}

/* ------------------------------------------------------------------ the set */

/** The valley, all of it, at show time `t`. */
export function drawValley(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  ctx.save()
  drawSky(ctx, k, f, t)
  drawCloudBack(ctx, k, f, t)
  drawLand(ctx, k, f, t)
  drawHeave(ctx, k, t, false)
  drawTheShell(ctx, p, k, f, t)
  drawValleyShade(ctx, k, f, t)
  drawCloud(ctx, k, f, t)
  drawAir(ctx, k, t, smooth(f.y1 - f.y0, 8, 40))
  drawCamp(ctx, k, f, t)
  drawSpill(ctx, k, t)
  drawLift(ctx, k, t)
  drawSettle(ctx, k, t)
  drawWash(ctx, k, t)
  drawWake(ctx, k, t)
  drawHeli(p, k, t)
  drawGrass(ctx, k, f, t)
  drawField(ctx, k, f, t)
  drawSunWash(ctx, k, f, t)
  drawSunlight(ctx, k, t, f.x0, f.x1, smooth(f.y1 - f.y0, 10, 40))
  drawShadows(ctx, k, t)
  drawFloorMist(ctx, k, f, t)
  drawRays(ctx, k, t, smooth(f.y1 - f.y0, 6, 30))
  ctx.restore()
}

/** What stands between us and them: their suits, the decon tent's canvas as they go through it, the near ridge. */
export function drawValleyOver(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  ctx.save()
  if (t > A.bass - 0.5 && t < A.end + 0.5) {
    // The suits (the chamber's), round each ball from when they put them on: pale in the day, going dark in the belly.
    const light = 1 - smooth(t, A.surge3 + 0.8, A.end - 0.3)
    const [ix, iy] = ianArrive(t)
    drawSuit(p, k, ix, iy, light)
    if (herSuited(t)) {
      const [hx, hy] = herArrive(t)
      drawSuit(p, k, hx, hy, light)
    }
  }
  if (deconOver(t)) drawTent(ctx, k, t, 0, true)
  if (f.x1 > -30 && f.y1 > -30) {
    const d = daylight(t)
    const g = ctx.createLinearGradient(0, -28 * k, 0, 45 * k)
    g.addColorStop(0, lit(mix(VALLEY.hill, VALLEY.oliveDark, 0.5), t))
    g.addColorStop(0.5, mix(VALLEY.oliveDark, VALLEY.shellDark, 0.3))
    g.addColorStop(1, mix(VALLEY.oliveDark, VALLEY.shellDark, 0.55))
    const line = (x: number) => {
      const y = nearRidge(x)
      // Pines along its line: a ragged edge of tops, of every height.
      const i = Math.floor(x * 1.5)
      const fx = x * 1.5 - i
      const tree = 0.5 + 1.3 * hash(i, 91, 1) * hash(i, 91, 2)
      return y - tree * (1 - Math.abs(fx - 0.5) * 2)
    }
    // Its line falls away to the left of -40, below any 16:9 frame, but a frame taller than 16:9 sees it fall: cut off
    // there, its end stood up as a sheer wall in the meadow. So it goes on to the frame's edge, laid under the ridge as
    // it always was and overlapping it a little, so the two are one shape and the ridge's own pines do not move.
    if (f.x0 - 1 < -40) silhouette(ctx, k, f, line, Math.max(f.y1, 40) + 2, g, -Infinity, -39.5)
    silhouette(ctx, k, f, line, Math.max(f.y1, 40) + 2, g, -40)
    void d
  }
  ctx.restore()
}
