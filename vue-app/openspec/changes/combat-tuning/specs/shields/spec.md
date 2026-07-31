## MODIFIED Requirements

### Requirement: shieldEnergy governs absorption and regen
`shieldEnergy` (0–2500) SHALL determine how much incoming damage the shield can
absorb. It SHALL be shared `GameState`, not a locally seeded copy.

**Regeneration SHALL run inverted to the energy held**: full rate with shields
**down** (emitters off — every joule goes to recovery), reduced rate with
shields raised (emission consumes what recovery would use), interpolated
between.

```
shieldEnergy 0     → regen at 100% of SHIELD_REGEN_RATE
shieldEnergy 2500  → regen at ~40%
```

The first implementation scaled regen *with* the energy held, which read
backwards — holding emitters hot somehow healed them faster — and the 5th
playthrough round called it: "deviam recuperar mais rápido com os escudos
baixados, toda energia concentrada na recuperação com a emissão desligada."

The inversion creates the tactical dilemma the original lacked: dropping
shields heals them fastest and exposes the hull while it happens.

Unchanged from before: the rate is degraded by Shield Control damage through
the shared bands, stops entirely at crítico, and docking clears
`shieldDamageTaken` completely.

#### Scenario: Higher shieldEnergy absorbs more damage
- **WHEN** two attacks of equal strength hit the ship at different
  `shieldEnergy` levels
- **THEN** the attack at higher `shieldEnergy` results in less
  `shieldIntegrity` loss

#### Scenario: Shields down heal fastest
- **WHEN** the same accumulated damage recovers with shields at 0 versus at
  maximum
- **THEN** the shields-down case recovers meaningfully faster

#### Scenario: Raised shields still heal, slowly
- **WHEN** the ship holds shields at maximum across quiet turns
- **THEN** `shieldDamageTaken` still falls, at the reduced rate

#### Scenario: Critical Shield Control stops recovery
- **WHEN** Shield Control integrity is in the crítico band
- **THEN** no regeneration happens at any energy level

#### Scenario: Docking wipes accumulated shield damage
- **WHEN** the ship docks at any starbase type
- **THEN** `shieldDamageTaken` becomes 0
