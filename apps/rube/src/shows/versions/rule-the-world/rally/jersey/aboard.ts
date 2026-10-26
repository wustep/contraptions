import type { Pt } from '../../../../../parts'
import { sway } from '../depth'
import { hash, smooth } from '../kit'
import { ctxOf, type Pen } from '../pen'
import { FLOOR, ON_SILL, WIN_C, WIN_R, WIN_X } from './geo'
import { bag, box, disc, fill, oval, poly } from './ink'

/**
 * Who is on the airliner: the night flight to Tokyo, waiting at its stair with its cabin lit. In its round windows the
 * passengers already in their seats, dark against the lamps: a hat, a head of hair, settling, turning to look out at
 * the fire across the field, one of them behind a newspaper turning its pages; and down the aisle behind them the
 * stewardess, coming aft past the windows, stopping at a row, and going on to wait by the door for him.
 * The first window aft of the door is left empty: it is his, and the way into Tokyo.
 *
 * They are seen only through the glass, so all of it is drawn inside the windows' circles; nothing here gives light.
 */

const HEAD = '#2E251C'
/** The seats' high backs, a shade under the cabin's lamps: what makes a head in a round window a passenger. */
const SEAT = '#7A5E3C'
const PAPER = '#CBBF9E'
/** The windows the passengers are seen in: every one aft of his, to short of the nose. */
const SEATS = 7
const at = (i: number): number => WIN_X + 1.5 * (i + 1)

/**
 * When the stewardess comes down the aisle, and the windows (by index) she stops at on her way aft: the last is beside
 * his seat, where she waits for him.
 */
const AISLE: [number, number] = [166, 176.8]
const STOPS = [2, 0]

/** How far a passenger leans to the glass to look out at the fire across the field, now and then: 0 sat back, 1 at it. */
const peerOf = (t: number, i: number): number =>
  smooth(Math.max(0, Math.sin((t + 9 * hash(i, 32, 7)) * (0.55 + 0.25 * hash(i, 33, 7)))), 0.55, 0.95)
/** The reader's page: 1 open, dipping to 0 as he turns one over, every 7.3 s. */
const pageOf = (t: number): number => Math.abs(Math.cos(Math.PI * smooth((t % 7.3) / 7.3, 0.85, 1)))

/** Where she is along the aisle at `t`: walking aft from beyond the windows, a pause at a row, then on to his seat. */
function stewardess(t: number): number | null {
  if (t < AISLE[0] || t > AISLE[1]) return null
  const v = 1.3
  const pause = 1.4
  let x = at(6) + 0.8
  let left = t - AISLE[0]
  for (const s of STOPS) {
    const stopX = at(s) - 0.2
    const walk = (x - stopX) / v
    if (left < walk) return x - left * v
    left -= walk
    x = stopX
    if (left < pause) return x
    left -= pause
  }
  return x
}

export function drawAboard(pen: Pen, t: number, nose: number, a = 1): void {
  if (a <= 0.01) return
  const cy = WIN_C[1]
  const r = WIN_R
  const heads = bag()
  const seats = bag()
  const paper = bag()
  for (let i = 0; i < SEATS; i++) {
    const x = at(i)
    if (x > nose - 4) break
    // Most seats taken; a couple of windows empty.
    if (i > 1 && hash(i, 31, 7) < 0.22) continue
    const peer = peerOf(t, i)
    // Each sits to the fore side of the window against his seat's high back, never in its middle: a head and its
    // shoulders in one piece, so that a round window with a head in it reads as a seat and a passenger, not a face.
    const hx = x - 0.08 + (hash(i, 34, 7) - 0.5) * 0.06 + 0.035 * sway(t, i * 1.7, 5 + 2 * hash(i, 35, 7)) + 0.06 * peer
    const hy = cy - 0.01 - 0.03 * peer + 0.012 * sway(t, i * 2.3, 3.1)
    oval(seats, x + 0.13, cy - 0.1, 0.11, 0.07)
    box(seats, x + 0.02, cy - 0.1, x + 0.24, cy + 0.4)
    // The shoulders, the neck, the head, and a hat or a head of hair.
    oval(heads, hx - 0.03, hy + 0.3, 0.25, 0.17)
    box(heads, hx - 0.04, hy, hx + 0.035, hy + 0.2)
    disc(heads, hx, hy, 0.095)
    const kind = Math.floor(hash(i, 36, 7) * 3)
    if (kind === 0) {
      oval(heads, hx, hy - 0.07, 0.13, 0.025)
      box(heads, hx - 0.07, hy - 0.15, hx + 0.07, hy - 0.06)
    } else if (kind === 1) disc(heads, hx + 0.05, hy - 0.03, 0.05)
    // One reads the evening paper, turning a page now and then.
    if (i === 2) {
      const w = 0.16 * (0.35 + 0.65 * pageOf(t))
      box(paper, hx - 0.05 - w, hy - 0.06 + 0.02 * sway(t, 9, 2.4), hx - 0.05 + w * 0.3, hy + 0.2)
    }
  }
  // The stewardess, standing in the aisle behind the seats, taller than them: her cap, her shoulders.
  const sx = stewardess(t)
  if (sx !== null) {
    const bob = 0.012 * Math.abs(Math.sin(t * 5.2))
    disc(heads, sx, cy - 0.12 - bob, 0.08)
    oval(heads, sx, cy - 0.2 - bob, 0.07, 0.03)
    oval(heads, sx, cy + 0.13 - bob, 0.17, 0.16)
  }
  // Only through the glass.
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < SEATS; i++) {
    const x = at(i)
    if (x > nose - 4) break
    ctx.moveTo((x + r) * k, cy * k)
    ctx.arc(x * k, cy * k, r * k, 0, Math.PI * 2)
  }
  ctx.clip()
  fill(pen, seats, SEAT, 0.5 * a)
  fill(pen, heads, HEAD, 0.8 * a)
  fill(pen, paper, PAPER, 0.85 * a)
  ctx.restore()
}

/* ------------------------------------------------------------------ in the cabin */

/**
 * The same people inside, once the cabin opens round him (drawn in `draw.ts`'s cabin, so fading in with it as the
 * windows' heads fade out): the stair showed the seats along the windows taken. The seat at his own window is empty;
 * in the next a man has put his hat up on the rack and reads the evening paper, turning its pages as he did in his
 * window. And the stewardess, who came aft past the windows to wait for him, stands in the aisle beside his seat
 * facing the door, and as he gets up onto his sill she bows her head to him. Lit by the cabin's lamps, so in their
 * own colours, and flat, as the cabin is; nothing here gives light.
 */

const SKIN = '#C9A27E'
const SHOE = '#1C1715'
const STOCKING = '#9A7E66'
const SUIT = '#4C4339'
const FELT = '#3A3631'
const HAIR = '#2B231D'
const NEWSPRINT = '#E6E0D0'
const NAVY = '#27304A'
const BLOUSE = '#ECE8DC'
/** Her sleeve, a shade under the jacket, so the arm reads against it. */
const SLEEVE = '#1A2135'

/** A piece, wound the way a disc is so that pieces of one colour that cross add up and never cut each other. */
function piece(path: Path2D, pts: Pt[]): void {
  const area = pts.reduce((sum, [x, y], i) => sum + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0)
  poly(path, area < 0 ? [...pts].reverse() : pts)
}
/** `p` turned by `a` (radians, + leaning toward the nose) about `c`: a body bending at the hip. */
function turn(p: Pt, c: Pt, a: number): Pt {
  const dx = p[0] - c[0]
  const dy = p[1] - c[1]
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]
}

/**
 * The man in the seat after his, whose back is at `x`: sat back in it facing the nose, drawn between the seat and its
 * near arm, his hat up on the rack over him, his paper held open before him. Seen from the side the paper is a sheet,
 * which opens wide as a page goes over.
 */
export function drawReader(pen: Pen, t: number, x: number): void {
  const F = FLOOR
  const hip: Pt = [x + 0.14, F - 0.72]
  const lean = 0.02 * sway(t, 3, 4.2)
  const up = (pts: Pt[]): Pt[] => pts.map((q) => turn(q, hip, lean))
  const body = bag()
  const skin = bag()
  const hair = bag()
  const shoes = bag()
  const hat = bag()
  const paper = bag()
  // Shins, shoes, and the thighs along the cushion.
  piece(body, [[x + 0.47, F - 0.78], [x + 0.6, F - 0.78], [x + 0.63, F - 0.07], [x + 0.52, F - 0.07]])
  oval(shoes, x + 0.62, F - 0.045, 0.11, 0.045)
  piece(body, [[x + 0.04, F - 0.64], [x + 0.6, F - 0.67], [x + 0.62, F - 0.83], [x + 0.06, F - 0.84]])
  // The body, sat back against the seat; the neck; the head, turned to the nose; his hair, cut short.
  piece(body, up([[x + 0.04, F - 0.66], [x + 0.02, F - 1.12], [x + 0.1, F - 1.2], [x + 0.25, F - 1.16], [x + 0.3, F - 0.92], [x + 0.3, F - 0.66]]))
  piece(skin, up([[x + 0.12, F - 1.27], [x + 0.19, F - 1.27], [x + 0.19, F - 1.15], [x + 0.12, F - 1.15]]))
  const [hx, hy] = turn([x + 0.17, F - 1.33], hip, lean)
  oval(skin, hx, hy, 0.085, 0.1)
  piece(skin, [[hx + 0.075, hy - 0.03], [hx + 0.105, hy + 0.025], [hx + 0.075, hy + 0.035]])
  oval(hair, hx - 0.03, hy - 0.04, 0.08, 0.07)
  // His hat on the rack.
  oval(hat, x + 0.1, F - 2.065, 0.15, 0.025)
  piece(hat, [[x, F - 2.07], [x + 0.02, F - 2.19], [x + 0.18, F - 2.19], [x + 0.2, F - 2.07]])
  // His arms up to the paper.
  const shoulder = turn([x + 0.15, F - 1.14], hip, lean)
  const elbow: Pt = [x + 0.31, F - 0.86]
  const hands: Pt = [x + 0.45, F - 1.12]
  piece(body, [[shoulder[0] - 0.05, shoulder[1]], [shoulder[0] + 0.05, shoulder[1] - 0.03], [elbow[0] + 0.04, elbow[1] - 0.02], [elbow[0] - 0.04, elbow[1] + 0.03]])
  piece(body, [[elbow[0] - 0.04, elbow[1]], [elbow[0] + 0.03, elbow[1] - 0.04], [hands[0] + 0.02, hands[1]], [hands[0] - 0.04, hands[1] - 0.02]])
  disc(skin, hands[0], hands[1], 0.03)
  const w = 0.1 + 0.1 * (1 - pageOf(t))
  piece(paper, [[hands[0] - 0.03, F - 1.5], [hands[0] - 0.03 + w, F - 1.47], [hands[0] + 0.01 + w, F - 0.97], [hands[0] + 0.01, F - 0.98]])
  // Its columns of type, so that it is a newspaper and not a sheet of the wall.
  const type = bag()
  for (let i = 0; i < 5; i++) {
    const y = F - 1.42 + i * 0.09
    piece(type, [[hands[0] - 0.01, y], [hands[0] - 0.02 + w * 0.8, y + 0.006], [hands[0] - 0.02 + w * 0.8, y + 0.022], [hands[0] - 0.01, y + 0.016]])
  }
  fill(pen, hat, FELT, 1)
  fill(pen, body, SUIT, 1)
  fill(pen, shoes, SHOE, 1)
  fill(pen, skin, SKIN, 1)
  fill(pen, hair, HAIR, 1)
  fill(pen, paper, NEWSPRINT, 1)
  fill(pen, type, '#8A8273', 1)
}

/** The stewardess in the aisle, in front of the seats: walking aft to his seat, then waiting there, and her bow. */
export function drawAisle(pen: Pen, t: number): void {
  const sx = stewardess(t)
  if (sx === null) return
  const F = FLOOR
  // A step as she comes, until she stops; then still.
  const walking = stewardess(t - 0.05) !== sx
  const ph = walking ? t * 7 : 0
  const st = walking ? 0.05 * Math.sin(ph) : 0
  const bob = walking ? 0.012 * Math.abs(Math.sin(ph)) : 0
  // Her bow, as he gets up onto his sill: down over half a beat, held, and up.
  const b = smooth(t, ON_SILL, ON_SILL + 0.3) * (1 - smooth(t, ON_SILL + 0.75, ON_SILL + 1.15))
  const hip: Pt = [sx, F - 1.0 - bob]
  const up = (pts: Pt[]): Pt[] => pts.map((q) => turn([q[0], q[1] - bob], hip, -0.38 * b))
  const legs = bag()
  const navy = bag()
  const skin = bag()
  const hair = bag()
  const white = bag()
  const shoes = bag()
  // Her legs (she faces aft, the way he is), her shoes, her skirt.
  piece(legs, [[sx - 0.07 - st, F - 0.52], [sx - 0.01 - st, F - 0.52], [sx - 0.01 - st, F - 0.04], [sx - 0.07 - st, F - 0.04]])
  piece(legs, [[sx + 0.01 + st, F - 0.52], [sx + 0.07 + st, F - 0.52], [sx + 0.07 + st, F - 0.04], [sx + 0.01 + st, F - 0.04]])
  oval(shoes, sx - 0.07 - st, F - 0.035, 0.06, 0.035)
  oval(shoes, sx + 0.01 + st, F - 0.035, 0.06, 0.035)
  piece(navy, [[sx - 0.13, F - 1.0 - bob], [sx + 0.12, F - 1.0 - bob], [sx + 0.14, F - 0.48], [sx - 0.15, F - 0.48]])
  // Her jacket, the blouse at its neck, her head, her hair in its knot and her little cap.
  piece(navy, up([[sx - 0.13, F - 0.98], [sx - 0.12, F - 1.5], [sx - 0.04, F - 1.56], [sx + 0.1, F - 1.54], [sx + 0.13, F - 0.98]]))
  piece(white, up([[sx - 0.12, F - 1.52], [sx - 0.05, F - 1.555], [sx - 0.09, F - 1.42]]))
  piece(skin, up([[sx - 0.05, F - 1.63], [sx + 0.01, F - 1.63], [sx + 0.01, F - 1.52], [sx - 0.05, F - 1.52]]))
  const [hx, hy] = turn([sx - 0.03, F - 1.7 - bob], hip, -0.38 * b)
  oval(skin, hx, hy, 0.08, 0.095)
  piece(skin, up([[sx - 0.1, F - 1.725], [sx - 0.13, F - 1.675], [sx - 0.1, F - 1.665]]))
  oval(hair, hx + 0.045, hy - 0.045, 0.06, 0.06)
  const knot = turn([sx + 0.08, F - 1.69 - bob], hip, -0.38 * b)
  disc(hair, knot[0], knot[1], 0.04)
  piece(navy, up([[sx - 0.08, F - 1.775], [sx + 0.07, F - 1.8], [sx + 0.05, F - 1.85], [sx - 0.06, F - 1.84]]))
  // Her arm down, her hands together before her.
  const shoulder = turn([sx, F - 1.5 - bob], hip, -0.38 * b)
  const elbow = turn([sx - 0.02, F - 1.17 - bob], hip, -0.25 * b)
  const hands: Pt = turn([sx - 0.12, F - 1.06 - bob], hip, -0.15 * b)
  const sleeve = bag()
  piece(sleeve, [[shoulder[0] - 0.04, shoulder[1]], [shoulder[0] + 0.05, shoulder[1]], [elbow[0] + 0.04, elbow[1]], [elbow[0] - 0.04, elbow[1]]])
  piece(sleeve, [[elbow[0] - 0.04, elbow[1] - 0.02], [elbow[0] + 0.04, elbow[1] + 0.02], [hands[0] + 0.02, hands[1] + 0.03], [hands[0] - 0.01, hands[1] - 0.03]])
  // The blouse's cuff at her wrist.
  const cuff: Pt = [hands[0] + (elbow[0] - hands[0]) * 0.2, hands[1] + (elbow[1] - hands[1]) * 0.2]
  disc(white, cuff[0], cuff[1], 0.026)
  disc(skin, hands[0], hands[1], 0.032)
  fill(pen, legs, STOCKING, 1)
  fill(pen, shoes, SHOE, 1)
  fill(pen, navy, NAVY, 1)
  fill(pen, sleeve, SLEEVE, 1)
  fill(pen, white, BLOUSE, 1)
  fill(pen, skin, SKIN, 1)
  fill(pen, hair, HAIR, 1)
}
