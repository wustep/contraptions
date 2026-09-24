import recording from '../../../../../../docs/promo/carmen-prelude-musopen.ogg'
import attacks from '../../../../../../scripts/show-plans/carmen-sol-onsets.json'
import { Show, type ShowPoint } from '../../../show'
import type { World } from '../../../worlds'
import { loadShelf } from '../../../playground/staging'
import type { Framing, Performance } from '../../registry'
import { musicTimeOf, timeMap, type Knot } from '../../timemap'

/** Five changes in the recording's texture, read from the Musopen performance.
 * The opening bustle yields to a soft passage at 29.3, returns at 44.8,
 * drops almost to a whisper at 60.7, and builds into the final march at 84.6. */
export const sections = [0, 29.304, 44.8, 60.7, 84.614, 101.7, 125.052] as const
export const sectionNames = ['Supper rush', 'First cue', 'Wrong entrance', 'In the wings', 'Dress rehearsal', 'Opening night'] as const
const indices = [0, 3, 4, 6, 8, 10, 12] as const
const cast = ['sol-kitchen', 'sol-backstage', 'sol-kitchen', 'sol-backstage', 'sol-kitchen', 'sol-backstage'] as const
const keyed = new Set(['kettle','pressure-cooker','opera-toaster','pancake','spatula','juicer','rolling-pin','sandbag','prop-cannon','smoke-box','applause','stage-spring','stage-trapdoor','backdrop','final-bow','fly-rail'])

interface Cue { piece: string; section: string; at: number; native: number; strength: number }

export class CarmenShow extends Show {
  readonly knots: Knot[]
  readonly cues: Cue[]
  readonly nativeSections: number[]
  readonly closing: { at: number; native: number; x: number; y: number }
  private readonly clock: (t: number) => number

  constructor(private readonly stages: readonly World[]) {
    super('carmen-sol-one-shot')
    this.nativeSections = indices.map((n) => super.begin(n))
    const knots: Knot[] = sections.map((at, i) => ({ at, native: this.nativeSections[i] }))
    const cues: Cue[] = []
    const hits = attacks.attacks as [number, number][]
    for (let section = 0; section < 6; section++) {
      const at0 = sections[section], at1 = sections[section + 1]
      const n0 = this.nativeSections[section], n1 = this.nativeSections[section + 1]
      const players = [] as { name: string; native: number; priority: number }[]
      for (let i = indices[section]; i < indices[section + 1]; i++) {
        const u = super.universe(i), begin = super.begin(i)
        for (const p of u.pieces) {
          if (p.piece.name === 'rail' || p.piece.name === 'portal') continue
          const native = begin + p.start + p.lane.fire
          players.push({ name: p.piece.name, native, priority: keyed.has(p.piece.name) ? 2 : p.piece.flight ? 1 : 0 })
        }
      }
      // Measured attacks are candidates, not a metronome. Keep only hits whose
      // ball event is already close, then guard the speed on either side.
      const candidates = players.filter((p) => p.priority).flatMap((player) => {
        const estimate = at0 + (player.native-n0) * (at1-at0)/(n1-n0)
        return hits.filter(([at]) => at > at0+.55 && at < at1-.55 && Math.abs(at-estimate)<.5)
          .map(([at,strength]) => ({ player, at, strength, error: Math.abs(at-estimate) }))
      }).sort((a,b) => b.player.priority-a.player.priority || b.strength-a.strength || a.error-b.error)
      let count = 0
      for (const { player, at, strength } of candidates) {
        if (count >= Math.round((at1-at0)/2.7)) break
        if (cues.some((cue) => Math.abs(cue.at-at)<.8 || Math.abs(cue.native-player.native)<.65)) continue
        const previous = [...knots].filter((k) => k.at < at).sort((a,b) => b.at-a.at)[0]
        const next = [...knots].filter((k) => k.at > at).sort((a,b) => a.at-b.at)[0]
        if (!previous || !next || player.native <= previous.native || player.native >= next.native) continue
        const left = (player.native-previous.native)/(at-previous.at)
        const right = (next.native-player.native)/(next.at-at)
        if (left < .62 || left > 1.58 || right < .62 || right > 1.58) continue
        knots.push({ at, native: player.native })
        cues.push({ piece: player.name, section: sectionNames[section], at, native: player.native, strength })
        count++
      }
    }
    this.knots = knots.sort((a,b) => a.at-b.at)
    this.cues = cues.sort((a,b) => a.at-b.at)
    this.clock = timeMap(this.knots)
    const bow = super.universe(11).pieces.find((p) => p.piece.name === 'final-bow')
    if (!bow) throw new Error('The Carmen finale has no curtain call')
    const native = super.begin(11) + bow.start + bow.lane.fire
    this.closing = {
      at: musicTimeOf(this.clock, native, sections[5], sections[6]), native,
      x: bow.col + bow.mirror*.36, y: bow.row-.25,
    }
  }

  override worldAt(index: number): World {
    const found = indices.findIndex((_,i) => i < 6 && index < indices[i+1])
    const section = found < 0 ? 5 : found
    return this.stages[section]
  }

  override at(time: number): ShowPoint {
    // The last chord gets a held bow, instead of sending the performer into
    // another portal after the music has finished speaking.
    const native = this.clock(Math.max(0,Math.min(125.052,time)))
    return super.at(Math.min(this.closing.native+.3,native))
  }
  nativeAt(time: number): number { return this.clock(time) }
}

const ease = (u: number) => { const x=Math.max(0,Math.min(1,u)); return x*x*(3-2*x) }
export function camera(show: CarmenShow, t: number): Framing {
  const now = show.at(t), soon = show.at(Math.min(125.052,t+.38))
  const section = Math.max(0,sections.findIndex((_,i) => i<6 && t<sections[i+1]))
  const quiet = section===3
  const cells = quiet ? 6.1 : section===5 ? 4.35 : 4.65
  const lead = now.universe===soon.universe ? .42 : 0
  const look = ease(lead)
  const settle = ease((t-show.closing.at+.15)/.58)
  const followX = now.x + (soon.x-now.x)*look + .65
  const followY = now.y + (soon.y-now.y)*look - .13
  return { x: followX+(show.closing.x-followX)*settle, y: followY+(show.closing.y-followY)*settle, cells: cells*(1-settle)+4.8*settle }
}

export async function loadPerformance(): Promise<Performance> {
  const kitchen = await loadShelf('sol-kitchen')
  const backstage = await loadShelf('sol-backstage')
  if (!kitchen || !backstage) throw new Error('Sol one-shot worlds did not load')
  const stages = cast.map((name) => name === 'sol-kitchen' ? kitchen.world : backstage.world)
  const show = new CarmenShow(stages)
  return {
    show, duration: 125.052, camera: (t) => camera(show, t),
    chapter: (t) => {
      const found = sections.findIndex((_,i) => i<6 && t<sections[i+1])
      const at = found < 0 ? 5 : found
      return `Sol one-shot · ${at+1}/6 · ${sectionNames[at]}`
    },
    soundtrack: {
      src: recording, offset: 0,
      credit: 'Georges Bizet · Carmen, Prelude to Act I · Musopen recording · CC0',
      href: 'https://commons.wikimedia.org/wiki/File:Carmen_-_Prelude_to_Act_1.ogg',
    },
  }
}
