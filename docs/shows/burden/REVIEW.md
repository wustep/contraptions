# Burden — Astra review record

Four improvement rounds, with one push per round. One draft PR: #219.
`npm run build` passed before each push: lint, typecheck, the complete test
suite, and the Vite production build.

| Round | Worst findings | Changes | Re-scrub |
| --- | --- | --- | --- |
| 1 | Companion jumps at carrier handoffs; stair hinge drift; balls overlapping at the pin | Shared support geometry, fixed hinge and Gandalf's passing perch; curved landscape silhouettes | All 11,490 frames; 20 consecutive frames at each of the stair, bridge and skiff handoffs |
| 2 | Skiff above water; hoop cutting into slopes; misleading stair axle; busy chasm; camera leaving the fall early | Waterline and hoop contacts corrected; bucket/pawl made explicit; false axle and background columns removed; longer hold | All 11,490 frames and the same three consecutive-frame sheets |
| 3 | Credits on a statue's hand; default credit halo; small pin handoff | Clear-sky matte cards in DOM and video; closer handoff then wider reveal; refined carved statues; ring pulls toward the seat's cord | All 11,490 frames; Zoom, Overview, portrait and real video export |

Every full browser run reported zero page errors and rejected any attempt
to draw type in a live frame. Returning to frame 264 after scrubbing in
both directions produced identical canvas pixels in all rounds. The
headless show check additionally samples 45,960 instants at 120 fps for
continuous handoffs, cast identity, ball separation and camera framing.

The final media pass used the actual shared Save video implementation to
record show seconds 363.2–369.4 at 2×. The resulting VP9 WebM has a 1280 × 720
video stream and no audio stream. Its decoded frame is `credits.png`.
Live DOM computed `text-shadow: none` and `filter: none`; instrumentation of
the video credit painter found no nonzero shadow blur or focus filter.

The official YouTube embed `vbKy6FuACKg` loaded with `music: ready`,
`source: youtube`, `fellBack: false`. Observed clock rates over separate
1.1-second windows were 0.986× at 1× and 1.956× at 2×.

Reproduce with Vite on port 8863 and
`node scripts/shows/review-burden.mjs --round 3 --port 8863 --scan --export`.
Full contact sheets, raw reports and the silent video remain in ignored
`out/burden/`; the selected PNGs here are for review and PR screenshots.

## Continuation · round 4

A complete wall-clock 1× picture scrub (0–383 seconds), followed by another
complete 1× scrub of the revised film and the exhaustive 30 fps frame scan.
The new `--watch` option records forty-second reels and 2.5-second contact
sheets, so the review includes the duration of the holds, not just stills.

The opening hoop crossed Sam's waiting place, and the road shutters started
closed and swung up after the travellers had already passed. Sam now waits
clear of the chute, then eases into the travelling gap. The hoop has more
room between the pair on the road and in the skiff. The three hinged roots
start overhead and close onto stone stops at the original scored times.
Removed two duplicate trees and the three disconnected counterweight/cord
assemblies. No camera keys or score anchors changed.

The 120 fps checks now include hoop/chute clearance and the swept clearance
of both travellers against all three roots. `npm run build` passed, including
lint, typecheck and the full tests. Selected frames: `shire.png`, `road.png`.
Full review artifacts: `out/burden/round-4-before/` and `round-4/`.
The revised pass painted all 11,490 scan frames with no page errors. Reverse
scrubbing reproduced identical pixels; Zoom, Overview and matte DOM/video
credit checks passed. The complete 1× confirmation also provides the viewing
pass used to select round 5's worst moments.
