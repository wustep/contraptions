import type { BallChange, BallState, Lane, Pt } from '../../parts'
import type { Backdrop } from '../../worlds'
import type { Phrase } from '../../timed/premiere-arabesque/types'

export interface StockSpec {
  name: string
  exit?: Pt
  portal?: 'in' | 'out'
}

/** A saved stock placement. Deliberately has no clock map or authored rest. */
export interface StockPiece {
  spec: StockSpec
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
}

export interface StockMap {
  world: 'workshop' | 'garden' | 'harbor' | 'arcade'
  begin: number
  end: number
  backdrop: Backdrop
  pieces: StockPiece[]
}

export interface StockScore {
  id: string
  title: string
  performer: string
  audioOffset: number
  duration: number
  phrases: Phrase[]
  maps: StockMap[]
  cues: { piece: string; target: number; actual: number }[]
}
