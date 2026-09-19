/**
 * The lock on Shows and the Builder. Neither tab is on the panel, and
 * neither page is itself until someone presses the backtick five times in
 * quick succession. That unlocks both for this browser, and the same five
 * presses lock them again.
 *
 * The backtick already has a job (it clears the stage of its chrome), so
 * the presses have to come quickly, one on the heels of the last; a pause
 * between any two starts the count over. The shell clears the stage on the
 * first press of a run only, so the run does not flicker it.
 */

const STORE = 'contraptions:unlocked'
/** The Builder's old key. A browser that unlocked it before Shows shared the lock still counts as unlocked. */
const LEGACY_STORE = 'contraptions:builder'
/** What the shell announces on `window` when the lock changes; `detail` is whether Shows and the Builder are now unlocked. */
export const UNLOCK_EVENT = 'contraptions:unlocked'

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

// Where storage is refused the lock is kept for the page's life, which is enough to show the tabs.
let remembered = false

export function unlocked(): boolean {
  try {
    return localStorage.getItem(STORE) === '1' || localStorage.getItem(LEGACY_STORE) === '1'
  } catch {
    return remembered
  }
}

export function setUnlocked(on: boolean): void {
  remembered = on
  try {
    if (on) {
      localStorage.setItem(STORE, '1')
      localStorage.removeItem(LEGACY_STORE)
    } else {
      localStorage.removeItem(STORE)
      localStorage.removeItem(LEGACY_STORE)
    }
  } catch {
    /* storage unavailable */
  }
}

/**
 * Locked visits to Shows or the Builder land on Machine, seed and all.
 * Answers whether the visitor was sent away, so the page's own code is
 * never fetched when they were.
 */
export function sendLockedHome(): boolean {
  if (unlocked()) return false
  const seed = new URLSearchParams(location.search).get('seed')
  location.replace(seed ? `/?seed=${encodeURIComponent(seed)}` : '/')
  return true
}
