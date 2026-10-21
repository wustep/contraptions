import { poly, rgba, rrect, type C2 } from '../sky/paint'

/**
 * The fishing boat (B3's): a small Greenland trawler, stern left, in its own cells from `x0` (the transom) at the
 * water's level `w`. The sky sees it from the air, above the water only; the sea sees its hull from under it too, and
 * its deck close. Drawn, never a ball, and nothing red on it.
 */
export const BOAT = {
  len: 6.8,
  /** The deck's front edge, its back edge (the deck is seen a little from above), and the rail. */
  deck: -0.65,
  deckBack: -0.98,
  rail: -1.22,
  /** How deep the keel goes. */
  draft: 0.62,
  house: { x0: 3.3, x1: 5.3, top: -2.45 },
  /** The hatch in the deck in front of the house: its ends, and the top of its coaming's front (what hides a man in it). */
  hatch: { x0: 4.15, x1: 5.3, rim: -0.92 },
  mast: { x: 4.9, top: -3.9 },
  /** The davit at the stern: its post, and the boom's tip (out over the water, and swung in over the deck). */
  post: { x: 0.85, top: -2.75 },
  reach: 1.1,
}

export const HULL = '#2B4752'
export const HULL_LO = '#1C3139'
const BAND = '#DDE0DA'
const HOUSE = '#E4E6E1'
const HOUSE_SHADE = '#B9C0BF'
const WINDOW = '#27353C'
const DECK = '#8D877A'
const DECK_BACK = '#77726A'
const RAIL = '#3A474C'
const RUST = '#6E5B48'

/** The boat above the water: hull side, deck, wheelhouse, mast, the stern davit. `swing` 0..1 takes the boom from out over the stern to in over the deck. */
export function drawBoatAbove(g: C2, k: number, x0: number, w: number, swing: number, wet = 0, t = 0): void {
  const { len, deck, deckBack, rail, house, mast, post } = BOAT
  const D = w + deck
  const DB = w + deckBack
  // The deck, seen a little from above, behind its front edge.
  poly(g, k, [
    [x0 + 0.05, D],
    [x0 + len - 0.25, D],
    [x0 + len - 0.55, DB],
    [x0 + 0.2, DB],
  ])
  g.fillStyle = DECK
  g.fill()
  g.fillStyle = DECK_BACK
  g.fillRect((x0 + 0.2) * k, (DB - 0.02) * k, (len - 0.75) * k, 0.07 * k)
  // Planks.
  g.strokeStyle = rgba('#5F5A50', 0.35)
  g.lineWidth = Math.max(0.6, 0.012 * k)
  for (let i = 1; i < 4; i++) {
    const y = D + (DB - D) * (i / 4)
    g.beginPath()
    g.moveTo((x0 + 0.1) * k, y * k)
    g.lineTo((x0 + len - 0.4) * k, y * k)
    g.stroke()
  }
  if (wet > 0.001) {
    g.fillStyle = rgba('#4E4A42', 0.22 * wet)
    g.beginPath()
    g.ellipse((x0 + 2.05) * k, (D - 0.13) * k, 0.42 * wet * k, 0.07 * wet * k, 0, 0, Math.PI * 2)
    g.fill()
  }
  // The far rail along the deck's back edge.
  g.strokeStyle = RAIL
  g.lineWidth = Math.max(1, 0.035 * k)
  g.beginPath()
  g.moveTo((x0 + 0.2) * k, (w + rail) * k)
  g.lineTo((x0 + len - 0.7) * k, (w + rail) * k)
  g.stroke()
  g.lineWidth = Math.max(0.8, 0.022 * k)
  for (let x = x0 + 0.25; x < x0 + len - 0.6; x += 0.55) {
    g.beginPath()
    g.moveTo(x * k, DB * k)
    g.lineTo(x * k, (w + rail) * k)
    g.stroke()
  }
  // The wheelhouse, on the deck's back half, its windows dark.
  rrect(g, k, x0 + house.x0, w + house.top, x0 + house.x1, DB + 0.04, 0.08)
  g.fillStyle = HOUSE
  g.fill()
  g.fillStyle = HOUSE_SHADE
  g.fillRect((x0 + house.x0) * k, (DB - 0.18) * k, (house.x1 - house.x0) * k, 0.22 * k)
  for (let i = 0; i < 3; i++) {
    const wx = x0 + house.x0 + 0.22 + i * 0.6
    rrect(g, k, wx, w + house.top + 0.28, wx + 0.42, w + house.top + 0.68, 0.04)
    g.fillStyle = WINDOW
    g.fill()
  }
  g.fillStyle = '#2E3A40'
  g.fillRect((x0 + house.x0 - 0.08) * k, (w + house.top - 0.08) * k, (house.x1 - house.x0 + 0.16) * k, 0.1 * k)
  // The mast and its stay.
  g.strokeStyle = RAIL
  g.lineWidth = Math.max(1, 0.05 * k)
  g.beginPath()
  g.moveTo((x0 + mast.x) * k, (w + house.top) * k)
  g.lineTo((x0 + mast.x) * k, (w + mast.top) * k)
  g.stroke()
  g.lineWidth = Math.max(0.6, 0.015 * k)
  g.beginPath()
  g.moveTo((x0 + mast.x) * k, (w + mast.top + 0.1) * k)
  g.lineTo((x0 + len - 0.3) * k, D * k)
  g.moveTo((x0 + mast.x) * k, (w + mast.top + 0.1) * k)
  g.lineTo((x0 + house.x0 - 0.4) * k, DB * k)
  g.stroke()
  g.lineWidth = Math.max(0.8, 0.03 * k)
  g.beginPath()
  g.moveTo((x0 + mast.x - 0.35) * k, (w + mast.top + 0.55) * k)
  g.lineTo((x0 + mast.x + 0.35) * k, (w + mast.top + 0.55) * k)
  g.stroke()
  // The davit at the stern: a post, and a boom that swings from out over the water to in over the deck.
  g.strokeStyle = '#47535A'
  g.lineWidth = Math.max(1, 0.06 * k)
  g.beginPath()
  g.moveTo((x0 + post.x) * k, DB * k)
  g.lineTo((x0 + post.x) * k, (w + post.top) * k)
  const tip = boomTip(x0, w, swing)
  g.lineTo(tip[0] * k, tip[1] * k)
  g.stroke()
  // The hull's side, above the water: dark, a pale band under the gunwale, a little rust at the waterline.
  g.fillStyle = HULL
  g.beginPath()
  g.moveTo(x0 * k, (D - 0.04) * k)
  g.lineTo((x0 + len - 0.25) * k, (D - 0.04) * k)
  g.lineTo((x0 + len + 0.35) * k, (D - 0.2) * k)
  g.lineTo((x0 + len + 0.35) * k, (w + 0.02) * k)
  g.lineTo((x0 + 0.02) * k, (w + 0.02) * k)
  g.closePath()
  g.fill()
  g.fillStyle = BAND
  g.beginPath()
  g.moveTo(x0 * k, (D - 0.04) * k)
  g.lineTo((x0 + len - 0.25) * k, (D - 0.04) * k)
  g.lineTo((x0 + len + 0.35) * k, (D - 0.2) * k)
  g.lineTo((x0 + len + 0.35) * k, (D - 0.11) * k)
  g.lineTo((x0 + len - 0.25) * k, (D + 0.06) * k)
  g.lineTo(x0 * k, (D + 0.06) * k)
  g.closePath()
  g.fill()
  g.fillStyle = rgba(RUST, 0.55)
  g.fillRect((x0 + 0.02) * k, (w - 0.07) * k, (len + 0.3) * k, 0.07 * k)
  g.fillStyle = rgba(HULL_LO, 0.9)
  g.fillRect(x0 * k, (D - 0.04) * k, 0.06 * k, (w - D + 0.06) * k)
  hullDetail(g, k, x0, w)
  houseDetail(g, k, x0, w, t)
  hatch(g, k, x0, w)
}

/** The hatch in the deck before the house, its cover off: a low coaming, and the dark below it. */
function hatch(g: C2, k: number, x0: number, w: number): void {
  const { hatch: h, deckBack } = BOAT
  const DB = w + deckBack
  const rim = w + h.rim
  const a = x0 + h.x0
  const b = x0 + h.x1
  g.fillStyle = '#1E282C'
  g.fillRect(a * k, (DB - 0.04) * k, (b - a) * k, (rim - DB + 0.04) * k)
  g.fillStyle = HOUSE_SHADE
  g.fillRect(a * k, rim * k, (b - a) * k, (DB + 0.15 - rim) * k)
  g.strokeStyle = RAIL
  g.lineWidth = Math.max(0.6, 0.015 * k)
  g.beginPath()
  g.moveTo(a * k, rim * k)
  g.lineTo(b * k, rim * k)
  g.stroke()
}

/** The hull side's own: its scuppers along the deck, and old tyres hung on the rail for fenders. */
function hullDetail(g: C2, k: number, x0: number, w: number): void {
  const { deck } = BOAT
  const D = w + deck
  const holes = new Path2D()
  for (let i = 0; i < 5; i++) {
    const sx = x0 + 0.7 + i * 1.25
    holes.rect((sx - 0.06) * k, (D + 0.08) * k, 0.12 * k, 0.04 * k)
  }
  g.fillStyle = HULL_LO
  g.fill(holes)
  // Tyres on short ropes over the side.
  const tyres = new Path2D()
  for (const tx of [x0 + 1.9, x0 + 4.4]) {
    const ty = D + 0.24
    tyres.moveTo((tx + 0.13) * k, ty * k)
    tyres.ellipse(tx * k, ty * k, 0.13 * k, 0.16 * k, 0, 0, Math.PI * 2)
    tyres.moveTo((tx + 0.06) * k, ty * k)
    tyres.ellipse(tx * k, ty * k, 0.06 * k, 0.08 * k, 0, 0, Math.PI * 2, true)
  }
  g.fillStyle = '#1A2124'
  g.fill(tyres)
}

/** The wheelhouse's own: a porthole in its door, a life ring on its side, and the radar on its roof turning. */
function houseDetail(g: C2, k: number, x0: number, w: number, t: number): void {
  const { house, deckBack } = BOAT
  const DB = w + deckBack
  const hx = x0 + house.x0
  // The door at the house's after end, its porthole.
  g.fillStyle = '#C9CFCD'
  g.fillRect((hx - 0.02) * k, (w + house.top + 0.85) * k, 0.02 * k, (DB - w - house.top - 0.85) * k)
  g.strokeStyle = WINDOW
  g.lineWidth = Math.max(0.8, 0.02 * k)
  g.beginPath()
  g.arc((hx + house.x1 - house.x0 - 0.3) * k, (w + house.top + 1.05) * k, 0.1 * k, 0, Math.PI * 2)
  g.stroke()
  // A life ring on the house's side, white and the sea's teal.
  const rx = hx + 1.05
  const ry = w + house.top + 1.1
  g.fillStyle = '#E8E9E4'
  g.beginPath()
  g.arc(rx * k, ry * k, 0.16 * k, 0, Math.PI * 2)
  g.arc(rx * k, ry * k, 0.08 * k, 0, Math.PI * 2, true)
  g.fill('evenodd')
  g.fillStyle = '#3F7F80'
  for (let q = 0; q < 4; q++) {
    const a0 = q * (Math.PI / 2) + 0.4
    g.beginPath()
    g.arc(rx * k, ry * k, 0.16 * k, a0, a0 + 0.45)
    g.arc(rx * k, ry * k, 0.08 * k, a0 + 0.45, a0, true)
    g.closePath()
    g.fill()
  }
  // Its edges, so it reads against the white house.
  g.strokeStyle = '#8E9897'
  g.lineWidth = Math.max(0.6, 0.012 * k)
  g.beginPath()
  g.arc(rx * k, ry * k, 0.16 * k, 0, Math.PI * 2)
  g.moveTo((rx + 0.08) * k, ry * k)
  g.arc(rx * k, ry * k, 0.08 * k, 0, Math.PI * 2)
  g.stroke()
  // The radar on the roof: a bar turning on its post, seen from the side as it comes round.
  const rdx = hx + 0.55
  const rdy = w + house.top - 0.12
  const turn = Math.cos(t * 3.1)
  g.fillStyle = RAIL
  g.fillRect((rdx - 0.025) * k, rdy * k, 0.05 * k, 0.12 * k)
  g.fillRect((rdx - 0.3 * turn - 0.02) * k, (rdy - 0.05) * k, (0.6 * Math.abs(turn) + 0.04) * k, 0.05 * k)
}

/** Where the davit's boom tip is: out over the stern (swing 0) to in over the deck (1). */
export function boomTip(x0: number, w: number, swing: number): [number, number] {
  const { post, reach } = BOAT
  const a = Math.PI * Math.max(0, Math.min(1, swing))
  // The boom turns about the post; seen from the side its tip goes from behind the stern, round, to over the deck.
  return [x0 + post.x - reach * Math.cos(a), w + post.top - 0.12 - 0.08 * Math.sin(a)]
}
