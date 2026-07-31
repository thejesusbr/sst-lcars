## ADDED Requirements

### Requirement: A system with a terminal clock shows the clock, not the value
The `SituationPanel` SHALL carry an indicator for each system that can end the
game on its own — Warp Core, Life Support and Hull. When a system's terminal
countdown is armed, its indicator SHALL display the remaining turns (`T-n`) in
place of its normal value; with no clock armed, it displays the value as before.

| System | Clock | Source |
|---|---|---|
| Warp Core | radiation breach | `breach.turnsRemaining` |
| Life Support | crew asphyxiation | `lifeSupportTurnsRemaining` |
| Hull | none | always shows `%` |

`lifeSupportTurnsRemaining` already exists, is already armed automatically when
Life Support integrity falls below `CRITICAL_INTEGRITY`, already counts down to
`crew_asphyxiation`, and was never rendered anywhere. A player lost a crew to a
five-turn countdown that the game was tracking and not showing.

Hull deliberately gets no countdown. It has no clock in state, and inventing a
projected "turns until destruction" would be a forecast dressed as a fact — the
rate depends on what the enemy does next.

#### Scenario: An armed clock replaces the value
- **WHEN** Life Support integrity falls below the critical threshold and the
  asphyxiation countdown arms at 5
- **THEN** its indicator reads `T-5`, then `T-4` on the next turn, instead of a
  percentage

#### Scenario: A disarmed clock restores the value
- **WHEN** Life Support is repaired back above the critical threshold
- **THEN** the countdown clears and the indicator returns to showing integrity

#### Scenario: Hull never shows a countdown
- **WHEN** hull integrity is critical
- **THEN** its indicator still shows a percentage, with the existing critical
  treatment

### Requirement: The alarm sounds until the player responds
The Alert 10 sound SHALL accompany critical damage to the systems that can end
the game, on rules chosen so the alarm always corresponds to an available
action:

- **Warp Core and Life Support**: sound on every turn the system's integrity is
  below `CRITICAL_INTEGRITY` **and** no Damage Control team is both assigned to
  it and actively `working`. Dispatching a team silences it; the team falling to
  `cooldown` or being pulled `away` brings it back, which is the alarm telling
  the player their repair has stopped.
- **Hull**: sound once when integrity crosses below the critical threshold,
  rearming only if it is restored above and falls again. There is no team to
  dispatch for the hull — it repairs only at a drydock — so a per-turn alarm
  would have no action to prompt and would become noise.

An alarm the player cannot answer is noise; an alarm that stops when they answer
is information. That distinction is the whole design here, and it is why the two
rules differ.

#### Scenario: Dispatching a team silences the alarm
- **WHEN** Life Support is critical, the alarm has sounded, and the player
  dispatches a team to it
- **THEN** the alarm does not sound on the following turns while that team is
  working

#### Scenario: A team going into cooldown brings the alarm back
- **WHEN** the team repairing a critical Warp Core drops to the fatigue floor and
  enters `cooldown`
- **THEN** the alarm sounds again on the next turn

#### Scenario: An assigned but idle team does not count
- **WHEN** a team is assigned to a critical system but is in `cooldown`,
  `guard` or `away`
- **THEN** the alarm still sounds — assignment alone is not a response

#### Scenario: Hull alarms once, not every turn
- **WHEN** hull integrity crosses below the critical threshold and stays there
  for several turns
- **THEN** the alarm sounds on the crossing turn only

#### Scenario: Hull rearms after recovery
- **WHEN** a critical hull is restored above the threshold and later falls below
  it again
- **THEN** the alarm sounds again on the new crossing
