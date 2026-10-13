# Contraptions #185 dependency review screenshots

Baseline: `origin/main` at `d6d4ccc1`. After: this PR with Vite 6.4.4, Node 22 types, and the regenerated npm lockfile.

Chromium smoke check of production builds at 1440×900 and 390×900: Machine, Explorations, Shows, Playground, Builder, and Theater. All 24 loads returned HTTP 200 with no page errors. All 12 final before/after PNG pairs are byte-identical.

Capture uses seed `review-ctr-mm`, reduced motion, a fixed virtual clock, loaded fonts, and deterministic randomness. Machine, Playground, and Theater are paused with their scrubber at 20/1000 before capturing; this prevents ordinary animation timing differences from being mistaken for rendering regressions. Explorations, Shows, and Builder use the fixed virtual clock alone. This is representative local coverage, not a complete browser/device matrix.

Before/after images are embedded through GitHub uploads in the PR body; all copies are retained in `shots/`.
