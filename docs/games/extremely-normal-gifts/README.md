# Extremely Normal Gifts

A small social game about affectionate overkill: make an elaborate machine to deliver one tiny compliment. It lives at `/games/extremely-normal-gifts/` and uses the existing Contraptions timed engine and flat ink rendering.

Write a note, choose one mechanism in each of three departments, and test the roughly eleven-second delivery. Pick a secret finale and copy the recipe link. The recipient chooses gentle or deluxe opening, gets a personalized keepsake, and can swap exactly one mechanism to return the same joke. Deluxe adds a real extra stamping scene; return gifts accumulate forwarding slips.

## Implementation

- Nine mechanisms: cannon, seesaw, toaster; snowblower, painter, apple tree; photo booth, a local rubber-stamp piece, service bell. Three secret finales: a tiny fanfare, nested boxes, official approval.
- `GiftPerformance` resolves choices into curated `Placed` lanes and carries ball state through portal handoffs. `GiftStage` renders the scenes with the existing `engine.ts` `drawWorld`. There is no collision simulation and no existing shelf, registry or show was changed.
- The snowblower is dynamically imported, preserving the Playground cold-load guard. The game owns its palette, UI, audio, camera framing and finite clock.
- Version 1 recipes use validated, UTF-8/base64url data in the URL fragment. The note is not sent in the page request. This is a portable link, not encryption: anyone with it can read/open the gift. No account, backend, analytics integration or automatic messaging is added.
- Drafts are tab-local (`sessionStorage`). Only the sound preference uses `localStorage`. The personalized 1200 × 900 PNG uses the resolved ball color and fits maximum-length notes.
- Native dialog focus behavior, labelled controls, live delivery captions, progress semantics, Space/Escape playback controls, paused hidden tabs, and reduced-motion support. Clipboard failure leaves a selected link for manual copying.

## Validation and screenshots

Use Node 22 and run `npm ci`, `npm run build`, then `npm run preview -- --port 8796`.

`npm run check:gifts` covers all 162 combinations (27 recipes × 2 openings × 3 finales), finite deterministic samples, footprint and portal continuity, relay/color handoffs, Unicode links, invalid input and reply isolation. It is included in the full repository build checks.

The [play-test journal](PLAYTEST.md) records three completed browser improvement passes. The adjacent PNGs are actual browser screenshots and a downloaded keepsake. `public/games/extremely-normal-gifts/card.svg` is the source for the generic social card PNG; recipient text and the secret finale never appear in the shared site's metadata.

Preview: https://contraptions-git-game-gifts-wustep.vercel.app/games/extremely-normal-gifts/
