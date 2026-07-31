## ADDED Requirements

### Requirement: The mission lasts 40 stardates
`MISSION_DURATION` SHALL be `40` stardates, replacing `30`.

Thirty was the 1978 figure, chosen for a game whose damage control was a single
`D`-array repair rate with no fatigue, no team allocation and no landing
parties. This engine charges for all of those, and the 3rd playthrough round hit
the wall: a hard battle plus its recovery consumed most of the mission, and the
clock decided the game rather than the player's choices.

The clock rises **together with** the fatigue half-life change
(`damage-control`, "Six teams with fatigue"), not instead of it. On its own, more
time would have left a team still going inert at the eighth worked turn — more
room to endure the same problem. The two together make heavy repair cost roughly
a quarter of the mission instead of two thirds.

The existing safeguard from the original is unaffected: a generated Klingon total
above the duration still raises the limit to `total + 1`
(`world-generation`, "Enemy and starbase totals are derived from generation"). At
~17 enemies against 40 stardates it fires even less often than before.

#### Scenario: A new game ends 40 stardates after it starts
- **WHEN** a new game begins at the initial stardate
- **THEN** the mission's stardate limit is the initial value plus 40

#### Scenario: An oversized fleet still extends the clock
- **WHEN** generation produces more Klingons than 40
- **THEN** the limit becomes that total plus 1, as before

### Requirement: The turn is the indivisible unit of time
A resolved turn SHALL advance the stardate by exactly `1`, for every action.
Actions SHALL NOT carry per-action stardate costs.

Fractional turn costs were proposed and measured for this change. The result was
negative: the complaint being answered is the *wait* for repair, and waiting
costs a full turn under any pricing scheme. Charging less for combat actions
would have made the wait relatively more expensive, not less — moving in the
wrong direction while adding a second time unit that every per-turn mechanic
(Warp Core overload, fatigue, confidence decay, breach and asphyxiation clocks,
probe ETA, boost cooldown) would have to learn to read.

This requirement exists to record that the option was evaluated with numbers, so
that reopening it needs new evidence rather than the same intuition.

#### Scenario: Every turn-consuming action costs the same
- **WHEN** any turn-consuming action resolves — firing, locking, loading a tube,
  moving, waiting
- **THEN** the stardate advances by exactly 1

#### Scenario: Free adjustments still cost nothing
- **WHEN** a free adjustment is made (dial, shield level, Damage Control
  dispatch)
- **THEN** the stardate does not advance at all
