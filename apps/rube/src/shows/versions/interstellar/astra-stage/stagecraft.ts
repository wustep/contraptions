import type p5 from 'p5'
import type { Pt } from '../../../../parts'

/** One construction system throughout: 8 cm card edges, painted faces, hard stage-left light. */
export const PAINT = {
  blue: '#263F78', night: '#17284E', shadow: '#302B36', coral: '#C76850',
  clay: '#AE493E', apricot: '#E9B67B', cream: '#EEE0C1', wood: '#D7986A', green: '#526D5B',
}

export function cut(p: p5, k: number, points: Pt[], face: string, depth = 0.08): void {
  p.push()
  p.noStroke()
  const shape = (dx: number, dy: number, color: string) => {
    p.fill(color)
    p.beginShape()
    for (const [x, y] of points) p.vertex((x + dx) * k, (y + dy) * k)
    p.endShape(p.CLOSE)
  }
  shape(depth * 1.8, depth * 2.5, PAINT.shadow)
  shape(depth, depth, PAINT.wood)
  shape(0, 0, face)
  p.pop()
}

export function board(p: p5, k: number, x: number, y: number, w: number, h: number, face: string, depth = 0.08): void {
  cut(p, k, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], face, depth)
}

/** A structural box, open through its center; all jambs have visible ply returns. */
export function boxSet(p: p5, k: number, x: number, y: number, w: number, h: number, face = PAINT.coral, thick = 0.22): void {
  board(p, k, x - thick, y - thick, thick, h + thick * 2, face)
  board(p, k, x + w, y - thick, thick, h + thick * 2, face)
  board(p, k, x, y - thick, w, thick, face)
  board(p, k, x, y + h, w, thick, face)
  for (const xx of [x - thick * 0.5, x + w + thick * 0.5]) {
    for (const yy of [y + thick, y + h - thick * 2]) {
      board(p, k, xx - thick * 0.3, yy, thick * 0.6, thick * 0.8, PAINT.cream, 0.02)
    }
  }
}

export function thread(p: p5, k: number, a: Pt, b: Pt): void {
  p.push()
  p.stroke(PAINT.apricot)
  p.strokeWeight(Math.max(0.6, k * 0.013))
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.pop()
}

export function treeFlat(p: p5, k: number, x: number, ground: number, h: number): void {
  board(p, k, x - 0.04, ground - h * 0.6, 0.08, h * 0.6, PAINT.wood, 0.02)
  cut(p, k, [[x, ground - h], [x + h * 0.25, ground - h * 0.62], [x + h * 0.14, ground - h * 0.62], [x + h * 0.32, ground - h * 0.27], [x - h * 0.29, ground - h * 0.27], [x - h * 0.16, ground - h * 0.6], [x - h * 0.25, ground - h * 0.6]], PAINT.green, 0.035)
}
