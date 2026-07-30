# game-state-store

## Purpose

O `GameState` como fonte única reativa, a store Pinia como camada fina sobre o
engine, e o contrato que os consoles consomem.

## Requirements

### Requirement: Single reactive GameState
The system SHALL expose one Pinia store (`useGameState`) as the single source of truth
for position, energy, subsystems, damage-control teams, Warp Core status, alert level,
and combat log. No console SHALL keep its own local copy of any of these domains.

#### Scenario: Store is the only owner of shared domains
- **WHEN** any console component needs the energy budget, ship position, or subsystem
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
Starting a New Game SHALL reset `GameState` and **generate a fresh world**. The
previously listed fixed values `enemiesLeft 12` and `starbasesLeft 5` are replaced
by generation outcomes (`world-generation` capability, "Enemy and starbase totals
are derived from generation") — those counts now vary per playthrough, expected
~17.3 enemies and ~4.6 starbases.

The remaining initial constants are unchanged: stardate 3600.0, torpedoes 8, probes
3, shieldEnergy 1500, subsystems at 100%, no CdD fatigue, no active Warp Core
overload/breach, no tribble infestation, `lifeSupportTurnsRemaining` unset.

`GameState` additionally carries the generation **seed**, so a playthrough is
reproducible.

#### Scenario: New Game produces a brand-new galaxy
- **WHEN** the player confirms "New Game" from `ResultScreen`
- **THEN** a new galaxy is generated with a new seed — the previous game's quadrant
  contents, base placements and planet charges are not reused

#### Scenario: Enemy count comes from generation, not a constant
- **WHEN** a new game starts
- **THEN** `enemiesLeft` equals the number of Klingons the generator actually placed

#### Scenario: A fresh game starts in playable state
- **WHEN** a new game starts
- **THEN** `currentSector` is populated for the starting quadrant and `starbases`
  contains every placed base — neither is empty

#### Scenario: New Game clears a finished game's state
- **WHEN** player confirms "New Game" from `ResultScreen`
- **THEN** every non-generated `GameState` field returns to its initial constant
  value, overwriting the persisted save

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

### Requirement: Energy is throughput, not a depletable stock

`GameState` SHALL NOT carry a depletable energy reserve, and `EndGameReason`
SHALL NOT include `out_of_energy`. The Warp Core generates a per-turn output and
subsystems draw against it; drawing more than it generates produces **overload**,
which damages the core and can escalate to a radiation breach. Overload and
breach are what replaces the classic game's energy-exhaustion loss condition.

This supersedes the `energy-management` capability's contradictory wording, which
called `mainEnergy` both "Warp Core nominal output" (throughput) in its
Requirement and "the depletable reserve" (stock) in its Scenario. The 1978
source's `E=E-N-10` drain was deliberately discarded, not adapted.

Consequences:
- `SituationPanel`'s "Energy Level" widget SHALL display the **budget**
  (generated − consumed), not a reserve. Negative means overload is running.
- Shield energy SHALL be a **level**, adjustable freely and instantly with no
  source pool to draw from; the held level taxes `subsystemDraw` every turn.
- Firing phasers SHALL NOT be gated by available stock. The shot always fires at
  the chosen power; the cost is that turn's draw, which may exceed output.
- Damage that saturates the shields SHALL consume **hull integrity**
  (`hullIntegrity`, 0–100). Reaching 0 SHALL end the game with `hull_destroyed`.
  Without an energy pool, the overflow needed a real sink.

#### Scenario: Effective output falls with Warp Core damage
- **WHEN** the Warp Core's integrity drops
- **THEN** the power it can generate is `4500 × (1 - d)`, so an unchanged
  consumption level can begin to exceed it — a damaged core spirals, because the
  resulting overload damages it further

#### Scenario: Turning subsystems off is the answer to a tight budget
- **WHEN** consumption exceeds what the core generates
- **THEN** lowering shields or toggling off non-essential subsystems reduces the
  draw and stops the overload — this is the intended tactical response, and the
  reason the toggles exist

#### Scenario: Sustained high consumption never ends the game by exhaustion
- **WHEN** the ship runs at high draw for many turns
- **THEN** no terminal condition fires from energy — the risk is core damage from
  overload, never an empty tank

### Requirement: Automatic overload scales linearly with absolute excess

`autoOverload` SHALL be computed from the **absolute** energy excess
(`ceil((draw - output) / OVERLOAD_PER_EXCESS)`, clamped to `[1, 20]` once
exceeded), NOT as a percentage of the core's output.

The percentage form stacked two exponentials: the ratio is hyperbolic (a damaged
core's shrinking output shrinks the denominator, so the ratio explodes) and
`WARP_CORE_DAMAGE_TABLE` is Fibonacci. Measured effect: 7 points of Warp Core
integrity spanned the entire damage table — integrity 42 took `0.02` damage per
turn while integrity 35 took `85` plus a 55% explosion roll. The spiral was a
cliff, and a core below ~35% died in a single turn with no decision available.

Rejected alternatives, both computed: raising throughput (would need `7979`,
1.77×) and softening the degradation slope (`output = 4500 × (1 - 0.81d)`). Each
merely relocated the cliff from 35% to 20% while leaving it vertical, and the
throughput change additionally neutered the mechanic — 1277 spare budget at 40%
integrity means consumption stops mattering and the subsystem toggles lose their
purpose.

#### Scenario: Degradation is a gradient, not a cliff
- **WHEN** Warp Core integrity falls in 5-point steps under cruise consumption
- **THEN** the resulting per-turn damage never multiplies by more than 10× across
  any single step — a core at 20% integrity survives roughly 23 turns, long
  enough to act on it

#### Scenario: Cutting consumption stops the overload entirely
- **WHEN** shields are lowered and every non-essential subsystem is toggled off,
  leaving only the untoggleable baseline draw
- **THEN** automatic overload is `0` at any Warp Core integrity, including
  below 20% — shutting systems down is always a viable recovery

#### Scenario: Deliberate overdraw is still dangerous at full integrity
- **WHEN** the ship fires phasers at maximum power with shields held at maximum
  while moving under impulse, with an undamaged core
- **THEN** the excess saturates the overload scale — the gentler curve does not
  make overdrawing free
