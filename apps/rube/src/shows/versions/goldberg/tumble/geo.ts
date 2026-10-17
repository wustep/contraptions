/**
 * The toy, measured in cubes: a tray nine long and five deep, a rim one cube wide round it, and in the tray five
 * planks seven long, one to a row, each sliding along its row. A plank's middle cell is a pocket a cube deep, painted
 * on its floor in the colour of the cube that belongs there. When the planks stand flush in the middle of the tray the
 * five pockets make one column down the middle of it.
 *
 * World axes: x east along a row, y south across the rows (row 0 is the far one), z up. A plank's top and the rim's
 * are at z = 0; the tray's floor, where no plank lies, is lower.
 */

/** Cells along a row inside the tray. */
export const W = 9
/** Rows. */
export const ROWS = 5
/** A plank's length. */
export const PLANK = 7
/** The pocket's place along its plank. */
export const POCKET = 3
/** Where a plank may stand: its west end at x = 0 to 2. */
export const SLACK = W - PLANK
/** Flush: every plank's west end at x = 1, the pockets in one column at x = 4. */
export const FLUSH = 1
/** A plank's thickness, and a pocket's depth (a cube's). */
export const THICK = 1.2
export const DEPTH = 1
/** The tray's floor, under the planks. */
export const FLOOR = -THICK
/** The rim's foot: the tray stands this far below its top. */
export const FOOT = -1.4

/** The rim, as the cube on it walks it: clockwise seen from above, from the front's middle west along the front. */
export const LAP: readonly [number, number][] = (() => {
  const out: [number, number][] = []
  // Front, west to the corner; up the west side; the back, east; down the east side; the front, back to the middle.
  for (let x = 4; x >= -1; x--) out.push([x, ROWS])
  for (let y = ROWS - 1; y >= -1; y--) out.push([-1, y])
  for (let x = 0; x <= W; x++) out.push([x, -1])
  for (let y = 0; y <= ROWS; y++) out.push([W, y])
  for (let x = W - 1; x >= 5; x--) out.push([x, ROWS])
  return out
})()

/* ------------------------------------------------------------------ the view */

/** The camera's turn about the vertical from looking straight up the rows, and its height above the board, radians. */
export const YAW = (28 * Math.PI) / 180
export const PITCH = (44 * Math.PI) / 180
const CY = Math.cos(YAW)
const SY = Math.sin(YAW)
const CP = Math.cos(PITCH)
const SP = Math.sin(PITCH)

export type V3 = [number, number, number]

/** Where a point of the toy falls on the picture, in cells (x right, y down): an orthographic view from the south-east. */
export function screen(x: number, y: number, z: number): [number, number] {
  return [x * CY - y * SY, (x * SY + y * CY) * SP - z * CP]
}

/** Toward the camera: a face whose normal has a positive dot with this is seen. */
export const VIEW: V3 = [SY * CP, CY * CP, SP]

/** How near the camera a point is: larger is nearer. */
export const near = (x: number, y: number, z: number): number => (x * SY + y * CY) * CP + z * SP

/** The light: from high over the viewer's left shoulder. */
export const LIGHT: V3 = (() => {
  const v: V3 = [-0.42, 0.55, 0.9]
  const n = Math.hypot(...v)
  return [v[0] / n, v[1] / n, v[2] / n]
})()

/** The middle of the toy on the picture, and how tall the picture of it is, in cells: what the camera frames. */
export const MIDDLE = (() => {
  const pts: [number, number][] = []
  for (const x of [-1, W + 1]) for (const y of [-1, ROWS + 1]) for (const z of [FOOT, 1]) pts.push(screen(x, y, z))
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
})()
