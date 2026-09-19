import { sendLockedHome } from '../../../../src/ui/unlock'

/**
 * The Shows door. Shows and the Builder are locked until someone presses
 * the backtick five times in quick succession, in any mode
 * (`src/ui/unlock.ts`). Locked, this page is not Shows at all: it sends
 * the visitor to Machine with whatever seed the link carried, and the
 * player's own code is never fetched.
 */
if (!sendLockedHome()) void import('./main')
