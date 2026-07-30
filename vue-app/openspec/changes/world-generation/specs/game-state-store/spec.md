## MODIFIED Requirements

### Requirement: New Game resets to initial constants
Starting a New Game SHALL reset `GameState` and **generate a fresh world**. The
previously listed fixed values `enemiesLeft 12` and `starbasesLeft 5` are replaced
by generation outcomes (`world-generation` capability, "Enemy and starbase totals
are derived from generation") — those counts now vary per playthrough, expected
~17.3 enemies and ~4.6 starbases.

The remaining initial constants are unchanged: stardate 3600.0, torpedoes 8, probes
3, shieldEnergy 1500, subsystems at 100%, no CdD fatigue, no active Warp Core
overload/breach, no tribble infestation, `lifeSupportTurnsRemaining` unset.

`GameState` additionally carries the generation **seed**, so a playthrough is
reproducible.

#### Scenario: New Game produces a brand-new galaxy
- **WHEN** the player confirms "New Game" from `ResultScreen`
- **THEN** a new galaxy is generated with a new seed — the previous game's quadrant
  contents, base placements and planet charges are not reused

#### Scenario: Enemy count comes from generation, not a constant
- **WHEN** a new game starts
- **THEN** `enemiesLeft` equals the number of Klingons the generator actually placed

#### Scenario: A fresh game starts in playable state
- **WHEN** a new game starts
- **THEN** `currentSector` is populated for the starting quadrant and `starbases`
  contains every placed base — neither is empty

#### Scenario: New Game clears a finished game's state
- **WHEN** player confirms "New Game" from `ResultScreen`
- **THEN** every non-generated `GameState` field returns to its initial constant
  value, overwriting the persisted save
