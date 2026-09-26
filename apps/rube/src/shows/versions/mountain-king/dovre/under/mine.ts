import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { box, part, type Ctx, type PartShot, type Slot } from '../kit'
import { quake } from '../rock'
import { SEAM_SHOT } from '../seams'
import type { Pen } from '../troll'
import {
  BEGIN, BRAKE, CRASH, END, EXIT, FIRST_CLACK, LAND, LUNGES, MINE_STRIKES, ONTO, PEER_CART, PEER_EVENTS, RAIL, SHAFT, STOP, TROLL_CART, WIDE,
  binTip, ease, jolt, lightAt, peerAt, peerCartX, trollAct, trollCart, trollS,
} from './mine-clock'
import { drawOreCart, drawTrollCart } from './mine-cart'
import {
  drawBuffer, drawChock, drawLever, drawLight, drawMainLine, drawRooms, drawSiding, drawSparks, drawSpill, drawSwitch, drawTimbers, drawTorches,
} from './mine-set'

/**
 * The mine, 74.422 → 89.232 (phrases 8 and 9, the theme a fifth up, B B; the accelerando: the quarter note from
 * 0.49 to 0.44 s): the carts, the theme's third and larger playing. Laid mirrored, so in the world it runs back west
 * under the hall.
 *
 * He drops through the hall's floor onto the ore heaped in a cart at the end of a low tunnel; the chock jumps out
 * and the cart rolls. Up the tunnel behind him two troll miners asleep in their cart wake, knock their brake off and
 * come after him. Out in the stope his wheels click over a rail joint on every note of the theme (the joints are laid
 * where the notes fall: the rail is the tune), a spark flies off the loud ones, and each torch on the timbering catches
 * from a spark as he passes, so the mine lights up behind him in time. The trolls gain, the lead lunging for him on
 * the accents; on phrase 9 the frame pulls back over the whole stope; his wheel knocks over the switch lever, and the
 * blade it lifts behind him sends the trolls up the catch siding into its buffer. On the last bar his cart hits the
 * stop block at the shaft, the bin pitches him out, he bounces off its lip and falls straight down, 8 cells, on the
 * held note, onto the trolls' drum.
 *
 * The clock is `mine-clock.ts`, the carts `mine-cart.ts`, the stope `mine-set.ts`.
 */

interface MineState {
  begin: number
}

/** Every strike, show seconds: the landing, the trolls' brake, every clack, the lever, the blade, the buffer, the stop, the bounce. */
export const MINE_HITS: number[] = MINE_STRIKES

function drawMine(p: p5, s: MineState, c: Ctx): void {
  const T = c.t + s.begin
  const pen: Pen = { k: c.k, ink: c.ink, weight: c.weight, bg: c.bg }
  const [qx, qy] = quake(T)
  p.push()
  p.translate(qx * c.k, qy * c.k)
  drawRooms(p, pen)
  drawLight(p, pen, T)
  drawTimbers(p, pen, T)
  drawTorches(p, pen, T)
  drawSiding(p, pen, T)
  drawMainLine(p, pen, T)
  drawLever(p, pen, T)
  drawSwitch(p, pen, T)
  // The trolls' cart, behind his: in the tunnel, along the gallery, up the siding into the buffer.
  const tc = trollCart(T)
  const tl = lightAt(tc.x, tc.y - 0.4, T)
  const crash = T >= CRASH ? 0.12 * Math.exp(-(T - CRASH) / 0.16) * Math.cos((T - CRASH) * 16) : 0
  const onto = T >= ONTO ? 0.035 * Math.exp(-(T - ONTO) / 0.1) : 0
  drawTrollCart(p, pen, tc.x, tc.y, {
    light: 0.12 + 0.88 * tl,
    turn: trollS(T) / TROLL_CART.wheelR,
    tilt: tc.angle + crash,
    dip: onto,
    lead: trollAct(T, true),
    rear: trollAct(T, false),
    brake: ease(T, BRAKE - 0.06, BRAKE + 0.07),
    trollLight: 0.1 + 0.9 * lightAt(tc.x, tc.y - 1.1, T),
  })
  drawBuffer(p, pen, T)
  drawChock(p, pen, T)
  // His cart.
  const cx = peerCartX(T)
  const j = jolt(T)
  const land = T >= LAND ? 0.05 * ((T - LAND) / 0.06) * Math.exp(1 - (T - LAND) / 0.06) : 0
  const stop = T >= STOP ? 0.09 * Math.exp(-(T - STOP) / 0.14) * Math.cos((T - STOP) * 18) : 0
  drawOreCart(p, pen, cx, RAIL, {
    light: 0.15 + 0.85 * lightAt(cx, RAIL - 0.5, T),
    turn: (cx + 0.5) / PEER_CART.wheelR,
    tilt: j.pitch + stop,
    dip: j.drop + land,
    tip: binTip(T),
    load: 1 - 0.75 * ease(T, STOP + 0.12, STOP + 0.55),
  })
  p.pop()
}

function drawMineOver(p: p5, s: MineState, c: Ctx): void {
  const T = c.t + s.begin
  if (T < FIRST_CLACK - 0.1 || T > STOP + 2.5) return
  const pen: Pen = { k: c.k, ink: c.ink, weight: c.weight, bg: c.bg }
  const [qx, qy] = quake(T)
  p.push()
  p.translate(qx * c.k, qy * c.k)
  drawSparks(p, pen, T)
  drawSpill(p, pen, T)
  p.pop()
}

/** The lane: his path sampled finely, and cut exactly at every clack, the stop and the bounce, so each is sharp and on the note. */
function lane(slot: Slot): Seg[] {
  const times = new Set<number>()
  for (let t = slot.begin; t < slot.end; t += 0.0125) times.add(Math.round(t * 1e6) / 1e6)
  for (const e of PEER_EVENTS) if (e > slot.begin && e < slot.end) times.add(e)
  times.add(slot.begin)
  times.add(slot.end)
  const ts = [...times].sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-6)
  const segs: Seg[] = []
  for (let i = 0; i + 1 < ts.length; i++) segs.push({ from: peerAt(ts[i]), to: peerAt(ts[i + 1]), dur: ts[i + 1] - ts[i] })
  return segs
}

export const mine = part<MineState>(
  { name: 'mine', flight: true, draw: drawMine, over: drawMineOver },
  (slot: Slot) => {
    if (Math.abs(slot.begin - BEGIN) > 1e-6 || Math.abs(slot.end - END) > 1e-6) console.warn(`mountain king: mine was built for ${BEGIN}–${END}, given ${slot.begin}–${slot.end}`)
    return {
      // The stope and its tunnel (running on 4 cells behind him into the dark, under the hall's east end), the
      // trapdoor's shaft from the hall, and the shaft down to the drum.
      cells: box(-5.5, -7.5, 23.2, 1.6).concat(box(SHAFT[0], 1, SHAFT[1], 8.3)),
      exit: [EXIT[0] + 0.5, EXIT[1]] as Pt,
      lane: { segs: lane(slot), fire: 0 },
      state: { begin: slot.begin },
    }
  },
  (slot: Slot): PartShot[] => [
    // Landing in the cart, then a look back up the tunnel at the two asleep in theirs, waking.
    { t: slot.begin, ...SEAM_SHOT },
    { t: BRAKE - 0.2, cells: 5.4, off: [-1.5, -0.75] },
    { t: FIRST_CLACK, cells: 5.3, off: [-1.0, -0.7] },
    // The chase: close, the trolls a cart's length behind, the lead lunging.
    { t: LUNGES[0], cells: 5.0, off: [-0.9, -0.65] },
    { t: LUNGES[2] - 0.35, cells: 5.1, off: [-0.7, -0.65] },
    // Phrase 9: back over the whole stope, the lit gallery behind, the switch ahead; held through the switch and the buffer.
    { t: WIDE, cells: 8.2, hold: [11.0, -1.0], w: 0.7 },
    { t: ONTO, cells: 7.2, hold: [11.2, -0.8], w: 0.7 },
    { t: CRASH + 0.3, cells: 6.2, hold: [12.1, -0.45], w: 0.7 },
    // With him to the shaft; the stop; down the shaft with him.
    { t: STOP - 1.0, cells: 5.6, off: [0.9, -0.5] },
    { t: STOP, cells: 5.1, off: [0.9, 0.1] },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
