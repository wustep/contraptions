import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { DUST } from '../worlds'
import { RIM_R } from './station'

/**
 * Inside Cooper Station, end-on: the air, the ring of land all the way
 * round with its fields and trees and houses standing in toward the axis,
 * the hull under the land, the spokes, the lit spindle at the axis. Drawn
 * behind Act II's station parts, in world cells.
 *
 * The station's light is the farm's light, a little cooler: this is a
 * farm, rebuilt in the sky.
 */
export interface InteriorState {
  /** The axis, in world cells. */
  axis: Pt
  /** Show time the lights come up (the organ's accent). */
  lights: number
}

const SOIL = 0.55
const HULL = 0.5
const SPOKES = [Math.PI * 1.18, Math.PI * 1.18 + (Math.PI * 2) / 3, Math.PI * 1.18 - (Math.PI * 2) / 3]

export const interior = scenery<InteriorState>({
  name: 'interior',
  draw: (p: p5, s, c) => {
    const { k, t, ink, weight } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const [ax, ay] = s.axis
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const lit = smooth(t, s.lights - 0.1, s.lights + 0.6)

    // Beyond the hull: the dark, with a few stars.
    p.noStroke()
    p.fill('#0B0F1D')
    p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
    for (let i = 0; i < 60; i++) {
      const a = hash(i, 1) * Math.PI * 2
      const r = RIM_R + HULL + SOIL + 1 + hash(i, 2) * 14
      p.fill(alpha(p, '#F4EEDF', 0.35 + 0.4 * hash(i, 3)))
      p.circle(X(ax + Math.cos(a) * r), X(ay + Math.sin(a) * r), 1.6)
    }

    // The air inside: brightest round the spindle, a warm haze down by the land.
    const air = ctx.createRadialGradient(X(ax), X(ay), X(0.5), X(ax), X(ay), X(RIM_R))
    air.addColorStop(0, mixHex('#3B4660', '#F7F4EA', lit))
    air.addColorStop(0.55, mixHex('#2E3850', '#E4E8E2', lit))
    air.addColorStop(1, mixHex('#2A2E3E', '#EADFC4', lit))
    ctx.fillStyle = air
    ctx.beginPath()
    ctx.arc(X(ax), X(ay), X(RIM_R), 0, Math.PI * 2)
    ctx.fill()

    // The spokes, from the hub out to the land: pale tubes seen through the air, so up close they read as a structure
    // going up out of the frame, not a stray line.
    for (const a of SPOKES) {
      const pts: Pt[] = []
      for (const [side, r] of [[-0.18, 1.1], [-0.18, RIM_R - 0.05], [0.18, RIM_R - 0.05], [0.18, 1.1]] as Pt[]) {
        pts.push([ax - Math.sin(a) * side + Math.cos(a) * r, ay + Math.cos(a) * side + Math.sin(a) * r])
      }
      p.noStroke()
      p.fill(alpha(p, mixHex(DUST.bone, ink, 0.12), 0.28 * lit + 0.12))
      p.beginShape()
      for (const [x, y] of pts) p.vertex(X(x), X(y))
      p.endShape(p.CLOSE)
      p.stroke(alpha(p, ink, 0.22))
      p.strokeWeight(Math.max(1, weight * 0.6))
      p.line(X(pts[0][0]), X(pts[0][1]), X(pts[1][0]), X(pts[1][1]))
      p.line(X(pts[2][0]), X(pts[2][1]), X(pts[3][0]), X(pts[3][1]))
    }

    // The land: soil, then hull, all the way round.
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight)
    p.fill(DUST.husk)
    ctx.beginPath()
    ctx.arc(X(ax), X(ay), X(RIM_R + SOIL), 0, Math.PI * 2)
    ctx.arc(X(ax), X(ay), X(RIM_R), Math.PI * 2, 0, true)
    ctx.closePath()
    ctx.fillStyle = DUST.husk
    ctx.fill()
    ctx.fillStyle = '#3A4257'
    ctx.beginPath()
    ctx.arc(X(ax), X(ay), X(RIM_R + SOIL + HULL), 0, Math.PI * 2)
    ctx.arc(X(ax), X(ay), X(RIM_R + SOIL), Math.PI * 2, 0, true)
    ctx.closePath()
    ctx.fill()
    p.noFill()
    p.circle(X(ax), X(ay), X(2 * RIM_R))
    p.circle(X(ax), X(ay), X(2 * (RIM_R + SOIL + HULL)))

    // What grows and stands on the land, all round: rows of corn, trees, small houses. Far away, so small and
    // plain; nothing within a few cells of the replica house at the bottom, which is drawn by the parts.
    const dot = (a: number, h: number): Pt => [ax + (RIM_R - h) * Math.cos(a), ay + (RIM_R - h) * Math.sin(a)]
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + hash(i, 5) * 0.03
      // Leave to the parts the bottom (the replica), the stretch round to the ballpark, and the far-side house.
      if (a < Math.PI * 0.82 || a > Math.PI * 1.86 || Math.abs(a - Math.PI * 1.18) < Math.PI * 0.09) continue
      const kind = hash(i, 7)
      p.push()
      const [gx, gy] = dot(a, 0)
      p.translate(X(gx), X(gy))
      p.rotate(a - Math.PI / 2)
      p.stroke(ink)
      p.strokeWeight(Math.max(0.8, weight * 0.6))
      if (kind < 0.45) {
        // A row of corn.
        p.fill(DUST.sage)
        p.rect(0, X(-0.18), X(0.9), X(0.36), X(0.08))
      } else if (kind < 0.75) {
        // A tree.
        p.line(0, 0, 0, X(-0.3))
        p.fill(DUST.leaf)
        p.circle(0, X(-0.45), X(0.36))
      } else {
        // A small house, gable in to the axis.
        p.fill(DUST.bone)
        p.rect(0, X(-0.2), X(0.5), X(0.4))
        p.fill(DUST.rust)
        p.triangle(X(-0.3), X(-0.4), 0, X(-0.66), X(0.3), X(-0.4))
      }
      p.pop()
    }

    // The spindle at the axis: the station's light, lit when the lights come up.
    const glow = ctx.createRadialGradient(X(ax), X(ay), 0, X(ax), X(ay), X(3))
    glow.addColorStop(0, `rgba(255, 246, 214, ${0.8 * lit})`)
    glow.addColorStop(1, 'rgba(255, 246, 214, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(X(ax - 3), X(ay - 3), X(6), X(6))
    p.stroke(ink)
    p.strokeWeight(weight)
    p.fill(lit > 0.5 ? DUST.light : '#8A8578')
    p.circle(X(ax), X(ay), X(1.1))
    p.noFill()
    p.circle(X(ax), X(ay), X(0.6))
  },
})
