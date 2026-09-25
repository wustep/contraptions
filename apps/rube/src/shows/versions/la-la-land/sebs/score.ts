import type { Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { box, lay, standing } from './kit'
import { AT, DURATION, dream } from './music'
import { SebsShow, type Stage } from './show'
import { covers, type Cover } from './transitions'
import { CLUB, CLUB_MAT, DRIVE, GLOBE, LIPTONS, MOVIE, NIGHT, SEB, SEBS, SHADOW, STUDIO, STUDIO_MAT, THEATRE, THEATRE_MAT } from './worlds'
import { city } from './city'
import { clubRoom, DOOR } from './club/room'
import { opening } from './club/opening'
import { finale } from './club/finale'
import { liptonsRoom } from './liptons/room'
import { kiss } from './liptons/kiss'
import { theatre } from './theatre/theatre'
import { studio } from './studio/studio'
import { hollywood } from './studio/hollywood'
import { shadow } from './audition/shadow'
import { globe } from './audition/globe'
import { jazz } from './paris/jazz'
import { trumpet } from './paris/trumpet'
import { painted } from './night/painted'
import { stars } from './night/stars'
import { movie } from './movie/movie'
import { drive } from './movie/drive'

/**
 * The whole show, in order: who has the ball from when to when, and where
 * the stage changes place. Every part is told its slot and builds to it;
 * this file only says the order, the seams and the covers, which are all on
 * the music.
 *
 *   0        Seb's, now: the city, the club, the piano (the theme, rubato)
 *   39.65    under a closing spotlight the room becomes Lipton's, at Christmas: the dream
 *   61.78    the hush; 65.52 the kiss; the dream's 128 bpm
 *   90.21    a curtain: her show, and a full house
 *   133.35   white: the studio; 143.64 the painted Hollywood number
 *   172      dark: the audition, in shadow
 *   196      dark: the globe, and a little plane to Paris
 *   214.88   a red door: the Paris club (122.8 bpm); 239.44 the trumpet, alone
 *   269      an iris: painted Paris, the waltz; 297.33 the stars
 *   340.5    dark: the home movie
 *   395.3    dark: the drive, and the walk to the club
 *   423.4    through the door: Seb's, the dream's last room, and then the room as it is
 *   453.73   the last chord; the door, the look, the nod; 464 The End; 478.05 the band, and the city
 */

/** Where the stage changes place: each is a seam between parts, and each falls inside a cover. */
export const SWITCH = {
  liptons: AT.liptons,
  theatre: dream(51),
  studio: AT.studio,
  shadow: 172,
  globe: 196,
  club: AT.jazz,
  night: 269,
  // The onset the stars come in on.
  stars: 297.332,
  movie: 340.5,
  drive: 395.3,
  finale: 423.4,
}

export function compose(): { show: SebsShow; camera: (t: number) => Framing; covers: Cover[] } {
  const start = { col: 0, row: 0, begin: 0, ball: { color: SEB, ghost: false, id: 0 } }
  const dreamChain = lay(start, [
    { part: opening, end: AT.hush },
    { part: kiss, end: SWITCH.theatre },
    { part: theatre, end: SWITCH.studio },
    { part: studio, end: AT.hollywood },
    { part: hollywood, end: SWITCH.shadow },
    { part: shadow, end: SWITCH.globe },
    { part: globe, end: SWITCH.club },
    { part: jazz, end: AT.trumpet },
    { part: trumpet, end: SWITCH.night },
    { part: painted, end: SWITCH.stars },
    { part: stars, end: SWITCH.movie },
    { part: movie, end: SWITCH.drive },
    { part: drive, end: SWITCH.finale },
    { part: finale, end: DURATION },
  ])
  const P = dreamChain.placed
  const [pOpening, pKiss, pTheatre, pStudio, pHolly, pShadow, pGlobe, pJazz, pTrumpet, pPainted, pStars, pMovie, pDrive, pFinale] = P

  // The piano at the start is the opening part's own origin; the same room at the end stands where its door is.
  const piano0: Pt = [pOpening.col, pOpening.row]
  const piano1: Pt = [pFinale.col - DOOR[0], pFinale.row - DOOR[1]]
  const around = (at: Pt, x0: number, y0: number, x1: number, y1: number) => box(at[0] + x0, at[1] + y0, at[0] + x1, at[1] + y1, 2)
  const cityCells = (at: Pt) => around(at, -60, -40, 60, 14)

  const show0 = (): SebsShow => show
  const where = (t: number): Pt => show0().where(t)
  const coverList: Cover[] = [
    // Seb's to Lipton's: the stage light closes down on the keys, and opens again on a warmer room.
    { kind: 'iris', down: [37.9, 39.35], up: [39.95, 41.9], from: (t) => [where(t)[0], where(t)[1] - 0.25], to: (t) => [where(t)[0], where(t)[1] - 0.25], r0: 1.1, r1: 1.1 },
    // Lipton's to the theatre: velvet.
    { kind: 'curtain', down: [dream(49), dream(50.5)], up: [dream(51.5), dream(53)], color: THEATRE_MAT.velvet, deep: THEATRE_MAT.velvetDeep, gold: THEATRE_MAT.gold },
    // The theatre to the studio: the house goes to white.
    { kind: 'black', down: [SWITCH.studio - 0.5, SWITCH.studio], up: [SWITCH.studio, SWITCH.studio + 1.05], color: STUDIO_MAT.paper },
    // Hollywood to the audition: the lights go out, and a screen lights from behind.
    { kind: 'black', down: [169.9, 171.4], up: [174.8, 176.6] },
    // The audition to the globe.
    { kind: 'black', down: [195.1, 195.85], up: [196.15, 197.4] },
    // Paris at night to the club: through its red door, on the kick.
    { kind: 'black', down: [214.3, SWITCH.club - 0.02], up: [SWITCH.club + 0.02, 215.45], color: CLUB_MAT.red },
    // The trumpet to painted Paris: an iris, the old way.
    { kind: 'iris', down: [267.3, 268.45], up: [AT.knock2 + 1.02, 272.6], from: where, to: where, r0: 0, r1: 0 },
    // The stars to the home movie.
    { kind: 'black', down: [338.9, 340.0], up: [341.2, 342.8] },
    // The home movie to the drive.
    { kind: 'black', down: [393.6, 395.0], up: [395.6, AT.drive] },
    // The street to the club: through the door.
    { kind: 'black', down: [422.55, 423.3], up: [423.5, 424.8] },
  ]
  // The covers are drawn over each place by a lid that claims a cell every 4 across the whole place and round it, so
  // the stage (which only draws what has a cell in view, and never sees less than 8 cells across) always draws it.
  const lidOver = (pieces: Placed[]): Placed => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const q of pieces) for (const [c, r] of q.cells) { x0 = Math.min(x0, c); y0 = Math.min(y0, r); x1 = Math.max(x1, c); y1 = Math.max(y1, r) }
    return standing(covers, 0, 0, box(x0 - 24, y0 - 24, x1 + 24, y1 + 24, 4), { covers: coverList }, DURATION)
  }
  const stage = (world: typeof SEBS, from: number, chain: Placed[], scenery: Placed[] = []): Stage => ({ world, theme: world.themes[0], scenery, chain, after: [lidOver([...chain, ...scenery])], from })

  const stages: Stage[] = [
    stage(SEBS, 0, [pOpening], [
      standing(city, piano0[0], piano0[1], cityCells(piano0), { end: false }, DURATION),
      standing(clubRoom, piano0[0], piano0[1], around(piano0, -14, -9, 14, 3), { end: false }, DURATION),
    ]),
    stage(LIPTONS, SWITCH.liptons, [pOpening, pKiss], [standing(liptonsRoom, piano0[0], piano0[1], around(piano0, -16, -9, 26, 3), null, DURATION)]),
    stage(THEATRE, SWITCH.theatre, [pTheatre]),
    stage(STUDIO, SWITCH.studio, [pStudio, pHolly]),
    stage(SHADOW, SWITCH.shadow, [pShadow]),
    stage(GLOBE, SWITCH.globe, [pGlobe]),
    stage(CLUB, SWITCH.club, [pJazz, pTrumpet]),
    stage(NIGHT, SWITCH.night, [pPainted, pStars]),
    stage(MOVIE, SWITCH.movie, [pMovie]),
    stage(DRIVE, SWITCH.drive, [pDrive]),
    stage(SEBS, SWITCH.finale, [pFinale], [
      standing(city, piano1[0], piano1[1], cityCells(piano1), { end: true }, DURATION),
      standing(clubRoom, piano1[0], piano1[1], around(piano1, -14, -9, 14, 3), { end: true }, DURATION),
    ]),
  ]
  const show = new SebsShow(stages, DURATION, [...dreamChain.company].sort((a, b) => a.from - b.from))

  // The end: from the band (the finale's last key is by 480) the camera draws back out of the club, up over its roof,
  // to the whole city of stars, one move that carries its speed, and settles as The End's last chord rings.
  const ending: Shot[] = [
    { t: 488, cells: 16, hold: [piano1[0] + 2.6, piano1[1] - 3.0] },
    { t: 496, cells: 30, hold: [piano1[0] + 3, piano1[1] - 9] },
    { t: 503.4, cells: 44, hold: [piano1[0] + 3, piano1[1] - 15] },
    { t: DURATION, cells: 46, hold: [piano1[0] + 3, piano1[1] - 16] },
  ]
  const shots: Shot[] = [{ t: 0, cells: 5 }, ...dreamChain.shots, ...ending]
  const follow = director((t) => show.where(t), shots, DURATION)
  const camera = (t: number): Framing => follow(t)
  return { show, camera, covers: coverList }
}
