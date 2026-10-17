# Burden — Astra review record

Six improvement rounds, with one push per round. Rounds 4–6 are the continuation session. One draft PR: #219.
`npm run build` passed before each push: lint, typecheck, the complete test
suite, and the Vite production build.

| Round | Worst findings | Changes | Re-scrub |
| --- | --- | --- | --- |
| 1 | Companion jumps at carrier handoffs; stair hinge drift; balls overlapping at the pin | Shared support geometry, fixed hinge and Gandalf's passing perch; curved landscape silhouettes | All 11,490 frames; 20 consecutive frames at each of the stair, bridge and skiff handoffs |
| 2 | Skiff above water; hoop cutting into slopes; misleading stair axle; busy chasm; camera leaving the fall early | Waterline and hoop contacts corrected; bucket/pawl made explicit; false axle and background columns removed; longer hold | All 11,490 frames and the same three consecutive-frame sheets |
| 3 | Credits on a statue's hand; default credit halo; small pin handoff | Clear-sky matte cards in DOM and video; closer handoff then wider reveal; refined carved statues; ring pulls toward the seat's cord | All 11,490 frames; Zoom, Overview, portrait and real video export |
| 4 | Hoop crosses Sam; roots swing open after the pair pass; duplicate road props | Clear opening and travelling space; roots close behind the pair; removed two trees and three disconnected weights | Whole film at 1× before and after; 11,490-frame scan; gate and hoop checks |
| 5 | Dense grove overwhelms the descent; mountain wedge closes the river | Three high crowns instead of six dense trees; distant ridges behind water | Whole film at 1×; 11,490-frame scan; Zoom and Overview |
| 6 | Hoop crosses cast during temptation; river markings reset; hull bobs indefinitely | Clear lifted release; continuous river drift; damped launch and landing | Whole film at 1×; 11,490-frame scan; 120 fps hoop clearance; portrait and video proof |

Every full browser run reported zero page errors and rejected any attempt
to draw type in a live frame. Returning to 264 seconds after scrubbing in
both directions produced identical canvas pixels in all rounds. The
headless show check additionally samples 45,960 instants at 120 fps for
continuous handoffs, cast identity, ball separation and camera framing.

The round-3 media pass used the actual shared Save video implementation to
record show seconds 363.2–369.4 at 2×. The resulting VP9 WebM has a 1280 × 720
video stream and no audio stream. The decoded proof, `credits.png`, was
refreshed from the round-6 export.
Live DOM computed `text-shadow: none` and `filter: none`; instrumentation of
the video credit painter found no nonzero shadow blur or focus filter.

In round 3, the official YouTube embed `vbKy6FuACKg` loaded with `music: ready`,
`source: youtube`, `fellBack: false`. Observed clock rates over separate
1.1-second windows were 0.986× at 1× and 1.956× at 2×.

Reproduce with Vite on port 8863 and
`node scripts/shows/review-burden.mjs --round 6 --port 8863 --watch --scan --export`.
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

## Continuation · round 5

The complete 1× round-4 confirmation exposed the grove as the noisiest
passage: six matching trees and 126 leaf shapes filled the space around the
leaf cradle. Replaced them with three tall trunks and 36 leaves held in high
crowns. A single bough anchors the pulley. The descent now has a clear field,
and the tree line no longer intrudes into the bridge's wide frame.

Put the distant mountain planes behind the waterline. The skiff now has open
river ahead through the final hold and credits, instead of a foreground wedge
that appeared to close its route. No motion keys, camera keys or cue times
changed. Lint, typecheck, all tests and the production build passed.

Review: complete 0–383-second wall-clock 1× confirmation, followed by the
11,490-frame scan and consecutive handoff sheets. Selected images:
`bridge.png`, `grove.png`, `fellowship.png`. Artifacts: `out/burden/round-5/`.
The final scan reported zero page errors and identical reverse-scrub pixels.
Zoom, Overview and matte credit parity passed. This full 1× confirmation is
also the review used to choose round 6's remaining motion faults.

## Continuation · round 6

The preceding full 1× review and close scrubs isolated the last motion faults.
The tempted hoop now lifts before crossing Frodo and stays up until it clears
Sam. Its pull, hold and release retain the same scored bounds. The 120 fps
sweep now checks the hoop against every cast member for the entire film;
minimum centre separation is 0.4576 cells, exceeding the combined outlined
radii. The river's modulo reset is removed, so its engravings drift continuously.

The hull's launch and Sam's landing now produce small decaying displacements
shared by the skiff, both passengers, hoop and gunwale. Removed the perpetual
sine bob: the final wide glide settles. All camera keys, cue anchors, duration
and credit times are unchanged from the start of this session.

Lint, typecheck, full tests and production build passed. A separate 390 × 844
live-page pass checked nine moments from Bag End through the director card,
with zero page errors and no pre-credit words. Artifacts:
`out/burden/round-6/`, `round-6-sketch/` and `round-6-phone/`.

The complete 0–383-second wall-clock 1× confirmation and all 11,490 scan
frames passed with zero page errors. Reviewed all ten reels and seven
consecutive-frame sheets, including the release, landing and former river
reset. Reverse-scrub pixels, Zoom, Overview and matte DOM/video checks passed.
The actual Save video path produced a 1280 × 720 VP9 credit excerpt with no
audio stream; its decoded director card is `credits.png`. The official
YouTube embed was ready without fallback, with measured clock rates of
0.990× and 1.980× at 1× and 2×. Refreshed selected images and added `release.png`.
