import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../parts'
import { drawLick, type Lick } from './fire'
import { frame, hash, scenery, smooth } from './kit'
import { WICK_BACK, WICK_LEFT } from './loft/sneak-beats'
import { DOORS, FESTIVAL, GAZE, KNOCKS, LAST, ROLL, SILENCE, SILL_AT, THEME, WINDUP, level } from './music'
import { IN_MOUTH, OUT_MOUTH, type Mouth } from './mouths'
import type { SparkShow } from './show'
import { ASH, FIRES, FLAME_CORE, FLAME_RIM, LOFT, SPARK, type WorldKey } from './worlds'

/**
 * What makes the ball a spark, over every world: its flame, and the veil of fire at every door. The director's file:
 * parts never draw either. A part only has to keep the spark's flame in mind (it rises over the ball, a little under
 * a cell tall at the start and more than a cell by the fireworks) and mark a segment `hidden` where something in front
 * covers the spark, or its flame would show through.
 */

/* ------------------------------------------------------------------ heat */

/**
 * How big the spark's flame is at `t`: 1 is a candle's flame. It follows the orchestra (`level`), so the spark grows
 * as the music does, from a careful flicker in the loft to a comet on the night express. In the silence it all but
 * goes out; the roll fans it back; on the first last chord the wick catches (a flare that settles to a candle's
 * flame), and on the second the slam's draught makes it flinch.
 */
export function heat(t: number): number {
  if (t < THEME) return 1
  // Holding its breath on the second knock it stops following the orchestra too: dead still, not drifting with it.
  const hold = held(t)
  const lv = hold > 0 ? level(t) + (level(HELD.from + 0.1) - level(t)) * hold : level(t)
  const grown = 0.7 + 1.9 * Math.pow(lv, 1.4)
  // The silence: it sinks to an ember at once (the silence is the stillest frame), and the roll brings it roaring back.
  const out = smooth(t, SILENCE - 0.05, SILENCE + 0.3) * (1 - smooth(t, ROLL, ROLL + 0.12))
  const flare = t >= ROLL ? 1.6 * Math.exp(-(t - ROLL) / 0.8) : 0
  // Nothing shrinks before the chord: the ease down to a candle's flame starts on it, under the wick's catch.
  const home = smooth(t, LAST[0], LAST[0] + 0.9)
  const live = grown * (1 - out) + 0.06 * out + flare
  return (live * (1 - home) + 1 * home + catching(t)) * freeze(t) * draught(t)
}

/** The wick catching on the first last chord: a flare up in 25 ms, dying back with the ease (tau 0.35 s). */
function catching(t: number): number {
  return 1.1 * wickCatch(t)
}

/**
 * The wick catching, 0..1: up in 25 ms on the first last chord, dying back over about a second. The flame flares by
 * it, and the loft's light lifts with it (`set.ts`, `stove-light.ts`), which otherwise tops out below the spark's heat.
 */
export function wickCatch(t: number): number {
  const u = t - LAST[0]
  if (u <= 0 || u > 2.5) return 0
  return smooth(u, 0, 0.025) * Math.exp(-Math.max(0, u - 0.025) / 0.35)
}

/** The stove door's slam on the second last chord: its draught ducks the flame to about 70%, back within 0.4 s. */
function draught(t: number): number {
  const u = t - LAST[1]
  if (u <= 0 || u > 2) return 1
  return 1 - 0.3 * smooth(u, 0, 0.02) * Math.exp(-Math.max(0, u - 0.02) / 0.14)
}

/**
 * On the rack, when the candles knock and the cat half wakes (`KNOCKS`), the spark holds its breath: its flame
 * ducks to about 60% at once. On the first knock it comes back over most of a second. On the second, with the cat's
 * head up and the cut back to the spark, it keeps holding it, dead still (`held`), until it gathers to leap for the
 * candle arm, and lets it out as it springs.
 */
function freeze(t: number): number {
  const u = t - KNOCKS[0]
  const first = u <= 0 || u > 1.6 ? 0 : smooth(u, 0, 0.1) * Math.exp(-Math.max(0, u - 0.1) / 0.32)
  const d = Math.max(first, held(t))
  return (1 - 0.4 * d) * (1 - 0.3 * gaze(t))
}

/**
 * The breath held on the second knock, 0..1: in within 0.1 s of the knock, held flat through the cut back to the
 * spark (about 29.24), let out over 0.35 s from its crouch before the leap off the pole's end (take-off about 29.45,
 * `loft/sneak-plan.ts`), so the flame is back to size in the air.
 */
const HELD = { from: KNOCKS[1], out: 29.4, back: 29.75 } as const
function held(t: number): number {
  if (t <= HELD.from || t >= HELD.back) return 0
  return smooth(t, HELD.from, HELD.from + 0.1) * (1 - smooth(t, HELD.out, HELD.back))
}

/**
 * The same gag paid off at home: when the woken cat's gaze comes round onto the candle (`GAZE.on`), the flame ducks
 * as it did on the knocks and holds dead still, no flicker, no lean, playing an ordinary candle; when the cat's eye
 * shuts (`GAZE.off`) it lets its breath out and flickers again.
 */
function gaze(t: number): number {
  if (t < GAZE.on - 0.05 || t > GAZE.off + 0.8) return 0
  return smooth(t, GAZE.on - 0.05, GAZE.on + 0.06) * (1 - smooth(t, GAZE.off, GAZE.off + 0.7))
}

/**
 * 0..1: how still the flame holds, its flicker (and the flicker of the light it throws, `loft/set.ts`) stopped: under
 * the cat's gaze at home, and while it holds its breath on the second knock.
 */
export function innocent(t: number): number {
  return Math.max(gaze(t), held(t))
}

/**
 * On the stove's sill the draught into the fire pulls at the flame: on each beat of the wind-up it streams in toward
 * the fire (to the right, where the firebox's mouth is), the second harder, and it stays drawn in until the leap.
 * Cells of lean at the tip per cell of flame.
 */
function sillDraught(t: number): number {
  if (t < WINDUP[0] - 0.1 || t > DOORS.glass) return 0
  const pull = (at: number, a: number) => (t < at - 0.08 ? 0 : a * smooth(t, at - 0.08, at) * (0.55 + 0.45 * Math.exp(-Math.max(0, t - at) / 0.3)))
  return Math.max(pull(WINDUP[0], 0.55), pull(WINDUP[1], 0.85))
}
/** How much the spark stands in front of the stove's fire on the sill (for its shadow): from the landing to the leap. */
const onSill = (t: number): number => smooth(t, SILL_AT - 0.15, SILL_AT + 0.1) * (1 - smooth(t, DOORS.glass - 0.4, DOORS.glass - 0.3))

/* ------------------------------------------------------------------ where the spark is, for the sets it lights */

/** Bound by the score once the show is built. */
export const bound: { show: SparkShow | null } = { show: null }

/**
 * Where the spark is at show time `t` if it is in `world` then, in that world's cells, with its heat and whether it is
 * out of sight: what a dark set (the loft, the night) lights itself by. Null in any other world, or before the show
 * is built. A part placed at (col, row) subtracts its own origin (the loft's are in `loft/layout.ts`).
 */
export function sparkIn(world: WorldKey, t: number): { x: number; y: number; heat: number; hidden: boolean } | null {
  const show = bound.show
  if (!show || show.worldKey(t) !== world) return null
  const here = show.at(t)
  return { x: here.x, y: here.y, heat: heat(t), hidden: here.hidden || here.scale <= 0.05 }
}

/* ------------------------------------------------------------------ the flame */

export interface FlameState {
  /** Bound once the show is built: the flame reads where the spark is from it. */
  show: SparkShow | null
  world: WorldKey
}

/** A flame's teardrop: base at (x, y), `h` tall, `w` wide at its belly, its tip swung `lean` (cells) sideways. */
function tongue(p: p5, k: number, x: number, y: number, w: number, h: number, lean: number, fill: string): void {
  p.fill(fill)
  p.beginShape()
  const n = 18
  for (let i = 0; i <= n; i++) {
    // Round the drop: the belly low, a point at the tip.
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2 // 0 at the base, 1 at the tip, back to 0
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
    const px = x + side * w * 0.5 * belly + lean * u * u
    const py = y - h * u + w * 0.25 * (1 - u) * Math.abs(side) * 0.3
    p.vertex(px * k, py * k)
  }
  p.endShape(p.CLOSE)
}

/**
 * How much bigger than its true size the flame draws, so heart and flame stay about 6% of the frame's 16:9 band (`hb`,
 * cells) however wide the camera is: 1 when close, up to 2.6 in the widest frames. Taken from the flame's steady
 * length, so its flicker still shows. None while it is a candle on its wick (it eases in off the wick and out onto it).
 */
export function flameBoost(t: number, hb: number, h: number): number {
  const steady = 2 * R + R * 2.1 * h
  const want = Math.max(1, Math.min(2.6, (0.06 * hb) / steady))
  const free = smooth(t, WICK_LEFT, WICK_LEFT + 0.8) * (1 - smooth(t, WICK_BACK - 0.35, WICK_BACK))
  return 1 + (want - 1) * free
}

/** The spark's flame, drawn over it in the world on the stage. One of these stands last in each world's `after`. */
export const flame = () =>
  scenery<FlameState>({
    name: 'spark-flame',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      const here = show.at(t)
      if (here.hidden || here.scale <= 0.05) return
      const h = heat(t)
      if (h <= 0.01) return
      // All but out (the silence): no flame to speak of, but a small guttering tongue off the dulled heart that never
      // goes out, rising on each breath and sinking between, so it is still a fire and still the spark.
      const ash = 1 - smooth(h, 0.1, 0.45)
      if (ash > 0.02) guttering(p, c.k, here.x, here.y, t, ash)
      if (ash > 0.98) return
      // The spark's velocity over the last few hundredths, in its own leg: the flame streams back from it.
      const a = show.where(t - 0.04)
      const b = show.where(t)
      const same = show.owner(t - 0.04) === show.owner(t)
      const vx = same ? (b[0] - a[0]) / 0.04 : 0
      const vy = same ? (b[1] - a[1]) / 0.04 : 0
      const flick = (0.12 * Math.sin(t * 23 + 1.3) + 0.08 * Math.sin(t * 37.7) + 0.05 * (hash(Math.floor(t * 30)) - 0.5)) * (1 - innocent(t))
      const { k } = c
      // Findable at a glance in a wide frame (on a phone held upright the 16:9 band is about 220 px tall): the flame
      // never draws smaller than about 6% of the band, heart and all. The heart keeps its true size, so every socket
      // and contact still holds; only the flame grows. A candle burning on its wick is a candle, at any distance.
      const f = frame(p, k)
      const hb = Math.min(f.y1 - f.y0, ((f.x1 - f.x0) * 9) / 16)
      const boost = flameBoost(t, hb, h)
      const len = R * (2.1 + 0.25 * flick) * h * boost
      const wide = R * 1.55 * Math.sqrt(h) * (1 + 0.1 * flick) * Math.sqrt(boost)
      // Speed lays the flame back along the way it came, up to nearly flat.
      const lean = Math.max(-1.6, Math.min(1.6, -vx * 0.09 + (s.world === 'loft' ? sillDraught(t) : 0))) * len + flick * R * 0.6
      const up = Math.max(0.35, 1 - Math.max(0, vy) * 0.05)
      const x = here.x
      const y = here.y - R * 0.35
      p.push()
      p.noStroke()
      const ctx = p.drawingContext as CanvasRenderingContext2D
      // Among the festival's bursts (gold stars on gold stars) a soft dusk round it, clear of the heart, so it stands
      // in front of the fire instead of being one more spark of it. No edge: it fades in off the heart and out again.
      if (s.world === 'railway' && t > FESTIVAL - 0.2 && t < SILENCE + 0.3) {
        const on = smooth(t, FESTIVAL - 0.2, FESTIVAL + 0.6) * (1 - smooth(t, SILENCE - 0.3, SILENCE + 0.3))
        shadow(ctx, k, here.x, here.y, R * here.scale, Math.max(R * 3.4, 0.03 * hb), 0.36 * on, [12, 10, 22], 1.55)
      }
      // On the stove's sill the firebox is right behind it: the fire goes deeper round the flame (its rim's colour, as
      // at a door), so the spark stands in front of the fire and not in it.
      if (s.world === 'loft') {
        const sill = onSill(t)
        if (sill > 0.01) shadow(ctx, k, here.x, here.y, R * here.scale, R * here.scale + 0.42, 0.42 * sill, SILL_SHADE, 1.6)
      }
      // A soft warm light round it, wide and faint: never a bright core of its own. It too keeps a size on the screen.
      // It blooms as the wick catches on the first last chord.
      const caught = wickCatch(t)
      const glow = Math.max(R * (5 + 6 * Math.min(2.5, h)), 0.11 * hb * Math.min(1, boost)) * (1 + 0.3 * caught) * k
      const g = ctx.createRadialGradient(x * k, y * k, R * k, x * k, y * k, glow)
      const dark = s.world === 'loft' || s.world === 'railway'
      g.addColorStop(0, `rgba(255, 196, 120, ${((dark ? 0.2 : 0.1) + 0.12 * caught) * (1 - 0.45 * ash)})`)
      g.addColorStop(1, 'rgba(255, 196, 120, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x * k - glow, y * k - glow, glow * 2, glow * 2)
      if (!dark) {
        // By day the sky is as bright as the spark: a warm light added over it lifts the spark off the sunset and the
        // whitewash, the way a flame outshines daylight close to.
        const halo = Math.max(R * 3.2, 0.05 * hb) * k
        const lg = ctx.createRadialGradient(x * k, (y - len * 0.25) * k, 0, x * k, (y - len * 0.25) * k, halo)
        lg.addColorStop(0, `rgba(255, 190, 110, ${0.18 * (1 - ash)})`)
        lg.addColorStop(0.45, `rgba(255, 170, 90, ${0.08 * (1 - ash)})`)
        lg.addColorStop(1, 'rgba(255, 160, 80, 0)')
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = lg
        ctx.fillRect(x * k - halo, (y - len * 0.25) * k - halo, halo * 2, halo * 2)
        ctx.restore()
      }
      if (ash > 0.02) ctx.globalAlpha = 1 - ash
      tongue(p, k, x, y, wide * 1.15, len * up * 1.1, lean, FLAME_RIM)
      tongue(p, k, x, y, wide * 0.8, len * up * 0.82, lean * 0.85, SPARK)
      tongue(p, k, x, y + R * 0.1, wide * 0.42, len * up * 0.5, lean * 0.6, FLAME_CORE)
      p.pop()
    },
  })

/**
 * A soft shadow round the spark (cells: the heart's radius `r`, the shadow's reach `out`), clear of the heart itself
 * so it never dulls it: what lifts it off a bright fire behind it. Drawn before the flame. It takes the flame's shape,
 * not a disc's: `tall` draws it out upward along the flame (its middle a little up the flame), so it reads as the
 * fire behind giving way round the flame and never as a dark ring or a hole. `col` is its colour: the darkest of
 * whatever it lies on (a fire's rim at a door, the night at the festival).
 */
export function shadow(
  ctx: CanvasRenderingContext2D,
  k: number,
  x: number,
  y: number,
  r: number,
  out: number,
  a: number,
  col: [number, number, number] = [12, 10, 22],
  tall = 1,
): void {
  if (a <= 0.01 || out <= r) return
  const c = col.map((v) => Math.round(v)).join(', ')
  const g = ctx.createRadialGradient(0, 0, r * 0.95 * k, 0, 0, out * k)
  g.addColorStop(0, `rgba(${c}, 0)`)
  g.addColorStop(Math.min(0.5, (r * 0.6) / out + 0.08), `rgba(${c}, ${(a * 0.9).toFixed(3)})`)
  g.addColorStop(0.55, `rgba(${c}, ${(a * 0.45).toFixed(3)})`)
  g.addColorStop(1, `rgba(${c}, 0)`)
  ctx.save()
  ctx.translate(x * k, (y - (tall - 1) * out * 0.45) * k)
  ctx.scale(1, tall)
  ctx.fillStyle = g
  ctx.fillRect(-out * k, -out * k, out * 2 * k, out * 2 * k)
  ctx.restore()
}

/**
 * The ember's last tongue: a small flame off the top of the coal that never quite goes out. Between breaths it is a
 * low guttering tongue about a quarter of a candle's flame, leaning and shrinking in the night air; on each breath it
 * rises to over half again. So in the silence the spark is barely alive, never gone.
 */
function guttering(p: p5, k: number, x: number, y: number, t: number, ash: number): void {
  const b = emberBreath(t - 0.12)
  const g = b * b
  const flick = 0.5 + 0.5 * Math.sin(t * 29 + 0.7) * Math.sin(t * 17.3)
  // Rooted where the candle's flame is (0.35 R up the heart), so even at its lowest its tip stands clear of the heart.
  const len = R * (1.25 + 1.0 * g) * (0.88 + 0.24 * flick)
  const wide = R * (0.55 + 0.3 * g)
  const lean = R * (0.3 * Math.sin(t * 3.1) + 0.12 * Math.sin(t * 1.3 + 0.4)) + R * 0.15 * (flick - 0.5)
  const base = y - R * 0.35
  p.push()
  p.noStroke()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.globalAlpha = ash * (0.78 + 0.22 * g)
  tongue(p, k, x + R * 0.05, base, wide, len, lean, FLAME_RIM)
  ctx.globalAlpha = ash * (0.62 + 0.38 * g)
  tongue(p, k, x + R * 0.05, base + R * 0.04, wide * 0.6, len * 0.66, lean * 0.7, SPARK)
  ctx.globalAlpha = ash * (0.3 + 0.6 * g)
  tongue(p, k, x + R * 0.05, base + R * 0.06, wide * 0.3, len * 0.36, lean * 0.5, FLAME_CORE)
  p.pop()
}

/* ------------------------------------------------------------------ the spark itself */

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

/**
 * The spark's heart: the ball, drawn here instead of by the stage (the show hands the stage no ball, `SparkShow.at`),
 * so it is a flame's heart and not a marble: no ink ring, no spinning dot, no trail of beads. Hot, it is gold going to
 * orange at its edge; in the silence it is an ember gone to ash with a dull red heart that breathes. At a door it
 * stays round and trails a short smear behind it (`stretch` says how much, `angle` which way it is going).
 */
export function drawSpark(p: p5, k: number, x: number, y: number, t: number, scale = 1, stretch = 1, angle = 0): void {
  if (scale <= 0.02) return
  const r = R * k * scale
  // 0 while it burns; 1 in the silence, when it is all but out.
  const ash = 1 - smooth(heat(t), 0.1, 0.45)
  const breathe = emberBreath(t)
  const core = mixHex(FLAME_CORE, mixHex(FLAME_RIM, ASH, 0.35 - 0.2 * breathe), ash)
  const body = mixHex(SPARK, mixHex(ASH, FLAME_RIM, 0.25), ash)
  const edge = mixHex(FLAME_RIM, mixHex(ASH, LOFT.soot, 0.45), ash)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(angle)
  // Through a door the heart stays round. What it went through trails off it: a short smear behind it along the way
  // it came, from its own colour at the heart to nothing, never more than a heart and a half long.
  if (stretch > 1.01 && ash < 0.5) {
    const tail = r + Math.min(2, (stretch - 1) * 1.5) * r
    const half = r * 0.8
    const [br, bg, bb] = rgb(body)
    const [xr, xg, xb] = rgb(edge)
    const sg = ctx.createLinearGradient(0, 0, -tail, 0)
    sg.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, 0.85)`)
    sg.addColorStop(0.5, `rgba(${xr}, ${xg}, ${xb}, 0.4)`)
    sg.addColorStop(1, `rgba(${xr}, ${xg}, ${xb}, 0)`)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(0, -half)
    ctx.quadraticCurveTo(-tail * 0.45, -half * 0.7, -tail, 0)
    ctx.quadraticCurveTo(-tail * 0.45, half * 0.7, 0, half)
    ctx.closePath()
    ctx.fill()
  }
  if (ash < 0.02) {
    const g = ctx.createRadialGradient(0, -0.25 * r, 0.05 * r, 0, 0, r)
    g.addColorStop(0, core)
    g.addColorStop(0.55, body)
    g.addColorStop(1, edge)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }
  // Going out, it is still the spark: its round heart, only dulled and crusted with ash over the top, the red of it
  // breathing up through the crust from underneath where it lies, never a flat pebble or one more coal. (Its tongue of
  // flame never quite goes out either: `guttering`.)
  const rr = r * (1 - 0.1 * ash)
  const dullCore = mixHex(SPARK, FLAME_RIM, 0.55 - 0.35 * breathe)
  const dullBody = mixHex(FLAME_RIM, ASH, 0.38 - 0.14 * breathe)
  const dullEdge = mixHex(FLAME_RIM, LOFT.soot, 0.55)
  const heart = () => {
    ctx.beginPath()
    ctx.arc(0, 0, rr, 0, Math.PI * 2)
  }
  heart()
  const g = ctx.createRadialGradient(0, 0.3 * rr, 0.05 * rr, 0, 0.1 * rr, rr)
  g.addColorStop(0, mixHex(core, dullCore, ash))
  g.addColorStop(0.55, mixHex(body, dullBody, ash))
  g.addColorStop(1, mixHex(edge, dullEdge, ash))
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  heart()
  ctx.clip()
  // The ash over its top: a grey film, thickest at the crown and gone by its middle, thinning as it breathes.
  const [ar, ag, ab] = rgb(mixHex(ASH, LOFT.soot, 0.25))
  const crust = ctx.createLinearGradient(0, -rr, 0, 0.25 * rr)
  crust.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${((0.85 - 0.3 * breathe) * ash).toFixed(3)})`)
  crust.addColorStop(0.6, `rgba(${ar}, ${ag}, ${ab}, ${((0.35 - 0.2 * breathe) * ash).toFixed(3)})`)
  crust.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`)
  ctx.fillStyle = crust
  ctx.fillRect(-rr, -rr, 2 * rr, 1.3 * rr)
  // One fine crack across the crust, glowing through it on the breath.
  const [er, eg, eb] = rgb(mixHex(FLAME_RIM, SPARK, 0.4 * breathe))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = `rgba(${er}, ${eg}, ${eb}, ${((0.15 + 0.55 * breathe) * ash).toFixed(3)})`
  ctx.lineWidth = Math.max(0.7, 0.07 * rr)
  ctx.beginPath()
  ctx.moveTo(-0.8 * rr, -0.28 * rr)
  ctx.lineTo(-0.3 * rr, -0.4 * rr)
  ctx.lineTo(0.1 * rr, -0.3 * rr)
  ctx.lineTo(0.55 * rr, -0.46 * rr)
  ctx.stroke()
  ctx.restore()
  ctx.restore()
}

/**
 * The ember's breath in the silence, 0..1: it glows up and ebbs about once a second, never quite steady, the way a
 * coal does in a draught.
 */
export function emberBreath(t: number): number {
  const b = 0.5 + 0.5 * Math.sin(t * 5.4 + 0.35 * Math.sin(t * 2.1))
  return b * b * (3 - 2 * b)
}

/**
 * The spark on the stage: the first thing in each world's pieces, so its `over` comes before every part's (a pan's
 * lip or a socket drawn over it still covers it, as it did the stage's ball) and before the veil and the flame.
 */
export const ember = () =>
  scenery<FlameState>({
    name: 'spark-ember',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      const here = show.at(t)
      if (here.hidden || here.scale <= 0.05) return
      drawSpark(p, c.k, here.x, here.y, t, here.scale, here.stretch, here.angle)
    },
  })

/* ------------------------------------------------------------------ the veil at a door */

export interface VeilState {
  show: SparkShow | null
  world: WorldKey
}

/**
 * How long before and after a door its fire is in the frame. The three doors out are an opening the camera flies
 * through with the spark (`DOORWAY`, below). The dash home is three doors in a sixth of a second, on the roll's
 * strokes: each is a flash of fire and no more, so the worlds it goes back through are seen, a few frames each (a
 * burner, the glory hole), before the loft.
 */
const FLASH = { before: 0.022, after: 0.028 }

/**
 * The flash's licks: scattered at random over the frame (no rows), sized on a power law (a few tall, many short), each
 * on its own clock as the band rises through the frame. The first few are big dark-red licks at the back, for depth.
 */
interface VeilLick {
  u: number
  v: number
  size: number
  rate: number
  seed: number
  back: boolean
}
const VEIL_BACK = 6
const VEIL_LICKS: VeilLick[] = Array.from({ length: 34 }, (_, i) => ({
  u: hash(i, 401),
  v: hash(i, 402),
  size: i < VEIL_BACK ? 0.75 + 0.25 * hash(i, 403) : 0.32 + 0.68 * Math.pow(hash(i, 403), 2.2),
  rate: 0.75 + 0.5 * hash(i, 404),
  seed: 500 + i * 3.7,
  back: i < VEIL_BACK,
}))

type RGB = [number, number, number]
const lerp3 = (a: RGB, b: RGB, f: number): RGB => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
const css = (c: RGB, al: number): string => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.max(0, Math.min(1, al))})`
const palette = (x: { rim: string; body: string; heart: string }): { rim: RGB; body: RGB; heart: RGB } => ({ rim: rgb(x.rim), body: rgb(x.body), heart: rgb(x.heart) })
/** The loft fire's rim gone deeper: the shadow behind the spark on the stove's sill. */
const SILL_SHADE: RGB = lerp3(rgb(FIRES.loft.rim), [20, 10, 8], 0.4)
/** Where one world's fire meets the next at a door: white heat, which any fire's colours go to without turning grey. */
const HOT: RGB = rgb('#FFF6E0')

/**
 * A door out, on its own clock (seconds from the cut). From `in0` fire comes up in the old world's mouth (the stove's
 * doorway, the furnace's port, the top balloon's jet), and the mouth flies at the camera: it grows about the point the
 * spark goes in by until its jambs have passed the frame's edges at `in1`. From `in1` to `out0`, two frames either
 * side of the cut, the frame is all fire. Then the new world's mouth (the glory hole, a burner's jet, the chimney)
 * starts past the frame's edges and closes to its true place by `out1` as the camera backs out of it, its fire going
 * back to the world's own. Inside the mouth the licks stream out past the spark from a point just ahead of it, in three
 * depths, so it is a passage and not a wall of fire.
 */
const DOORWAY = { in0: -0.24, in1: -0.035, out0: 0.035, out1: 0.3 }
const VEIL = { before: -DOORWAY.in0, after: DOORWAY.out1 }

/**
 * The passage's licks: each on its own bearing out from the vanishing point, at one of three depths, flying out and
 * growing as they come. They stay flames (a flame points up, whichever way it flies), their tips trailing back toward
 * the middle. The far ones are small, dark and slow; the near ones big, bright and fast, so they pass at different
 * speeds.
 */
interface TunnelLick {
  a: number
  layer: number
  phase: number
  seed: number
  size: number
}
const TUNNEL_LICKS: TunnelLick[] = Array.from({ length: 60 }, (_, i) => ({
  a: 2 * Math.PI * ((i * 0.618034 + 0.3 * hash(i, 421)) % 1),
  layer: i % 3,
  phase: hash(i, 422),
  seed: 700 + i * 4.1,
  size: 0.55 + 0.45 * hash(i, 423),
}))
/** The depths: cycles a second; how far out it goes (share of the farthest corner); its height there (share of the frame's). */
const DEPTHS = [
  { rate: 1.2, reach: 0.95, h: 0.22, a: 0.42 },
  { rate: 1.7, reach: 1.1, h: 0.36, a: 0.5 },
  { rate: 2.4, reach: 1.3, h: 0.58, a: 0.56 },
]
/** The mouth's edge is feathered over five rings this far apart (a share of its size): soft, never a drawn line. */
const FEATHER = 0.05
/** The passage's resolution, as a share of the frame's. */
const TUNNEL_RES = 0.5

let TUNNEL: HTMLCanvasElement | null = null
let TUNNEL_MASK: HTMLCanvasElement | null = null
function scratch(c: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const cv = c ?? document.createElement('canvas')
  if (cv.width !== w) cv.width = w
  if (cv.height !== h) cv.height = h
  return cv
}

function insidePoly(poly: Pt[], x: number, y: number): boolean {
  let yes = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) yes = !yes
  }
  return yes
}
/**
 * A mouth where it stands at `t`: laid so the spark's place at the door (`atDoor`, in the world's cells) is its
 * `anchor`, and moved on from there with its balloon or its engine.
 */
function mouthAt(m: Mouth, t: number, atDoor: Pt): Mouth {
  const [ex, ey] = m.drift ? m.drift(t) : [0, 0]
  const dx = atDoor[0] - m.anchor[0] + ex
  const dy = atDoor[1] - m.anchor[1] + ey
  if (Math.abs(dx) + Math.abs(dy) < 1e-6) return m
  const mv = (q: Pt): Pt => [q[0] + dx, q[1] + dy]
  return { hole: m.hole.map(mv), at: mv(m.at), anchor: m.anchor, solids: m.solids.map((s) => ({ pts: s.pts.map(mv), hole: s.hole?.map(mv), col: s.col })) }
}
/** How far the mouth must grow about its point for its fire (inside the feather) to fill the frame. */
function coverScale(m: Mouth, f: { x0: number; y0: number; x1: number; y1: number }): number {
  const mx = (f.x1 - f.x0) * 0.03
  const my = (f.y1 - f.y0) * 0.03
  const corners: Pt[] = [
    [f.x0 - mx, f.y0 - my],
    [f.x1 + mx, f.y0 - my],
    [f.x0 - mx, f.y1 + my],
    [f.x1 + mx, f.y1 + my],
  ]
  const [ax, ay] = m.at
  const fits = (S: number) => corners.every(([x, y]) => insidePoly(m.hole, ax + (x - ax) / S, ay + (y - ay) / S))
  let lo = 1
  let hi = 400
  if (fits(lo)) return 1 / (1 - 2 * FEATHER)
  if (!fits(hi)) return hi
  for (let i = 0; i < 24; i++) {
    const mid = Math.sqrt(lo * hi)
    if (fits(mid)) hi = mid
    else lo = mid
  }
  return hi / (1 - 2 * FEATHER)
}
/** How much the mouth is grown at `d` from the cut, given what fills the frame (`Sc`). */
function doorScale(d: number, Sc: number): number {
  const L = Math.log(Math.max(1.0001, Sc))
  if (d < 0) {
    if (d <= DOORWAY.in0) return 1
    const u = Math.min(1, (d - DOORWAY.in0) / (DOORWAY.in1 - DOORWAY.in0))
    return Math.exp(L * u * u) * (d > DOORWAY.in1 ? Math.exp((d - DOORWAY.in1) * 8) : 1)
  }
  if (d >= DOORWAY.out1) return 1
  const u = Math.max(0, (d - DOORWAY.out0) / (DOORWAY.out1 - DOORWAY.out0))
  return Math.exp(L * (1 - u) ** 2) * (d < DOORWAY.out0 ? Math.exp((DOORWAY.out0 - d) * 8) : 1)
}
const scaled = (q: Pt, at: Pt, S: number): Pt => [at[0] + (q[0] - at[0]) * S, at[1] + (q[1] - at[1]) * S]
function tracePoly(ctx: CanvasRenderingContext2D, k: number, pts: Pt[], at: Pt, S: number): void {
  pts.forEach((q, i) => {
    const [x, y] = scaled(q, at, S)
    if (i) ctx.lineTo(x * k, y * k)
    else ctx.moveTo(x * k, y * k)
  })
  ctx.closePath()
}

/**
 * A door out, `d` seconds from its cut: the mouth (old before the cut, new after) grown to `S` about its point, its
 * fire a passage streaming out past the spark, feathered to the mouth's opening, its jambs over the fire's edge.
 * Returns how much of it is in front of the world at the spark (for the spark's shadow).
 */
function drawDoorway(p: p5, k: number, t: number, d: number, mouth: Mouth, P: { rim: RGB; body: RGB; heart: RGB }, spark: Pt, v: Pt, atDoor: Pt): number {
  const on = d < 0 ? smooth(d, DOORWAY.in0, DOORWAY.in0 + 0.1) : 1 - smooth(d, DOORWAY.out1 - 0.11, DOORWAY.out1)
  if (on < 0.004) return 0
  const f = frame(p, k)
  const w = f.x1 - f.x0
  const hgt = f.y1 - f.y0
  const m = mouthAt(mouth, t, atDoor)
  const Sc = coverScale(m, f)
  const S = doorScale(d, Sc)
  // White heat either side of the cut: where the old fire gives way to the new.
  const hot = Math.exp(-((d / 0.045) ** 2))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The passage is laid in a canvas of its own at half the frame's resolution (it streams past too fast for a hard
  // edge), then cut to the mouth.
  const tr = ctx.getTransform()
  const dens = Math.hypot(tr.a, tr.b) || 1
  const tw = Math.max(8, Math.ceil(w * k * dens * TUNNEL_RES))
  const th = Math.max(8, Math.ceil(hgt * k * dens * TUNNEL_RES))
  const cv = scratch(TUNNEL, tw, th)
  if (!cv) return 0
  TUNNEL = cv
  const oc = cv.getContext('2d')
  if (!oc) return 0
  const sa = tw / (w * k)
  oc.setTransform(1, 0, 0, 1, 0, 0)
  oc.globalCompositeOperation = 'source-over'
  oc.globalAlpha = 1
  oc.clearRect(0, 0, tw, th)
  oc.setTransform(sa, 0, 0, sa, -f.x0 * k * sa, -f.y0 * k * sa)
  // The vanishing point: a little ahead of the spark the way it goes, so the fire streams back past it.
  const vl = Math.hypot(v[0], v[1]) || 1
  const vp: Pt = [spark[0] + (v[0] / vl) * 0.2 * hgt, spark[1] + (v[1] / vl) * 0.2 * hgt]
  let D = 0
  for (const [x, y] of [
    [f.x0, f.y0],
    [f.x1, f.y0],
    [f.x0, f.y1],
    [f.x1, f.y1],
  ])
    D = Math.max(D, Math.hypot(x - vp[0], y - vp[1]))
  // The body of the fire: its own colour round the middle (no bright core by the spark), deepening to its rim toward
  // the frame's edges.
  const g = oc.createRadialGradient(vp[0] * k, vp[1] * k, 0, vp[0] * k, vp[1] * k, D * k)
  const mid = lerp3(lerp3(P.body, P.heart, 0.2), HOT, 0.2 * hot)
  g.addColorStop(0, css(mid, 0.95))
  g.addColorStop(0.3, css(mid, 0.95))
  g.addColorStop(0.7, css(lerp3(P.body, P.rim, 0.3), 0.95))
  g.addColorStop(1, css(lerp3(P.rim, [20, 10, 8], 0.15), 0.95))
  oc.fillStyle = g
  oc.fillRect(f.x0 * k, f.y0 * k, w * k, hgt * k)
  // The licks, flying out from the vanishing point and growing.
  // Laid on additively, so where they cross they burn together into one fire instead of stacking as cut-outs.
  oc.globalCompositeOperation = 'lighter'
  {
    const back = false
    for (const L of TUNNEL_LICKS) {
      const Z = DEPTHS[L.layer]
      const lam = (L.phase + t * Z.rate) % 1
      const r = D * Z.reach * (0.06 + 0.94 * lam ** 1.4)
      const h = hgt * Z.h * L.size * (0.35 + 0.9 * lam)
      const a = Z.a * Math.sin(Math.PI * Math.min(1, lam * 1.05)) ** 0.5
      if (a < 0.02) continue
      const hotL = 0.5 * hot
      const cx = vp[0] + r * Math.cos(L.a)
      const cy = vp[1] + r * Math.sin(L.a)
      drawLick(oc, k, {
        x: cx,
        y: cy + h * 0.45,
        w: Math.min(w * 0.08 * (0.6 + L.size), h * 0.3),
        h,
        // Its tip trails back toward the middle, the way it flies out from.
        lean: -Math.cos(L.a) * h * 0.35 + 0.04 * h * Math.sin(t * 2.3 + L.seed),
        t,
        seed: L.seed,
        root: back ? lerp3(P.rim, P.body, 0.5) : lerp3(lerp3(P.heart, P.body, 0.2), HOT, hotL),
        mid: back ? lerp3(P.rim, [20, 10, 8], 0.2) : lerp3(P.body, HOT, hotL),
        rim: back ? lerp3(P.rim, [20, 10, 8], 0.45) : lerp3(P.rim, HOT, hotL * 0.6),
        a,
        tips: L.size > 0.75 ? (hash(L.seed, 9) > 0.6 ? 3 : 2) : 1,
      })
    }
  }
  oc.globalCompositeOperation = 'source-over'
  // Cut to the mouth's opening, feathered: five rings of it laid up in a mask. Not needed once it fills the frame.
  if (S < Sc) {
    const mk = scratch(TUNNEL_MASK, tw, th)
    const mc = mk?.getContext('2d')
    if (mk && mc) {
      TUNNEL_MASK = mk
      mc.setTransform(1, 0, 0, 1, 0, 0)
      mc.globalCompositeOperation = 'source-over'
      mc.clearRect(0, 0, tw, th)
      mc.setTransform(sa, 0, 0, sa, -f.x0 * k * sa, -f.y0 * k * sa)
      mc.globalCompositeOperation = 'lighter'
      mc.fillStyle = 'rgba(0, 0, 0, 0.2)'
      for (let j = -2; j <= 2; j++) {
        mc.beginPath()
        tracePoly(mc, k, m.hole, m.at, S * (1 + j * FEATHER))
        mc.fill()
      }
      oc.setTransform(1, 0, 0, 1, 0, 0)
      oc.globalCompositeOperation = 'destination-in'
      oc.drawImage(mk, 0, 0)
    }
  }
  ctx.save()
  ctx.globalAlpha = on
  ctx.drawImage(cv, f.x0 * k, f.y0 * k, w * k, hgt * k)
  // The mouth's iron and brick round the fire, grown with it: thick, with a soft edge, passing the frame's edges.
  const soft = Math.min(0.2 * hgt, 0.07 * S) * k
  ctx.lineJoin = 'round'
  for (const s of m.solids) {
    ctx.beginPath()
    tracePoly(ctx, k, s.pts, m.at, S)
    if (s.hole) tracePoly(ctx, k, s.hole, m.at, S)
    ctx.globalAlpha = on * 0.4
    ctx.strokeStyle = s.col
    ctx.lineWidth = soft
    ctx.stroke()
    ctx.globalAlpha = on
    ctx.fillStyle = s.col
    ctx.fill('evenodd')
  }
  ctx.restore()
  const [sx, sy] = m.at
  return on * (insidePoly(m.hole, sx + (spark[0] - sx) / S, sy + (spark[1] - sy) / S) ? 1 : 0.2)
}

/** The fire over the frame at a door, from the world left's fire to the world come to's. */
export const veil = () =>
  scenery<VeilState>({
    name: 'fire-veil',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      // The door nearest now, if its fire is up.
      let best = -1
      let d = Infinity
      for (let i = 1; i < show.legs.length; i++) {
        const e = t - show.legs[i].from
        const span = i >= 4 ? FLASH : VEIL
        if (e > -span.before && e < span.after && Math.abs(e) < Math.abs(d)) {
          best = i
          d = e
        }
      }
      if (best < 0) return
      const flash = best >= 4
      const span = flash ? FLASH : VEIL
      const door = show.legs[best].from
      // The two fires, each in its own world's colours. They never mix: blue and orange mixed are a flat grey.
      const OLD = palette(FIRES[show.legs[best - 1].world])
      const NEW = palette(FIRES[show.legs[best].world])
      if (!flash) {
        // A door out: an opening flown through (see `DOORWAY`), the old world's mouth before the cut, the new one's after.
        const mouth = d < 0 ? OUT_MOUTH[show.legs[best - 1].world] : IN_MOUTH[show.legs[best].world]
        const here = show.at(t)
        if (!mouth) return
        const a0 = show.where(door - 0.03)
        const b0 = show.where(door - 0.001)
        const behind = drawDoorway(p, c.k, t, d, mouth, d < 0 ? OLD : NEW, [here.x, here.y], [b0[0] - a0[0], b0[1] - a0[1]], d < 0 ? b0 : show.where(door + 0.001))
        // The spark stays in front of the fire it goes through, the fire going deeper round its flame.
        if (!here.hidden && here.scale > 0.05) {
          const ctx3 = p.drawingContext as CanvasRenderingContext2D
          const P = d < 0 ? OLD : NEW
          shadow(ctx3, c.k, here.x, here.y, R * here.scale, R * here.scale + 0.34, 0.22 * behind, lerp3(P.rim, [20, 10, 8], 0.4), 1.6)
          if (behind > 0.01) drawSpark(p, c.k, here.x, here.y, t, here.scale, here.stretch, here.angle)
        }
        return
      }

      const { k } = c
      const f = frame(p, k)
      const w = f.x1 - f.x0
      const hgt = f.y1 - f.y0
      const cx = (f.x0 + f.x1) / 2
      const cy = (f.y0 + f.y1) / 2
      // The way the spark goes through this door: the fire comes at the frame from there and leaves behind it.
      const a = show.where(door - 0.03)
      const b = show.where(door - 0.001)
      let ux = b[0] - a[0]
      let uy = b[1] - a[1]
      const ul = Math.hypot(ux, uy)
      if (ul < 1e-6) {
        ux = 0
        uy = -1
      } else {
        ux /= ul
        uy /= ul
      }
      const reach = (Math.abs(ux) * w + Math.abs(uy) * hgt) / 2
      // 0 at the frame's trailing edge, 1 at its leading edge.
      const sOf = (x: number, y: number) => 0.5 + ((x - cx) * ux + (y - cy) * uy) / (2 * reach)
      const q = (d + span.before) / (span.before + span.after)
      const band = flash ? 0.5 : 2.0 - 3.0 * q
      const cover = (sv: number) => (flash ? smooth(d, -span.before, -span.before * 0.3) * (1 - smooth(d, span.after * 0.3, span.after)) : 1 - smooth(Math.abs(sv - band), 0.62, 1.0))
      // Which fire a point is in. The band comes in as the old world's fire and goes out as the new one's: behind its
      // middle it is the new fire, ahead of it the old, and where they meet it is white-hot. A flash (the dash home) is
      // the old fire up to the cut and the new one after it.
      const sideOf = (sv: number): number => (flash ? (d < 0 ? -1 : 1) : sv - band)
      const seam = (side: number): number => (flash ? 0 : Math.exp(-((side / 0.11) ** 2)))

      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      // The wash: dark rim at the fire's edges, the body where it is thickest; white-hot where the two fires meet.
      const g = ctx.createLinearGradient((cx - ux * reach) * k, (cy - uy * reach) * k, (cx + ux * reach) * k, (cy + uy * reach) * k)
      for (let i = 0; i <= 24; i++) {
        const sv = i / 24
        const cv = cover(sv)
        const side = sideOf(sv)
        const P = side < 0 ? OLD : NEW
        g.addColorStop(sv, css(lerp3(lerp3(P.rim, P.body, 0.55 * cv * cv), HOT, 0.75 * seam(side)), 0.94 * cv))
      }
      ctx.fillStyle = g
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, hgt * k)
      ctx.restore()
      // The licks, rising through it: the band climbs the frame, its tips drifting up and off the top, hotter toward
      // the middle of the fire. Each is one fire's or the other's, whole; the line between them is ragged. The big dark
      // ones burn at the back.
      const ctx2 = p.drawingContext as CanvasRenderingContext2D
      const since = d + span.before
      for (const pass of [true, false]) {
        ctx2.save()
        ctx2.globalCompositeOperation = pass ? 'source-over' : 'screen'
        for (const L of VEIL_LICKS) {
          if (L.back !== pass) continue
          // Where its root is now: coming up from under the frame and rising off its top.
          const life = (L.v + since * L.rate * 1.1) % 1
          const bx = f.x0 + w * (-0.05 + 1.1 * L.u)
          const by = f.y1 + hgt * (0.3 - 1.25 * life)
          const hh = hgt * (L.back ? 0.75 : 0.55) * L.size
          const sv = sOf(bx, by - hh * 0.4)
          const cv = cover(sv)
          if (cv < 0.03) continue
          const side = sideOf(sv + 0.22 * (hash(L.seed, 7) - 0.5))
          const P = side < 0 ? OLD : NEW
          const hot = 0.6 * seam(side)
          const fade = Math.sin(Math.PI * Math.min(1, life * 1.15))
          const lick: Lick = {
            x: bx,
            y: by,
            w: Math.min(w * 0.075 * (0.6 + L.size), hh * 0.4),
            h: hh * (0.55 + 0.45 * cv),
            lean: w * 0.03 * Math.sin(t * 2.3 + L.seed),
            t,
            seed: L.seed,
            root: L.back ? lerp3(P.rim, P.body, 0.5) : lerp3(lerp3(P.heart, P.body, 0.2), HOT, hot),
            mid: L.back ? lerp3(P.rim, [20, 10, 8], 0.2) : lerp3(P.body, HOT, hot),
            rim: L.back ? lerp3(P.rim, [20, 10, 8], 0.45) : lerp3(P.rim, HOT, hot * 0.6),
            a: (L.back ? 0.7 : 0.75) * cv * fade,
            tips: L.size > 0.55 ? (hash(L.seed, 9) > 0.6 ? 3 : 2) : 1,
          }
          drawLick(ctx2, k, lick)
        }
        ctx2.restore()
      }
      // The spark itself stays in front of its fire: a door never hides it.
      // A soft shadow round it first (no edge), so its clean teardrop and gold heart stand in front of the fire.
      const here = show.at(t)
      if (!here.hidden && here.scale > 0.05) {
        // Only as much as the fire is behind it (none once the new world shows through), in the darkest of that
        // fire's colours, so on a fire it is the fire going deeper round the flame and never a navy hole or a grey disc.
        const at = sOf(here.x, here.y)
        const behind = cover(at)
        const P = sideOf(at) < 0 ? OLD : NEW
        const deep = lerp3(P.rim, [20, 10, 8], 0.4)
        shadow(ctx2, k, here.x, here.y, R * here.scale, R * here.scale + 0.42, 0.5 * behind * (flash ? 0.6 : 1), deep, 1.6)
        drawSpark(p, k, here.x, here.y, t, here.scale, here.stretch, here.angle)
      }
    },
  })
