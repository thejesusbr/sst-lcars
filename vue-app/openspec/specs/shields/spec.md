# shields

## Purpose

Energia de escudo como nível mantido, integridade derivada, absorção de dano e
efeitos do dano em Shield Control.

## Requirements

### Requirement: shieldEnergy governs absorption and regen
`shieldEnergy` (0–2500) SHALL determine how much incoming damage the shield can
absorb and how fast it regenerates. It SHALL be shared `GameState`, not a locally
seeded copy.

#### Scenario: Higher shieldEnergy absorbs more damage
- **WHEN** two attacks of equal strength hit the ship at different `shieldEnergy`
  levels
- **THEN** the attack at higher `shieldEnergy` results in less `shieldIntegrity` loss

### Requirement: shieldIntegrity is derived, never raw-set
`shieldIntegrity` (0–100%) SHALL be computed by the engine from `shieldEnergy` and
accumulated damage history. No console or mock SHALL set it directly as an
independent value (this supersedes the Fase 3.5 local-mock behavior of
`ShieldConsole.vue`, section 12.5).

#### Scenario: Integrity follows energy and damage, not a standalone counter
- **WHEN** `shieldEnergy` and damage history are unchanged between two reads
- **THEN** `shieldIntegrity` returns the same derived value both times, never
  drifting from an independently-mutated mock

### Requirement: shieldStatus depends on both energy and integrity
`shieldStatus` SHALL be `'UP'` only when `shieldEnergy > 0 AND shieldIntegrity > 0`;
otherwise `'DOWN'`.

#### Scenario: Zero integrity forces shields down even with energy available
- **WHEN** `shieldEnergy > 0` but `shieldIntegrity` has reached 0
- **THEN** `shieldStatus` is `'DOWN'`

### Requirement: Hull diagram reflects real subsystem integrity
`EnterpriseShieldSvg`'s 8 hull zones (`ShieldZoneKey`) SHALL read their integrity from
the same shared `GameState` subsystem integrities `EngineeringConsole` displays, not
a locally-seeded mock (this supersedes `ShieldConsole.vue`'s `mockIntegrity`, always
100%). The `damage` zone key — orphaned since the standalone "Damage Control"
subsystem was retired in favor of the 6 Damage Control teams — SHALL be repurposed
to display the integrity of the new "Auto-Navigation Computer" subsystem (see
`damage-control` capability, "Auto-Navigation Computer is a dispatchable
subsystem"), giving that subsystem (introduced by `navigation` capability's Auto-Nav
Computer, design.md decision #13) a home in both `EngineeringConsole` and the hull
diagram. Warp Core keeps no zone of its own (not a hull-surface region).

#### Scenario: Damaging a subsystem reflects on the hull diagram
- **WHEN** any of the 7 named subsystems (Warp Engines, SRS, LRS, Phaser Banks,
  Photon Tubes, Shield Control, Life Support) or the Auto-Navigation Computer takes
  damage
- **THEN** the corresponding hull zone's color/opacity updates from the same shared
  integrity value shown in `EngineeringConsole`, not an independent local number

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

### Requirement: Combat damage reduces integrity automatically
Enemy attacks resolved by the turn engine SHALL reduce `shieldIntegrity` as part of
normal turn resolution — not only via the manual "Simulate Hit" test button.

#### Scenario: Real combat lowers integrity without manual trigger
- **WHEN** an enemy attack is resolved during a turn
- **THEN** `shieldIntegrity` decreases as a direct result, with no need to press
  "Simulate Hit"
