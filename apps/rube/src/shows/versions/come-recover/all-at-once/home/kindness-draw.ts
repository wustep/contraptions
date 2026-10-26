import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, smooth } from '../kit'
import { JUMPS } from '../music'
import { HOME } from '../worlds'
import { lantern, propEye, ROOM, table, type Pen } from './set'
import {
  ARM,
  APPEAR,
  armAt,
  B,
  ballAt,
  jawsAt,
  DESK,
  EYE_AT,
  eyeScale,
  eyeSwing,
  GIFT,
  gloveAt,
  HAMMER,
  headAt,
  HINGE,
  KARAOKE,
  LANTERNS,
  lanternSway,
  SPRING_FOOT,
  STACKS,
  STEAM,
  swingAt,
  TABLE,
  TRAP,
  type ArmPose,
} from './kindness-plan'

/**
 * The party corner's drawings: the new year party set up and waiting (the table with its red cloth, the dumpling
 * steamers, the karaoke machine, paper lanterns, a gift), the back office with the taxes, and Jobu's jumpers (the
 * glove in the gift box, the steel trap, the mallet, the arm). All in the room's cells, all from show time.
 */

/* ------------------------------------------------------------------ colours */

const BAMBOO = mixHex(HOME.wood, HOME.paper, 0.38)
const BAMBOO_DEEP = mixHex(HOME.wood, HOME.steelDark, 0.25)
const BAMBOO_RIM = mixHex(BAMBOO, HOME.wood, 0.45)
const LID = mixHex(BAMBOO, HOME.paper, 0.22)
/** The party's paper: red paper-cuts, mandarins for luck, a branch of plum blossom in a porcelain vase. */
const PAPER_CUT = mixHex(HOME.red, HOME.night, 0.06)
const MANDARIN = mixHex(HOME.red, HOME.gold, 0.58)
const LEAF = mixHex(HOME.tileDeep, '#3F7A4E', 0.6)
const BLOSSOM = mixHex(HOME.rose, HOME.paper, 0.2)
const BRANCH = mixHex(HOME.wood, HOME.night, 0.5)
const TAN = mixHex(mixHex(HOME.wood, HOME.butter, 0.45), HOME.paper, 0.15)
const TAN_DEEP = mixHex(HOME.wood, HOME.butter, 0.2)
const KARAOKE_BODY = mixHex(HOME.night, HOME.denim, 0.55)
const CARDBOARD = mixHex(HOME.wood, HOME.paper, 0.2)
const IRON = mixHex(HOME.steelDark, HOME.night, 0.35)
const TAPE = HOME.paper

/** A faint ink line: the ink at `a` alpha. */
function faint(pen: Pen, a: number, weight: number): void {
  const { p } = pen
  p.stroke(alpha(p, pen.ink, a))
  p.strokeWeight(weight)
  p.noFill()
}

/** A shape through points, closed. */
function poly(pen: Pen, pts: Pt[]): void {
  const { p, k } = pen
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the party: lanterns, table, steamers, karaoke */

/** The party's wall: where it is dressed for the new year, over the table (room cells). */
const DRESS = { x0: 29.7, x1: 36.0, swag: -4.2, dip: 0.32, scroll: { xs: [30.55, 34.55], top: -3.45, h: 1.38, w: 0.3 }, card: { x: 31.5, y: -2.48, r: 0.3 } }

/**
 * The wall over the party, dressed for the new year: crepe-paper festoons under the ceiling, red and gold by turns,
 * a pair of red couplet scrolls flanking the table, their brushed lines in gold, and between them a red luck card
 * hung on its point. It fills the pale wall the party stood under, and its paper stirs when the arm rushes past.
 */
export function drawPartyWall(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x0, x1, swag, dip } = DRESS
  // The festoons: scallops of crepe paper from tack to tack, a red run over a gold one, each sagging and stirring.
  const tacks = 7
  const span = (x1 - x0) / tacks
  for (const [hex, drop, off] of [
    [HOME.gold, dip * 1.18, 0.5],
    [HOME.red, dip, 0],
  ] as const) {
    for (let i = 0; i < tacks; i++) {
      const a = x0 + (i + off) * span
      const b = Math.min(x1, a + span)
      if (b - a < span * 0.5) continue
      const sag = drop * (1 + 0.06 * Math.sin(t * 1.7 + i * 1.3)) + 0.05 * Math.max(0, lanternSway(i % 2, t) * 4)
      solid(p, ink, w * 0.5, hex)
      p.beginShape()
      for (let j = 0; j <= 12; j++) {
        const u = j / 12
        p.vertex((a + (b - a) * u) * k, (swag + sag * Math.sin(Math.PI * u)) * k)
      }
      for (let j = 12; j >= 0; j--) {
        const u = j / 12
        p.vertex((a + (b - a) * u) * k, (swag + (sag - 0.1) * Math.sin(Math.PI * u) + 0.02) * k)
      }
      p.endShape(p.CLOSE)
      // The crepe's crinkle.
      faint(pen, 0.25, w * 0.35)
      for (let j = 1; j < 6; j++) {
        const u = j / 6
        const x = a + (b - a) * u
        const y = swag + sag * Math.sin(Math.PI * u)
        p.line(x * k, (y - 0.08) * k, x * k, (y - 0.01) * k)
      }
    }
  }
  // Each tack, a gold rosette.
  solid(p, ink, w * 0.5, HOME.gold)
  for (let i = 0; i <= tacks; i++) p.circle((x0 + i * span) * k, (swag + 0.01) * k, 0.12 * k)
  // The couplets: red scrolls on their wooden rods, a column of gold strokes down each.
  const sc = DRESS.scroll
  sc.xs.forEach((x, i) => {
    const lean = 0.012 * Math.sin(t * 1.1 + i * 2)
    p.push()
    p.translate(x * k, sc.top * k)
    p.rotate(lean)
    solid(p, ink, w * 0.7, HOME.red)
    p.rect(0, (sc.h / 2) * k, sc.w * k, sc.h * k)
    outline(p, HOME.gold, Math.max(1, w * 0.5))
    p.rect(0, (sc.h / 2) * k, (sc.w - 0.07) * k, (sc.h - 0.07) * k)
    solid(p, ink, w * 0.6, HOME.wood)
    for (const y of [-0.02, sc.h + 0.02]) p.rect(0, y * k, (sc.w + 0.12) * k, 0.05 * k, 0.02 * k)
    // The brushed lines: five marks a scroll, each a stroke or two, never the same twice.
    p.noFill()
    p.stroke(HOME.gold)
    p.strokeWeight(Math.max(1, 0.028 * k))
    for (let j = 0; j < 5; j++) {
      const cy = 0.2 + j * 0.25
      const h1 = hash(i, j, 31)
      const h2 = hash(i, j, 37)
      p.line(-0.08 * k, (cy - 0.05 + 0.04 * h1) * k, 0.08 * k, (cy - 0.06 + 0.03 * h2) * k)
      p.line((-0.02 + 0.05 * h2) * k, (cy - 0.09) * k, (0.0 + 0.04 * h1) * k, (cy + 0.07) * k)
      if (h1 > 0.45) p.line(-0.07 * k, (cy + 0.05) * k, 0.07 * k, (cy + 0.04 + 0.02 * h2) * k)
    }
    p.pop()
  })
  // The luck card, hung on its point from a tack, swinging a hair: red, a gold border, a gold flower in its middle.
  const cd = DRESS.card
  const swing = 0.03 * Math.sin(t * 1.4) + 0.06 * lanternSway(0, t)
  outline(p, ink, w * 0.4)
  p.line(cd.x * k, (cd.y - cd.r - 0.42) * k, cd.x * k, (cd.y - cd.r) * k)
  p.push()
  p.translate(cd.x * k, (cd.y - cd.r) * k)
  p.rotate(swing)
  p.translate(0, cd.r * k)
  p.rotate(Math.PI / 4)
  const side = cd.r * Math.SQRT2
  solid(p, ink, w * 0.8, HOME.red)
  p.rect(0, 0, side * k, side * k)
  outline(p, HOME.gold, Math.max(1, w * 0.6))
  p.rect(0, 0, (side - 0.09) * k, (side - 0.09) * k)
  p.rotate(-Math.PI / 4)
  p.noStroke()
  p.fill(HOME.gold)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    p.circle(Math.cos(a) * 0.11 * k, Math.sin(a) * 0.11 * k, 0.13 * k)
  }
  p.fill(HOME.red)
  p.circle(0, 0, 0.08 * k)
  p.pop()
  solid(p, ink, w * 0.5, HOME.gold)
  p.circle(cd.x * k, (cd.y - cd.r - 0.42) * k, 0.07 * k)
  for (const cut of CUTS) paperCut(pen, cut)
}

/**
 * The paper-cuts pasted on the tile for the new year, low enough to be in every close shot of the fight: round
 * window flowers in red paper, scalloped, a flower cut out of each so the tile shows through. One by the gift box,
 * one past the trap, one beyond the table's end.
 */
const CUTS: { x: number; y: number; r: number; petals: number; turn: number }[] = [
  { x: 27.62, y: -1.4, r: 0.21, petals: 6, turn: 0.25 },
  { x: 30.1, y: -1.36, r: 0.25, petals: 8, turn: 0 },
  { x: 35.06, y: -1.44, r: 0.24, petals: 5, turn: -0.2 },
]
function paperCut(pen: Pen, c: (typeof CUTS)[number]): void {
  const { p, k, ink, w } = pen
  const { r, petals: n } = c
  p.push()
  p.translate(c.x * k, c.y * k)
  p.rotate(c.turn)
  // The scalloped round, a notch between each scallop.
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(w * 0.35)
  p.fill(PAPER_CUT)
  p.beginShape()
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2
    const rr = r * (0.87 + 0.13 * Math.sqrt(Math.abs(Math.sin(n * a))))
    p.vertex(Math.cos(a) * rr * k, Math.sin(a) * rr * k)
  }
  p.endShape(p.CLOSE)
  // What is cut away: the petals of a flower round a ringed heart, and a seed between each two petals.
  p.noStroke()
  p.fill(HOME.tile)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    p.push()
    p.rotate(a)
    p.ellipse(0.46 * r * k, 0, 0.38 * r * k, 0.16 * r * k)
    p.pop()
    const b = a + Math.PI / n
    p.circle(Math.cos(b) * 0.72 * r * k, Math.sin(b) * 0.72 * r * k, 0.1 * r * k)
    p.circle(Math.cos(b) * 0.44 * r * k, Math.sin(b) * 0.44 * r * k, 0.06 * r * k)
  }
  p.circle(0, 0, 0.2 * r * k)
  p.fill(PAPER_CUT)
  p.circle(0, 0, 0.09 * r * k)
  p.pop()
}

/** A dish of mandarins for luck, between the karaoke machine and the steamers. */
export function drawMandarins(pen: Pen): void {
  const { p, k, ink, w } = pen
  const x = 31.9
  const top = TABLE.top
  // The dish: a low porcelain plate, a blue line round it.
  solid(p, ink, w * 0.6, HOME.enamel)
  p.rect(x * k, (top - 0.016) * k, 0.21 * k, 0.032 * k, 0.016 * k)
  outline(p, HOME.denim, Math.max(1, w * 0.4))
  p.line((x - 0.08) * k, (top - 0.016) * k, (x + 0.08) * k, (top - 0.016) * k)
  const r = 0.05
  const fruit: Pt[] = [
    [x - 0.05, top - 0.032 - r],
    [x + 0.05, top - 0.032 - r],
    [x, top - 0.032 - r - 0.085],
  ]
  fruit.forEach(([fx, fy], i) => {
    solid(p, ink, w * 0.6, MANDARIN)
    p.circle(fx * k, fy * k, 2 * r * k)
    p.noFill()
    p.stroke(alpha(p, HOME.paper, 0.55))
    p.strokeWeight(Math.max(1, w * 0.45))
    p.arc((fx - 0.012) * k, (fy - 0.012) * k, r * 1.1 * k, r * 1.1 * k, Math.PI * 1.05, Math.PI * 1.45)
    p.noStroke()
    p.fill(LEAF)
    p.circle(fx * k, (fy - r + 0.008) * k, 0.018 * k)
    // The top one keeps two of its leaves.
    if (i === 2) {
      solid(p, ink, w * 0.4, LEAF)
      for (const s of [-1, 1]) {
        p.push()
        p.translate(fx * k, (fy - r + 0.004) * k)
        p.rotate(s * 0.9 - 0.2)
        p.ellipse(0, -0.032 * k, 0.03 * k, 0.065 * k)
        p.pop()
      }
    }
  })
}

/**
 * A branch of plum blossom in a porcelain vase on the table's far end, behind Waymond: spring, and the new year. It
 * leans away from where she comes down to him, toward the couplet over it, and stirs when the arm rushes past.
 */
const VASE = { x: 34.02, h: 0.3 }
const BRANCHES: Pt[][] = [
  [[0, 0], [0.05, -0.24], [0.15, -0.44], [0.22, -0.7]],
  [[0.05, -0.24], [0.22, -0.33], [0.4, -0.4]],
  [[0.15, -0.44], [0.3, -0.52]],
  [[0, 0], [-0.04, -0.16], [-0.03, -0.36]],
]
const BLOSSOMS: { b: number; at: number; r: number }[] = [
  { b: 0, at: 0.42, r: 1 },
  { b: 0, at: 0.66, r: 0.85 },
  { b: 0, at: 0.86, r: 1.05 },
  { b: 0, at: 1, r: 0.6 },
  { b: 1, at: 0.45, r: 0.95 },
  { b: 1, at: 0.78, r: 1.1 },
  { b: 1, at: 1, r: 0.55 },
  { b: 2, at: 0.6, r: 0.9 },
  { b: 2, at: 1, r: 0.6 },
  { b: 3, at: 0.55, r: 0.9 },
  { b: 3, at: 1, r: 0.65 },
]
/** A point `u` (0..1) of the way along a polyline. */
function along(pts: Pt[], u: number): Pt {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]))
  let d = u * lens.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] > 0 ? Math.min(1, d / lens[i]) : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]
    }
    d -= lens[i]
  }
  return pts[pts.length - 1]
}
export function drawBlossoms(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const foot = TABLE.top
  const neck: Pt = [VASE.x, foot - VASE.h + 0.02]
  // The branch, stirred by the room's air and by the arm's rush, as the lanterns are.
  p.push()
  p.translate(neck[0] * k, neck[1] * k)
  p.rotate(0.015 * Math.sin(t * 1.2) + 0.5 * lanternSway(1, t))
  for (const [pass, col, wt] of [
    [0, ink, 2.0],
    [1, BRANCH, 1.0],
  ] as const) {
    outline(p, col, Math.max(1, w * wt))
    BRANCHES.forEach((br, i) => {
      if (pass === 0) p.strokeWeight(Math.max(1, w * (i === 0 ? 2.2 : 1.7)))
      else p.strokeWeight(Math.max(1, w * (i === 0 ? 1.1 : 0.8)))
      p.beginShape()
      for (const [x, y] of br) p.vertex(x * k, y * k)
      p.endShape()
    })
  }
  for (const bl of BLOSSOMS) {
    const [x, y] = along(BRANCHES[bl.b], bl.at)
    const s = 0.05 * bl.r
    const turn = hash(bl.b, Math.round(bl.at * 10), 5) * Math.PI
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(w * 0.3)
    p.fill(BLOSSOM)
    for (let i = 0; i < 5; i++) {
      const a = turn + (i / 5) * Math.PI * 2
      p.circle((x + Math.cos(a) * s * 0.5) * k, (y + Math.sin(a) * s * 0.5) * k, s * 0.75 * k)
    }
    p.noStroke()
    p.fill(HOME.gold)
    p.circle(x * k, y * k, s * 0.35 * k)
  }
  p.pop()
  // The vase: a meiping on its foot, white porcelain with a blue band.
  const prof: Pt[] = [
    [0.045, 0],
    [0.052, -0.03],
    [0.076, -0.12],
    [0.07, -0.19],
    [0.036, -0.245],
    [0.026, -0.27],
    [0.04, -0.3],
  ]
  solid(p, ink, w * 0.7, HOME.enamel)
  p.beginShape()
  for (const [x, y] of prof) p.vertex((VASE.x + x) * k, (foot + y) * k)
  for (let i = prof.length - 1; i >= 0; i--) p.vertex((VASE.x - prof[i][0]) * k, (foot + prof[i][1]) * k)
  p.endShape(p.CLOSE)
  outline(p, HOME.denim, Math.max(1, w * 0.55))
  p.line((VASE.x - 0.072) * k, (foot - 0.17) * k, (VASE.x + 0.072) * k, (foot - 0.17) * k)
  p.line((VASE.x - 0.06) * k, (foot - 0.05) * k, (VASE.x + 0.06) * k, (foot - 0.05) * k)
  // Between the bands, a spray of blue dots: a flower painted on the belly.
  p.noStroke()
  p.fill(HOME.denim)
  for (const [dx, dy] of [[0, -0.11], [-0.025, -0.1], [0.025, -0.1], [-0.014, -0.085], [0.014, -0.085]] as Pt[]) p.circle((VASE.x + dx) * k, (foot + dy) * k, 0.016 * k)
}

/**
 * The paper lanterns on their cords from the ceiling, each swinging about its hook in the ceiling. They come on with
 * the great hit, as she chooses kindness: the party is on.
 */
export function drawLanterns(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const lit = 0.85 * smooth(t, JUMPS.eye, JUMPS.eye + 0.3)
  LANTERNS.forEach((ln, i) => {
    const a = lanternSway(i, t)
    const top: Pt = [ln.x, ROOM.ceiling]
    const hook: Pt = [ln.x + ln.cord * Math.sin(a), ROOM.ceiling + ln.cord * Math.cos(a)]
    outline(p, ink, w * 0.5)
    p.line(top[0] * k, top[1] * k, hook[0] * k, hook[1] * k)
    lantern(pen, hook[0], hook[1], { open: 1, lit, sway: -a, size: ln.size })
  })
}

/** The party table: its folding frame, a red cloth with a gold hem over it. */
export function drawTable(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, top } = TABLE
  table(pen, x0, x1, top)
  // The cloth: hangs a little over each end and down the front, with a gold band near its hem.
  const drop = 0.34
  solid(p, ink, w, HOME.red)
  p.beginShape()
  p.vertex((x0 - 0.05) * k, (top - 0.005) * k)
  p.vertex((x1 + 0.05) * k, (top - 0.005) * k)
  p.vertex((x1 + 0.06) * k, (top + drop) * k)
  for (let i = 0; i <= 12; i++) {
    const x = x1 + 0.06 - ((x1 - x0 + 0.12) * i) / 12
    p.vertex(x * k, (top + drop + (i % 2 === 0 ? 0 : 0.03)) * k)
  }
  p.vertex((x0 - 0.06) * k, (top + drop) * k)
  p.endShape(p.CLOSE)
  outline(p, HOME.gold, Math.max(1, w * 0.9))
  p.line((x0 - 0.05) * k, (top + drop - 0.07) * k, (x1 + 0.05) * k, (top + drop - 0.07) * k)
  // A soft fold or two.
  faint(pen, 0.35, w * 0.4)
  for (const fx of [x0 + 0.9, x0 + 2.1]) p.line(fx * k, (top + 0.04) * k, (fx - 0.03) * k, (top + drop - 0.1) * k)
}

/**
 * One bamboo steamer basket from (x0, foot) up, seen side-on: a round basket's woven wall between two bound rims, the
 * rattan lashing where its band overlaps; `lid` for the top one, a woven lattice lid sat in it with its rim proud.
 * Its top is the step she rolls on, flat at foot - h.
 */
function steamer(pen: Pen, x0: number, foot: number, lid: boolean, seed: number): void {
  const { p, k, ink, w } = pen
  const { w: W, h: H } = STEAM
  const x1 = x0 + W
  const top = foot - H
  const rim = H * 0.2
  // The wall, its rims a shade deeper, rounded at the corners as a drum is.
  solid(p, ink, w * 0.8, BAMBOO)
  p.rect((x0 + W / 2) * k, (foot - H / 2) * k, W * k, H * k, 0.035 * k)
  p.noStroke()
  p.fill(BAMBOO_RIM)
  p.rect((x0 + W / 2) * k, (foot - rim / 2 - 0.006) * k, (W - 0.02) * k, rim * k, 0.02 * k)
  if (!lid) p.rect((x0 + W / 2) * k, (top + rim / 2 + 0.006) * k, (W - 0.02) * k, rim * k, 0.02 * k)
  // The weave between the rims: two courses of split bamboo, their slats staggered, the round's turn shading its ends.
  const w0 = lid ? top + H * 0.42 : top + rim + 0.006
  const w1 = foot - rim - 0.006
  const courses = 2
  faint(pen, 0.32, w * 0.35)
  for (let c = 0; c < courses; c++) {
    const a = w0 + ((w1 - w0) * c) / courses
    const b = w0 + ((w1 - w0) * (c + 1)) / courses
    if (c > 0) p.line((x0 + 0.02) * k, a * k, (x1 - 0.02) * k, a * k)
    for (let x = x0 + 0.035 + (c % 2) * 0.022; x < x1 - 0.02; x += 0.044) p.line(x * k, (a + 0.008) * k, x * k, (b - 0.008) * k)
  }
  p.noStroke()
  p.fill(alpha(p, BAMBOO_DEEP, 0.28))
  p.rect((x0 + 0.03) * k, (foot - H / 2) * k, 0.04 * k, (H - 0.03) * k, 0.02 * k)
  p.rect((x1 - 0.03) * k, (foot - H / 2) * k, 0.04 * k, (H - 0.03) * k, 0.02 * k)
  // Where the band's ends overlap, bound in rattan: a strip and its stitches, never in the same place twice.
  const lx = x0 + W * (0.28 + 0.44 * hash(seed, 3, 41))
  p.fill(BAMBOO_DEEP)
  p.rect(lx * k, (foot - H / 2) * k, 0.035 * k, (H - 0.02) * k, 0.01 * k)
  p.stroke(alpha(p, HOME.paper, 0.6))
  p.strokeWeight(Math.max(1, w * 0.35))
  for (let i = 0; i < 3; i++) {
    const y = foot - H * (0.25 + 0.25 * i)
    p.line((lx - 0.014) * k, (y + 0.012) * k, (lx + 0.014) * k, (y - 0.012) * k)
  }
  // The rims' line where wall meets band.
  outline(p, BAMBOO_DEEP, Math.max(1, w * 0.45))
  p.line((x0 + 0.02) * k, (foot - rim - 0.006) * k, (x1 - 0.02) * k, (foot - rim - 0.006) * k)
  if (!lid) {
    p.line((x0 + 0.02) * k, (top + rim + 0.006) * k, (x1 - 0.02) * k, (top + rim + 0.006) * k)
    return
  }
  // The lid: a lattice of fine bamboo in a rim a hair wider than the basket, sat down into it.
  const lh = H * 0.42
  solid(p, ink, w * 0.7, LID)
  p.rect((x0 + W / 2) * k, (top + lh / 2) * k, (W + 0.03) * k, lh * k, 0.03 * k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect((x0 + 0.01) * k, (top + 0.012) * k, (W - 0.02) * k, (lh - 0.024) * k)
  ctx.clip()
  faint(pen, 0.28, w * 0.32)
  for (let x = x0 - lh; x < x1 + lh; x += 0.04) {
    p.line(x * k, (top + lh) * k, (x + lh) * k, top * k)
    p.line(x * k, top * k, (x + lh) * k, (top + lh) * k)
  }
  ctx.restore()
  outline(p, BAMBOO_DEEP, Math.max(1, w * 0.45))
  p.line((x0 - 0.005) * k, (top + 0.02) * k, (x1 + 0.005) * k, (top + 0.02) * k)
}

/** The dumpling steamers: three stacks stepping down to the right, the steps she comes down at the end. */
export function drawSteamers(pen: Pen): void {
  STACKS.forEach((st, s) => {
    for (let i = 0; i < st.n; i++) steamer(pen, st.x0, TABLE.top - i * STEAM.h, i === st.n - 1, s * 4 + i)
  })
}

/**
 * The steam off the dumplings: thin curls rising out of each lid's lattice, swaying as they go and gone into the air a
 * hand over it. Over the steamers, under her.
 */
export function drawSteam(pen: Pen, t: number): void {
  const { p, k, w } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  STACKS.forEach((st, s) => {
    const top = TABLE.top - st.n * STEAM.h
    for (let j = 0; j < 2; j++) {
      const period = 2.6 + 0.4 * hash(s, j, 17)
      const u = (t / period + hash(s, j, 23)) % 1
      const x = st.x0 + STEAM.w * (0.3 + 0.4 * j) + 0.02 * Math.sin(t * 0.9 + s)
      const rise = 0.55
      const fade = Math.sin(Math.PI * u)
      if (fade < 0.05) continue
      ctx.save()
      p.noFill()
      p.stroke(alpha(p, HOME.paper, 0.55 * fade))
      p.strokeWeight(Math.max(1, w * 0.9))
      p.beginShape()
      for (let i = 0; i <= 8; i++) {
        const v = i / 8
        const y = top - 0.03 - rise * (u * 0.55 + v * 0.45)
        const sway = 0.035 * Math.sin(v * 5.5 + t * 2.2 + j * 2 + s) * (0.3 + v)
        p.vertex((x + sway) * k, y * k)
      }
      p.endShape()
      ctx.restore()
    }
  })
}

/** The karaoke machine on the table's near end: a speaker box with its grille, a little screen, a microphone. */
export function drawKaraoke(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, h } = KARAOKE
  const top = TABLE.top - h
  solid(p, ink, w, KARAOKE_BODY)
  p.rect(((x0 + x1) / 2) * k, (TABLE.top - h / 2) * k, (x1 - x0) * k, h * k, 0.05 * k)
  // Its handle.
  outline(p, ink, w * 0.9)
  p.arc(((x0 + x1) / 2) * k, top * k, 0.34 * k, 0.16 * k, Math.PI, Math.PI * 2)
  // The speaker.
  solid(p, ink, w * 0.7, HOME.steel)
  p.circle((x0 + 0.2) * k, (TABLE.top - h * 0.45) * k, 0.26 * k)
  solid(p, ink, w * 0.5, HOME.steelDark)
  p.circle((x0 + 0.2) * k, (TABLE.top - h * 0.45) * k, 0.1 * k)
  // The screen, dark, with a line of colour across it.
  solid(p, ink, w * 0.6, HOME.glassDeep)
  p.rect((x1 - 0.17) * k, (top + 0.12) * k, 0.2 * k, 0.12 * k, 0.015 * k)
  p.noStroke()
  p.fill(HOME.rose)
  p.rect((x1 - 0.19) * k, (top + 0.14) * k, 0.1 * k, 0.018 * k)
  // Two knobs.
  solid(p, ink, w * 0.5, HOME.steel)
  for (const kx of [x1 - 0.22, x1 - 0.12]) p.circle(kx * k, (TABLE.top - 0.1) * k, 0.045 * k)
  // The microphone, stood in its clip on the side.
  solid(p, ink, w * 0.6, HOME.steelDark)
  p.rect((x1 + 0.035) * k, (TABLE.top - 0.2) * k, 0.045 * k, 0.26 * k, 0.015 * k)
  solid(p, ink, w * 0.6, HOME.steel)
  p.ellipse((x1 + 0.035) * k, (TABLE.top - 0.36) * k, 0.1 * k, 0.11 * k)
}

/* ------------------------------------------------------------------ the back office: the taxes */

/** The desk against the far wall: the adding machine and its tape, receipts, the audit letter, a lamp, a chair. */
export function drawDesk(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, top } = DESK
  // The wall calendar over it: a page of little squares, one ringed in red.
  solid(p, ink, w * 0.7, HOME.paper)
  p.rect(37.55 * k, -2.75 * k, 0.56 * k, 0.66 * k, 0.02 * k)
  solid(p, ink, w * 0.5, HOME.red)
  p.rect(37.55 * k, -3.02 * k, 0.56 * k, 0.12 * k)
  faint(pen, 0.45, w * 0.35)
  for (let i = 1; i < 4; i++) p.line((37.27 + 0.14 * i) * k, -2.94 * k, (37.27 + 0.14 * i) * k, -2.44 * k)
  for (let j = 1; j < 4; j++) p.line(37.29 * k, (-2.94 + 0.125 * j) * k, 37.81 * k, (-2.94 + 0.125 * j) * k)
  outline(p, HOME.red, Math.max(1, w * 0.7))
  p.circle(37.62 * k, -2.56 * k, 0.13 * k)
  // File boxes under it.
  solid(p, ink, w * 0.8, CARDBOARD)
  p.rect(37.05 * k, (FLOOR - 0.18) * k, 0.42 * k, 0.36 * k, 0.02 * k)
  p.rect(37.4 * k, (FLOOR - 0.14) * k, 0.3 * k, 0.28 * k, 0.02 * k)
  outline(p, ink, w * 0.5)
  p.line(36.95 * k, (FLOOR - 0.28) * k, 37.15 * k, (FLOOR - 0.28) * k)
  // The desk: a top, a leg at the near end, a pedestal of drawers at the far end.
  solid(p, ink, w, HOME.wood)
  p.rect((x0 + 0.07) * k, ((top + FLOOR) / 2) * k, 0.07 * k, (FLOOR - top) * k)
  p.rect((x1 - 0.28) * k, ((top + FLOOR) / 2) * k, 0.52 * k, (FLOOR - top) * k, 0.02 * k)
  p.rect(((x0 + x1) / 2) * k, (top + 0.035) * k, (x1 - x0 + 0.08) * k, 0.07 * k, 0.02 * k)
  outline(p, ink, w * 0.5)
  for (let i = 1; i < 3; i++) p.line((x1 - 0.52) * k, (top + 0.07 + ((FLOOR - top) * i) / 3) * k, (x1 - 0.04) * k, (top + 0.07 + ((FLOOR - top) * i) / 3) * k)
  solid(p, ink, w * 0.5, HOME.steel)
  for (let i = 0; i < 3; i++) p.rect((x1 - 0.28) * k, (top + 0.22 + ((FLOOR - top) * i) / 3) * k, 0.12 * k, 0.03 * k, 0.01 * k)
  // The adding machine, its paper roll, and the tape run out over the desk's edge.
  const ax = 36.98
  solid(p, ink, w * 0.8, HOME.enamel)
  poly(pen, [
    [ax - 0.17, top],
    [ax + 0.2, top],
    [ax + 0.16, top - 0.2],
    [ax - 0.13, top - 0.12],
  ])
  solid(p, ink, w * 0.5, HOME.steelDark)
  for (let i = 0; i < 3; i++) p.rect((ax - 0.06 + i * 0.08) * k, (top - 0.09 - i * 0.02) * k, 0.05 * k, 0.03 * k, 0.01 * k)
  solid(p, ink, w * 0.6, TAPE)
  p.circle((ax + 0.12) * k, (top - 0.27) * k, 0.12 * k)
  outline(p, ink, w * 0.55)
  p.fill(TAPE)
  p.beginShape()
  p.vertex((ax + 0.14) * k, (top - 0.22) * k)
  p.bezierVertex((ax - 0.3) * k, (top - 0.35) * k, (ax - 0.32) * k, (top + 0.1) * k, (x0 - 0.02) * k, (top + 0.16) * k)
  p.vertex((x0 - 0.02) * k, (top + 0.5) * k)
  p.vertex((x0 + 0.04) * k, (top + 0.5) * k)
  p.bezierVertex((x0 + 0.04) * k, (top + 0.18) * k, (ax - 0.22) * k, (top - 0.25) * k, (ax + 0.1) * k, (top - 0.2) * k)
  p.endShape(p.CLOSE)
  // The receipts, stacked and clipped.
  for (let i = 0; i < 5; i++) {
    solid(p, ink, w * 0.45, HOME.paper)
    p.rect((37.52 + 0.015 * ((i * 7) % 3)) * k, (top - 0.02 - i * 0.035) * k, 0.3 * k, 0.03 * k)
  }
  solid(p, ink, w * 0.5, HOME.steelDark)
  p.rect(37.52 * k, (top - 0.2) * k, 0.07 * k, 0.05 * k)
  // The audit letter, propped against the lamp, with its red seal.
  p.push()
  p.translate(37.86 * k, (top - 0.17) * k)
  p.rotate(0.12)
  solid(p, ink, w * 0.55, HOME.paper)
  p.rect(0, 0, 0.2 * k, 0.32 * k)
  faint(pen, 0.4, w * 0.3)
  for (let i = 0; i < 3; i++) p.line(-0.07 * k, (-0.09 + i * 0.05) * k, 0.07 * k, (-0.09 + i * 0.05) * k)
  solid(p, ink, w * 0.4, HOME.red)
  p.circle(0.04 * k, 0.09 * k, 0.07 * k)
  p.pop()
  // The desk lamp: a base, a stem, a green-glass-less shade in denim.
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.rect(38.1 * k, (top - 0.02) * k, 0.2 * k, 0.04 * k, 0.01 * k)
  outline(p, ink, w * 0.9)
  p.line(38.1 * k, (top - 0.04) * k, 38.1 * k, (top - 0.36) * k)
  solid(p, ink, w * 0.8, HOME.denim)
  p.arc(38.06 * k, (top - 0.34) * k, 0.36 * k, 0.2 * k, Math.PI, Math.PI * 2, p.CHORD)
  // The chair, pushed in.
  const cx = 37.2
  solid(p, ink, w * 0.8, IRON)
  p.rect(cx * k, (FLOOR - 0.56) * k, 0.46 * k, 0.07 * k, 0.03 * k)
  p.rect((cx - 0.21) * k, (FLOOR - 0.83) * k, 0.07 * k, 0.5 * k, 0.03 * k)
  outline(p, ink, w)
  p.line(cx * k, (FLOOR - 0.52) * k, cx * k, (FLOOR - 0.12) * k)
  p.line((cx - 0.22) * k, (FLOOR - 0.1) * k, (cx + 0.22) * k, (FLOOR - 0.1) * k)
  solid(p, ink, w * 0.6, HOME.steelDark)
  for (const s of [-1, 1]) p.circle((cx + s * 0.21) * k, (FLOOR - 0.045) * k, 0.07 * k)
}

/* ------------------------------------------------------------------ the gift, and the glove in it */

/** The gift box on the floor (without its lid, which is drawn on its own). */
export function drawGiftBox(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x, w: W, h: H } = GIFT
  solid(p, ink, w, HOME.red)
  p.rect(x * k, (FLOOR - H / 2) * k, W * k, H * k, 0.02 * k)
  p.noStroke()
  p.fill(HOME.gold)
  p.rect(x * k, (FLOOR - H / 2) * k, 0.08 * k, (H - 0.01) * k)
  outline(p, ink, w * 0.5)
  p.line((x - 0.04) * k, (FLOOR - H) * k, (x - 0.04) * k, FLOOR * k)
  p.line((x + 0.04) * k, (FLOOR - H) * k, (x + 0.04) * k, FLOOR * k)
}

/** The lid, with its ribbon and bow, at `at` turned `turn`. */
export function drawLid(pen: Pen, at: Pt, turn: number): void {
  const { p, k, ink, w } = pen
  const W = GIFT.w + 0.05
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(turn)
  solid(p, ink, w, mixHex(HOME.red, HOME.paper, 0.08))
  p.rect(0, 0, W * k, 0.1 * k, 0.02 * k)
  p.noStroke()
  p.fill(HOME.gold)
  p.rect(0, 0, 0.08 * k, 0.09 * k)
  // The bow: two loops and a knot.
  solid(p, ink, w * 0.7, HOME.gold)
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex(0, -0.05 * k)
    p.bezierVertex(s * 0.05 * k, -0.2 * k, s * 0.2 * k, -0.2 * k, s * 0.14 * k, -0.07 * k)
    p.endShape(p.CLOSE)
  }
  p.circle(0, -0.06 * k, 0.05 * k)
  p.pop()
}

/** The spring the glove is on: a steel coil from its foot in the box to `end`. */
function coil(pen: Pen, from: Pt, to: Pt): void {
  const { p, k, ink, w } = pen
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy) || 1e-6
  const ux = dx / L
  const uy = dy / L
  const n = 11
  outline(p, ink, w * 1.1)
  p.beginShape()
  for (let i = 0; i <= n * 2; i++) {
    const f = i / (n * 2)
    const s = i === 0 || i === n * 2 ? 0 : i % 2 === 0 ? -1 : 1
    const x = from[0] + dx * f - uy * s * 0.06
    const y = from[1] + dy * f + ux * s * 0.06
    p.vertex(x * k, y * k)
  }
  p.endShape()
  outline(p, HOME.steel, Math.max(1, w * 0.5))
  p.beginShape()
  for (let i = 0; i <= n * 2; i++) {
    const f = i / (n * 2)
    const s = i === 0 || i === n * 2 ? 0 : i % 2 === 0 ? -1 : 1
    p.vertex((from[0] + dx * f - uy * s * 0.06) * k, (from[1] + dy * f + ux * s * 0.06) * k)
  }
  p.endShape()
}

/** A point of the glove's own frame (x forward from the cuff's end, y across) in the room's cells. */
function onGlove(g: { end: Pt; aim: number }, x: number, y: number): Pt {
  const c = Math.cos(g.aim)
  const sn = Math.sin(g.aim)
  return [g.end[0] + x * c - y * sn, g.end[1] + x * sn + y * c]
}

/** Where the glove's eye sits (on the back of the mitt), and its size. */
export function gloveEye(t: number): { at: Pt; r: number } {
  return { at: onGlove(gloveAt(t), 0.44, -0.1), r: 0.09 }
}

/** The boxing glove on its spring, if it is out: a laced white cuff, a tan leather mitt, its thumb; its eye from the touch. */
export function drawGlove(pen: Pen, t: number): void {
  const g = gloveAt(t)
  if (!g.out) return
  const { p, k, ink, w } = pen
  coil(pen, SPRING_FOOT, g.end)
  p.push()
  p.translate(g.end[0] * k, g.end[1] * k)
  p.rotate(g.aim)
  const V = (x: number, y: number) => p.vertex(x * k, y * k)
  const Bz = (a: number, b: number, c: number, d: number, e: number, f: number) => p.bezierVertex(a * k, b * k, c * k, d * k, e * k, f * k)
  // The cuff: white, laced up its back, a red band where it meets the mitt.
  solid(p, ink, w * 0.8, HOME.paper)
  p.rect(0.1 * k, 0, 0.21 * k, 0.23 * k, 0.03 * k)
  outline(p, ink, w * 0.45)
  for (let i = 0; i < 3; i++) {
    const x = 0.035 + i * 0.055
    p.line(x * k, -0.1 * k, (x + 0.04) * k, -0.02 * k)
    p.line((x + 0.04) * k, -0.1 * k, x * k, -0.02 * k)
  }
  solid(p, ink, w * 0.6, HOME.red)
  p.rect(0.22 * k, 0, 0.04 * k, 0.25 * k, 0.01 * k)
  // The mitt: long, round-knuckled, squashed on a touch.
  p.push()
  p.translate(0.24 * k, 0)
  p.scale(1 - 0.26 * g.squash, 1 + 0.16 * g.squash)
  solid(p, ink, w, TAN)
  p.beginShape()
  V(0, -0.12)
  Bz(0.04, -0.2, 0.2, -0.24, 0.3, -0.19)
  Bz(0.4, -0.15, 0.43, -0.07, 0.42, 0.01)
  Bz(0.41, 0.1, 0.34, 0.16, 0.22, 0.16)
  Bz(0.12, 0.16, 0.03, 0.15, 0, 0.12)
  p.endShape(p.CLOSE)
  // The thumb, a lobe along its near side, pointing forward.
  solid(p, ink, w * 0.8, TAN_DEEP)
  p.beginShape()
  V(0.04, 0.06)
  Bz(0.1, -0.01, 0.26, -0.02, 0.31, 0.04)
  Bz(0.34, 0.08, 0.3, 0.13, 0.24, 0.12)
  Bz(0.16, 0.11, 0.08, 0.12, 0.04, 0.06)
  p.endShape(p.CLOSE)
  // Its seam over the knuckles, and the shine on its back.
  outline(p, ink, w * 0.45)
  p.arc(0.3 * k, -0.02 * k, 0.16 * k, 0.28 * k, -Math.PI * 0.45, Math.PI * 0.05)
  p.stroke(alpha(p, HOME.paper, 0.5))
  p.strokeWeight(Math.max(1, w * 0.7))
  p.noFill()
  p.arc(0.2 * k, -0.06 * k, 0.26 * k, 0.2 * k, Math.PI * 1.1, Math.PI * 1.5)
  p.pop()
  p.pop()
  const sc = eyeScale(t, EYE_AT.glove)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.glove)
    const eye = gloveEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, watching(t, EYE_AT.glove, eye.at, e.swing - (g.aim + Math.PI / 2) * 0.15), e.lift)
  }
}

/* ------------------------------------------------------------------ the jaws */

/** One jaw, upright in its own frame (hinge at 0,0, reaching up), `side` -1 the near (left) one, 1 the far. */
function jaw(pen: Pen, side: number): void {
  const { p, k, ink, w } = pen
  const L = TRAP.jaw
  const n = 8
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const v = i / n
    const bow = 0.13 * Math.sin(Math.PI * v) + 0.02
    outer.push([side * (bow + 0.035), -L * v])
    inner.push([side * Math.max(0.004, bow - 0.035 - 0.07 * Math.sin(Math.PI * v)), -L * v])
  }
  solid(p, ink, w, IRON)
  p.beginShape()
  for (const [x, y] of outer) p.vertex(x * k, y * k)
  for (let i = inner.length - 1; i >= 0; i--) p.vertex(inner[i][0] * k, inner[i][1] * k)
  p.endShape(p.CLOSE)
  // Its teeth, along the inner edge.
  solid(p, ink, w * 0.5, HOME.steel)
  for (let i = 1; i < n; i++) {
    const [x, y] = inner[i]
    const half = (L / n) * 0.42
    p.triangle(x * k, (y - half) * k, x * k, (y + half) * k, (x - side * 0.055) * k, (y + (side > 0 ? half * 0.3 : -half * 0.3)) * k)
  }
  p.stroke(alpha(p, HOME.steel, 0.8))
  p.strokeWeight(Math.max(1, w * 0.5))
  p.noFill()
  p.beginShape()
  for (let i = 1; i < n; i++) p.vertex((outer[i][0] - side * 0.025) * k, outer[i][1] * k)
  p.endShape()
}

/** The steel trap: a base plate with its springs and pan, two toothed jaws on one hinge, and its eye from the snap. */
export function drawTrap(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x0, x1, plate } = TRAP
  const j = jawsAt(t)
  // The base plate and its two leaf springs.
  solid(p, ink, w, IRON)
  p.rect(((x0 + x1) / 2) * k, (FLOOR - plate / 2) * k, (x1 - x0) * k, plate * k, 0.015 * k)
  outline(p, ink, w * 0.9)
  for (const s of [-1, 1]) {
    const sx = HINGE[0] + s * 0.3
    p.arc(sx * k, (FLOOR - plate) * k, 0.18 * k, 0.1 * k, Math.PI, Math.PI * 2)
  }
  // The pan: a disc on its post, dipping as she drops on it.
  const dip = t >= B(127) ? 0.015 : 0
  solid(p, ink, w * 0.6, HOME.steel)
  p.ellipse(HINGE[0] * k, (FLOOR - plate - 0.02 + dip) * k, 0.26 * k, 0.035 * k)
  // The jaws, on their hinge; the whole trap bobs on it once it has shut.
  p.push()
  p.translate(HINGE[0] * k, HINGE[1] * k)
  p.rotate(j.sway)
  for (const side of [1, -1]) {
    p.push()
    p.rotate(side * j.open)
    jaw(pen, side)
    p.pop()
  }
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.circle(0, 0, 0.1 * k)
  p.pop()
  // Its eye, on the near jaw, high: shut and bobbing, it is a creature with a beak.
  const sc = eyeScale(t, EYE_AT.trap)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.trap)
    const eye = trapEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, watching(t, EYE_AT.trap, eye.at, e.swing + j.sway * 1.5), e.lift)
  }
}

/** Where the trap's eye sits (high on its near jaw), and its size. */
export function trapEye(t: number): { at: Pt; r: number } {
  const j = jawsAt(t)
  const a = j.sway - j.open
  const lx = -0.13
  const ly = -0.3
  return { at: [HINGE[0] + lx * Math.cos(a) - ly * Math.sin(a), HINGE[1] + lx * Math.sin(a) + ly * Math.cos(a)], r: 0.092 }
}

/* ------------------------------------------------------------------ the mallet */

export function drawHammer(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const [px, py] = HAMMER.pivot
  const phi = swingAt(t)
  const [hx, hy] = headAt(phi)
  // The bracket in the ceiling, the drop rod, the pivot.
  solid(p, ink, w * 0.8, HOME.steelDark)
  p.rect(px * k, (ROOM.ceiling + 0.04) * k, 0.34 * k, 0.08 * k, 0.01 * k)
  outline(p, ink, w * 1.1)
  p.line(px * k, ROOM.ceiling * k, px * k, py * k)
  // The handle.
  const ex = hx - Math.sin(phi) * HAMMER.headH * 0.5
  const ey = hy - Math.cos(phi) * HAMMER.headH * 0.5
  outline(p, ink, w * 2.2)
  p.line(px * k, py * k, ex * k, ey * k)
  outline(p, HOME.wood, Math.max(1, w * 1.2))
  p.line(px * k, py * k, ex * k, ey * k)
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.circle(px * k, py * k, 0.1 * k)
  // The head: a wooden mallet, banded with iron at its two faces.
  p.push()
  p.translate(hx * k, hy * k)
  p.rotate(-phi)
  solid(p, ink, w, HOME.wood)
  p.rect(0, 0, HAMMER.headW * k, HAMMER.headH * k, 0.05 * k)
  solid(p, ink, w * 0.8, IRON)
  for (const s of [-1, 1]) p.rect(s * (HAMMER.headW / 2 - 0.04) * k, 0, 0.08 * k, (HAMMER.headH + 0.02) * k, 0.02 * k)
  faint(pen, 0.35, w * 0.4)
  p.line(-0.12 * k, -0.07 * k, 0.12 * k, -0.07 * k)
  p.pop()
  // Its eye, on the head's side, looking out.
  const sc = eyeScale(t, EYE_AT.hammer)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.hammer)
    const eye = hammerEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, watching(t, EYE_AT.hammer, eye.at, e.swing + phi * 0.8), e.lift)
  }
}

/** Where the mallet's eye sits (on its head's side), and its size. */
export function hammerEye(t: number): { at: Pt; r: number } {
  const phi = swingAt(t)
  const [hx, hy] = headAt(phi)
  return { at: [hx + 0.02 * Math.cos(phi), hy - 0.02], r: 0.118 }
}

/* ------------------------------------------------------------------ the arm */

interface ArmGeom {
  /** The axis's angle from the mount, and the tongs' reach along it. */
  a: number
  reach: number
  /** Where the tongs end and the claw's block is. */
  end: Pt
}

function armGeom(pose: ArmPose): ArmGeom {
  const [mx, my] = ARM.mount
  const dx = pose.cup[0] - mx
  const dy = pose.cup[1] - my
  const d = Math.hypot(dx, dy)
  const a = Math.atan2(dy, dx)
  const reach = Math.max(0.3, d - ARM.palm)
  return { a, reach, end: [mx + Math.cos(a) * reach, my + Math.sin(a) * reach] }
}

/** A finger of the claw, in the arm's own frame (x along the arm from the block, y across): `side` -1 upper, 1 lower. */
function finger(pen: Pen, reach: number, side: number, open: number): void {
  const { p, k, ink, w } = pen
  const cx = reach + ARM.palm
  const rr = R + 0.045
  p.push()
  // Hinged at its root on the block, swung open outward.
  const root: Pt = [reach + 0.05, side * 0.07]
  p.translate(root[0] * k, root[1] * k)
  p.rotate(side * -open * 0.85)
  p.translate(-root[0] * k, -root[1] * k)
  const pts: Pt[] = []
  const a0 = side * (Math.PI * 0.86)
  const a1 = side * (Math.PI * 0.12)
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10
    pts.push([cx + Math.cos(a) * rr, Math.sin(a) * rr])
  }
  outline(p, ink, w * 2.2)
  p.beginShape()
  p.vertex(root[0] * k, root[1] * k)
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
  outline(p, HOME.steel, Math.max(1, w * 1.1))
  p.beginShape()
  p.vertex(root[0] * k, root[1] * k)
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
  // A rubber tip.
  const [tx, ty] = pts[pts.length - 1]
  solid(p, ink, w * 0.6, IRON)
  p.circle(tx * k, ty * k, 0.05 * k)
  p.pop()
}

/** The arm: its wall mount, the lazy tongs, the claw's block and its back finger (and its front one, if empty). */
export function drawArm(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const pose = armAt(t)
  const g = armGeom(pose)
  const [mx, my] = ARM.mount
  const n = ARM.units
  const u = g.reach / n
  const h = Math.sqrt(Math.max(0, ARM.link * ARM.link - u * u)) / 2
  // The mount: a slotted steel plate on the wall.
  solid(p, ink, w, HOME.steelDark)
  p.rect((mx + 0.06) * k, my * k, 0.16 * k, (2 * h + 0.2) * k, 0.03 * k)
  outline(p, ink, w * 0.5)
  p.line((mx + 0.06) * k, (my - h) * k, (mx + 0.06) * k, (my + h) * k)
  p.push()
  p.translate(mx * k, my * k)
  p.rotate(g.a)
  // The tongs: two runs of links crossing, pinned at every crossing.
  for (const pass of [0, 1]) {
    if (pass === 0) outline(p, ink, w * 2.1)
    else outline(p, HOME.steel, Math.max(1, w * 1.0))
    for (let i = 0; i < n; i++) {
      p.line(i * u * k, -h * k, (i + 1) * u * k, h * k)
      p.line(i * u * k, h * k, (i + 1) * u * k, -h * k)
    }
  }
  solid(p, ink, w * 0.5, HOME.steelDark)
  for (let i = 0; i <= n; i++) {
    p.circle(i * u * k, -h * k, 0.045 * k)
    p.circle(i * u * k, h * k, 0.045 * k)
    if (i < n) p.circle((i + 0.5) * u * k, 0, 0.045 * k)
  }
  // The claw's block.
  solid(p, ink, w, IRON)
  p.rect((g.reach + 0.02) * k, 0, 0.1 * k, Math.max(0.16, 2 * h * 0.6) * k, 0.02 * k)
  outline(p, ink, w * 0.9)
  p.line(g.reach * k, -h * k, (g.reach + 0.02) * k, -0.06 * k)
  p.line(g.reach * k, h * k, (g.reach + 0.02) * k, 0.06 * k)
  // The lower finger (behind her), and the upper one while there is nothing in the claw.
  finger(pen, g.reach, 1, pose.open)
  if (!pose.holding) finger(pen, g.reach, -1, pose.open)
  p.pop()
  // Its eye, on the top of the block.
  const sc = eyeScale(t, EYE_AT.claw)
  if (sc > 0.01) {
    const e = eyeSwing(t, EYE_AT.claw)
    const eye = clawEye(t)
    propEye(pen, eye.at[0], eye.at[1], eye.r * sc, watching(t, EYE_AT.claw, eye.at, e.swing), e.lift)
  }
}

/** Where the claw's eye sits (on top of its block), and its size. */
export function clawEye(t: number): { at: Pt; r: number } {
  const g = armGeom(armAt(t))
  const up = g.a - Math.PI / 2
  const flip = Math.cos(g.a) < 0 ? -1 : 1
  return { at: [g.end[0] + Math.cos(g.a) * 0.03 + Math.cos(up) * 0.12 * flip, g.end[1] + Math.sin(g.a) * 0.03 + Math.sin(up) * 0.12 * flip], r: 0.1 }
}

/**
 * A gentled machine's pupil, watching her: once its new eye has settled from its landing, it turns to her, wherever
 * she goes, and keeps on her to the end of the fight. `base` is the pupil's own swing, which it eases out of.
 */
function watching(t: number, at: number, eye: Pt, base: number): number {
  const u = t - at - 0.9
  if (u <= 0) return base
  const w = smooth(u, 0, 0.4)
  const [x, y] = ballAt(t)
  const a = Math.atan2(y - eye[1], x - eye[0]) - Math.PI / 2
  // The short way round from its own swing to her.
  const d = Math.atan2(Math.sin(a - base), Math.cos(a - base))
  return base + d * w
}

/* ------------------------------------------------------------------ the eyes she gives them */

/** How long an eye takes to fly from her eye to the machine, landing on the beat. */
const FLIGHT = 0.22
const GIVEN: { at: number; target: (t: number) => { at: Pt; r: number } }[] = [
  { at: EYE_AT.glove, target: gloveEye },
  { at: EYE_AT.trap, target: trapEye },
  { at: EYE_AT.hammer, target: hammerEye },
  { at: EYE_AT.claw, target: clawEye },
]

/**
 * Where she looks as she gives each eye: at the machine it goes to, from a breath before until it has landed. The
 * glove's waits until her own new eye has had its fling. Room cells, which are the kindness leg's world cells.
 */
export const GIFT_LOOKS: { from: number; to: number; at: (t: number) => Pt }[] = GIVEN.map((g, i) => ({
  from: i === 0 ? g.at - 0.3 : g.at - 0.5,
  to: g.at + 0.3,
  at: (t: number) => g.target(t).at,
}))

/**
 * The eyes she gives: on each machine's beat a copy of her own googly eye pops off hers, flies in a quick arc,
 * turning, its pupil flapping round, and slaps onto the machine as it touches her. Drawn over her (the part's
 * `over`). Her eye (`fx.ts`) is centred on her ball, its white 0.6 of her radius.
 */
export function drawGivenEyes(pen: Pen, t: number, her: (t: number) => Pt): void {
  const { p, k } = pen
  for (const g of GIVEN) {
    const u = t - (g.at - FLIGHT)
    if (u < 0 || u >= FLIGHT) continue
    const s = u / FLIGHT
    const from = her(g.at - FLIGHT)
    const to = g.target(g.at).at
    const d = Math.hypot(to[0] - from[0], to[1] - from[1])
    const at = (s: number): Pt => {
      const f = 1 - (1 - s) * (1 - s) * (1 - 0.4 * s)
      const lift = (0.1 + 0.35 * d) * 4 * s * (1 - s)
      return [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f - lift]
    }
    const [x, y] = at(s)
    // Peeled off hers at her eye's size, it swells to the machine's as it goes, and a little past it in mid-flight,
    // so on the pale tile the gift is seen going.
    const r0 = 0.6 * R
    const swell = 1 + 0.45 * Math.sin(Math.PI * s)
    const r = (r0 + (g.target(g.at).r - r0) * s) * (0.7 + 0.3 * Math.min(1, s / 0.2)) * swell
    // It carries the great hit's lantern gold with it: a trail of its arc. (No light round it: the trail shows where
    // it goes, and a halo on the pale tile read as a glow.)
    const fade = Math.sin(Math.PI * Math.min(1, s * 1.15))
    p.noStroke()
    for (let i = 7; i >= 1; i--) {
      const q = s - i * 0.035
      if (q < 0) continue
      const [tx, ty] = at(q)
      p.fill(alpha(p, HOME.gold, 0.55 * fade * (1 - i / 8)))
      p.circle(tx * k, ty * k, r * 1.1 * (1 - i / 10) * k)
    }
    propEye(pen, x, y, r, s * Math.PI * 2.6 + 0.5 * Math.sin(s * 19), 0.7 * Math.sin(Math.PI * s))
  }
}

/** The claw's upper finger, over her while she is in it. */
export function drawArmFront(pen: Pen, t: number): void {
  const pose = armAt(t)
  if (!pose.holding) return
  const g = armGeom(pose)
  const { p, k } = pen
  const [mx, my] = ARM.mount
  p.push()
  p.translate(mx * k, my * k)
  p.rotate(g.a)
  finger(pen, g.reach, -1, pose.open)
  p.pop()
}

/** Whether Jobu's jumpers are in the room yet. */
export const jumpersIn = (t: number): boolean => t >= APPEAR
