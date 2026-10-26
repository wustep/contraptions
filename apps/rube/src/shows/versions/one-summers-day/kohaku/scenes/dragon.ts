import { R } from '../../../../../parts'
import type { Key } from '../camera'
import { CHIHIRO_ID } from '../cast'
import { END } from '../credits'
import { light } from '../light'
import { M, strongest } from '../music'
import { region, smooth, standing, type Pt } from '../paint'
import { hop, rest, roll } from '../path'
import type { Scene } from '../scene'
import { BATH } from '../geo'
import { drawDragon } from '../world/dragon'
import { roomCut } from './bathhouse/cuts'
import { SHUT, drawBirds } from './dragon/birds'
import { STILL, STOP, head, spineAt, upAt } from './dragon/flight'
import { drawEastWall, drawRoom } from './dragon/room'

/**
 * The dragon (M.breath → M.high): the first quiet, the theme rising again, the second climax, and the high light
 * passage after it.
 *
 * Dawn: the plain the rain came over in the night is a sea. She is out on the balcony at the bathhouse's east end,
 * her room open behind her, and nothing moves. As the theme rises a white shape comes in over the water with a swarm of
 * white about it: the dragon, and the paper birds cutting at him. He goes under them and over them and they keep with
 * him. As the music climbs she goes in to the door's cord; he turns for the bathhouse, for her door, and on the peak he
 * comes in through it over her and down on the floor, and she knocks the cord and the shutter drops on the birds. They
 * strike it one a note, and fall. He thrashes on the floor, the blows going through him, less and less, and lies still;
 * and in the high light passage she goes to his head.
 */

export const FROM = M.breath
export const TO = M.high

const FLOOR = BATH.room.y1
const BALC: Pt = [71.75, FLOOR - R]
const INSIDE: Pt = [69.9, FLOOR - R]
const BY_HIM: Pt = [69.34, FLOOR - R]

/** She goes in on the height, knocks the cord as his tail is through, and goes to him once he is still. */
const GOES_IN = M.height
export const KNOCK = SHUT - 0.24
const TO_HIM = STILL + 0.3

const hero = [
  rest(BALC, FROM, GOES_IN),
  roll([BALC, INSIDE], GOES_IN, GOES_IN + 1.8, 'inout'),
  rest(INSIDE, GOES_IN + 1.8, KNOCK - 0.135),
  hop(INSIDE, INSIDE, KNOCK - 0.135, KNOCK + 0.135),
  rest(INSIDE, KNOCK + 0.135, TO_HIM),
  roll([INSIDE, BY_HIM], TO_HIM, TO_HIM + 1.1, 'inout'),
  rest(BY_HIM, TO_HIM + 1.1, TO),
]

/** The camera's cuts, each on an onset. */
const CUT_IN = strongest(107.2, 108.0)
const CUT_BACK = strongest(112.1, 113.3)

/** How far across the day's cloud is for the shot in among them: the great one off to the right. */
const AMONG = -3.5
/** From the cut back to her to the dissolve (one shot): the great cloud off his way in, so he comes in white on blue. */
const IN_FOR_HER = -5.5

/** A moving hold on his head, a little behind and above it. */
const onHim = (t: number, cells: number, dx = -0.6, dy = 0.25): Key => {
  const [x, y] = head(t)
  return { t, cells, at: [x + dx, y + dy], focus: [x, y] }
}

const SHOTS: Key[] = [
  // Dawn: her room open at the left, she on the balcony, the new sea.
  { t: FROM, cells: 6.0, at: [74.4, -6.1], cut: true, focus: BALC },
  { t: M.rise - 3.0, cells: 6.6, at: [75.4, -6.4], focus: BALC },
  // A white shape far out over the water, and the swarm about it: framed so he goes low over the sea under the day's
  // great cloud, white on blue, never across it.
  { t: M.rise + 2.6, cells: 12.5, at: [89.0, -12.6] },
  { t: CUT_IN - 0.05, cells: 11.6, at: [89.0, -12.7] },
  // In among them.
  { ...onHim(CUT_IN, 4.6), cut: true },
  onHim(109.4, 4.5),
  onHim(111.2, 4.8, -0.8, 0.0),
  onHim(CUT_BACK - 0.05, 5.0, -0.6, -0.2),
  // Back to her, watching from the balcony.
  { t: CUT_BACK, cells: 3.4, at: [72.6, -6.05], cut: true, focus: BALC },
  { t: GOES_IN - 0.4, cells: 3.8, at: [72.2, -6.05] },
  // He comes for the door: the room at the left, the whole sea he comes in over, wheeling, at the right.
  { t: GOES_IN + 3.0, cells: 12, at: [79.4, -9.9] },
  { t: 121.2, cells: 9.0, at: [77.2, -8.4] },
  { t: M.peak - 0.5, cells: 5.6, at: [71.8, -6.3], focus: INSIDE },
  // In over her, down on the floor; the shutter.
  { t: SHUT, cells: 4.0, at: [69.7, -6.1], focus: INSIDE },
  { t: STOP + 3.5, cells: 3.7, at: [68.9, -6.05] },
  // Still. She goes to his head.
  { t: TO_HIM + 0.8, cells: 2.8, at: [69.0, -5.95], focus: BY_HIM },
  { t: TO, cells: 2.65, at: [69.0, -5.93], focus: BY_HIM },
]

const ROOM = region(BATH.room.x0 - 1, BATH.room.y0 - 1, BATH.balcony.x1 + 1, BATH.room.y1 + 1, 0.8)
const room = standing('dragon-room', ROOM, END, (g) => {
  if (roomCut(g.t) > 0) drawRoom(g, light(g.t))
})
const dragon = standing('dragon-dragon', region(64, -16, 125, -3, 2), END, (g) => {
  if (g.t < 99 || g.t >= TO) return
  const t = g.t
  drawDragon(g, spineAt(t), light(t), {
    up: upAt(t),
    reach: smooth(t, M.peak - 0.6, M.peak) * (1 - smooth(t, STOP, STOP + 1)),
    shut: smooth(t, STILL - 1.2, STILL),
    lie: smooth(t, M.peak + 1.2, M.peak + 1.7),
  })
})
const wall = standing('dragon-wall', ROOM, END, null, (g) => {
  if (roomCut(g.t) > 0) drawEastWall(g, light(g.t), smooth(g.t, SHUT - 0.2, SHUT), KNOCK)
})
const birds = standing('dragon-birds', region(64, -16, 125, 4, 2), END, null, (g) => drawBirds(g, light(g.t)))

export const dragonScene: Scene = {
  key: 'dragon',
  from: FROM,
  to: TO,
  hero,
  shots: SHOTS,
  dissolves: [[FROM, 1.8]],
  // Out to sea at dawn; at the dragon as soon as he is there, and all the way in; at him on the floor.
  looks: [
    { id: CHIHIRO_ID, from: FROM, to: M.rise + 1.2, at: () => [96, -8.5] },
    { id: CHIHIRO_ID, from: M.rise + 0.6, to: GOES_IN, at: (t) => head(t) },
    { id: CHIHIRO_ID, from: GOES_IN + 1.8, to: KNOCK - 0.14, at: (t) => head(t) },
    { id: CHIHIRO_ID, from: KNOCK + 0.14, to: TO_HIM, at: (t) => head(t) },
    { id: CHIHIRO_ID, from: TO_HIM + 1.1, to: TO, at: (t) => head(t) },
  ],
  mid: [room, dragon],
  front: [wall, birds],
  // In among them, and from the cut back to her all the way in, the day's great cloud is off his way: white on blue.
  sky: (t) => (t >= CUT_IN && t < CUT_BACK ? AMONG : t >= CUT_BACK && t < TO ? IN_FOR_HER : 0),
  overview: { x0: 62, y0: -15, x1: 102, y1: 0 },
}
