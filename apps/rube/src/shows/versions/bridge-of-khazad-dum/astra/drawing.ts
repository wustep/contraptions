import type p5 from 'p5'
import { mixHex, type Piece, type PieceCtx, type Pt } from '../../../../parts'
import { boatAngle, boatAt, councilAngle, frodoAt, leafAt, liftAt, RADIUS, ringAt, rootAngle, stairAngle } from './motion'
import { hash, mix, phase, settle, smooth } from './math'

type G = CanvasRenderingContext2D
type Paint = (g: G, t: number) => void
const INK = '#28302C', EDGE = '#B9B7A1', BRASS = '#B79A59'

/** Every piece has one mechanical job; all drawing coordinates are world cells. */
export function piece(name: string, paint: Paint, front?: Paint): Piece<null> {
  const invoke = (fn: Paint, p: p5, c: PieceCtx) => {
    const g = p.drawingContext as G
    g.save()
    g.scale(c.k, c.k)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    fn(g, c.t)
    g.restore()
  }
  return { name, weight: 0, place: () => null, draw: (p, _s, c) => invoke(paint, p, c), over: front ? (p, _s, c) => invoke(front, p, c) : undefined }
}
function shape(g: G, points: Pt[], fill: string, stroke?: string, w = 0.035): void {
  g.beginPath()
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y))
  g.closePath()
  g.fillStyle = fill
  g.fill()
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke() }
}
function line(g: G, points: Pt[], color = INK, w = 0.035): void {
  if (!points.length) return
  g.beginPath()
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y))
  g.strokeStyle = color
  g.lineWidth = w
  g.stroke()
}
function disk(g: G, x: number, y: number, r: number, fill: string, stroke?: string, w = 0.035): void {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = fill; g.fill()
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke() }
}
function ring(g: G, x: number, y: number, r: number, color = BRASS, w = 0.065): void {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.strokeStyle = color; g.lineWidth = w; g.stroke()
}
function rect(g: G, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill; g.fillRect(x, y, w, h)
}
function arc(g: G, x: number, y: number, r: number, a: number, b: number, color: string, w: number): void {
  g.beginPath(); g.arc(x, y, r, a, b); g.lineWidth = w; g.strokeStyle = color; g.stroke()
}
function pulley(g: G, x: number, y: number, r: number, turn: number, color = BRASS): void {
  disk(g, x, y, r, INK, color, 0.05)
  ring(g, x, y, r * 0.81, color, 0.025)
  for (let i = 0; i < 6; i++) {
    const a = turn + i * Math.PI / 3
    line(g, [[x + Math.cos(a) * r * 0.19, y + Math.sin(a) * r * 0.19], [x + Math.cos(a) * r * 0.76, y + Math.sin(a) * r * 0.76]], color, 0.055)
  }
  disk(g, x, y, r * 0.16, color)
}
/** Engraved strata follow the face. They are marks in stone, never particles or light. */
function rock(g: G, points: Pt[], color: string, salt: number): void {
  shape(g, points, color)
  g.save(); g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip()
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const left = Math.min(...xs), top = Math.min(...ys), w = Math.max(...xs) - left, h = Math.max(...ys) - top
  for (let i = 0; i < 45; i++) {
    const x = left + hash(i, salt) * w, y = top + hash(i, salt + 7) * h
    line(g, [[x, y], [x + 0.2 + hash(i, salt + 9) * 1.3, y - 0.09]], mixHex(color, INK, 0.18), 0.024)
  }
  g.restore()
}
function branch(g: G, x: number, y: number, h: number, color: string, salt: number): void {
  const sway = (hash(salt) - 0.5) * h * 0.2
  g.beginPath(); g.moveTo(x - h * 0.055, y)
  g.bezierCurveTo(x + h * 0.025, y - h * 0.28, x - h * 0.04, y - h * 0.53, x + sway, y - h)
  g.bezierCurveTo(x + h * 0.015, y - h * 0.43, x + h * 0.09, y - h * 0.13, x + h * 0.065, y)
  g.closePath(); g.fillStyle = color; g.fill()
  g.beginPath(); g.moveTo(x - h * 0.015, y - 0.2)
  g.bezierCurveTo(x + h * 0.04, y - h * 0.3, x - h * 0.025, y - h * 0.47, x + sway, y - h * 0.8)
  g.strokeStyle = mixHex(color, '#C1C3A0', 0.22); g.lineWidth = 0.035; g.stroke()
  for (let i = 0; i < 7; i++) {
    const s = i % 2 ? -1 : 1, by = y - h * (0.25 + i * 0.085), bx = x + sway * (0.25 + i * 0.085)
    g.beginPath(); g.moveTo(bx, by)
    g.bezierCurveTo(bx + s * h * 0.19, by, bx + s * h * 0.12, by - h * 0.18, bx + s * h * 0.3, by - h * 0.2)
    g.strokeStyle = color; g.lineWidth = h * (0.021 - i * 0.0015); g.stroke()
    for (let j = 0; j < 3; j++) {
      const lx = bx + s * h * (0.17 + j * 0.055), ly = by - h * (0.1 + j * 0.035)
      const w = h * 0.07, hh = h * 0.04
      g.beginPath(); g.moveTo(lx - w, ly + hh)
      g.bezierCurveTo(lx - w, ly - hh, lx + w * 0.35, ly - hh * 2, lx + w, ly - hh)
      g.bezierCurveTo(lx + w * 0.7, ly + hh, lx - w * 0.1, ly + hh * 1.3, lx - w, ly + hh)
      g.fillStyle = color; g.fill()
    }
  }
}

export const landscape = piece('burden-landscape', (g, t) => {
  let sky = mixHex('#DAD6BD', '#9FAEAA', smooth(t, 65, 119))
  sky = mixHex(sky, '#252D2E', smooth(t, 147, 163))
  sky = mixHex(sky, '#BABBA4', smooth(t, 279, 291))
  sky = mixHex(sky, '#37463F', smooth(t, 329, 356))
  rect(g, -100, -120, 500, 300, sky)

  // The Shire is broad, quiet earth, with the workings cut into its edge.
  g.beginPath(); g.moveTo(-40, 7)
  g.bezierCurveTo(-31, -5, -27, -3, -17, -1.5)
  g.bezierCurveTo(-8, -7, -2, -5, 8, -1.5)
  g.bezierCurveTo(18, 2, 20, -6, 34, 0)
  g.lineTo(36, 20); g.lineTo(-40, 20); g.closePath(); g.fillStyle = '#B0B49A'; g.fill()
  g.beginPath(); g.moveTo(-30, 8)
  g.bezierCurveTo(-18, -3, -10, -5, 1, -1.4)
  g.bezierCurveTo(10, 3.8, 15, -1.4, 28, 3.3)
  g.lineTo(28, 32); g.lineTo(-30, 32); g.closePath(); g.fillStyle = '#6F8068'; g.fill()
  shape(g, [[-30, 5], [-8, 0.24], [1, 0.24], [8, 1.24], [24, 3.24], [29, 3.24], [29, 30], [-30, 30]], '#424F42')
  line(g, [[-8, 0.215], [1, 0.215], [8, 1.215], [24, 3.215], [28.6, 3.215]], '#B9BA98', 0.12)
  for (let i = 0; i < 95; i++) {
    const x = -10 + hash(i, 1) * 38, y = 4.1 + hash(i, 9) * 6
    line(g, [[x, y], [x + 0.18, y - 0.1]], '#65715A', 0.025)
  }
  for (const [x, y, h] of [[10, 1.4, 4.8], [19, 2.8, 6.8], [25, 3, 4.5]]) branch(g, x, y, h, '#59694F', x)

  // Rivendell: the valley is the scale; nine empty seats stand for the council.
  shape(g, [[27, 4], [30, 0], [34, -3.2], [38, -0.6], [44, -5.3], [49, 2], [49, 26], [27, 26]], '#86968C')
  rock(g, [[26, 3.3], [29, 3.3], [30, 9], [33, 30], [26, 30]], '#66776C', 11)
  rock(g, [[39, 2.4], [43, 1.64], [47, 1.24], [48, 30], [39, 30]], '#768477', 15)
  for (let i = 0; i < 5; i++) line(g, [[31.1 + i * 0.16, 6], [30.8 + i * 0.16, 12], [31.6 + i * 0.16, 20]], '#B5C1B6', 0.045)

  // The high pass, three planes of unpolished slate and snow.
  shape(g, [[38, 2], [44, -11], [49, -6], [54, -20], [63, -7], [69, -16], [77, 2]], '#899995')
  shape(g, [[43, -10], [44, -11], [49, -6], [54, -20], [57, -15], [54, -16], [52, -11], [50, -7]], '#D3D5C4')
  rock(g, [[41, 2], [44, -4], [48, -2], [48, 26], [41, 26]], '#697971', 21)
  rock(g, [[52.65, -8.785], [55.35, -8.785], [58, -7.785], [61, -3.785], [64, 0.215], [67, 27], [54, 27]], '#5B6963', 24)
  line(g, [[39.2, 2.365], [41.276, 2.012], [45.65, 1.215], [47, 1.215]], '#B2B3A1', 0.11)
  line(g, [[52.65, -8.785], [55.35, -8.785], [58, -7.785], [61, -3.785], [64, 0.215]], '#C3C7B8', 0.13)

  // Moria is an absence cut into a mountain, with just enough masonry to measure it.
  rect(g, 62.5, -45, 75, 100, '#252D2E')
  for (let i = 0; i < 10; i++) {
    const x = 63 + i * 7.7
    if (x > 105 && x < 131) continue
    shape(g, [[x - 0.6, -35], [x + 0.6, -35], [x + 0.46, 24], [x - 0.46, 24]], '#303A3B')
    for (let y = -28; y < 25; y += 4) line(g, [[x - 0.45, y], [x + 0.45, y]], '#414B48', 0.035)
  }
  for (const x of [67, 75, 95, 103, 133]) {
    rock(g, [[x - 0.5, -30], [x + 0.5, -30], [x + 0.8, 5.3], [x + 1.4, 6], [x - 1.4, 6], [x - 0.8, 5.3]], '#47524E', x)
    line(g, [[x - 0.15, -27], [x - 0.15, 4.7]], '#69726A', 0.05)
    for (const y of [-12, -6, 0]) {
      line(g, [[x - 0.56, y], [x + 0.56, y]], '#273930', 0.045)
      line(g, [[x - 0.52, y + 0.1], [x + 0.52, y + 0.1]], '#6C786A', 0.025)
    }
    shape(g, [[x - 0.8, -7], [x - 3, -10], [x - 2.7, -10.4], [x, -8.5], [x + 2.7, -10.4], [x + 3, -10], [x + 0.8, -7]], '#4B5752')
  }
  rock(g, [[62, 0.24], [64, 0.24], [72, 1.24], [78, 2.24], [79, 33], [62, 33]], '#47544F', 29)
  line(g, [[64, 0.24], [72, 1.24], [78, 2.24]], '#9A9F8E', 0.11)
  rock(g, [[91.33, 6.49], [97, 5.215], [104, 5.215], [105, 10], [102, 13], [104, 22], [100, 33], [91, 33]], '#4C5853', 30)
  line(g, [[91.33, 6.49], [97, 5.215], [104, 5.215]], EDGE, 0.09)
  rock(g, [[132, 5.24], [139, 5.24], [141, 5.6], [141, 35], [131, 35], [133, 18], [130.5, 14]], '#59665B', 31)
  line(g, [[132, 5.215], [139, 5.215], [142.65, 5.715], [144, 5.715]], EDGE, 0.09)

  // Lothlórien's woven roots lower the travellers to the Anduin.
  for (let i = 0; i < 6; i++) branch(g, 140 + i * 3.1, 12, 19 + hash(i, 45) * 5, i % 2 ? '#72836B' : '#65785F', 50 + i)
  rock(g, [[137.5, 5.215], [139, 5.215], [142.65, 5.715], [145.35, 5.715], [145, 15], [138, 19]], '#707E66', 34)
  rock(g, [[149, 10.94], [155, 10.94], [154.6, 13], [149, 16]], '#777F68', 39)
  line(g, [[149.5, 10.94], [155, 10.94]], '#C2BC99', 0.1)

  // The river has no specular reflection: cut horizontal lines in a matte sheet.
  rect(g, 145, 11.2, 100, 50, mixHex('#8D9F93', '#566F65', smooth(t, 325, 353)))
  for (let i = 0; i < 85; i++) {
    const x = 145 + hash(i, 70) * 60 - (t * 0.018 % 2), y = 11.6 + hash(i, 74) * 18
    line(g, [[x, y], [x + 0.45 + hash(i, 80) * 2.2, y]], '#9DAA92', 0.025)
  }
  shape(g, [[171, 10], [183, -4], [189, 2], [197, -12], [202, -6], [209, -1], [220, -9], [230, 15]], '#57665A')
  shape(g, [[181, 14], [197, -12], [194, -1], [200, 6], [207, 2], [224, 17]], '#46564C')
  line(g, [[197, -12], [195, -5], [197, -3]], '#8B9380', 0.04)
})

export const bagEnd = piece('burden-round-door-latch', (g, t) => {
  // A ring rolls out of a round, timber-lined pocket and trips the only latch.
  disk(g, -4.5, -1.25, 1.74, '#B6AE86', INK, 0.1)
  disk(g, -4.5, -1.25, 1.45, '#304A3B', INK, 0.07)
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.35, half = Math.sqrt(1.39 ** 2 - x * x)
    line(g, [[-4.5 + x, -1.25 - half], [-4.5 + x, -1.25 + half]], '#62765A', 0.032)
  }
  ring(g, -4.5, -1.25, 1.6, '#D0C59B', 0.045)
  for (let i = 0; i < 19; i++) {
    const a = i * Math.PI * 2 / 19
    line(g, [[-4.5 + Math.cos(a) * 1.53, -1.25 + Math.sin(a) * 1.53], [-4.5 + Math.cos(a) * 1.71, -1.25 + Math.sin(a) * 1.71]], '#746F50', 0.035)
  }
  for (const y of [-2.1, -0.55]) {
    line(g, [[-5.62, y], [-4.98, y]], '#26392C', 0.1)
    disk(g, -5.52, y, 0.035, '#92936A'); disk(g, -5.1, y, 0.035, '#92936A')
  }
  disk(g, -4.5, -1.25, 0.08, BRASS)
  shape(g, [[-4.5, -1.12], [-4.1, -1.16], [-2.25, 0.18], [-2.45, 0.29]], '#97855D', INK)
  line(g, [[-4.3, -1.2], [-2.48, 0.22], [1, 0.22]], '#D1BE8A', 0.06)
  const released = smooth(t, 7.6, 9.3)
  g.save(); g.translate(-1.7, 0.24); g.rotate(-1.45 * released + settle(t, 9.3, 0.05))
  shape(g, [[-0.09, 0], [-0.09, -0.64], [0.09, -0.64], [0.09, 0]], '#81714C', INK)
  g.restore()
  disk(g, -1.7, 0.24, 0.1, BRASS, INK)
  line(g, [[-1.7, 0.24], [-2.1, 0.7], [-3.4, 0.7]], '#A19369', 0.055)
  for (const x of [-1.2, 0.2, 2, 3.4, 5.1, 7]) {
    const y = x <= 1 ? 0.3 : (x - 1) / 7 + 0.3
    line(g, [[x, y], [x - 0.15, y + 0.8]], '#263C30', 0.09)
  }
})

export const shutters = piece('burden-root-shutters', (g, t) => {
  for (let i = 0; i < 3; i++) {
    const x = 11 + i * 5.2, y = 1.6 + i * 0.55, hit = 34 + i * 10.2
    const a = 0.1 + 1.15 * smooth(t, hit + 5, hit + 7) + settle(t, hit + 7, -0.08, 2.6, 3.8)
    branch(g, x - 0.4, y + 0.3, 5, '#36483B', 120 + i)
    g.save(); g.translate(x, y - 3.3); g.rotate(a)
    shape(g, [[-0.12, 0], [0.14, 0], [0.65, 3], [0.35, 3.5], [0.02, 3.13], [-0.28, 3.4], [-0.43, 2.85]], '#293B31', '#77876A', 0.035)
    line(g, [[0, 0.3], [0.1, 2.7]], '#52644E', 0.045)
    g.restore()
    disk(g, x, y - 3.3, 0.12, '#AEAE89', INK)
    const c = Math.cos(rootAngle(t)), s = Math.sin(rootAngle(t))
    line(g, [[x, y - 3.3], [x - 1.1, y - 3.8], [x - 1.1 + s * 0.5, y - 3.8 + c * 1.4]], '#B0AD89', 0.035)
    shape(g, [[x - 1.32, y - 2.4], [x - 0.9, y - 2.4], [x - 0.98, y - 1.85], [x - 1.26, y - 1.85]], '#67765D', INK)
  }
})

export const council = piece('burden-council-balance', (g, t) => {
  // The empty seats are architectural. Only the same three balls ever sit on the balance.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI, x = 34 + Math.cos(a) * 5.5, y = 1.7 + Math.sin(a) * 1.5
    const h = 1.25 + Math.sin(i * Math.PI / 8) * 0.4
    line(g, [[x - 0.2, y], [x - 0.24, y - h], [x, y - h - 0.35], [x + 0.24, y - h], [x + 0.2, y]], '#CAD0B8', 0.07)
    line(g, [[x - 0.25, y], [x + 0.25, y]], '#D3D2B8', 0.085)
  }
  shape(g, [[33.65, 4.1], [34.35, 4.1], [34.65, 12], [34, 15], [33.35, 12]], '#66796D', '#A3AD98', 0.04)
  g.save(); g.translate(34, 4.015); g.rotate(councilAngle(t))
  shape(g, [[-5.6, -0.8], [5.6, -0.8], [5.3, -0.55], [0.5, 0.18], [-0.5, 0.18], [-5.3, -0.55]], '#AFB398', INK, 0.06)
  line(g, [[-5.5, -0.82], [5.5, -0.82]], '#E1D7B2', 0.065)
  for (let x = -4; x <= 4; x += 1) line(g, [[x, -0.55], [x * 0.15, 0.07]], '#69796B', 0.03)
  g.restore()
  disk(g, 34, 4.015, 0.24, BRASS, INK, 0.06)
  ring(g, 34, 4.015, 0.1, '#D7CAA2', 0.03)
})

export const mountainLift = piece('burden-mountain-counterweight', (g, t) => {
  line(g, [[46.3, 2], [53.3, -8], [53.3, -11.6]], '#C3C7B5', 0.1)
  line(g, [[48.1, 2], [55.1, -8], [55.1, -11.6]], '#485950', 0.16)
  for (let i = 0; i < 25; i++) {
    const u = i / 24
    line(g, [[mix(46.3, 53.3, u), mix(2, -8, u)], [mix(46.75, 53.75, u), mix(2, -8, u)]], '#8D9B8C', 0.07)
  }
  const q = liftAt(t), u = smooth(t, 112, 140), weightY = -8.4 + 8.5 * u
  line(g, [[q[0], q[1] - 1.8], [54, -11.5], [56.2, -11.5], [56.2, weightY]], '#B3B6A0', 0.045)
  pulley(g, 54.6, -11.5, 0.7, u * 9)
  rock(g, [[55.8, weightY], [56.6, weightY], [56.7, weightY + 1.8], [55.7, weightY + 1.8]], '#778276', 44)
  line(g, [[55.7, weightY + 0.3], [56.7, weightY + 0.3]], '#B2B39C', 0.07)
  g.save(); g.translate(q[0], q[1])
  shape(g, [[-1.35, RADIUS], [1.35, RADIUS], [1.1, 0.6], [-1.1, 0.6]], '#8C8E76', INK, 0.05)
  line(g, [[-1.2, 0.25], [-1.05, -0.65], [0, -1.8], [1.05, -0.65], [1.2, 0.25]], '#B9BBA4', 0.045)
  line(g, [[-1.2, RADIUS], [1.2, RADIUS]], '#D2CAAA', 0.06)
  g.restore()
  // A falling slab seals the pass after the company leaves the cradle.
  const close = smooth(t, 145, 149)
  rock(g, [[53.8, -15 + close * 4], [57.2, -16 + close * 4], [57.8, -13.2 + close * 4], [54.2, -12 + close * 4]], '#A7AFA1', 51)
  line(g, [[54.2, -12 + close * 4], [57.8, -13.2 + close * 4]], '#D4D6C3', 0.07)
})

export const westDoor = piece('burden-stone-door', (g, t) => {
  // The left jamb hides the change from daylight to the unlit hall.
  const open = smooth(t, 151, 157)
  rock(g, [[61.8, -14], [64.8, -14], [64.8, -3], [63.2, -1.1], [61.8, -1.2]], '#566961', 61)
  line(g, [[62.3, -2], [62.3, -8], [63.4, -9.4], [64.3, -8], [64.3, -2]], '#B3BCA7', 0.055)
  rect(g, 63.3, -4.4 - 4 * open, 1.15, 4.3, '#64776C')
  line(g, [[63.3, -0.1 - 4 * open], [64.45, -0.1 - 4 * open]], '#A7B3A0', 0.08)
  ring(g, 63.9, -5.2, 0.33, '#A5B4A0', 0.035)
})

export const stair = piece('burden-bucket-stair', (g, t) => {
  const drop = smooth(t, 187.2, 194), bucketY = -0.7 + 9 * drop
  line(g, [[77.1, bucketY], [76.8, -2.5], [82.7, -2.5], [78.4, 2.36]], '#7C8A7B', 0.032)
  pulley(g, 76.8, -2.5, 0.35, drop * 15, '#A0A78D')
  pulley(g, 82.7, -2.5, 0.35, drop * 15, '#A0A78D')
  g.save(); g.translate(77.1, bucketY); g.rotate(settle(t, 187.2, 0.22, 4, 3))
  shape(g, [[-0.34, 0], [0.34, 0], [0.25, 0.65], [-0.25, 0.65]], '#7C8775', INK, 0.04)
  arc(g, 0, 0, 0.3, Math.PI, Math.PI * 2, '#A7AB91', 0.045)
  line(g, [[-0.3, 0.2], [0.3, 0.2]], INK, 0.035)
  g.restore()
  // The ring nudges a short trigger. The falling bucket withdraws this pawl;
  // the stair's own weight then lowers it, so the rope is not an impossible lift.
  g.save(); g.translate(77.5, 2.22); g.rotate(0.85 * smooth(t, 186.7, 187.5))
  line(g, [[-0.23, 0], [0, -0.23], [0.25, -0.23]], BRASS, 0.065)
  g.restore()
  g.save(); g.translate(78, 2.215); g.rotate(-0.7 * smooth(t, 187.2, 188.5))
  shape(g, [[0, 0], [0.55, 0.04], [0.62, 0.4], [0.46, 0.4], [0.4, 0.18], [0, 0.16]], '#A9AA8A', INK, 0.04)
  g.restore()
  // The whole stair rocks onto its far abutment. Riders read this identical angle.
  g.save(); g.translate(78, 2 + RADIUS); g.rotate(stairAngle(t)); g.translate(7, 0)
  shape(g, [[-7.3, 0], [7.3, 0], [7.3, 0.6], [5, 1.1], [-5, 1.1], [-7.3, 0.6]], '#718072', INK, 0.07)
  line(g, [[-7.3, 0], [7.3, 0]], '#C2C4A9', 0.09)
  for (let i = 0; i < 20; i++) {
    const x = -7 + i * 0.7
    line(g, [[x, 0.07], [x, 0.6]], '#424E47', 0.05)
    line(g, [[x + 0.1, 0.2], [x + 0.43, 0.2]], '#8F9985', 0.025)
  }
  g.restore()
  disk(g, 78, 2.215, 0.2, '#ACAC8C', INK, 0.05)
  // A single left hinge, visibly tied into the rock. The centre has no false axle.
  shape(g, [[77.7, 2.45], [78.25, 2.45], [78.15, 4.7], [77.4, 5]], '#3D4B44')
})

export const bridge = piece('burden-sacrificial-bridge', (g, t) => {
  // The threat is a single iron counterweight. Its mass, not a particle effect, brings down the bridge.
  const load = smooth(t, 250, 263.4), released = phase(t, 274.2, 284)
  const fall = released * released * 60
  const weightY = 14 - load * 4 + fall
  shape(g, [[109, weightY - 1], [110, weightY - 5], [112, weightY - 2.4], [113.5, weightY - 4], [116, weightY - 2], [118.5, weightY - 4], [120, weightY - 2.4], [122, weightY - 5], [123, weightY - 1], [120.5, weightY + 4], [116, weightY + 7], [111.5, weightY + 4]], '#1C2425', '#4D5348', 0.08)
  shape(g, [[113.4, weightY - 1], [116, weightY - 2], [118.6, weightY - 1], [117.4, weightY + 4], [116, weightY + 5.4], [114.6, weightY + 4]], '#634A37')
  line(g, [[114.2, weightY], [116, weightY + 3.7], [117.8, weightY]], '#8E704D', 0.06)
  for (const s of [-1, 1]) {
    const start: Pt = [116 + s * 0.15, 5.4 + fall]
    const end: Pt = [116 + s * 3.2, weightY - 1]
    line(g, [start, end], '#AAA88C', 0.075)
    const n = 15
    for (let i = 0; i <= n; i++) {
      const u = i / n
      ring(g, mix(start[0], end[0], u), mix(start[1], end[1], u), 0.115, '#6D7463', 0.025)
    }
  }
  const y = 5 + RADIUS
  // Three coherent slabs. No confetti: after the failure the empty interval remains.
  for (let i = 0; i < 3; i++) {
    const x = 104 + i * 9.35, f = Math.max(0, t - 274.2 - i * 0.15)
    g.save(); g.translate(x, y + f * f * 0.38); g.rotate(f > 0 ? Math.min(1.2, f * 0.16) * (i % 2 ? -1 : 1) : 0)
    shape(g, [[0, 0], [9.35, 0], [9.35, 0.26], [8.7, 0.36], [0.4, 0.36], [0, 0.26]], '#929786', '#C4C4A8', 0.035)
    line(g, [[0.1, 0.13], [9.25, 0.13]], '#505F54', 0.03)
    for (let j = 1; j < 10; j++) line(g, [[j * 0.9, 0.02], [j * 0.9 + 0.08, 0.24]], '#626E60', 0.025)
    g.restore()
  }
  const pin = smooth(t, 263.4, 274.2)
  const perch = 5 + RADIUS - 0.65 * smooth(t, 243, 245) + 0.65 * smooth(t, 253, 257) + pin * 0.12 + fall
  line(g, [[115.69, perch], [116.31, perch]], '#C4C4A8', 0.07)
  line(g, [[116, perch + 0.04], [116, 5.7 + fall]], '#8B937C', 0.055)
  rect(g, 115.87, 5.24 + pin * 0.18 + fall, 0.26, 0.55, BRASS)
  line(g, [[115.9, 5.4 + fall], [115.45, 6.1 + fall]], '#D0BD87', 0.06)
})

export const leaf = piece('burden-leaf-descent', (g, t) => {
  const p = leafAt(t), u = smooth(t, 294, 307)
  line(g, [[p[0] - 0.9, p[1] - 0.05], [143.8, -1.8], [145.3, -1.8], [145.3, 0.6 - 5.2 * u]], '#C4BE94', 0.04)
  pulley(g, 144.4, -1.8, 0.6, -u * 8, '#B3B58C')
  shape(g, [[144.9, 0.6 - 5.2 * u], [145.7, 0.6 - 5.2 * u], [145.3, 2 - 5.2 * u]], '#828F6C', INK)
  g.save(); g.translate(p[0], p[1] + RADIUS)
  shape(g, [[-1.6, -0.08], [-1.2, 0.3], [-0.15, 0.5], [1.5, -0.06], [0.2, 0.03]], '#B1AB79', '#53674B', 0.045)
  line(g, [[-1.4, 0.03], [1.4, -0.04]], '#DFD1A2', 0.035)
  for (let i = 0; i < 6; i++) line(g, [[-1.1 + i * 0.34, 0.04], [-0.75 + i * 0.27, 0.28 - i * 0.025]], '#6B7D53', 0.024)
  g.restore()
})

/** Two immovable king-shaped piers: the river passes through their raised hands. */
function king(g: G, x: number, y: number, facing: number, scale: number): void {
  g.save(); g.translate(x, y); g.scale(facing * scale, scale)
  rock(g, [[-1.3, 0], [1.3, 0], [1, -9], [0.55, -10], [-0.65, -10], [-1.1, -9]], '#889180', 191)
  shape(g, [[-0.55, -9.5], [0.6, -9.5], [0.66, -11.3], [0.44, -11.7], [0.4, -12.3], [0.05, -12], [-0.3, -12.4], [-0.5, -11.8], [-0.66, -11.4]], '#A4AA93', '#596A59', 0.04)
  shape(g, [[-0.55, -9.8], [-0.9, -7], [-0.35, -5.9], [0.2, -9.8]], '#6C7B67')
  line(g, [[-0.18, -11.4], [0.25, -11.4], [0.18, -10.95], [0.42, -10.85]], '#4B5D4D', 0.055)
  shape(g, [[0.5, -9.1], [1.1, -8.6], [1.85, -9.8], [2.1, -11.1], [1.6, -11.4], [1.35, -10.1], [0.5, -10]], '#A4AA93', '#596A59', 0.04)
  shape(g, [[1.56, -11.1], [1.55, -12.1], [1.7, -12.7], [1.87, -12.65], [1.95, -12.05], [2.1, -12.5], [2.26, -12.45], [2.25, -11.3]], '#ADB198', '#596A59', 0.045)
  for (let i = 0; i < 4; i++) line(g, [[-0.65 + i * 0.37, -7.5], [-1 + i * 0.62, -0.6]], '#66765E', 0.04)
  shape(g, [[-1.55, 0], [1.55, 0], [1.8, 1], [-1.8, 1]], '#6D7F6C')
  g.restore()
}

export const river = piece('burden-river-skiff', (g, t) => {
  king(g, 164.5, 11.7, -1, 1.1)
  king(g, 176.5, 12.6, 1, 1.25)
  // The ruined seat's empty aperture tugs at the ring, then is left behind.
  rock(g, [[151.5, 10.9], [151.8, 7.1], [152.7, 6.4], [153.8, 7.1], [154.1, 10.9]], '#8A957D', 203)
  disk(g, 152.8, 7.5, 0.58, '#374A3C', '#ADB299', 0.08)
  line(g, [[152.8, 7.6], [152.8, 9.7]], '#6A7C60', 0.04)
  const q = boatAt(t)
  g.save(); g.translate(q[0], q[1] + RADIUS); g.rotate(boatAngle(t))
  shape(g, [[-1.6, -0.12], [-1.2, 0.4], [0.85, 0.4], [1.5, -0.16], [0.85, 0.08], [-1.1, 0.08]], '#A6976C', INK, 0.055)
  line(g, [[-1.4, -0.05], [-0.7, 0.18], [0.65, 0.18], [1.4, -0.1]], '#D3C296', 0.045)
  for (const x of [-0.8, -0.2, 0.4, 0.9]) line(g, [[x, 0.09], [x - 0.08, 0.35]], '#6C7053', 0.035)
  g.restore()
  const wake = smooth(t, 320, 325)
  for (let i = 0; i < 4; i++) {
    const x = q[0] - 1.4 - i * 0.45
    line(g, [[x - 0.55 * wake, 11.24 + i * 0.08], [x, 11.24 + i * 0.08]], '#C0C2A5', 0.027)
  }
}, (g, t) => {
  // The gunwale is the only foreground occluder; it stays below both riders' centres.
  const q = boatAt(t)
  g.save(); g.translate(q[0], q[1] + RADIUS); g.rotate(boatAngle(t))
  line(g, [[-1.18, 0.1], [1.08, 0.1]], '#3B4B3C', 0.06)
  g.restore()
})

export const burden = piece('burden-brass-ring', () => {}, (g, t) => {
  const q = ringAt(t), p = frodoAt(t)
  if (t >= 7.6) {
    g.beginPath(); g.moveTo(p[0] - 0.13, p[1] + 0.03)
    g.quadraticCurveTo((p[0] + q[0]) / 2, p[1] + 0.19, q[0] + 0.12, q[1])
    g.strokeStyle = '#AEA47B'; g.lineWidth = 0.026; g.stroke()
  }
  ring(g, q[0], q[1], 0.17, INK, 0.105)
  ring(g, q[0], q[1], 0.17, '#C4A463', 0.061)
})

export const ART = [landscape, bagEnd, shutters, council, mountainLift, westDoor, stair, bridge, leaf, river, burden]
