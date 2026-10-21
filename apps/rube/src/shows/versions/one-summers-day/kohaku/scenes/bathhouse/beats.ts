import { M, onsetNear } from '../../music'

/**
 * The bathhouse's night on the music (M.swell → M.breath): every moment the scene turns on, each on a measured onset
 * (`onsetNear` finds the recording's own attack within a few hundredths of where it was heard). The drawings and the
 * cast read these, so a strike and what it strikes are the same moment.
 */

export const FROM = M.swell
export const TO = M.breath

/* ------------------------------------------------------------------ the bridge */

/** Haku sets off from the middle of the bridge to her, and is beside her. */
export const HAKU_GO = onsetNear(45.58)
export const HAKU_THERE = onsetNear(47.57)
/** They set off across together on the theme's first big note. */
export const SET_OFF = onsetNear(47.95)
/** The camera has drawn back to the whole bathhouse, and holds it while they cross. */
export const WIDE = onsetNear(49.32)
/** A cut in at the bridge's end, the note after they have passed under No-Face: his mask turned after her. */
export const PAST = onsetNear(53.02)
/** He stops by the door; she goes on in. */
export const AT_DOOR = onsetNear(54.13)

/* ------------------------------------------------------------------ the hall */

/** The back doors slide open on the night. */
export const DOORS = onsetNear(54.9)
/** She is at the tub's west end, by the token's treadle. */
export const BY_TUB = onsetNear(55.76)
/** The river's spirit comes in through the back doors, and heaves itself up into the tub. */
export const SPIRIT_IN = onsetNear(55.59)
export const HEAVE = onsetNear(57.94)
/** She lands on the treadle: the token goes off its peg onto its cord and down through the floor. */
export const TREADLE = onsetNear(58.6)

/* ------------------------------------------------------------------ the boiler room */

/** A cut down to the boiler room as the token comes down its cord. */
export const CUT_BOILER = onsetNear(59.71)
/** Kamaji's hands: one takes the token, one pulls a drawer, one tips the herbs in. */
export const CATCH = onsetNear(60.92)
export const DRAWER = onsetNear(61.34)
export const HERBS = onsetNear(61.72)
/** The soot carries its coal into the furnace a lump a note. */
export const COAL = [onsetNear(61.72), onsetNear(62.1), onsetNear(62.47)]

/* ------------------------------------------------------------------ the crest */

/** A cut back up as the spout gushes into the tub; the tub floods on the crest. */
export const CUT_HALL = onsetNear(62.87)
export const FLOOD = M.crest
/** She hops up onto the tub's rim and finds the thorn in its side. */
export const RIM = onsetNear(64.86)
/** The hook comes down from the pulley, and takes the thorn. */
export const HOOK_DROP = onsetNear(65.23)
export const HOOK = onsetNear(65.61)
/** The hands haul, a pull a note. */
export const PULLS = [66.45, 67.61, 69.17, 69.97, 70.77, 73.09, 75.36].map((t) => onsetNear(t))
/** The thorn comes free, a bicycle, and the rest pours out after it a thing a note. */
export const FREE = onsetNear(77.65)
export const JUNK = [onsetNear(78.04), onsetNear(78.42), onsetNear(78.8), onsetNear(79.17), onsetNear(79.57)]

/* ------------------------------------------------------------------ the spirit */

/** The river's spirit, clean, rises out of the tub; laughs twice; and goes. */
export const RISE = onsetNear(80.36)
export const LAUGHS = [onsetNear(82.27), onsetNear(83.05)]
export const AWAY = onsetNear(84.22)
/** She comes down off the rim as he goes, landing on a soft note. */
export const DOWN_OFF = onsetNear(86.19, 0.4)
/** Outside, wide: the ribbon of him going away over the sea; and back in. */
export const CUT_OUT = onsetNear(86.54)
export const CUT_IN = onsetNear(89.36)
/** The hands cheer on the gallery, a hop each on two soft notes, before the hall goes still. */
export const CHEER = [onsetNear(90.45, 0.3), onsetNear(91.43, 0.2)]
