# navigation

## Purpose

Posição da nave, viagem de warp e impulso, Auto-Navigation Computer, boost,
sonda, LRS e Star Chart.

## Requirements

### Requirement: Single position source
Ship `quadrant`/`sector` position SHALL live as one field in `GameState`, read (not
independently owned) by `HelmConsole`, `NavSensingConsole`, and `StarChartConsole`.

#### Scenario: Position update reflects everywhere
- **WHEN** `HelmConsole` completes a warp move to a new quadrant
- **THEN** `NavSensingConsole`'s SRS/LRS and `StarChartConsole`'s highlighted quadrant
  update to the new position without any manual sync step

### Requirement: Distance metric
Every distance calculation used by this capability (movement cost, probe travel
time, route selection) SHALL use Chebyshev distance (`max(|dx|, |dy|)`) between grid
coordinates — the same metric already implied by the D-Pad, where diagonal steps
(seção 12.2) cost the same single step as cardinal ones.

#### Scenario: Diagonal distance counts as the larger axis delta, not the sum
- **WHEN** the target is 3 quadrants away on one axis and 2 on the other
- **THEN** the computed distance is 3 (the larger delta), not 5 (the sum)

### Requirement: Warp travel duration and Warp Core stress
`NAV` (warp, inter-quadrant/sector) actions SHALL take `ceil(distance / warpFactor)`
turns to resolve (per the distance metric above), where `warpFactor` is the value
chosen by the player (1–8) — the same formula already used for probes (this
capability, fixed at warp factor 1), generalized to the player's chosen speed.
Faithful to the classic game's own linear time/warp-factor relationship (confirmed
against the original 1978 BASIC source, `vintage-basic.net/bcg/superstartrek.bas`:
`N=INT(W1*8+.5)` sectors moved per fixed-cost command — NOT the inverse-square
relationship some secondary sources describe).

Warp travel SHALL NOT deduct stored energy (unlike the classic game, which used
`E=E-N-10`; this version has no energy stock at all) — its cost is instead paid in Warp Core stress: warp factor 4 and
below is "safe cruising speed" and adds no stress. For any travel turn where
`warpFactor > 4`, the engine SHALL add a transient "warp stress" amount to the
effective overload used for that turn's Warp Core damage/explosion rolls (see
`turn-engine` capability's Warp Core overload/breach rolls), on top of
`manualOverload`, reverting once the trip completes.

Stress-per-warp-factor-point above the safe threshold: `+2` effective-overload
points per point of `warpFactor` above 4, on the same 0–20 scale as `manualOverload`
(design.md decision #23 — estimated starting value for playtesting, not derived
from the classic source, which has no equivalent stress concept). Warp 6 adds +4
(still in the Fibonacci table's low-risk zone); warp 8 adds +8 (well into its
steep-risk zone).

#### Scenario: Higher warp factor shortens the trip
- **WHEN** the player engages the same destination at warp 4 versus warp 2
- **THEN** the warp-4 trip takes half as many turns as the warp-2 trip

#### Scenario: Cruising at warp 4 or below adds no Warp Core stress
- **WHEN** a warp trip is resolved entirely at `warpFactor <= 4`
- **THEN** no additional stress is added to the Warp Core overload rolls for any
  tick of that trip, regardless of `manualOverload`

#### Scenario: Warp 5+ adds transient stress on top of manual overload
- **WHEN** a warp trip resolves at `warpFactor > 4`
- **THEN** each travel turn's effective overload (for Warp Core damage/explosion
  rolls) is `manualOverload` plus a warp-factor-dependent stress amount

### Requirement: Warp Engines damage reduces max speed, risks stalls, and can paralyze propulsion
"Warp Engines" is the one subsystem covering both drive modes — sublight
Impulse and FTL warp — since both draw on the same propulsion hardware. Using
the shared damage fraction `d` and bands (design.md decisions #35/#37), damage
SHALL reduce the effective ceiling for both: effective `IMPULSE_POWER_MAX` is
`2000 * (1 - d)` (see `energy-management` capability for the undamaged base
value) and effective max `warpFactor` is `floor(8 * (1 - d))`, floored at `1`
while not crítico. If the player's currently-selected Impulse Power or
`warpFactor` exceeds the newly-reduced ceiling, it SHALL clamp down
automatically. Once in the moderado band (`d > 0.30`), each turn spent actually
moving under Impulse or warp SHALL have a `max(0, d - 0.3) * 100` percent
chance of an engine stall: the turn resolves as normal (still consumed) but the
ship does not advance that turn — a warp trip's remaining distance is
unchanged, effectively adding a turn to it. At crítico (`d > 0.60`), Warp
Engines SHALL be paralyzed: both "Engage Impulse" and "Engage Warp" are
rejected entirely until repaired back above 40.

#### Scenario: Damaged engines lower the speed ceiling
- **WHEN** Warp Engines integrity is 70 (`d = 0.30`) and the player has
  `warpFactor` set to 8
- **THEN** the effective max warp factor clamps to `floor(8 * 0.70) = 5`, and
  `warpFactor` is reduced to `5` if it was higher

#### Scenario: Moderado damage risks a stalled turn
- **WHEN** Warp Engines integrity is 55 (`d = 0.45`) during a turn of active
  movement
- **THEN** there is a `15%` chance that turn resolves with no distance covered,
  extending the trip by one turn

#### Scenario: Critical Warp Engines damage prevents any propulsion
- **WHEN** Warp Engines integrity is below 40
- **THEN** both "Engage Impulse" and "Engage Warp" are rejected, and the ship
  cannot move under its own power until repaired above 40

### Requirement: Manual navigation stops short of obstacles
Without the Auto-Navigation Computer engaged (see below), if the path from the
ship's current position toward the destination would cross an occupied cell (star,
planet, starbase, or enemy), the ship SHALL stop at the last unoccupied cell before
the obstruction — matching the classic game's "WARP ENGINES SHUT DOWN ... DUE TO BAD
NAVIGATION" behavior (`sst_original.bas` lines 3240–3350) — rather than being
rejected outright or colliding/taking damage. A combat log entry SHALL note the
interrupted arrival.

#### Scenario: Ship halts one cell short of an obstacle
- **WHEN** the player engages manual navigation toward a destination whose direct
  path crosses an occupied cell
- **THEN** the ship's final position is the last unoccupied cell along that path,
  not the original destination, and the combat log records the interruption

#### Scenario: Out-of-grid destination is rejected outright
- **WHEN** the computed destination coordinate falls outside 1–8 on either axis
- **THEN** the movement is rejected and the ship's position does not change (this
  case is a genuine rejection, unlike an occupied cell mid-path)

### Requirement: Auto-Navigation Computer (obstacle-avoiding autopilot)
`HelmConsole` SHALL expose an explicit "Auto-Nav Computer" toggle, off by default,
independent of the "Auto-Navigate to nearest base" destination-selection helper
below. The player SHALL explicitly enable it before engaging a warp move for it to
apply — it SHALL NOT activate implicitly. Toggling it on/off SHALL play the same
power-up/power-down sound cue as the other subsystem toggles (`energy-management`
capability, "Non-essential subsystems can be toggled off", design.md decision
#33). (The classic game never auto-piloted the
ship — its "computer" only calculated direction/distance for the player to enter
manually, `sst_original.bas` lines 8150–8460. Real autopilot here is a deliberate
23rd-century-appropriate departure from canon, not an adaptation of an existing
mechanic.)

When enabled for a warp move, the engine SHALL compute a route from the ship's
current position to the chosen destination that avoids passing through any occupied
cell, rather than the direct path used by manual navigation. This route's distance
(generally ≥ the direct distance) SHALL be used for the warp-duration formula above,
and the trip SHALL always complete at the exact chosen destination — never
interrupted early like manual navigation's "stops short" behavior.

While engaged for a multi-turn trip, the Auto-Nav Computer SHALL add an ongoing
energy draw to the shared `subsystemDraw` aggregate (see `energy-management`
capability) each turn of that trip, on top of any other consumption that turn —
potentially contributing to automatic overload.

*(Exact energy draw amount and the pathfinding algorithm itself are implementation
details for `engine/navigation.ts`, not fixed by this requirement.)*

#### Scenario: Auto-nav takes a longer but uninterrupted route
- **WHEN** the player enables Auto-Nav Computer, chooses a destination whose direct
  path crosses an occupied cell, and engages
- **THEN** the ship follows a longer obstacle-free route and arrives exactly at the
  destination, never stopping short

#### Scenario: Auto-nav draws extra energy every turn it's active
- **WHEN** a multi-turn auto-nav trip is underway
- **THEN** each turn of that trip adds the Auto-Nav Computer's draw (`100`/turn,
  see `energy-management` capability) to `subsystemDraw`, on top of Helm/Weapons/
  Shield consumption that same turn

### Requirement: Auto-Navigation Computer damage raises draw, degrades routing, and can paralyze it
Using the shared damage fraction `d` and bands (design.md decisions #35/#37), a
damaged Auto-Navigation Computer SHALL multiply its energy draw by `(1 + d)` —
same shape as Shield Control. Once in the moderado band (`d > 0.30`), each turn
of an active auto-nav trip SHALL have a `max(0, d - 0.3) * 100` percent chance
of the route degrading that turn: the computer fails to route around an
obstacle and the ship halts at the last unoccupied cell, exactly like manual
navigation's "stops short" behavior (see "Manual navigation stops short of
obstacles") — the rest of the trip is abandoned, not retried automatically. At
crítico (`d > 0.60`), the Auto-Navigation Computer SHALL be paralyzed: the
toggle cannot be engaged, and if damage crosses into crítico mid-trip, the
in-progress trip immediately falls back to manual navigation rules for its
remaining distance.

#### Scenario: Damaged auto-nav draws more energy
- **WHEN** Auto-Navigation Computer integrity is 70 (`d = 0.30`) during an
  active trip
- **THEN** its draw that turn is `100 * 1.30 = 130`, not `100`

#### Scenario: Moderado damage risks falling back to manual routing
- **WHEN** Auto-Navigation Computer integrity is 55 (`d = 0.45`) during an
  active trip
- **THEN** there is a `15%` chance that turn the ship halts short at the last
  unoccupied cell instead of continuing its obstacle-avoiding route

#### Scenario: Critical damage prevents engaging auto-nav
- **WHEN** Auto-Navigation Computer integrity is below 40
- **THEN** the toggle cannot be enabled, and an already-engaged trip switches
  to manual navigation rules immediately

#### Scenario: Toggle is opt-in per trip, not persistent by default
- **WHEN** the player engages a warp move without having enabled Auto-Nav Computer
- **THEN** manual navigation applies instead (see "Manual navigation stops short of
  obstacles")

### Requirement: Impulse movement (WRP) still draws energy directly
Unlike warp (`NAV`), intra-sector impulse movement (`WRP`) SHALL continue to draw
energy through the existing Impulse Power mechanism (see `energy-management`
capability's aggregate `subsystemDraw`) — the removal of direct energy cost from
movement applies only to warp travel, not impulse.

#### Scenario: Impulse movement still contributes to subsystemDraw
- **WHEN** the player moves the ship via the D-Pad under impulse power
- **THEN** energy is drawn per the existing Impulse Power mechanism, unaffected by
  the warp-travel energy change above

### Requirement: Boost duration and cooldown in turns, gated by actual movement
`impulseBoost` SHALL be measured in turns, not real-world seconds (`setTimeout`/
`Date.now()` as currently mocked in `HelmConsole.vue` SHALL be removed). The boost
duration SHALL only elapse on turns where the player actually moves the ship under
impulse (engaging movement) — toggling boost on by itself, without moving, SHALL NOT
consume any of its duration. Its maximum duration SHALL be shorter than a full warp
trip (intra-sector use only). Cooldown length SHALL scale with the distance actually
traveled while boosted, not a flat duration.

Max duration: 5 turns (short, intra-sector burst). Cooldown: `1.5 ×` the number of
turns boost was actually engaged for — e.g. a 3-turn boosted move costs a 5-turn
(rounded up) cooldown before it can reactivate (design.md decision #23 — estimated
starting value for playtesting).

#### Scenario: Boost does not tick down while idle
- **WHEN** the player enables boost but does not engage any impulse movement that
  turn
- **THEN** the boost's remaining duration is unchanged from the previous turn

#### Scenario: Cooldown scales with distance flown under boost
- **WHEN** a longer boosted move is compared to a shorter one
- **THEN** the longer move results in a longer cooldown before boost can be
  reactivated

### Requirement: Auto-Navigate to nearest base (destination helper)
The engine SHALL support auto-filling the destination fields with the nearest known
starbase's coordinates — a target-selection convenience, composable with either
manual or Auto-Navigation Computer travel (the player still chooses how to travel
there; this requirement only picks where).

#### Scenario: Auto-Nav selects the closest known base
- **WHEN** the player triggers "Auto-Nav to Base" with at least one starbase already
  discovered
- **THEN** the destination fields are set to the starbase with the shortest distance
  among known starbases, not an arbitrary one

### Requirement: LRS scope — neighboring quadrants only, no memory
Long Range Sensor scans SHALL only reveal data for the 9 quadrants forming the
3×3 block centered on the ship's current quadrant (seção 12.7) — never the full
galaxy. Unlike the Star Chart (cumulative, permanent memory of everything ever
explored), an LRS scan's revealed data SHALL disappear again once superseded by a
new scan — it does not accumulate into permanent galaxy memory on its own.

#### Scenario: Only the 3×3 neighborhood is populated
- **WHEN** an LRS scan resolves
- **THEN** only quadrants within Chebyshev distance 1 of the ship's current quadrant
  may show data; quadrants farther away stay blank regardless of what's there

#### Scenario: LRS data does not persist across a new scan elsewhere
- **WHEN** the ship moves to a new quadrant and scans again
- **THEN** the previous scan's revealed quadrants are not carried over as memory —
  only the new 3×3 neighborhood is populated (Star Chart, not LRS, is what
  accumulates permanently)

### Requirement: LRS signal confidence decays over turns
Once scanned, each revealed LRS cell's signal confidence SHALL decay `5%` per turn
since the scan, floored at `30%` (never fully vanishes — stars don't move, only
enemy/base positions actually go stale). Confidence SHALL be reflected as reduced
opacity in the UI. The "Advance Turn" debug control used to test this decay in the
current mock SHALL be removed — confidence SHALL decay from real turn resolutions
(`turn-engine` capability), not a dedicated test button.

#### Scenario: Confidence floors at 30%, never reaches zero
- **WHEN** 20+ turns pass since the last LRS scan without rescanning
- **THEN** signal confidence reads exactly 30%, not lower

#### Scenario: Rescanning resets confidence to full
- **WHEN** the player performs a new LRS scan
- **THEN** signal confidence for the newly revealed data resets to 100%

### Requirement: Long-Range Sensors damage accelerates decay and disables at crítico
Using the shared damage fraction `d` and bands (`combat` capability, "Subsystem
damage fraction is the shared basis for degraded effectiveness", design.md
decision #35, generalized further by decision #37) — a damaged LRS subsystem
SHALL multiply the confidence decay rate above by `(1 + d)`: `5% * (1 + d)` per
turn instead of a flat `5%`, still floored at `30%`. At crítico (`d > 0.60`,
integrity below 40), LRS SHALL be forced off exactly like the manual toggle-off
(`energy-management` capability, "Non-essential subsystems can be toggled
off"): no new scans, existing decayed data stays frozen at whatever confidence
it last had. The player SHALL NOT be able to toggle LRS back on manually while
it remains critical — same lock pattern as Shield Control at crítico.

#### Scenario: Damaged LRS loses confidence faster
- **WHEN** LRS integrity is 70 (`d = 0.30`)
- **THEN** confidence decays at `5% * 1.30 = 6.5%` per turn instead of `5%`

#### Scenario: Critical LRS damage disables scanning and locks the toggle
- **WHEN** LRS integrity drops below 40
- **THEN** LRS behaves as if toggled off (no new scans, frozen existing data)
  and the manual toggle is rejected until repaired back above 40

### Requirement: Probe travel and scan duration
Launching a probe at a target sector SHALL take `distance + 1` turns to resolve —
`distance` (Chebyshev, per the metric above) assuming the probe travels at warp
factor 1 (1 distance unit per turn), plus exactly 1 additional turn to perform the
scan itself. The probe SHALL NOT reveal any data until this full duration has
elapsed on the shared turn clock — not a real-time (`setTimeout`) timer.

#### Scenario: Distance directly determines the wait
- **WHEN** a probe is launched at a target with Chebyshev distance 3
- **THEN** the probe resolves after exactly 4 turns (3 travel + 1 scan)

#### Scenario: Adjacent target still takes at least one turn beyond travel
- **WHEN** a probe is launched at an adjacent target sector (distance 1)
- **THEN** the probe resolves after exactly 2 turns (1 travel + 1 scan)

A surviving probe's scan SHALL reveal, in addition to the target quadrant's KBS
code, **whether a planet is present and how many dilithium charges it holds**,
appending the finding to the combat log. The scanned planet SHALL be marked
surveyed, so the player learns its charge count without spending a Send Party
mission (design.md decision 9).

This makes the probe the game's scarce intelligence instrument rather than just a
KBS reveal. Planets and their charges are otherwise invisible at range — absent
from the KBS code and therefore from both LRS and Star Chart
(`world-generation` capability) — so without this the player would have to spend a
3-turn mission merely to discover whether a 3-turn mission is worthwhile.

The existing scarcity constraints are what keep this balanced, and none of them
change: only 3 probes per game, resolution takes `distance + 1` turns, and a probe
sent at a hostile sector risks destruction (see "Hostile-target probe destruction
risk") with no refund.

#### Scenario: Surviving probe reports planet and dilithium in the log
- **WHEN** a probe completes its scan of a quadrant containing a planet with 2
  dilithium charges
- **THEN** the combat log records the planet's presence and its 2 charges, and that
  planet is marked surveyed

#### Scenario: Probe reports absence of dilithium too
- **WHEN** a probe scans a quadrant whose planet holds no charges
- **THEN** the log states the planet is barren, sparing the player a wasted Send
  Party mission

#### Scenario: Probe reports no planet when there is none
- **WHEN** a probe scans a quadrant containing no planet
- **THEN** the log reports the KBS content with no planet finding

#### Scenario: Destroyed probe reveals nothing about planets either
- **WHEN** a probe is destroyed by the hostile-sector risk check before scanning
- **THEN** no planet or dilithium information is revealed, the probe is not
  refunded, and any planet there remains unsurveyed

#### Scenario: Surveying by probe does not consume a charge
- **WHEN** a probe reveals a planet holding 3 charges
- **THEN** all 3 charges remain available for Send Party missions — the probe only
  observes

### Requirement: Hostile-target probe destruction risk
If the target sector contains enemies, the probe SHALL be at risk of destruction upon
arrival, checked once before the scan turn resolves (not once per travel turn). If
destroyed, no scan data SHALL be revealed, `remainingProbes` SHALL NOT be refunded,
and a combat log entry noting loss of contact with the probe SHALL be appended.

Destruction chance: `40% + 5%` per enemy ship beyond the first present in the
target sector (design.md decision #23 — estimated starting value for
playtesting) — more enemies present means a higher chance one of them intercepts
the probe. Same formula and same risk-check style apply to the landing party's
hostile-sector risk (`damage-control` capability, "Hostile-sector landing party
risk").

#### Scenario: Probe lost in hostile territory produces no data and a log entry
- **WHEN** a probe's destruction-risk check succeeds against a hostile target sector
- **THEN** no scan data is revealed for that sector and the combat log receives a
  "contact lost" entry referencing the probe

#### Scenario: More enemies present raise the destruction chance
- **WHEN** the target sector has 3 enemies present versus 1
- **THEN** the destruction-risk check uses a higher chance (`40% + 5%×2 = 50%`)
  versus the single-enemy baseline (`40%`)

#### Scenario: Safe target sectors have no destruction risk
- **WHEN** the target sector contains no enemies
- **THEN** the probe always survives to complete its scan

### Requirement: Star Chart accumulates explored quadrants permanently
Any event that reveals a quadrant's KBS content — an LRS scan covering it, a
successful probe targeting it, or a successful Hail interrogation reveal (see
`combat` capability) — SHALL mark that quadrant as explored on the Star Chart
(`exploredQuadrants`) and store its KBS code. Unlike LRS (no memory of its own, see
above), the Star Chart's record is permanent once written.

#### Scenario: LRS scan permanently marks its neighborhood explored
- **WHEN** an LRS scan reveals the 9-quadrant neighborhood
- **THEN** all 9 quadrants become marked explored on the Star Chart, not just
  temporarily visible on the LRS grid

#### Scenario: Interrogation marks a quadrant explored without scanning it
- **WHEN** a successful interrogation reveal (`combat` capability) targets a
  quadrant
- **THEN** that quadrant becomes marked explored on the Star Chart with its current
  KBS code, even if outside LRS/probe range

### Requirement: Star Chart entries carry confidence that decays and can be refreshed
Once explored, a Star Chart entry's confidence SHALL decay over turns since it was
last refreshed — same shape as LRS signal confidence (exact rate is a separate open
balancing question, may differ from LRS's). Any subsequent event that reveals that
same quadrant again — rescanning it, a probe, interrogation, or a significant
reported event such as a starbase there being destroyed — SHALL refresh its
confidence to 100% and update its stored KBS code to the newly-known value.

*(Deliberately general enough to also cover future ambient events — e.g. a starbase
destroyed by Klingons independent of the player, see `design.md`'s deferred "IA
Klingon caçando bases" Open Question. That mechanic's trigger stays out of scope for
this change, but its eventual implementation can reuse this same refresh operation +
a combat log entry, without new plumbing.)*

#### Scenario: Old Star Chart entries fade but never disappear
- **WHEN** a quadrant was explored long ago and never refreshed since
- **THEN** its Star Chart entry still displays its last-known KBS code, at reduced
  confidence (opacity), never blank/removed

#### Scenario: A fresh reveal resets confidence and updates the code
- **WHEN** a previously-explored quadrant is revealed again by any means
- **THEN** its Star Chart confidence resets to 100% and its stored KBS code updates
  to the current value

### Requirement: Manual "Send to Helm" from Star Chart/LRS
Selecting a cell on the Star Chart or LRS grid and pressing "Snd to Helm" SHALL set
`HelmConsole`'s destination fields to that quadrant/sector — same effect as
"Auto-Navigate to nearest base" above, except the target is manually chosen by the
player instead of auto-selected.

#### Scenario: Selected cell becomes the Helm destination
- **WHEN** the player selects a cell on the Star Chart and presses "Snd to Helm"
- **THEN** `HelmConsole`'s destination fields update to that quadrant, ready for the
  player to Engage

### Requirement: Undocking is a free action
Pressing "Dock" while docked SHALL relabel to "Undock". Undocking SHALL cost no
turn/stardate — it immediately changes the ship's status to not-docked and places it
in the sector immediately southwest of the base it was docked at.

#### Scenario: Undock always exits to the southwest sector
- **WHEN** the player presses Undock
- **THEN** the ship's new sector is the one immediately southwest of the base's
  sector, and no stardate is consumed

### Requirement: Helm inert while docked
While the ship is docked (see `docking` capability), `NAV`/`WRP`/Auto-Nav
Computer/Boost controls in `HelmConsole` SHALL be disabled — the ship cannot warp or
impulse away while plugged into a starbase.

#### Scenario: Engage is unavailable while docked
- **WHEN** the ship is currently docked
- **THEN** Warp/Impulse Engage controls are disabled until Undock is pressed

### Requirement: Navigation is invoked by turn resolution
Every per-turn behavior this capability already implements SHALL be invoked by the
turn engine. `engine/navigation.ts` is fully implemented and unit-tested but
imported by nothing outside its own test file, so none of it currently affects a
running game (`fase-4-engine` design.md decision #38).

The turn engine SHALL, at the step anchored by the `turn-engine` capability:
advance an in-progress warp trip; advance and resolve a launched probe; tick boost
duration (only on turns the ship actually moved under impulse) and boost cooldown;
age LRS scan data and Star Chart entries so their confidence decays.

#### Scenario: An in-progress warp trip advances each turn
- **WHEN** a multi-turn warp trip is underway and a turn resolves
- **THEN** its remaining duration decreases, and the ship arrives when it reaches
  zero

#### Scenario: Boost duration only spends on turns the ship moved
- **WHEN** boost is active but the player takes a non-movement action
- **THEN** the boost's remaining duration is unchanged

#### Scenario: Boost cooldown counts down every turn
- **WHEN** boost cooldown is nonzero and any turn resolves
- **THEN** the cooldown decreases, regardless of the action taken

### Requirement: Probe launch consumes stock and uses the real travel duration
Launching a probe SHALL decrement `remainingProbes` and SHALL compute duration as
`distance + 1` turns using the shared Chebyshev metric. Today the turn engine
hardcodes a 2-turn duration and never decrements the counter, so probes are
effectively unlimited and their distance is ignored.

#### Scenario: Launching decrements the probe counter
- **WHEN** the player launches a probe with 3 remaining
- **THEN** `remainingProbes` becomes 2 immediately

#### Scenario: Duration scales with distance
- **WHEN** probes are launched at Chebyshev distances 1 and 3
- **THEN** they resolve after exactly 2 and 4 turns respectively

#### Scenario: Launch is rejected with no probes left
- **WHEN** `remainingProbes` is 0 and the player attempts a launch
- **THEN** the action is rejected and no turn is consumed

### Requirement: Probe resolution reveals data and rolls hostile risk
A resolving probe SHALL run the hostile-sector destruction check
(`40% + 5%` per enemy beyond the first) and, on survival, write the scanned
quadrant into the Star Chart's explored record. Today resolution merely clears the
probe, revealing nothing and risking nothing.

#### Scenario: Surviving probe marks its target explored
- **WHEN** a probe resolves against a sector with no enemies
- **THEN** that quadrant becomes marked explored with its KBS code at full
  confidence

#### Scenario: Destroyed probe reveals nothing and is not refunded
- **WHEN** a probe's destruction check succeeds against a hostile target
- **THEN** no scan data is written, `remainingProbes` is not refunded, and the
  combat log records loss of contact

### Requirement: Sector queries live in a shared leaf module
Sector/entity queries — visible (non-cloaked) entities, entity-type
classification, occupied cells, adjacency — SHALL live in a leaf module
(`engine/sector.ts`) that imports only from `types/game.ts`. Consumers
(`combat`, `damage-control`, `navigation`, `docking`, and later
`world-generation`) import from it rather than from each other.

This restores the dependency invariant of `fase-4-engine` decision #36, currently
broken by `damageControl.ts` importing `getVisibleEnemies` from `combat.ts`
(design.md decision 2).

#### Scenario: No engine module imports a sibling module
- **WHEN** the engine's internal import graph is inspected
- **THEN** every module imports only from `types/game.ts` and the leaf modules
  (`constants.ts`, `sector.ts`) — except the orchestrator (`turnEngine.ts`) and
  `endGame.ts`, which may compose the others

#### Scenario: Shared query returns one consistent answer
- **WHEN** `combat` and `damage-control` both ask for the visible enemies of the
  same sector state
- **THEN** both receive the same result from the same implementation
