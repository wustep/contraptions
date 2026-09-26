import type { TitleCard } from './registry'

/**
 * The words over the stage, painted, for a video. Live, the page sets a
 * show's title cards as DOM over the frame (`main.ts`, `.stage-words` in
 * `styles.css`), and the canvas refuses type (`stage.ts`). A recording takes
 * the canvas and nothing else, so the file's frame has the same cards
 * painted into it: set on a surface of their own, never the show's canvas,
 * then laid over the picture like any other image.
 *
 * The layout is the stylesheet's, measured in the same hundredths of the
 * frame's height (`--u`). Keep the two together.
 */

const FACE = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
const INK = '#ECE5D3'
const GOLD = '#D9A441'
const GLOW = 'rgba(244, 238, 223, 0.28)'
/** The page's own line height, which the role and the notes inherit. */
const LEADING = 1.5

interface Face {
  size: number
  weight?: number
  italic?: boolean
  spacing?: number
}

function font(ctx: CanvasRenderingContext2D, f: Face): void {
  ctx.font = `${f.italic ? 'italic ' : ''}${f.weight ?? 400} ${f.size}px ${FACE}`
  ctx.letterSpacing = `${(f.spacing ?? 0) * f.size}px`
}

/** Where the baseline of a line of `f` falls in a line box `lead` tall, as CSS puts it: the leading split above and below. */
function baseline(ctx: CanvasRenderingContext2D, lead: number): number {
  const m = ctx.measureText('Hg')
  const up = m.fontBoundingBoxAscent
  const down = m.fontBoundingBoxDescent
  return (lead - (up + down)) / 2 + up
}

/** One line, centred on `cx`, its box's top at `y`. Returns the box's height. */
function line(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, f: Face, lead: number, color: string, glow: number): number {
  font(ctx, f)
  ctx.fillStyle = color
  ctx.shadowColor = glow ? GLOW : 'transparent'
  ctx.shadowBlur = glow
  ctx.textAlign = 'center'
  // CSS spaces after every letter, the last too, and centres the lot; so does this.
  ctx.fillText(text, cx, y + baseline(ctx, lead * f.size))
  return lead * f.size
}

/** One card, whole, at full light: its top middle at (cx, y). */
function card(ctx: CanvasRenderingContext2D, c: TitleCard, cx: number, y: number, u: number): void {
  const glow = u * 1.4
  if (c.role) {
    y += line(ctx, c.role.toUpperCase(), cx, y, { size: u * 1.9, weight: 600, spacing: 0.34 }, LEADING, GOLD, 0)
    y += u * 1.6
  }
  let after: 'name' | 'cast' | null = null
  for (const n of c.names) {
    if (typeof n === 'string') {
      const f = c.title ? { size: u * 7.4, weight: 500, spacing: 0.16 } : { size: u * 5.6, spacing: 0.01 }
      y += line(ctx, n, cx, y, f, 1.2, INK, glow)
      after = 'name'
      continue
    }
    // A line of a cast list: two equal columns about the middle, who on the left, what on the right, on one baseline.
    const who: Face = { size: u * 4.1 }
    const as: Face = { size: u * 4.1 * 0.62, italic: true }
    const gap = u * 1.6
    font(ctx, who)
    const base = y + baseline(ctx, 1.42 * who.size)
    ctx.textAlign = 'right'
    ctx.fillStyle = INK
    ctx.shadowColor = GLOW
    ctx.shadowBlur = glow
    ctx.fillText(n[0], cx - gap / 2, base)
    let x = cx + gap / 2
    if (n[2]) swatch(ctx, n[2], x, base, as.size, u)
    if (n[2]) x += as.size * (0.78 + 0.45)
    font(ctx, as)
    ctx.textAlign = 'left'
    ctx.fillStyle = GOLD
    ctx.shadowColor = 'transparent'
    ctx.fillText(n[1], x, base)
    y += 1.42 * who.size
    after = 'cast'
  }
  const notes = c.notes ?? []
  notes.forEach((text, i) => {
    const fine = i === notes.length - 1 && !c.title && notes.length > 2
    const f: Face = c.title ? { size: u * 2.1, spacing: 0.12 } : { size: u * (fine ? 1.65 : 1.95), italic: true }
    y += i === 0 && after === 'name' ? u * 1.6 : fine ? u * 1.4 : u * 0.9
    ctx.globalAlpha = fine ? 0.58 : 0.8
    y += line(ctx, text, cx, y, f, LEADING, INK, glow)
    ctx.globalAlpha = 1
  })
}

/** The ball they are: a disc with an ink ring and a little glow, or 'slab:' and a colour for a bar in its footprint. */
function swatch(ctx: CanvasRenderingContext2D, spec: string, x: number, base: number, em: number, u: number): void {
  const slab = spec.startsWith('slab:')
  const side = em * 0.78
  // CSS sits its bottom 0.08em under the baseline.
  const top = base + em * 0.08 - side
  const ring = u * 0.18
  const shape = (grow: number) => {
    ctx.beginPath()
    if (slab) ctx.roundRect(x - grow, top - grow, side + grow * 2, side + grow * 2, Math.max(0, em * 0.1 + grow))
    else ctx.arc(x + side / 2, top + side / 2, side / 2 + grow, 0, Math.PI * 2)
  }
  ctx.shadowColor = 'rgba(244, 238, 223, 0.25)'
  ctx.shadowBlur = u * 0.9
  ctx.fillStyle = 'rgba(236, 229, 211, 0.85)'
  shape(ring)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  // The stylesheet's plain `.swatch` also reaches it: a 2px border in the gold of its line, inside the disc.
  ctx.fillStyle = GOLD
  shape(0)
  ctx.fill()
  ctx.fillStyle = slab ? spec.slice(5) : spec
  shape(-2)
  ctx.fill()
}

/**
 * A painter of cards over a frame `w` × `h` (16:9, the whole of it). Each card
 * is set on the painter's own canvas and laid over `into` at its light, out
 * of focus as it comes and goes, as the page fades and blurs its DOM.
 */
export function wordPainter(w: number, h: number): (into: CanvasRenderingContext2D, cards: TitleCard[]) => void {
  const surface = document.createElement('canvas')
  surface.width = w
  surface.height = h
  const ctx = surface.getContext('2d')!
  const u = h / 100
  return (into, cards) => {
    for (const c of cards) {
      if (c.light <= 0) continue
      ctx.clearRect(0, 0, w, h)
      card(ctx, c, c.at[0] * w, (c.at[1] + (c.rise ?? 0) / 100) * h, u)
      into.save()
      into.setTransform(1, 0, 0, 1, 0, 0)
      into.globalAlpha = Math.min(1, c.light)
      into.globalCompositeOperation = 'source-over'
      into.filter = c.light > 0.995 ? 'none' : `blur(${((1 - c.light) * h * 0.012).toFixed(2)}px)`
      into.drawImage(surface, 0, 0)
      into.restore()
    }
  }
}
