# Première Arabesque, complete show

The full approved Patrizia Prati recording of Première Arabesque, No. 1, now has fixed choreography. The show starts at source time 2.38 seconds and runs for 4:50.611. It visits Regular, Forest, Aqua and Arcade in that order. Each map lasts more than a minute and holds several musical phrases.

Run `npm ci` and `npm run dev`, then open `/docs/promo/premiere-arabesque-preview.html` on the port printed by Vite. Press **Play with music**. The slider pauses and seeks; **Restart** returns to the first audible note; **1× / 2×** changes music and motion together. Playback stops at the end of the source recording.

The complete local video is `docs/promo/premiere-arabesque-full-preview.mp4`. Videos are ignored by the repository's existing MP4 rule. Both live playback and export use the same picture-only renderer. The review page keeps its controls and attribution outside the canvas.

The [phrase map](PREMIERE_PHRASE_MAP.md) describes all 36 phrases and the three transitions. There are 151 stock pieces, 22 direction changes, 34 rests and just four standalone rail cells. No ribbons, procedural planning or random choices run during generation or playback. The stock mechanism files are unchanged; world index metadata changes their display labels as requested.

## Shows integration

This page is a development player. The real product home is the Shows tab being implemented separately.

`apps/rube/src/timed/registry.ts` exports `TIMED_SHOWS` and `timedShowById`. The take ID is `premiere-arabesque-prati-journey`, with composition title and version stored separately so other takes can coexist. `premiere-arabesque/index.ts` exposes duration, approved audio URL and offset, phrase/map data, `at(time)`, `cameraAt(time)`, and `renderFrame(p5, time)`.

The host owns the audio clock, playback rate, transport and export. Show time is absolute seconds after the recording offset. At 2×, the host advances show time twice as fast and sets audio playback to 2×. The choreography never depends on animation-frame deltas, a DOM page, or the review controls.

The approved garden study remains in `score.study-3.generated.json`. The complete journey is `score.generated.json`; its authored source is `scripts/generate-premiere-show.ts`. The standalone study generator writes only the preserved study file.

## Checks

```sh
npm run generate:premiere
npm run check:premiere
npm run build
```

The dedicated check covers 34,875 samples, all 147 piece handoffs, monotone clocks and stopped holds, physical seam speeds, camera visibility, backward seeking, nonoverlapping footprints, map order and lengths, phrase continuity, and the rail limit. Relays change ball identity at the physical transfer, and hidden cannon travel is excluded from the visible-motion limit.

`npm run build` includes the Première check along with the existing generator, Machine and Builder checks. Its existing large-bundle advisory remains.

## Video export

Open the preview page in a browser with WebCodecs H.264 support. Evaluate `scripts/export-premiere-preview.browser.js` as a function. For manageable output sizes, set `window.premiereExportRange = { startFrame: N, frames: 1800 }` before each evaluation. Use starting frames 0, 1800, 3600, …, 16200. Save each returned JSON as `out/premiere-video-parts/part-00.json` through `part-09.json`. The last part automatically stops at the final frame.

```sh
node scripts/mux-premiere-preview.mjs
```

The mux validates the revision, dimensions, frame order, total duration and recording offset. It combines all 17,437 frames and adds the approved audio from 2.38 seconds through the end. The renderer samples exact `frame / 60` times, independent of encoding speed. The last video frame extends less than one frame beyond the audio because the source length is not a multiple of 1/60 second.

Recording attribution and the audiovisual adaptation's CC BY-SA 4.0 notice are in [PREMIERE_ARABESQUE_ATTRIBUTION.txt](PREMIERE_ARABESQUE_ATTRIBUTION.txt). No other recording is used or required.

## Local playback and scrub results

The full show completed with the source audio. A first long browser run had display scheduling stalls during part of Aqua and the Arcade entrance. The same passage, replayed in the foreground after smoothing audio timestamp corrections, had no display intervals over 25 ms: 1.0 ms drawing time at the 95th percentile, 1.5 ms maximum drawing time, and a maximum show-time step of 18.7 ms. Estimated audio-clock error stayed below 0.04 ms in that replay. These are local measurements, not a guarantee for other browser workloads.

The complete player was scrubbed through 582 slider positions. All 441 frames immediately before, at, and after piece handoffs matched when revisited in reverse order. All three portal cuts were checked pixel by pixel: each was fully closed, with exactly the same color before and after the world change. Frames from every phrase group were inspected for framing and spatial continuity.

The exported MP4 decodes to all 17,437 frames at 1600 × 900. Every timestamp matches the 60 fps grid within 0.34 microseconds. Its audio has exactly the same decoded sample count as the source after the offset. Correlation checks at the opening, all three world transitions, and 4:40 found zero samples of offset and at least 0.9996 correlation.

A separate complete 2× playback finished at the recording's exact end. It drew 8,727 display frames, with 1.0 ms rendering at the 95th percentile, 2.3 ms maximum rendering time, and 0 display intervals over 25 ms. The maximum display interval was 20.4 ms. The decoded video's frames around encoding joins and world transitions were also inspected; no seam jumps were visible.
