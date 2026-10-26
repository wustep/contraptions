import { R } from '../../../../../parts'
import { FEYD_SIZE } from '../cast'
import { drawing, smooth, type Brush } from '../paint'
import type { Scene } from '../scene'
import { onsetNear } from '../music'
import { END } from '../timeline'
import { FEYD_PATH, FIGHT_STRIKES, FIGHTERS, KNIFE, PRISONER_PATHS, feydAt, pairLine } from './arena/fight'
import { A, X0 } from './arena/geo'
import { BLOOMS, paintInk } from './arena/ink'
import { gateX, paintDoor, paintFloor, paintLong, paintPylon, paintSeat, paintSky, paintStands } from './arena/set'
import { modeAt } from './arena/views'

/**
 * Giedi Prime, under its black sun (186.0 to 262.9): the arena, in black and white.
 *
 *   186.0    the dissolve from the eclipse: the white sky, the black sun where the eclipsed one was, the bowl of black
 *            tiers rising round it, two black pylons at the floor's ends; a slow push in
 *   190.1    Feyd-Rautha's gate opens: close, he steps out of the dark pylon into the white and walks out onto the floor;
 *   194.4    the floor: the prisoners' gate open (190.8), the three shoved in across it toward him, one by one
 *   196.6    down on the sand, close: the crowd a dark band low behind, the black sun over it; Feyd comes in
 *   198.0    the first blow, the hardest note of the cue: the first prisoner thrown back, his colour going out
 *   202.2    the second, harder still: the second, who came at him over the first
 *   205.1    the third comes over his dead and onto him
 *   205.4    from the rim, looking down: the pale floor, the long shadows; five strokes in a second (207.5 to 208.5)
 *   213.4    close among them, the crowd's front rows behind: a clash
 *   218.5    close: the ram, Feyd knocked back and down (222.6), up again (223.7)
 *   224.1    from the rim again, over them circling, drawing up and away until the whole round floor is under us; a feint
 *   233.7    close: a clash; 235.9 down on the sand: the exchange; 243.5 the lunge, and he vaults over it
 *   244.4    the held breath, from the rim: the two of them still among their long shadows; 250.1 the kill
 *   252.0    the bowl and the sky: ink opening over the arena (250.1, 254.9, 258.3); still from 258.8 to the dissolve
 */

const FEYD_R = R * FEYD_SIZE

/** The middle of the three prisoners, on the floor: what the camera goes with as they are shoved in. */
const threeAt = (t: number): [number, number] => {
  let x = 0
  for (const p of PRISONER_PATHS) x += p.where(t)[0]
  return [x / PRISONER_PATHS.length, -R]
}

/** Back to the floor from his walk out, on the music, as the three come in from the east. */
const ENTER = onsetNear(194.386, 0.2, 0.03)

/** Each fighter's foot on the floor, seated by a soft dark, less of it the higher he is off the floor. */
function paintSeats(b: Brush): void {
  const seat = (x: number, y: number, r: number, size: number) => paintSeat(b, x, size, 1 - smooth(-y - r, 0, 0.8))
  const [fx, fy] = FEYD_PATH.where(b.t)
  seat(fx, fy, FEYD_R, FEYD_SIZE)
  for (const p of PRISONER_PATHS) {
    const [x, y] = p.where(b.t)
    seat(x, y, R, 1)
  }
}

/** From the rim, every fighter's long shadow across the sand, from where he stands on it. */
function paintShadows(b: Brush): void {
  paintLong(b, FEYD_PATH.where(b.t)[0], FEYD_SIZE)
  for (const p of PRISONER_PATHS) paintLong(b, p.where(b.t)[0], 1)
}

/** Feyd's knife: a short dark blade out of him toward the man he kills, on the note, and back. */
function paintKnife(b: Brush): void {
  const { ctx, t } = b
  for (const [at, dir] of KNIFE) {
    if (t < at - 0.1 || t > at + 0.7) continue
    const out = t < at ? smooth(t, at - 0.09, at) : 1 - smooth(t, at + 0.15, at + 0.65)
    if (out <= 0.01) continue
    const [x, y] = FEYD_PATH.where(t)
    const base = x + dir * FEYD_R * 0.7
    const tip = x + dir * (FEYD_R + 0.26 * out)
    const w = 0.032
    ctx.beginPath()
    ctx.moveTo(base, y - w)
    ctx.lineTo(tip - dir * 0.05, y - w * 0.8)
    ctx.lineTo(tip, y + 0.004)
    ctx.lineTo(tip - dir * 0.05, y + w * 0.5)
    ctx.lineTo(base, y + w)
    ctx.closePath()
    ctx.fillStyle = b.c('#151515')
    ctx.fill()
  }
}

const here = (t: number) => t >= A.in && t < A.out

export const arena: Scene = {
  key: 'arena',
  from: A.in,
  to: A.out,
  actors: FIGHTERS,
  dissolves: [[A.in, A.inFor]],
  shots: [
    // The bowl from its floor, the black sun in the notch of its rim: held through the dissolve, then a slow push in.
    { t: A.in, cut: true, cells: 54, at: [X0, -14] },
    { t: A.in + A.inFor + 0.3, cells: 54, at: [X0, -14] },
    { t: A.westGate - 0.01, cells: 47, at: [X0, -12.6] },
    // His gate, close, as its door goes up: he steps out of the dark of the pylon into the white, and walks out onto the
    // floor, the camera going with him.
    { t: A.westGate, cut: true, cells: 3.6, at: [gateX(-1) + 1.0, -1.05] },
    { t: A.westGate + 0.8, cells: 3.6, at: [gateX(-1) + 1.0, -1.05] },
    { t: ENTER - 0.01, cells: 3.9, track: feydAt, off: [0.8, -0.9] },
    // The three, shoved in across the floor toward him, walking in a file under the black sun.
    { t: ENTER, cut: true, cells: 6.6, track: threeAt, off: [-0.6, -1.25] },
    { t: 196.4, cells: 6.2, track: threeAt, off: [-0.8, -1.2] },
    // Down on the sand, close: the two blows, and the third over his dead onto Feyd.
    { t: A.floor, cut: true, cells: 3.3, at: [5998.45, -1.03] },
    { t: A.above - 0.01, cells: 3.1, at: [5998.45, -0.98] },
    // From the rim, looking down: the strokes, and the parting.
    { t: A.above, cut: true, cells: 4.0, track: pairLine, off: [0, 0] },
    { t: A.clash2 - 0.01, cells: 3.8, track: pairLine, off: [0, 0] },
    // Close among them, the crowd's front rows behind; the two of them a little above the frame's middle.
    // Held through the ram, the fall and the getting up: a grand wide of the bowl cut into it here for a second and a
    // half, and read as the close shot interrupted.
    { t: A.clash2, cut: true, cells: 3.0, track: pairLine, off: [0, -0.5] },
    { t: A.circle - 0.01, cells: 3.4, track: pairLine, off: [0, -0.56] },
    // From the rim again, close over them as they circle, then drawing up and away until the whole round floor is
    // under us: the two of them and their dead small in the middle of it, the pylons at its ends.
    { t: A.circle, cut: true, cells: 4.6, track: pairLine, off: [0, 0] },
    { t: 226.4, cells: 5.4, track: pairLine, off: [0, 0] },
    { t: A.clash3 - 0.01, cells: 21, at: [X0 - 1.5, -0.14] },
    // Close: they come together again.
    { t: A.clash3, cut: true, cells: 3.0, track: pairLine, off: [0, -0.5] },
    { t: A.close - 0.01, cells: 3.1, track: pairLine, off: [0, -0.52] },
    // Down on the sand: the exchange, and the vault against the sky.
    { t: A.close, cut: true, cells: 3.2, track: pairLine, off: [0, -0.86] },
    { t: A.breath - 0.01, cells: 3.3, track: pairLine, off: [0, -0.89] },
    // The held breath from the rim: the two of them still, their shadows long, the dead round them; the kill.
    { t: A.breath, cut: true, cells: 3.8, at: [5998.6, -0.14] },
    { t: A.kill, cells: 3.4, at: [5998.35, -0.14] },
    { t: A.sky - 0.01, cells: 3.35, at: [5998.3, -0.14] },
    // The sky: the ink opening over the arena, rising to it, and still.
    { t: A.sky, cut: true, cells: 52, at: [X0, -15] },
    { t: 258.8, cells: 50, at: [X0, -24] },
    { t: A.out, cells: 50, at: [X0, -24] },
  ],
  back: [
    drawing('arena', END, (b) => {
      if (!here(b.t)) return
      const mode = modeAt(b.t)
      if (mode === 'high') {
        paintFloor(b, mode)
        paintShadows(b)
        return
      }
      paintSky(b, mode)
      paintInk(b)
      paintStands(b, mode)
      paintFloor(b, mode)
      paintPylon(b, -1)
      paintPylon(b, 1)
      paintSeats(b)
    }),
  ],
  front: [
    // Over the balls: the doors they wait behind, and the knife.
    drawing('arena-front', END, null, (b) => {
      if (!here(b.t)) return
      if (modeAt(b.t) !== 'high') {
        paintDoor(b, -1, A.westGate)
        paintDoor(b, 1, A.eastGate)
      }
      paintKnife(b)
    }),
  ],
  overview: { x0: X0 - 50, y0: -55, x1: X0 + 50, y1: 6 },
  strikes: [
    ['the west gate opens', A.westGate],
    ['the east gate opens', A.eastGate],
    ['the first is shoved out', A.shoved[0]],
    ['up to the rim', A.above],
    ['the held breath', A.breath],
    ...FIGHT_STRIKES,
    ...BLOOMS.map((o, i): [string, number] => [`ink ${i + 1}`, o.at]),
  ],
}
