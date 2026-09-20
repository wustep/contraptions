import { sendLockedHome } from '../../../../src/ui/unlock'

/**
 * The Playground's door. Shows, the Builder and the Playground are locked
 * until someone presses the backtick five times in quick succession, in
 * any mode (`src/ui/unlock.ts`). Locked, this page is not the Playground
 * at all: it sends the visitor to Machine with whatever seed the link
 * carried, and neither the page's own code nor a single staged piece is
 * ever fetched.
 */
if (!sendLockedHome()) void import('./main')
