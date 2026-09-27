import { registerMode } from '../../../../src/ui/mode-host'
import { start } from './player'

/** The Shows tab: the player (`player.ts`), with the visitor choosing the show. */
registerMode('shows', (shell) => start(shell))
