## MODIFIED Requirements

### Requirement: Enemy repositions when the player engages movement
Enemy movement SHALL be **deliberate and bounded**, replacing the random
teleport. Each enemy moves during the enemy step of every turn resolution,
reacting **on the following turn** to what it can see, by up to
`ENEMY_MOVE_CELLS` (playtest start: 3) cells of Chebyshev distance from its
current position:

- **With energy to attack** (`combat` capability, "Enemy energy gates
  attacks"): it moves **toward** the player.
- **Without energy**: it **evades** — moves away to recharge.

The previous rule teleported each enemy to a random unoccupied cell whenever
the player engaged movement. With distance attenuation in play that broke
escape as a tactic: the 5th playthrough round ran 7 cells at full impulse and
found the enemy at point-blank again in the same turn. A ship with overheated
phasers must be able to trade ground for time; an enemy that can cross the
board in one hop makes distance meaningless.

Movement SHALL respect occupied cells and stay in the grid. Finer behaviours —
seeking line of fire around cover, coordinating between enemies, retreating
when damaged — are deliberately out of scope, reserved for the enemy-AI change
(`openspec/BACKLOG.md`); this requirement seeds it with the approach/evade
skeleton.

#### Scenario: Fleeing opens distance
- **WHEN** the player moves 8 cells away from an enemy whose move budget is 3
- **THEN** the gap after the enemy's response is at least 5 cells wider than
  before

#### Scenario: An armed enemy closes in
- **WHEN** an enemy has energy to attack and the player is beyond point-blank
- **THEN** its next move reduces the distance to the player

#### Scenario: A drained enemy breaks off
- **WHEN** an enemy's energy is below the attack cost
- **THEN** its next move increases the distance to the player, and its energy
  recharges

#### Scenario: No teleporting
- **WHEN** any enemy moves in a turn
- **THEN** its new cell is within the move budget of its previous cell
