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

/** The hull below the water: a dark shape against the light, seen from under it. */
export function drawHullUnder(g: C2, k: number, x0: number, w: number, fill: string): void {
  const { len, draft } = BOAT
  g.fillStyle = fill
  g.beginPath()
  g.moveTo((x0 + 0.02) * k, (w - 0.02) * k)
  g.lineTo((x0 + len + 0.35) * k, (w - 0.02) * k)
  g.bezierCurveTo((x0 + len) * k, (w + 0.25) * k, (x0 + len - 1.2) * k, (w + draft) * k, (x0 + len - 2.2) * k, (w + draft) * k)
  g.lineTo((x0 + 1.4) * k, (w + draft) * k)
  g.bezierCurveTo((x0 + 0.6) * k, (w + draft) * k, (x0 + 0.1) * k, (w + 0.35) * k, (x0 + 0.02) * k, (w - 0.02) * k)
  g.closePath()
  g.fill()
  // The rudder and the propeller's shaft: the little that tells a stern from a bow.
  g.fillRect((x0 + 0.18) * k, (w + 0.3) * k, 0.1 * k, 0.42 * k)
  g.beginPath()
  g.ellipse((x0 + 0.45) * k, (w + 0.5) * k, 0.06 * k, 0.17 * k, 0, 0, Math.PI * 2)
  g.fill()
}

/** The boat above the water: hull side, deck, wheelhouse, mast, the stern davit. `swing` 0..1 takes the boom from out over the stern to in over the deck. */
export function drawBoatAbove(g: C2, k: number, x0: number, w: number, swing: number, wet = 0): void {
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
}

/** Where the davit's boom tip is: out over the stern (swing 0) to in over the deck (1). */
export function boomTip(x0: number, w: number, swing: number): [number, number] {
  const { post, reach } = BOAT
  const a = Math.PI * Math.max(0, Math.min(1, swing))
  // The boom turns about the post; seen from the side its tip goes from behind the stern, round, to over the deck.
  return [x0 + post.x - reach * Math.cos(a), w + post.top - 0.12 - 0.08 * Math.sin(a)]
}
