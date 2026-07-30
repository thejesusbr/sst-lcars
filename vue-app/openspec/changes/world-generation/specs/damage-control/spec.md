## MODIFIED Requirements

### Requirement: Dilithium mining takes exactly 3 turns
A landing party mission SHALL still take exactly 3 turns (departure, research,
return) to resolve — a fixed duration, not a balancing constant.

The Warp Core integrity yield is now **conditional on the target planet actually
holding a dilithium charge** (`world-generation` capability, "Planets carry hidden
dilithium, discovered only by surveying"). The original wording granted `+30`
unconditionally on success; roughly 70% of planets hold nothing at all, and the
player cannot tell before surveying.

On success against a planet with at least one remaining charge, the mission SHALL
consume exactly **one** charge and grant `DILITHIUM_WC_BOOST` (`+30`) Warp Core
integrity — independent of and additional to CdD dispatch repair. Against a planet
with no charges, the mission resolves with no yield.

#### Scenario: Mission always resolves after exactly 3 turns
- **WHEN** a landing party mission is launched
- **THEN** it resolves after exactly 3 turns, never more or fewer

#### Scenario: Successful mission on a charged planet repairs the Warp Core
- **WHEN** a mission completes successfully against a planet holding charges
- **THEN** Warp Core integrity increases by `+30` and the planet's remaining charge
  count decreases by exactly 1

#### Scenario: Barren planet yields nothing despite a successful mission
- **WHEN** a mission completes successfully against a planet holding no charges
- **THEN** no Warp Core repair occurs, the turns and risk were still spent, and the
  planet is thereafter known to be barren

#### Scenario: A rich planet can be mined repeatedly
- **WHEN** a planet holding 3 charges is targeted by three successive missions
- **THEN** each grants `+30`, and after the third the planet holds none

#### Scenario: Exhausted planet is no longer worth targeting
- **WHEN** all of a planet's charges have been mined
- **THEN** further missions against it resolve with no yield, and the UI reflects
  that it is depleted
