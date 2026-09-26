import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { DOJO, EYE_PUPIL, EYE_WHITE, HIBACHI, HOME, HOTDOG, ROCKS, STAR, VOID } from '../worlds'

/**
 * The small things from every world that Jobu put on the bagel: the ones crusted into it, and the ones it draws in
 * and swallows (and gives back, at the peak). Each is one clear silhouette in its own world's colours, drawn side-on
 * in the show's one ink, so it reads at a glance even small and turning.
 */
export type Thing =
  | 'sock'
  | 'receipt'
  | 'coin'
  | 'report'
  | 'flashbulb'
  | 'trophy'
  | 'fan'
  | 'hotdog'
  | 'spatula'
  | 'shrimp'
  | 'onion'
  | 'tail'
  | 'pebble'
  | 'dog'
  | 'pack'
  | 'eye'
  | 'hanger'
  | 'chopsticks'
  | 'shoe'
  | 'mustard'
  | 'shard'

/** What world each thing is from (for whoever wants to say so). */
export const THING_WORLD: Record<Thing, string> = {
  sock: 'laundromat',
  receipt: 'laundromat',
  coin: 'laundromat',
  report: 'laundromat',
  flashbulb: 'premiere',
  trophy: 'premiere',
  fan: 'dojo',
  hotdog: 'hotdog',
  spatula: 'hibachi',
  shrimp: 'hibachi',
  onion: 'hibachi',
  tail: 'hibachi',
  pebble: 'rocks',
  dog: 'everywhere',
  pack: 'laundromat',
  eye: 'laundromat',
  hanger: 'laundromat',
  chopsticks: 'hibachi',
  shoe: 'dojo',
  mustard: 'hotdog',
  shard: 'rocks',
}

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/**
 * One thing, centred at (x, y) cells from the current origin, `size` cells across its longest way, turned `angle`
 * radians. `dark` (0..1) sinks it toward the bagel's black: unlit, or going down the hole. `variant` picks a colour
 * where a thing has more than one (a sock).
 */
export function drawThing(p: p5, k: number, ink: string, weight: number, thing: Thing, x: number, y: number, size: number, angle: number, dark = 0, variant = 0): void {
  if (size <= 0.004) return
  const u = size * k
  const f = (hex: string) => mixHex(hex, VOID.bagel, Math.max(0, Math.min(1, dark)))
  const inkA = rgba(ink, 1 - Math.min(1, dark * 1.1))
  const w = Math.max(0.5, weight * Math.min(1, size / 0.55) * 0.75)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  // The things are drawn from their corners (the stage leaves rects centred); the pop puts it back.
  p.rectMode(p.CORNER)
  p.translate(x * k, y * k)
  p.rotate(angle)
  p.stroke(inkA)
  p.strokeWeight(w)
  p.strokeJoin(p.ROUND)
  const X = (v: number) => v * u
  switch (thing) {
    case 'sock': {
      const body = [HOME.rose, HOME.denim, HOME.butter][variant % 3]
      const cuff = [HOME.enamel, HOME.butter, HOME.denim][variant % 3]
      p.fill(f(body))
      p.beginShape()
      p.vertex(X(-0.3), X(-0.5))
      p.vertex(X(-0.02), X(-0.5))
      p.vertex(X(-0.02), X(0.02))
      p.bezierVertex(X(0.08), X(0.04), X(0.3), X(0.0), X(0.42), X(0.08))
      p.bezierVertex(X(0.52), X(0.14), X(0.5), X(0.32), X(0.36), X(0.32))
      p.vertex(X(-0.16), X(0.32))
      p.bezierVertex(X(-0.3), X(0.32), X(-0.34), X(0.2), X(-0.3), X(0.08))
      p.endShape(p.CLOSE)
      p.fill(f(cuff))
      p.rect(X(-0.16), X(-0.43), X(0.28), X(0.14))
      // The heel and the toe, darned.
      p.noStroke()
      p.fill(f(cuff))
      p.arc(X(-0.16), X(0.2), X(0.24), X(0.24), Math.PI / 2, Math.PI)
      p.arc(X(0.36), X(0.2), X(0.24), X(0.24), -Math.PI / 2, Math.PI / 2)
      break
    }
    case 'receipt': {
      p.fill(f(HOME.paper))
      p.beginShape()
      p.vertex(X(-0.2), X(-0.5))
      p.vertex(X(0.2), X(-0.5))
      p.vertex(X(0.2), X(0.42))
      const teeth = 5
      for (let i = 0; i < teeth; i++) {
        const x0 = 0.2 - (0.4 * (i + 0.5)) / teeth
        const x1 = 0.2 - (0.4 * (i + 1)) / teeth
        p.vertex(X(x0), X(0.5))
        p.vertex(X(x1), X(0.42))
      }
      p.endShape(p.CLOSE)
      p.stroke(rgba(ink, (1 - dark) * 0.55))
      p.strokeWeight(w * 0.7)
      for (const [y, a, b] of [[-0.36, -0.12, 0.1], [-0.24, -0.12, 0.04], [-0.12, -0.12, 0.12], [0.0, -0.12, 0.06], [0.2, -0.12, 0.12]] as const) p.line(X(a), X(y), X(b), X(y))
      p.strokeWeight(w * 1.1)
      p.line(X(0.02), X(0.29), X(0.13), X(0.29))
      break
    }
    case 'coin': {
      p.fill(f(HOME.gold))
      p.circle(0, 0, X(1))
      p.noFill()
      p.stroke(rgba(ink, (1 - dark) * 0.6))
      p.strokeWeight(w * 0.7)
      p.circle(0, 0, X(0.66))
      p.noStroke()
      p.fill(rgba(HOME.light, (1 - dark) * 0.7))
      p.arc(0, 0, X(0.8), X(0.8), Math.PI * 1.1, Math.PI * 1.45)
      break
    }
    case 'report': {
      p.fill(f(HOME.paper))
      p.rect(X(-0.5), X(-0.36), X(1), X(0.72), X(0.03))
      p.stroke(rgba(ink, (1 - dark) * 0.5))
      p.strokeWeight(w * 0.7)
      for (let i = 0; i < 4; i++) {
        const y = -0.18 + i * 0.12
        p.line(X(-0.38), X(y), X(0.12), X(y))
      }
      p.line(X(0.22), X(-0.24), X(0.22), X(0.22))
      // A gold star in the corner.
      p.stroke(inkA)
      p.strokeWeight(w * 0.8)
      p.fill(f(STAR.gold))
      p.beginShape()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.07 : 0.16
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        p.vertex(X(0.36 + r * Math.cos(a)), X(0.12 + r * Math.sin(a)))
      }
      p.endShape(p.CLOSE)
      break
    }
    case 'flashbulb': {
      // An old press flashbulb: the glass bulb, the wire in it, the brass screw base. Lying on its side.
      p.fill(f(STAR.brass))
      p.rect(X(-0.5), X(-0.13), X(0.3), X(0.26), X(0.04))
      p.stroke(rgba(ink, (1 - dark) * 0.6))
      p.strokeWeight(w * 0.7)
      for (const x of [-0.42, -0.34, -0.26]) p.line(X(x), X(-0.13), X(x + 0.04), X(0.13))
      p.stroke(inkA)
      p.strokeWeight(w)
      p.fill(f(STAR.flash))
      p.beginShape()
      p.vertex(X(-0.2), X(-0.11))
      p.bezierVertex(X(-0.05), X(-0.13), X(0.02), X(-0.34), X(0.24), X(-0.34))
      p.bezierVertex(X(0.44), X(-0.34), X(0.52), X(-0.16), X(0.52), X(0))
      p.bezierVertex(X(0.52), X(0.16), X(0.44), X(0.34), X(0.24), X(0.34))
      p.bezierVertex(X(0.02), X(0.34), X(-0.05), X(0.13), X(-0.2), X(0.11))
      p.endShape(p.CLOSE)
      p.noFill()
      p.stroke(rgba(STAR.brass, 1 - dark))
      p.strokeWeight(w * 0.8)
      p.beginShape()
      p.vertex(X(-0.18), X(-0.05))
      p.vertex(X(0.12), X(-0.08))
      p.vertex(X(0.2), X(0.0))
      p.vertex(X(0.12), X(0.08))
      p.vertex(X(-0.18), X(0.05))
      p.endShape()
      p.noStroke()
      p.fill(rgba(STAR.spot, (1 - dark) * 0.9))
      p.ellipse(X(0.3), X(-0.2), X(0.12), X(0.07))
      break
    }
    case 'trophy': {
      p.fill(f(STAR.brass))
      p.rect(X(-0.26), X(0.36), X(0.52), X(0.14), X(0.02))
      p.rect(X(-0.06), X(0.12), X(0.12), X(0.24))
      p.fill(f(STAR.gold))
      // Handles first, then the cup over them.
      p.noFill()
      p.strokeWeight(w * 1.6)
      p.stroke(inkA)
      p.arc(X(-0.3), X(-0.24), X(0.26), X(0.3), Math.PI * 0.5, Math.PI * 1.5)
      p.arc(X(0.3), X(-0.24), X(0.26), X(0.3), -Math.PI * 0.5, Math.PI * 0.5)
      p.strokeWeight(w * 0.8)
      p.stroke(f(STAR.gold))
      p.arc(X(-0.3), X(-0.24), X(0.26), X(0.3), Math.PI * 0.5, Math.PI * 1.5)
      p.arc(X(0.3), X(-0.24), X(0.26), X(0.3), -Math.PI * 0.5, Math.PI * 0.5)
      p.stroke(inkA)
      p.strokeWeight(w)
      p.fill(f(STAR.gold))
      p.beginShape()
      p.vertex(X(-0.32), X(-0.46))
      p.vertex(X(0.32), X(-0.46))
      p.bezierVertex(X(0.32), X(-0.05), X(0.14), X(0.12), X(0), X(0.12))
      p.bezierVertex(X(-0.14), X(0.12), X(-0.32), X(-0.05), X(-0.32), X(-0.46))
      p.endShape(p.CLOSE)
      p.noStroke()
      p.fill(rgba(STAR.spot, (1 - dark) * 0.75))
      p.rect(X(-0.22), X(-0.4), X(0.07), X(0.3), X(0.03))
      break
    }
    case 'fan': {
      // A folding fan from the kung fu picture: paper on wooden ribs, open.
      const a0 = -Math.PI * 0.86
      const a1 = -Math.PI * 0.14
      const cy = 0.3
      p.fill(f(DOJO.screen))
      p.beginShape()
      p.vertex(0, X(cy))
      for (let i = 0; i <= 12; i++) {
        const a = a0 + ((a1 - a0) * i) / 12
        p.vertex(X(0.62 * Math.cos(a)), X(cy + 0.62 * Math.sin(a)))
      }
      p.endShape(p.CLOSE)
      p.noStroke()
      p.fill(f(DOJO.lacquer))
      p.beginShape()
      for (let i = 0; i <= 12; i++) {
        const a = a0 + ((a1 - a0) * i) / 12
        p.vertex(X(0.62 * Math.cos(a)), X(cy + 0.62 * Math.sin(a)))
      }
      for (let i = 12; i >= 0; i--) {
        const a = a0 + ((a1 - a0) * i) / 12
        p.vertex(X(0.5 * Math.cos(a)), X(cy + 0.5 * Math.sin(a)))
      }
      p.endShape(p.CLOSE)
      p.stroke(rgba(DOJO.woodDeep, 1 - dark))
      p.strokeWeight(w * 0.7)
      for (let i = 1; i < 8; i++) {
        const a = a0 + ((a1 - a0) * i) / 8
        p.line(0, X(cy), X(0.5 * Math.cos(a)), X(cy + 0.5 * Math.sin(a)))
      }
      p.stroke(inkA)
      p.strokeWeight(w)
      p.fill(f(DOJO.wood))
      p.circle(0, X(cy), X(0.08))
      break
    }
    case 'hotdog': {
      p.fill(f(HOTDOG.sausage))
      p.rect(X(-0.5), X(-0.11), X(1), X(0.2), X(0.1))
      p.fill(f(HOTDOG.bun))
      p.beginShape()
      p.vertex(X(-0.4), X(0.0))
      p.bezierVertex(X(-0.42), X(0.24), X(-0.3), X(0.24), X(-0.2), X(0.24))
      p.vertex(X(0.2), X(0.24))
      p.bezierVertex(X(0.3), X(0.24), X(0.42), X(0.24), X(0.4), X(0.0))
      p.endShape(p.CLOSE)
      p.noFill()
      p.stroke(rgba(HOTDOG.mustard, 1 - dark))
      p.strokeWeight(Math.max(1, X(0.045)))
      p.beginShape()
      for (let i = 0; i <= 9; i++) p.vertex(X(-0.34 + i * 0.075), X(-0.02 + (i % 2 ? -0.04 : 0.02)))
      p.endShape()
      break
    }
    case 'spatula': {
      p.fill(f(HIBACHI.soy))
      p.rect(X(-0.5), X(-0.05), X(0.42), X(0.1), X(0.05))
      p.fill(f(HIBACHI.steelDeep))
      p.rect(X(-0.1), X(-0.03), X(0.2), X(0.06))
      p.fill(f(HIBACHI.steel))
      p.beginShape()
      p.vertex(X(0.08), X(-0.06))
      p.vertex(X(0.5), X(-0.2))
      p.vertex(X(0.5), X(0.2))
      p.vertex(X(0.08), X(0.06))
      p.endShape(p.CLOSE)
      p.stroke(rgba(ink, (1 - dark) * 0.55))
      p.strokeWeight(w * 0.7)
      for (const y of [-0.08, 0, 0.08]) p.line(X(0.24), X(y * 0.8), X(0.44), X(y))
      break
    }
    case 'shrimp': {
      // A tempura-less shrimp, curled: a thick arc drawn twice for its outline, the fan of its tail at the end.
      ctx.save()
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, X(0.02), X(0.3), Math.PI * 0.95, Math.PI * 2.25)
      ctx.strokeStyle = inkA
      ctx.lineWidth = X(0.26) + 2 * w
      ctx.stroke()
      ctx.strokeStyle = f(HIBACHI.shrimp)
      ctx.lineWidth = X(0.26)
      ctx.stroke()
      ctx.restore()
      p.stroke(rgba(ink, (1 - dark) * 0.45))
      p.strokeWeight(w * 0.7)
      for (let i = 1; i < 5; i++) {
        const a = Math.PI * 0.95 + (Math.PI * 1.3 * i) / 5
        p.line(X(0.19 * Math.cos(a)), X(0.02 + 0.19 * Math.sin(a)), X(0.41 * Math.cos(a)), X(0.02 + 0.41 * Math.sin(a)))
      }
      const ta = Math.PI * 2.25
      const tx = 0.3 * Math.cos(ta)
      const ty = 0.02 + 0.3 * Math.sin(ta)
      p.stroke(inkA)
      p.strokeWeight(w)
      p.fill(f(mixHex(HIBACHI.shrimp, HIBACHI.soy, 0.35)))
      p.triangle(X(tx), X(ty), X(tx - 0.2), X(ty + 0.2), X(tx + 0.06), X(ty + 0.26))
      break
    }
    case 'onion': {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(0, 0, X(0.4), X(0.36), 0, 0, Math.PI * 2)
      ctx.strokeStyle = inkA
      ctx.lineWidth = X(0.2) + 2 * w
      ctx.stroke()
      ctx.strokeStyle = f(HIBACHI.onion)
      ctx.lineWidth = X(0.2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, 0, X(0.4), X(0.36), 0, Math.PI * 1.1, Math.PI * 1.5)
      ctx.strokeStyle = rgba(HIBACHI.flameHot, (1 - dark) * 0.7)
      ctx.lineWidth = X(0.05)
      ctx.stroke()
      ctx.restore()
      break
    }
    case 'tail': {
      // Raccacoonie's tail: grey with its dark rings, the tip dark.
      const outline = () => {
        ctx.beginPath()
        ctx.moveTo(X(-0.5), X(0.02))
        ctx.bezierCurveTo(X(-0.4), X(-0.2), X(0.2), X(-0.26), X(0.46), X(-0.08))
        ctx.bezierCurveTo(X(0.54), X(0.0), X(0.5), X(0.1), X(0.4), X(0.12))
        ctx.bezierCurveTo(X(0.1), X(0.2), X(-0.36), X(0.2), X(-0.5), X(0.02))
        ctx.closePath()
      }
      ctx.save()
      outline()
      ctx.fillStyle = f(HIBACHI.raccoon)
      ctx.fill()
      ctx.clip()
      ctx.fillStyle = f(HIBACHI.raccoonDeep)
      for (const x of [-0.2, 0.05, 0.28]) ctx.fillRect(X(x), X(-0.4), X(0.1), X(0.8))
      ctx.fillRect(X(0.4), X(-0.4), X(0.2), X(0.8))
      ctx.restore()
      outline()
      ctx.strokeStyle = inkA
      ctx.lineWidth = w
      ctx.stroke()
      break
    }
    case 'pebble': {
      p.fill(f(ROCKS.stone))
      p.beginShape()
      const pts: [number, number][] = [[-0.5, 0.08], [-0.38, -0.24], [0.02, -0.34], [0.4, -0.22], [0.5, 0.06], [0.3, 0.3], [-0.2, 0.32]]
      for (const [a, b] of pts) p.curveVertex(X(a), X(b))
      for (const [a, b] of pts.slice(0, 3)) p.curveVertex(X(a), X(b))
      p.endShape()
      p.noStroke()
      p.fill(f(ROCKS.stoneDeep))
      p.ellipse(X(0.12), X(0.14), X(0.5), X(0.2))
      break
    }
    case 'dog': {
      // A little dog, side-on: every breed of dog, and this one.
      p.fill(f(DOJO.wood))
      // Legs, then the body over them.
      for (const lx of [-0.3, -0.18, 0.14, 0.26]) p.rect(X(lx - 0.04), X(0.0), X(0.08), X(0.3), X(0.03))
      p.beginShape()
      p.vertex(X(-0.4), X(-0.06))
      p.vertex(X(-0.52), X(-0.24))
      p.vertex(X(-0.36), X(-0.12))
      p.endShape(p.CLOSE)
      p.rect(X(-0.4), X(-0.14), X(0.74), X(0.24), X(0.12))
      // The head, the snout and the ear.
      p.ellipse(X(0.36), X(-0.2), X(0.3), X(0.26))
      p.ellipse(X(0.5), X(-0.15), X(0.18), X(0.12))
      p.fill(f(DOJO.woodDeep))
      p.beginShape()
      p.vertex(X(0.28), X(-0.3))
      p.bezierVertex(X(0.2), X(-0.2), X(0.22), X(-0.06), X(0.28), X(-0.06))
      p.bezierVertex(X(0.34), X(-0.1), X(0.36), X(-0.24), X(0.34), X(-0.3))
      p.endShape(p.CLOSE)
      p.noStroke()
      p.fill(rgba(ink, 1 - dark))
      p.circle(X(0.41), X(-0.24), X(0.045))
      p.circle(X(0.585), X(-0.16), X(0.05))
      break
    }
    case 'pack': {
      // Waymond's fanny pack: the pouch, its zip, the strap.
      p.noFill()
      p.strokeWeight(w * 1.5)
      p.bezier(X(-0.5), X(-0.1), X(-0.4), X(-0.34), X(0.4), X(-0.34), X(0.5), X(-0.1))
      p.strokeWeight(w)
      p.fill(f(HOME.denim))
      p.beginShape()
      p.vertex(X(-0.36), X(-0.12))
      p.vertex(X(0.36), X(-0.12))
      p.bezierVertex(X(0.42), X(0.1), X(0.3), X(0.28), X(0), X(0.28))
      p.bezierVertex(X(-0.3), X(0.28), X(-0.42), X(0.1), X(-0.36), X(-0.12))
      p.endShape(p.CLOSE)
      p.stroke(rgba(HOME.steel, 1 - dark))
      p.strokeWeight(w * 0.8)
      p.line(X(-0.28), X(-0.02), X(0.28), X(-0.02))
      p.stroke(inkA)
      p.fill(f(HOME.steel))
      p.rect(X(0.18), X(-0.04), X(0.06), X(0.1))
      break
    }
    case 'hanger': {
      // A wire coat hanger from the laundromat: the hook, the neck, the shoulders, the bar. Wire drawn twice, ink
      // under steel, so it keeps its line.
      const wire = () => {
        ctx.beginPath()
        ctx.arc(X(0.07), X(-0.36), X(0.08), Math.PI * 0.95, Math.PI * 2.55)
        ctx.moveTo(X(0.0), X(-0.26))
        ctx.lineTo(X(0.0), X(-0.18))
        ctx.lineTo(X(-0.5), X(0.2))
        ctx.lineTo(X(0.5), X(0.2))
        ctx.lineTo(X(0.0), X(-0.18))
      }
      ctx.save()
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      wire()
      ctx.strokeStyle = inkA
      ctx.lineWidth = X(0.05) + 2 * w
      ctx.stroke()
      wire()
      ctx.strokeStyle = f(HOME.steel)
      ctx.lineWidth = X(0.05)
      ctx.stroke()
      ctx.restore()
      break
    }
    case 'chopsticks': {
      // A pair, a little apart, tapering to their tips, lacquered at the top.
      for (const [dy, tilt] of [[-0.05, -0.05], [0.05, 0.04]] as const) {
        p.push()
        p.translate(0, X(dy))
        p.rotate(tilt)
        p.fill(f(DOJO.wood))
        p.quad(X(-0.5), X(-0.035), X(0.5), X(-0.012), X(0.5), X(0.012), X(-0.5), X(0.035))
        p.fill(f(DOJO.lacquer))
        p.quad(X(-0.5), X(-0.035), X(-0.28), X(-0.03), X(-0.28), X(0.03), X(-0.5), X(0.035))
        p.pop()
      }
      break
    }
    case 'shoe': {
      // A kung fu shoe from the picture: black cloth on a pale sole, side-on.
      p.fill(f(HOME.enamel))
      p.beginShape()
      p.vertex(X(-0.48), X(0.1))
      p.vertex(X(0.42), X(0.1))
      p.bezierVertex(X(0.52), X(0.1), X(0.52), X(0.22), X(0.42), X(0.22))
      p.vertex(X(-0.44), X(0.22))
      p.bezierVertex(X(-0.52), X(0.22), X(-0.52), X(0.1), X(-0.48), X(0.1))
      p.endShape(p.CLOSE)
      p.fill(f(DOJO.wash))
      p.beginShape()
      p.vertex(X(-0.46), X(0.1))
      p.vertex(X(-0.44), X(-0.2))
      p.bezierVertex(X(-0.3), X(-0.26), X(-0.16), X(-0.24), X(-0.08), X(-0.14))
      p.bezierVertex(X(0.1), X(-0.1), X(0.36), X(-0.08), X(0.46), X(0.1))
      p.endShape(p.CLOSE)
      p.stroke(rgba(DOJO.screen, (1 - dark) * 0.7))
      p.strokeWeight(w * 0.8)
      p.line(X(-0.1), X(-0.12), X(0.02), X(0.06))
      break
    }
    case 'mustard': {
      // The squeeze bottle from the hot dog world, on its side: body, label, cap and nozzle.
      p.fill(f(HOTDOG.mustard))
      p.rect(X(-0.46), X(-0.17), X(0.66), X(0.34), X(0.08))
      p.fill(f(HOTDOG.ivory))
      p.rect(X(-0.3), X(-0.1), X(0.3), X(0.2), X(0.02))
      p.fill(f(mixHex(HOTDOG.mustard, HIBACHI.soy, 0.35)))
      p.rect(X(0.2), X(-0.12), X(0.1), X(0.24), X(0.02))
      p.triangle(X(0.3), X(-0.07), X(0.5), X(-0.015), X(0.3), X(0.07))
      break
    }
    case 'shard': {
      // A chip of the canyon's rock: angular, flat-faced.
      p.fill(f(ROCKS.stone))
      p.beginShape()
      for (const [a, b] of [[-0.5, 0.1], [-0.2, -0.26], [0.18, -0.2], [0.5, -0.02], [0.24, 0.24], [-0.26, 0.2]] as const) p.vertex(X(a), X(b))
      p.endShape(p.CLOSE)
      p.fill(f(ROCKS.stoneDeep))
      p.beginShape()
      for (const [a, b] of [[0.18, -0.2], [0.5, -0.02], [0.24, 0.24], [0.06, 0.02]] as const) p.vertex(X(a), X(b))
      p.endShape(p.CLOSE)
      break
    }
    case 'eye': {
      p.fill(f(EYE_WHITE))
      p.circle(0, 0, X(1))
      p.noStroke()
      p.fill(f(EYE_PUPIL))
      p.circle(X(0.12), X(0.16), X(0.5))
      p.fill(rgba('#FFFFFF', (1 - dark) * 0.85))
      p.circle(X(0.04), X(0.08), X(0.14))
      break
    }
  }
  p.pop()
}
