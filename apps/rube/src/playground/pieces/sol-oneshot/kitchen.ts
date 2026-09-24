import type { Theme } from '../../../../../../src/core/themes'
import type { World } from '../../../worlds'
import { newWorld, type Shelf } from '../../staging'
import { makeMechanism, type MechanismSpec } from './mechanism'
import { makeSolDoor, makeSolTrack, solDoorPlacement } from './termini'

/** An opera supper made by a kitchen with far too much machinery. */
export const kitchenIdeas: readonly MechanismSpec[] = [
  { name: 'colander', move: 'drop', note: 'The ball fills a colander; its perforated bowl tips and drains it to the lower counter.' },
  { name: 'kettle', move: 'throw', note: 'A whistling kettle lifts its lid and blows the ball onto a shelf above.' },
  { name: 'rolling-pin', move: 'stamp', note: 'The pin squashes a painted ball between two handles and rolls out a new colour.' },
  { name: 'opera-toaster', move: 'throw', note: 'A lever trips, the toast pops, and the ball takes the toast route upstairs.' },
  { name: 'ladle', move: 'lift', note: 'A soup ladle scoops the ball off the counter and pours it one shelf higher.' },
  { name: 'pepper-mill', move: 'coil', note: 'The ball threads a pepper mill in a ridiculous spiral before leaving the grinder.' },
  { name: 'pancake', move: 'bounce', note: 'A frying pan flips the ball twice, the second hop shorter than the first.' },
  { name: 'ice-tray', move: 'drop', note: 'The ice tray cracks at its hinge and drops the ball through a freezer shelf.' },
  { name: 'dish-rack', move: 'detour', note: 'Plates make a wrong-way rack; the ball doubles back between them, then finds the outlet.' },
  { name: 'corkscrew', move: 'lift', note: 'A corkscrew winds a tray upward and leaves the ball at the upper counter.' },
  { name: 'pressure-cooker', move: 'throw', note: 'The pressure needle climbs, the lid lets go, and the ball flies to the top shelf.' },
  { name: 'egg-timer', move: 'hold', note: 'The sand runs out while the ball waits on the bell. The bell finally releases it.' },
  { name: 'mixing-bowl', move: 'coil', note: 'The bowl whirls the ball around its rim, then pours it through the spout.' },
  { name: 'spatula', move: 'bounce', note: 'A spatula makes an overconfident flip, then a smaller corrective tap.' },
  { name: 'fridge', move: 'detour', note: 'The ball takes the cold aisle, reverses behind the door, and comes out the wrong side.' },
  { name: 'juicer', move: 'stamp', note: 'A citrus press squeezes a new colour into the ball and shoots it onward.' },
  { name: 'tea-strainer', move: 'tilt', note: 'A tiny strainer cannot hold the ball; it tips, catches it once, then spills it.' },
  { name: 'serving-hatch', move: 'lift', note: 'The banquet hatch rises like a dumbwaiter and serves the ball upstairs.' },
]

const palettes: Theme[] = [
  { name: 'sol-kitchen-cream', label: 'Supper', bg: '#F7EEDC', ink: '#312823', colors: ['#DA553C','#397D78','#EAB343','#644681','#FAFBF5'], note: 'cream enamel, copper and bottle glass' },
  { name: 'sol-kitchen-mint', label: 'Pantry', bg: '#E3F0E7', ink: '#24332C', colors: ['#D86F42','#348F83','#D5A62D','#775A94','#FFF9E9'], note: 'mint tile and warm brass' },
]

const kitchenRail = makeSolTrack('kitchen')
const kitchenDoor = makeSolDoor('kitchen')

export const kitchenWorld: World = {
  name: 'sol-kitchen', label: 'Kitchen · Sol one-shot',
  note: 'Sol one-shot (GPT-6 Sol xhigh): an opera supper whose tools keep stealing the ball, changing floors and missing their cues.',
  themes: palettes, backdrops: ['rules','plain','dots'],
  tastes: { supper: {}, pressure: { kettle: 2, 'opera-toaster': 2, 'pressure-cooker': 2 }, afters: { pancake: 2, spatula: 2, 'egg-timer': 2 } },
  pieces: [kitchenRail, ...kitchenIdeas.map(makeMechanism), kitchenDoor],
  portalPlacement: (kind, color) => solDoorPlacement('kitchen', kind, color),
}

export const shelf: Shelf = newWorld(kitchenWorld, { rail: 'A tile counter with spoons and jars between the machines.', ...Object.fromEntries(kitchenIdeas.map((idea) => [idea.name, `Sol one-shot: ${idea.note}`])) })
