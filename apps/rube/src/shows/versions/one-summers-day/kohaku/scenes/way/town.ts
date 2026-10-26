import type { Light } from '../../light'
import { box, circle, ellipse, fill, hash, ink, lit, mix, poly, pool, rgba, smooth, sway, vgrad, type Paint } from '../../paint'
import { STREET } from '../../geo'

/**
 * The town: a street of eating houses along the top of the bank, empty, their fronts to us. Dark timber, pale
 * plaster, tiled roofs, a curtain over each door, and red paper lanterns under the eaves, unlit, until the sun goes and
 * they come on one by one down the street ahead of her, on the theme's last notes, each laying its pool on the stones.
 */

export interface House {
  x: number
  w: number
  /** Storeys: 1 or 2 (or 3 for the tall one at the far end). */
  floors: number
  /** The door curtain's colour. */
  noren: string
  /** Lanterns under its eave: their x. */
  lamps: number[]
}

export const HOUSES: House[] = [
  { x: 25.0, w: 2.6, floors: 2, noren: '#2E3E6A', lamps: [25.6, 27.0] },
  { x: 27.8, w: 2.2, floors: 1, noren: '#9C2F2A', lamps: [28.9] },
  { x: 30.2, w: 3.0, floors: 2, noren: '#2E3E6A', lamps: [30.8, 32.6] },
  { x: 33.4, w: 2.4, floors: 2, noren: '#5A3A6A', lamps: [34.6] },
  { x: 36.0, w: 2.6, floors: 1, noren: '#9C2F2A', lamps: [36.6, 38.0] },
  { x: 38.8, w: 3.0, floors: 3, noren: '#2E3E6A', lamps: [39.5, 41.2] },
]

/** Every lantern on the street, west to east. */
export const LAMPS: number[] = HOUSES.flatMap((h) => h.lamps)

const TIMBER = '#4A3426'
const PLASTER = '#E2D2B2'
const TILE = '#5E6B6A'
const SHOJI = '#EDE3C8'
const LAMP_RED = '#B8392B'
const LAMP_LIT = '#F7B562'

/** The street's stones and the bank's wall under them. */
export function drawStreet(g: Paint, L: Light): void {
  const { ctx, view: v } = g
  const x0 = Math.max(v.x0 - 1, STREET.x0 - 0.3)
  const x1 = Math.min(v.x1 + 1, STREET.x1 + 0.2)
  if (x1 <= x0) return
  const top = lit('#9A958A', L.ambient)
  box(ctx, x0, STREET.y, x1 - x0, 0.12, top)
  // The bank's stone wall, courses of big blocks, darker downwards.
  ctx.fillStyle = vgrad(ctx, STREET.y + 0.12, STREET.y + 5, [
    [0, lit('#7D776C', L.ambient)],
    [1, lit('#4C4840', L.ambient)],
  ])
  ctx.fillRect(x0, STREET.y + 0.12, x1 - x0, 6)
  // A few long courses, no grid of blocks.
  const joint = lit('#615B51', L.ambient)
  for (let r = 1; r < 5; r++) {
    const y = STREET.y + 0.12 + r * 0.62
    poly(ctx, [[x0, y], [x1, y]], false)
    ink(g, joint, 1.1)
  }
}

/** The house fronts along the street, lit as the light goes, and their lanterns as each comes on at `lampAt[i]`. */
export function drawTown(g: Paint, L: Light, lampAt: number[]): void {
  const { ctx, view: v } = g
  const line = mix('#20160F', L.top, 0.1)
  const glow = smooth(L.lamps, 0.1, 0.9)
  for (const h of HOUSES) {
    if (h.x + h.w < v.x0 - 0.5 || h.x > v.x1 + 0.5) continue
    const y = STREET.y
    const g1 = 0.85
    const g2 = h.floors >= 2 ? 0.7 : 0
    const g3 = h.floors >= 3 ? 0.62 : 0
    const top = y - g1 - g2 - g3
    // The walls: timber below, plaster above.
    box(ctx, h.x, y - g1, h.w, g1, lit(TIMBER, L.ambient))
    if (g2) box(ctx, h.x + 0.08, y - g1 - g2, h.w - 0.16, g2, lit(PLASTER, L.ambient))
    if (g3) box(ctx, h.x + 0.18, top, h.w - 0.36, g3, lit(mix(PLASTER, '#C9A27A', 0.4), L.ambient))
    // The shop front: lattice panels that glow from inside once the lamps are in.
    const inside = mix(lit(SHOJI, L.ambient), '#F6CF8E', glow * 0.85)
    for (let i = 0; i < 3; i++) {
      const px = h.x + 0.18 + i * ((h.w - 0.36) / 3)
      const pw = (h.w - 0.36) / 3 - 0.08
      box(ctx, px, y - g1 + 0.22, pw, g1 - 0.24, inside)
      for (let k = 1; k < 4; k++) {
        poly(ctx, [[px + (pw * k) / 4, y - g1 + 0.22], [px + (pw * k) / 4, y - 0.02]], false)
        ink(g, lit('#6A5038', L.ambient), 1.1)
      }
    }
    // The door curtain, stirring.
    const nw = Math.min(1.0, h.w * 0.42)
    const nx = h.x + h.w / 2 - nw / 2
    const stir = 0.02 * sway(g.t, 0.35, h.x)
    for (let i = 0; i < 3; i++) {
      const sx = nx + (i * nw) / 3
      poly(ctx, [[sx + 0.01, y - g1 + 0.16], [sx + nw / 3 - 0.01, y - g1 + 0.16], [sx + nw / 3 - 0.01 + stir, y - g1 + 0.52], [sx + 0.01 + stir, y - g1 + 0.52]])
      fill(ctx, lit(h.noren, L.ambient))
    }
    circle(ctx, nx + nw / 2, y - g1 + 0.33, 0.07)
    fill(ctx, lit('#EDE6D6', L.ambient))
    // The upper storey's window: a lattice, warm once the lamps are in.
    if (g2) {
      const ww = h.w * 0.5
      box(ctx, h.x + h.w / 2 - ww / 2, y - g1 - g2 + 0.16, ww, g2 * 0.5, mix(lit('#6E5A44', L.ambient), '#F2C27E', glow * 0.8))
      for (let k = 1; k < 5; k++) {
        const lx = h.x + h.w / 2 - ww / 2 + (ww * k) / 5
        poly(ctx, [[lx, y - g1 - g2 + 0.16], [lx, y - g1 - g2 / 2 + 0.16]], false)
        ink(g, lit(TIMBER, L.ambient), 1.2)
      }
    }
    if (g3) {
      const ww = h.w * 0.34
      box(ctx, h.x + h.w / 2 - ww / 2, top + 0.14, ww, g3 * 0.5, mix(lit('#6E5A44', L.ambient), '#F2C27E', glow * 0.8))
    }
    // The eave between the floors, and the roof.
    const tile = lit(TILE, L.ambient)
    poly(ctx, [[h.x - 0.2, y - g1 + 0.02], [h.x + h.w + 0.2, y - g1 + 0.02], [h.x + h.w + 0.05, y - g1 - 0.16], [h.x - 0.05, y - g1 - 0.16]])
    fill(ctx, tile)
    ink(g, line, 1.6)
    const ry = top
    poly(ctx, [[h.x - 0.3, ry + 0.04], [h.x + h.w + 0.3, ry + 0.04], [h.x + h.w - 0.15, ry - 0.42], [h.x + 0.15, ry - 0.42]])
    fill(ctx, tile)
    ink(g, line, 1.6)
    // The eaves' ends turn up a little.
    for (const [ex, d] of [[h.x - 0.3, -1], [h.x + h.w + 0.3, 1]] as const) {
      poly(ctx, [[ex, ry + 0.04], [ex + d * 0.06, ry - 0.06], [ex - d * 0.2, ry - 0.02]])
      fill(ctx, tile)
    }
    // Posts at the corners.
    box(ctx, h.x, y - g1, 0.07, g1, lit('#2E2018', L.ambient))
    box(ctx, h.x + h.w - 0.07, y - g1, 0.07, g1, lit('#2E2018', L.ambient))
  }
  // The lanterns, and the pools they lay on the street.
  LAMPS.forEach((x, i) => {
    if (x < v.x0 - 1 || x > v.x1 + 1) return
    const on = smooth(g.t, lampAt[i], lampAt[i] + 0.5)
    const yy = STREET.y - 0.85 + 0.2
    pool(ctx, x, STREET.y + 0.02, 0.9, '#F6C27A', 0.4 * on * Math.max(0.4, L.night), 0.13)
    const swing = 0.015 * sway(g.t, 0.4, i)
    poly(ctx, [[x, yy - 0.2], [x + swing, yy - 0.14]], false)
    ink(g, line, 1.2)
    ellipse(ctx, x + swing, yy, 0.11, 0.15)
    fill(ctx, mix(lit(LAMP_RED, L.ambient), LAMP_LIT, on))
    // Its red ribs, dark caps.
    ellipse(ctx, x + swing, yy, 0.05, 0.15)
    fill(ctx, rgba(mix(LAMP_RED, '#E06A3A', on), 0.6 + 0.2 * on))
    box(ctx, x + swing - 0.06, yy - 0.17, 0.12, 0.04, lit('#2A1A14', L.ambient))
    box(ctx, x + swing - 0.06, yy + 0.13, 0.12, 0.04, lit('#2A1A14', L.ambient))
  })
}

/** The town's far side: roofs of the streets behind, a step back and paler, so the street is not a wall on the sky. */
export function drawTownBack(g: Paint, L: Light): void {
  const { ctx, view: v } = g
  const far = lit(mix('#5E6B6A', L.haze, 0.45), L.ambient)
  const wall = lit(mix('#B9A07E', L.haze, 0.45), L.ambient)
  for (let i = 0; i < 9; i++) {
    const x = 24.6 + i * 2.05 + hash(i, 61) * 0.6
    if (x > v.x1 + 1 || x + 2 < v.x0 - 1) continue
    const w = 1.6 + hash(i, 62) * 0.8
    const top = STREET.y - 2.0 - hash(i, 63) * 0.9
    box(ctx, x, top, w, STREET.y - top, wall)
    poly(ctx, [[x - 0.2, top + 0.02], [x + w + 0.2, top + 0.02], [x + w - 0.2, top - 0.35], [x + 0.2, top - 0.35]])
    fill(ctx, far)
    // A window lit in some, as the evening comes.
    if (hash(i, 64) > 0.4) {
      box(ctx, x + w * 0.35, top + 0.3, w * 0.3, 0.22, mix(lit('#6A5A48', L.ambient), '#EDB873', smooth(L.lamps, 0.3, 1) * 0.7))
    }
  }
}
