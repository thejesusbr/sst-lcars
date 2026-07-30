## ADDED Requirements

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
A landing party mission SHALL take exactly 3 turns (departure, research, return) to
resolve — a fixed duration, not a variable/balancing constant. On success, it SHALL
grant an instant Warp Core integrity boost of `+30` (design.md decision #23 —
estimated starting value for playtesting, more than a single turn of the best
station-assisted repair rate, `25`/turn per decision #8, justifying the 3-turn
investment and hostile-sector risk), independent of and additional to CdD dispatch
repair — closing the previously orphaned dilithium hook (`SST_LCARS_SPECS.md`
section 10.5).

#### Scenario: Mission always resolves after exactly 3 turns
- **WHEN** a landing party mission is launched
- **THEN** it resolves after exactly 3 turns, never more or fewer

#### Scenario: Successful mission repairs Warp Core directly
- **WHEN** a landing party mission completes successfully
- **THEN** Warp Core integrity increases by the mission's dilithium yield, regardless
  of any CdD team dispatch happening at the same time

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
