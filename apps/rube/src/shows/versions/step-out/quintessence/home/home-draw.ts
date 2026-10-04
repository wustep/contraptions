import type { Pt } from '../../../../../parts'
import { hash, knock } from '../kit'
import { frontTo, BENCH, CURVE_PT, KEY, NOTES, OUTLINE, PX, REST_PT, RIM_Y, rimAt, scr, SOLVED, stringEnd, W, WALL, KEY_DROP, KEY_LEN, EARLY_NOTES, LAST_NOTE, RIM } from './home-plan'
import { bez, ellipse, fillPoly, glow, line, mix, rgba, trace, vgrad, type Pen } from './pen'

/**
 * Home, drawn: the room at evening (a wall, a window gone blue, boxes not yet opened, the floor), the baby grand seen
 * from its curved side, his mother at the bench, and the lamp with the negative hung from its shade. The room is dim
 * and warm; the lamp is the only light, and it falls on the curve.
 */

export const C = {
  wall: '#2A211C',
  wallLit: '#4A3829',
  floor: '#241A15',
  board: '#1B1310',
  window: '#24324A',
  dusk: '#3E4A66',
  sill: '#191210',
  box: '#5E4B38',
  boxTop: '#76604A',
  tape: '#8C7A62',
  lacquer: '#100C0B',
  lacquerLit: '#2A1E17',
  rimLit: '#C89A5E',
  plate: '#5A4630',
  plateLit: '#8A6A40',
  board2: '#3A2A1C',
  string: '#C7B08A',
  felt: '#D8CDB8',
  keys: '#E6DCC8',
  keysShade: '#9C9282',
  black: '#0C0908',
  mother: '#16110F',
  motherRim: '#C08A52',
  lamp: '#F5D9A0',
  shade: '#E7C48A',
  brass: '#7A6040',
  film: '#3A2414',
  filmClear: '#E9B873',
}

/** The lamp: its shade's centre, and where the negative hangs (centre), so he comes to rest touching its edge. */
export const NEG_W = 0.62
export const NEG_H = 0.42
export const NEG_C: Pt = [REST_PT[0] + 0.13 + NEG_W / 2 + 0.004, CURVE_PT[1] - 0.02]
export const SHADE: Pt = [NEG_C[0] + 0.32, NEG_C[1] - 1.18]
const STEM_X = SHADE[0] + 0.04
const LAMP_FOOT: Pt = [STEM_X, 0.42]

/* ------------------------------------------------------------------ the room */

/** The wall's foot: the floor runs from here toward us. */
const WALL_FOOT = -1.06

export function drawRoom(pen: Pen, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const { c } = pen
  c.save()
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The wall, and the lamp's light on it.
  fillPoly(pen, [[x0, f.y0 - 1], [x1, f.y0 - 1], [x1, WALL_FOOT], [x0, WALL_FOOT]], C.wall)
  glow(pen, SHADE[0], SHADE[1] + 0.3, 4.2, [[0, rgba(C.wallLit, 0.95)], [0.45, rgba(C.wallLit, 0.45)], [1, rgba(C.wallLit, 0)]], 0.8)
  // The window, gone blue, the street's lights across the way.
  const wx0 = -3.0
  const wx1 = -1.25
  const wy0 = -3.45
  const wy1 = -1.85
  fillPoly(pen, [[wx0 - 0.08, wy0 - 0.08], [wx1 + 0.08, wy0 - 0.08], [wx1 + 0.08, wy1 + 0.1], [wx0 - 0.08, wy1 + 0.1]], C.sill)
  fillPoly(pen, [[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1]], vgrad(pen, wy0, wy1, [[0, '#1C2740'], [0.75, C.window], [1, C.dusk]]))
  // The building across: a dark mass with a few lit windows.
  fillPoly(pen, [[wx0, wy1 - 0.62], [wx0 + 0.7, wy1 - 0.62], [wx0 + 0.7, wy1 - 0.9], [wx1 - 0.35, wy1 - 0.9], [wx1 - 0.35, wy1 - 0.55], [wx1, wy1 - 0.55], [wx1, wy1], [wx0, wy1]], '#141A28')
  for (let i = 0; i < 9; i++) {
    if (hash(i, 3) < 0.45) continue
    const x = wx0 + 0.1 + (i % 5) * 0.32 + (i > 4 ? 0.12 : 0)
    const y = wy1 - (i > 4 ? 0.72 : 0.42)
    fillPoly(pen, [[x, y], [x + 0.08, y], [x + 0.08, y + 0.1], [x, y + 0.1]], rgba('#E8C27E', 0.55))
  }
  line(pen, [[(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1]], C.sill, 0.05)
  line(pen, [[wx0, (wy0 + wy1) / 2 - 0.1], [wx1, (wy0 + wy1) / 2 - 0.1]], C.sill, 0.04)
  // The floor, its boards running away from us.
  fillPoly(pen, [[x0, WALL_FOOT], [x1, WALL_FOOT], [x1, f.y1 + 1], [x0, f.y1 + 1]], C.floor)
  let y = WALL_FOOT
  for (let i = 0; y < f.y1 + 1; i++) {
    line(pen, [[x0, y], [x1, y]], rgba(C.board, 0.9), 0.012)
    y += 0.09 + i * 0.035
  }
  glow(pen, SHADE[0] - 0.4, 0.15, 3.4, [[0, rgba('#5A4026', 0.6)], [1, rgba('#5A4026', 0)]], 0.35)
  line(pen, [[x0, WALL_FOOT], [x1, WALL_FOOT]], rgba('#120D0B', 1), 0.05)
  // The boxes, not yet opened.
  drawBox(pen, -3.25, -1.0, 1.15, 0.62, 0.42)
  drawBox(pen, -3.05, -1.62, 0.8, 0.5, 0.36)
  drawBox(pen, -1.95, -0.62, 0.95, 0.58, 0.4)
  c.restore()
}

/** A taped carton: its front face from (x, y) (top left), w wide, h tall, and its top going back `dp`. */
function drawBox(pen: Pen, x: number, y: number, w: number, h: number, dp: number): void {
  const ox = dp * 0.5
  const oy = -dp
  fillPoly(pen, [[x, y], [x + w, y], [x + w + ox, y + oy], [x + ox, y + oy]], C.boxTop, rgba('#0E0A08', 0.8), 0.015)
  fillPoly(pen, [[x + w, y], [x + w + ox, y + oy], [x + w + ox, y + oy + h], [x + w, y + h]], mix(C.box, '#000000', 0.25), rgba('#0E0A08', 0.8), 0.015)
  fillPoly(pen, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], C.box, rgba('#0E0A08', 0.8), 0.015)
  // The tape: along the top's seam and down the front.
  const m = x + w / 2
  line(pen, [[m, y], [m + ox, y + oy]], rgba(C.tape, 0.9), 0.07, 'butt')
  line(pen, [[m, y], [m, y + h * 0.3]], rgba(C.tape, 0.9), 0.07, 'butt')
}

/* ------------------------------------------------------------------ the piano */

const STRINGS = 34
const stringU = (i: number) => 0.16 + (i / (STRINGS - 1)) * (W - 0.2)
const STRING_H = RIM_Y + 0.04
const HAMMER_D = 0.12

/** Which string each note strikes: the one ending under him on the rim, or low at the back. */
function noteString(n: number): number {
  if (EARLY_NOTES.includes(n) || n === LAST_NOTE) return 1
  const [x] = rimAt(n + 1e-4)
  // The d he is at, from his x along the front.
  let best = 0
  let bestE = Infinity
  for (let i = 0; i < STRINGS; i++) {
    const end = scr(stringEnd(stringU(i)), stringU(i))[0]
    const e = Math.abs(end - x)
    if (e < bestE) {
      bestE = e
      best = i
    }
  }
  return best
}
export const NOTE_STRINGS = NOTES.map((n) => [n, noteString(n)] as const)

export function drawPianoBody(pen: Pen, t: number): void {
  const { c } = pen
  c.save()
  // Under it: the shadow on the floor.
  glow(pen, PX + 2.2, -0.35, 2.9, [[0, rgba('#000000', 0.55)], [1, rgba('#000000', 0)]], 0.22)
  // The legs: the tail's and the bass's behind, the treble's in front; the lyre and its pedals.
  leg(pen, scr(3.35, 0.72, RIM_Y + WALL), 0.13 - 0.4 * (W - 0.72))
  leg(pen, scr(0.12, 0.25, RIM_Y + WALL), 0.13 - 0.4 * (W - 0.25))
  const lyre = scr(-0.05, 1.15, RIM_Y + KEY_DROP + 0.16)
  const lyreFoot = 0.13 - 0.4 * (W - 1.15)
  fillPoly(pen, [[lyre[0] - 0.07, lyre[1]], [lyre[0] + 0.07, lyre[1]], [lyre[0] + 0.05, lyreFoot - 0.06], [lyre[0] - 0.05, lyreFoot - 0.06]], C.lacquer)
  for (const dx of [-0.07, 0, 0.07]) line(pen, [[lyre[0] + dx, lyreFoot - 0.05], [lyre[0] + dx + 0.08, lyreFoot - 0.04]], C.brass, 0.025)
  // The interior, open: the dark well, the plate, the strings at rest.
  const top = OUTLINE.map(([d, u]) => scr(d, u))
  fillPoly(pen, top, C.lacquer)
  const plate = OUTLINE.map(([d, u]): Pt => {
    const dd = Math.min(Math.max(d, 0.04), 3.6)
    const uu = Math.min(Math.max(u, 0.07), W - 0.07)
    return scr(dd, uu, RIM_Y + 0.1)
  })
  c.save()
  trace(pen, top)
  c.clip()
  fillPoly(pen, plate, vgrad(pen, RIM_Y - 1, RIM_Y, [[0, mix(C.plate, '#000000', 0.35)], [1, C.plate]]))
  // The lamp's light on the plate, nearest the curve.
  glow(pen, CURVE_PT[0] + 0.2, CURVE_PT[1] - 0.25, 1.6, [[0, rgba(C.plateLit, 0.55)], [1, rgba(C.plateLit, 0)]], 0.6)
  // The plate's holes: a few dark rounds.
  for (const [d, u] of [[1.1, 1.0], [1.9, 0.7], [2.6, 0.55], [0.9, 0.35]] as Pt[]) {
    const [x, y] = scr(d, u, RIM_Y + 0.1)
    ellipse(pen, x, y, 0.1, 0.04, rgba('#0A0706', 0.3))
  }
  for (let i = 0; i < STRINGS; i++) {
    const u = stringU(i)
    const a = scr(HAMMER_D + 0.04, u, STRING_H)
    const b = scr(stringEnd(u) - 0.04, u, STRING_H)
    line(pen, [a, b], rgba(C.string, 0.32), 0.008)
  }
  c.restore()
  // The case's wall under the rim, along the curved side, lit along its top by the lamp.
  const front = frontTo(3.9)
  const rim = front.map(([d, u]) => scr(d, u))
  const foot = front.map(([d, u]) => scr(d, u, RIM_Y + WALL)).reverse()
  const wall = [...rim, ...foot]
  c.save()
  const wg = c.createLinearGradient(rim[0][0] * pen.k, 0, rim[rim.length - 1][0] * pen.k, 0)
  wg.addColorStop(0, C.lacquer)
  const lit = (CURVE_PT[0] - rim[0][0]) / (rim[rim.length - 1][0] - rim[0][0])
  wg.addColorStop(Math.max(0, lit - 0.25), C.lacquer)
  wg.addColorStop(Math.min(1, Math.max(0, lit + 0.05)), C.lacquerLit)
  wg.addColorStop(1, C.lacquer)
  fillPoly(pen, wall, wg)
  // The curve's sheen down the wall, where the lamp catches it.
  c.restore()
  // The rim's top edge: the line of the curve.
  line(pen, rim, rgba(C.rimLit, 0.32), 0.035)
  c.save()
  trace(pen, wall)
  c.clip()
  glow(pen, CURVE_PT[0] + 0.15, CURVE_PT[1], 1.5, [[0, rgba(C.rimLit, 0.5)], [1, rgba(C.rimLit, 0)]], 0.5)
  c.restore()
  line(pen, rim.filter(([x]) => x > CURVE_PT[0] - 1.6 && x < CURVE_PT[0] + 1.6), rgba(C.rimLit, 0.6), 0.022)
  // The tail's last leg in front, under the wall.
  leg(pen, scr(0.25, W - 0.05, RIM_Y + WALL), 0.13)
  // The fallboard's back above the keys, the keys, the keybed under them.
  fillPoly(pen, [scr(0, W, RIM_Y + KEY_DROP), scr(0, W, RIM_Y), scr(0, 0, RIM_Y), scr(0, 0, RIM_Y + KEY_DROP)], mix(C.lacquer, C.lacquerLit, 0.3))
  drawKeys(pen, t)
  const k0 = scr(-KEY_LEN, W, RIM_Y + KEY_DROP)
  const k1 = scr(0, W, RIM_Y + KEY_DROP)
  fillPoly(pen, [[k0[0] - 0.03, k0[1]], [k1[0], k1[1]], [k1[0], k1[1] + 0.16], [k0[0] - 0.03, k0[1] + 0.16]], C.lacquer)
  // The treble cheek, to the rim.
  fillPoly(pen, [[k1[0] - 0.02, k1[1] + 0.16], [k1[0] - 0.02, RIM_Y], [k1[0] + 0.06, RIM_Y], [k1[0] + 0.06, k1[1] + 0.16]], C.lacquer)
  c.restore()
}

function leg(pen: Pen, top: Pt, footY: number): void {
  const [x, y] = top
  fillPoly(pen, [[x - 0.08, y], [x + 0.08, y], [x + 0.045, footY - 0.03], [x - 0.045, footY - 0.03]], C.lacquer)
  ellipse(pen, x, footY - 0.02, 0.06, 0.03, C.brass)
}

/** Which key his landing or her note is on, and how far down it is now. */
function keyDown(t: number, kind: 'his' | 'hers'): number {
  if (kind === 'his') return t >= KEY && t < KEY + 0.5 ? 1 - Math.max(0, (t - KEY - 0.3) / 0.2) : 0
  let v = 0
  for (const n of NOTES) if (t >= n && t < n + 0.5) v = Math.max(v, 1 - Math.max(0, (t - n - 0.25) / 0.25))
  return v
}

function drawKeys(pen: Pen, t: number): void {
  const h = RIM_Y + KEY_DROP
  const quad = (d0: number, d1: number, u0: number, u1: number, dy = 0): Pt[] => [scr(d0, u0, h + dy), scr(d1, u0, h + dy), scr(d1, u1, h + dy), scr(d0, u1, h + dy)]
  fillPoly(pen, quad(-KEY_LEN, 0, 0.05, W - 0.05), C.keys)
  // The white keys' seams, and their shading toward the back.
  const n = 36
  for (let i = 1; i < n; i++) {
    const u = 0.05 + (i / n) * (W - 0.1)
    line(pen, [scr(-KEY_LEN, u, h), scr(0, u, h)], rgba(C.keysShade, 0.7), 0.006)
  }
  fillPoly(pen, quad(-KEY_LEN, 0, 0.05, W - 0.05), vgrad(pen, h - 0.9, h, [[0, rgba('#000000', 0.45)], [1, rgba('#000000', 0)]]))
  // The black keys, in their twos and threes.
  for (let i = 0; i < n; i++) {
    const m = i % 7
    if (m === 2 || m === 6) continue
    const u = 0.05 + ((i + 1) / n) * (W - 0.1)
    const q = quad(-KEY_LEN + 0.18, 0, u - 0.018, u + 0.018, -0.03)
    fillPoly(pen, q, C.black)
  }
  // His key, at the treble end: down under him. Hers, at the back, down under her hand.
  const his = keyDown(t, 'his')
  if (his > 0) fillPoly(pen, quad(-KEY_LEN, 0, 1.96, 2.04, 0.035 * his), rgba('#000000', 0.35 * his))
  const hers = keyDown(t, 'hers')
  if (hers > 0) fillPoly(pen, quad(-KEY_LEN, 0, 0.42, 0.5, 0.03 * hers), rgba('#000000', 0.35 * hers))
}

/** The strings she strikes, ringing, and the hammers under them. Drawn over the body, under him. */
export function drawStrings(pen: Pen, t: number): void {
  const { c } = pen
  c.save()
  const top = OUTLINE.map(([d, u]) => scr(d, u))
  trace(pen, top)
  c.clip()
  // The hammers: a row of felts at the keyboard's end of the strings.
  for (let i = 0; i < STRINGS; i++) {
    const u = stringU(i)
    let lift = 0
    for (const [n, s] of NOTE_STRINGS) if (s === i) lift = Math.max(lift, knock(t - n, 0.09) * (t - n < 0.04 ? (t - n) / 0.04 : 1))
    const [x, y] = scr(HAMMER_D, u, STRING_H + 0.025 - 0.05 * lift)
    ellipse(pen, x, y, 0.035, 0.016, rgba(C.felt, 0.55 + 0.4 * lift))
  }
  // Each note: its string lights and shivers from the hammer to its end, and dies away.
  for (const [n, s] of NOTE_STRINGS) {
    const age = t - n
    if (age < 0 || age > 2.2) continue
    const u = stringU(s)
    const d0 = HAMMER_D + 0.04
    const d1 = stringEnd(u) - 0.04
    const amp = 0.022 * Math.exp(-age / 0.5)
    const glowA = Math.exp(-age / 0.7)
    const pts: Pt[] = []
    for (let j = 0; j <= 40; j++) {
      const f = j / 40
      const [x, y] = scr(d0 + (d1 - d0) * f, u, STRING_H)
      pts.push([x, y + amp * Math.sin(Math.PI * f) * Math.sin(age * 70 + f * 2)])
    }
    line(pen, pts, rgba('#F6D79A', 0.3 * glowA), 0.06)
    line(pen, pts, rgba('#F6D79A', 0.8 * glowA), 0.022)
    line(pen, pts, rgba('#FFF4DC', 0.95 * glowA), 0.009)
  }
  c.restore()
  drawRimBand(pen)
  // Where the string ends under him, the note reaches him: a warm flash at his foot as it moves him on.
  for (const [n, s] of NOTE_STRINGS) {
    const age = t - n
    if (s === 1 || age < 0 || age > 0.5) continue
    const [x, y] = rimAt(n)
    const a = Math.exp(-age / 0.16)
    glow(pen, x, y + 0.15, 0.32, [[0, rgba('#FFE2A8', 0.55 * a)], [1, rgba('#FFE2A8', 0)]], 0.45)
  }
}

/** The rim's top: a lacquered lip along the curved side, lit where the lamp is, with the shadow it throws inside. */
const BAND = 0.065
function drawRimBand(pen: Pen): void {
  const rim = frontTo(3.9).map(([d, u]) => scr(d, u))
  const lip = rim.map(([x, y]): Pt => [x, y - BAND])
  const shadow = rim.map(([x, y]): Pt => [x, y - BAND - 0.09])
  fillPoly(pen, [...lip, ...[...shadow].reverse()], vgrad(pen, RIM_Y - 1, RIM_Y, [[0, rgba('#000000', 0.45)], [1, rgba('#000000', 0.35)]]))
  const g = pen.c.createLinearGradient((CURVE_PT[0] - 2) * pen.k, 0, (CURVE_PT[0] + 2) * pen.k, 0)
  g.addColorStop(0, '#16100D')
  g.addColorStop(0.5, '#4A3422')
  g.addColorStop(1, '#16100D')
  fillPoly(pen, [...rim, ...[...lip].reverse()], g)
  line(pen, lip, rgba('#000000', 0.6), 0.01)
  line(pen, rim, rgba(C.rimLit, 0.35), 0.016)
  line(pen, rim.filter(([x]) => x > CURVE_PT[0] - 1.5 && x < CURVE_PT[0] + 1.5), rgba(C.rimLit, 0.55), 0.016)
}

/* ------------------------------------------------------------------ his mother */

/** How far down her far hand is: on each note it falls and lifts. */
function handDip(t: number): number {
  let v = 0
  for (const n of NOTES) {
    const a = t - n
    if (a > -0.14 && a < 0) v = Math.max(v, 1 - -a / 0.14)
    else if (a >= 0 && a < 0.4) v = Math.max(v, 1 - a / 0.4)
  }
  return v
}

export function drawBench(pen: Pen): void {
  const s0: Pt = [0.3, -0.53]
  const s1: Pt = [0.82, -0.53]
  const back: Pt = [0.3, -0.56]
  const seat = [s0, s1, [s1[0] + back[0], s1[1] + back[1]] as Pt, [s0[0] + back[0], s0[1] + back[1]] as Pt]
  for (const [x, yb] of [[s0[0] + back[0] + 0.05, -0.43], [s1[0] + back[0] - 0.05, -0.43]] as Pt[]) fillPoly(pen, [[x - 0.03, s1[1] + back[1]], [x + 0.03, s1[1] + back[1]], [x + 0.03, yb], [x - 0.03, yb]], C.lacquer)
  // The seat's top, padded and catching the lamp from the right, so it reads as a long bench she sits on the far end of.
  fillPoly(pen, seat, mix('#1E1613', C.rimLit, 0.16))
  fillPoly(pen, [s1, [s1[0] + back[0], s1[1] + back[1]], [s1[0] + back[0] - 0.22, s1[1] + back[1]], [s1[0] - 0.22, s1[1]]], rgba(C.rimLit, 0.08))
  line(pen, [seat[3], seat[2]], rgba(C.rimLit, 0.3), 0.012)
  line(pen, [s1, seat[2]], rgba(C.rimLit, 0.35), 0.014)
  fillPoly(pen, [s0, s1, [s1[0], s1[1] + 0.13], [s0[0], s0[1] + 0.13]], C.lacquer)
  line(pen, [s0, s1], rgba(C.rimLit, 0.35), 0.012)
  for (const x of [s0[0] + 0.05, s1[0] - 0.05]) fillPoly(pen, [[x - 0.035, s0[1] + 0.12], [x + 0.035, s0[1] + 0.12], [x + 0.03, 0.13], [x - 0.03, 0.13]], C.lacquer)
}

/** Her: a soft dark figure at the bench, in profile toward the keys, the lamp's light along her front. */
export function drawMother(pen: Pen, t: number): void {
  const { c } = pen
  c.save()
  const dip = handDip(t)
  const breathe = Math.sin(t * 1.3) * 0.006
  const hip: Pt = [0.72, -0.86]
  const sh: Pt = [0.9, -1.72 + breathe]
  const head: Pt = [1.0, -1.96 + breathe]
  // The far arm, to the bass at the back, the hand falling on her notes.
  const hand: Pt = [1.86, -1.62 + 0.045 * dip]
  const elbow: Pt = [1.25, -1.4 + 0.02 * dip]
  line(pen, [[sh[0] + 0.04, sh[1] + 0.06], elbow, hand], mix(C.mother, '#000000', 0.2), 0.09)
  ellipse(pen, hand[0], hand[1] + 0.01, 0.06, 0.03, mix(C.mother, '#000000', 0.2))
  // Body: skirt over the bench, the back, the shoulders.
  const body: Pt[] = [
    [hip[0] - 0.22, hip[1] + 0.12],
    ...bez([hip[0] - 0.22, hip[1] + 0.12], [hip[0] - 0.3, hip[1] - 0.3], [sh[0] - 0.32, sh[1] + 0.35], [sh[0] - 0.14, sh[1] - 0.02], 10).slice(1),
    ...bez([sh[0] - 0.14, sh[1] - 0.02], [sh[0] - 0.02, sh[1] - 0.1], [sh[0] + 0.14, sh[1] - 0.06], [sh[0] + 0.18, sh[1] + 0.06], 8).slice(1),
    ...bez([sh[0] + 0.18, sh[1] + 0.06], [sh[0] + 0.2, sh[1] + 0.35], [hip[0] + 0.32, hip[1] - 0.3], [hip[0] + 0.3, hip[1] - 0.02], 10).slice(1),
    // The lap and the knees, toward the keys.
    [hip[0] + 0.62, hip[1] - 0.02],
    [hip[0] + 0.68, hip[1] + 0.1],
    [hip[0] + 0.12, hip[1] + 0.14],
  ]
  fillPoly(pen, body, C.mother)
  // The shins, down to the pedals.
  line(pen, [[hip[0] + 0.62, hip[1] + 0.05], [hip[0] + 0.74, hip[1] + 0.6]], C.mother, 0.1)
  // The neck and the head, the hair up.
  line(pen, [[sh[0] + 0.02, sh[1] - 0.02], [head[0] - 0.01, head[1] + 0.08]], C.mother, 0.08)
  ellipse(pen, head[0], head[1], 0.125, 0.14, C.mother)
  ellipse(pen, head[0] - 0.11, head[1] - 0.06, 0.07, 0.065, C.mother)
  // The near arm, to the middle of the keys, at rest.
  const nearHand: Pt = [1.6, -1.34]
  line(pen, [[sh[0] + 0.1, sh[1] + 0.08], [1.18, -1.28], nearHand], C.mother, 0.085)
  ellipse(pen, nearHand[0], nearHand[1], 0.06, 0.028, C.mother)
  // The lamp's light along her front: face, the near arm, the lap.
  c.save()
  c.globalCompositeOperation = 'lighter'
  const rim = rgba(C.motherRim, 0.28)
  c.beginPath()
  c.ellipse(head[0] * pen.k, head[1] * pen.k, 0.125 * pen.k, 0.14 * pen.k, 0, -1.2, 1.0)
  c.strokeStyle = rim
  c.lineWidth = 0.022 * pen.k
  c.stroke()
  line(pen, [[sh[0] + 0.12, sh[1] + 0.02], [sh[0] + 0.19, sh[1] + 0.22]], rim, 0.02)
  line(pen, [[1.2, -1.31], nearHand], rgba(C.motherRim, 0.18), 0.02)
  c.restore()
  c.restore()
}

/* ------------------------------------------------------------------ the lamp and the negative */

export function drawLamp(pen: Pen, t: number): void {
  const { c } = pen
  c.save()
  // Its foot on the floor, the stem, the shade.
  ellipse(pen, LAMP_FOOT[0], LAMP_FOOT[1], 0.24, 0.07, '#1A1310')
  line(pen, [LAMP_FOOT, [STEM_X, SHADE[1] + 0.2]], C.brass, 0.035)
  const sw = 0.38
  const sh = 0.36
  const sx = SHADE[0]
  const sy = SHADE[1]
  // The light under it.
  glow(pen, sx, sy + 0.25, 1.3, [[0, rgba(C.lamp, 0.5)], [1, rgba(C.lamp, 0)]], 0.9)
  fillPoly(pen, [[sx - sw * 0.62, sy - sh / 2], [sx + sw * 0.62, sy - sh / 2], [sx + sw, sy + sh / 2], [sx - sw, sy + sh / 2]], vgrad(pen, sy - sh / 2, sy + sh / 2, [[0, '#B8925A'], [1, C.shade]]))
  ellipse(pen, sx, sy + sh / 2, sw, 0.035, rgba('#FFF0C8', 0.95))
  // The solved moment: the lamp warms a little.
  const warm = t >= SOLVED ? knock(t - SOLVED, 0.9) : 0
  if (warm > 0) glow(pen, sx, sy + 0.2, 2.2, [[0, rgba(C.lamp, 0.22 * warm)], [1, rgba(C.lamp, 0)]])
  c.restore()
}

/** The negative's turn on its thread, radians: turning slowly all through, stopped face on when he touches it. */
export function negTurn(t: number): number {
  if (t >= SOLVED) return 0
  const left = SOLVED - t
  const a = 0.95 * Math.min(1, left / 3.5) + 0.25
  return a * Math.sin(left * 1.55)
}

/**
 * The last negative, hung from the shade by a clothes peg on a thread, in the lamp light: a small dark frame with the
 * curve in it, turning. Face on, the curve in it is the rim's, exactly where it hangs over the rim: drawn here as
 * the rim's own line, light where the piano is dark, so when it stops turning the two are one line.
 */
export function drawNegative(pen: Pen, t: number): void {
  const { c, k } = pen
  c.save()
  const phi = negTurn(t)
  const sx = Math.cos(phi)
  const [cx, cy] = NEG_C
  const top = cy - NEG_H / 2
  // The thread and the peg.
  line(pen, [[cx, SHADE[1] + 0.2], [cx, top - 0.06]], rgba('#D9C7A6', 0.55), 0.008)
  fillPoly(pen, [[cx - 0.025, top - 0.11], [cx + 0.025, top - 0.11], [cx + 0.02, top + 0.04], [cx - 0.02, top + 0.04]], '#A88A62')
  // The frame, foreshortened by its turn.
  const hw = (NEG_W / 2) * Math.abs(sx)
  const frame: Pt[] = [[cx - hw, top], [cx + hw, top], [cx + hw, top + NEG_H], [cx - hw, top + NEG_H]]
  // Face on, lit through: the film base; edge on, only its dark edge.
  const face = Math.abs(sx)
  fillPoly(pen, frame, rgba(C.film, 0.94))
  c.save()
  trace(pen, frame)
  c.clip()
  // The picture: everything in the frame inverted. Where the piano's wall is (dark), the film is clear and glows.
  const solved = t >= SOLVED ? knock(t - SOLVED, 1.4) : 0
  const img = (x: number, y: number): Pt => [cx + (x - cx) * sx, y]
  const rimLine: Pt[] = []
  for (let x = cx - NEG_W; x <= cx + NEG_W; x += 0.02) {
    // The rim's y at this x: from the piano's curve.
    rimLine.push(img(x, rimYAt(x)))
  }
  const under: Pt[] = [...rimLine, [cx + NEG_W, top + NEG_H + 0.2], [cx - NEG_W, top + NEG_H + 0.2]].map(([x, y]) => [x, y] as Pt)
  fillPoly(pen, under, rgba(C.filmClear, 0.55 + 0.25 * face + 0.2 * solved))
  line(pen, rimLine, rgba('#FFF4DC', 0.55 + 0.45 * solved), 0.02)
  // The film's grain, and its sprocket holes along the top and the bottom.
  for (let i = 0; i < 7; i++) {
    const x = cx + (-NEG_W / 2 + 0.05 + i * 0.086) * sx
    for (const y of [top + 0.025, top + NEG_H - 0.055]) fillPoly(pen, [[x - 0.018 * Math.abs(sx), y], [x + 0.018 * Math.abs(sx), y], [x + 0.018 * Math.abs(sx), y + 0.03], [x - 0.018 * Math.abs(sx), y + 0.03]], rgba('#0A0605', 0.9))
  }
  c.restore()
  // Its edge, and the lamp's light through it when it is solved.
  c.strokeStyle = rgba('#0A0605', 0.9)
  c.lineWidth = 0.015 * k
  trace(pen, frame)
  c.stroke()
  if (solved > 0) {
    c.globalCompositeOperation = 'lighter'
    glow(pen, cx, cy, 0.7, [[0, rgba('#F5C77E', 0.25 * solved)], [1, rgba('#F5C77E', 0)]])
  }
  c.restore()
}

/** The rim's line at screen x, near the curve: where its top edge is. */
const RIM_LINE: Pt[] = frontTo(3.7).map(([d, u]) => scr(d, u))
export function rimYAt(x: number): number {
  for (let i = 1; i < RIM_LINE.length; i++) {
    const [x0, y0] = RIM_LINE[i - 1]
    const [x1, y1] = RIM_LINE[i]
    if ((x0 <= x && x <= x1) || (x1 <= x && x <= x0)) return y0 + (y1 - y0) * ((x - x0) / Math.max(1e-9, x1 - x0))
  }
  return x < RIM_LINE[0][0] ? RIM_LINE[0][1] : RIM_LINE[RIM_LINE.length - 1][1]
}

/** A puff of dust off the bench where he lands, and off the rim: small and warm in the lamp light. */
export function drawLandings(pen: Pen, t: number): void {
  for (const [at, p] of [[BENCH, [0.66, -0.53]], [RIM, [rimAt(RIM)[0], rimYAt(rimAt(RIM)[0])]]] as [number, Pt][]) {
    const a = t - at
    if (a < 0 || a > 0.6) continue
    for (let i = 0; i < 5; i++) {
      const dir = (i - 2) * 0.5
      const r = a * 0.5
      ellipse(pen, p[0] + dir * r * 0.4, p[1] - r * 0.15 - 0.01, 0.02, 0.02, rgba('#CDB58E', 0.35 * (1 - a / 0.6)))
    }
  }
}
