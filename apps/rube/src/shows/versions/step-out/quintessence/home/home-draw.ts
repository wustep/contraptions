import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { smooth } from '../kit'
import { frontTo, CURVE_PT, KEY, NOTES, OUTLINE, PX, REST_PT, RIM_Y, rimAt, scr, SOLVED, stringEnd, W, WALL, KEY_DROP, KEY_LEN, EARLY_NOTES, LAST_NOTE } from './home-plan'
import { bez, ellipse, fillPoly, glow, line, mix, rgba, trace, vgrad, type Pen } from './pen'

/**
 * Home, drawn: the baby grand seen from its curved side, his mother at the bench, and the lamp with the negative hung
 * from its shade (the room round them is `room.ts`). The room is dim and warm; the lamp is the only light, and it
 * falls on the curve.
 */

export const C = {
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
/** The lamp stands behind the piano: its foot and most of its stem are hidden by the case. */
const LAMP_FOOT: Pt = [STEM_X, -1.35]

/* ------------------------------------------------------------------ the piano */

const STRINGS = 28
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

/** The piano's body: its case, the plate, the strings at rest, and the keys, his and hers going down. */
export function drawPianoBody(pen: Pen, t: number): void {
  const { c } = pen
  c.save()
  // Under it: its shadow on the rug.
  glow(pen, PX + 2.2, -0.35, 2.9, [[0, rgba('#000000', 0.5)], [1, rgba('#000000', 0)]], 0.22)
  // The tail's leg, behind (the bass's is hidden by the case).
  leg(pen, scr(3.35, 0.72, RIM_Y + WALL), 0.13 - 0.4 * (W - 0.72))
  // The interior, open: the dark well, the plate in the lamp's light, the strings at rest.
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
  glow(pen, CURVE_PT[0] + 0.2, CURVE_PT[1] - 0.25, 1.6, [[0, rgba(C.plateLit, 0.4)], [1, rgba(C.plateLit, 0)]], 0.6)
  const rest = new Path2D()
  for (let i = 0; i < STRINGS; i++) {
    const u = stringU(i)
    const a = scr(HAMMER_D + 0.04, u, STRING_H)
    const b = scr(stringEnd(u) - 0.04, u, STRING_H)
    rest.moveTo(a[0] * pen.k, a[1] * pen.k)
    rest.lineTo(b[0] * pen.k, b[1] * pen.k)
  }
  c.strokeStyle = rgba(C.string, 0.24)
  c.lineWidth = 0.009 * pen.k
  c.stroke(rest)
  c.restore()
  // The fallboard's back above the keys, and the keys: behind the case's wall where they go into it.
  fillPoly(pen, [scr(0, W, RIM_Y + KEY_DROP), scr(0, W, RIM_Y), scr(0, 0, RIM_Y), scr(0, 0, RIM_Y + KEY_DROP)], mix(C.lacquer, C.lacquerLit, 0.3))
  drawKeys(pen)
  drawKeyPresses(pen, t)
  // The case's wall under the rim, along the curved side, lit by the lamp near the curve.
  const front = frontTo(3.9)
  const rim = front.map(([d, u]) => scr(d, u))
  const foot = front.map(([d, u]) => scr(d, u, RIM_Y + WALL)).reverse()
  const wg = c.createLinearGradient(rim[0][0] * pen.k, 0, rim[rim.length - 1][0] * pen.k, 0)
  wg.addColorStop(0, C.lacquer)
  const lit = (CURVE_PT[0] - rim[0][0]) / (rim[rim.length - 1][0] - rim[0][0])
  wg.addColorStop(Math.max(0, lit - 0.25), C.lacquer)
  wg.addColorStop(Math.min(1, Math.max(0, lit + 0.05)), C.lacquerLit)
  wg.addColorStop(1, C.lacquer)
  fillPoly(pen, [...rim, ...foot], wg)
  // The treble leg, in front, under the wall.
  leg(pen, scr(0.25, W - 0.05, RIM_Y + WALL), 0.13)
  // The keybed under the keys' front.
  const k0 = scr(-KEY_LEN, W, RIM_Y + KEY_DROP)
  const k1 = scr(0, W, RIM_Y + KEY_DROP)
  fillPoly(pen, [[k0[0] - 0.03, k0[1]], [k1[0], k1[1]], [k1[0], k1[1] + 0.16], [k0[0] - 0.03, k0[1] + 0.16]], C.lacquer)
  // The treble cheek, to the rim.
  fillPoly(pen, [[k1[0] - 0.02, k1[1] + 0.16], [k1[0] - 0.02, RIM_Y], [k1[0] + 0.06, RIM_Y], [k1[0] + 0.06, k1[1] + 0.16]], C.lacquer)
  c.restore()
}

/** A leg, tapering to the floor, its foot the case's own black. */
function leg(pen: Pen, top: Pt, footY: number): void {
  const [x, y] = top
  fillPoly(pen, [[x - 0.08, y], [x + 0.08, y], [x + 0.045, footY - 0.03], [x - 0.045, footY - 0.03]], C.lacquer)
}

/** Which key his landing or her note is on, and how far down it is now. */
function keyDown(t: number, kind: 'his' | 'hers'): number {
  if (kind === 'his') return t >= KEY && t < KEY + 0.5 ? 1 - Math.max(0, (t - KEY - 0.3) / 0.2) : 0
  let v = 0
  for (const n of NOTES) if (t >= n && t < n + 0.5) v = Math.max(v, 1 - Math.max(0, (t - n - 0.25) / 0.25))
  return v
}

const keyQuad = (d0: number, d1: number, u0: number, u1: number, dy = 0): Pt[] => {
  const h = RIM_Y + KEY_DROP
  return [scr(d0, u0, h + dy), scr(d1, u0, h + dy), scr(d1, u1, h + dy), scr(d0, u1, h + dy)]
}

function drawKeys(pen: Pen): void {
  const h = RIM_Y + KEY_DROP
  const quad = keyQuad
  fillPoly(pen, quad(-KEY_LEN, 0, 0.05, W - 0.05), C.keys)
  // The white keys' seams, and their shading toward the back.
  const n = 26
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
}

/** His key, at the treble end: down under him. Hers, at the back, down under her hand. */
function drawKeyPresses(pen: Pen, t: number): void {
  const his = keyDown(t, 'his')
  if (his > 0) fillPoly(pen, keyQuad(-KEY_LEN, 0, 1.96, 2.04, 0.035 * his), rgba('#000000', 0.35 * his))
  const hers = keyDown(t, 'hers')
  if (hers > 0) fillPoly(pen, keyQuad(-KEY_LEN, 0, 0.42, 0.5, 0.03 * hers), rgba('#000000', 0.35 * hers))
}

/** The strings she strikes, ringing. Drawn over the body, under him. */
export function drawStrings(pen: Pen, t: number): void {
  // Each note: its string shivers from the hammer to its end, catching the lamp, and settles back into the rest. Inside
  // the case only.
  pen.c.save()
  trace(pen, OUTLINE.map(([d, u]) => scr(d, u)))
  pen.c.clip()
  for (const [n, s] of NOTE_STRINGS) {
    const age = t - n
    if (age < 0 || age > 2.2) continue
    const u = stringU(s)
    const d0 = HAMMER_D + 0.04
    const d1 = stringEnd(u) - 0.04
    const amp = 0.022 * Math.exp(-age / 0.5)
    const lit = Math.exp(-age / 0.7)
    const pts: Pt[] = []
    for (let j = 0; j <= 40; j++) {
      const f = j / 40
      const [x, y] = scr(d0 + (d1 - d0) * f, u, STRING_H)
      pts.push([x, y + amp * Math.sin(Math.PI * f) * Math.sin(age * 70 + f * 2)])
    }
    line(pen, pts, rgba(mix(C.string, '#F6D79A', 0.5 * lit), 0.24 + 0.5 * lit), 0.009 + 0.003 * lit)
  }
  pen.c.restore()
  drawRimBand(pen)
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
  // Its edge catches the lamp most at the curve, under it.
  const edge = pen.c.createLinearGradient((CURVE_PT[0] - 2) * pen.k, 0, (CURVE_PT[0] + 2) * pen.k, 0)
  edge.addColorStop(0, rgba(C.rimLit, 0.3))
  edge.addColorStop(0.5, rgba(C.rimLit, 0.6))
  edge.addColorStop(1, rgba(C.rimLit, 0.3))
  pen.c.strokeStyle = edge
  trace(pen, rim, false)
  pen.c.lineWidth = 0.016 * pen.k
  pen.c.lineCap = 'round'
  pen.c.lineJoin = 'round'
  pen.c.stroke()
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

/** How far she leans into the keys: a little before each note, the most on it, easing back after. */
function noteLean(t: number): number {
  let v = 0
  for (const n of NOTES) {
    const a = t - n
    if (a > -0.3 && a < 0) v = Math.max(v, 1 + a / 0.3)
    else if (a >= 0 && a < 0.9) v = Math.max(v, 1 - a / 0.9)
  }
  return v * v * (3 - 2 * v)
}

/** Her shape at `t`. */
function motherAt(t: number) {
  const dip = handDip(t)
  // She breathes with the playing: slowly, and in with each note as she leans into it.
  const lean = noteLean(t)
  const breathe = Math.sin(t * 1.3) * 0.012 - 0.018 * lean
  const hip: Pt = [0.72, -0.86]
  const sh: Pt = [0.9 + 0.03 * lean, -1.72 + breathe]
  const head: Pt = [1.0 + 0.05 * lean, -1.96 + breathe + 0.012 * lean]
  const hand: Pt = [1.86, -1.62 + 0.045 * dip]
  const elbow: Pt = [1.25, -1.4 + 0.02 * dip]
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
  return { dip, hip, sh, head, hand, elbow, body }
}

/** Her: a soft dark figure at the bench, in profile toward the keys. */
export function drawMother(pen: Pen, t: number): void {
  const { hip, sh, head, hand, elbow, body } = motherAt(t)
  // The far arm, to the bass at the back, the hand falling on her notes.
  line(pen, [[sh[0] + 0.04, sh[1] + 0.06], elbow, hand], mix(C.mother, '#000000', 0.2), 0.09)
  ellipse(pen, hand[0], hand[1] + 0.01, 0.06, 0.03, mix(C.mother, '#000000', 0.2))
  fillPoly(pen, body, C.mother)
  // The shins, down to her foot on the floor under the keys.
  const ankle: Pt = [hip[0] + 0.74, hip[1] + 0.6]
  line(pen, [[hip[0] + 0.62, hip[1] + 0.05], ankle], C.mother, 0.1)
  ellipse(pen, ankle[0] + 0.05, ankle[1] + 0.02, 0.09, 0.035, C.mother)
  // The neck and the head, the hair up.
  line(pen, [[sh[0] + 0.02, sh[1] - 0.02], [head[0] - 0.01, head[1] + 0.08]], C.mother, 0.08)
  ellipse(pen, head[0], head[1], 0.125, 0.14, C.mother)
  ellipse(pen, head[0] - 0.11, head[1] - 0.06, 0.07, 0.065, C.mother)
  // The near arm, to the middle of the keys, at rest.
  const nearHand: Pt = [1.6, -1.34]
  line(pen, [[sh[0] + 0.1, sh[1] + 0.08], [1.18, -1.28], nearHand], C.mother, 0.085)
  ellipse(pen, nearHand[0], nearHand[1], 0.06, 0.028, C.mother)
}

/* ------------------------------------------------------------------ the lamp and the negative */

/** The floor lamp: its stem up from behind the piano, and its shade, which stirs a little on the stem. */
export function drawLamp(pen: Pen, t: number): void {
  const { c } = pen
  c.save()
  const sw = 0.38
  const sh = 0.36
  const sx = SHADE[0] + 0.014 * sway(t, 0.11, 4)
  const sy = SHADE[1]
  line(pen, [LAMP_FOOT, [STEM_X, sy + 0.2], [sx + 0.04, sy + 0.1]], C.brass, 0.035)
  // The shade, lit through.
  fillPoly(pen, [[sx - sw * 0.62, sy - sh / 2], [sx + sw * 0.62, sy - sh / 2], [sx + sw, sy + sh / 2], [sx - sw, sy + sh / 2]], vgrad(pen, sy - sh / 2, sy + sh / 2, [[0, '#B8925A'], [1, C.shade]]))
  // The shade's seams, and the bulb's light at its open foot.
  for (const f of [-0.5, 0, 0.5]) line(pen, [[sx + f * sw * 0.62, sy - sh / 2], [sx + f * sw, sy + sh / 2]], rgba('#8A6A40', 0.35), 0.008)
  ellipse(pen, sx, sy + sh / 2, sw, 0.035, rgba('#FFF0C8', 0.95))
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
  // The picture: everything in the frame inverted. Where the piano's wall is (dark), the film is clear, lit through.
  // When he stops it, the curve in it comes up to full, over half a second, and stays.
  const solved = smooth(t, SOLVED, SOLVED + 0.5)
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
  // Its edge.
  c.strokeStyle = rgba('#0A0605', 0.9)
  c.lineWidth = 0.015 * k
  trace(pen, frame)
  c.stroke()
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
