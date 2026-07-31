## MODIFIED Requirements

### Requirement: shieldEnergy governs absorption and regen
`shieldEnergy` (0–2500) SHALL determine how much incoming damage the shield can
absorb and how fast it regenerates. It SHALL be shared `GameState`, not a locally
seeded copy.

**The regeneration half of this requirement was never implemented.**
`shieldDamageTaken` only ever accumulated — no line in the project reduced it, not
even docking — so `shieldIntegrity` fell monotonically for the whole playthrough
with no way back. That is not a missing feature, it is permanent damage by
construction, and the 4th playthrough round caught it.

Regeneration SHALL work as follows:

- Each resolved turn, `shieldDamageTaken` SHALL decrease by an amount proportional
  to the `shieldEnergy` currently held. Holding shields high therefore costs
  throughput every turn *and* buys recovery — consistent with energy being flow, not
  stock (`game-state-store` capability).
- The rate SHALL be degraded by damage to **Shield Control**, following the shared
  damage bands (`combat` capability, "Subsystem damage fraction is the shared basis
  for degraded effectiveness").
- At **crítico** the regeneration SHALL stop entirely, matching how every other
  subsystem behaves at that band.
- **Docking SHALL clear `shieldDamageTaken` completely**, at any base type. The
  station repairs what the crew cannot.

#### Scenario: Higher shieldEnergy absorbs more damage
- **WHEN** two attacks of equal strength hit the ship at different `shieldEnergy`
  levels
- **THEN** the attack at higher `shieldEnergy` results in less `shieldIntegrity` loss

#### Scenario: Shields recover between fights
- **WHEN** the ship takes shield damage and then passes several turns without being
  hit, with shields raised
- **THEN** `shieldIntegrity` climbs back

#### Scenario: Holding more energy recovers faster
- **WHEN** the same accumulated damage is left to recover at high versus low
  `shieldEnergy`
- **THEN** the high-energy case recovers faster

#### Scenario: Damaged Shield Control slows recovery
- **WHEN** Shield Control is in the moderado band
- **THEN** regeneration is slower than with the subsystem intact

#### Scenario: Critical Shield Control stops recovery
- **WHEN** Shield Control integrity is in the crítico band
- **THEN** `shieldDamageTaken` does not decrease at all, whatever the energy held

#### Scenario: Docking wipes accumulated shield damage
- **WHEN** the ship docks at any starbase type
- **THEN** `shieldDamageTaken` becomes 0
