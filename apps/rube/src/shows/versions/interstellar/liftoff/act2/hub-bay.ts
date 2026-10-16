import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, type Ctx } from '../kit'
import { DUST } from '../worlds'

/**
 * The docking bay behind the Ranger: not a wall but a hall going away down the axis. Its ribs crowd together toward the
 * far bulkhead, a collar part way down turns with the station's spin, a rail along its wall brings cargo pods up out of
 * the depth one after another, and in a cradle further down lies a second ship, a work arm going over it. All of it in
 * the hub's cold light and kept low in contrast, behind the ship and the ball.
 *
 * Drawn in the hub's frame (the station's axis at 0, 0), inside the collar, `ring` cells round.
 */

const TAU = Math.PI * 2
/** The far bulkhead's scale. */
const FAR = 0.36
/** The ribs: equal steps of depth, so they crowd toward the far end. */
const RIBS = [1, 2, 3, 4, 5].map((i) => 1 / (1 + i * 0.36))
const WALL = '#C5CBCD'
const WALL_FAR = '#DCE1E2'
/** The pods' rail, and where the second ship lies. */
const RAIL_A = Math.PI + 0.42
const BERTH_A = 2.3
const BERTH_S = 0.52
const PODS = [DUST.corn, DUST.rust, DUST.teal, DUST.bone]

export function drawBayDepth(p: p5, c: Ctx, T: number, ring: number): void {
  const { k, ink } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const line = (a: number) => alpha(p, ink, a).toString()
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, X(ring), 0, TAU)
  ctx.clip()
  // The hall's wall, paler as it goes: band by band from the collar in.
  const radii = [1, ...RIBS, FAR].map((s) => ring * s)
  for (let i = 0; i < radii.length - 1; i++) {
    ctx.fillStyle = mixHex(WALL, WALL_FAR, i / (radii.length - 2))
    ctx.beginPath()
    ctx.arc(0, 0, X(radii[i]), 0, TAU)
    ctx.arc(0, 0, X(radii[i + 1]), TAU, 0, true)
    ctx.fill()
  }
  // The longerons, from the collar to the far bulkhead, and the ribs across them.
  ctx.strokeStyle = line(0.22)
  ctx.lineWidth = Math.max(0.7, k * 0.011)
  ctx.beginPath()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.13
    ctx.moveTo(X(Math.cos(a) * ring), X(Math.sin(a) * ring))
    ctx.lineTo(X(Math.cos(a) * ring * FAR), X(Math.sin(a) * ring * FAR))
  }
  for (const s of RIBS) {
    ctx.moveTo(X(ring * s), 0)
    ctx.arc(0, 0, X(ring * s), 0, TAU)
  }
  ctx.stroke()
  // A collar part way down, turning with the spin: its teeth go round.
  {
    const r = ring * RIBS[1]
    ctx.strokeStyle = line(0.38)
    ctx.lineWidth = Math.max(1, X(0.05))
    ctx.beginPath()
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + T * 0.16
      ctx.moveTo(X(Math.cos(a) * r), X(Math.sin(a) * r))
      ctx.lineTo(X(Math.cos(a) * (r - 0.09)), X(Math.sin(a) * (r - 0.09)))
    }
    ctx.stroke()
  }
  // Work lamps on the ribs: steady slits.
  ctx.fillStyle = mixHex(DUST.light, '#FFFFFF', 0.4)
  ctx.strokeStyle = line(0.35)
  ctx.lineWidth = Math.max(0.6, k * 0.009)
  for (let i = 0; i < RIBS.length; i++) {
    const s = RIBS[i]
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * TAU + 0.8 + i * 0.4
      ctx.save()
      ctx.translate(X(Math.cos(a) * ring * s), X(Math.sin(a) * ring * s))
      ctx.rotate(a)
      ctx.beginPath()
      ctx.rect(X(-0.03 * s), X(-0.1 * s), X(0.06 * s), X(0.2 * s))
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }
  // The far bulkhead: a shut hatch, its seam, and the rim round it.
  ctx.fillStyle = WALL_FAR
  ctx.strokeStyle = line(0.4)
  ctx.lineWidth = Math.max(0.8, k * 0.012)
  ctx.beginPath()
  ctx.arc(0, 0, X(ring * FAR), 0, TAU)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, X(ring * FAR * 0.66), 0, TAU)
  ctx.moveTo(X(-ring * FAR * 0.66), 0)
  ctx.lineTo(X(ring * FAR * 0.66), 0)
  ctx.stroke()

  // The rail along the wall, and the pods coming up it out of the depth, nearer and bigger, one every few seconds.
  const ca = Math.cos(RAIL_A)
  const sa = Math.sin(RAIL_A)
  const nx = -sa
  const ny = ca
  ctx.strokeStyle = line(0.45)
  ctx.lineWidth = Math.max(1, X(0.035))
  ctx.beginPath()
  for (const side of [-0.13, 0.13]) {
    ctx.moveTo(X(ca * ring + nx * side), X(sa * ring + ny * side))
    ctx.lineTo(X(ca * ring * FAR + nx * side * FAR), X(sa * ring * FAR + ny * side * FAR))
  }
  ctx.stroke()
  for (let i = 0; i < 3; i++) {
    const d = (((T * 0.075 + i / 3) % 1) + 1) % 1
    const s = FAR + (0.97 - FAR) * d ** 1.6
    const fade = Math.min(1, d / 0.12) * Math.min(1, (1 - d) / 0.08)
    if (fade <= 0) continue
    const r = ring * s * 0.97
    ctx.save()
    ctx.translate(X(ca * r), X(sa * r))
    ctx.rotate(RAIL_A)
    ctx.globalAlpha = fade
    ctx.fillStyle = mixHex(PODS[(i + Math.floor(T * 0.075 + i / 3)) % PODS.length], WALL_FAR, 0.35 * (1 - d))
    ctx.strokeStyle = line(0.55)
    ctx.lineWidth = Math.max(0.7, k * 0.012)
    ctx.beginPath()
    ctx.rect(X(-0.32 * s), X(-0.2 * s), X(0.64 * s), X(0.4 * s))
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(X(-0.1 * s), X(-0.2 * s))
    ctx.lineTo(X(-0.1 * s), X(0.2 * s))
    ctx.moveTo(X(0.1 * s), X(-0.2 * s))
    ctx.lineTo(X(0.1 * s), X(0.2 * s))
    ctx.stroke()
    ctx.restore()
  }

  // The second ship in its berth further down, nosed in, and the work arm going over it.
  {
    const s = BERTH_S
    const r = ring * s * 0.8
    const bx = Math.cos(BERTH_A) * r
    const by = Math.sin(BERTH_A) * r
    ctx.save()
    ctx.translate(X(bx), X(by))
    ctx.scale(s, s)
    const hull = mixHex(DUST.bone, WALL_FAR, 0.3)
    ctx.strokeStyle = line(0.5)
    ctx.lineWidth = Math.max(0.8, k * 0.02)
    ctx.lineJoin = 'round'
    // Its cradle.
    ctx.fillStyle = mixHex(DUST.denim, WALL_FAR, 0.45)
    ctx.beginPath()
    ctx.rect(X(-0.9), X(0.32), X(1.8), X(0.12))
    ctx.fill()
    ctx.stroke()
    // The hull, the wing under it, the canopy.
    ctx.fillStyle = mixHex(DUST.tin, WALL_FAR, 0.3)
    ctx.beginPath()
    ctx.moveTo(X(0.2), X(0.18))
    ctx.lineTo(X(-1.1), X(0.36))
    ctx.lineTo(X(-1.3), X(0.36))
    ctx.lineTo(X(-1.1), X(0.18))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = hull
    ctx.beginPath()
    ctx.moveTo(X(1.2), X(0.12))
    ctx.lineTo(X(0.5), X(-0.04))
    ctx.lineTo(X(-1.2), X(-0.06))
    ctx.lineTo(X(-1.26), X(0.24))
    ctx.lineTo(X(0.6), X(0.26))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = mixHex(DUST.sky, DUST.denim, 0.4)
    ctx.beginPath()
    ctx.moveTo(X(0.45), X(-0.03))
    ctx.quadraticCurveTo(X(0.2), X(-0.3), X(-0.15), X(-0.04))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // The arm: from the wall, two links, its head going slowly along the hull and back.
    const go = Math.sin(T * 0.45)
    const head: [number, number] = [-0.3 + 0.55 * go, -0.42]
    const base: [number, number] = [-0.2, -1.5]
    const mid: [number, number] = [(head[0] + base[0]) / 2 - 0.4, (head[1] + base[1]) / 2]
    ctx.strokeStyle = alpha(p, mixHex(DUST.corn, WALL_FAR, 0.2), 1).toString()
    ctx.lineWidth = X(0.08)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(X(base[0]), X(base[1]))
    ctx.lineTo(X(mid[0]), X(mid[1]))
    ctx.lineTo(X(head[0]), X(head[1]))
    ctx.stroke()
    ctx.strokeStyle = line(0.5)
    ctx.lineWidth = Math.max(0.8, k * 0.02)
    ctx.beginPath()
    ctx.moveTo(X(head[0] - 0.1), X(head[1] + 0.1))
    ctx.lineTo(X(head[0]), X(head[1]))
    ctx.lineTo(X(head[0] + 0.1), X(head[1] + 0.1))
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}
