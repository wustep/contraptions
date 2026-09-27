import type p5 from 'p5'
import { R, mixHex, type Pt, type Seg } from '../../../../../parts'
import { OPEN } from '../hall/hall-clock'
import { alpha, box, part, type Ctx, type PartShot, type Slot } from '../kit'
import { flicker, glow } from '../lantern'
import { RUIN, ruinLight } from '../music'
import { quake } from '../rock'
import { SEAM_SHOT } from '../seams'
import type { Pen } from '../troll'
import { LAMP, STONE } from '../worlds'
import {
  BEGIN, BRAKE, CRASH, END, EXIT, FIRST_CLACK, FLOOR_Y, LAND, LUNGES, MINE_STRIKES, ONTO, PEER_CART, PEER_EVENTS, RAIL, SHAFT, STOP, TORCHES, TRIP,
  TROLL_CART, WIDE, binTip, type TrollAct, ease, jolt, lightAt, peerAt, peerCartX, torchLit, trollAct, trollCart, trollS,
} from './mine-clock'
import { drawOreCart, drawTrollCart } from './mine-cart'
import {
  drawBuffer, drawChock, drawLever, drawMainLine, drawRooms, drawSiding, drawSparks, drawSpill, drawSwitch, drawTimbers, drawTorches,
} from './mine-set'

/**
 * The mine, 74.422 → 89.232 (phrases 8 and 9, the theme a fifth up, B B; the accelerando: the quarter note from
 * 0.49 to 0.44 s): the carts, the theme's third and larger playing. Laid mirrored, so in the world it runs back west
 * under the hall.
 *
 * He drops through the hall's floor onto the ore heaped in a cart at the end of a low tunnel; the chock jumps out
 * and the cart rolls. Up the tunnel behind him two troll miners asleep in their cart wake, knock their brake off and
 * come after him. Out in the stope his wheels click over a rail joint on every note of the theme (the joints are laid
 * where the notes fall: the rail is the tune), a spark flies off the loud ones, and each torch on the timbering catches
 * from a spark as he passes, so the mine lights up behind him in time. The trolls gain, the lead lunging for him on
 * the accents; on phrase 9 the frame pulls back over the whole stope; his wheel knocks over the switch lever, and the
 * blade it lifts behind him sends the trolls up the catch siding into its buffer. On the last bar his cart hits the
 * stop block at the shaft, the bin pitches him out, he bounces off its lip and falls straight down, 8 cells, on the
 * held note, onto the trolls' drum.
 *
 * The clock is `mine-clock.ts`, the carts `mine-cart.ts`, the stope `mine-set.ts`.
 */

interface MineState {
  begin: number
}

/** Every strike, show seconds: the landing, the trolls' brake, every clack, the lever, the blade, the buffer, the stop, the bounce. */
export const MINE_HITS: number[] = MINE_STRIKES

/*
 * Dark until the hatch opens. The mine lies under the hall's floor, and a tall frame (a phone held upright) sees down
 * into it through the whole court and the wake: until the hatch swings open under him it is solid rock to look at.
 * As he drops, the cover lifts from the trapdoor down, well ahead of him (he is still in the hatch when it is gone),
 * with a soft upper edge, as the heart's does.
 */
/** The trapdoor shaft's top: the underside of the hall's floor. */
const COVER_TOP = -7.4
/** Down to under the stope's floor (the rails' sleepers and the lever's foot sit on it). */
const COVER_BOTTOM = FLOOR_Y + 0.5
const COVER_FEATHER = 1.0
const LIFT = 0.4
/** The stope's roof, lowest point with its broken corners (`mine-set.ts` ROOF): the throat runs down to it. */
const ROOF_TOP = -3.8
/** The areas the cover spans, part frame: the throat under the hatch, the stope and its tunnel, the shaft to the drum. */
const COVERED: [number, number, number, number][] = [
  [-1.5, COVER_TOP, 0.5, ROOF_TOP],
  [-5.6, ROOF_TOP, 23.3, COVER_BOTTOM],
  [SHAFT[0] - 0.15, COVER_BOTTOM, SHAFT[1] + 0.15, 8.3],
]
const coverEdge = (T: number): number => COVER_TOP + (COVER_BOTTOM + COVER_FEATHER - COVER_TOP) * ease(T, OPEN, OPEN + LIFT)

function drawCover(p: p5, k: number, T: number): void {
  const edge = coverEdge(T)
  if (edge >= COVER_BOTTOM + COVER_FEATHER) return
  p.push()
  p.noStroke()
  p.rectMode(p.CORNER)
  // The shaft down to the drum is far off in the dark (20 cells from him): it goes with the stope's floor.
  for (const [x0, y0, x1, y1] of edge >= COVER_BOTTOM ? COVERED.slice(0, 2) : COVERED) {
    const top = Math.max(y0, edge)
    if (top < y1) {
      p.fill(STONE.deep)
      p.rect(x0 * k, top * k, (x1 - x0) * k, (y1 - top) * k)
    }
    // The upper edge is soft: a feather of bands over the cell above it, fading out upward.
    const n = 10
    for (let i = 0; i < n; i++) {
      const a = edge - COVER_FEATHER * (1 - i / n)
      const b = Math.min(y1, a + COVER_FEATHER / n)
      const aa = Math.max(y0, a)
      if (b <= aa) continue
      p.fill(alpha(p, STONE.deep, (i + 0.5) / n))
      p.rect(x0 * k, aa * k, (x1 - x0) * k, (b - aa) * k)
    }
  }
  p.pop()
}

/**
 * The trapdoor's shaft as a throat in the rock: rock-dark where it leaves the hall's floor, opening onto the tunnel's
 * back wall at its foot, so it never stands as a lighter block under the hatch. Laid over the hall's light down it
 * too: the light comes out of the dark throat onto his cart instead of lighting a box.
 */
function drawThroat(p: p5, c: Pen): void {
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bg = p.color(c.bg)
  const rgb = `${p.red(bg)},${p.green(bg)},${p.blue(bg)}`
  const g = ctx.createLinearGradient(0, COVER_TOP * k, 0, -0.95 * k)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.45, `rgba(${rgb},0.92)`)
  g.addColorStop(0.8, `rgba(${rgb},0.6)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(-1.45 * k, COVER_TOP * k, 1.9 * k, (-0.95 - COVER_TOP) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ light */

const rgbOf = (p: p5, hex: string): string => {
  const col = p.color(hex)
  return `${p.red(col)},${p.green(col)},${p.blue(col)}`
}
/** After the collapse's last blows the mine's lights go out with the torches (`torchLit`). */
const lightsOut = (T: number): number => (T > 147 ? Math.max(0, 1 - (T - 147) / 0.6) : 1)

/** Where the trapdoor's throat opens onto the tunnel's roof. */
const THROAT_FOOT = -1.05
/** The hall's firelight coming down the open hatch: on as the trapdoor swings open, dimmer once the hall is behind him. */
function hatchLit(T: number): number {
  return ease(T, OPEN + 0.02, OPEN + 0.4) * (1 - 0.55 * ease(T, BEGIN + 1, BEGIN + 4)) * lightsOut(T)
}

/**
 * The inside of the stope (as `mine-set.ts` ROOM draws it: the low tunnel, the chamber up to its broken roof), and
 * with `throat` the trapdoor's shaft: light falls on the rock face inside it and never on the solid rock round it.
 * Only the hatch's own light goes up the throat (the torches lighting its walls stood it up as a lit box).
 */
const ROOF_LINE: Pt[] = [
  [1.55, -1.12], [1.95, -2.0], [2.6, -2.75], [3.8, -3.05], [5.6, -3.2], [7.6, -3.35], [9.8, -3.15], [12.2, -3.45],
  [14.6, -3.2], [16.6, -3.3], [18.3, -3.05], [19.8, -2.9], [21.1, -2.7], [22.3, -2.55], [22.9, -2.3],
]
function clipRoom(ctx: CanvasRenderingContext2D, k: number, throat: boolean): void {
  ctx.beginPath()
  ctx.moveTo(-5.2 * k, (FLOOR_Y + 0.02) * k)
  ctx.lineTo(-5.2 * k, -1.02 * k)
  if (throat) {
    ctx.lineTo(-1.25 * k, THROAT_FOOT * k)
    ctx.lineTo(-1.25 * k, COVER_TOP * k)
    ctx.lineTo(0.25 * k, COVER_TOP * k)
    ctx.lineTo(0.25 * k, THROAT_FOOT * k)
  }
  for (const [x, y] of ROOF_LINE) ctx.lineTo(x * k, y * k)
  ctx.lineTo(22.9 * k, (FLOOR_Y + 0.02) * k)
  ctx.closePath()
  ctx.clip()
}

/** Pixels a cell in the columns' own small images (drawn scaled up, smoothed: light has no detail finer than this). */
const COLUMN_RES = 12
const columnCanvas: Record<string, HTMLCanvasElement> = {}

/**
 * A soft column of light from `y0` down to `y1`, centred on `cx(y)`, `hw(y)` wide to where it has gone, `a(y)` strong
 * in its middle and falling off to nothing at its sides by smoothstep. Computed into a small image and drawn scaled
 * up: layered gradient fills stacked the canvas's dither into a visible weave, and slices parted into lines.
 */
function column(
  ctx: CanvasRenderingContext2D, k: number, key: string, rgb: string, y0: number, y1: number,
  cx: (y: number) => number, hw: (y: number) => number, a: (y: number) => number,
): void {
  if (typeof document === 'undefined') return
  let xa = Infinity
  let xb = -Infinity
  for (let i = 0; i <= 8; i++) {
    const y = y0 + ((y1 - y0) * i) / 8
    xa = Math.min(xa, cx(y) - hw(y))
    xb = Math.max(xb, cx(y) + hw(y))
  }
  const W = Math.max(2, Math.ceil((xb - xa) * COLUMN_RES))
  const H = Math.max(2, Math.ceil((y1 - y0) * COLUMN_RES))
  const cv = (columnCanvas[key] ??= document.createElement('canvas'))
  if (cv.width !== W || cv.height !== H) {
    cv.width = W
    cv.height = H
  }
  const g = cv.getContext('2d')
  if (!g) return
  const img = g.createImageData(W, H)
  const [r, gg, b] = rgb.split(',').map(Number)
  for (let j = 0; j < H; j++) {
    const y = y0 + ((j + 0.5) / H) * (y1 - y0)
    const A = Math.max(0, Math.min(1, a(y)))
    const c = cx(y)
    const w = hw(y)
    for (let i = 0; i < W; i++) {
      const x = xa + ((i + 0.5) / W) * (xb - xa)
      const u = Math.min(1, Math.abs(x - c) / w)
      const o = (j * W + i) * 4
      img.data[o] = r
      img.data[o + 1] = gg
      img.data[o + 2] = b
      img.data[o + 3] = Math.round(255 * A * (1 - u * u * (3 - 2 * u)))
    }
  }
  g.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(cv, xa * k, y0 * k, (xb - xa) * k, (y1 - y0) * k)
}

/**
 * The light in the mine, on the rock face behind everything:
 *
 * - the hall's firelight down the open hatch: a wedge out of the throat that opens onto the tunnel and his cart,
 *   flickering, so the drop is into a lit place and not a black one;
 * - every torch's pool, as `mine-set.ts` had it, and wider: as each catches it throws its warmth on the rock face
 *   round it and on along the gallery to the next set, and the gallery between the lit torches fills with a warm
 *   wash that grows with every torch, so the mine is brighter bar by bar behind and around him.
 */
function drawLamps(p: p5, c: Pen, T: number): void {
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const glowRgb = rgbOf(p, LAMP.glow)
  const fireRgb = rgbOf(p, mixHex(LAMP.flame, LAMP.glow, 0.4))
  ctx.save()
  clipRoom(ctx, k, true)
  // The hatch: firelight falling from the hall's floor through the throat, spreading as it comes out onto the tunnel.
  const h = hatchLit(T)
  const b = h
  if (b > 0.01) {
    const f = flicker(T, 5)
    const top = COVER_TOP
    const span = FLOOR_Y - top
    column(
      ctx, k, 'hatch', fireRgb, top, FLOOR_Y,
      (y) => -0.5 + 0.05 * ((y - top) / span),
      // Out of the hatch's opening (narrower than the throat, so its walls stay in shadow), fanning onto the tunnel.
      (y) => (y < THROAT_FOOT ? 0.6 + 0.15 * ((y - top) / (THROAT_FOOT - top)) : 0.75 + 1.0 * ((y - THROAT_FOOT) / (FLOOR_Y - THROAT_FOOT))),
      (y) => {
        const u = (y - top) / span
        // Strong under the hatch, easing as it spreads, a little pool on the floor at its foot.
        return b * f * (0.42 - 0.26 * u + 0.08 * Math.max(0, (u - 0.85) / 0.15))
      },
    )
    glow(p, c, -0.5, 0.55, 2.0 * b, 0.2 * b * f, LAMP.flame)
  }
  ctx.restore()
  ctx.save()
  clipRoom(ctx, k, false)
  // The torches: how many have caught, and the stretch of gallery they light.
  const ruin = ruinLight(T, RUIN.mine)
  let n = 0
  let x0 = Infinity
  let x1 = -Infinity
  for (const tr of TORCHES) {
    const l = Math.min(1, torchLit(tr, T))
    if (l <= 0.01 || tr.x > SHAFT[0]) continue
    n += l
    x0 = Math.min(x0, tr.x)
    x1 = Math.max(x1, tr.x + 3.2 * l)
  }
  if (n > 0) {
    // The gallery's wash: the rock face between the lit torches, warmer with each; reaching on to the next set.
    // In the mountain's fall the stope is at full light, and its torches leap on its chords as the roof cracks.
    const a = Math.min(0.36, 0.04 + 0.024 * n + 0.08 * ruin.up + 0.1 * ruin.flare) * lightsOut(T)
    const gx0 = x0 - 2.2
    const gx1 = x1 + 1.4
    const g = ctx.createLinearGradient(gx0 * k, 0, gx1 * k, 0)
    const fe = Math.min(0.45, 2.2 / (gx1 - gx0))
    g.addColorStop(0, `rgba(${glowRgb},0)`)
    g.addColorStop(fe, `rgba(${glowRgb},${a})`)
    g.addColorStop(1 - fe, `rgba(${glowRgb},${a})`)
    g.addColorStop(1, `rgba(${glowRgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(gx0 * k, -3.6 * k, (gx1 - gx0) * k, (FLOOR_Y + 3.7) * k)
  }
  for (const tr of TORCHES) {
    const l = torchLit(tr, T)
    if (l <= 0.01) continue
    const f = flicker(T, tr.seed) * (1 + 0.7 * ruin.flare)
    const m = Math.min(1, l)
    // The near pool (as it was), and the wide throw on the rock face, flaring as it catches.
    glow(p, c, tr.x + 0.15, tr.y - 0.35, 3.1 * m, 0.2 * l * f)
    glow(p, c, tr.x + 0.3, tr.y - 0.1, 4.6 * m, 0.18 * l * f)
  }
  // The tunnel behind him still runs on into the dark (as `drawRooms` fades it): the rock closes over the light too.
  const bg = rgbOf(p, c.bg)
  const fade = ctx.createLinearGradient(-1.1 * k, 0, -4.4 * k, 0)
  fade.addColorStop(0, `rgba(${bg},0)`)
  fade.addColorStop(1, `rgba(${bg},1)`)
  ctx.fillStyle = fade
  ctx.fillRect(-5.3 * k, -1.3 * k, 4.2 * k, (FLOOR_Y + 1.45) * k)
  ctx.restore()
}

/**
 * The same torches on the timbers, rails and rock in front of the back wall: a screen of warm light after the
 * timbering is drawn, so each set shines where its own torch and the next one reach it.
 */
function drawTimberLight(p: p5, c: Pen, T: number): void {
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rgb = rgbOf(p, LAMP.glow)
  ctx.save()
  clipRoom(ctx, k, false)
  ctx.globalCompositeOperation = 'screen'
  for (const tr of TORCHES) {
    const l = Math.min(1, torchLit(tr, T))
    if (l <= 0.01) continue
    const a = 0.13 * l * flicker(T, tr.seed + 2)
    const cx = (tr.x + 0.3) * k
    const cy = (tr.y + 0.1) * k
    const Rr = 3.4 * k
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rr)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(cx - Rr, cy - Rr, 2 * Rr, 2 * Rr)
  }
  ctx.restore()
}

/*
 * The shaft at the end of the line opens into the drum chamber's vault, and the chamber is covered (solid rock) until
 * he falls into it. What is seen down the shaft is the war-fires' light below: banked embers, a low red-amber glow
 * rising from under the floor, breathing. It is the part's `over` (the drum's cover is drawn after this part), so it
 * is kept off him: the ball's own disc is cut out of it.
 */
/** The drum chamber's first fire, under the shaft's far side, in this frame (the drum lies 8 below, not mirrored). */
const EMBER: Pt = [18.9, 8.55]
function emberLit(T: number): number {
  // Banked embers all along, breathing; the chamber's own firelight takes over where its cover has lifted.
  const breath = 0.85 + 0.15 * Math.sin(T * 1.9) * Math.sin(T * 0.7 + 1)
  return breath * (1 - ease(T, END - 0.3, END)) * lightsOut(T)
}
/**
 * The drum chamber's cover's top edge, in this frame (`drum.ts` `coverEdge`: from its vault, 6.7 over its floor, to
 * under the floor, from 0.68 s before he lands over 0.42 s, with a cell's feather): the embers' light is only seen
 * where the chamber is still covered.
 */
function drumCoverEdge(T: number): number {
  return 8 - 6.7 + (0.95 + 0.4 + 1.0 + 6.7) * ease(T, END - 0.68, END - 0.68 + 0.42) - 0.5
}
function drawEmbers(p: p5, c: Pen, T: number): void {
  const e = emberLit(T)
  if (e <= 0.01) return
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rgb = rgbOf(p, mixHex(LAMP.flame, '#C8552E', 0.35))
  const [bx, by] = peerAt(T)
  // Softly, from a cell under the drum's lifting cover: where it has lifted, the chamber is lit by its own fires.
  const edge = drumCoverEdge(T)
  const under = (y: number): number => ease(y, edge, edge + 1.2)
  ctx.save()
  // Under the stope's floor only, and never over him.
  ctx.beginPath()
  ctx.rect(15.5 * k, (FLOOR_Y + 0.1) * k, 9 * k, 9 * k)
  ctx.arc(bx * k, by * k, R * k + c.weight * 0.6, 0, Math.PI * 2, true)
  ctx.clip('evenodd')
  // The shaft's column of warm air, strongest at the bottom where the fire is.
  column(
    ctx, k, 'embers', rgb, FLOOR_Y + 0.1, 9.2,
    // As wide as the shaft all the way down (a shaft full of firelight, not a cone from a lamp).
    () => (SHAFT[0] + SHAFT[1]) / 2 - 0.1,
    () => 1.25,
    (y) => e * under(y) * (0.07 + 0.34 * Math.pow(Math.max(0, (y - FLOOR_Y) / 8.2), 1.2)),
  )
  // The embers' own glow, low and wide.
  const cx = EMBER[0] * k
  const cy = EMBER[1] * k
  const Rr = 4.2 * k
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rr)
  const low = under(EMBER[1] - 1)
  g.addColorStop(0, `rgba(${rgb},${0.3 * e * low})`)
  g.addColorStop(0.4, `rgba(${rgb},${0.12 * e * low})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(cx - Rr, cy - Rr, 2 * Rr, 2 * Rr)
  ctx.restore()
}

/* ------------------------------------------------------------------ the chase */

/**
 * The trolls gain on every lunge (drawn over the clock's cart, which keeps the switch between them): each lunge takes
 * a little more of the gap, so by the third their bumper is a hand's breadth from his (the lead's mitt a little short of him); on phrase 9 his cart, faster
 * with the accelerando, pulls the gap back open before the switch.
 */
const GAIN = [0.12, 0.1, 0.08]
function gain(T: number): number {
  let g = 0
  LUNGES.forEach((l, i) => {
    g += GAIN[i] * ease(T, l - 0.4, l + 0.04)
  })
  return g * (1 - ease(T, WIDE + 0.1, TRIP - 0.2))
}

/** A lunge's swell: up over `rise` into the accent, and back over `fall`. */
const swell = (T: number, at: number, rise: number, fall: number): number => {
  const d = T - at
  if (d < 0) return d > -rise ? ease(T, at - rise, at) : 0
  return Math.exp(-d / fall)
}
/** Each lunge reaches further than the last: the lead leans further out of the bin, his mitts low at the rim of his. */
function lunging(a: TrollAct, T: number): TrollAct {
  let lean = 0
  let arms = 0
  let slide = 0
  LUNGES.forEach((l, i) => {
    const w = swell(T, l, 0.24, 0.42)
    // Low, at his bin's rim, not up at him: the mitt closes short of him.
    lean += [0.04, 0.06, 0.08][i] * w
    arms -= [0.02, 0.04, 0.06][i] * w
    slide += [0.02, 0.03, 0.03][i] * w
  })
  return { ...a, lean: a.lean + lean, arms: Math.max(0, a.arms + arms), slide: a.slide + slide }
}

function drawMine(p: p5, s: MineState, c: Ctx): void {
  const T = c.t + s.begin
  const pen: Pen = { k: c.k, ink: c.ink, weight: c.weight, bg: c.bg }
  const [qx, qy] = quake(T)
  p.push()
  p.translate(qx * c.k, qy * c.k)
  // Before the hatch opens, nothing of the mine: only the rock over it.
  if (T < OPEN) {
    drawCover(p, c.k, T)
    p.pop()
    return
  }
  drawRooms(p, pen)
  drawThroat(p, pen)
  drawLamps(p, pen, T)
  drawTimbers(p, pen, T)
  drawTimberLight(p, pen, T)
  drawTorches(p, pen, T)
  drawSiding(p, pen, T)
  drawMainLine(p, pen, T)
  drawLever(p, pen, T)
  drawSwitch(p, pen, T)
  // The trolls' cart, behind his: in the tunnel, along the gallery, up the siding into the buffer.
  const tc = trollCart(T)
  const gx = gain(T)
  const tx = tc.x + gx
  const tl = lightAt(tx, tc.y - 0.4, T)
  const crash = T >= CRASH ? 0.12 * Math.exp(-(T - CRASH) / 0.16) * Math.cos((T - CRASH) * 16) : 0
  const onto = T >= ONTO ? 0.035 * Math.exp(-(T - ONTO) / 0.1) : 0
  drawTrollCart(p, pen, tx, tc.y, {
    light: 0.12 + 0.88 * tl,
    turn: (trollS(T) + gx) / TROLL_CART.wheelR,
    tilt: tc.angle + crash,
    dip: onto,
    lead: lunging(trollAct(T, true), T),
    rear: trollAct(T, false),
    brake: ease(T, BRAKE - 0.06, BRAKE + 0.07),
    trollLight: 0.1 + 0.9 * lightAt(tx, tc.y - 1.1, T),
  })
  drawBuffer(p, pen, T)
  drawChock(p, pen, T)
  // His cart.
  const cx = peerCartX(T)
  const j = jolt(T)
  const land = T >= LAND ? 0.05 * ((T - LAND) / 0.06) * Math.exp(1 - (T - LAND) / 0.06) : 0
  const stop = T >= STOP ? 0.09 * Math.exp(-(T - STOP) / 0.14) * Math.cos((T - STOP) * 18) : 0
  drawOreCart(p, pen, cx, RAIL, {
    light: 0.15 + 0.85 * lightAt(cx, RAIL - 0.5, T),
    turn: (cx + 0.5) / PEER_CART.wheelR,
    tilt: j.pitch + stop,
    dip: j.drop + land,
    tip: binTip(T),
    load: 1 - 0.75 * ease(T, STOP + 0.12, STOP + 0.55),
  })
  drawCover(p, c.k, T)
  p.pop()
}

function drawMineOver(p: p5, s: MineState, c: Ctx): void {
  const T = c.t + s.begin
  if (T < OPEN) return
  const pen: Pen = { k: c.k, ink: c.ink, weight: c.weight, bg: c.bg }
  // Not shaken: it cuts his disc out where the engine draws him.
  drawEmbers(p, pen, T)
  if (T < FIRST_CLACK - 0.1 || T > STOP + 2.5) return
  const [qx, qy] = quake(T)
  p.push()
  p.translate(qx * c.k, qy * c.k)
  drawSparks(p, pen, T)
  drawSpill(p, pen, T)
  p.pop()
}

/** The lane: his path sampled finely, and cut exactly at every clack, the stop and the bounce, so each is sharp and on the note. */
function lane(slot: Slot): Seg[] {
  const times = new Set<number>()
  for (let t = slot.begin; t < slot.end; t += 0.0125) times.add(Math.round(t * 1e6) / 1e6)
  for (const e of PEER_EVENTS) if (e > slot.begin && e < slot.end) times.add(e)
  times.add(slot.begin)
  times.add(slot.end)
  const ts = [...times].sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-6)
  const segs: Seg[] = []
  for (let i = 0; i + 1 < ts.length; i++) segs.push({ from: peerAt(ts[i]), to: peerAt(ts[i + 1]), dur: ts[i + 1] - ts[i] })
  return segs
}

export const mine = part<MineState>(
  { name: 'mine', flight: true, draw: drawMine, over: drawMineOver },
  (slot: Slot) => {
    if (Math.abs(slot.begin - BEGIN) > 1e-6 || Math.abs(slot.end - END) > 1e-6) console.warn(`mountain king: mine was built for ${BEGIN}–${END}, given ${slot.begin}–${slot.end}`)
    return {
      // The stope and its tunnel (running on 4 cells behind him into the dark, under the hall's east end), the
      // trapdoor's shaft from the hall, and the shaft down to the drum.
      cells: box(-5.5, -7.5, 23.2, 1.6).concat(box(SHAFT[0], 1, SHAFT[1], 8.3)),
      exit: [EXIT[0] + 0.5, EXIT[1]] as Pt,
      lane: { segs: lane(slot), fire: 0 },
      state: { begin: slot.begin },
    }
  },
  (slot: Slot): PartShot[] => [
    // Landing in the cart, then a look back up the tunnel at the two asleep in theirs, waking.
    { t: slot.begin, ...SEAM_SHOT },
    { t: BRAKE - 0.2, cells: 5.4, off: [-1.5, -0.75] },
    // The chase, one push in that never stops. Wide down the tunnel: his cart in the front third, the trolls' cart
    // coming out of the dark behind, the torches catching ahead of him one by one; then in a step on every lunge as
    // the gap closes, lower each time, until the third lunge is in a low close frame: the rail at its foot, the lead
    // troll leaning out of his bin over him, their cart looming behind his.
    { t: FIRST_CLACK + 0.5, cells: 8.0, off: [-2.3, -1.3] },
    { t: LUNGES[0], cells: 6.1, off: [-1.1, -0.85] },
    { t: LUNGES[1], cells: 5.4, off: [-0.8, -0.85] },
    { t: LUNGES[2] + 0.1, cells: 4.9, off: [-0.55, -0.9] },
    // Phrase 9: on its first note the frame pulls back and ahead over the whole run to come (the switch's lever, the
    // catch ramp and its buffer, the gallery on to the stop block and the shaft), arriving a bar before his wheel
    // reaches the lever; then it holds while the switch throws and the trolls run up the ramp into the buffer.
    { t: WIDE, cells: 5.6, off: [0.1, -0.85] },
    { t: WIDE + 1.3, cells: 9.4, hold: [14.4, -1.0], w: 0.88 },
    { t: CRASH + 0.35, cells: 9.9, hold: [14.6, -0.95], w: 0.9 },
    // With him to the shaft; the stop; down the shaft with him.
    { t: STOP - 1.0, cells: 6.2, off: [0.9, -0.4] },
    { t: STOP, cells: 5.4, off: [0.9, 0.1] },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
