import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, rail, roll, wait, type Lane, type Piece, type PieceCtx, type Pt } from '../../../parts'

/** Small, legible machines for the Sol one-shot shelves. Each plan owns its path,
 * including the change of floor. Drawings follow that same clock when scrubbed. */
export type Move = 'lift' | 'drop' | 'throw' | 'bounce' | 'detour' | 'hold' | 'coil' | 'stamp' | 'tilt'
export type Prop =
  | 'colander' | 'kettle' | 'rolling-pin' | 'opera-toaster' | 'ladle' | 'pepper-mill'
  | 'pancake' | 'ice-tray' | 'dish-rack' | 'corkscrew' | 'pressure-cooker' | 'egg-timer'
  | 'mixing-bowl' | 'spatula' | 'fridge' | 'juicer' | 'tea-strainer' | 'serving-hatch'
  | 'sandbag' | 'stage-trapdoor' | 'spotlight' | 'velvet-curtain' | 'fly-rail' | 'prop-cannon'
  | 'revolve' | 'stage-spring' | 'chandelier' | 'cue-lamp' | 'backdrop' | 'orchestra-pit'
  | 'false-door' | 'smoke-box' | 'applause' | 'megaphone' | 'mirror' | 'final-bow'

export interface MechanismSpec { name: Prop; move: Move; note: string; weight?: number; finale?: boolean }
interface State { color: string; other: string; prop: Prop; move: Move }
const A: Pt = [-0.5, 0]
const B: Pt = [1.5, 0]
const base = (y: number): Pt => [1.5, y]

function motion(move: Move): { lane: Lane; cells: Pt[]; exit: Pt; flight: boolean } {
  const normal: Pt[] = [[0, 0], [1, 0]]
  if (move === 'lift' || move === 'drop') {
    const y = move === 'lift' ? -1 : 1
    const at: Pt = [0.1, 0]
    const top: Pt = [0.1, y]
    return { lane: { segs: [roll(A, at), wait(at, .22), { from: at, to: top, dur: .64, ease: 'inout' }, roll(top, base(y))], fire: .22 + .6 / ROLL }, cells: [...normal, [0, y], [1, y]], exit: [2, y], flight: false }
  }
  if (move === 'throw') {
    const lip: Pt = [0.1, 0]
    const land: Pt = [1.15, -1]
    return { lane: { segs: [roll(A, lip), wait(lip, .26), fly(lip, land, .7, .92), roll(land, base(-1))], fire: .6 / ROLL + .26 }, cells: [...normal, [0, -1], [1, -1]], exit: [2, -1], flight: true }
  }
  if (move === 'bounce') {
    const at: Pt = [0.05, 0]
    const mid: Pt = [.66, 0]
    return { lane: { segs: [roll(A, at), fly(at, mid, .43, .72), fly(mid, [1.12, 0], .31, .34), roll([1.12, 0], B)], fire: .55 / ROLL }, cells: [...normal, [0, -1], [1, -1]], exit: [2, 0], flight: true }
  }
  if (move === 'detour') {
    const points: Pt[] = [[.42, 0], [.72, -.68], [.2, -.68], [1.12, -.28], B]
    return { lane: { segs: [roll(A, points[0]), ...points.slice(1).map((q, i) => roll(points[i], q, 2.1))], fire: .92 / ROLL }, cells: [...normal, [0, -1], [1, -1]], exit: [2, 0], flight: false }
  }
  if (move === 'coil') {
    const points: Pt[] = [[.05, 0], [.3, -.48], [.65, -.56], [.95, -.12], [.85, .38], [.4, .43], [.12, .12], [.8, -.25], [1.18, 0], B]
    return { lane: { segs: [roll(A, points[0]), ...points.slice(1).map((q, i) => roll(points[i], q, 2.5))], fire: .55 / ROLL }, cells: [...normal, [0, -1], [1, -1], [0, 1], [1, 1]], exit: [2, 0], flight: false }
  }
  if (move === 'tilt') {
    const points: Pt[] = [[.1, 0], [.6, .45], [1.05, -.35], B]
    return { lane: { segs: [roll(A, points[0]), wait(points[0], .24), ...points.slice(1).map((q, i) => roll(points[i], q, 2.6))], fire: .6 / ROLL + .24 }, cells: [...normal, [0, -1], [1, -1], [0, 1]], exit: [2, 0], flight: false }
  }
  const at: Pt = [.14, 0]
  return { lane: { segs: [roll(A, at), wait(at, move === 'hold' ? .6 : .3), roll(at, B, move === 'stamp' ? 3.7 : ROLL)], fire: .64 / ROLL + (move === 'hold' ? .6 : .3) }, cells: normal, exit: [2, 0], flight: false }
}

const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }

/** The prop is the visible cause. The ball never gets drawn here; the shared
 * show draws it on the declared lane. */
function drawProp(p: p5, s: State, c: PieceCtx): void {
  const { k, ink, bg, weight, since } = c
  const hit = smooth(since / .24)
  const liftProgress = smooth(since / .64)
  const shake = since > 0 ? Math.sin(since * 32) * Math.exp(-since * 8) * .045 : 0
  const x = .38 * k, y = .13 * k
  p.push(); p.translate(x, y)
  if(s.move==='lift') p.translate(0,-liftProgress*k)
  if(s.move==='drop') p.translate(0,liftProgress*k)
  if(s.move==='throw') p.rotate(-.13*hit+shake)
  if(s.move==='bounce') p.rotate(.14*Math.sin(Math.max(0,since)*15)*Math.exp(-Math.max(0,since)*3))
  if(s.move==='tilt') p.rotate(.4*hit)
  outline(p, ink, weight)
  const box = (w: number, h: number, fill = bg) => { solid(p, ink, weight, fill); p.rect(0, 0, w * k, h * k, .07 * k) }
  const dish = (w = .65) => { solid(p, ink, weight, s.color); p.arc(0, 0, w * k, .48 * k, 0, Math.PI, p.CHORD) }
  const wheel = (r = .24) => { solid(p, ink, weight, bg); p.circle(0, 0, r * 2 * k); p.line(-r * k, 0, r * k, 0); p.line(0, -r * k, 0, r * k) }
  switch (s.prop) {
    case 'colander': case 'tea-strainer': {
      dish(s.prop === 'colander' ? .85 : .56)
      p.line(-.53*k, -.06*k, -.33*k, -.06*k); p.line(.33*k, -.06*k, .53*k, -.06*k)
      for (const dx of [-.18, 0, .18]) p.circle(dx*k, .13*k, .05*k)
      break
    }
    case 'kettle': case 'pressure-cooker': {
      box(.65, .46, s.color); p.arc(-.35*k, -.02*k, .28*k, .29*k, -Math.PI/2, Math.PI/2)
      p.line(-.26*k, -.28*k, .26*k, -.28*k); p.arc(0, -.28*k, .43*k, .35*k, Math.PI, 0)
      if (hit) { outline(p, ink, weight); for (let i=0;i<3;i++) p.arc((.28+i*.09)*k, (-.4-i*.17-hit*.25)*k, .15*k, .16*k, 0, Math.PI) }
      break
    }
    case 'rolling-pin': case 'juicer': {
      p.push(); p.rotate(shake); box(.78, .24, s.color); p.line(-.56*k,0,-.39*k,0); p.line(.39*k,0,.56*k,0); p.pop()
      if (s.prop === 'juicer') p.line(-.26*k,.23*k,.26*k,.23*k)
      break
    }
    case 'opera-toaster': case 'fridge': case 'serving-hatch': {
      box(s.prop === 'fridge' ? .65 : .78, s.prop === 'fridge' ? .84 : .61, s.color)
      if (s.prop === 'opera-toaster') { p.line(-.27*k,-.27*k,.27*k,-.27*k); p.line(.28*k,.06*k,.38*k,.06*k) }
      if (s.prop === 'fridge') { p.line(-.31*k,0,.31*k,0); p.line(.24*k,-.3*k,.24*k,-.13*k) }
      if (s.prop === 'serving-hatch') { solid(p,ink,weight,bg); p.rect(0,(-.08-.32*hit)*k,.65*k,.16*k) }
      break
    }
    case 'ladle': case 'spatula': {
      p.push(); p.rotate(-.5*hit); p.line(-.4*k,.4*k,.24*k,-.37*k)
      if (s.prop === 'ladle') { solid(p,ink,weight,s.color); p.arc(.26*k,-.38*k,.34*k,.22*k,0,Math.PI,p.CHORD) }
      else { box(.35,.1,s.color) } p.pop(); break
    }
    case 'pepper-mill': case 'corkscrew': case 'egg-timer': {
      box(.34,.62,s.color); wheel(.12)
      if (s.prop === 'egg-timer') p.line(-.13*k,-.4*k,.13*k,-.4*k)
      else for (let j=0;j<3;j++) p.line(-.17*k,(j*.13-.25)*k,.17*k,(j*.13-.17)*k)
      break
    }
    case 'pancake': case 'ice-tray': case 'dish-rack': case 'mixing-bowl': {
      if (s.prop === 'pancake') { dish(.7); p.line(-.5*k,.12*k,.5*k,.12*k) }
      if (s.prop === 'ice-tray') { box(.83,.23,s.color); for(let j=-1;j<=1;j++) p.line(j*.22*k,-.11*k,j*.22*k,.11*k) }
      if (s.prop === 'dish-rack') { p.line(-.42*k,.25*k,.42*k,.25*k); for(let j=-1;j<=1;j++) p.arc(j*.22*k,-.03*k,.18*k,.47*k,Math.PI,0) }
      if (s.prop === 'mixing-bowl') { dish(.92); p.line(-.48*k,-.27*k,.25*k,.14*k) }
      break
    }
    case 'sandbag': case 'fly-rail': case 'chandelier': {
      p.line(0,-.68*k,0,-.18*k); dish(.53)
      if (s.prop === 'sandbag') { box(.46,.5,s.color); p.line(-.16*k,-.21*k,.16*k,.21*k) }
      if (s.prop === 'fly-rail') p.line(-.5*k,-.37*k,.5*k,-.37*k)
      if (s.prop === 'chandelier') for(let j=-1;j<=1;j++) p.circle(j*.22*k,-.06*k,.12*k)
      break
    }
    case 'stage-trapdoor': case 'backdrop': case 'false-door': case 'velvet-curtain': {
      if (s.prop === 'velvet-curtain') { for(let j=0;j<5;j++) { solid(p,ink,weight,s.color); p.rect((j-2)*.16*k,0,.14*k,.78*k) } }
      else { p.push(); p.rotate((s.prop === 'stage-trapdoor' ? .95 : -.55)*hit); box(.7,.72,s.color); p.pop() }
      break
    }
    case 'spotlight': case 'cue-lamp': case 'applause': {
      wheel(.17); p.line(.1*k,.12*k,.4*k,.4*k)
      solid(p,ink,weight,hit ? s.color : bg); p.circle(-.12*k,-.16*k,.22*k)
      if(s.prop==='applause') { p.rect(0,-.45*k,.72*k,.18*k); for(let j=-1;j<=1;j++) p.circle(j*.19*k,-.45*k,.035*k) }
      break
    }
    case 'prop-cannon': case 'smoke-box': case 'megaphone': {
      p.push(); p.rotate(-.2*hit); box(.7,.37,s.color); p.triangle(.28*k,-.19*k,.55*k,-.34*k,.55*k,.18*k); p.pop()
      if(s.prop==='prop-cannon') { p.push(); p.translate(-.19*k,.25*k); wheel(.19); p.pop() }
      if(hit) for(let j=0;j<3;j++) p.circle((.62+j*.16)*k,(-.1-j*.12)*k, .14*k)
      break
    }
    case 'revolve': case 'orchestra-pit': case 'stage-spring': case 'final-bow': {
      p.line(-.49*k,.2*k,.49*k,.2*k)
      if(s.prop==='revolve') wheel(.36)
      if(s.prop==='orchestra-pit') { dish(.8); for(let j=-1;j<=1;j++) p.line(j*.2*k,-.16*k,j*.2*k,-.46*k) }
      if(s.prop==='stage-spring') for(let j=0;j<4;j++) p.line((j%2 ? .15 : -.15)*k,(j*.11-.25)*k,(j%2 ? -.15 : .15)*k,((j+1)*.11-.25)*k)
      if(s.prop==='final-bow') {
        const bow=smooth(since/.42)
        p.push(); p.translate(0,-.13*k); p.rotate(.45*bow)
        p.circle(0,-.15*k,.25*k); p.line(0,0,.13*k,.35*k)
        p.line(0,.04*k,-.3*k,-.07*k); p.line(0,.04*k,.27*k,-.14*k)
        p.pop()
        for(let j=-2;j<=2;j++) { solid(p,ink,weight,s.color); p.circle(j*.18*k,.35*k,.085*k) }
      }
      break
    }
    case 'mirror': {
      box(.53,.75,s.color); solid(p,ink,weight,bg); p.ellipse(0,0,.39*k,.61*k); p.line(-.24*k,.42*k,.24*k,.42*k); break
    }
  }
  p.pop()
}

export function makeMechanism(spec: MechanismSpec): Piece<State> {
  const plan = motion(spec.move)
  const dynamic = spec.move === 'stamp'
  return definePiece<State>({
    name: spec.name, weight: spec.finale ? 0 : spec.weight ?? 1, flight: plan.flight, dynamic, finale: spec.finale,
    place: ({ fits, color, theme, ball }) => {
      if (!fits(plan.cells, plan.exit)) return null
      const other = theme.colors.find((c) => c !== ball.color) ?? color
      return { cells: plan.cells, exit: { at: plan.exit, dir: 1 }, lane: plan.lane, state: { color, other, prop: spec.name, move: spec.move }, ...(dynamic ? { changes: [{ at: plan.lane.fire, color: other, over: .2 }] } : {}) }
    },
    draw: (p, s, c) => {
      const { k, ink, weight } = c
      // Entering and leaving rails bracket every gag. The middle is the moving apparatus.
      rail(p,k,ink,weight,-.5,-.12)
      const y = plan.exit[1]
      rail(p,k,ink,weight,s.move==='lift' || s.move==='drop' ? .1 : 1.14,1.5,y+FLOOR)
      outline(p,ink,weight)
      if (s.move === 'lift' || s.move === 'drop') {
        const rise = smooth(c.since/.64)
        const platform = y * rise
        solid(p,ink,weight,s.color)
        p.rect(.1*k,(platform+FLOOR+.045)*k,.57*k,.09*k,.015*k)
        outline(p,ink,weight)
        p.line(-.29*k,-.95*k,-.29*k,.98*k)
        p.line(.54*k,-.95*k,.54*k,.98*k)
        p.circle(.1*k,-.86*k,.18*k)
        if(s.prop==='sandbag') {
          // The bag descends exactly as the carriage climbs: one taut rope
          // over two pulleys, with the weight visible on the other end.
          const bagY=-.36+rise*.95
          p.line(.1*k,(platform-.02)*k,.1*k,-.86*k)
          p.line(.1*k,-.86*k,.83*k,-.86*k)
          p.circle(.83*k,-.86*k,.18*k)
          p.line(.83*k,-.86*k,.83*k,(bagY-.27)*k)
          solid(p,ink,weight,s.color)
          p.rect(.83*k,bagY*k,.42*k,.49*k,.1*k)
          outline(p,ink,weight)
          p.line(.68*k,(bagY-.2)*k,.98*k,(bagY+.2)*k)
        }
      } else if (s.move === 'detour' || s.move === 'coil' || s.move === 'tilt') {
        for (const seg of plan.lane.segs) if (seg.from[0] !== seg.to[0] || seg.from[1] !== seg.to[1]) p.line(seg.from[0]*k,(seg.from[1]+FLOOR)*k,seg.to[0]*k,(seg.to[1]+FLOOR)*k)
      } else if (s.move === 'hold' || s.move === 'stamp') {
        p.line(-.12*k,FLOOR*k,1.5*k,FLOOR*k)
        const press = Math.max(0,Math.min(1,c.since/.16))
        p.line(.16*k,(-.47+press*.3)*k,.16*k,(-.28+press*.3)*k)
      } else {
        p.line(-.12*k,FLOOR*k,.14*k,FLOOR*k)
        if (s.move !== 'throw') p.line(.92*k,FLOOR*k,1.5*k,FLOOR*k)
      }
      if(s.prop!=='sandbag') drawProp(p,s,c)
    },
  })
}
