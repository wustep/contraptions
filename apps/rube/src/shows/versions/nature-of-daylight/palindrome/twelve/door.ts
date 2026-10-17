import { R, type Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { G } from '../physics'
import { nearestBeat } from '../music'
import { SHANG, TENT, VALLEY } from '../worlds'
import { alarm, WHOLE } from './timeline'

/**
 * The door (the call, 277.647 → 311.293): in the film Ian holds the soldiers off while she makes the call. Ian is on
 * the table on her left as the call begins. As she dials he goes along the table to its end and down off it onto the
 * floor before the tent's door, landing as the picture cuts out to the dead ring (283.458); two soldiers come in out
 * of the night in the doorway under the red lamp and come at him across the floor (284.491), and he rolls up to them
 * and stands in their way (285.495). They hold there, face to face, while she calls and the ring stands again; and as
 * it closes on the loudest bar they go, back out into the dark the way they came, and the lamp goes out (`timeline.ts`
 * WHOLE).
 *
 * The tent's world cells: a ball on the table is at y = 0; on the floor, at FLOOR - R.
 */

const b = (t: number): number => nearestBeat(t)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const s5 = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (v * (v * 6 - 15) + 10)
}

/** The tent's floor (a ball on it has its middle at ON_FLOOR), the table's left end, the doorway's dark. */
const FLOOR = 1.45
const ON_FLOOR = FLOOR - R
const TABLE_END = -6.6
const DOORWAY: [number, number] = [-8.65, -7.65]

export const D = {
  /** He goes along the table, and off its end, landing on the floor as the picture cuts out wide. */
  go: b(280.654),
  edge: b(282.523),
  lands: b(283.458),
  /** They come at him; he stands in their way. */
  come: b(284.491),
  stand: b(285.495),
  /** They go, as the ring closes. */
  back: b(300.025),
  gone: WHOLE,
}
export const DOOR_HITS = [D.go, D.lands, D.come, D.stand, D.back]

/** Ian: where he starts, on her left on the table (she starts at x = 0), where he stops at its end, and on the floor. */
const IAN_START = -0.42
const AT_END = TABLE_END + 0.18
const DOWN_AT = -7.0
const HOLD_AT = -7.32

/** Ian at show time t in the call, tent cells. */
export function ianDoor(t: number): Pt {
  if (t <= D.go) return [IAN_START, 0]
  if (t < D.edge) return [IAN_START + (AT_END - IAN_START) * s5((t - D.go) / (D.edge - D.go)), 0]
  if (t < D.lands - 0.55) return [AT_END, 0]
  if (t < D.lands) {
    // Off the end of the table and down to the floor: a hop, landing on the beat.
    const u = (t - (D.lands - 0.55)) / 0.55
    const T = 0.55
    const vy = (ON_FLOOR - 0.5 * G * T * T) / T
    const s = u * T
    return [AT_END + (DOWN_AT - AT_END) * u, vy * s + 0.5 * G * s * s]
  }
  if (t < D.stand - 0.5) return [DOWN_AT, ON_FLOOR]
  if (t < D.stand) return [DOWN_AT + (HOLD_AT - DOWN_AT) * s5((t - (D.stand - 0.5)) / 0.5), ON_FLOOR]
  // Holding them; easing off once they have gone.
  const easeOff = s5((t - D.gone) / 1.2)
  return [HOLD_AT + (DOWN_AT - HOLD_AT) * easeOff, ON_FLOOR]
}

/** The two soldiers: out of the doorway's dark, at him, and back into it; none while they are not there. */
export function soldiers(t: number): { at: Pt; seen: number }[] {
  const out: { at: Pt; seen: number }[] = []
  const IN: Pt[] = [
    [-8.2, ON_FLOOR],
    [-8.55, ON_FLOOR],
  ]
  const AT: number[] = [HOLD_AT - 2 * R - 0.05, HOLD_AT - 4 * R - 0.12]
  for (let n = 0; n < 2; n++) {
    const appear = D.lands + 0.1 * n
    if (t < appear || t > D.gone + 0.3) continue
    const seen = clamp01((t - appear) / 0.45) * (1 - clamp01((t - (D.gone - 0.6)) / 0.7))
    const come = s5((t - D.come) / (D.stand - D.come - 0.1))
    const back = s5((t - D.back) / (D.gone - D.back - 0.4))
    const x = IN[n][0] + (AT[n] - IN[n][0]) * come * (1 - back)
    out.push({ at: [x, ON_FLOOR], seen })
  }
  return out
}

/** The soldiers, drawn by the tent: olive balls, the camp's colour, as the soldier at the charge was in the chamber. */
export function drawSoldiers(ctx: CanvasRenderingContext2D, k: number, t: number): void {
  for (const { at, seen } of soldiers(t)) {
    if (seen <= 0.01) continue
    const [x, y] = at
    // In the doorway they are in its dark: they come out of it.
    const inDoor = clamp01((DOORWAY[1] - x) / (DOORWAY[1] - DOORWAY[0]))
    ctx.save()
    ctx.globalAlpha *= seen
    ctx.fillStyle = rgba('#000000', 0.4 * (1 - 0.5 * inDoor))
    ctx.beginPath()
    ctx.ellipse(x * k, FLOOR * k, R * 1.1 * k, R * 0.22 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = mix(VALLEY.olive, TENT.cable, 0.5 * inDoor)
    ctx.beginPath()
    ctx.arc(x * k, y * k, R * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = rgba(TENT.canvasLit, 0.6 * (1 - 0.6 * inDoor))
    ctx.lineWidth = Math.max(1, 0.022 * k)
    ctx.beginPath()
    ctx.arc(x * k, y * k, R * k - ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.stroke()
    // The red lamp over the door on their tops and the side toward it.
    const red = alarm(t)
    if (red > 0.01) {
      ctx.strokeStyle = rgba(SHANG, 0.75 * red)
      ctx.lineWidth = Math.max(1, 0.035 * k)
      ctx.beginPath()
      ctx.arc(x * k, y * k, R * k - ctx.lineWidth / 2, Math.PI * 1.05, Math.PI * 1.75)
      ctx.stroke()
    }
    ctx.restore()
  }
}
