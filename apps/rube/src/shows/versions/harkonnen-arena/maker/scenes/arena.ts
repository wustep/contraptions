import { R } from '../../../../../parts'
import { FEYD_SIZE } from '../cast'
import { drawing, smooth, type Brush } from '../paint'
import type { Scene } from '../scene'
import { END } from '../timeline'
import { FEYD_PATH, FIGHT_STRIKES, FIGHTERS, KNIFE, PRISONER_PATHS, pairAt } from './arena/fight'
import { A, X0 } from './arena/geo'
import { BLOOMS, paintInk } from './arena/ink'
import { paintDoor, paintFloor, paintPylon, paintSeat, paintSky, paintStands } from './arena/set'

/**
 * Giedi Prime, under its black sun (186.0 to 262.9): the arena, in black and white.
 *
 *   186.0    the dissolve from the eclipse: the white sky, the black sun where the eclipsed one was, the bowl of black
 *            tiers rising round it, two black pylons at the floor's ends; a slow push in
 *   190.1    Feyd-Rautha's gate opens, and he comes out; 190.8 the prisoners' gate, and they are shoved out, one by one
 *   196.6    the floor: the three of them, and him
 *   198.0    the first blow, the hardest note of the cue: the first prisoner falls, his colour going out; the crowd rises
 *   202.2    the second, harder still: the second, who came at him over the first
 *   205.1    the third comes over his dead and onto him: close, the fight; five strokes in a second (207.5 to 208.5)
 *   216.9    wide: the crowd rocking as one on the slow pulse; 218.5 close again
 *   221.5    the ram: Feyd knocked back and down (222.6), up again (223.7)
 *   224.1    circling; a feint; strokes; 235.9 close, the exchange; 243.5 the lunge, and he vaults over it
 *   244.4    the held breath, the two of them still; 250.1 the kill
 *   252.0    wide, the sky: ink opening over the arena (250.1, 254.9, 258.3); still from 261.3 to the dissolve to the storm
 */

const FEYD_R = R * FEYD_SIZE

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
    // The bowl from its floor, the black sun in the notch of its rim: held through the dissolve, then a slow push in as
    // the gates open and they come out.
    { t: A.in, cut: true, cells: 54, at: [X0, -14] },
    { t: A.in + A.inFor + 0.3, cells: 54, at: [X0, -14] },
    { t: 196.4, cells: 24, at: [X0 - 0.5, -6.1] },
    // The floor: the three, and him.
    { t: A.floor, cut: true, cells: 10.5, at: [5999.8, -3.1] },
    { t: A.clash1 - 0.01, cells: 9.6, at: [5999.8, -2.85] },
    // Close on the two of them: the strokes.
    { t: A.clash1, cut: true, cells: 4.4, track: pairAt, off: [0, -1.25] },
    { t: A.clash2 - 0.01, cells: 4.2, track: pairAt, off: [0, -1.2] },
    // Back a little on the clash, easing out.
    { t: A.clash2, cut: true, cells: 7, track: pairAt, off: [0, -1.85] },
    { t: A.wide - 0.01, cells: 8.6, track: pairAt, off: [0, -2.3] },
    // The whole bowl: the two of them specks on its floor, the crowd rocking as one.
    { t: A.wide, cut: true, cells: 50, at: [X0 - 1, -13] },
    { t: A.back - 0.01, cells: 47, at: [X0 - 1, -12.2] },
    // Close for the ram, the fall and the getting up.
    { t: A.back, cut: true, cells: 4.8, track: pairAt, off: [0, -1.4] },
    { t: A.circle - 0.01, cells: 5.2, track: pairAt, off: [0, -1.5] },
    // Circling, small under the black sun, the push in as they close.
    { t: A.circle, cut: true, cells: 30, at: [5997.8, -11.5] },
    { t: A.clash3 - 0.01, cells: 19, at: [5997.8, -6.9] },
    { t: A.clash3, cut: true, cells: 7.4, track: pairAt, off: [0, -1.95] },
    { t: A.close - 0.01, cells: 7, track: pairAt, off: [0, -1.85] },
    // The exchange, and the vault.
    { t: A.close, cut: true, cells: 4.6, track: pairAt, off: [0, -1.35] },
    { t: 244.38, cells: 4.9, track: pairAt, off: [0, -1.45] },
    // The held breath: the two of them, still, and the kill.
    { t: 244.402, cut: true, cells: 6, at: [5998.45, -1.85] },
    { t: A.kill, cells: 5.4, at: [5998.35, -1.66] },
    { t: A.sky - 0.01, cells: 5.3, at: [5998.3, -1.63] },
    // The sky: the ink opening over the arena, rising to it, and still.
    { t: A.sky, cut: true, cells: 52, at: [X0, -15] },
    { t: 258.8, cells: 50, at: [X0, -24] },
    { t: A.out, cells: 50, at: [X0, -24] },
  ],
  back: [
    drawing('arena', END, (b) => {
      if (!here(b.t)) return
      paintSky(b)
      paintInk(b)
      paintStands(b)
      paintFloor(b)
      paintPylon(b, -1)
      paintPylon(b, 1)
      paintSeats(b)
    }),
  ],
  front: [
    // Over the balls: the doors they wait behind, and the knife.
    drawing('arena-front', END, null, (b) => {
      if (!here(b.t)) return
      paintDoor(b, -1, A.westGate)
      paintDoor(b, 1, A.eastGate)
      paintKnife(b)
    }),
  ],
  overview: { x0: X0 - 50, y0: -55, x1: X0 + 50, y1: 6 },
  strikes: [
    ['the west gate opens', A.westGate],
    ['the east gate opens', A.eastGate],
    ['the first is shoved out', A.shoved[0]],
    ...FIGHT_STRIKES,
    ...BLOOMS.map((o, i): [string, number] => [`ink ${i + 1}`, o.at]),
  ],
}
