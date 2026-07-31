## MODIFIED Requirements

### Requirement: Alert condition is an enumerated level, not a boolean
`GameState` SHALL carry `alertLevel: 'green' | 'yellow' | 'red'`, replacing the
current `redAlert: boolean`. The enumerated form lands now, before the 7 consoles
of this change start reading the field, so that adding further alert levels later
does not require migrating every reader (design.md decision 7).

The engine, store and consoles SHALL treat all three levels as valid state.
`SituationPanel`'s toggle SHALL set `red` or `green`.

**The engine SHALL raise the level automatically**, replacing the permissive
`MAY` this requirement carried since `engine-integration` — under which nothing
was ever implemented and the player entered hostile sectors at green alert:

- **`red`** when a hostile is visible in the ship's current sector.
- **`yellow`** when a hostile is known to be in the neighbourhood but not in the
  current sector — known meaning revealed by an LRS scan or by having moved
  adjacent to a quadrant already detected as hostile.

**Lowering the level SHALL always be the player's decision.** The engine never
lowers it. An engine that drops the alert the moment a sector clears would fight
the player who raised it deliberately during a withdrawal, and the cost of a
stale red alert is a themed interface, not a mechanical penalty.

This gives `yellow` its first function. Visual treatment stays scoped to `green`
and `red`: the theme layer is binary by construction — each of the 7 themes
defines a single `-alert` variant per colour role, and `theme.css` carries 29
`.red-alert` rules. A distinct `yellow` look means ~49 new variables plus rules
across all 7 themes, which is colour-system work, tracked as a separate future
change. Until then `yellow` is fully representable, persistable and readable, and
renders without a treatment of its own.

#### Scenario: Toggle sets red and green
- **WHEN** the player toggles the alert condition in `SituationPanel`
- **THEN** `alertLevel` becomes `red` when engaged and `green` when disengaged, and
  the existing `.red-alert` body class follows the `red` state

#### Scenario: Entering a hostile sector raises red
- **WHEN** the ship arrives in a sector holding a visible hostile
- **THEN** `alertLevel` becomes `red` without the player touching the toggle

#### Scenario: A hostile neighbour raises yellow
- **WHEN** a hostile is known in the neighbourhood — from an LRS scan or from
  moving adjacent to a quadrant already detected as hostile — and none is in the
  current sector
- **THEN** `alertLevel` becomes `yellow`

#### Scenario: Clearing the sector does not lower the alert
- **WHEN** the player destroys the last hostile in the sector
- **THEN** `alertLevel` stays where it was until the player lowers it

#### Scenario: Yellow is valid state without its own theme
- **WHEN** `alertLevel` is set to `yellow`
- **THEN** it persists and reads back correctly, and the UI renders without the
  red-alert treatment — no crash, no fallback to `red`

### Requirement: Combat Log unread tracking per category
`GameState` SHALL track a read marker per `LogCategory` (`captain`/`general`/
`engineering`/`science`) — a count of how many of that category's entries have
been read. A category counts as unread when its filtered entry count exceeds its
read marker. The marker only advances when the player scrolls the `CombatLog`
widget to the bottom while that category's tab is active — opening the tab alone
does NOT mark it read (design.md decision #27).

`science` is the fourth category, splitting sensor readings out of `captain`:
scan results, survey findings, the landing party's dilithium report and the
probe's report. `captain` keeps command decisions — hailing, launching and
recalling a landing party, launching a probe. The line is who the entry is
addressed to: what the science station reports versus what the captain decided.

#### Scenario: New entry in a category arrives while its tab is active but not scrolled to bottom
- **WHEN** a new `combatLog` entry of the active category is appended and the
  widget is scrolled up (not at the bottom)
- **THEN** the read marker for that category does NOT advance and the tab's
  unread indicator (blink) turns on

#### Scenario: Scrolling to the bottom marks the active category read
- **WHEN** the player scrolls the `CombatLog` widget to its bottom while a given
  category's tab is active
- **THEN** that category's read marker advances to match its current entry count
  and its tab stops blinking

#### Scenario: Switching tabs does not mark anything read
- **WHEN** the player clicks a different category's tab
- **THEN** neither the newly active nor the previously active category's read
  marker changes — only reaching the bottom of the scroll does

#### Scenario: Unread category tab blinks
- **WHEN** a category's entry count is greater than its read marker
- **THEN** that category's tab button SHALL render with a blinking state,
  independent of whether it is the currently active tab

#### Scenario: Scroll position holds at the last-read entry, not the newest
- **WHEN** a new entry is appended to a category the player has already scrolled
  through, and the player has not reached the bottom again
- **THEN** the widget's scroll position SHALL NOT jump to the newest entry — it
  stays where the player left it, same as any passive log the player controls

#### Scenario: A decision and its finding land in different categories
- **WHEN** the player sends a landing party and it later reports dilithium
- **THEN** the dispatch is recorded under `captain` and the finding under
  `science`

## ADDED Requirements

### Requirement: The science column mirrors the science log
`NavSensingConsole` SHALL carry a third column showing the `science` category's
entries, alongside the SRS and LRS columns.

Scan, survey and exploration results had nowhere to live. The adjacent-base hint
delivered by `hail-and-identity` was squeezed between the two scanners in a size
the player could not read, and a hail's answer — base type, quadrant, pool level
— scrolled past in a log tab on another panel. These are the readings a science
station reports, and the navigation/sensor console is where the player is looking
when they matter.

The column SHALL be a view of the same log the `science` tab shows, not a second
store. One record, two places to read it.

#### Scenario: A scan result appears in the column
- **WHEN** an LRS scan resolves
- **THEN** its report appears in the science column without the player switching
  consoles

#### Scenario: The column and the tab agree
- **WHEN** the same entry is present in both
- **THEN** they show the same text, from the same log
