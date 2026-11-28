# Learning notes

Short explanations of the ideas this project actually uses, and why they matter. Each one points at a file.

## Staffing rules as pure functions

The planner does not invent staffing status in the React tree. For a given date, shift and line, `checkLine` and the shift-level helpers take the people, absences and assignments and return a list of issues (`error`, `warning` or `info`). The week strip and the line cards only display that result.

Keeping the rules as pure functions means they can be tested without rendering the page: a missing Primary is always an error, one Secondary is a warning, and an absent person does not count toward the minimums. When the UI later adds holidays or a different rotation, the same functions can take those inputs without a rewrite of the cards.

See `src/domain/staffing.ts`, `src/domain/constants.ts` for the targets, and `src/planner.ts` for how a week of reports is built.

## Ranked cover suggestions

When a slot is empty, `suggestCover` lists people who could fill it and ranks them. Tier 0 is a qualified spare from the crew already on that shift. Tier 1 is qualified but from another crew (the note reminds the planner to check rest time). Tiers 2 and 3 are stand-ins: a Line Leader as Secondary, or as Primary only as a last resort.

Absent people, people already assigned, and the STL are never suggested. The sort is stable: tier first, then same crew, then home line, then name. The panel shows this list; it does not change the plan by itself.

See `src/domain/cover.ts` and the cover cases in `src/domain/domain.test.ts`.

## Why the planner has to press Übernehmen

A suggestion is not a decision. The app can rank options, but it cannot know about a conversation on the shop floor, a training clash, or a rest-time problem that is not in the demo data. So the cover panel only proposes. The assignment is written when the planner presses **Übernehmen**, and only then is it stored (`src/covers.ts`, key `shift-planner-demo.covers.v1`).

That keeps the domain honest: rules and ranks are testable, and the human still owns the roster.

See `src/components/SidePanel.tsx` and how `App.tsx` calls `acceptCover`.

## Exporting the week as CSV

The planner can take the visible Monday–Friday out of the browser as a CSV. The row builder is a pure function: it walks the same `ShiftView`s the cards use, writes one row per role slot (shift, line, role, person, status) and marks accepted covers with `Vertretung=ja`. Empty slots stay in the file with an empty person and status `offen`, so a gap is visible without a screenshot. Holiday dates become a single `Feiertag` row instead of three empty shifts.

The filename uses the ISO week of that Monday (`schichtplan-2026-W44.csv`). Tests cover the row builder, the empty-slot case and the filename, not the browser's file picker.

See `src/exportWeek.ts` and the button in `src/App.tsx`.
