## ADDED Requirements

### Requirement: The briefing states the real mission
The Briefing screen SHALL state the actual generated mission: how many hostiles
were generated and how many stardates were allocated.

The clock now derives from the fleet (`mission duration = 25 + 1.2 × fleet`),
so every playthrough has its own deadline — and the briefing kept a fixed text,
leaving the player to discover their real time budget from the localStorage.
A commander who is not told the size of the task cannot be judged by the clock.

#### Scenario: The briefing matches the generation
- **WHEN** a new game generates 21 hostiles and allocates 50 stardates
- **THEN** the briefing states both numbers, matching `enemiesLeft` and the
  computed limit

#### Scenario: A new galaxy updates the briefing
- **WHEN** the player starts a New Game with a different generated fleet
- **THEN** the briefing reflects the new numbers, not the previous mission's
