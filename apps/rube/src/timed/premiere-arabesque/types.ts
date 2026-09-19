import type { BallChange, BallState, Lane, Pt } from '../../parts'
import type { Backdrop } from '../../worlds'

export interface TimeKnot {
  time: number
  native: number
  slope: number
}

export interface TimedPiece {
  name: string
  label: string
  begin: number
  end: number
  col: number
  row: number
  mirror: 1 | -1
  cells: Pt[]
  lane: Lane
  state: unknown
  ballIn: BallState
  changes: BallChange[]
  timing: TimeKnot[]
}

export interface Phrase {
  title: string
  begin: number
  end: number
  note?: string
  visible?: number
  strikes?: { time: number; piece: string }[]
}

/** A physical map can contain several musical phrases without a world change. */
export interface TimedMap {
  title: string
  world: 'garden' | 'harbor' | 'workshop' | 'arcade'
  begin: number
  end: number
  backdrop: Backdrop
  pieces: TimedPiece[]
  /** Authored framing. x/y are in cells; visible is the vertical span in cells. */
  camera: { time: number; x: number; y: number; visible: number }[]
}

export interface PremiereScore {
  /** Stable take identity, separate from title and checkpoint revision. */
  id: string
  title: string
  performer: string
  revision: number
  audioOffset: number
  duration: number
  phrases: Phrase[]
  maps: TimedMap[]
}
