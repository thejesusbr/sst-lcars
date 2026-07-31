## ADDED Requirements

### Requirement: A dispatched team reads as dispatched, not working
A team assigned during the current turn SHALL display as **`Dispatching`**, becoming
`Working` only from the next turn's resolution onward.

Repair contribution already starts the turn after dispatch (`damage-control`
capability, "Repair contribution starts the turn after dispatch") — the team is
travelling to the subsystem. The panel said `Working` immediately, so the player
watched a working team produce nothing and had no way to tell whether the mechanic
was broken or merely delayed.

#### Scenario: The label reflects the travel turn
- **WHEN** a team is dispatched to a subsystem
- **THEN** it reads `Dispatching` for the remainder of that turn and `Working` from
  the next turn on

### Requirement: A team on guard duty reads as unavailable
A team locked to `guard` by prisoners in the brig SHALL render in a disabled state,
not as a dispatchable team.

The brig locks exactly one team for as long as it holds prisoners
(`damage-control` capability, "Holding prisoners locks a Damage Control team on
guard duty"). Listing it like any other team invited the player to try to dispatch
it and be refused.

#### Scenario: The guard team is visibly out of the pool
- **WHEN** the brig holds at least one prisoner
- **THEN** the team on guard duty renders disabled
