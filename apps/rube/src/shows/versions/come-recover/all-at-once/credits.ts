import type p5 from 'p5'
import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { mixHex } from '../../../../parts'
import { PORT } from './home/finale-plan'
import { CREDITS_AT, DURATION, HOME_HITS, JUMPS } from './music'
import { EVELYN, JOY, WAYMOND } from './worlds'

/**
 * The end credits. The last hit has put the laundromat's lights out, and the family rest in the dark by the glow of
 * a washer's window while the quiet end of the cue plays on. Over the dark the credits come, a card at a time: a
 * line in capitals for what they did, the names, and where it is owed the fine print. Each comes into focus, holds,
 * and goes out of focus as the next comes.
 *
 * The words are the page's: a show's canvas sets no type (`shows/stage.ts`), so the player sets them over the frame
 * from `creditsAt` in its own face, and a saved video has them painted in (`shows/words.ts`). The canvas's half is
 * only a soft dark under them, so they read whatever the room is doing.
 */

export interface Card {
  /** Show time the card starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
}

/** A card coming up, going, and how much one card's going overlaps the next's coming. */
const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

const script: Omit<Card, 'at'>[] = [
  { hold: 3.2, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.2,
    role: 'With',
    names: [
      ['Evelyn', 'the vermilion ball', EVELYN],
      ['Joy', 'the violet ball', JOY],
      ['Waymond', 'the jade ball', WAYMOND],
    ],
  },
  {
    hold: 4.4,
    role: 'Music',
    names: ['Son Lux'],
    notes: ['“Come Recover (Empathy Fight)”', 'Ryan Lott, Rafiq Bhatia and Ian Chang'],
  },
  {
    hold: 4.0,
    role: 'After',
    names: ['Everything Everywhere All at Once'],
    notes: ['a film by Daniels (2022)'],
  },
  { hold: 2.8, role: 'Drawn with', names: ['p5.js'] },
]

export const CARDS: Card[] = (() => {
  const out: Card[] = []
  let at = CREDITS_AT
  for (const c of script) {
    out.push({ ...c, at })
    at += FORM + c.hold + GO - OVERLAP
  }
  return out
})()

/** When the last card has gone: after it the room holds in the dark to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/**
 * Where a card's top middle sits, as shares of the 16:9 frame: over the storefront's dark glass, the night outside,
 * clear of the clock, the lanterns and the family.
 */
const AT: [number, number] = [0.3, 0.12]

/** How far up a card is at `t` (0..1), and how far it still has to settle (hundredths of the frame). */
function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / (GO * 0.6))
  return { light: easeInOutCubic(up) * (1 - down), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

/**
 * The film's three chapters, which are the show's three parts, each named as it begins: Everything over the
 * storefront's dark glass in the opening's wide shot, as the tubes come on; Everywhere in the premiere's lower
 * widescreen bar, as a film sets a title in its letterbox; All at Once in the dark she breaks through into, before the
 * laundromat comes up round her. Set by the page as the credits are, in its own face.
 */
export const CHAPTERS: (Card & { pos: [number, number]; scale: number })[] = [
  { at: 0.6, hold: 3.6, role: 'Part one', names: ['Everything'], pos: [0.122, 0.5], scale: 0.66 },
  { at: JUMPS.premiere + 0.5, hold: 2.6, role: 'Part two', names: ['Everywhere'], pos: [0.5, 0.878], scale: 0.62 },
  { at: JUMPS.mosaic + 0.35, hold: 2.4, role: 'Part three', names: ['All at Once'], pos: [0.5, 0.6], scale: 0.85 },
]

/** The cards up at `t`, for the page to set (`Performance.titles`): the chapters as they begin, and the credits. */
/**
 * The show's three conversations, in subtitles: no voices, only plain words low in the frame. The lines are this
 * show's own, not the film's. Evelyn's are in roman and the other's in italic, so who speaks is told without a name.
 *
 * - **The taxes**: Joy comes to her mother at the adding machine, and is sent away. Everything after answers it.
 * - **The alley** (the film's "in another life"): as she comes down to Waymond, and before the drain takes her from
 *   him. Set in the widescreen's lower bar, as a Wong Kar-wai picture is subtitled.
 * - **The hush**: the beam finds Joy waiting on the bagel, and she speaks first.
 * - **The rocks**, as the film's two stones do: Joy's as she teeters and leans out over the brink; nothing as she goes
 *   over; Evelyn's as she flinches back and as she goes after her; and on the bench far below, the two of them, as
 *   their colour starts to come back.
 *
 * Low in the frame, a soft dark under them keeps them readable on the pale canyon and the bagel's seeds
 * (`subtitleBed`).
 *
 * - **The peak**: once Joy has her eye, her mother says to her what Waymond said to her in the alley.
 * - **Home**, at the washer's foot, the three of them together: he asks what he asked in the alley, and this time she
 *   can.
 *
 * Each comes on a note the scene already moves on, and goes before the next.
 */
export type Scene = 'taxes' | 'alley' | 'hush' | 'rocks' | 'peak' | 'home'
export const SUBTITLES: { at: number; to: number; line: string; who: 'evelyn' | 'joy' | 'waymond'; scene: Scene }[] = [
  // The taxes: Joy stops below her mother at the adding machine, and her mother does not look up.
  { at: 24.0, to: 26.2, line: 'Mom? Can I —', who: 'joy', scene: 'taxes' },
  { at: 26.6, to: 28.9, line: 'Not now, Joy.', who: 'evelyn', scene: 'taxes' },
  { at: 74.2, to: 76.3, line: 'I don’t know where I am.', who: 'evelyn', scene: 'alley' },
  { at: 77.1, to: 79.3, line: 'Here. With me. Stay a little.', who: 'waymond', scene: 'alley' },
  { at: 79.6, to: 81.9, line: 'I can’t.', who: 'evelyn', scene: 'alley' },
  { at: 134.2, to: 136.4, line: 'There you are.', who: 'joy', scene: 'hush' },
  { at: 136.8, to: 139.0, line: 'Joy? What is this place?', who: 'evelyn', scene: 'hush' },
  { at: 139.3, to: 141.8, line: 'Come and see.', who: 'joy', scene: 'hush' },
  { at: 208.5, to: 211.6, line: 'It is quiet here. Nothing has to mean anything.', who: 'joy', scene: 'rocks' },
  { at: 212.0, to: 213.7, line: 'You don’t have to follow me.', who: 'joy', scene: 'rocks' },
  { at: 216.4, to: 218.4, line: 'Joy —', who: 'evelyn', scene: 'rocks' },
  { at: 219.5, to: 222.0, line: 'I’m coming.', who: 'evelyn', scene: 'rocks' },
  { at: 226.7, to: 229.4, line: 'You came all this way.', who: 'joy', scene: 'rocks' },
  { at: 229.8, to: 232.6, line: 'Where else would I be?', who: 'evelyn', scene: 'rocks' },
  // The peak: Joy has her eye, and her mother says to her what Waymond said to her in the alley. (After the share
  // card's frame, 255.75, so the card is as it was.)
  { at: 255.8, to: 258.4, line: 'Here. With me.', who: 'evelyn', scene: 'peak' },
  // Home: he asks what he asked in the alley, and this time she can.
  { at: 276.2, to: 278.8, line: 'Stay a little?', who: 'waymond', scene: 'home' },
  { at: 279.6, to: 282.2, line: 'I’m staying.', who: 'evelyn', scene: 'home' },
]
/** Where the subtitles sit, as shares of the 16:9 frame (their top middle): low, or in the widescreen's lower bar. */
export const SUB_AT: [number, number] = [0.5, 0.855]
const SUB_IN_BAR: [number, number] = [0.5, 0.884]
/** The least a subtitle's type may be on the page, CSS pixels: on a phone held upright they are still read. */
const SUB_LEAST = 13
/** The least unit of the chapters and credits on the page, CSS pixels: so their fine print (a role, a note) is read on a phone. */
const WORDS_LEAST = 4.2
/**
 * Where a scene's subtitles sit: low, in the widescreen's lower bar in the alley, and at the taxes high on the plain
 * tile wall, as the close two-shot has the family along the frame's foot and nothing over the wall's left.
 */
const subAt = (scene: Scene): [number, number] => (scene === 'alley' ? SUB_IN_BAR : scene === 'taxes' ? [0.27, 0.05] : SUB_AT)

/** The subtitle up at `t` that has a soft dark under it (not in a widescreen bar): how far up, and where. */
export function subtitleLight(t: number): number {
  return subtitleBedAt(t).light
}
function subtitleBedAt(t: number): { light: number; at: [number, number]; deep: number } {
  let best = { light: 0, at: SUB_AT, deep: 1 }
  for (const sub of SUBTITLES) {
    if (sub.scene === 'alley') continue
    const light = clamp((t - sub.at) / SUB_FADE) * (1 - clamp((t - (sub.to - SUB_FADE)) / SUB_FADE))
    // Under the other's lines (italic, which the page sets a little faded) the dark is deeper.
    if (light > best.light) best = { light, at: subAt(sub.scene), deep: sub.who === 'evelyn' ? 1 : 1.3 }
  }
  return best
}

/** The soft dark low in the frame under a subtitle, so its cream reads on the pale canyon or the bagel's seeds. */
export const subtitleBed = scenery<null>({
  name: 'subtitle bed',
  draw: () => {},
  over: (p, _s, c) => {
    const { light: sub, at: where, deep } = subtitleBedAt(c.t)
    if (sub <= 0.001) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const w = f.x1 - f.x0
    const h = f.y1 - f.y0
    // The 16:9 box the words are set in, inside a frame that may be wider or taller.
    const bh = Math.min(h, (w * 9) / 16)
    // On the words' middle: their top is where `SUB_AT` puts it, and they are at least SUB_LEAST tall.
    const cy = (f.y0 + (h - bh) / 2 + bh * where[1]) * k + Math.max(bh * 0.022 * k, SUB_LEAST * 0.8)
    const cx = (f.x0 + w * where[0]) * k
    const rx = Math.max(Math.min(w, (bh * 16) / 9) * (where === SUB_AT ? 0.34 : 0.24) * k, 170)
    // As tall as the words are, however small the stage (they never go under SUB_LEAST on the page).
    const ry = Math.max(rx * 0.16, SUB_LEAST * 1.9)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(30, 24, 20, ${0.5 * deep * sub})`)
    g.addColorStop(0.6, `rgba(30, 24, 20, ${0.3 * deep * sub})`)
    g.addColorStop(1, 'rgba(30, 24, 20, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    ctx.restore()
  },
})
const SUB_FADE = 0.28

/** When a card has gone, show seconds. */
export const goneAt = (card: Card): number => card.at + FORM + card.hold + GO

export function creditsAt(t: number): TitleCard[] {
  const out: TitleCard[] = []
  CHAPTERS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    // On a tall stage the first lifts into the dark over the room, clear of the bright washer it would grow across.
    out.push({ key: `all-at-once-chapter-${n}`, role: card.role, names: card.names, title: true, light, rise: rise * 0.5, at: card.pos, scale: card.scale, least: WORDS_LEAST, lift: n === 0 ? 1.55 : undefined })
  })
  SUBTITLES.forEach((sub, n) => {
    const up = clamp((t - sub.at) / SUB_FADE)
    const down = clamp((t - (sub.to - SUB_FADE)) / SUB_FADE)
    const light = up * (1 - down)
    if (light <= 0.001) return
    // Plain under the picture, as a subtitle is: small, cream, low in the frame. Evelyn's in roman; the other's in
    // italic (the card's note), so who is speaking is told without a name.
    const at = subAt(sub.scene)
    const card: TitleCard =
      sub.who === 'evelyn'
        ? { key: `all-at-once-subtitle-${n}`, names: [sub.line], plain: true, light, rise: 0, at, scale: 0.62, least: SUB_LEAST / 5.6 }
        : { key: `all-at-once-subtitle-${n}`, names: [], notes: [sub.line], plain: true, light, rise: 0, at: [at[0], at[1] + 0.006], scale: 1.75, least: SUB_LEAST / 1.95 }
    out.push(card)
  })
  if (t < CREDITS_AT) return out
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `all-at-once-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT, least: WORDS_LEAST })
  })
  return out
}

/** How dark the bed under the words is at `t`: up with the first card, down after the last. */
const bedAt = (t: number): number => clamp((t - CREDITS_AT + 0.4) / 1.6) * (1 - clamp((t - LAST_GONE + 0.4) / 1.8))

/** The canvas's half: a soft dark where the words come, over everything in the room. */
export const credits = scenery<null>({
  name: 'credits',
  draw: () => {},
  over: (p, _s, c) => {
    endDark(p, c.k, c.t)
    const bed = bedAt(c.t)
    if (bed <= 0.001) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const w = f.x1 - f.x0
    const h = f.y1 - f.y0
    const cx = (f.x0 + w * AT[0]) * k
    const cy = (f.y0 + h * (AT[1] + 0.13)) * k
    // Deep enough at its heart that what is behind the names (the window's unlit neon) recedes under them, and no
    // wider than the words, so the lanterns and the family keep their light.
    const rx = w * 0.3 * k
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.5)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(8, 10, 12, ${0.7 * bed})`)
    g.addColorStop(0.55, `rgba(8, 10, 12, ${0.42 * bed})`)
    g.addColorStop(1, 'rgba(8, 10, 12, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    ctx.restore()
  },
})

/**
 * The end: after the last card the recording fades to silence, and the room goes down into the dark with it. The
 * washer's window, the light the family rests in, is the last to go. 0 is the room as it is; 1 is the dark.
 */
export const endDarkAt = (t: number): number => easeInOutCubic(clamp((t - (LAST_GONE + 0.5)) / (DURATION - 0.4 - (LAST_GONE + 0.5))))
/** How far the window's own light has gone with it: later, so it outlasts the room. */
const windowDarkAt = (t: number): number => easeInOutCubic(clamp((t - (LAST_GONE + 2.8)) / (DURATION - 0.2 - (LAST_GONE + 2.8))))

/** The end's dark as stops from the window's centre out (`at` shares of `END_REACH`): one falloff, for both the dark itself and what goes down with it. */
const END_REACH = 1.7
function endStops(t: number): { at: number; a: number }[] {
  const a = 0.96 * endDarkAt(t)
  const w = 0.96 * windowDarkAt(t)
  return [
    { at: 0, a: Math.max(w, a * 0.35) },
    { at: 0.45, a: Math.max(w, a * 0.7) },
    { at: 1, a },
  ]
}
/** How dark the end's dark is at (x, y) at `t`, so what is drawn over it (the googly eyes) goes down with what it sits on. */
function endDarkHere(t: number, x: number, y: number): number {
  if (endDarkAt(t) <= 0) return 0
  const u = Math.min(1, Math.hypot(x - PORT[0], y - PORT[1]) / END_REACH)
  const st = endStops(t)
  const n = u < st[1].at ? 0 : 1
  return st[n].a + (st[n + 1].a - st[n].a) * ((u - st[n].at) / (st[n + 1].at - st[n].at))
}

/** A colour as the end's dark leaves it at (x, y): for what draws over the dark (the googly eyes). */
export const endShade = (hex: string, t: number, x: number, y: number): string => {
  const d = endDarkHere(t, x, y)
  return d <= 0 ? hex : mixHex(hex, '#040506', d)
}

/** The dark itself, over the whole frame, with a soft opening at the window that closes last. */
function endDark(p: p5, k: number, t: number): void {
  const d = endDarkAt(t)
  if (d <= 0.001) return
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [px, py] = PORT
  const g = ctx.createRadialGradient(px * k, py * k, 0, px * k, py * k, END_REACH * k)
  for (const s of endStops(t)) g.addColorStop(s.at, `rgba(4, 5, 6, ${s.a})`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
}

/** For the check: the credits come after the last hit, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= HOME_HITS[2] + 1.5 && LAST_GONE <= DURATION - 2
