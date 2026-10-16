import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { arc, bar, clamp, disc, easeIn, hash, line, mix, oval, part, poly, rect, rgba, smooth, timber, turn, type Brush } from './brush'
import { CHIME, GARDEN, LEMON, RILL, RILL_SILLS, WELL, rillY } from './geo'
import { G } from './path'
import { drawCypress, drawWall } from './land'
import { DRIPS, at, dripIndex } from './music'
import { tones, windAt } from './look'

/**
 * The cell's garden: the upper garden along the house, with its rill and its lemon tree; the steps down and the
 * chime of tiles across them; the lower garden and its well, with a windlass, a pulley and a bucket the rain fills.
 */

/* ------------------------------------------------------------------ the chime's timing */

/** When the ball lands on each tile (its west end), and when each tile tips it on. */
export const LANDS = [at(14, 0), at(14, 2), at(15, 2), at(16, 2), at(17, 2)]
export const TIPS = [at(14, 1.5), at(15, 1.5), at(16, 1.5), at(17, 1.5), at(18, 3)]
/** Into the bucket: bar 19's downbeat. */
export const INTO_BUCKET = at(19, 0)

const REST = -0.05
const OVER = 0.55
/** How long a tile takes to go over once the ball has run past its pin. */
const GO = 0.5
const LAND_S = -0.72
const LEAVE_S = 0.86

/** How far tile `i` is turned at `t`, radians (east end down, positive). */
export function tileAngle(i: number, t: number): number {
  const L = LANDS[i]
  const P = TIPS[i]
  let a = REST
  // A dip as the ball lands on it.
  if (t >= L) a += 0.08 * Math.exp(-(t - L) * 7) * Math.sin((t - L) * 21)
  // Over, as the ball runs east past the pin, onto its stop on the tip's note.
  if (t >= P - GO) a += (OVER - REST) * easeIn(clamp((t - (P - GO)) / GO))
  // Back, after the ball has gone, its weight bringing it home with a little swing.
  if (t > P + 0.25) {
    const u = t - (P + 0.25)
    a -= (OVER - REST) * (1 - Math.exp(-u * 3) * Math.cos(u * 6))
  }
  if (t > P && t <= P + 0.25) a += 0.03 * Math.sin((t - P) * 60) * Math.exp(-(t - P) * 12)
  return a
}

/** Where the ball is along tile `i` (cells from its pin) at `t`, between its landing and its tip. */
function along(i: number, t: number): number {
  const L = LANDS[i]
  const P = TIPS[i]
  const u = Math.max(0, t - L)
  // It rocks in the hollow, dying away.
  const rock = LAND_S * Math.exp(-u * 1.3) * Math.cos((u * Math.PI * 2) / 0.74)
  const from = P - GO
  if (t < from) return rock
  // Then runs east as the tile goes over.
  const r0 = LAND_S * Math.exp(-(from - L) * 1.3) * Math.cos(((from - L) * Math.PI * 2) / 0.74)
  return r0 + (LEAVE_S - r0) * easeIn(clamp((t - from) / GO))
}

/** The tile's top surface at `s` along it (local cells: y down, the pin at 0). */
const surface = (s: number): number => -0.07 - CHIME.sag * Math.min(1, (s / CHIME.half) ** 2)

/** The ball on tile `i` at `t`, in world cells. */
export function onTile(i: number, t: number): Pt {
  const [px, py] = CHIME.pivots[i]
  const s = along(i, t)
  const [x, y] = turn([[s, surface(s) - R]], tileAngle(i, t), 0, 0, px, py)[0]
  return [x, y]
}

/* ------------------------------------------------------------------ the well's timing */

/** The bucket fills from the drip down its rope; at bar 27 it is heavy enough to take the windlass round. */
export const DOWN_FROM = at(27, 0)
/** And it meets the cistern's water on bar 28's downbeat, as the minor comes in. */
export const DOWN_TO = at(28, 0)
/** How far the bucket's top goes down, cells, to sit on the cistern's water. */
export const DROP = 12.65

/** How far down the bucket has gone, cells. */
export function bucketDown(t: number): number {
  // Inching down as it fills, a few hundredths at each drop it catches.
  const fill = smooth(t, at(24, 0), DOWN_FROM) * 0.14
  if (t < DOWN_FROM) return fill
  const u = clamp((t - DOWN_FROM) / (DOWN_TO - DOWN_FROM))
  // It gathers pace, and the last of it is braked by the windlass before it touches.
  const v = u < 0.85 ? easeIn(u / 0.85) * 0.93 : 0.93 + 0.07 * Math.sin(((u - 0.85) / 0.15) * (Math.PI / 2))
  return fill + (DROP - fill) * v
}

/** The bucket's mouth (its top middle) at `t`. */
export function bucketTop(t: number): Pt {
  return [WELL.bucket.x, WELL.bucket.top + bucketDown(t)]
}

/* ------------------------------------------------------------------ drawing */

/** The garden's back wall, and the cypresses beyond it. */
export function drawGardenBack(b: Brush, t: number): void {
  const c = tones(t)
  drawCypress(b, t, 31.5, -3.4, 15, 1)
  drawCypress(b, t, 67, -3.4, 17, 2)
  drawCypress(b, t, 76.5, -3.4, 13, 3)
  drawCypress(b, t, 51.6, -0.6, 12, 4)
  // The wall: shoulder high along the upper garden, stepping down with the steps to a low one along the lower.
  // Dry stone like the terraces', a little further off and in the dusk a little darker; a cap of tiles along it.
  const cap = mix(c.tile, c.hill, 0.3)
  drawWall(b, c, 28, -3.6, 45, GARDEN.lower, 41, false)
  drawWall(b, c, 45, 1.3, 82, GARDEN.lower, 42, false)
  b.g.fillStyle = rgba(c.hill, 0.28)
  b.g.fillRect(28, -3.6, 17, GARDEN.lower + 3.6)
  b.g.fillRect(45, 1.3, 37, GARDEN.lower - 1.3)
  rect(b, 28, -3.95, 45.3, -3.55, cap)
  rect(b, 44.7, 0.95, 82, 1.35, cap)
  rect(b, 45, -3.6, 45.4, 1.3, rgba(c.ink, 0.25))
  // A doorway through it, shut, by the steps.
  rect(b, 40.0, -2.85, 42.2, 0.2, mix(c.stone, c.plaster, 0.2))
  rect(b, 40.2, -2.6, 42, 0.2, mix(c.wood, c.hill, 0.35))
}

/** The garden's ground: gravel on both levels, the steps between, and the parapet at the lower garden's end. */
export function drawGardenGround(b: Brush, t: number): void {
  const c = tones(t)
  const gravel = mix(c.stone, c.earth, 0.5)
  rect(b, 15, 0, 44, 0.7, gravel)
  rect(b, 15, 0, 44, 0.12, mix(gravel, c.skyLow, 0.2))
  rect(b, 49.5, GARDEN.lower, 82, GARDEN.lower + 0.7, gravel)
  rect(b, 49.5, GARDEN.lower, 82, GARDEN.lower + 0.12, mix(gravel, c.skyLow, 0.2))
  // The steps: five treads of stone.
  const n = 5
  for (let i = 0; i < n; i++) {
    const x0 = GARDEN.steps.x0 + ((GARDEN.steps.x1 - GARDEN.steps.x0) * i) / n
    const y = ((i + 1) * GARDEN.lower) / n
    rect(b, x0, y - GARDEN.lower / n, x0 + 1.25, GARDEN.lower + 0.7, c.stoneShade)
    rect(b, x0, y - GARDEN.lower / n, x0 + 1.25, y - GARDEN.lower / n + 0.16, mix(c.stone, c.skyLow, 0.15))
  }
  // The parapet over the terraces: a low wall with a flat coping.
  drawWall(b, c, 80.4, 1.4, 82.2, GARDEN.lower + 0.4, 7)
  // Puddles in the gravel, holding the sky.
  const g = b.g
  g.fillStyle = rgba(c.skyLow, 0.32)
  for (const [x, y, w] of [[24.5, 0.32, 1.6], [37.8, 0.36, 1.1], [64.2, GARDEN.lower + 0.34, 1.8], [72, GARDEN.lower + 0.36, 1.2]] as const) {
    g.beginPath()
    g.ellipse(x, y, w, 0.1, 0, 0, Math.PI * 2)
    g.fill()
  }
}

/**
 * Pots along the cell's wall, behind the rill: terracotta, a geranium in one, rosemary in another, an empty one
 * filling with rain. Mallorca keeps them by every door.
 */
export function drawPots(b: Brush, t: number): void {
  const c = tones(t)
  const clay = mix(c.tile, c.stone, 0.2)
  const leaf = mix(c.leafDark, c.cypress, 0.3)
  const sway = (windAt(t) - 0.1) * 0.25
  for (const [x, w, h, kind] of [[17.6, 0.75, 0.9, 1], [24.3, 0.6, 0.7, 2], [26.0, 0.85, 1.05, 0], [31.2, 0.7, 0.8, 1]] as const) {
    const top = -0.15 - h
    part(b, [[x - w, top], [x + w, top], [x + w * 0.72, -0.15], [x - w * 0.72, -0.15]], clay, mix(c.tileDeep, c.ink, 0.4), 0.03)
    rect(b, x - w - 0.06, top - 0.06, x + w + 0.06, top + 0.12, mix(clay, c.tileShade, 0.4))
    if (kind === 1) {
      // A geranium: a dark round of leaves, a few muted red heads.
      b.g.fillStyle = leaf
      b.g.beginPath()
      b.g.ellipse(x + sway * 0.5, top - 0.55, w * 1.15, 0.6, 0, 0, Math.PI * 2)
      b.g.fill()
      for (let k = 0; k < 4; k++) disc(b, x - w * 0.7 + k * w * 0.45 + sway, top - 0.95 + (k % 2) * 0.22, 0.13, mix('#B04A3A', leaf, 0.35))
    } else if (kind === 2) {
      // Rosemary: upright sprigs.
      b.g.strokeStyle = leaf
      b.g.lineWidth = 0.08
      b.g.beginPath()
      for (let k = 0; k < 7; k++) {
        const bx = x - w * 0.6 + (k * w * 1.2) / 6
        b.g.moveTo(bx, top)
        b.g.lineTo(bx + (k - 3) * 0.06 + sway, top - 0.9 - hash(k, 77) * 0.5)
      }
      b.g.stroke()
    }
  }
}

/** The rill's bed: a stone channel along the ground, a thread of water in it. Behind the ball. */
export function drawRillBack(b: Brush, t: number): void {
  const c = tones(t)
  const pts: Pt[] = [
    [RILL.x0, rillY(RILL.x0) - 0.22],
    [RILL.x1, rillY(RILL.x1) - 0.22],
    [RILL.x1, rillY(RILL.x1) + 0.08],
    [RILL.x0, rillY(RILL.x0) + 0.08],
  ]
  poly(b, pts, c.stoneDeep)
  line(b, RILL.x0, rillY(RILL.x0) - 0.02, RILL.x1, rillY(RILL.x1) - 0.02, mix(c.water, c.skyLow, 0.4), Math.max(1, b.k * 0.03))
  // Its sills: low stones across it, the water breaking white-ish over each.
  for (const x of RILL_SILLS) {
    part(b, [[x - 0.14, rillY(x) + 0.02], [x - 0.1, rillY(x) - 0.12], [x + 0.1, rillY(x) - 0.12], [x + 0.14, rillY(x) + 0.02]], c.stone, mix(c.stoneDeep, c.ink, 0.4), 0.025)
    line(b, x + 0.16, rillY(x) - 0.06, x + 0.45, rillY(x) - 0.03, rgba(mix(c.waterLight, c.rain, 0.5), 0.7), Math.max(1, b.k * 0.02))
  }
}

/** The rill's front edge, in front of the ball's foot. */
export function drawRillFront(b: Brush, t: number): void {
  const c = tones(t)
  poly(b, [[RILL.x0, rillY(RILL.x0) - 0.05], [RILL.x1, rillY(RILL.x1) - 0.05], [RILL.x1 + 0.08, rillY(RILL.x1) + 0.2], [RILL.x0, rillY(RILL.x0) + 0.2]], c.stone)
  line(b, RILL.x0, rillY(RILL.x0) - 0.05, RILL.x1, rillY(RILL.x1) - 0.05, mix(c.stone, c.skyLow, 0.35), Math.max(1, b.k * 0.02))
}

/** The lemon tree: a short trunk, a round dark crown, a few lemons in it, moving a little in the wind. */
export function drawLemon(b: Brush, t: number): void {
  const c = tones(t)
  const { x, r } = LEMON
  const sway = (windAt(t) - 0.1) * 0.6 * Math.sin(t * 1.4)
  const trunk = mix(c.wood, c.ink, 0.2)
  poly(b, [[x - 0.32, 0.05], [x + 0.32, 0.05], [x + 0.18, -3.4], [x + 0.9, -4.6], [x + 0.6, -4.8], [x, -4], [x - 0.7, -4.9], [x - 0.95, -4.7], [x - 0.2, -3.4]], trunk)
  const cx = x + sway * 0.3
  const cy = -7.4
  const leaf = mix(c.leafDark, c.cypress, 0.4)
  const g = b.g
  g.fillStyle = leaf
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const lr = r * (0.48 + hash(i, 61) * 0.18)
    const lx = cx + Math.cos(a) * r * 0.58 + (i % 3 === 0 ? sway * 0.4 : 0)
    const ly = cy + Math.sin(a) * r * 0.5
    g.moveTo(lx + lr, ly)
    g.ellipse(lx, ly, lr, lr * 0.85, 0, 0, Math.PI * 2)
  }
  g.moveTo(cx + r * 0.7, cy)
  g.ellipse(cx, cy, r * 0.7, r * 0.62, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = mix(leaf, c.leaf, 0.45)
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.85 + (i / 5) * Math.PI * 0.7
    const lr = r * 0.32
    const lx = cx + Math.cos(a) * r * 0.55
    const ly = cy + Math.sin(a) * r * 0.48
    g.moveTo(lx + lr, ly)
    g.ellipse(lx, ly, lr, lr * 0.7, 0, 0, Math.PI * 2)
  }
  g.fill()
  // Lemons: muted in the dusk, there all the same.
  const lemon = mix('#D8C25A', c.leaf, 0.35)
  for (let i = 0; i < 9; i++) {
    const a = hash(i, 71) * Math.PI * 2
    const d = 0.35 + hash(i, 72) * 0.5
    oval(b, cx + Math.cos(a) * r * d, cy + Math.sin(a) * r * d * 0.8 + 0.4, 0.19, 0.15, lemon, 0.3)
  }
}

/** The chime's rack: a beam on posts, a pin for each tile. Behind the ball. */
export function drawRack(b: Brush, t: number): void {
  const c = tones(t)
  const P = CHIME.pivots
  const beam: Pt[] = [
    [P[0][0] - 1.0, P[0][1] + 0.42],
    [P[4][0] + 1.0, P[4][1] + 0.42],
  ]
  const wood = mix(c.wood, c.plaster, 0.06)
  for (const x of [P[0][0] - 0.7, P[2][0], P[4][0] + 0.6]) {
    const y = beam[0][1] + ((beam[1][1] - beam[0][1]) * (x - beam[0][0])) / (beam[1][0] - beam[0][0])
    const foot = x < GARDEN.steps.x0 + 0.2 ? 0.05 : x < GARDEN.steps.x1 ? ((x - GARDEN.steps.x0) / (GARDEN.steps.x1 - GARDEN.steps.x0)) * GARDEN.lower : GARDEN.lower
    timber(b, x, y, x, foot + 0.1, mix(wood, c.ink, 0.15), c.ink, 0.2)
  }
  timber(b, beam[0][0], beam[0][1], beam[1][0], beam[1][1], wood, c.ink, 0.22)
  for (const [px, py] of P) {
    timber(b, px, py, px, py + 0.4, c.iron, c.ink, 0.07)
    // The stop the tile knocks on as it goes over: a peg east of the pin.
    timber(b, px + 0.62, py + 0.26, px + 0.62, py + 0.42, wood, c.ink, 0.12)
  }
}

/** The tiles themselves: curved pans on their pins, at their angles. In front of the rack, behind the ball. */
export function drawTiles(b: Brush, t: number): void {
  const c = tones(t)
  const n = 14
  for (let i = 0; i < CHIME.pivots.length; i++) {
    const [px, py] = CHIME.pivots[i]
    const a = tileAngle(i, t)
    const top: Pt[] = []
    const bot: Pt[] = []
    for (let k = 0; k <= n; k++) {
      const s = -CHIME.half + (2 * CHIME.half * k) / n
      top.push([s, surface(s)])
      bot.push([s, surface(s) + 0.12])
    }
    const shape = turn([...top, ...bot.reverse()], a, 0, 0, px, py)
    part(b, shape, c.tile, mix(c.tileDeep, c.ink, 0.5), 0.03)
    const under = turn(bot.slice(0, n - 1).map(([s, y]) => [s, y - 0.035] as Pt), a, 0, 0, px, py)
    if (b.k > 20) {
      b.g.strokeStyle = c.tileShade
      b.g.lineWidth = Math.max(b.px, 0.04)
      b.g.beginPath()
      b.g.moveTo(under[0][0], under[0][1])
      for (const [x, y] of under) b.g.lineTo(x, y)
      b.g.stroke()
    }
    // Its west end's lip: the round mouth of the pan, where rain sits.
    const lip = turn([[-CHIME.half, surface(-CHIME.half) + 0.045]], a, 0, 0, px, py)[0]
    oval(b, lip[0], lip[1], 0.05, 0.09, c.tileShade, a)
  }
}

/* ------------------------------------------------------------------ the well */

/** The curb, the arch and the pulley, the windlass: behind the bucket. */
export function drawWellBack(b: Brush, t: number): void {
  const c = tones(t)
  const { x, r, curb } = WELL
  const g = b.g
  // The iron arch over the curb, and its pulley in a fork at the crown.
  g.strokeStyle = c.iron
  g.lineWidth = 0.11
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x - r + 0.25, curb)
  g.lineTo(x - r + 0.25, -2.8)
  g.bezierCurveTo(x - r + 0.25, -5.6, x + r - 0.25, -5.6, x + r - 0.25, -2.8)
  g.lineTo(x + r - 0.25, curb)
  g.stroke()
  const [qx, qy] = WELL.pulley
  bar(b, qx, qy, qx, -4.95, c.iron, 0.08)
  const spin = -bucketDown(t) / WELL.wheel
  disc(b, qx, qy, WELL.wheel, mix(c.iron, c.wood, 0.3))
  disc(b, qx, qy, WELL.wheel * 0.65, mix(c.iron, c.wood, 0.55))
  for (let k = 0; k < 3; k++) {
    const a = spin + (k * Math.PI) / 3
    line(b, qx - Math.cos(a) * WELL.wheel * 0.62, qy - Math.sin(a) * WELL.wheel * 0.62, qx + Math.cos(a) * WELL.wheel * 0.62, qy + Math.sin(a) * WELL.wheel * 0.62, c.iron, Math.max(1, b.k * 0.025))
  }
  disc(b, qx, qy, 0.08, c.iron)
  // The ropes: down the west side to the bucket, down the east side to the windlass.
  const [bx, by] = bucketTop(t)
  const rope = mix(c.wood, c.plaster, 0.35)
  line(b, qx - WELL.wheel, qy, bx, by - 0.55, rope, Math.max(1, b.k * 0.03))
  const drum: Pt = [x + r - 0.55, curb - 0.75]
  line(b, qx + WELL.wheel, qy, drum[0] - 0.3, drum[1], rope, Math.max(1, b.k * 0.03))
  // The windlass: a drum seen end on, its crank going round as the rope pays out.
  bar(b, drum[0], drum[1], drum[0] + 0.15, curb + 0.05, mix(c.wood, c.ink, 0.15), 0.16)
  disc(b, drum[0], drum[1], 0.32, mix(c.wood, c.ink, 0.1))
  disc(b, drum[0], drum[1], 0.2, mix(c.wood, c.plaster, 0.25))
  const crank = bucketDown(t) / 0.3 + 0.6
  const hx = drum[0] + Math.cos(crank) * 0.7
  const hy = drum[1] + Math.sin(crank) * 0.7
  bar(b, drum[0], drum[1], hx, hy, c.iron, 0.07, 'round')
  disc(b, hx, hy, 0.1, mix(c.wood, c.ink, 0.3))
  disc(b, drum[0], drum[1], 0.06, c.iron)
}

/** The curb's stone, in front of the shaft: courses of dressed stone, a coping, a lip of the sky. */
export function drawCurb(b: Brush, t: number): void {
  const c = tones(t)
  const { x, r, curb } = WELL
  const g = b.g
  rect(b, x - r, curb, x + r, GARDEN.lower + 0.4, c.stone)
  g.fillStyle = c.stoneShade
  for (let y = curb + 0.55; y < GARDEN.lower + 0.3; y += 0.55) g.fillRect(x - r, y, 2 * r, 0.05)
  for (let row = 0; row < 5; row++) {
    const y = curb + 0.55 * row
    for (let k = 0; k < 4; k++) {
      const sx = x - r + ((k + (row % 2) * 0.5) * 2 * r) / 4
      if (sx > x - r + 0.05 && sx < x + r - 0.05) g.fillRect(sx, y, 0.05, 0.55)
    }
  }
  // The curve of the curb: shade at its two sides, as round things have.
  g.fillStyle = rgba(c.stoneDeep, 0.35)
  g.fillRect(x + r - 0.45, curb, 0.45, GARDEN.lower + 0.4 - curb)
  g.fillStyle = rgba(c.stoneDeep, 0.2)
  g.fillRect(x - r, curb, 0.3, GARDEN.lower + 0.4 - curb)
  rect(b, x - r - 0.12, curb - 0.22, x + r + 0.12, curb + 0.08, mix(c.stone, c.plaster, 0.3))
  line(b, x - r - 0.12, curb - 0.22, x + r + 0.12, curb - 0.22, mix(c.skyLow, c.stone, 0.4), Math.max(1, b.k * 0.02))
}

/** The bucket, staves and hoops and a bail, at its height on the rope; in front of the ball when it is inside. */
export function drawBucket(b: Brush, t: number, front: boolean): void {
  const c = tones(t)
  const [bx, by] = bucketTop(t)
  const { w, h } = WELL.bucket
  // Down the shaft it is behind the curb; once below the curb's coping, it is drawn by the cistern instead.
  if (by > WELL.curb + 0.2) return
  const wood = mix(c.wood, c.plaster, 0.12)
  if (!front) {
    // The bail.
    b.g.strokeStyle = c.iron
    b.g.lineWidth = Math.max(b.px, 0.04)
    b.g.beginPath()
    b.g.moveTo(bx - w, by + 0.08)
    b.g.quadraticCurveTo(bx, by - 0.95, bx + w, by + 0.08)
    b.g.stroke()
    return
  }
  poly(b, [[bx - w, by], [bx + w, by], [bx + w * 0.8, by + h], [bx - w * 0.8, by + h]], wood)
  rect(b, bx + w * 0.35, by, bx + w * 0.85, by + h, mix(wood, c.ink, 0.18))
  for (const f of [0.18, 0.78]) {
    const y = by + h * f
    const ww = w * (1 - 0.2 * f)
    rect(b, bx - ww - 0.02, y - 0.05, bx + ww + 0.02, y + 0.05, c.iron)
  }
  rect(b, bx - w - 0.03, by - 0.04, bx + w + 0.03, by + 0.05, mix(wood, c.ink, 0.3))
}

/** The rain's way into the bucket: beads that run down its rope and drop in, one on every eighth. */
export function drawRopeDrip(b: Brush, t: number): void {
  if (t < at(19, 1) || t > DOWN_FROM + 0.3) return
  const c = tones(t)
  const [qx, qy] = WELL.pulley
  const [bx, by] = bucketTop(t)
  const top: Pt = [qx - WELL.wheel, qy + 0.1]
  const bottom: Pt = [bx, by - 0.55]
  const len = bottom[1] - top[1]
  const i = dripIndex(t + 0.9)
  const col = rgba(mix(c.rain, c.glass, 0.4), 0.85)
  for (let j = i; j >= 0 && j > i - 4; j--) {
    const land = DRIPS[j]
    const u = (t - (land - 0.9)) / 0.9
    if (u < 0 || u > 1) continue
    // Slow down the rope, then a short free drop off the bail into the mouth.
    const along = u < 0.75 ? easeIn(u / 0.75) * len : len + 0.5 * G * ((u - 0.75) * 0.9) ** 2
    const f = Math.min(1, along / len)
    const x = top[0] + (bottom[0] - top[0]) * f
    oval(b, x, top[1] + Math.min(along, len + 0.55), 0.04, 0.055, col)
  }
}

export { arc }
