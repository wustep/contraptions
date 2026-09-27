import { box, scenery, type Company } from '../kit'
import { NEEDLE, PULLED } from './geo'
import { drawTower, drawTowerOver } from './tower-draw'
import { HANSEL_FROM, HANSEL_HITS, HANSEL_TO, hanselAt } from './tower-plan'

/**
 * The DJ's tower at Derelicte (the TOWER builder's): the scaffold in the front row's back corner, its booth on top
 * (a turntable, a mixer, a stack of speakers, a lamp, and the power, plugged in at `PLUG` with its heavy lead up to
 * the rig in the roof), and Hansel's way up it and down again (`TOWER_COMPANY`, in the runway part's frame). The score
 * stands `towerSet` at `DERELICTE_AT` and hands it show time; the runway part puts `TOWER_COMPANY` in its build.
 *
 *   116.820  the needle drops on the record; the booth's lamp comes up; the speakers and the sub start to breathe
 *   133.463  Hansel in from the right, out of shot, on the surge; at the tower's foot on the ride (137.625)
 *   139.169  he sees Derek marching: a start
 *   156.341  up: into the shaft's foot, onto the sub, bounced by the song a beat a bounce; its kick (160.503) throws
 *            him up the shaft to the second lift; up the rails; across onto the shaft's top rail
 *   168.815  the rail gives as he gathers to leap for the booth: he falls the whole shaft back onto the sub (169.860)
 *   170.899  the sub throws him again on the rock's downbeat; up the rails on the rock's hard beats; a dart into the
 *            booth (179.218)
 *   180.245  he tugs on the plug on the rock's last hard beats; winds back into it on the shout (182.324)
 *   182.817  the plug torn out: the lamp out, the platter running down, the speakers still; the lead whips and swings;
 *            he is thrown back to the deck's edge and teeters there through the silence
 *   191.687  the band back, he goes along the booth into the bucket, and rides it down; it lands as the bag of sand
 *            hits the wheel (193.254); out onto the floor (193.777); to Derek, beside him from 197.933
 */
export const TOWER_CELLS = box(24, -10, 32, 3, 1)

export const towerSet = scenery<null>({
  name: 'tower-set',
  draw: (p, _s, c) => drawTower(p, c),
  over: (p, _s, c) => drawTowerOver(p, c),
})

export const TOWER_COMPANY: Company[] = [
  {
    who: 'hansel',
    from: HANSEL_FROM,
    to: HANSEL_TO,
    at: (t) => hanselAt(t),
  },
]

/** The needle, Hansel's every landing and launch, and the plug. */
export const TOWER_HITS: number[] = [...new Set([NEEDLE, ...HANSEL_HITS, PULLED])].sort((a, b) => a - b)
