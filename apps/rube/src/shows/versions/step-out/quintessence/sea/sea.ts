import type { Lane, Pt } from '../../../../../parts'
import { laneAt } from '../../../../../parts'
import { box, part, scenery, type PartShot } from '../kit'
import { WALTER_WARM } from '../worlds'
import { ctxOf } from '../sky/paint'
import { drawHeli, drawSkySet } from '../sky/sky-draw'
import { BOAT_X0 as SKY_BOAT_X0, SPLASH } from '../sky/sky'
import { SURF } from '../sky/sky-plan'
import { drawBoatAbove } from './boat'
import {
  BEGIN,
  BY_CAKE,
  CAKE,
  DECK_ON,
  DECK_Y,
  DRIP,
  END,
  NET_IN,
  NET_ON,
  OUT,
  plan,
  PUFFS,
  REST_X,
  sinking,
  swingAt,
  TOP,
} from './sea-plan'
import { drawBubbles, drawDeckLight, drawDeckThings, drawLine, drawNet, drawParcelSinking, drawShark, drawSplashes, drawUnder } from './sea-draw'
import { smooth } from '../kit'

/**
 * The Sea (70.398 → 95.226, bars 37 to 51), B3's.
 *
 * He goes in on bar 37 as everything over the bass drops out, and the picture goes under with the music: cold
 * blue-black, the light coming down from the surface, the boat's hull a dark shape up there. The water takes his
 * speed and he sinks, slowly, drifting; the parcel goes on down without him, turning, into the dark (the radio
 * lost). On the strongest lows of the kick and the bass a breath goes up from him. A dark shape goes by far off, slow
 * (a porpoise, he thinks); it comes back the other way, nearer; and the third time it comes by in front of him and
 * under him, the nearest and the slowest: a shark. On bar 47 a net comes down off the boat's stern; it takes him on
 * the third beat; and on bar 48, as the band comes back, he is hauled up out of the water, swung in over the deck on
 * the boom, and dropped onto it on bar 49, streaming. A fisherman's hand sets a clementine cake down beside him on its
 * paper wrapper (bar 50), Sean's notes all over the paper; he rolls over to it (bar 51), and is still.
 */

/** Where the place's first part starts. */
export const SEA_AT: Pt = [0, 0]
/** The sky's frame in the sea's: the same water, the same boat, the same helicopter, moved so he goes in at (-0.5, 0). */
const FROM_SKY: Pt = [-0.5 - SPLASH[0], -SPLASH[1]]
void SKY_BOAT_X0

/** Everything the place's set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const SEA_CELLS = box(-14, -10, 16, 12, 2)

export const seaSet = scenery<null>({
  name: 'sea-set',
  draw: (p, _s, c) => {
    const g = ctxOf(p)
    const t = c.t
    const k = c.k
    // Above the water: the sky's own overcast, far sea and ice, and the boat, exactly as the sky left them.
    g.save()
    g.translate(FROM_SKY[0] * k, FROM_SKY[1] * k)
    drawSkySet(p, k, t)
    drawBoatAbove(g, k, SKY_BOAT_X0, SURF, swingAt(t), smooth(t, DECK_ON, DECK_ON + 2.5))
    if (t < BEGIN + 6) drawHeli(p, k, t)
    g.restore()
    // And under it.
    g.save()
    drawUnder(p, k, t)
    g.restore()
  },
})

interface State {
  lane: Lane
}

export const sea = part<State>(
  {
    name: 'sea',
    flight: true,
    draw: (p, s, c) => {
      const t = BEGIN + c.t
      const g = ctxOf(p)
      const w = laneAt(s.lane, c.t)
      const him: Pt = [w.x, w.y]
      g.save()
      drawShark(p, c.k, t, false)
      drawParcelSinking(p, c.k, t)
      drawBubbles(p, c.k, t)
      drawLine(p, c.k, t, him)
      drawDeckLight(p, c.k, t)
      drawDeckThings(p, c.k, t)
      g.restore()
    },
    over: (p, s, c) => {
      const t = BEGIN + c.t
      const g = ctxOf(p)
      const w = laneAt(s.lane, c.t)
      g.save()
      drawNet(p, c.k, t, [w.x, w.y])
      drawShark(p, c.k, t, true)
      drawSplashes(p, c.k, t)
      g.restore()
    },
  },
  (slot) => {
    const lane: Lane = { segs: plan(slot.begin), fire: OUT - slot.begin }
    return {
      cells: box(-12, -6, 14, 10, 2),
      exit: [REST_X + 0.5, DECK_Y] as Pt,
      lane,
      state: { lane },
      changes: [{ at: 0, color: WALTER_WARM }],
    }
  },
  () => shots(),
)

/** The camera: down with him; wider for the shark; up with the net; onto the deck, and in to him and the cake. */
function shots(): PartShot[] {
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, w: 0, off })
  const hold = (t: number, cells: number, p: Pt): PartShot => ({ t, cells, hold: p, w: 1 })
  const deep = sinking(NET_ON)
  return [
    follow(BEGIN + 0.7, 5.2, [0.2, 0.15]),
    follow(BEGIN + 2.6, 5.7, [0.3, -0.35]),
    follow(PUFFS[3], 6.4, [0.5, -0.45]),
    follow(PUFFS[6], 6.8, [0.6, 0.35]),
    follow(PUFFS[10], 6.7, [0.5, 0.5]),
    follow(NET_IN - 0.6, 6.4, [0.4, 0.2]),
    hold(NET_ON, 6.2, [deep[0] + 0.4, deep[1] - 1.2]),
    follow(OUT + 0.15, 6.2, [0.5, -0.2]),
    hold(TOP + 0.5, 5.4, [1.45, -1.75]),
    hold(DECK_ON + 0.3, 4.8, [REST_X + 0.1, DECK_Y - 0.65]),
    hold(CAKE + 0.2, 4.3, [REST_X + 0.45, DECK_Y - 0.55]),
    hold(BY_CAKE, 3.9, [REST_X + 0.5, DECK_Y - 0.45]),
    hold(END, 3.6, [REST_X + 0.5, DECK_Y - 0.4]),
  ]
}

/** Every strike this place makes, in show seconds. */
export const SEA_HITS: readonly number[] = [
  // Under: a breath goes up on each of the strong lows.
  ...PUFFS,
  // The net hits the water; takes him; out of the water as the band comes back; the top of the haul.
  NET_IN,
  NET_ON,
  OUT,
  TOP,
  // Onto the deck; the cake set down; by the cake; a drop on the wrapper.
  DECK_ON,
  CAKE,
  BY_CAKE,
  DRIP,
]

export const SEA_WIDE: [number, number][] = []
