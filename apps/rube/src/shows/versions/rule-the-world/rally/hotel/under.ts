import type { Pt } from '../../../../../parts'
import type { Frame } from '../depth'
import { hash } from '../kit'
import { G_LOW } from '../physics'
import { ctxOf, ellipse, mix, rgba, type Pen } from '../pen'
import { F_STREET, WALL_R } from './geo'

/**
 * Under the street, cut open: the IRT, which runs a few feet under Broadway. Between the hotel's footing and the
 * pavement's slab there is only earth, two mains and the tunnel's roof; under the roof, as he comes down the last
 * ladder and bounces to rest at the lamp's foot, a local goes by under him, right to left, its lit windows sliding
 * under the pavement with the riders' hats in them. The tunnel's own drips come off its roof; the pavement's glass
 * vault lights take the windows' light as they pass under them; the puddle by the ladder shivers with the rumble.
 * Only the train's top is ever in the frame: the roof, the vents, the top of the windows.
 */

const Y = F_STREET
/** The tunnel: its roof slab under the earth, its ceiling, and where it begins (the hotel's footing is left of it). */
const ROOF = Y + 0.46
const CEIL = Y + 0.56
export const TUNNEL_X = WALL_R[1] + 1.5
/** The two mains, in the earth beside the tunnel's end: [x, y, r]. */
const MAINS: [number, number, number][] = [
  [WALL_R[1] + 0.62, Y + 0.72, 0.2],
  [WALL_R[1] + 0.98, Y + 1.22, 0.15],
]

/** The train: when its head is at `HEAD_X`, how fast it goes left, its cars. */
const HEAD_AT = 118.0
const HEAD_X = 21
const SPEED = 6
const CARS = 5
const CAR = 3.3
const GAP = 0.14
/** The train's head at `t` (cells): it runs from far off right to far off left. */
const headAt = (t: number): number => HEAD_X - SPEED * (t - HEAD_AT)
const TRAIN_LEN = CARS * CAR + (CARS - 1) * GAP
/** How much the train is under the street at `t`, 0 to 1: the rumble. */
export function rumble(t: number): number {
  const h = headAt(t)
  const tail = h + TRAIN_LEN
  if (tail < TUNNEL_X - 2 || h > HEAD_X + 2) return 0
  const into = Math.min(1, (HEAD_X + 2 - h) / 3)
  const out = Math.min(1, (tail - TUNNEL_X + 2) / 3)
  return Math.max(0, Math.min(into, out))
}

/** A car's windows (and their riders) for a car with its left end at `x0`: [x, top, w, h] each, and [x, y, hat] each. */
function car(x0: number, i: number, lit: number[], heads: number[]): void {
  const win = CEIL + 0.34
  // Two doors and seven windows a side, the IRT's way; most windows empty at this hour.
  for (let w = 0; w < 9; w++) {
    const door = w === 2 || w === 6
    const wx = x0 + 0.22 + w * 0.35
    lit.push(wx, win - (door ? 0.04 : 0), 0.24, 0.6)
    if (door) continue
    // Riders: a hat here and there, a bare head bent over a paper.
    const h = hash(i, w, 91)
    if (h < 0.45) heads.push(wx + 0.06 + 0.12 * hash(i, w, 92), win + 0.2 + 0.08 * hash(i, w, 93), h < 0.25 ? 1 : 0)
  }
}

/** How lit the glass over `x` is by a window of the train under it, 0 to 1. */
function windowUnder(x: number, head: number): number {
  for (let i = 0; i < CARS; i++) {
    const along = x - (head + i * (CAR + GAP)) - 0.22
    if (along < -0.2 || along > 9 * 0.35) continue
    const w = Math.round((along - 0.12) / 0.35)
    if (w < 0 || w > 8) continue
    return Math.max(0, 1 - Math.abs(along - 0.12 - w * 0.35) / 0.16)
  }
  return 0
}

export function drawUnder(pen: Pen, t: number, f: Frame): void {
  if (f.y1 < Y || f.x1 < WALL_R[1]) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const x1 = f.x1 + 1
  // The earth over the tunnel, its roof slab, and the dark of it.
  ctx.fillStyle = rgba(pen, '#24282A', 1)
  ctx.fillRect(TUNNEL_X * k, ROOF * k, (x1 - TUNNEL_X) * k, (CEIL - ROOF) * k)
  ctx.fillStyle = rgba(pen, '#080A0B', 1)
  ctx.fillRect(TUNNEL_X * k, CEIL * k, (x1 - TUNNEL_X) * k, (Math.max(f.y1 + 1, Y + 3) - CEIL) * k)
  // The tunnel's end wall, the earth beside it, and the mains in the earth.
  ctx.fillStyle = rgba(pen, '#1E2224', 1)
  ctx.fillRect((TUNNEL_X - 0.12) * k, ROOF * k, 0.12 * k, (Math.max(f.y1 + 1, Y + 3) - ROOF) * k)
  for (const [px, py, pr] of MAINS) {
    ellipse(pen, [px, py], pr, pr, '#2E3436')
    ellipse(pen, [px, py], pr * 0.72, pr * 0.72, '#0E1112')
    ellipse(pen, [px - pr * 0.3, py - pr * 0.3], pr * 0.15, pr * 0.1, '#4B5658')
  }
  // Its far wall's columns, steel, a pace apart; a work lamp on every fourth, plain in its cage.
  ctx.fillStyle = rgba(pen, '#14181A', 1)
  ctx.beginPath()
  for (let x = Math.ceil(TUNNEL_X / 1.1) * 1.1; x < x1; x += 1.1) ctx.rect((x - 0.05) * k, CEIL * k, 0.1 * k, 2.4 * k)
  ctx.fill()
  for (let i = Math.ceil(TUNNEL_X / 4.4); i * 4.4 < x1; i++) ellipse(pen, [i * 4.4 + 0.12, CEIL + 0.18], 0.035, 0.035, '#C9B27A')

  // The train.
  const head = headAt(t)
  const r = rumble(t)
  const lit: number[] = []
  const heads: number[] = []
  const bodies: number[] = []
  for (let i = 0; i < CARS; i++) {
    const x0 = head + i * (CAR + GAP)
    if (x0 > x1 || x0 + CAR < TUNNEL_X - 0.2) continue
    bodies.push(x0)
    car(x0, i, lit, heads)
  }
  if (bodies.length) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(TUNNEL_X * k, CEIL * k, (x1 - TUNNEL_X) * k, (Math.max(f.y1 + 1, Y + 3) - CEIL) * k)
    ctx.clip()
    const roof = CEIL + 0.12
    // The windows' light up on the tunnel's ceiling over the cars, faint: what shows the train coming before it is seen.
    ctx.fillStyle = rgba(pen, '#E6CF8E', 0.06 * r)
    ctx.fillRect((head - 0.6) * k, CEIL * k, (TRAIN_LEN + 1.2) * k, 0.1 * k)
    // The bodies: the roof's curve, the clerestory's vents, the car's side down past the frame.
    ctx.fillStyle = rgba(pen, '#2A2624', 1)
    ctx.beginPath()
    for (const x0 of bodies) {
      ctx.moveTo(x0 * k, (roof + 0.1) * k)
      ctx.quadraticCurveTo(x0 * k, roof * k, (x0 + 0.25) * k, roof * k)
      ctx.lineTo((x0 + CAR - 0.25) * k, roof * k)
      ctx.quadraticCurveTo((x0 + CAR) * k, roof * k, (x0 + CAR) * k, (roof + 0.1) * k)
      ctx.lineTo((x0 + CAR) * k, (roof + 3) * k)
      ctx.lineTo(x0 * k, (roof + 3) * k)
      ctx.closePath()
    }
    ctx.fill()
    ctx.fillStyle = rgba(pen, '#3E3834', 1)
    ctx.beginPath()
    for (const x0 of bodies) {
      for (let v = 0; v < 4; v++) ctx.rect((x0 + 0.45 + v * 0.75) * k, (roof - 0.05) * k, 0.3 * k, 0.05 * k)
      // The roof's edge, catching the windows' light from below the line of the car's side.
      ctx.rect((x0 + 0.1) * k, (roof + 0.15) * k, (CAR - 0.2) * k, 0.025 * k)
    }
    ctx.fill()
    // The lit windows, and in them the riders.
    ctx.fillStyle = rgba(pen, '#E6CF8E', 0.92)
    ctx.beginPath()
    for (let i = 0; i < lit.length; i += 4) ctx.rect(lit[i] * k, lit[i + 1] * k, lit[i + 2] * k, lit[i + 3] * k)
    ctx.fill()
    ctx.fillStyle = rgba(pen, '#2A2016', 0.9)
    ctx.beginPath()
    for (let i = 0; i < heads.length; i += 3) {
      const [hx, hy, hat] = [heads[i], heads[i + 1], heads[i + 2]]
      ctx.moveTo((hx + 0.055) * k, hy * k)
      ctx.ellipse(hx * k, hy * k, 0.055 * k, 0.065 * k, 0, 0, Math.PI * 2)
      if (hat) {
        ctx.rect((hx - 0.09) * k, (hy - 0.06) * k, 0.18 * k, 0.025 * k)
        ctx.rect((hx - 0.055) * k, (hy - 0.12) * k, 0.11 * k, 0.065 * k)
      }
      // Shoulders, under the frame's foot as often as not.
      ctx.rect((hx - 0.11) * k, (hy + 0.08) * k, 0.22 * k, 0.3 * k)
    }
    ctx.fill()
    // The gangways between the cars: dark, the light through their little end windows.
    ctx.fillStyle = rgba(pen, '#151312', 1)
    ctx.beginPath()
    for (const x0 of bodies) ctx.rect((x0 + CAR) * k, (roof + 0.08) * k, GAP * k, 3 * k)
    ctx.fill()
    ctx.restore()
  }
  // The near columns between the tracks, in front of the train, a pace apart: dark, so the windows go by behind them.
  ctx.fillStyle = rgba(pen, '#0C0E0F', 1)
  ctx.beginPath()
  for (let x = Math.ceil((TUNNEL_X + 0.5) / 1.65) * 1.65 + 0.4; x < x1; x += 1.65) ctx.rect((x - 0.07) * k, CEIL * k, 0.14 * k, 3 * k)
  ctx.fill()
  // Drips off the tunnel's roof, each swelling and falling into the dark.
  for (let i = 0; i < 6; i++) {
    const x = TUNNEL_X + 0.6 + i * 1.83 + hash(i, 1, 75) * 0.6
    if (x < f.x0 || x > f.x1) continue
    const per = 1.1 + 0.9 * hash(i, 2, 75)
    const s = ((t / per + hash(i, 3, 75)) % 1) * per
    const swell = 0.45 * per
    if (s < swell) ellipse(pen, [x, CEIL + 0.015], 0.012 + 0.012 * (s / swell), 0.015 + 0.015 * (s / swell), '#6E8A8A')
    else {
      const v = s - swell
      const dy = 0.5 * G_LOW * 2.5 * v * v
      if (dy < 1.6) ellipse(pen, [x, CEIL + 0.03 + dy], 0.012, 0.024, '#6E8A8A')
    }
  }
}

/** Where the vault lights are set in the slab: two panels of glass, one each side of the lamp. */
const VAULT = [10.6, 12.1, 15.2, 16.4].reduce<number[]>((list, x0, i, all) => {
  if (i % 2) return list
  for (let x = x0; x < all[i + 1]; x += 0.22) list.push(x)
  return list
}, [])

/** The pavement's glass vault lights, set in its slab: dark, but lit from under as a window passes beneath. */
export function drawVaultLights(pen: Pen, t: number, f: Frame): void {
  if (f.y1 < Y || f.x1 < TUNNEL_X) return
  const head = headAt(t)
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  for (const x of VAULT) {
    if (x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
    const l = windowUnder(x, head)
    ctx.fillStyle = rgba(pen, mix('#2A3335', '#E6CF8E', 0.7 * l), 1)
    ctx.fillRect((x - 0.04) * k, (Y + 0.25) * k, 0.08 * k, 0.06 * k)
  }
  ctx.restore()
}

/** How the puddle by the ladder shivers with the train under it: rings. */
export function puddleShiver(pen: Pen, t: number, c: Pt, rx: number): void {
  const r = rumble(t)
  if (r <= 0.02) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.strokeStyle = rgba(pen, '#7E9C9E', 0.35 * r)
  ctx.lineWidth = Math.max(0.6, pen.w * 0.3)
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const u = ((t * 2.6 + i / 3) % 1 + 1) % 1
    const rr = rx * (0.2 + 0.75 * u)
    ctx.moveTo((c[0] + rr) * k, c[1] * k)
    ctx.ellipse(c[0] * k, c[1] * k, rr * k, rr * 0.05 * k, 0, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.restore()
}
