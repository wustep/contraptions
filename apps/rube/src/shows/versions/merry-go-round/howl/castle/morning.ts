import type p5 from 'p5'
import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { box, carried, part, route, type Company, type PartShot, type Way } from '../kit'
import { drawCalcifer, drawDoor } from '../cast'
import { G } from '../physics'
import { FLOWERS, MARKL_SCALE, ROOM, TOWN } from '../worlds'
import { drawPan, drawTableTop, ROOM_AT, roomTone } from './room'
import { BELLOWS, calciferAt, dialAt, doorAt, doorJolt, LOG, MT, PAN, panAt, PULL, seatAt, STOOL, TABLE } from './morning-rig'
import { doorLeak, doorLight, drawBasket, drawEggs, drawPanEggs, gust, knockDust, licks, sparks, viewMeadow, viewNight, viewPorthaven, viewWar } from './morning-draw'

/**
 * The castle's morning (151.998 → 178.051): the door builder's. The flow's running notes, in the castle's one room.
 *
 * She steps in out of the night; the door bangs shut behind her. The room is dark but for the grate, where the fire
 * opens its eyes and flares at her (152.62, 152.87): Calcifer. The engine over the mantel coughs into life on the
 * running notes, a puff of steam a stroke (153.10, 153.57, 154.02, 154.50), and its belt snaps taut (154.27): the line
 * shaft under the ceiling turns. She climbs into the rocking chair by the fire (154.71) and rocks, and the rocking
 * works the bellows (155.23, 155.87, 156.51): Calcifer's breath. The pump gushes at the sink (155.00); the shaft winds
 * the shutters' cord until they fly open (156.10) and the morning floods in; Calcifer roars up (156.35).
 *
 * Two knocks (157.95, 158.31). Markl, asleep at the table, jumps down (158.53), leaps for the bell-pull, and the dial
 * clicks to blue (159.36): the door opens on Porthaven, the sea, a gull, a caller who bows. It closes; Markl runs
 * back to his seat (163.70) as the dial twitches, and whips round to black (163.83): the door flies open and Howl is
 * standing in it. Calcifer flares for him (164.14); Howl knocks the trolley's lever as he passes (164.61), the door
 * bangs behind him (165.05), and the trolley brings the pan along the ceiling and lets it down onto Calcifer, who
 * puffs up under it until Howl is beside him: then he bows his head (165.79). Sophie tosses the eggs from the basket
 * on her chair's arm; they crack on the rim (166.01, 166.47, 166.73, 167.44); Calcifer eats the shells, grumbling,
 * and gulps the last (167.90). The trolley lifts the pan (168.19) and carries it to the table; she gets down (168.62)
 * and follows it; it lands (170.89) in front of Markl. She is up on her stool (172.33); they eat. Howl pulls the
 * bell-pull and the dial sweeps back to green (174.72), the meadow's light round the door's edges; she gets down
 * (175.28) and they go to the door together; the latch (177.42) and it flies open on the flower fields; they step
 * through on the slow waltz's hit (178.051, the field's).
 *
 * Coordinates in this file are the ROOM's cells (the rig's), turned into the part's frame (`MORNING_AT` to the right)
 * only for the lane, the company and the camera; drawing translates once.
 */

/** Where the room leg starts in the room world (the part's own origin): Sophie comes in at the door. */
export const MORNING_AT: Pt = [0.8, 0]
const OX = MORNING_AT[0]
const toPart = ([x, y]: Pt): Pt => [x - OX, y]

/** Every strike of this part, in show seconds. */
export const MORNING_HITS: number[] = [
  MT.in,
  MT.shut0,
  MT.eyes,
  MT.flare,
  ...MT.strokes,
  MT.belt,
  MT.seat,
  MT.pump,
  ...MT.puffs,
  MT.shutters,
  MT.roar,
  MT.knock,
  MT.knock2,
  MT.marklDown,
  MT.blue,
  MT.marklUp,
  MT.black,
  MT.howlFlare,
  MT.lever,
  MT.shut1,
  MT.bow,
  ...MT.eggs,
  MT.gobble,
  MT.lift,
  MT.down,
  MT.table,
  MT.stool,
  MT.green,
  MT.hopdown,
  MT.latch,
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the paths (room cells) */

const arcFor = (T: number) => (G * T * T) / 8
/** Markl's centre on the floor, and on the bench behind the table. */
const M_FLOOR = ROOM_AT.ground - 0.13 * MARKL_SCALE
const M_SEAT = TABLE.top
const SOPHIE_STOOL: Pt = [STOOL.x, STOOL.seat - 0.13]
/** When she climbs out of the chair. */
const LEAVE = 168.25
/** When Howl is first in the room: behind the shut door, just before it flies open. */
const HOWL_FROM = 163.45

/**
 * A run along the floor from `from` to `x1` in `T` seconds: speed `v0` at the start to `vMid`, then down to `v1`
 * (magnitudes), as two ramps whose lengths meet the time exactly.
 */
function run(from: Way, x1: number, T: number, v0: number, vMid: number, v1: number): Way[] {
  const y = from.p[1]
  const dist = Math.abs(x1 - from.p[0])
  const s = Math.sign(x1 - from.p[0]) || 1
  const d1 = (T - (2 * dist) / (vMid + v1)) / (2 / (v0 + vMid) - 2 / (vMid + v1))
  const d2 = dist - d1
  if (!(d1 > 0 && d2 > 0)) return [{ at: from.at + T, p: [x1, y], ramp: [v0, Math.max(0, (2 * dist) / T - v0)] }]
  return [
    { at: from.at + d1 / ((v0 + vMid) / 2), p: [from.p[0] + s * d1, y], ramp: [v0, vMid] },
    { at: from.at + T, p: [x1, y], ramp: [vMid, v1] },
  ]
}

interface Paths {
  sophie: Seg[]
  markl: Lane
  howl: Lane
}

function paths(begin: number): Paths {
  const r = (t: number) => t - begin
  /* Sophie: in, stopped by the fire's eyes, into the chair; out of it after the eggs, to the table; to the door. */
  const A: Way = { at: r(MT.in), p: [0.3, 0] }
  const B: Way = { at: r(MT.flare), p: [0.3 + (0.6 * (MT.flare - MT.in)) / 2, 0], ramp: [0.6, 0] }
  const C: Way = { at: r(153.35), p: B.p }
  const D: Way = { at: r(154.33), p: [1.28, 0], ease: 'inout' }
  const E: Way = { at: r(MT.seat), p: seatAt(MT.seat), arc: arcFor(MT.seat - 154.33) }
  const seat1 = seatAt(LEAVE)
  const F: Way = { at: r(MT.down), p: [1.0, 0], arc: arcFor(MT.down - LEAVE) }
  const hopVx = Math.abs(F.p[0] - seat1[0]) / (MT.down - LEAVE)
  const walk = run(F, -1.5, 171.95 - MT.down, hopVx * 0.7, 1.0, 0)
  // Up onto the stool: a climb, eased from rest to rest, not a leap.
  const H: Way = { at: r(MT.stool), p: SOPHIE_STOOL, arc: 0.12, ease: 'inout' }
  const nod: Pt = [SOPHIE_STOOL[0] - 0.035, SOPHIE_STOOL[1] + 0.012]
  const nods: Way[] = [
    { at: r(173.05), p: nod, ease: 'inout' },
    { at: r(173.6), p: SOPHIE_STOOL, ease: 'inout' },
    { at: r(174.25), p: nod, ease: 'inout' },
    { at: r(174.93), p: SOPHIE_STOOL, ease: 'inout' },
  ]
  // Down off the stool (a push-off from rest that gathers speed: eased in, so she lands moving right at twice its
  // mean pace), and on to the door, easing to the walk she crosses it at (0.6).
  const Th = MT.hopdown - 174.93
  const Tk = MT.out - MT.hopdown
  const v0 = (0.3 - SOPHIE_STOOL[0] - 0.3 * Tk) / ((Th + Tk) / 2)
  const J: Way = { at: r(MT.hopdown), p: [SOPHIE_STOOL[0] + (v0 * Th) / 2, 0], arc: 0.1, ease: 'in' }
  const K: Way = { at: r(MT.out), p: [0.3, 0], ramp: [v0, 0.6] }
  const sophie: Seg[] = [
    ...route([A, B, C, D, E]),
    ...carried(seatAt, MT.seat, LEAVE, Math.round((LEAVE - MT.seat) * 30)),
    ...route([{ at: r(LEAVE), p: seat1 }, F, ...walk, H, ...nods, J, K]),
  ]

  /* Markl: asleep behind the table; the knocks; the bell-pull; the door; back to his seat; breakfast. */
  const m0: Pt = [-2.42, M_SEAT]
  const markl: Way[] = [
    { at: r(MT.in), p: m0 },
    { at: r(153.3), p: [m0[0], M_SEAT + 0.008], ease: 'inout' },
    { at: r(154.6), p: m0, ease: 'inout' },
    { at: r(155.9), p: [m0[0], M_SEAT + 0.008], ease: 'inout' },
    { at: r(157.2), p: m0, ease: 'inout' },
    { at: r(MT.knock), p: m0 },
    { at: r(158.078), p: [m0[0], M_SEAT - 0.045], ease: 'out' },
  ]
  const mHop = MT.marklDown - 158.078
  markl.push({ at: r(MT.marklDown), p: [-1.6, M_FLOOR], arc: arcFor(mHop) })
  const mLandV = (-1.6 - m0[0]) / mHop
  const mTug = 158.96
  const mRunEnd = -1.05
  const mRunV1 = (2 * (mRunEnd + 1.6)) / (mTug - MT.marklDown) - mLandV
  markl.push({ at: r(mTug), p: [mRunEnd, M_FLOOR], ramp: [mLandV, mRunV1] })
  const mTugT = MT.blue - mTug
  const mAfter: Pt = [mRunEnd + mRunV1 * mTugT, M_FLOOR]
  markl.push({ at: r(MT.blue), p: mAfter, arc: arcFor(mTugT) })
  const mStop = mAfter[0] + (mRunV1 * 0.5) / 2
  markl.push(
    { at: r(MT.blue + 0.5), p: [mStop, M_FLOOR], ramp: [mRunV1, 0] },
    { at: r(160.2), p: [mStop, M_FLOOR] },
    { at: r(160.75), p: [0.1, M_FLOOR], ease: 'inout' },
    { at: r(161.3), p: [0.1, M_FLOOR] },
    { at: r(161.47), p: [0.12, M_FLOOR - 0.05], ease: 'out' },
    { at: r(161.66), p: [0.1, M_FLOOR], ease: 'in' },
    { at: r(162.0), p: [0.1, M_FLOOR] },
    { at: r(162.4), p: [-0.38, M_FLOOR], ease: 'inout' },
    { at: r(163.31), p: [-1.6, M_FLOOR], ease: 'inout' },
  )
  const mUpT = MT.marklUp - 163.31
  markl.push({ at: r(MT.marklUp), p: [-2.22, M_SEAT], arc: arcFor(mUpT) })
  const mSlideV = 0.62 / mUpT
  markl.push({ at: r(MT.marklUp + 0.4 / mSlideV), p: m0, ramp: [mSlideV, 0] })
  // At the table: a lean to watch the eggs; a bounce as the pan comes down to him; eating; a goodbye.
  const lean = (at: number, dx: number, dy = 0): Way => ({ at: r(at), p: [m0[0] + dx, M_SEAT + dy], ease: 'inout' })
  markl.push(
    lean(166.2, 0.05, -0.01),
    lean(167.8, 0.05, -0.01),
    lean(168.4, 0),
    lean(170.2, 0, -0.03),
    lean(170.6, 0),
    lean(MT.table + 0.18, 0, -0.06),
    lean(MT.table + 0.42, 0),
    lean(171.9, -0.06, 0.01),
    lean(172.3, 0),
    lean(173.1, -0.06, 0.01),
    lean(173.5, 0),
    lean(174.2, -0.06, 0.01),
    lean(174.6, 0),
    lean(176.1, -0.06, 0.01),
    lean(176.5, 0),
    lean(177.1, 0.02, -0.04),
    lean(177.35, 0.02),
    lean(177.6, 0.02, -0.04),
    lean(177.85, 0),
    { at: r(MT.out), p: m0 },
  )

  /* Howl: behind the door as it flies open; across the room, knocking the lever; beside Calcifer; to the table. */
  const h0: Pt = [0.3, 0]
  const howl: Way[] = [
    { at: r(HOWL_FROM), p: h0 },
    { at: r(MT.black), p: h0 },
    { at: r(MT.black + 0.8), p: [0.92, 0], ramp: [0, 1.55] },
  ]
  howl.push(...run(howl[howl.length - 1], 2.35, MT.bow - (MT.black + 0.8), 1.55, 1.6, 0))
  howl.push(
    { at: r(168.9), p: [2.35, 0] },
    { at: r(172.2), p: [PULL.x, 0], ease: 'inout' },
    { at: r(MT.green - 0.337), p: [PULL.x, 0] },
    { at: r(MT.green), p: [PULL.x, 0], arc: arcFor(0.337) },
  )
  return { sophie, markl: { segs: route(markl), fire: 0 }, howl: { segs: route(howl), fire: 0 } }
}

const smoothstep = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ what is through the door */

type Box = { x0: number; y0: number; x1: number; y1: number }
interface View {
  draw: (p: p5, k: number, W: number, ink: string, b: Box, t: number) => void
  light: string
  glow: number
}

/** What is through the door at `t`, and the light it lets in. */
function viewOf(t: number): View | null {
  if (t < MT.shut0 + 0.05) return { draw: (p, k, _W, _i, b, u) => viewNight(p, k, b, u), light: TOWN.night, glow: 0.12 }
  if (t > 159.4 && t < 163.1) return { draw: viewPorthaven, light: TOWN.canal, glow: 0.22 }
  if (t > MT.black - 0.05 && t < MT.shut1 + 0.05) return { draw: (p, k, _W, _i, b, u) => viewWar(p, k, b, u), light: TOWN.ember, glow: 0.14 }
  if (t > MT.latch - 0.05) return { draw: (p, k, _W, _i, b, u) => viewMeadow(p, k, b, u), light: FLOWERS.yellow, glow: 0.24 }
  return null
}

/* ------------------------------------------------------------------ the part */

export const morning = part<{ begin: number }>(
  {
    name: 'morning',
    draw: (p, _s, c) => {
      const T = MT.in + c.t
      if (T < MT.in - 2.5 || T > MT.out + 0.2) return
      const { k, weight: W } = c
      const X = (v: number) => v * k
      const { tone, ink } = roomTone(T, c.ink)
      p.push()
      p.translate(-OX * k, 0)
      p.rectMode(p.CORNER)
      // The door, and what is through it.
      const [dx, dy] = ROOM_AT.door
      const open = doorAt(T)
      const view = viewOf(T)
      p.push()
      p.translate(X(dx + doorJolt(T)), X(dy))
      drawDoor(p, k, W, ink, {
        open,
        dial: dialAt(T),
        wood: tone(ROOM.wood),
        woodDark: tone(ROOM.woodDark),
        view: view ? (q, b) => view.draw(q, k, W, ink, b, T) : undefined,
      })
      p.pop()
      if (view) doorLight(p, k, dx, dy, open, view.light, view.glow)
      // The knocks shake the dust of years off the lintel.
      for (const [at, n] of [[MT.knock, 4], [MT.knock2, 3]] as const) knockDust(p, k, T, at, n, dx, dy - 2.1)
      if (T > MT.green && T < MT.latch + 0.2 && open < 0.05) doorLeak(p, k, W, dx, dy, FLOWERS.yellow, Math.min(1, (T - MT.green) / 0.8))
      // The bellows' breath, and the sparks off the fire.
      for (const at of MT.puffs) gust(p, k, T, at, [BELLOWS.tip, ROOM_AT.ground - 0.09])
      sparks(p, k, T, MT.in, 5, 0.6)
      sparks(p, k, T, MT.flare, 9, 1.2)
      for (const at of MT.puffs) sparks(p, k, T, at, 4, 0.8)
      sparks(p, k, T, MT.roar, 16, 1.8)
      sparks(p, k, T, MT.howlFlare, 8, 1.2)
      // Calcifer on his log: bowing under the pan, he squashes. While the pan is on him his flames go up round its
      // sides, never through it: he is drawn clipped out of the column over the pan, and two licks curl up at its rim.
      const cal = calciferAt(T)
      const pan = panAt(T)
      const onHim = pan.on === 'fire'
      const ctx = p.drawingContext as CanvasRenderingContext2D
      p.push()
      if (onHim) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(X(LOG[0] - 3), X(LOG[1] - 3), X(6), X(6))
        ctx.rect(X(pan.x - PAN.r * 1.02), X(LOG[1] - 3), X(PAN.r * 2.04), X(pan.y - (LOG[1] - 3)))
        ctx.clip('evenodd')
      }
      p.translate(X(LOG[0]), X(LOG[1]))
      p.scale(1 + (1 - cal.squash) * 0.45, cal.squash)
      drawCalcifer(p, k, W, c.ink, { t: T, size: cal.size, look: cal.look, mouth: cal.mouth, shut: cal.shut })
      if (onHim) ctx.restore()
      p.pop()
      // The pan, while it is down at the fire, is on his head: in front of his flames (the room drew it behind).
      if (Math.abs(pan.x - LOG[0]) < 0.6 && pan.y > -1.9) {
        if (onHim) licks(p, k, T, pan.x, pan.y, cal.size)
        drawPan(p, k, W, ink, tone, pan.x, pan.y, pan.tilt, true)
      }
      // Breakfast.
      drawBasket(p, k, W, ink, tone, T)
      drawPanEggs(p, k, W, ink, T)
      drawEggs(p, k, W, ink, T)
      p.pop()
    },
    over: (p, _s, c) => {
      const T = MT.in + c.t
      if (T < MT.in - 0.5 || T > MT.out + 0.2) return
      const { k, weight: W } = c
      const X = (v: number) => v * k
      const { tone, ink } = roomTone(T, c.ink)
      p.push()
      p.translate(-OX * k, 0)
      // Markl sits behind the table: its top is in front of him.
      if (T < 158.2 || T > MT.marklUp - 0.2) drawTableTop(p, k, W, ink, tone)
      // Howl behind the door until it opens: the leaf is in front of him.
      if (T > 163.4 && T < MT.black + 0.3) {
        const [dx, dy] = ROOM_AT.door
        p.push()
        p.translate(X(dx), X(dy))
        drawDoor(p, k, W, ink, { open: doorAt(T), dial: dialAt(T), wood: tone(ROOM.wood), woodDark: tone(ROOM.woodDark) })
        p.pop()
      }
      p.pop()
    },
  },
  (slot) => {
    const P = paths(slot.begin)
    const lane: Lane = { segs: P.sophie.map((s) => ({ ...s, from: toPart(s.from), to: toPart(s.to) })), fire: MT.flare - slot.begin }
    const sophieRoom: Lane = { segs: P.sophie, fire: 0 }
    const marklAt = (t: number) => {
      const q = laneAt(P.markl, t - slot.begin)
      return { x: q.x - OX, y: q.y, scale: MARKL_SCALE }
    }
    // From the bell-pull he waits for her by the door, then walks with her, a step ahead, into the light.
    const a = PULL.x
    const beside = (u: number) => {
      const b = laneAt(sophieRoom, u - slot.begin).x + 0.36
      const e = 0.25 * (1 - smoothstep(u, 177.3, 178.0))
      return (a + b + Math.sqrt((a - b) * (a - b) + e * e)) / 2
    }
    const lift = beside(MT.green) - a
    const howlAt = (t: number) => {
      const scale = 0.02 + 0.98 * smoothstep(t, 163.5, 163.6)
      if (t < MT.green) {
        const q = laneAt(P.howl, t - HOWL_FROM)
        return { x: q.x - OX, y: q.y, scale }
      }
      return { x: beside(t) - lift * (1 - smoothstep(t, 175.3, 176.8)) - OX, y: 0, scale: 1 }
    }
    const company: Company[] = [
      { who: 'markl', from: slot.begin, to: slot.end, at: marklAt },
      { who: 'howl', from: HOWL_FROM, to: slot.end, at: howlAt },
    ]
    return { cells: box(-6.5, -5.5, 12.5, 2), exit: [0, 0] as Pt, lane, state: { begin: slot.begin }, company }
  },
  () => shots(),
)

/* ------------------------------------------------------------------ the camera (room cells, moved into the part's frame) */

function shots(): PartShot[] {
  const k = (t: number, x: number, y: number, cells: number): PartShot => ({ t, cells, hold: [x - OX, y] })
  return [
    // The dark room (the camera comes in with her through the door and settles as she stops): up to the engine as it coughs into life.
    k(154.0, 1.9, -1.2, 4.8),
    // The machine running: engine, shaft, the shutters; the chair.
    k(155.3, 2.7, -1.75, 6.2),
    // The morning floods in.
    k(156.4, 3.0, -1.85, 6.5),
    k(157.6, 2.6, -1.8, 6.4),
    // The knocks: across to the table and the door; Markl.
    k(158.5, 0.4, -1.4, 5.6),
    k(159.9, 0.3, -1.25, 5.0),
    // Porthaven.
    k(161.4, 0.6, -1.2, 4.8),
    k(162.8, 0.4, -1.2, 5.0),
    // Howl at the door, and across to the fire.
    k(163.8, 1.1, -1.15, 5.0),
    k(165.0, 1.8, -0.95, 4.6),
    // Breakfast on Calcifer.
    k(166.0, 2.05, -0.78, 3.9),
    k(167.6, 2.1, -0.76, 3.7),
    // The pan goes up and away to the table; she follows it.
    k(168.5, 1.7, -1.2, 4.6),
    k(169.8, -0.1, -1.4, 5.2),
    k(171.3, -1.4, -0.92, 4.6),
    // The three of them at the table.
    k(173.1, -2.0, -0.72, 3.5),
    // Howl at the bell-pull: the dial to green.
    k(174.6, -0.9, -1.05, 4.4),
    k(176.2, -0.1, -0.8, 4.2),
    // Out, into the light: the camera lets go of the room and goes with them through the door.
    { t: MT.out, cells: 4.0, off: [0.9, -0.7] },
  ]
}
