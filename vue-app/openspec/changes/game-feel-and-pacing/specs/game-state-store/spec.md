## MODIFIED Requirements

### Requirement: Consoles drive the engine through the store
Every gameplay console SHALL read its displayed state from `useGameState` and route
every player action through the store's engine-backed actions.

Scope: `ShieldConsole`, `WeaponsConsole`, `EngineeringConsole`, `NavSensingConsole`,
`StarChartConsole`, `SituationPanel`, `GameScreen`, `HelmConsole`.

**Turn-consuming controls SHALL additionally be unavailable while the store is
presenting a resolved turn or while a warp trip is in progress.** Free controls
stay available in both cases. Availability is read from the store, not decided per
console — otherwise the consoles disagree about whether the player may act.

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
  pure-UI state (open tab, selected cell) stays local

#### Scenario: Every console agrees on when the player may act
- **WHEN** a turn is being presented or a warp trip is in progress
- **THEN** turn-consuming controls are unavailable in **all** consoles at once,
  from the same shared flag

## ADDED Requirements

### Requirement: The store owns the presentation queue and travel mode
`useGameState` SHALL hold the queue of the current turn's staged events, a flag
for whether a presentation is running, and the warp travel mode. These are the
single source of truth the consoles read.

Timers driving the queue SHALL have exactly one owner. The `engine-integration`
shipped a bug of this shape already — `warpVisualTimer` living in `HelmConsole`
survived unmount — and per-console timers would also drift out of sync with each
other.

#### Scenario: Presentation state survives console switching
- **WHEN** the player switches console mid-presentation
- **THEN** the presentation continues from where it was, driven by the store

#### Scenario: A new turn cannot start over a running presentation
- **WHEN** a turn's presentation is running and another turn-consuming action is
  dispatched
- **THEN** it is refused — the queue is not overwritten mid-drain

#### Scenario: Travel mode ends exactly once
- **WHEN** a warp trip's last turn resolves
- **THEN** travel mode clears once and control returns, with no timer left behind
