import { mixHex } from '../../../../../parts'
import { hash } from '../kit'
import { ONSETS } from '../music'
import { PLANE, onPlane, type Frame } from './far'
import { ERUPT, HUSH, T1 } from './geo'
import { CRATER, CRATER_SX, rgbaHex } from './ranges'
import { HZ } from './sky'
import { ICE } from './theme'

/**
 * The volcano. It smokes from the first frame, a thin plume leaning on the wind. On the band's last hit (119.845) it
 * bursts: a flash of amber off the crater that lights the whole land (`front.ts` grades it), a ring of shock going out
 * through the air, black stones thrown glowing on their arcs, the column shooting up with its underside lit orange from
 * the fire under it, and lightning forking in the ash: hard and often at first, then through the hush only now and
 * then and fainter, on the guitar's soft onsets. Under it all a fountain of gold sparks keeps playing at the crater.
 * Nothing here is red: the fire is amber, orange and gold.
 */

const sm = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ the plume */

export interface Puff {
  at: [number, number]
  r: number
  /** Which of the plume's three greys. */
  tone: number
  /** How far down the column it is (1 at the crater), for the fire's light on its underside. */
  low: number
}

/** How far the plume has climbed (frame heights over the crater) at `t`. */
export function plumeTop(t: number): number {
  if (t < ERUPT) return 0.045 + 0.09 * sm(t, 101, ERUPT)
  const u = t - ERUPT
  return 0.135 + 0.3 * (1 - Math.exp(-u / 2.6)) + 0.011 * u
}

/** The plume as a column of puffs, in the far plane's measure, churning upward. */
export function plume(t: number): Puff[] {
  const out: Puff[] = []
  const top = plumeTop(t)
  const erupted = t >= ERUPT
  const since = t - ERUPT
  const crater = CRATER
  const N = erupted ? 26 : 16
  // The wind leans it to the right, more the higher it goes.
  const lean = (u: number) => 0.06 * u * u * top * 4
  const flow = erupted ? 0.35 : 0.18
  for (let i = 0; i < N; i++) {
    const u = (((i + t * flow * N * 0.12) % N) + N) % N / N
    const h = top * u
    const jitter = 0.006 * Math.sin(i * 2.7 + t * 0.9)
    const width = erupted ? 0.016 + 0.07 * u * Math.min(1, 0.3 + since / 3) : 0.006 + 0.018 * u
    // Each puff swells out of the crater and thins away at the top.
    const fade = (1 - sm(u, 0.82, 1)) * sm(u, 0, 0.06)
    out.push({ at: [crater[0] + lean(u) + jitter + (hash(i, 7) - 0.5) * width * 0.8, crater[1] - h], r: width * (0.3 + 0.7 * fade), tone: Math.floor(hash(i, 3) * 2.999), low: 1 - u })
  }
  if (erupted) {
    // The umbrella: the top spreads out along the wind and keeps spreading.
    const spread = 0.05 + 0.05 * since
    for (let i = 0; i < 12; i++) {
      const f = i / 11
      const x = crater[0] + lean(1) + (f - 0.35) * spread * 2
      const y = crater[1] - top + 0.02 * Math.sin(i * 1.9 + t * 0.4) + 0.012 * f
      const grow = sm(since, 0.6 + f * 1.5, 2 + f * 2)
      if (grow > 0.02) out.push({ at: [x, y], r: (0.024 + 0.016 * Math.sin(i * 1.3) ** 2 + 0.0025 * Math.min(since, 10)) * grow, tone: 1 + (i % 2), low: 0 })
    }
  }
  return out
}

/** Where the plume swallows things, at `t` (far plane): a point a third of the way up its column. */
export function plumeMid(t: number): [number, number] {
  const top = plumeTop(t)
  return [CRATER_SX + 0.06 * (0.55 * 0.55) * top * 4, CRATER[1] - top * 0.55]
}

/* ------------------------------------------------------------------ lightning */

/** The strikes: two on the burst, then on the guitar's onsets, often while the column is young and seldom after. */
export const BOLTS: readonly number[] = (() => {
  const out = [ERUPT + 0.1, ERUPT + 0.42]
  let last = out[1]
  for (const o of ONSETS) {
    if (o.t < ERUPT + 0.8 || o.t > T1 - 0.8 || o.s < 0.3) continue
    if (o.t - last >= (o.t < HUSH + 3 ? 0.55 : 1.45)) {
      out.push(o.t)
      last = o.t
    }
  }
  return out
})()

/** A bolt's light over its life: a stroke, a flicker off, a return stroke, gone. */
export function boltLight(age: number): number {
  if (age < 0 || age > 0.4) return 0
  if (age < 0.04) return 1
  if (age < 0.08) return 0.2
  if (age < 0.12) return 0.85
  return Math.exp(-(age - 0.12) / 0.05)
}
/** How bright the bolts are at `t`, all together (for the land's flicker). */
export function lightning(t: number): number {
  let v = 0
  for (const b of BOLTS) v = Math.max(v, boltLight(t - b) * boltStrength(b))
  return v
}
const boltStrength = (at: number): number => (at < HUSH + 3 ? 1 : 0.5)

/** A bolt's path in the column: down and sideways in jags from high in the ash, with a fork or two. */
function boltPath(n: number, t: number): Path2D {
  const top = plumeTop(t)
  const path = new Path2D()
  const lean = (u: number) => 0.06 * u * u * top * 4
  const u0 = 0.5 + 0.4 * hash(n, 1, 501)
  let x = CRATER[0] + lean(u0) + (hash(n, 2, 501) - 0.5) * 0.04
  let y = CRATER[1] - top * u0
  path.moveTo(x, y)
  const steps = 7
  const drop = top * (0.2 + 0.2 * hash(n, 3, 501)) / steps
  const forks: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    x += (hash(n, 10 + i, 501) - 0.5) * 0.022
    y += drop * (0.6 + 0.8 * hash(n, 20 + i, 501))
    path.lineTo(x, y)
    if (i === 2 || (i === 4 && hash(n, 4, 501) > 0.5)) forks.push([x, y])
  }
  forks.forEach(([fx, fy], j) => {
    path.moveTo(fx, fy)
    const side = hash(n, 30 + j, 501) > 0.5 ? 1 : -1
    let bx = fx
    let by = fy
    for (let i = 0; i < 3; i++) {
      bx += side * (0.006 + 0.01 * hash(n, 40 + i + j * 3, 501))
      by += drop * 0.7
      path.lineTo(bx, by)
    }
  })
  return path
}

/* ------------------------------------------------------------------ drawing */

/**
 * The volcano's part of the far plane: the glow and the burst, the ring, the stones, the plume, the lightning, the
 * fountain. Drawn over the far range, before the nearer planes.
 */
export function drawEruption(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number): void {
  const u = t - ERUPT
  onPlane(ctx, f, k, PLANE.far, (px) => {
    const [cx, cy] = CRATER
    if (u >= -0.02) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      // The burst's flash, and the fire's steady light in the crater after it.
      const flash = Math.exp(-Math.max(0, u) / 0.5)
      if (flash > 0.005) {
        const r = 0.2 * (1 + Math.max(0, u) * 0.5)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, rgbaHex(ICE.fire, 0.9 * flash))
        g.addColorStop(0.3, rgbaHex(ICE.fireDeep, 0.35 * flash))
        g.addColorStop(1, rgbaHex(ICE.fireDeep, 0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      const ember = 0.4 * sm(u, 0, 0.3) * (0.82 + 0.18 * Math.sin(t * 7.3) * Math.sin(t * 3.1))
      const e = ctx.createRadialGradient(cx, cy - 0.004, 0, cx, cy - 0.004, 0.03)
      e.addColorStop(0, rgbaHex(ICE.fire, ember))
      e.addColorStop(1, rgbaHex(ICE.fireDeep, 0))
      ctx.fillStyle = e
      ctx.fillRect(cx - 0.03, cy - 0.034, 0.06, 0.06)
      ctx.restore()

      // The shock: a ring going out through the air from the crater, and a fainter one after it.
      for (const [delay, a0] of [[0, 0.45], [0.14, 0.22]] as const) {
        const v = u - delay
        if (v < 0 || v > 1.8) continue
        const rr = 0.02 + 0.34 * (1 - Math.exp(-v / 0.45))
        const fade = 1 - sm(v, 0.1, 1.8)
        ctx.beginPath()
        ctx.ellipse(cx, cy - 0.02, rr, rr * 0.42, 0, 0, Math.PI * 2)
        // The ring is a band of compressed air: a soft wide edge and a bright thin one.
        ctx.strokeStyle = rgbaHex(ICE.shock, a0 * 0.35 * fade)
        ctx.lineWidth = (6 + 14 * Math.min(1, v)) * px
        ctx.stroke()
        ctx.strokeStyle = rgbaHex(ICE.shock, a0 * fade)
        ctx.lineWidth = (1.5 + 2 * Math.min(1, v)) * px
        ctx.stroke()
      }

      // The stones: thrown out glowing, arcing over and falling back on the cone.
      if (u < 2.8) {
        const trails = new Path2D()
        const stones = new Path2D()
        const hearts = new Path2D()
        for (let i = 0; i < 18; i++) {
          const a = -Math.PI / 2 + (hash(i, 21) - 0.5) * 1.9
          const sp = 0.1 + 0.08 * hash(i, 22)
          const at = (w: number): [number, number] => [cx + Math.cos(a) * sp * w, cy + Math.sin(a) * sp * w + 0.05 * w * w]
          const [x, y] = at(Math.max(0, u))
          if (y > cy + 0.012 || u < 0) continue
          const [bx, by] = at(Math.max(0, u - 0.09))
          trails.moveTo(bx, by)
          trails.lineTo(x, y)
          stones.moveTo(x + 0.0035, y)
          stones.arc(x, y, 0.0035, 0, Math.PI * 2)
          hearts.moveTo(x + 0.0018, y)
          hearts.arc(x, y, 0.0018, 0, Math.PI * 2)
        }
        ctx.lineCap = 'round'
        ctx.strokeStyle = rgbaHex(ICE.fireGold, 0.8 * (1 - sm(u, 1.2, 2.8)))
        ctx.lineWidth = 2 * px
        ctx.stroke(trails)
        ctx.fillStyle = ICE.basalt
        ctx.fill(stones)
        // Each still glowing at its heart as it flies.
        ctx.fillStyle = rgbaHex(ICE.fire, 0.95 * (1 - sm(u, 1.5, 2.8)))
        ctx.fill(hearts)
      }

      // Lava coming over the crater's lip and down the cone in runnels, slowly, through the hush: amber in the snow,
      // and steam where it meets it.
      const run = sm(u, 0.3, 9)
      if (run > 0.001) {
        const lava = new Path2D()
        const steam = new Path2D()
        for (let r = 0; r < 4; r++) {
          // Down the cone's face toward us, each runnel finding its own way through the snow.
          const side = r % 2 ? 1 : -1
          const x0 = cx + (r - 1.5) * 0.011
          const len = (0.03 + 0.035 * hash(r, 41)) * run
          lava.moveTo(x0, cy + 0.002)
          let x = x0
          let y = cy + 0.002
          for (let i = 1; i <= 8; i++) {
            const f = i / 8
            x = x0 + side * 0.012 * f + 0.003 * Math.sin(f * 6 + r * 2)
            y = cy + 0.002 + len * f
            lava.lineTo(x, y)
          }
          const puff = 0.005 + 0.002 * Math.sin(t * 2.3 + r)
          steam.moveTo(x + puff, y - 0.004)
          steam.ellipse(x, y - 0.004, puff, puff * 0.8, 0, 0, Math.PI * 2)
        }
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = rgbaHex(ICE.fireDeep, 0.45)
        ctx.lineWidth = 5 * px
        ctx.stroke(lava)
        ctx.strokeStyle = rgbaHex(ICE.fireGold, 0.9 * (0.85 + 0.15 * Math.sin(t * 5.1)))
        ctx.lineWidth = 1.8 * px
        ctx.stroke(lava)
        ctx.fillStyle = rgbaHex(ICE.steam, 0.55)
        ctx.fill(steam)
      }
    }

    // Ash falling out of the spreading umbrella in curtains, leaning on the wind, down to the far ranges.
    const curtains = sm(t, ERUPT + 2.5, ERUPT + 8)
    if (curtains > 0.01) {
      const top = plumeTop(t)
      const spread = 0.05 + 0.05 * (t - ERUPT)
      const mid = cx + 0.06 * top * 4
      const y0 = cy - top + 0.035
      const fall = new Path2D()
      for (let i = 0; i < 20; i++) {
        const f = hash(i, 1, 511)
        const x = mid + (f - 0.35) * spread * 2
        const sway = 0.006 * Math.sin(t * (0.3 + 0.3 * hash(i, 2, 511)) + i)
        const len = (HZ - 0.005 - y0) * (0.5 + 0.5 * hash(i, 3, 511))
        fall.moveTo(x, y0 + 0.01 * hash(i, 4, 511))
        fall.quadraticCurveTo(x + 0.01 + sway, y0 + len * 0.5, x + 0.03 + sway * 2, y0 + len)
      }
      ctx.lineCap = 'round'
      ctx.strokeStyle = rgbaHex(ICE.plumeLight, 0.1 * curtains)
      ctx.lineWidth = 14 * px
      ctx.stroke(fall)
      ctx.strokeStyle = rgbaHex(ICE.plume, 0.08 * curtains)
      ctx.lineWidth = 4 * px
      ctx.stroke(fall)
    }

    // The plume, in its three greys (steam's before the burst); after it, its underside takes the fire's light.
    const puffs = plume(t)
    const tones = [new Path2D(), new Path2D(), new Path2D()]
    for (const p of puffs) {
      tones[p.tone].moveTo(p.at[0] + p.r, p.at[1])
      tones[p.tone].ellipse(p.at[0], p.at[1], p.r, p.r * 0.9, 0, 0, Math.PI * 2)
    }
    const erupted = u >= 0
    ctx.globalAlpha = erupted ? 0.9 : 0.6
    tones.forEach((path, i) => {
      ctx.fillStyle = erupted ? mixHex(ICE.plume, ICE.plumeLight, 0.15 + 0.3 * i) : mixHex(ICE.steam, ICE.plumeLight, 0.12 * i)
      ctx.fill(path)
    })
    ctx.globalAlpha = 1
    if (u > 0) {
      const fire = (0.55 * Math.exp(-u / 1.6) + 0.3) * (1 - 0.45 * sm(t, HUSH + 4, T1))
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const under = new Path2D()
      for (const p of puffs) {
        if (p.low < 0.55) continue
        under.moveTo(p.at[0] + p.r * 0.8, p.at[1] + p.r * 0.25)
        under.ellipse(p.at[0], p.at[1] + p.r * 0.25, p.r * 0.8, p.r * 0.6, 0, 0, Math.PI * 2)
      }
      ctx.fillStyle = rgbaHex(ICE.fireDeep, 0.32 * fire)
      ctx.fill(under)
      const top = plumeTop(t)
      const gr = Math.min(0.12, top * 0.3)
      const g = ctx.createRadialGradient(cx, cy - gr * 0.3, 0, cx, cy - gr * 0.3, gr)
      g.addColorStop(0, rgbaHex(ICE.fire, 0.4 * fire))
      g.addColorStop(1, rgbaHex(ICE.fire, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy - gr * 0.3, gr, 0, Math.PI * 2)
      ctx.fill()

      // The fountain: gold sparks thrown up out of the crater and falling back, on and on.
      const fount = (0.45 + 0.55 * Math.exp(-u / 3)) * (1 - 0.5 * sm(t, HUSH + 4, T1))
      const sparks = new Path2D()
      for (let i = 0; i < 28; i++) {
        const period = 0.8 + 0.7 * hash(i, 31)
        const age = (t + hash(i, 32) * period) % period
        const a = -Math.PI / 2 + (hash(i, 33) - 0.5) * 0.9
        const sp = 0.035 + 0.03 * hash(i, 34)
        const x = cx + Math.cos(a) * sp * age
        const y = cy - 0.002 + Math.sin(a) * sp * age + 0.06 * age * age
        if (y > cy + 0.004) continue
        sparks.moveTo(x, y)
        sparks.lineTo(x - Math.cos(a) * 0.004, y - (Math.sin(a) * sp + 0.12 * age) * 0.08)
      }
      ctx.strokeStyle = rgbaHex(ICE.fireGold, 0.9 * fount)
      ctx.lineWidth = 1.2 * px
      ctx.lineCap = 'round'
      ctx.stroke(sparks)
      ctx.restore()
    }

    // The lightning, in the ash.
    for (let n = 0; n < BOLTS.length; n++) {
      const age = t - BOLTS[n]
      const light = boltLight(age) * boltStrength(BOLTS[n])
      if (light <= 0.01) continue
      const path = boltPath(n, BOLTS[n])
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const top = plumeTop(t)
      const my = CRATER[1] - top * 0.5
      const mx = CRATER[0] + 0.06 * 0.25 * top * 4
      const gr = Math.min(0.14, top * 0.32)
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, gr)
      g.addColorStop(0, rgbaHex(ICE.bolt, 0.3 * light))
      g.addColorStop(1, rgbaHex(ICE.bolt, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(mx, my, gr, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = rgbaHex(ICE.bolt, 0.45 * light)
      ctx.lineWidth = 5 * px
      ctx.stroke(path)
      ctx.strokeStyle = rgbaHex(ICE.boltCore, 0.95 * light)
      ctx.lineWidth = 1.5 * px
      ctx.stroke(path)
    }
  })
}
