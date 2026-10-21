import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { ellipse, mix, rect, shape, type Pen } from '../pen'
import { ballAt, BOW, DEAD, FLOOR_HITS, MISS, PARAPET, REST_AT, SMASHES, T0, WINNER } from './geo'
import { busy, SEMI_WIN } from './mood'
import { C } from './palette'

/**
 * The press: a box in the gallery's front row between the two tables, three pressmen in their hats with their big
 * flash cameras. They put their cameras up to their faces for the play more and more as the final comes on, and let
 * them down again; only a few times does a bulb go: on the semifinal's winning smash, on Marty's winner in the final,
 * on the last of his smashes, once the dead ball has died, and on Endo's bow. A flash is the bulb in its dish going
 * white for an instant and the pressman's face lit by it: no burst in the air round it. Never on the dead shot or its
 * dying: nothing competes with them.
 */

/** The press box's span along the front row, and its three men. */
export const PRESS_SPAN: [number, number] = [6.85, 8.65]
const MEN = [7.18, 7.75, 8.32]

/** A pressman's shot: when, whose, and whether a bulb goes (or he only has his camera up for it, waiting). */
interface Shot {
  t: number
  who: number
  fires: boolean
}

export const SHOTS: Shot[] = (() => {
  const out: Shot[] = []
  const press = (t: number, who: number, fires = false) => out.push({ t, who, fires })
  // The few bulbs that go: the semifinal's winner, the final's winner, the last of Marty's smashes, after the death,
  // and Endo's bow.
  press(SEMI_WIN + 0.05, 1, true)
  press(SEMI_WIN + 0.55, 2, true)
  press(WINNER + 0.05, 2, true)
  press(WINNER + 0.48, 0, true)
  const lastSmash = Math.max(...SMASHES.filter((s) => s.who === 'marty' && s.t < DEAD).map((s) => s.t))
  press(lastSmash + 0.07, 1, true)
  press(MISS + 0.3, 1, true)
  press(BOW + 0.3, 0, true)
  // And no bulb, but two of them up again as he goes off the end and over the boards, for the picture of the loss.
  press(FLOOR_HITS[1] + 0.15, 2)
  press(REST_AT - 0.1, 1)
  // Otherwise up for the smashes, and now and then for the play, more as the final comes on: up, and down again.
  for (const s of SMASHES) if (Math.abs(s.t - SEMI_WIN) > 0.1 && Math.abs(s.t - WINNER) > 0.1 && Math.abs(s.t - lastSmash) > 0.1) press(s.t + 0.07, Math.floor(hash(Math.round(s.t * 100), 3, 81) * 3))
  for (let i = 0; T0 + 1.5 + i * 0.41 < DEAD - 1; i++) {
    const t = T0 + 1.5 + i * 0.41 + 0.2 * hash(i, 1, 82)
    if (hash(i, 2, 82) < 0.03 + 0.17 * busy(t)) press(t, Math.floor(hash(i, 3, 82) * 3))
  }
  // The bulbs first, so a man's time with his camera goes to them; one shot at a time a man, none on the dead shot.
  out.sort((x, y) => Number(y.fires) - Number(x.fires) || x.t - y.t)
  const taken: Shot[] = []
  for (const f of out) {
    if (f.t > DEAD - 0.7 && f.t < MISS + 0.25) continue
    if (taken.some((g) => g.who === f.who && Math.abs(g.t - f.t) < 1.2)) continue
    taken.push(f)
  }
  return taken.sort((x, y) => x.t - y.t)
})()

/** How lit a flash is, `u` seconds after it goes: a hard white instant, gone in a fifth of a second. */
const lit = (u: number): number => (u < 0 || u > 0.22 ? 0 : Math.exp(-u / 0.05))

/** A pressman's camera: up at his face from a little before his shot to a little after. */
function aiming(who: number, t: number): number {
  let v = 0
  for (const f of SHOTS) {
    if (f.who !== who) continue
    const u = t - f.t
    if (u < -1.0 || u > 0.9) continue
    v = Math.max(v, u < 0 ? Math.min(1, (u + 1.0) / 0.35) : 1 - Math.max(0, (u - 0.5) / 0.4))
  }
  return v
}
/** His own bulb's flash at `t`, on his face and in its dish, 0 to 1. */
const litFace = (who: number, t: number): number => {
  let v = 0
  for (const f of SHOTS) if (f.fires && f.who === who) v = Math.max(v, lit(t - f.t))
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
    ellipse(pen, cam, 0.03, 0.03, '#0D0E0F')
    // The flash's dish beside it, the bulb in it: white for the instant it goes.
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
