import type { Pt } from '../../../../parts'
import { SEAM } from './music'
import { HANNAH_AGE } from './worlds'

/**
 * What Louise is doing at every cut, so the parts on either side agree without seeing each other.
 *
 * At a cut (a change of place) the camera carries the last framing across exactly (a match cut on Louise), so her
 * place on the screen is continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: her velocity at the seam, cells a second, y down, in each side's own world. The part before ends its lane
 *   moving at `v`; the part after starts moving at `v`.
 * - `cells`: how close the camera is at the seam. The part before has a key at the seam (or just before it) at this
 *   distance, framed on her as `frame` says; the part after starts from it and makes its own moves (its first key at
 *   least 0.4 s after the seam).
 * - `frame`: where the camera's centre is from her, in cells ([0.9, -0.8] puts her left of centre and low).
 * - `ian`, `hannah`, `shang`: where they are from her at the seam, on both sides, moving with her; null where they are
 *   not in the picture on either side. They may come or go at a cut (the whole place changes), and `what` says when a
 *   side has them and the other does not.
 * - `open`: a scale match cut. The incoming leg opens this many cells tall, the carried framing scaled about her, so
 *   her place on the screen holds exactly while the picture changes size on the cut.
 * - `veil`: the cut happens inside a white-out the director draws over both places: the frame is white for a moment,
 *   and her place in it still holds.
 * - `shell`: the one cut that is not on Louise. The camera has pushed into the television until its picture fills the
 *   frame; the valley opens with the real shell exactly where the television's was, the same size on the screen
 *   (`score.ts` works the framing out from `TV_SHELL` and `SHELL_CUT`). Louise is out of the picture on both sides.
 *
 * Hannah is always on Louise's right and a little above her at a cut into or out of the lake house (in the cradle,
 * on the swing's seat, in the bed): the three are one rhyme, and the show's last frame is its first.
 */
export interface Seam {
  t: number
  v: Pt
  cells: number
  frame: Pt
  ian: Pt | null
  hannah: Pt | null
  shang: Pt | null
  /** Hannah's size on each side (her age), where she is in the picture. */
  hannahAge?: [number, number]
  open?: number
  veil?: boolean
  shell?: boolean
  /** What she is doing, in words, for whoever builds either side. */
  what: string
}

/**
 * The show's first frame, which the last scene settles on again: the lake house at dawn, Louise beside the cradle,
 * baby Hannah in it, the long window over the lake above them. The dawn part's first camera key is a hold at this
 * framing, and the home part's last keys settle on it from the last B-flat (`TONIC`) to the end.
 */
export const FIRST = { cells: 4.6, frame: [1.05, -0.95] as Pt }

/** Where Hannah is from Louise at a cut into or out of the lake house: on her right, a little above. */
export const HANNAH_BY: Pt = [1.0, -0.35]

export const SEAMS: Record<keyof typeof SEAM, Seam> = {
  swing: {
    t: SEAM.swing,
    v: [0, 0],
    cells: 4.6,
    frame: [1.05, -0.95],
    ian: null,
    hannah: HANNAH_BY,
    hannahAge: [HANNAH_AGE.baby, HANNAH_AGE.child],
    shang: null,
    what: 'at rest. Dawn side: on the floor beside the cradle under the long window, baby Hannah in it on her right (the cradle still, between rocks). Lawn side, years on: on the grass behind the swing, a small child Hannah on its seat on her right, the swing hanging still at the back of its arc, in reach of her. Her first push is the lawn\'s first strike.',
  },
  bed: {
    t: SEAM.bed,
    v: [0, 0],
    cells: 4.6,
    frame: [1.05, -0.95],
    ian: null,
    hannah: HANNAH_BY,
    hannahAge: [HANNAH_AGE.girl, HANNAH_AGE.young],
    shang: null,
    what: 'at rest. Lawn side: Hannah (a girl now) back on the swing\'s seat on her right, the swing come to rest, the light going. Bed side, years on: in the room with the long window, beside the bed, Hannah (a young woman, ill) in it on her right. The cellos come in here.',
  },
  news: {
    t: SEAM.news,
    v: [0, 0],
    cells: 4.6,
    frame: [1.05, -0.95],
    ian: null,
    hannah: null,
    shang: null,
    what: 'at rest. Bed side: beside the empty bed (Hannah went on the swell, 93.861), the room grey. News side: the same place in the room at night, the bed gone from it, the television\'s glow across the floor from her right: on the half cadence it comes on.',
  },
  arrival: {
    t: SEAM.arrival,
    v: [0, 0],
    cells: 1.35,
    frame: [0, 0],
    ian: null,
    hannah: null,
    shang: null,
    shell: true,
    what: 'the match cut on the shell, on the double bass. News side: the camera has pushed into the television until its picture fills the frame: the shell coming down out of cloud on the news, TV_SHELL (its centre and height, in the house\'s world cells, at the cut). Louise is out of the picture, in front of the set. Valley side: the real shell, coming down out of the cloud, at SHELL_CUT (its centre and height in the valley\'s cells at the cut); the valley opens on it the same size and in the same place on the screen (the score works the framing out), and finds her, far below, after.',
  },
  contact: {
    t: SEAM.contact,
    v: [0, 0],
    cells: 4.2,
    frame: [0.85, -0.7],
    ian: [-0.42, 0],
    hannah: null,
    shang: null,
    what: 'at rest, Ian on her left. Valley side: on the deck of the lift at the top of its travel, in the dark of the shell\'s open belly, the camera close. Shell side: at the threshold of the chamber in the dark, the glass not yet lit, to her right.',
  },
  dark: {
    t: SEAM.dark,
    v: [0, 0],
    cells: 4.2,
    frame: [0.85, -0.7],
    ian: [-0.42, 0],
    hannah: null,
    shang: null,
    what: 'at rest, Ian on her left. Chamber side: before the glass, the last logogram of the conversation (the one she reads as "weapon") hanging on it. Tent side: in the command tent at night, before the ring of twelve screens (each a shell somewhere on Earth), all lit; the bass drops out and the first link falls.',
  },
  bomb: {
    t: SEAM.bomb,
    v: [0, 0],
    cells: 4.2,
    frame: [0.85, -0.7],
    ian: [-0.42, 0],
    hannah: null,
    shang: null,
    what: 'at rest, Ian on her left. Tent side: the ring of screens dark but one. Chamber side: before the glass again, the next session; the charge the soldiers hid is already ticking behind them, where the camera does not yet look.',
  },
  fog: {
    t: SEAM.fog,
    v: [0, 0],
    cells: 5,
    frame: [0.6, -0.7],
    ian: null,
    hannah: null,
    shang: null,
    veil: true,
    what: 'at rest, in white. Chamber side: thrown by the blast (223.370) and come to rest on the floor, the dust in the air lit white by the broken glass: the director\'s veil is up by the cut. Ian is out of this framing (he does not go on). Fog side: beyond the glass, alone, at rest in the white, which clears to the fog.',
  },
  sees: {
    t: SEAM.sees,
    v: [0, 0],
    cells: 4.6,
    frame: [1.05, -0.95],
    ian: null,
    hannah: HANNAH_BY,
    hannahAge: [HANNAH_AGE.young, HANNAH_AGE.young],
    shang: null,
    what: 'at rest. Fog side: before Costello, who writes; a logogram forming at her right (where Hannah will be on the other side of the cut): what she is shown. Lawn side: the swing by the lake on a summer evening, Hannah (a young woman, well) on its seat on her right, the swing at the back of its arc: a moment that has not happened yet. Hannah is only on the lawn side.',
  },
  fog2: {
    t: SEAM.fog2,
    v: [0, 0],
    cells: 4.6,
    frame: [1.05, -0.95],
    ian: null,
    hannah: HANNAH_BY,
    hannahAge: [HANNAH_AGE.young, HANNAH_AGE.young],
    shang: null,
    what: 'at rest. Lawn side: behind the swing, Hannah on its seat on her right, as at the cut in. Fog side: before Costello again, the logogram at her right complete: she knows. Hannah is only on the lawn side.',
  },
  gala: {
    t: SEAM.gala,
    v: [0, 0],
    cells: 4.4,
    frame: [0.8, -0.8],
    ian: null,
    hannah: null,
    shang: null,
    what: 'at rest. Fog side: in the white, the logogram of the answer before her. Gala side, years on: at the gala in champagne light, in the room\'s crowd of dark figures; Shang comes to her from her right after the cut.',
  },
  call: {
    t: SEAM.call,
    v: [0, 0],
    cells: 4.4,
    frame: [0.8, -0.8],
    ian: null,
    hannah: null,
    shang: [0.34, 0],
    what: 'at rest. Gala side: Shang beside her on her right, leaning in, touching: he has told her. Tent side: at the table in the command tent at night, the sat phone on the table on her right where he was: she has taken it. Shang is only on the gala side.',
  },
  going: {
    t: SEAM.going,
    v: [0, 0],
    cells: 4.4,
    frame: [0.8, -0.8],
    ian: null,
    hannah: null,
    shang: null,
    what: 'at rest. Tent side: before the ring of twelve screens, every link standing again, the ring whole. Meadow side: on the meadow in the morning, the shell over her about to go up.',
  },
  home: {
    t: SEAM.home,
    v: [0, 0],
    cells: 4.4,
    frame: [0.8, -0.8],
    ian: [0.36, 0],
    hannah: null,
    shang: null,
    what: 'at rest, Ian touching her on her right. Meadow side: in the daylight where the shell was, the cloud opened. House side: in the lake house at dusk by the long window, Ian beside her; the cradle is there, empty, on her right a little way off. He goes out of the picture before the end; on the fall onto B-flat (349.495) baby Hannah comes into the cradle, her going played backwards, as the camera goes in to it, with no cut, and the picture settles on the first frame.',
  },
}

/**
 * The shell on the television at the cut into the valley (the news part's, in the house's world cells): its centre
 * and its height. And the real shell at that moment (the valley's, in the valley's world cells). The score frames the
 * valley's first moment so the one lands on the other. The builders fill these in; the stubs have them.
 */
export interface ShellSpot {
  c: Pt
  h: number
}
