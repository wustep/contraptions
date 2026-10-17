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
| 1:04–1:39 | The Council of Elrond | Nine empty seats surround a balance. The two small weights join Gandalf; their shared load tips the east end down. |
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

Suggested tweet: **Burden · after The Fellowship of the Ring**

### Round 2

The consecutive frames showed the skiff slightly above the water. Lowered
its waterline, put the ring on the same sloping supports as the cast, and
made the bucket-to-pawl connection explicit. Removed the stair's misleading
centre axle and the columns behind the chasm. Held the wide frame through
Gandalf's fall before following the survivors. Re-rendered all 11,490 frames;
zero browser errors, no canvas text, identical reverse-scrub pixels, both
speed settings and the export credit painter passed again.
