## MODIFIED Requirements

### Requirement: Fixed turn resolution order
The 5-step order stays as originally specified, but each step SHALL now carry an
explicit set of per-turn ticks. Anchoring each tick to a named step makes a
missing tick a failing test instead of a silent gap — the failure mode that let
~12 behaviors go unwired (design.md decision 1, `fase-4-engine` design.md
decision #38).

1. **Player action** — including movement, where enemies reposition BEFORE the
   ship's displacement resolves.
2. **Warp Core** — plus transient warp-travel stress (when `warpFactor > 4`) and
   the radiation-breach containment tick.
3. **Enemy turn** — plus cloak stress accumulation and cloak-cooldown decrement.
4. **Terminal conditions** — plus the Life Support survival countdown.
5. **Log and domain update** — plus Damage Control repair, warp-trip/probe/boost
   progression, LRS/Star Chart confidence decay, passive phaser cooldown, and the
   Weapons Lock sensor-damage roll.

#### Scenario: Repair resolves before terminal checks cannot save a doomed ship
- **WHEN** a turn resolves in which Damage Control repair would raise a subsystem
  above a critical threshold, and a terminal condition is already true at step 4
- **THEN** the terminal condition still ends the game — repair runs at step 5,
  after the check, so it cannot retroactively rescue that turn

#### Scenario: Every anchored tick runs exactly once per resolved turn
- **WHEN** a single turn resolves
- **THEN** each tick listed above executes exactly once, in its anchored step —
  never twice, never skipped

### Requirement: Warp Core overload and breach rolls
The effective overload SHALL receive the real transient warp-travel stress value,
not a hardcoded zero. `effectiveOverload()` already computes
`manualOverload + autoOverload + warpStress` clamped to `[0,20]` correctly, but
the turn engine passes `warpStress: 0` unconditionally, leaving half of what
`fase-4-engine` decision #29 existed to fix inert.

#### Scenario: Travelling above the safe warp factor raises effective overload
- **WHEN** a travel turn resolves at `warpFactor 6` with `manualOverload` at 0
- **THEN** the effective overload used for that turn's damage/explosion roll is
  `4` (`+2` per point above warp 4), not `0`

#### Scenario: Cruising at or below warp 4 contributes no stress
- **WHEN** a travel turn resolves at `warpFactor 4` or below
- **THEN** the warp-stress contribution to effective overload is `0`

### Requirement: Radiation breach containment ticks every turn
An active breach's `turnsRemaining` SHALL decrement once per resolved turn, and
its `containment` SHALL rise from teams assigned to it. Reaching `turnsRemaining`
0 with `containment < 100` SHALL trigger the radiation-death terminal condition.
Currently a breach starts but never progresses, so it can neither be contained
nor kill.

#### Scenario: Uncontained breach kills after its countdown
- **WHEN** a breach is active with no team assigned and 5 turns resolve
- **THEN** `turnsRemaining` reaches 0 and the game ends with radiation death

#### Scenario: Contained breach clears instead of killing
- **WHEN** teams raise `containment` to 100 before `turnsRemaining` reaches 0
- **THEN** the breach resolves and no terminal condition fires from it

### Requirement: Klingon attack damage — exact formula reused from the 1978 source
The damage formula is unchanged
(`H = floor((enemyPower / euclideanDistance) * (2 + random(0,1)))`, Euclidean
distance, and the attacker weakening itself to `enemyPower / (3 + random(0,1))`).

**Where the damage lands changes:** the engine SHALL reduce `shieldEnergy` by `H`,
and once shields are saturated the remainder SHALL consume **`hullIntegrity`**
(scaled by `HULL_DAMAGE_DIVISOR`), not `mainEnergy`. There is no energy stock for
overflow damage to drain (see `game-state-store` capability, "Energy is throughput,
not a depletable stock") — hull is the sink.

#### Scenario: Shields absorb what they can, hull takes the rest
- **WHEN** an attack of `H` exceeds the current `shieldEnergy`
- **THEN** `shieldEnergy` goes to 0 and the remainder reduces `hullIntegrity`

#### Scenario: Full shields keep the hull untouched
- **WHEN** an attack lands with `shieldEnergy` well above `H`
- **THEN** `shieldEnergy` absorbs all of it and `hullIntegrity` is unchanged

## ADDED Requirements

### Requirement: Movement actions resolve real displacement
`move_impulse` and `move_warp` SHALL perform actual movement via the `navigation`
capability. Both are currently declared in `PlayerActionType` with no
implementation branch — they are accepted, consume a turn, and do nothing.
Resolution SHALL respect the `navigation` capability's rules: manual navigation
stops short of obstacles, Auto-Nav routes around them, Warp Engines damage caps
speed and can stall or paralyze, and enemies in the departing sector reposition
before displacement (`fase-4-engine` decision #22).

#### Scenario: Engaging warp moves the ship
- **WHEN** the player engages warp toward a reachable destination
- **THEN** the ship's position changes according to the resolved route, over
  `ceil(distance / warpFactor)` turns

#### Scenario: A declared action never silently no-ops
- **WHEN** any action in `PlayerActionType` is dispatched
- **THEN** it either produces its specified effect or is explicitly rejected with
  a reason — it SHALL NOT consume a turn while doing nothing

#### Scenario: Enemies reposition before the ship departs
- **WHEN** movement is engaged with enemies present in the current sector
- **THEN** each enemy repositions and attacks before the ship's displacement is
  computed

### Requirement: Send Party action resolves the landing-party mission
`send_party` SHALL launch the landing-party mission defined by the
`damage-control` capability (adjacency eligibility, fixed 3-turn duration,
`+30` Warp Core integrity on success, hostile-sector risk). It is currently
declared without an implementation branch.

#### Scenario: Send Party launches and resolves over 3 turns
- **WHEN** the player dispatches a landing party to an adjacent planet
- **THEN** the mission resolves exactly 3 turns later, applying its outcome

### Requirement: Quadrant entry notifies via an injected hook
The turn engine SHALL accept an optional `onQuadrantEnter(state, quadrant)` hook,
defaulting to a no-op, invoked whenever movement places the ship in a different
quadrant. This is the seam by which `world-generation` populates
`currentSector` without the turn engine importing it — keeping the two changes
independently buildable and testable (design.md decision 3).

#### Scenario: Entering a new quadrant invokes the hook once
- **WHEN** movement changes the ship's quadrant
- **THEN** the hook is invoked exactly once for the newly entered quadrant

#### Scenario: Absent hook does not break resolution
- **WHEN** no hook is supplied and the ship changes quadrant
- **THEN** the turn resolves normally with `currentSector` left untouched

### Requirement: Integration tests assert cross-module effects
The change SHALL include integration tests that drive the turn engine and assert
effects spanning module boundaries. Per-module unit tests are insufficient: 86
green unit tests coexisted with 747 lines of engine code that nothing invoked
(`fase-4-engine` design.md decision #38). The acceptance bar is explicit: **an
orphaned module MUST cause a test to fail**.

#### Scenario: Dispatched team repairs from the following turn
- **WHEN** a team is dispatched during turn N and two turns resolve
- **THEN** the target subsystem's integrity is unchanged after turn N and higher
  after turn N+1

#### Scenario: Probe consumes stock and resolves on the turn clock
- **WHEN** a probe is launched at a target at Chebyshev distance 3
- **THEN** `remainingProbes` decreases immediately and the probe resolves after
  exactly 4 turns

#### Scenario: Sensor confidence decays across turns
- **WHEN** an LRS scan is performed and several turns resolve without rescanning
- **THEN** its confidence decreases per turn, floored at 30%
