## MODIFIED Requirements

### Requirement: Enemy and starbase totals are derived from generation
`enemiesLeft` SHALL be the total number of Klingons actually generated, not a fixed
constant. In the original these totals accumulate from the per-quadrant rolls
(`K9`/`B9`) — they are an outcome, not a parameter. Expected value is ~17.3 with
typical spread 13–22, so each playthrough differs in size.

**The mission's duration SHALL be derived from that same total**, as a fixed base
plus a per-enemy term, rather than a constant:

```
duração = MISSION_BASE (25) + MISSION_PER_ENEMY (1.2) × frota
```

A fixed clock against a fleet that varies ±40% made difficulty a dice roll taken
before the player did anything: 3.08 turns per enemy at 13 enemies, 1.82 at 22 —
the same mission, 1.7× tighter. The 4th playthrough round reported it as "depende
muito da sorte".

The base term is the overhead that does not scale with fleet size — exploring,
travelling, repairing between fights. The per-enemy term is what actually scales.
Together they cut the spread to 1.36× (3.15 turns per enemy at 13, 2.32 at 22)
without flattening it entirely: a small galaxy still plays looser than a crowded
one, which is the difference between variety and a coin flip.

The original's own safeguard SHALL be preserved as the floor it always was: if the
generated Klingon total exceeds the computed duration, the duration becomes
`total + 1` (`IFK9>T9THENT9=K9+1`).

#### Scenario: Enemy count reflects what was generated
- **WHEN** generation produces 19 Klingons across the galaxy
- **THEN** `enemiesLeft` is 19, not a fixed constant

#### Scenario: A crowded galaxy gets a longer mission
- **WHEN** one galaxy generates 13 enemies and another 22
- **THEN** the second mission's stardate limit is meaningfully higher

#### Scenario: Turns per enemy stay in a narrow band
- **WHEN** durations are computed across the full 13–22 generation range
- **THEN** turns-per-enemy varies by less than 1.4×, versus 1.7× with a fixed clock

#### Scenario: An oversized fleet extends the mission clock
- **WHEN** generation produces more Klingons than the computed duration
- **THEN** the stardate limit becomes that total plus 1

#### Scenario: Victory still requires clearing the generated fleet
- **WHEN** the player destroys or captures every generated Klingon
- **THEN** `enemiesLeft` reaches 0 and victory triggers
