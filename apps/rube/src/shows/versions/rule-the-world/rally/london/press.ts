import type { Pt } from '../../../../../parts'
import { bloom } from '../depth'
import { hash } from '../kit'
import { at } from '../music'
import { ellipse, mix, rect, shape, type Pen } from '../pen'
import { ballAt, BOW, DEAD, FLIP_A, FLIP_M, MISS, OFF_END, PARAPET, SMASHES, T0, WINNER } from './geo'
import { busy, SEMI_WIN } from './mood'
import { C } from './palette'

/**
 * The press: a box in the gallery's front row between the two tables, three pressmen in their hats with their big
 * flash cameras, and the flash bulbs, cold white, that go off from it (and now and then from a camera up in the
 * gallery): few through the semifinal, a burst on its winning smash, more and more through the final, a burst on
 * Marty's winner, and again once the dead ball has died. Never on the dead shot or its dying: nothing competes with
 * them.
 */

/** The press box's span along the front row, and its three men. */
export const PRESS_SPAN: [number, number] = [6.85, 8.65]
const MEN = [7.18, 7.75, 8.32]

/** A flash: when; whose (a pressman, or -1 for a camera in the gallery at `p`), and how big. */
interface Flash {
  t: number
  who: number
  p: Pt
  size: number
}

/** Where a pressman's flash dish is, his camera up at his face. */
const dishOf = (who: number): Pt => [MEN[who] - 0.2, PARAPET - 0.62 - 0.16]

export const FLASHES: Flash[] = (() => {
  const out: Flash[] = []
  const press = (t: number, who: number) => out.push({ t, who, p: dishOf(who), size: 1 })
  // The semifinal's winner, and the umpire's card for it.
  press(SEMI_WIN + 0.05, 1)
  press(SEMI_WIN + 0.27, 0)
  press(SEMI_WIN + 0.55, 2)
  press(FLIP_A + 0.6, 1)
  // Every smash, someone; the final's winner, all three, and the card that levels it.
  for (const s of SMASHES) if (Math.abs(s.t - SEMI_WIN) > 0.1 && Math.abs(s.t - WINNER) > 0.1) press(s.t + 0.07, Math.floor(hash(Math.round(s.t * 100), 3, 81) * 3))
  press(WINNER + 0.05, 2)
  press(WINNER + 0.22, 1)
  press(WINNER + 0.48, 0)
  press(FLIP_M + 0.7, 2)
  // And the odd one between, more as the final comes on, from the box and from the gallery.
  for (let i = 0; T0 + 1.5 + i * 0.41 < DEAD - 1; i++) {
    const t = T0 + 1.5 + i * 0.41 + 0.2 * hash(i, 1, 82)
    if (hash(i, 2, 82) < 0.03 + 0.17 * busy(t)) press(t, Math.floor(hash(i, 3, 82) * 3))
    if (t > at(33, 1) && hash(i, 4, 82) < 0.1 * busy(t)) {
      const b = ballAt(t)
      out.push({ t: t + 0.13, who: -1, p: [b[0] + (hash(i, 5, 82) - 0.5) * 12, PARAPET - 0.75 - 0.78 * Math.floor(hash(i, 6, 82) * 4)], size: 0.6 })
    }
  }
  // Once it has died and his bat has gone over it, and as it goes off the end; and Endo's bow.
  press(MISS + 0.3, 1)
  press(MISS + 0.62, 0)
  press(OFF_END + 0.08, 2)
  press(BOW + 0.3, 1)
  out.sort((x, y) => x.t - y.t)
  // A pressman has one bulb in at a time, and changing it takes him a while; and nothing on the dead shot.
  const last = [-9, -9, -9]
  return out.filter((f) => {
    if (f.t > DEAD - 0.7 && f.t < MISS + 0.25) return false
    if (f.who < 0) return true
    if (f.t - last[f.who] < 1.2) return false
    last[f.who] = f.t
    return true
  })
})()

/** How lit a flash is, `u` seconds after it goes: a hard white instant, gone in a fifth of a second. */
const lit = (u: number): number => (u < 0 || u > 0.45 ? 0 : Math.exp(-u / 0.055) + 0.08 * Math.exp(-u / 0.2))

/** A pressman's camera: up at his face from a little before his flash to a little after. */
function aiming(who: number, t: number): number {
  let v = 0
  for (const f of FLASHES) {
    if (f.who !== who) continue
    const u = t - f.t
    if (u < -1.0 || u > 0.9) continue
    v = Math.max(v, u < 0 ? Math.min(1, (u + 1.0) / 0.35) : 1 - Math.max(0, (u - 0.5) / 0.4))
  }
  return v
}
/** The press's flash at `t` on pressman `who`'s face, 0 to 1. */
const litFace = (who: number, t: number): number => {
  let v = 0
  for (const f of FLASHES) if (f.who === who) v = Math.max(v, lit(t - f.t))
  return v
}

/**
 * The press box: its desk on the parapet, and the three pressmen, hats on, cameras up at their faces when they shoot
 * (the lens toward the play, the dish beside it) and down at their chests between.
 */
export function pressBox(pen: Pen, t: number, y: number): void {
  const ball = ballAt(t - 0.12)
  MEN.forEach((x, who) => {
    const up = aiming(who, t)
    const flash = litFace(who, t)
    const look = Math.max(-1, Math.min(1, (ball[0] - x) / 4))
    const hy = y - 0.62 + 0.01 * Math.sin(t * 1.3 + who)
    const coat = mix(C.gallery, ['#2B2E33', '#33302B', '#262C30'][who], 0.6 + 0.3 * flash)
    shape(pen, [[x - 0.27, y + 0.05], [x - 0.25, hy + 0.22], [x - 0.08, hy + 0.13], [x + 0.08, hy + 0.13], [x + 0.25, hy + 0.22], [x + 0.27, y + 0.05]], coat)
    const hx = x + 0.03 * look
    ellipse(pen, [hx, hy], 0.13, 0.15, mix(mix(C.gallery, C.skinDim, 0.55), C.skin, flash * 0.8))
    // The hat, its brim, the press card in its band.
    const hc = mix(C.gallery, '#2A2721', 0.75)
    ellipse(pen, [hx, hy - 0.09], 0.21, 0.035, hc)
    shape(pen, [[hx - 0.13, hy - 0.09], [hx - 0.11, hy - 0.21], [hx + 0.11, hy - 0.21], [hx + 0.13, hy - 0.09]], hc)
    rect(pen, hx + 0.03, hy - 0.16, hx + 0.08, hy - 0.11, mix(C.gallery, C.card, 0.7))
    // The camera: down at his chest, or up at his face.
    const cam: Pt = [hx + 0.02, hy + 0.36 - 0.36 * up]
    rect(pen, cam[0] - 0.12, cam[1] - 0.08, cam[0] + 0.12, cam[1] + 0.08, '#141516')
    ellipse(pen, cam, 0.055, 0.055, '#3A3D3E')
    ellipse(pen, cam, 0.03, 0.03, mix('#0D0E0F', C.flash, flash * 0.5))
    // The flash's dish beside it, the bulb in it.
    const dish: Pt = [cam[0] - 0.2, cam[1] - 0.16]
    if (up > 0.2) {
      ellipse(pen, dish, 0.095, 0.095, mix('#4C5354', C.flash, flash))
      ellipse(pen, dish, 0.07, 0.07, mix('#2C3132', C.flash, flash))
      ellipse(pen, dish, 0.028, 0.028, mix('#8D9595', C.flash, flash))
    }
    // Hands on the camera.
    ellipse(pen, [cam[0] - 0.13, cam[1] + 0.04], 0.04, 0.04, mix(C.gallery, C.skinDim, 0.7))
    ellipse(pen, [cam[0] + 0.13, cam[1] + 0.04], 0.04, 0.04, mix(C.gallery, C.skinDim, 0.7))
  })
}

/** The desk along the parapet in front of them, drawn with the parapet. */
export function pressDesk(pen: Pen): void {
  rect(pen, PRESS_SPAN[0], PARAPET - 0.13, PRESS_SPAN[1], PARAPET + 0.03, '#2A241E')
  rect(pen, PRESS_SPAN[0], PARAPET - 0.15, PRESS_SPAN[1], PARAPET - 0.11, '#4A3E31')
}

/** The flash bulbs going off: a hard white burst at the bulb, and the light it throws over the gallery round it. */
export function flashes(pen: Pen, t: number, f: { x0: number; x1: number; y0: number; y1: number }): void {
  for (const fl of FLASHES) {
    const u = t - fl.t
    if (u < 0) break
    const I = lit(u)
    if (I <= 0.01) continue
    if (fl.p[0] < f.x0 - 2 || fl.p[0] > f.x1 + 2 || fl.p[1] < f.y0 - 2 || fl.p[1] > f.y1 + 2) continue
    bloom(pen, fl.p, 0.5 * fl.size, C.flash, 0.95 * I)
    bloom(pen, fl.p, 1.8 * fl.size, C.flash, 0.2 * I)
  }
}
