import { laneAt, mixHex, R, type Pt } from '../../../../../parts'
import { box, part, route, type Company, type PartShot, type Way } from '../kit'
import { AT, notes as measured } from '../music'
import { hop } from '../physics'
import { SEBS_MAT } from '../worlds'
import { fold, keyRest } from './geometry'
import { DOWN, drawPiano, heldOn, keysOf, play, restOn, type Note, type Press } from './piano'
import { BAND, BAND_LAMPS, DOOR, DOOR_SHUT, lightsAt, MIA_SEAT, ROOM, SEAT, SIDE_SEAT, TABLE } from './room'

/**
 * The finale: Seb's again, and the dream's last room, then the room as it is.
 *
 * They come in together through the door from the street (he leads, she a step behind), in rose light, and cross
 * the club to her table in the front row: he climbs onto the stool across from hers on a note, she onto hers on the
 * next. On the stage the piano plays itself, keys going down on the melody with no one at it. They lean in over the
 * little table on 446.9 and touch on 450.1: the kiss. Then the dream drains: the rose goes out of the light, and he
 * glides from her side up to the piano, landing on the keys on the last chord, 453.73. While the camera is on him
 * David comes back from the bar and sits where he sat.
 *
 * The coda, in silence: stillness. David gets down and goes out ahead of her; she gets down and follows him across
 * the room, stops in the doorway and turns back; he looks up on the key; they nod, together. The End comes in and she goes out
 * after David, and the door swings shut on its closer on The End's onset, 467.866. He is alone. The band's lamps
 * come up behind him on 471.5; he nods the count-in; on 478.05 the stage blazes and he plays with the band.
 *
 * The part's frame: (-0.5, 0) is the ball on the door's threshold; the room stands with its `DOOR` at this frame's
 * origin, so a room point p is `p - DOOR` here.
 */

/** The slot's start, which the score gives it; the plan is made for it once, so the strikes can be said up front. */
const BEGIN = 423.4
/** A ball on the floor, and on a stool. */
const FLOOR_Y = ROOM.floor - 0.13
const SEAT_Y = SEAT - 0.13
/** The last chord's key, where he lands from the table. */
const LAST_KEY = 84
/** The kiss: they lean in, and touch. */
const LEAN = 446.938
const KISS = 450.107
/** The dream drains; he leaves her side. */
const LEAVE = 451.53
/**
 * The coda, told the film's way, in close shots cut against each other: she stops and turns back (her close shot); he
 * looks up from the keys (his); she smiles, a dip (hers); he nods (his). Then she goes.
 */
const TURN = 461.85
const LOOK: [number, number] = [462.1, 462.6]
const NOD_MIA = 462.85
const NOD = 463.55
const GO = 463.95
/** Where she stops and turns back: in the club's doorway, just inside its threshold. */
const DOORWAY = -12.1
/** The cuts between their close shots. */
const CUTS = { her: 461.02, him: 462.05, smile: 462.75, nod: 463.45, out: 464.27 }
/** The count-in: four nods, a beat apart, onto the band. */
const COUNT = [0, 1, 2, 3].map((i) => BAND - 0.4515 * (4 - i))
/** Where the two of them go out of shot, and are let go. */
const GONE = 467.55

/** Her nod: the ball dips, squashed on the floor, and comes back up; deep enough to read in her close shot. */
function nodded([x, y]: Pt, t: number) {
  const u = (t - NOD_MIA) / 0.58
  const n = u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * Math.pow(u, 0.7))
  return n ? { x, y: y + R * 0.3 * n, stretch: 1 - 0.3 * n, angle: Math.PI / 2 } : { x, y }
}

/** A close shot held on `at` from `a` to `b`: a cut in (the key a frame after the last one), a slow push, and out at `b`. */
function closeOn(a: number, b: number, at: Pt, cells = 2.5): { t: number; cells: number; hold: Pt }[] {
  return [
    { t: a, cells, hold: at },
    { t: b - 0.02, cells: cells * 0.92, hold: at },
  ]
}

/** A room point in the part's frame. */
const F = (p: Pt): Pt => [p[0] - DOOR[0], p[1] - DOOR[1]]

/** A path through the room over show time: from `x0` to `x1` between `t0` and `t1`, leaving at `v0` and arriving at `v1` (cells a second). */
function stroll(t0: number, t1: number, x0: number, x1: number, v0: number, v1: number): (t: number) => number {
  const T = t1 - t0
  return (t) => {
    const u = Math.max(0, Math.min(1, (t - t0) / T))
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * T * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * T * v1
  }
}

/** A stroll along the floor as ways (show time, room cells). */
function walk(t0: number, t1: number, x0: number, x1: number, v0: number, v1: number, from = t0): Way[] {
  const x = stroll(t0, t1, x0, x1, v0, v1)
  const n = Math.max(2, Math.ceil((t1 - from) * 6))
  return Array.from({ length: n }, (_, i) => {
    const t = from + ((t1 - from) * (i + 1)) / n
    return { at: t, p: [x(t), FLOOR_Y] as Pt }
  })
}

/** Ways in show time and room cells, as a position over show time in the part's frame. */
function track(ways: Way[]): (t: number) => Pt {
  const t0 = ways[0].at
  const lane = { segs: route(ways.map((w) => ({ ...w, at: w.at - t0, p: F(w.p) }))), fire: 0 }
  return (t) => {
    const at = laneAt(lane, t - t0)
    return [at.x, at.y]
  }
}

/** Held on a way's point until `at`. */
const hold = (ways: Way[], at: number): Way => ({ at, p: ways[ways.length - 1].p })
/** A move to `p`, easing out of the last and into this. */
const ease = (at: number, p: Pt, arc = 0): Way => ({ at, p, ease: 'inout', ...(arc ? { arc } : {}) })
const plus = (p: Pt, dx: number, dy = 0): Pt => [p[0] + dx, p[1] + dy]

/** The band's tune he plays from its downbeat: the strong measured notes, a comfortable hop apart. */
function bandTune(): Note[] {
  const out: Note[] = []
  for (const n of measured(BAND + 0.3, 496.4, 0.13)) {
    if (n.midi === null) continue
    const prev = out[out.length - 1]
    if (prev && n.t - prev.t < 0.22) continue
    out.push({ t: n.t, midi: n.midi, s: n.s })
  }
  for (let i = 1; i < out.length - 1; i++) {
    const [p, n, q] = [out[i - 1].midi, out[i].midi, out[i + 1].midi]
    for (const d of [-12, 12]) if (Math.abs(n - p) > 9 && Math.abs(n - q) > 9 && Math.abs(n + d - p) < Math.abs(n - p) && Math.abs(n + d - q) < Math.abs(n - q)) out[i].midi = n + d
  }
  return out
}

function plan(begin: number) {
  const hits: number[] = []
  /* -------------------------------------------- him: the thread */
  const seb: Way[] = [{ at: begin, p: [DOOR[0] - 0.5, FLOOR_Y] }]
  // In from the street and across the room, to just past his stool; a step up onto it on a note.
  seb.push(...walk(begin, 431.5, DOOR[0] - 0.5, -1.8, 1.2, 0, begin))
  seb.push(hold(seb, 431.62))
  seb.push(hop(seb[seb.length - 1], SIDE_SEAT, 431.903))
  hits.push(431.903)
  // Leaning in over the table, and the kiss.
  seb.push(hold(seb, LEAN - 1.3), ease(LEAN, [SIDE_SEAT[0] - 0.045, SEAT_Y - 0.03]))
  seb.push(hold(seb, KISS - 0.55), ease(KISS, [SIDE_SEAT[0] - 0.074, SEAT_Y - 0.045]))
  hits.push(LEAN, KISS)
  // The dream drains, and he glides from her side up to the piano, onto the last chord.
  seb.push(hold(seb, LEAVE))
  // Not a jump but a drift: it starts from rest beside her, gathers, and arrives on the key with the chord.
  seb.push({ at: AT.last, p: keyRest(LAST_KEY), arc: 1.3, ease: 'in' })
  hits.push(AT.last)
  const last: Press = { midi: LAST_KEY, at: AT.last, until: BAND - 0.15, how: 'ride', s: 0.4 }
  const held = heldOn(LAST_KEY)
  seb.push({ at: AT.last + DOWN, p: held, ease: 'out' })
  // He looks up at her, a small turn on the key; the nod.
  const looked = plus(held, -0.05)
  seb.push(hold(seb, LOOK[0]), ease(LOOK[1], looked))
  // A nod, for a ball on a key: a lift and back, settling softly; enough to read in his close shot.
  seb.push(hold(seb, NOD), { at: NOD + 0.22, p: plus(looked, 0, -0.13), ease: 'out' }, ease(NOD + 0.62, looked))
  // The count-in: four nods, onto the band.
  for (const c of COUNT) seb.push(hold(seb, c - 0.1), { at: c, p: plus(looked, 0, -0.04), ease: 'out' }, ease(c + 0.22, looked))
  seb.push(hold(seb, BAND - 0.2), { at: BAND - 0.15, p: plus(restOn(LAST_KEY), -0.05), ease: 'in' })
  seb.push(hop(seb[seb.length - 1], restOn(LAST_KEY), BAND))
  hits.push(BAND)
  const downbeat: Press = { midi: LAST_KEY, at: BAND, until: BAND, how: 'tap', s: 0.3 }
  const tune = bandTune()
  const played = play(seb[seb.length - 1], tune, 0, { seat: { press: downbeat, midi: LAST_KEY } })
  seb.push(...played.ways)
  seb.push(hold(seb, 510))
  hits.push(...played.presses.map((p) => p.at))

  /* -------------------------------------------- the piano, by itself in the dream */
  const selves: Press[] = measured(begin, AT.last - 0.1, 0.1)
    .filter((n) => n.midi !== null)
    .map((n) => ({ midi: fold(n.midi as number), at: n.t, until: n.t + 0.34, how: 'self' as const, s: n.s }))
  hits.push(...selves.map((p) => p.at))

  /* -------------------------------------------- her */
  const miaWays: Way[] = [{ at: 423.5, p: [stroll(begin, 431.25, DOOR[0] - 0.87, -2.75, 1.2, 0)(423.5), FLOOR_Y] }]
  miaWays.push(...walk(begin, 431.25, DOOR[0] - 0.87, -2.75, 1.2, 0, 423.5))
  miaWays.push(hold(miaWays, 432.0))
  miaWays.push(hop(miaWays[miaWays.length - 1], MIA_SEAT, 432.286))
  hits.push(432.286)
  miaWays.push(hold(miaWays, LEAN - 1.3), ease(LEAN, [MIA_SEAT[0] + 0.045, SEAT_Y - 0.03]))
  miaWays.push(hold(miaWays, KISS - 0.55), ease(KISS, [MIA_SEAT[0] + 0.074, SEAT_Y - 0.045]))
  // He goes, and she settles back on her stool.
  miaWays.push(hold(miaWays, LEAVE + 0.3), ease(452.8, MIA_SEAT))
  // A breath while David gets up and goes by below her stool; then down, behind him, and after him across the room to
  // the door, where she stops in the doorway and turns back, as in the film. (Down any sooner, she is in his way.)
  const stop = DOORWAY
  miaWays.push(hold(miaWays, 458.3), ease(458.7, [-2.78, FLOOR_Y], 0.05))
  miaWays.push(...walk(458.7, 461.2, -2.78, stop, 0, 0))
  miaWays.push(hold(miaWays, 461.45), ease(TURN, [stop + 0.05, FLOOR_Y]))
  // (Her nod is a dip: see `nodded`.) The End: to the door, out through it, and away up the street.
  // She lingers a moment as David steps off ahead of her, then follows him out, walking on up the street.
  miaWays.push(hold(miaWays, GO + 0.45))
  miaWays.push(...walk(GO + 0.45, 467.4, stop + 0.05, -14.9, 0, -1.4))
  miaWays.push({ at: GONE, p: [-14.9 - 1.4 * (GONE - 467.4), FLOOR_Y] })

  /* -------------------------------------------- David */
  const barStool: Pt = [-10.25, 2.5 - 0.13]
  const david: Way[] = [{ at: 451.8, p: barStool }]
  david.push(ease(452.3, [-9.95, FLOOR_Y], 0.05))
  david.push(...walk(452.3, 454.9, -9.95, -1.8, 0, 0))
  david.push(hold(david, 455.0), ease(455.45, SIDE_SEAT, 0.08))
  // Down on the far side of his stool, and off already walking, so he goes by under hers in a moment, not a pause.
  david.push(hold(david, 456.45), ease(456.9, [-1.6, FLOOR_Y], 0.04))
  david.push(...walk(456.9, 460.9, -1.6, -13.05, -2.2, 0))
  david.push(hold(david, GO - 0.2))
  david.push(...walk(GO - 0.2, 466.6, -13.05, -16.0, 0, -1.4))
  david.push({ at: GONE, p: [-16.0 - 1.4 * (GONE - 466.6), FLOOR_Y] })

  /* -------------------------------------------- the real one, at the keys */
  // In the dream he sits with her and the piano plays itself; but in the room as it is he is at the piano, playing
  // their theme. So he is there too, as an echo: the other road, hopping the keys as they go down. On the last chord
  // the one from her table lands on the key where the echo is, and it goes into him: he is where he really was.
  const E0 = 432.3
  const theme: Note[] = []
  for (const pr of selves) {
    if (pr.at < E0 + 0.35) continue
    const prev = tune[theme.length - 1]
    if (prev && pr.at - prev.t < 0.24) continue
    theme.push({ t: pr.at, midi: pr.midi, s: pr.s })
  }
  theme.push({ t: AT.last, midi: LAST_KEY, s: 0.4 })
  const atKeys = { at: 0, p: restOn(theme[0].midi) }
  const keysLane = { segs: route(play(atKeys, theme, E0).ways), fire: 0 }
  const realOne = {
    from: E0,
    to: AT.last + 0.7,
    at: (t: number) => {
      const q = laneAt(keysLane, t - E0)
      const [x, y] = F([q.x, q.y])
      const a = Math.max(0, Math.min(1, (t - E0) / 0.7))
      return { x, y, a, spin: -Math.PI / 2 + 0.25, gone: Math.max(0, Math.min(1, (t - AT.last + 0.04) / 0.6)) }
    },
  }

  /* -------------------------------------------- the dream, left in his seat */
  // As he goes from her side the dream stays a moment where he was: an echo of him at her table, leaning in to her,
  // paling while David comes back across the room, and coming apart as David sits down in it.
  const kissed: Pt = [SIDE_SEAT[0] - 0.074, SEAT_Y - 0.045]
  const echo = {
    from: LEAVE - 0.05,
    to: 456.4,
    at: (t: number) => {
      const lean = 1 - Math.max(0, Math.min(1, (t - 453.2) / 1.6))
      const [x, y] = F([kissed[0] + (SIDE_SEAT[0] - kissed[0]) * (1 - lean), kissed[1] + (SIDE_SEAT[1] - kissed[1]) * (1 - lean)])
      const a = Math.min(1, (t - LEAVE + 0.05) / 0.45) * (1 - 0.35 * Math.max(0, Math.min(1, (t - 452.5) / 2.5)))
      return { x, y, a, spin: Math.PI, gone: Math.max(0, Math.min(1, (t - 455.32) / 1.05)) }
    },
  }

  const miaAt = track(miaWays)
  const davidAt = track(david)
  const company: Company[] = [
    { from: 423.5, to: GONE, who: 'mia', at: (t) => nodded(miaAt(t), t) },
    { from: 451.8, to: GONE, who: 'david', at: (t) => { const [x, y] = davidAt(t); return { x, y } } },
  ]
  hits.push(DOOR_SHUT, BAND_LAMPS)

  const ways = seb.map((w) => ({ ...w, at: w.at - begin, p: F(w.p) }))
  return { ways, keys: keysOf([...selves, last, downbeat, ...played.presses]), company, echoes: [realOne, echo], hits: [...new Set(hits)].sort((a, b) => a - b) }
}

const PLAN = plan(BEGIN)

interface FinaleState {
  begin: number
  keys: ReturnType<typeof keysOf>
}

export const finale = part<FinaleState>(
  {
    name: 'finale',
    draw(p, s, c) {
      const t = c.t + s.begin
      const L = lightsAt(t, true)
      const [ox, oy] = F([0, 0])
      p.push()
      p.translate(ox * c.k, oy * c.k)
      drawPiano(p, c.k, c.ink, c.weight, t, s.keys, { color: mixHex(L.stage, SEBS_MAT.candle, 0.45 * L.blaze), lit: 1 })
      p.pop()
    },
  },
  (slot) => {
    const pl = Math.abs(slot.begin - BEGIN) < 1e-9 ? PLAN : plan(slot.begin)
    const end = pl.ways[pl.ways.length - 1].p
    return {
      cells: box(-4.5, -7, 20, 1),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: route(pl.ways), fire: AT.last - slot.begin },
      state: { begin: slot.begin, keys: pl.keys },
      company: pl.company,
      echoes: pl.echoes,
    }
  },
  (): PartShot[] => [
    // Under the cover, inside the door as they come in; then along with them across the room.
    { t: 423.4, cells: 3.4, hold: F([-10.6, 2.1]) },
    { t: 425.8, cells: 3.4, w: 0, off: [0.5, -0.6] },
    { t: 429.6, cells: 3.2, w: 0, off: [0.2, -0.55] },
    // At her table; then the piano on the stage, playing itself; back to them for the kiss.
    { t: 432.4, cells: 2.3, hold: F([TABLE.x, 2.45]) },
    { t: 434.6, cells: 2.2, hold: F([TABLE.x, 2.46]) },
    // Each way across the room the camera draws back as it goes: the two of them and the piano in one frame.
    { t: 436.3, cells: 5.8, hold: F([-0.4, 1.25]) },
    { t: 438.0, cells: 3.4, hold: F([2.8, -0.4]) },
    { t: 441.6, cells: 3.1, hold: F([3.2, -0.35]) },
    { t: 443.2, cells: 5.8, hold: F([-0.4, 1.25]) },
    { t: 444.9, cells: 1.65, hold: F([TABLE.x, 2.58]) },
    { t: 451.3, cells: 1.55, hold: F([TABLE.x, 2.58]) },
    // With him up to the keys, onto the last chord; the stillness.
    // Wide enough to keep her table, and the echo of him left at it, in the frame as he goes.
    { t: 452.6, cells: 4.6, hold: F([0.9, 1.05]) },
    { t: 453.9, cells: 3.2, hold: F([4.3, -0.3]) },
    { t: 454.45, cells: 3.15, hold: F([4.35, -0.3]) },
    { t: 455.36, cells: 3.1, hold: F([4.36, -0.3]) },
    // Cut, as David sits down in the seat beside her: the dream's kiss's own close two-shot at her table, and it is
    // David in Seb's seat. The dream is over. Then out with her as she follows David to the door.
    { t: 455.38, cells: 1.6, hold: F([TABLE.x, 2.58]) },
    { t: 456.55, cells: 1.6, hold: F([TABLE.x, 2.58]) },
    // He goes ahead to the door and out onto the pavement; she follows him across the room and stops in the doorway.
    // Then close shots, cut against each other: her turn back from the doorway, his look, her smile, his nod. Then out
    // to her going.
    { t: 459.4, cells: 5.4, hold: F([-8.1, 1.85]) },
    { t: CUTS.her - 0.02, cells: 4.8, hold: F([-11.0, 2.1]) },
    // Hers as close as his: she fills her shot as he and the keys fill his.
    ...closeOn(CUTS.her, CUTS.him, F([DOORWAY + 0.05, FLOOR_Y - 0.12]), 1.55),
    ...closeOn(CUTS.him, CUTS.smile, F([keyRest(LAST_KEY)[0] - 0.05, -0.2]), 1.75),
    ...closeOn(CUTS.smile, CUTS.nod, F([DOORWAY + 0.05, FLOOR_Y - 0.12]), 1.55),
    ...closeOn(CUTS.nod, CUTS.out, F([keyRest(LAST_KEY)[0] - 0.05, -0.2]), 1.75),
    // Out to her going: the doorway, her on its threshold and David waiting on the pavement beyond.
    { t: CUTS.out, cells: 4.2, hold: F([-12.4, 2.05]) },
    // After her to the door, out; the door swings shut. Back across the empty room to him, the band's lamps behind him.
    { t: 466.9, cells: 4.6, hold: F([-10.6, 1.45]) },
    { t: 468.3, cells: 4.6, hold: F([-10.8, 1.45]) },
    { t: 469.8, cells: 7, hold: F([-2.5, 0.8]) },
    // Him at the keys and the whole bandstand beside him, the piano left of centre and the band right of it, so the lamps come up in the frame as he looks back
    // at the door; and closer still on him for the count-in, his nods to the band.
    { t: 472.0, cells: 5.4, hold: F([6.35, 0.8]) },
    { t: 475.6, cells: 5.2, hold: F([6.35, 0.75]) },
    { t: 477.9, cells: 5.1, hold: F([6.35, 0.72]) },
    { t: 480.0, cells: 7, hold: F([3.6, -1.6]) },
  ],
)

/** Every strike of the finale, in show seconds: the piano's own keys in the dream, the landings, the kiss, the door, the lamps, the band. */
export const FINALE_HITS: number[] = PLAN.hits

