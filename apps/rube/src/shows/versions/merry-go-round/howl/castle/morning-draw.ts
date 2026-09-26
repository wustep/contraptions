import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { CALCIFER, FLOWERS, ROOM, TOWN, WASTES } from '../worlds'
import { puff, type Tone } from './room'
import { basketAt, EGG_FLIGHT, eggsInBasket, eggsInPan, LOG, MT, PAN, panAt, calciferAt, TOSSES } from './morning-rig'

/**
 * The morning part's own drawings, in the room's cells: what shows through the door (the night, Porthaven, the war,
 * the meadow), the light each lets in, the sparks off Calcifer, and breakfast (the basket, the eggs in flight, the
 * shells he eats, the eggs frying in the pan). The door itself is `cast.ts`'s `drawDoor`; the pan is the room's.
 */

type Box = { x0: number; y0: number; x1: number; y1: number }

const EGG = mixHex(FLOWERS.white, ROOM.plasterShade, 0.28)
const WHITE = FLOWERS.white
const YOLK = FLOWERS.yellow

/* ------------------------------------------------------------------ through the door */

/** The wastes at night, off the castle's porch: what she came in out of. */
export function viewNight(p: p5, k: number, b: Box, t: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(b.y0), 0, X(b.y1))
  g.addColorStop(0, WASTES.night)
  g.addColorStop(1, mixHex(WASTES.night, WASTES.dusk, 0.25))
  ctx.fillStyle = g
  ctx.fillRect(X(b.x0), X(b.y0), X(b.x1 - b.x0), X(b.y1 - b.y0))
  p.noStroke()
  for (let i = 0; i < 6; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1)
    p.fill(alpha(p, WASTES.cloud, 0.4 + 0.4 * tw))
    p.circle(X(b.x0 + 0.1 + 0.75 * hash(i, 11)), X(b.y0 + 0.15 + 1.0 * hash(i, 12)), Math.max(1, X(0.018)))
  }
  p.fill(mixHex(WASTES.night, WASTES.heatherDeep, 0.35))
  p.beginShape()
  p.vertex(X(b.x0), X(b.y1))
  for (let i = 0; i <= 6; i++) p.vertex(X(b.x0 + ((b.x1 - b.x0) * i) / 6), X(b.y1 - 0.42 - 0.1 * Math.sin(i * 1.3 + 0.4)))
  p.vertex(X(b.x1), X(b.y1))
  p.endShape(p.CLOSE)
  // The porch's boards under the sill.
  p.fill(mixHex(WASTES.wood, WASTES.night, 0.55))
  p.rect(X(b.x0), X(b.y1 - 0.12), X(b.x1 - b.x0), X(0.12))
}

/** Porthaven: the harbour at mid-morning, the sea, a mast, a gull, and the caller on the quay. */
export function viewPorthaven(p: p5, k: number, W: number, ink: string, b: Box, t: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(b.y0), 0, X(b.y1))
  g.addColorStop(0, TOWN.day)
  g.addColorStop(0.55, mixHex(TOWN.day, TOWN.plaster, 0.65))
  g.addColorStop(1, TOWN.plaster)
  ctx.fillStyle = g
  ctx.fillRect(X(b.x0), X(b.y0), X(b.x1 - b.x0), X(b.y1 - b.y0))
  const sea = -0.82
  const quay = -0.42
  p.noStroke()
  // A far headland, the sea and its glints.
  p.fill(mixHex(TOWN.slate, TOWN.day, 0.55))
  p.ellipse(X(b.x0 + 0.1), X(sea), X(0.8), X(0.22))
  p.fill(TOWN.canal)
  p.rect(X(b.x0), X(sea), X(b.x1 - b.x0), X(quay - sea))
  for (let i = 0; i < 7; i++) {
    const u = (hash(i, 21) + t * 0.08) % 1
    p.fill(alpha(p, WHITE, 0.5 + 0.4 * Math.sin(t * 4 + i)))
    p.ellipse(X(b.x0 + (b.x1 - b.x0) * u), X(sea + 0.05 + 0.3 * hash(i, 22)), X(0.07), X(0.012))
  }
  // A mast at the quay's edge with its sail furled on the yard.
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.line(X(b.x0 + 0.18), X(quay), X(b.x0 + 0.18), X(b.y0 + 0.2))
  p.line(X(b.x0 + 0.02), X(b.y0 + 0.5), X(b.x0 + 0.4), X(b.y0 + 0.5))
  p.fill(TOWN.plasterShade)
  p.strokeWeight(W * 0.5)
  p.rect(X(b.x0 + 0.04), X(b.y0 + 0.5), X(0.34), X(0.07), X(0.03))
  // The quay's stones.
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(TOWN.cobble)
  p.rect(X(b.x0 - 0.05), X(quay), X(b.x1 - b.x0 + 0.1), X(b.y1 - quay + 0.05))
  p.stroke(alpha(p, ink, 0.3))
  p.line(X(b.x0), X(quay + 0.16), X(b.x1), X(quay + 0.16))
  // A gull, gliding across and gone: white, grey-backed, dark-tipped, its wings beating slowly.
  const gu = (t - 159.6) / 2.8
  if (gu > 0 && gu < 1) {
    const gx = b.x1 + 0.25 - (b.x1 - b.x0 + 0.5) * gu
    const gy = b.y0 + 0.3 - 0.1 * Math.sin(gu * Math.PI)
    const beat = Math.sin(t * 6.5)
    p.push()
    p.translate(X(gx), X(gy))
    p.scale(-1.7, 1.7)
    p.stroke(alpha(p, ink, 0.8))
    p.strokeWeight(W * 0.45)
    for (const side of [-1, 1]) {
      const tip: Pt = [side * 0.05, -0.12 * beat - 0.04]
      p.fill(side < 0 ? TOWN.plasterShade : WHITE)
      p.beginShape()
      p.vertex(X(-0.02), X(-0.005))
      p.quadraticVertex(X(side * 0.02 + 0.02), X(-0.07 * beat - 0.03), X(tip[0] + 0.1 * side), X(tip[1]))
      p.quadraticVertex(X(side * 0.03 + 0.03), X(-0.03 * beat), X(0.04), X(0.005))
      p.endShape(p.CLOSE)
    }
    p.fill(WHITE)
    p.ellipse(0, 0, X(0.13), X(0.045))
    p.noStroke()
    p.fill(TOWN.gold)
    p.triangle(X(0.065), X(-0.005), X(0.1), X(0.002), X(0.065), X(0.01))
    p.pop()
  }
  // The caller: a fisherman on the quay, facing in, in a coat and a cap; he touches his cap, a bow, to Markl.
  const bow = Math.exp(-Math.pow((t - 160.95) / 0.28, 2))
  const cx = 0.14
  const sh = quay - 1.02 + 0.06 * bow
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  // Coat: shoulders to the sill, a little wider at the hem.
  p.fill(TOWN.slate)
  p.beginShape()
  p.vertex(X(cx - 0.33), X(b.y1 + 0.02))
  p.vertex(X(cx - 0.29), X(sh + 0.3))
  p.quadraticVertex(X(cx - 0.27), X(sh + 0.02), X(cx - 0.12), X(sh))
  p.vertex(X(cx + 0.12), X(sh))
  p.quadraticVertex(X(cx + 0.27), X(sh + 0.02), X(cx + 0.29), X(sh + 0.3))
  p.vertex(X(cx + 0.33), X(b.y1 + 0.02))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(W * 0.5)
  p.line(X(cx), X(sh + 0.06), X(cx), X(b.y1))
  // Head, bearded, bent in the bow; the cap on it.
  p.push()
  p.translate(X(cx), X(sh + 0.02))
  p.rotate(0.25 * bow)
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(TOWN.rose)
  p.ellipse(0, X(-0.12), X(0.15), X(0.18))
  p.fill(TOWN.cobbleDark)
  p.beginShape()
  p.vertex(X(-0.07), X(-0.1))
  p.quadraticVertex(X(-0.06), X(0.0), X(0), X(0.01))
  p.quadraticVertex(X(0.06), X(0.0), X(0.07), X(-0.1))
  p.quadraticVertex(X(0), X(-0.06), X(-0.07), X(-0.1))
  p.endShape(p.CLOSE)
  p.fill(TOWN.timberDark)
  p.beginShape()
  p.vertex(X(-0.09), X(-0.16))
  p.quadraticVertex(X(-0.08), X(-0.25), X(0.0), X(-0.25))
  p.quadraticVertex(X(0.08), X(-0.25), X(0.09), X(-0.17))
  p.vertex(X(0.13), X(-0.15))
  p.vertex(X(-0.09), X(-0.15))
  p.endShape(p.CLOSE)
  p.pop()
}

/** Howl's own door: the war at night, a burning skyline far off, smoke, embers. */
export function viewWar(p: p5, k: number, b: Box, t: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(b.y0), 0, X(b.y1))
  g.addColorStop(0, TOWN.nightHigh)
  g.addColorStop(0.6, TOWN.night)
  g.addColorStop(1, mixHex(TOWN.night, TOWN.ember, 0.55))
  ctx.fillStyle = g
  ctx.fillRect(X(b.x0), X(b.y0), X(b.x1 - b.x0), X(b.y1 - b.y0))
  p.noStroke()
  for (let i = 0; i < 4; i++) {
    const u = ((t - 163.5) * 0.18 + i * 0.27) % 1
    puff(p, k, b.x0 + 0.2 + 0.6 * hash(i, 31) + 0.2 * u, b.y1 - 0.5 - 1.2 * u, 0.18 + 0.22 * u, TOWN.smoke, 0.5 * (1 - u))
  }
  p.fill(mixHex(TOWN.nightHigh, TOWN.slateDark, 0.2))
  p.beginShape()
  p.vertex(X(b.x0), X(b.y1))
  for (const [x, y] of [[0, -0.45], [0.15, -0.45], [0.15, -0.62], [0.28, -0.72], [0.4, -0.62], [0.4, -0.5], [0.62, -0.5], [0.62, -0.8], [0.7, -0.8], [0.7, -0.52], [0.95, -0.52]] as Pt[]) p.vertex(X(b.x0 + x), X(b.y1 + y))
  p.vertex(X(b.x1), X(b.y1))
  p.endShape(p.CLOSE)
  for (let i = 0; i < 7; i++) {
    const u = ((t - 163.5) * 0.5 + hash(i, 33)) % 1
    p.fill(alpha(p, TOWN.fireHot, 0.9 * (1 - u)))
    p.circle(X(b.x0 + 0.1 + 0.8 * hash(i, 34) + 0.1 * Math.sin(t * 2 + i)), X(b.y1 - 0.4 - 1.3 * u), Math.max(1, X(0.02)))
  }
}

/** The flower fields: Howl's gift, the next place. Bright sky, far snowy mountains, a meadow thick with flowers. */
export function viewMeadow(p: p5, k: number, b: Box, t: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(b.y0), 0, X(b.y1))
  g.addColorStop(0, FLOWERS.skyHigh)
  g.addColorStop(0.6, FLOWERS.sky)
  g.addColorStop(1, mixHex(FLOWERS.sky, FLOWERS.white, 0.5))
  ctx.fillStyle = g
  ctx.fillRect(X(b.x0), X(b.y0), X(b.x1 - b.x0), X(b.y1 - b.y0))
  p.noStroke()
  p.fill(alpha(p, FLOWERS.white, 0.85))
  p.ellipse(X(b.x0 + 0.3 + 0.03 * Math.sin(t * 0.3)), X(b.y0 + 0.35), X(0.5), X(0.13))
  p.ellipse(X(b.x0 + 0.46), X(b.y0 + 0.3), X(0.3), X(0.12))
  // The mountains, with snow.
  const base = b.y1 - 0.72
  p.fill(FLOWERS.mountainFar)
  p.triangle(X(b.x0 - 0.2), X(base), X(b.x0 + 0.3), X(base - 0.6), X(b.x0 + 0.8), X(base))
  p.triangle(X(b.x0 + 0.35), X(base), X(b.x0 + 0.78), X(base - 0.45), X(b.x1 + 0.2), X(base))
  p.fill(FLOWERS.snow)
  p.triangle(X(b.x0 + 0.18), X(base - 0.46), X(b.x0 + 0.3), X(base - 0.6), X(b.x0 + 0.42), X(base - 0.46))
  p.triangle(X(b.x0 + 0.69), X(base - 0.36), X(b.x0 + 0.78), X(base - 0.45), X(b.x0 + 0.87), X(base - 0.36))
  // The meadow, and flowers in drifts, many and small.
  p.fill(FLOWERS.meadowFar)
  p.rect(X(b.x0), X(base), X(b.x1 - b.x0), X(b.y1 - base))
  p.fill(FLOWERS.meadow)
  p.beginShape()
  p.vertex(X(b.x0), X(b.y1))
  for (let i = 0; i <= 6; i++) p.vertex(X(b.x0 + ((b.x1 - b.x0) * i) / 6), X(base + 0.22 + 0.05 * Math.sin(i * 1.7)))
  p.vertex(X(b.x1), X(b.y1))
  p.endShape(p.CLOSE)
  const colours = [FLOWERS.yellow, FLOWERS.white, FLOWERS.pink, FLOWERS.coral, FLOWERS.lilac]
  for (let i = 0; i < 46; i++) {
    const v = hash(i, 41)
    const y = base + 0.26 + (b.y1 - base - 0.28) * v
    const x = b.x0 + (b.x1 - b.x0) * hash(i, 42)
    const s = 0.012 + 0.022 * v
    p.fill(colours[i % colours.length])
    p.circle(X(x + 0.01 * Math.sin(t * 1.3 + i)), X(y), Math.max(1, X(2 * s)))
  }
}

/** The light a door lets in: a fan on the floor in front of it, in the colour of where it opens. */
export function doorLight(p: p5, k: number, dx: number, floor: number, open: number, color: string, a: number): void {
  if (open < 0.02 || a <= 0) return
  const X = (v: number) => v * k
  const w = 0.475
  p.noStroke()
  p.fill(alpha(p, color, a * open))
  p.quad(X(dx - w), X(floor), X(dx + w), X(floor), X(dx + w + 0.55), X(floor + 0.7), X(dx - w - 0.35), X(floor + 0.7))
  p.fill(alpha(p, color, a * 0.5 * open))
  p.quad(X(dx - w), X(floor - 2.05), X(dx + w), X(floor - 2.05), X(dx + w + 0.7), X(floor + 0.7), X(dx - w - 0.5), X(floor + 0.7))
}

/** A place's light leaking round a shut door's edges once the dial is set on it. */
export function doorLeak(p: p5, k: number, W: number, dx: number, floor: number, color: string, a: number): void {
  if (a <= 0.01) return
  const X = (v: number) => v * k
  const w = 0.475
  const h = 2.05
  p.noFill()
  p.stroke(alpha(p, color, 0.9 * a))
  p.strokeWeight(Math.max(1, W * 1.1))
  p.line(X(dx - w + 0.01), X(floor - h + 0.02), X(dx + w - 0.01), X(floor - h + 0.02))
  p.line(X(dx + w - 0.01), X(floor - h + 0.02), X(dx + w - 0.01), X(floor - 0.01))
  p.noStroke()
  p.fill(alpha(p, color, 0.35 * a))
  p.quad(X(dx - w), X(floor), X(dx + w), X(floor), X(dx + w + 0.25), X(floor + 0.3), X(dx - w - 0.15), X(floor + 0.3))
}

/* ------------------------------------------------------------------ Calcifer's sparks and the bellows' breath */

/** Embers going up from the grate at `at`: a handful, rising and dying. */
export function sparks(p: p5, k: number, t: number, at: number, n: number, force: number): void {
  const u0 = t - at
  if (u0 < 0 || u0 > 1.3) return
  const X = (v: number) => v * k
  p.noStroke()
  for (let i = 0; i < n; i++) {
    const life = 0.6 + 0.6 * hash(i, at * 100)
    const u = u0 / life
    if (u >= 1) continue
    const sx = LOG[0] + (hash(i, 7, at * 10) - 0.5) * 0.5
    const x = sx + (hash(i, 8, at) - 0.5) * 0.5 * u + 0.05 * Math.sin(u * 9 + i)
    const y = LOG[1] - 0.3 - force * (0.9 + 0.8 * hash(i, 9)) * u + 0.3 * u * u
    p.fill(alpha(p, i % 2 ? CALCIFER.core : CALCIFER.body, 0.95 * (1 - u)))
    p.circle(X(x), X(y), Math.max(1, X(0.03 * (1 - 0.5 * u))))
  }
}

/** Dust shaken off the lintel by a knock at `at`: a few soft puffs drifting down and spreading, pale. */
export function knockDust(p: p5, k: number, t: number, at: number, n: number, x: number, y: number): void {
  const u0 = t - at
  if (u0 < 0 || u0 > 1.6) return
  for (let i = 0; i < n; i++) {
    const u = u0 / (1.1 + 0.4 * hash(i, 61, at))
    if (u >= 1) continue
    const px = x + (hash(i, 62, at) - 0.5) * 0.9 + 0.1 * u * (hash(i, 63) - 0.5)
    puff(p, k, px, y + 0.05 + 0.55 * u, 0.04 + 0.1 * u, ROOM.plasterShade, 0.5 * (1 - u), i)
  }
}

/** A breath of the bellows at `at`: a pale gust out of the nozzle into the grate, fanning the embers. */
export function gust(p: p5, k: number, t: number, at: number, tip: Pt): void {
  const u = (t - at + 0.08) / 0.55
  if (u < 0 || u > 1) return
  for (let i = 0; i < 3; i++) {
    const v = Math.min(1, u * (1 + i * 0.3))
    puff(p, k, tip[0] + 0.06 + 0.42 * v, tip[1] - 0.05 - 0.12 * v, 0.05 + 0.09 * v, WASTES.steam, 0.55 * (1 - u), i)
  }
}

/** Two flames licking up round the rim of a pan set on Calcifer, flickering. */
export function licks(p: p5, k: number, t: number, x: number, y: number, size: number): void {
  const X = (v: number) => v * k
  p.noStroke()
  for (const side of [-1, 1]) {
    const f = 0.8 + 0.2 * Math.sin(t * (9 + side) + side)
    const h = (0.16 + 0.08 * size) * f
    const bx = x + side * PAN.r * 0.95
    const by = y - 0.02
    for (const [c, s] of [[CALCIFER.edge, 1], [CALCIFER.body, 0.72], [CALCIFER.core, 0.4]] as const) {
      p.fill(c)
      p.beginShape()
      p.vertex(X(bx - side * 0.07 * s), X(by))
      p.quadraticVertex(X(bx + side * 0.02 * s), X(by - h * 0.5 * s), X(bx + side * (0.05 + 0.03 * Math.sin(t * 7 + side)) * s), X(by - h * s))
      p.quadraticVertex(X(bx + side * 0.06 * s), X(by - h * 0.35 * s), X(bx + side * 0.05 * s), X(by))
      p.endShape(p.CLOSE)
    }
  }
}

/* ------------------------------------------------------------------ breakfast */

function egg(p: p5, k: number, W: number, ink: string, x: number, y: number, a: number): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(a)
  p.stroke(alpha(p, ink, 0.8))
  p.strokeWeight(W * 0.5)
  p.fill(EGG)
  p.beginShape()
  p.vertex(0, X(-0.075))
  p.bezierVertex(X(0.052), X(-0.075), X(0.058), X(0.052), 0, X(0.052))
  p.bezierVertex(X(-0.058), X(0.052), X(-0.052), X(-0.075), 0, X(-0.075))
  p.endShape(p.CLOSE)
  p.pop()
}

/** The basket on the chair's arm, with the eggs still in it. */
export function drawBasket(p: p5, k: number, W: number, ink: string, tone: Tone, t: number): void {
  const X = (v: number) => v * k
  const [bx, by] = basketAt(t)
  const n = eggsInBasket(t)
  for (let i = 0; i < n; i++) egg(p, k, W, ink, bx - 0.1 + i * 0.066, by - 0.085 + (i % 2) * 0.014, (i - 1.5) * 0.28)
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(mixHex(ROOM.wood, ROOM.plasterShade, 0.45)))
  p.beginShape()
  p.vertex(X(bx - 0.18), X(by - 0.07))
  p.vertex(X(bx + 0.18), X(by - 0.07))
  p.vertex(X(bx + 0.13), X(by + 0.06))
  p.vertex(X(bx - 0.13), X(by + 0.06))
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(W * 0.45)
  p.line(X(bx - 0.155), X(by - 0.02), X(bx + 0.155), X(by - 0.02))
  p.line(X(bx - 0.14), X(by + 0.02), X(bx + 0.14), X(by + 0.02))
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.beginShape()
  p.vertex(X(bx - 0.14), X(by - 0.07))
  p.quadraticVertex(X(bx), X(by - 0.34), X(bx + 0.14), X(by - 0.07))
  p.endShape()
}

/** Where the rim of the pan is that an egg is thrown at, at `t` (its left lip). */
const rimAt = (t: number): Pt => {
  const pan = panAt(t)
  return [pan.x - PAN.r * 0.55, pan.y - PAN.depth - 0.05]
}
/** Where Calcifer's mouth is, for the shells. */
const mouthAt = (t: number): Pt => {
  const c = calciferAt(t)
  return [LOG[0], LOG[1] - 0.235 * c.size * c.squash]
}

/** The eggs in flight from the basket to the pan, cracking on its rim, and the shells going into his mouth. */
export function drawEggs(p: p5, k: number, W: number, ink: string, t: number): void {
  const X = (v: number) => v * k
  MT.eggs.forEach((crack, i) => {
    const toss = TOSSES[i]
    if (t >= toss && t < crack) {
      const s = (t - toss) / EGG_FLIGHT
      const [ax, ay] = basketAt(toss)
      const [bx, by] = rimAt(crack)
      const lift = (12 * EGG_FLIGHT * EGG_FLIGHT) / 8
      const x = ax + (bx - ax) * s
      const y = ay - 0.08 + (by - ay + 0.08) * s - lift * 4 * s * (1 - s)
      egg(p, k, W, ink, x, y, s * 5 + i)
    }
    // The crack: the shell in two halves, flicked down into Calcifer's mouth; the egg itself drops into the pan.
    const u = (t - crack) / 0.24
    if (u >= 0 && u < 1) {
      const [rx, ry] = rimAt(crack)
      const [mx, my] = mouthAt(t)
      for (const side of [-1, 1]) {
        const x = rx + (mx + side * 0.03 - rx) * u
        const y = ry + (my - ry) * u - 0.18 * Math.sin(u * Math.PI)
        p.push()
        p.translate(X(x), X(y))
        p.rotate(side * (0.8 + 5 * u))
        p.stroke(alpha(p, ink, 0.8))
        p.strokeWeight(W * 0.45)
        p.fill(EGG)
        p.arc(0, 0, X(0.08), X(0.07), 0, Math.PI, p.CHORD)
        p.pop()
      }
      if (u < 0.5) {
        p.noStroke()
        p.fill(YOLK)
        p.ellipse(X(rx + 0.02), X(ry + 0.02 + 0.08 * u), X(0.05), X(0.05 + 0.04 * u))
      }
    }
  })
}

/** The eggs frying in the pan, wherever it is; steam and spitting fat while it is on the fire. */
export function drawPanEggs(p: p5, k: number, W: number, ink: string, t: number): void {
  const X = (v: number) => v * k
  const n = eggsInPan(t)
  const pan = panAt(t)
  const rim = pan.y - PAN.depth
  const slots = [-0.14, 0.08, -0.03, 0.15]
  p.push()
  p.translate(X(pan.x), X(rim))
  p.rotate(pan.tilt)
  for (let i = 0; i < n; i++) {
    const since = t - MT.eggs[i]
    const spread = Math.min(1, 0.35 + since / 0.25)
    const x = slots[i]
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(W * 0.45)
    p.fill(WHITE)
    p.ellipse(X(x), X(-0.012), X(0.16 * spread), X(0.05))
    p.noStroke()
    p.fill(YOLK)
    p.arc(X(x + 0.01), X(-0.022), X(0.06), X(0.06), Math.PI, 2 * Math.PI, p.CHORD)
  }
  p.pop()
  if (pan.on === 'fire' && n > 0) {
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.8 + i / 4) % 1
      const x = pan.x - 0.18 + 0.12 * i + 0.04 * Math.sin(u * 5 + i)
      puff(p, k, x, rim - 0.1 - 0.5 * u, 0.03 + 0.07 * u, WASTES.steam, 0.35 * (1 - u))
    }
    p.noStroke()
    for (let i = 0; i < 5; i++) {
      const u = (t * 2.3 + hash(i, 51)) % 1
      p.fill(alpha(p, CALCIFER.core, 0.8 * (1 - u)))
      p.circle(X(pan.x - 0.2 + 0.4 * hash(i, 52) + 0.05 * u), X(rim - 0.03 - 0.16 * Math.sin(u * Math.PI)), Math.max(1, X(0.016)))
    }
  }
}
