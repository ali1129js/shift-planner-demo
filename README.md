# Shift Planner Demo

A small shift-planning tool for a fictional three-shift production plant,
**Demo Packaging GmbH**, with four packaging lines (Line 1 - Line 4).

> **Fictional data.** Every company, line, crew and person in this project is made up.
> Names are generated from invented placeholder lists; any resemblance to real people or
> organisations is coincidental.
>
> **Built with AI-assisted development.** The code was written with the help of an AI
> coding assistant and reviewed, tested and directed by me.

![Planner: one shift with Line 1-4 cards, a week status strip, and an empty Shift Lead slot flagged as an error](docs/planner.png)

## Why

Planning shifts in manufacturing is often done in spreadsheets: who is on which line,
who is on vacation, and who can cover when someone calls in sick. This project models
those rules as typed, tested, pure functions so a planner can see staffing gaps at a
glance and get **suggestions** for cover. The planner always makes the final decision.

## Status

- **Step 1:** domain model, rules, demo data, tests.
- **Step 2:** line-first planner: one shift at a time with Line 1-4 cards, a week status
  strip, and a cover panel with ranked suggestions the planner can accept. Accepted covers
  live in memory only; custom line names live in `localStorage`.
- Next: browser `localStorage` persistence, deployment.

## Using the planner

- **Week strip:** 15 small chips (Mon-Fri x Early/Late/Night) show each shift's status with an
  icon and text (✓ OK, ! warn, ✕ err). Click a chip to open that shift. A one-line summary
  shows the week's total errors and warnings.
- **One shift at a time:** day tabs and shift tabs, with the crew on duty and the shift times.
- **Line cards (Line 1-4):** each card has fixed rows: Shift Lead, Mechanic, Primary,
  Secondary (1-2). Empty slots read **"— missing"** and are styled as errors. The card header
  says what is wrong in a few words (e.g. "No Primary", "Only 1 Secondary").
- Status always uses colour **and** an icon **and** text, so it does not rely on colour alone.
- **Cover:** click a slot to open the cover panel with that role preselected.
  **The app only suggests; the planner decides** by pressing _Accept_. Each crew has two
  spare people, so same-crew cover is usually available.
- **Settings → Line names:** rename lines for your own use. Names are stored only in this
  browser's `localStorage` and are never part of the repository.
- **Load demo data / Reset** restores the seeded demo data and discards accepted covers.
- On a weekend, "This week" means the coming week.

## Domain rules

**Shifts** (Monday-Friday only, no Sunday or holiday work; a shift belongs to the date it starts):

| Shift | Time          |
| ----- | ------------- |
| Early | 05:45 - 14:00 |
| Late  | 13:45 - 22:00 |
| Night | 21:45 - 06:00 |

**Roles:** Primary, Secondary, Shift Lead, Mechanic.

**Minimum staffing per line and shift**

| Role       | Rule                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| Primary    | exactly 1 (none = error, more than 1 = warning)                             |
| Secondary  | at least 1 (none = error), 2 is optimal (1 = warning)                       |
| Shift Lead | 1 (none = error)                                                            |
| Mechanic   | ideally 1 per line; per shift: fewer than 2 = error, fewer than 4 = warning |

**Qualifications:** each person is qualified for certain roles on certain lines.

- Mechanics can work as mechanic on any line, and can stand in as operator only on their listed lines.
- A Shift Lead can stand in as Secondary; as Primary only as a last resort (warning).
- Absent or unqualified people do not count toward the minimums.

**Absences:** Vacation, Sick, Training, Overtime off, Contract end.

**Crews and rotation:** three crews rotate weekly in a backward rotation
(Early -> Night -> Late). The app shows an informational note that forward rotation
(Early -> Late -> Night) is generally recommended, but does not enforce it.

**Cover suggestions** are ranked:

1. Qualified for the role, from the crew on that shift and not yet assigned
2. Qualified for the role, from another crew (with a rest-time note)
3. Stand-ins (Lead as Secondary, Mechanic as operator)
4. Stand-ins with a warning (Lead as Primary)

## Tech

- Vite + React + TypeScript (`strict`, `noUncheckedIndexedAccess`)
- zod for schemas and runtime validation
- Vitest + Testing Library for unit and component tests
- ESLint (flat config) + Prettier
- Deterministic, seeded demo-data generator (66 people in 3 crews, incl. 2 spares each)

```
src/domain/
  schemas.ts         zod schemas + types (Person, Crew, Line, Shift, Absence, Assignment, Plan)
  constants.ts       lines, crews, shift times, staffing targets
  rotation.ts        which crew works which shift in a given week
  qualifications.ts  who may fill which role on which line (incl. stand-ins)
  availability.ts    absences, weekends/holidays, double bookings
  staffing.ts        per-line and per-shift checks -> errors / warnings / info
  cover.ts           ranked cover suggestions
  demoData.ts        seeded fictional data
```

## Getting started

```bash
npm install
npm run dev        # placeholder UI
npm test           # unit tests
npm run lint
npm run typecheck
```

## License

MIT
