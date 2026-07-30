## ADDED Requirements

### Requirement: Damage Control is invoked by turn resolution
Every per-turn behavior this capability already implements SHALL be invoked by the
turn engine. `engine/damageControl.ts` is fully implemented and unit-tested but
imported by nothing outside its own test file — so teams never repair, never
fatigue, and never recover in a running game (`fase-4-engine` design.md decision
#38).

The turn engine SHALL, at the step anchored by the `turn-engine` capability: apply
`repairPerTurn` to each assigned subsystem; advance working teams' fatigue; recover
idle teams; release teams from forced cooldown once they cross the 50% threshold;
and enforce the prisoner guard-duty lock.

#### Scenario: Assigned team raises subsystem integrity over turns
- **WHEN** a team has been working a damaged subsystem for two resolved turns
- **THEN** that subsystem's integrity is higher than before, by the specified
  repair rate

#### Scenario: Working teams fatigue and idle teams recover
- **WHEN** turns resolve with one team working and another idle
- **THEN** the working team's efficiency falls along the fatigue curve while the
  idle team's rises by its recovery rate

#### Scenario: Exhausted team is released from cooldown automatically
- **WHEN** a team in forced `cooldown` recovers past 50% efficiency across
  resolved turns
- **THEN** its status returns to `idle` and it accepts dispatch again

### Requirement: Repair contribution starts the turn after dispatch
Dispatch stays free (no turn cost), but a team dispatched during turn N SHALL
first contribute to `repairPerTurn` at turn N+1 — never retroactively for turn N.
The implementation SHALL count only teams whose `turnsWorked` is at least 1, and
SHALL increment `turnsWorked` at the end of turn resolution, so no extra state
field is needed.

#### Scenario: Dispatch turn yields no repair
- **WHEN** a team is dispatched to a damaged subsystem during turn N
- **THEN** that subsystem's integrity is unchanged when turn N finishes resolving

#### Scenario: The following turn does repair
- **WHEN** turn N+1 resolves with that team still assigned
- **THEN** the subsystem's integrity increases

### Requirement: Breach containment work is applied per turn
Teams assigned to an active radiation breach SHALL raise its `containment` each
resolved turn at tier 5, and all repair happening outside the breach SHALL be
halved while it is active.

#### Scenario: Assigned team makes containment progress
- **WHEN** a team is assigned to an active breach and a turn resolves
- **THEN** `containment` increases

#### Scenario: Unrelated repair is halved during a breach
- **WHEN** a breach is active and another team repairs a different subsystem
- **THEN** that repair applies at half its normal rate

### Requirement: Landing party mission advances and resolves on the turn clock
A launched landing party SHALL advance one turn per resolved turn and resolve after
exactly 3, applying the dilithium Warp Core boost on success and the hostile-sector
risk check once at completion. The borrowed team SHALL return to the dispatchable
pool when the mission ends.

#### Scenario: Mission resolves after exactly three turns
- **WHEN** a landing party is launched and three turns resolve
- **THEN** the mission completes and its outcome is applied

#### Scenario: Borrowed team returns to the pool
- **WHEN** the mission completes, successfully or not
- **THEN** the team that was away becomes dispatchable again
