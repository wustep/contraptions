# Extremely Normal Gifts — play-test journal

All sessions use a real Chromium browser driven through Playwright, with Node 22.23.3 and the local Vite server. The game is isolated at `/games/extremely-normal-gifts/`; existing shelves and show registrations are untouched.

## Initial complete session

Made a gift from Alex to Juniper, ran cannon → snow day → photo booth, previewed it, selected nested boxes, copied its link, opened the recipient view with deluxe treatment, watched the reveal, and started a return gift. Also tested pause/resume through a full run.

## Improve pass 1 — legibility and anticipation

**Found:** On a 390 px phone the composer came before the machine, the preview action was nearly two screens down, and three miniature departments were too small to inspect. A replay of an edited gift could expose the secret finale during the sender's preview. The recipient's result reverted to sender-oriented heading copy.

**Changed:** Put a readable single-department inspection view above the mobile form, added department tabs and a persistent mobile preview action, and retained the three-bay overview on wide screens. Sender previews end on a closed parcel. Recipient headings remain personal through the reveal.

**Replayed:** Full mobile composer → preview → official-approval finale → seal → fresh recipe URL → gentle opening → keepsake. Verified the preview parcel stays closed, the actual recipient gets the chosen ending, pause freezes the clock, and the phone has no horizontal overflow.
