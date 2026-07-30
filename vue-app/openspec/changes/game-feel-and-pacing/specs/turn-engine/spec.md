## MODIFIED Requirements

### Requirement: Movement actions resolve real displacement
`move_impulse` and `move_warp` SHALL perform actual movement via the `navigation`
capability. Resolution SHALL respect the `navigation` capability's rules: manual
navigation stops short of obstacles, Auto-Nav routes around them, Warp Engines
damage caps speed and can stall or paralyze, and enemies in the departing sector
reposition before displacement (`fase-4-engine` decision #22).

**Engaging warp additionally clears `currentSector`**, taking the ship out of
reach for the whole trip (see `warp-travel-mode` capability). Enemy repositioning
still happens on the engaging turn — the departure is the last moment they can
react — but nothing reaches the ship afterwards.

**A warp trip's remaining turns advance automatically.** The player does not
advance them, and no turn-consuming action is accepted until arrival.

#### Scenario: Engaging warp moves the ship
- **WHEN** the player engages warp toward a reachable destination
- **THEN** the ship's position changes according to the resolved route, over
  `ceil(distance / warpFactor)` turns

#### Scenario: A declared action never silently no-ops
- **WHEN** any action in `PlayerActionType` is dispatched
- **THEN** it either produces its specified effect or is explicitly rejected with
  a reason — it SHALL NOT consume a turn while doing nothing

#### Scenario: Enemies reposition before the ship departs
- **WHEN** movement is engaged with enemies present in the current sector
- **THEN** each enemy repositions and attacks before the ship's displacement is
  computed

#### Scenario: Engaging warp empties the sector
- **WHEN** the player engages a warp trip
- **THEN** `currentSector` is cleared on that turn and no enemy reaches the ship
  for the remainder of the trip

### Requirement: Free adjustments vs turn-consuming actions
The engine SHALL distinguish two classes of player interaction:

- **Free (no turn cost, no `turnEngine` invocation):** Impulse Power level, Phaser
  Power level, Shield Energy transfer/raise/lower, Warp Core "Set Overload" dial,
  Auto-Navigation Computer on/off toggle, and Damage Control team dispatch/recall/
  reassignment. These only reconfigure the ship's own settings/assignments; their
  effects are realized through subsequent turn resolutions, not immediately.
- **Turn-consuming (each invocation resolves via the fixed order above, exactly 1
  turn unless a multi-turn duration is explicitly specified elsewhere):** Fire
  Phasers, Fire Torpedoes, loading or unloading a torpedo tube (`combat`
  capability, design.md decision #31 — unlike the free weapon-power dials, a tube
  physically handling a live torpedo takes a turn each way), Hail, Weapons Lock
  re-acquisition, launching a probe (resolves over `distância + 1` turns,
  `navigation` capability), launching a Send Party mission (fixed 3 turns,
  `damage-control` capability), engaging warp/impulse travel
  (`ceil(distância/warpFactor)` turns or immediate for impulse, `navigation`
  capability), triggering Dock (starts the multi-turn docking loop, `docking`
  capability), and End Turn / Skip N Turns (see below). Undocking remains free (no
  turn cost, design.md decision #13).

**While a warp trip is in progress, every turn-consuming action SHALL be
rejected** — not only navigation ones. The free class stays available: the crew
can still adjust dials and work Damage Control in transit.

#### Scenario: Adjusting a dial mid-sector does not trigger enemy response
- **WHEN** the player adjusts Phaser Power, Shield Energy, or the Overload dial any
  number of times
- **THEN** no `turnEngine` resolution occurs as a direct result

#### Scenario: Firing always resolves exactly one turn
- **WHEN** the player clicks "Fire Phasers" or "Fire Torpedoes"
- **THEN** the fixed turn resolution order runs once for that action

#### Scenario: Turn-consuming actions are refused at warp
- **WHEN** a warp trip is in progress and any turn-consuming action is dispatched
- **THEN** it is rejected with a reason and consumes no turn

#### Scenario: Free adjustments survive warp
- **WHEN** a warp trip is in progress and the player retargets a Damage Control
  team or changes the shield level
- **THEN** it applies normally

### Requirement: Fixed turn resolution order
The 5-step order stays as originally specified, and each step carries an explicit
set of per-turn ticks. Anchoring each tick to a named step makes a missing tick a
failing test instead of a silent gap (design.md decision 1, `fase-4-engine`
design.md decision #38).

1. **Player action** — including movement, where enemies reposition BEFORE the
   ship's displacement resolves.
2. **Warp Core** — plus transient warp-travel stress (when `warpFactor > 4`) and
   the radiation-breach containment tick.
3. **Enemy turn** — plus cloak stress accumulation and cloak-cooldown decrement.
4. **Terminal conditions** — plus the Life Support survival countdown.
5. **Log and domain update** — plus Damage Control repair, warp-trip/probe/boost
   progression, LRS/Star Chart confidence decay, passive phaser cooldown, and the
   Weapons Lock sensor-damage roll.

**Each step SHALL tag the events it produces with its own identity**, so the
presentation layer can tell the player's action apart from the enemy's response
(see `turn-presentation` capability). The engine itself stays synchronous — the
whole turn resolves and returns before anything is presented.

#### Scenario: Repair resolves before terminal checks cannot save a doomed ship
- **WHEN** a turn resolves in which Damage Control repair would raise a subsystem
  above a critical threshold, and a terminal condition is already true at step 4
- **THEN** the terminal condition still ends the game — repair runs at step 5,
  after the check, so it cannot retroactively rescue that turn

#### Scenario: Every anchored tick runs exactly once per resolved turn
- **WHEN** a single turn resolves
- **THEN** each tick listed above executes exactly once, in its anchored step —
  never twice, never skipped

#### Scenario: Events carry the step that produced them
- **WHEN** a turn resolves with both a player attack and an enemy response
- **THEN** the events are distinguishable by step without inspecting their text
