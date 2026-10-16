import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { lerp, smooth } from './brush'
import { CISTERN, GATE, NORIA, PIPE } from './geo'
import { Camera, follow, glide, hold, smoothed, type Frame, type Shot } from './lens'
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
    { from: bar(5), frame: glide(bar(5), bar(8), { x: 128, y: 27, cells: 150 }, { x: 130, y: 28, cells: 144 }) },
    { from: bar(8), frame: hold(3.4, -9.6, 7) },
    { from: at(9, 0) + 0.5, frame: follow(where, 7.2, 1.6, 1.4, 0.7, 0.15, { y1: -9.4 }) },
    { from: at(10, 0) - 0.35, frame: hold(PIPE.x + 0.4, -6.2, 13) },
    { from: at(11, 0) + 0.7, frame: follow(where, 10, 2.6, -3.0, 1.0, 0.2, { x1: 45 }) },
    { from: at(14, 0) - 1.4, frame: glide(at(14, 0) - 1.4, at(19, 0), { x: 50.5, y: -0.6, cells: 12.5 }, { x: 53.5, y: -0.9, cells: 12 }) },
    // The road.
    { from: bar(20), frame: them, focus: theirMiddle },
    // The bucket, then down.
    { from: bar(24), frame: glide(bar(24), bar(27), { x: 59.8, y: -1.0, cells: 9 }, { x: 59.8, y: -0.6, cells: 8.4 }) },
    { from: bar(27), frame: glide(bar(27), bar(28) + 0.6, { x: 59.8, y: -0.6, cells: 8.4 }, { x: 62.5, y: 10.2, cells: 15 }) },
    // The cistern: the ground's face above, the water below, the ball crossing.
    {
      from: bar(28) + 0.6,
      frame: (t) => {
        const [x] = smoothed(where, t, 1.5, 0)
        return { x: Math.max(62.5, Math.min(x + 1.5, CISTERN.x1 - 1)), y: 10.2 + 1.2 * smooth(t, bar(32), bar(35)), cells: 15 }
      },
    },
    // The first terrace, in the storm: following, the frame opening out as the rain thickens.
    { from: bar(35), frame: (t) => ({ ...follow(where, 13, 2.5, -2.2, 1.0, 0.2)(t), cells: lerp(13, 20, smooth(t, bar(36), bar(39.5))) }) },
    // The road: the gust.
    { from: bar(40), frame: (t) => ({ ...them(t), cells: 13 }), focus: theirMiddle },
    // The hammers.
    { from: bar(44), frame: follow(where, 17, 2.5, -2.5, 1.4, 0.3) },
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
    { from: bar(84), frame: glide(bar(84), duration, { x: 3.9, y: -8.6, cells: 9.6 }, { x: 4.1, y: -8.4, cells: 10.4 }) },
  ]
  const cam = new Camera(shots)
  return (t: number) => {
    const f = cam.at(Math.max(0, Math.min(duration, t)))
    LOOK.x = f.x
    LOOK.y = f.y
    return f
  }
}
