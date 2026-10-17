# Extremely Normal Gifts — play-test journal

All sessions use a real Chromium browser driven through Playwright, with Node 22.23.3 and the local Vite server. The game is isolated at `/games/extremely-normal-gifts/`; existing shelves and show registrations are untouched.

## Initial complete session

Made a gift from Alex to Juniper, ran cannon → snow day → photo booth, previewed it, selected nested boxes, copied its link, opened the recipient view with deluxe treatment, watched the reveal, and started a return gift. Also tested pause/resume through a full run.

## Improve pass 1 — legibility and anticipation

**Found:** On a 390 px phone the composer came before the machine, the preview action was nearly two screens down, and three miniature departments were too small to inspect. A replay of an edited gift could expose the secret finale during the sender's preview. The recipient's result reverted to sender-oriented heading copy.

**Changed:** Put a readable single-department inspection view above the mobile form, added department tabs and a persistent mobile preview action, and retained the three-bay overview on wide screens. Sender previews end on a closed parcel. Recipient headings remain personal through the reveal.

**Replayed:** Full mobile composer → preview → official-approval finale → seal → fresh recipe URL → gentle opening → keepsake. Verified the preview parcel stays closed, the actual recipient gets the chosen ending, pause freezes the clock, and the phone has no horizontal overflow.

## Improve pass 2 — gifts that survive the trip

**Found:** A line break in the note made a sender-created link fail recipient validation. Reloading discarded the draft. The keepsake guessed a transformation color instead of using the engine's result. Snow inherited the office palette's lightest ink (yellow), rather than white. Changing a different department during a reply silently restored the previous one.

**Changed:** Normalize short-note whitespace before encoding, preserve validated drafts and reply ancestry in tab-local session storage, and use the actual final ball color for both the on-page keepsake and exported PNG. Give the local snow scene a white ink. Explain the one-swap reply behavior, and accumulate visible forwarding slips with return gifts.

**Replayed:** Made a multiline gift to Zoë 🎁 from 蒼, refreshed, confirmed the draft and selected mechanisms survived, then completed preview → nested-box finale → fresh link → deluxe opening → PNG download. Confirmed the message remains absent from the unopened page and sent a one-mechanism reply. Added checks for all 162 combinations of mechanisms, openings and finales, portal continuity, ball identity/color, Unicode round trips, and malformed/versioned input.
