## ADDED Requirements

### Requirement: Fixed turn resolution order
The engine SHALL resolve every player action in this order: (1) apply the player's
action, (2) resolve Warp Core state (overload damage/explosion roll, breach roll),
(3) resolve enemy turn for the current sector, (4) check terminal conditions, (5)
update all display domains and append combat log entries.

#### Scenario: Warp Core resolves before enemy turn
- **WHEN** a player action ends a turn
- **THEN** Warp Core damage/explosion/breach rolls are resolved before any enemy
  attack is calculated for that same turn

### Requirement: Klingon attack damage — exact formula reused from the 1978 source
For each non-cloaked enemy present in the player's current sector, the engine SHALL
compute attack damage as `H = floor((enemyPower / euclideanDistance) * (2 +
random(0,1)))` (Euclidean distance between enemy and ship sector position, not
Chebyshev — this one formula reuses the original's own distance metric, distinct
from the Chebyshev metric `navigation` uses for movement/pathing), reduce
`shieldEnergy` by `H` (and `mainEnergy` once shields are at 0), then deplete that
same enemy's `enemyPower` to `enemyPower / (3 + random(0,1))` — the enemy's own
attack weakens it, same stat that player weapons reduce (see "Enemy power is a
single stat for both health and attack strength", `combat` capability).

#### Scenario: Enemy attacks after player action
- **WHEN** a turn resolves and at least one non-cloaked enemy is present in the
  current sector
- **THEN** `shieldEnergy` decreases by the computed `H` and a combat log entry
  describing the attack is appended

#### Scenario: Attacking depletes the enemy's own power
- **WHEN** an enemy computes and applies an attack this turn
- **THEN** that same enemy's `enemyPower` decreases to roughly a third to a quarter
  of its pre-attack value, making it progressively weaker the more it attacks

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
