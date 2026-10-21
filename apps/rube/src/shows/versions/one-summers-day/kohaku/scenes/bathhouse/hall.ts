import type { Light } from '../../light'
import { box, circle, ellipse, fill, ink, lerp, lit, mix, poly, pool, rgba, smooth, smoother, sway, vgrad, type Paint, type Pt } from '../../paint'
import { BATH } from '../../geo'
import { DOORS, FLOOD, HOOK, HOOK_DROP, PULLS, RISE, TREADLE } from './beats'

/**
 * The great bath's hall, inside, seen through its front where the front has come away: a room with depth, its floor of
 * polished boards running back to a back wall of dark wood, its ceiling's beams, its side walls; the gallery along the
 * back wall with its red rail; paper lanterns; the big oval tub of hooped staves on the floor; the brass spout over
 * the tub's east end on the pipe up from the boiler room; and the back doors at the east end, which slide open on the
 * night and the sea.
 *
 * And the hall's machine: the token on its peg by the tub's west end, which a treadle knocks off onto its cord, down
 * through the floor to the boiler room; and the pulley over the tub, its hook and its rope to the gallery, where the
 * hands haul on it.
 */

const H = BATH.hall
const T = BATH.tub

/** The lamplight the hall is in: warm whatever the night, a little of the night in it. */
export const inside = (L: Light): string => mix('#FFE6C0', L.ambient, 0.1)

/** The back wall's plane, set back from the cut: the floor, ceiling and side walls run back to it. */
export const BACK = { x0: H.x0 + 0.38, x1: H.x1 - 0.38, y0: H.y0 + 0.3, y1: H.y1 - 0.32 }
/** The gallery's floor (its front edge), and how far along the back wall it runs. */
export const GALLERY = { y: BATH.gallery, x0: H.x0 + 0.1, x1: 66.3 }
/** The back doors: their opening in the back wall. */
export const DOORWAY = { x0: 67.0, x1: 68.5, y0: -3.5, y1: BACK.y1 }
/** The treadle by the tub's west end, the peg the token hangs on, and the hole its cord goes down through. */
export const TREAD = { x: 60.15, w: 0.4, top: H.y1 - 0.07 }
export const PEG: Pt = [60.5, -1.74]
export const HOLE: Pt = [59.5, H.y1 - 0.04]
/** The pulley over the tub's west end, and where the thorn is before it is pulled. */
export const PULLEY: Pt = [61.35, -4.12]
export const THORN: Pt = [61.35, -2.62]
/** The tub's oval mouth: its middle, and its half width and half depth as seen. */
export const MOUTH = { x: (T.x0 + T.x1) / 2, y: T.rim, rx: (T.x1 - T.x0) / 2, ry: 0.2 }

/** How far the hands have hauled the rope in (cells) at `t`: a step each pull, eased. */
export function hauled(t: number): number {
  let h = 0
  for (const p of PULLS) h += 0.12 * smoother(t, p, p + 0.32)
  return h
}

/** How far the back doors stand open, 0 to 1. */
export const doorsOpen = (t: number): number => smoother(t, DOORS, DOORS + 0.9)

/** The tub's water: how full, 0 (dry) to 1 (to the rim), as the spout fills it and, after he is gone, it settles lower. */
export function waterIn(t: number): number {
  return smooth(t, FLOOD - 1.2, FLOOD + 0.3) * (1 - 0.35 * smooth(t, RISE + 6, RISE + 12))
}

/** The room: floor, ceiling, side walls, the back wall with the gallery on it and the doors in it. */
export function drawHallBack(g: Paint, L: Light): void {
  const { ctx, t } = g
  const IN = inside(L)
  const B = BACK
  // The back wall: warm wood in the lanterns' light, lighter high up where it falls, darker down by the floor.
  ctx.fillStyle = vgrad(ctx, B.y0, B.y1, [
    [0, lit('#93613F', IN)],
    [0.45, lit('#A06E4A', IN)],
    [1, lit('#6E4632', IN)],
  ])
  ctx.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0)
  // Its uprights, red, and a long beam across under the ceiling.
  const red = lit('#A8402C', IN)
  for (let x = B.x0 + 0.05; x < B.x1; x += 2.15) box(ctx, x - 0.08, B.y0, 0.16, B.y1 - B.y0, red)
  box(ctx, B.x0, B.y0 + 0.28, B.x1 - B.x0, 0.12, lit('#5A3424', IN))
  // The back doors: an opening onto the night; two lit paper leaves slide apart off it.
  const d = DOORWAY
  const open = doorsOpen(t)
  ctx.save()
  ctx.beginPath()
  ctx.rect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0)
  ctx.clip()
  ctx.fillStyle = vgrad(ctx, d.y0, d.y1, [
    [0, L.top],
    [0.5, L.low],
    [0.51, L.seaFar],
    [1, L.seaNear],
  ])
  ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0)
  // The moon's path on the water.
  const sea = d.y0 + (d.y1 - d.y0) * 0.505
  for (let i = 0; i < 4; i++) {
    const w = 0.14 + i * 0.1
    box(ctx, (d.x0 + d.x1) / 2 - w / 2 + 0.04 * Math.sin(t * 0.8 + i), sea + 0.1 + i * 0.2, w, 0.03, rgba(L.seaLit, 0.55 - i * 0.1))
  }
  const half = (d.x1 - d.x0) / 2
  const slide = half * open
  for (const s of [-1, 1]) {
    const x = s < 0 ? d.x0 - slide : (d.x0 + d.x1) / 2 + slide
    box(ctx, x, d.y0, half, d.y1 - d.y0, lit('#EFD39A', IN))
    for (let k = 1; k < 3; k++) {
      poly(ctx, [[x + (half * k) / 3, d.y0], [x + (half * k) / 3, d.y1]], false)
      ink(g, lit('#8A5A30', IN), 1)
    }
    poly(ctx, [[x, d.y0 + (d.y1 - d.y0) * 0.45], [x + half, d.y0 + (d.y1 - d.y0) * 0.45]], false)
    ink(g, lit('#8A5A30', IN), 1)
  }
  ctx.restore()
  box(ctx, d.x0 - 0.1, d.y0 - 0.12, d.x1 - d.x0 + 0.2, 0.12, lit('#3E2618', IN))
  box(ctx, d.x0 - 0.1, d.y0, 0.1, d.y1 - d.y0, lit('#3E2618', IN))
  box(ctx, d.x1, d.y0, 0.1, d.y1 - d.y0, lit('#3E2618', IN))
  // The pipe up the back wall from the floor to the spout.
  const [sx, sy] = BATH.spout
  box(ctx, sx - 0.07, sy + 0.05, 0.14, B.y1 - sy, lit('#8C6A3A', IN))
  box(ctx, sx - 0.1, -1.75, 0.2, 0.07, lit('#6A4C28', IN))
  // The ceiling running back: dark, with its beams coming forward.
  poly(ctx, [[H.x0, H.y0], [H.x1, H.y0], [B.x1, B.y0], [B.x0, B.y0]])
  fill(ctx, lit('#2E1E14', IN))
  for (let x = B.x0 + 1.2; x < B.x1; x += 2.6) {
    const f = (x - B.x0) / (B.x1 - B.x0)
    const fx = H.x0 + f * (H.x1 - H.x0)
    poly(ctx, [[fx - 0.1, H.y0], [fx + 0.1, H.y0], [x + 0.07, B.y0], [x - 0.07, B.y0]])
    fill(ctx, lit('#3E2A1E', IN))
  }
  // The side walls running back.
  poly(ctx, [[H.x0, H.y0], [B.x0, B.y0], [B.x0, B.y1], [H.x0, H.y1]])
  fill(ctx, lit('#3E2818', IN))
  poly(ctx, [[H.x1, H.y0], [B.x1, B.y0], [B.x1, B.y1], [H.x1, H.y1]])
  fill(ctx, lit('#3E2818', IN))
  // The floor running back: polished boards, lighter where the lamps are over them; the boards' joints running back.
  poly(ctx, [[H.x0, H.y1], [H.x1, H.y1], [B.x1, B.y1], [B.x0, B.y1]])
  ctx.fillStyle = vgrad(ctx, B.y1, H.y1, [
    [0, lit('#8A6446', IN)],
    [1, lit('#A47A54', IN)],
  ])
  ctx.fill()
  for (let i = 1; i < 12; i++) {
    const f = i / 12
    poly(ctx, [[lerp(H.x0, H.x1, f), H.y1], [lerp(B.x0, B.x1, f), B.y1]], false)
    ink(g, rgba(lit('#6A4A32', IN), 0.5), 1)
  }
  // The gallery: its floor along the back wall, seen at eye level as a band; its red rail; brackets under it.
  box(ctx, GALLERY.x0, GALLERY.y, GALLERY.x1 - GALLERY.x0, 0.14, lit('#3A2618', IN))
  box(ctx, GALLERY.x0, GALLERY.y - 0.4, GALLERY.x1 - GALLERY.x0, 0.06, lit('#B4432F', IN))
  for (let x = GALLERY.x0 + 0.2; x <= GALLERY.x1; x += 0.42) box(ctx, x - 0.02, GALLERY.y - 0.4, 0.04, 0.4, lit('#B4432F', IN))
  for (let x = GALLERY.x0 + 0.7; x < GALLERY.x1; x += 2.1) {
    poly(ctx, [[x, GALLERY.y + 0.14], [x + 0.3, GALLERY.y + 0.14], [x, GALLERY.y + 0.48]])
    fill(ctx, lit('#3A2618', IN))
  }
}

/** Paper lanterns hanging from the ceiling, and their light on the boards under them. */
export function drawHallLamps(g: Paint, L: Light): void {
  const { ctx, t } = g
  const IN = inside(L)
  for (const [i, x] of [58.9, 66.0].entries()) {
    const y = BACK.y0 + 0.55
    const swing = 0.01 * sway(t, 0.35, i + 3)
    poly(ctx, [[x, BACK.y0], [x + swing, y - 0.16]], false)
    ink(g, lit('#2A1A12', IN), 1)
    ellipse(ctx, x + swing, y, 0.13, 0.17)
    fill(ctx, '#F4B566')
    box(ctx, x + swing - 0.07, y - 0.19, 0.14, 0.05, lit('#2A1A12', IN))
    box(ctx, x + swing - 0.07, y + 0.14, 0.14, 0.05, lit('#2A1A12', IN))
    pool(ctx, x, H.y1 - 0.12, 1.5, '#F7C27A', 0.32, 0.16)
  }
}

/** The tub's far half: its inside wall, seen over the near rim, and the far half of the rim. */
export function drawTubBack(g: Paint, L: Light): void {
  const { ctx } = g
  const IN = inside(L)
  ctx.beginPath()
  ctx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, Math.PI, Math.PI * 2)
  ctx.closePath()
  fill(ctx, lit('#7A5234', IN))
  ctx.beginPath()
  ctx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, Math.PI, Math.PI * 2)
  ink(g, lit('#D2A877', IN), 3)
}

/** The water in the tub, at the height it has risen to, inside the tub's mouth. */
export function drawTubWater(g: Paint, L: Light): void {
  const { ctx, t } = g
  const w = waterIn(t)
  if (w <= 0.01) return
  const IN = inside(L)
  const y = lerp(T.rim + 0.5, T.rim, w)
  const rx = MOUTH.rx * lerp(0.86, 0.99, w)
  const ry = MOUTH.ry * lerp(0.8, 0.98, w)
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(T.x1, T.rim + 0.6)
  ctx.lineTo(T.x0, T.rim + 0.6)
  ctx.closePath()
  ctx.clip()
  ellipse(ctx, MOUTH.x, y, rx, ry)
  fill(ctx, rgba(mix('#8CC4C6', IN, 0.25), 0.82))
  // A few slow rings of light across it.
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.25 + i / 3) % 1)
    ellipse(ctx, MOUTH.x - 0.6 + i * 0.7, y, 0.3 + u * 0.5, 0.03 + u * 0.05)
    ink(g, rgba('#EAF6F2', 0.35 * (1 - u)), 1.2)
  }
  ctx.restore()
}

/** The tub's near side: its staves and hoops, the near half of the rim, and the water spilling over it as it floods. */
export function drawTubFront(g: Paint, L: Light): void {
  const { ctx, t } = g
  const IN = inside(L)
  const line = lit('#3A2216', IN)
  const bottom = T.bed
  // The near staves: from the rim's near half down to the bottom's curve.
  ctx.beginPath()
  ctx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, 0, Math.PI)
  ctx.lineTo(T.x0 + 0.06, bottom - 0.04)
  ctx.ellipse(MOUTH.x, bottom - 0.04, MOUTH.rx - 0.06, MOUTH.ry * 0.7, 0, Math.PI, 0, true)
  ctx.closePath()
  ctx.fillStyle = vgrad(ctx, T.rim, bottom, [
    [0, lit('#C08E5C', IN)],
    [1, lit('#7E5636', IN)],
  ])
  ctx.fill()
  ink(g, line, 1.5)
  // Staves: lines down the near side, closer together towards the ends as it turns away.
  for (let i = 1; i < 14; i++) {
    const a = Math.PI * (i / 14)
    const x = MOUTH.x - Math.cos(a) * MOUTH.rx * 0.985
    const y0 = MOUTH.y + Math.sin(a) * MOUTH.ry
    const y1 = bottom - 0.04 + Math.sin(a) * MOUTH.ry * 0.7
    poly(ctx, [[x, y0 + 0.03], [x, y1]], false)
    ink(g, rgba(lit('#6A4228', IN), 0.6), 1)
  }
  // Two hoops.
  for (const k of [0.28, 0.78]) {
    ctx.beginPath()
    const y = lerp(T.rim, bottom, k)
    ctx.ellipse(MOUTH.x, y, MOUTH.rx - 0.03 * k, MOUTH.ry * lerp(1, 0.7, k), 0, 0, Math.PI)
    ink(g, lit('#3E3A36', IN), 4)
  }
  // The near rim.
  ctx.beginPath()
  ctx.ellipse(MOUTH.x, MOUTH.y, MOUTH.rx, MOUTH.ry, 0, 0, Math.PI)
  ink(g, lit('#D8AE7C', IN), 3.4)
  // As it floods, water over the near rim at both ends and down the staves to the boards, spreading.
  const spill = smooth(t, FLOOD - 0.2, FLOOD + 0.6) * (1 - smooth(t, FLOOD + 6, FLOOD + 11))
  if (spill > 0.01) {
    const water = mix('#8EC5C8', IN, 0.25)
    const fall = smooth(t, FLOOD - 0.1, FLOOD + 0.5)
    for (const [x0, dir] of [[T.x0 + 0.25, -1], [T.x1 - 0.25, 1]] as const) {
      ctx.beginPath()
      ctx.moveTo(x0 - dir * 0.25, T.rim + 0.08)
      ctx.quadraticCurveTo(x0 + dir * 0.05, T.rim + 0.02, x0 + dir * 0.12, T.rim + 0.2)
      ctx.lineTo(x0 + dir * 0.14, lerp(T.rim + 0.2, bottom, fall))
      ctx.lineTo(x0 + dir * 0.02, lerp(T.rim + 0.2, bottom, fall))
      ctx.lineTo(x0 - dir * 0.05, T.rim + 0.12)
      ctx.closePath()
      fill(ctx, rgba(water, 0.6 * spill))
      const reach = 0.25 + 1.4 * smooth(t, FLOOD + 0.3, FLOOD + 3)
      ellipse(ctx, x0 + dir * reach * 0.6, bottom + 0.02, reach * 0.7, 0.05)
      fill(ctx, rgba(mix(water, '#FFFFFF', 0.2), 0.42 * spill))
    }
  }
}

/** The spout: a brass mouth on the wall over the tub's east end, and its water arching down into the tub. */
export function drawSpout(g: Paint, L: Light, flow: number): void {
  const { ctx, t } = g
  const IN = inside(L)
  const [sx, sy] = BATH.spout
  const brass = lit('#C9993E', IN)
  if (flow > 0.01) {
    const end: Pt = [T.x1 - 0.9, T.rim - 0.08]
    const w = 0.05 + 0.12 * flow
    const wob = 0.02 * Math.sin(t * 9)
    ctx.beginPath()
    ctx.moveTo(sx - 0.3, sy - w * 0.5)
    ctx.quadraticCurveTo(sx - 0.85, sy - 0.15, end[0] - w, end[1])
    ctx.lineTo(end[0] + w + wob, end[1])
    ctx.quadraticCurveTo(sx - 0.6, sy + 0.1, sx - 0.3, sy + w * 0.5)
    ctx.closePath()
    fill(ctx, rgba(mix('#A9D6D6', IN, 0.2), 0.78 * Math.min(1, flow * 1.4)))
    ctx.beginPath()
    ctx.moveTo(sx - 0.32, sy - w * 0.15)
    ctx.quadraticCurveTo(sx - 0.82, sy - 0.08, end[0], end[1])
    ink(g, rgba('#F4FBF6', 0.6 * flow), 2)
    if (flow > 0.3) {
      ellipse(ctx, end[0], end[1] + 0.03, 0.24 + 0.04 * Math.sin(t * 7), 0.06)
      fill(ctx, rgba('#F2F6EE', 0.55 * flow))
    }
  }
  ctx.beginPath()
  ctx.moveTo(sx + 0.08, sy - 0.12)
  ctx.quadraticCurveTo(sx - 0.1, sy - 0.2, sx - 0.32, sy - 0.1)
  ctx.lineTo(sx - 0.36, sy + 0.12)
  ctx.quadraticCurveTo(sx - 0.12, sy + 0.04, sx + 0.08, sy + 0.12)
  ctx.closePath()
  fill(ctx, brass)
  ink(g, lit('#4A3214', IN), 1.4)
  circle(ctx, sx + 0.05, sy, 0.12)
  fill(ctx, lit('#A07A2E', IN))
}

/** The token on its peg and its cord, and the treadle under it, its west end going down when she lands on it. */
export function drawToken(g: Paint, L: Light): void {
  const { ctx, t } = g
  const IN = inside(L)
  const line = lit('#3A2216', IN)
  poly(ctx, [[PEG[0] - 0.04, PEG[1] + 0.04], HOLE], false)
  ink(g, lit('#E6D2A6', IN), 1.6)
  ellipse(ctx, HOLE[0], HOLE[1] + 0.02, 0.09, 0.035)
  fill(ctx, lit('#1E120C', IN))
  box(ctx, PEG[0] - 0.03, PEG[1] - 0.05, 0.06, H.y1 - PEG[1] + 0.02, lit('#5A3A24', IN))
  const down = smooth(t, TREADLE - 0.02, TREADLE + 0.06) - 0.6 * smooth(t, TREADLE + 0.4, TREADLE + 1.2)
  const a = 0.18 * down
  box(ctx, TREAD.x - 0.05, TREAD.top + 0.02, 0.1, H.y1 - TREAD.top - 0.02, lit('#4A3022', IN))
  ctx.save()
  ctx.translate(TREAD.x, TREAD.top)
  ctx.rotate(-a)
  box(ctx, -TREAD.w / 2, -0.04, TREAD.w, 0.05, lit('#A87A4E', IN))
  ctx.restore()
  const lift = Math.sin(a) * TREAD.w * 0.5
  poly(ctx, [[TREAD.x + TREAD.w / 2 - 0.02, TREAD.top - lift], [PEG[0] - 0.02, PEG[1] + 0.12 - lift * 2.5]], false)
  ink(g, lit('#6A4A30', IN), 1.4)
  // The token: a wooden tag with a red band, on its peg until the treadle knocks it onto the cord; then down the cord
  // into the floor.
  const go = smoother(t, TREADLE + 0.05, TREADLE + 0.75)
  if (go < 0.999) {
    const p: Pt = [lerp(PEG[0] + 0.02, HOLE[0], go), lerp(PEG[1] + 0.07, HOLE[1] - 0.05, go)]
    const flip = smooth(t, TREADLE, TREADLE + 0.12)
    ctx.save()
    ctx.translate(p[0], p[1])
    ctx.rotate(-0.15 + flip * 0.5)
    ctx.globalAlpha = 1 - smooth(go, 0.85, 1)
    box(ctx, -0.06, -0.09, 0.12, 0.19, lit('#D2AA70', IN))
    box(ctx, -0.06, -0.03, 0.12, 0.05, lit('#B0402C', IN))
    ctx.strokeStyle = line
    ctx.lineWidth = Math.max(1.25 * g.px, 1 / 108)
    ctx.strokeRect(-0.06, -0.09, 0.12, 0.19)
    ctx.restore()
  }
  box(ctx, PEG[0] - 0.02, PEG[1] - 0.03, 0.08, 0.03, lit('#3A2216', IN))
}

/** Where the hook is at `t`: up at the pulley, coming down onto the thorn, then on it as it is hauled up. */
export function hookAt(t: number, thorn: Pt): Pt {
  const down = smoother(t, HOOK_DROP, HOOK)
  const y = lerp(PULLEY[1] + 0.15, thorn[1] - 0.06, down)
  return [PULLEY[0], t < HOOK ? y : thorn[1] - 0.06]
}

/** The pulley on its beam, the rope down to the hook, and the rope's run over to the gallery and the hands on it. */
export function drawPulley(g: Paint, L: Light, hook: Pt, hands: Pt[], slack: number): void {
  const { ctx } = g
  const IN = inside(L)
  const rope = lit('#D2B886', IN)
  const line = lit('#2A1A12', IN)
  box(ctx, PULLEY[0] - 0.05, H.y0 + 0.16, 0.1, PULLEY[1] - H.y0 - 0.18, lit('#3E2A1E', IN))
  circle(ctx, PULLEY[0], PULLEY[1], 0.1)
  fill(ctx, lit('#6A5038', IN))
  ink(g, line, 1.3)
  circle(ctx, PULLEY[0], PULLEY[1], 0.03)
  fill(ctx, line)
  poly(ctx, [[PULLEY[0] + 0.1, PULLEY[1]], [hook[0] + 0.1, hook[1] - 0.08]], false)
  ink(g, rope, 2.2)
  ctx.beginPath()
  ctx.moveTo(hook[0] + 0.1, hook[1] - 0.08)
  ctx.lineTo(hook[0] + 0.1, hook[1] + 0.02)
  ctx.arc(hook[0] + 0.04, hook[1] + 0.02, 0.06, 0, Math.PI * 0.9)
  ink(g, lit('#3E3A36', IN), 2.2)
  if (hands.length) {
    const pts: Pt[] = [[PULLEY[0] - 0.1, PULLEY[1]], ...hands.map(([x, y]): Pt => [x, y + 0.02])]
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.04 + slack * 0.22, b[0], b[1])
    }
    const last = pts[pts.length - 1]
    ctx.quadraticCurveTo(last[0] - 0.15, last[1] + 0.2 + slack * 0.2, last[0] - 0.25, GALLERY.y - 0.02)
    ink(g, rope, 2.2)
  }
}

/**
 * The steam off the hot water once it is running: a few soft rounds lifting off the water and thinning as they go,
 * leaning a little toward the open doors. Few and slow, so the hall reads as a bath and not as weather.
 */
export function drawSteam(g: Paint, L: Light): void {
  const { ctx, t } = g
  const hot = waterIn(t) * smooth(t, FLOOD - 0.5, FLOOD + 1.5)
  if (hot <= 0.01) return
  const col = mix('#FFF6E8', inside(L), 0.2)
  for (let i = 0; i < 6; i++) {
    const period = 4.2
    const age = (t + i * (period / 6)) % period
    const u = age / period
    const x = MOUTH.x + (i / 5 - 0.5) * MOUTH.rx * 1.5 + u * 0.35 + 0.12 * Math.sin(t * 0.7 + i * 1.7)
    const y = MOUTH.y - 0.05 - u * 1.25
    const r = 0.14 + u * 0.24
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2)
    ctx.ellipse(x + r * 0.8, y + r * 0.25, r, r * 0.8, 0, 0, Math.PI * 2)
    fill(ctx, rgba(col, 0.12 * hot * Math.sin(Math.PI * u)))
  }
}
