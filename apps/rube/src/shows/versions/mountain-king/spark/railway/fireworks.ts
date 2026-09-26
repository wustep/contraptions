import type { Seg } from '../../../../../parts'
import { box, carried, frame, part, type PartShot } from '../kit'
import { CODA, ROLL } from '../music'
import {
  APEX,
  BACKBEATS,
  BURSTS,
  CRACKLE,
  CRASH,
  CRASH_AT,
  DART_END,
  DIVE,
  DOWN,
  DRIVERS_AT,
  FLING,
  GERB_AT,
  GY,
  HAMMERS,
  HANG,
  IN,
  LAND_AT,
  LEADER_AT,
  LEADER_FOOT,
  LIP,
  OUT,
  PIECES,
  PUFFS,
  REST,
  RISES,
  sparkAt,
  SURGE_AT,
  TITAN_BURST,
  TITAN_FIRE,
  TITAN_X,
  UNIT_AT,
  WHEEL,
  WHEEL_AT,
} from './fireworks-plan'
import {
  additive,
  drawAsh,
  drawBattery,
  drawBurst,
  drawCrackle,
  drawCrate,
  drawCrateFire,
  drawCurtain,
  drawDriverFire,
  drawEmbers,
  drawFountain,
  drawGerb,
  drawGround,
  drawMatch,
  drawMoonSmoke,
  drawPuff,
  drawRacks,
  drawRise,
  drawSaluteRack,
  drawTitan,
  drawTitanFire,
  drawWash,
  drawWheel,
  drawWire,
  lightsAt,
  type Pen,
} from './fireworks-draw'

/**
 * FIREWORKS: the festival, the finale, the silence (124.010 → 148.330). See `fireworks-plan.ts` for every time and
 * place, `fireworks-draw.ts` for every drawing.
 *
 * The express brakes at the end of the line and throws the spark off its front, over the terminus wall, down onto
 * the festival's launch field by the river. It runs the quick-match along the racks, and each rack's tubes go up
 * under it on a backbeat (one comet, two, three, four); a gerb's fountain lifts it onto the Niagara wire, and every
 * backbeat of the last phrase lights the next length of the falling curtain behind it. Off the wire's end it comes
 * down on the finale's master fuse on the coda's first chord: the crash. The mines go up, the battery fires down the
 * coda (each shell bursting about 0.95 s after it leaves, so every chord is a gun or a burst), the great wheel takes
 * the spark round as its drivers catch in the crescendo and flings it to the Titan, whose leader it burns up in the
 * second crescendo; into the Titan, up on its shell, and out into the heart of the biggest burst of the show. Down
 * through the salute barrage on the hammer blows into the ash by a burning crate; all but out in the silence; and on
 * the roll it flares and darts up and left into the crate's fire, the first door home.
 */

/** Every strike (show seconds), as the audience sees it. */
export const FIREWORKS_HITS: number[] = [
  // The racks: it lands on the first, and each rack's tubes fire under it as it crosses (124.983 … 126.883).
  ...BACKBEATS.slice(1, 5),
  // The gerb erupts under it, and surges.
  GERB_AT,
  SURGE_AT,
  // The Niagara, a length a backbeat (128.802 … 133.674).
  ...UNIT_AT,
  // The coda: the crash and every chord after it, launch or burst (the heavy ones all), the drivers catching in the
  // crescendo, the fling, the leader, the dive, the Titan, its burst, its crackle, and the salutes.
  ...CODA.slice(0, 17).map((c) => c.t).filter((t) => t !== CODA[11].t),
  ...DRIVERS_AT.slice(4, 9),
  ...HAMMERS,
  // The roll: it flares, and goes.
  ROLL,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

interface FireworksState {
  begin: number
}

export const fireworks = part<FireworksState>(
  {
    name: 'fireworks',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const pen: Pen = { p, k: c.k, ctx: p.drawingContext as CanvasRenderingContext2D, t, f: frame(p, c.k) }
      const L = lightsAt(t)
      pen.ctx.save()
      drawGround(pen, L)
      for (const q of PUFFS) if (q.y < GY - 2.2) drawPuff(pen, L, q)
      drawMoonSmoke(pen)
      additive(pen, () => {
        for (const r of RISES) drawRise(pen, r)
        for (const b of BURSTS) if (b.kind !== 'mine') drawBurst(pen, b)
        drawCrackle(pen, CRACKLE)
      })
      drawWire(pen, L)
      drawRacks(pen, L)
      drawMatch(pen)
      drawGerb(pen, L)
      drawBattery(pen, L)
      drawWheel(pen, L)
      drawTitan(pen, L)
      drawSaluteRack(pen, L)
      drawCrate(pen, L)
      drawAsh(pen)
      additive(pen, () => {
        drawCurtain(pen)
        drawFountain(pen)
        drawDriverFire(pen)
        for (const b of BURSTS) if (b.kind === 'mine') drawBurst(pen, b)
      })
      drawTitanFire(pen)
      drawCrateFire(pen)
      for (const q of PUFFS) if (q.y >= GY - 2.2) drawPuff(pen, L, q)
      drawEmbers(pen)
      pen.ctx.restore()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      const pen: Pen = { p, k: c.k, ctx: p.drawingContext as CanvasRenderingContext2D, t, f: frame(p, c.k) }
      pen.ctx.save()
      drawWash(pen)
      pen.ctx.restore()
    },
  },
  (slot) => {
    const segs: Seg[] = []
    for (const pc of PIECES) {
      const a = pc.a - slot.begin
      const b = pc.b - slot.begin
      if (b <= a) continue
      if (pc.ramp) {
        segs.push({ from: pc.at(pc.a), to: pc.at(pc.b), dur: b - a, ramp: pc.ramp })
        continue
      }
      const p0 = pc.at(pc.a)
      const p1 = pc.at(pc.b)
      const pm = pc.at((pc.a + pc.b) / 2)
      const still = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) < 1e-9 && Math.hypot(pm[0] - p0[0], pm[1] - p0[1]) < 1e-9
      const n = still ? 1 : Math.max(2, Math.ceil((b - a) * 90))
      segs.push(...carried((u) => pc.at(u + slot.begin), a, b, n, pc.hidden))
    }
    return {
      cells: box(-1, -16, 62, 9, 2),
      exit: [DART_END[0] + 0.5, DART_END[1]],
      lane: { segs, fire: LAND_AT - slot.begin },
      state: { begin: slot.begin },
    }
  },
  (slot) => {
    const shots: PartShot[] = [
      // Thrown off the engine and down: the camera leads it down to the field.
      { t: IN + 0.55, cells: 7.0, off: [0.8, 0.3] },
      // Along the racks, room above for the comets.
      { t: 125.3, cells: 7.2, off: [1.1, -1.7] },
      { t: 126.9, cells: 7.6, off: [1.0, -1.85] },
      // Up on the gerb.
      { t: SURGE_AT, cells: 8.0, off: [0.8, -0.3] },
      // Along the wire, close, the curtain pouring under it and catching a length a backbeat.
      { t: UNIT_AT[0] + 0.1, cells: 7.2, off: [1.5, 1.2] },
      { t: UNIT_AT[5], cells: 7.4, off: [1.7, 1.3] },
      // Pulling back over the last bars to show the whole curtain falling, and the finale waiting beyond it.
      { t: UNIT_AT[8] - 0.1, cells: 10.6, hold: [(HANG[0] + HANG[8]) / 2 + 4.4, GY - 3.9], w: 0.6 },
      // The crash, and out for the finale over the battery and the wheel.
      { t: CRASH, cells: 10, hold: [CRASH_AT[0] + 2.2, GY - 3.2], w: 0.75 },
      { t: WHEEL_AT, cells: 11.5, hold: [WHEEL[0] - 2.6, GY - 4.6], w: 0.9 },
      { t: 137.6, cells: 11, hold: [WHEEL[0] - 1.0, GY - 4.6], w: 0.9 },
      { t: FLING, cells: 11, hold: [WHEEL[0] + 2.2, GY - 4.4], w: 0.85 },
      // To the Titan, and in close for the climb up its leader.
      { t: LEADER_AT, cells: 10.5, hold: [LEADER_FOOT[0] - 2.2, GY - 3.2], w: 0.85 },
      { t: 141.8, cells: 7.5, hold: [TITAN_X - 0.9, GY - 2.2], w: 0.8 },
      { t: DIVE - 0.1, cells: 6, hold: [TITAN_X - 0.5, LIP + 0.4], w: 0.7 },
      { t: TITAN_FIRE, cells: 6.8, hold: [TITAN_X, LIP - 0.6], w: 0.85 },
      // Up with it into the biggest burst of the show.
      { t: TITAN_BURST, cells: 14, hold: [TITAN_X + 0.4, APEX[1] + 2.4], w: 0.9 },
      // Down with it through the salutes, into the ash, and in close by the crate's fire.
      { t: 145.7, cells: 10, hold: [REST[0] - 0.9, GY - 3.3], w: 0.75 },
      { t: DOWN, cells: 5.6, hold: [REST[0] - 0.4, GY - 1.4], w: 0.7 },
      { t: 147.3, cells: 3.9, hold: [REST[0] - 0.35, GY - 0.8], w: 0.85 },
      { t: ROLL, cells: 2.9, hold: [REST[0] - 0.3, GY - 0.6], w: 0.9 },
      // The door: close on the spark, the crate's fire filling the frame.
      { t: OUT, cells: 2.4, hold: sparkAt(OUT), w: 1 },
    ]
    return shots.filter((k) => k.t > slot.begin + 0.39 && k.t <= slot.end + 1e-6)
  },
)
