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

## Improve pass 3 — interruptions, limits and finish

**Found:** The help dialog disappeared when a delivery completed behind it. Maximum-length unbroken names overflowed a 320 px phone. An 80-character unbroken note collided with the portrait strip in the PNG. Initial sound preference loading tried to create an AudioContext before a gesture. An empty gift fragment could accidentally restore a reply draft. A failed machinery download left the loading screen indefinitely.

**Changed:** Pause while instructions are open (including correct Escape-to-close behavior), add Space/Escape playback controls and accessible progress, wrap long names, fit exported notes into three lines, defer audio creation to user input, distinguish absent and empty gift links, and provide a recoverable machinery-load error. Reduced-motion users get an immediate keepsake; switching the preference during playback also reveals it.

**Replayed:** At 320 px, opened a maximum-length gift, paused/resumed with Space, held instructions open while the clock remained frozen, closed them with Escape, finished the full delivery and downloaded the corrected PNG. Repeated with reduced motion. Tested blank-note validation, empty/malformed gift fragments, HTML-shaped messages as inert text, denied clipboard access with manual selection fallback, persisted mute, and a deliberately blocked machinery request followed by successful reload. No horizontal overflow in the long-name recipient or result views, and no startup AudioContext warning.
