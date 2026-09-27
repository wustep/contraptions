import { mixHex, type Pt } from '../../../../parts'
import { GLORY, OUT, PORT } from './glass/glass-plan'
import { DOOR, FIRE_MOUTH } from './loft/layout'
import { bodyPoint, LIP_V } from './railway/express-line'
import { ENTRY, EXIT, N0, n4, T1 } from './regatta/balloons-plan'
import { DOORS } from './music'
import { GLASS, LOFT, RAILWAY, REGATTA, type WorldKey } from './worlds'

/**
 * The fires' mouths at the three doors out, for the veil (`fx.ts`): each world's opening that the spark goes into
 * (the loft stove's doorway, the furnace's port, the top balloon's jet) and the one it comes out of (the glory hole,
 * the first balloon's jet, the express's chimney). All in their own world's cells, as they stand at the door.
 *
 * A mouth is a `hole` (the opening: fire inside it, the world outside) and its `solids` (the iron and brick round it,
 * or the burner under a jet), and the point `at` inside the hole it opens on: the veil scales the whole mouth about
 * that point, so going in the camera flies through the opening past its jambs, and coming out it backs out of the
 * new one as it closes to its true place.
 */
export interface Solid {
  /** Its outline, and the opening cut out of it, if any. */
  pts: Pt[]
  hole?: Pt[]
  col: string
}
export interface Mouth {
  hole: Pt[]
  at: Pt
  /** Where the spark is at the door, in the mouth's cells: the veil lays the mouth by the spark's own place there. */
  anchor: Pt
  solids: Solid[]
  /** Where the mouth has moved to by `t` since the door (a balloon hovering, the engine pulling away), in cells. */
  drift?: (t: number) => Pt
}

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt
  })
/** An arch on a sill: straight sides from the sill to the springing line, a half round over. `e` widens it all round. */
const arch = (x: number, sill: number, spring: number, r: number, e = 0, drop = 0): Pt[] => [
  [x - r - e, sill + drop],
  [x - r - e, spring],
  ...arc(x, spring, r + e, Math.PI, 2 * Math.PI, 24),
  [x + r + e, spring],
  [x + r + e, sill + drop],
]
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]
/** A jet's flame, up from its nozzle: narrow at the nozzle, fullest a third of the way up, drawn out to a point. */
function jet(nozzle: Pt, L: number, W: number): Pt[] {
  const n = 10
  const side = (s: number): Pt[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n
      const hw = (W / 2) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u / 0.66) * 0.5)) * (1 - u ** 1.6)
      return [nozzle[0] + s * hw, nozzle[1] - L * u] as Pt
    })
  const left = side(-1)
  const right = side(1).reverse()
  return [...left, ...right.slice(1)]
}
/** A burner under its jet: the coil block and the nozzle ring on it (after `balloons-draw.ts` `drawBurner`). */
const burner = (nozzle: Pt): Solid[] => {
  const steel = mixHex(REGATTA.steel, '#1E2230', 0.3)
  const [x, y] = nozzle
  return [
    { pts: box(x - 0.36, y + 0.04, x + 0.36, y + 0.44), col: mixHex(steel, '#1E2230', 0.2) },
    { pts: [[x - 0.22, y + 0.05], [x + 0.22, y + 0.05], [x + 0.15, y - 0.06], [x - 0.15, y - 0.06]], col: steel },
  ]
}

/* ------------------------------------------------------------------ the loft stove's doorway */

const STOVE_IRON = mixHex(LOFT.iron, LOFT.ember, 0.22)
const STOVE: Mouth = {
  hole: box(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1),
  at: FIRE_MOUTH,
  anchor: FIRE_MOUTH,
  solids: [
    { pts: box(DOOR.x0 - 0.42, DOOR.y0 - 0.4, DOOR.x1 + 0.42, DOOR.y1 + 0.05), hole: box(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1), col: STOVE_IRON },
    // The sill, lit from inside.
    { pts: box(DOOR.x0 - 0.5, DOOR.y1, DOOR.x1 + 0.5, DOOR.y1 + 0.36), col: mixHex(LOFT.iron, LOFT.ember, 0.45) },
  ],
}

/* ------------------------------------------------------------------ the glassworks: the glory hole, the port */

const GLORY_SILL = GLORY.y + GLORY.r * 0.8
const GLORY_SPRING = GLORY.y - GLORY.r * 0.05
const GLORY_HOLE = arch(GLORY.x, GLORY_SILL, GLORY_SPRING, GLORY.r)
const SILL_COL = mixHex(GLASS.brickDeep, GLASS.iron, 0.35)
const GLORY_MOUTH: Mouth = {
  hole: GLORY_HOLE,
  at: [GLORY.x, GLORY.y],
  anchor: [-0.5, 0],
  solids: [
    { pts: arch(GLORY.x, GLORY_SILL, GLORY_SPRING, GLORY.r, 0.42, 0.2), hole: GLORY_HOLE, col: GLASS.brickDeep },
    { pts: arch(GLORY.x, GLORY_SILL, GLORY_SPRING, GLORY.r, 0.12), hole: GLORY_HOLE, col: GLASS.iron },
    { pts: box(GLORY.x - GLORY.r - 0.5, GLORY_SILL, GLORY.x + GLORY.r + 0.5, GLORY_SILL + 0.17), col: SILL_COL },
  ],
}

const PORT_HW = PORT.w / 2
const PORT_SILL = PORT.y + PORT.h / 2
const PORT_SPRING = PORT.y - PORT.h / 2 + PORT_HW
const PORT_HOLE = arch(PORT.x, PORT_SILL, PORT_SPRING, PORT_HW)
const PORT_MOUTH: Mouth = {
  hole: PORT_HOLE,
  at: [PORT.x, PORT.y],
  anchor: OUT,
  solids: [
    { pts: arch(PORT.x, PORT_SILL, PORT_SPRING, PORT_HW, 0.4, 0.15), hole: PORT_HOLE, col: GLASS.brickDeep },
    { pts: box(PORT.x - PORT_HW - 0.55, PORT_SILL, PORT.x + PORT_HW + 0.55, PORT_SILL + 0.17), col: SILL_COL },
  ],
}

/* ------------------------------------------------------------------ the regatta: the burners' jets */

/** B0 on the meadow: the spark comes out of its jet, 0.7 above the nozzle. */
const B0_MOUTH: Mouth = { hole: jet(N0, 2.1, 1.05), at: [N0[0], N0[1] - 0.7], anchor: ENTRY, solids: burner(N0) }
/** B4, the top balloon: the spark goes up its great blast, 1.15 above the nozzle. It hovers as it goes. */
const N4 = n4(T1)
const B4_MOUTH: Mouth = {
  hole: jet(N4, 2.6, 1.15),
  at: EXIT,
  anchor: EXIT,
  solids: burner(N4),
  drift: (t) => {
    const n = n4(t)
    return [n[0] - N4[0], n[1] - N4[1]]
  },
}

/* ------------------------------------------------------------------ the express's chimney */

/** The chimney's lip at the door is at (-0.5, 0); the fire stands up out of it in a column, the pipe under it. */
const LIP: Pt = [-0.5, 0]
const CHIMNEY_IRON = mixHex(mixHex(RAILWAY.iron, RAILWAY.ironLit, 0.3), RAILWAY.coal, 0.15)
const CHIMNEY: Mouth = {
  hole: jet([LIP[0], LIP[1] + 0.12], 2.4, 1.2),
  at: [LIP[0], LIP[1] - 0.3],
  anchor: LIP,
  solids: [
    {
      pts: [
        [LIP[0] - 0.32, LIP[1]],
        [LIP[0] + 0.32, LIP[1]],
        [LIP[0] + 0.29, LIP[1] + 0.12],
        [LIP[0] + 0.25, LIP[1] + 0.2],
        [LIP[0] + 0.26, LIP[1] + 0.55],
        [LIP[0] + 0.52, LIP[1] + 0.8],
        [LIP[0] + 0.9, LIP[1] + 0.86],
        [LIP[0] + 0.9, LIP[1] + 1.4],
        [LIP[0] - 0.9, LIP[1] + 1.4],
        [LIP[0] - 0.9, LIP[1] + 0.86],
        [LIP[0] - 0.52, LIP[1] + 0.8],
        [LIP[0] - 0.26, LIP[1] + 0.55],
        [LIP[0] - 0.25, LIP[1] + 0.2],
        [LIP[0] - 0.29, LIP[1] + 0.12],
      ],
      col: CHIMNEY_IRON,
    },
    // The brass band under the cap.
    { pts: box(LIP[0] - 0.28, LIP[1] + 0.13, LIP[0] + 0.28, LIP[1] + 0.2), col: mixHex(RAILWAY.brass, RAILWAY.iron, 0.3) },
  ],
  drift: (t) => {
    const p = bodyPoint(Math.max(t, DOORS.railway), 0, LIP_V)
    const q = bodyPoint(DOORS.railway, 0, LIP_V)
    return [p[0] - q[0], p[1] - q[1]]
  },
}

/** The mouth each world's door out goes into, and the one each world's door in comes out of. */
export const OUT_MOUTH: Partial<Record<WorldKey, Mouth>> = { loft: STOVE, glassworks: PORT_MOUTH, regatta: B4_MOUTH }
export const IN_MOUTH: Partial<Record<WorldKey, Mouth>> = { glassworks: GLORY_MOUTH, regatta: B0_MOUTH, railway: CHIMNEY }
