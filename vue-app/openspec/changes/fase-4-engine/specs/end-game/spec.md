## ADDED Requirements

### Requirement: Victory condition
The engine SHALL declare victory when `enemiesLeft === 0`.

#### Scenario: Last enemy destroyed triggers victory
- **WHEN** the last remaining enemy is destroyed
- **THEN** `GameScreen` switches to `'result'` mode showing "Victory"

### Requirement: Defeat conditions with distinct reasons
The engine SHALL declare defeat, each with its own displayed reason, when any of:
`mainEnergy <= 0`, `stardate >= stardateLimit`, `starbasesLeft === 0`, Warp Core
explosion roll succeeds, radiation breach `turnsRemaining` reaches 0 uncontained,
`lifeSupportTurnsRemaining` reaches 0 while Life Support integrity is still below
40 (`turn-engine` capability, "Life Support critical damage starts a 5-turn
survival countdown", design.md decision #37 — reason "crew asphyxiation"), or
the ship's currently-docked base is destroyed during a docking repair loop (see
`docking` capability).

#### Scenario: Warp Core explosion is instant defeat regardless of other resources
- **WHEN** the turn engine's Warp Core explosion roll succeeds
- **THEN** `GameScreen` immediately switches to `'result'` mode with defeat reason
  "Warp Core Explosion", even if energy/stardate/starbases would otherwise still allow
  play to continue

#### Scenario: Stardate limit reached with enemies remaining is defeat
- **WHEN** `stardate` reaches `stardateLimit` and `enemiesLeft > 0`
- **THEN** the game ends in defeat with reason referencing the expired time limit

### Requirement: Terminal condition priority (Kobayashi Maru rule)
When more than one terminal condition becomes true within the same turn's resolution
(steps 1–3 of `turn-engine` all run before any terminal check, so this is a routine
case, not a rare edge case), the engine SHALL resolve the outcome using this fixed
priority, highest first — **defeat always outranks victory**:

1. Warp Core explosion
2. Ship destroyed with docked base (docked base destroyed during a docking repair
   loop — distinct from priority 5, can trigger even with other starbases remaining)
3. Death by radiation (breach `turnsRemaining` reached 0 uncontained)
4. Crew asphyxiation (`lifeSupportTurnsRemaining` reached 0 while Life Support
   integrity still below 40, design.md decision #37)
5. `mainEnergy <= 0`
6. `starbasesLeft === 0`
7. `stardate >= stardateLimit`
8. Victory (`enemiesLeft === 0`)

Only the highest-priority true condition SHALL be shown as the result; the engine
SHALL NOT display multiple simultaneous outcomes.

#### Scenario: Destroying the last enemy does not save a doomed ship
- **WHEN** the player's action destroys the last enemy AND the same turn's Warp Core
  resolution rolls an explosion
- **THEN** the game ends in defeat with reason "Warp Core Explosion" — victory is
  never shown, even though `enemiesLeft` reached 0 that same turn

#### Scenario: Among simultaneous defeats, the higher-priority reason is shown
- **WHEN** `mainEnergy <= 0` AND `stardate >= stardateLimit` both become true on the
  same turn
- **THEN** the displayed defeat reason is the energy-based one (priority 5), not the
  stardate one (priority 7)

#### Scenario: Crew asphyxiation outranks resource depletion
- **WHEN** `lifeSupportTurnsRemaining` reaches 0 (still critical) AND `mainEnergy`
  also reaches 0 on the same turn
- **THEN** the displayed defeat reason is "crew asphyxiation" (priority 4), not
  the energy-based one (priority 5)

#### Scenario: Docked base destruction outranks the aggregate starbase count
- **WHEN** the currently-docked base is destroyed during a docking repair loop and
  `starbasesLeft` was already going to reach 0 that same tick anyway
- **THEN** the displayed defeat reason is "Ship destroyed with docked base"
  (priority 2), not the generic `starbasesLeft === 0` reason (priority 6)

### Requirement: Commander rating on game end
The engine SHALL compute a Commander rating score using the formula in
`SST_LCARS_SPECS.md` section 5.3 (klingons destroyed, time remaining, starbases lost,
torpedoes used), extended with a `klingonsCaptured` term (see `combat` capability,
"Successful surrender captures a prisoner instead of destroying") — capture SHALL be
weighted **higher** than destruction, since a successful surrender also yields
intelligence value (interrogation, see `combat` capability). `klingonsCaptured`
SHALL be weighted `1.5×` versus `klingonsDestroyed`'s baseline `1×` weight
(design.md decision #23 — estimated starting value for playtesting, meaningfully
higher without making capture trivialize straight combat effectiveness). Shown on
`ResultScreen`.

#### Scenario: Rating reflects performance inputs
- **WHEN** the game ends (victory or defeat)
- **THEN** `ResultScreen` displays a rating computed from the actual
  klingonsDestroyed/klingonsCaptured/currentStardate/starbasesDestroyed/
  torpedoesUsed values of that playthrough, not a placeholder

#### Scenario: Capturing scores more than destroying
- **WHEN** comparing two otherwise-identical playthroughs, one where a Klingon was
  captured via successful hail surrender and one where an equivalent Klingon was
  destroyed by combat instead
- **THEN** the capture playthrough's rating contribution for that Klingon is higher

### Requirement: Real mode switching in GameScreen
`GameScreen.vue` SHALL switch between `'briefing'`, `'playing'`, and `'result'` modes
driven by real game-state transitions, not a statically-fixed `v-if`.

#### Scenario: Playing transitions to result on terminal condition
- **WHEN** any end-game condition above becomes true while in `'playing'` mode
- **THEN** `GameScreen` transitions to `'result'` mode automatically
