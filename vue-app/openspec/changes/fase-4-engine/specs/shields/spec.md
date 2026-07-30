## ADDED Requirements

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
Transferring energy between `mainEnergy` and `shieldEnergy` (presets, "Raise
Shields", "Lower Shields") SHALL NOT consume a turn — same treatment as adjusting
Impulse Power or Phaser Power (design.md decisions #13/#17): reallocating the ship's
own energy between its own subsystems is free; only actions that interact with the
external world (firing, moving, docking, hailing, re-acquiring Weapons Lock) consume
a turn.

#### Scenario: Adjusting shield energy does not advance the enemy turn
- **WHEN** the player transfers energy to/from shields any number of times
- **THEN** no enemy-turn resolution occurs as a result of those adjustments alone

### Requirement: Shield Control damage increases draw and causes flickering
This is about the **Shield Control** subsystem (one of the 8 named subsystems
`EngineeringConsole` tracks, damaged only via the turn-engine's random
subsystem-hit roll) — distinct from `shieldIntegrity` above, which tracks the
deflector shield's own absorption capacity, not the control hardware's health.
Using the shared damage fraction `d = (100 - integrity) / 100` (`combat`
capability, "Subsystem damage fraction is the shared basis for degraded
effectiveness", design.md decision #35), a damaged Shield Control subsystem
SHALL multiply the `energy-management` capability's shield draw (`shieldEnergy`'s
held level) by `(1 + d)` — same shape as Phaser Banks' heat-gain penalty. Once
in the moderado band (`d > 0.30`), each turn SHALL have a `max(0, d - 0.3) * 100`
percent chance of "flickering": `shieldStatus` forces to `'DOWN'` for that turn
only (no absorption, no `shieldEnergy` loss beyond what an unabsorbed hit would
normally cause), automatically restoring next turn if the roll doesn't repeat.
At crítico (`d > 0.60`), shields SHALL be forced down (`shieldEnergy` returns to
`mainEnergy`, same effect as "Lower Shields") and cannot be raised again until
Shield Control integrity is repaired above 40.

#### Scenario: Damaged Shield Control increases the energy budget
- **WHEN** Shield Control integrity is 70 (`d = 0.30`) and `shieldEnergy` is
  held at 1000
- **THEN** its contribution to `subsystemDraw` is `1000 * 1.30 = 1300`, not 1000

#### Scenario: Moderado damage risks a flicker
- **WHEN** Shield Control integrity is 55 (`d = 0.45`)
- **THEN** there is a `15%` chance each turn that `shieldStatus` forces to
  `'DOWN'` for that turn alone, independent of `shieldEnergy`'s actual level

#### Scenario: Critical Shield Control damage forces shields down and locks them
- **WHEN** Shield Control integrity drops below 40
- **THEN** `shieldEnergy` returns to `mainEnergy` immediately and "Raise
  Shields"/presets are rejected until Shield Control is repaired back above 40

### Requirement: Combat damage reduces integrity automatically
Enemy attacks resolved by the turn engine SHALL reduce `shieldIntegrity` as part of
normal turn resolution — not only via the manual "Simulate Hit" test button.

#### Scenario: Real combat lowers integrity without manual trigger
- **WHEN** an enemy attack is resolved during a turn
- **THEN** `shieldIntegrity` decreases as a direct result, with no need to press
  "Simulate Hit"
