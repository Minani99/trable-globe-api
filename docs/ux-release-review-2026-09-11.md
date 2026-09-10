# Travel Globe UX release review — 2026-09-11

## Design decisions

- White canvas, neutral dividers, quieter content surfaces. Preserve the globe as the distinctive visual, not decorative gradients throughout the editor.
- Higher-contrast secondary text and accent-button labels. Preserve dark mode and the existing spacing/radius tokens.
- The travel hub prioritizes resuming a plan; first-use instructions are expandable. Category shortcuts appear only when multiple categories exist.
- The in-trip view prioritizes date, next unfinished stop, chronological itinerary and completion. Only three contextual actions: edit itinerary, photo, memo. Overall plan editing remains in the page header.
- Mobile completion targets are at least 44px; visible checkboxes, saving state, selected states and progress communicate outcomes. Long place names wrap.

References: [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) and [Material interaction states](https://m3.material.io/foundations/interaction/states/overview). Applied as interaction principles, not copied visual templates.

## Stability corrections

- Revision-guarded session cache prevents an old response restoring an account after logout. Temporary backend failure preserves the cached identity; HTTP 401 clears it. Backend authorization remains authoritative.
- Fixed mobile step bars respond to visual-viewport keyboard changes instead of input blur. Input-to-submit focus changes no longer move controls under the pointer.
- Date selection survives reload and is passed to itinerary editing. Changing dates does not show the previous date's forecast.
- In-trip mutations lock duplicate requests and conflicting controls. Notes can be saved repeatedly; completion can be undone. Existing offline synchronization remains covered.
- Next stop means the first unfinished stop, avoiding silently skipping earlier unfinished places based on the device clock.
- Private plans remain in planning mode on the final day of a trip.
- The first-use guide remains usable if browser storage is disabled.

## Verification

Automated coverage: authentication navigation and race cases, mobile common layouts, planner creation/budget/reservations, offline quick capture, date views, UI geometry. Added `launch-ux.spec.ts` checks 320/390/768/1440px widths, action hit testing, pending state, repeated memo saves, forecast clearing and date-aware editing. Screenshots include the travel hub, mobile itineraries and desktop dark mode.

Limits: browser viewport simulation is not a physical iPhone/Android keyboard test. Upload E2Es mock external object storage. No real payment, flight booking or production-account mutation is performed. This is a UX/stability release, not a full security, legal or load-test certification.
