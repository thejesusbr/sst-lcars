## ADDED Requirements

### Requirement: Single reactive GameState
The system SHALL expose one Pinia store (`useGameState`) as the single source of truth
for position, energy, subsystems, damage-control teams, Warp Core status, alert level,
and combat log. No console SHALL keep its own local copy of any of these domains.

#### Scenario: Store is the only owner of shared domains
- **WHEN** any console component needs `mainEnergy`, ship position, or subsystem
  integrity
- **THEN** it reads/writes exclusively through `useGameState`, never a local `ref`
  seeded from props

### Requirement: Automatic persistence to localStorage
The system SHALL persist the full `GameState` to `localStorage` automatically on every
mutation and restore it on load, using `pinia-plugin-persistedstate`.

#### Scenario: Store persists across reload
- **WHEN** state changes and the page is reloaded
- **THEN** the restored state matches what was saved, not the initial constants

### Requirement: New Game resets to initial constants
Starting a New Game SHALL reset `GameState` to the initial constants (stardate 3600.0,
enemiesLeft 12, starbasesLeft 5, torpedoes 8, probes 3, shieldEnergy 1500, subsystems
at 100%, no CdD fatigue, no active Warp Core overload/breach, no tribble infestation,
`lifeSupportTurnsRemaining` unset — design.md decision #37).
`starbasesLeft` was lowered from an earlier placeholder of 14 to 5 after checking the
1978 source's galaxy-generation odds (2 base + ~4% chance per quadrant across 64
quadrants), which expects roughly 4–5 starbases per game — 14 was far outside that
range and would have made docking/resource-pool pressure (design.md decision #8)
much less meaningful than intended (design.md decision #22).

#### Scenario: New Game clears a finished game's state
- **WHEN** player confirms "New Game" from `ResultScreen`
- **THEN** every `GameState` field returns to its initial constant value, overwriting
  the persisted save

### Requirement: Combat Log unread tracking per category
`GameState` SHALL track a read marker per `LogCategory` (`captain`/`general`/
`engineering`) — a count of how many of that category's entries have been read.
A category counts as unread when its filtered entry count exceeds its read marker.
The marker only advances when the player scrolls the `CombatLog` widget to the
bottom while that category's tab is active — opening the tab alone does NOT mark
it read (design.md decision #27).

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
