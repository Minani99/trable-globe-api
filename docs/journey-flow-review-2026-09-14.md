# Journey next-action UX — 2026-09-14

## Implemented

- Landing primary action and studio next-action panel share one pure selection function. Priority: current trip → nearest upcoming departure → most recently ended private trip. An empty/completed-only account can start a new plan; a failed landing trip request keeps a usable link to the hub.
- Current-trip boundaries include both start and end day. Sharing visibility does not exclude an otherwise current trip. All overlapping current trips remain reachable, rather than silently dropping all but one.
- Current-trip action opens `/go?date=today`, upcoming opens the existing plan editor, and returned/private opens the existing finish editor. The application-wide Asia/Seoul date convention is unchanged.
- Studio highlights one next action before the category index. Plans are sorted by departure, and the large new-plan launch block appears only for an account without trips. Secondary creation actions are compact on mobile. The existing location progress counts remain in the plan list.
- Landing's signed-in secondary action opens all owned trips instead of a sample account. Anonymous sample access and the globe are preserved. The quick-capture current-trip selector uses the same grouping logic.
- Past day-view navigation offers record editing directly; current/future day views retain plan editing. None of these UI changes automatically changes visibility or publishes data.

## Verification

- 19 distinct local Chromium scenarios passed: journey selection/integration (2), auth navigation (3), public mobile layouts (8), planner (1), social connections (1), mobile home (1), quick capture (1), record finish/publication (1), responsive day-view/pending states (1).
- The initial integration fixture attempted to publish a trip ending in the future; the backend correctly rejected it. The fixture was corrected to an end-today public trip, preserving the existing publication rule.
- Journey integration checks initial/new, returned, upcoming and current primary actions on both landing and studio; real editor/day-view navigation; today selection; a private record remaining private; and a 320px landing CTA fitting its container.
- Hub screenshots reviewed at 320px, 390px and 1440px. Primary target size, hit testing and page overflow are asserted. Existing tests also cover 768px day views and dark mode.
- ESLint and production build/TypeScript passed. Tests create data only on the local H2 instance, not production.

## Remaining scope

This change addresses journey entry/navigation. It does not claim the separate mobile editor, every overlay, every device browser or all external providers have received a complete redesign. Date interpretation remains Korea-based, not destination-timezone based.
