import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, type Company, type PartShot } from '../kit'
import { ORIGIN, exitFor, FISCHER_DOWN, local } from '../stack'
import { snowSetPiece, SNOW_SET_CELLS } from './snow-set'
import { drawSnowPart, drawSnowOver, drawVaultPart, drawVaultOver } from './snow-draw'
import {
  ARIADNE_SNOW,
  ARIADNE_VAULT,
  COBB,
  COBB_VAULT,
  FISCHER_SNOW,
  FISCHER_VAULT,
  fischerMark,
  GUARD_DOWN,
  GUARD_HAIR,
  GUARD_IN,
  GUARD_LAND,
  GUARD_SHIFT,
  MAL_AT,
  MAL_FROM,
  MAL_TO,
  Motion,
  T,
} from './snow-geo'

/**
 * SNOW: level 3, Eames's dream: the mountain and its fortress on the column, and the vault. Two parts.
 *
 * **Snow (122.294 → 152.770, the swell).** Out of the dark into a pale sky over a mountain in snow, the three of them
 * come down in the powder on the shoulder under the summit, the fortress below them. On the chord they go over the
 * cornice one after another on skis, and run the face: left across it over the fortress's roof and off the rock step
 * on bar 34 (the big jump), fast along the face to the hairpin at its far end, back right and over the crevasse on bar
 * 36; the guards' snowmobiles come over the crest after them, and at the crevasse the first goes in. At the fork
 * Ariadne and Cobb pull up on the ledge over the gate; Fischer runs on down, and on bar 37 the gate goes up for him. He
 * rolls along the antechamber to the vault's great round door; on bar 38 Mal, still on the piste above, fires: he goes
 * down through the floor and the mountain into the dark (`FISCHER_DOWN`), and Cobb leaps off the ledge too late.
 * Ariadne after him; by the gate they lie down beside the case, it opens on bar 39, and the snow goes soft under them:
 * they sink through the mountain after Fischer, into limbo on the peak (`DOWN.limbo`).
 *
 * **Vault (183.847 → 191.669, the summit).** Fischer has come up already and lies on his back on the vault's floor,
 * Eames kneeling over him; Cobb and Ariadne come up through the floor beside him. Bar 49: the paddles, and he wakes.
 * The great door's wheel turns and the door rolls aside; he goes to his father's bed; the pinwheel on the bedside
 * turns in the old man's last breath. The charges under the floor blow, the fortress comes down under them, and on bar
 * 50 (the snow's kick) the three of them are thrown straight up the column into the hotel (`UP.hotel`).
 */

export const snowSet = snowSetPiece
export const SNOW_CELLS = SNOW_SET_CELLS

/** The lane: someone's motion from `t0` to `t1`, sampled finely, split where the motion changes. */
function laneOf(m: Motion, t0: number, t1: number, origin: Pt): Seg[] {
  const segs: Seg[] = []
  for (const ph of m.phases) {
    const a = Math.max(t0, ph.t0)
    const b = Math.min(t1, ph.t1)
    if (b - a <= 1e-9) continue
    const n = Math.max(1, Math.ceil((b - a) / 0.02))
    segs.push(...carried((t) => local(origin, ph.at(Math.max(ph.t0, Math.min(ph.t1, t)))), a, b, n))
  }
  return segs
}
const inFrame = (origin: Pt, m: Motion) => (t: number) => {
  const [x, y] = local(origin, m.at(t))
  return { x, y }
}

/* ------------------------------------------------------------------ snow */

export interface SnowState {
  begin: number
}

export const snow = part<SnowState>(
  {
    name: 'snow',
    draw: (p, s, c) => drawSnowPart(p, c, s.begin + c.t, ORIGIN.snow),
    over: (p, s, c) => drawSnowOver(p, c, s.begin + c.t, ORIGIN.snow),
  },
  (slot) => {
    const O = ORIGIN.snow
    const company: Company[] = [
      { who: 'ariadne', from: slot.begin, to: slot.end, at: inFrame(O, ARIADNE_SNOW) },
      { who: 'fischer', from: slot.begin, to: FISCHER_DOWN.t, at: inFrame(O, FISCHER_SNOW) },
      {
        who: 'mal',
        from: MAL_FROM,
        to: MAL_TO,
        at: () => {
          const [x, y] = local(O, MAL_AT)
          return { x, y, spin: 0.35 }
        },
      },
    ]
    return {
      cells: box(-40, 2, 22, 30, 2),
      exit: exitFor(ORIGIN.snow, ORIGIN.limbo),
      lane: { segs: laneOf(COBB, slot.begin, slot.end, O), fire: T.dropC - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot) => snowShots(slot.begin),
)

/** The camera for the run: the landing; out over the face with the fortress under them; the gate; the shot; under. */
function snowShots(begin: number): PartShot[] {
  const O = ORIGIN.snow
  const hold = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: local(O, [x, y]), w: 1 })
  const follow = (t: number, cells: number, ox = 0, oy = 0): PartShot => ({ t, cells, w: 0, off: [ox, oy] })
  void begin
  const cut = (k: PartShot): PartShot => ({ ...k, cut: true })
  return [
    // Out of the dark with them; down on the shoulder under the summit, the sky over them.
    follow(T.in + 0.5, 6.0, 0, 0.8),
    hold(T.land + 0.35, 6.4, 9.4, 46.3),
    hold(T.dropC, 7.2, 7.4, 47.0),
    // Close after them down the face, leading them, the fortress's roof going by under them.
    follow(T.dropF + 0.7, 7.4, -1.8, 0.6),
    follow(T.j1 - 0.4, 7.6, -2.2, 0.6),
    // The rock step: cut wide for the air, the summit over them, the fortress under them; back in as Fischer lands.
    cut(hold(T.j1, 11.8, -5.6, 48.4)),
    hold(T.cutJ1 - 0.05, 11.8, -7.1, 48.9),
    cut(follow(T.cutJ1, 7.6, -2.2, 0.4)),
    // The long traverse, the hairpin (the guards over the ridge behind them), and back along the face.
    follow(T.h1 - 1.0, 7.4, -1.4, 0.4),
    follow(T.h1, 7.2, 0.4, 0.5),
    follow(T.h1 + 1.1, 7.4, 2.0, 0.4),
    follow(T.j2 - 0.5, 7.6, 2.2, 0.4),
    // The crevasse: cut wide for the air, the guards on the hairpin behind; back in on the ledge as Fischer lands.
    cut(hold(T.j2, 11.2, -16.5, 52.2)),
    hold(T.cutJ2 - 0.05, 11.2, -16.1, 52.5),
    cut(hold(T.cutJ2, 7.6, -10.2, 54.6)),
    // The ledge and the gate: Fischer goes in.
    hold(T.stopC + 0.2, 7.8, -8.9, 54.9),
    hold(T.gate + 0.5, 8.0, -6.6, 55.0),
    // Cut to Mal, close, still on the piste above the ledge, bringing the rifle up; the shot; back to Fischer going
    // down at the vault's door, and Cobb off the ledge too late.
    cut(hold(T.malCut, 4.0, -10.6, 50.85)),
    hold(T.shot + 0.3, 3.8, -10.55, 50.9),
    cut(hold(T.malBack, 7.4, -5.2, 55.0)),
    // Down with Cobb to the gate; the case; they lie down and go under.
    hold(T.cLand3 + 0.8, 7.0, -7.9, 55.1),
    hold(T.case, 5.8, -8.1, 55.3),
    follow(T.sink + 1.2, 6.2, 0, 0.6),
    follow(T.out - 0.1, 7.0, 0, 0.8),
  ]
}

/* ------------------------------------------------------------------ vault */

export const vault = part<SnowState>(
  {
    name: 'vault',
    draw: (p, s, c) => drawVaultPart(p, c, s.begin + c.t, ORIGIN.vault),
    over: (p, s, c) => drawVaultOver(p, c, s.begin + c.t, ORIGIN.vault),
  },
  (slot) => {
    const O = ORIGIN.vault
    const company: Company[] = [
      {
        who: 'fischer',
        from: T.fUp,
        to: slot.end,
        at: (t) => {
          const [x, y] = local(O, FISCHER_VAULT.at(t))
          const spin = fischerMark(t)
          return spin === undefined ? { x, y } : { x, y, spin }
        },
      },
      { who: 'ariadne', from: slot.begin, to: slot.end, at: inFrame(O, ARIADNE_VAULT) },
    ]
    return {
      cells: box(-9, -30, 9, 0, 2),
      exit: exitFor(ORIGIN.vault, ORIGIN.lift),
      lane: { segs: laneOf(COBB_VAULT, slot.begin, slot.end, O), fire: T.paddles - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  () => vaultShots(),
)

function vaultShots(): PartShot[] {
  const O = ORIGIN.vault
  const hold = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: local(O, [x, y]), w: 1 })
  const follow = (t: number, cells: number, ox = 0, oy = 0): PartShot => ({ t, cells, w: 0, off: [ox, oy] })
  return [
    // Up out of the dark after them, through the valley and the floor.
    follow(T.vIn + 0.45, 8.4, 0, -0.6),
    hold(T.cThrough + 0.35, 5.6, 0.7, 55.2),
    hold(T.paddles, 5.0, 0.8, 55.1),
    hold(T.door, 4.6, 1.2, 55.0),
    // Close on him at his father's bed, the pinwheel.
    hold(T.pinwheel, 4.2, 1.35, 55.0),
    hold(T.charges, 4.6, 1.2, 55.3),
    // The fortress comes down under them; the kick throws them up out of it.
    hold(T.kick, 6.4, 0.6, 57.1),
    follow(T.kick + 0.45, 7.8, 0, 1.6),
    follow(T.vOut, 8.6, 0, 1.4),
  ]
}

/** Every strike, both parts, show seconds on the recording. */
export const SNOW_HITS: number[] = [
  // The swell's downbeat: out of the dark into the snow's sky (the snow starts falling).
  T.in,
  // Down in the powder on the shoulder.
  T.land,
  // Over the cornice: Ariadne, Cobb (the chord), Fischer as Cobb lands.
  T.dropA,
  T.dropC,
  T.dropF,
  // The rock step over the fortress: Ariadne, Cobb (the chord), Fischer; Cobb lands, Fischer lands.
  T.j1 - (T.dropC - T.dropA),
  T.j1,
  T.j1 + (T.dropF - T.dropC),
  T.j1Land,
  // The guards come down hard on the face off the cornice; off the rock step; round the hairpin.
  ...GUARD_LAND,
  T.j1 + GUARD_SHIFT[0],
  GUARD_HAIR[0],
  // The hairpin: Ariadne's carve on the chord, Cobb's, Fischer's.
  T.h1 - (T.dropC - T.dropA),
  T.h1,
  // The crevasse: Ariadne, Cobb (the chord), Fischer; Cobb lands.
  T.j2 - (T.dropC - T.dropA),
  T.j2,
  T.j2Land,
  // The camera cuts back in as Fischer lands off the rock step and off the crevasse.
  T.cutJ1,
  T.cutJ2,
  // Pulled up on the ledge; the first guard into the crevasse, and down.
  T.stopA,
  T.stopC,
  GUARD_IN,
  GUARD_DOWN,
  // The gate goes up for Fischer.
  T.gate,
  // Cut to Mal as she brings the rifle up; her shot (Fischer goes down; Cobb leaps); cut back to Fischer going under.
  T.malCut,
  T.malBack,
  T.shot,
  // Cobb down on the apron; Ariadne after him, down.
  T.cLand3,
  T.aLeap,
  T.aLand3,
  // The case opens; the snow goes soft under them.
  T.case,
  T.sink,
  /* the vault */
  // Cobb comes up through the floor.
  T.cThrough,
  // The paddles; the wheel; the door rolls; open.
  T.paddles,
  T.wheel,
  T.door,
  T.doorOpen,
  // The pinwheel in the old man's last breath.
  T.pinwheel,
  // The charges; the fortress comes down, and the kick.
  T.charges,
  T.kick,
]
