import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { alpha, frame, type Ctx } from '../kit'
import { HALL } from '../worlds'
import {
  CHART_H,
  CHART_W,
  FLING,
  GO_BACK,
  LANDS,
  MEET,
  STAND,
  chartAt,
  deskRock,
  doorAngle,
  stageLight,
  standSink,
  veil,
} from './sabotage-motion'
import { DOOR, FLOOR, LIP } from './stage'

/**
 * What the sabotage draws round the hall (`hall.ts` draws the hall itself), besides its stand and Fletcher (those
 * are `sabotage.ts`'s own): the two charts (Andrew's own page on his desk, and Fletcher's card in his hand, in the
 * air and landing over it), the stage door that Jim opens, and the road's darkness lifting off the hall after the
 * match cut. Every function draws from show time `T`.
 *
 * The stage draws with `rectMode(CENTER)` (`engine.ts`); these props are laid out by their corners, so each sets
 * `CORNER` inside its own push/pop. Fletcher's rig is left in the stage's mode, so that it looks exactly as the hall
 * draws it from the solo's first stroke on.
 */

/* ------------------------------------------------------------------ the two charts */

/*
 * Two different objects, so "switched" reads before he tries to play. His own part stands on his desk from the wake,
 * a cream page lit like every page on the band's stands. Fletcher's is not a page at all but a part in a heavy
 * oxblood card cover, flat and dark, only a sliver of its pages showing at its open edges. It lands square over his,
 * and the slap knocks his page askew and half off the desk, toward the kit, where it hangs.
 */

/** Fletcher's card, a little larger than the page `sabotage.ts` still rules on the desk under it (it hides it whole). */
const CARD_W = CHART_W + 0.04
const CARD_H = CHART_H + 0.02
/** How much of the pages inside shows past the cover's open edges (right and bottom). */
const SLIVER = 0.028

/**
 * Fletcher's chart, centred on (0, 0) in whatever frame it is drawn in (his hand, the air, the desk): the pages'
 * sliver, the cover over it, a darker spine down its bound edge, a lit top edge. No marks on it.
 */
function card(p: p5, c: Ctx, light: number): void {
  const { k, weight } = c
  const ink = '#050404'
  const x0 = -CARD_W / 2
  const y0 = -CARD_H / 2
  const cover = mixHex(mixHex(HALL.velvet, HALL.black, 0.35), HALL.velvet, 0.25 + 0.75 * light)
  // The pages inside, peeking past the open edges (a shade under the band's lit pages: they are in the cover's shade).
  solid(p, ink, weight * 0.6, mixHex(HALL.deep, HALL.beam, 0.15 + 0.5 * light))
  p.rect((x0 + SLIVER) * k, (y0 + SLIVER) * k, (CARD_W - SLIVER * 0.4) * k, (CARD_H - SLIVER * 0.4) * k, 0.006 * k)
  // The cover: heavy board, a heavier edge than any page.
  solid(p, ink, weight * 0.95, cover)
  p.rect(x0 * k, y0 * k, (CARD_W - SLIVER) * k, (CARD_H - SLIVER) * k, 0.014 * k)
  p.noStroke()
  // The spine, darker, down the bound (left) edge.
  p.fill(mixHex(cover, HALL.black, 0.5))
  p.rect((x0 + 0.012) * k, (y0 + 0.012) * k, 0.055 * k, (CARD_H - SLIVER - 0.024) * k, 0.008 * k)
  // The top edge catching the stage light.
  p.fill(alpha(p, HALL.gold, 0.1 + 0.35 * light))
  p.rect((x0 + 0.075) * k, (y0 + 0.012) * k, (CARD_W - SLIVER - 0.09) * k, 0.022 * k, 0.008 * k)
}

/** Fletcher's chart where `sabotage.ts` puts it (his hand, the air): the card, centred at `at`, turned `turn`. */
export function drawChart(p: p5, c: Ctx, at: Pt, turn: number, light = 1): void {
  p.push()
  p.rectMode(p.CORNER)
  p.translate(at[0] * c.k, at[1] * c.k)
  p.rotate(turn)
  card(p, c, light)
  p.pop()
}

/**
 * The stand's desk as `sabotage.ts` draws it (kept in step with it by hand): turned toward the kit and leaning back.
 * A point on the desk (`u` across from its middle, `v` up from its hinge, negative) in the desk's frame at the hinge.
 */
const DESK = { a: 0.46, b: 0.08, c: -0.34, d: 0.93 }
const onDesk = (u: number, v: number): Pt => [DESK.a * u + DESK.c * v, DESK.b * u + DESK.d * v]
const DESK_BOTTOM = STAND.deskY + STAND.deskH / 2
/** Where the thrown chart's middle comes to rest on the desk (the desk at rest): the part's own `CHART_REST`. */
const CHART_REST: Pt = (() => {
  const [x, y] = onDesk(0, -0.05 - CHART_H / 2)
  return [STAND.x + x, DESK_BOTTOM + y]
})()
/** The ledge the pages stand on (its top at v -0.05), and the desk's own left edge. */
const LEDGE = -0.05
const DESK_LEFT = -STAND.deskW / 2

/** His own page: a band page, a hair narrower than the desk. */
const PAGE_W = 0.48
const PAGE_H = 0.5

/** Four desk points as a quad, in pixels. */
function deskQuad(p: p5, k: number, q: Pt[]): void {
  p.quad(q[0][0] * k, q[0][1] * k, q[1][0] * k, q[1][1] * k, q[2][0] * k, q[2][1] * k, q[3][0] * k, q[3][1] * k)
}

/**
 * The slap: how far his page has slid across the desk toward the kit, and how far it has tipped over the desk's left
 * corner. A sharp start on the landing, then a long damped settle; the tip lags the slide (it tips once it is over
 * the edge) and ends hanging there.
 */
function knocked(T: number): { slide: number; tip: number } {
  const s = T - LANDS
  if (s <= 0) return { slide: 0, tip: 0 }
  const slide = 0.37 * (1 - Math.exp(-s / 0.13))
  const late = Math.max(0, s - 0.05)
  const tip = 0.42 * (1 - Math.exp(-late / 0.22)) ** 2
  return { slide, tip }
}

/**
 * His own page on the desk (the desk's frame): a lit cream band page, four faint staves ruled across it, no marks.
 * Knocked, it slides left and tips about the desk's left corner, its far half hanging off.
 */
function ownPage(p: p5, c: Ctx, T: number, light: number): void {
  const { k, weight } = c
  const ink = '#050404'
  const { slide, tip } = knocked(T)
  const paper = mixHex(HALL.deep, HALL.beam, 0.2 + 0.6 * light)
  // A point on the page (`x` across from its middle, `y` up from its foot, negative) where the desk puts it now.
  const pivot: Pt = [DESK_LEFT, LEDGE]
  const cos = Math.cos(-tip)
  const sin = Math.sin(-tip)
  const at = (x: number, y: number): Pt => {
    const u = x - slide - pivot[0]
    const v = y + LEDGE - pivot[1]
    return onDesk(pivot[0] + u * cos - v * sin, pivot[1] + u * sin + v * cos)
  }
  const x0 = -PAGE_W / 2
  const x1 = PAGE_W / 2
  solid(p, ink, weight * 0.5, paper)
  deskQuad(p, k, [at(x0, -PAGE_H), at(x1, -PAGE_H), at(x1, 0), at(x0, 0)])
  p.stroke(mixHex(paper, HALL.black, 0.45))
  p.strokeWeight(Math.max(0.6, weight * 0.4))
  for (let staff = 0; staff < 4; staff++) {
    const ys = -PAGE_H + 0.08 + staff * 0.105
    for (let line = 0; line < 4; line++) {
      const a = at(x0 + 0.045, ys + line * 0.014)
      const b = at(x1 - 0.045, ys + line * 0.014)
      p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
    }
  }
}

/**
 * What lies on Andrew's desk, laid over the stand `sabotage.ts` draws (in its exact frame: the sway, the knock, the
 * sink into the trap): his own page from the wake, and from the landing Fletcher's card square over it (hiding the
 * page the part still rules there), then the lit ledge again over the pages' feet.
 */
function drawDeskPages(p: p5, c: Ctx, T: number): void {
  const sink = standSink(T)
  if (sink > 3.6) return
  const { k, weight } = c
  const rock = deskRock(T)
  const light = stageLight(T)
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // Below the stage floor is under the stage (as the stand is clipped).
  ctx.beginPath()
  ctx.rect(-40 * k, -40 * k, 80 * k, (FLOOR + 40) * k)
  ctx.clip()
  p.translate(STAND.x * k, (FLOOR + sink) * k)
  p.rotate(rock.stand)
  p.translate(0, (DESK_BOTTOM - FLOOR) * k)
  p.rotate(rock.desk)
  ownPage(p, c, T, light)
  if (T >= LANDS) {
    // The card, lying square where the throw put it (the throw ends in exactly this frame).
    p.push()
    p.rectMode(p.CORNER)
    const mid = onDesk(0, LEDGE - CHART_H / 2)
    p.applyMatrix(DESK.a, DESK.b, DESK.c, DESK.d, mid[0] * k, mid[1] * k)
    card(p, c, light)
    p.pop()
  }
  // The ledge (as the stand draws it) over the pages' feet.
  const W = STAND.deskW / 2
  solid(p, '#050404', weight * 0.7, mixHex(HALL.floor, HALL.beam, 0.2 + 0.3 * light))
  deskQuad(p, k, [onDesk(-W - 0.03, LEDGE), onDesk(W + 0.03, LEDGE), onDesk(W + 0.03, 0.02), onDesk(-W - 0.03, 0.02)])
  ctx.restore()
  p.pop()
}

/**
 * The card in the air, drawn again over his page (the part draws it first, under the desk's pages): the part's own
 * throw, step for step (`sabotage.ts` `drawThrown`), so the two draw as one.
 */
function drawFlying(p: p5, c: Ctx, T: number): void {
  if (T < FLING || T >= LANDS) return
  const from = chartAt(FLING)
  const u = clamp((T - FLING) / (LANDS - FLING))
  const arc = (9 * (LANDS - FLING) ** 2) / 8
  const x = from.at[0] + (CHART_REST[0] - from.at[0]) * u
  const y = from.at[1] + (CHART_REST[1] - from.at[1]) * u - arc * 4 * u * (1 - u)
  const turn = from.turn + (-2 * Math.PI - from.turn) * easeInOutSine(u)
  const e = easeInOutSine(u)
  const tumble = Math.max(0.12, Math.abs(Math.cos(Math.PI * e)))
  p.push()
  p.translate(x * c.k, y * c.k)
  p.applyMatrix(tumble * (1 + (DESK.a - 1) * e), DESK.b * e, DESK.c * e, 1 + (DESK.d - 1) * e, 0, 0)
  drawChart(p, c, [0, 0], turn, stageLight(T))
  p.pop()
}

/* ------------------------------------------------------------------ the stand */

/* ------------------------------------------------------------------ the stage door */

const DOOR_X0 = DOOR.x - DOOR.w / 2
const DOOR_TOP = FLOOR - DOOR.h

/** The door's leaf at `angle`, as four corners (hinge top, free top, free bottom, hinge bottom): it narrows and its free edge shortens as it swings away. */
function leaf(angle: number): [Pt, Pt, Pt, Pt] {
  const xf = DOOR_X0 + DOOR.w * Math.cos(angle)
  const s = Math.sin(angle)
  return [
    [DOOR_X0, DOOR_TOP],
    [xf, DOOR_TOP + DOOR.h * 0.07 * s],
    [xf, FLOOR - DOOR.h * 0.025 * s],
    [DOOR_X0, FLOOR],
  ]
}
/** A point on the leaf: `u` across from the hinge, `v` down from the top. */
function onLeaf(q: [Pt, Pt, Pt, Pt], u: number, v: number): Pt {
  const top: Pt = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u]
  const bot: Pt = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u]
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v]
}

/**
 * Behind the stage door (drawn under the balls): the lit corridor in the doorway, and its light thrown out across the
 * stage floor. Only while the door is open; the leaf (`drawDoorLeaf`, over the balls) covers the rest.
 */
export function drawDoorway(p: p5, c: Ctx, T: number): void {
  const angle = doorAngle(T)
  if (angle <= 0.001) return
  const { k, weight } = c
  const ink = '#050404'
  // Open, and brighter as the band's held chord swells behind the two of them.
  const sw = swell(T)
  const open = clamp(angle / 0.9) * (0.85 + 0.25 * sw)
  const x0 = DOOR_X0
  const x1 = DOOR_X0 + DOOR.w
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // The corridor's far wall, warm in its lamps, and its floor catching the light.
  p.fill(mixHex(HALL.deep, HALL.gold, 0.08 + 0.2 * open))
  p.rect(x0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
  p.fill(mixHex(HALL.deep, HALL.gold, 0.14 + 0.32 * open))
  p.rect(x0 * k, (FLOOR - 0.34) * k, DOOR.w * k, 0.34 * k)
  // Where the corridor turns away: the side wall in shadow.
  p.fill(mixHex(HALL.deep, HALL.gold, 0.05 + 0.1 * open))
  p.quad((x1 - 0.42) * k, DOOR_TOP * k, x1 * k, DOOR_TOP * k, x1 * k, FLOOR * k, (x1 - 0.42) * k, (FLOOR - 0.34) * k)
  // The door's frame round it all.
  solid(p, ink, weight * 0.8, HALL.black)
  p.noFill()
  p.rect(x0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
  // The light: down the corridor from above, and out through the door onto the stage floor.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const down = ctx.createLinearGradient(0, DOOR_TOP * k, 0, FLOOR * k)
  down.addColorStop(0, 'rgba(227, 176, 91, 0)')
  down.addColorStop(1, `rgba(227, 176, 91, ${(0.22 * open).toFixed(3)})`)
  ctx.fillStyle = down
  ctx.fillRect(x0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
  // The light in the air before the door, rising and widening behind the two of them as the chord swells: a tall
  // soft oval, its middle on the threshold, no core (it is the room's light, not a thing).
  if (sw > 0.001) {
    const cx = (x0 + x1) / 2
    // Narrow enough to die out before the piano (its left end at -7.7), which stands in front of this light.
    const rx = DOOR.w / 2 + 0.45 + 0.35 * sw
    const ry = 1.2 + 0.9 * sw
    ctx.save()
    ctx.translate(cx * k, FLOOR * k)
    ctx.scale(rx / ry, 1)
    const air = ctx.createRadialGradient(0, 0, 0, 0, 0, ry * k)
    air.addColorStop(0, `rgba(227, 176, 91, ${(0.13 * sw).toFixed(3)})`)
    air.addColorStop(0.55, `rgba(227, 176, 91, ${(0.06 * sw).toFixed(3)})`)
    air.addColorStop(1, 'rgba(227, 176, 91, 0)')
    ctx.fillStyle = air
    ctx.fillRect(-ry * k, -ry * k, 2 * ry * k, ry * k)
    ctx.restore()
  }
  // Out through the door onto the stage floor, wider and warmer as the chord swells.
  const spill = ctx.createLinearGradient(0, FLOOR * k, 0, LIP * k)
  spill.addColorStop(0, `rgba(227, 176, 91, ${(0.3 * open + 0.14 * sw).toFixed(3)})`)
  spill.addColorStop(1, 'rgba(227, 176, 91, 0)')
  ctx.fillStyle = spill
  ctx.beginPath()
  ctx.moveTo(x0 * k, FLOOR * k)
  ctx.lineTo(x1 * k, FLOOR * k)
  ctx.lineTo((x1 + 1.1 + 1.3 * sw) * k, LIP * k)
  ctx.lineTo((x0 - 0.5 - 0.8 * sw) * k, LIP * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  p.pop()
}

/**
 * How far the band's held chord has swelled the door's light, 0..1: up with the chord from the moment they meet,
 * held at its height, and down as he turns back for the stage (`GO_BACK`), so the light leaves with him.
 */
function swell(T: number): number {
  return easeInOutSine(clamp((T - MEET) / 3.6)) * (1 - easeInOutSine(clamp((T - GO_BACK) / 0.8)))
}

/**
 * The stage door's leaf, over the balls (Jim waits behind it until it opens). Shut, it is exactly the hall's door;
 * open, it narrows toward its hinge and its window goes dark.
 */
export function drawDoorLeaf(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const ink = '#050404'
  const angle = doorAngle(T)
  const face = mixHex(mixHex(c.bg, HALL.deep, 0.8), HALL.black, 0.6 * Math.sin(angle))
  p.push()
  p.rectMode(p.CORNER)
  solid(p, ink, weight * 0.8, face)
  if (angle <= 0.001) {
    p.rect(DOOR_X0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
    p.noStroke()
    p.fill(alpha(p, HALL.gold, 0.5))
    p.rect((DOOR.x - 0.25) * k, (DOOR_TOP + 0.7) * k, 0.5 * k, 0.7 * k, 0.05 * k)
  } else {
    const q = leaf(angle)
    p.quad(q[0][0] * k, q[0][1] * k, q[1][0] * k, q[1][1] * k, q[2][0] * k, q[2][1] * k, q[3][0] * k, q[3][1] * k)
    // The window, turning with the leaf, no longer lit from behind.
    const u0 = (DOOR.w / 2 - 0.25) / DOOR.w
    const u1 = (DOOR.w / 2 + 0.25) / DOOR.w
    const v0 = 0.7 / DOOR.h
    const v1 = 1.4 / DOOR.h
    const w = [onLeaf(q, u0, v0), onLeaf(q, u1, v0), onLeaf(q, u1, v1), onLeaf(q, u0, v1)]
    p.noStroke()
    p.fill(alpha(p, HALL.gold, 0.5 * (1 - clamp(angle / 0.7))))
    p.quad(w[0][0] * k, w[0][1] * k, w[1][0] * k, w[1][1] * k, w[2][0] * k, w[2][1] * k, w[3][0] * k, w[3][1] * k)
  }
  // Under the road's darkness, like everything else, just after the cut.
  const v = veil(T)
  if (v > 0.001) {
    p.noStroke()
    p.fill(alpha(p, c.bg, v))
    p.rect((DOOR_X0 - 0.1) * k, (DOOR_TOP - 0.1) * k, (DOOR.w + 0.2) * k, (DOOR.h + 0.2) * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the dark */

/**
 * The last of the part's own drawing (`sabotage.ts` calls it after the stand and Fletcher): the two charts on
 * Andrew's desk and the one in the air, over the stand; then the road's darkness over the whole frame, lifting as
 * the hall's lights come up.
 */
export function drawVeil(p: p5, c: Ctx, T: number): void {
  drawDeskPages(p, c, T)
  drawFlying(p, c, T)
  const v = veil(T)
  if (v <= 0.001) return
  const f = frame(p, c.k)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, c.bg, v))
  p.rect(f.x0 * c.k, f.y0 * c.k, (f.x1 - f.x0) * c.k, (f.y1 - f.y0) * c.k)
  p.pop()
}
