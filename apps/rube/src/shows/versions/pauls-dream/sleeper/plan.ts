import { M } from './music'
import type { Pt } from './paint'

/**
 * The plan: where every place is in the world, when each scene has the stage, and what the scenes promise one another
 * at their seams.
 *
 * The world is one plane in cells, up negative. Caladan stands far to the west of everything; Arrakis runs west to east:
 * Arrakeen in its bowl of rock, the open erg the ornithopters cross to the harvester, the night desert, the storm, and
 * the Fremen's rocks. Sea level on Caladan and the floor of Arrakeen are both y = 0; the desert's dunes stand on it.
 */

/** The places, as x ranges (cells). A scene draws nothing outside its own. */
export const PLACES = {
  /** Castle Caladan on its sea cliff, the sea west of it, the landing field east, and the sky over it to space. */
  caladan: { x0: -760, x1: -380 },
  /** Arrakeen: the city in its bowl of rock, the palace, the landing pad, the sky the frigate comes down through. */
  arrakeen: { x0: -40, x1: 160 },
  /** The open erg east of the city: the ornithopters' flight and the harvester. */
  erg: { x0: 200, x1: 640 },
  /** The night desert where Paul and Jessica are put down, and the storm east of it. */
  night: { x0: 700, x1: 1060 },
  /** The Fremen's rocks at dawn, and the open sand they go on into. */
  rocks: { x0: 1120, x1: 1500 },
} as const

/** When each scene has the stage, show seconds. */
export const WINDOWS = {
  /** Caladan: the sea, the dream, the box, the bull, the leaving (the director's). */
  caladan: [0, M.drop],
  /** The arrival on Arrakis, and the bull's head hung again. */
  arrival: [M.drop, 130.664],
  /** The ornithopters, the harvester and the first worm. */
  erg: [130.664, 198.252],
  /** The night: the shield down, the armada, Paul and Jessica taken, the Duke and the Baron. */
  attack: [198.252, 275.168],
  /** Put down in the night desert, the stilltent and the visions, the storm. */
  storm: [275.168, M.breath2],
  /** The Fremen, Jamis, Chani, the walk, the worm rider, the end. */
  fremen: [M.breath2, 440],
} as const

/** The show's length: the cue, and the credits on after it into the quiet. */
export const END = WINDOWS.fremen[1]

/**
 * The fold (M.drop): the frigate in the heighliner over Caladan, and on the drop the same frigate coming down over
 * Arrakis, in the same place on the screen at the same size, the world changed round it. Both sides frame it at its
 * middle, `cells` tall, the ship level.
 */
export const FOLD = { cells: 26 } as const

/**
 * The roof of the palace in Arrakeen, where the ornithopters stand: the middle of the pad's top, cells. The arrival
 * draws the pad here; the erg's scene picks the ornithopters up off it.
 */
export const PAD: Pt = [118, -15]

/**
 * The dream shot, in the Fremen's scene: Chani on the crest at dawn, turning toward Paul. Paul dreams it on Caladan and
 * sees it again in the spice, so it must be one held composition from `from` to `to`: her on the crest against the sky
 * in the frame's right half, nobody else near her, Paul out of shot.
 */
export const DREAM_SHOT = { from: 338.4, to: 342.6 } as const

/** The duel's last blow, in the Fremen's scene: Jamis goes down. A vision in the stilltent shows it. */
export const JAMIS_FALLS = 349.629

/** The worm and its rider rising on the horizon, in the Fremen's scene: seen in the stilltent's last vision. */
export const RIDER = { from: 385.945, to: M.last } as const

/** The frame's bars: Caladan in the old scope picture, opening on the drop as the frigate comes down over Arrakis. */
export const OPENING = { from: M.drop, to: M.drop + 2.6 } as const
