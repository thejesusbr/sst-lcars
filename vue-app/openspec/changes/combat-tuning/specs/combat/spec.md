## MODIFIED Requirements

### Requirement: Enemy power is a single stat for both health and attack strength
Each enemy entity SHALL carry one `enemyPower` value: player weapon hits
(phaser/torpedo) reduce it toward 0 (destruction), and it feeds the enemy's
attack strength formula. There SHALL NOT be a separate "health" stat. Initial
`enemyPower` on spawn SHALL be `200 * (0.5 + random(0,1))` (100–300 range).

**Attacking SHALL NOT consume `enemyPower`.** The 1978 self-drain
(`enemyPower = floor(power / (3 + rng))`) is removed: it halved through the stat
in one attack and zeroed it in five, leaving "zombie" enemies that neither
attack nor die — bypassing the enemy shield entirely, confusing the target
readout (power falling while shields held), and disarming every encounter after
four exchanges. It was coherent in the original's unified-stat design; against
`combat-balance`'s shields and distance falloff it became self-sabotage.

What limits attacks instead is **energy** (see "Enemy energy gates attacks"):
consumable, rechargeable, and separate from durability.

#### Scenario: An enemy attacks at full strength until killed
- **WHEN** an enemy attacks several turns in a row
- **THEN** its `enemyPower` is unchanged by its own attacks — only player
  damage reduces it

#### Scenario: The target readout only moves when the player scores
- **WHEN** the player watches SHD/PWR across a turn in which the enemy attacked
  but was not hit
- **THEN** neither value changed

## ADDED Requirements

### Requirement: Enemy energy gates attacks
Each enemy SHALL carry `enemyEnergy`, a **consumable** pool — deliberately
unlike the player, whose energy is throughput. Attacking SHALL cost energy; a
turn spent not attacking SHALL recharge it; an enemy without enough energy for a
shot SHALL NOT attack.

| Constant | Starting value |
|---|---|
| `ENEMY_ENERGY_MAX` | 100 |
| `ENEMY_ATTACK_COST` | 25 |
| `ENEMY_ENERGY_RECHARGE` | 15/turn idle |

Four shots empty the pool; ~2 idle turns buy one back. The enemy gets a combat
rhythm — bursts and lulls — instead of either infinite pressure or
self-neutralization. Playtest constants.

#### Scenario: A drained enemy holds fire
- **WHEN** an enemy's energy is below the attack cost
- **THEN** it does not attack that turn, and recharges instead

#### Scenario: Recharge only happens while holding fire
- **WHEN** an enemy attacks on a turn
- **THEN** its energy drops by the attack cost and does not recharge that turn

#### Scenario: Energy is not durability
- **WHEN** an enemy with empty energy is hit by the player
- **THEN** the damage path is unchanged — shield absorbs, then `enemyPower`
  falls; energy plays no part in taking damage

### Requirement: Phaser heat follows Joule's law
Heat added by a phaser shot SHALL scale with the **square** of the power
committed — `PHASER_TEMP_PER_SHOT × (power / PHASER_POWER_DEFAULT)²` — times
the existing subsystem-damage multiplier.

`Q = I²Rt`: heat grows with the square of the current through the emitter. The
linear version made 3000 cost only 2× the heat of 1500; the physical model says
4×, and that is also what makes the top of the dial a real commitment instead
of a default. Not even in the 23rd century are we free of thermodynamics.

Anchored at the default power: a 1500 shot still adds exactly 30, so the
behaviour the player knows does not move.

| Power | Linear (old) | Joule |
|---|---|---|
| 750 | 15 | 7.5 |
| 1500 | 30 | 30 |
| 3000 | 60 | 120 |

#### Scenario: Full power runs four times as hot
- **WHEN** the player fires at 3000 versus at 1500
- **THEN** the 3000 shot adds 4× the heat, not 2×

#### Scenario: Low power barely warms the banks
- **WHEN** the player fires at half the default power
- **THEN** the heat added is a quarter of the default's, not half

#### Scenario: The default is unchanged
- **WHEN** the player fires at 1500 with intact banks
- **THEN** the heat added is exactly 30
