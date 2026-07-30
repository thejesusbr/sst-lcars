## MODIFIED Requirements

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
