import { layer, rgbaOf, view, type View } from '../depth'
import { scenery, smooth } from '../kit'
import { edgeDark } from './grade'
import { mix } from '../dream/pen'
import { CEIL, DOOR_IN, FLOOR, WALL_OUT } from './geo'
import { BAR_AT, BAR_REF, flood } from './harbour'
import { ASH } from './room'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Inside: the cigarette's smoke going up from the ashtray. Nearest the camera, at the frame's foot: the end of the
 * near counter with its beer tap, and out on the quay its near edge, a stack of fish boxes and a coil of rope. Over it
 * all the tungsten warmth of the room closing in at the frame's edges; and when he bangs the back door open the grey
 * daylight cools the room. (The sleet outside is the harbour's, behind the room.)
 */
export const nuukFront = scenery<null>({
  name: 'nuuk-front',
  draw: (p, _s, c) => {
    const g = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const t = c.t
    drawSmoke(g, v, t)
    drawDaylight(g, v, t)
    drawNear(g, v, t)
    // The room's warm dark at the edges; outside on the quay, a cold grey one.
    const out = smooth(v.cx, WALL_OUT[1] + 0.5, WALL_OUT[1] + 3.5)
    edgeDark(g, v, mix('#140C08', '#3C474D', out), 0.6 - 0.25 * out, 0.6, 0.05 * (1 - out))
  },
})

/** The room's inside: from wall to wall, ceiling to floor. */
const ROOM = { x0: DOOR_IN[1], x1: WALL_OUT[0], y0: CEIL, y1: FLOOR }

/** The cigarette's smoke going up from the ashtray in one thin ribbon, wavering, drifting toward the lamp, fading. */
function drawSmoke(g: CanvasRenderingContext2D, v: View, t: number): void {
  const k = v.k
  const [ax, ay] = ASH
  if (v.x0 > ax + 1 || v.x1 < ax) return
  const low = new Path2D()
  const high = new Path2D()
  let x = ax + 0.105
  let y = ay - 0.02
  for (let i = 1; i <= 14; i++) {
    const u = i / 14
    const path = i <= 7 ? low : high
    path.moveTo(x * k, y * k)
    const wave = (0.03 + 0.09 * u) * Math.sin(t * 1.3 - u * 7)
    x = ax + 0.105 + 0.32 * u * u + wave
    y = ay - 0.02 - 1.35 * u
    path.lineTo(x * k, y * k)
  }
  g.lineWidth = Math.max(0.7, 0.012 * k)
  g.strokeStyle = rgbaOf('#C9BBA5', 0.24)
  g.stroke(low)
  g.strokeStyle = rgbaOf('#C9BBA5', 0.11)
  g.stroke(high)
}

/** When he bangs the back door open, a cool lift over the whole room, the tungsten no longer alone. */
function drawDaylight(g: CanvasRenderingContext2D, v: View, t: number): void {
  const f = flood(t)
  if (f <= 0.01 || v.x0 > WALL_OUT[1] + 1) return
  const k = v.k
  g.fillStyle = rgbaOf('#9FB0B5', 0.1 * f)
  g.fillRect(ROOM.x0 * k, ROOM.y0 * k, (ROOM.x1 - ROOM.x0) * k, (ROOM.y1 - ROOM.y0) * k)
}

/**
 * The near plane, at the frame's foot only: the end of the near counter with its beer tap inside; out on the quay,
 * the near edge of its deck, a stack of fish boxes and a coil of rope. They go by faster than the room as the camera moves.
 */
function drawNear(g: CanvasRenderingContext2D, v: View, t: number): void {
  layer(g, v, 1.38, BAR_AT, BAR_REF, (inner) => {
    const k = inner.k
    const top = 0.66
    if (inner.y1 < top) return
    // The near counter's end: its top edge lit by the lamps, its dark front; the tap on it.
    const c0 = -4
    const c1 = -0.55
    if (c1 > inner.x0 && c0 < inner.x1) {
      g.fillStyle = '#2A1D16'
      g.fillRect(c0 * k, (top + 0.05) * k, (c1 - c0) * k, (inner.y1 - top + 1) * k)
      g.fillStyle = '#6A4A33'
      g.fillRect(c0 * k, top * k, (c1 - c0 + 0.06) * k, 0.07 * k)
      g.fillStyle = rgbaOf('#F2C879', 0.35)
      g.fillRect(c0 * k, top * k, (c1 - c0 + 0.06) * k, 0.012 * k)
      // The beer tap: a brass column, a cross-bar, two handles, a drop now and then.
      const tx = -0.95
      g.fillStyle = '#9C7A45'
      g.fillRect((tx - 0.035) * k, (top - 0.42) * k, 0.07 * k, 0.42 * k)
      g.fillRect((tx - 0.16) * k, (top - 0.44) * k, 0.32 * k, 0.05 * k)
      g.fillStyle = '#1B1210'
      g.fillRect((tx - 0.13) * k, (top - 0.62) * k, 0.04 * k, 0.18 * k)
      g.fillRect((tx + 0.09) * k, (top - 0.6) * k, 0.04 * k, 0.16 * k)
      g.fillStyle = '#C4A267'
      g.fillRect((tx - 0.035) * k, (top - 0.41) * k, 0.025 * k, 0.38 * k)
      const drip = ((t * 0.7) % 1 + 1) % 1
      if (drip < 0.35) {
        g.fillStyle = rgbaOf('#E0B060', 0.8)
        g.beginPath()
        g.arc((tx + 0.11) * k, (top - 0.38 + drip * 0.9) * k, 0.012 * k, 0, Math.PI * 2)
        g.fill()
      }
    }
    // Out on the quay: the near edge of its deck, wet, two puddles on it holding the sky; fish boxes stacked on it,
    // and a coil of rope.
    const d0 = 7.4
    if (inner.x1 > d0) {
      const x0 = Math.max(d0, inner.x0 - 1)
      const x1 = inner.x1 + 1
      g.fillStyle = '#5E5C58'
      g.fillRect(x0 * k, top * k, (x1 - x0) * k, (inner.y1 - top + 1) * k)
      g.fillStyle = '#7A7873'
      g.fillRect(x0 * k, top * k, (x1 - x0) * k, 0.03 * k)
      const seams = new Path2D()
      for (let y = top + 0.14; y < inner.y1; y += 0.16 + 0.05 * (y - top)) {
        seams.moveTo(x0 * k, y * k)
        seams.lineTo(x1 * k, y * k)
      }
      for (let x = Math.ceil(x0 / 1.3) * 1.3; x < x1; x += 1.3) {
        seams.moveTo(x * k, top * k)
        seams.lineTo((x + 0.06) * k, (top + 0.14) * k)
      }
      g.lineWidth = Math.max(0.8, 0.012 * k)
      g.strokeStyle = '#3E3D3A'
      g.stroke(seams)
      // The deck's end: its planks' dark end grain, and a pile standing up at its corner.
      g.fillStyle = '#3E3D3A'
      g.fillRect(d0 * k, top * k, 0.06 * k, (inner.y1 - top + 1) * k)
      g.fillStyle = '#2A2826'
      g.fillRect((d0 + 0.02) * k, (top - 0.3) * k, 0.16 * k, 0.3 * k)
      g.fillStyle = '#4A4744'
      g.fillRect((d0 + 0.02) * k, (top - 0.3) * k, 0.16 * k, 0.03 * k)
      const pools = new Path2D()
      for (const [px, py, pw] of [[d0 + 1.3, top + 0.42, 0.45], [d0 + 4.6, top + 0.3, 0.35]]) {
        pools.moveTo((px + pw) * k, py * k)
        pools.ellipse(px * k, py * k, pw * k, pw * 0.18 * k, 0, 0, Math.PI * 2)
      }
      g.fillStyle = rgbaOf('#9AA6AA', 0.55)
      g.fill(pools)
    }
    const bx = 9.4
    if (bx + 2.2 > inner.x0 && bx - 0.6 < inner.x1) {
      const boxes = new Path2D()
      const lids = new Path2D()
      for (let i = 0; i < 3; i++) {
        const x = bx + (i === 2 ? 0.28 : i * 0.56)
        const y = top + 0.3 - (i === 2 ? 0.24 : 0)
        boxes.rect(x * k, (y - 0.24) * k, 0.52 * k, 0.24 * k)
        lids.rect(x * k, (y - 0.24) * k, 0.52 * k, 0.05 * k)
      }
      g.fillStyle = '#3F7F80'
      g.fill(boxes)
      g.fillStyle = '#D6DAD5'
      g.fill(lids)
      const coil = new Path2D()
      for (let r = 0; r < 4; r++) {
        coil.moveTo((bx + 1.7 + 0.32 - r * 0.06) * k, (top + 0.32) * k)
        coil.ellipse((bx + 1.7) * k, (top + 0.32) * k, (0.32 - r * 0.06) * k, (0.08 - r * 0.012) * k, 0, 0, Math.PI * 2)
      }
      g.lineWidth = Math.max(1, 0.03 * k)
      g.strokeStyle = '#A8916A'
      g.stroke(coil)
    }
  })
}
