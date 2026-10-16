import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { CX0, CY0, PLANE, bake, cached, layBaked, onPlane, outline, polyline, seen, type Frame } from './far'
import { ERUPT } from './geo'
import { HZ, SUN } from './sky'
import { ICE } from './theme'

/**
 * Everything past the shore, on three planes: the far range with the volcano (its ice cap, its glacier's tongues);
 * a nearer massif under its own ice cap, whose outlet glacier comes down a valley to the fjord, calving; and the
 * mountains across the fjord, stepped in the East Fjords' layers of basalt, a harbour at their foot and a boat going
 * out. Under them the fjord: their reflections, the sun's path on it, and its skin of ripples drifting all the way
 * to the near shore.
 *
 * Each plane is drawn in its own measure (`far.ts`): its outlines are made once.
 */

/* ------------------------------------------------------------------ the far range and the volcano */

/** The region between a top line and a lower one wherever the lower is below it: snow under a ridge, no clip needed. */
function between(a: number, b: number, step: number, top: (sx: number) => number, low: (sx: number) => number, path = new Path2D()): Path2D {
  const up: Pt[] = []
  const down: Pt[] = []
  for (let sx = a; sx <= b + 1e-9; sx += step) {
    const y = top(sx)
    up.push([sx, y])
    down.push([sx, Math.max(y, low(sx))])
  }
  return outline([...up, ...down.reverse()], path)
}

export const VX = 0.5
const range = (sx: number): number =>
  0.03 + 0.018 * Math.sin(sx * 6.1 + 0.7) + 0.011 * Math.sin(sx * 14.3 + 2.1) + 0.006 * Math.sin(sx * 31 + 0.3) + 0.012 * Math.sin(sx * 2.3 + 4)
export const volcanoH = (sx: number): number => {
  const d = (sx - VX) / 0.21
  return 0.105 * Math.exp(-d * d * d * d) + 0.012 * Math.exp(-(((sx - VX - 0.02) / 0.05) ** 2))
}
export const CRATER_SX = VX + 0.02
export const CRATER: Pt = [CRATER_SX, HZ - volcanoH(CRATER_SX)]

const FAR = cached(() => {
  const domeY = (sx: number) => HZ - volcanoH(sx)
  const dome: Pt[] = []
  for (let sx = VX - 0.36; sx <= VX + 0.36; sx += 0.008) dome.push([sx, domeY(sx)])
  const domePath = outline([...dome, [VX + 0.36, HZ + 0.05], [VX - 0.36, HZ + 0.05]])
  const cap = between(VX - 0.36, VX + 0.36, 0.006, domeY, (sx) => HZ - 0.064 - 0.005 * Math.sin(sx * 97) - 0.004 * Math.sin(sx * 41))
  // The cap's glacier tongues down its gullies, and the rock ribs between them.
  for (let i = 0; i < 9; i++) {
    const sx = VX - 0.17 + 0.34 * (i / 8) + 0.01 * Math.sin(i * 3)
    const y0 = HZ - 0.066
    outline([[sx - 0.007, y0], [sx + 0.007, y0], [sx + 0.002, y0 + 0.012 + 0.012 * hash(i, 71)]], cap)
  }
  const ribs = new Path2D()
  for (let i = 0; i < 14; i++) {
    const sx = VX - 0.15 + 0.3 * hash(i, 72)
    const top = domeY(sx) + 0.006
    polyline([[sx, top], [sx + 0.004 * (hash(i, 73) - 0.5), top + 0.01 + 0.014 * hash(i, 74)]], ribs)
  }
  const ridgeY = (sx: number) => HZ - range(sx)
  const ridgePts: Pt[] = []
  for (let sx = -2.2; sx <= 2.2; sx += 0.01) ridgePts.push([sx, ridgeY(sx)])
  const ridge = outline([...ridgePts, [2.2, HZ + 0.05], [-2.2, HZ + 0.05]])
  const snow = between(-2.2, 2.2, 0.01, ridgeY, (sx) => HZ - 0.042 - 0.009 * Math.sin(sx * 47) - 0.006 * Math.sin(sx * 113))
  // Dark rock showing through the snow on the far ridges.
  const rock = new Path2D()
  for (let i = 0; i < 70; i++) {
    const sx = -2.2 + 4.4 * hash(i, 75)
    const top = ridgeY(sx) + 0.002
    if (HZ - 0.042 - top < 0.004) continue
    polyline([[sx, top], [sx + 0.003, top + 0.006 + 0.012 * hash(i, 76)]], rock)
  }
  return { domeLine: polyline(dome), domePath, cap, ribs, ridge, snow, rock }
})
/** The volcano's ice cap, for the fire's light on it (`erupt.ts`). */
export const volcanoCap = (): Path2D => FAR().cap

/* ------------------------------------------------------------------ the glacier's massif */

/** Its foot at the fjord, and its outlet glacier coming down a valley to the water. */
const GB = HZ + 0.022
const TONGUE_X = -0.64
const massifH = (sx: number): number => {
  const h = 0.06 + 0.022 * Math.sin(sx * 3.7 + 0.4) + 0.013 * Math.sin(sx * 8.9 + 1.3) + 0.006 * Math.sin(sx * 21 + 0.2)
  const valley = 1 - 0.5 * Math.exp(-(((sx - TONGUE_X + 0.03) / 0.1) ** 2))
  const end = 1 - smooth(sx, -0.12, 0.2)
  return h * valley * end
}
const smooth = (x: number, a: number, b: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return u * u * (3 - 2 * u)
}
const tongueEdge = (side: -1 | 1, u: number): Pt => {
  // From under the cap (u = 0) down to its snout at the water (u = 1), widening and bending as it comes.
  const cx = TONGUE_X - 0.07 * (1 - u) * (1 - u) + 0.01 * Math.sin(u * 3)
  const y = GB - massifH(TONGUE_X - 0.07) * 0.82 * (1 - u) + 0.001
  const w = 0.012 + 0.032 * u * u + 0.006 * u
  return [cx + side * w, y]
}
const GLACIER = cached(() => {
  const top: Pt[] = []
  for (let sx = -2.4; sx <= 0.24; sx += 0.01) top.push([sx, GB - massifH(sx)])
  const massif = outline([...top, [0.24, GB + 0.01], [-2.4, GB + 0.01]])
  const cap = between(-2.4, 0.24, 0.008, (sx) => GB - massifH(sx), (sx) => GB - Math.max(0.045, massifH(sx) * 0.62) - 0.004 * Math.sin(sx * 61) - 0.003 * Math.sin(sx * 23))
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= 20; i++) {
    left.push(tongueEdge(-1, i / 20))
    right.push(tongueEdge(1, i / 20))
  }
  const tongue = outline([...left, ...right.reverse()])
  // Crevasses across it, a dark line of moraine down it, and the cliff of its snout.
  const cracks = new Path2D()
  for (let i = 0; i < 22; i++) {
    const u = 0.12 + 0.86 * (i / 21)
    const a = tongueEdge(-1, u)
    const b = tongueEdge(1, u)
    const f0 = 0.15 + 0.3 * hash(i, 81)
    const f1 = f0 + 0.2 + 0.3 * hash(i, 82)
    polyline([[a[0] + (b[0] - a[0]) * f0, a[1] - 0.001], [a[0] + (b[0] - a[0]) * Math.min(0.92, f1), a[1] + 0.0015]], cracks)
  }
  const moraine = new Path2D()
  for (let i = 0; i <= 20; i++) {
    const u = i / 20
    const a = tongueEdge(-1, u)
    const b = tongueEdge(1, u)
    const x = a[0] + (b[0] - a[0]) * (0.58 + 0.04 * Math.sin(u * 5))
    if (i) moraine.lineTo(x, a[1])
    else moraine.moveTo(x, a[1])
  }
  const snout = tongueEdge(-1, 1)
  const snoutR = tongueEdge(1, 1)
  const face = outline([[snout[0], snout[1] - 0.004], [snoutR[0], snoutR[1] - 0.004], [snoutR[0], snoutR[1] + 0.002], [snout[0], snout[1] + 0.002]])
  return { massif, cap, tongue, cracks, moraine, face, reflection: outline([...left.map(([x, y]): Pt => [x, 2 * GB - y]), ...right.map(([x, y]): Pt => [x, 2 * GB - y])]) }
})

/* ------------------------------------------------------------------ the mountains across the fjord */

/** Their foot at the water. */
export const MB = HZ + 0.05
const midH = (sx: number): number => {
  const hump = 0.085 + 0.035 * Math.sin(sx * 3.3 + 1.2) + 0.022 * Math.sin(sx * 8.1 + 0.4) + 0.01 * Math.sin(sx * 19 + 2)
  // Low on the right, where the volcano is seen over them; cut through on the left, where the glacier comes down.
  return hump * (1 - smooth(sx, -0.05, 0.3)) * (1 - 0.86 * Math.exp(-(((sx + 0.74) / 0.15) ** 2)))
}
const HARBOUR = -1.32
const MID = cached(() => {
  const top: Pt[] = []
  for (let sx = -2.6; sx <= 2.2; sx += 0.012) top.push([sx, MB - midH(sx)])
  const body = outline([...top, [2.2, MB], [-2.6, MB]])
  // The green of their lower slopes, by the water.
  const green = between(-2.6, 2.2, 0.012, (sx) => MB - Math.min(midH(sx), 0.02 + 0.008 * Math.sin(sx * 7.3) + 0.005 * Math.sin(sx * 17)), () => MB)
  // The basalt's layers: steps across the faces, each a little uneven, only where there is mountain.
  const strata = new Path2D()
  for (let l = 1; l <= 9; l++) {
    let on = false
    for (let sx = -2.6; sx <= 2.2; sx += 0.012) {
      const y = MB - 0.011 * l - 0.0022 * Math.sin(sx * 11 + l * 1.7) - 0.0012 * Math.sin(sx * 29 + l)
      const inside = y > MB - midH(sx) + 0.003
      if (inside && on) strata.lineTo(sx, y)
      else if (inside) strata.moveTo(sx, y)
      on = inside
    }
  }
  const reflection = outline([...top.map(([x, y]): Pt => [x, MB + (MB - y) * 0.55]), [2.2, MB], [-2.6, MB]])
  // The harbour: white houses with dark roofs, a pier.
  const walls = new Path2D()
  const roofs = new Path2D()
  for (let i = 0; i < 9; i++) {
    const sx = HARBOUR + 0.012 * i + 0.006 * hash(i, 51)
    const y = MB + 0.002 - 0.006 * hash(i, 52)
    const s = 0.004
    outline([[sx - s, y], [sx + s, y], [sx + s, y - s * 1.2], [sx - s, y - s * 1.2]], walls)
    outline([[sx - s * 1.15, y - s * 1.2], [sx + s * 1.15, y - s * 1.2], [sx, y - s * 2]], roofs)
  }
  return { body, green, strata, reflection, walls, roofs }
})

/** The mountains across the fjord, with their weather: drawn after the glacier's massif. */
export function drawMid(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number, dim: number): void {
  const m = MID()
  onPlane(ctx, f, k, PLANE.mid, (px) => {
    ctx.fillStyle = mixHex(ICE.mid, ICE.skyAsh, dim * 0.4)
    ctx.fill(m.body)
    ctx.fillStyle = mixHex(ICE.midGreen, ICE.skyAsh, dim * 0.5)
    ctx.fill(m.green)
    ctx.lineWidth = px
    ctx.strokeStyle = mixHex(ICE.midDeep, ICE.skyAsh, dim * 0.4)
    ctx.globalAlpha = 0.55
    ctx.stroke(m.strata)
    // Cloud shadows going over them on the wind.
    ctx.globalAlpha = 1
    ctx.save()
    ctx.clip(m.body)
    shadows(ctx, seen(f, PLANE.mid), t, 0.016, 0.6, MB - 0.09, 0.05, 61)
    ctx.restore()
    // The harbour, and a boat going out from it, its wake behind.
    ctx.fillStyle = ICE.house
    ctx.fill(m.walls)
    ctx.fillStyle = ICE.roof
    ctx.fill(m.roofs)
    const bx = HARBOUR + 0.12 + 0.024 * (t - 95)
    const by = MB + 0.012
    ctx.strokeStyle = ICE.waterGlint
    ctx.lineWidth = px
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(bx - 0.006, by)
    ctx.lineTo(bx - 0.05, by - 0.004)
    ctx.moveTo(bx - 0.006, by + 0.001)
    ctx.lineTo(bx - 0.05, by + 0.006)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = ICE.hull
    ctx.fill(outline([[bx - 0.008, by - 0.002], [bx + 0.009, by - 0.002], [bx + 0.006, by + 0.002], [bx - 0.007, by + 0.002]]))
    ctx.fillStyle = ICE.house
    ctx.fillRect(bx - 0.004, by - 0.006, 0.005, 0.004)
  })
}

/**
 * Cloud shadows: soft darker patches going over a plane on the wind, three steps of shade to each so the edge is
 * soft. `speed` is the wind on this plane, `size` the patches' breadth, `y` and `h` the band they cross.
 */
export function shadows(ctx: CanvasRenderingContext2D, v: { x0: number; x1: number }, t: number, speed: number, size: number, y: number, h: number, seed: number, a = 0.075): void {
  const span = 5 * size
  const drift = speed * t
  ctx.fillStyle = ICE.cloudShadow
  for (let i = 0; i < 4; i++) {
    const x0 = (i + hash(i, 1, seed) * 0.6) * (span / 4)
    const lo = Math.floor((v.x0 - size - x0 - drift) / span)
    const hi = Math.floor((v.x1 + size - x0 - drift) / span)
    for (let n = lo; n <= hi; n++) {
      const x = x0 + drift + n * span
      const yy = y + h * (hash(i, n, seed + 1) - 0.5)
      const w = size * (0.3 + 0.25 * hash(i, n, seed + 2))
      for (let s = 0; s < 3; s++) {
        const g = 1 - s * 0.24
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.ellipse(x, yy, w * g, w * 0.32 * g, 0, 0, Math.PI * 2)
        ctx.ellipse(x + w * 0.45 * g, yy + w * 0.05, w * 0.55 * g, w * 0.24 * g, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.globalAlpha = 1
}

/** The far range and the volcano: behind everything but the sky. The plume goes over them (`erupt.ts`). */
export function drawFar(ctx: CanvasRenderingContext2D, f: Frame, k: number, dim: number): void {
  const g = FAR()
  onPlane(ctx, f, k, PLANE.far, (px) => {
    ctx.fillStyle = mixHex(ICE.volcano, ICE.skyAsh, dim * 0.4)
    ctx.fill(g.domePath)
    ctx.fillStyle = mixHex(ICE.ice, ICE.skyAsh, dim * 0.45)
    ctx.fill(g.cap)
    ctx.strokeStyle = rgbaHex(ICE.farDeep, 0.45)
    ctx.lineWidth = px
    ctx.stroke(g.ribs)
    ctx.strokeStyle = rgbaHex(ICE.farDeep, 0.55)
    ctx.lineWidth = 0.9 * px
    ctx.stroke(g.domeLine)
    ctx.fillStyle = mixHex(ICE.far, ICE.skyAsh, dim * 0.5)
    ctx.fill(g.ridge)
    ctx.fillStyle = mixHex(ICE.snow, ICE.skyAsh, dim * 0.5)
    ctx.fill(g.snow)
    ctx.strokeStyle = rgbaHex(ICE.farDeep, 0.5)
    ctx.lineWidth = 1.2 * px
    ctx.stroke(g.rock)
    // The air between: the range's foot goes pale into the haze over the water.
    const haze = ctx.createLinearGradient(0, HZ - 0.05, 0, HZ)
    haze.addColorStop(0, rgbaHex(mixHex(ICE.skyLow, ICE.skyAsh, dim * 0.75), 0))
    haze.addColorStop(1, rgbaHex(mixHex(ICE.skyLow, ICE.skyAsh, dim * 0.75), 0.7))
    ctx.fillStyle = haze
    ctx.fillRect(-2.2, HZ - 0.05, 4.4, 0.05)
  })
}

/** The glacier's massif, its cap, its outlet glacier and the ice off its snout. */
export function drawGlacier(ctx: CanvasRenderingContext2D, f: Frame, k: number, dim: number): void {
  const g = GLACIER()
  onPlane(ctx, f, k, PLANE.glacier, (px) => {
    ctx.fillStyle = mixHex(ICE.massif, ICE.skyAsh, dim * 0.45)
    ctx.fill(g.massif)
    ctx.fillStyle = mixHex(ICE.snow, ICE.skyAsh, dim * 0.5)
    ctx.fill(g.cap)
    ctx.fillStyle = mixHex(ICE.glacier, ICE.skyAsh, dim * 0.45)
    ctx.fill(g.tongue)
    ctx.strokeStyle = ICE.crevasse
    ctx.lineWidth = px
    ctx.stroke(g.cracks)
    ctx.strokeStyle = rgbaHex(ICE.moraine, 0.7)
    ctx.lineWidth = 1.5 * px
    ctx.stroke(g.moraine)
    ctx.fillStyle = ICE.glacierFace
    ctx.fill(g.face)
  })
}

/* ------------------------------------------------------------------ the fjord */

const ROWS = 18
const ROW_SPAN = 4
/** The water's skin, row by row from the far shore to the near: each row a ring of streaks, made once. */
const SKIN = cached(() =>
  Array.from({ length: ROWS }, (_, r) => {
    const d = r / (ROWS - 1)
    const gap = 0.03 + 0.11 * d
    const n = Math.floor(ROW_SPAN / gap)
    return {
      d,
      y: HZ + 0.008 + 0.62 * Math.pow(d, 1.7),
      gap,
      items: Array.from({ length: n }, (_, i) => ({
        x: (i + hash(i, r, 91) * 0.8) * gap,
        len: (0.01 + 0.06 * d) * (0.5 + hash(i, r, 92)),
        dark: hash(i, r, 93) < 0.4,
        bright: hash(i, r, 94) > 0.5,
      })).filter((_, i) => hash(i, r, 95) > 0.3),
    }
  }),
)

/**
 * The fjord: its colour from the far shore to the near, the mountains' reflections, and its skin: rows of streaks of
 * the sky's light and the ripples' shade, each row sliding as a plane at its own distance would and drifting on the
 * wind, the sun's light in a path under it and, after the eruption, the fire's.
 */
export function drawWater(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number, dim: number): void {
  const fv = seen(f, PLANE.far)
  const m = ctx.getTransform()
  const ppu = (f.y1 - f.y0) * k * Math.hypot(m.a, m.b)
  onPlane(ctx, f, k, PLANE.far, () => {
    // The water's colour from the far shore to the near, painted once; the ash laid over it.
    const water = bake('ice-water', ppu, 3.2, HZ, 0.8, (c) => {
      const g = c.createLinearGradient(0, HZ, 0, 0.62)
      g.addColorStop(0, ICE.waterFar)
      g.addColorStop(1, ICE.waterNear)
      c.fillStyle = g
      c.fillRect(0, HZ, 3.2, 0.8 - HZ)
      // The water's grain: ripples in rows, close and fine far off, wider apart and broader near to, each row a run of
      // light and shade dashes. They come round at either end of the band.
      const px = 1 / ppu
      const light = new Path2D()
      const shade = new Path2D()
      let y = HZ + 0.002
      for (let r = 0; y < 0.8; r++) {
        const d = (y - HZ) / 0.6
        let x = hash(r, 1, 701) * 0.05
        while (x < 3.2) {
          const len = (0.008 + 0.05 * d) * (0.4 + hash(r, Math.round(x * 997), 702))
          const gap = (0.004 + 0.03 * d) * (0.3 + hash(r, Math.round(x * 991), 703))
          const p = hash(r, Math.round(x * 983), 704) < 0.5 ? light : shade
          p.moveTo(x, y)
          p.lineTo(Math.min(3.2, x + len), y)
          x += len + gap
        }
        y += 0.0016 + 0.02 * d * d + 0.004 * d
      }
      c.lineCap = 'round'
      c.lineWidth = 1.2 * px
      c.globalAlpha = 0.16
      c.strokeStyle = ICE.waterGlint
      c.stroke(light)
      c.globalAlpha = 0.18
      c.strokeStyle = ICE.waterDark
      c.lineWidth = 1.6 * px
      c.stroke(shade)
      c.globalAlpha = 1
    })
    if (water) layBaked(ctx, water, -1.6, fv.x0, fv.x1)
    else {
      ctx.fillStyle = ICE.waterNear
      ctx.fillRect(fv.x0, HZ, fv.x1 - fv.x0, fv.y1 - HZ)
    }
    if (fv.y1 > 0.8) {
      ctx.fillStyle = ICE.waterNear
      ctx.fillRect(fv.x0 - 0.1, 0.799, fv.x1 - fv.x0 + 0.2, fv.y1 - 0.79)
    }
    if (dim > 0.002) {
      ctx.fillStyle = rgbaHex(ICE.skyAsh, 0.45 * dim)
      ctx.fillRect(fv.x0 - 0.1, HZ, fv.x1 - fv.x0 + 0.2, fv.y1 - HZ + 0.1)
    }
  })
  // The mountains' and the glacier's reflections, broken by the ripples drawn over them.
  onPlane(ctx, f, k, PLANE.mid, () => {
    ctx.fillStyle = rgbaHex(mixHex(ICE.mid, ICE.skyAsh, dim * 0.4), 0.38)
    ctx.fill(MID().reflection)
  })
  onPlane(ctx, f, k, PLANE.glacier, () => {
    ctx.fillStyle = rgbaHex(ICE.glacier, 0.3 * (1 - dim * 0.6))
    ctx.fill(GLACIER().reflection)
    // Ice off the snout, drifting out.
    ctx.fillStyle = mixHex(ICE.ice, ICE.skyAsh, dim * 0.5)
    for (let i = 0; i < 7; i++) {
      const x = TONGUE_X - 0.02 + 0.2 * hash(i, 97) + 0.0016 * (t - 95) * (0.5 + hash(i, 98))
      const y = GB + 0.004 + 0.012 * hash(i, 99)
      const s = 0.002 + 0.003 * hash(i, 100)
      ctx.fillRect(x - s, y - s * 0.6, 2 * s, s * 0.8)
    }
  })

  // The skin. Each row is a strip of the water at its own distance: it slides with the camera as such a strip would
  // (the far rows hardly at all, the near ones nearly as the road does), and its streaks drift on the wind.
  const sunX = SUN[0]
  const fire = t >= ERUPT ? Math.exp(-(t - ERUPT) / 2.2) * 0.8 + 0.2 * (1 - dim * 0.6) : 0
  onPlane(ctx, f, k, PLANE.far, (px) => {
    // Paths by kind (sky's light, ripple shade, the sun's glitter, the fire's), brightness and nearness.
    const paths: Path2D[] = Array.from({ length: 16 }, () => new Path2D())
    const sunAt = sunX + 0.008 * (f.cx - CX0)
    for (const row of SKIN()) {
      const d = row.d
      // How far this row slides beyond the far plane, frame heights a cell.
      const sx = -0.06 * d * d * (f.cx - CX0)
      const sy = -0.07 * d * d * (f.cy - CY0)
      const y = row.y + sy
      if (y < fv.y0 - 0.02 || y > fv.y1 + 0.02 || y < HZ + 0.003) continue
      const drift = t * (0.006 + 0.036 * d) + sx
      const lo = fv.x0 - 0.1 - drift
      const hi = fv.x1 + 0.1 - drift
      const near = d > 0.4 ? 1 : 0
      for (let w = Math.floor(lo / ROW_SPAN); w <= Math.floor(hi / ROW_SPAN); w++) {
        for (const it of row.items) {
          const x = it.x + w * ROW_SPAN
          if (x < lo || x > hi) continue
          const at = x + drift
          const kind = it.dark ? 1 : fire > 0 && Math.abs(at - CRATER_SX) < 0.02 + 0.09 * d ? 3 : Math.abs(at - sunAt) < 0.03 + 0.12 * d ? 2 : 0
          const len = it.len * (kind >= 2 ? 0.7 : 1)
          const p = paths[kind * 4 + (it.bright ? 2 : 0) + near]
          p.moveTo(at, y)
          p.lineTo(at + len, y)
        }
      }
    }
    ctx.lineCap = 'round'
    const cols = [ICE.waterGlint, ICE.waterDark, ICE.sunGlitter, ICE.fireGlitter]
    const alphas = [0.42 * (1 - dim * 0.6), 0.32, 0.8 * (1 - dim), 0.85 * fire]
    for (let kind = 0; kind < 4; kind++) {
      if (alphas[kind] <= 0.01) continue
      ctx.strokeStyle = cols[kind]
      for (let b = 0; b < 4; b++) {
        ctx.globalAlpha = alphas[kind] * (b >= 2 ? 1 : 0.55)
        ctx.lineWidth = (b % 2 ? 2.4 : 1.1) * px
        ctx.stroke(paths[kind * 4 + b])
      }
    }
    ctx.globalAlpha = 1
  })
}

/** 'rgba(…)' from a '#rrggbb' and an alpha. */
export function rgbaHex(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}
