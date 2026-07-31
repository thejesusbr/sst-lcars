## ADDED Requirements

### Requirement: High-warp core stress is reported and felt
Warp Core damage taken from travelling above the safe warp factor SHALL be recorded
in the combat log under the engineering category, and its rate SHALL be high enough
to register across a mission.

Five full-diagonal crossings at warp 8 cost 1% of core integrity in the 4th
playthrough round — invisible in effect and, because nothing was logged, invisible
in the record too. A cost that is neither felt nor reported is not a cost.

The rate is a playtest constant; what this requirement fixes is that it must be
perceptible and that the player must be told when it happens.

#### Scenario: The log names the price
- **WHEN** a warp trip above the safe factor damages the core
- **THEN** an engineering entry records it

#### Scenario: Repeated hard running adds up
- **WHEN** several long trips are made at high warp
- **THEN** the accumulated core damage is enough to change the ship's energy budget

#### Scenario: Cruising quietly costs nothing
- **WHEN** trips are made at or below the safe warp factor
- **THEN** no core damage is taken and nothing is logged
