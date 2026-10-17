# Dirty Little Derby

A standalone three-heat game at `/games/dirty-little-derby/`. Play against the house or share one device with a friend. Pick a route and one secret card, reveal together, and watch the machinery settle it. The house seals its decision before the human chooses.

## Rules

- The rocket shortcut is faster. The covered conveyor halves prank delays. Route times change in each heat and are shown before choosing.
- Snail mail adds 2.6 seconds to the other racer; Dunk tank adds 1.8. No, thank you blocks either prank. Hot wheels removes 1.2 seconds from the home stretch.
- Each of those four cards works once per derby. Play it clean is always available.
- A win is 3 points, second is 1, a tie is 2 each. Most points wins. Total race time breaks a points tie; equal time shares the trophy.
- Space pauses a race; M toggles sound. Rules pause the race. A replay does not spend another card or award more points. The podium can export a PNG receipt.

## Implementation

The game has its own Vite entry. It does not register a world, piece, show, or navigation tab. Rules resolve first, then `DerbyShow` assembles independent `Placed` timelines and supplies two `ShowPoint.balls` to the existing `drawWorld` renderer. Rockets, conveyors, snails, and dunk tanks are stock pieces, with synchronized retiming of both their lanes and drawings. No collision simulation or post-choice randomness determines the result. Arcade display scores are suppressed; only game rules award points.

Everything is local to the browser, with no accounts, multiplayer service, or backend. Two players use a private handoff screen, with the first choice removed from the rendered UI before passing the device.

## Play-test and improvement log

Real Chromium sessions driven with Playwright, without skipping the race clock.

### Baseline

Completed a solo derby at 1440 × 1100: a snail blocked by a shield tied at 9.60 seconds; reciprocal snail/dunk attacks finished at 11.60/10.80; matching boosts tied at 8.60. Inventory and scoring behaved correctly. Found undersized machines, a tie message that wrongly claimed identical plans, and an unconvincing finish photo.

### Improvement pass 1 — race legibility and consequences

Enlarged the machinery, tightened lane spacing, corrected canvas typography and tie copy, and built a split finish photograph frozen at the first crossing. Removed clipped course labels from that close-up. Added exhaustive rules and timeline checks to `npm test`.

Replayed a full local derby as Miso and Bean. A snail reversed the faster route (12.20 vs 10.60); a shield blocked the next dunk (9.00 vs 10.40); both boosted in the final (8.60 vs 9.00). Miso won 7–5. Verified the handoff hides the canvas and removes all route/card controls. The headless check covers all 300 route/card/heat combinations, continuous handoffs, finish agreement, repeatable scrubbing, inventory, ties, and 300 seeded three-heat house derbies.
