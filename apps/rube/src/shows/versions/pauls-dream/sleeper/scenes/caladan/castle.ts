import { drawBull } from '../../craft/bull'
import { clamp01, ellipse, fill, line, mix, poly, rect, rgba, smooth, stroke, vgrad, type Paint, type Pt } from '../../paint'
import { AIR } from './sea'
import { BED, BLOCK, BOX, CLIFF, CRATE, HALL, HOOK, ROOM, SEAT, TEST, TOWER, T } from './geo'

/**
 * Castle Caladan: a dark stone fortress on the cliff, a tower on the edge over the sea and a long block behind it,
 * steep roofs, deep slit windows, a few of them lit. Inside it is timber and paper screens, and lamps, the only warm
 * colour on the planet (Villeneuve's Caladan is Norway's coast outside and old Japan within).
 *
 * The rooms the film needs are drawn in section, behind the castle's face: Paul's room at the top of the tower, the
 * room where the box is, and the hall in the tower's foot with the bull's head on its wall. The face is drawn over
 * them (and over the balls in them) while the camera is outside, and goes as the camera comes in through the wall.
 */

const C = {
  stone: '#3D4341',
  stoneLit: '#4C5350',
  stoneDark: '#2B302F',
  cut: '#181C1B',
  roof: '#22282A',
  timber: '#2C241E',
  timberLit: '#43372B',
  floor: '#3A2F25',
  wall: '#3A342D',
  pool: '#5E4D3A',
  lamp: '#E6BF82',
  screen: '#B5A78D',
  screenLit: '#D8C7A2',
  slit: '#151918',
  lit: '#CFA867',
} as const

/**
 * How much of the castle's face is drawn over the rooms at `t`: whole while the camera is outside, gone while it is in
 * a room. It goes as the camera comes in to Paul's window, comes back for the shot from the sea, and goes again inside.
 */
export function faceAt(t: number): number {
  if (t < T.window + 1) return 1 - smooth(t, T.window - 4.5, T.window + 0.5)
  if (t >= T.sea && t < T.inside) return 1
  if (t >= T.field) return 1
  return 0
}

/** The castle seen from outside: its masses, roofs and windows. `a` is how much of it is drawn (its face's share). */
function exterior(g: Paint, a: number): void {
  if (a <= 0.003) return
  const ctx = g.ctx
  ctx.save()
  ctx.globalAlpha = a
  // The block, then the tower over it, each lit a little on the sea side.
  rect(ctx, BLOCK.x0, BLOCK.top, BLOCK.x1 - BLOCK.x0, CLIFF.top - BLOCK.top)
  fill(ctx, vgrad(ctx, BLOCK.top, CLIFF.top, [[0, C.stone], [1, C.stoneDark]]))
  poly(ctx, [[BLOCK.x0 - 0.4, BLOCK.top], [BLOCK.x0 + 3, BLOCK.top - 2.4], [BLOCK.x1 - 3, BLOCK.top - 2.4], [BLOCK.x1 + 0.4, BLOCK.top]])
  fill(ctx, C.roof)
  // The tower, with two of its windows open on its face: Paul's room and the hall's sea end behind them, and anyone in
  // them, are seen through.
  ctx.beginPath()
  ctx.rect(TOWER.x0, TOWER.top, TOWER.x1 - TOWER.x0, CLIFF.top - TOWER.top)
  ctx.rect(ROOM.x0 + 0.5, ROOM.ceil + 0.3, 1.6, ROOM.floor - ROOM.ceil - 0.3)
  ctx.rect(HALL.x0 + 0.35, HALL.floor - 2.2, 2.0, 2.2)
  ctx.fillStyle = vgrad(ctx, TOWER.top, CLIFF.top, [[0, C.stoneLit], [0.6, C.stone], [1, C.stoneDark]])
  ctx.fill('evenodd')
  poly(ctx, [[TOWER.x0 - 0.7, TOWER.top], [(TOWER.x0 + TOWER.x1) / 2, TOWER.peak], [TOWER.x1 + 0.7, TOWER.top]])
  fill(ctx, C.roof)
  // Courses: three dark bands round the tower and the block, where the floors are.
  for (const y of [-16.9, -21.6, -25.6]) {
    rect(ctx, TOWER.x0, y, TOWER.x1 - TOWER.x0, 0.25)
    fill(ctx, rgba(C.stoneDark, 0.8))
  }
  // Windows: deep slits, dark, and a few lit: Paul's (the tower's top), the hall's tall one, two in the block.
  const slit = (x: number, y0: number, y1: number, w: number, lit: number) => {
    rect(ctx, x, y0, w, y1 - y0)
    fill(ctx, lit > 0 ? mix(C.slit, C.lit, lit) : C.slit)
  }
  slit(TOWER.x0 + 0.1, -21.2, -20.2, 0.5, 0)
  for (let i = 0; i < 7; i++) {
    const x = BLOCK.x0 + 1.6 + i * 3.3
    slit(x, -20.4, -19.1, 0.45, i === 1 || i === 4 ? 0.85 : 0)
    slit(x, -15.6, -14.2, 0.45, i === 5 ? 0.7 : 0)
  }
  ctx.restore()
}

/** The section's cut face: the castle's mass round the rooms, a little lighter than the night inside them. */
function section(g: Paint): void {
  const ctx = g.ctx
  rect(ctx, TOWER.x0, TOWER.top, TOWER.x1 - TOWER.x0, CLIFF.top - TOWER.top)
  fill(ctx, C.cut)
  rect(ctx, BLOCK.x0, BLOCK.top, BLOCK.x1 - BLOCK.x0, CLIFF.top - BLOCK.top)
  fill(ctx, C.cut)
}

/** A room's box: its back wall, warmer low down where the lamp is (`warm`), its floor of boards. */
function roomBox(g: Paint, x0: number, x1: number, ceil: number, floor: number, warm: number): void {
  const ctx = g.ctx
  rect(ctx, x0, ceil, x1 - x0, floor - ceil)
  fill(ctx, vgrad(ctx, ceil, floor, [[0, mix(C.wall, '#1D1916', 0.6)], [1, mix(C.wall, C.pool, warm)]]))
  rect(ctx, x0, floor - 0.06, x1 - x0, 0.3)
  fill(ctx, C.floor)
  // The ceiling's beam line.
  rect(ctx, x0, ceil, x1 - x0, 0.12)
  fill(ctx, C.timber)
}

/** A paper lamp on a stand, its shade warm (it is the light; there is no halo round it). */
function lamp(g: Paint, x: number, floor: number, h = 0.62): void {
  line(g, [x, floor], [x, floor - h + 0.12], C.timber, 0.03)
  ellipse(g.ctx, x, floor - h, 0.12, 0.15)
  fill(g.ctx, C.lamp)
}

/** A window in a room's west wall: the grey day through it, the sea's line far below, rain on its glass. */
function window(g: Paint, x: number, y0: number, y1: number, w: number): void {
  const ctx = g.ctx
  rect(ctx, x, y0, w, y1 - y0)
  fill(ctx, vgrad(ctx, y0, y1, [[0, AIR.low], [0.7, AIR.mist], [1, AIR.seaFar]]))
  rect(ctx, x, y1 - (y1 - y0) * 0.22, w, (y1 - y0) * 0.22)
  fill(ctx, rgba(AIR.sea, 0.7))
  // The frame and one mullion.
  rect(ctx, x, y0, w, y1 - y0)
  stroke(g, C.timber, 0.05)
  line(g, [x + w / 2, y0], [x + w / 2, y1], C.timber, 0.04)
}

/** Paul's room: the bed, the lamp low, the window onto the sea. */
function paulsRoom(g: Paint): void {
  roomBox(g, ROOM.x0, ROOM.x1, ROOM.ceil, ROOM.floor, 0.8)
  window(g, ROOM.x0, ROOM.win.y0, ROOM.win.y1, 0.75)
  const ctx = g.ctx
  // The bed: a low timber frame and its cover.
  rect(ctx, BED.x0, BED.top + 0.12, BED.x1 - BED.x0, ROOM.floor - BED.top - 0.12)
  fill(ctx, C.timber)
  rect(ctx, BED.x0 + 0.05, BED.top + 0.06, BED.x1 - BED.x0 - 0.1, 0.1)
  fill(ctx, '#5A5A52')
  lamp(g, ROOM.x1 - 2.4, ROOM.floor, 0.5)
}

/** The test room: paper screens on its east wall (the sliding door among them), the low table, her seat. */
function testRoom(g: Paint): void {
  const t = g.t
  roomBox(g, TEST.x0, TEST.x1, TEST.ceil, TEST.floor, 0.6)
  const ctx = g.ctx
  // The passage beyond the door, where Jessica waits: its own dim wall.
  rect(ctx, TEST.x1 + 0.35, TEST.ceil, TEST.hall1 - TEST.x1 - 0.35, TEST.floor - TEST.ceil)
  fill(ctx, '#2B2621')
  rect(ctx, TEST.x1 + 0.35, TEST.floor - 0.06, TEST.hall1 - TEST.x1 - 0.35, 0.3)
  fill(ctx, C.floor)
  // The partition between them, and the door in it: a screen that slides away and back.
  const open = doorOpen(t)
  rect(ctx, TEST.x1, TEST.ceil, 0.35, TEST.floor - TEST.ceil)
  fill(ctx, C.cut)
  const dh = TEST.floor - TEST.ceil - 0.25
  rect(ctx, TEST.x1 + 0.02, TEST.floor - dh, 0.31, dh * (1 - open))
  fill(ctx, C.screenLit)
  // Screens along the back wall.
  for (let i = 0; i < 3; i++) {
    const x = TEST.x0 + 0.5 + i * 1.6
    rect(ctx, x, TEST.ceil + 0.45, 1.15, 1.05)
    fill(ctx, rgba(C.screen, 0.16))
    line(g, [x + 0.575, TEST.ceil + 0.45], [x + 0.575, TEST.ceil + 1.5], rgba(C.timber, 0.6), 0.02)
  }
  // Her seat: a low dark chair; the low table and its lamp.
  rect(ctx, SEAT[0] - 0.32, TEST.floor - 0.2, 0.64, 0.2)
  fill(ctx, C.timber)
  rect(ctx, SEAT[0] - 0.36, TEST.floor - 0.75, 0.1, 0.55)
  fill(ctx, C.timber)
  lamp(g, TEST.x0 + 0.9, TEST.floor, 0.7)
}

/** The sliding door in the test room's wall, 0 shut to 1 open. */
export function doorOpen(t: number): number {
  if (t < T.door) return 0
  if (t < T.sent) return smooth(t, T.door, T.door + 0.5)
  if (t < T.open) return 1 - smooth(t, T.shut - 0.5, T.shut)
  return smooth(t, T.open, T.open + 0.5)
}

/** The hall: its tall window onto the sea, the bull's head and the old Duke's portrait on the back wall, the crate. */
function hall(g: Paint): void {
  const t = g.t
  roomBox(g, HALL.x0, HALL.x1, HALL.ceil, HALL.floor, 0.3)
  window(g, HALL.win.x, HALL.win.y0, HALL.win.y1, 1.1)
  const ctx = g.ctx
  // The window's light on the floor: a pale slab.
  poly(ctx, [[HALL.win.x + 1.1, HALL.floor - 0.01], [HALL.win.x + 3.4, HALL.floor - 0.01], [HALL.win.x + 2.9, HALL.floor + 0.2], [HALL.win.x + 1.1, HALL.floor + 0.2]])
  fill(ctx, rgba(AIR.low, 0.18))
  // The portrait: the old Duke in a matador's cape, dark in its frame.
  rect(ctx, HOOK[0] + 1.2, HOOK[1] + 0.05, 1.0, 1.35)
  fill(ctx, '#2A2520')
  stroke(g, '#5A4A35', 0.05)
  poly(ctx, [[HOOK[0] + 1.55, HOOK[1] + 1.25], [HOOK[0] + 1.7, HOOK[1] + 0.45], [HOOK[0] + 1.86, HOOK[1] + 1.25]])
  fill(ctx, '#6E2E26')
  ellipse(ctx, HOOK[0] + 1.7, HOOK[1] + 0.38, 0.08, 0.09)
  fill(ctx, '#7E6A55')
  // The bull's head: on its hook until it is lowered into the crate, a pull on each note.
  const drop = bullDrop(t)
  const chain = HOOK[1] - 0.25
  if (drop > 0) line(g, [HOOK[0], HALL.ceil], [HOOK[0], chain + drop], '#1C1A18', 0.03)
  const swing = drop > 0 && drop < CRATE_DEPTH() ? 0.03 * Math.sin(t * 3.1) : 0
  drawBull(g, { x: HOOK[0], y: HOOK[1] + drop, swing, dark: 0.15 })
  // The crate on the floor below it: its far side and floor drawn here, its near side over the head (`hallOver`).
  rect(ctx, CRATE.x - CRATE.w / 2, HALL.floor - CRATE.h, CRATE.w, CRATE.h)
  fill(ctx, '#4A3B2B')
}

/** How far the head has come down its chain into the crate (cells). */
const CRATE_DEPTH = () => HALL.floor - CRATE.h + 0.3 - (HOOK[1] + 0)
function bullDrop(t: number): number {
  if (t < T.lower[0]) return 0
  const depth = CRATE_DEPTH()
  const steps = T.lower.length
  return T.lower.reduce((d, at) => d + (depth / steps) * smooth(t, at, at + 0.7), 0)
}

/** The crate's near side and its lid, over the head going into it. */
function hallOver(g: Paint): void {
  const t = g.t
  const ctx = g.ctx
  const y0 = HALL.floor - CRATE.h
  rect(ctx, CRATE.x - CRATE.w / 2, y0 + 0.08, CRATE.w, CRATE.h - 0.08)
  fill(ctx, '#6A543B')
  for (const yy of [y0 + 0.22, y0 + 0.4]) line(g, [CRATE.x - CRATE.w / 2, yy], [CRATE.x + CRATE.w / 2, yy], '#4A3B2B', 0.025)
  const lid = smooth(t, T.lid - 0.35, T.lid)
  if (lid > 0) {
    const a = (1 - lid) * -1.25
    ctx.save()
    ctx.translate(CRATE.x - CRATE.w / 2, y0)
    ctx.rotate(a)
    rect(ctx, 0, -0.07, CRATE.w, 0.08)
    fill(ctx, '#6A543B')
    ctx.restore()
  }
}

/** How much the box burns at `t`, 0 to 1: from the needle at his neck, rising with each blow, gone when it is over. */
export function painAt(t: number): number {
  if (t < T.neck || t > T.over + 0.5) return 0
  let p = 0.35 * smooth(t, T.neck, T.neck + 2)
  for (const b of T.blows) p += 0.09 * smooth(t, b, b + 0.4)
  if (t >= T.worst) p += 0.12 * smooth(t, T.worst, T.worst + 0.25)
  return clamp01(p) * (1 - smooth(t, T.over, T.over + 0.45))
}

/**
 * The box over his hand in it, and the gom jabbar. The box is a black cube on the floor with a mouth in its side; his
 * near part is in it. Its heat is the pain: the seam round the mouth goes ember while it lasts (a flat line, no light
 * comes out of it). The needle is held from her, over the box, to his neck.
 */
function boxOver(g: Paint, paul: Pt): void {
  const ctx = g.ctx
  const t = g.t
  const x0 = BOX.x - BOX.w / 2
  const x1 = BOX.x + BOX.w / 2
  rect(ctx, x0, BOX.top, BOX.w, BOX.h)
  fill(ctx, '#0D0D0F')
  // Its top, a hair lighter, so it reads as a cube.
  poly(ctx, [[x0, BOX.top], [x1, BOX.top], [x1 - 0.06, BOX.top - 0.05], [x0 + 0.06, BOX.top - 0.05]])
  fill(ctx, '#232326')
  // The mouth on its east face, and its seam's heat.
  const m0 = BOX.top + 0.1
  const m1 = BOX.top + BOX.h - 0.05
  line(g, [x1, m0], [x1, m1], '#1E1E22', 0.03)
  const pain = painAt(t)
  if (pain > 0.01) line(g, [x1 - 0.012, m0 + 0.02], [x1 - 0.012, m1 - 0.02], mix('#3A1A10', '#C2552A', pain), 0.022)
  // The needle: from her, out over the box, its point at his neck from the swell to the end.
  const up = smooth(t, T.needle, T.neck) * (1 - smooth(t, T.over, T.over + 0.6))
  if (up > 0.002) {
    const from: Pt = [SEAT[0] + 0.22, SEAT[1] - 0.12]
    const to: Pt = [paul[0] + 0.02, paul[1] - 0.15]
    const lift = Math.sin(Math.PI * up) * 0.35
    const tip: Pt = [from[0] + (to[0] - from[0]) * up, from[1] + (to[1] - from[1]) * up - lift]
    line(g, from, tip, '#A3A8AB', 0.016)
  }
}

/** Everything of the castle drawn under the balls. */
export function castle(g: Paint): void {
  const v = g.view
  if (v.x1 < TOWER.x0 - 2 || v.x0 > BLOCK.x1 + 2 || v.y1 < TOWER.peak - 2 || v.y0 > CLIFF.top + 1) return
  section(g)
  paulsRoom(g)
  testRoom(g)
  hall(g)
}

/** The castle drawn over the balls: the box, the crate's near side, and its face while the camera is outside. */
export function castleOver(g: Paint, paul: Pt): void {
  const v = g.view
  if (v.x1 < TOWER.x0 - 2 || v.x0 > BLOCK.x1 + 2 || v.y1 < TOWER.peak - 2 || v.y0 > CLIFF.top + 1) return
  boxOver(g, paul)
  hallOver(g)
  exterior(g, faceAt(g.t))
}
