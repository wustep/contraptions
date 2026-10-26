import { M, beat } from './music'

/**
 * When each scene has the stage, on the music (`music.ts`):
 *
 *     0       the deep desert   the chant: the harvester at work far off, two on the rock watching
 *    27.9     worm sign         the booms: the ground swells toward the harvester, a blow at a time
 *    44.5     the harvester     the great blows: the carryall, the sand going down, the mouth, swallowed
 *   104.1     the thumper       the drive: another day; he goes out and plants it, and it beats with the drum
 *   128.0     the ride          the run: the worm comes, the hooks, the climb, he stands
 *   164.6     the eclipse       the fall: he rides on into the west as the moon takes the sun; the colour goes
 *   186.0     the arena         Giedi Prime under its black sun: Feyd-Rautha, the prisoners, the ink in the sky
 *   262.8     the charge        the colour back with the storm: the worms out of it, the Emperor's ship
 *   314.0     after             the storm gone by; the end credits, and the quiet after the music
 */
export const T = {
  open: 0,
  sign: M.firstBoom,
  harvester: M.phrase1,
  thumper: M.drive,
  ride: beat('run', 0),
  eclipse: M.fall,
  arena: M.return,
  charge: M.charge,
  after: M.end,
} as const

/** The show's end: the music ends at 322.2, and the credits run on into the quiet. */
export const END = 347
