import type { Pt } from '../../../../../parts'
import { hash, knock, smooth } from '../kit'
import { blob, ctxOf, ellipse, flash, fillWith, glint, glow, line, mix, rect, rgba, ring, shape, vgrad, type Pen } from '../pen'
import {
  AT_GLASS,
  BACK,
  BACK_RIM,
  BENCH,
  BENCH_TOP,
  BLIND_TOP,
  BLOOM,
  CEIL,
  CRIES,
  CURTAIN,
  CUT,
  DADO,
  DOOR_HEAD,
  DOOR_LEAF,
  FAR_DOOR,
  FLOOR,
  FOOT_TOP,
  FOOT_X,
  FRONT,
  FRONT_RIM,
  GLASS,
  HEAD_TOP,
  HEAD_X,
  LANDS,
  LEAN,
  LOOK,
  MAT,
  NUDGE,
  NURSE_X,
  PILLOW,
  REACH,
  SILL,
  SILL_TOP,
  SPRING,
  STAND,
  STAND_TOP,
  TEARS,
  T0,
  WALL,
  WARD_WIN,
  liftOf,
  pillowTop,
} from './geo'
import { SON } from '../music'

/**
 * The ward at dawn, 1952: pale institutional mint and cream, white enamel, a checkerboard corridor, and the grey of the
 * first light through the tall window warming to gold over the rooftops and their water tanks as the song fades.
 */

export const C = {
  wallHi: '#E4E2CF',
  wallLo: '#A9C6B5',
  dado: '#86A897',
  base: '#4D6A5B',
  ceiling: '#D7D4C0',
  section: '#B3C4B8',
  sectionDark: '#93A99C',
  floorWard: '#B4BDAB',
  floorSeam: '#A0AA97',
  tileA: '#E6E2D2',
  tileB: '#3E5A4F',
  enamel: '#F2F1EA',
  enamelShade: '#C7CCC3',
  iron: '#8E9893',
  brass: '#C7A35C',
  blanket: '#F3F2EC',
  blanketShade: '#D3D8CE',
  stripe: '#AFCBBE',
  pillow: '#FAF9F3',
  sheet: '#FFFFFB',
  skyTop: '#8193A6',
  skyTopWarm: '#B9A688',
  skyLow: '#A9B3B8',
  skyLowWarm: '#F1C27E',
  roofs: '#6A7682',
  roofsWarm: '#6B5C59',
  curtain: '#E2EAE1',
  curtainShade: '#C4D2C7',
  door: '#9BBCAA',
  doorDark: '#789B89',
  wood: '#8C6B49',
  woodDark: '#5E4631',
  frame: '#EEEEE7',
  frameShade: '#C9CCC2',
  nurseryWall: '#EDF0E6',
  nurse: '#FBFBF6',
  nurseShade: '#D6DAD3',
  skin: '#E2B693',
  hair: '#4A3528',
  band: '#2C2C2C',
  babySkin: '#EFC5AA',
  cry: '#E59486',
  mouth: '#5E2A2A',
  hoodBlue: '#BCD4E6',
  hoodPink: '#ECC7D0',
  blind: '#E8DFC5',
  blindShade: '#D2C6A6',
  gold: '#F6CB86',
  dawn: '#FFE7B8',
  glass: '#DCEAF0',
}

/** How far the dawn has come: grey-blue at the cut, gold by the end. */
export const warm = (t: number): number => smooth(t, T0 - 4, T0 + 58)

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/* ------------------------------------------------------------------ small hands */

function limb(pen: Pen, a: Pt, b: Pt, width: number, col: string): void {
  const { p, k } = pen
  p.stroke(pen.tone(col))
  p.strokeWeight(width * k)
  p.strokeCap(p.ROUND)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.strokeCap(p.ROUND)
}

/** Clip to the nursery's glass (minus a hole round Marty, who is in front of it). Call `ctx.restore()` after. */
function clipGlass(pen: Pen, hole: Pt | null): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  ctx.rect(GLASS.x0 * k, GLASS.y0 * k, (GLASS.x1 - GLASS.x0) * k, (GLASS.y1 - GLASS.y0) * k)
  if (hole) {
    ctx.moveTo((hole[0] + 0.155) * k, hole[1] * k)
    ctx.arc(hole[0] * k, hole[1] * k, 0.155 * k, 0, Math.PI * 2)
  }
  ctx.clip('evenodd')
}

/* ------------------------------------------------------------------ the set */

export function drawSet(pen: Pen, t: number, f: Frame): void {
  const w = warm(t)
  // The wall everywhere: cream above the dado, mint below.
  rect(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, C.wallHi)
  rect(pen, f.x0 - 1, DADO, f.x1 + 1, FLOOR, C.wallLo)
  rect(pen, f.x0 - 1, DADO - 0.05, f.x1 + 1, DADO + 0.02, C.dado)
  rect(pen, f.x0 - 1, FLOOR - 0.16, f.x1 + 1, FLOOR, C.base)
  rect(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, CEIL, C.ceiling)
  rect(pen, f.x0 - 1, CEIL, f.x1 + 1, CEIL + 0.08, C.frameShade)
  // The morning on the walls: grey at first, then gold, coming from the ward's window and out through its door.
  const morning = mix('#C9D3DA', C.gold, w)
  glow(pen, [0.5, -2.2], 6.5, morning, 0.18 + 0.2 * w)
  glow(pen, [-4.6, -0.4], 3.6, morning, 0.1 + 0.18 * w)
  glow(pen, [-9.4, -1.6], 5.5, morning, 0.05 + 0.16 * w)
  drawFloor(pen, f, w)
  drawWardWindow(pen, t, w)
  drawCurtain(pen, f)
  drawStand(pen, w)
  drawBed(pen, w)
  drawWardWall(pen)
  drawFarDoor(pen)
}

function drawFloor(pen: Pen, f: Frame, w: number): void {
  const hy = -1.4
  const H = FLOOR - hy
  const vx = f.cx
  const yb = f.y1 + 0.5
  const X = (xb: number, y: number) => vx + ((xb - vx) * (y - hy)) / H
  rect(pen, f.x0 - 1, FLOOR, f.x1 + 1, yb, C.floorWard)
  // The ward's linoleum: long seams in the light.
  const door = (WALL[0] + WALL[1]) / 2
  for (let xb = door; xb < f.x1 + 30; xb += 1.4) shape(pen, [[xb, FLOOR], [xb + 0.025, FLOOR], [X(xb + 0.025, yb), yb], [X(xb, yb), yb]], C.floorSeam)
  // The corridor's checkerboard.
  const rows: number[] = [FLOOR]
  for (let j = 1; j < 9; j++) {
    const y = hy + H / (1 - j * 0.1)
    rows.push(y)
    if (y > yb) break
  }
  const T = 0.72
  shape(pen, [[f.x0 - 60, FLOOR], [door, FLOOR], [X(door, yb), yb], [f.x0 - 60, yb]], C.tileA)
  const xmin = Math.min(f.x0, vx + ((f.x0 - vx) * H) / (yb - hy)) - 2
  for (let i = 0; ; i++) {
    const a = door - (i + 1) * T
    const b = door - i * T
    if (b < xmin - 4) break
    for (let j = 0; j + 1 < rows.length; j++) {
      if ((i + j) % 2 === 0) continue
      const y0 = rows[j]
      const y1 = rows[j + 1]
      shape(pen, [[X(a, y0), y0], [X(b, y0), y0], [X(b, y1), y1], [X(a, y1), y1]], C.tileB)
    }
  }
  // A soft sheen on the floor from the window, and the shade under the wall.
  glow(pen, [-2.0, FLOOR + 0.4], 3.2, mix('#DDE4E6', C.gold, w), 0.2 + 0.15 * w)
  vgrad(pen, f.x0 - 1, FLOOR, f.x1 + 1, FLOOR + 0.25, [
    [0, '#2A3530', 0.22],
    [1, '#2A3530', 0],
  ])
  // The threshold.
  shape(pen, [[WALL[0] - 0.05, FLOOR], [WALL[1] + 0.05, FLOOR], [X(WALL[1] + 0.05, FLOOR + 0.3), FLOOR + 0.3], [X(WALL[0] - 0.05, FLOOR + 0.3), FLOOR + 0.3]], C.frameShade)
}

/** The tall window behind the bed: the city's roofs and water tanks against the dawn. */
function drawWardWindow(pen: Pen, t: number, w: number): void {
  const { x0, x1, y0, y1 } = WARD_WIN
  rect(pen, x0 - 0.16, y0 - 0.16, x1 + 0.16, y1 + 0.2, C.frameShade)
  vgrad(pen, x0, y0, x1, y1, [
    [0, mix(C.skyTop, C.skyTopWarm, w), 1],
    [0.62, mix('#9FAAB4', '#E6BE8C', w), 1],
    [1, mix(C.skyLow, C.skyLowWarm, w), 1],
  ])
  // The sun, still under the roofs, lifting the sky over them.
  glow(pen, [x0 + 1.8, y1 - 0.3], 2.2, mix('#D8D2C6', '#FFD79A', w), 0.25 + 0.55 * w)
  // Far roofs, then near roofs with their water tanks.
  const roofs = mix(C.roofs, C.roofsWarm, w)
  const far = mix('#7E8B96', '#9C8274', w)
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * pen.k, y0 * pen.k, (x1 - x0) * pen.k, (y1 - y0) * pen.k)
  ctx.clip()
  const farPts: Pt[] = [[x0, y1]]
  for (let i = 0; i <= 9; i++) {
    const x = x0 + ((x1 - x0) * i) / 9
    const h = 0.62 + hash(i, 3) * 0.4
    farPts.push([x, y1 - h], [x + (x1 - x0) / 9, y1 - h])
  }
  farPts.push([x1, y1])
  shape(pen, farPts, far)
  const nearPts: Pt[] = [[x0, y1]]
  for (let i = 0; i <= 5; i++) {
    const x = x0 + ((x1 - x0) * i) / 5
    const h = 0.3 + hash(i, 7) * 0.25
    nearPts.push([x, y1 - h], [x + (x1 - x0) / 5 - 0.05, y1 - h])
  }
  nearPts.push([x1, y1])
  shape(pen, nearPts, roofs)
  for (const [tx, ty, s] of [[x0 + 0.55, y1 - 0.62, 0.9], [x0 + 1.95, y1 - 0.66, 0.7]] as [number, number, number][]) {
    // Legs, the tank's staves, its cone of a roof.
    line(pen, [tx - 0.15 * s, ty], [tx - 0.17 * s, ty + 0.35 * s], roofs, 0.8)
    line(pen, [tx + 0.15 * s, ty], [tx + 0.17 * s, ty + 0.35 * s], roofs, 0.8)
    rect(pen, tx - 0.22 * s, ty - 0.42 * s, tx + 0.22 * s, ty, roofs)
    shape(pen, [[tx - 0.25 * s, ty - 0.42 * s], [tx, ty - 0.62 * s], [tx + 0.25 * s, ty - 0.42 * s]], roofs)
    line(pen, [tx - 0.22 * s, ty - 0.2 * s], [tx + 0.22 * s, ty - 0.2 * s], far, 0.5)
  }
  // A thread of smoke from a chimney, slow.
  for (let i = 0; i < 5; i++) {
    const u = ((t * 0.08 + i / 5) % 1) as number
    glow(pen, [x1 - 0.7 + u * 0.3, y1 - 0.9 - u * 1.2], 0.18 + u * 0.2, mix('#C7CDD2', '#F2D9B5', w), 0.25 * (1 - u))
  }
  ctx.restore()
  // The sashes and their bars.
  const fr = C.frame
  rect(pen, x0 - 0.06, y0 - 0.06, x1 + 0.06, y0 + 0.04, fr)
  rect(pen, x0 - 0.06, y1 - 0.04, x1 + 0.06, y1 + 0.06, fr)
  rect(pen, x0 - 0.06, y0, x0 + 0.04, y1, fr)
  rect(pen, x1 - 0.04, y0, x1 + 0.06, y1, fr)
  const mx = (x0 + x1) / 2
  rect(pen, mx - 0.04, y0, mx + 0.04, y1, fr)
  const my = (y0 + y1) / 2
  rect(pen, x0, my - 0.06, x1, my + 0.06, fr)
  for (const yy of [y0 + (y1 - y0) / 4, y0 + (3 * (y1 - y0)) / 4]) rect(pen, x0, yy - 0.025, x1, yy + 0.025, fr)
  // The sill, deep.
  rect(pen, x0 - 0.25, y1 + 0.06, x1 + 0.25, y1 + 0.16, C.enamel)
  rect(pen, x0 - 0.25, y1 + 0.16, x1 + 0.25, y1 + 0.2, C.frameShade)
}

function drawCurtain(pen: Pen, f: Frame): void {
  const [x0] = CURTAIN
  const x1 = Math.max(CURTAIN[1], f.x1 + 1)
  line(pen, [x0 - 0.1, -4.55], [x1, -4.55], C.iron, 1.2)
  rect(pen, x0, -4.5, x1, 1.0, C.curtain)
  for (let x = x0; x < x1; x += 0.3) {
    const i = Math.round((x - x0) / 0.3)
    shape(pen, [[x + 0.1, -4.5], [x + 0.24, -4.5], [x + 0.26, 1.0], [x + 0.12, 1.0]], C.curtainShade)
    if (i % 2 === 0) ellipse(pen, [x + 0.05, -4.52], 0.04, 0.04, null, 0.6, C.iron)
  }
  // Its hem, and the light through it.
  shape(pen, Array.from({ length: 30 }, (_, i): Pt => [x0 + ((x1 - x0) * i) / 29, 1.0 + 0.03 * Math.sin(i * 1.9)]).concat([[x1, 0.92], [x0, 0.92]]), C.curtainShade)
  rect(pen, x0, -4.5, x0 + 0.06, 1.0, C.curtainShade)
}

function drawStand(pen: Pen, w: number): void {
  const [x0, x1] = STAND
  const y = STAND_TOP
  shape(pen, [[x0, y], [x1, y], [x1 + 0.12, y - 0.1], [x0 + 0.12, y - 0.1]], C.enamel)
  rect(pen, x0, y, x1, FLOOR - 0.12, C.wallLo)
  rect(pen, x0, y, x1, y + 0.05, C.enamel)
  rect(pen, x0 + 0.04, y + 0.12, x1 - 0.04, y + 0.42, mix(C.wallLo, '#FFFFFF', 0.25))
  ellipse(pen, [(x0 + x1) / 2, y + 0.27], 0.03, 0.03, C.iron)
  rect(pen, x0, FLOOR - 0.12, x0 + 0.05, FLOOR, C.iron)
  rect(pen, x1 - 0.05, FLOOR - 0.12, x1, FLOOR, C.iron)
  // A glass of water, and a bud vase with one pale flower.
  const gx = x0 + 0.17
  shape(pen, [[gx - 0.07, y - 0.32], [gx + 0.07, y - 0.32], [gx + 0.06, y - 0.05], [gx - 0.06, y - 0.05]], C.glass)
  rect(pen, gx - 0.06, y - 0.2, gx + 0.06, y - 0.05, mix(C.glass, '#AFC7D0', 0.4))
  glint(pen, [gx + 0.03, y - 0.25], 0.06, '#FFFFFF', 0.5 + 0.3 * w)
  const vx = x1 - 0.17
  shape(pen, [[vx - 0.05, y - 0.05], [vx + 0.05, y - 0.05], [vx + 0.04, y - 0.22], [vx + 0.015, y - 0.3], [vx - 0.015, y - 0.3], [vx - 0.04, y - 0.22]], '#C8D8DA')
  line(pen, [vx, y - 0.3], [vx - 0.03, y - 0.62], '#6F8F67', 0.8)
  line(pen, [vx - 0.02, y - 0.45], [vx + 0.07, y - 0.5], '#6F8F67', 0.7)
  ellipse(pen, [vx - 0.035, y - 0.67], 0.06, 0.05, '#F0E2A6')
  ellipse(pen, [vx - 0.035, y - 0.69], 0.03, 0.025, '#F7EFC8')
}

/** Depth: where the bed's far side is drawn, up and to the right of its near side. */
const D: Pt = [0.22, -0.2]

function drawBed(pen: Pen, w: number): void {
  const nearY = MAT + 0.1
  const xf = FOOT_X
  const xh = HEAD_X
  // Under the bed: its shadow on the floor.
  glow(pen, [(xf + xh) / 2, FLOOR + 0.02], 1.8, '#2B3832', 0.22)
  // The far posts and boards.
  const far = C.enamelShade
  limb(pen, [xf + D[0], FOOT_TOP + D[1]], [xf + D[0], FLOOR - 0.05 + D[1]], 0.06, far)
  limb(pen, [xh + D[0], HEAD_TOP + D[1]], [xh + D[0], FLOOR - 0.05 + D[1]], 0.06, far)
  // The headboard: an arch of tube between the posts, and its spindles.
  for (let i = 1; i <= 3; i++) {
    const u = i / 4
    limb(pen, [xh + D[0] * u, HEAD_TOP + 0.14 + D[1] * u], [xh + D[0] * u, nearY + D[1] * u], 0.025, far)
    limb(pen, [xf + D[0] * u, FOOT_TOP + 0.1 + D[1] * u], [xf + D[0] * u, nearY + D[1] * u], 0.025, far)
  }
  limb(pen, [xh, HEAD_TOP + 0.06], [xh + D[0], HEAD_TOP + D[1] + 0.06], 0.05, C.enamel)
  limb(pen, [xf, FOOT_TOP + 0.05], [xf + D[0], FOOT_TOP + D[1] + 0.05], 0.05, C.enamel)
  // The mattress, under the blanket: its top face and its near side, the blanket hanging over it.
  shape(pen, [[xf + 0.04, nearY], [xh - 0.04, nearY], [xh - 0.04 + D[0], nearY + D[1]], [xf + 0.04 + D[0], nearY + D[1]]], C.blanket)
  const hem: Pt[] = []
  for (let i = 0; i <= 24; i++) {
    const x = xf + 0.02 + ((xh - xf - 0.04) * i) / 24
    hem.push([x, 0.66 + 0.035 * Math.sin(i * 1.3) + 0.02 * Math.sin(i * 0.5)])
  }
  shape(pen, [[xf + 0.02, nearY], [xh - 0.02, nearY], ...hem.reverse()], C.blanket)
  // Its folds, and the stripe at its foot.
  for (let i = 0; i < 7; i++) {
    const x = xf + 0.3 + i * 0.37
    shape(pen, [[x, nearY + 0.03], [x + 0.05, nearY + 0.03], [x + 0.08, 0.64], [x + 0.01, 0.66]], C.blanketShade)
  }
  shape(pen, [[xf + 0.18, nearY], [xf + 0.34, nearY], [xf + 0.36, 0.68], [xf + 0.2, 0.68]], C.stripe)
  shape(pen, [[xf + 0.18, nearY], [xf + 0.34, nearY], [xf + 0.34 + D[0], nearY + D[1]], [xf + 0.18 + D[0], nearY + D[1]]], C.stripe)
  // The pillow, plump, at the head.
  const pts: Pt[] = []
  for (let i = 0; i <= 24; i++) {
    const x = PILLOW[0] + ((PILLOW[1] - PILLOW[0]) * i) / 24
    pts.push([x, pillowTop(x)])
  }
  shape(pen, [...pts, [PILLOW[1], nearY - 0.02], [PILLOW[0], nearY - 0.02]], C.pillow)
  shape(pen, [[PILLOW[0] + 0.15, nearY - 0.06], [PILLOW[1] - 0.12, nearY - 0.06], [PILLOW[1] - 0.2, nearY - 0.02], [PILLOW[0] + 0.2, nearY - 0.02]], C.blanketShade)
  // The turned-down sheet across the blanket, under the pillow's edge.
  shape(pen, [[0.05, nearY], [0.32, nearY], [0.32 + D[0], nearY + D[1]], [0.05 + D[0], nearY + D[1]]], C.sheet)
  // The side rail, the legs and their casters.
  limb(pen, [xf, 0.62], [xh, 0.62], 0.05, C.enamel)
  for (const x of [xf, xh]) {
    ellipse(pen, [x, FLOOR - 0.05], 0.05, 0.05, C.iron)
  }
  // The near posts, the footboard's and the headboard's, with their brass knobs.
  limb(pen, [xf, FOOT_TOP], [xf, FLOOR - 0.08], 0.07, C.enamel)
  limb(pen, [xh, HEAD_TOP], [xh, FLOOR - 0.08], 0.07, C.enamel)
  line(pen, [xf + 0.03, FOOT_TOP], [xf + 0.03, FLOOR - 0.1], C.enamelShade, 0.6)
  line(pen, [xh + 0.03, HEAD_TOP], [xh + 0.03, FLOOR - 0.1], C.enamelShade, 0.6)
  for (const [x, y] of [[xf, FOOT_TOP], [xh, HEAD_TOP], [xf + D[0], FOOT_TOP + D[1]], [xh + D[0], HEAD_TOP + D[1]]] as Pt[]) {
    ellipse(pen, [x, y - 0.05], 0.055, 0.055, C.brass)
    ellipse(pen, [x - 0.015, y - 0.065], 0.02, 0.02, mix(C.brass, '#FFF3C8', 0.6))
  }
  // A blank chart on a clipboard, hung on the foot.
  rect(pen, xf - 0.2, -0.3, xf + 0.02, 0.05, C.woodDark)
  rect(pen, xf - 0.18, -0.25, xf, 0.03, '#F4F1E4')
  rect(pen, xf - 0.13, -0.32, xf - 0.05, -0.26, C.iron)
  // The window's light on the blanket.
  glow(pen, [0.2, 0.05], 1.6, mix('#E8ECEE', C.gold, w), 0.2 + 0.18 * w)
}

/** The ward's wall, in section above its open door, and the door folded back against the corridor wall. */
function drawWardWall(pen: Pen): void {
  const [a, b] = DOOR_LEAF
  // The door: open, against the corridor's wall; its round window and its kick plate.
  rect(pen, a - 0.08, DOOR_HEAD - 0.08, b + 0.08, FLOOR, C.frame)
  rect(pen, a, DOOR_HEAD, b, FLOOR - 0.02, C.door)
  rect(pen, a + 0.1, FLOOR - 0.4, b - 0.1, FLOOR - 0.1, mix(C.iron, '#FFFFFF', 0.3))
  ellipse(pen, [(a + b) / 2, DOOR_HEAD + 0.75], 0.26, 0.26, C.frame)
  ellipse(pen, [(a + b) / 2, DOOR_HEAD + 0.75], 0.2, 0.2, mix(C.glass, '#8FA6AE', 0.35))
  rect(pen, a + 0.15, DOOR_HEAD + 1.25, b - 0.15, DOOR_HEAD + 1.3, C.doorDark)
  ellipse(pen, [b - 0.12, DOOR_HEAD + 1.4], 0.04, 0.04, C.brass)
  // The wall, cut: from the ceiling down to the door's head; its casing.
  const [w0, w1] = WALL
  rect(pen, w0, CEIL - 1, w1, DOOR_HEAD, C.section)
  rect(pen, w0, DOOR_HEAD - 0.12, w1, DOOR_HEAD, C.sectionDark)
  rect(pen, w0 - 0.1, DOOR_HEAD - 0.16, w0, FLOOR, C.frame)
  rect(pen, w1, DOOR_HEAD - 0.16, w1 + 0.1, FLOOR, C.frame)
}

function drawFarDoor(pen: Pen): void {
  const [a, b] = FAR_DOOR
  rect(pen, a - 0.1, DOOR_HEAD - 0.1, b + 0.1, FLOOR, C.frame)
  rect(pen, a, DOOR_HEAD, b, FLOOR - 0.02, C.door)
  rect(pen, a + 0.12, DOOR_HEAD + 1.45, b - 0.12, FLOOR - 0.15, C.doorDark)
  ellipse(pen, [(a + b) / 2, DOOR_HEAD + 0.7], 0.25, 0.25, C.frame)
  ellipse(pen, [(a + b) / 2, DOOR_HEAD + 0.7], 0.19, 0.19, mix(C.glass, '#8FA6AE', 0.45))
  ellipse(pen, [a + 0.13, DOOR_HEAD + 1.35], 0.045, 0.045, C.brass)
}

/* ------------------------------------------------------------------ the part, under the balls */

/** The surface under a point, for its shadow. */
function groundAt(x: number): number {
  if (x >= FOOT_X && x <= HEAD_X) return x >= PILLOW[0] ? pillowTop(x) : MAT
  if (x >= BENCH[0] && x <= BENCH[1]) return BENCH_TOP
  if (x >= SILL[0] && x <= SILL[1]) return SILL_TOP
  return FLOOR
}

function shadow(pen: Pen, b: Pt, r: number, a: number): void {
  const g = groundAt(b[0])
  const h = Math.max(0, g - (b[1] + r))
  const u = Math.max(0, 1 - h / 1.6)
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.fillStyle = rgba(pen, '#27302B', a * u)
  ctx.beginPath()
  ctx.ellipse(b[0] * k, (g - 0.01) * k, r * (0.9 + 0.6 * (1 - u)) * k, r * 0.26 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawPart(pen: Pen, t: number, marty: Pt, rachel: Pt, baby: Pt): void {
  const w = warm(t)
  // The first light on the brass knob, on the cut.
  const knob: Pt = [FOOT_X - 0.015, FOOT_TOP - 0.065]
  glint(pen, knob, 0.22, '#FFF4D2', 0.95 * flash(t - CUT, 0.45) + 0.15 + 0.2 * w)
  // The blanket gives under him as he springs off the foot.
  const give = knock(t - SPRING, 0.3)
  if (give > 0.01) {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    ctx.save()
    ctx.fillStyle = rgba(pen, '#6E7C74', 0.35 * give)
    ctx.beginPath()
    ctx.ellipse(-0.62 * k, (MAT + 0.04) * k, (0.3 * give + 0.1) * k, 0.045 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // The glow between them, as he tells her.
  const on = smooth(t, BLOOM - 0.08, BLOOM + 0.5) * (1 - smooth(t, NUDGE + 0.2, SPRING + 0.8))
  if (on > 0.003) {
    const swell = 0.4 * flash(t - BLOOM, 0.35) + 0.5 * flash(t - LEAN, 0.6) + 0.06 * Math.sin((t - BLOOM) * 3.1)
    const c: Pt = [(marty[0] + rachel[0]) / 2, (marty[1] + rachel[1]) / 2 - 0.02]
    glow(pen, c, 0.55 + 0.25 * swell, '#FFD69A', 0.55 * on * (0.8 + swell))
    glow(pen, c, 0.16 + 0.05 * swell, '#FFF1D6', 0.6 * on)
  }
  // Their shadows, and his on what he crosses.
  shadow(pen, rachel, 0.13, 0.2)
  if (t < SON + 2 || marty[1] < SILL_TOP) shadow(pen, marty, 0.13, 0.28)
  // His landings on the floor: a little light off the tile.
  for (const l of LANDS.slice(0, 2)) {
    const f = flash(t - l, 0.3)
    if (f > 0.01) {
      const x = laneX(l)
      glow(pen, [x, FLOOR + 0.08], 0.55, '#FFF6E0', 0.55 * f)
    }
  }
  drawBench(pen, t)
  drawNursery(pen, t, w, baby)
  const out = smooth(t, SON, BLIND_TOP)
  if (out > 0.002) {
    glow(pen, [(GLASS.x0 + GLASS.x1) / 2 + 1.2, SILL_TOP + 0.2], 3.2, mix('#FFF6E4', C.gold, w), (0.14 + 0.3 * flash(t - SON, 0.7)) * out)
  }
}

/** Where he lands at each landing time (the floor's lands are the first two). */
const laneX = (t: number): number => (t === LANDS[0] ? -2.6 : t === LANDS[1] ? -4.4 : -6.3)

function drawBench(pen: Pen, t: number): void {
  const [a, b] = BENCH
  const dy = 0.02 * ring(t - LANDS[2], 9, 0.16)
  const y = BENCH_TOP + dy
  glow(pen, [(a + b) / 2, FLOOR], 1.3, '#2B3832', 0.16)
  rect(pen, a + 0.15, y + 0.08, a + 0.25, FLOOR - 0.02, C.woodDark)
  rect(pen, b - 0.25, y + 0.08, b - 0.15, FLOOR - 0.02, C.woodDark)
  rect(pen, a + 0.2, 0.95, b - 0.2, 1.0, C.woodDark)
  shape(pen, [[a, y], [b, y], [b + 0.12, y - 0.1], [a + 0.12, y - 0.1]], mix(C.wood, '#FFFFFF', 0.12))
  rect(pen, a, y, b, y + 0.09, C.wood)
  line(pen, [a, y + 0.09], [b, y + 0.09], C.woodDark, 0.6)
}

/* ------------------------------------------------------------------ the nursery */

/** How open a crying baby's mouth is at `t`. */
function cryOf(t: number, i: number): number {
  let v = 0
  for (const [c, who] of CRIES) {
    if (who !== i) continue
    const s = t - c
    if (s < 0 || s > 1.6) continue
    v = Math.max(v, s < 0.35 ? Math.min(1, s / 0.05) : Math.exp(-(s - 0.35) / 0.3))
  }
  return v
}

function bassinet(pen: Pen, x: number, rim: number, s: number, legs: boolean): void {
  const hw = 0.39 * s
  const d = 0.3 * s
  if (legs) {
    line(pen, [x - hw + 0.08, rim + d], [x + hw - 0.08, SILL_TOP + 0.1], C.iron, 0.8)
    line(pen, [x + hw - 0.08, rim + d], [x - hw + 0.08, SILL_TOP + 0.1], C.iron, 0.8)
  }
  shape(pen, [[x - hw, rim], [x + hw, rim], [x + hw - 0.06 * s, rim + d], [x - hw + 0.06 * s, rim + d]], C.enamel)
  rect(pen, x - hw, rim, x + hw, rim + 0.04 * s, C.frameShade)
  line(pen, [x - hw + 0.05, rim + d * 0.55], [x + hw - 0.05, rim + d * 0.55], C.enamelShade, 0.5)
}

/** A newborn, drawn: swaddled, the head at the right, a knit cap; crying when `cry` is up. */
function newborn(pen: Pen, x: number, rim: number, s: number, cry: number, hood: string): void {
  const jig = 0.012 * s * Math.sin(cry * 40) * cry
  ellipse(pen, [x - 0.08 * s, rim - 0.055 * s + jig], 0.25 * s, 0.085 * s, C.sheet)
  line(pen, [x - 0.2 * s, rim - 0.06 * s + jig], [x + 0.05 * s, rim - 0.1 * s + jig], C.blanketShade, 0.5)
  const head: Pt = [x + 0.17 * s, rim - 0.08 * s + jig]
  ellipse(pen, head, 0.072 * s, 0.072 * s, mix(C.babySkin, C.cry, 0.6 * cry))
  // The cap, over the top and back of the head.
  const { p, k } = pen
  p.noStroke()
  p.fill(pen.tone(hood))
  p.arc(head[0] * k, head[1] * k, 0.17 * s * k, 0.17 * s * k, Math.PI * 0.95, Math.PI * 1.9, p.PIE)
  if (cry > 0.02) {
    ellipse(pen, [head[0] + 0.02 * s, head[1] + 0.02 * s], 0.02 * s * (0.5 + cry), 0.024 * s * cry, C.mouth)
    // A small fist up out of the blanket.
    ellipse(pen, [x - 0.02 * s, rim - 0.13 * s - 0.05 * s * cry], 0.03 * s, 0.03 * s, mix(C.babySkin, C.cry, 0.4))
  }
}

/** Head bowed to the bassinet before LOOK; up to the glass after; leaning in to reach, straightening as she lifts. */
export function nurseOf(t: number, baby: Pt): { lean: number; head: Pt; shoulders: [Pt, Pt]; hands: [Pt, Pt]; look: number } {
  const reach = smooth(t, REACH - 0.05, REACH + 0.45)
  const lift = liftOf(t)
  const lean = reach * (1 - 0.65 * lift)
  const look = smooth(t, LOOK - 0.02, LOOK + 0.22)
  const nod = 0.03 * ring(t - LOOK, 2.2, 0.35)
  const lx = 0.13 * lean
  const ly = 0.07 * lean
  const x = NURSE_X
  const head: Pt = [x + 0.03 + lx * 1.3 + 0.06 * (1 - look) + 0.03 * lift, -1.53 + ly * 1.2 + 0.05 * (1 - look) + nod]
  const shoulders: [Pt, Pt] = [
    [x - 0.27 + lx, -1.24 + ly],
    [x + 0.27 + lx, -1.24 + ly],
  ]
  const rest: [Pt, Pt] = [
    [x - 0.06, -0.5],
    [x + 0.1, -0.52],
  ]
  const on: [Pt, Pt] = [
    [baby[0] - 0.25, baby[1] + 0.05],
    [baby[0] + 0.1, baby[1] + 0.08],
  ]
  const hands: [Pt, Pt] = [
    [rest[0][0] + (on[0][0] - rest[0][0]) * reach, rest[0][1] + (on[0][1] - rest[0][1]) * reach],
    [rest[1][0] + (on[1][0] - rest[1][0]) * reach, rest[1][1] + (on[1][1] - rest[1][1]) * reach],
  ]
  return { lean, head, shoulders, hands, look }
}

function drawNurse(pen: Pen, t: number, baby: Pt): void {
  const n = nurseOf(t, baby)
  const x = NURSE_X
  const [sl, sr] = n.shoulders
  // Her uniform: shoulders to waist, the skirt below the sill.
  shape(pen, [sl, sr, [x + 0.22, -0.3], [x + 0.36, 0.4], [x - 0.36, 0.4], [x - 0.22, -0.3]], C.nurse)
  shape(pen, [[x + 0.05 + (sl[0] - x + 0.27), -1.2 + (sl[1] + 1.24)], [x + 0.22, -0.3], [x + 0.36, 0.4], [x + 0.15, 0.4]], C.nurseShade)
  rect(pen, x - 0.23, -0.42, x + 0.23, -0.36, C.nurseShade)
  // Neck, head, hair in a bun, and the cap with its black band.
  rect(pen, n.head[0] - 0.045, n.head[1] + 0.1, n.head[0] + 0.045, (sl[1] + sr[1]) / 2 + 0.04, mix(C.skin, '#B98A6E', 0.25))
  const mid = (sl[0] + sr[0]) / 2
  shape(pen, [[mid - 0.15, sl[1] - 0.01], [mid, sl[1] + 0.13], [mid + 0.15, sr[1] - 0.01], [mid + 0.12, sr[1] + 0.06], [mid, sl[1] + 0.19], [mid - 0.12, sl[1] + 0.06]], C.nurseShade)
  ellipse(pen, [n.head[0] - 0.19, n.head[1] - 0.04], 0.085, 0.085, C.hair)
  ellipse(pen, n.head, 0.19, 0.2, C.skin)
  const { p, k } = pen
  p.noStroke()
  p.fill(pen.tone(C.hair))
  const hy = n.head[1] - 0.035 + 0.06 * (1 - n.look)
  p.arc(n.head[0] * k, hy * k, 0.41 * k, 0.4 * k, Math.PI * 0.98, Math.PI * 2.02, p.CHORD)
  const cy = n.head[1] - 0.2
  shape(pen, [[n.head[0] - 0.17, cy + 0.04], [n.head[0] + 0.15, cy + 0.04], [n.head[0] + 0.11, cy - 0.12], [n.head[0] - 0.13, cy - 0.12]], C.nurse)
  rect(pen, n.head[0] - 0.165, cy - 0.01, n.head[0] + 0.145, cy + 0.025, C.band)
  // A face turned to the glass: the faint line of a smile once she looks up.
  if (n.look > 0.1) {
    const fx = n.head[0] + 0.02
    line(pen, [fx - 0.05, n.head[1] + 0.08], [fx + 0.04, n.head[1] + 0.08], mix(C.skin, '#8A5A48', 0.6 * n.look), 0.5)
    ellipse(pen, [fx - 0.065, n.head[1] + 0.02], 0.014, 0.014, '#4A3A30')
    ellipse(pen, [fx + 0.065, n.head[1] + 0.02], 0.014, 0.014, '#4A3A30')
  }
}

function drawArms(pen: Pen, t: number, baby: Pt): void {
  const n = nurseOf(t, baby)
  for (let i = 0; i < 2; i++) {
    const s = n.shoulders[i]
    const h = n.hands[i]
    const elbow: Pt = [(s[0] + h[0]) / 2 + (i === 0 ? -0.1 : 0.06), (s[1] + h[1]) / 2 + 0.12]
    limb(pen, s, elbow, 0.14, C.nurseShade)
    limb(pen, elbow, h, 0.11, C.nurseShade)
    limb(pen, s, elbow, 0.11, C.nurse)
    limb(pen, elbow, h, 0.08, C.nurse)
    limb(pen, [elbow[0] + (h[0] - elbow[0]) * 0.75, elbow[1] + (h[1] - elbow[1]) * 0.75], h, 0.06, C.skin)
  }
}

function drawNursery(pen: Pen, t: number, w: number, baby: Pt): void {
  const { x0, x1, y0, y1 } = GLASS
  clipGlass(pen, null)
  // The nursery's own room: a pale wall, a window on the same morning, its light.
  rect(pen, x0, y0, x1, y1, C.nurseryWall)
  rect(pen, x0, -0.75, x1, y1, mix(C.nurseryWall, C.wallLo, 0.4))
  const wx0 = -11.35
  const wx1 = -10.0
  vgrad(pen, wx0, -1.95, wx1, -0.9, [
    [0, mix(C.skyTop, C.skyTopWarm, w), 1],
    [1, mix(C.skyLow, C.skyLowWarm, w), 1],
  ])
  shape(pen, [[wx0, -0.9], [wx0, -1.2], [wx0 + 0.3, -1.2], [wx0 + 0.3, -1.32], [wx0 + 0.7, -1.32], [wx0 + 0.7, -1.15], [wx1, -1.15], [wx1, -0.9]], mix(C.roofs, C.roofsWarm, w))
  rect(pen, wx0 - 0.05, -2.0, wx1 + 0.05, -1.92, C.frame)
  rect(pen, wx0 - 0.05, -0.95, wx1 + 0.05, -0.88, C.frame)
  rect(pen, (wx0 + wx1) / 2 - 0.03, -1.95, (wx0 + wx1) / 2 + 0.03, -0.9, C.frame)
  glow(pen, [-10.6, -1.3], 2.6, mix('#E4ECEC', C.gold, w), 0.2 + 0.3 * w)
  // The back row, the nurse, the front row; the son's own bassinet, his blanket over him drawn after (over the ball).
  BACK.forEach((x, i) => {
    bassinet(pen, x, BACK_RIM, 0.8, true)
    newborn(pen, x, BACK_RIM, 0.8, cryOf(t, 3 + i), i % 2 ? C.hoodPink : C.hoodBlue)
  })
  drawNurse(pen, t, baby)
  FRONT.forEach((x, i) => {
    bassinet(pen, x, FRONT_RIM, 1, false)
    if (i > 0) newborn(pen, x, FRONT_RIM, 1, cryOf(t, i - 1), i % 2 ? C.hoodPink : C.hoodBlue)
  })
  drawArms(pen, t, baby)
  // The blind's roller, under the window's head.
  rect(pen, x0, y0, x1, y0 + 0.09, C.blindShade)
  line(pen, [x0, y0 + 0.09], [x1, y0 + 0.09], C.woodDark, 0.5)
  ctxOf(pen.p).restore()
  // The window's frame, white enamel, and the deep sill he sits on.
  rect(pen, x0 - 0.12, y0 - 0.12, x1 + 0.12, y0, C.frame)
  rect(pen, x0 - 0.12, y0, x0, y1, C.frame)
  rect(pen, x1, y0, x1 + 0.12, y1, C.frame)
  rect(pen, SILL[0], SILL_TOP, SILL[1], SILL_TOP + 0.1, C.enamel)
  shape(pen, [[SILL[0], SILL_TOP], [SILL[1], SILL_TOP], [SILL[1] + 0.1, SILL_TOP - 0.06], [SILL[0] + 0.1, SILL_TOP - 0.06]], mix(C.enamel, '#FFFFFF', 0.4))
  rect(pen, SILL[0], SILL_TOP + 0.1, SILL[1], SILL_TOP + 0.14, C.frameShade)
}

/* ------------------------------------------------------------------ over the balls */

export function drawOver(pen: Pen, t: number, marty: Pt, rachel: Pt, baby: Pt): void {
  // Rachel tucked in: the sheet's edge drawn up over her, on the pillow.
  const r = rachel
  blob(pen, [[r[0] - 0.13, r[1] + 0.13], [r[0] - 0.1, r[1] + 0.075], [r[0] + 0.05, r[1] + 0.06], [r[0] + 0.25, r[1] + 0.075], [r[0] + 0.42, r[1] + 0.12], [r[0] + 0.42, r[1] + 0.2], [r[0] - 0.1, r[1] + 0.2]], C.sheet)
  line(pen, [r[0] - 0.08, r[1] + 0.1], [r[0] + 0.36, r[1] + 0.11], C.blanketShade, 0.5)
  // The son's swaddle round him, and the nurse's hands at it.
  const b = baby
  const { p, k } = pen
  ellipse(pen, [b[0] - 0.17, b[1] + 0.04], 0.19, 0.08, C.sheet)
  line(pen, [b[0] - 0.3, b[1] + 0.03], [b[0] - 0.06, b[1] + 0.0], C.blanketShade, 0.5)
  line(pen, [b[0] - 0.24, b[1] + 0.09], [b[0] - 0.08, b[1] + 0.06], C.hoodBlue, 0.9)
  p.noFill()
  p.stroke(pen.tone(C.sheet))
  p.strokeWeight(0.035 * k)
  p.arc(b[0] * k, b[1] * k, 0.19 * k, 0.19 * k, Math.PI * 0.55, Math.PI * 1.3)
  const n = nurseOf(t, b)
  for (const h of n.hands) ellipse(pen, h, 0.045, 0.04, C.skin)
  // The blind: down until he comes to the glass; on SON it goes up and snaps onto its roller.
  const { x0, x1, y0, y1 } = GLASS
  const u = Math.max(0, Math.min(1, (t - SON) / (BLIND_TOP - SON)))
  const down = y1 - (y1 - (y0 + 0.09)) * (1 - (1 - u) * (1 - u))
  clipGlass(pen, marty)
  if (down > y0 + 0.1) {
    vgrad(pen, x0, y0 + 0.09, x1, down, [
      [0, C.blind, 1],
      [1, mix(C.blind, C.blindShade, 0.4), 1],
    ])
    for (let x = x0 + 0.5; x < x1; x += 0.9) line(pen, [x, y0 + 0.09], [x, down], C.blindShade, 0.35)
    rect(pen, x0, down - 0.05, x1, down, C.woodDark)
  }
  // Its pull ring, swinging once it is up.
  const sway = 0.12 * ring(t - BLIND_TOP, 1.4, 0.9)
  const ry = Math.max(down, y0 + 0.09) + 0.14
  const rx = (x0 + x1) / 2
  line(pen, [rx, Math.max(down, y0 + 0.09)], [rx + sway, ry], C.woodDark, 0.5)
  ellipse(pen, [rx + sway, ry + 0.04], 0.045, 0.045, null, 0.7, C.woodDark)
  // The glass: two pale reflections across it, the morning in it.
  const ctx = ctxOf(p)
  const refl = mix('#FFFFFF', C.dawn, warm(t))
  for (const [a, wd] of [[-10.9, 0.5], [-9.7, 0.22]] as [number, number][]) {
    ctx.save()
    fillWith(pen, [[a, y0], [a + wd, y0], [a + wd - 1.4, y1], [a - 1.4, y1]], rgba(pen, refl, 0.13))
    ctx.restore()
  }
  vgrad(pen, x0, y0, x1, y1, [
    [0, C.glass, 0.1],
    [1, C.glass, 0.03],
  ])
  ctx.restore()
  // His tears: a drop down his side to the sill, and the bead it leaves.
  for (const ti of TEARS) {
    const s = t - ti
    if (s < 0.08 || s > 2.2) continue
    const ang = -0.2 + Math.min(1, (s - 0.08) / 0.45) * 1.55
    if (s < 0.53) {
      const d: Pt = [marty[0] + 0.14 * Math.cos(ang), marty[1] + 0.14 * Math.sin(ang)]
      ellipse(pen, d, 0.024, 0.03, C.glass)
      ellipse(pen, [d[0] - 0.007, d[1] - 0.01], 0.008, 0.008, '#FFFFFF')
    } else {
      const a = 1 - smooth(s, 1.4, 2.2)
      const c: Pt = [AT_GLASS[0] + 0.14 * Math.cos(1.35), SILL_TOP - 0.012]
      ctx.save()
      ctx.globalAlpha = a
      ellipse(pen, c, 0.03, 0.013, C.glass)
      ctx.restore()
    }
  }
}
