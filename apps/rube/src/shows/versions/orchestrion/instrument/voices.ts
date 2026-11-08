import { defineEngine } from './engine'

/**
 * The voices, for the page: the engine's own (`engine.ts`), one copy of them on this thread. The offline render and
 * the checks run them here; the drawing reads how long each part rings from them, so a part glows as long as it sounds.
 */

/** The rate the soundtrack is rendered at offline. Live, the engine runs at the audio device's own. */
export const SR = 44100

const voices = defineEngine()
export const { makeEngine, noise, contact, contactTime, barRing, stringRing, chimeRing } = voices
