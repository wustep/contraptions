import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { mix, type Pen } from '../pen'
import { CREDITS_AT, SON, at } from '../music'
import { BABY_SCALE } from '../worlds'
import { drawOver, drawPart, drawSet, warm } from './draw'
import { babyAt, CLOSE, HOSPITAL_STRIKES, hospitalWay, LIFT, martyAt, NUDGE, rachelAt, T1 } from './geo'

/**
 * The ward (202.391 → 266, bar 95 to the end). On "All for freedom and for pleasure" he is at rest on the foot of
 * Rachel's bed in the grey of dawn; he rolls up the blanket to her, and they rest together on her pillow, a small warm
 * glow between them (he tells her, for the first time, that he loves her). She nudges him: go. He rolls back down the
 * bed, springs off its foot, and hops out of the ward's door and down the corridor's checkerboard on the beats, onto the
 * bench, onto the nursery's sill; and on the last "Everybody wants to rule the world" the blind goes up and there is his
 * son, in the front row's first bassinet. Through the guitar and the fade he stays at the glass, trembling on the beats
 * (he is crying), while the other babies cry and the nurse lifts the boy a little toward the glass; the camera eases
 * back to a still picture of the corridor's window, the wall above it pale and quiet for the credits, the morning
 * warming to gold until the end.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const HOSPITAL_AT: Pt = [0, 0]
export const HOSPITAL_CELLS = box(-20, -9, 10, 5, 2)

/** The pen: every colour warmed a little as the dawn comes up. */
const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number, t: number): Pen => {
  const f = 0.13 * warm(t)
  return { p, k, ink, w, tone: f < 0.002 ? (h) => h : (h) => mix(h, '#F7C987', f) }
}

/** The ward, the corridor and their light: drawn first, on show time. */
export const hospitalSet = scenery<null>({
  name: 'hospital-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight, c.t)
    p.push()
    drawSet(pen, c.t, frame(p, c.k))
    p.pop()
  },
})

interface WardState {
  begin: number
}

/** The ward: Rachel, the corridor, and the nursery's glass (bar 95 → the end). */
export const nursery = part<WardState>(
  {
    name: 'nursery',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawPart(penOf(p, c.k, c.ink, c.weight, t), t, martyAt(t), rachelAt(t), babyAt(t))
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawOver(penOf(p, c.k, c.ink, c.weight, t), t, martyAt(t), rachelAt(t), babyAt(t))
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-20, -9, 10, 5),
    exit: [CLOSE[0] + 0.5, CLOSE[1]] as Pt,
    lane: { segs: hospitalWay(), fire: NUDGE - slot.begin },
    state: { begin: slot.begin },
    company: [
      { who: 'rachel' as const, from: slot.begin, to: T1, at: (t: number) => { const [x, y] = rachelAt(t); return { x, y } } },
      // Their son is in his bassinet from the cut, far out of shot behind the nursery's blind, until the blind goes up.
      { who: 'baby' as const, from: slot.begin, to: T1, at: (t: number) => { const [x, y] = babyAt(t); return { x, y, scale: BABY_SCALE } } },
    ],
  }),
  () => shots(),
)

/**
 * The camera: from the seam's hold, a slow push in on the two of them on the pillow; then away with him off the bed,
 * out of the door and down the corridor; on SON a hold on him at the glass, his son beside him behind it; and through
 * the outro a slow ease back to the still picture the credits sit over: the window low, the pale wall high.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, h: Pt): PartShot => ({ t, cells, hold: h, w: 1 })
  return [
    hold(at(96, 1), 3.15, [0.25, -0.45]),
    hold(at(97, 2), 2.95, [0.25, -0.4]),
    hold(at(98, 1), 3.45, [-1.6, -0.4]),
    hold(at(98, 2), 3.8, [-2.3, 0.15]),
    hold(at(98, 4), 4.0, [-5.4, 0.2]),
    hold(SON, 4.2, [-8.2, -0.55]),
    hold(LIFT, 4.7, [-8.4, -0.85]),
    hold(at(107, 1), 5.2, [-8.7, -1.3]),
    hold(CREDITS_AT, 6.2, [-8.9, -1.85]),
    hold(259, 5.3, [-8.6, -1.7]),
    hold(T1, 4.6, [-8.3, -1.42]),
  ]
}

export const HOSPITAL_HITS: readonly number[] = HOSPITAL_STRIKES
export const HOSPITAL_WIDE: [number, number][] = []

