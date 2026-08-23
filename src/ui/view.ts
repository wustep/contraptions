/**
 * View state: how the piece is being watched, as opposed to what it is.
 * Nothing here feeds the composition, so changing any of it must never trigger
 * a rebuild — and none of it belongs in the URL, which identifies the piece
 * alone. The two dials worth keeping between visits (speed, export scale)
 * persist locally instead.
 */
export interface ViewState {
  paused: boolean
  /** Playback rate. 1 is real time. Fractional is fine; the clock is continuous. */
  speed: number
  /** Supersampling factor for PNG export. */
  exportScale: number
  /** Faint cell outlines, for judging layouts and span placement. */
  grid: boolean
}

export const SPEEDS = [0.25, 0.5, 1, 2, 4]
export const EXPORT_SCALES = [1, 2, 4]

export const defaultView: ViewState = { paused: false, speed: 1, exportScale: 2, grid: false }

const STORE = 'contraptions:view'

/** Paused and grid always start off; a page load should play, unadorned. */
export function loadView(): ViewState {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return { ...defaultView }
    const saved = JSON.parse(raw) as Partial<ViewState>
    return {
      ...defaultView,
      speed: SPEEDS.includes(saved.speed as number) ? (saved.speed as number) : defaultView.speed,
      exportScale: EXPORT_SCALES.includes(saved.exportScale as number)
        ? (saved.exportScale as number)
        : defaultView.exportScale,
    }
  } catch {
    return { ...defaultView }
  }
}

export function saveView(view: ViewState): void {
  try {
    localStorage.setItem(STORE, JSON.stringify({ speed: view.speed, exportScale: view.exportScale }))
  } catch {
    // Private mode or a full quota: the dials simply reset next visit.
  }
}
