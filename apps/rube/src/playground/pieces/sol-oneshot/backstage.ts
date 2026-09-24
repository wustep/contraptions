import type { Theme } from '../../../../../../src/core/themes'
import type { World } from '../../../worlds'
import { newWorld, type Shelf } from '../../staging'
import { makeMechanism, type MechanismSpec } from './mechanism'
import { makeSolDoor, makeSolTrack, solDoorPlacement } from './termini'

/** The audience thinks the opera is on stage. The machine is behind it. */
export const backstageIdeas: readonly MechanismSpec[] = [
  { name: 'sandbag', move: 'lift', note: 'A falling sandbag is the visible counterweight that hoists the ball one floor.' },
  { name: 'stage-trapdoor', move: 'drop', note: 'The ball hits the mark; the trapdoor gives way and sends it to the pit.' },
  { name: 'spotlight', move: 'hold', note: 'The spotlight catches the ball and holds it in the beam until the cue.' },
  { name: 'velvet-curtain', move: 'detour', note: 'The curtain opens the wrong way, making the ball double back behind the velvet.' },
  { name: 'fly-rail', move: 'lift', note: 'The fly rail hauls a little platform into the flies with the ball aboard.' },
  { name: 'prop-cannon', move: 'throw', note: 'The harmless prop cannon still has enough spring to throw the ball above the scenery.' },
  { name: 'revolve', move: 'coil', note: 'The revolving stage carries the ball around a full turn before presenting the exit.' },
  { name: 'stage-spring', move: 'bounce', note: 'A spring under the floor gives the ball a high bounce and an embarrassed little aftershock.' },
  { name: 'chandelier', move: 'tilt', note: 'The chandelier rocks like a pendulum, catches the ball, and tilts it back toward the wing.' },
  { name: 'cue-lamp', move: 'hold', note: 'The red cue lamp keeps the ball waiting; green lights the release.' },
  { name: 'backdrop', move: 'drop', note: 'A painted backdrop falls flat, taking the ball to the lower stage.' },
  { name: 'orchestra-pit', move: 'bounce', note: 'The pit catches a fall and sends the ball back in two comic beats.' },
  { name: 'false-door', move: 'detour', note: 'The ball enters a false door, reverses behind the flat, and emerges from its own entrance.' },
  { name: 'smoke-box', move: 'throw', note: 'The smoke box coughs at exactly the wrong time and blows the ball across the fly space.' },
  { name: 'applause', move: 'stamp', note: 'The applause sign flips on, recolouring the ball for its encore.' },
  { name: 'megaphone', move: 'stamp', note: 'A stage manager barks into a megaphone and accelerates a ball in a new costume colour.' },
  { name: 'mirror', move: 'detour', note: 'The ball takes a reflected route behind the mirror and crosses its own lane.' },
  { name: 'final-bow', move: 'hold', finale: true, note: 'The ball hits the last mark. Footlights wake in a row while the tiny performer bows and the curtain waits for applause.' },
]

const palettes: Theme[] = [
  { name: 'sol-stage-rose', label: 'Footlights', bg: '#F3E8E0', ink: '#2E2230', colors: ['#B34148','#D5A53A','#3C7281','#725A92','#FEFAF3'], note: 'red velvet, brass and warm footlights' },
  { name: 'sol-stage-blue', label: 'Wings', bg: '#E5EAF0', ink: '#232A3D', colors: ['#C44F4D','#C49A38','#4A8492','#76669B','#FFF7E9'], note: 'painted flats and blue work lights' },
]

const stageRail = makeSolTrack('backstage')
const stageDoor = makeSolDoor('backstage')

export const backstageWorld: World = {
  name: 'sol-backstage', label: 'Backstage · Sol one-shot',
  note: 'Sol one-shot (GPT-6 Sol xhigh): scenery, ropes and missed cues turn one ball into the most overworked performer in the house.',
  themes: palettes, backdrops: ['rules','plain','dots'],
  tastes: { rehearsal: {}, flyspace: { sandbag: 2, 'fly-rail': 2, chandelier: 2 }, finale: { 'prop-cannon': 2, applause: 2, 'final-bow': 2 } },
  pieces: [stageRail, ...backstageIdeas.map(makeMechanism), stageDoor],
  portalPlacement: (kind, color) => solDoorPlacement('backstage', kind, color),
}

export const shelf: Shelf = newWorld(backstageWorld, { rail: 'A stage board on pegs and work lamps.', ...Object.fromEntries(backstageIdeas.map((idea) => [idea.name, `Sol one-shot: ${idea.note}`])) })
