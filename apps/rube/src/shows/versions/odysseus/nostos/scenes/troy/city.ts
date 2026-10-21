import { blob, clamp01, fill, hash, mix, poly, rect, rgba, smooth, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { skyAt } from '../../world/sky'
import { DRAIN, FORECOURT, GATE, HEAD, HEAD_R, NECK, PLINTH, SHAFT, STEPS, STREET, TEMPLE, TOWER, WALL, ground, step } from './geo'
import {
  AXLE_A,
  AXLE_B,
  BUCKET,
  PULLEY,
  R_A,
  R_B,
  R_C,
  R_DRUM,
  R_PULLEY,
  flapOpen,
  gateUp,
  rimAt,
  turnA,
  turnB,
} from './gate'
import { FLAME, MAT, burning, firelight, night, sun, tone } from './tone'

/**
 * Troy itself, drawn for the night of the sack (and seen at dusk, far up its hill, in the last light): the houses going
 * up the hill in ranks behind one another, Athena's temple and forecourt on the height, her white statue, the brazier,
 * the steps down to the lower street, the lower town, and the gate tower cut open, with the Trojans' own machine in it.
 */

/* ------------------------------------------------------------------ fire */

/**
 * A flame on a roof or in a bowl: three flat tongues, one inside the other, swaying slowly. Never a glow: the light
 * is in the colour of the walls it reaches (`firelight`).
 */
export function flame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, seed: number): void {
  if (h <= 0.005) return
  const sway = (k: number) => Math.sin(t * (1.1 + 0.4 * hash(seed, k)) + seed * 3.7 + k) * 0.18
  const shape = (s: number, color: string) => {
    const hw = (w / 2) * s
    const hh = h * s
    const tip: Pt = [x + hw * sway(1) * 1.6, y - hh]
    blob(ctx, [
      [x - hw, y],
      [x - hw * 0.9, y - hh * 0.35],
      [x - hw * 0.35 + hw * sway(2), y - hh * 0.75],
      tip,
      [x + hw * 0.4 + hw * sway(3), y - hh * 0.7],
      [x + hw * 0.95, y - hh * 0.3],
      [x + hw, y],
    ])
    fill(ctx, color)
  }
  shape(1, FLAME.body)
  shape(0.66, FLAME.tongue)
  shape(0.32, FLAME.core)
}

/**
 * A column of smoke off a fire at (x, y): a few big soft rounds going up and spreading, leaning off with the wind. Each
 * is born small over the fire, unseen, and fades out as it nears the top, so the column is the same few shapes rising
 * for ever: a pure function of the time, with nothing popping in or out.
 */
export function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, a: number, t: number, seed: number, color: string = FLAME.smoke): void {
  if (a <= 0.01) return
  const n = 6
  const life = 7.5
  const rise = 4.2 * size
  for (let i = 0; i < n; i++) {
    const u = (((t / life + i / n + hash(seed, i) * 0.12) % 1) + 1) % 1
    const px = x + u * rise * 0.7 + Math.sin(t * 0.3 + seed + i) * 0.15 * size
    const py = y - u * rise
    const r = size * (0.22 + 0.7 * u)
    const alpha = a * 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.2))
    if (alpha <= 0.004) continue
    ctx.beginPath()
    ctx.ellipse(px, py, r, r * 0.78, 0, 0, Math.PI * 2)
    fill(ctx, rgba(color, alpha))
  }
}

/* ------------------------------------------------------------------ houses */

interface House {
  x: number
  w: number
  h: number
  /** Its ground. */
  y: number
  door: boolean
  /** A lamp in its window at night, before the fire. */
  lamp: boolean
  /** Where its window is across its front (0 to 1), if not at a quarter. */
  win?: number
}

/** The lower town between the steps and the gate tower, behind the street. */
const LOWER: House[] = [
  { x: -33.85, w: 0.95, h: 1.15, y: STREET.y, door: true, lamp: false },
  // Its window past its door, clear of the steps that hide its near end.
  { x: -32.82, w: 1.2, h: 0.92, y: STREET.y, door: true, lamp: true, win: 0.78 },
  { x: -31.55, w: 0.85, h: 1.32, y: STREET.y, door: false, lamp: false },
  { x: -30.65, w: 0.72, h: 1.02, y: STREET.y, door: true, lamp: false },
]
/** The upper town behind the temple, up the hill. */
const UPPER: House[] = Array.from({ length: 9 }, (_, i) => {
  const x = -60 + i * 1.6 + hash(i, 2) * 0.4
  return { x, w: 1.1 + hash(i, 3) * 0.5, h: 0.95 + hash(i, 4) * 0.5, y: ground(x + 0.6), door: hash(i, 5) > 0.4, lamp: hash(i, 6) > 0.82 }
})

function drawHouse(g: Paint, h: House, t: number, depth: number, L: { x: (x: number) => number; y: (y: number) => number; s: number } | null): void {
  const { ctx } = g
  const X = (x: number) => (L ? L.x(x) : x)
  const Y = (y: number) => (L ? L.y(y) : y)
  const fire = firelight(h.x, t)
  const deep = depth * 0.45
  const wall = tone(depth ? MAT.clayDark : MAT.clay, t, { lit: 0.6, fire, deep })
  const x0 = X(h.x)
  const x1 = X(h.x + h.w)
  const y0 = Y(h.y)
  const y1 = Y(h.y - h.h)
  poly(ctx, [[x0, y0], [x0, y1], [x1, y1], [x1, y0]])
  fill(ctx, wall)
  // The roof's parapet, a lip of the same clay, darker.
  const lip = (L ? L.s : 1) * 0.06
  rect(ctx, x0 - lip * 0.5, y1 - lip, x1 - x0 + lip, lip * 1.4)
  fill(ctx, tone(MAT.clayDark, t, { fire: fire * 0.6, deep: deep + 0.2 }))
  // The shade on its left face: the light comes from the right at dusk, from the gate's fire at night.
  rect(ctx, x0, y1, (x1 - x0) * 0.2, y0 - y1)
  fill(ctx, rgba('#000000', 0.16))
  if (h.door) {
    const dw = (L ? L.s : 1) * 0.2
    const dh = (L ? L.s : 1) * 0.42
    const dx = x0 + (x1 - x0) * 0.55
    rect(ctx, dx, y0 - dh, dw, dh)
    fill(ctx, tone('#1D1512', t, { deep }))
  }
  const n = night(t)
  const b = burning(h.x, t, depth)
  if (h.lamp && n > 0.4) {
    const s = L ? L.s : 1
    const wx = x0 + (x1 - x0) * (h.win ?? 0.25)
    const wy = y1 + (y0 - y1) * 0.3
    rect(ctx, wx, wy, 0.14 * s, 0.12 * s)
    // A lamp inside: the window is warm while the night lasts, and goes dark when the roof above it burns.
    fill(ctx, mix(tone('#1D1512', t), '#D99A52', clamp01((n - 0.4) * 1.6) * (1 - b)))
  }
  if (b > 0.01) {
    const s = L ? L.s : 1
    for (let k = 0; k < 2; k++) {
      const fx = x0 + (x1 - x0) * (0.3 + 0.4 * k)
      flame(ctx, fx, y1 - lip * 0.6, (x1 - x0) * 0.5, (0.55 + 0.35 * hash(Math.round(h.x * 10), k)) * s * b, t, h.x * 7 + k)
    }
  }
}

/**
 * The town going up the hill behind, in three ranks, each further and paler: each rank one mass of flat-roofed houses
 * shouldered together, its roofline stepping up the hill, and its foot lost behind the rank in front (or the near hill).
 * At night a few windows are lit; when the fire reaches a house, its roof burns.
 */
export function drawTownBehind(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x0 > -26 || view.x1 < -75) return
  for (let r = 2; r >= 0; r--) {
    const d = [3.5, 9, 18][r]
    const L = layer(view, d)
    const houses: { x: number; w: number; top: number }[] = []
    // A rank ends where, seen from here, it would stand past the city wall; its last houses step down towards it.
    const end = view.cx + (WALL.x0 - 0.2 - view.cx) / L.s
    let x = -64 + r * 1.1
    let i = 0
    while (x < end - 0.4) {
      const w = Math.min(end - x, 0.85 + hash(i, r, 1) * 0.75)
      // The hill rises to the left; each rank stands a little higher than the one in front.
      const base = Math.min(ground(x + w / 2), -3.0) - 0.55 - r * 0.75
      const fall = 1 - 0.55 * smooth(x, end - 4, end)
      houses.push({ x, w, top: base - (0.75 + hash(i, r, 2) * 0.7) * fall })
      x += w
      i++
    }
    if (!houses.length) continue
    const fire = firelight(-40, t) * (0.6 - r * 0.15)
    ctx.beginPath()
    ctx.moveTo(L.x(houses[0].x), L.y(1.5))
    for (const h of houses) {
      ctx.lineTo(L.x(h.x), L.y(h.top))
      ctx.lineTo(L.x(h.x + h.w), L.y(h.top))
    }
    ctx.lineTo(L.x(houses[houses.length - 1].x + houses[houses.length - 1].w), L.y(1.5))
    ctx.closePath()
    // At night the ranks behind are dark against the sky's glow over the city, the nearest darkest and each further one
    // a step into the haze towards the sky, so the hill reads going back; the fire reddens them.
    const body = tone(r === 0 ? MAT.clay : MAT.clayDark, t, { lit: 0.7 - r * 0.2, deep: 0.4 + r * 0.35 })
    const dark = mix(body, '#0D0F16', 0.55 * night(t))
    fill(ctx, mix(mix(dark, skyAt(t).low, (0.13 + 0.03 * r) * r * night(t)), '#B4542C', 0.3 * fire))
    // The sun on each house's seaward face, where it stands over the one after it (at dusk only).
    if (sun(t) > 0.01) {
      ctx.fillStyle = rgba('#F2C48C', 0.35 * sun(t) * (1 - r * 0.3))
      for (let k = 0; k < houses.length - 1; k++) {
        const h = houses[k]
        const next = houses[k + 1]
        if (h.top < next.top) {
          ctx.beginPath()
          ctx.rect(L.x(h.x + h.w) - 0.16 * L.s, L.y(h.top), 0.16 * L.s, L.y(next.top) - L.y(h.top))
          ctx.fill()
        }
      }
    }
    // The shade on each house's landward face, where it steps up from the one before it.
    ctx.fillStyle = rgba('#000000', 0.12 + r * 0.03)
    for (let k = 1; k < houses.length; k++) {
      const h = houses[k]
      const prev = houses[k - 1]
      if (h.top < prev.top) {
        ctx.beginPath()
        ctx.rect(L.x(h.x), L.y(h.top), 0.18 * L.s, L.y(prev.top) - L.y(h.top))
        ctx.fill()
      }
    }
    const n = night(t)
    houses.forEach((h, k) => {
      const lx = L.x(h.x)
      if (lx > view.x1 + 1 || L.x(h.x + h.w) < view.x0 - 1) return
      const b = burning(h.x, t, r + 1)
      if (n > 0.4 && hash(k, r, 3) > 0.86) {
        ctx.beginPath()
        ctx.rect(L.x(h.x + h.w * 0.3), L.y(h.top + 0.3), 0.13 * L.s, 0.11 * L.s)
        fill(ctx, mix(tone('#1D1512', t), '#D99A52', clamp01((n - 0.4) * 1.6) * (1 - b) * (1 - r * 0.25)))
      }
      if (b > 0.01 && hash(k, r, 4) > 0.3) flame(ctx, L.x(h.x + h.w * 0.5), L.y(h.top), h.w * 0.6 * L.s, (0.6 + 0.4 * hash(k, r, 5)) * L.s * b, t, k * 3 + r)
    })
  }
}

/* ------------------------------------------------------------------ the height */

export function drawTemple(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x0 > TEMPLE.x1 + 1 || view.x1 < TEMPLE.x0 - 16) return
  const fire = firelight(TEMPLE.x1, t) * 0.7
  const brazier = brazierLight(t)
  const stone = tone(MAT.stone, t, { lit: 0.7, fire: fire + brazier * 0.5 })
  const shade = tone(mix(MAT.stone, '#6E6458', 0.45), t, { fire: fire * 0.5 })
  const ink = tone('#2B241D', t)
  // The upper town behind the temple, on the near rank.
  for (const h of UPPER) if (h.x + h.w < TEMPLE.x0 + 0.2) drawHouse(g, h, t, 0, null)
  // The podium and the stylobate.
  const y = TEMPLE.y
  poly(ctx, [[TEMPLE.x0, y + 0.42], [TEMPLE.x0, y], [TEMPLE.x1, y], [TEMPLE.x1, y + 0.42]])
  fill(ctx, shade)
  rect(ctx, TEMPLE.x0 + 0.25, y - 0.08, TEMPLE.x1 - TEMPLE.x0 - 0.5, 0.08)
  fill(ctx, stone)
  // The cella's dark behind the columns, its door, and the columns standing in front of it.
  const c0 = TEMPLE.x0 + 0.45
  const c1 = TEMPLE.x1 - 0.45
  const top = y - 0.08 - 1.25
  rect(ctx, c0 + 0.1, top, c1 - c0 - 0.2, 1.25)
  fill(ctx, tone('#2A231D', t, { fire: fire * 0.3 }))
  rect(ctx, (c0 + c1) / 2 - 0.22, top + 0.45, 0.44, 0.8)
  fill(ctx, tone('#120E0C', t))
  for (let i = 0; i < 6; i++) {
    const cx = c0 + ((c1 - c0) * i) / 5
    rect(ctx, cx - 0.075, top, 0.15, 1.25)
    fill(ctx, i === 5 ? stone : mix(stone, shade, 0.25))
    rect(ctx, cx - 0.1, top, 0.2, 0.06)
    fill(ctx, stone)
  }
  // The entablature and the pediment over it.
  rect(ctx, c0 - 0.2, top - 0.22, c1 - c0 + 0.4, 0.22)
  fill(ctx, stone)
  stroke(g, ink, 1.4)
  poly(ctx, [[c0 - 0.28, top - 0.22], [(c0 + c1) / 2, top - 0.78], [c1 + 0.28, top - 0.22]])
  fill(ctx, stone)
  stroke(g, ink, 1.6)
  poly(ctx, [[c0 + 0.25, top - 0.29], [(c0 + c1) / 2, top - 0.64], [c1 - 0.25, top - 0.29]])
  fill(ctx, shade)
  // The forecourt's pavement and its edge over the lower town.
  rect(ctx, TEMPLE.x1, FORECOURT.y, FORECOURT.x1 - TEMPLE.x1, 0.07)
  fill(ctx, tone(MAT.stone, t, { lit: 0.4, fire: brazier * 0.6 }))
  if (fire > 0.02) smoke(g.ctx, TEMPLE.x0 - 2, ground(TEMPLE.x0 - 2) - 1.2, 1.4, smooth(t, 121, 126), t, 4)
}

/** The brazier's light on what is near it: on through the night, up as the fire comes. */
export const brazierLight = (t: number): number => (t > M.answer - 1 ? 0.6 * smooth(t, M.answer, M.answer + 1) : 0)

export const BRAZIER: Pt = [-35.55, FORECOURT.y]

/** The bronze bowl on its tripod by Athena, and its fire. */
export function drawBrazier(g: Paint): void {
  const { ctx, t, view } = g
  const [bx, by] = BRAZIER
  if (bx < view.x0 - 1 || bx > view.x1 + 1) return
  const ink = tone('#1B1712', t)
  const bronze = tone(MAT.bronze, t, { fire: 0.8 })
  ctx.beginPath()
  ctx.moveTo(bx - 0.14, by)
  ctx.lineTo(bx, by - 0.36)
  ctx.lineTo(bx + 0.14, by)
  ctx.moveTo(bx, by)
  ctx.lineTo(bx, by - 0.36)
  stroke(g, ink, 1.8)
  poly(ctx, [[bx - 0.17, by - 0.44], [bx + 0.17, by - 0.44], [bx + 0.11, by - 0.34], [bx - 0.11, by - 0.34]])
  fill(ctx, bronze)
  stroke(g, ink, 1.4)
  const lit = brazierLight(t)
  if (lit > 0.01) {
    // Its light on the pavement round its feet, and its fire.
    ctx.beginPath()
    ctx.ellipse(bx, by + 0.02, 0.85, 0.028, 0, 0, Math.PI * 2)
    fill(ctx, rgba('#D9824A', 0.22 * (lit / 0.6)))
    flame(ctx, bx, by - 0.44, 0.28, 0.3 * (lit / 0.6), t, 11)
  }
}

/** Athena on her low plinth, white; her head comes off on the held breath and rolls to his feet (`headAt`). */
export function drawStatue(g: Paint, head: { at: Pt; turn: number; on: boolean; tilt: number }): void {
  const { ctx, t, view } = g
  const x = PLINTH.x
  if (x < view.x0 - 2 || x > view.x1 + 2) return
  const brazier = brazierLight(t)
  const fire = firelight(x, t)
  // She is the one white thing in the dark city: lit by her brazier, and sunk into the night less than the clay round her.
  const marble = tone(MAT.marble, t, { lit: 0.6, fire: brazier * 0.5 + fire * 0.3, deep: -2.6 })
  const shadow = tone(mix(MAT.marble, '#8A8F98', 0.4), t, { fire: fire * 0.3 })
  const ink = tone('#3A3A40', t)
  // The plinth.
  rect(ctx, x - PLINTH.w / 2, PLINTH.top, PLINTH.w, FORECOURT.y - PLINTH.top)
  fill(ctx, tone(MAT.stone, t, { fire: brazier * 0.5 }))
  stroke(g, ink, 1.2)
  ctx.save()
  // She leans as the rope pulls her neck towards the horse, and stands back when it lets go (`tilt`, radians).
  ctx.translate(x, PLINTH.top)
  ctx.rotate(head.tilt)
  ctx.translate(-x, -PLINTH.top)
  const base = PLINTH.top
  // Her robe: a long column, wider at the foot; the shield at her side, the spear upright in her hand.
  blob(ctx, [[x - 0.12, base], [x - 0.1, base - 0.3], [x - 0.085, base - 0.5], [x - 0.07, NECK[1] + 0.05], [x + 0.07, NECK[1] + 0.05], [x + 0.085, base - 0.5], [x + 0.12, base]])
  fill(ctx, marble)
  stroke(g, ink, 1.3)
  poly(ctx, [[x + 0.04, base - 0.04], [x + 0.06, base - 0.04], [x + 0.06, NECK[1] - 0.26], [x + 0.04, NECK[1] - 0.26]])
  fill(ctx, shadow)
  ctx.beginPath()
  ctx.ellipse(x - 0.12, base - 0.22, 0.07, 0.14, 0, 0, Math.PI * 2)
  fill(ctx, shadow)
  stroke(g, ink, 1.2)
  // The neck: whole, or broken off.
  rect(ctx, x - 0.035, NECK[1] - 0.04, 0.07, 0.1)
  fill(ctx, marble)
  ctx.restore()
  if (head.on) drawHead(g, head.at, head.turn, marble, shadow, ink)
}

/** Her helmeted head: a round with a crest, which turns as it rolls. */
function drawHead(g: Paint, at: Pt, turn: number, marble: string, shadow: string, ink: string): void {
  const { ctx } = g
  ctx.save()
  ctx.translate(at[0], at[1])
  ctx.rotate(turn)
  ctx.beginPath()
  ctx.arc(0, 0, HEAD_R, 0, Math.PI * 2)
  fill(ctx, marble)
  stroke(g, ink, 1.3)
  // The helmet's crest along the top, and the face's shadow side.
  blob(ctx, [[-HEAD_R * 0.9, -HEAD_R * 0.55], [-HEAD_R * 0.2, -HEAD_R * 1.55], [HEAD_R * 0.75, -HEAD_R * 1.15], [HEAD_R * 0.55, -HEAD_R * 0.7]])
  fill(ctx, shadow)
  stroke(g, ink, 1.1)
  ctx.beginPath()
  ctx.arc(0, 0, HEAD_R * 0.7, -0.4, 1.4)
  stroke(g, rgba(ink, 0.5), 1)
  ctx.restore()
}

/* ------------------------------------------------------------------ the lower town and the steps */

export function drawSteps(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x0 > TOWER.x1 + 1 || view.x1 < STEPS.x0 - 2) return
  const fire = firelight(STEPS.x0, t)
  // The retaining wall under the forecourt's edge, of the town's clay and a step darker than the houses in front of it,
  // so they stand out of it; and the lower town.
  rect(ctx, STEPS.x0 - 0.02, FORECOURT.y, STREET.x1 - STEPS.x0, STREET.y - FORECOURT.y)
  fill(ctx, tone(mix(MAT.clayDark, MAT.stone, 0.2), t, { fire: fire * 0.6, deep: 0.6 }))
  for (const h of LOWER) drawHouse(g, h, t, 0, null)
  // The steps, a ball high and a ball deep: their treads catch the brazier's light, their risers stay in shadow.
  const stone = mix(tone(MAT.stone, t, { lit: 0.5, fire: fire + brazierLight(t) * 0.9 }), '#FFFFFF', 0.08)
  const riser = tone(mix(MAT.stone, '#3A322B', 0.55), t, { fire: fire * 0.4, deep: 0.3 })
  for (let i = 0; i < STEPS.n; i++) {
    const s = step(i)
    rect(ctx, s.x0, s.y - STEPS.rise, STEPS.run + 0.01, STEPS.rise)
    fill(ctx, riser)
    rect(ctx, s.x0, s.y - 0.05, STEPS.run + 0.01, 0.05)
    fill(ctx, stone)
  }
  // The flank of the stair down to the street, so it stands on something.
  poly(ctx, [[STEPS.x0, FORECOURT.y], [STREET.x0, STREET.y], [STREET.x0, STREET.y + 0.1], [STEPS.x0, STREET.y + 0.1]])
  fill(ctx, riser)
  // The street.
  rect(ctx, STREET.x0, STREET.y, SHAFT.x0 - STREET.x0, 0.08)
  fill(ctx, tone(MAT.stone, t, { lit: 0.3, fire: fire * 0.5 }))
}

/* ------------------------------------------------------------------ the gate tower */

function gear(g: Paint, c: Pt, r: number, teeth: number, turn: number, color: string, ink: string): void {
  const { ctx } = g
  const depth = Math.min(0.045, r * 0.25)
  ctx.beginPath()
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = turn + (i * Math.PI) / teeth
    const a1 = turn + ((i + 1) * Math.PI) / teeth
    const rr = i % 2 === 0 ? r : r - depth
    const p0: Pt = [c[0] + Math.cos(a0 + 0.08 / teeth) * rr, c[1] + Math.sin(a0 + 0.08 / teeth) * rr]
    const p1: Pt = [c[0] + Math.cos(a1 - 0.08 / teeth) * rr, c[1] + Math.sin(a1 - 0.08 / teeth) * rr]
    if (i === 0) ctx.moveTo(p0[0], p0[1])
    else ctx.lineTo(p0[0], p0[1])
    ctx.lineTo(p1[0], p1[1])
  }
  ctx.closePath()
  fill(ctx, color)
  stroke(g, ink, 2)
  // Its spokes: four, so it is seen to turn.
  if (r > 0.15) {
    ctx.beginPath()
    for (let k = 0; k < 4; k++) {
      const a = turn + (k * Math.PI) / 2
      ctx.moveTo(c[0] + Math.cos(a) * r * 0.15, c[1] + Math.sin(a) * r * 0.15)
      ctx.lineTo(c[0] + Math.cos(a) * (r - depth * 1.6), c[1] + Math.sin(a) * (r - depth * 1.6))
    }
    stroke(g, ink, 1.6)
  }
  ctx.beginPath()
  ctx.arc(c[0], c[1], Math.max(0.025, r * 0.13), 0, Math.PI * 2)
  fill(ctx, ink)
}

/** The tower cut open: its back wall, the gate in the passage, the chamber with the train, the shaft under it, the drain. */
export function drawTower(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x0 > TOWER.x1 + 2 || view.x1 < TOWER.x0 - 8) return
  // A lamp burns in the chamber all night, on the train's landward side: what the wheels are seen by.
  const lamp = t > M.answer - 1 ? 0.75 : 0
  const fire = Math.max(firelight(TOWER.x0, t), lamp * 0.5)
  const ink = tone('#1F1714', t)
  const clay = tone(MAT.clay, t, { lit: 0.6, fire })
  const clayDark = tone(MAT.clayDark, t, { fire: fire * 0.7 })
  const inside = tone('#3A271E', t, { fire: fire * 0.35 })
  const timber = tone(MAT.timber, t, { fire: fire * 0.5 })
  // The city wall running on behind the tower, and the tower's body.
  rect(ctx, WALL.x0, WALL.top, WALL.x1 - WALL.x0, STREET.y - WALL.top)
  fill(ctx, clayDark)
  rect(ctx, TOWER.x0, TOWER.roof, TOWER.x1 - TOWER.x0, STREET.y - TOWER.roof)
  fill(ctx, inside)
  // Its walls, cut: the outer face, the floor between the passage and the chamber, the roof and its crenels.
  rect(ctx, TOWER.x1 - 0.22, TOWER.roof, 0.22, WALL.passage - TOWER.roof)
  fill(ctx, clay)
  rect(ctx, WALL.x0, WALL.passage, TOWER.x1 - WALL.x0, TOWER.floor - WALL.passage)
  fill(ctx, clayDark)
  rect(ctx, TOWER.x0, TOWER.floor - 0.09, TOWER.x1 - TOWER.x0, 0.09)
  fill(ctx, timber)
  rect(ctx, TOWER.x0 - 0.05, TOWER.roof - 0.12, TOWER.x1 - TOWER.x0 + 0.1, 0.12)
  fill(ctx, clay)
  for (let i = 0; i < 4; i++) {
    const cx = TOWER.x0 + 0.05 + i * ((TOWER.x1 - TOWER.x0 - 0.3) / 3)
    rect(ctx, cx, TOWER.top, 0.2, TOWER.roof - 0.12 - TOWER.top)
    fill(ctx, clay)
  }
  // The tower's inner wall, cut: down to a lintel over the way in from the street.
  rect(ctx, TOWER.x0, TOWER.roof, 0.18, STREET.y - 0.95 - TOWER.roof)
  fill(ctx, clay)
  // The passage through the wall at the street's level: a dark way under the chamber's floor. Outside the gate the army's
  // torches light its floor and walls, and the light comes in along the floor under the gate as it goes up.
  const up = gateUp(t)
  const vault = tone('#16100D', t)
  rect(ctx, WALL.x0, WALL.passage, TOWER.x1 - WALL.x0, STREET.y - WALL.passage)
  fill(ctx, vault)
  const lit = torchlight(t)
  if (lit > 0.01) {
    const warm = mix(vault, FLAME.body, 0.24 * lit)
    rect(ctx, GATE.x1, WALL.passage, TOWER.x1 - GATE.x1, STREET.y - WALL.passage)
    fill(ctx, warm)
    if (up > 0.01) {
      poly(ctx, [[GATE.x1, STREET.y - up], [GATE.x1, STREET.y], [GATE.x0 - Math.min(1.6, up * 2.4), STREET.y]])
      fill(ctx, mix(vault, FLAME.body, 0.2 * lit))
    }
  }
  // The gate in its slot: a timber leaf bound with three iron bands and shod with spikes, up as far as the train has
  // lifted it, with its rack along its inner face.
  const gy0 = GATE.bottom - up
  const gy1 = GATE.top - up
  const shod = 0.07
  const gw = GATE.x1 - GATE.x0
  poly(ctx, [[GATE.x0, gy1], [GATE.x1, gy1], [GATE.x1, gy0 - shod], [GATE.x1 - gw * 0.25, gy0], [GATE.x0 + gw * 0.5, gy0 - shod], [GATE.x0 + gw * 0.25, gy0], [GATE.x0, gy0 - shod]])
  fill(ctx, timber)
  stroke(g, ink, 1.4)
  for (const f of [0.18, 0.52, 0.86]) {
    rect(ctx, GATE.x0, gy1 + (gy0 - shod - gy1) * f - 0.03, gw, 0.06)
    fill(ctx, ink)
  }
  ctx.beginPath()
  for (let y = gy1 + 0.05; y < GATE.bottom - 0.6 - up; y += 0.07) {
    ctx.moveTo(GATE.x0, y)
    ctx.lineTo(GATE.x0 - 0.035, y + 0.02)
    ctx.lineTo(GATE.x0, y + 0.04)
  }
  stroke(g, ink, 1.2)
  // The train: the drum and its pinion, the great wheel and its pinion on the rack.
  const wheelLight = Math.max(fire, lamp) * 1.1
  gear(g, AXLE_B, R_B, 15, turnB(t), tone(mix(MAT.timber, MAT.stone, 0.25), t, { lit: 0.5, fire: wheelLight }), ink)
  gear(g, AXLE_B, R_C, 10, turnB(t) + 0.15, tone(mix(MAT.timber, MAT.bronze, 0.55), t, { fire: wheelLight }), ink)
  gear(g, AXLE_A, R_A, 8, turnA(t), tone(mix(MAT.timber, MAT.bronze, 0.55), t, { fire: wheelLight }), ink)
  if (lamp > 0) {
    // The lamp on its bracket.
    const lx = TOWER.x0 + 0.42
    const ly = TOWER.floor - 0.62
    ctx.beginPath()
    ctx.moveTo(TOWER.x0 + 0.18, ly + 0.05)
    ctx.lineTo(lx, ly + 0.05)
    stroke(g, ink, 1.6)
    ctx.beginPath()
    ctx.ellipse(lx, ly + 0.02, 0.07, 0.035, 0, 0, Math.PI * 2)
    fill(ctx, tone(MAT.bronze, t, { fire: 0.8 }))
    flame(ctx, lx + 0.05, ly - 0.01, 0.05, 0.11, t, 21)
  }
  ctx.beginPath()
  ctx.arc(AXLE_A[0], AXLE_A[1], R_DRUM, 0, Math.PI * 2)
  fill(ctx, tone('#2C2119', t))
  stroke(g, ink, 1.2)
  ctx.beginPath()
  ctx.arc(PULLEY[0], PULLEY[1], R_PULLEY, 0, Math.PI * 2)
  fill(ctx, timber)
  stroke(g, ink, 1.2)
  // The rope: off the drum's foot, over the pulley, down through the floor to the bucket's bail.
  const [rx, ry] = rimAt(t)
  const bail = ry - 0.3
  ctx.beginPath()
  ctx.moveTo(AXLE_A[0], AXLE_A[1] + R_DRUM)
  ctx.lineTo(PULLEY[0], PULLEY[1] - R_PULLEY)
  ctx.arc(PULLEY[0], PULLEY[1], R_PULLEY, -Math.PI / 2, Math.PI, true)
  ctx.lineTo(rx, bail)
  stroke(g, tone('#7A6448', t, { fire: fire * 0.4 }), 1.7)
  // The shaft cut into the ground under the tower, and the drain out of its foot under the hill.
  rect(ctx, SHAFT.x0, STREET.y, SHAFT.x1 - SHAFT.x0, SHAFT.floor - STREET.y)
  fill(ctx, tone('#2A1C16', t))
  stroke(g, ink, 1.2)
  drawDrain(g)
  // At dusk the tower is seen whole from the beach, its machine shut inside it: the cut opens with the night.
  if (t < M.answer - 1) {
    rect(ctx, TOWER.x0, TOWER.roof, TOWER.x1 - TOWER.x0, STREET.y - TOWER.roof)
    fill(ctx, clay)
    rect(ctx, TOWER.x0, TOWER.roof, (TOWER.x1 - TOWER.x0) * 0.22, STREET.y - TOWER.roof)
    fill(ctx, rgba('#000000', 0.14))
    // Its gateway, open, the ropes going in.
    rect(ctx, WALL.x0 + 0.1, STREET.y - gateUp(t) - 0.02, WALL.x1 - WALL.x0 - 0.1, gateUp(t) + 0.02)
    fill(ctx, tone('#1A1210', t))
    rect(ctx, TOWER.x0 + 0.6, TOWER.roof + 0.55, 0.16, 0.28)
    fill(ctx, tone('#1A1210', t))
  }
}

/** The drain under the hill, cut open: a dark bore from the shaft's foot to the hillside. */
export function drawDrain(g: Paint): void {
  const { ctx, t } = g
  const [ax, ay] = DRAIN.from
  const [bx, by] = drainExit()
  const r = DRAIN.r
  poly(ctx, [[ax, ay], [ax, ay - 2 * r], [bx, by - 2 * r], [bx, by]])
  fill(ctx, tone('#24170F', t))
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.moveTo(ax, ay - 2 * r)
  ctx.lineTo(bx, by - 2 * r)
  stroke(g, tone('#140D09', t), 1.3)
}

/** Where the drain comes out on the hillside: the x where the hill comes down to the drain's floor. */
export function drainExit(): Pt {
  let x = -24
  for (let i = 0; i < 60; i++) {
    const y = ground(x)
    if (y > DRAIN.to[1]) break
    x += 0.05
  }
  return [x, ground(x)]
}

/** The bucket's back: the far wall inside, so the men in it are seen in it. */
export function drawBucketBack(g: Paint): void {
  const { ctx, t } = g
  const [x, y] = rimAt(t)
  const w = BUCKET.w / 2
  poly(ctx, [[x - w, y], [x + w, y], [x + w * 0.92, y + BUCKET.depth], [x - w * 0.92, y + BUCKET.depth]])
  fill(ctx, tone('#3C2A1D', t, { fire: firelight(x, t) * 0.3 }))
}

/** The bucket's front: its two staves, its foot, the hoops, the bail, and the flap on its seaward side. */
export function drawBucketFront(g: Paint): void {
  const { ctx, t, view } = g
  const [x, y] = rimAt(t)
  if (x < view.x0 - 2 || x > view.x1 + 2) return
  const w = BUCKET.w / 2
  const fire = firelight(x, t)
  const wood = tone(MAT.timber, t, { lit: 0.4, fire: fire * 0.5 })
  const ink = tone('#1D1510', t)
  const bw = BUCKET.wall
  // The landward stave and the foot.
  poly(ctx, [[x - w, y], [x - w + bw, y], [x - w * 0.92 + bw, y + BUCKET.depth - bw], [x - w * 0.92, y + BUCKET.depth]])
  fill(ctx, wood)
  stroke(g, ink, 1.4)
  rect(ctx, x - w * 0.92, y + BUCKET.depth - bw, w * 1.84, bw)
  fill(ctx, wood)
  stroke(g, ink, 1.4)
  // The seaward stave is the flap: hinged at the foot, it falls outward into a ramp to the drain.
  const f = flapOpen(t)
  const hinge: Pt = [x + w * 0.92, y + BUCKET.depth]
  const ang = -Math.PI / 2 - Math.atan2(w * 0.08, BUCKET.depth) + (Math.PI / 2 - 0.12) * f
  const len = BUCKET.depth
  const tip: Pt = [hinge[0] + Math.cos(ang) * len, hinge[1] + Math.sin(ang) * len]
  const nx = Math.cos(ang - Math.PI / 2) * bw
  const ny = Math.sin(ang - Math.PI / 2) * bw
  poly(ctx, [hinge, tip, [tip[0] + nx, tip[1] + ny], [hinge[0] + nx, hinge[1] + ny]])
  fill(ctx, wood)
  stroke(g, ink, 1.4)
  // The bail over it, where the rope is made fast.
  ctx.beginPath()
  ctx.moveTo(x - w + 0.02, y + 0.02)
  ctx.quadraticCurveTo(x, y - 0.55, x + w - 0.02, y + 0.02)
  stroke(g, ink, 1.6)
}

/* ------------------------------------------------------------------ the sack */

/** How much of the army's torchlight is at the gate: gathering outside it, then gone in past it. */
export const torchlight = (t: number): number => smooth(t, 104, 109) * (1 - smooth(t, 123, 128))

/** The fires and the smoke over the near town (the town behind burns in its own ranks, `drawTownBehind`). */
export function drawFires(g: Paint): void {
  const { t, view } = g
  if (t < 114 || view.x0 > TOWER.x1 + 4) return
  // Smoke over the lower town and the gate, and over the height.
  const spots: [number, number, number][] = [
    [-31.4, STREET.y - 1.3, 0.9],
    [-33.2, STREET.y - 1.2, 0.8],
    [-38.5, FORECOURT.y - 1.8, 1.2],
    [-48, ground(-48) - 1.6, 1.6],
    [-55, ground(-55) - 1.6, 1.9],
  ]
  spots.forEach(([x, y, s], k) => smoke(g.ctx, x, y, s, burning(x, t) * (0.6 + 0.4 * smooth(t, 118, 126)), t, k * 2.3))
}

export { HEAD, NECK, night }
