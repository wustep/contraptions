import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, knock } from '../kit'
import { beat, level } from '../music'
import { RAILWAY } from '../worlds'
import {
  BOGIE,
  BUFFER_STOP,
  CYL,
  K_BRAKE,
  LEAD,
  LIP_V,
  MOUTH,
  RAIL_Y,
  TENDER,
  TRAIL,
  T_BRAKE,
  T_DOOR,
  T_IN,
  T_OUT,
  T_STOP,
  T_SUCK,
  VALVES,
  WHISTLE,
  bodyPoint,
  engineX,
  speed,
  turns,
} from './express-line'

/**
 * What the express breathes: its exhaust, a chuff at every quarter turn of the drivers (so four to a turn, and the
 * biggest on the backbeats); sparks thrown up out of the chimney with it; steam from the cylinder cocks as it starts;
 * the whistle's shriek; the brakes' sparks off the rails; and at the end, standing, a lazy smoke and the safety valves
 * simmering. All from show time, in world cells; smoke and steam are soft layered shapes, drawn over what they are in
 * front of, never outlined; sparks are streaks, never dots.
 */

/* ------------------------------------------------------------------ when the chuffs are */

/** Show time of every chuff: a quarter turn of the drivers each, from the door to the brakes. */
export const CHUFFS: readonly { t: number; big: boolean }[] = (() => {
  const out: { t: number; big: boolean }[] = [{ t: T_DOOR, big: true }]
  const last = Math.floor(turns(T_BRAKE) * 4)
  let lo = T_DOOR
  for (let i = 1; i < last; i++) {
    const want = i / 4
    let a = lo
    let b = T_BRAKE
    for (let j = 0; j < 40; j++) {
      const m = (a + b) / 2
      if (turns(m) < want) a = m
      else b = m
    }
    lo = b
    out.push({ t: b, big: i % 4 === 0 })
  }
  // The second chuff, on the first backbeat after the door, as the drivers take hold: before the first quarter turn.
  const second = beat(193)
  if (out[1].t > second + 0.1) out.splice(1, 0, { t: second, big: true })
  return out
})()

/** The whistle: four long shrieks in the B phrases, on the trestle, one a bar. */
export const BLASTS: readonly number[] = [beat(225), beat(229), beat(233), beat(237)]
const BLAST = 0.62

const SMOKE = mixHex(RAILWAY.smoke, RAILWAY.iron, 0.2)
const SMOKE_LIT = mixHex(RAILWAY.smoke, RAILWAY.moon, 0.4)
const STEAM = RAILWAY.steam

/** The chimney's lip in the world at `t`. */
const lip = (t: number): Pt => bodyPoint(t, 0, LIP_V)

/* ------------------------------------------------------------------ smoke and steam */

/** A soft cloud: lobes of one colour, a lighter crown toward the moon. `seed` keeps its shape its own. */
function cloud(p: p5, k: number, x: number, y: number, r: number, a: number, body: string, lit: string, seed: number): void {
  if (a <= 0.01 || r <= 0.01) return
  const X = (v: number) => v * k
  p.noStroke()
  const lobes = 5
  const c = p.color(body)
  c.setAlpha(255 * a)
  p.fill(c)
  for (let i = 0; i < lobes; i++) {
    const ang = (i / lobes) * Math.PI * 2 + hash(seed, i) * 0.8
    const d = r * (0.35 + 0.25 * hash(seed, i, 2))
    const rr = r * (0.55 + 0.35 * hash(seed, i, 3))
    p.circle(X(x + Math.cos(ang) * d), X(y + Math.sin(ang) * d * 0.8), X(rr * 2))
  }
  const l = p.color(lit)
  l.setAlpha(255 * a * 0.8)
  p.fill(l)
  for (let i = 0; i < 3; i++) {
    const ang = -Math.PI * (0.35 + 0.18 * i) + hash(seed, i, 4) * 0.3
    const d = r * 0.4
    const rr = r * (0.38 + 0.2 * hash(seed, i, 5))
    p.circle(X(x + Math.cos(ang) * d), X(y + Math.sin(ang) * d * 0.8), X(rr * 2))
  }
}

/** The exhaust: every chuff a puff shot up out of the chimney, left in the air as the train runs out from under it. */
export function exhaust(p: p5, k: number, t: number, x0: number, x1: number): void {
  const LIFE = 3.2
  // Oldest first, so the young puffs roll up over the old. Each chuff throws a puff, and the steam between two chuffs
  // a smaller one, so the plume is one rolling mass that swells and thins as it goes, not a string of puffs.
  for (let i = 0; i < CHUFFS.length * 2; i++) {
    const c = CHUFFS[i >> 1]
    const half = i % 2 === 1
    if (half && (i >> 1) + 1 >= CHUFFS.length) continue
    const born = half ? (c.t + CHUFFS[(i >> 1) + 1].t) / 2 : c.t
    const a = t - born
    if (a < 0 || a > LIFE) continue
    const at = lip(born)
    const v = speed(born)
    const big = half ? 0.7 : c.big ? 1.3 : 1
    const size = big * (0.75 + 0.5 * hash(i, 71))
    const x = at[0] + v * 0.22 * (1 - Math.exp(-a / 0.22)) - 0.3 * a
    const y = at[1] - 1.66 * (1 - Math.exp(-a / 0.32)) * (half ? 0.8 : big) - 0.3 * a + 0.25 * (hash(i, 72) - 0.5) * a
    const r = (0.16 + 1.15 * (1 - Math.exp(-a / 0.7)) + 0.2 * a) * size
    if (x + r < x0 || x - r > x1) continue
    const fade = Math.pow(1 - a / LIFE, 1.9) * (half ? 0.6 : 0.8)
    // Young, it is lit from below by the fire in the smokebox.
    const warm = Math.exp(-a / 0.12)
    cloud(p, k, x, y, r, fade, mixHex(SMOKE, RAILWAY.coal, 0.45 * warm), mixHex(SMOKE_LIT, RAILWAY.coalHot, 0.4 * warm), i)
  }
  // Standing at the terminus: a lazy smoke rising from the chimney, and the safety valves simmering white.
  if (t > T_STOP + 0.4) {
    const s = Math.min(1, (t - T_STOP - 0.4) / 2)
    for (let j = 0; j < 7; j++) {
      const ph = (t * 0.35 + j / 7) % 1
      const born = t - ph / 0.35
      const at = lip(Math.max(born, T_STOP + 0.4))
      const a = ph / 0.35
      cloud(p, k, at[0] - 0.5 * a + 0.1 * Math.sin(a * 1.3 + j), at[1] - 0.9 * a, 0.18 + 0.35 * a, 0.45 * s * (1 - ph), SMOKE, SMOKE_LIT, 500 + Math.floor(born * 0.35) + j)
    }
    for (let j = 0; j < 5; j++) {
      const ph = (t * 0.7 + j / 5) % 1
      const at = bodyPoint(t, VALVES.u, VALVES.top)
      cloud(p, k, at[0] - 0.35 * ph, at[1] - 0.8 * ph, 0.06 + 0.22 * ph, 0.5 * s * (1 - ph) * (0.6 + 0.4 * Math.sin(t * 0.9)), STEAM, STEAM, 900 + j)
    }
  }
}

/** Steam from the cylinder cocks as it starts away: white, low round the front wheels, left behind as it goes. */
export function cocks(p: p5, k: number, t: number): void {
  const END = T_DOOR + 2.4
  if (t < T_DOOR || t > END + 1.2) return
  for (let i = 0; ; i++) {
    const born = T_DOOR + i * 0.06
    if (born > Math.min(t, END)) break
    const a = t - born
    if (a > 1.1) continue
    const strength = 1 - (born - T_DOOR) / (END - T_DOOR)
    for (const [u, dir] of [[CYL.u1 + 0.05, 1], [CYL.u0 - 0.05, -1]] as const) {
      const [ex, ey] = [engineX(born) + u, RAIL_Y - CYL.v + CYL.r]
      const x = ex + dir * 1.1 * (1 - Math.exp(-a / 0.3)) + (hash(i, u > 1 ? 1 : 2) - 0.5) * 0.3
      const y = ey + 0.25 * (1 - Math.exp(-a / 0.4)) - 0.35 * a
      const r = (0.12 + 0.55 * (1 - Math.exp(-a / 0.35))) * (0.6 + 0.4 * strength)
      cloud(p, k, x, y, r, 0.55 * strength * Math.pow(1 - a / 1.1, 1.4), STEAM, STEAM, i * 3 + (dir > 0 ? 1 : 2))
    }
  }
}

/** The whistle's shriek: a white jet straight up off the whistle, bent back as the train runs out from under it. */
export function whistle(p: p5, k: number, t: number): void {
  for (const b of BLASTS) {
    if (t < b || t > b + BLAST + 1.1) continue
    for (let i = 0; ; i++) {
      const born = b + i * 0.025
      if (born > Math.min(t, b + BLAST)) break
      const a = t - born
      if (a > 1.0) continue
      const at = bodyPoint(born, WHISTLE.u, WHISTLE.top)
      const x = at[0] + speed(born) * 0.12 * (1 - Math.exp(-a / 0.12))
      const y = at[1] - 6 * 0.2 * (1 - Math.exp(-a / 0.2)) - 0.3 * a
      const r = 0.05 + 0.4 * (1 - Math.exp(-a / 0.35))
      const onset = Math.min(1, (born - b) / 0.04 + 0.4)
      cloud(p, k, x, y, r, 0.8 * onset * Math.pow(1 - a, 1.3), STEAM, STEAM, 300 + i)
    }
  }
}

/** Whether the whistle is sounding at `t` (0..1): the lever pulled down while it does. */
export function blowing(t: number): number {
  let v = 0
  for (const b of BLASTS) if (t >= b - 0.02 && t < b + BLAST + 0.1) v = Math.max(v, Math.min(1, (t - b + 0.02) / 0.04) * Math.min(1, (b + BLAST + 0.1 - t) / 0.1))
  return v
}

/* ------------------------------------------------------------------ sparks */

function streak(p: p5, k: number, x: number, y: number, dx: number, dy: number, a: number, hot: number, wide: number): void {
  const X = (v: number) => v * k
  p.stroke(alpha(p, mixHex(RAILWAY.coal, RAILWAY.coalHot, hot), a))
  p.strokeWeight(Math.max(1, X(wide)))
  p.line(X(x), X(y), X(x - dx), X(y - dy))
}

/** Sparks thrown up out of the chimney with every chuff, more as the orchestra grows, streaming back over the train. */
export function stackSparks(p: p5, k: number, t: number, x0: number, x1: number): void {
  const vt = speed(t)
  for (let i = 0; i < CHUFFS.length; i++) {
    const c = CHUFFS[i]
    if (t - c.t > 1.3 || t < c.t) continue
    const loud = level(c.t)
    const n = (c.big ? 4 : 2) + Math.floor(loud * 4)
    const at = lip(c.t)
    const v = speed(c.t)
    for (let j = 0; j < n; j++) {
      const born = c.t + hash(i, j, 1) * 0.06
      const a = t - born
      const life = 0.55 + 0.6 * hash(i, j, 2)
      if (a < 0 || a > life) continue
      const vx = v * 0.95 + (hash(i, j, 3) - 0.5) * 1.6
      const vy = -(3.2 + 4.2 * hash(i, j, 4))
      const drag = 0.55
      const x = at[0] + (hash(i, j, 5) - 0.5) * 0.3 + vx * drag * (1 - Math.exp(-a / drag))
      const y = at[1] + vy * a + 3.2 * a * a
      if (x < x0 - 1 || x > x1 + 1) continue
      // The streak lies along its way across the screen: back over the train as the train runs on.
      const wx = vx * Math.exp(-a / drag) - vt
      const wy = vy + 6.4 * a
      const u = a / life
      streak(p, k, x, y, wx * 0.035, wy * 0.035, Math.pow(1 - u, 1.2), 1 - u, 0.028 + 0.02 * hash(i, j, 6))
    }
  }
}

/** The brakes: every wheel locked and sliding on the rail, a spray of sparks off each shooting on ahead of it. */
export function brakeSparks(p: p5, k: number, t: number): void {
  if (t < T_BRAKE || t > T_STOP + 0.6) return
  const X = (v: number) => v * k
  const vt = speed(t)
  // The drivers bite hardest; the bogie and the tender's wheels throw less.
  const wheels: [number, number][] = [[BOGIE[1], 0.55], [BOGIE[0], 0.55], [LEAD, 1.25], [TRAIL, 1.25], [TENDER.u1 - 0.9, 0.7], [(TENDER.u0 + TENDER.u1) / 2, 0.7], [TENDER.u0 + 0.9, 0.6]]
  const on = Math.min(1, (t - T_BRAKE) / 0.06) * (t < T_STOP ? 1 : Math.max(0, 1 - (t - T_STOP) / 0.3))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  // The light of it along the rail under the train: a long low warm wash, never a round light.
  if (on > 0.01) {
    // An ellipse of light, long along the rail, soft at every edge.
    const x0 = engineX(t) + TENDER.u0
    const x1 = engineX(t) + BOGIE[1] + 1.2
    const cx = (x0 + x1) / 2
    const half = (x1 - x0) / 2
    ctx.save()
    ctx.translate(X(cx), X(RAIL_Y - 0.1))
    ctx.scale(half / 0.9, 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, X(0.9))
    g.addColorStop(0, `rgba(255, 170, 70, ${0.24 * on})`)
    g.addColorStop(0.6, `rgba(255, 150, 60, ${0.1 * on})`)
    g.addColorStop(1, 'rgba(255, 107, 44, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-X(0.9), -X(0.9), X(1.8), X(1.8))
    ctx.restore()
  }
  for (const [wi, [u, force]] of wheels.entries()) {
    const cx = engineX(t) + u + 0.05
    if (on > 0.01) {
      // Where the tyre grinds the rail: long and flat along it, white at its heart.
      p.noStroke()
      p.fill(alpha(p, RAILWAY.coalHot, 0.6 * on * force))
      p.ellipse(X(cx + 0.2), X(RAIL_Y - 0.01), X(0.9 * force + 0.2), X(0.08))
      p.fill(alpha(p, RAILWAY.fwWhite, 0.8 * on))
      p.ellipse(X(cx + 0.08), X(RAIL_Y - 0.01), X(0.3), X(0.045))
    }
    // A rooster's tail of sparks thrown on ahead of the wheel and up, falling.
    for (let j = 0; ; j++) {
      const born = T_BRAKE + j * (0.009 / force)
      if (born > Math.min(t, T_STOP + 0.12)) break
      const a = t - born
      const life = 0.3 + 0.45 * hash(wi, j, 1)
      if (a > life) continue
      const x0 = engineX(born) + u + 0.12
      const vx = speed(born) + (1.5 + 5 * hash(wi, j, 2)) * force
      const vy = -(0.5 + 4.2 * Math.pow(hash(wi, j, 3), 1.5)) * force
      const x = x0 + vx * a
      const y = RAIL_Y - 0.03 + vy * a + 8 * a * a
      if (y > RAIL_Y + 0.02) continue
      const fade = Math.pow(1 - a / life, 1.1)
      streak(p, k, x, y, (vx - vt) * 0.06, (vy + 16 * a) * 0.06, Math.min(1, 1.2 * fade), 1 - 0.7 * (a / life), 0.03 + 0.02 * hash(wi, j, 4))
    }
  }
  p.pop()
}

/**
 * The spark bursts out of the chimney on the last backbeat: a great cough of smoke under it and a spray of the
 * stack's own sparks round it, all on the note.
 */
export function burst(p: p5, k: number, t: number): void {
  const a = t - T_OUT
  if (a < -0.02 || a > 1.8) return
  const at = lip(T_OUT)
  const v = speed(T_OUT)
  if (a >= 0) {
    for (let i = 0; i < 4; i++) {
      const x = at[0] + v * 0.2 * (1 - Math.exp(-a / 0.2)) + (i - 1.5) * 0.18
      const y = at[1] - 1.6 * (1 - Math.exp(-a / 0.3)) - 0.2 * a - 0.1 * i
      const r = (0.25 + 0.95 * (1 - Math.exp(-a / 0.45))) * (0.8 + 0.1 * i)
      cloud(p, k, x, y, r, 0.85 * Math.pow(1 - a / 1.8, 1.5), mixHex(SMOKE, RAILWAY.coal, 0.4 * Math.exp(-a / 0.2)), SMOKE_LIT, 700 + i)
    }
  }
  const vt = speed(t)
  p.push()
  for (let j = 0; j < 14; j++) {
    const born = T_OUT + hash(j, 31) * 0.05
    const b = t - born
    const life = 0.5 + 0.4 * hash(j, 32)
    if (b < 0 || b > life) continue
    const ang = -Math.PI / 2 + (hash(j, 33) - 0.5) * 1.6
    const sp = 3 + 4 * hash(j, 34)
    const vx = v + Math.cos(ang) * sp
    const vy = Math.sin(ang) * sp
    const x = at[0] + vx * b
    const y = at[1] + vy * b + 4 * b * b
    streak(p, k, x, y, (vx - vt) * 0.04, (vy + 8 * b) * 0.04, Math.pow(1 - b / life, 1.2), 1 - b / life, 0.03)
  }
  p.pop()
}

/** A flame's tongue, base at (x, y), `h` tall and `w` wide, its tip swung `lean` cells sideways. */
function tongue(p: p5, k: number, x: number, y: number, w: number, h: number, lean: number, fill: p5.Color | string): void {
  const X = (v: number) => v * k
  p.fill(fill as string)
  p.beginShape()
  const n = 20
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.65)) * (1 - 0.3 * u)
    p.vertex(X(x + side * w * 0.5 * belly + lean * u * u), X(y - h * u))
  }
  p.endShape(p.CLOSE)
}

/**
 * The door: the fire the spark comes out of. On the first chuff the chimney throws up a column of fire, a fountain of
 * its own sparks round the spark and a cough of smoke lit from below; the fire sinks back into the chimney over half a
 * second and the sparks rise, stream back and die. Drawn under the spark (its flame is `fx.ts`'s, over everything).
 */
export function eruption(p: p5, k: number, t: number): void {
  const a = t - T_DOOR
  if (a < -0.4 || a > 2.4) return
  const X = (v: number) => v * k
  const at = lip(Math.max(T_DOOR, t))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  p.noStroke()
  // The fire: up out of the lip before the cut (the door is a fire), tallest on it, sinking back into the chimney.
  const up = a < 0 ? Math.pow((a + 0.4) / 0.4, 1.5) : Math.exp(-a / 0.26)
  if (up > 0.02) {
    const glow = 2.4 * (0.5 + 0.5 * up)
    const g = ctx.createRadialGradient(X(at[0]), X(at[1] - 0.5), 0, X(at[0]), X(at[1] - 0.5), X(glow))
    g.addColorStop(0, `rgba(255, 194, 76, ${0.5 * up})`)
    g.addColorStop(0.45, `rgba(255, 107, 44, ${0.22 * up})`)
    g.addColorStop(1, 'rgba(255, 107, 44, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(at[0] - glow), X(at[1] - 0.5 - glow), X(glow * 2), X(glow * 2))
    const h = 2.2 * up
    for (let i = 0; i < 5; i++) {
      const sway = 0.1 * Math.sin(t * (17 + i * 3) + i * 1.7)
      const off = (i - 2) * 0.09
      const tall = (1 - 0.28 * Math.abs(i - 2)) * (0.85 + 0.15 * Math.sin(t * (29 + 5 * i) + i))
      tongue(p, k, at[0] + off, at[1] + 0.05, 0.3, h * tall, sway - 0.08, alpha(p, i % 2 ? RAILWAY.coal : mixHex(RAILWAY.coal, '#8E2A18', 0.4), 0.9 * Math.min(1, up * 3)))
    }
    tongue(p, k, at[0], at[1] + 0.05, 0.3, h * 0.66, 0.05 * Math.sin(t * 23), alpha(p, RAILWAY.coalHot, 0.95 * Math.min(1, up * 3)))
    tongue(p, k, at[0], at[1] + 0.05, 0.14, h * 0.34, 0, alpha(p, RAILWAY.fwWhite, 0.85 * Math.min(1, up * 3)))
  }
  // Its cough: a great puff lit from under by the fire, rolling up past the spark and on.
  if (a >= 0) {
    for (let i = 0; i < 6; i++) {
      const s = a - i * 0.05
      if (s <= 0) continue
      const x = at[0] + (hash(i, 51) - 0.5) * 0.5 - 0.35 * s + 0.15 * i * (1 - Math.exp(-s / 0.4))
      const y = at[1] - 3.2 * 0.5 * (1 - Math.exp(-s / 0.5)) - 0.25 * s - 0.15 * i
      const r = 0.25 + 1.0 * (1 - Math.exp(-s / 0.6)) + 0.12 * s
      const warm = Math.exp(-s / 0.35)
      cloud(p, k, x, y, r * (0.8 + 0.3 * hash(i, 52)), 0.8 * Math.pow(1 - s / 2.4, 1.5), mixHex(SMOKE, RAILWAY.coal, 0.55 * warm), mixHex(SMOKE_LIT, RAILWAY.coalHot, 0.5 * warm), 1300 + i)
    }
  }
  // A fountain of the chimney's own sparks, round the spark and past it.
  const vt = speed(t)
  for (let j = 0; j < 46; j++) {
    const born = T_DOOR + hash(j, 61) * 0.45 - 0.02
    const b = t - born
    const life = 0.7 + 0.9 * hash(j, 62)
    if (b < 0 || b > life) continue
    const vx = (hash(j, 63) - 0.5) * 3.2 + 0.3
    const vy = -(4.5 + 7.5 * hash(j, 64))
    const drag = 0.5
    const x = at[0] + (hash(j, 65) - 0.5) * 0.35 + vx * drag * (1 - Math.exp(-b / drag)) - 0.3 * b
    const y = at[1] + vy * drag * (1 - Math.exp(-b / drag)) + 1.2 * b * b
    const wx = vx * Math.exp(-b / drag) - 0.3 - vt
    const wy = vy * Math.exp(-b / drag) + 2.4 * b
    const u = b / life
    streak(p, k, x, y, wx * 0.05, wy * 0.05, Math.pow(1 - u, 1.3), 1 - u, 0.03 + 0.02 * hash(j, 66))
  }
  p.pop()
}

/** The lip's fire: on a chuff the fire inside flashes over the chimney's rim, a low flat tongue, gone at once. */
export function lipFlash(p: p5, k: number, t: number): void {
  let f = 0
  for (const c of CHUFFS) {
    const a = t - c.t
    if (a >= 0 && a < 0.2) f = Math.max(f, (c.big ? 1 : 0.55) * knock(a, 0.06))
  }
  const out = t - T_OUT
  if (out > -0.35 && out < 0.3) f = Math.max(f, out < 0 ? Math.pow((out + 0.35) / 0.35, 2) : knock(out, 0.1))
  if (f < 0.02) return
  const [x, y] = lip(t)
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(X(x), X(y), 0, X(x), X(y), X(0.55))
  g.addColorStop(0, `rgba(255, 194, 76, ${0.7 * f})`)
  g.addColorStop(1, 'rgba(255, 107, 44, 0)')
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(X(x), X(y - 0.05), X(0.5), X(0.2), 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** When the brakes go on: the pair of backbeats the train slides through before the buffer stops. */
export const BRAKE_BEATS = [beat(K_BRAKE), beat(K_BRAKE + 2)]

/* ------------------------------------------------------------------ into the fire */

/** The ashpan's mouth, in the engine's cells: where the fire draws its air in. */
const MOUTH_AT: Pt = [(MOUTH.u0 + MOUTH.u1) / 2, (MOUTH.v0 + MOUTH.v1) / 2]

/**
 * The draught: as the pin brings the spark round to the ashpan, the fire's pull shows. Grit and embers off the
 * ballast are drawn in at the mouth, faster and faster, streaks all pointing into it; after the spark has gone in, the
 * pull dies. In the engine's cells, so the whole thing runs with the train.
 */
export function draught(p: p5, k: number, t: number): void {
  const from = T_SUCK - 0.75
  if (t < from || t > T_IN + 0.3) return
  const pull = smoothstep(t, from, T_SUCK) * (1 - smoothstep(t, T_IN, T_IN + 0.3))
  if (pull < 0.02) return
  p.push()
  for (let j = 0; j < 40; j++) {
    const born = from + j * 0.024
    const life = 0.22 + 0.16 * hash(j, 81)
    const a = t - born
    if (a < 0 || a > life) continue
    const s = a / life
    // From a fan behind and under the mouth, in along a curve that tightens into it.
    const ang = Math.PI * (0.55 + 0.75 * hash(j, 82))
    const d0 = 0.45 + 0.8 * hash(j, 83)
    const d = d0 * Math.pow(1 - s, 2.2)
    const twist = 0.5 * (1 - s)
    const u = MOUTH_AT[0] + Math.cos(ang + twist) * d
    const v = MOUTH_AT[1] - Math.sin(ang + twist) * d * 0.8
    const d2 = d0 * Math.pow(1 - Math.max(0, s - 0.06), 2.2)
    const u2 = MOUTH_AT[0] + Math.cos(ang + 0.5 * (1 - Math.max(0, s - 0.06))) * d2
    const v2 = MOUTH_AT[1] - Math.sin(ang + 0.5 * (1 - Math.max(0, s - 0.06))) * d2 * 0.8
    const [x, y] = bodyPoint(t, u, v)
    const [x2, y2] = bodyPoint(t, u2, v2)
    streak(p, k, x, y, x - x2, y - y2, pull * Math.sin(Math.PI * s) * 0.9, 0.3 + 0.7 * s, 0.022)
  }
  p.pop()
}

const smoothstep = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/**
 * The fire fed: as the spark goes into it the firebox roars. Its light floods out of the open cab over the tender and
 * the ground, and the chimney coughs a fire-lit puff and a spray of sparks at once, as if the whole engine drew breath.
 */
export function firebox(p: p5, k: number, t: number): void {
  const a = t - T_IN
  if (a < 0 || a > 1.6) return
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = knock(a, 0.4)
  if (f > 0.02) {
    const [x, y] = bodyPoint(t, -6.1, 2.7)
    const r = 3.4
    const g = ctx.createRadialGradient(X(x), X(y), 0, X(x), X(y), X(r))
    g.addColorStop(0, `rgba(255, 194, 76, ${0.34 * f})`)
    g.addColorStop(0.4, `rgba(255, 107, 44, ${0.16 * f})`)
    g.addColorStop(1, 'rgba(255, 107, 44, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(x - r), X(y - r), X(2 * r), X(2 * r))
  }
  const at = lip(T_IN)
  const vt = speed(t)
  p.push()
  for (let i = 0; i < 3; i++) {
    const s = a - i * 0.06
    if (s <= 0 || s > 1.5) continue
    const x = at[0] + speed(T_IN) * 0.2 * (1 - Math.exp(-s / 0.2)) - 0.3 * s
    const y = at[1] - 1.4 * (1 - Math.exp(-s / 0.35)) - 0.2 * s - 0.12 * i
    const r = 0.2 + 0.75 * (1 - Math.exp(-s / 0.5))
    const warm = Math.exp(-s / 0.3)
    cloud(p, k, x, y, r, 0.75 * Math.pow(1 - s / 1.5, 1.4), mixHex(SMOKE, RAILWAY.coal, 0.6 * warm), mixHex(SMOKE_LIT, RAILWAY.coalHot, 0.5 * warm), 1400 + i)
  }
  for (let j = 0; j < 16; j++) {
    const born = T_IN + hash(j, 91) * 0.1
    const b = t - born
    const life = 0.45 + 0.4 * hash(j, 92)
    if (b < 0 || b > life) continue
    const vx = speed(T_IN) * 0.9 + (hash(j, 93) - 0.5) * 2
    const vy = -(4 + 5 * hash(j, 94))
    const x = at[0] + vx * 0.5 * (1 - Math.exp(-b / 0.5))
    const y = at[1] + vy * b + 3 * b * b
    streak(p, k, x, y, (vx * Math.exp(-b / 0.5) - vt) * 0.04, (vy + 6 * b) * 0.04, Math.pow(1 - b / life, 1.2), 1 - b / life, 0.026)
  }
  p.pop()
}

/**
 * The safety valves blow off: the spark rolls back into them and they lift with a shriek of white steam, up and
 * back, that tosses it over the side. `at` is when they lift.
 */
export function blowOff(p: p5, k: number, t: number, at: number): void {
  const a = t - at
  if (a < 0 || a > 1.3) return
  p.push()
  for (let i = 0; ; i++) {
    const born = at + i * 0.03
    if (born > Math.min(t, at + 0.35)) break
    const b = t - born
    if (b > 0.9) continue
    const from = bodyPoint(born, VALVES.u, VALVES.top + 0.06)
    const x = from[0] + speed(born) * 0.15 * (1 - Math.exp(-b / 0.15)) - 0.2 * b
    const y = from[1] - 4.5 * 0.18 * (1 - Math.exp(-b / 0.18)) - 0.25 * b
    const r = 0.05 + 0.4 * (1 - Math.exp(-b / 0.3))
    const strength = 1 - (born - at) / 0.45
    cloud(p, k, x, y, r, 0.75 * strength * Math.pow(1 - b / 0.9, 1.3), STEAM, STEAM, 1500 + i)
  }
  p.pop()
}

/**
 * The buffer stops take the engine at the festival: a kick of dust and grit off the baulk and the ballast either side
 * of the buffers, rolling out low and settling, and the cylinder cocks' last sigh of steam round the front wheels.
 */
export function impact(p: p5, k: number, t: number): void {
  const a = t - T_STOP
  if (a < 0 || a > 2.2) return
  const DUST = mixHex(RAILWAY.smoke, RAILWAY.crate, 0.35)
  const DUST_LIT = mixHex(DUST, RAILWAY.moon, 0.3)
  p.push()
  for (let i = 0; i < 7; i++) {
    const s = a - i * 0.02
    if (s <= 0) continue
    const side = i % 2 ? 1 : -1
    const reach = 0.5 + 0.9 * hash(i, 101)
    const x = BUFFER_STOP + side * reach * (1 - Math.exp(-s / 0.3)) + 0.1
    const y = RAIL_Y - 0.25 - 0.9 * hash(i, 102) * (1 - Math.exp(-s / 0.4)) - 0.08 * s
    const r = 0.1 + 0.45 * (1 - Math.exp(-s / 0.45)) * (0.7 + 0.5 * hash(i, 103))
    cloud(p, k, x, y, r, 0.6 * Math.pow(1 - s / 2.2, 1.6), DUST, DUST_LIT, 1600 + i)
  }
  for (let i = 0; i < 6; i++) {
    const s = a - 0.05 - i * 0.04
    if (s <= 0 || s > 1.6) continue
    const [ex, ey] = [engineX(T_STOP) + (i % 2 ? CYL.u1 + 0.1 : CYL.u0 - 0.1), RAIL_Y - CYL.v + CYL.r]
    const dir = i % 2 ? 1 : -1
    // A soft wide sigh, never a bright ball of steam by the wheels (the spark is the only round bright thing).
    const x = ex + dir * 1.4 * (1 - Math.exp(-s / 0.35))
    const y = ey + 0.2 * (1 - Math.exp(-s / 0.4)) - 0.25 * s
    const r = 0.2 + 0.85 * (1 - Math.exp(-s / 0.4))
    cloud(p, k, x, y, r, 0.2 * Math.pow(1 - s / 1.6, 1.4), mixHex(STEAM, RAILWAY.smoke, 0.35), STEAM, 1700 + i)
  }
  p.pop()
}
