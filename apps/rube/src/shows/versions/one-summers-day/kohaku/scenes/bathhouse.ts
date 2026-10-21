import { R } from '../../../../../parts'
import type { Key } from '../camera'
import { HAKU_SIZE, HAND, HAND_RIM, HAND_SIZE, HANDS_ID, NOFACE_SIZE } from '../cast'
import { END } from '../credits'
import { BATH, BRIDGE, STREET } from '../geo'
import { light } from '../light'
import { knock, lit, region, smooth, smoother, standing, type Pt } from '../paint'
import { Path, hop, rest, ride, roll, type Move } from '../path'
import type { Scene } from '../scene'
import type { Actor } from '../show'
import {
  AT_DOOR,
  AWAY,
  BY_TUB,
  CHEER,
  CUT_BOILER,
  CUT_HALL,
  CUT_IN,
  CUT_OUT,
  DOWN,
  DOWN_OFF,
  FLOOD,
  FREE,
  FROM,
  HAKU_GO,
  HAKU_THERE,
  HOOK,
  PULLS,
  RIM,
  RISE,
  SET_OFF,
  TO,
  TREADLE,
  WIDE,
} from './bathhouse/beats'
import { drawBoiler } from './bathhouse/boiler'
import { GALLERY, PULLEY, TREAD, drawHallBack, drawHallLamps, drawPulley, drawSpout, drawToken, drawTubBack, drawTubFront, drawTubWater, hauled, hookAt } from './bathhouse/hall'
import { drawMask } from './bathhouse/noface'
import { bridge, building, cutAt, gorge, hallFront, openings } from './bathhouse/set'
import { drawBicycle, drawJunk, drawMound, drawSpirit, drawSpiritOutside, drawThorn, thornAt } from './bathhouse/spirit'

/**
 * The bathhouse at night (M.swell → M.breath): the orchestra takes the theme up, the first climax, and its settling.
 *
 * On the swell the camera rises off her at the bridge's foot and draws back until the whole bathhouse stands lit in
 * the night over its bridge, its smoke going up past the moon. Haku has been waiting on the bridge: he comes to her,
 * and they cross together, he a little ahead, under No-Face, who hovers at the rail, his mask turning after her. At
 * the door Haku stays back; she goes in, and the front of the great bath's hall comes away.
 *
 * Inside, the back doors slide open on the night sea, and the river's spirit comes in through them, a heaving mound of
 * sludge, and heaves himself up into the tub. She lands on the treadle by the tub, and the herbal token goes off its
 * peg onto its cord, down through the floor. A cut down, on the note, to the boiler room: the token comes down to
 * Kamaji, who takes it, pulls a drawer, tips the herbs into the hopper, while the soot carries coal into the furnace a
 * lump a note; the hot water goes up the pipe. A cut back up as the spout gushes into the tub.
 *
 * On the crest the tub floods round him. She hops up onto the rim and finds the thorn, a bicycle's handlebar in his
 * side. The hook comes down from the pulley and takes it, and the bathhouse's hands on the gallery haul, a pull a note.
 * At the crest's top it comes free, the bicycle swinging up on the hook as the hands tumble back, and the rest pours out
 * of him a thing a note. Clean, he rises out of the water, an old man's smiling face on a column of clear water; he
 * laughs twice, and goes, up over the spout and out through the back doors. A cut outside: the ribbon of him rising from
 * behind the bathhouse and away east over the night sea. A cut back in: the water settling, the steam going up, the
 * hands cheering on the gallery, and the hall still.
 */

/* ------------------------------------------------------------------ her */

const FOOT: Pt = [41.4, STREET.y - R]
const FLOOR = BATH.hall.y1
/** Where she stops by the treadle, the treadle's west end she lands on, the tub's west rim, and the boards after. */
const BY: Pt = [59.62, FLOOR - R]
const ON_TREAD: Pt = [TREAD.x - 0.12, TREAD.top - 0.02 - R]
const ON_RIM: Pt = [60.95, BATH.tub.rim - 0.05 - R]
const AFTER: Pt = [59.55, FLOOR - R]
const ARRIVE = BY_TUB + 0.41

/** She leans into the thorn with the hands on every pull, and is jolted back when it comes free. */
const onRim = (t: number): Pt => {
  let dx = 0
  for (const p of PULLS) dx += 0.05 * knock(t, p, 0.08, 0.3)
  dx -= 0.09 * knock(t, FREE, 0.05, 0.45)
  return [ON_RIM[0] + dx, ON_RIM[1]]
}

const crossing = roll([FOOT, BY], SET_OFF, ARRIVE, 'inout')

const HERO: Move[] = [
  rest(FOOT, FROM, SET_OFF),
  crossing,
  rest(BY, ARRIVE, TREADLE - 0.32),
  hop(BY, ON_TREAD, TREADLE - 0.32, TREADLE),
  rest(ON_TREAD, TREADLE, RIM - 0.34),
  hop(ON_TREAD, ON_RIM, RIM - 0.34, RIM),
  { t0: RIM, t1: DOWN_OFF - 0.4, kind: 'roll', at: onRim },
  hop(onRim(DOWN_OFF - 0.4), AFTER, DOWN_OFF - 0.4, DOWN_OFF),
  rest(AFTER, DOWN_OFF, TO),
]

const herPath = new Path(HERO, 'chihiro-bathhouse')

/* ------------------------------------------------------------------ Haku and No-Face */

const HAKU_R = R * HAKU_SIZE
const HAKU_WAIT: Pt = [48.6, BRIDGE.y - HAKU_R]
const HAKU_MEET: Pt = [41.76, BRIDGE.y - HAKU_R]
/** He stops just short of the porch's post and stays back; she goes on in. */
const HAKU_STOP = 55.0
/** Beside her and a little ahead while they cross, easing to a stop at the door (a soft minimum, no corner). */
const hakuX = (t: number): number => {
  const k = 0.35
  const d = HAKU_STOP - (crossing.at(Math.min(ARRIVE, Math.max(SET_OFF, t)))[0] + 0.36)
  return HAKU_STOP - k * Math.log1p(Math.exp(d / k))
}

const HAKU_MOVES: Move[] = [
  rest(HAKU_WAIT, FROM, HAKU_GO),
  roll([HAKU_WAIT, HAKU_MEET], HAKU_GO, HAKU_THERE, 'inout'),
  rest(HAKU_MEET, HAKU_THERE, SET_OFF),
  ride((t) => [hakuX(t), HAKU_MEET[1]], SET_OFF, TO, (t) => (hakuX(t) - HAKU_MEET[0]) / HAKU_R),
]

/** No-Face hovers at the bridge's rail, a ball's height off the boards, nodding slowly in the air. */
const NOFACE_R = R * NOFACE_SIZE
const NOFACE_AT: Pt = [51.6, BRIDGE.y - NOFACE_R - 0.3]
const nofaceAt = (t: number): Pt => [NOFACE_AT[0], NOFACE_AT[1] + 0.025 * Math.sin(t * 0.9)]
const NOFACE_MOVES: Move[] = [ride(nofaceAt, FROM, TO)]

/** Where his mask looks: ahead, then at her as she comes, following her past him (a little behind her) to the door. */
function noFaceLook(t: number): number {
  const [x] = herPath.where(t - 0.45)
  const near = smooth(t, SET_OFF, SET_OFF + 1.5)
  return near * Math.max(-1, Math.min(1, (x - NOFACE_AT[0]) / 1.6))
}

/* ------------------------------------------------------------------ the hands */

const HAND_R = R * HAND_SIZE
const HAND_Y = GALLERY.y - HAND_R
const HAND_X = [60.62, 60.3, 59.98, 59.66, 59.34]

/** One of the hands on the gallery: hauling west with the rope, tumbling back when it goes slack, cheering at the end. */
function handAt(i: number): (t: number) => Pt {
  return (t: number) => {
    const fall = 0.2 + 0.05 * i
    const tumble = fall * (1 - Math.exp(-Math.max(0, t - FREE - 0.02 * i) * 4.5)) * (t > FREE ? 1 : 0)
    const bounce = 0.05 * Math.abs(Math.sin(Math.max(0, t - FREE) * 8)) * Math.exp(-Math.max(0, t - FREE) * 4) * (t > FREE ? 1 : 0)
    const cheer = knock(t, CHEER[i % 2] + 0.06 * Math.floor(i / 2), 0.09, 0.22) * 0.16
    // Watching before the haul: each sways a little at the rail.
    const lean = 0.012 * Math.sin(t * 1.3 + i * 1.1) * (1 - smooth(t, HOOK, HOOK + 0.5))
    return [HAND_X[i] - hauled(t) - tumble + lean, HAND_Y - bounce - cheer]
  }
}

const HANDS: Actor[] = HAND_X.map((x0, i) => {
  const at = handAt(i)
  return {
    id: HANDS_ID + i,
    color: HAND,
    rim: HAND_RIM,
    size: HAND_SIZE,
    turn: [0.6, -0.4, 2.4, 1.1, -1.3][i],
    path: new Path([ride(at, FROM, TO, (t) => (at(t)[0] - x0) / HAND_R)], `hand ${i}`),
    on: (t) => t >= FROM && t < TO,
  }
})

/* ------------------------------------------------------------------ the openings */

/** The hall's front: away as she goes in, whole again for the shot from outside, and whole after the scene. */
openings.hall.push((t) => {
  if (t < FROM || t >= TO) return 0
  if (t >= CUT_OUT && t < CUT_IN) return 0
  return smoother(t, AT_DOOR - 0.1, AT_DOOR + 1.1)
})
/** The boiler room's front: away while the camera is down there. */
openings.boiler.push((t) => (t >= CUT_BOILER && t < CUT_HALL ? 1 : 0))

/* ------------------------------------------------------------------ the camera */

const SHOTS: Key[] = [
  // From her at the bridge's foot, up and back to the whole bathhouse, lit, as Haku comes to her.
  { t: FROM + 0.3, cells: 7.7, at: [39.8, -2.6] },
  { t: HAKU_THERE, cells: 11.0, at: [45.6, -4.1] },
  { t: WIDE, cells: 17.4, at: [56.6, -6.3] },
  { t: DOWN, cells: 17.0, at: [56.9, -6.15] },
  // Down to the door with them.
  { t: 53.2, cells: 6.6, at: [53.4, -2.55], focus: [54.5, -1.4] },
  { t: AT_DOOR + 0.3, cells: 5.4, at: [58.0, -2.7] },
  // Inside: the hall, the doors opening, the spirit coming in and up into the tub.
  { t: ARRIVE, cells: 5.6, at: [63.9, -2.75] },
  { t: TREADLE - 0.4, cells: 5.2, at: [62.6, -2.65] },
  { t: CUT_BOILER - 0.02, cells: 3.6, at: [61.0, -2.25], focus: [60.3, -1.6] },
  // Down to the boiler room on the note.
  { t: CUT_BOILER, cells: 3.8, at: [66.75, 2.72], cut: true },
  { t: CUT_HALL - 0.02, cells: 3.55, at: [66.7, 2.74] },
  // Back up as the spout gushes.
  { t: CUT_HALL, cells: 4.2, at: [64.5, -2.6], cut: true },
  { t: FLOOD, cells: 4.6, at: [63.6, -2.6] },
  { t: RIM, cells: 3.8, at: [62.0, -2.6], focus: ON_RIM },
  { t: HOOK, cells: 4.2, at: [61.7, -2.95] },
  // The haul: the hands on the gallery, the pulley, the thorn, her on the rim.
  { t: PULLS[0], cells: 4.6, at: [61.4, -3.0] },
  { t: PULLS[PULLS.length - 1], cells: 4.8, at: [61.6, -3.05] },
  // Free, and the junk pours out.
  { t: FREE, cells: 5.4, at: [62.8, -2.85] },
  { t: RISE - 0.2, cells: 5.6, at: [63.4, -2.8] },
  // He rises, laughs, and goes.
  { t: RISE + 1.2, cells: 4.4, at: [63.1, -3.0] },
  { t: AWAY, cells: 4.6, at: [63.6, -3.0] },
  { t: CUT_OUT - 0.02, cells: 5.0, at: [65.6, -2.8] },
  // Outside: the ribbon of him rising behind the bathhouse and away over the sea.
  { t: CUT_OUT, cells: 17.0, at: [64.6, -7.8], cut: true },
  { t: CUT_IN - 0.02, cells: 17.8, at: [66.8, -8.4] },
  // Back in: the hall settling.
  { t: CUT_IN, cells: 5.0, at: [62.4, -2.7], cut: true },
  { t: 92.5, cells: 4.8, at: [62.4, -2.65] },
  { t: TO - 0.05, cells: 4.8, at: [62.4, -2.65] },
]

/* ------------------------------------------------------------------ the drawings */

const HALL = region(BATH.hall.x0 - 0.5, BATH.hall.y0 - 0.5, BATH.hall.x1 + 0.5, BATH.hall.y1 + 0.5, 1)

const outside = standing('bath-spirit-outside', region(60, -20, 92, -3, 2), END, (g) => drawSpiritOutside(g, light(g.t), CUT_OUT, CUT_IN))
/**
 * The hall, drawn after the building and clipped to the hall's box: the eave's lanterns, which hang in front of the
 * hall's front, go with the front when it comes away, except the great gable's corner, which stays in front of it.
 */
const hall = standing('bath-hall', HALL, END, (g) => {
  if (g.t < FROM || g.t >= TO || cutAt(g.t).hall <= 0) return
  const L = light(g.t)
  const h = BATH.hall
  g.ctx.save()
  g.ctx.beginPath()
  g.ctx.rect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0 + 0.4)
  g.ctx.rect(h.x0 + 0.75, h.y0, -0.75, 0.95)
  g.ctx.clip('evenodd')
  drawHallBack(g, L)
  drawHallLamps(g, L)
  drawTubBack(g, L)
  drawMound(g, L)
  drawThorn(g, L)
  drawSpirit(g, L)
  const flow = smooth(g.t, CUT_HALL - 0.6, CUT_HALL + 0.25) * (1 - smooth(g.t, FLOOD + 7, FLOOD + 10))
  drawSpout(g, L, flow)
  drawTubWater(g, L)
  drawTubFront(g, L)
  drawToken(g, L)
  const thorn = thornAt(g.t)
  const hook = hookAt(g.t, thorn)
  const hands = HANDS.map((h) => h.path.where(g.t))
  const slack = smooth(g.t, FREE, FREE + 0.25)
  drawPulley(g, L, g.t >= FREE ? [PULLEY[0], thorn[1] - 0.06] : hook, hands, slack)
  drawBicycle(g, L, [PULLEY[0], thorn[1] - 0.06])
  drawJunk(g, L)
  g.ctx.restore()
})
/** The boiler room, over the footings where its front is away (it is drawn after the building, so it covers them). */
const boiler = standing('bath-boiler', region(BATH.boiler.x0 - 0.5, BATH.boiler.y0 - 0.5, BATH.boiler.x1 + 0.5, BATH.boiler.y1 + 0.5, 1), END, (g) => {
  if (cutAt(g.t).boiler > 0) drawBoiler(g, light(g.t))
})
/** The pipe from the boiler room up through the footings to the hall's spout. */
const pipe = standing('bath-pipe', region(BATH.spout[0] - 1, BATH.hall.y1 - 1, BATH.spout[0] + 1, BATH.boiler.y0 + 1, 0.8), END, (g) => {
  const L = light(g.t)
  const x = BATH.spout[0]
  g.ctx.fillStyle = lit('#6E5432', L.ambient)
  g.ctx.fillRect(x - 0.07, BATH.hall.y1, 0.14, BATH.boiler.y0 - BATH.hall.y1)
})
const mask = standing('bath-noface-mask', region(NOFACE_AT[0] - 1, NOFACE_AT[1] - 1, NOFACE_AT[0] + 1, NOFACE_AT[1] + 1, 0.5), END, null, (g) => {
  if (g.t < FROM || g.t >= TO) return
  drawMask(g, light(g.t), nofaceAt(g.t), NOFACE_R, noFaceLook(g.t))
})

export const bathhouse: Scene = {
  key: 'bathhouse',
  from: FROM,
  to: TO,
  hero: HERO,
  haku: { moves: HAKU_MOVES, on: [[FROM, TO]] },
  noface: { moves: NOFACE_MOVES, on: [[FROM, TO]] },
  actors: HANDS,
  shots: SHOTS,
  back: [outside],
  mid: [gorge, building, hall, pipe, boiler, bridge],
  front: [hallFront, mask],
  overview: { x0: 40, y0: -14.5, x1: 74, y1: 4.6 },
}
