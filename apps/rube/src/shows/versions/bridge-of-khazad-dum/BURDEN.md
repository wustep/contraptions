# Burden · Astra

`/shows/bridge-of-khazad-dum/astra/` · Movies · directed by GPT-6 Astra.

After **The Lord of the Rings: The Fellowship of the Ring** (Peter Jackson,
2001). One cue: Howard Shore's **The Bridge of Khazad Dum**, the 5:57 original
album track, played by the official Reprise YouTube embed. The picture lasts
6:23, including 26 seconds of end credits. No audio asset is included.

## The film in the machine

The ring is a brass hoop on a short tether. Frodo is moss green, Sam is clay,
and Gandalf is chalk. These are the only balls. The iron weight below the
bridge represents the Balrog through mass and silhouette; the statues and
empty council seats are architecture, not additional cast members.

| Cue time | Film beat | Mechanical cause and consequence |
| --- | --- | --- |
| 0:00–0:24 | Bag End; accepting the ring | The ring rolls out of the round door's pocket and withdraws a latch. Frodo and Sam leave together. |
| 0:24–1:04 | The road and the Black Riders | Three suspended root shutters close behind the travellers. The path is progressively shut off from home. |
| 1:04–1:39 | The Council of Elrond | Nine empty seats surround a balance. The two small weights join Gandalf; their shared load brings the balance into line with the mountain road. |
| 1:39–2:38 | The mountain pass; entering Moria | A descending stone counterweight raises the fellowship's cradle. A slab closes the high pass, sending them down to the west door. |
| 2:38–3:54 | The long dark of Moria | A bucket falls, pulls a clutch, and rocks a monumental stair onto the far landing. The three cross its current surface together. |
| 3:54–4:40 | The bridge; Gandalf's sacrifice | Gandalf steps onto the pin's small perch to let the others through. The iron mass tensions two chains. His weight withdraws the pin; three slabs and Gandalf fall, leaving a lasting gap. |
| 4:40–5:07 | Lothlórien | A leaf cradle descends as its stone counterweight rises. It sets the two survivors on the riverbank. |
| 5:07–5:39 | Amon Hen; the fellowship breaks | An empty stone seat draws the ring toward it. Frodo leaves on a skiff; Sam leaps after him. The skiff lists, catches him, and settles. |
| 5:39–5:57 | The road ahead | Two small balls pass beneath the Argonath and continue toward a distant mountain. The destination remains beyond the frame. |
| 5:57–6:23 | End credits | Title, GPT-6 Astra, cast, and Howard Shore, over the continuing river. |

These are authored dramatic anchors in the recording's broad movement, not
a claim that each event is an automatically measured musical onset. The
music clock is the existing Shows transport at both 1× and 2×.

## Construction

All pieces and drawings are new. A continuous atlas connects the Shire,
valley, mountain, mine and river. The camera has continuous cubic velocity,
with long, quiet wide shots at the bridge and river. The visual materials
are flat pigment, carved stone, timber, rope and dull brass. No bloom,
glow, gradients, shine, trails, particles or words are painted by the pieces.

`motion.ts` defines the positions of both a carrier and its passengers.
Companions use the carrier's current pose, never a delayed copy of its
clock. Impulses begin at zero displacement and decay. The closed form score
has no mutable simulation state, so a reverse scrub reconstructs the same
picture as playback and export.

`astra.show.ts` is the lazy multi-version registry entry. The registry's
default Movies shelf handles this work; shared favorites and existing
takes are unchanged. The existing player supplies 1×/2×, Zoom, Overview,
PNG, 720p/1080p/Shorts video and YouTube transport. `titles()` supplies only
end credits: live DOM, baked into Save video's canvas by `words.ts`, absent
from PNGs. YouTube music is never copied into an export.

## Review

Run Vite in this worktree on port 8863, then:

```sh
node scripts/shows/review-burden.mjs --round 1 --port 8863 --scan
npm run build
```

The review renders all 11,490 frames at 30 fps while rejecting canvas text,
captures consecutive frames around the stair, bridge and boat handoffs,
checks reverse-scrub pixel identity, checks both speed settings, writes a
share card, and renders the actual export credit painter. Artifacts go to
ignored `out/burden/round-N/`. `check:shows` additionally checks 45,960
120 fps samples for continuity, identity, separation and camera framing.

### Round 1

The first contact sheet and numerical scrub exposed companion jumps at
moving supports, a stair whose hinge drifted away from its landing, and a
cast overlap at the bridge. Rebuilt shared support geometry, fixed the
stair hinge, and gave Gandalf a small pin perch. Replaced angular foliage
and hills with curved silhouettes; refined door joints and masonry.

Suggested tweet: **Burden · after The Lord of the Rings: The Fellowship of the Ring**

### Round 2

The consecutive frames showed the skiff slightly above the water. Lowered
its waterline, put the ring on the same sloping supports as the cast, and
made the bucket-to-pawl connection explicit. Removed the stair's misleading
centre axle and the columns behind the chasm. Held the wide frame through
Gandalf's fall before following the survivors. Re-rendered all 11,490 frames;
zero browser errors, no canvas text, identical reverse-scrub pixels, both
speed settings and the export credit painter passed again.

### Round 3

The credit proof put the director across an Argonath hand. Moved all cards
into clear sky and added the optional `TitleCard.matte` treatment, shared
by live DOM and video: no halo on text or swatches, no blur during fades.
The other takes keep their existing treatment. Reframed Gandalf's pin
handoff closer before the slow reveal of the chasm; refined the kings'
carved faces, cloaks and hands. The ring's temptation now pulls toward the
seat's visible hanging cord.

Re-rendered all 11,490 frames, plus Zoom, Overview and a 390 × 844 live
portrait view. Zero browser errors, exact reverse-scrub pixels, no text in
the live canvas; DOM and video credit checks confirm zero halo or blur.
Recorded a 6.2-second end-credit excerpt at 2× through the actual
`createShowStage().saveVideo()` / MediaRecorder path. Decoding the 1280 × 720
VP9 file confirms the director card is baked into the video and that no
audio stream is present. The official YouTube embed reported ready, with
no fallback; observed clock rates were 0.986× and 1.956× for 1× and 2×.

Run the media checks with:

```sh
node scripts/shows/review-burden.mjs --round 3 --port 8863 --scan --export
```

Selected screenshots and the review record are in `docs/shows/burden/`.

### Round 4

Reviewed the complete film at wall-clock 1× before editing, then re-scrubbed
it at 1×. Moved Sam clear of the opening hoop's chute and gave the carried
hoop breathing room. Reversed the roots' action: they now start raised and
close behind both travellers at the existing cue times. Removed two duplicate
trees and three ornamental counterweight/cord assemblies. Added swept gate
and opening hoop clearance checks. Score anchors and camera timing are fixed.

The review script now accepts `--watch` for the complete real-time picture
pass, alongside `--scan` for all 11,490 frames. Both are recorded separately.

### Round 5

The full 1× pass made the grove's repetition the next edit. Cut six trees and
126 leaf shapes down to three high crowns with 36 leaves; the leaf cradle,
counterweight and survivors now move through a clear field. One bough anchors
the pulley. Moved the distant ridges behind the waterline so the final river
stays open ahead of the skiff. No camera or motion timing changed. Repeated
the complete 1× review, 30 fps frame scan and full build gate.

### Round 6

The full 1× review and close scrubs found the hoop crossing the cast during
its temptation and release. It now lifts clear first, then lowers after
passing Sam; the same scored bounds remain. Extended the 120 fps clearance
check across the whole film. Removed the river engraving's periodic reset.
The skiff now takes the launch and Sam's landing with small decaying impulses
shared by its passengers and hoop, replacing the perpetual sine bob.

Repeated the entire film at 1×, the complete 30 fps scan, seven consecutive
frame sheets, Zoom, Overview, and nine live portrait compositions. No camera
keys, score anchors or credit times changed in rounds 4–6.

The final browser review had zero page errors and exact reverse-scrub pixels.
A fresh 720p Save video excerpt confirms matte credits and no audio stream.
The official YouTube player loaded without fallback; its clock measured
0.990× and 1.980× at the two speeds. Lint, typecheck, full tests and build passed.
