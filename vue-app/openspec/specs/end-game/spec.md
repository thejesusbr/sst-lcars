# end-game

## Purpose

Condições terminais na ordem de prioridade Kobayashi Maru (derrota supera vitória)
e cálculo do rating do Comandante.

## Requirements

### Requirement: Victory condition
The engine SHALL declare victory when `enemiesLeft === 0`.

#### Scenario: Last enemy destroyed triggers victory
- **WHEN** the last remaining enemy is destroyed
- **THEN** `GameScreen` switches to `'result'` mode showing "Victory"

### Requirement: Defeat conditions with distinct reasons
The engine SHALL declare defeat, each with its own displayed reason, when any of:
`stardate >= stardateLimit`, `starbasesLeft === 0`, Warp Core explosion roll
succeeds, radiation breach `turnsRemaining` reaches 0 uncontained,
`lifeSupportTurnsRemaining` reaches 0 while Life Support integrity is still below
40 (`turn-engine` capability, "Life Support critical damage starts a 5-turn
survival countdown", design.md decision #37 — reason "crew asphyxiation"),
**`hullIntegrity` reaches 0** (reason `hull_destroyed`), or the ship's
currently-docked base is destroyed during a docking repair loop (see `docking`
capability).

**`mainEnergy <= 0` is removed as a defeat condition.** Energy is throughput, not
a depletable stock — there is no reserve to exhaust (see `game-state-store`
capability, "Energy is throughput, not a depletable stock"). Overload and
radiation breach are what replaces energy exhaustion as the pressure that
over-consumption creates.

`hullIntegrity` takes its place as the resource that combat depletes: damage that
saturates the shields consumes hull, and hull at 0 destroys the ship.

#### Scenario: Running at high consumption never ends the game by itself
- **WHEN** the ship sustains consumption above what the Warp Core generates for
  many turns
- **THEN** no defeat is declared from energy — the damage comes from overload
  wearing the core down, which may end in explosion or breach

#### Scenario: Hull reaching zero ends the game
- **WHEN** enemy damage saturates the shields and drives `hullIntegrity` to 0
- **THEN** the game ends in defeat with reason `hull_destroyed`

### Requirement: Terminal condition priority (Kobayashi Maru rule)
The fixed priority becomes, highest first — **defeat always outranks victory**:

1. Warp Core explosion
2. Ship destroyed with docked base (docked base destroyed during a docking repair
   loop — distinct from priority 6, can trigger even with other starbases
   remaining)
3. **Hull destroyed (`hullIntegrity` reached 0)**
4. Death by radiation (breach `turnsRemaining` reached 0 with containment below
   100)
5. Crew asphyxiation (`lifeSupportTurnsRemaining` reached 0 while Life Support
   integrity still below 40, design.md decision #37)
6. `starbasesLeft === 0`
7. `stardate >= stardateLimit`
8. Victory (`enemiesLeft === 0`)

`mainEnergy <= 0` is gone from the list. Radiation death's trigger is corrected
to `containment < 100`, not `containment === 0` — a breach held at partial
containment when its clock expires still kills, which the earlier wording let
survive indefinitely.

Only the highest-priority true condition SHALL be shown as the result; the engine
SHALL NOT display multiple simultaneous outcomes.

#### Scenario: Hull destruction outranks asphyxiation
- **WHEN** `hullIntegrity` reaches 0 on the same turn `lifeSupportTurnsRemaining`
  reaches 0
- **THEN** the displayed reason is `hull_destroyed` (priority 3), not asphyxiation
  (priority 5)

#### Scenario: Partial containment does not save an expired breach
- **WHEN** a breach's `turnsRemaining` reaches 0 with `containment` at 50
- **THEN** radiation death still fires — only full containment (100) clears it

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
