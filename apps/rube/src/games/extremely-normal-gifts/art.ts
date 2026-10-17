import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { over } from '../../parts'
import { GOLD, GREEN, INK, PAPER, RED } from './performance'
import type { Finale } from './recipe'

const shapes: Record<string, string> = {
  gift: '<path d="M6 12h20v16H6zM4 9h24v6H4zM16 9v19M16 9C2 9 9-2 16 9C30 9 23-2 16 9"/>',
  launch:
    '<path d="m10 22-4-6L21 5l5 7-16 10ZM5 23h19"/><circle cx="9" cy="26" r="3"/><circle cx="22" cy="26" r="3"/><path d="m25 3 2-2m1 7h3"/>',
  seesaw: '<path d="m4 16 25 8M16 21l-5 8h10z"/><circle cx="9" cy="11" r="4"/>',
  toaster:
    '<rect x="5" y="14" width="23" height="15" rx="3"/><path d="M10 17h12M5 21H2M16 3v6m-5-4 2 4m8-4-2 4"/><circle cx="23" cy="24" r="2"/>',
  snow: '<path d="M16 2v28M4 9l24 14M4 23 28 9M12 5l4 4 4-4M12 27l4-4 4 4M5 14l6-1-1-6M22 25l-1-6 6-1M5 18l6 1-1 6M22 7l-1 6 6 1"/>',
  paint: '<path d="M9 4h14v10H9zM16 14v9M4 28h24M8 23l-2 3m18-3 2 3M12 21v3m8-3v3"/>',
  apple: '<path d="M16 11c-10-7-16 8-7 16 4 4 5 0 7 0s4 4 8 0c9-8 3-23-8-16ZM16 11V4c4-4 8-1 8-1-1 5-5 6-8 5"/>',
  photo:
    '<rect x="6" y="3" width="20" height="27" rx="2"/><path d="M6 9h20M10 9v11l4-2 3 2 5-2V9M10 25h12"/><circle cx="16" cy="6" r=".5"/>',
  stamp: '<path d="M5 21h22v7H5zM10 17h12v4H10zM13 17V9C7 1 25 1 19 9v8M8 31h16"/>',
  bell: '<path d="M7 22C7 7 25 7 25 22M4 23h24M5 28h22M16 10V6m-3 0h6M16 1v2M3 9l3 3m23-3-3 3"/>',
  sound: '<path d="M5 12h5l7-6v22l-7-6H5zM22 11c4 4 4 9 0 13M26 7c6 6 6 16 0 21"/>',
  muted: '<path d="M5 12h5l7-6v22l-7-6H5zM23 13l7 9m0-9-7 9"/>',
  arrow: '<path d="M4 16h23m-8-8 8 8-8 8"/>',
  play: '<path d="m11 6 16 10-16 10z"/>',
  pause: '<path d="M11 7v18M22 7v18"/>',
  box: '<path d="m4 10 12-6 12 6v16l-12 5-12-5zM4 10l12 6 12-6M16 16v15M10 7l13 6v7"/>',
  check: '<path d="m6 16 7 7L27 8"/>',
}

export function icon(name: string, className = ''): string {
  return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 32 34" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[name] ?? shapes.gift}</svg>`
}

/** Flat ink parcel: the lid, ribbon and contents all share a single clock. */
export function drawParcel(p: p5, x: number, y: number, size: number, t: number, finale: Finale, hop: number): void {
  p.push()
  p.translate(x, y)
  const lift = over(t, 0.25, 0.9)
  const s = size
  // Each return leaves more forwarding slips. Escalation is visible without making the run longer.
  for (let i = Math.min(hop, 4); i > 0; i--) {
    p.push()
    p.translate(s * (0.22 + i * 0.09), s * (0.1 - i * 0.09))
    p.rotate(i * 0.09)
    solid(p, INK, 1.5, PAPER)
    p.rect(0, 0, s * 0.65, s * 0.72)
    p.noStroke()
    p.fill(GREEN)
    p.textFont('monospace')
    p.textSize(s * 0.055)
    p.textAlign(p.CENTER, p.CENTER)
    p.text('FORWARDED', 0, -s * 0.24)
    p.pop()
  }
  const nested = finale === 'boxes' ? 3 : 1
  for (let i = 0; i < nested; i++) {
    const k = s * (1 - i * 0.24)
    const open = over(t, 0.2 + i * 0.55, 0.7 + i * 0.55)
    const yy = -i * s * 0.11 * open
    solid(p, INK, 2.5, [GOLD, GREEN, RED][i])
    p.rect(0, yy + k * 0.15, k, k * 0.67, 3)
    outline(p, INK, 2.5)
    p.line(0, yy - k * 0.18, 0, yy + k * 0.48)
    p.push()
    p.translate(open * k * 0.27, yy - k * (0.22 + open * 0.7))
    p.rotate(open * 0.22)
    solid(p, INK, 2.5, [GOLD, GREEN, RED][i])
    p.rect(0, 0, k * 1.08, k * 0.15, 3)
    outline(p, INK, 2.5)
    p.bezier(0, -k * 0.08, -k * 0.57, -k * 0.5, -k * 0.5, k * 0.02, 0, -k * 0.08)
    p.bezier(0, -k * 0.08, k * 0.57, -k * 0.5, k * 0.5, k * 0.02, 0, -k * 0.08)
    p.pop()
    if (open < 1) break
  }
  if (t > 0.65 && finale !== 'boxes') {
    const f = over(t, 0.65, 1.2)
    p.push()
    p.translate(0, -s * (0.02 + f * 0.27))
    p.rotate(-0.07 * f)
    solid(p, INK, 2, PAPER)
    p.rect(0, 0, s * 0.64, s * 0.45)
    p.noStroke()
    p.fill(finale === 'approval' ? RED : INK)
    p.textFont('monospace')
    p.textSize(s * 0.08)
    p.textAlign(p.CENTER, p.CENTER)
    p.text(finale === 'approval' ? 'APPROVED' : 'ta-da.', 0, 0)
    p.pop()
    if (finale === 'fanfare' && lift > 0) {
      outline(p, INK, 2)
      for (const side of [-1, 1]) {
        p.push()
        p.translate(side * s * 0.69, 0)
        p.scale(side, 1)
        solid(p, INK, 2, RED)
        p.quad(0, -s * 0.05, s * 0.23, -s * 0.16, s * 0.23, s * 0.14, 0, s * 0.04)
        outline(p, INK, 2)
        for (let j = -1; j <= 1; j++) p.line(s * 0.32, j * s * 0.1, s * 0.4, j * s * 0.15)
        p.pop()
      }
    }
  }
  if (hop > 0) {
    solid(p, INK, 1.5, PAPER)
    p.rect(s * 0.22, s * 0.29, s * 0.32, s * 0.2)
    p.fill(INK)
    p.noStroke()
    p.textFont('monospace')
    p.textSize(s * 0.075)
    p.textAlign(p.CENTER, p.CENTER)
    p.text(`↩ ${hop}`, s * 0.22, s * 0.29)
  }
  p.pop()
}
