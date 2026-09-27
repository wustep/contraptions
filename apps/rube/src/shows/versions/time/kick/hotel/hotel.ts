import type p5 from 'p5'
import { R, type Pt, type Seg } from '../../../../../parts'
import { rgba, sink, tear } from '../cast'
import { box, carried, frame, part, scenery, type Company, type Ctx, type PartShot } from '../kit'
import { ORIGIN, exitFor, local } from '../stack'
import { HOTEL, SLEEP } from '../worlds'
import { C, drawHotel, type Pen } from './hotel-draw'
import { add, B, BURST, cabinY, CAB, DRUM, drumAngle, drumLean, fallAt, hotelAt, liftAt, roll, rot, ss, T, TEARS, WHO, type Who } from './hotel-geo'

/**
 * HOTEL: level 2 of the stacked dream, Arthur's hotel (the HOTEL builder's). Two parts and the standing set.
 *
 * `hotel` (91.824 → 122.294, the brass). Out of the dark on the brass's downbeat the three of them sink through the
 * roof and land on the top floor's carpet (beat 97); Cobb leads Fischer along the corridor (Mr. Charles) into the
 * drum, the corridor's turning section seen end-on, and they stop in it. On bar 25 its brake comes off and it turns
 * with the van flipping on the bridge above: the camera turns with it, so the room stands still and gravity swings
 * round: the floor tips and they slide into its corner (the half after beat 101), run up its wall (beat 103 to bar
 * 26), across its ceiling (beat 105 to 106) and down the other wall (beat 107 to bar 27). A cut up to the van (beat
 * 109) coming down out of its flip onto its wheels (beat 110) and on to the bridge's broken end; a cut back on bar 28
 * as it goes off: the hotel is weightless. Cobb pushes off (the half after 112) and they drift out of the drum as it
 * lurches, along the corridor through the waiting lift, over the room-service trolley (Cobb knocks its bottle loose on
 * bar 29) into the corner suite, where the sleepers float tied together, and come to rest against Arthur's line on
 * bar 30. The carpet goes soft under them; drawn down through the floor, out of the ceiling below on bar 31, through
 * the room, the lobby and the footings into the dark on the swell (122.294).
 *
 * `lift` (191.669 → 199.585, the summit). Up out of the dark at 20 cells a second, through the pit's floor (a tear on
 * beat 201), up the shaft and through the floor of the cabin waiting at the top floor, where the line across it
 * catches them and draws them down; Arthur arms his plunger (193.754); on bar 51 the charges on the cables blow and
 * drive the cabin down the shaft, past the middle floor's landing on the half-beat (197.057); on bar 52 it slams into
 * the pit (the hotel's kick) and they are thrown straight up through its roof, the shaft and the hotel's roof (beat
 * 209) into the dark, crossing into the rain at 199.585.
 */

/* ------------------------------------------------------------------ the set */

const pen = (p: p5, c: Ctx): Pen => ({ p, c: p.drawingContext as CanvasRenderingContext2D, k: c.k, w: c.weight, ink: c.ink })

export const hotelSet = scenery<null>({
  name: 'hotel-set',
  draw: (p, _s, c) => {
    const f = frame(p, c.k)
    p.push()
    drawHotel(pen(p, c), f, c.t)
    p.pop()
  },
})
export const HOTEL_CELLS: Pt[] = box(-62, B.band - 1, 72, B.foot + 1, 3)

/* ------------------------------------------------------------------ strikes and the roll */

export const HOTEL_HITS: number[] = [
  T.in,
  T.roof,
  T.land,
  T.stop,
  T.turn,
  T.fr,
  T.run2,
  T.rc,
  T.run3,
  T.cl,
  T.run4,
  T.lf,
  T.away,
  T.level,
  T.off,
  T.push,
  T.knock,
  T.catch,
  T.emerge,
  T.out,
  T.pit,
  TEARS.floor.t,
  T.arm,
  T.blast,
  T.pass,
  T.slam,
  T.roofUp,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

/** The camera's roll with the corridor as it turns (radians, clockwise); 0 outside the hotel's turn. */
export const hotelRoll = (t: number): number => roll(t)

/* ------------------------------------------------------------------ lanes */

const STEP = 1 / 60
function laneOf(at: (t: number) => Pt, origin: Pt, begin: number, end: number, breaks: number[]): Seg[] {
  const bs = [...new Set([begin, ...breaks.filter((b) => b > begin + 1e-9 && b < end - 1e-9), end])].sort((a, b) => a - b)
  const segs: Seg[] = []
  for (let i = 0; i + 1 < bs.length; i++) {
    const a = bs[i] - begin
    const b = bs[i + 1] - begin
    segs.push(...carried((s) => local(origin, at(begin + s)), a, b, Math.max(1, Math.ceil((b - a) / STEP))))
  }
  return segs
}
const companyOf = (who: Exclude<Who, 'cobb'>, from: number, to: number, origin: Pt, at: (w: Who, t: number) => Pt): Company => ({
  who,
  from,
  to,
  at: (t) => {
    const [x, y] = local(origin, at(who, Math.max(from, Math.min(to, t))))
    return { x, y }
  },
})

/* ------------------------------------------------------------------ the parts' own drawing: going through surfaces */

interface State {
  begin: number
}
/** A patch of a slab drawn over the ball where it is inside it, so it goes into the surface and comes out of the other. */
function patch(g: Pen, x: number, y0: number, y1: number, fill: string, top: string | null): void {
  const { c, k } = g
  c.fillStyle = fill
  c.fillRect((x - 0.5) * k, y0 * k, 1.0 * k, (y1 - y0) * k)
  if (top) {
    c.fillStyle = top
    c.fillRect((x - 0.5) * k, y0 * k, 1.0 * k, 0.09 * k)
  }
  feather(g, x - 0.5, x + 0.5, y0, y1)
  c.strokeStyle = g.ink
  c.lineWidth = g.w * 0.8
  c.beginPath()
  c.moveTo((x - 0.5) * k, y0 * k)
  c.lineTo((x + 0.5) * k, y0 * k)
  c.moveTo((x - 0.5) * k, y1 * k)
  c.lineTo((x + 0.5) * k, y1 * k)
  c.stroke()
}
/**
 * The dark of sleep's feather over a patch near the band's edges, as the director's `sleep` draws it over the set
 * (the patches are drawn after it): so a patch of the roof or the footings is as dark as the slab round it.
 */
function feather(g: Pen, x0: number, x1: number, y0: number, y1: number): void {
  const { c, k } = g
  for (const [from, to] of [[B.band + FEATHER, B.band], [B.foot - FEATHER, B.foot]] as const) {
    const a = Math.max(y0, Math.min(from, to))
    const b = Math.min(y1, Math.max(from, to))
    if (b <= a) continue
    const gr = c.createLinearGradient(0, from * k, 0, to * k)
    gr.addColorStop(0, rgba(SLEEP.mid, 0))
    gr.addColorStop(1, rgba(SLEEP.mid, 0.96))
    c.fillStyle = gr
    c.fillRect(x0 * k, a * k, (x1 - x0) * k, (b - a) * k)
  }
}
const FEATHER = 1.4

/** When `who`'s centre is at `y` on a monotone stretch of a path, found by bisection. */
function whenAt(f: (t: number) => number, y: number, t0: number, t1: number): number {
  let a = t0
  let b = t1
  const up = f(t1) < f(t0)
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    if (up ? f(m) > y : f(m) < y) a = m
    else b = m
  }
  return (a + b) / 2
}

/** The slabs they sink through on the way down, and when each passes each face. */
const SLABS: { y0: number; y1: number; fill: string; top: string | null }[] = [
  { y0: B.top, y1: B.slab, fill: C.concrete, top: HOTEL.carpet },
  { y0: B.mid, y1: B.slab2, fill: C.concrete, top: HOTEL.carpetDark },
  { y0: B.lobby, y1: B.foot, fill: C.concreteDark, top: HOTEL.marble },
]
const DOWN_TIMES = WHO.map((who) => {
  const y = (t: number) => hotelAt(who, t)[1]
  return {
    who,
    roof: { enter: fallAt(who, B.roof - R), through: fallAt(who, B.roof + R), under: fallAt(who, B.ceil - R), out: fallAt(who, B.ceil + R) },
    slabs: SLABS.map((s) => ({
      enter: whenAt(y, s.y0 - R, T.catch, T.out + 0.5),
      through: whenAt(y, s.y0 + R, T.catch, T.out + 0.5),
      under: whenAt(y, s.y1 - R, T.catch, T.out + 0.5),
      out: whenAt(y, s.y1 + R, T.catch, T.out + 0.5),
    })),
  }
})

function hotelOver(g: Pen, t: number): void {
  for (const d of DOWN_TIMES) {
    // Into the roof: the dark opens in it, and in the ceiling under it as they come through.
    const x = hotelAt(d.who, d.roof.enter)[0]
    if (t > d.roof.enter - 0.1 && t < d.roof.out + 0.05) patch(g, hotelAt(d.who, t)[0], B.roof, B.ceil, C.concrete, null)
    sink(g.p, g.k, [x, B.roof], t - d.roof.enter, d.roof.through - d.roof.enter, 0.7)
    sink(g.p, g.k, [hotelAt(d.who, d.roof.under)[0], B.ceil], t - d.roof.under, d.roof.out - d.roof.under, 0.6)
    // Down through the floors.
    d.slabs.forEach((s, i) => {
      const sl = SLABS[i]
      const px = hotelAt(d.who, s.enter)[0]
      if (t > s.enter - 0.1 && t < s.out + 0.05) patch(g, hotelAt(d.who, t)[0], sl.y0, sl.y1, sl.fill, sl.top)
      sink(g.p, g.k, [px, sl.y0], t - s.enter, s.through - s.enter, 0.75)
      if (i < 2) sink(g.p, g.k, [px, sl.y1], t - s.under, s.out - s.under, 0.6)
    })
  }
}

function liftOver(g: Pen, t: number): void {
  for (const who of WHO) {
    const p = liftAt(who, t)
    const x = p[0]
    const dy = who === 'cobb' ? 0 : 0.35 / 20
    // Up through the pit's floor.
    if (t > TEARS.pit.t + dy - 0.05 && t < TEARS.pit.t + dy + 0.06) patch(g, x, B.lobby, B.foot, C.concreteDark, HOTEL.marble)
    // Up through the cabin's floor.
    if (t > BURST[who] - 0.03 && t < BURST[who] + 0.03) patch(g, x, B.top, B.top + 0.12, HOTEL.brass, HOTEL.carpet)
    // The kick: up through the cabin's roof and, at the top of the shaft, the hotel's.
    const cy = cabinY(t)
    const roofY = cy - CAB[1]
    if (t > T.slam && p[1] < roofY + 0.2 && p[1] > roofY - 0.3) patch(g, x, roofY - 0.1, roofY + 0.02, HOTEL.brass, null)
    if (t > T.slam && p[1] < B.ceil + R + 0.02 && p[1] > B.roof - R - 0.02) patch(g, x, B.roof, B.ceil, C.concrete, null)
    const lag = who === 'cobb' ? 0 : 0.35 / 19
    tear(g.p, g.k, [x, B.lobby], t - TEARS.pit.t - dy, 0.8, HOTEL.lamp)
    tear(g.p, g.k, [x, B.top], t - BURST[who], 0.7, HOTEL.lamp)
    tear(g.p, g.k, [x, TEARS.cabinRoof.at[1]], t - TEARS.cabinRoof.t - lag, 0.7, HOTEL.lamp)
    tear(g.p, g.k, [x, B.roof], t - TEARS.roof.t - lag, 0.9, HOTEL.lamp)
  }
}

/* ------------------------------------------------------------------ the hotel */

const HOTEL_BREAKS = [T.land, T.go, T.stop, T.turn, T.fr, T.run2, T.rc, T.run3, T.cl, T.run4, T.lf, T.off, T.push, T.knock, T.catch, T.emerge]
const Lh = (p: Pt): Pt => local(ORIGIN.hotel, p)

export const hotel = part<State>(
  {
    name: 'hotel',
    draw: () => {},
    over: (p, s, c) => {
      const g = pen(p, c)
      p.push()
      g.c.save()
      g.c.translate(-ORIGIN.hotel[0] * c.k, -ORIGIN.hotel[1] * c.k)
      hotelOver(g, s.begin + c.t)
      g.c.restore()
      p.pop()
    },
  },
  (slot) => {
    const segs = laneOf((t) => hotelAt('cobb', t), ORIGIN.hotel, slot.begin, slot.end, HOTEL_BREAKS)
    return {
      cells: box(-3, -2, 23, 26, 2),
      exit: exitFor(ORIGIN.hotel, ORIGIN.snow),
      lane: { segs, fire: T.land - slot.begin },
      state: { begin: slot.begin },
      company: [companyOf('ariadne', slot.begin, slot.end, ORIGIN.hotel, hotelAt), companyOf('fischer', slot.begin, slot.end, ORIGIN.hotel, hotelAt)],
    }
  },
  (slot) => {
    const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
    const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: Lh(at), w: 1, ...(cut ? { cut } : {}) })
    const keys: PartShot[] = [
      // Down through the roof, looking into the corridor under it; landed, looking along it.
      follow(92.35, 5.8, [0.3, 0.7]),
      follow(93.2, 5.25, [1.25, -0.72]),
      // The drum: close, the camera turning with it (a point fixed in the drum's own frame, leaning toward the three
      // of them, so the room holds still on the screen while gravity swings round it and they run round its walls).
      ...drumKeys(),
      // Cut up to the van on bar 27: steeply over in the air above the deck, coming round, down on its wheels
      // (beat 110) and rolling to the broken end.
      hold(T.away, 5.2, [-2.95, -1.35], true),
      hold(105.17, 4.95, [-2.0, -1.05]),
      hold(106.95, 4.7, [-0.75, -0.95]),
      // Cut back: weightless. The drum, and the corridor they will drift along.
      hold(T.off, 5.4, [DRUM[0] + 0.7, DRUM[1] + 0.15], true),
      follow(108.8, 5.4, [0.75, -0.3]),
      follow(111.6, 5.6, [0.85, -0.3]),
      // The suite: the sleepers, the line, the three of them come to rest.
      hold(113.7, 6.0, [10.6, 20.05]),
      hold(116.5, 5.1, [10.35, 20.45]),
      // Down with them through the floors into the dark.
      follow(118.7, 6.2, [0.15, 0.85]),
      follow(121.8, 6.6, [0.1, 1.0]),
    ]
    return keys.filter((k) => k.t > slot.begin && k.t <= slot.end + 1e-6)
  },
)

/** Hold keys a tenth of a second apart through the drum's turn, each a point of the drum's own frame (leaning half way
 * from its middle toward the three of them) carried round with it. */
const LEAN = 0.5
function drumKeys(): PartShot[] {
  const out: PartShot[] = []
  for (let t = 95.0; t < T.away - 0.06; t += 0.1) {
    const [lx, ly] = drumLean(t)
    const at = add(DRUM, rot(drumAngle(t), [lx * LEAN, ly * LEAN]))
    const cells = 4.5 - 0.3 * ss((t - 95.0) / 3)
    out.push({ t, cells, hold: Lh(at), w: 1 })
  }
  return out
}

/* ------------------------------------------------------------------ the lift */

const LIFT_BREAKS = [T.pit, BURST.cobb, T.blast, T.pass, T.slam]
const Ll = (p: Pt): Pt => local(ORIGIN.lift, p)

export const lift = part<State>(
  {
    name: 'lift',
    draw: () => {},
    over: (p, s, c) => {
      const g = pen(p, c)
      p.push()
      g.c.save()
      g.c.translate(-ORIGIN.lift[0] * c.k, -ORIGIN.lift[1] * c.k)
      liftOver(g, s.begin + c.t)
      g.c.restore()
      p.pop()
    },
  },
  (slot) => {
    const segs = laneOf((t) => liftAt('cobb', t), ORIGIN.lift, slot.begin, slot.end, LIFT_BREAKS)
    return {
      cells: box(-3, -26, 2, 2, 1),
      exit: exitFor(ORIGIN.lift, ORIGIN.river),
      lane: { segs, fire: T.blast - slot.begin },
      state: { begin: slot.begin },
      company: [companyOf('ariadne', slot.begin, slot.end, ORIGIN.lift, liftAt), companyOf('fischer', slot.begin, slot.end, ORIGIN.lift, liftAt)],
    }
  },
  (slot) => {
    const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
    const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: Ll(at), w: 1 })
    const keys: PartShot[] = [
      // Up the shaft with them (the follow leads them, so it is held back under them), into the cabin.
      follow(192.05, 8.0, [0, 1.4]),
      follow(192.4, 7.0, [0, 0.35]),
      hold(193.2, 5.2, [0.12, 20.05]),
      // In on the cabin, the charges on its cables and Arthur at his plunger, drifting over to him.
      hold(194.25, 4.5, [0.3, 20.02]),
      hold(T.blast, 4.55, [0.36, 20.02]),
      // With the cabin down the shaft; onto the pit with it as it slams; then up after them.
      follow(195.4, 5.4, [0, -0.5]),
      follow(197.5, 5.8, [0, -0.3]),
      hold(198.1, 6.0, [0, 34.1]),
      hold(T.slam, 6.0, [0, 35.0]),
      follow(198.95, 6.7, [0, 1.5]),
      follow(T.up, 7.3, [0, 1.1]),
    ]
    return keys.filter((k) => k.t > slot.begin && k.t <= slot.end + 1e-6)
  },
)
