## MODIFIED Requirements

### Requirement: Enemy power is a single stat for both health and attack strength
Each enemy entity SHALL carry one `enemyPower` value, reused directly from the 1978
source's unified design: player weapon hits (phaser/torpedo) reduce it toward 0
(destruction), and the enemy's own attacks deplete it further (`turn-engine`
capability, "Klingon attack damage"). There SHALL NOT be a separate "health" stat
independent of attack strength. Initial `enemyPower` on spawn SHALL be `200 * (0.5 +
random(0,1))` (100–300 range), reusing the source's `S9=200` base constant directly.

**Enemies SHALL additionally carry a shield pool (`enemyShield`) that absorbs
incoming damage before `enemyPower` is touched.** Damage exceeding the remaining
shield spills into `enemyPower`; damage below it only depletes the shield.

Without this, an enemy had exactly one number and no intermediate state: the beam
landed and the target evaporated. The 4th playthrough round read it straight off the
animation — "os inimigos não parecem estar com escudos ativos" — and they were not,
because no such thing existed anywhere in the engine.

The pool SHALL vary by species, on the same principle as the power band
(`world-generation` capability): a scout is thin, a D7 or warbird is thick.

Enemy shields SHALL NOT regenerate. The asymmetry is deliberate: the player has an
engineering deck, damage-control teams and an energy budget to trade against;
an enemy is a target with a finite buffer. Making both sides regenerate would turn
every fight into a stalemate resolved by whoever brought more turns.

#### Scenario: An enemy weakened by its own attacks is easier to finish off
- **WHEN** an enemy has attacked several times this encounter, depleting its own
  `enemyPower`
- **THEN** a subsequent phaser/torpedo hit of the same nominal strength destroys it
  more easily than it would have against its initial `enemyPower`

#### Scenario: Shields absorb before health
- **WHEN** an enemy at full shield takes a hit smaller than its remaining shield
- **THEN** only the shield drops and `enemyPower` is unchanged

#### Scenario: A big hit spills through
- **WHEN** a hit exceeds the enemy's remaining shield
- **THEN** the shield reaches 0 and the remainder is applied to `enemyPower`

#### Scenario: Enemy shields stay down
- **WHEN** several turns pass after an enemy's shield is depleted
- **THEN** it does not recover

## ADDED Requirements

### Requirement: Phaser damage falls off with distance
Phaser damage SHALL be a fraction of the power committed, scaled by a multiplier
that decreases with the Chebyshev distance between shooter and target. This SHALL
apply symmetrically — enemy fire attenuates by the same rule.

Damage was effectively equal to the power committed, so a default 1500 shot dealt
1200–1800 against a target holding 100–300: an overkill of 4× to 18×, and a 1v1
fight settled on the first shot. Distance meant nothing, which made the 8×8 sector
scenery rather than a board.

| Distance | Multiplier |
|---|---|
| 1 | 1.00 |
| 2 | 0.75 |
| 3 | 0.55 |
| 4 | 0.40 |
| 5 | 0.30 |
| 6 | 0.22 |
| 7 | 0.15 |

With the conversion constant at `0.15` damage per unit of power, a default 1500
shot deals 225 point-blank and 34 across the sector — roughly 2 shots to drop an
average target up close, 10 from the far corner. These are playtest starting values.

Closing to point-blank SHALL therefore be a real decision, since the same rule puts
the player inside the enemy's best range.

#### Scenario: The same shot hurts more up close
- **WHEN** identical shots are fired at the same target from distance 1 and
  distance 5
- **THEN** the close shot deals substantially more damage

#### Scenario: Enemies attenuate too
- **WHEN** an enemy fires from across the sector
- **THEN** its damage is reduced by the same distance rule

#### Scenario: A single shot no longer settles a fight
- **WHEN** the player fires once at full power at an undamaged average enemy
- **THEN** the enemy survives

### Requirement: Line of fire is blocked by what sits in it
A star or planet lying on the straight line between shooter and target SHALL block
**phaser** fire — for both sides. A blocked shot SHALL be rejected without
consuming a turn.

Phasers travel in a straight line; that is the whole visual vocabulary the
presentation layer already draws. Making the beam stop at an obstacle turns stars
into cover, which is what gives position meaning beyond distance.

**Torpedoes SHALL pass**, being guided — but correcting a trajectory around an
obstacle mid-battle is hard, so an obstructed torpedo SHALL carry an added chance
to miss, rising with the number of obstacles in the path and stacking with the
existing Photon Tubes damage degradation (`combat` capability, "Photon Tubes damage
degrades torpedo accuracy and reliability").

This is what finally separates the two weapons. Until now a torpedo was a phaser
with an inventory: same reach, same conditions, different animation.

#### Scenario: A star blocks the beam
- **WHEN** the player fires phasers at an enemy with a star between them
- **THEN** the shot is rejected, no turn is consumed, and the log says why

#### Scenario: Cover works both ways
- **WHEN** an enemy would fire on the ship with an obstacle in the line
- **THEN** it cannot

#### Scenario: A torpedo goes around, sometimes
- **WHEN** a torpedo is fired at a target behind an obstacle, many times
- **THEN** some hit and some miss, at a worse rate than an unobstructed shot

#### Scenario: More obstacles, worse odds
- **WHEN** two obstacles sit in the path rather than one
- **THEN** the miss chance is higher still

### Requirement: A moving target is harder to hit
A ship that covered ground under impulse during a turn SHALL have a chance to evade
incoming fire that turn, scaling with how many cells it covered. This SHALL apply
symmetrically to the player and to enemies, since enemies reposition on any turn the
player engages movement (`turn-engine` capability).

A multi-turn impulse transit SHALL NOT protect the ship from being attacked — it is
in normal space, in reach — but it SHALL grant this evasion for each turn it is
actually moving.

Speed had exactly one consequence: how many turns a crossing took. Tying evasion to
it makes the impulse dial a defensive control as well, and gives a reason to run at
full power that is not just impatience.

#### Scenario: Crossing fast is safer than crawling
- **WHEN** the ship takes fire on a turn it moved 8 cells versus a turn it moved 1
- **THEN** the 8-cell turn evades more often

#### Scenario: Standing still never evades
- **WHEN** the ship takes fire on a turn it did not move
- **THEN** no evasion is rolled

#### Scenario: Repositioning enemies are harder to hit
- **WHEN** the player engages movement, causing enemies to reposition, and fires at
  one of them that turn
- **THEN** that enemy has a chance to evade

#### Scenario: Transit is not shelter
- **WHEN** a multi-turn impulse move is in progress with enemies present
- **THEN** the enemies still attack on each of those turns

### Requirement: Phaser heat scales with the power fired
The heat a phaser shot adds SHALL be proportional to the power committed, not a
fixed amount per shot. Subsystem damage SHALL continue to multiply it as it does
today.

Heat was `30 × (1 + d)` — the power fired never entered the calculation, so a
100-unit shot heated the banks exactly as much as a 3000-unit one. Not even in the
23rd century are we free of thermodynamics.

Normalization SHALL keep the default power (1500) at today's value, so the change
costs nothing at the default and bites at the top of the dial.

#### Scenario: A bigger shot runs hotter
- **WHEN** the player fires at 3000 versus at 1500
- **THEN** the 3000 shot adds substantially more heat

#### Scenario: A small shot barely warms the banks
- **WHEN** the player fires at a small fraction of maximum power
- **THEN** the heat added is a correspondingly small fraction

#### Scenario: Damage still compounds heat
- **WHEN** the same shot is fired with damaged versus intact Phaser Banks
- **THEN** the damaged banks heat more, as before
