# Activity navigation and existing-flow UX review — 2026-09-14

## Changes

- Recent activity previously sent the entire LIKE/COMMENT row, including the person's name and avatar, to the owner's travel editor. All person rows now open the actor's public profile. An explicitly labelled, separate `기록 관리` link retains access to the original editor when a travel ID exists.
- Profile links can prefetch the existing route loading boundary and show `여는 중…` while navigation is pending. Profile and record actions are separate anchors, supporting keyboard navigation and opening another tab.
- Activity entries show the username, wrap long names and titles, cap comment previews at two lines, and place timestamps below the content. Record actions have a 44px minimum target. Hover/pressed backgrounds use the existing theme tokens.
- Discovery invalidates in-flight searches immediately on input changes. Previous results cannot reappear during the debounce interval or after clearing the field; empty-result messaging is hidden while searching.

## Verification

- 19 distinct Chromium E2E scenarios passed locally (20 executions, discovery baseline repeated): authenticated navigation/logout (3), discovery and stale-response handling (2), activity/social connections (1), public mobile layouts (8), travel-screen responsive/dark/pending-state review (1), globe/overlay layout (2), mobile quick capture (1), day-view navigation (1).
- Social regression creates two local test accounts and FOLLOW/LIKE/COMMENT events, then clicks each actor, checks profile navigation, returns via browser Back, opens a profile by keyboard, and opens the separate record editor.
- Screenshots checked at 320px for activity and 390px for the in-trip view. Layout assertions also cover 390px/1440px activity and 320px/390px/768px/1440px in-trip screens.
- ESLint and production build/TypeScript passed.

## Scope and limits

- Existing features and backend data contracts are unchanged. No production accounts or travel records are created for testing.
- These are desktop Chromium tests with responsive viewports, not physical iOS/Android browser certification. This review does not claim every feature or external map/upload provider was exhaustively retested.
- The reported no-response symptom was not independently reproduced on the user's account; the incorrect LIKE/COMMENT target was confirmed in code and all three corrected paths were exercised with local accounts.
