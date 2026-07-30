## MODIFIED Requirements

### Requirement: Ship's CdD teams rest at double rate during docking
While the docking repair loop runs, all 6 damage-control teams SHALL be treated as
idle regardless of their assignment before docking, recovering fatigue at **double**
the normal idle rate — `+16%/turn` instead of the normal `+8%/turn` (section 10.3) —
each tick, since they are on full leave at the station rather than merely idle in a
combat zone. They SHALL NOT participate in the station-assisted repair.

**`STARBASE_SCIENCE` SHALL apply a further multiplier on top of that rate.** A
science station repairs nothing and resupplies nothing, so shore leave is what it
offers: the crew actually gets to disembark. This is the only reason to dock
there.

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

#### Scenario: A science station rests the crew faster than a drydock
- **WHEN** the same exhausted teams spend the same number of ticks docked at a
  `STARBASE_SCIENCE` versus at a `STARBASE_DOCK`
- **THEN** they recover more at the science station

### Requirement: Instant resupply by base type
Docking SHALL immediately (no turn cost) apply resupply per base type, subject to
the base's own resource pool: `STARBASE_DOCK` and `STARBASE_SUPPLY` restore
`torpedoStock` toward max; `STARBASE_DOCK` also restores `hullIntegrity` toward
100; `STARBASE_SCIENCE` provides no resource resupply.

**`STARBASE_SCIENCE` is no longer without effect**, however: what it offers is
accelerated crew recovery (see "Ship's CdD teams rest at double rate during
docking"). Before this change it was a base type whose only property was not
being the other two — generated in the world, counted in `starbasesLeft`,
dockable, and worth nothing.

Subsystem/Warp Core repair is NOT part of instant resupply — see "Docking
triggers multi-turn repair resolution", which applies only at `STARBASE_DOCK`.

#### Scenario: A drydock repairs the hull
- **WHEN** the ship docks at a `STARBASE_DOCK` with `hullIntegrity` at 60
- **THEN** hull is restored toward 100, limited by the base's remaining pool

#### Scenario: A supply depot does not repair hull
- **WHEN** the ship docks at a `STARBASE_SUPPLY` with hull damage
- **THEN** only `torpedoStock` is restored — hull stays as it was

#### Scenario: A science station gives no materiel but is still worth visiting
- **WHEN** the ship docks at a `STARBASE_SCIENCE`
- **THEN** neither torpedoes nor hull are restored, and the crew's recovery is
  accelerated instead
