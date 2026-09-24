import { outline, solid } from '../../../../../../src/core/draw'
import { ROLL, definePiece, rail, roll, type Piece, type Placement, type Pt } from '../../../parts'

type Venue = 'kitchen' | 'backstage'
interface DoorState { kind: 'in' | 'out'; color: string; venue: Venue }
interface TrackState { color: string; mark: number }

/** The kitchen's pass and the stage's wing are their own doors, including
 * their ball paths. Other worlds keep their own existing entrances. */
export function solDoorPlacement(venue: Venue, kind: 'in' | 'out', color: string): Placement<DoorState> {
  const inDoor: Pt = [-.26, -.18], outDoor: Pt = [.26, -.18]
  const segs = kind === 'in'
    ? [{ from: inDoor, to: [.04, 0] as Pt, dur: .44, ease: 'out' as const, portal: 'in' as const }, roll([.04, 0], [.5, 0])]
    : [roll([-.5, 0], [-.04, 0]), { from: [-.04, 0] as Pt, to: outDoor, dur: .44, ease: 'in' as const, portal: 'out' as const }]
  return { cells: [[0,0]], exit: { at: [1,0], dir: 1 }, lane: { segs, fire: kind === 'in' ? 0 : .46/ROLL }, state: { venue, kind, color } }
}

export function makeSolDoor(venue: Venue): Piece<DoorState> {
  return definePiece<DoorState>({
    name: 'portal', weight: 0, place: () => null,
    draw: (p,s,c) => {
      const { k, ink, bg, weight, since } = c
      const x = s.kind === 'in' ? -.14 : .14
      const awake = Math.max(0,Math.min(1,s.kind === 'in' ? 1-c.t/.8 : (since+.5)/.5))
      if(s.kind==='in') rail(p,k,ink,weight,.1,.5)
      else rail(p,k,ink,weight,-.5,-.1)
      outline(p,ink,weight)
      if(venue==='kitchen') {
        // A dumbwaiter hatch with a rolling shutter. Its slats bunch over the ball.
        solid(p,ink,weight,s.color)
        p.rect(x*k,-.15*k,.64*k,.69*k,.06*k)
        solid(p,ink,weight,bg)
        p.rect(x*k,-.14*k,.48*k,.5*k,.035*k)
        const slats = 4
        for(let i=0;i<slats;i++) {
          const high = -.36+i*.11
          const raised = high-(1-awake)*.44
          if(raised<-.46) continue
          solid(p,ink,weight,s.color)
          p.rect(x*k,raised*k,.46*k,.095*k,.015*k)
        }
        solid(p,ink,weight,ink)
        p.circle((x+.22)*k,-.12*k,.055*k)
        p.line(x*k,.2*k,x*k,.5*k)
        p.line((x-.25)*k,.5*k,(x+.25)*k,.5*k)
      } else {
        // The wing: two curtain leaves slide sideways under a lit arch.
        p.noFill(); p.arc(x*k,-.14*k,.7*k,.79*k,Math.PI,0)
        p.line((x-.35)*k,-.14*k,(x-.35)*k,.48*k)
        p.line((x+.35)*k,-.14*k,(x+.35)*k,.48*k)
        p.line((x-.43)*k,.48*k,(x+.43)*k,.48*k)
        for(const side of [-1,1]) {
          const spread = .06+.19*awake
          solid(p,ink,weight,s.color)
          p.rect((x+side*(.18+spread/2))*k,.1*k,(.34-spread)*k,.58*k,.025*k)
          outline(p,ink,weight)
          for(let j=0;j<3;j++) p.line((x+side*(.11+spread+j*.055))*k,-.17*k,(x+side*(.11+spread+j*.055))*k,.35*k)
        }
        solid(p,ink,weight,s.color)
        for(let i=-2;i<=2;i++) p.circle((x+i*.15)*k,-.48*k,.045*k)
      }
    },
  })
}

/** One cell of the world's own track. A kitchen counter has tile and a
 * backsplash; backstage has sprung boards, pegs and footlights. */
export function makeSolTrack(venue: Venue): Piece<TrackState> {
  return definePiece<TrackState>({
    name: 'rail', weight: 1.4,
    place: ({ rng, color, fits }) => fits([[0,0]],[1,0])
      ? { cells: [[0,0]], exit: { at: [1,0], dir: 1 }, lane: { segs: [roll([-.5,0],[.5,0])], fire: .5/ROLL }, state: { color, mark: rng.int(0,3) } }
      : null,
    draw: (p,s,c) => {
      const { k, ink, bg, weight } = c
      rail(p,k,ink,weight,-.5,.5)
      outline(p,ink,weight)
      if(venue==='kitchen') {
        p.line(-.5*k,.49*k,.5*k,.49*k)
        for(const x of [-.28,.12,.43]) p.line(x*k,.49*k,x*k,.57*k)
        if(s.mark===0) { solid(p,ink,weight,s.color); p.rect(.15*k,.34*k,.29*k,.27*k,.04*k); p.line(.04*k,.22*k,.26*k,.22*k) }
        if(s.mark===1) { p.line(-.26*k,.25*k,.19*k,.39*k); p.ellipse(-.28*k,.24*k,.2*k,.1*k) }
        if(s.mark===2) { solid(p,ink,weight,bg); p.ellipse(.2*k,.35*k,.36*k,.13*k) }
      } else {
        p.line(-.5*k,.4*k,.5*k,.4*k)
        for(const x of [-.35,.12]) { p.line(x*k,.4*k,x*k,.55*k); p.line((x-.07)*k,.55*k,(x+.07)*k,.55*k) }
        if(s.mark===0) { solid(p,ink,weight,s.color); p.circle(.05*k,.36*k,.13*k) }
        if(s.mark===1) { p.line(.18*k,.4*k,.18*k,.18*k); p.line(.03*k,.18*k,.33*k,.18*k) }
        if(s.mark===2) { p.line(-.31*k,.25*k,.3*k,.25*k); p.line(-.21*k,.25*k,-.21*k,.4*k); p.line(.21*k,.25*k,.21*k,.4*k) }
      }
    },
  })
}
