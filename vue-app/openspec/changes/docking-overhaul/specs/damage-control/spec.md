## MODIFIED Requirements

### Requirement: Stacking with diminishing returns
Multiple teams assigned to the same system SHALL apply the multiplier
`[1, 1, 0.5, 0.25, 0.125, 0.0625]` by queue position (1st and 2nd team full
value, 3rd onward diminishing) — **except while docked at a
`STARBASE_SUPPLY`**, where every team SHALL contribute at full value
(multiplier 1.0 regardless of position).

The depot has no automated workshops (repair there is the crew's own work),
but it has unlimited supplies: parts on demand are what remove the bottleneck
that makes a third pair of hands redundant in open space. It is the depot's
answer to the drydock's drones — "help yourself, we have everything".

#### Scenario: Third team on the same system contributes half value
- **WHEN** a 3rd team is dispatched to a system that already has 2 teams
  working, in open space
- **THEN** its contribution to `repairPerTurn` is multiplied by 0.5, not 1

#### Scenario: At a depot, six hands are six hands
- **WHEN** 4 teams work the same subsystem while docked at a `STARBASE_SUPPLY`
- **THEN** each contributes at full value, with no positional penalty

## ADDED Requirements

### Requirement: Science station lifts the cooldown gate
While docked at a `STARBASE_SCIENCE`, the forced-cooldown rule ("exhausted
teams enter cooldown and only return at 50%+") SHALL NOT apply: a team at the
efficiency floor SHALL be immediately dispatchable.

Recreation facilities are the station's offer. Elsewhere the cooldown models a
crew too spent to be sent back; here they come back functional after real rest.

#### Scenario: The floor is not a lockout at the science station
- **WHEN** a team hits the 20% floor while docked at a `STARBASE_SCIENCE`
- **THEN** it can be dispatched again without climbing to 50% first

#### Scenario: Undocking restores the normal rule
- **WHEN** the ship undocks from the science station with a team below 50%
- **THEN** the standard cooldown gate applies again from that turn on
