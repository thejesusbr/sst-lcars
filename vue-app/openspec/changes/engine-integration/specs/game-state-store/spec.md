## ADDED Requirements

### Requirement: Consoles drive the engine through the store
Every gameplay console SHALL read its displayed state from `useGameState` and route
every player action through the store's engine-backed actions. Today the store
exposes `dispatchPlayerAction`, `executeEndTurn`, `executeSkipTurns` and
`executeDockingRepairTurn`, and **no console calls any of them** — the engine is
unreachable from the UI (`fase-4-engine` design.md decision #38).

Scope: `ShieldConsole`, `WeaponsConsole`, `EngineeringConsole`, `NavSensingConsole`,
`StarChartConsole`, `SituationPanel`, `GameScreen`. `HelmConsole` is already bound
and serves as the reference pattern.

#### Scenario: A turn-consuming control resolves a real turn
- **WHEN** the player activates any turn-consuming control (fire, hail, lock,
  load/unload tube, dock, launch probe, send party, move)
- **THEN** the store's engine action runs and the resolved turn's effects appear
  across every console reading the affected domain

#### Scenario: A free control does not resolve a turn
- **WHEN** the player adjusts a dial, transfers shield energy, toggles a
  subsystem, or dispatches a Damage Control team
- **THEN** no turn resolution occurs and no enemy response is triggered

#### Scenario: No console keeps a local copy of shared state
- **WHEN** any console is inspected for local `ref`s mirroring `GameState` domains
- **THEN** it holds none — shared domains are read from the store, and only
  pure-UI state (open tab, selected cell, animation flags) stays local

### Requirement: Store action surface is frozen before consoles are wired
The store's action surface SHALL be finalized and reviewed against these
requirements before console binding begins in parallel. All 7 consoles consume the
same surface; changing it midway forces rework across all of them — the same
sequential-gate reasoning that `fase-4-engine` decision #36 applied to
`constants.ts` before its parallel phase (design.md decision 4).

#### Scenario: Console work starts from a settled contract
- **WHEN** console binding begins
- **THEN** the store already exposes every action and derived value the 7 consoles
  need, including movement actions and free adjustments

### Requirement: Mode transitions are driven by real game state
`GameScreen.vue` SHALL switch between `briefing`, `playing` and `result` from
`GameState.mode` and the end-game evaluation, not a static `v-if`. Reaching a
terminal condition SHALL surface the result screen with its reason and rating.

#### Scenario: Terminal condition surfaces the result screen
- **WHEN** any terminal condition becomes true during turn resolution
- **THEN** `GameScreen` transitions to `result` mode showing that condition's
  reason and the Commander rating

#### Scenario: New Game returns to a playable state
- **WHEN** the player confirms "New Game" from the result screen
- **THEN** state resets to initial constants and the mode returns to play

### Requirement: Alert condition is an enumerated level, not a boolean
`GameState` SHALL carry `alertLevel: 'green' | 'yellow' | 'red'`, replacing the
current `redAlert: boolean`. The enumerated form lands now, before the 7 consoles
of this change start reading the field, so that adding further alert levels later
does not require migrating every reader (design.md decision 7).

The engine, store and consoles SHALL treat all three levels as valid state.
`SituationPanel`'s toggle SHALL set `red` or `green`, and the engine MAY raise the
level automatically (e.g. entering a hostile quadrant).

**Visual treatment is deliberately scoped to `green` and `red` in this change.**
The theme layer is binary by construction — each of the 7 themes defines a single
`-alert` variant per color role, and `theme.css` carries 29 `.red-alert` rules
swapping each role for its counterpart. Rendering a distinct `yellow` look would
mean ~49 new CSS variables plus the equivalent rule set across all 7 themes, which
is color-system work (section 13), not engine integration. So `yellow` SHALL be
representable, persistable and readable, while rendering without a theme of its own
until a future change extends the color system.

#### Scenario: Toggle sets red and green
- **WHEN** the player toggles the alert condition in `SituationPanel`
- **THEN** `alertLevel` becomes `red` when engaged and `green` when disengaged, and
  the existing `.red-alert` body class follows the `red` state

#### Scenario: Yellow is valid state without its own theme
- **WHEN** `alertLevel` is set to `yellow`
- **THEN** it persists and reads back correctly, and the UI renders without the
  red-alert treatment — no crash, no fallback to `red`

#### Scenario: Level survives a reload
- **WHEN** the alert level is `red` and the page is reloaded
- **THEN** the restored state still reads `red`

### Requirement: Combat Log tab blinking reflects unread markers
`SituationPanel`'s three log category tabs SHALL render a blinking state while a
category's entry count exceeds its read marker, and `CombatLog.vue` SHALL advance
that marker only when the player scrolls to the bottom with that tab active — never
on tab switch. The widget SHALL NOT auto-scroll to the newest entry.

#### Scenario: New entry in an inactive category blinks its tab
- **WHEN** a turn appends an entry to a category the player is not reading
- **THEN** that category's tab blinks

#### Scenario: Scroll position holds where the player left it
- **WHEN** entries are appended while the player has scrolled up
- **THEN** the scroll position does not jump to the newest entry
