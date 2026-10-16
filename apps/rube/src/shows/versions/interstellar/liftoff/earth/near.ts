import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth, type Ctx } from '../kit'
import { DUST } from '../worlds'
import { dayAt, groundAt, windAt, windPace } from './light'

/**
 * The farm's near ground: what passes between the camera and the machine, at the frame's edges, faster than the
 * world. Drawn over everything (its `over`), so it is kept to the edges and never over the ball's way.
 *
 * Outdoors, from the porch to the launch: dry weeds and seed heads along the bottom of the frame, swaying in the wind
 * and leaning with it as the storm's outflow gets up; in the corn chase, stalk tips whipping past; past the dam, fence
 * posts with a sagging wire, stones, and dust blowing low and fast across the ground. (Tumbleweeds went: drawn as a
 * tangle of arcs, they read as a scribble on the frame.)
 *
 * Last, the day's grade over the whole frame (`light.ts`): nothing in the morning and at noon, warming through the
 * afternoon, and the ochre of the storm light by the launch, eased off as the rocket climbs toward the cloud.
 */

/** How much faster than the world the near ground goes by. */
const NEAR = 1.45
/** And the stalk tips in the corn, nearer still. */
const STALKS = 1.85
/** How much further below the frame's middle than the near ground the near ground's own foot is (the near plane). */
const DROP = 1.32

/** Outdoors: from the porch (the near ground comes in as the door opens) to the rocket in the cloud. */
const OUT = [17.6, 19.2]

export const near = scenery<null>({
  name: 'near',
  draw: () => {},
  over: (p: p5, _s, c) => {
    const { k, t } = c
    if (t < OUT[0] || t > 90) return
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const day = dayAt(t)
    const up = smooth(-f.cy, 4, 24)
    const seen = smooth(t, OUT[0], OUT[1]) * (1 - up)
    if (seen > 0.01) {
      ground(p, c, f, seen)
      corn(p, c, f, seen)
      dust(p, c, f, seen, day.storm)
    }
    // The grade: the afternoon's warmth over the whole frame, multiplied in, gone as the rocket climbs.
    const grade = day.gradeA * (1 - up) * (1 - smooth(t, 87.5, 88.6))
    if (grade > 0.01) {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = grade
      ctx.fillStyle = day.grade
      const X = (x: number) => x * k
      ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
      ctx.restore()
    }
  },
})

type Frame = ReturnType<typeof frame>

/** The near plane's foot under the frame: further down than the near ground, by more the further the camera is above it. */
const footOf = (f: Frame) => f.cy + (groundAt(f.cx) + 0.22 - f.cy) * DROP

/** Weeds, seed heads and stones, and fence posts past the dam. */
function ground(p: p5, c: Ctx, f: Frame, seen: number): void {
  const { k, t, ink, weight } = c
  const X = (x: number) => x * k
  const foot = footOf(f)
  if (foot - 0.7 > f.y1) return
  // Nothing on the near plane reaches up past the near ground's own line, where the balls roll.
  const ceiling = groundAt(f.cx) + 0.06
  const tall = (y: number, h: number) => Math.max(0, Math.min(h, y - ceiling))
  const shift = f.cx * (1 - NEAR)
  const lean = -0.32 * smooth(t, 58, 76) + 0.05
  const dark = mixHex(mixHex(DUST.wood, ink, 0.55), dayAt(t).land[2], 0.25)
  const pale = mixHex(DUST.husk, ink, 0.35)
  // The base's fence along the near ground, past the dam: posts and one sagging strand.
  const fenced = smooth(f.cx, 80, 86)
  const SPAN = 0.36
  const i0 = Math.floor((f.x0 - shift) / SPAN) - 2
  const i1 = Math.ceil((f.x1 - shift) / SPAN) + 2
  p.strokeCap(p.ROUND)
  for (let i = i0; i <= i1; i++) {
    const kind = hash(i, 401)
    const x = shift + (i + hash(i, 402) * 0.7) * SPAN
    const y = foot + 0.12 * hash(i, 403)
    if (kind < 0.42) {
      // A tuft of dry grass: blades fanned, bent by the wind and swaying.
      const n = 3 + Math.floor(hash(i, 404) * 4)
      const h = tall(y, 0.18 + 0.26 * hash(i, 405))
      if (h < 0.04) continue
      p.noFill()
      p.stroke(alpha(p, hash(i, 406) > 0.5 ? dark : pale, 0.92 * seen))
      p.strokeWeight(Math.max(1, weight * (0.9 + 0.5 * hash(i, 407))))
      for (let j = 0; j < n; j++) {
        const fan = (j / (n - 1 || 1) - 0.5) * 0.9
        const sway = 0.12 * Math.sin(t * (1.4 + hash(i, j, 408)) + i * 0.7 + j)
        const a = fan + lean + sway
        const bx = x + (j - n / 2) * 0.02
        const tip = [bx + Math.sin(a) * h, y - Math.cos(a) * h]
        const mid = [bx + Math.sin(a * 0.4) * h * 0.55, y - Math.cos(a * 0.4) * h * 0.55]
        p.bezier(X(bx), X(y), X(mid[0]), X(mid[1]), X(mid[0]), X(mid[1]), X(tip[0]), X(tip[1]))
      }
    } else if (kind < 0.55) {
      // A seed head on a tall stem, nodding.
      const h = tall(y, 0.42 + 0.3 * hash(i, 409)) - 0.08
      if (h < 0.08) continue
      const a = lean * 1.3 + 0.1 * Math.sin(t * 1.1 + i * 1.3)
      const tx = x + Math.sin(a) * h
      const ty = y - Math.cos(a) * h
      p.noFill()
      p.stroke(alpha(p, dark, 0.9 * seen))
      p.strokeWeight(Math.max(1, weight * 0.8))
      p.bezier(X(x), X(y), X(x), X(y - h * 0.5), X(tx - Math.sin(a) * h * 0.3), X(ty + h * 0.2), X(tx), X(ty))
      p.noStroke()
      p.fill(alpha(p, pale, 0.95 * seen))
      p.push()
      p.translate(X(tx), X(ty))
      p.rotate(a)
      p.ellipse(0, X(-0.04), X(0.045), X(0.13))
      p.pop()
    } else if (kind < 0.62) {
      // A stone half in the dirt.
      p.noStroke()
      p.fill(alpha(p, dark, 0.85 * seen))
      p.arc(X(x), X(y + 0.02), X(0.16 + 0.12 * hash(i, 410)), X(0.12 + 0.06 * hash(i, 411)), Math.PI, Math.PI * 2, p.CHORD)
    }
  }
  if (fenced > 0.01) {
    const FS = 2.6
    const j0 = Math.floor((f.x0 - shift) / FS) - 1
    const j1 = Math.ceil((f.x1 - shift) / FS) + 1
    const posts: [number, number][] = []
    for (let j = j0; j <= j1; j++) {
      const x = shift + j * FS + 0.4
      posts.push([x, Math.max(ceiling, foot + 0.06 - 0.62 + 0.03 * Math.sin(j * 1.7))])
    }
    p.stroke(alpha(p, mixHex(DUST.wood, ink, 0.5), 0.95 * seen * fenced))
    p.strokeWeight(Math.max(1.2, weight * 2.2))
    for (const [x, ty] of posts) p.line(X(x), X(foot + 0.1), X(x + 0.02), X(ty))
    p.stroke(alpha(p, ink, 0.6 * seen * fenced))
    p.strokeWeight(Math.max(0.8, weight * 0.6))
    p.noFill()
    for (let j = 0; j + 1 < posts.length; j++) {
      const [ax, ay] = posts[j]
      const [bx, by] = posts[j + 1]
      for (const dy of [0.1, 0.32]) {
        const sag = 0.08 + 0.015 * Math.sin(t * 2.2 + j)
        p.bezier(X(ax), X(ay + dy), X(ax + 0.8), X(ay + dy + sag), X(bx - 0.8), X(by + dy + sag), X(bx), X(by + dy))
      }
    }
  }
}

/** In the corn chase: the stalks along the road's edge, nearer than the truck, whipping past the bottom of the frame. */
function corn(p: p5, c: Ctx, f: Frame, seen: number): void {
  const { k, t, ink, weight } = c
  const on = smooth(t, 41.5, 43) * (1 - smooth(t, 52.4, 53.4))
  if (on <= 0.01) return
  const X = (x: number) => x * k
  const shift = f.cx * (1 - STALKS)
  const foot = f.y1 + 0.3
  const SP = 1.3
  const i0 = Math.floor((f.x0 - shift) / SP) - 1
  const i1 = Math.ceil((f.x1 - shift) / SP) + 1
  const stalk = mixHex(DUST.leaf, ink, 0.45)
  const leaf = mixHex(DUST.leaf, ink, 0.3)
  for (let i = i0; i <= i1; i++) {
    if (hash(i, 431) < 0.35) continue
    const x = shift + (i + hash(i, 432) * 0.6) * SP
    const h = (0.62 + 0.42 * hash(i, 433)) * on
    // The truck's wind bends them back as it goes past, and they whip upright behind it.
    const a = -0.18 + 0.1 * Math.sin(t * 3.1 + i * 1.9)
    const tx = x + Math.sin(a) * h
    const ty = foot - Math.cos(a) * h
    p.noFill()
    p.stroke(alpha(p, stalk, 0.95 * seen))
    p.strokeWeight(Math.max(1.5, weight * 2.4))
    p.line(X(x), X(foot), X(tx), X(ty))
    // Two leaves off the stalk, arching out and down.
    p.noStroke()
    p.fill(alpha(p, leaf, 0.95 * seen))
    for (const [u, side] of [[0.45, 1], [0.7, -1]] as [number, number][]) {
      const bx = x + (tx - x) * u
      const by = foot + (ty - foot) * u
      const flap = 0.08 * Math.sin(t * 4.2 + i + side)
      const lx = bx + side * 0.42
      const ly = by + 0.12 + flap
      p.beginShape()
      p.vertex(X(bx), X(by))
      p.bezierVertex(X(bx + side * 0.18), X(by - 0.16), X(lx - side * 0.08), X(ly - 0.12), X(lx), X(ly))
      p.bezierVertex(X(lx - side * 0.14), X(ly - 0.07), X(bx + side * 0.12), X(by - 0.06), X(bx), X(by + 0.04))
      p.endShape(p.CLOSE)
    }
    // The tassel.
    p.stroke(alpha(p, mixHex(DUST.husk, ink, 0.3), 0.9 * seen))
    p.strokeWeight(Math.max(1, weight * 0.8))
    for (const d of [-0.07, 0, 0.07]) p.line(X(tx), X(ty), X(tx + d + Math.sin(a) * 0.1), X(ty - 0.12))
  }
}

/** Dust blowing low across the ground, faster than the world: a breath in the morning, a stream ahead of the storm. */
function dust(p: p5, c: Ctx, f: Frame, seen: number, storm: number): void {
  const { k, t } = c
  const X = (x: number) => x * k
  const strength = 0.25 + 0.75 * storm
  const foot = footOf(f)
  const pace = windPace(t)
  const blow = windAt(t) * 2.6
  const SP = 0.9
  const shift = f.cx * (1 - NEAR)
  const i0 = Math.floor((f.x0 - shift - blow) / SP) - 2
  const i1 = Math.ceil((f.x1 - shift - blow) / SP) + 2
  p.noStroke()
  for (let i = i0; i <= i1; i++) {
    if (hash(i, 441) > 0.55 * strength + 0.1) continue
    const x = shift + blow + (i + hash(i, 442)) * SP
    // Low over the ground: within about a cell of the near plane's foot, kept off the middle of the frame.
    const y = Math.max(foot - 1.1 * hash(i, 443) - 0.05, f.cy + (f.y1 - f.cy) * 0.55)
    const len = (0.35 + 0.7 * hash(i, 444)) * (1 + 1.5 * Math.abs(pace))
    const a = (0.07 + 0.12 * hash(i, 445)) * strength * seen
    p.fill(alpha(p, hash(i, 446) > 0.5 ? DUST.bone : '#C9A578', a))
    p.ellipse(X(x), X(y + 0.03 * Math.sin(t * 2 + i)), X(len), X(0.035 + 0.03 * hash(i, 447)))
  }
}
