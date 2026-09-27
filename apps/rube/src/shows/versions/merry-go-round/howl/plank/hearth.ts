import type p5 from 'p5'
import { laneAt, mixHex, type Lane, type Pt } from '../../../../../parts'
import { director, type Shot } from '../camera'
import { DOOR, drawCalcifer, drawDoor } from '../cast'
import { ROOM_AT, roomTone } from '../castle/room'
import { alpha, box, frame, hash, part, route, smooth, type PartShot, type Way } from '../kit'
import { CALCIFER_HELD } from '../seams'
import { ROOM, TOWN, WASTES } from '../worlds'

/**
 * The room in the bombing, and Calcifer lifted out of the grate (237.0 → 243.635): the plank builder's.
 *
 * She comes in from the burning street through the castle's door (the dial on red: the hat shop), and the war comes
 * in with her: the door is blown shut behind her on the first hit, and every bomb after it shakes the room and
 * flares through the shut door's cracks. Dust pours from the beams, the crockery on the mantel jumps, the lantern
 * swings, and Calcifer cowers small in his grate, shutting his eyes at each one. The floor bucks on the biggest
 * (239.81): the camera comes to rest just before it and is knocked, the crockery is thrown off the shelf, Calcifer
 * off his log, and she off the boards, landing on the next onset; then the camera pushes on with her to the hearth. In the breath after the last hit she eases in to him, and on its
 * one note (243.008) she scoops him up out of the grate and hops back with him in her hands. The cut comes on the
 * climax (243.635): she is at rest, holding him, and the castle falls apart round her (`plank.ts`).
 *
 * The part's frame is the room's own, moved by `HEARTH_AT`: she comes in at (-0.5, 0), which is the middle of the
 * door (`ROOM_AT.door`). Everything here is drawn only while this part has the room (237 → 243.635, with a little
 * margin), so the room at breakfast is untouched.
 */

/** Where the room's second leg starts in the room world (the part's own origin): Sophie comes in at the door. */
export const HEARTH_AT: Pt = [0.8, 0]

const T0 = 237.0
/** The bombs: the cut, then the return's hits. */
const HIT = [T0, 238.579, 238.997, 239.81, 241.203] as const
const SLAM = HIT[1]
/** The floor bucks: the loudest bomb, the camera knocked (the check lets its knock be quick). */
export const JOLT = HIT[3]
/** Where the floor's buck puts her down again: the next onset. */
const BUCK_DOWN = 240.268
/** The breath's one note: she lifts him. */
export const HEARTH_LIFT = 243.008
const LIFT = HEARTH_LIFT
const T1 = 243.635

/** Room x to the part's frame. */
const fx = (x: number) => x - HEARTH_AT[0]

/* ------------------------------------------------------------------ her way across */

/**
 * Sophie's route, in room cells: she stands in the doorway, sets off slowly across the shaking room (her pace scaled
 * to however far the hearth is), is thrown into a little hop by the floor on the biggest hit, slows to the hearth's
 * mouth for the breath, eases in to the grate, and hops back with him.
 */
function ways(): Way[] {
  const door = ROOM_AT.door[0]
  const log = ROOM_AT.log[0]
  const reach = log - 0.3
  const mouth = reach - 0.5
  // The floor bucks her up on the biggest hit and she comes down on the next onset.
  const hopT = BUCK_DOWN - JOLT
  const t1 = JOLT - 237.35
  const t3 = 241.964 - (JOLT + hopT)
  // Off from rest to a walk, on through the hop, and down to rest again at the mouth: v from the distance.
  const v = (mouth - door) / (t1 / 2 + hopT + t3 / 2)
  const w: Way[] = []
  const at = (t: number, x: number, extra: Partial<Way> = {}) => w.push({ at: t - T0, p: [fx(x), 0], ...extra })
  at(T0, door)
  at(237.35, door)
  let x = door + (v / 2) * t1
  at(JOLT, x, { ramp: [0, v] })
  x += v * hopT
  // Thrown clear of the boards: a real hop, landing on the next onset.
  at(JOLT + hopT, x, { arc: 0.25 })
  at(241.964, mouth, { ramp: [v, 0] })
  // The breath: she waits, then eases in to him.
  at(242.35, mouth)
  at(242.9, reach, { ease: 'inout' })
  at(LIFT, reach)
  // The lift: she draws back out of the grate with him in her hands, rising as she takes his weight, and settles.
  w.push({ at: LIFT + 0.3 - T0, p: [fx(reach - 0.36), -0.12], ease: 'out' })
  w.push({ at: T1 - T0, p: [fx(reach - 0.55), 0], ease: 'inout' })
  return w
}

/* ------------------------------------------------------------------ the shaking room */

/** A hit's knock: a sharp start and a long damped ring, 0 before it. */
const ring = (u: number, period = 0.42, decay = 0.35) => (u < 0 ? 0 : Math.sin((2 * Math.PI * u) / period) * Math.exp(-u / decay))
/**
 * Something thrown up off a board that bucks under it, `u` s after the knock: up to `h` cells and down again under
 * gravity, then one small bounce. 0 before the knock and once it is down.
 */
function hop(u: number, h: number, g = 30): number {
  if (u < 0 || h <= 0) return 0
  const t1 = 2 * Math.sqrt((2 * h) / g)
  if (u < t1) return (g / 2) * u * (t1 - u)
  const h2 = 0.18 * h
  const t2 = 2 * Math.sqrt((2 * h2) / g)
  const v = u - t1
  return v < t2 ? (g / 2) * v * (t2 - v) : 0
}
/** How hard the room is shaking at `t` (0..1): the sum of the hits' fading knocks. */
function shaking(t: number): number {
  let v = 0
  HIT.forEach((h, i) => {
    const u = t - h
    if (u >= 0) v += (i === 3 ? 1 : i === 0 ? 0.7 : 0.55) * Math.exp(-u / 0.5)
  })
  return Math.min(1, v)
}

/**
 * Dust shaken out from between the beams on every hit: each gap lets go a clump that falls, spreads and thins as it
 * goes, sifting in soft puffs of every size (never a column of light, never a string of beads), and a low haze where
 * it lands. Room cells.
 */
function dust(p: p5, k: number, t: number, top: number) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const floor = ROOM_AT.ground
  // Only inside the room: between its walls, from the beams down to the boards. (p5's push and pop, so its cached
  // fill is the canvas's again after the clip is let go.)
  p.push()
  ctx.beginPath()
  ctx.rect(ROOM_AT.wallL * k, ROOM_AT.ceil * k, (ROOM_AT.wallR - ROOM_AT.wallL) * k, (floor + 0.1 - ROOM_AT.ceil) * k)
  ctx.clip()
  const puffAt = (x: number, y: number, r: number, a: number) => {
    if (a <= 0.004 || r <= 0.01) return
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
    g.addColorStop(0, `rgba(205, 185, 153, ${a})`)
    g.addColorStop(0.5, `rgba(205, 185, 153, ${a * 0.6})`)
    g.addColorStop(1, 'rgba(205, 185, 153, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
    ctx.fill()
  }
  HIT.forEach((h, i) => {
    const u = t - h
    if (u < 0 || u > 3.2) return
    const n = i === 3 ? 6 : 3
    for (let j = 0; j < n; j++) {
      const x = -0.4 + hash(i, j, 3) * 8.2
      const s0 = u - hash(i, j, 5) * 0.2
      if (s0 < 0) continue
      const fade = (1 - smooth(s0, 1.0, 2.8)) * (0.22 + 0.12 * hash(i, j, 9))
      // The clump and what sifts off it behind: puffs let go one after another, each falling on its own.
      for (let q = 0; q < 5; q++) {
        const s = s0 - q * 0.14
        if (s <= 0) continue
        const fall = (1.6 + 0.8 * hash(i, j, 7)) * s + 1.4 * s * s
        const y = Math.min(floor - 0.1, top + fall)
        const r = (0.1 + 0.08 * hash(i, j, q)) * (1 + 1.6 * s) * (q === 0 ? 1.25 : 1)
        const drift = Math.sin(s * 2.2 + j + q) * 0.06 * s
        puffAt(x + drift + (hash(i, j, q + 20) - 0.5) * 0.12, y, r, fade * (q === 0 ? 1 : 0.6))
      }
      // Where it lands, a low haze on the boards.
      const land = (Math.sqrt((1.6 + 0.8 * hash(i, j, 7)) ** 2 + 5.6 * (floor - top)) - (1.6 + 0.8 * hash(i, j, 7))) / 2.8
      if (s0 > land) {
        const e = s0 - land
        p.noStroke()
        p.fill(alpha(p, ROOM.plasterShade, fade * 0.9 * Math.min(1, e * 4)))
        p.ellipse(x * k, (floor - 0.06) * k, (0.35 + 0.5 * e) * k, (0.14 + 0.05 * e) * k)
      }
    }
  })
  p.pop()
}

/** The bombs' light: a warm flash through the room on each hit, from the door's side, gone in a breath. */
function flash(p: p5, k: number, t: number, f: { x0: number; y0: number; x1: number; y1: number }) {
  let v = 0
  HIT.forEach((h, i) => {
    const u = t - h
    if (u >= 0) v += (i === 3 ? 0.2 : 0.12) * Math.exp(-u / 0.22) * (1 - Math.exp(-u / 0.03))
  })
  if (v < 0.004) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cx = ROOM_AT.door[0]
  const g = ctx.createRadialGradient(cx * k, -1 * k, 0, cx * k, -1 * k, 9 * k)
  g.addColorStop(0, `rgba(255, 190, 110, ${v})`)
  g.addColorStop(1, 'rgba(255, 190, 110, 0)')
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
}

/** How bright the burning street is behind the shut door: an ember glow, and each bomb's flash dying in a breath. */
function outside(t: number): number {
  let v = 0.16
  HIT.forEach((h, i) => {
    const u = t - h
    if (i > 0 && u >= 0) v += (i === 3 ? 1 : 0.55) * Math.exp(-u / 0.32) * (1 - Math.exp(-u / 0.015))
  })
  return Math.min(1, v)
}

/**
 * The war through the cracks of the shut door, in the door's own frame (its sill's middle at 0,0): the gaps round the
 * leaf and between two shrunk planks glow with the street's fire, unevenly along their length, and flare on every
 * bomb; under the door the light spills out across the boards.
 */
function cracks(p: p5, k: number, t: number, open: number) {
  const shut = 1 - smooth(open, 0.004, 0.05)
  const v = shut * outside(t)
  if (v < 0.01) return
  const { w, h } = DOOR
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.lineCap = 'butt'
  // One gap: a soft wide glow and a hot thin core, each brighter and dimmer along it where the boards are warped.
  const gap = (x0: number, y0: number, x1: number, y1: number, seed: number, strength: number) => {
    for (const [wid, a, rgb] of [
      [0.075, 0.28, '240, 138, 58'],
      [0.022, 1, '255, 214, 140'],
    ] as const) {
      const g = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
      for (let i = 0; i <= 6; i++) {
        const along = i === 0 || i === 6 ? 0.25 : 0.4 + 0.6 * hash(seed, i, 4)
        g.addColorStop(i / 6, `rgba(${rgb}, ${Math.min(1, v * strength * a * along)})`)
      }
      ctx.strokeStyle = g
      ctx.lineWidth = wid * k
      ctx.beginPath()
      ctx.moveTo(x0 * k, y0 * k)
      ctx.lineTo(x1 * k, y1 * k)
      ctx.stroke()
    }
  }
  gap(w / 2 - 0.012, -h + 0.03, w / 2 - 0.012, -0.02, 1, 1)
  gap(-w / 2 + 0.012, -h + 0.08, -w / 2 + 0.012, -0.04, 2, 0.6)
  gap(-w / 2 + 0.06, -h + 0.012, w / 2 - 0.04, -h + 0.012, 3, 0.55)
  gap(-w / 2 + w / 2, -1.62, -w / 2 + w / 2, -0.55, 4, 0.5)
  gap(-w / 2 + (w * 3) / 4, -1.05, -w / 2 + (w * 3) / 4, -0.32, 5, 0.35)
  // Under the door, the brightest: a bar of light at the sill and a fan of it thrown out over the boards.
  gap(-w / 2 + 0.02, -0.012, w / 2 - 0.02, -0.012, 6, 1.2)
  // A soft half-oval of it on the floor, never a wedge with ruled sides.
  ctx.save()
  ctx.scale(1, 0.42)
  const spill = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.05 * k)
  spill.addColorStop(0, `rgba(240, 138, 58, ${0.34 * v})`)
  spill.addColorStop(0.45, `rgba(240, 138, 58, ${0.14 * v})`)
  spill.addColorStop(1, 'rgba(240, 138, 58, 0)')
  ctx.fillStyle = spill
  ctx.fillRect(-1.05 * k, 0, 2.1 * k, 1.05 * k)
  ctx.restore()
  ctx.restore()
}

/**
 * The lantern hung from the beam over the wall left of the door: where it hangs, and its chain's length to its cap. Far
 * enough left that the push to the hearth carries it out of the frame whole, never leaving half of it on the edge.
 */
const LANTERN = { x: -1.6, len: 2.3 }
/** Its swing, radians: every bomb pushes it, the buck hardest; a long pendulum, so it swings slow and rings long. */
function lanternSwing(t: number): number {
  let a = 0
  HIT.forEach((h, i) => {
    const u = t - h
    if (u < 0) return
    const push = i === 3 ? 0.15 : i === 0 ? 0 : 0.04
    // A shove from rest: the swing starts at once and eases up to its reach, then rings down.
    a += push * (i % 2 ? 1 : -1) * Math.sin((2 * Math.PI * u) / 2.7) * Math.exp(-u / 3)
  })
  return a
}

function lantern(p: p5, k: number, W: number, inkIn: string, t: number) {
  const { tone, ink } = roomTone(t, inkIn)
  const top = ROOM_AT.ceil
  const a = lanternSwing(t)
  const cx = LANTERN.x + Math.sin(a) * LANTERN.len
  const cy = top + Math.cos(a) * LANTERN.len
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Its light on the wall, swinging with it; the flame gutters on each bomb.
  let gutter = 0
  HIT.forEach((h) => {
    const u = t - h
    if (u >= 0) gutter = Math.max(gutter, Math.exp(-u / 0.25) * (1 - Math.exp(-u / 0.02)))
  })
  const lit = 0.13 * (1 - 0.5 * gutter) * (0.94 + 0.06 * Math.sin(t * 17))
  const g = ctx.createRadialGradient(cx * k, (cy + 0.2) * k, 0, cx * k, (cy + 0.2) * k, 1.3 * k)
  g.addColorStop(0, `rgba(255, 196, 120, ${lit})`)
  g.addColorStop(1, 'rgba(255, 196, 120, 0)')
  ctx.fillStyle = g
  ctx.fillRect((cx - 1.3) * k, (cy - 1.1) * k, 2.6 * k, 2.6 * k)
  // The chain, from the beam.
  p.stroke(alpha(p, ink, 0.8))
  p.strokeWeight(W * 0.6)
  p.line(LANTERN.x * k, top * k, cx * k, cy * k)
  p.push()
  p.translate(cx * k, cy * k)
  p.rotate(-a)
  const X = (v: number) => v * k
  const iron = tone(WASTES.ironDark)
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  // The ring and the cap.
  p.noFill()
  p.circle(0, X(0.025), X(0.05))
  p.fill(iron)
  p.beginShape()
  p.vertex(X(-0.12), X(0.12))
  p.vertex(X(0.12), X(0.12))
  p.vertex(X(0.035), X(0.05))
  p.vertex(X(-0.035), X(0.05))
  p.endShape(p.CLOSE)
  // The glass, lit from inside, in its iron frame, a little narrower at the foot.
  p.fill(mixHex(tone(ROOM.copper), '#FFD9A0', 0.55 - 0.25 * gutter))
  p.beginShape()
  p.vertex(X(-0.1), X(0.12))
  p.vertex(X(0.1), X(0.12))
  p.vertex(X(0.08), X(0.38))
  p.vertex(X(-0.08), X(0.38))
  p.endShape(p.CLOSE)
  // The flame: a small tongue, leaning against the swing.
  p.noStroke()
  p.fill('#FFF1C8')
  const fl = 0.07 * (1 - 0.45 * gutter)
  const lean = -a * 0.6
  p.beginShape()
  p.vertex(X(-0.022), X(0.33))
  p.bezierVertex(X(-0.03), X(0.3), X(-0.01 + lean * 0.3), X(0.33 - fl * 0.6), X(lean * 0.5), X(0.33 - fl))
  p.bezierVertex(X(0.01 + lean * 0.3), X(0.33 - fl * 0.6), X(0.03), X(0.3), X(0.022), X(0.33))
  p.endShape(p.CLOSE)
  // The frame's middle bar and the foot.
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.line(0, X(0.12), 0, X(0.38))
  p.strokeWeight(W * 0.7)
  p.fill(iron)
  p.rectMode(p.CENTER)
  p.rect(0, X(0.4), X(0.2), X(0.045), X(0.01))
  p.pop()
}

/** The crockery on the mantel: [x from the hearth's left, width, height, colour]. */
const MANTEL_ITEMS: [number, number, number, string][] = [
  [-0.35, 0.2, 0.3, WASTES.stone],
  [0.15, 0.16, 0.22, ROOM.copper],
  [1.55, 0.26, 0.2, ROOM.cloth],
  [2.3, 0.14, 0.34, WASTES.stoneDark],
]

function mantel(p: p5, k: number, w: number, ink: string, t: number) {
  const [hx0, , htop] = ROOM_AT.hearth
  const shelf = htop - 0.22
  MANTEL_ITEMS.forEach(([dx, iw, ih, col], i) => {
    let x = hx0 + dx
    let y = shelf
    let rot = 0
    // Every hit makes them jump and rock; on the floor's buck they are thrown clear of the shelf, each its own height,
    // come down rocking, and have walked a little along it for good.
    for (let j = 0; j < HIT.length; j++) {
      const u = t - HIT[j]
      if (u < 0) continue
      const big = j === 3
      const kick = (big ? 1 : 0.4) * (0.6 + 0.4 * hash(i, j))
      y -= hop(u, (big ? 0.15 : 0.04) * kick)
      x += (big ? 0.06 : 0.015) * (hash(i, j, 6) - 0.5) * 2 * smooth(u, 0, 0.3)
      rot += (big ? 0.34 : 0.14) * kick * (hash(i, j, 2) - 0.5) * 2 * ring(u, big ? 0.3 : 0.36, big ? 0.4 : 0.3)
    }
    // Tipped about the corner of its foot it leans onto, so it rocks on the shelf and never sinks into it.
    const pivot = (Math.sign(rot) * iw) / 2
    p.push()
    p.translate((x + pivot) * k, y * k)
    p.rotate(rot)
    p.translate(-pivot * k, (-ih / 2) * k)
    p.stroke(ink)
    p.strokeWeight(w * 0.7)
    p.fill(col)
    p.beginShape()
    p.vertex((-iw / 2) * k, (ih / 2) * k)
    p.vertex((iw / 2) * k, (ih / 2) * k)
    p.bezierVertex(iw * 0.62 * k, 0, iw * 0.45 * k, -ih * 0.3 * k, iw * 0.22 * k, (-ih / 2) * k)
    p.vertex(-iw * 0.22 * k, (-ih / 2) * k)
    p.bezierVertex(-iw * 0.45 * k, -ih * 0.3 * k, -iw * 0.62 * k, 0, (-iw / 2) * k, (ih / 2) * k)
    p.endShape(p.CLOSE)
    p.pop()
  })
}

/** The burning street through the open door: the hat shop's side of it, at war. */
function street(p: p5, k: number, t: number, b: { x0: number; y0: number; x1: number; y1: number }) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, b.y0 * k, 0, b.y1 * k)
  g.addColorStop(0, TOWN.nightHigh)
  g.addColorStop(0.55, mixHex(TOWN.night, TOWN.ember, 0.55))
  g.addColorStop(1, TOWN.fire)
  ctx.fillStyle = g
  ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
  p.noStroke()
  // Flames behind the roofs: tongues that lick up and fall back.
  for (let i = 0; i < 5; i++) {
    const x = b.x0 + 0.1 + i * 0.2
    const h = 0.25 + 0.2 * Math.abs(Math.sin(t * (4.1 + i) + i * 1.7))
    p.fill(alpha(p, TOWN.fire, 0.85))
    p.triangle((x - 0.1) * k, -1.0 * k, (x + 0.1) * k, -1.0 * k, (x + 0.03 * Math.sin(t * 7 + i)) * k, (-1.0 - h) * k)
    p.fill(alpha(p, TOWN.fireHot, 0.75))
    p.triangle((x - 0.05) * k, -1.0 * k, (x + 0.05) * k, -1.0 * k, x * k, (-1.0 - h * 0.55) * k)
  }
  // Roofs across the street, black against the fire.
  p.fill(mixHex(TOWN.slateDark, TOWN.nightHigh, 0.6))
  p.beginShape()
  p.vertex(b.x0 * k, b.y1 * k)
  p.vertex(b.x0 * k, -0.95 * k)
  p.vertex(-0.2 * k, -1.3 * k)
  p.vertex(0.05 * k, -0.98 * k)
  p.vertex(0.1 * k, -1.15 * k)
  p.vertex(0.22 * k, -1.15 * k)
  p.vertex(0.22 * k, -0.92 * k)
  p.vertex(b.x1 * k, -0.8 * k)
  p.vertex(b.x1 * k, b.y1 * k)
  p.endShape(p.CLOSE)
  // Smoke rolling across the top.
  for (let i = 0; i < 4; i++) {
    const x = b.x0 + (((t * 0.35 + i * 0.3) % 1.3) - 0.15)
    p.fill(alpha(p, TOWN.smoke, 0.55))
    p.ellipse(x * k, (-1.75 + 0.1 * Math.sin(i * 2 + t)) * k, 0.6 * k, 0.35 * k)
  }
}

/* ------------------------------------------------------------------ the part */

interface HearthState {
  begin: number
  lane: Lane
}

/** How open the door is: blown shut on the first hit after the cut, the latch catching with a small rebound. */
function doorOpen(t: number): number {
  if (t < SLAM) {
    const u = Math.max(0, (t - T0) / (SLAM - T0))
    return 0.78 * (1 - u * u * u)
  }
  const u = t - SLAM
  return 0.06 * Math.max(0, Math.sin(u * 14)) * Math.exp(-u / 0.12)
}

export const hearth = part<HearthState>(
  {
    name: 'hearth',
    draw: (p, s, c) => {
      const { k, weight: W, ink } = c
      const t = s.begin + c.t
      if (t < T0 - 0.5 || t > T1 + 0.6) return
      p.push()
      // Everything here is in room cells.
      p.translate(-HEARTH_AT[0] * k, -HEARTH_AT[1] * k)
      const shake = shaking(t)
      const f = frame(p, k)

      // The door, blown shut behind her; the dial on red, the hat shop's street burning through it.
      const open = doorOpen(t)
      p.push()
      p.translate(ROOM_AT.door[0] * k, ROOM_AT.door[1] * k)
      drawDoor(p, k, W, ink, {
        open,
        dial: 2,
        wood: mixHex(ROOM.wood, ROOM.night, 0.35),
        woodDark: mixHex(ROOM.woodDark, ROOM.night, 0.35),
        view: (q, b) => street(q, k, t, b),
      })
      cracks(p, k, t, open)
      p.pop()
      // The fire's light from the open door on the boards, gone when it shuts.
      if (open > 0.02) {
        const dx = ROOM_AT.door[0]
        const g = ROOM_AT.ground
        p.noStroke()
        p.fill(alpha(p, TOWN.fire, 0.22 * open))
        p.quad((dx - 0.47) * k, g * k, (dx + 0.47) * k, g * k, (dx + 1.6) * k, (g + 0.6) * k, (dx - 0.2) * k, (g + 0.6) * k)
      }

      lantern(p, k, W, ink, t)
      mantel(p, k, W, ink, t)

      // Calcifer: cowering small in the grate, flinching at every hit and looking to her as she comes; then in her
      // hands.
      const at = laneAt(s.lane, t - T0)
      const her: Pt = [at.x + HEARTH_AT[0], at.y]
      let flinch = 0
      for (const h of HIT) {
        const u = t - h
        if (u >= 0) flinch = Math.max(flinch, Math.exp(-u / 0.45))
      }
      const lifted = smooth(t, LIFT - 0.02, LIFT + 0.14)
      const [lx, ly] = ROOM_AT.log
      const heldX = her[0] + CALCIFER_HELD.at[0]
      const heldY = her[1] + CALCIFER_HELD.at[1]
      const near = 1 - smooth(Math.abs(lx - her[0]), 0.6, 3.5)
      const size = (0.45 - 0.08 * flinch) * (1 - lifted) + CALCIFER_HELD.size * lifted
      // The buck throws him up off his log too.
      const bounce = hop(t - JOLT, 0.09) * (1 - lifted)
      p.push()
      p.translate((lx + (heldX - lx) * lifted) * k, (ly + (heldY - ly) * lifted - bounce) * k)
      drawCalcifer(p, k, W, ink, {
        t,
        size,
        weak: 0.18 * (1 - lifted) + 0.1 * shake,
        shut: 0.9 * flinch * (1 - near * 0.6),
        look: lifted > 0.5 ? [-0.6, -0.4] : [-near, -0.3 * near],
        mouth: lifted > 0.2 ? 0.2 + 0.6 * (1 - smooth(t, LIFT + 0.3, T1)) : 0.1 + 0.15 * flinch,
        lean: -0.15 * shake,
      })
      p.pop()

      // Dust from the beams, and the bombs' light, over everything in the room.
      // (From the beams: on a phone held upright the frame's top is far over them, in the dark over the set.)
      dust(p, k, t, ROOM_AT.ceil - 0.2)
      flash(p, k, t, f)
      p.pop()
    },
  },
  (slot) => {
    const lane: Lane = { segs: route(ways()), fire: 0 }
    const end = laneAt(lane, slot.end - slot.begin)
    return {
      cells: box(-4, -6, 12, 2),
      exit: [end.x + 0.5, end.y] as Pt,
      lane,
      state: { begin: slot.begin, lane },
    }
  },
  (slot, built) => {
    // Two moves across the room with her, from the doorway's framing to her and him at the hearth. Through the first
    // bombs it drifts a little way in and comes to rest just as the floor bucks; the buck knocks the whole room in
    // the frame, sharp, and rings down in about 0.6 s; then, the room settling, it pushes on in to the hearth.
    const x = (t: number) => laneAt(built.lane, Math.min(slot.end, t) - slot.begin).x + HEARTH_AT[0]
    const from = x(slot.begin) + 0.9
    const rest = x(slot.end)
    const along = (t: number) => from + (rest - from) * (0.3 * smooth(t, slot.begin, JOLT) + 0.7 * smooth(t, JOLT + 0.4, 243.3))
    // The height and the size, as before: eased through these by the camera's own curve.
    const coarse: [number, number, number][] = [
      [237.6, -0.72, 4.0],
      [JOLT, -0.7, 3.86],
      [241.2, -0.64, 3.7],
      [242.5, -0.36, 3.5],
      // Low enough that the door's dial is wholly out of the top of the frame, never half on its edge.
      [243.45, -0.3, 3.4],
      [slot.end, -0.3, 3.4],
    ]
    const base = director(() => [0, 0], coarse.map(([t, hy, cells]): Shot => ({ t, cells, hold: [0, hy], w: 1 })), slot.end + 1)
    // The knock: the frame thrown down and aside at once (the room jumping up in it) and rung down, each swing a
    // key the camera turns on; a breath of push-in with it. [s after the buck, x, y, cells ×].
    const knock: [number, number, number, number][] = [
      [0, 0, 0, 1],
      [0.03, -0.018, 0.075, 0.982],
      [0.13, 0.035, -0.04, 1.006],
      [0.24, -0.018, 0.02, 0.998],
      [0.36, 0.008, -0.009, 1],
      [0.48, -0.003, 0.003, 1],
      [0.62, 0, 0, 1],
    ]
    const times = [237.6, 238.3, 239.0, 239.5, ...knock.map(([u]) => JOLT + u), 241.0, 241.6, 242.1, 242.5, 243.0, 243.45, slot.end]
    return times.map((t): PartShot => {
      const b = base(t)
      const [, kx, ky, kc] = knock.find(([u]) => Math.abs(JOLT + u - t) < 1e-9) ?? [0, 0, 0, 1]
      return { t, cells: b.cells * kc, hold: [fx(along(t)) + kx, b.y + ky], w: 1 }
    })
  },
)

/** Every strike of this part, in show seconds: the cut, the door blown shut, the bombs, her coming down, the lift. */
export const HEARTH_HITS: number[] = [T0, SLAM, HIT[2], JOLT, BUCK_DOWN, HIT[4], LIFT]
