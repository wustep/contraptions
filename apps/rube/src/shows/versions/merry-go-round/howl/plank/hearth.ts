import type p5 from 'p5'
import { laneAt, mixHex, type Lane, type Pt } from '../../../../../parts'
import { drawCalcifer, drawDoor } from '../cast'
import { ROOM_AT } from '../castle/room'
import { alpha, box, frame, hash, part, route, smooth, type PartShot, type Way } from '../kit'
import { CALCIFER_HELD } from '../seams'
import { ROOM, TOWN, WASTES } from '../worlds'

/**
 * The room in the bombing, and Calcifer lifted out of the grate (237.0 → 243.635): the plank builder's.
 *
 * She comes in from the burning street through the castle's door (the dial on red: the hat shop), and the war comes
 * in with her: the door is blown shut behind her on the first hit, and every bomb after it shakes the room. Dust
 * pours from the beams, the crockery on the mantel jumps, and Calcifer cowers small in his grate, shutting his eyes
 * at each one. The floor bucks under her on the biggest (239.81) and
 * she keeps going, across the room to the hearth. In the breath after the last hit she eases in to him, and on its
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
const JOLT = HIT[3]
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
  at(JOLT + hopT, x, { arc: 0.12 })
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
 * Dust pouring from between the beams on every hit: soft columns that fall and thin out (each a light gradient,
 * never a string of beads), and a low haze where they land. Room cells.
 */
function dust(p: p5, k: number, t: number, top: number) {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const floor = ROOM_AT.ground
  HIT.forEach((h, i) => {
    const u = t - h
    if (u < 0 || u > 2.8) return
    const n = i === 3 ? 6 : 3
    for (let j = 0; j < n; j++) {
      const x = -0.4 + hash(i, j, 3) * 8.2
      const s = u - hash(i, j, 5) * 0.2
      if (s < 0) continue
      const head = Math.min(floor, top + (2.2 + hash(i, j, 7)) * s + 1.6 * s * s)
      const tail = top + Math.max(0, s - 0.9) * 2.5
      const a = (1 - smooth(s, 1.0, 2.4)) * (0.16 + 0.1 * hash(i, j, 9))
      const w = 0.08 + 0.1 * hash(i, j, 11) + 0.1 * s
      if (head - tail > 0.05 && a > 0.005) {
        const g = ctx.createLinearGradient(0, tail * k, 0, head * k)
        g.addColorStop(0, 'rgba(205, 185, 153, 0)')
        g.addColorStop(0.6, `rgba(205, 185, 153, ${a})`)
        g.addColorStop(1, `rgba(205, 185, 153, ${a * 0.4})`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse((x + Math.sin(s * 2 + j) * 0.03) * k, ((head + tail) / 2) * k, (w / 2) * k, ((head - tail) / 2) * k, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // Where it lands, a low haze on the boards.
      if (head >= floor - 0.01) {
        p.noStroke()
        p.fill(alpha(p, ROOM.plasterShade, a * 0.9))
        p.ellipse(x * k, (floor - 0.06) * k, (0.35 + 0.5 * s) * k, (0.14 + 0.05 * s) * k)
      }
    }
  })
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
    const x = hx0 + dx
    let y = shelf
    let rot = 0
    // Every hit makes them jump a little and rock.
    for (let j = 0; j < HIT.length; j++) {
      const u = t - HIT[j]
      if (u < 0) continue
      const kick = (j === 3 ? 1 : 0.55) * (0.6 + 0.4 * hash(i, j))
      if (u < 0.35) y -= 0.05 * kick * Math.sin(Math.min(Math.PI, u * 9))
      rot += 0.12 * kick * (hash(i, j, 2) - 0.5) * 2 * ring(u, 0.36, 0.3)
    }
    p.push()
    p.translate(x * k, (y - ih / 2) * k)
    p.rotate(rot)
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
      p.pop()
      // The fire's light from the open door on the boards, gone when it shuts.
      if (open > 0.02) {
        const dx = ROOM_AT.door[0]
        const g = ROOM_AT.ground
        p.noStroke()
        p.fill(alpha(p, TOWN.fire, 0.22 * open))
        p.quad((dx - 0.47) * k, g * k, (dx + 0.47) * k, g * k, (dx + 1.6) * k, (g + 0.6) * k, (dx - 0.2) * k, (g + 0.6) * k)
      }

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
      p.push()
      p.translate((lx + (heldX - lx) * lifted) * k, (ly + (heldY - ly) * lifted) * k)
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
      dust(p, k, t, Math.min(f.y0, ROOM_AT.ceil) - 0.2)
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
    // A slow push in across the room with her, from the doorway's framing to her and him at the hearth.
    const x = (t: number) => laneAt(built.lane, Math.min(slot.end, t) - slot.begin).x + HEARTH_AT[0]
    const from = x(slot.begin) + 0.9
    const rest = x(slot.end)
    const along = (t: number) => from + (rest - from) * smooth(t, slot.begin, 243.3)
    const keys: [number, number, number, number][] = [
      [237.6, along(237.6), -0.72, 4.0],
      [239.4, along(239.4), -0.7, 3.85],
      [241.2, along(241.2), -0.64, 3.7],
      [242.5, along(242.5), -0.5, 3.5],
      // Low enough that the door's dial is wholly out of the top of the frame, never half on its edge.
      [243.45, rest, -0.4, 3.4],
      [slot.end, rest, -0.4, 3.4],
    ]
    return keys.map(([t, hx, hy, cells]): PartShot => ({ t, cells, hold: [fx(hx), hy], w: 1 }))
  },
)

/** Every strike of this part, in show seconds: the cut, the door blown shut, the bombs, her coming down, the lift. */
export const HEARTH_HITS: number[] = [T0, SLAM, HIT[2], JOLT, BUCK_DOWN, HIT[4], LIFT]
