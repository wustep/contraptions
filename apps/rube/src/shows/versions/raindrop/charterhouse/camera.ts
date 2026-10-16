import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { lerp, smooth } from './brush'
import { CISTERN, GATE, HAMMERS, NORIA, PIPE } from './geo'
import { OVER } from './terraces'
import { Camera, blend, follow, glide, hold, smoothed, type Frame, type Shot } from './lens'
import { FORM, at, bar } from './music'
import { LOOK } from './show'
import { theirMiddle } from './travelers'

/**
 * The shots, in order, each cut on a phrase of the music.
 *
 *   bars  1– 4  the eave: the jar under the drip, the ball behind its latch, the lit window
 *   bars  5– 7  the mountainside, wide: the charterhouse above, two people on the road far below
 *   bars  8–10  the jar tips; along the gutter; the pipe
 *   bars 11–13  along the rill
 *   bars 14–19  the chime of tiles, and the well
 *   bars 20–23  the road: the two of them, walking up in the rain
 *   bars 24–27  the bucket filling; down the well
 *   bars 28–34  the cistern, in section: the ball afloat in the dark
 *   bars 35–39  out into the storm along the first terrace
 *   bars 40–43  the road: the gust, their lantern out
 *   bars 44–50  the hammers, down the terraces
 *   bars 51–55  the wheel
 *   bars 56–59  over the gully to the gate
 *   bars 60–63  the lantern lit
 *   bars 64–67  the bell
 *   bars 68–71  the road: they look up and see it
 *   bars 72–75  the climb
 *   bars 76–81  the gate: the door, and in
 *   bars 81–83  the rain stops: the mountainside, wide, clearing
 *   bars 84–89  the eave again: the last drops into the full jar, and the window
 */
export function makeCamera(where: (t: number) => Pt, duration: number): (t: number) => Framing {
  const them: Frame = (t) => {
    const [x, y] = smoothed(theirMiddle, t, 1.2, 0)
    return { x, y, cells: 15 }
  }
  const shots: Shot[] = [
    { from: 0, frame: glide(0, bar(5), { x: 3.7, y: -9.2, cells: 8.6 }, { x: 3.5, y: -9.35, cells: 7.9 }) },
    { from: bar(5), frame: glide(bar(5), bar(8), { x: 136, y: 30, cells: 160 }, { x: 138, y: 31, cells: 154 }) },
    // Bar 8: back on the jar, nearly full; the tip, and away along the gutter after the ball, the camera easing in behind.
    { from: bar(8), frame: blend(hold(3.4, -9.6, 7), follow(where, 7.2, 1.6, 1.4, 0.7, 0.15, { y1: -9.4 }), at(9, 0) + 0.1, at(9, 0) + 1.6) },
    // Bar 10: the head and the pipe, the whole height of the wall; then along the rill, and on to the chime.
    { from: at(10, 0), frame: blend(hold(PIPE.x + 0.4, -6.2, 13), follow(where, 10, 2.6, -3.0, 1.0, 0.2, { x1: 45 }), at(11, 0) + 0.3, at(11, 0) + 2.2) },
    { from: bar(14), frame: glide(bar(14) - 0.01, bar(19), { x: 50.5, y: -0.6, cells: 12.5 }, { x: 53.5, y: -0.9, cells: 12 }) },
    // The road.
    { from: bar(20), frame: them, focus: theirMiddle },
    // The bucket, then down.
    { from: bar(24), frame: glide(bar(24), bar(27), { x: 59.8, y: -1.0, cells: 9 }, { x: 59.8, y: -0.6, cells: 8.4 }) },
    // Bar 27: down with the bucket into the cistern, and along it, the ball crossing the water.
    {
      from: bar(27),
      frame: blend(
        glide(bar(27), bar(28) + 0.6, { x: 59.8, y: -0.6, cells: 8.4 }, { x: 62.5, y: 10.2, cells: 15 }),
        (t) => {
          const [x] = smoothed(where, t, 1.5, 0)
          return { x: Math.max(62.5, Math.min(x + 1.5, CISTERN.x1 - 1)), y: 10.2 + 1.2 * smooth(t, bar(32), bar(35)), cells: 15 }
        },
        bar(28) + 0.6,
        bar(29),
      ),
    },
    // The first terrace, in the storm: following, the frame opening out as the rain thickens.
    { from: bar(35), frame: (t) => ({ ...follow(where, 10, 2.4, -1.9, 1.0, 0.2)(t), cells: lerp(10, 14, smooth(t, bar(36), at(39, 2))) }) },
    // The road: the gust.
    { from: bar(40), frame: (t) => ({ ...them(t), cells: 13 }), focus: theirMiddle },
    // The hammers.
    {
      from: bar(44),
      frame: (t) => {
        // Each hammer framed as it goes over, with the wall it pours down; between, over to the next.
        const at = (k: number) => ({ x: HAMMERS[k].x - 1.2, y: HAMMERS[k].y + 3.4, cells: 11.5 })
        let f = at(0)
        for (let k = 0; k < 2; k++) {
          const t0 = OVER[k] + 1.0
          const t1 = OVER[k + 1] - 1.3
          if (t > t0) {
            const u = smooth(t, t0, t1)
            const a = at(k)
            const b = at(k + 1)
            f = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), cells: 11.5 }
          }
        }
        return f
      },
    },
    // The wheel: the whole of it in the gully, closing a little as it climbs.
    { from: bar(51), frame: glide(bar(51), bar(56), { x: NORIA.x + 1, y: NORIA.y - 2.5, cells: 22 }, { x: NORIA.x + 1.5, y: NORIA.y - 4, cells: 19 }) },
    // Over the gully: the wheel, the gully, the gate across it.
    { from: bar(56), frame: glide(bar(56), bar(60), { x: 166, y: 33, cells: 34 }, { x: 170, y: 32, cells: 28 }) },
    // The lantern.
    { from: bar(60), frame: glide(bar(60), bar(64), { x: 177, y: 31.5, cells: 13 }, { x: 177.5, y: 31.2, cells: 12 }) },
    // The bell: the gable over the door.
    { from: bar(64), frame: glide(bar(64), bar(68), { x: 179.5, y: 28.5, cells: 24 }, { x: 179.5, y: 28, cells: 22 }) },
    // The road: they look up, and the gate's light is up there.
    {
      from: bar(68),
      frame: (t) => {
        const [x, y] = theirMiddle(t)
        return { x: lerp(x, GATE.lamp.x, 0.42), y: lerp(y, GATE.lamp.hang, 0.45), cells: 30 }
      },
      focus: theirMiddle,
    },
    // The climb.
    { from: bar(72), frame: (t) => ({ ...them(t), cells: 19 }), focus: theirMiddle },
    // The gate: the door, and in.
    { from: bar(76), frame: glide(bar(76), FORM.still, { x: 183, y: 33.5, cells: 17 }, { x: 181.5, y: 34, cells: 15 }) },
    // The rain stops: the whole mountainside, the gate's light and the window.
    { from: FORM.still, frame: glide(FORM.still, bar(84), { x: 120, y: 24, cells: 140 }, { x: 116, y: 23, cells: 132 }) },
    // The eave again.
    { from: bar(84), frame: glide(bar(84), duration, { x: 2.2, y: -8.2, cells: 9.6 }, { x: 1.6, y: -8.0, cells: 10.2 }) },
  ]
  const cam = new Camera(shots)
  return (t: number) => {
    const f = cam.at(Math.max(0, Math.min(duration, t)))
    LOOK.x = f.x
    LOOK.y = f.y
    return f
  }
}
