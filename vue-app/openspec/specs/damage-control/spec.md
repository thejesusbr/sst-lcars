# damage-control

## Purpose

Equipes de Controle de Danos: reparo por turno, stacking, fadiga e recuperação,
missões de Send Party, guarda da cela e contenção de Core Breach.

## Requirements

### Requirement: Six teams with fatigue
The system SHALL maintain exactly 6 Damage Control teams, each with
`efficiency: max(20, 100 * 0.5^(turnsWorked / 3))` while working, recovering
`+8%/turn` while idle.

#### Scenario: Fatigue floors at 20%, never stops a team
- **WHEN** a team has worked 7 or more consecutive turns
- **THEN** its efficiency reads exactly 20%, not lower and not zero

#### Scenario: Full recovery from floor takes 10 idle turns
- **WHEN** a team at the 20% floor goes idle
- **THEN** it returns to 100% efficiency after exactly 10 idle turns at +8%/turn

### Requirement: Dispatch is free, but repair begins next turn
Dispatching, recalling, or reassigning a team SHALL NOT itself consume a turn (see
`turn-engine` capability, "Free adjustments vs turn-consuming actions") — the team
needs to travel to the assigned subsystem first. Its contribution to
`repairPerTurn`, and its own fatigue clock (`turnsWorked`), SHALL only begin
counting from the next turn resolution onward, never retroactively for the turn the
dispatch was set during.

#### Scenario: Dispatch does not count toward the same turn's repair
- **WHEN** a team is dispatched to a subsystem via the free dispatch action during
  turn `N`
- **THEN** its contribution to that subsystem's `repairPerTurn` first applies
  starting with turn `N+1`'s resolution, not turn `N`

### Requirement: Stacking with diminishing returns
Multiple teams assigned to the same system SHALL apply the multiplier
`[1, 1, 0.5, 0.25, 0.125, 0.0625]` by queue position (1st and 2nd team full value, 3rd
onward diminishing).

#### Scenario: Third team on the same system contributes half value
- **WHEN** a 3rd team is dispatched to a system that already has 2 teams working
- **THEN** its contribution to `repairPerTurn` is multiplied by 0.5, not 1

### Requirement: Repair rate formula
The engine SHALL compute repair rate as
`repairPerTurn(system) = 5 * tier * Σ(efficiency_i/100 * stackMult_i)`, where tier is 3
(team in space) or 5 (team docked at `STARBASE_DOCK`, or working an active radiation
breach regardless of location).

#### Scenario: Docked repair uses tier 5
- **WHEN** the ship is docked at `STARBASE_DOCK` and a team is dispatched to a
  subsystem
- **THEN** the repair rate uses tier 5, not tier 3

### Requirement: Exhausted teams enter forced cooldown before redispatch
When a team's efficiency is at the 20% floor and it stops working (recalled or
otherwise leaves `working`), it SHALL enter a `cooldown` status instead of
immediately becoming available — dispatch SHALL be rejected while a team is in
`cooldown`. It exits `cooldown` and becomes `idle` (dispatchable again) once its
efficiency recovers, via the normal `+8%/turn` idle-recovery formula, to at least
50% (an exhausted team on a critically-damaged ship does not get the luxury of a
full rest before being needed again).

#### Scenario: Recalling an exhausted team enters cooldown, not idle
- **WHEN** a team at the 20% efficiency floor stops working
- **THEN** its status becomes `cooldown`, not `idle`, and any dispatch attempt is
  rejected while in this state

#### Scenario: Cooldown ends once efficiency crosses 50%
- **WHEN** a team in `cooldown` recovers efficiency to 50% or higher via idle
  recovery
- **THEN** its status becomes `idle` and it accepts new dispatch again

#### Scenario: Recalling a non-exhausted team returns straight to idle
- **WHEN** a team above the 20% floor stops working
- **THEN** its status becomes `idle` immediately — the cooldown gate only applies to
  teams that bottomed out at the floor

### Requirement: Holding prisoners locks a Damage Control team on guard duty
While the brig (`combat` capability, "Brig has limited prisoner capacity") holds 1
or more prisoners, exactly 1 Damage Control team SHALL be locked into guard duty —
removed from the dispatchable pool (cannot be assigned to any subsystem or Send
Party) — for as long as any prisoner remains. The team returns to the normal
`idle`/dispatchable pool the moment the brig count returns to 0. This reuses the
existing scarce CdD pool instead of introducing a new crew/security stat (design.md
decision #23) — capturing prisoners has an ongoing cost, not just an upfront Hail
risk, which also motivates eventually resolving the still-open "brig release
mechanism" question (`design.md` Open Questions).

#### Scenario: First prisoner locks a team on guard duty
- **WHEN** the brig count goes from 0 to 1
- **THEN** 1 Damage Control team immediately becomes unavailable for dispatch,
  regardless of what it was doing before

#### Scenario: Team returns once the brig is empty again
- **WHEN** the brig count returns to 0 (last prisoner released or otherwise removed)
- **THEN** the guarding team returns to the normal dispatchable pool

#### Scenario: Additional prisoners do not lock a second team
- **WHEN** the brig count goes from 1 to 2 or more
- **THEN** still only 1 team is locked on guard duty — the cost does not scale
  with prisoner count

### Requirement: Warp Core is a dispatchable subsystem
Warp Core SHALL appear as the 9th entry in the subsystem list, eligible for CdD
dispatch like any other subsystem.

#### Scenario: Team can be dispatched to the Warp Core
- **WHEN** the player opens the dispatch cycle for a team
- **THEN** "Warp Core" is one of the reachable targets

### Requirement: Auto-Navigation Computer is a dispatchable subsystem
The Auto-Navigation Computer (see `navigation` capability, design.md decision #13)
SHALL appear in `EngineeringConsole`'s subsystem list, eligible for CdD dispatch and
damage like any other subsystem — closing the gap left by the retired standalone
"Damage Control" subsystem entry, whose leftover hull-diagram zone (`shields`
capability, "Hull diagram reflects real subsystem integrity") is repurposed for it.
With this addition, Warp Core is the subsystem list's 9th entry (7 pre-existing
named subsystems + Auto-Navigation Computer + Warp Core), matching the count this
capability's Warp Core requirement already assumed.

#### Scenario: Team can be dispatched to the Auto-Navigation Computer
- **WHEN** the player opens the dispatch cycle for a team
- **THEN** "Auto-Navigation Computer" is one of the reachable targets

### Requirement: Core Breach containment
An active radiation breach SHALL track `containment` (0–100) and `turnsRemaining`
(starts at 5, decrements each turn). Teams dispatched to it always use tier 5. While
active, all repair happening outside the breach SHALL be multiplied by 0.5.

#### Scenario: Solo team needs at least 80% efficiency to contain in time
- **WHEN** exactly 1 team at efficiency `E` is dispatched to a breach with
  `turnsRemaining` starting at 5
- **THEN** `containment` reaches 100 before `turnsRemaining` hits 0 if and only if
  `E >= 80`

#### Scenario: Unresolved breach is fatal
- **WHEN** `turnsRemaining` reaches 0 while `containment < 100`
- **THEN** the engine triggers the "death by radiation" end-game defeat condition

#### Scenario: Breach penalizes unrelated repairs
- **WHEN** a radiation breach is active and a team is repairing a different subsystem
- **THEN** that team's `repairPerTurn` for the other subsystem is multiplied by 0.5

### Requirement: Send Party eligibility (adjacent planet)
The "Send Party" control SHALL be disabled by default, enabled only when the ship's
current sector is adjacent to a sector containing a `PLANET` entity — same adjacency
pattern already used for docking eligibility (`docking` capability).

#### Scenario: Disabled without an adjacent planet
- **WHEN** no `PLANET` entity is adjacent to the ship's current sector
- **THEN** the Send Party control is disabled

#### Scenario: Enabled once adjacent to a planet
- **WHEN** a `PLANET` entity is adjacent to the ship's current sector
- **THEN** the Send Party control becomes enabled

### Requirement: Dilithium mining takes exactly 3 turns
A landing party mission SHALL still take exactly 3 turns (departure, research,
return) to resolve — a fixed duration, not a balancing constant.

The Warp Core integrity yield is now **conditional on the target planet actually
holding a dilithium charge** (`world-generation` capability, "Planets carry hidden
dilithium, discovered only by surveying"). The original wording granted `+30`
unconditionally on success; roughly 70% of planets hold nothing at all, and the
player cannot tell before surveying.

On success against a planet with at least one remaining charge, the mission SHALL
consume exactly **one** charge and grant `DILITHIUM_WC_BOOST` (`+30`) Warp Core
integrity — independent of and additional to CdD dispatch repair. Against a planet
with no charges, the mission resolves with no yield.

#### Scenario: Mission always resolves after exactly 3 turns
- **WHEN** a landing party mission is launched
- **THEN** it resolves after exactly 3 turns, never more or fewer

#### Scenario: Successful mission on a charged planet repairs the Warp Core
- **WHEN** a mission completes successfully against a planet holding charges
- **THEN** Warp Core integrity increases by `+30` and the planet's remaining charge
  count decreases by exactly 1

#### Scenario: Barren planet yields nothing despite a successful mission
- **WHEN** a mission completes successfully against a planet holding no charges
- **THEN** no Warp Core repair occurs, the turns and risk were still spent, and the
  planet is thereafter known to be barren

#### Scenario: A rich planet can be mined repeatedly
- **WHEN** a planet holding 3 charges is targeted by three successive missions
- **THEN** each grants `+30`, and after the third the planet holds none

#### Scenario: Exhausted planet is no longer worth targeting
- **WHEN** all of a planet's charges have been mined
- **THEN** further missions against it resolve with no yield, and the UI reflects
  that it is depleted

### Requirement: Hostile-sector landing party risk
If the sector containing the target planet has enemies present, the landing party
SHALL be at risk of loss, checked once at mission completion, using the same
`40% + 5%` per additional enemy formula as the probe destruction-risk check
(`navigation` capability, "Hostile-target probe destruction risk", design.md
decision #23). If lost, no dilithium is recovered and a combat log entry notes the
loss, with no further penalty beyond losing the mission's yield.

#### Scenario: Landing party lost in hostile territory yields nothing
- **WHEN** a landing party's risk check fails against a hostile sector
- **THEN** no Warp Core repair occurs and the combat log records the loss

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
