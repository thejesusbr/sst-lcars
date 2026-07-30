# turn-engine

## Purpose

Resolução de turno em 5 etapas fixas, os ticks ancorados em cada etapa, e os
modos de avanço (End Turn, Skip N, Docking Loop).

## Requirements

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

#### Scenario: Warp Core resolves before enemy turn
- **WHEN** a player action ends a turn
- **THEN** Warp Core damage/explosion/breach rolls are resolved before any enemy
  attack is calculated for that same turn

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

### Requirement: Random subsystem damage on a strong hit
When an enemy attack's computed `H` is at least 20 AND a `60%` chance roll succeeds
AND `H / currentShieldEnergy > 0.02`, the engine SHALL pick one random subsystem and
reduce its integrity by `H / currentShieldEnergy + 0.5 * random(0,1)` — exact
formula and thresholds reused from the 1978 source's device-damage roll.

#### Scenario: Weak hits never risk subsystem damage
- **WHEN** an enemy attack's `H` is below 20
- **THEN** no subsystem damage roll occurs for that hit

#### Scenario: Strong hit relative to current shields can damage a subsystem
- **WHEN** `H >= 20` and `H` is more than 2% of current `shieldEnergy`
- **THEN** a 60% chance roll determines whether one random subsystem takes damage
  that turn

### Requirement: Enemy repositions when the player engages movement
When the player's turn-consuming action this turn is engaging movement (impulse or
warp, `navigation` capability), each enemy still present in the sector being
departed SHALL first reposition to a random unoccupied cell in that sector, then
attack (per the requirements above), before the ship's own movement resolves — this
is deterministic (always happens on a movement attempt), not a probabilistic
"chance to move" roll, and it does not occur on any other turn-consuming action
(Fire, Hail, Lock, End Turn, etc.) or on free dial/dispatch adjustments (design.md
decision #21).

#### Scenario: Enemies reposition before the ship departs
- **WHEN** the player engages warp or impulse movement with enemies present in the
  current sector
- **THEN** each enemy moves to a new random unoccupied cell in that sector, then
  attacks, before the ship's displacement is computed

#### Scenario: No repositioning on non-movement actions
- **WHEN** the player fires phasers, fires torpedoes, hails, or takes any other
  turn-consuming action that is not engaging movement
- **THEN** enemies attack from their current position without repositioning first

### Requirement: Cloaked Raider ticks stress instead of attacking
For each `Cloaked Raider` currently cloaked (`combat` capability), the enemy-turn
step SHALL instead accumulate its cloak stress (no attack, no movement roll, no
repositioning) and force decloak once its stress cap is reached (design.md decision
#17).

#### Scenario: Cloak stress accumulates during this same step
- **WHEN** a turn resolves with a `Cloaked Raider` currently cloaked in the sector
- **THEN** its cloak stress increases this step, independent of any attack/movement
  roll (it makes neither while cloaked)

### Requirement: Free adjustments vs turn-consuming actions
The engine SHALL distinguish two classes of player interaction:

- **Free (no turn cost, no `turnEngine` invocation):** Impulse Power level, Phaser
  Power level, Shield Energy transfer/raise/lower, Warp Core "Set Overload" dial,
  Auto-Navigation Computer on/off toggle, and Damage Control team dispatch/recall/
  reassignment. These only reconfigure the ship's own settings/assignments; their
  effects are realized through subsequent turn resolutions, not immediately.
- **Turn-consuming (each invocation resolves via the fixed order above, exactly 1
  turn unless a multi-turn duration is explicitly specified elsewhere):** Fire
  Phasers, Fire Torpedoes, loading or unloading a torpedo tube (`combat`
  capability, design.md decision #31 — unlike the free weapon-power dials, a tube
  physically handling a live torpedo takes a turn each way), Hail, Weapons Lock
  re-acquisition, launching a probe (resolves over `distância + 1` turns,
  `navigation` capability), launching a Send Party mission (fixed 3 turns,
  `damage-control` capability), engaging warp/impulse travel
  (`ceil(distância/warpFactor)` turns or immediate for impulse, `navigation`
  capability), triggering Dock (starts the multi-turn docking loop, `docking`
  capability), and End Turn / Skip N Turns (see below). Undocking remains free (no
  turn cost, design.md decision #13).

#### Scenario: Adjusting a dial mid-sector does not trigger enemy response
- **WHEN** the player adjusts Phaser Power, Shield Energy, or the Overload dial any
  number of times
- **THEN** no `turnEngine` resolution occurs as a direct result

#### Scenario: Firing always resolves exactly one turn
- **WHEN** the player clicks "Fire Phasers" or "Fire Torpedoes"
- **THEN** the fixed turn resolution order runs once for that action

### Requirement: End Turn — explicit no-op turn advance
The engine SHALL support an "End Turn" action, exposed from `SituationPanel`
regardless of the active console tab, that resolves exactly one turn with no
player-action step 1 — steps 2–5 of the fixed order (Warp Core, enemy turn,
terminal conditions, log/display update) still run normally. This closes a gap no
other action fills: waiting out an in-progress Damage Control repair, boost
cooldown, probe/Send Party mission, or `Cloaked Raider` cloak-stress timer, without
being forced to fire, move, or otherwise act.

#### Scenario: End Turn advances time with no player action
- **WHEN** the player clicks "End Turn"
- **THEN** the turn resolves as normal (Warp Core, enemy turn, terminal checks, log)
  with no player-action effect applied

#### Scenario: End Turn is available from any console
- **WHEN** the player is on any console tab (Helm, Weapons, Shield, etc.)
- **THEN** "End Turn" in `SituationPanel` remains clickable, independent of the
  active tab

### Requirement: Skip N Turns — batched End Turn with early interrupt
The engine SHALL support a "Skip N Turns" action that repeats "End Turn" up to N
times, stopping before N is reached if any of the following occurs on an
intermediate turn: an enemy becomes newly present/visible in the current sector,
the ship takes any damage (`shieldIntegrity` or any subsystem integrity
decreases), a radiation breach starts, any end-game terminal condition becomes
true, or an in-progress mission (probe, Send Party) completes.

#### Scenario: Skip completes all N turns when nothing notable happens
- **WHEN** the player triggers "Skip N Turns" and no interrupt condition occurs in
  any of the N turns
- **THEN** all N turns resolve and the result reflects N consecutive End Turns

#### Scenario: Skip stops early on new enemy or damage
- **WHEN** an enemy newly enters the sector or the ship takes damage during turn
  `k` of an `N`-turn skip (`k < N`)
- **THEN** the skip stops immediately after turn `k`, not continuing to `N`

#### Scenario: Skip stops early on mission completion
- **WHEN** a probe or Send Party mission completes during an intermediate turn of
  the skip
- **THEN** the skip stops immediately after that turn, surfacing the mission result
  before any further turns resolve

### Requirement: Warp Core overload and breach rolls
The *effective* overload that feeds the damage/explosion tables SHALL be the sum
of all three contributing sources — `manualOverload` (the Engineering dial, 0–20)
plus `autoOverload` (the `energy-management` capability's "Automatic overload
from over-consumption") plus any transient warp-travel stress (the `navigation`
capability's "Warp travel duration and Warp Core stress", when `warpFactor > 4`)
— clamped to `[0, 20]` before indexing, since `WARP_CORE_DAMAGE_TABLE`/
`WARP_CORE_EXPLOSION_CHANCE_TABLE` only define entries for that range. This
corrects an earlier version of this requirement that only summed
`manualOverload` and warp-travel stress, silently excluding `autoOverload` from
ever affecting the damage/explosion rolls it was designed to trigger
(design.md decision #29). While effective overload is greater than 0, the engine
SHALL apply `WARP_CORE_DAMAGE_TABLE[overload]` damage to the Warp Core subsystem
per turn and roll `WARP_CORE_EXPLOSION_CHANCE_TABLE[overload]` chance of
explosion. Independently of overload, the engine SHALL roll a radiation breach
chance proportional to the Warp Core's accumulated damage every turn.

#### Scenario: Over-consumption alone can trigger the damage/explosion roll
- **WHEN** `autoOverload` is nonzero (routed energy exceeds `WARP_CORE_OUTPUT`)
  even with `manualOverload` at 0 and no warp-travel stress
- **THEN** the effective overload used for that turn's damage/explosion roll is
  at least `autoOverload`, not 0

#### Scenario: Breach can trigger without overload
- **WHEN** the Warp Core has accumulated damage from combat but `warpCoreOverload` is
  currently 0
- **THEN** the engine still rolls a nonzero chance of radiation breach that turn

#### Scenario: Breach starting plays a distinct alarm cue
- **WHEN** a radiation breach roll succeeds and a breach starts
- **THEN** a Warp Core breach alarm sound plays (`Sound.WC_BREACH`, `useSound`
  composable, design.md decision #34), distinct from the Red Alert klaxon

#### Scenario: Explosion is capped
- **WHEN** `warpCoreOverload` is 20 (maximum)
- **THEN** the per-turn damage and explosion chance never exceed the caps (85 damage,
  55% chance) defined in `WARP_CORE_DAMAGE_TABLE`/`WARP_CORE_EXPLOSION_CHANCE_TABLE`

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

### Requirement: Life Support critical damage starts a 5-turn survival countdown
Life Support has its own dedicated mechanic, distinct from the generic
leve/moderado/crítico degradation model (design.md decisions #35/#37) — leve
and moderado damage have no gameplay effect on Life Support (deliberately, not
an oversight). Only crítico matters: the moment Life Support integrity drops
below `40`, `lifeSupportTurnsRemaining` SHALL be set to `5` (a hard countdown,
independent of the generic damage fraction/bands). It SHALL decrement by `1`
every turn resolved while Life Support integrity remains below `40`. If Life
Support integrity is repaired back to `40` or above before the countdown
reaches `0`, `lifeSupportTurnsRemaining` SHALL clear (reset to unset/`null`) —
no partial credit carries into a future critical episode. If the countdown
reaches `0` while integrity is still below `40`, the game ends in defeat (see
`end-game` capability, "crew asphyxiation" reason) — the crew suffocates.

#### Scenario: Countdown starts the instant Life Support goes critical
- **WHEN** Life Support integrity drops from 45 to 35 in the same hit
- **THEN** `lifeSupportTurnsRemaining` is set to `5` that same turn

#### Scenario: Repair before the countdown expires clears it
- **WHEN** Life Support integrity is repaired back to 40+ while
  `lifeSupportTurnsRemaining` is at 2
- **THEN** `lifeSupportTurnsRemaining` clears entirely — a future critical hit
  starts a fresh countdown at `5`, not a partially-depleted one

#### Scenario: Countdown reaching 0 while still critical ends the game
- **WHEN** `lifeSupportTurnsRemaining` reaches `0` and Life Support integrity is
  still below 40
- **THEN** the game ends in defeat with reason "crew asphyxiation"

### Requirement: Docking resolution mode
The engine SHALL support a "docking resolution mode" variant of turn resolution,
invoked in a loop by the `docking` capability while a ship is docked at
`STARBASE_DOCK`. In this mode the engine SHALL skip the player-action step, redirect
any enemy-attack step to reduce the docked base's resource pool instead of the
player's `shieldEnergy`/subsystems, and SHALL suppress the Warp Core explosion and
radiation breach rolls for that tick (Warp Core damage/repair still applies
normally).

#### Scenario: Docking mode redirects enemy attacks to the base
- **WHEN** the engine runs one tick in docking resolution mode with enemies present
  in the sector
- **THEN** the enemy-turn step reduces the docked base's resource pool, not
  `shieldEnergy`, and no Warp Core explosion/breach roll occurs that tick

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
