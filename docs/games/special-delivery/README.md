# Special Delivery

A 90-second parcel depot at `/games/special-delivery/`, for one player using both hands or two players sharing a keyboard or touch screen. Paint the requested colors, send them to Windmill, Lighthouse, or Moon, and repaint anything Gus the frog returns.

## Controls

| Job | Keys | Action |
| --- | --- | --- |
| Painter | A / S / D | Paint and queue red / blue / yellow |
| Painter | F | Hold or release the feed |
| Dispatcher | J / K / L | Send the front parcel to Windmill / Lighthouse / Moon |
| Dispatcher | H | Park, swap, or retrieve a parcel |
| Either | Esc | Pause or resume |

All actions have touch buttons. A two-player rematch can swap jobs and their keys. Guided practice has no deadline. Every fourth consecutive delivery raises the multiplier, up to 4×. Rescued parcels add 50 postage. An order is reserved when a matching parcel is sent; deliveries already sent still count after closing.

## Implementation

The game is an independent Vite entry. It does not register a new world, piece, shelf, or show. `machines.ts` places the stock painter, conveyor, cannon, and frog. Their lanes are translated into depot coordinates and their clocks accelerated together with their drawings. `DepotShow` supplies normal `Placed` objects and multiple riders to `engine.ts`'s `drawWorld`.

The controller owns bounded queues, machine availability, deadlines, scoring, and input history. A choice resolves its result before a timed lane plays it. There is no collision solver. All movement segments join continuously. History retains recoloring and motion, so the highlight can show an actual wrong delivery, its frog return, and the successful rescue, skipping time spent waiting between attempts.

Three slots each for intake and dispatch, one parking pocket, and an eight-parcel limit keep the depot bounded. Full queues reject new work without consuming a parcel. A seeded order stream plus timestamped choices makes scheduling independent of animation frame size. Records are local and separate for solo and duo; storage failure does not prevent play. Audio is synthesized after a user gesture. Leaving the tab pauses the shift.

## Browser play-testing and improvement passes

Tested in a real Chromium browser through Playwright, using visible DOM controls and keyboard input. Three full 90-second shifts were played, as well as practice deliveries, failed sends, returns, job swaps, and replay. The play-test driver reads the displayed requests and queues; it does not change scores or game state.

1. **Read the machines.** The first full shift delivered 14 parcels for 1,650 postage, including an intentional misroute and rescue. Reloading was unclear, work on the belt was easy to overlook, and the address scenery clipped. Added a reload meter and countdown, unavailable-action states, matching-address cues, work-in-progress counts, and corrected scene framing. Replayed the controls and delivery loop.
2. **Plan ahead and play by touch.** Narrow screens put dispatch below the viewport, while a numeric belt count still invited duplicate painting. Added explicit colored production tokens, clearer park/swap labels, and a compact active layout. A full 390×844 touch-control shift delivered 43 parcels for 14,800 postage. Both jobs fit on screen. Added behavioral checks; their saturation scenario found and fixed a floating-point negative wait in the return lane.
3. **Make the ending worth watching.** The original rescue highlight showed only the successful send, and swapped jobs left stale help text. Highlights now include the actual detour and frog recovery, skip idle gaps, and start automatically unless reduced motion is requested. Updated swap instructions, added a return to the lobby, persisted mute, synchronized cannon/frog sounds, and removed the frame-time cap from the shift clock. A full mixed keyboard/touch shift delivered 38 parcels for 12,850 postage with one rescued parcel. Verified its automatic replay, swapped-key delivery, matching help text, and frozen pause clock. Final continuity review also fixed immediate park-to-send and return-to-paint handoffs; the stress check now checks continuity across separate motions as well as within each lane. The repository's route check also caught an ordering assumption; the new route now follows the existing alternatives.

Validation: `npm run build` passes under Node 22, including lint, type checking, the existing show/shelf/builder checks, and the new delivery check. The production preview serves the game, preserves the query through the slash redirect, and serves the existing Machine, Playground, Shows, Theater, and Builder pages. Browser play-tests reported no console errors.

The behavioral check covers reservation at deadlines, rescue identity and bonus, hold and swap order, busy-machine rejection, last-second sends, idle/training deadlines, frame-size independence, capacity saturation, continuous lanes, and replay cuts. It is included in `npm test` and `npm run build` as `check:delivery`.

Responsive checks cover widths 320, 390, 768, 1280, 1440, and 1920 pixels. Screenshots are real browser captures:

- [Welcome](welcome.png)
- [Active depot](gameplay.png)
- [Mobile controls](mobile.png)
- [Shift receipt and replay](receipt.png)

Preview: https://contraptions-git-game-delivery-wustep.vercel.app/games/special-delivery/
