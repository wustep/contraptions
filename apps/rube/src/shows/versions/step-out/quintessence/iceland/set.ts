import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { ERUPT, FINAL, HUSH, PINS, RIGHT_X, RY, SHORE_Y, ridgeY, roadLine } from './geo'
import { ctxOf, disc, glow, rgba, shape, sm, stroke, type Pen } from './pen'
import { ICE } from './theme'

/**
 * Iceland's standing set, handed show time: the sky, the far ranges with the volcano and its plume, the fjord and the
 * mountains across it (all far off, drawn in the frame's own measure so they hold still as the camera moves, but for
 * a little parallax), and near to: the mountain the road is cut into, moss on black rock, the road and the shore.
 */

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/** Where the camera rests at the end: what the far layers are drawn true from. */
const CX0 = FINAL[0] + 0.4
const CY0 = FINAL[1] - 0.4

/**
 * A point far off, given in frame heights from the frame's centre (`sx` right, `sy` down) as seen from the camera's
 * resting place, moved by a little parallax (`px`, `py`, frame heights a cell) as the camera goes elsewhere.
 */
export const farFn = (f: Frame, px: number, py: number) => {
  const H = f.y1 - f.y0
  return (sx: number, sy: number): Pt => [f.cx + (sx - px * (f.cx - CX0)) * H, f.cy + (sy - py * (f.cy - CY0)) * H]
}
export const FAR_P: [number, number] = [0.012, 0.003]
const MID_P: [number, number] = [0.02, 0.012]

/** The far horizon, frame heights below the centre (from the resting camera). */
export const HZ = 0.035
/** The volcano: where it stands across the frame, and its crater. */
export const VX = 0.5
const range = (sx: number): number =>
  0.03 + 0.018 * Math.sin(sx * 6.1 + 0.7) + 0.011 * Math.sin(sx * 14.3 + 2.1) + 0.006 * Math.sin(sx * 31 + 0.3) + 0.012 * Math.sin(sx * 2.3 + 4)
const volcanoH = (sx: number): number => {
  const d = (sx - VX) / 0.21
  return 0.105 * Math.exp(-d * d * d * d) + 0.012 * Math.exp(-(((sx - VX - 0.02) / 0.05) ** 2))
}
export const farHeight = (sx: number): number => Math.max(range(sx), volcanoH(sx) + 0.012)
export const CRATER_SX = VX + 0.02

/* ------------------------------------------------------------------ the plume */

export interface Puff {
  at: [number, number]
  r: number
  c: string
  a: number
}

/** How far the plume has climbed (frame heights over the crater) at `t`. */
export function plumeTop(t: number): number {
  if (t < ERUPT) return 0.025 + 0.11 * sm(t, 101, ERUPT)
  const u = t - ERUPT
  return 0.135 + 0.3 * (1 - Math.exp(-u / 2.6)) + 0.011 * u
}

/** The plume as a column of puffs, in far coordinates (frame heights), churning upward. */
export function plume(t: number): Puff[] {
  const out: Puff[] = []
  if (t < 99) return out
  const top = plumeTop(t)
  const erupted = t >= ERUPT
  const since = t - ERUPT
  const crater: [number, number] = [CRATER_SX, HZ - volcanoH(CRATER_SX)]
  const N = erupted ? 34 : 16
  // The wind leans it to the right, more the higher it goes.
  const lean = (u: number) => 0.06 * u * u * top * 4
  const flow = erupted ? 0.35 : 0.18
  for (let i = 0; i < N; i++) {
    const u = (((i + t * flow * N * 0.12) % N) + N) % N / N
    const h = top * u
    const jitter = 0.006 * Math.sin(i * 2.7 + t * 0.9)
    const width = erupted ? 0.016 + 0.07 * u * Math.min(1, 0.3 + since / 3) : 0.006 + 0.016 * u
    const fadeTop = 1 - sm(u, 0.85, 1)
    const fadeBot = sm(u, 0, 0.06)
    const c = erupted ? mixHex(ICE.plume, ICE.plumeLight, 0.25 + 0.5 * hash(i, 3)) : mixHex(ICE.steam, ICE.plumeLight, 0.3 * hash(i, 5))
    out.push({ at: [crater[0] + lean(u) + jitter + (hash(i, 7) - 0.5) * width * 0.8, crater[1] - h], r: width, c, a: (erupted ? 0.82 : 0.6) * fadeTop * fadeBot })
  }
  if (erupted) {
    // The umbrella: the top spreads out along the wind and keeps spreading.
    const spread = 0.05 + 0.05 * since
    for (let i = 0; i < 12; i++) {
      const f = i / 11
      const x = crater[0] + lean(1) + (f - 0.35) * spread * 2
      const y = crater[1] - top + 0.02 * Math.sin(i * 1.9 + t * 0.4) + 0.012 * f
      out.push({ at: [x, y], r: 0.026 + 0.018 * Math.sin(i * 1.3) ** 2 + 0.004 * since, c: mixHex(ICE.plume, ICE.plumeLight, 0.4 + 0.3 * hash(i, 9)), a: 0.7 * sm(since, 0.6 + f * 1.5, 2 + f * 2) })
    }
  }
  return out
}

/** Where the plume swallows things, at `t` (far coordinates): a point a third of the way up its column. */
export function plumeMid(t: number): [number, number] {
  const top = plumeTop(t)
  return [CRATER_SX + 0.06 * (0.55 * 0.55) * top * 4, HZ - volcanoH(CRATER_SX) - top * 0.55]
}

/* ------------------------------------------------------------------ the hill */

/** The mountain the road is cut into: its outline, from the ridge round the cliff to the shore. */
const HILL: Pt[] = (() => {
  const out: Pt[] = []
  const edge = RIGHT_X + 0.5
  for (let x = -60; x <= edge; x += 0.25) out.push([x, ridgeY(x) - 0.3])
  const top = ridgeY(edge) - 0.3
  // Down the cliff below the right-hand hairpins: ragged basalt, stepping out.
  const steps: Pt[] = [
    [edge + 0.12, top + 0.25],
    [edge + 0.05, top + 0.8],
    [edge + 0.3, PINS[0].cy + RY + 0.2],
    [edge + 0.18, PINS[0].cy + RY + 0.9],
    [edge + 0.42, PINS[2].cy - 0.3],
    [edge + 0.3, PINS[2].cy + 0.5],
    [edge + 0.55, PINS[2].cy + RY + 0.3],
    [edge + 0.75, SHORE_Y - 0.6],
    [edge + 1.3, SHORE_Y - 0.36],
  ]
  out.push(...steps)
  out.push([70, SHORE_Y - 0.33], [70, SHORE_Y + 0.26])
  for (let x = 70; x >= -60; x -= 0.5) out.push([x, SHORE_Y + 0.26 + 0.05 * Math.sin(x * 1.7) + 0.03 * Math.sin(x * 4.1)])
  return out
})()
const ROAD: Pt[] = roadLine()

function hillPath(ctx: CanvasRenderingContext2D, k: number): void {
  ctx.beginPath()
  HILL.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
}

/* ------------------------------------------------------------------ drawing */

/** How much the ash has darkened the light: from the eruption, slowly, to the cut. */
const ashLight = (t: number): number => 0.55 * sm(t, ERUPT + 1, 133.3)

export function drawSet(pen: Pen, t: number, f: Frame): void {
  const { p, k } = pen
  const ctx = ctxOf(p)
  const H = f.y1 - f.y0
  const far = farFn(f, FAR_P[0], FAR_P[1])
  const mid = farFn(f, MID_P[0], MID_P[1])
  const dim = ashLight(t)

  // The sky: pale, a little brighter at the horizon; going the colour of ash after the eruption.
  const hz = far(0, HZ)[1]
  const sky = ctx.createLinearGradient(0, f.y0 * k, 0, hz * k)
  sky.addColorStop(0, mixHex(ICE.skyTop, ICE.skyAsh, dim))
  sky.addColorStop(1, mixHex(ICE.skyLow, ICE.skyAsh, dim * 0.6))
  ctx.save()
  ctx.fillStyle = sky
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()

  // A few long, thin clouds.
  for (let i = 0; i < 7; i++) {
    const c = far(-1.2 + 2.6 * hash(i, 11), -0.12 - 0.3 * hash(i, 12))
    const w = (0.25 + 0.35 * hash(i, 13)) * H
    disc(pen, c, w, 0.012 * H * (1 + hash(i, 14)), rgba(i % 3 ? '#F4F5F2' : '#B9C1C4', (i % 3 ? 0.4 : 0.25) * (1 - dim)))
  }

  // The volcano, beyond the ranges: a broad dome under its ice cap.
  const farCol = mixHex(ICE.far, ICE.skyAsh, dim * 0.5)
  const dome: Pt[] = []
  for (let sx = VX - 0.36; sx <= VX + 0.36; sx += 0.008) dome.push(far(sx, HZ - volcanoH(sx)))
  const domeBase: Pt[] = [far(VX + 0.36, HZ + 0.05), far(VX - 0.36, HZ + 0.05)]
  shape(pen, [...dome, ...domeBase], mixHex(ICE.volcano, ICE.skyAsh, dim * 0.4))
  ctx.save()
  ctx.beginPath()
  ;[...dome, ...domeBase].forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  const capLine: Pt[] = []
  for (let sx = VX - 0.36; sx <= VX + 0.36; sx += 0.006) capLine.push(far(sx, HZ - 0.064 - 0.005 * Math.sin(sx * 97) - 0.004 * Math.sin(sx * 41)))
  shape(pen, [far(VX - 0.4, HZ - 0.3), far(VX + 0.4, HZ - 0.3), ...capLine.reverse()], mixHex(ICE.ice, ICE.skyAsh, dim * 0.45))
  // Its glacier's tongues, down the gullies.
  for (let i = 0; i < 9; i++) {
    const sx = VX - 0.17 + 0.34 * (i / 8) + 0.01 * Math.sin(i * 3)
    const y0 = HZ - 0.066
    shape(pen, [far(sx - 0.007, y0), far(sx + 0.007, y0), far(sx + 0.002, y0 + 0.012 + 0.012 * hash(i, 71))], mixHex(ICE.ice, ICE.skyAsh, dim * 0.45))
  }
  ctx.restore()
  stroke(pen, dome, rgba(ICE.farDeep, 0.55), 0, 0.7)

  // The far ranges in front of it, snow in their high gullies.
  const ridge: Pt[] = []
  for (let sx = -1.8; sx <= 1.8; sx += 0.01) ridge.push(far(sx, HZ - range(sx)))
  const base: Pt[] = [far(1.8, HZ + 0.05), far(-1.8, HZ + 0.05)]
  shape(pen, [...ridge, ...base], farCol)
  ctx.save()
  ctx.beginPath()
  ;[...ridge, ...base].forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  const snowLine: Pt[] = []
  for (let sx = -1.8; sx <= 1.8; sx += 0.01) snowLine.push(far(sx, HZ - 0.042 - 0.009 * Math.sin(sx * 47) - 0.006 * Math.sin(sx * 113)))
  shape(pen, [far(-1.8, HZ - 0.4), far(1.8, HZ - 0.4), ...snowLine.reverse()], mixHex(ICE.snow, ICE.skyAsh, dim * 0.5))
  ctx.restore()

  // The plume, and the burst.
  const crater = far(CRATER_SX, HZ - volcanoH(CRATER_SX))
  if (t >= ERUPT - 0.02) {
    const u = t - ERUPT
    glow(pen, crater, 0.16 * H * (1 + u * 0.4), ICE.fire, 0.75 * Math.exp(-u / 0.45))
    glow(pen, crater, 0.035 * H, ICE.fire, 0.28 * sm(u, 0, 0.3) * (0.8 + 0.2 * Math.sin(t * 7)))
    // The bombs: a few black stones thrown out, falling back.
    if (u < 2.2)
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (hash(i, 21) - 0.5) * 1.7
        const v = 0.09 + 0.06 * hash(i, 22)
        const x = Math.cos(a) * v * u
        const y = Math.sin(a) * v * u + 0.045 * u * u
        if (y > 0.01) continue
        const q = far(CRATER_SX + x, HZ - volcanoH(CRATER_SX) + y)
        disc(pen, q, 0.0035 * H, 0.0035 * H, rgba(ICE.basalt, 0.85))
      }
  }
  for (const puff of plume(t)) {
    const c = far(puff.at[0], puff.at[1])
    disc(pen, c, puff.r * H, puff.r * H * 0.9, rgba(puff.c, puff.a))
  }

  // The fjord, from the far shore to the frame's foot.
  const water = ctx.createLinearGradient(0, hz * k, 0, f.y1 * k)
  water.addColorStop(0, mixHex(ICE.waterFar, ICE.skyAsh, dim * 0.5))
  water.addColorStop(1, mixHex(ICE.waterNear, ICE.basalt, dim * 0.3))
  ctx.save()
  ctx.fillStyle = water
  ctx.fillRect((f.x0 - 1) * k, hz * k, (f.x1 - f.x0 + 2) * k, (f.y1 - hz + 1) * k)
  ctx.restore()
  // Its light: long thin streaks.
  for (let i = 0; i < 16; i++) {
    const sy = HZ + 0.012 + 0.2 * hash(i, 31) ** 1.6
    const sx = (hash(i, 32) - 0.5) * 3
    const len = 0.03 + 0.08 * hash(i, 33)
    const a = far(sx, sy)
    const b = far(sx + len, sy)
    stroke(pen, [a, b], rgba(ICE.waterGlint, 0.35 * (1 - dim)), 0, 0.5 + hash(i, 34))
  }

  // The mountains across the fjord: dark, snow in their gullies, a harbour at their foot far to the left.
  const MB = HZ + 0.05
  const midH = (sx: number): number => {
    const hump = 0.085 + 0.035 * Math.sin(sx * 3.3 + 1.2) + 0.022 * Math.sin(sx * 8.1 + 0.4) + 0.01 * Math.sin(sx * 19 + 2)
    // Low on the right, where the volcano is seen over them.
    return hump * (1 - sm(sx, -0.05, 0.3))
  }
  const mids: Pt[] = []
  for (let sx = -2.6; sx <= 2.2; sx += 0.012) mids.push(mid(sx, MB - midH(sx)))
  const midCol = mixHex(ICE.mid, ICE.skyAsh, dim * 0.4)
  shape(pen, [...mids, mid(2.2, MB), mid(-2.6, MB)], midCol)
  // Snow lying in their gullies: faint streaks down from the tops.
  for (let i = 0; i < 34; i++) {
    const sx = -2.5 + 2.8 * hash(i, 41)
    const top = MB - midH(sx)
    if (MB - top < 0.05) continue
    const y0 = top + 0.006 + 0.01 * hash(i, 46)
    const len = (MB - top) * (0.2 + 0.35 * hash(i, 42))
    const lean = 0.012 * (hash(i, 44) - 0.5)
    stroke(pen, [mid(sx, y0), mid(sx + lean * 0.5, y0 + len * 0.5), mid(sx + lean, y0 + len)], rgba(ICE.midSnow, 0.28 * (1 - dim * 0.5)), 0, 0.8 + 1.2 * hash(i, 43))
  }
  // The harbour: a few white houses and a pier at the water.
  for (let i = 0; i < 9; i++) {
    const sx = -0.95 + 0.012 * i + 0.006 * hash(i, 51)
    const a = mid(sx, MB + 0.002 - 0.006 * hash(i, 52))
    const s = 0.004 * H
    shape(pen, [[a[0] - s, a[1]], [a[0] + s, a[1]], [a[0] + s, a[1] - s * 1.2], [a[0], a[1] - s * 1.9], [a[0] - s, a[1] - s * 1.2]], rgba(ICE.house, 0.85))
  }
  stroke(pen, [mid(-0.83, MB + 0.006), mid(-0.79, MB + 0.006)], rgba(ICE.house, 0.6), 0, 0.8)

  // Near: the mountain the road is cut into, moss over black rock.
  ctx.save()
  hillPath(ctx, k)
  ctx.fillStyle = ICE.moss
  ctx.fill()
  ctx.clip()
  drawMoss(pen, f)
  ctx.restore()

  // The road: gravel shoulders, the asphalt, a pale line at its near edge.
  const lift = (dy: number) => ROAD.filter(([x]) => x > f.x0 - 3 && x < f.x1 + 3).map(([x, y]): Pt => [x, y + dy])
  stroke(pen, lift(-0.12), ICE.gravel, 0.48)
  stroke(pen, lift(-0.12), ICE.asphalt, 0.37)
  stroke(pen, lift(0.035), rgba(ICE.roadLine, 0.55), 0.022)
  stroke(pen, lift(-0.27), rgba(ICE.roadLine, 0.25), 0.014)

  // The shore: a lip of black stones at the water.
  stroke(pen, HILL.filter(([x, y]) => y > SHORE_Y + 0.1 && x > f.x0 - 2 && x < f.x1 + 2), rgba(ICE.basalt, 0.8), 0.06)

  // The ash, settling on everything.
  const settle = sm(t, HUSH + 2, 133.3)
  if (settle > 0) {
    ctx.save()
    hillPath(ctx, k)
    ctx.fillStyle = rgba(ICE.ash, 0.5 * settle)
    ctx.fill()
    ctx.restore()
  }
}

/** The moss: soft blobs of green over the basalt, darker hollows, black rock breaking through, pale lichen. */
function drawMoss(pen: Pen, f: Frame): void {
  const s = 0.34
  // In a wide frame there are a great many; keep the grain about the same on the screen.
  const step = Math.max(1, Math.round((f.y1 - f.y0) / 5))
  const i0 = Math.floor((f.x0 - 1) / s / step) * step
  const i1 = Math.ceil((f.x1 + 1) / s)
  const j0 = Math.floor((f.y0 - 1) / s / step) * step
  const j1 = Math.ceil((f.y1 + 1) / s)
  for (let i = i0; i <= i1; i += step)
    for (let j = j0; j <= j1; j += step) {
      const h = hash(i, j, 3)
      const x = (i + hash(i, j, 4) * step) * s
      const y = (j + hash(i, j, 5) * step) * s
      const r = s * step * (0.4 + 0.35 * hash(i, j, 6))
      if (h < 0.07) shape(pen, rock([x, y], r * 0.55, i * 31 + j), ICE.basaltLight)
      else if (h < 0.4) disc(pen, [x, y], r, r * 0.55, rgba(ICE.mossDark, 0.38))
      else if (h < 0.66) disc(pen, [x, y], r * 0.85, r * 0.5, rgba(ICE.mossLight, 0.3))
      else if (h < 0.74) disc(pen, [x, y], r * 0.18, r * 0.13, rgba(ICE.lichen, 0.6))
    }
}

/** A lump of basalt: a squat irregular polygon. */
function rock(c: Pt, r: number, seed: number): Pt[] {
  const out: Pt[] = []
  const n = 7
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (0.65 + 0.35 * hash(seed, i, 9))
    out.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.6])
  }
  return out
}

