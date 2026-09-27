import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { follower } from '../camera'
import { sink, tear } from '../cast'
import { box, carried, part, type Company, type Ctx, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { ORIGIN, RAIN_GEO, SPLASH, exitFor, vanAt } from '../stack'
import type { Pen } from './rain-city'
import {
  BED_AT,
  C_END,
  MAL_AT,
  MAL_FROM,
  MAL_TO,
  RAIN_AT,
  RISE,
  SEAT_U,
  SEAT_V,
  SINK_AT,
  START,
  SURFACE_AT,
  T_A_IN,
  T_A_UP,
  T_BURST,
  T_C_IN,
  T_C_OUT,
  T_C_UP_HOP,
  T_CAR1,
  T_CAR2,
  T_CASE,
  T_DROP,
  T_F_IN,
  T_F_UP,
  T_F_UP_HOP,
  T_FLICKER,
  T_GO,
  T_HIT,
  T_IMPACT,
  T_JOINT,
  T_LAMP,
  T_LAND,
  T_PUDDLES,
  T_RIVER,
  T_SINK,
  T_SLAM,
  T_TAXI_DOOR,
  T_TAXI_STOP,
  UNDER,
  WAKE,
  ariadneRain,
  ariadneRiver,
  cobbRain,
  cobbRiver,
  fischerRain,
  fischerRiver,
  vanPoint,
  vanPose,
} from './rain-geo'
import { plume } from './rain-water'

export { RAIN_AT }
export { rainSet, RAIN_CELLS } from './rain-set'

/**
 * RAIN: level 1, Yusuf's dream, the city in the rain (the RAIN builder's). Two parts.
 *
 * `rain` (68.970 → 91.824): the blink opens under a shop's awning in the rain, Ariadne beside him, Yusuf's van at the
 * kerb ahead with its door open. Fischer's taxi pulls up between them (beat 74); he steps out (74½); Cobb rolls into
 * him and knocks him along the pavement (75): he hops in through the van's door (75½) and comes down on its bench on
 * bar 19 (taken); Cobb follows him in (76½, 77), Ariadne after (77, 77½); the door slams (78), and the camera cuts wide
 * on it. Out of nowhere a black freight train comes off the bridge down the middle of the street, Mal standing still
 * in the rain as it comes, and goes through the cars waiting at the bridge's head (79, 79½) and, on bar 20, the taxi,
 * which it flings end over end over the van. It thunders by behind them; on bar 21 the van pulls away up the street,
 * its wheels through puddles on the beats, onto the bridge on bar 22 (the joint), and on along it. The case opens
 * (beat 90); on bar 23 the bench goes soft under them and they sink through it, the floor and the deck, drop out under
 * the deck (93), fall into the river (94½), and go down through it and the ground into the dark, crossing into the
 * hotel on the brass.
 *
 * `river` (199.585 → 213.717): thrown up out of the hotel, they rise out of the dark through the ground and the river's
 * bed (a tear), the water and its surface (a tear), and up through the floor of the van hanging off the bridge's broken
 * end (a tear), and come down on its bench together (beat 211). The rain falls again. Its lamps fail as it plunges (bar
 * 53 and the beats after); on bar 54 it hits the river: the show's biggest splash. On the half after, its door bursts
 * and throws Ariadne and Fischer out; they come up (217½, 218). On bar 55 Cobb, last, gets out of the sinking van, is
 * drawn down in its wake, turns up toward the light (222), and breaks the surface on the release.
 */

interface State {
  begin: number
}

const penOf = (p: p5, c: Ctx): Pen => ({ p, k: c.k, ink: c.ink, w: c.weight, ctx: p.drawingContext as CanvasRenderingContext2D })

/** The lane: a path of the world sampled into short straight pieces between its breaks (each break a strike or a hand-off). */
function lane(fn: (t: number) => Pt, origin: Pt, breaks: number[], hz = 40): Seg[] {
  const at = (t: number): Pt => {
    const [x, y] = fn(t)
    return [x - origin[0], y - origin[1]]
  }
  const segs: Seg[] = []
  for (let i = 1; i < breaks.length; i++) {
    const a = breaks[i - 1]
    const b = breaks[i]
    if (b - a < 1e-9) continue
    segs.push(...carried(at, a, b, Math.max(1, Math.ceil((b - a) * hz))))
  }
  return segs
}
const local = (origin: Pt, [x, y]: Pt): Pt => [x - origin[0], y - origin[1]]

/* ------------------------------------------------------------------ rain */

const RAIN_BREAKS = [START, T_TAXI_STOP, T_HIT, T_C_UP_HOP, T_C_IN, T_C_IN + 0.7, T_SINK, T_DROP, T_RIVER, UNDER]
/** Each of them sinks a little after him: Ariadne a tenth of a second, Fischer less. */
const LAG = { cobb: 0, ariadne: 0.1, fischer: 0.07 }

export const rain = part<State>(
  {
    name: 'rain',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      if (t < T_SINK - 0.8 || t > UNDER + 1.5) return
      p.push()
      p.translate(-RAIN_AT[0] * c.k, -RAIN_AT[1] * c.k)
      // The bench goes soft under each of them, and then the deck's underside, where they drop out of it.
      for (const who of ['cobb', 'ariadne', 'fischer'] as const) {
        const lag = LAG[who]
        const pose = vanPose(Math.min(t, UNDER))
        const seatTop = vanPoint(pose, SEAT_U[who], SEAT_V + 0.16)
        sink(p, c.k, seatTop, t - (SINK_AT.seat + lag), 0.45, 0.8)
        const x = (who === 'cobb' ? cobbRain : who === 'ariadne' ? ariadneRain : fischerRain)(SINK_AT.deck + lag)[0]
        sink(p, c.k, [x, 0.45], t - (SINK_AT.deck + lag - 0.35), 0.4, 0.8)
      }
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      if (t < T_RIVER - 0.2 || t > T_RIVER + 3) return
      p.push()
      p.translate(-RAIN_AT[0] * c.k, -RAIN_AT[1] * c.k)
      const P = penOf(p, c)
      let seed = 41
      for (const [fn, lag] of [[cobbRain, LAG.cobb], [ariadneRain, LAG.ariadne], [fischerRain, LAG.fischer]] as const) {
        plume(P, [fn(T_RIVER + lag)[0], RAIN_GEO.river], t - (T_RIVER + lag), 0.26, seed++)
      }
      p.pop()
    },
  },
  (slot) => {
    const exit = exitFor(RAIN_AT, ORIGIN.hotel)
    const breaks = [slot.begin, ...RAIN_BREAKS.slice(1, -1), slot.end]
    const company: Company[] = [
      { who: 'ariadne', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = local(RAIN_AT, ariadneRain(t)); return { x, y } } },
      { who: 'fischer', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = local(RAIN_AT, fischerRain(t)); return { x, y } } },
      { who: 'mal', from: MAL_FROM, to: MAL_TO, at: () => { const [x, y] = local(RAIN_AT, MAL_AT); return { x, y } } },
    ]
    return {
      cells: box(-3, -6, 38, 17, 2),
      exit,
      lane: { segs: lane(cobbRain, RAIN_AT, breaks), fire: T_TAXI_STOP - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot) => {
    const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: local(RAIN_AT, at), w: 1 })
    const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
    return [
      // Under the awning as the blink opens; the taxi comes up the street and stops; the snatch.
      hold(slot.begin + 0.6, 4.6, [-44.95, -1.05]),
      hold(T_TAXI_STOP, 4.9, [-44.6, -1.2]),
      hold(T_HIT + 0.4, 5.2, [-44.0, -1.3]),
      hold(T_C_IN, 5.5, [-43.4, -1.4]),
      // The door slams: cut out on it to the street ahead of the van, close. Out of nowhere the train's headlamp stabs
      // in along it; the locomotive comes on through the waiting cars, a black wall filling the frame, and takes the
      // taxi on bar 20; then its wagons thunder past behind the van.
      { t: T_SLAM, cells: 8, hold: local(RAIN_AT, [-37.8, -2.25]), w: 1, cut: true },
      hold(T_IMPACT, 7.8, [-38.0, -2.2]),
      hold(T_IMPACT + 1.6, 8.3, [-38.6, -2.2]),
      hold(T_GO - 0.6, 9.4, [-39.4, -2.35]),
      // With the van up the street, and onto the bridge: wider, to see the drop to the river under it.
      follow(T_GO + 1.4, 7.4, [1.9, -1.3]),
      follow(T_PUDDLES[2] + 0.2, 7.0, [2.0, -1.2]),
      follow(T_JOINT + 0.8, 11, [1.4, 1.9]),
      // Cut close on the case as it opens: the three of them in the van, its lines to them; the bench goes soft under
      // them and they sink into it. Then out with them, down under the deck, into the river and the dark.
      { t: T_CASE, cells: 2.7, off: [0.1, -0.12], w: 0, cut: true },
      follow(T_SINK + 0.3, 2.8, [0.05, 0.15]),
      follow(T_DROP, 3.6, [0, 0.3]),
      follow(89.9, 5.0, [0, 0.2]),
      follow(90.8, 6.6, [0, 0.6]),
      follow(slot.end, 7.0, [0.0, 0.6]),
    ]
  },
)

/* ------------------------------------------------------------------ river */

/** When each of them passes up through the van's floor: its underside crossed going up. */
function throughFloor(fn: (t: number) => Pt): number {
  let a = SURFACE_AT.cobb
  let b = T_LAND
  const below = (t: number) => {
    const pose = vanAt(t)
    const [x, y] = fn(t)
    const dx = x - pose.x
    const dy = y - pose.y
    return -Math.sin(pose.angle) * dx + Math.cos(pose.angle) * dy - 0.575
  }
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    if (below(m) > 0) a = m
    else b = m
  }
  return (a + b) / 2
}
const RIVER_WHO = [
  { fn: cobbRiver, surf: SURFACE_AT.cobb, bed: BED_AT.cobb },
  { fn: ariadneRiver, surf: SURFACE_AT.ariadne, bed: BED_AT.ariadne },
  { fn: fischerRiver, surf: SURFACE_AT.fischer, bed: BED_AT.fischer },
].map((w) => ({ ...w, floor: throughFloor(w.fn) }))
const TEAR = '#FFF6E4'

const RIVER_BREAKS = [RISE, T_LAND, SPLASH, T_C_OUT, WAKE]

export const river = part<State>(
  {
    name: 'river',
    draw: () => {},
    over: (p, s, c) => {
      const t = s.begin + c.t
      if (t < RISE - 0.1 || t > WAKE + 0.5) return
      p.push()
      p.translate(-ORIGIN.river[0] * c.k, -ORIGIN.river[1] * c.k)
      const P = penOf(p, c)
      let seed = 61
      for (const w of RIVER_WHO) {
        // Where the kick brings them up through the bed, the surface and the van's floor: the tears.
        tear(p, c.k, [w.fn(w.bed)[0], RAIN_GEO.bed], t - w.bed, 0.9, TEAR)
        tear(p, c.k, [w.fn(w.surf)[0], RAIN_GEO.river], t - w.surf, 1.0, TEAR)
        plume(P, [w.fn(w.surf)[0], RAIN_GEO.river], t - w.surf, 0.22, seed++)
        tear(p, c.k, w.fn(w.floor), t - w.floor, 0.8, TEAR)
      }
      // The door bursting open, and Ariadne and Fischer coming up after the splash.
      const door = vanPoint(vanAt(T_BURST), -0.3, 0.1)
      plume(P, [door[0], Math.min(door[1], RAIN_GEO.river)], t - T_BURST, 0.3, 77)
      plume(P, [ariadneRiver(T_A_UP)[0], RAIN_GEO.river], t - T_A_UP + 0.1, 0.14, 71)
      plume(P, [fischerRiver(T_F_UP)[0], RAIN_GEO.river], t - T_F_UP + 0.1, 0.14, 73)
      p.pop()
    },
  },
  (slot) => {
    const origin = ORIGIN.river
    const breaks = [slot.begin, ...RIVER_BREAKS.slice(1, -1), slot.end]
    const end = local(origin, cobbRiver(slot.end))
    const company: Company[] = [
      { who: 'ariadne', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = local(origin, ariadneRiver(t)); return { x, y } } },
      { who: 'fischer', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = local(origin, fischerRiver(t)); return { x, y } } },
    ]
    return {
      cells: box(-3, -17, 6, 1, 1),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: lane(cobbRiver, origin, breaks), fire: T_LAND - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot) => {
    const origin = ORIGIN.river
    const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: local(origin, at), w: 1 })
    const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
    // The seam's framing on the release, exactly: the follow the score makes there, offset to put him where it says.
    const seam = SEAMS.wake
    const at = (s: number): Pt => (s > slot.end ? [C_END[0] + seam.v[0] * (s - slot.end), C_END[1] + seam.v[1] * (s - slot.end)] : cobbRiver(Math.max(slot.begin, s)))
    const fl = follower(at, 400)(slot.end)
    const off: Pt = [C_END[0] + seam.frame[0] - fl[0], C_END[1] + seam.frame[1] - fl[1]]
    return [
      // Up out of the dark with them, and out to the van hanging off the bridge's end over the river.
      follow(slot.begin + 0.8, 7.7, [0.35, -0.3]),
      hold(T_LAND - 0.3, 8.6, [1.3, 0.3]),
      // In on the three of them in it as it goes, its lamps failing; back for the water coming up at it.
      hold(T_FLICKER[1] + 0.2, 6.6, [1.75, 1.7]),
      hold(T_FLICKER[3] + 0.1, 8.2, [2.15, 4.4]),
      // The splash: framed for it, the river and the air over it.
      hold(SPLASH, 8.6, [2.4, 5.8]),
      hold(T_A_UP + 0.5, 7.0, [2.4, 7.5]),
      hold(T_C_OUT, 5.4, [2.55, 8.55]),
      follow(T_C_OUT + 1.9, 4.8, [0.2, -0.55]),
      follow(slot.end, seam.cells, off),
    ]
  },
)

/** Every strike, both parts. */
export const RAIN_HITS: number[] = [
  // The snatch.
  T_TAXI_STOP,
  T_TAXI_DOOR,
  T_HIT,
  T_F_UP_HOP,
  T_F_IN,
  T_C_UP_HOP,
  T_C_IN,
  T_A_IN,
  T_SLAM,
  // The train.
  T_LAMP,
  T_CAR1,
  T_CAR2,
  T_IMPACT,
  // The van, the bridge, the going under.
  T_GO,
  ...T_PUDDLES,
  T_JOINT,
  T_CASE,
  T_SINK,
  T_DROP,
  T_RIVER,
  UNDER,
  // The river.
  T_LAND,
  ...T_FLICKER,
  SPLASH,
  T_BURST,
  T_A_UP,
  T_F_UP,
  T_C_OUT,
  WAKE,
]
