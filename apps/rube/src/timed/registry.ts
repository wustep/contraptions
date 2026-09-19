import { premiereArabesque } from './premiere-arabesque'

/** Stable take IDs allow several versions of the same composition to coexist. */
export const TIMED_SHOWS = [premiereArabesque] as const
export const timedShowById = (id: string) => TIMED_SHOWS.find(show => show.id === id)
