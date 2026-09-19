# Clair de lune, opening checkpoint

Status: **Archived 30-second study.** Retained for reference after review. The full song and integration into the site's Shows tab are unfinished; this PR is being closed without merging.

Watch `docs/promo/clair-de-lune-30s-preview.mp4`, or run `npm run dev` and open [the local preview](http://localhost:8791/dev/clair-de-lune.html). Press Play for music, Space to pause, or H to hide the controls. The scrubber, pause and restart follow the recording's clock. Playback stops at 30 seconds.

The audio is Stephen's approved Laurens Goedhart recording. Show time zero is file time **2.440 seconds**. The preview uses file time 2.440–32.440 at its original speed, with no fade or added sound effects. See [the recording attribution](CLAIR_DE_LUNE_ATTRIBUTION.txt).

The opening uses two compact maps in the stock Workshop and Harbor worlds, with a phrase cut at 15.296 seconds. Each map climbs, reverses direction and descends. There are only two single-cell rails. The camera holds an overview, moves into the upper mechanisms, and opens again for the descent. This follows Stephen's note to use music phrases, real mechanisms, flights and vertical space, with rails as short breaths and room for stillness.

| Show time | Action |
| --- | --- |
| 0.00–4.39 | The first chord rings a bell. A short rail feeds a counterweight lift, which rises two floors and sends the ball back the other way. |
| 4.39–8.36 | The ball settles into a trapeze; the basket swings across open space and catches at 7.883. |
| 8.36–12.75 | A cradle relays to its far ball, which slips its string and flies. A switchback drops it a floor and reverses it toward a pendulum. |
| 12.75–15.30 | The pendulum strikes, then the ball slows into the portal. The iris closes for the phrase cut at 15.296. |
| 15.30–18.91 | Harbor opens wide. The ball climbs inside a lighthouse; its lantern lights two floors up. |
| 18.91–23.53 | A pelican catches the ball, turns, flies over the water and releases it at 23.039. |
| 23.53–25.72 | The oyster closes and holds. A pearl appears at 25.294. |
| 25.72–30.00 | The pearl spirals down a whirlpool, reverses onto a buoy, and stops at the checkpoint. |

This checkpoint retains its Workshop to Harbor cut. Any resumed full-song version should use Regular → Forest → Aqua → Arcade, mapped to `workshop → garden → harbor → arcade`, with multiple phrases per world. It should plug into the shared Shows registry for versions, soundtrack playback, 2× speed and export. Exported frames remain picture and music only; attribution belongs in repository documentation.

## Implementation and reproduction

- `apps/rube/src/shows/clair-de-lune-30s.score.json` saves two maps, 15 placements, geometry, colours, relay state, 38 timing cues and 18 camera poses. Playback runs no planner or random generator.
- `apps/rube/src/shows/clair-de-lune.ts` maps recording time to the stock mechanisms' clock, so ball paths, moving supports and relays stay together. The preview clamps at 30 seconds.
- `dev/author-clair-de-lune.ts` rebuilds that data from the explicit cast, variants, rails and cues. It uses stock placement functions once when authoring, then saves their results. Stock pieces and worlds are unchanged.
- `dev/clair-de-lune.html` is a development preview. The named show is not yet added to the main app.

To regenerate the MP4 with a local dev server, Playwright, Chromium and ffmpeg available:

```sh
node dev/render-clair-de-lune.mjs
```

The renderer also accepts `--port 8791` and `--stills`. It can reuse cached Playwright and Chromium installs, or explicit `PLAYWRIGHT_MODULE` and `PW_CHROME` paths. It exports 1600 × 900 at 60 fps using exact frame times, then muxes the trimmed recording. This archived checkpoint includes the preview MP4 as an exception to the repository's video ignore rule, along with the approved source MP3 and its attribution.

The focused timing and continuity checks are:

```sh
./node_modules/.bin/esbuild apps/rube/check-clair-de-lune.ts --bundle --platform=node --format=cjs --outfile=/tmp/check-clair.cjs
node /tmp/check-clair.cjs
npm run typecheck
```

Checkpoint verification passed: typecheck, `check:rube`, the focused score checks, and browser playback, pause, restart and automatic stop. The MP4 has exactly 30 seconds of H.264 video and AAC audio. Its decoded audio matches the source trimmed at 2.440 seconds with correlation 0.999983.
