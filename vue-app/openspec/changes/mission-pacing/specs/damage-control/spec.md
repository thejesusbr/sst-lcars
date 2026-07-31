## MODIFIED Requirements

### Requirement: Six teams with fatigue
The system SHALL maintain exactly 6 Damage Control teams, each with
`efficiency: max(20, 100 * 0.5^(turnsWorked / 6))` while working, recovering
`+8%/turn` while idle.

The half-life was 3 turns. Simulated against the engine, that made a team deliver
29 of a subsystem's first 60 points in four turns and then go nearly inert at the
20% floor, contributing 3 points per turn forever. Restoring six subsystems from
20% took 19 turns — 63% of a 30-stardate mission — which is what turned "won a
hard battle" into "lost on the clock".

At half-life 6 the same repair takes 11 turns, and fatigue still bites: 89%
after the first worked turn, 71% at three, 50% at six, 25% at twelve. The
mechanic keeps its shape at twice the timescale, rather than being removed.

**The floor and the idle recovery rate are deliberately unchanged.** Both were
measured as candidate levers and both are inert here: raising idle recovery from
`+8` to `+16` moved zero turns in every simulated scenario, because teams that
are repairing are `working` and never reach the recovery branch at all. The floor
stops mattering above half-life 5, since the curve no longer reaches it during a
realistic repair.

#### Scenario: Fatigue floors at 20%, never stops a team
- **WHEN** a team has worked long enough for the curve to reach the floor
- **THEN** its efficiency reads exactly 20%, not lower and not zero

#### Scenario: Full recovery from floor takes 10 idle turns
- **WHEN** a team at the 20% floor goes idle
- **THEN** it returns to 100% efficiency after exactly 10 idle turns at +8%/turn

#### Scenario: Half-life is six worked turns
- **WHEN** a team has worked exactly 6 consecutive turns
- **THEN** its efficiency is 50%

#### Scenario: A team stays useful across a long repair
- **WHEN** a single team works a subsystem for 12 consecutive turns
- **THEN** its efficiency at the twelfth turn is still above the floor
