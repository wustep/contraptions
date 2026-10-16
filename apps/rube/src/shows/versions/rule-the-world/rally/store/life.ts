import type { Pt } from '../../../../../parts'
import { layer, motes, shade, sway, type Frame } from '../depth'
import { hash, lastOf } from '../kit'
import { blob, ctxOf, ease, ellipse, fillWith, flash, mix, rect, rgba, shape, type Pen } from '../pen'
import { ASH, bulbOn, C, DESK_LAMP, lampFoot, lampOn, lampSway } from './draw'
import {
  BANG,
  BULB,
  CLOCK_SIX,
  COUNTER_TOP,
  FIRE,
  FLOOR,
  INNER,
  INTRO_HOPS,
  INTRO_RUN,
  LAMP_X,
  LAMP_Y,
  MURRAY_STEPS,
  PART1,
  PART2,
  SAFE,
  STOCK_BULB,
  WELCOME,
  WIN,
  doorDeg,
  officeDoor,
  stockSway,
} from './geo'
import { passing } from './street'

/**
 * The store's life, laid over its drawing: what keeps it moving when Marty is not, and the light its lamps lay on
 * things. The cat in the window; a little dust turning in the lamps' light; the passing traffic's lamps thrown across
 * the store; dust shaken off the wall when the ladder bangs home; the stockroom's moth and its shadow; Murray's desk
 * lamp, his cigarette's smoke, the street's light through his blinds, the traffic's lamps swept across it and the El's
 * windows going by; and in front of it all, the store's clutter going by dark and soft along the foot of the frame. The light is laid over things, never added to them: no halo hangs round a lamp,
 * and nothing flashes when something lands.
 */

const seen = (f: Frame, x0: number, x1: number, y0 = -Infinity, y1 = Infinity) => f.x1 > x0 && f.x0 < x1 && f.y1 > y0 && f.y0 < y1
/** A pool of light laid on a surface (his desk's top): a flat soft ellipse of the light's colour, over what is there. */
const pool = shade

/* ------------------------------------------------------------------ the cat */

/** Where the cat sits: the middle of its haunches on the window's display riser, beside the shoes. */
/** Its eyes: a dull yellow-green, an eye's colour, not a light. */
const CAT_EYE = '#8E9448'
const CAT: Pt = [-1.6, WIN[3] - 0.15]
/** His landings on the counter through the intro: the cat's ears twitch at each. */
const TICKS = [...INTRO_HOPS.map((h) => h[1]), ...INTRO_RUN]
/** When it springs down off the display: a moment after the bat fires and the lamps clang on. */
const BOLT = FIRE + 0.22

/**
 * The store's cat, a black one, sitting in the window with its back to us and watching the street: its head following
 * whatever goes by, its ears flicking back at every tick of the ball on the counter, its tail-tip twitching, its sides
 * breathing. When the bat fires it whips round, and is gone down behind the counter.
 */
export function drawCat(pen: Pen, t: number): void {
  const go = t - BOLT
  if (go > 0.7) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  // Where it is: sitting, or in its leap down and away to the left, out of sight behind the counter.
  const u = Math.max(0, go / 0.42)
  const bx = CAT[0] - 0.6 * u
  const by = CAT[1] - 0.32 * u + 1.25 * u * u
  const crouch = go > -0.22 && go < 0 ? 0.88 : 1
  const stretch = go > 0 ? 1 + 0.35 * Math.min(1, u * 2) : 1
  const breath = 1 + 0.018 * Math.sin(t * 2.3)
  // Where it looks: after the traffic, idly about otherwise; round at us when the bat fires.
  const pass = passing(t)
  let look = 0.35 * sway(t, 5, 7)
  if (pass) look = look * (1 - pass.a) + (pass.u * 2 - 1) * 1.1 * pass.a
  if (t > FIRE - 0.02) look = 1.3
  const tick = lastOf(TICKS, t)
  const twitch = tick.ago < 0.5 ? flash(tick.ago, 0.09) : 0
  ctx.save()
  ctx.beginPath()
  ctx.rect((WIN[0] - 2) * k, (WIN[1] - 1) * k, 4 * k, (WIN[3] + 0.1 - WIN[1] + 1) * k)
  ctx.clip()
  const P = (x: number, y: number): Pt => [bx + x * stretch, by + y * crouch * breath / Math.sqrt(stretch)]
  const ink = '#0C0908'
  const rim = mix(C.cold, '#FFFFFF', 0.2)
  const body: Pt[] = [P(-0.13, 0), P(-0.155, -0.08), P(-0.125, -0.19), P(-0.075, -0.29), P(0, -0.32), P(0.075, -0.29), P(0.125, -0.19), P(0.155, -0.08), P(0.13, 0)]
  const hx = bx + 0.022 * look * stretch
  const hy = P(0, -0.39)[1]
  const ears = (dx: number): Pt[] => {
    const side = Math.sign(dx)
    const lean = (side > 0 ? -0.02 : 0.02) * twitch + 0.012 * look
    return [
      [hx + dx * 0.95, hy - 0.035],
      [hx + dx * 0.9 + lean + side * 0.012 * twitch, hy - 0.115 + 0.02 * twitch],
      [hx + dx * 0.25 + lean, hy - 0.06],
    ]
  }
  const width = 0.085 * (1 - 0.08 * Math.abs(look))
  // The street's cold light along its edge: the same shapes a hair larger, behind.
  const tail = tailPts(bx, by, t, go)
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgba(pen, rim, 0.35)
  ctx.lineWidth = 0.05 * k
  strokePts(ctx, k, tail)
  blob(pen, body.map(([x, y]) => [x + (x - bx) * 0.06, y - 0.012] as Pt), rim, 0.32)
  ellipse(pen, [hx, hy - 0.008], width + 0.01, 0.084, rgba(pen, rim, 0.32) as unknown as string)
  // The cat.
  blob(pen, body, ink, 1)
  ellipse(pen, [hx, hy], width, 0.075, ink)
  shape(pen, ears(-width), ink)
  shape(pen, ears(width), ink)
  ctx.strokeStyle = rgba(pen, ink, 1)
  ctx.lineWidth = 0.034 * k
  strokePts(ctx, k, tail)
  // Turned round at the bang: an eye shows.
  if (look > 1.1) ellipse(pen, [hx + width * 0.62, hy - 0.005], 0.012, 0.009, CAT_EYE)
  ctx.restore()
}
/** Its tail: curled round along the riser to the left, the tip twitching; straight out behind it in the leap. */
function tailPts(bx: number, by: number, t: number, go: number): Pt[] {
  if (go > 0) return [[bx + 0.08, by - 0.05], [bx + 0.25, by - 0.1], [bx + 0.4, by - 0.2]]
  const tip = 0.03 * sway(t, 2, 1.6) + 0.02 * Math.max(0, Math.sin(t * 5.2)) ** 6
  return [[bx - 0.08, by - 0.02], [bx - 0.2, by - 0.015], [bx - 0.29, by - 0.04], [bx - 0.33 - tip * 0.5, by - 0.09 - tip]]
}
function strokePts(ctx: CanvasRenderingContext2D, k: number, pts: Pt[]): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.stroke()
}

/* ------------------------------------------------------------------ the store */

/** The bulb over the counter: a little dust turning in its light. */
function counterBulb(pen: Pen, t: number, f: Frame): void {
  const b = bulbOn(t)
  if (b <= 0 || !seen(f, BULB[0] - 1.8, BULB[0] + 1.8, BULB[1] - 1.5, COUNTER_TOP + 0.4)) return
  const [bx, by] = BULB
  motes(pen, t, {
    n: 26,
    seed: 11,
    box: [bx - 1.5, by - 0.9, bx + 1.5, COUNTER_TOP],
    size: [0.005, 0.011],
    color: '#E8D6AE',
    alpha: 0.4 * b,
    drift: [0.03, -0.012],
    wander: 0.1,
    twinkle: 0.12,
    light: (x, y) => Math.exp(-((x - bx) ** 2 + ((y - by) * 0.7) ** 2) / 0.45),
  })
}

/**
 * Whatever is passing in the street lights the glass, and the glass's light is thrown into the store: a band the shape
 * of a pane, the mullion's shadow down it, sliding across the wall of boxes as the lamps go by outside.
 */
function drawPassing(pen: Pen, t: number, f: Frame): void {
  const p = passing(t)
  if (!p || p.a < 0.02) return
  const cx = 0.9 + (1 - p.u) * 2.2
  if (!seen(f, cx - 1.5, cx + 1.5)) return
  const w = 0.8
  const lean = 0.6
  const top = WIN[1] + 0.2
  const foot = FLOOR + 0.2
  const quad = (a: number, b: number): Pt[] => [[cx + a, top], [cx + b, top], [cx + b + lean, foot], [cx + a + lean, foot]]
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const mid = (top + foot) / 2
  const g = ctx.createLinearGradient((cx - w / 2 + lean / 2) * k, mid * k, (cx + w / 2 + lean / 2) * k, mid * k)
  const col = mix('#FFE6B0', '#E8F0FF', 1 - p.warm)
  const a = 0.26 * p.a
  g.addColorStop(0, rgba(pen, col, 0))
  g.addColorStop(0.25, rgba(pen, col, a))
  g.addColorStop(0.75, rgba(pen, col, a))
  g.addColorStop(1, rgba(pen, col, 0))
  fillWith(pen, quad(-w / 2, w / 2), g)
  shape(pen, quad(-0.04, 0.04), rgba(pen, C.shade, 0.5 * p.a) as unknown as string)
}

/** The store's hanging lamps: a little dust turning in their cones. */
function storeLamps(pen: Pen, t: number, f: Frame): void {
  const span = FLOOR - LAMP_Y
  LAMP_X.forEach((lx, i) => {
    const on = lampOn(i, t)
    if (on <= 0 || !seen(f, lx - 2, lx + 2)) return
    const sw = lampSway(i, t)
    const apex: Pt = [lx + sw, LAMP_Y + 0.06]
    const foot = lx + lampFoot(sw)
    motes(pen, t, {
      n: 20,
      seed: 20 + i,
      box: [lx - 1.7, LAMP_Y, lx + 1.7, FLOOR],
      size: [0.005, 0.011],
      color: '#E8D2A2',
      alpha: 0.4 * on,
      drift: [0.02, -0.012],
      wander: 0.12,
      twinkle: 0.12,
      light: (x, y) => {
        const v = (y - LAMP_Y) / span
        const c = apex[0] + (foot - apex[0]) * v
        const d = Math.abs(x - c) / (0.22 + 1.28 * v)
        return d >= 1 ? 0 : (1 - d * d) * (1 - 0.6 * v)
      },
    })
  })
}

/** Dust shaken off the boxes when the ladder bangs into its stop, sifting down through the lamps' light. */
function bangDust(pen: Pen, t: number, f: Frame): void {
  const u = t - BANG
  if (u < 0 || u > 3.2 || !seen(f, 8.2, 10.2)) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const fade = Math.min(1, u * 6) * (1 - u / 3.2)
  ctx.save()
  ctx.fillStyle = rgba(pen, '#EADCBE', 0.55 * fade)
  ctx.beginPath()
  for (let i = 0; i < 46; i++) {
    const h1 = hash(i, 1, 101)
    const h2 = hash(i, 2, 101)
    const h3 = hash(i, 3, 101)
    const x = 8.55 + 1.1 * h1 + 0.06 * Math.sin(u * (1.5 + h2) + i) + (h1 - 0.5) * 0.25 * (1 - Math.exp(-u * 3))
    const y = -2.3 + 2.2 * h2 + (0.08 + 0.18 * h3) * u
    const r = (0.004 + 0.006 * h3) * k
    ctx.moveTo(x * k + r, y * k)
    ctx.arc(x * k, y * k, Math.max(0.6, r), 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** When the cat comes back: slinking in under the fitting chairs from the left, just after he has gone past them. */
const CAT_BACK = 18.95
/**
 * The cat, having bolted, back under the fitting chairs once he has gone by: it slinks in low from the left behind the
 * measuring device, settles crouched under the middle chair, its tail-tip going, and opens its eyes on him going away
 * through the curtain, blinking. Drawn behind the fitting, so the device's plate hides its feet.
 */
export function drawCatUnder(pen: Pen, t: number, f: Frame): void {
  const u = t - CAT_BACK
  if (u < 0 || t > 23 || !seen(f, 12.4, 14)) return
  const ink = '#0C0908'
  const walk = ease(u / 0.7)
  const going = u < 0.7 ? Math.sin((u / 0.7) * Math.PI) : 0
  const x = 13.33 - 0.75 * (1 - walk)
  // Low and long while it slinks; rounder, and breathing, once it is down.
  const breath = 0.006 * Math.sin(t * 2.3) * walk
  const rx = 0.125 + 0.03 * going
  const ry = 0.1 - 0.025 * going + breath
  ellipse(pen, [x, FLOOR - ry * 0.95], rx, ry, ink)
  // Its legs under it as it goes.
  if (going > 0.05) {
    const step = Math.sin(u * 18)
    for (const [dx, ph] of [[-0.09, 1], [0.08, -1]]) rect(pen, x + dx + 0.025 * step * ph - 0.012, FLOOR - 0.06, x + dx + 0.025 * step * ph + 0.012, FLOOR, ink)
  }
  const look = 0.012 * Math.max(0, Math.min(1, (u - 0.7) / 1.2))
  const hx = x + 0.103 + 0.03 * going + look
  const hy = 1.185 + 0.03 * going
  ellipse(pen, [hx, hy], 0.07, 0.06, ink)
  for (const sd of [-1, 1]) shape(pen, [[hx + sd * 0.062, hy - 0.025], [hx + sd * 0.052, hy - 0.1], [hx + sd * 0.012, hy - 0.05]], ink)
  // The tail: out behind it as it goes, then round its feet along the boards, the tip lifting and flicking.
  const tip = 0.02 * sway(t, 4, 1.9) * walk
  const lie = walk ** 2
  shape(pen, [
    [x - 0.1 + 0.13 * lie, FLOOR - 0.06 + 0.025 * lie],
    [x - 0.32 + 0.59 * lie, FLOOR - 0.1 + 0.07 * lie],
    [x - 0.36 + 0.69 * lie, FLOOR - 0.13 + 0.07 * lie + tip],
    [x - 0.34 + 0.65 * lie, FLOOR - 0.14 + 0.065 * lie + tip],
    [x - 0.3 + 0.55 * lie, FLOOR - 0.08 + 0.068 * lie],
    [x - 0.1 + 0.13 * lie, FLOOR - 0.03 + 0.03 * lie],
  ], ink)
  // Its eyes, open on him once it is down: an eye's dull colour, no shine.
  if (u < 0.75) return
  const blink = [19.9, 21.0, 21.25].some((b) => t > b && t < b + 0.13) ? 0.1 : 1
  const open = ease((u - 0.75) / 0.35) * blink
  for (const dx of [-0.033, 0.032]) ellipse(pen, [hx + dx, 1.175], 0.014, 0.01 * open, CAT_EYE)
}

/* ------------------------------------------------------------------ the stockroom */

/** The stockroom: the dust in the swinging bulb's light, and a moth at it. */
function stockroom(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, PART1[0] - 0.5, PART2[1] + 0.5)) return
  // The bulb, swinging: its light on the back wall behind it swinging with it, and the dust turning in its light.
  const sb: Pt = [STOCK_BULB[0] + stockSway(t), STOCK_BULB[1]]
  pool(pen, [sb[0] + 0.4 * stockSway(t), sb[1] + 0.75], 1.5, 1.1, C.lamp, 0.07)
  motes(pen, t, {
    n: 28,
    seed: 32,
    box: [STOCK_BULB[0] - 1.8, STOCK_BULB[1] - 1.2, STOCK_BULB[0] + 1.8, FLOOR - 0.1],
    size: [0.005, 0.011],
    color: '#E8D4AE',
    alpha: 0.42,
    drift: [0.035, -0.01],
    wander: 0.14,
    twinkle: 0.12,
    light: (x, y) => Math.exp(-((x - sb[0]) ** 2 + ((y - sb[1]) * 0.6) ** 2) / 0.7),
  })
  moth(pen, t, sb)
  // The dust the office door kicks up when it is knocked open, drifting out into the stockroom in its light.
  const d = officeDoor(t)
  if (d > 0 && seen(f, 20.5, 23.5)) {
    const gust = Math.exp(-Math.max(0, t - WELCOME) / 1.4)
    const dx = PART2[0] + 0.2
    motes(pen, t, {
      n: 22,
      seed: 33,
      box: [20.6, -1.3, 23.3, FLOOR],
      size: [0.005, 0.011],
      color: '#E8D2A2',
      alpha: 0.42 * d,
      drift: [-0.06 - 0.25 * gust, -0.03],
      wander: 0.12,
      twinkle: 0.12,
      light: (x, y) => 0.6 * Math.exp(-(((x - dx) / 1.0) ** 2 + ((y - 0.5) / 1.3) ** 2)),
    })
  }
}

/**
 * A moth at the stockroom's bulb, never still: in and out of its light, bumping it now and then; and its shadow, thrown
 * three times its size up the back wall behind them, fluttering.
 */
function moth(pen: Pen, t: number, sb: Pt): void {
  const mx = sb[0] + 0.17 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 7.9 + 1) + 0.025 * Math.sin(t * 17.3)
  const my = sb[1] + 0.1 + 0.08 * Math.sin(t * 1.7 + 2) + 0.04 * Math.sin(t * 9.3) + 0.02 * Math.sin(t * 19.1)
  const flap = Math.abs(Math.sin(t * 37))
  const wings = (c: Pt, s: number, col: string) => {
    const w = (0.008 + 0.026 * flap) * s
    ellipse(pen, [c[0] - w * 0.9, c[1]], w, 0.016 * s, col)
    ellipse(pen, [c[0] + w * 0.9, c[1]], w, 0.016 * s, col)
    ellipse(pen, c, 0.005 * s, 0.016 * s, col)
  }
  const m = 3.2
  wings([sb[0] + (mx - sb[0]) * m, sb[1] + (my - sb[1]) * m], m, rgba(pen, C.shade, 0.15) as unknown as string)
  wings([mx, my], 1, '#8E7E62')
}

/* ------------------------------------------------------------------ the office */

/** His desk lamp's light: its green glass shade lit through, the mouth of it, the pool on the desk, the ember, some dust. */
function deskLamp(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, DESK_LAMP - 1.6, DESK_LAMP + 1.6)) return
  const dl = DESK_LAMP
  shape(pen, [[dl - 0.3, -0.32], [dl + 0.3, -0.32], [dl + 0.2, -0.52], [dl - 0.2, -0.52]], rgba(pen, '#5E9A6A', 0.45) as unknown as string)
  pool(pen, [dl, 0.15], 0.85, 0.2, C.lamp, 0.36)
  ellipse(pen, [dl, -0.315], 0.26, 0.022, '#FFF0C8')
  // The ember in the ashtray, breathing slowly.
  ellipse(pen, ASH, 0.014, 0.011, mix('#8A2A1C', '#E0603A', 0.6 + 0.4 * Math.sin(t * 0.9)))
  motes(pen, t, {
    n: 16,
    seed: 41,
    box: [dl - 1.0, -1.1, dl + 1.0, 0.15],
    size: [0.004, 0.01],
    color: '#E8D4AE',
    alpha: 0.4,
    drift: [-0.03, -0.015],
    wander: 0.1,
    twinkle: 0.12,
    light: (x, y) => Math.exp(-(((x - dl) / 0.6) ** 2 + ((y + 0.15) / 0.45) ** 2)),
  })
}

/**
 * Smoke off the cigarette in the ashtray: three strands curling up through the lamp's light, thin at the ember and
 * opening out as they rise, bent over to the left by the draught from the door, gone into the dark by the picture rail.
 */
function smoke(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, ASH[0] - 1.2, ASH[0] + 0.4, -2.2, 0.3)) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const N = 22
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let s = 0; s < 3; s++) {
    const H = 1.75 * (0.82 + 0.12 * s)
    const pts: Pt[] = []
    for (let j = 0; j <= N; j++) {
      const v = j / N
      const curl = (0.012 + 0.1 * v ** 1.7) * Math.sin(8.5 * v - 2.0 * t + s * 2.2)
      pts.push([ASH[0] - (0.62 + 0.15 * sway(t, 9, 6.5)) * v ** 1.5 + curl + 0.15 * v * sway(t, s + 3, 4.2) + 0.01 * s * v, ASH[1] - H * v])
    }
    for (let j = 0; j < N; j++) {
      const v = (j + 0.5) / N
      const [x, y] = pts[j]
      const lit = 0.4 + 0.6 * Math.exp(-(((x - DESK_LAMP) / 0.8) ** 2 + ((y + 0.25) / 0.55) ** 2))
      const a = 0.4 * Math.min(1, v * 10) * (1 - v) ** 1.2 * lit * (s === 0 ? 1 : 0.65)
      if (a < 0.01) continue
      ctx.strokeStyle = rgba(pen, mix('#C8C2B6', '#FFE8C0', lit - 0.4), a)
      ctx.lineWidth = (0.01 + 0.07 * v) * k
      ctx.beginPath()
      ctx.moveTo(x * k, y * k)
      ctx.lineTo(pts[j + 1][0] * k, pts[j + 1][1] * k)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** When each car crosses the window, and how bright its lamps are (a truck's high and strong, a cab's dimmer). */
const CARS: [number, number][] = [[30.3, 0.14], [32.55, 0.2], [35.35, 0.26], [43.15, 0.18], [50.1, 0.2]]
/** The El's trains going by, one each way, as the city starts its day. */
const ELS: [number, number][] = [[38.7, 42.1], [45.2, 48.5]]
const SLATS = 9
/**
 * The street's light through the office's venetian blind, off to the right: its slats laid in stripes across the back
 * wall, a cold blue, stronger once it is six and the day comes up. The early traffic's lamps (a car, a delivery truck,
 * a cab, the milk truck going back) sweep a warm copy of them across the wall and away; the El going by, each way,
 * throws them window after window.
 */
function blinds(pen: Pen, t: number, f: Frame): void {
  const x0 = PART2[1]
  if (!seen(f, x0, 31.6, -2.4, 0.4)) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  // Only the office's walls take it: not the safe, nor its door standing open.
  ctx.beginPath()
  ctx.rect(x0 * k, -2.6 * k, (31.6 - x0) * k, (FLOOR - 0.05 + 2.6) * k)
  ctx.rect(x0 * k, -0.32 * k, (SAFE[1] + 0.06 - x0) * k, (FLOOR - 0.05 + 0.32) * k)
  ctx.clip('evenodd')
  const six = ease((t - CLOCK_SIX) / 3)
  // Murray's shadow takes some of it as he comes in.
  const murray = t > MURRAY_STEPS[0] ? 0.75 : 1
  // The blind stirring in the warm air off the radiator under it: its slats rocking, so the stripes lift and settle, and
  // open and close a little, never quite still.
  const tr = 0.03 * sway(t, 31, 1.3) + 0.012 * Math.sin(t * 4.1)
  const open = 0.52 + 0.07 * sway(t, 33, 1.7)
  slats(pen, 26.8, -1.7 + tr, 2.3, 1.85, -0.55, -0.22, C.cold, (0.08 + 0.08 * six) * murray, open)
  for (const [c, a] of CARS) {
    const u = (t - c) / 1.9
    if (u <= 0 || u >= 1) continue
    slats(pen, 30.6 - 9.4 * u, -1.75 + tr, 2.1, 1.9, -0.45, -0.2, '#FFE8BC', a * Math.sin(Math.PI * u) ** 1.2, open)
  }
  for (const [e0, e1] of ELS) {
    const e = (t - e0) / (e1 - e0)
    if (e <= 0 || e >= 1) continue
    const env = Math.sin(Math.PI * e) ** 0.8
    const strobe = Math.max(0, Math.min(1, 0.5 + 1.6 * Math.sin(2 * Math.PI * 4.4 * t + 1.3 * Math.sin(2 * Math.PI * 0.9 * t))))
    slats(pen, 27.2 - 1.1 * e, -1.72 + tr, 2.3, 1.9, -0.5, -0.22, mix('#FFE0A0', C.cold, 0.25), 0.14 * env * (0.2 + 0.8 * strobe), open)
  }
  ctx.restore()
}
/** The blind's stripes, laid over the wall, in a leaning box: slats from (x, y), `w` across and `h` down, its foot moved by `lean`. */
function slats(pen: Pen, x: number, y: number, w: number, h: number, lean: number, slope: number, color: string, a: number, open = 0.52): void {
  if (a <= 0.004) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const P = (u: number, v: number): Pt => [x + u * w + v * lean, y + v * h + u * slope]
  const g = ctx.createLinearGradient((x + lean / 2) * k, 0, (x + w + lean / 2) * k, 0)
  g.addColorStop(0, rgba(pen, color, 0))
  g.addColorStop(0.2, rgba(pen, color, a))
  g.addColorStop(0.8, rgba(pen, color, a))
  g.addColorStop(1, rgba(pen, color, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  for (let i = 0; i < SLATS; i++) {
    const v0 = i / SLATS
    const v1 = (i + open) / SLATS
    const q = [P(0, v0), P(1, v0), P(1, v1), P(0, v1)]
    q.forEach(([px, py], j) => (j ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)))
    ctx.closePath()
  }
  ctx.fill()
  ctx.restore()
}

/** Dust turning in the light fallen into the open safe, over the bills. */
function safeDust(pen: Pen, t: number): void {
  const s = ease((doorDeg(t) - 30) / 110)
  if (s <= 0) return
  const [x0, y0, x1, y1] = INNER
  const mid = (x0 + x1) / 2
  motes(pen, t, {
    n: 12,
    seed: 51,
    box: [x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.1],
    size: [0.004, 0.009],
    color: '#E8D8B4',
    alpha: 0.4 * s,
    drift: [0.015, -0.01],
    wander: 0.06,
    twinkle: 0.12,
    light: (x) => Math.max(0, 1 - Math.abs(x - mid) / 0.8),
  })
}

/** All of the store's life over its drawing, after its lights. */
export function drawLife(pen: Pen, t: number, f: Frame): void {
  counterBulb(pen, t, f)
  drawPassing(pen, t, f)
  storeLamps(pen, t, f)
  bangDust(pen, t, f)
  stockroom(pen, t, f)
  if (seen(f, PART2[0], 32)) {
    blinds(pen, t, f)
    deskLamp(pen, t, f)
    smoke(pen, t, f)
    safeDust(pen, t)
  }
}

/* ------------------------------------------------------------------ the foreground */

type Thing = 'boxes' | 'stool' | 'tree' | 'plant' | 'stand' | 'cartons' | 'dolly' | 'basket' | 'hatbox' | 'chair'
const STORE_THINGS: Thing[] = ['boxes', 'stool', 'tree', 'plant', 'stand', 'boxes']
const STOCK_THINGS: Thing[] = ['cartons', 'dolly', 'cartons']
const OFFICE_THINGS: Thing[] = ['basket', 'hatbox', 'chair']
/** Their spacing along the foreground (its own cells) and its depth: nearer than the store, so it passes faster. */
const GAP = 2.4
const NEAR = 1.3
const GROUND = 4

/**
 * In front of it all, along the foot of the frame: the store's clutter close to the lens, dark and soft, going by faster
 * than the store as the camera goes (a stack of shoe boxes, a fitting stool, a shoe tree on its box, a potted plant,
 * the umbrella stand; cartons and a hand truck in the stockroom; the wastebasket, a hatbox and a chair in the office).
 * Low enough never to come near him: their tops stay below the floor's line on the screen.
 */
export function drawForeground(pen: Pen, t: number, f: Frame): void {
  layer(pen, f, NEAR, (g) => {
    if (g.y1 < 1.84) return
    const { k } = pen
    const ctx = ctxOf(pen.p)
    const rims: number[] = []
    ctx.save()
    const n0 = Math.floor(g.x0 / GAP) - 1
    const n1 = Math.ceil(g.x1 / GAP) + 1
    const half = (g.x1 - g.x0) / 2
    const ink = '#140D09'
    ctx.lineJoin = 'round'
    for (let n = n0; n <= n1; n++) {
      if (n < 1 || hash(n, 0, 111) < 0.18) continue
      const x = n * GAP + 0.9 * hash(n, 1, 111)
      // Only toward the frame's sides: anything crossing the middle fades as it goes by, so he is never crowded.
      const side = Math.min(1, Math.max(0, (Math.abs(x + 0.35 - g.cx) / half - 0.32) / 0.3))
      if (side <= 0.02) continue
      const world = x / NEAR
      const list = world < PART1[0] ? STORE_THINGS : world < PART2[0] ? STOCK_THINGS : OFFICE_THINGS
      const kind = list[Math.floor(hash(n, 2, 111) * list.length)]
      // Low: its top no more than a little way into the frame, however low the camera goes.
      const top = Math.max(1.96 + 0.1 * hash(n, 3, 111), g.y1 - 0.34)
      ctx.beginPath()
      thing(ctx, k, kind, x, top, t, n, side > 0.5 ? rims : [])
      // Out of focus, so soft: wide faint strokes round it, then the dark itself, not quite black.
      for (const [w, a] of [[0.16, 0.08], [0.09, 0.14], [0.045, 0.2]]) {
        ctx.strokeStyle = rgba(pen, ink, a * side)
        ctx.lineWidth = w * k
        ctx.stroke()
      }
      ctx.fillStyle = rgba(pen, ink, 0.82 * side)
      ctx.fill()
    }
    // The lamps' light just catching their tops.
    ctx.strokeStyle = rgba(pen, C.lamp, 0.12)
    ctx.lineWidth = Math.max(0.8, 0.02 * k)
    ctx.beginPath()
    for (let i = 0; i < rims.length; i += 3) {
      ctx.moveTo(rims[i] * k, rims[i + 2] * k)
      ctx.lineTo(rims[i + 1] * k, rims[i + 2] * k)
    }
    ctx.stroke()
    ctx.restore()
  })
}
/** One thing in the foreground, its top at `top`, added to the path; `rims` gets the top edges the light catches. */
function thing(ctx: CanvasRenderingContext2D, k: number, kind: Thing, x: number, top: number, t: number, n: number, rims: number[]): void {
  const R = (x0: number, y0: number, x1: number, y1: number) => ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  const poly = (pts: Pt[]) => {
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)))
    ctx.closePath()
  }
  const G = GROUND
  switch (kind) {
    case 'boxes': {
      R(x, top + 0.3, x + 0.7, G)
      R(x + 0.06, top + 0.12, x + 0.66, top + 0.3)
      R(x + 0.16, top, x + 0.58, top + 0.12)
      rims.push(x + 0.16, x + 0.58, top, x + 0.06, x + 0.16, top + 0.12)
      break
    }
    case 'stool': {
      // A fitting stool: its seat, and the sloped footrest out in front.
      R(x, top + 0.12, x + 0.5, G)
      poly([[x + 0.5, top + 0.2], [x + 0.95, top + 0.02], [x + 1.0, top + 0.08], [x + 0.55, top + 0.32], [x + 0.55, G], [x + 0.5, G]])
      rims.push(x, x + 0.5, top + 0.12)
      break
    }
    case 'tree': {
      // A shoe tree standing on its box: the toe form and the knob of its spring.
      R(x, top + 0.24, x + 0.6, G)
      poly([[x + 0.12, top + 0.24], [x + 0.14, top + 0.08], [x + 0.3, top + 0.02], [x + 0.48, top + 0.1], [x + 0.5, top + 0.24]])
      ctx.moveTo((x + 0.12 + 0.035) * k, (top + 0.02) * k)
      ctx.arc((x + 0.12) * k, (top + 0.02) * k, 0.035 * k, 0, Math.PI * 2)
      rims.push(x, x + 0.6, top + 0.24)
      break
    }
    case 'plant': {
      // A snake plant in a pot: tall pointed leaves, stirring in the draught.
      R(x + 0.05, top + 0.28, x + 0.45, G)
      R(x, top + 0.24, x + 0.5, top + 0.3)
      for (let i = 0; i < 5; i++) {
        const lx = x + 0.1 + i * 0.075
        const tip = 0.015 * sway(t, n + i, 3.3 + i * 0.4)
        const h = 0.12 + 0.16 * hash(n, i, 113)
        poly([[lx - 0.03, top + 0.26], [lx + 0.03, top + 0.26], [lx + 0.012 + tip, top + 0.24 - h], [lx + tip, top + 0.22 - h - 0.04]])
      }
      break
    }
    case 'stand': {
      // The umbrella stand by the door, two crooks over its rim.
      R(x, top + 0.18, x + 0.32, G)
      for (const [dx, h] of [[0.08, 0.16], [0.22, 0.1]]) {
        R(x + dx - 0.012, top + 0.18 - h, x + dx + 0.012, top + 0.18)
        ctx.moveTo((x + dx + 0.012) * k, (top + 0.18 - h) * k)
        ctx.arc((x + dx + 0.05) * k, (top + 0.18 - h) * k, 0.05 * k, Math.PI, 0)
        ctx.arc((x + dx + 0.05) * k, (top + 0.18 - h) * k, 0.028 * k, 0, Math.PI, true)
        ctx.closePath()
      }
      rims.push(x, x + 0.32, top + 0.18)
      break
    }
    case 'cartons': {
      R(x, top + 0.15, x + 0.85, G)
      R(x + 0.5, top, x + 1.05, top + 0.15)
      R(x + 0.5, top + 0.15, x + 1.05, G)
      poly([[x + 0.08, top + 0.15], [x + 0.2, top + 0.03], [x + 0.25, top + 0.05], [x + 0.16, top + 0.15]])
      rims.push(x + 0.5, x + 1.05, top, x + 0.16, x + 0.5, top + 0.15)
      break
    }
    case 'dolly': {
      // A hand truck stood against the cartons: its two rails and the loop of its handle.
      poly([[x, G], [x + 0.06, top - 0.05], [x + 0.1, top - 0.05], [x + 0.05, G]])
      poly([[x + 0.3, G], [x + 0.27, top - 0.05], [x + 0.31, top - 0.05], [x + 0.35, G]])
      R(x + 0.04, top - 0.08, x + 0.33, top - 0.04)
      R(x + 0.04, top + 0.15, x + 0.33, top + 0.19)
      R(x - 0.05, top + 0.36, x + 0.42, top + 0.42)
      break
    }
    case 'basket': {
      poly([[x, top + 0.06], [x + 0.42, top + 0.06], [x + 0.38, G], [x + 0.04, G]])
      R(x - 0.02, top + 0.03, x + 0.44, top + 0.08)
      poly([[x + 0.12, top + 0.06], [x + 0.16, top - 0.04], [x + 0.26, top - 0.02], [x + 0.28, top + 0.06]])
      rims.push(x - 0.02, x + 0.44, top + 0.03)
      break
    }
    case 'hatbox': {
      R(x, top + 0.1, x + 0.6, G)
      ctx.moveTo((x + 0.6) * k, (top + 0.1) * k)
      ctx.ellipse((x + 0.3) * k, (top + 0.1) * k, 0.3 * k, 0.07 * k, 0, 0, Math.PI * 2)
      rims.push(x + 0.05, x + 0.55, top + 0.03)
      break
    }
    case 'chair': {
      // The back of his visitors' chair: its top rail and spindles.
      R(x, top, x + 0.75, top + 0.07)
      for (let i = 0; i < 5; i++) R(x + 0.06 + i * 0.15, top + 0.07, x + 0.1 + i * 0.15, G)
      R(x - 0.02, top + 0.07, x + 0.05, G)
      R(x + 0.7, top + 0.07, x + 0.77, G)
      rims.push(x, x + 0.75, top)
      break
    }
  }
}
