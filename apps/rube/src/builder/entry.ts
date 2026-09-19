import { builderUnlocked } from '../../../../src/ui/unlock'

/**
 * The Builder's door. The Builder is locked until someone presses the
 * backtick five times in quick succession, in any mode (`src/ui/unlock.ts`).
 * Locked, this page is not the Builder at all: it sends the visitor to
 * Machine with whatever seed the link carried, and the workbench's own code
 * is never fetched.
 */
if (builderUnlocked()) void import('./main')
else {
  const seed = new URLSearchParams(location.search).get('seed')
  location.replace(seed ? `/?seed=${encodeURIComponent(seed)}` : '/')
}
