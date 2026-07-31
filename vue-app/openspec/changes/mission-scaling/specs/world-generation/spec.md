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

The original's own safeguard (`IFK9>T9THENT9=K9+1`) SHALL be kept in the code as a
floor, but it becomes **unreachable** and that is the intended outcome: it existed
to protect the unlucky tail of a *fixed* clock, and with a per-enemy term above 1
the formula outgrows `total + 1` for every fleet size. It stays as a net for anyone
who later lowers the per-enemy term below 1, not as a live path.

#### Scenario: Enemy count reflects what was generated
- **WHEN** generation produces 19 Klingons across the galaxy
- **THEN** `enemiesLeft` is 19, not a fixed constant

#### Scenario: A crowded galaxy gets a longer mission
- **WHEN** one galaxy generates 13 enemies and another 22
- **THEN** the second mission's stardate limit is meaningfully higher

#### Scenario: Turns per enemy stay in a narrow band
- **WHEN** durations are computed across the full 13–22 generation range
- **THEN** turns-per-enemy varies by less than 1.4×, versus 1.7× with a fixed clock

#### Scenario: The 1978 safeguard never fires
- **WHEN** durations are computed for any fleet size
- **THEN** the formula's result always exceeds `total + 1`, so the floor is never
  the binding value

#### Scenario: Victory still requires clearing the generated fleet
- **WHEN** the player destroys or captures every generated Klingon
- **THEN** `enemiesLeft` reaches 0 and victory triggers
