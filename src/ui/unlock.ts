/**
 * The Builder's lock. The Builder is a workbench, not part of the show, so
 * its tab is not on the panel and its page sends visitors to Machine until
 * someone presses the backtick five times in quick succession. That unlocks
 * it for this browser, and the same five presses lock it again.
 *
 * The backtick already has a job (it clears the stage of its chrome), so
 * the presses have to come quickly, one on the heels of the last; a pause
 * between any two starts the count over.
 */

const STORE = 'contraptions:builder'
/** What the shell announces on `window` when the lock changes; `detail` is whether the Builder is now unlocked. */
export const UNLOCK_EVENT = 'contraptions:builder'

export const UNLOCK_PRESSES = 5
/** The longest pause between two presses of one run, in milliseconds. */
export const UNLOCK_GAP_MS = 500

/**
 * Counts presses in a row. Call it with the time of each press; it answers
 * true on the press that completes a run, and starts over after that, or
 * after any pause longer than the gap.
 */
export function pressCounter(presses = UNLOCK_PRESSES, gapMs = UNLOCK_GAP_MS): (timeMs: number) => boolean {
  let count = 0
  let last = -Infinity
  return (timeMs) => {
    count = timeMs - last <= gapMs ? count + 1 : 1
    last = timeMs
    if (count < presses) return false
    count = 0
    last = -Infinity
    return true
  }
}

// Where storage is refused the lock is kept for the page's life, which is enough to show the tab.
let remembered = false

export function builderUnlocked(): boolean {
  try {
    return localStorage.getItem(STORE) === '1'
  } catch {
    return remembered
  }
}

export function setBuilderUnlocked(on: boolean): void {
  remembered = on
  try {
    if (on) localStorage.setItem(STORE, '1')
    else localStorage.removeItem(STORE)
  } catch {
    /* storage unavailable */
  }
}
