## ADDED Requirements

### Requirement: Navigation is invoked by turn resolution
Every per-turn behavior this capability already implements SHALL be invoked by the
turn engine. `engine/navigation.ts` is fully implemented and unit-tested but
imported by nothing outside its own test file, so none of it currently affects a
running game (`fase-4-engine` design.md decision #38).

The turn engine SHALL, at the step anchored by the `turn-engine` capability:
advance an in-progress warp trip; advance and resolve a launched probe; tick boost
duration (only on turns the ship actually moved under impulse) and boost cooldown;
age LRS scan data and Star Chart entries so their confidence decays.

#### Scenario: An in-progress warp trip advances each turn
- **WHEN** a multi-turn warp trip is underway and a turn resolves
- **THEN** its remaining duration decreases, and the ship arrives when it reaches
  zero

#### Scenario: Boost duration only spends on turns the ship moved
- **WHEN** boost is active but the player takes a non-movement action
- **THEN** the boost's remaining duration is unchanged

#### Scenario: Boost cooldown counts down every turn
- **WHEN** boost cooldown is nonzero and any turn resolves
- **THEN** the cooldown decreases, regardless of the action taken

### Requirement: Probe launch consumes stock and uses the real travel duration
Launching a probe SHALL decrement `remainingProbes` and SHALL compute duration as
`distance + 1` turns using the shared Chebyshev metric. Today the turn engine
hardcodes a 2-turn duration and never decrements the counter, so probes are
effectively unlimited and their distance is ignored.

#### Scenario: Launching decrements the probe counter
- **WHEN** the player launches a probe with 3 remaining
- **THEN** `remainingProbes` becomes 2 immediately

#### Scenario: Duration scales with distance
- **WHEN** probes are launched at Chebyshev distances 1 and 3
- **THEN** they resolve after exactly 2 and 4 turns respectively

#### Scenario: Launch is rejected with no probes left
- **WHEN** `remainingProbes` is 0 and the player attempts a launch
- **THEN** the action is rejected and no turn is consumed

### Requirement: Probe resolution reveals data and rolls hostile risk
A resolving probe SHALL run the hostile-sector destruction check
(`40% + 5%` per enemy beyond the first) and, on survival, write the scanned
quadrant into the Star Chart's explored record. Today resolution merely clears the
probe, revealing nothing and risking nothing.

#### Scenario: Surviving probe marks its target explored
- **WHEN** a probe resolves against a sector with no enemies
- **THEN** that quadrant becomes marked explored with its KBS code at full
  confidence

#### Scenario: Destroyed probe reveals nothing and is not refunded
- **WHEN** a probe's destruction check succeeds against a hostile target
- **THEN** no scan data is written, `remainingProbes` is not refunded, and the
  combat log records loss of contact

### Requirement: Sector queries live in a shared leaf module
Sector/entity queries — visible (non-cloaked) entities, entity-type
classification, occupied cells, adjacency — SHALL live in a leaf module
(`engine/sector.ts`) that imports only from `types/game.ts`. Consumers
(`combat`, `damage-control`, `navigation`, `docking`, and later
`world-generation`) import from it rather than from each other.

This restores the dependency invariant of `fase-4-engine` decision #36, currently
broken by `damageControl.ts` importing `getVisibleEnemies` from `combat.ts`
(design.md decision 2).

#### Scenario: No engine module imports a sibling module
- **WHEN** the engine's internal import graph is inspected
- **THEN** every module imports only from `types/game.ts` and the leaf modules
  (`constants.ts`, `sector.ts`) — except the orchestrator (`turnEngine.ts`) and
  `endGame.ts`, which may compose the others

#### Scenario: Shared query returns one consistent answer
- **WHEN** `combat` and `damage-control` both ask for the visible enemies of the
  same sector state
- **THEN** both receive the same result from the same implementation
