import type { Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { layer, type Frame } from '../depth'
import { ctxOf, mix, rgba, type Pen } from '../pen'
import { at } from '../music'

/**
 * The corridor's traffic close to the lens, while he is at the glass: people going by between the camera and the
 * room, cropped by the frame's foot and a little in the shade, a third again as fast as the room, the way the front
 * rows go by in London and Tokyo. A nurse in her navy cape carries the dawn feed's bottles on a tray one way, a doctor
 * goes by reading the other. They are the morning's business: always low, under him, two and no more, and none of them
 * while the nurse waves, reaches for his son, lifts him to the glass, or while the two of them play their first rally
 * through it. The pillow, earlier, has none: that is theirs.
 */

const FG = '#26302B'

/** Who goes by. */
type Kind = 'tray' | 'doctor'

interface Passer {
  kind: Kind
  /** When they come in at one edge and go out at the other (show seconds), and from and to where (cells, as drawn). */
  t0: number
  t1: number
  x0: number
  x1: number
  /** The top of the head (cells, as drawn) and the person's size. */
  top: number
  s: number
  /** The camera's centre the layer is laid out against (`depth.layer`). */
  anchor: Pt
}

const HALL_AT: Pt = [-8.6, -0.65]

const PASSERS: Passer[] = [
  // Once the nurse has looked up at him: a nurse with the feed's bottles, going along to the nursery's door.
  { kind: 'tray', t0: at(100, 1) + 0.15, t1: at(101, 2) + 0.2, x0: -3.9, x1: -13.7, top: 0.34, s: 1.38, anchor: HALL_AT },
  // A doctor the other way, his stethoscope round his neck, reading as he goes, before the nurse's wave.
  { kind: 'doctor', t0: at(101, 4), t1: at(102, 4) - 0.1, x0: -13.7, x1: -3.9, top: 0.33, s: 1.42, anchor: HALL_AT },
]

/* ------------------------------------------------------------------ drawing */

/** The paths of one colour, filled flat, as everything in the room is. */
function fill(pen: Pen, path: Path2D, col: string, a: number): void {
  const ctx = ctxOf(pen.p)
  ctx.fillStyle = rgba(pen, col, a)
  ctx.fill(path)
}
/** Near and in the room's shade: every colour a little toward the dark of the foreground. */
const near = (hex: string): string => mix(hex, FG, 0.42)

const ell = (k: number, p: Path2D, c: Pt, rx: number, ry: number, rot = 0): void => {
  p.moveTo((c[0] + rx * Math.cos(rot)) * k, (c[1] + rx * Math.sin(rot)) * k)
  p.ellipse(c[0] * k, c[1] * k, rx * k, ry * k, rot, 0, Math.PI * 2)
}
/** Every piece wound the same way round (as an ellipse is drawn), whichever way they walk: an arm across the body adds to it, never cuts it. */
const poly = (k: number, p: Path2D, pts: Pt[]): void => {
  const area = pts.reduce((sum, [x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length]
    return sum + x * ny - nx * y
  }, 0)
  const way = area < 0 ? [...pts].reverse() : pts
  way.forEach(([x, y], i) => (i ? p.lineTo(x * k, y * k) : p.moveTo(x * k, y * k)))
  p.closePath()
}

/**
 * One of them at `x`, facing `dir`, the top of the head at `top`, size `s`, `ph` the walk's phase. Drawn from the head
 * down to well below the frame's foot, which crops them.
 */
function person(pen: Pen, kind: Kind, x: number, top: number, s: number, dir: 1 | -1, ph: number, a: number): void {
  const { k } = pen
  const bob = 0.035 * s * Math.abs(Math.sin(ph))
  const sway = 0.02 * s * Math.sin(ph)
  const y = top + bob
  const hr = 0.15 * s
  const head: Pt = [x + sway, y + hr]
  const neck = y + 2 * hr + 0.02 * s
  const sh = neck + 0.08 * s
  const half = 0.36 * s
  const low = y + 3.2 * s

  const skin = new Path2D()
  const hair = new Path2D()
  const body = new Path2D()
  const trim = new Path2D()
  const extra = new Path2D()
  const extra2 = new Path2D()
  const band = new Path2D()

  ell(k, skin, head, hr * 0.88, hr)
  poly(k, skin, [[head[0] - 0.05 * s, neck - 0.06 * s], [head[0] + 0.05 * s, neck - 0.06 * s], [head[0] + 0.06 * s, sh], [head[0] - 0.06 * s, sh]])
  // The body: shoulders down to well past the frame's foot, the arms at the sides or forward.
  poly(k, body, [[x - half, sh + 0.12 * s], [x - half + 0.1 * s, sh], [x + half - 0.1 * s, sh], [x + half, sh + 0.12 * s], [x + half + 0.04 * s, low], [x - half - 0.04 * s, low]])

  let bodyCol = '#EDEFE9'
  let hairCol = '#6A4A34'
  let trimCol = '#FAFAF5'
  let extraCol = '#2F3B57'
  let extra2Col = '#FAFAF5'

  if (kind === 'tray') {
    // Her hair up under the cap; the cap; the navy cape over her shoulders.
    ell(k, hair, [head[0] - dir * 0.06 * s, head[1] + 0.02 * s], hr * 0.82, hr * 0.85)
    ell(k, hair, [head[0] - dir * 0.15 * s, head[1] + 0.05 * s], 0.06 * s, 0.06 * s)
    // The nursery's white cap with its black band, as the nurse at the glass wears it, perched on the crown.
    poly(k, trim, [[head[0] - 0.16 * s, y + 0.06 * s], [head[0] + 0.16 * s, y + 0.06 * s], [head[0] + 0.19 * s, y - 0.1 * s], [head[0] - 0.19 * s, y - 0.1 * s]])
    poly(k, band, [[head[0] - 0.165 * s, y + 0.02 * s], [head[0] + 0.165 * s, y + 0.02 * s], [head[0] + 0.17 * s, y - 0.015 * s], [head[0] - 0.17 * s, y - 0.015 * s]])
    poly(k, extra, [[x - half - 0.06 * s, sh + 0.55 * s], [x - half + 0.08 * s, sh - 0.02 * s], [x + half - 0.08 * s, sh - 0.02 * s], [x + half + 0.06 * s, sh + 0.55 * s], [x + dir * 0.1 * s, sh + 0.62 * s]])
    // The tray held up before her, high, the feed's bottles on it.
    const tx = x + dir * 0.55 * s
    const ty = sh - 0.06 * s
    poly(k, body, [[x + dir * 0.2 * s, sh + 0.12 * s], [tx - dir * 0.05 * s, ty + 0.04 * s], [tx + dir * 0.03 * s, ty + 0.12 * s], [x + dir * 0.2 * s, sh + 0.3 * s]])
    poly(k, extra2, [[tx - 0.42 * s, ty], [tx + 0.42 * s, ty], [tx + 0.4 * s, ty + 0.06 * s], [tx - 0.4 * s, ty + 0.06 * s]])
    for (const cx of [-0.3, -0.15, 0, 0.15, 0.3]) {
      const bx = tx + cx * s
      poly(k, trim, [[bx - 0.045 * s, ty], [bx + 0.045 * s, ty], [bx + 0.045 * s, ty - 0.14 * s], [bx + 0.02 * s, ty - 0.17 * s], [bx + 0.015 * s, ty - 0.21 * s], [bx - 0.015 * s, ty - 0.21 * s], [bx - 0.02 * s, ty - 0.17 * s], [bx - 0.045 * s, ty - 0.14 * s]])
    }
    extra2Col = '#B9B3A6'
  } else {
    // Grey at the temples, a white coat, the stethoscope's tubes round his neck, a chart held up before him.
    bodyCol = '#EEEFEA'
    hairCol = '#8C8278'
    ell(k, hair, [head[0] - dir * 0.03 * s, head[1] - 0.01 * s], hr * 0.92, hr * 0.85)
    poly(k, extra, [[x - 0.2 * s, sh - 0.01 * s], [x - 0.13 * s, sh - 0.03 * s], [x - 0.1 * s, sh + 0.3 * s], [x - 0.16 * s, sh + 0.32 * s]])
    poly(k, extra, [[x + 0.2 * s, sh - 0.01 * s], [x + 0.13 * s, sh - 0.03 * s], [x + 0.1 * s, sh + 0.3 * s], [x + 0.16 * s, sh + 0.32 * s]])
    extraCol = '#3A3E44'
    const cx = x + dir * 0.42 * s
    poly(k, body, [[x + dir * 0.18 * s, sh + 0.12 * s], [cx - dir * 0.04 * s, sh + 0.02 * s], [cx + dir * 0.02 * s, sh + 0.12 * s], [x + dir * 0.18 * s, sh + 0.3 * s]])
    poly(k, extra2, [[cx - 0.17 * s, sh - 0.2 * s], [cx + 0.17 * s, sh - 0.22 * s], [cx + 0.19 * s, sh + 0.16 * s], [cx - 0.15 * s, sh + 0.18 * s]])
    extra2Col = '#E6DCC4'
    for (let i = 0; i < 3; i++) poly(k, trim, [[cx - 0.11 * s, sh - 0.13 * s + i * 0.08 * s], [cx + 0.12 * s, sh - 0.14 * s + i * 0.08 * s], [cx + 0.12 * s, sh - 0.125 * s + i * 0.08 * s], [cx - 0.11 * s, sh - 0.115 * s + i * 0.08 * s]])
    trimCol = '#8E8778'
  }

  const ctx = ctxOf(pen.p)
  ctx.save()
  fill(pen, body, near(bodyCol), a)
  fill(pen, extra2, near(extra2Col), a)
  fill(pen, extra, near(extraCol), a)
  fill(pen, skin, near('#E2B693'), a)
  fill(pen, hair, near(hairCol), a)
  fill(pen, trim, near(trimCol), a)
  fill(pen, band, near('#2C2C2C'), a)
  ctx.restore()
}

/** A safety only: they are timed and set low so as never to come over him, but one that would is not drawn there. */
function clear(x: number, top: number, s: number, shift: Pt, marty: Pt): number {
  const dx = Math.max(x - 0.8 * s + shift[0] - marty[0], marty[0] - (x + 0.8 * s + shift[0]), 0)
  const dy = Math.max(top + shift[1] - (marty[1] + 0.13), 0)
  return smooth(Math.hypot(dx, dy), 0.02, 0.12)
}

/** The passers-by close to the lens, over everything else in the ward. Only for the close shots, as the foreground is. */
export function passers(pen: Pen, t: number, f: Frame, marty: Pt): void {
  const h = f.y1 - f.y0
  const vis = 1 - smooth(h, 4.6, 5.8)
  if (vis < 0.01) return
  const d = 1.4
  for (const q of PASSERS) {
    if (t < q.t0 || t > q.t1) continue
    const u = (t - q.t0) / (q.t1 - q.t0)
    const x = q.x0 + (q.x1 - q.x0) * u
    const dir: 1 | -1 = q.x1 > q.x0 ? 1 : -1
    const dist = Math.abs(q.x1 - q.x0) * u
    const ph = (dist / (0.62 * q.s)) * Math.PI
    const shift: Pt = [(f.cx - q.anchor[0]) * (1 - d), (f.cy - q.anchor[1]) * (1 - d)]
    const a = vis * clear(x, q.top, q.s, shift, marty)
    if (a < 0.01) continue
    layer(pen, f, d, () => person(pen, q.kind, x, q.top, q.s, dir, ph, a), q.anchor)
  }
}
