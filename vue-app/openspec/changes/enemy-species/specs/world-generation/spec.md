## ADDED Requirements

### Requirement: Materialized enemies are drawn from the full species roster
Sector materialization SHALL pick each enemy's type by weighted draw across all
five members of `ENEMY_TYPES`, from the quadrant's deterministic RNG, so that the
same seed reproduces the same roster.

Every enemy was hardcoded to `KLINGON_CRUISER`. The four other types existed in
the union, in the icon set, and in the per-species hail refusal table, and none
of them ever appeared in a game.

| Type | Weight |
|---|---|
| `KLINGON_CRUISER` | 35% |
| `KLINGON_D7` | 20% |
| `ROMULAN_WARBIRD` | 15% |
| `ROMULAN_SCOUT` | 20% |
| `CLOAKED_RAIDER` | 10% |

These are playtest starting values. `CLOAKED_RAIDER` SHALL materialize cloaked,
following the existing cloaking rules — it is the only type whose weight also
buys an ability.

#### Scenario: All five types can appear
- **WHEN** a large number of quadrants is materialized
- **THEN** every one of the five types occurs, in roughly the tabled proportions

#### Scenario: The roster is deterministic per seed
- **WHEN** the same quadrant is materialized twice from the same seed
- **THEN** the enemies have the same types, in the same cells

#### Scenario: Raiders arrive cloaked
- **WHEN** a `CLOAKED_RAIDER` is materialized
- **THEN** it starts cloaked and is subject to the existing cloaking rules

### Requirement: Power band follows the species
An enemy's starting `enemyPower` SHALL be drawn from a band belonging to its
type, replacing the single `ENEMY_BASE_POWER * (0.5 + rng())` used for every
enemy.

| Type | Band (× `ENEMY_BASE_POWER`) |
|---|---|
| `KLINGON_CRUISER` | 0.5 – 1.5 |
| `KLINGON_D7` | 1.2 – 2.0 |
| `ROMULAN_WARBIRD` | 1.2 – 2.0 |
| `ROMULAN_SCOUT` | 0.3 – 0.8 |
| `CLOAKED_RAIDER` | 0.8 – 1.4 |

Without this, type would be pure decoration: same threat behind five sprites.
With it, reading the scanner tells the player what they are about to fight, and
a sector of three scouts is a different problem from a sector holding one D7.

`KLINGON_CRUISER` keeps the band every enemy used to have, so the average
encounter does not shift wholesale on the day this lands.

#### Scenario: A scout is weaker than a warbird
- **WHEN** a `ROMULAN_SCOUT` and a `ROMULAN_WARBIRD` are materialized
- **THEN** the scout's power is drawn from a strictly lower band

#### Scenario: The cruiser's band is unchanged
- **WHEN** a `KLINGON_CRUISER` is materialized
- **THEN** its power comes from the same band all enemies previously used

### Requirement: The KBS Klingon digit counts hostiles, not Klingons
The first digit of the KBS code SHALL remain a count of **all** hostile entities
in the quadrant, regardless of species.

The code has three digits and comes from 1978; it cannot carry a species
breakdown, and splitting it would break every reader. Identifying who is out
there stays the job of entering the quadrant and reading the SRS — the same
trade the code already makes for planets.

#### Scenario: Mixed species count as one digit
- **WHEN** a quadrant holds one Klingon D7 and two Romulan scouts
- **THEN** its KBS code reports `3` in the first digit
