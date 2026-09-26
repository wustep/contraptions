import type p5 from 'p5'
import type { Ctx } from '../kit'

/**
 * STUB (builder: room). The practice room: one small room at the end of a corridor at Shaffer, drawn one way for
 * both visits (the film's opening at 0, and the night of the blood at 130.5). Soundproofing on the walls, a bare
 * bulb, a door with a small window, the old kit in oxblood, a stool, a music stand. Replace this with the room.
 */
export interface RoomLook {
  /** 0..1: how lit the room is. */
  light: number
}

export function drawPracticeRoom(p: p5, c: Ctx, look: RoomLook): void {
  void p
  void c
  void look
}
