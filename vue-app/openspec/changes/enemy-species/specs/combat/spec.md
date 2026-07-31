## MODIFIED Requirements

### Requirement: Surrender chance scales with the target's damage
The surrender probability SHALL rise as the target's `enemyPower` falls, between
a floor (intact) and a ceiling (in tatters) that **both belong to the target's
species**. An undamaged target SHALL surrender at its species' floor; a badly
damaged one approaches its species' ceiling.

Every other combat mechanic already degrades with damage ("Subsystem damage
fraction is the shared basis for degraded effectiveness", decisions #35/#37). A
fixed surrender roll was the only one ignoring the target's state, which made
"soften it first, then hail" a strategy the engine could not reward.

| Species | Intact | In tatters |
|---|---|---|
| `KLINGON_CRUISER`, `KLINGON_D7` | 10% | 35% |
| `ROMULAN_WARBIRD`, `ROMULAN_SCOUT` | 15% | 45% |
| `CLOAKED_RAIDER` | 30% | 70% |

The single 30%–75% pair applied to everyone made crippled enemies surrender
constantly, which reads wrong for a culture whose own refusal lines say today is
a good day to die. Klingons now almost never yield; Romulans are pragmatic but
proud; the raider is a pirate and folds.

These are playtest constants. The brig's 4-prisoner capacity and the Damage
Control team locked to `guard` duty remain the natural brake on capture becoming
dominant over destruction.

#### Scenario: A crippled enemy surrenders more readily
- **WHEN** the player hails an enemy reduced to a fraction of its power
- **THEN** the surrender chance is higher than against an intact one of the same
  species

#### Scenario: An intact enemy holds its species floor
- **WHEN** the player hails an undamaged enemy
- **THEN** the surrender chance is that species' floor value

#### Scenario: A Klingon in tatters still rarely yields
- **WHEN** a Klingon and a raider are each reduced to the same fraction of power
  and hailed
- **THEN** the raider surrenders substantially more often than the Klingon

#### Scenario: Every species is covered
- **WHEN** any member of `ENEMY_TYPES` is hailed
- **THEN** a floor and ceiling exist for it — no type falls through to a default
