# Shows review checkpoints

## First 30 seconds, ready for review

Both full takes load in Shows and their openings can be scrubbed forward and backward. The complete arrangements are generated; this checkpoint is a place for opening notes while full-take verification continues.

- [Première Take B, local](http://localhost:8791/shows/?show=premiere-arabesque&take=take-b)
- [Clair Take A, local](http://localhost:8791/shows/?show=clair-de-lune&take=take-a)

Use the Transport slider to review 0:00–0:30. Press O or click Overview to see the current world; press it again to follow the ball. Music and picture remain on the same clock.

Checkpoint captures are in `out/shows-review/premiere-arabesque-30s.png` and `out/shows-review/clair-de-lune-30s.png`. The PR will include review images and clips.

Review focus: the cannon's stock load/fuse/release in Take B, the pace of the opening carries in Clair, and whether the chosen stock strikes feel close enough to the music. No mechanism has an authored wait or a stretched clock. The [plan](STOCK_SHOWS_PLAN.md) and the two arrangement reports list the music cues and the actual times.

### Stephen's notes

Pending. Continue with the remaining checks and visual review while feedback is pending.

## Verification after the checkpoint

The ordering pass tightened the selected strikes to within 54ms of the recording cues in Take B and 95ms in Clair. The stock clocks remain unchanged. The current screenshots and clips reflect that ordering.

- `npm run build` passes, including typecheck, Shows, both Première takes, Clair, Machine and Builder checks. The existing large-chunk Vite advisory remains.
- Fresh stock placements match every saved lane, duration, mechanism state and ball change. All four catalogs are covered. The native waits inside those mechanisms remain intact; no waits were added.
- 34,875 motion/camera samples for Take B and 36,199 for Clair pass. All 318 handoffs join. Reverse seeks across piece boundaries and relays are stable.
- Browser checks cover O, the Overview button, continued playback, returning to the identical follow frame, keyboard input guards, mobile resizing, and the real PNG export button. All portal cuts close fully before changing worlds.
- Both 35-second opening previews use the export renderer at 1280×720, 30fps, with the original soundtrack offsets. Canvas text methods throw during capture to catch accidental lettering. No text calls or browser errors occurred.
- All four icon names and tooltips remain accessible. Take B is the default.

The shared stock player is in `apps/rube/src/shows/stock/`. Explicit arrangement sources are in `scripts/shows/plans/`; regenerate with `npm run generate:premiere:b` and `npm run generate:clair`. The arrangement reports list world boundaries, repeated travel pieces and exact strike errors.
