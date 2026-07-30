# docking

## Purpose

Atracagem em starbase: elegibilidade, resupply por tipo de base, pool de recursos
persistente e o loop de reparo em tier 5.

## Requirements

### Requirement: Docking eligibility
Docking SHALL only be possible when the player's sector is adjacent to a starbase
entity (`STARBASE_DOCK`, `STARBASE_SUPPLY`, or `STARBASE_SCIENCE`).

#### Scenario: Dock rejected without an adjacent base
- **WHEN** the player presses "Dock" with no starbase entity adjacent
- **THEN** the docking action is rejected and no resources change

### Requirement: Instant resupply by base type
Docking SHALL immediately (no turn cost) apply resupply per base type, subject to
the base's own resource pool (see "Base resource pool" below): `STARBASE_DOCK` and
`STARBASE_SUPPLY` restore `torpedoStock` toward max; `STARBASE_DOCK` also restores
**`hullIntegrity`** toward 100; `STARBASE_SCIENCE` provides no resource resupply
(life support confirmation only). Subsystem/Warp Core repair is NOT part of
instant resupply — see "Docking triggers multi-turn repair resolution" below,
which applies only at `STARBASE_DOCK`.

The earlier wording had `STARBASE_DOCK` restoring `mainEnergy` toward nominal.
That field no longer exists — energy is throughput, not a stock (see
`game-state-store` capability, "Energy is throughput, not a depletable stock").
Hull is what a drydock actually repairs, and it is the resource combat now
depletes, so it takes energy's place in the pool economy.

#### Scenario: A drydock repairs the hull
- **WHEN** the ship docks at a `STARBASE_DOCK` with `hullIntegrity` at 60
- **THEN** hull is restored toward 100, limited by the base's remaining pool

#### Scenario: A supply depot does not repair hull
- **WHEN** the ship docks at a `STARBASE_SUPPLY` with hull damage
- **THEN** only `torpedoStock` is restored — hull stays as it was

### Requirement: Prisoner transfer on docking (any base type)
Docking SHALL immediately (no turn cost) transfer every prisoner currently in the
brig to the base, emptying it, regardless of which of the 3 base types
(`STARBASE_DOCK`, `STARBASE_SUPPLY`, `STARBASE_SCIENCE`) the player docked at —
delivering captured prisoners is a simple administrative handoff, not a
repair/resupply service, so it is not gated by base type the way instant resupply
is. This is the brig's only release mechanism (`combat` capability, "Brig has
limited prisoner capacity"); the Damage Control team locked on guard duty
(`damage-control` capability, "Holding prisoners locks a Damage Control team on
guard duty") returns to the dispatchable pool the same instant the brig empties.
No additional rating credit is granted for delivery — the `klingonsCaptured` rating
term (`end-game` capability) was already earned at the moment of capture, not
delivery, avoiding double-counting the same prisoner.

#### Scenario: Docking at any base type empties the brig
- **WHEN** the player docks with 1 or more prisoners in the brig, at any of the 3
  base types
- **THEN** the brig count becomes 0 immediately, with no turn cost

#### Scenario: Guard-duty team returns the same instant
- **WHEN** the brig empties via docking
- **THEN** the Damage Control team locked on guard duty immediately returns to the
  normal dispatchable pool

#### Scenario: Delivery grants no extra rating credit
- **WHEN** a prisoner is delivered at a starbase
- **THEN** the Commander rating's `klingonsCaptured` contribution for that prisoner
  is unchanged from what it already was at the moment of capture

### Requirement: Docking triggers multi-turn repair resolution (StarBase only)
Docking at `STARBASE_DOCK` SHALL run the turn engine repeatedly in "docking
resolution mode" (see `turn-engine` capability) until either (a) all subsystem and
Warp Core integrity is fully repaired, or (b) the docked base is destroyed —
whichever comes first. `stardate` SHALL advance by exactly the number of resolution
ticks the loop runs. The player-facing UI SHALL update once, after the loop
completes; the combat log SHALL still receive one entry per resolved tick.

#### Scenario: Stardate advances by the actual repair duration
- **WHEN** the player docks at `STARBASE_DOCK` with damaged subsystems
- **THEN** `stardate` increases by exactly the number of ticks the repair loop ran,
  not a fixed constant

#### Scenario: Already-healthy ship docks with zero elapsed time
- **WHEN** the player docks at `STARBASE_DOCK` with all subsystems already at 100%
- **THEN** the repair loop runs zero ticks and `stardate` does not advance

### Requirement: Hostile-sector docking — base defends, not the ship
While the docking repair loop runs, if enemies are present in the sector, each
resolved tick's enemy attack SHALL reduce the docked base's resource pool instead of
the player's `shieldEnergy`/subsystems — the ship is protected by the base's own
shields for the duration.

#### Scenario: Enemy attacks deplete the base, not the ship
- **WHEN** a docking repair loop tick resolves with enemies present in the sector
- **THEN** the base's resource pool decreases and `shieldEnergy`/ship subsystem
  integrity are unaffected by that attack

### Requirement: One-time hostile-docking warning
The UI SHALL show a warning the first time the player docks at a base with enemies
present in the sector, explaining that Klingons will attack the base during the stay
and that duration depends on damage/resupply needed. This warning SHALL NOT repeat on
subsequent hostile dockings in the same playthrough.

#### Scenario: Warning shown once per playthrough
- **WHEN** the player docks in a hostile sector for the first time
- **THEN** the warning is shown
- **WHEN** the player docks in a hostile sector again later in the same playthrough
- **THEN** no warning is shown

### Requirement: Station-assisted repair rate
While the docking repair loop runs, every subsystem (including Warp Core) SHALL
repair in parallel via a dedicated station crew per subsystem — no stacking cap,
since each subsystem always has exactly one dedicated team. Rate per subsystem per
tick: `5 (base rate) * 5 (tier docked) * 1.0 (single dedicated team, no stacking
penalty) = 25 percentage points`.

#### Scenario: All subsystems repair simultaneously at the docked rate
- **WHEN** a docking repair loop tick resolves
- **THEN** every subsystem below 100% integrity (including Warp Core) gains 25
  percentage points that tick, uncapped by the normal CdD stacking multiplier

### Requirement: Ship's CdD teams rest at double rate during docking
While the docking repair loop runs, all 6 damage-control teams SHALL be treated as
idle regardless of their assignment before docking, recovering fatigue at **double**
the normal idle rate — `+16%/turn` instead of the normal `+8%/turn` (section 10.3) —
each tick, since they are on full leave at the station rather than merely idle in a
combat zone. They SHALL NOT participate in the station-assisted repair (superseding
any earlier notion of an instant 100% reset — recovery now follows this doubled
idle-recovery rate over however many ticks the loop actually runs).

#### Scenario: Teams recover fatigue at double rate proportionally to time docked
- **WHEN** a docking repair loop runs for 3 ticks
- **THEN** every CdD team's efficiency increases by 3 × 16 percentage points (capped
  at 100), not the normal 3 × 8 used for idle recovery outside a starbase, and not
  reset instantly to 100 regardless of duration

#### Scenario: Full recovery from the fatigue floor takes half as long while docked
- **WHEN** a team at the 20% fatigue floor (section 10.3) spends the entire docking
  repair loop idle
- **THEN** it returns to 100% efficiency in 5 ticks docked, versus the normal 10 idle
  turns outside a starbase

### Requirement: Docking lowers shields and zeroes overload
Immediately upon a successful dock (any base type), before any repair loop begins,
the ship SHALL set `shieldEnergy` to **0** (same effect as the existing "Lower
Shields" action) and `manualOverload` SHALL reset to 0 — the base is a safe harbor
(no need for shields) and there is no reason to run the core hot. This applies
whether or not a repair loop follows.

Lowering shields does not "return energy to `mainEnergy`" — there is no reserve to
return it to. It frees the throughput the held shield level was consuming, which
is what drops the ship's draw while docked.

#### Scenario: Overload is zero for the entire docking repair loop
- **WHEN** the player docks with `manualOverload` at any nonzero value
- **THEN** `manualOverload` becomes 0 before the first repair-loop tick runs, and
  stays 0 for the whole loop (nothing re-raises it while docked)

#### Scenario: Shields lower on dock regardless of base type
- **WHEN** the player docks at any starbase type, including `STARBASE_SUPPLY`/
  `STARBASE_SCIENCE` (no repair loop)
- **THEN** `shieldEnergy` becomes 0 and the energy budget rises by what the shields
  were drawing, even though no repair loop runs for those base types

### Requirement: Warp Core catastrophic rolls suppressed while docked
While the docking repair loop runs, the turn engine SHALL NOT roll Warp Core
explosion chance or radiation breach chance for any tick. Since overload is always 0
during docking (see "Docking lowers shields and zeroes overload"), the Warp Core
takes no overload-driven damage during the loop either — it only ever repairs via
the station rate above, never regresses, while docked.

#### Scenario: No explosion, breach, or overload damage during docking
- **WHEN** a docking repair loop is running
- **THEN** no explosion or radiation-breach check occurs for any tick, and Warp Core
  integrity only increases tick over tick, never decreases

### Requirement: Base resource pool with limited capacity and regeneration
Each starbase entity SHALL carry a stable, persistent `id` (same pattern as sector
entities, see `combat` capability's "Stable entity identity") and its own limited
resource pool that depletes when providing resupply/repair or absorbing enemy attacks
while a ship is docked, regenerating over time independent of whether a ship is
present. Docking repeatedly at the same base in quick succession SHALL be less
effective if its pool has not fully regenerated.

Pool capacity: `500`. Regeneration: `+10`/turn while the pool is not currently being
drawn upon by an active docking loop (design.md decision #23 — estimated starting
values for playtesting; at the station-assisted repair rate of `25`/turn/subsystem,
decision #8, the pool covers roughly 6–7 turns of full-tilt multi-subsystem repair
before depleting).

#### Scenario: Depleted base provides reduced resupply
- **WHEN** a player docks at a base whose resource pool was significantly depleted by
  a recent prior visit or attack
- **THEN** the resupply/repair rate provided is reduced relative to docking at a base
  with a full resource pool

### Requirement: Ship destroyed if its currently-docked base is destroyed
If the base the ship is currently docked at is destroyed during a docking repair
loop, the ship SHALL be destroyed as well. This is a distinct terminal condition from
the aggregate `starbasesLeft === 0` (see `end-game` capability's terminal condition
priority) — it can trigger even when other starbases remain in the galaxy.

#### Scenario: Docked base destroyed ends the game even with other bases remaining
- **WHEN** the currently-docked base is destroyed by enemy attack during the repair
  loop, and `starbasesLeft` is still greater than 0 afterward (other bases exist)
- **THEN** the game still ends in defeat with reason "Ship destroyed with docked
  base"

### Requirement: Single dock-complete event
Docking SHALL emit one `dock-complete` event carrying the base type and outcome,
consumed by `EngineeringConsole`, `ShieldConsole`, and `WeaponsConsole` — not three
independent manual actions triggered separately.

#### Scenario: One action updates all three consoles
- **WHEN** the `dock-complete` event fires after a `STARBASE_DOCK` repair loop
  finishes
- **THEN** Engineering, Shield, and Weapons each react to the same single event
  without the player performing a separate action per console
