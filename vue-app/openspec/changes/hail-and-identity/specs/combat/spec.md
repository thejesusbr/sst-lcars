## MODIFIED Requirements

### Requirement: Hailing enemies and starbases
The engine SHALL support hailing a target in the current sector
(`NavSensingConsole`'s "Hail" control), consuming 1 turn like any standard action.

**The hail SHALL reach any valid target in the sector**, not only an entity on
the cell the player happens to have selected. If more than one valid target is
present the player chooses; with a single one it is implied. Requiring the exact
cell turned a communication action into an aiming exercise — hail is not a
weapon and has no reason to need spatial precision.

Hailing an enemy SHALL attempt a surrender request (see "Surrender chance scales
with the target's damage"). Hailing a starbase SHALL always succeed, at no risk,
and reveal **the base's type, its quadrant, and its current resource pool level**
(see `docking` capability's "Base resource pool with limited capacity and
regeneration").

The type is the datum that decides whether the trip is worth it — a pool reading
means nothing if the player cannot tell a drydock from a supply depot. The
quadrant matters because the answer lands in the combat log, which is read later,
and "a base replied" without coordinates is useless two turns on.

#### Scenario: A base anywhere in the sector can be hailed
- **WHEN** a starbase is present in the sector and the player hails, without
  having selected that base's cell
- **THEN** the hail reaches it

#### Scenario: Hailing a base reveals type, position and pool
- **WHEN** the player hails a starbase
- **THEN** the reply states its type, its quadrant and its current resource pool
  level, at no risk

#### Scenario: Multiple targets are disambiguated by the player
- **WHEN** both a starbase and an enemy are present in the sector
- **THEN** the player chooses which to hail — the engine SHALL NOT pick for them

### Requirement: Successful surrender captures a prisoner instead of destroying
When a hail surrender attempt against an enemy succeeds, that enemy SHALL be
removed from `currentSector` (counts toward `enemiesLeft`, same as destruction)
and 1 prisoner SHALL be added to the ship's brig — **not** counted toward
`klingonsDestroyed` for the Commander rating; capture has its own,
higher-weighted rating term (see `end-game` capability, "Commander rating on game
end"), since capture also yields intelligence value.

The two counters are mutually exclusive: a captured enemy increments
`klingonsCaptured` and nothing else. The rating reads the lifetime
`klingonsCaptured`, never the brig's current occupancy — delivering prisoners to
a base empties the brig without touching the score.

#### Scenario: Successful surrender captures rather than destroys
- **WHEN** a hail surrender attempt against an enemy succeeds and the brig has
  available capacity
- **THEN** that enemy is removed from `currentSector`, `enemiesLeft` decreases, a
  prisoner is added to the brig, and `klingonsDestroyed` is unaffected

#### Scenario: Delivering prisoners does not erase the score
- **WHEN** the player captures prisoners and later transfers them at a starbase
- **THEN** those captures still count toward the Commander rating

## ADDED Requirements

### Requirement: Surrender chance scales with the target's damage
The surrender probability SHALL rise as the target's `enemyPower` falls. An
undamaged target SHALL surrender at the existing baseline chance; a badly damaged
one SHALL surrender considerably more often.

Every other combat mechanic already degrades with damage (`combat` capability,
"Subsystem damage fraction is the shared basis for degraded effectiveness",
decisions #35/#37). A fixed surrender roll was the only one ignoring the target's
state, which made "soften it first, then hail" a strategy the engine could not
reward.

The scale's ceiling is a playtest constant. The brig's 4-prisoner capacity and
the Damage Control team locked to `guard` duty remain the natural brake on
capture becoming dominant over destruction.

#### Scenario: A crippled enemy surrenders more readily
- **WHEN** the player hails an enemy reduced to a fraction of its power
- **THEN** the surrender chance is higher than against an intact one

#### Scenario: An intact enemy holds the baseline
- **WHEN** the player hails an undamaged enemy
- **THEN** the surrender chance is the baseline value

### Requirement: A refused surrender answers back
A failed surrender roll SHALL produce a reply in the combat log — a refusal with
character, varied across attempts, suited to the target.

Today a failed roll is silence, so the player cannot tell "I asked and was
refused" from "the button did nothing". The reply confirms the action happened,
and is where the game can have a voice without costing mechanics.

The lines SHALL live in a data table, not scattered through engine branches: they
are content, not rule.

#### Scenario: Refusal is visible
- **WHEN** a surrender roll fails
- **THEN** the combat log records the enemy's refusal

#### Scenario: Refusals vary
- **WHEN** several surrender attempts fail across a playthrough
- **THEN** the refusals are not all the same line
