import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, view, type View } from '../depth'
import { hash, scenery, smooth } from '../kit'
import { edgeDark } from './grade'
import { mix } from '../dream/pen'
import { spotOn } from './draw'
import { CEIL, CHERYL_AT, DOOR_IN, FLOOR, SPOT, STAGE_TOP, WALL_OUT } from './geo'
import { BAR_AT, BAR_REF, daylight, flood } from './harbour'
import { ASH } from './room'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Inside: the cigarette's smoke going up from the ashtray, a little dust, and when the little stage's spotlight comes
 * on, the dust in its beam. Outside the doors, sleet going by on the wind. Nearest the camera, at the frame's foot: the
 * end of the near counter with its beer tap, and out on the quay its near edge, a stack of fish boxes and a coil of
 * rope. Over it all the tungsten warmth of the room closing in at the frame's edges; and when he bangs the back door
 * open the grey daylight cools the room.
 */
export const nuukFront = scenery<null>({
  name: 'nuuk-front',
  draw: (p, _s, c) => {
    const g = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const t = c.t
    drawAir(g, v, t)
    drawSleet(g, v, t)
    drawDaylight(g, v, t)
    drawNear(g, v, t)
    // The room's warm dark at the edges; outside on the quay, a cold grey one.
    const out = smooth(v.cx, WALL_OUT[1] + 0.5, WALL_OUT[1] + 3.5)
    edgeDark(g, v, mix('#140C08', '#3C474D', out), 0.6 - 0.25 * out, 0.6, 0.05 * (1 - out))
  },
})

/** The room's inside, where the smoke and the dust are: from wall to wall, ceiling to floor. */
const ROOM = { x0: DOOR_IN[1], x1: WALL_OUT[0], y0: CEIL, y1: FLOOR }

/** The air in the room: the cigarette's smoke, a little dust, and the spotlight's beam full of dust while it is on. */
function drawAir(g: CanvasRenderingContext2D, v: View, t: number): void {
  const k = v.k
  if (v.x0 > ROOM.x1 || v.x1 < ROOM.x0) return
  g.save()
  g.beginPath()
  g.rect(ROOM.x0 * k, ROOM.y0 * k, (ROOM.x1 - ROOM.x0) * k, (ROOM.y1 - ROOM.y0) * k)
  g.clip()
  // The cigarette's smoke going up from the ashtray in a few thin ribbons, wavering, drifting toward the lamp and
  // thinning as it rises.
  const low = new Path2D()
  const high = new Path2D()
  const [ax, ay] = ASH
  for (let j = 0; j < 3; j++) {
    let x = ax + 0.105
    let y = ay - 0.02
    for (let i = 1; i <= 14; i++) {
      const u = i / 14
      const path = i <= 7 ? low : high
      path.moveTo(x * k, y * k)
      const drift = 0.32 * u * u + 0.05 * j * u
      const wave = (0.03 + 0.09 * u) * Math.sin(t * (1.3 + 0.2 * j) - u * 7 + j * 2.1)
      x = ax + 0.105 + drift + wave
      y = ay - 0.02 - 1.35 * u
      path.lineTo(x * k, y * k)
    }
  }
  g.lineWidth = Math.max(0.7, 0.012 * k)
  g.strokeStyle = rgbaOf('#C9BBA5', 0.24)
  g.stroke(low)
  g.strokeStyle = rgbaOf('#C9BBA5', 0.11)
  g.stroke(high)
  // A little dust in the room's air, drifting slowly.
  motes(g, v, t, { n: 10, seed: 27, tile: [2.2, 1.6], r: [0.005, 0.009], v: [0.03, -0.02], spread: 0.6, sway: [0.06, 0.15], color: rgbaOf('#D9B98A', 0.3), within: ROOM })
  // The spotlight's beam full of dust while it is on.
  const on = Math.min(1, spotOn(t))
  if (on > 0.01) {
    const src: Pt = [SPOT[0] + 0.12, SPOT[1] + 0.12]
    const target: Pt = [CHERYL_AT[0], STAGE_TOP]
    g.save()
    g.beginPath()
    g.moveTo((src[0] - 0.06) * k, src[1] * k)
    g.lineTo((src[0] + 0.08) * k, src[1] * k)
    g.lineTo((target[0] + 0.62) * k, target[1] * k)
    g.lineTo((target[0] - 0.62) * k, target[1] * k)
    g.closePath()
    g.clip()
    motes(g, v, t, { n: 24, seed: 33, tile: [1.6, 1.4], r: [0.006, 0.011], v: [0.03, 0.05], spread: 0.6, sway: [0.06, 0.3], color: rgbaOf('#FFE9BC', 0.6 * on), within: { x0: src[0] - 0.7, y0: src[1], x1: target[0] + 0.7, y1: target[1] } })
    g.restore()
  }
  g.restore()
}

/** Sleet going by on the wind outside the doors: only out there, never in the room. */
function drawSleet(g: CanvasRenderingContext2D, v: View, t: number): void {
  const k = v.k
  g.save()
  g.beginPath()
  if (v.x0 < DOOR_IN[1]) g.rect((v.x0 - 1) * k, (v.y0 - 1) * k, (DOOR_IN[1] - v.x0 + 1) * k, (FLOOR - v.y0 + 1) * k)
  if (v.x1 > WALL_OUT[0]) g.rect(WALL_OUT[0] * k, (v.y0 - 1) * k, (v.x1 - WALL_OUT[0] + 1) * k, (FLOOR - v.y0 + 1) * k)
  // Over the top of the cut walls the room has no roof drawn, so the sleet stays out of the doorways' height.
  g.rect(DOOR_IN[1] * k, (v.y0 - 1) * k, 0, 0)
  g.clip()
  layer(g, v, 0.85, BAR_AT, BAR_REF, (inner) => {
    motes(g, inner, t, { n: 40, seed: 41, tile: [2.2, 1.8], r: [0.0025, 0.004], v: [-1.6, 3.2], spread: 0.3, color: rgbaOf('#E8EDEC', 0.4 * daylight(t)), streak: 0.045 })
  })
  layer(g, v, 1.3, BAR_AT, BAR_REF, (inner) => {
    motes(g, inner, t, { n: 9, seed: 43, tile: [2.4, 2], r: [0.004, 0.0055], v: [-2.2, 4.2], spread: 0.3, color: rgbaOf('#F0F3F2', 0.45), streak: 0.04 })
  })
  g.restore()
}

/**
 * When he bangs the back door open, a cool lift over the whole room, the tungsten no longer alone (its light on the
 * boards beside the door is the set's, `drawDoorLight`).
 */
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
      // Its boards and their grain.
      const boards = new Path2D()
      for (let x = c0 + 0.05; x < c1; x += 0.07) {
        boards.moveTo(x * k, (top + 0.08) * k)
        boards.quadraticCurveTo((x + 0.012 * Math.sin(x * 11)) * k, (top + 0.5) * k, (x - 0.006) * k, (inner.y1 + 0.2) * k)
      }
      g.lineWidth = Math.max(0.6, 0.008 * k)
      g.strokeStyle = rgbaOf('#4A3426', 0.7)
      g.stroke(boards)
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
    // Out on the quay: the near edge of its deck, wet, the rain ringing in its puddles; fish boxes stacked on it, and
    // a coil of rope.
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
      const pools = new Path2D()
      const rings = new Path2D()
      for (let i = 0; i < 6; i++) {
        const px = d0 + 0.8 + i * 1.7 + 0.5 * hash(i, 91)
        const py = top + 0.25 + 0.3 * hash(i, 92)
        const pw = 0.25 + 0.25 * hash(i, 93)
        pools.moveTo((px + pw) * k, py * k)
        pools.ellipse(px * k, py * k, pw * k, pw * 0.18 * k, 0, 0, Math.PI * 2)
        for (let j = 0; j < 2; j++) {
          const u = (((t * 1.4 + j * 0.5 + hash(i, j, 94)) % 1) + 1) % 1
          const r = 0.03 + u * pw * 0.8
          rings.moveTo((px + (hash(i, j, 95) - 0.5) * pw * 0.6 + r) * k, py * k)
          rings.ellipse((px + (hash(i, j, 95) - 0.5) * pw * 0.6) * k, py * k, r * k, r * 0.18 * k, 0, 0, Math.PI * 2)
        }
      }
      g.fillStyle = rgbaOf('#9AA6AA', 0.55)
      g.fill(pools)
      g.lineWidth = Math.max(0.6, 0.008 * k)
      g.strokeStyle = rgbaOf('#D8DFE0', 0.5)
      g.stroke(rings)
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
