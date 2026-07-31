## MODIFIED Requirements

### Requirement: Station-assisted repair rate
While the docking repair loop runs at a **`STARBASE_DOCK`**, every subsystem
(including Warp Core) SHALL repair at a flat `DOCKED_REPAIR_PER_TICK`
(25 percentage points per subsystem per tick) — performed by the station's
automated repair drones, **requiring no Damage Control team** and unaffected by
team assignment, efficiency or stacking.

The point of docking at a drydock is the automated workshops, not the ship's
own emergency crews. The previous model ran `calculateRepairRate` at tier 5,
which only reached 25 with a single team at 100% efficiency — a tired crew
repaired a docked ship slower, contradicting both the fiction and the spec
constant (`DOCKED_REPAIR_PER_TICK` existed with no reader; the reachability
ratchet carried it as debt).

Depots and science stations have no such workshops: repair there is the crew's
own work (see `damage-control` deltas), which is what differentiates the three
base types into three different answers.

#### Scenario: Drydock repairs without any team
- **WHEN** a docking repair loop tick resolves at a `STARBASE_DOCK` with no
  team assigned to anything
- **THEN** every damaged subsystem gains 25 points that tick

#### Scenario: Assigning a team to help changes nothing
- **WHEN** the player assigns teams to subsystems during a drydock repair loop
- **THEN** the repair rate is the same 25 per subsystem per tick

#### Scenario: A depot does not run the drones
- **WHEN** the ship docks at a `STARBASE_SUPPLY` with damaged subsystems and no
  teams assigned
- **THEN** no automatic repair happens — repair there is the crew's job

### Requirement: Ship's CdD teams rest at double rate during docking
While docked at a **`STARBASE_DOCK`**, ALL 6 damage-control teams SHALL be
treated as on shore leave — **including teams that were `working`** — recovering
fatigue at double the normal idle rate (`+16%/turn`). The drones do the work;
the crew rests. This finally implements what the spec asked for since
`fase-4-engine` and nobody wired ("working teams treated as idle",
`openspec/BACKLOG.md`).

At a **`STARBASE_SCIENCE`**, teams that are resting SHALL recover at the double
rate times `STARBASE_SCIENCE_RECOVERY_MULTIPLIER`, **and cooldown does not
apply**: a team at the fatigue floor returns to the dispatchable pool
immediately instead of waiting to climb back to 50%. Recreation and information
facilities are the station's entire offer — but teams put to work repairing
(the only way to repair there) accrue fatigue normally while working.

At a **`STARBASE_SUPPLY`**, resting teams recover at the plain double rate;
working teams work.

#### Scenario: Drydock rests even the working teams
- **WHEN** a team assigned and working is caught by a drydock docking
- **THEN** it recovers fatigue at +16%/turn during the loop instead of
  accruing any

#### Scenario: Science station skips cooldown
- **WHEN** a team at the 20% floor rests at a `STARBASE_SCIENCE`
- **THEN** it is immediately dispatchable, without waiting for 50%

#### Scenario: A science station rests the crew faster than a drydock
- **WHEN** the same exhausted teams rest the same number of ticks at a
  `STARBASE_SCIENCE` versus at a `STARBASE_DOCK`
- **THEN** they recover more at the science station
