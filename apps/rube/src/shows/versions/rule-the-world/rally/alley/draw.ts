import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { drawCab } from '../cab'
import { layer, parallax, shade, type Frame } from '../depth'
import { hash } from '../kit'
import { blob, clamp01, ctxOf, ease, ellipse, flash, line, mix, path, rect, rgba, ring, shape, vgrad, type Pen } from '../pen'
import {
  BETTOR_GLASS,
  CAP,
  OPEN0,
  OPEN_TOP,
  POSTS,
  STREET_ANCHOR,
  STREET_D,
  ashtray,
  barSign,
  beer,
  bettorDrink,
  bladeSign,
  bubbles,
  cabSheen,
  curl,
  fans,
  farHall,
  foreground,
  hatTip,
  lampMist,
  lampMotes,
  laneSheen,
  laneSign,
  marquee,
  passingCar,
  roadWet,
  secondHand,
  shift,
  steam,
  strata,
  strikeBurst,
  tubeOn,
  underFloor,
  crawlLight,
  walkWet,
  windowsLife,
} from './life'
import {
  AISLE,
  ARM,
  BACK,
  BOWL_R,
  BOWLS0,
  CEIL,
  CLACK,
  CLUMSY,
  COUNTER,
  CURB,
  DECK_END,
  DEPTH,
  DOOR_SHUT,
  EDGE,
  END_WALL,
  FAR,
  FB,
  FIRES,
  FLOOR,
  FOUL,
  HATS,
  HEAD,
  HEADPIN,
  HITS,
  HOOD,
  LANE_LAND,
  LIFT_X,
  LIGHTS,
  MARK2_X,
  MARK_X,
  MID,
  NEAR,
  NET_HIT,
  NET_X,
  PAN,
  PAN_BACK,
  PAN_IN,
  PIT,
  PIT_FLOOR,
  PIVOT,
  POCKET,
  POP,
  RACK,
  RAIL,
  RAIL_LAND,
  RAISE,
  ROAD,
  SEAT,
  WALK,
  STRIKE,
  STROKES,
  TABLE,
  TAPS,
  TOP,
  TRACK,
  WALK0,
  WALK1,
  WALL,
  WAY,
  WHIFF,
  doorOpen,
  markPose,
  wallyAt,
} from './geo'

/**
 * The bowling alley in Queens after midnight, 1952: amber lanes under the tube lights' green-white, the deep maroon
 * of the carpet, cream walls gone grey with smoke, a warmer bulb over the money table in the back, and the night's
 * blue past the glass door. The band is out: the place is quiet, cool, and the bat and the table are loud in it. It is
 * the show's first neon: the beer sign over the bar, the pin-and-ball over the lanes, the blade sign outside, and on
 * the main floor beyond the back wall a jukebox and the far wall's signs, all through the cigarette haze. The depth and
 * the life of the place (the far floor and its late bowlers, the fans, the smoke, the wet street, what passes close in
 * front of the lens) are drawn in `life.ts`.
 */

const C = {
  dark: '#160F12',
  // outside
  sky0: '#060C18',
  sky1: '#0E1C33',
  sky2: '#1A3150',
  bldg: '#0B1322',
  bldg2: '#0E182A',
  winWarm: '#C99A52',
  winCool: '#7FA3B8',
  trestle: '#05080F',
  street: '#141B27',
  streetHi: '#1F2A3A',
  walk: '#3A4658',
  walkTop: '#4B586C',
  walkFace: '#232C3A',
  ground: '#06090F',
  mercury: '#B9D3E2',
  // the building
  brick: '#3A221B',
  brickDark: '#25150F',
  wallSec: '#1E1310',
  wood: '#8A5428',
  woodDark: '#5E3519',
  woodLight: '#B47A3E',
  cream: '#BDB28C',
  creamDark: '#958A68',
  creamHi: '#D8CCA2',
  trim: '#5A1422',
  ceiling: '#1F1A17',
  ceilingLine: '#2B2420',
  tube: '#EAF8EE',
  tubeGlow: '#C8F0D4',
  warm: '#FFD08A',
  // floor
  carpet: '#561324',
  carpetDark: '#3A0B17',
  carpetHi: '#74203A',
  maple: '#D6A05A',
  lane: '#C68A45',
  laneHi: '#E3B472',
  laneDark: '#9A6430',
  gutter: '#24150F',
  deck: '#D9AE70',
  foul: '#1C1210',
  section: '#110A0B',
  sectionHi: '#1C1112',
  joist: '#24160F',
  rail: '#7C7A76',
  railHi: '#B7B5AE',
  pitDark: '#0A0607',
  cushion: '#3B2A22',
  masking: '#3E2416',
  maskingHi: '#5B3622',
  crown: '#D9A93C',
  crownDark: '#9A7426',
  pin: '#F3EDE0',
  pinShade: '#C2B8A6',
  pinStripe: '#B5262A',
  // counter
  counter: '#6B3E20',
  counterTop: '#D7C9A0',
  chrome: '#B9BCBC',
  chromeDark: '#6F7476',
  stool: '#8C1E2C',
  urn: '#A7ABAA',
  pie: '#D49A55',
  glass: '#9FB9B7',
  cup: '#E6E0D0',
  clock: '#E4DCC4',
  // table
  tableTop: '#2D6A52',
  tableFace: '#1C4636',
  tableLine: '#EDE6D2',
  leg: '#151515',
  net: '#141414',
  netTop: '#ECE6D4',
  // the contraption
  iron: '#2C2C31',
  ironHi: '#5A5B62',
  spring: '#9A9EA2',
  red: '#C4281F',
  redDark: '#7E1712',
  handle: '#C79A5E',
  // the house balls
  bowl1: '#1B1B24',
  bowl2: '#2E5F6D',
  bowlHi: '#8FA8B0',
  // people
  grey: '#4D525A',
  greyDark: '#363A40',
  brown: '#5C4634',
  brownDark: '#41311F',
  trousers: '#24252B',
  shirt: '#E6E0CF',
  tie: '#7A1E22',
  tie2: '#2E4A6A',
  hat: '#2C2925',
  hat2: '#4A3B2C',
  band: '#14110F',
  skinW: '#D7A584',
  skinW2: '#C9946E',
  skinB: '#5A3926',
  leather: '#3A2216',
  leatherHi: '#6A4430',
  cap: '#585248',
  shoe: '#120E0C',
  cash: '#A9B98C',
  cashDark: '#6C7C52',
  smoke: '#C9C3B4',
  white: '#F4EFE4',
}

const MARTY_HIT = HITS.filter((_, i) => i % 2 === 0)

/* ------------------------------------------------------------------ helpers */

function oval(pen: Pen, c: Pt, rx: number, ry: number, rot: number, fill: string, a = 1): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.fillStyle = rgba(pen, fill, a)
  ctx.beginPath()
  ctx.ellipse(c[0] * k, c[1] * k, Math.max(0.001, rx * k), Math.max(0.001, ry * k), rot, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function limb(pen: Pen, a: Pt, b: Pt, wa: number, wb: number, col: string): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1e-6
  const nx = -dy / L
  const ny = dx / L
  shape(pen, [[a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2], [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2], [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2], [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2]], col)
  ellipse(pen, a, wa / 2, wa / 2, col)
  ellipse(pen, b, wb / 2, wb / 2, col)
}

/** Two-bone reach: the elbow (or knee) for a hand at `h` from a shoulder at `s`, bent toward `bend` (+1 down). */
function joint(s: Pt, h: Pt, l1: number, l2: number, bend = 1): { j: Pt; h: Pt } {
  let dx = h[0] - s[0]
  let dy = h[1] - s[1]
  let d = Math.hypot(dx, dy)
  const max = l1 + l2 - 0.002
  if (d > max) {
    h = [s[0] + (dx / d) * max, s[1] + (dy / d) * max]
    dx = h[0] - s[0]
    dy = h[1] - s[1]
    d = max
  }
  d = Math.max(d, 0.05)
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const bx = s[0] + (dx / d) * a
  const by = s[1] + (dy / d) * a
  const px = -dy / d
  const py = dx / d
  const e1: Pt = [bx + px * hh, by + py * hh]
  const e2: Pt = [bx - px * hh, by - py * hh]
  return { j: (e1[1] > e2[1]) === bend > 0 ? e1 : e2, h }
}

const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/* ------------------------------------------------------------------ people */

interface Fig {
  x: number
  y: number
  face: 1 | -1
  coat: string
  trousers: string
  skin: string
  hat?: 'fedora' | 'cap' | null
  hatCol?: string
  shirt?: string
  tie?: string
  leather?: boolean
  girth?: number
  lean?: number
  bob?: number
  walk?: number | null
  grin?: number
  laugh?: number
  near: Pt
  far: Pt
  /** Drawn in the near hand, after the arm. */
  holding?: (hand: Pt) => void
  rim?: string
  /** The hat pushed back off the brow, 0 to 1. */
  hatTip?: number
}

/** A person, about 3.2 cells tall from the feet at (x, y): returns the head's centre. */
function figure(pen: Pen, f: Fig): Pt {
  const s = f.face
  const w = f.girth ?? 1
  const bob = f.bob ?? 0
  const lean = f.lean ?? 0
  const hipY = f.y - 1.5 + bob * 0.4
  const shY = f.y - 2.55 + bob
  const sx = f.x + lean * s
  const head: Pt = [sx + 0.05 * s, f.y - 2.93 + bob]
  const dark = (c: string) => mix(c, '#000000', 0.3)

  // The far arm, behind everything.
  const farS: Pt = [sx - 0.1 * s, shY + 0.08]
  const fa = joint(farS, f.far, 0.62, 0.58, 1)
  limb(pen, farS, fa.j, 0.15, 0.13, dark(f.coat))
  limb(pen, fa.j, fa.h, 0.13, 0.1, dark(f.coat))
  ellipse(pen, fa.h, 0.07, 0.07, dark(f.skin))

  // Legs: standing a little apart, or striding.
  const ph = f.walk
  const hipN: Pt = [f.x + 0.03 * s, hipY]
  const hipF: Pt = [f.x - 0.05 * s, hipY]
  let footN: Pt = [f.x + 0.1 * s, f.y]
  let footF: Pt = [f.x - 0.08 * s, f.y]
  if (ph !== null && ph !== undefined) {
    const sw = Math.sin(ph)
    footN = [f.x + 0.34 * sw * s, f.y - Math.max(0, Math.cos(ph)) * 0.12]
    footF = [f.x - 0.34 * sw * s, f.y - Math.max(0, -Math.cos(ph)) * 0.12]
  }
  for (const [hip, foot, col] of [[hipF, footF, dark(f.trousers)], [hipN, footN, f.trousers]] as [Pt, Pt, string][]) {
    const kn = joint(hip, foot, 0.78, 0.74, -1)
    const knee: Pt = [kn.j[0], kn.j[1]]
    // Knees bend forward: mirror the knee to the face side if it went back.
    if ((knee[0] - (hip[0] + foot[0]) / 2) * s < 0) knee[0] = (hip[0] + foot[0]) - knee[0]
    limb(pen, hip, knee, 0.27 * w, 0.18, col)
    limb(pen, knee, kn.h, 0.18, 0.14, col)
    oval(pen, [kn.h[0] + 0.09 * s, kn.h[1] - 0.03], 0.17, 0.07, 0, C.shoe)
  }

  // The body: a jacket from the shoulders to below the hips.
  const hem = hipY + 0.22
  const torso: Pt[] = [
    [f.x - 0.26 * w * s, hem],
    [f.x - 0.3 * w * s, hipY - 0.4],
    [sx - 0.3 * w * s, shY + 0.18],
    [sx - 0.18 * s, shY - 0.04],
    [sx + 0.2 * s, shY - 0.02],
    [sx + 0.3 * w * s, shY + 0.22],
    [f.x + (0.28 + 0.12 * (w - 1)) * w * s, hipY - 0.45],
    [f.x + 0.26 * w * s, hem],
  ]
  blob(pen, torso, f.coat)
  if (f.leather) {
    // A sheen down the leather, the zip, and the collar.
    blob(pen, [[sx - 0.14 * s, shY + 0.15], [sx - 0.02 * s, shY + 0.1], [f.x + 0.0 * s, hipY - 0.1], [f.x - 0.12 * s, hipY - 0.05]], C.leatherHi, 0.55)
    line(pen, [sx + 0.17 * s, shY + 0.05], [f.x + 0.2 * s, hem - 0.02], mix(f.coat, '#000000', 0.45), 0.6)
    shape(pen, [[sx + 0.02 * s, shY - 0.06], [sx + 0.22 * s, shY - 0.02], [sx + 0.13 * s, shY + 0.2]], C.leatherHi)
    rect(pen, f.x - 0.26 * w, hem - 0.08, f.x + 0.26 * w, hem, mix(f.coat, '#000000', 0.25))
  } else {
    // The shirt's V, the tie, the lapel.
    const shirt = f.shirt ?? C.shirt
    shape(pen, [[sx + 0.06 * s, shY - 0.04], [sx + 0.24 * s, shY - 0.02], [sx + 0.18 * s, shY + 0.48]], shirt)
    if (f.tie) shape(pen, [[sx + 0.15 * s, shY + 0.0], [sx + 0.2 * s, shY + 0.0], [sx + 0.2 * s, shY + 0.42], [sx + 0.17 * s, shY + 0.46]], f.tie)
    path(pen, [[sx + 0.06 * s, shY - 0.04], [sx + 0.12 * s, shY + 0.25], [sx + 0.18 * s, shY + 0.5]], dark(f.coat), 0.7)
    line(pen, [f.x + 0.2 * w * s, hipY - 0.2], [f.x + 0.26 * w * s, hem], dark(f.coat), 0.5)
  }
  if (f.rim) path(pen, [[sx - 0.3 * w * s, shY + 0.2], [sx - 0.18 * s, shY - 0.03], [sx + 0.18 * s, shY - 0.02]], f.rim, 0.6)

  // Neck and head.
  rect(pen, sx - 0.03 * s - 0.07, shY - 0.14, sx - 0.03 * s + 0.07, shY + 0.02, mix(f.skin, '#000000', 0.15))
  ellipse(pen, head, 0.19, 0.22, f.skin)
  const [hx, hy] = head
  shape(pen, [[hx + 0.16 * s, hy - 0.04], [hx + 0.245 * s, hy + 0.05], [hx + 0.17 * s, hy + 0.08]], f.skin)
  ellipse(pen, [hx - 0.04 * s, hy + 0.01], 0.04, 0.06, mix(f.skin, '#000000', 0.2))
  ellipse(pen, [hx + 0.1 * s, hy - 0.035], 0.022, 0.022, '#140C08')
  line(pen, [hx + 0.05 * s, hy - 0.085], [hx + 0.15 * s, hy - 0.075], mix(f.skin, '#000000', 0.5), 0.6)
  const laugh = clamp01(f.laugh ?? 0)
  const grin = clamp01(f.grin ?? 0)
  if (laugh > 0.05) ellipse(pen, [hx + 0.13 * s, hy + 0.12], 0.05, 0.035 + 0.03 * laugh, '#2A0E0A')
  else if (grin > 0.05) {
    shape(pen, [[hx + 0.05 * s, hy + 0.1], [hx + 0.19 * s, hy + 0.09], [hx + 0.16 * s, hy + 0.1 + 0.05 * grin], [hx + 0.08 * s, hy + 0.11 + 0.03 * grin]], C.white)
  } else line(pen, [hx + 0.08 * s, hy + 0.12], [hx + 0.16 * s, hy + 0.11], mix(f.skin, '#000000', 0.45), 0.6)

  // The hat, or the hair once it has gone.
  const hatCol = f.hatCol ?? C.hat
  const tip = f.hatTip ?? 0
  if (f.hat === 'fedora') drawFedora(pen, [hx + 0.01 * s - 0.03 * tip * s, hy - 0.14 - 0.05 * tip], -0.38 * tip * s, hatCol)
  else if (f.hat === 'cap') {
    blob(pen, [[hx - 0.21 * s, hy - 0.05], [hx - 0.19 * s, hy - 0.2], [hx + 0.02 * s, hy - 0.27], [hx + 0.2 * s, hy - 0.2], [hx + 0.24 * s, hy - 0.11]], hatCol)
    shape(pen, [[hx + 0.1 * s, hy - 0.15], [hx + 0.34 * s, hy - 0.1], [hx + 0.32 * s, hy - 0.07], [hx + 0.1 * s, hy - 0.09]], mix(hatCol, '#000000', 0.25))
  } else {
    blob(pen, [[hx - 0.2 * s, hy + 0.02], [hx - 0.19 * s, hy - 0.14], [hx + 0.0 * s, hy - 0.23], [hx + 0.17 * s, hy - 0.14], [hx + 0.05 * s, hy - 0.12]], '#1A1410')
  }

  // The near arm, and what it holds.
  const nearS: Pt = [sx + 0.05 * s, shY + 0.1]
  const na = joint(nearS, f.near, 0.62, 0.58, 1)
  limb(pen, nearS, na.j, 0.16, 0.14, f.coat)
  limb(pen, na.j, na.h, 0.14, 0.11, f.coat)
  ellipse(pen, na.h, 0.075, 0.075, f.skin)
  f.holding?.(na.h)
  return head
}

function drawFedora(pen: Pen, base: Pt, rot: number, col: string): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.translate(base[0] * k, base[1] * k)
  ctx.rotate(rot)
  ctx.translate(-base[0] * k, -base[1] * k)
  const [x, y] = base
  oval(pen, [x, y], 0.3, 0.05, 0, mix(col, '#000000', 0.2))
  shape(pen, [[x - 0.17, y], [x - 0.15, y - 0.2], [x - 0.04, y - 0.25], [x + 0.03, y - 0.21], [x + 0.13, y - 0.24], [x + 0.16, y]], col)
  rect(pen, x - 0.168, y - 0.06, x + 0.162, y - 0.015, C.band)
  ctx.restore()
}

/* ------------------------------------------------------------------ the set */

/** The night outside, the room, the lanes, the floor in section: drawn first, on show time. */
export function drawSet(pen: Pen, t: number, f: Frame): void {
  rect(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, C.dark)
  if (f.x0 < WALL[0]) outside(pen, t, Math.max(f.x0 - 1, -40), WALL[0], f)
  if (f.x1 > WALL[1] && f.x0 < END_WALL) room(pen, t, f)
  if (f.x1 > END_WALL) {
    rect(pen, END_WALL, f.y0 - 1, f.x1 + 1, f.y1 + 1, C.brickDark)
    for (let y = Math.floor(f.y0); y < f.y1 + 1; y += 0.3) line(pen, [END_WALL, y], [f.x1 + 1, y], C.wallSec, 0.4)
  }
}

function outside(pen: Pen, t: number, x0: number, x1: number, f: Frame): void {
  vgrad(pen, x0, f.y0 - 1, x1, ROAD, [
    [0, C.sky0, 1],
    [0.55, C.sky1, 1],
    [1, C.sky2, 1],
  ])
  // The far side of the street stands back (depth 0.85, laid out on the cut's framing on the cab): the El on its
  // trestle, low brick, a few windows lit, two televisions going.
  const [sdx] = parallax(f, STREET_D, STREET_ANCHOR)
  layer(
    pen,
    f,
    STREET_D,
    (g) => {
      const bx0 = Math.max(g.x0 - 1, -40)
      const bx1 = x1 - sdx + 0.5
      const ty = -3.55
      for (let x = Math.floor(bx0 / 3.4) * 3.4; x < bx1; x += 3.4) rect(pen, x - 0.07, ty, x + 0.07, -0.3, C.trestle)
      for (let i = Math.floor(bx0 / 2.3) - 1; i * 2.3 < bx1; i++) {
        const bx = i * 2.3
        const top = -2.0 - 1.4 * hash(i, 41)
        rect(pen, bx, top, bx + 2.3, -0.3, hash(i, 42) > 0.5 ? C.bldg : C.bldg2)
        rect(pen, bx, top - 0.08, bx + 2.3, top, C.trestle)
        for (let r = 0; r < 4; r++) {
          const wy = top + 0.35 + r * 0.55
          if (wy > -0.9) break
          for (let c = 0; c < 3; c++) {
            const wx = bx + 0.3 + c * 0.7
            const h = hash(i * 7 + c, r, 43)
            if (h > 0.84) {
              // A lit window: its blind's lower half a shade darker than the light over it.
              const col = h > 0.93 ? C.winCool : C.winWarm
              rect(pen, wx, wy, wx + 0.28, wy + 0.32, col)
              rect(pen, wx, wy + 0.2, wx + 0.28, wy + 0.32, mix(col, '#090F1B', 0.25))
            } else rect(pen, wx, wy, wx + 0.28, wy + 0.32, '#090F1B')
          }
        }
        // A shop at the street, its window dark but for a night lamp left on at the back: its little shade, and its
        // light on the counter under it.
        if (hash(i, 44) > 0.6) {
          rect(pen, bx + 0.3, -1.45, bx + 2.0, -0.62, '#0A1424')
          rect(pen, bx + 0.75, -0.98, bx + 1.45, -0.62, mix('#0A1424', C.winWarm, 0.18))
          shape(pen, [[bx + 0.98, -1.12], [bx + 1.22, -1.12], [bx + 1.28, -1.0], [bx + 0.92, -1.0]], mix(C.winWarm, '#0A1424', 0.35))
        }
      }
      windowsLife(pen, t, bx0, bx1)
      rect(pen, bx0, ty - 0.3, bx1, ty, C.trestle)
      for (let x = Math.floor(bx0 / 0.5) * 0.5; x < bx1; x += 0.5) line(pen, [x, ty - 0.3], [x + 0.5, ty], '#0C1424', 0.6)
    },
    STREET_ANCHOR,
  )
  // The far sidewalk; the street, wet; the near sidewalk at the door, and its curb.
  rect(pen, x0, -0.62, x1, -0.5, '#2E394A')
  vgrad(pen, x0, -0.5, x1, ROAD + 0.05, [
    [0, C.street, 1],
    [1, C.streetHi, 1],
  ])
  vgrad(pen, x0, ROAD + 0.05, x1, WALK[0] - 0.06, [
    [0, C.streetHi, 1],
    [1, C.street, 1],
  ])
  for (let i = Math.floor(x0 / 1.6); i * 1.6 < x1; i++) rect(pen, i * 1.6, -0.08, i * 1.6 + 0.7, -0.05, '#2A3446')
  roadWet(pen, t, x0, x1, sdx)
  steam(pen, t, x0, x1)
  passingCar(pen, t, x0, x1)
  // The near curb, and the sidewalk in front of the cab, its slabs, its face.
  rect(pen, x0, WALK[0] - 0.06, x1, WALK[0], '#56657A')
  rect(pen, x0, WALK[0], x1, WALK[1], C.walkTop)
  line(pen, [x0, (WALK[0] + WALK[1]) / 2 + 0.06], [x1, (WALK[0] + WALK[1]) / 2 + 0.06], C.walk, 0.3)
  for (let x = Math.floor(x0 / 0.9) * 0.9; x < x1; x += 0.9) line(pen, [x, WALK[0]], [x - 0.08, WALK[1]], C.walk, 0.4)
  walkWet(pen, t, x0, x1)
  rect(pen, x0, WALK[1], x1, WALK[1] + 0.1, C.walkFace)
  rect(pen, x0, WALK[1] + 0.1, x1, f.y1 + 1, C.ground)
  // The stoop at the door, down from the threshold to the sidewalk.
  rect(pen, WALL[0] - 0.45, FLOOR, WALL[0], WALK[0] + 0.05, C.walkFace)
  rect(pen, WALL[0] - 0.45, FLOOR - 0.03, WALL[0], FLOOR + 0.03, C.walkTop)
  // The streetlamp: its lit glass under the head, and its cold mercury light lying on the road and the curb under it,
  // a mist turning in it.
  const lx = -10.6
  rect(pen, lx - 0.05, -3.6, lx + 0.05, (WALK[0] + WALK[1]) / 2, '#0A0F18')
  path(pen, [[lx, -3.6], [lx + 0.15, -3.85], [lx + 0.6, -3.85]], '#0A0F18', 1.6)
  shape(pen, [[lx + 0.4, -3.88], [lx + 0.85, -3.88], [lx + 0.75, -3.76], [lx + 0.5, -3.76]], '#0A0F18')
  ellipse(pen, [lx + 0.625, -3.75], 0.13, 0.04, C.mercury)
  // Its pool, flat on the road and the near sidewalk under the head.
  shade(pen, [lx + 1.1, ROAD + 0.12], 2.6, 0.42, C.mercury, 0.13)
  lampMist(pen, t, x0, x1)
  // The alley's own sign, hung off its front over the sidewalk.
  bladeSign(pen, t)
}

function room(pen: Pen, t: number, f: Frame): void {
  const x0 = WALL[1]
  const x1 = END_WALL
  // Through the long opening over the wainscot, the main floor beyond, under its haze (`life.ts`).
  farHall(pen, t, f)
  // The back wall: over the counter, cream gone dim with smoke; past it only its head over the opening, and its posts.
  const wall: [number, string, number][] = [
    [0, mix(C.cream, '#000000', 0.66), 1],
    [0.6, mix(C.cream, '#000000', 0.46), 1],
    [1, mix(C.cream, '#000000', 0.38), 1],
  ]
  vgrad(pen, x0, CEIL, OPEN0, -1.95, wall)
  vgrad(pen, OPEN0, CEIL, x1, OPEN_TOP, wall)
  for (let x = x0 + 1.2; x < OPEN0 - 0.4; x += 2.4) {
    const xe = Math.min(x + 1.9, OPEN0 - 0.22)
    rect(pen, x, -3.75, xe, -2.2, mix(C.cream, '#000000', 0.44))
    path(pen, [[x, -2.2], [x, -3.75], [xe, -3.75]], mix(C.creamDark, '#000000', 0.38), 0.5)
  }
  rect(pen, OPEN0, OPEN_TOP - 0.06, x1, OPEN_TOP, C.woodDark)
  for (const px of [OPEN0 + 0.1, ...POSTS]) {
    rect(pen, px - 0.11, OPEN_TOP, px + 0.11, -1.95, mix(C.wood, '#000000', 0.45))
    rect(pen, px - 0.11, OPEN_TOP, px - 0.06, -1.95, mix(C.creamDark, '#000000', 0.35))
    rect(pen, px + 0.07, OPEN_TOP, px + 0.11, -1.95, mix(C.wood, '#000000', 0.7))
  }
  // Each tube washes the wall under it, cold: brightest just under the fitting, gone by the wainscot.
  for (const [i, tx] of TUBES.entries()) fall(pen, tx, tx + 1.7, CEIL + 0.2, -1.95, 0.8, C.tubeGlow, 0.11 * tubeOn(i, t))
  rect(pen, x0, -1.95, x1, BACK, mix(C.wood, '#000000', 0.2))
  for (let x = x0 + 0.1; x < x1; x += 0.42) rect(pen, x, -1.92, x + 0.025, BACK, C.woodDark)
  rect(pen, x0, -2.03, x1, -1.92, C.trim)
  rect(pen, x0, CAP, x1, -2.03, C.woodLight)
  // On the ledge along the opening: the regulars' glasses, an ashtray going.
  const ledge: [number, number, number, number][] = [
    [11.55, CAP, 0.22, 0.09],
    [11.8, CAP, 0.19, 0.085],
    [16.2, CAP, 0.22, 0.09],
    [19.55, CAP, 0.2, 0.09],
  ]
  if (f.y0 < CAP && f.y1 > CAP - 0.3) {
    for (const [gx, gb, gh, gw] of ledge) if (gx > f.x0 - 0.3 && gx < f.x1 + 0.3) beer(pen, [gx, gb], gh, gw, 0, gx === 11.8 ? 0.45 : 0.82)
    bubbles(pen, t, ledge.filter(([gx]) => gx > f.x0 - 0.3 && gx < f.x1 + 0.3))
    if (f.x0 < 12.6 && f.x1 > 11.9) ashtray(pen, t, [12.3, CAP], 0.8)
  }
  // The neon beer sign over the back bar, and the pennants by it.
  barSign(pen, t)
  for (let i = 0; i < 5; i++) {
    const px = 1.3 + i * 0.3
    shape(pen, [[px, -3.62], [px + 0.26, -3.62], [px + 0.13, -3.3]], i % 2 ? C.trim : C.cream)
  }
  path(pen, [[1.25, -3.64], [2.85, -3.64]], C.woodDark, 0.5)
  // The clock, no numbers: its hands at twenty past one, its second hand going round.
  const ck: Pt = [3.6, -3.25]
  ellipse(pen, ck, 0.3, 0.3, C.woodDark)
  ellipse(pen, ck, 0.25, 0.25, C.clock)
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * Math.PI * 2
    line(pen, [ck[0] + Math.cos(an) * 0.19, ck[1] + Math.sin(an) * 0.19], [ck[0] + Math.cos(an) * 0.23, ck[1] + Math.sin(an) * 0.23], '#2A2420', 0.5)
  }
  const mins = (20 + (t - 121) / 60) / 60
  line(pen, ck, [ck[0] + Math.sin(mins * Math.PI * 2) * 0.19, ck[1] - Math.cos(mins * Math.PI * 2) * 0.19], '#1A1410', 0.8)
  line(pen, ck, [ck[0] + Math.sin(((1 + mins) / 12) * Math.PI * 2) * 0.12, ck[1] - Math.cos(((1 + mins) / 12) * Math.PI * 2) * 0.12], '#1A1410', 1.1)
  secondHand(pen, t, ck)
  ellipse(pen, ck, 0.025, 0.025, '#B5262A')
  // House balls on the back wall's racks, along the lanes.
  for (let x = 10.6; x < 17; x += 3.2) {
    rect(pen, x, -1.62, x + 1.5, -1.55, C.chromeDark)
    for (let j = 0; j < 4; j++) ellipse(pen, [x + 0.2 + j * 0.37, -1.74], 0.16, 0.16, [C.bowl1, C.bowl2, '#5A1E2E', C.bowl1][(j + Math.round(x)) % 4])
  }
  // The pin-and-ball sign hung in the opening over the lanes.
  if (f.x1 > 14.6 && f.x0 < 17.1) laneSign(pen, t)

  // The ceiling: low, close, its tiles, the fans turning further back, and the tubes hung under it.
  rect(pen, x0, f.y0 - 1, x1, CEIL, C.ceiling)
  for (let i = 1; i < 12; i++) {
    const y = CEIL - 0.18 * Math.pow(i, 1.35)
    if (y < f.y0 - 1) break
    line(pen, [x0, y], [x1, y], C.ceilingLine, 0.5)
  }
  fans(pen, t, f)
  rect(pen, x0, CEIL, x1, CEIL + 0.06, C.woodDark)
  // The tubes, hung under it in their fittings: the lit glass, nothing round it (their light is on the wall, laid above).
  for (const [i, tx] of TUBES.entries()) {
    const on = tubeOn(i, t)
    rect(pen, tx - 0.05, CEIL + 0.06, tx + 1.75, CEIL + 0.12, '#3A3530')
    rect(pen, tx, CEIL + 0.12, tx + 1.7, CEIL + 0.2, on > 0.5 ? C.tube : mix(C.tube, '#3A3530', 0.65))
  }

  // The lunch counter, its stools, and what is on it.
  counter(pen, t)

  // The floor: the back aisle, the carpet, the approach, the lanes, the gutters.
  rect(pen, x0, BACK, x1, AISLE[1], C.carpet)
  carpetPattern(pen, x0, BACK, x1, AISLE[1])
  rect(pen, x0, AISLE[1], 0.75, EDGE, C.carpet)
  carpetPattern(pen, x0, AISLE[1], 0.75, EDGE)
  rect(pen, 0.75, AISLE[1], FOUL, EDGE, C.maple)
  for (let y = AISLE[1] + 0.05; y < EDGE; y += 0.05) line(pen, [0.75, y], [FOUL, y], mix(C.maple, '#000000', 0.08), 0.3)
  rect(pen, 0.72, AISLE[1], 0.78, EDGE, C.woodDark)
  // Lanes: far and near, their boards, their arrows, the pin decks; the approach's dots.
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) ellipse(pen, [0.95 + j * 0.25, AISLE[1] + 0.2 + i * 0.25], 0.025, 0.012, mix(C.maple, '#000000', 0.4))
  for (const [a, b] of [FAR, NEAR]) {
    vgrad(pen, FOUL, a, DECK_END, b, [
      [0, C.laneDark, 1],
      [0.35, C.lane, 1],
      [1, C.laneHi, 1],
    ])
    for (let y = a + 0.04; y < b; y += 0.045) line(pen, [FOUL, y], [DECK_END, y], mix(C.lane, '#000000', 0.12), 0.25)
    // The polish: a long cool sheen near the lane's far side.
    rect(pen, FOUL, a + 0.03, DECK_END, a + 0.05, mix(C.laneHi, C.tube, 0.5))
    const mid = (a + b) / 2
    for (let j = -3; j <= 3; j++) {
      const ax = FOUL + 3.0 + Math.abs(j) * 0.28
      const ay = mid + j * (b - a) * 0.13
      shape(pen, [[ax, ay - 0.025], [ax + 0.26, ay], [ax, ay + 0.025]], C.laneDark)
    }
    for (let j = -2; j <= 2; j++) ellipse(pen, [FOUL + 1.2 + Math.abs(j) * 0.1, mid + j * (b - a) * 0.17], 0.03, 0.014, C.laneDark)
    rect(pen, HEADPIN - 0.45, a, DECK_END, b, C.deck)
    line(pen, [HEADPIN - 0.45, a], [HEADPIN - 0.45, b], C.laneDark, 0.4)
  }
  // The gutters: rounded channels, dark, with their lips.
  for (const [a, b] of [[AISLE[1], FAR[0]], [FAR[1], NEAR[0]], [NEAR[1], EDGE]] as [number, number][]) {
    vgrad(pen, FOUL, a, DECK_END, b, [
      [0, '#0E0806', 1],
      [0.6, C.gutter, 1],
      [1, '#3A2418', 1],
    ])
    line(pen, [FOUL, b], [DECK_END, b], C.laneDark, 0.5)
  }
  rect(pen, FOUL - 0.035, AISLE[1], FOUL, EDGE, C.foul)
  // The tubes' reflections run along the polished lanes.
  for (const tx of TUBES) {
    if (tx < FOUL - 1) continue
    for (const [a, b] of [FAR, NEAR]) {
      const y = a + (b - a) * 0.3
      const ctx = ctxOf(pen.p)
      const k = pen.k
      const g = ctx.createLinearGradient((tx - 0.9) * k, 0, (tx + 2.6) * k, 0)
      g.addColorStop(0, rgba(pen, C.tube, 0))
      g.addColorStop(0.5, rgba(pen, C.tube, 0.26))
      g.addColorStop(1, rgba(pen, C.tube, 0))
      ctx.save()
      ctx.fillStyle = g
      ctx.fillRect((tx - 0.9) * k, (y - 0.035) * k, 3.5 * k, 0.07 * k)
      ctx.restore()
    }
  }
  if (f.x1 > 14.6 && f.x0 < 17.1) laneSheen(pen, t)

  // The pin end: dark behind the decks, the masking board over them with its crown, the far rack of pins.
  rect(pen, HEADPIN - 0.6, -2.4, x1, AISLE[1], C.pitDark)
  rect(pen, DECK_END, AISLE[1], x1, NEAR[0] - 0.05, C.pitDark)
  rect(pen, HEADPIN - 0.6, -2.42, x1, -1.32, C.masking)
  rect(pen, HEADPIN - 0.55, -2.36, x1 - 0.05, -1.38, C.maskingHi)
  rect(pen, HEADPIN - 0.5, -2.31, x1 - 0.1, -1.43, C.masking)
  crown(pen, [(HEADPIN + x1) / 2, -1.88], 0.62)
  if (f.x1 > HEADPIN - 0.6) marquee(pen, HEADPIN - 0.525, -2.335, x1 - 0.075, -1.405)
  // The light under the board, down on the deck and the pins.
  fall(pen, HEADPIN - 0.55, x1, -1.28, NEAR[1], 0.15, C.tube, 0.16)
  rect(pen, HEADPIN - 0.6, -1.34, x1, -1.28, C.tube)
  // The pinboy, in the dark over the pit, on his perch.
  pinboy(pen, t)
  for (let i = 0; i < 10; i++) {
    const [px, py] = pinSpot(i)
    drawPin(pen, [px, py - (NEAR[0] + NEAR[1]) / 2 + (FAR[0] + FAR[1]) / 2], 0, 0.95)
  }

  // The floor's front edge, and under it, in section, the crawlspace and the return's track.
  rect(pen, x0, EDGE, x1, f.y1 + 1, C.section)
  crawlLight(pen, t, f)
  rect(pen, x0, EDGE, x1, EDGE + 0.1, C.woodDark)
  line(pen, [x0, EDGE], [x1, EDGE], C.woodLight, 0.5)
  for (let x = x0 + 0.8; x < x1; x += 1.6) rect(pen, x, EDGE + 0.1, x + 0.12, f.y1 + 1, C.joist)
  rect(pen, x0, TRACK + 0.32, x1, TRACK + 0.4, C.joist)
  rect(pen, LIFT_X - 0.02, TRACK + 0.04, PIT[0] + 0.3, TRACK + 0.08, C.rail)
  line(pen, [LIFT_X - 0.02, TRACK], [PIT[0] + 0.3, TRACK], C.railHi, 0.7)
  // The lift's shaft, up through the floor to the hood.
  rect(pen, LIFT_X - 0.16, EDGE + 0.1, LIFT_X + 0.2, TRACK + 0.1, '#0D0809')
  line(pen, [LIFT_X - 0.16, EDGE], [LIFT_X - 0.16, TRACK + 0.1], C.rail, 0.6)
  line(pen, [LIFT_X + 0.2, EDGE], [LIFT_X + 0.2, TRACK + 0.1], C.rail, 0.6)
  // The pit, cut open: its floor, the slot down to the track, the cushion at its back.
  rect(pen, PIT[0], NEAR[0], PIT[1], PIT_FLOOR, C.pitDark)
  rect(pen, PIT[0], PIT_FLOOR, PIT[1], PIT_FLOOR + 0.08, C.woodDark)
  rect(pen, PIT[0] - 0.02, PIT_FLOOR + 0.08, PIT[0] + 0.28, TRACK + 0.08, '#0D0809')
  rect(pen, PIT[1] - 0.12, -1.2, PIT[1], PIT_FLOOR, C.cushion)
  for (let y = -1.1; y < PIT_FLOOR; y += 0.2) line(pen, [PIT[1] - 0.12, y], [PIT[1], y + 0.05], '#24180F', 0.5)
  underFloor(pen, t, f)

  // The front wall, in section, and the threshold.
  rect(pen, WALL[0], f.y0 - 1, WALL[1], HEAD, C.brick)
  for (let y = HEAD - 0.15; y > f.y0 - 1; y -= 0.22) line(pen, [WALL[0], y], [WALL[1], y], C.brickDark, 0.4)
  rect(pen, WALL[0] - 0.05, HEAD, WALL[1] + 0.05, HEAD + 0.08, C.woodDark)
  rect(pen, WALL[0], FLOOR, WALL[1], f.y1 + 1, C.brickDark)
  rect(pen, WALL[0] - 0.04, FLOOR - 0.03, WALL[1] + 0.04, FLOOR + 0.02, '#A8823E')
}

const TUBES = [-0.6, 2.4, 5.4, 8.4, 11.4, 14.4, 17.4]

/**
 * Light falling from a fitting `x0` to `x1` at `top` down to `bottom`, spreading `spread` either side as it goes and
 * fading as it falls: laid on the wall or the deck it reaches, never round the fitting.
 */
function fall(pen: Pen, x0: number, x1: number, top: number, bottom: number, spread: number, col: string, a: number): void {
  if (a <= 0.004) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const g = ctx.createLinearGradient(0, top * k, 0, bottom * k)
  g.addColorStop(0, rgba(pen, col, a))
  g.addColorStop(0.5, rgba(pen, col, a * 0.35))
  g.addColorStop(1, rgba(pen, col, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x0 * k, top * k)
  ctx.lineTo(x1 * k, top * k)
  ctx.lineTo((x1 + spread) * k, bottom * k)
  ctx.lineTo((x0 - spread) * k, bottom * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function carpetPattern(pen: Pen, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0 + 0.1; y < y1; y += 0.2) {
    const off = Math.round((y - y0) / 0.2) % 2 ? 0.25 : 0
    for (let x = x0 + off; x < x1 - 0.1; x += 0.5) shape(pen, [[x + 0.1, y], [x + 0.18, y - 0.05], [x + 0.26, y], [x + 0.18, y + 0.05]], C.carpetHi)
  }
}

function crown(pen: Pen, c: Pt, s: number): void {
  const [x, y] = c
  const pts: Pt[] = [
    [x - 0.5 * s, y + 0.3 * s],
    [x - 0.55 * s, y - 0.25 * s],
    [x - 0.28 * s, y + 0.02 * s],
    [x, y - 0.38 * s],
    [x + 0.28 * s, y + 0.02 * s],
    [x + 0.55 * s, y - 0.25 * s],
    [x + 0.5 * s, y + 0.3 * s],
  ]
  shape(pen, pts, C.crown)
  rect(pen, x - 0.5 * s, y + 0.22 * s, x + 0.5 * s, y + 0.3 * s, C.crownDark)
  for (const dx of [-0.55, 0, 0.55]) ellipse(pen, [x + dx * s, y - (dx === 0 ? 0.42 : 0.29) * s], 0.05 * s, 0.05 * s, C.crown)
}

function counter(pen: Pen, t: number): void {
  const [x0, x1] = COUNTER
  const top = -2.42
  // The back bar: a shelf, cups, the pie case, the urn.
  rect(pen, x0 + 0.1, -3.05, x1 - 0.1, -2.98, C.woodDark)
  for (let i = 0; i < 6; i++) {
    const cx = x0 + 0.35 + i * 0.16
    rect(pen, cx - 0.06, -3.2, cx + 0.06, -3.05, C.cup)
  }
  rect(pen, x0, top, x1, BACK - 0.01, C.counter)
  for (let x = x0 + 0.2; x < x1; x += 0.45) rect(pen, x, top + 0.18, x + 0.03, BACK - 0.08, mix(C.counter, '#000000', 0.25))
  rect(pen, x0, BACK - 0.12, x1, BACK - 0.01, '#2A170C')
  rect(pen, x0 - 0.06, top - 0.1, x1 + 0.06, top, C.counterTop)
  rect(pen, x0 - 0.06, top, x1 + 0.06, top + 0.04, C.chrome)
  // On the counter: the pie case, the urn, a napkin box, a cup.
  const pc = x0 + 1.55
  rect(pen, pc - 0.28, top - 0.14, pc + 0.28, top - 0.1, C.chrome)
  ellipse(pen, [pc, top - 0.2], 0.2, 0.06, C.pie)
  blob(pen, [[pc - 0.27, top - 0.12], [pc - 0.24, top - 0.4], [pc, top - 0.5], [pc + 0.24, top - 0.4], [pc + 0.27, top - 0.12]], C.glass, 0.35)
  const ux = x1 - 0.45
  rect(pen, ux - 0.17, top - 0.62, ux + 0.17, top - 0.1, C.urn)
  rect(pen, ux - 0.17, top - 0.62, ux - 0.09, top - 0.1, mix(C.urn, '#FFFFFF', 0.3))
  ellipse(pen, [ux, top - 0.64], 0.17, 0.04, C.chromeDark)
  rect(pen, ux + 0.17, top - 0.28, ux + 0.25, top - 0.24, C.chromeDark)
  rect(pen, x0 + 0.6, top - 0.2, x0 + 0.78, top - 0.1, C.chrome)
  rect(pen, x0 + 0.92, top - 0.16, x0 + 1.04, top - 0.1, C.cup)
  // A cigarette left going in the ashtray, its thread of smoke up through the light; a glass left half drunk.
  ashtray(pen, t, [1.88, top - 0.1], 0.75)
  beer(pen, [2.66, top - 0.1], 0.2, 0.085, 0, 0.5)
  bubbles(pen, t, [[2.66, top - 0.1, 0.2, 0.085]])
  // The counter's light, from the tube over it: a warm pool along its top.
  shade(pen, [(x0 + x1) / 2, top - 0.05], (x1 - x0) * 0.55, 0.12, C.warm, 0.2)
  // The stools.
  for (const sx of [0.3, 1.45, 2.55]) {
    rect(pen, sx - 0.03, -1.75, sx + 0.03, FB - 0.08, C.chrome)
    ellipse(pen, [sx, FB - 0.08], 0.18, 0.04, C.chromeDark)
    oval(pen, [sx, -1.8], 0.22, 0.07, 0, C.stool)
    rect(pen, sx - 0.22, -1.8, sx + 0.22, -1.72, mix(C.stool, '#000000', 0.3))
  }
}

/* ------------------------------------------------------------------ pins */

/** The ten pins of a rack: rows back from the head pin, each pin across the lane drawn a little higher (further). */
function pinSpot(i: number): Pt {
  const row = i === 0 ? 0 : i < 3 ? 1 : i < 6 ? 2 : 3
  const first = [0, 1, 3, 6][row]
  const j = i - first
  const l = (j - row / 2) * 0.53
  const mid = (NEAR[0] + NEAR[1]) / 2
  return [HEADPIN + row * 0.42 + l * 0.06, mid + 0.06 - l * 0.24]
}
const PIN_ORDER = Array.from({ length: 10 }, (_, i) => i).sort((a, b) => pinSpot(a)[1] - pinSpot(b)[1])

function pinPts(base: Pt, rot: number, s: number): Pt[] {
  const half: Pt[] = [[0.075, 0], [0.105, -0.12], [0.108, -0.21], [0.085, -0.33], [0.05, -0.42], [0.046, -0.47], [0.062, -0.53], [0.06, -0.58], [0.035, -0.625], [0, -0.635]]
  const outline: Pt[] = [...half.map(([x, y]): Pt => [x, y]), ...half.slice(0, -1).reverse().map(([x, y]): Pt => [-x, y])]
  const c = Math.cos(rot)
  const sn = Math.sin(rot)
  return outline.map(([x, y]) => [base[0] + (x * c - y * sn) * s, base[1] + (x * sn + y * c) * s])
}

function drawPin(pen: Pen, base: Pt, rot: number, s = 1, lit = 1): void {
  shape(pen, pinPts(base, rot, s), mix(C.pinShade, C.pin, lit))
  const c = Math.cos(rot)
  const sn = Math.sin(rot)
  const at = (x: number, y: number): Pt => [base[0] + (x * c - y * sn) * s, base[1] + (x * sn + y * c) * s]
  shape(pen, [at(-0.048, -0.44), at(0.048, -0.44), at(0.047, -0.46), at(-0.047, -0.46)], C.pinStripe)
  shape(pen, [at(-0.05, -0.48), at(0.05, -0.48), at(0.052, -0.5), at(-0.052, -0.5)], C.pinStripe)
  shape(pen, [at(-0.1, -0.12), at(-0.06, -0.12), at(-0.04, -0.3), at(-0.08, -0.3)], C.pinShade)
}

interface PinFly {
  base: Pt
  rot: number
  down: boolean
}
function pinAt(i: number, t: number): PinFly {
  const home = pinSpot(i)
  const row = i === 0 ? 0 : i < 3 ? 1 : i < 6 ? 2 : 3
  const t0 = STRIKE + row * 0.03 + hash(i, 61) * 0.02
  if (t < t0) return { base: home, rot: 0, down: false }
  const s = t - t0
  const vx = 1.4 + 3.8 * hash(i, 62) - row * 0.2
  const vy = -2.6 - 3.8 * hash(i, 63)
  const w = (hash(i, 64) > 0.5 ? 1 : -1) * (8 + 10 * hash(i, 65))
  // Off the cushion at the pit's back, they drop.
  const wall = PIT[1] - 0.22
  const x = Math.min(wall, home[0] + vx * s)
  const floorY = x > DECK_END + 0.05 ? PIT_FLOOR - 0.02 : home[1]
  // Up and over, turning, and down: on the deck, or into the pit.
  const T = (-vy + Math.sqrt(vy * vy + 2 * 12 * Math.max(0, floorY - home[1]))) / 12
  if (s < T) {
    const y = home[1] + vy * s + 6 * s * s
    return { base: [x, y], rot: w * s, down: false }
  }
  const xl = Math.min(wall, home[0] + vx * T)
  const slide = Math.min(0.25, (s - T) * 0.8)
  const settle = Math.sign(w) * Math.PI / 2
  return { base: [Math.min(wall + 0.05, xl + slide * Math.sign(vx)), floorY], rot: settle, down: true }
}

/* ------------------------------------------------------------------ the pinboy */

function pinboy(pen: Pen, t: number): void {
  const duck = 0.25 * Math.min(1, flash(t - STRIKE - 0.05, 0.6) * 2)
  const x = 20.5
  const y = -0.02 + duck
  rect(pen, 20.05, y + 0.03, END_WALL, y + 0.09, '#1B120E')
  // Sitting on his perch, knees up, a cap: in the dark, rimmed by the deck light.
  shape(pen, [[x - 0.25, y + 0.05], [x + 0.25, y + 0.05], [x + 0.2, y - 0.85], [x - 0.22, y - 0.8]], '#1E1A18')
  limb(pen, [x + 0.15, y], [x - 0.35, y - 0.35], 0.18, 0.15, '#1A1614')
  limb(pen, [x - 0.35, y - 0.35], [x - 0.4, y + 0.1], 0.15, 0.12, '#1A1614')
  ellipse(pen, [x - 0.02, y - 1.0], 0.16, 0.18, '#3A281E')
  blob(pen, [[x - 0.18, y - 1.05], [x - 0.1, y - 1.2], [x + 0.12, y - 1.18], [x + 0.17, y - 1.06]], '#2A2A2E')
  shape(pen, [[x - 0.12, y - 1.1], [x - 0.34, y - 1.07], [x - 0.12, y - 1.04]], '#2A2A2E')
  path(pen, [[x - 0.17, y - 1.0], [x - 0.12, y - 1.14], [x + 0.05, y - 1.17]], C.tube, 0.4)
}

/* ------------------------------------------------------------------ the part's drawing */

/**
 * Everything that moves, and the people, in the order they overlap; then the air in front of them (the dust in the
 * lamp, the smoke hanging under the tubes), and last what passes close in front of the lens.
 */
export function drawAlley(pen: Pen, t: number, f: Frame): void {
  doorLeaf(pen, t)
  const lx = lampOverTable(pen, t)
  bettor(pen, t)
  wally(pen, t)
  rack(pen, t)
  table(pen, t)
  contraption(pen, t)
  player(pen, t)
  nearPins(pen, t)
  strikeBurst(pen, t)
  drawCab(pen, SEAT, { t, wally: t >= WALK1 + 0.04, lights: lightsAt(t) })
  if (f.x0 < WALL[0]) cabSheen(pen, t)
  hats(pen, t)
  if (f.x1 > TABLE[0] - 0.6 && f.x0 < TABLE[1] + 0.6 && f.y0 < TOP) lampMotes(pen, t, lx)
  strata(pen, t, f)
  foreground(pen, t, f)
}

function lightsAt(t: number): number {
  if (t < LIGHTS) return 0
  return Math.min(1, 0.4 + (t - LIGHTS) / 0.08)
}

/* ------------------------------------------------------------------ the door */

function doorLeaf(pen: Pen, t: number): void {
  // The glass door, hung on the wall's outside face, opening out to the street: edge on when shut, face on open.
  const rattle = Math.abs(ring(t - DOOR_SHUT, 3.2, 0.22)) * 0.16
  const open = Math.max(doorOpen(t), rattle * (t >= DOOR_SHUT ? 1 : 0))
  const x = WALL[0]
  const w = 1.0 * Math.sin((open * Math.PI) / 2)
  if (w < 0.06) {
    rect(pen, WALL[0] + 0.06, HEAD + 0.06, WALL[1] - 0.06, FLOOR, C.chromeDark)
    rect(pen, WALL[0] + 0.1, HEAD + 0.2, WALL[1] - 0.1, -0.5, '#1E3550')
    return
  }
  const leaf: Pt[] = [[x, HEAD + 0.06], [x - w, HEAD + 0.16], [x - w, FLOOR - 0.08], [x, FLOOR]]
  shape(pen, leaf, C.chromeDark)
  const inset = (u: number, v: number): Pt => [x - w * u, HEAD + 0.06 + 0.1 * u + (FLOOR - HEAD - 0.06 - 0.18 * u) * v]
  shape(pen, [inset(0.12, 0.06), inset(0.88, 0.06), inset(0.88, 0.8), inset(0.12, 0.8)], '#1E3550')
  shape(pen, [inset(0.2, 0.1), inset(0.4, 0.1), inset(0.28, 0.6), inset(0.15, 0.6)], '#2F4E6C')
  line(pen, inset(0.15, 0.55), inset(0.85, 0.55), C.chrome, 1.4)
}

/* ------------------------------------------------------------------ the lamp over the money table */

function lampOverTable(pen: Pen, t: number): number {
  const lx = NET_X + 0.05
  const swing = 0.03 * Math.sin(t * 0.9)
  line(pen, [lx, CEIL + 0.06], [lx + swing, -3.6], '#141210', 0.7)
  shape(pen, [[lx + swing - 0.35, -3.3], [lx + swing + 0.35, -3.3], [lx + swing + 0.12, -3.62], [lx + swing - 0.12, -3.62]], '#2C3A30')
  ellipse(pen, [lx + swing, -3.3], 0.12, 0.04, C.warm)
  const ctx = ctxOf(pen.p)
  const k = pen.k
  // Its light down through the smoke to the table: faint, the air only just showing it.
  const g = ctx.createLinearGradient(0, -3.3 * k, 0, TOP * k)
  g.addColorStop(0, rgba(pen, C.warm, 0.11))
  g.addColorStop(1, rgba(pen, C.warm, 0.03))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((lx + swing - 0.3) * k, -3.3 * k)
  ctx.lineTo((lx + swing + 0.3) * k, -3.3 * k)
  ctx.lineTo((TABLE[1] + 0.6) * k, (TOP + 0.05) * k)
  ctx.lineTo((TABLE[0] - 0.6) * k, (TOP + 0.05) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Its pool on the table, and on the floor round the men's feet.
  shade(pen, [lx, TOP + 0.02], 3.0, 0.22, C.warm, 0.16)
  shade(pen, [lx, FB + 0.04], 4.2, 0.2, C.warm, 0.08)
  return lx + swing
}

/* ------------------------------------------------------------------ the table and the net */

function table(pen: Pen, t: number): void {
  const [x0, x1] = TABLE
  const [dx, dy] = DEPTH
  // The legs: the back pair, then the front.
  for (const lx of [x0 + 0.5, x1 - 0.5]) {
    rect(pen, lx + dx - 0.04, TOP + dy, lx + dx + 0.04, FB + dy, mix(C.leg, '#000000', 0.3))
    shape(pen, [[lx - 0.05, TOP + 0.06], [lx + 0.05, TOP + 0.06], [lx + 0.2, FB], [lx + 0.1, FB], [lx, TOP + 0.4], [lx - 0.1, FB], [lx - 0.2, FB]], C.leg)
  }
  rect(pen, x0 + 0.5, -1.15, x1 - 0.5, -1.1, C.leg)
  // Its shadow on the aisle.
  oval(pen, [(x0 + x1) / 2 + 0.05, FB + 0.02], 3.0, 0.07, 0, '#000000', 0.35)
  // The top: the surface seen from a little above, the front edge, the lines.
  shape(pen, [[x0, TOP], [x1, TOP], [x1 + dx, TOP + dy], [x0 + dx, TOP + dy]], C.tableTop)
  rect(pen, x0, TOP, x1, TOP + 0.07, C.tableFace)
  line(pen, [x0, TOP], [x1, TOP], C.tableLine, 0.8)
  line(pen, [x0 + dx, TOP + dy], [x1 + dx, TOP + dy], C.tableLine, 0.5)
  line(pen, [x0, TOP], [x0 + dx, TOP + dy], C.tableLine, 0.7)
  line(pen, [x1, TOP], [x1 + dx, TOP + dy], C.tableLine, 0.7)
  line(pen, [x0 + dx / 2, MID], [x1 + dx / 2, MID], mix(C.tableLine, C.tableTop, 0.4), 0.4)
  // The net, which shakes when the clumsy one dies in it.
  const shake = 0.05 * ring(t - NET_HIT, 5, 0.3)
  const nb: Pt = [NET_X, TOP]
  const ntop = 0.3
  const pts: Pt[] = [nb, [nb[0] + shake, TOP - ntop], [nb[0] + dx + shake, TOP + dy - ntop], [nb[0] + dx, TOP + dy]]
  shape(pen, pts, C.net)
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.globalAlpha = 0.5
  for (let i = 1; i < 6; i++) line(pen, lerp(pts[0], pts[3], i / 6), lerp(pts[1], pts[2], i / 6), '#3A3A3A', 0.3)
  for (let i = 1; i < 4; i++) line(pen, lerp(pts[0], pts[1], i / 4), lerp(pts[3], pts[2], i / 4), '#3A3A3A', 0.3)
  ctx.restore()
  line(pen, pts[1], pts[2], C.netTop, 1.2)
  rect(pen, nb[0] - 0.03, TOP - ntop - 0.03, nb[0] + 0.03, TOP + 0.08, C.chromeDark)
  // The mark's spare: his bat, lying on the table until he picks it up.
  if (t < PICKUP[0] + 0.25) oval(pen, [7.9, MID - 0.02], 0.22, 0.05, 0, C.bowl1)
}

/* ------------------------------------------------------------------ Marty's sprung bat */

const deg = (d: number) => (d * Math.PI) / 180
const COCKED = 150
const AT_BALL = 213

/** The arm's angle, degrees (0 is out to the right, y down): hanging, cocked, firing, following through. */
function armAngle(t: number): { th: number; wob: number } {
  if (t < PAN_IN) return { th: 100 + 3 * Math.sin(t * 2.1), wob: 0 }
  let th = 100 + (COCKED - 100) * ease((t - PAN_IN) / 0.28) + 6 * ring(t - PAN_IN - 0.28, 4, 0.12)
  let wob = 0
  for (const f of FIRES) {
    const s = t - f.t
    if (s < -0.07 || s > 1.2) continue
    if (s < 0) {
      const u = (s + 0.07) / 0.07
      th = COCKED + (AT_BALL - COCKED) * u * u
    } else if (f.kind === 'clumsy') {
      // Late and limp: it flops through, wobbles, and drags itself back.
      if (s < 0.75) {
        th = 205 + 34 * ring(s, 2.6, 0.32)
        wob = ring(s, 6, 0.3)
      } else th = 205 + (COCKED - 205) * ease((s - 0.75) / 0.4)
    } else {
      const big = f.kind === 'winner' || f.kind === 'smash'
      const far = f.kind === 'winner' ? 300 : big ? 294 : 282
      const back = f.kind === 'winner' ? 0.9 : 0.4
      if (s < 0.05) th = AT_BALL + (far - AT_BALL) * (s / 0.05)
      else if (f.kind === 'winner' && s < 0.55) th = far + 6 * ring(s - 0.05, 7, 0.15)
      else {
        const u = clamp01((s - (f.kind === 'winner' ? 0.55 : 0.05)) / (back - 0.05))
        th = far + (COCKED + 360 - far) * ease(u)
        if (th > 360) th -= 360
        if (u >= 1) th = COCKED + 5 * ring(s - back, 5, 0.1)
      }
    }
  }
  return { th, wob }
}

function contraption(pen: Pen, t: number): void {
  const x0 = TABLE[0]
  // Has he just come into the pan? It dips.
  const lands = [PAN_IN, PAN_BACK, CLUMSY, ...MARTY_HIT.slice(1)]
  const dip = 0.05 * Math.max(...lands.map((l) => flash(t - l, 0.09)))
  // The clamp on the table's end, and the bracket down to the pivot.
  rect(pen, x0 - 0.08, TOP - 0.08, x0 + 0.14, TOP - 0.02, C.iron)
  rect(pen, x0 - 0.08, TOP - 0.08, x0 - 0.02, TOP + 0.2, C.iron)
  rect(pen, x0 - 0.08, TOP + 0.14, x0 + 0.14, TOP + 0.2, C.iron)
  line(pen, [x0 + 0.04, TOP + 0.2], [x0 + 0.04, TOP + 0.32], C.ironHi, 0.8)
  ellipse(pen, [x0 + 0.04, TOP + 0.33], 0.05, 0.02, C.ironHi)
  shape(pen, [[x0 - 0.05, TOP + 0.18], [x0 + 0.03, TOP + 0.18], [PIVOT[0] + 0.05, PIVOT[1]], [PIVOT[0] - 0.04, PIVOT[1] + 0.04]], C.iron)
  // The pan: a little dish on a lever out from the clamp, under where he sits.
  const panY = PAN[1] + R + dip
  line(pen, [x0 - 0.05, TOP + 0.02], [PAN[0] + 0.12, panY + 0.03], C.ironHi, 1)
  shape(pen, [[PAN[0] - 0.19, panY - 0.03], [PAN[0] + 0.19, panY - 0.03], [PAN[0] + 0.13, panY + 0.06], [PAN[0] - 0.13, panY + 0.06]], C.chromeDark)
  line(pen, [PAN[0] - 0.19, panY - 0.03], [PAN[0] + 0.19, panY - 0.03], C.chrome, 0.8)
  // The arm, its spring, and the red bat at its end.
  const { th, wob } = armAngle(t)
  const a = deg(th)
  const dir: Pt = [Math.cos(a), Math.sin(a)]
  const face: Pt = [PIVOT[0] + dir[0] * ARM, PIVOT[1] + dir[1] * ARM]
  const rodEnd: Pt = [PIVOT[0] + dir[0] * (ARM - 0.32), PIVOT[1] + dir[1] * (ARM - 0.32)]
  const sp0: Pt = [x0 + 0.04, TOP + 0.3]
  const sp1: Pt = [PIVOT[0] + dir[0] * 0.3, PIVOT[1] + dir[1] * 0.3]
  const coil: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    const p = lerp(sp0, sp1, u)
    const nx = -(sp1[1] - sp0[1])
    const ny = sp1[0] - sp0[0]
    const L = Math.hypot(nx, ny) || 1
    const o = i === 0 || i === 10 ? 0 : (i % 2 ? 0.045 : -0.045)
    coil.push([p[0] + (nx / L) * o, p[1] + (ny / L) * o])
  }
  path(pen, coil, C.spring, 0.7)
  limb(pen, PIVOT, rodEnd, 0.06, 0.05, C.ironHi)
  limb(pen, rodEnd, [PIVOT[0] + dir[0] * (ARM - 0.2), PIVOT[1] + dir[1] * (ARM - 0.2)], 0.07, 0.06, C.handle)
  const thin = 0.1 * (1 + 0.9 * wob)
  oval(pen, face, 0.235, Math.abs(thin) + 0.015, a, C.redDark)
  oval(pen, face, 0.215, Math.abs(thin), a, C.red)
  ellipse(pen, PIVOT, 0.06, 0.06, C.iron)
  ellipse(pen, PIVOT, 0.025, 0.025, C.ironHi)
}

/* ------------------------------------------------------------------ the mark who plays */

const PICKUP: [number, number] = [CLACK - 0.15, PAN_IN - 0.05]
const READY_DY = -2.6

function markBatAt(t: number): { face: Pt; rot: number } {
  // Where his bat waits, wherever his feet have taken him.
  const ready: Pt = [markPose(t).x - 0.55, READY_DY]
  // Picking it up off the table.
  const rest: Pt = [7.9, MID - 0.02]
  if (t < PICKUP[0]) return { face: rest, rot: 0 }
  if (t < PICKUP[1]) {
    const u = ease((t - PICKUP[0]) / (PICKUP[1] - PICKUP[0]))
    return { face: lerp(rest, ready, u), rot: (1 - u) * 0 + u * 1.2 }
  }
  let face: Pt = [ready[0] + 0.03 * Math.sin(t * 2.3), ready[1] + 0.03 * Math.sin(t * 3.1)]
  let rot = 1.2
  // The taps on the table's end.
  for (const tap of TAPS) {
    const s = t - tap
    if (s > -0.2 && s < 0.25) {
      const knock: Pt = [8.42, TOP - 0.2]
      const u = s < 0 ? ease((s + 0.2) / 0.2) : 1 - ease(s / 0.25)
      face = lerp(face, knock, u)
      rot = 1.2 + 0.4 * u
    }
  }
  // The strokes: back, through the ball, and up the way the shot goes (a lob scoops high, a block barely moves).
  for (const st of STROKES) {
    const s = t - st.t
    if (s < -0.32 || s > 0.4) continue
    const contact: Pt = [st.p[0] + R + 0.06, st.p[1] + 0.02]
    const lob = st.kind === 'lob'
    const block = st.kind === 'block'
    const back: Pt = st.miss ? [contact[0] + 0.6, -2.55] : [contact[0] + (block ? 0.35 : 0.72), contact[1] + (lob ? 0.45 : 0.28)]
    const through: Pt = st.miss ? [8.55, -3.3] : [contact[0] - (block ? 0.12 : 0.3), contact[1] - (lob ? 1.0 : block ? 0.18 : 0.5)]
    if (s < -0.24) face = lerp(face, back, ease((s + 0.32) / 0.08))
    else if (s < 0) face = lerp(back, contact, ease((s + 0.24) / 0.24))
    else if (s < 0.2) face = lerp(contact, through, ease(s / 0.2))
    else face = lerp(through, st.miss ? [ready[0] + 0.2, -1.95] : face, ease((s - 0.2) / 0.2))
    rot = 1.2 - 0.6 * clamp01(1 - Math.abs(s) / 0.25)
  }
  // After the miss, it hangs from his hand.
  if (t > WHIFF + 0.4) {
    face = [ready[0] + 0.2 + 0.02 * Math.sin(t * 1.4), -1.95]
    rot = 1.5
  }
  return { face, rot }
}

function player(pen: Pen, t: number): void {
  const bat = markBatAt(t)
  const hand: Pt = [bat.face[0] + Math.cos(bat.rot) * 0.32, bat.face[1] + Math.sin(bat.rot) * 0.32]
  const laughing = t > NET_HIT + 0.1 && t < PAN_BACK + 0.5 ? clamp01(Math.min(t - NET_HIT - 0.1, PAN_BACK + 0.5 - t) / 0.2) : 0
  const bob = laughing * 0.035 * Math.abs(Math.sin((t - NET_HIT) * Math.PI * 4.4)) + 0.015 * Math.sin(t * 1.9)
  const stunned = t > WHIFF ? clamp01((t - WHIFF) / 0.4) : 0
  const pose = markPose(t)
  // His feet step when he moves: a stride's phase from how far he has come.
  const moving = Math.abs(markPose(t + 0.04).x - markPose(t - 0.04).x) > 0.02
  // Laughing at the given point, he pushes his hat back with his free hand.
  const tip = hatTip(t)
  const lean = pose.lean - 0.12 * stunned
  const bobAll = bob + pose.crouch - 0.03 * stunned
  const brim: Pt = [pose.x - lean - 0.05 - 0.3, FB - 2.93 + bobAll - 0.12]
  const far: Pt = lerp([pose.x + 0.12, FB - 1.55 + pose.crouch], brim, ease(tip * 1.6))
  const head = figure(pen, {
    x: pose.x,
    y: FB,
    face: -1,
    coat: C.grey,
    trousers: C.trousers,
    skin: C.skinW,
    hat: t < HATS ? 'fedora' : null,
    hatCol: C.hat,
    tie: C.tie2,
    lean,
    bob: bobAll,
    walk: moving ? (pose.x - MARK_X) * 7 : null,
    laugh: laughing * (0.5 + 0.5 * Math.abs(Math.sin((t - NET_HIT) * 9))),
    near: hand,
    far,
    rim: C.warm,
    hatTip: tip,
    holding: () => {
      line(pen, hand, [bat.face[0] + Math.cos(bat.rot) * 0.18, bat.face[1] + Math.sin(bat.rot) * 0.18], C.handle, 2.2)
      oval(pen, bat.face, 0.215, t < PICKUP[0] ? 0.05 : 0.11, bat.rot + Math.PI / 2, C.bowl1)
      oval(pen, bat.face, 0.195, t < PICKUP[0] ? 0.04 : 0.09, bat.rot + Math.PI / 2, '#2A2A30')
    },
  })
  HEADS.player = head
}

const HEADS: { player: Pt; bettor: Pt } = { player: [MARK_X - 0.27, FB - 2.93], bettor: [MARK2_X + 0.05, FB - 2.93] }

/* ------------------------------------------------------------------ the mark who bets, and Wally */

/**
 * How the two by the counter watch the money point: leaning in to the table, their bodies going with the ball, out to
 * the mark's end and back to Marty's, from the serve to the winner.
 */
function watching(t: number): number {
  const on = clamp01((t - (HITS[0] - 0.4)) / 0.4) * (1 - clamp01((t - LANE_LAND) / 0.4))
  if (on <= 0) return 0
  const x = WAY.at(t)[0]
  return on * (0.07 + 0.08 * Math.max(-1, Math.min(1, (x - NET_X) / 3.2)))
}

/** How much is in Wally's hand: the first stake, then the raise. */
const stakes = (t: number): number => (t < RAISE ? 1 : 3)

function wad(pen: Pen, hand: Pt, n: number): void {
  for (let i = 0; i < n + 1; i++) {
    const r = -0.5 + i * 0.25
    const c = Math.cos(r)
    const s = Math.sin(r)
    const w = 0.2
    const h = 0.1
    const o: Pt = [hand[0] + 0.02, hand[1] - 0.04]
    const pts: Pt[] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [o[0] + x * c - y * s, o[1] + x * s + y * c] as Pt)
    shape(pen, pts, i % 2 ? C.cash : mix(C.cash, '#FFFFFF', 0.15))
    line(pen, pts[0], pts[1], C.cashDark, 0.4)
  }
}

function bettor(pen: Pen, t: number): void {
  // He reaches across to Wally with the raise, and slaps it into his hand.
  const reach = RAISE - 0.32
  const rest: Pt = [MARK2_X + 0.42, FB - 1.95]
  let near: Pt = rest
  let holds = t < RAISE ? 1 : 0
  if (t > reach && t < RAISE + 0.35) {
    const u = t < RAISE ? ease((t - reach) / 0.32) : 1 - ease((t - RAISE) / 0.35)
    near = lerp(near, [0.22, -2.06], u)
  }
  if (t >= RAISE) holds = 0
  // The strike: both hands up to his head.
  const dismay = t > STRIKE ? clamp01((t - STRIKE) / 0.2) * (1 - clamp01((t - HATS - 0.6) / 0.4)) : 0
  if (dismay > 0) near = lerp(near, [MARK2_X + 0.22, FB - 3.25], dismay)
  const laughing = t > NET_HIT + 0.1 && t < PAN_BACK - 0.2 ? clamp01(Math.min(t - NET_HIT - 0.1, PAN_BACK - 0.2 - t) / 0.2) : 0
  const sore = t > STRIKE ? clamp01((t - STRIKE) / 0.5) : 0
  const lean = -0.04 + 0.08 * sore + watching(t) + shift(t, 2)
  const bob = laughing * 0.04 * Math.abs(Math.sin((t - NET_HIT) * Math.PI * 4)) + 0.012 * Math.sin(t * 1.3 + 1)
  // His beer: on the counter by him, then, once the raise is down, a long nervous pull at it through the rally.
  const mouth: Pt = [MARK2_X + lean + 0.05 + 0.22, FB - 2.93 + bob + 0.1]
  const drink = bettorDrink(t, rest, mouth)
  if (drink.hand) near = drink.hand
  if (!drink.held) {
    beer(pen, BETTOR_GLASS, 0.24, 0.1)
    bubbles(pen, t, [[BETTOR_GLASS[0], BETTOR_GLASS[1], 0.24, 0.1]])
  }
  const head = figure(pen, {
    x: MARK2_X,
    y: FB,
    face: 1,
    coat: C.brown,
    trousers: C.brownDark,
    skin: C.skinW2,
    hat: t < HATS ? 'fedora' : null,
    hatCol: C.hat2,
    tie: C.tie,
    girth: 1.3,
    lean,
    bob,
    laugh: laughing * (0.5 + 0.5 * Math.abs(Math.sin((t - NET_HIT) * 8))),
    near,
    far: [MARK2_X - 0.15, FB - 1.6],
    rim: C.warm,
    holding: (h) => {
      if (holds) wad(pen, h, 1)
      else if (drink.held) beer(pen, [h[0] + 0.02, h[1] + 0.12], 0.24, 0.1, drink.tilt)
    },
  })
  HEADS.bettor = head
  // His cigar (out of his mouth while he drinks), and its smoke going up into the tubes' light.
  const drinking = drink.held && drink.tilt < -0.3
  const cig: Pt = [head[0] + 0.24, head[1] + 0.12]
  if (!drinking) {
    line(pen, [head[0] + 0.16, head[1] + 0.1], cig, '#4A2E1A', 2.2)
    // Its coal, breathing.
    ellipse(pen, cig, 0.025, 0.025, mix('#6A2418', '#D8452A', 0.6 + 0.3 * Math.sin(t * 2.7)))
  }
  for (let i = 0; i < 5; i++) {
    const u = (t * 0.18 + i / 5) % 1
    const sx = cig[0] + 0.1 * u + 0.15 * Math.sin(u * 5 + i + t * 0.6) * u
    blob(pen, [[sx - 0.06 - 0.12 * u, cig[1] - u * 1.6], [sx + 0.04, cig[1] - u * 1.6 - 0.08 - 0.1 * u], [sx + 0.1 + 0.12 * u, cig[1] - u * 1.6 + 0.02]], C.smoke, 0.16 * (1 - u))
  }
  if (!drinking) curl(pen, t, cig, 1.3, 3, C.smoke, 0.22)
}

function wally(pen: Pen, t: number): void {
  const w = wallyAt(t)
  if (t >= WALK1 + 0.04) return
  const walking = w.walking && t > WALK0
  const phase = walking ? (t - WALK0) * Math.PI * 2 * 1.85 : null
  // Holding the stakes, easy, at his chest; taking the raise; pocketing it on the way out.
  let near: Pt = [w.x + 0.36, w.y - 1.98]
  if (t > RAISE - 0.3 && t < RAISE + 0.4) {
    const u = t < RAISE ? ease((t - (RAISE - 0.3)) / 0.3) : 1 - ease((t - RAISE) / 0.4)
    near = lerp(near, [0.24, -2.04], u)
  }
  let holds = stakes(t)
  if (walking) {
    const u = clamp01((t - (POCKET - 0.35)) / 0.35)
    const out: Pt = [w.x - 0.3, w.y - 1.9 + 0.1 * Math.sin((phase ?? 0) + 1)]
    const chest: Pt = [w.x - 0.12, w.y - 2.35]
    near = t < POCKET ? lerp(out, chest, ease(u)) : lerp(chest, [w.x + 0.15 * Math.sin(phase ?? 0), w.y - 1.45], ease((t - POCKET) / 0.3))
    if (t >= POCKET) holds = 0
  }
  const grin = t > HATS ? clamp01((t - HATS) / 0.25) : 0.35
  const sink = w.sink * 1.6
  // Behind the cab, only what shows over its body: nothing of him under it.
  const behind = w.x < CURB
  const ctx = ctxOf(pen.p)
  if (behind) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(-60 * pen.k, -20 * pen.k, 120 * pen.k, (20 - 0.05) * pen.k)
    ctx.clip()
  }
  figure(pen, {
    x: w.x,
    y: w.y + sink,
    face: w.face,
    coat: C.leather,
    trousers: C.trousers,
    skin: C.skinB,
    hat: 'cap',
    hatCol: C.cap,
    leather: true,
    lean: walking ? 0.08 : -0.06 + watching(t) * 0.7 + shift(t, 5),
    bob: walking ? -0.03 * Math.abs(Math.sin(phase ?? 0)) : 0.01 * Math.sin(t * 1.1),
    walk: phase,
    grin,
    near,
    far: walking ? [w.x - 0.35 * Math.sin(phase ?? 0) * w.face, w.y - 1.5] : [w.x - 0.18, w.y - 1.55],
    rim: walking && w.x < WALL[0] ? C.mercury : C.warm,
    holding: (h) => {
      if (holds) wad(pen, h, holds)
    },
  })
  if (behind) ctx.restore()
}

/* ------------------------------------------------------------------ the rack and its house balls */

function rack(pen: Pen, t: number): void {
  const [x0, x1] = RACK
  // Legs, the rails, the hood over the lift.
  for (const lx of [x0 + 0.12, HOOD[0] - 0.1, x1 - 0.08]) rect(pen, lx - 0.04, RAIL + 0.04, lx + 0.04, FLOOR + 0.02, C.chromeDark)
  oval(pen, [(x0 + x1) / 2, FLOOR + 0.03], 0.85, 0.045, 0, '#000000', 0.35)
  rect(pen, x0, RAIL, HOOD[0], RAIL + 0.05, C.chrome)
  rect(pen, x0, RAIL + 0.08, HOOD[0], RAIL + 0.11, C.chromeDark)
  rect(pen, x0 - 0.03, RAIL - 0.12, x0 + 0.03, RAIL + 0.05, C.chrome)
  const pop = flash(t - POP, 0.12)
  blob(pen, [[HOOD[0], RAIL + 0.1], [HOOD[0] + 0.02, RAIL - 0.42], [(HOOD[0] + HOOD[1]) / 2, RAIL - 0.62 - 0.05 * pop], [HOOD[1] - 0.02, RAIL - 0.42], [HOOD[1], RAIL + 0.1]], C.trim)
  blob(pen, [[HOOD[0] + 0.08, RAIL - 0.3], [(HOOD[0] + HOOD[1]) / 2, RAIL - 0.56 - 0.05 * pop], [HOOD[1] - 0.12, RAIL - 0.36], [(HOOD[0] + HOOD[1]) / 2, RAIL - 0.42]], C.carpetHi, 0.6)
  for (let i = 0; i < 4; i++) line(pen, [HOOD[0] + 0.1, RAIL - 0.05 - i * 0.07], [HOOD[1] - 0.1, RAIL - 0.05 - i * 0.07], C.chromeDark, 0.5)
  rect(pen, HOOD[0] - 0.02, RAIL + 0.05, HOOD[1] + 0.02, RAIL + 0.12, C.chrome)
  // The two house balls: he lands against the near one, it rolls into the other.
  const nudge = t < RAIL_LAND ? 0 : t < CLACK ? 0.06 * ease((t - RAIL_LAND) / (CLACK - RAIL_LAND)) : 0.06
  const b1: Pt = [BOWLS0[0] + nudge + 0.008 * ring(t - CLACK, 4, 0.15), RAIL - BOWL_R]
  const b2: Pt = [BOWLS0[1] + 0.006 * ring(t - CLACK - 0.02, 5, 0.12), RAIL - BOWL_R]
  for (const [b, col, turn] of [[b1, C.bowl1, nudge / BOWL_R], [b2, C.bowl2, 0]] as [Pt, string, number][]) {
    ellipse(pen, b, BOWL_R, BOWL_R, col)
    blob(pen, [[b[0] - 0.12, b[1] - 0.02], [b[0] - 0.05, b[1] - 0.14], [b[0] + 0.06, b[1] - 0.12], [b[0] - 0.02, b[1] - 0.05]], mix(col, '#FFFFFF', 0.25), 0.5)
    for (let h = 0; h < 3; h++) {
      const an = -1.2 + turn + h * 0.45
      ellipse(pen, [b[0] + Math.cos(an) * 0.09, b[1] + Math.sin(an) * 0.09], 0.025, 0.025, '#050505')
    }
  }
}

/* ------------------------------------------------------------------ the near rack of pins */

function nearPins(pen: Pen, t: number): void {
  // Under the masking board's light, standing; on the strike, everywhere.
  for (const i of PIN_ORDER) {
    const pin = pinAt(i, t)
    drawPin(pen, pin.base, pin.rot, 1, pin.down ? 0.6 : 1)
  }
  // The pit's front lip, over whatever went into it.
  rect(pen, PIT[0] - 0.02, NEAR[1], PIT[0] + 0.06, EDGE, C.woodDark)
}

/* ------------------------------------------------------------------ the hats */

function hats(pen: Pen, t: number): void {
  if (t < HATS) return
  for (const [who, v, w, col] of [['player', [1.2, -4.4], -12, C.hat], ['bettor', [-0.9, -4.8], 10, C.hat2]] as ['player' | 'bettor', Pt, number, string][]) {
    const h = HEADS[who]
    const start: Pt = [h[0], h[1] - 0.15]
    const floor = FB - 0.05
    const s = t - HATS
    const T = (-v[1] + Math.sqrt(v[1] * v[1] + 24 * (floor - start[1]))) / 12
    if (s < T) drawFedora(pen, [start[0] + v[0] * s, start[1] + v[1] * s + 6 * s * s], w * s, col)
    else drawFedora(pen, [start[0] + v[0] * T, floor], Math.PI * (w > 0 ? 1 : -1) * 0.04, col)
  }
}
