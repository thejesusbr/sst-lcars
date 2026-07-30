## MODIFIED Requirements

### Requirement: Shield energy adjustments are free (no turn cost)
Adjusting `shieldEnergy` (presets, "Raise Shields", "Lower Shields") SHALL NOT
consume a turn — same treatment as adjusting Impulse Power or Phaser Power
(design.md decisions #13/#17).

**There is no `mainEnergy` pool to transfer from.** The earlier wording described
this as "transferring energy between `mainEnergy` and `shieldEnergy`", which
assumed an energy stock that does not exist (see `game-state-store` capability,
"Energy is throughput, not a depletable stock"). `shieldEnergy` is a **level**,
set freely and instantly anywhere in `[0, SHIELD_ENERGY_MAX]`; the cost is that
the held level taxes `subsystemDraw` every turn it stays up, which is what makes
running shields at maximum a real decision rather than a free one.

#### Scenario: Raising shields needs no source pool
- **WHEN** the player raises shields to maximum
- **THEN** `shieldEnergy` reaches `SHIELD_ENERGY_MAX` without drawing down any
  other stored value, and the per-turn energy budget drops by that level

#### Scenario: Lowering shields frees throughput, not a tank
- **WHEN** the player lowers shields to 0
- **THEN** `shieldEnergy` is 0 and the energy budget rises by what the shields
  were consuming — nothing is credited back into a reserve

### Requirement: Shield Control damage increases draw and causes flickering
At crítico (`d > 0.60`), shields SHALL be forced down — `shieldEnergy` is set to
**0**, not "returned to `mainEnergy`" — and cannot be raised again until Shield
Control integrity is repaired above 40. The remaining behaviors (draw multiplied
by `(1 + d)` from the first point of damage, and the flickering roll from the
moderado band) are unchanged.

#### Scenario: Critical Shield Control zeroes the shield level
- **WHEN** Shield Control integrity falls below 40 while shields are up
- **THEN** `shieldEnergy` becomes 0 and the energy it was consuming returns to the
  budget as freed throughput
