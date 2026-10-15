import { mixHex, type Pt } from '../../../../../parts'
import { home } from '../music'
import { LAST_GONE } from '../credits'
import { pixelOf } from '../film'
import { DOJO, HIBACHI, HOME, HOTDOG, ROCKS, STAR } from '../worlds'
import { backdrop, SKINS, type Moment, type Skin, type View } from '../multi/skins'
import { lodFor, type Pen as ScenePen } from '../multi/skins-pen'
import { family, paintLife, type Life } from './finale-lives'
import { BIG_DRYER, DRYER, LIGHTS, WASHER, WASHERS, type Glow } from './set'

/**
 * Every machine in the shop, a life.
 *
 * The show opened the multiverse in one window, the big dryer's, and under the credits the washer by the door gives
 * her lives back one at a time. After its swell, when the three of them have looked at one another, the light goes
 * on down the shop: a beat apart, from the washer next to theirs to the dryers at the far end, every machine's glass
 * lights, and in each is one of her lives, turning slowly past, with the three of them in it. The camera draws back
 * until the whole row is in the frame: the family small by the door under their own window, and the shop going on
 * beside them, every machine a world, each throwing its own colour on the dark floor and the machines round it.
 * Everything, everywhere, at once, in a laundromat at night. Then the end's dark takes them, the far end first,
 * theirs last.
 *
 * The lives are the ones she went through: her own (the red carpet, the dojo, the canyon, the hot dog piano, the
 * kitchen), painted as the washer's window paints them (`finale-lives.ts`), and the surf's and the film's other
 * worlds as everywhere at once had them (`multi/skins.ts`), with the three of them on their ground.
 */

interface ShopWindow {
  /** The glass's centre and radius, in the room's cells. */
  at: Pt
  r: number
  /** What is in it: one of her own lives, or a world from the wall of them. */
  life: Life | string
  /** The light it throws on the room. */
  light: string
  /** Show time it lights. */
  on: number
}

const smallPort = (x: number, upper: boolean): Pt => {
  const foot = upper ? -DRYER.h : 0
  return [x, foot - DRYER.h + 0.2 + DRYER.rim + 0.06]
}

const OWN: Life[] = ['premiere', 'dojo', 'rocks', 'hotdog', 'raccoon']
const isOwn = (l: string): l is Life => (OWN as string[]).includes(l)

/** From the washer beside theirs, on down the shop, a beat apart on home's pulse. */
const FIRST_BEAT = 95
const ROW: Omit<ShopWindow, 'on'>[] = [
  { at: WASHERS[1].port, r: WASHER.glass, life: 'premiere', light: mixHex(STAR.carpet, STAR.gold, 0.35) },
  { at: WASHERS[2].port, r: WASHER.glass, life: 'alley', light: mixHex(STAR.neonPink, HOME.glass, 0.35) },
  { at: WASHERS[3].port, r: WASHER.glass, life: 'dojo', light: mixHex(DOJO.lacquer, DOJO.gold, 0.45) },
  { at: BIG_DRYER.port, r: BIG_DRYER.glass, life: 'rocks', light: mixHex(ROCKS.sand, HOME.gold, 0.3) },
  { at: WASHERS[4].port, r: WASHER.glass, life: 'hotdog', light: mixHex(HOTDOG.lilac, HOME.rose, 0.5) },
  { at: WASHERS[5].port, r: WASHER.glass, life: 'raccoon', light: mixHex(HIBACHI.flame, HIBACHI.flameHot, 0.3) },
  { at: WASHERS[6].port, r: WASHER.glass, life: 'pinata', light: mixHex(HOME.butter, HOME.gold, 0.3) },
  { at: WASHERS[7].port, r: WASHER.glass, life: 'karaoke', light: mixHex(STAR.neonPink, STAR.neonTeal, 0.45) },
  { at: smallPort(17.5, false), r: DRYER.glass, life: 'irs', light: mixHex('#BFE3C6', HOME.light, 0.3) },
  { at: smallPort(17.5, true), r: DRYER.glass, life: 'spinner', light: mixHex(STAR.neonTeal, HOME.light, 0.5) },
  { at: smallPort(19.0, false), r: DRYER.glass, life: 'opera', light: mixHex(HOME.red, HOME.gold, 0.5) },
  { at: smallPort(19.0, true), r: DRYER.glass, life: 'mahjong', light: mixHex('#4FA37A', HOME.light, 0.3) },
]
export const SHOP: ShopWindow[] = ROW.map((w, i) => ({ ...w, on: home(FIRST_BEAT + i) }))

/** When the shop's lights begin, and when the last is lit: what the camera's draw-back is timed to. */
export const SHOP_FROM = SHOP[0].on
export const SHOP_TO = SHOP[SHOP.length - 1].on

const smooth = (u: number): number => {
  const x = Math.max(0, Math.min(1, u))
  return x * x * (3 - 2 * x)
}

/** How lit window `i` is at `t`: up over most of a second, and out in the end's dark, the far end first. */
export function shopLit(i: number, t: number): number {
  const w = SHOP[i]
  if (t < w.on) return 0
  const up = smooth((t - w.on) / 0.9)
  const out = LAST_GONE + 0.4 + (SHOP.length - 1 - i) * 0.22
  return up * (1 - smooth((t - out) / 1.1))
}

/** Each window's light on the room, through the light map: a pool of its colour on the machines and the floor. */
function shopGlows(t: number): Glow[] {
  if (t < SHOP_FROM) return []
  const out: Glow[] = []
  SHOP.forEach((w, i) => {
    const a = shopLit(i, t)
    if (a <= 0.01) return
    const big = w.r > 0.6
    out.push({ x: w.at[0], y: w.at[1] + (big ? 0.6 : 0.3), r: big ? 2.6 : 1.45, a: 0.62 * a, color: w.light })
  })
  return out
}
// Replaced, not added again, when the module is reloaded.
type Tagged = ((t: number) => Glow[]) & { shop?: boolean }
for (let i = LIGHTS.glows.length - 1; i >= 0; i--) if ((LIGHTS.glows[i] as Tagged).shop) LIGHTS.glows.splice(i, 1)
const tagged: Tagged = shopGlows
tagged.shop = true
LIGHTS.glows.push(tagged)

/** The scene round a world's ground that the round glass shows, in its own cells: centred a little above the ground. */
const VIEW_R = 1.3
const VIEW_CY = -0.5
const STILL: Omit<Moment, 't'> = { since: Infinity, s: 0, e: true }

/** A world from the wall, in the glass: its backdrop and its weather, and the three of them on its ground. */
function paintWorld(ctx: CanvasRenderingContext2D, skin: Skin, r: number, u: number, t: number): void {
  const s = r / VIEW_R
  ctx.save()
  ctx.translate((0.1 - 0.2 * u) * r, 0)
  ctx.save()
  ctx.scale(s, s)
  ctx.translate(0, -VIEW_CY)
  const q = 1 / pixelOf(ctx)
  const pen: ScenePen = { ctx, q, lw: Math.max(0.8, q * 0.03) / q, lod: lodFor(q), ink: skin.ink }
  const v: View = { x0: -VIEW_R - 0.4, y0: VIEW_CY - VIEW_R - 0.2, x1: VIEW_R + 0.4, y1: VIEW_CY + VIEW_R + 0.2 }
  const m: Moment = { ...STILL, t }
  backdrop(pen, skin, m, v)
  skin.front?.(pen, m, v)
  ctx.restore()
  family(ctx, r, 0, -VIEW_CY / VIEW_R, 0.1, skin.ink)
  ctx.restore()
}

/**
 * The shop's lit windows, over the room's light (they are lights themselves): each life inside its glass, seen in the
 * glass's own light, the drum's lifters going round at its rim so the machine is running, and darker to the rim.
 */
export function drawShop(ctx: CanvasRenderingContext2D, k: number, t: number, x0: number, x1: number): void {
  if (t < SHOP_FROM) return
  SHOP.forEach((w, i) => {
    const a = shopLit(i, t)
    if (a <= 0.004) return
    const [cx, cy] = w.at
    if (cx + w.r < x0 - 0.5 || cx - w.r > x1 + 0.5) return
    const r = w.r * k
    // Seen going past, slowly, back and forth: the drum turning it.
    const u = 0.5 + 0.5 * Math.sin(t * 0.21 + i * 1.7)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx * k, cy * k, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.translate(cx * k, cy * k)
    ctx.globalAlpha = a
    if (isOwn(w.life)) paintLife(ctx, w.life, r, u, t)
    else {
      const skin = SKINS[w.life]
      if (skin) paintWorld(ctx, skin, r, u, t)
    }
    // The glass's light over it, and its curve.
    ctx.globalAlpha = 1
    ctx.fillStyle = rgba(w.light, 0.16 * a)
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    // The drum's three lifters, going round at the rim.
    const turn = t * 0.55 + i
    ctx.fillStyle = rgba('#1C2230', 0.55 * a)
    for (let j = 0; j < 3; j++) {
      const th = turn + (j * Math.PI * 2) / 3
      ctx.beginPath()
      ctx.moveTo(Math.cos(th - 0.16) * r * 1.02, Math.sin(th - 0.16) * r * 1.02)
      ctx.lineTo(Math.cos(th) * r * 0.8, Math.sin(th) * r * 0.8)
      ctx.lineTo(Math.cos(th + 0.16) * r * 1.02, Math.sin(th + 0.16) * r * 1.02)
      ctx.closePath()
      ctx.fill()
    }
    const rim = ctx.createRadialGradient(0, -0.15 * r, 0.55 * r, 0, 0, r)
    rim.addColorStop(0, 'rgba(0, 0, 0, 0)')
    rim.addColorStop(1, `rgba(0, 0, 0, ${0.38 * a})`)
    ctx.fillStyle = rim
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
  })
}

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
