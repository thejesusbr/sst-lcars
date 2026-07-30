## ADDED Requirements

### Requirement: Shared energy pool
`mainEnergy` (Warp Core nominal output) SHALL be one value in `GameState`, read by
`EngineeringConsole`, `HelmConsole` (Impulse), `WeaponsConsole` (Phaser),
`ShieldConsole` (transfer), and `SituationPanel` (read-only "Energy Level" widget)
— not a separately-seeded local copy in any of them.

#### Scenario: Shield transfer reflects in Engineering
- **WHEN** `ShieldConsole` transfers energy from main to shield pool
- **THEN** `EngineeringConsole`'s Main Energy/Subsystem Load display updates in the
  same tick, without a page reload or console switch

#### Scenario: SituationPanel shows available energy, not consumption
- **WHEN** `SituationPanel` renders its "Energy Level" indicator
- **THEN** it displays `mainEnergy` (the depletable reserve, same value and status
  thresholds `EngineeringConsole` uses for nominal/caution/critical), not
  `subsystemDraw` — the panel is a quick-glance "how much fuel is left" widget,
  distinct from Engineering's own produced-vs-consumed breakdown

### Requirement: All 9 subsystems contribute to subsystemDraw
`subsystemDraw` SHALL be the real sum of consumption from all 9 subsystems, not a
mocked constant and not limited to the 4 previously modeled (Impulse/Phaser/Shield/
Auto-Nav) — closing the gap flagged since `SST_LCARS_SPECS.md` §10.1 and left open
through the panel-by-panel review (design.md decision #25). Each subsystem
contributes as follows:

- **Warp Engines** (Impulse Power, `HelmConsole`): `IMPULSE_POWER_MAX = 2000` energy
  units at 100% — `impulsePower`'s 0–100% dial scales linearly against this (a value
  never previously defined; the dial had no energy-unit equivalent to sum against
  Phaser's 0–3000 scale). Boost forces effective 100% (`2000` units) regardless of
  the dial's set value, matching `boostedImpulsePower`. Contributes only on turns
  where the ship actually moves under impulse (free to adjust the dial, per
  design.md decision #21). If Warp Engines (the subsystem) is damaged, the
  effective ceiling is reduced per `navigation` capability's "Warp Engines
  damage reduces max speed, risks stalls, and can paralyze propulsion"
  (design.md decision #37) — `2000` above is the undamaged base value.
- **Phaser Banks** (Phaser Power, `WeaponsConsole`): unchanged, 0–3000 energy units,
  contributes only when firing.
- **Shield Control** (`ShieldConsole`): the draw is `shieldEnergy`'s current standing
  level (0–2500), not the transfer action — maintaining a shield charge costs
  ongoing power every turn it is held, same as real-world "shields up" trope. This
  supersedes the earlier "active shield transfer" wording, which didn't reconcile
  with shield adjustments being a free, instant action (design.md decision #18):
  transferring energy is still free/instant, but the resulting held level taxes
  `subsystemDraw` every turn thereafter until lowered. If Shield Control (the
  subsystem, not `shieldIntegrity`) is damaged, this contribution is further
  multiplied per `shields` capability's "Shield Control damage increases draw
  and causes flickering" (design.md decision #35).
- **Photon Tubes** (`WeaponsConsole`): every tube contributes `5`/turn while
  the Photon Tubes subsystem toggle (below) is on, loaded or not — the loading
  mechanism itself stays active, ready to receive a torpedo (design.md decision
  #32). A **loaded** tube contributes `20`/turn instead of the `5` idle amount
  (not additive — `20` total, not `5+20`): the torpedo primed inside it keeps
  its ignition pre-warmed and sensor-lock link live, on top of the loading
  mechanism's own idle draw (design.md decision #31, superseding the earlier
  flat `50`/turn "while armed" wording). Firing also costs an active `2` energy
  units per torpedo (reused directly from the 1978 source's `E=E-2` per-torpedo
  cost).
- **Short-Range Sensors**, **Long-Range Sensors**: passive baseline of `100`/turn
  each while toggled on (see "Non-essential subsystems can be toggled off" below).
- **Life Support**: passive baseline of `150`/turn, always on, no toggle (critical).
- **Warp Core**: passive "house load" of `50`/turn, always on, no toggle (the
  reactor's own regulation/control systems draw a small amount of their own output).
- **Auto-Navigation Computer**: `100`/turn while engaged for a multi-turn trip
  (`navigation` capability) — same tier as SRS/LRS's passive baseline, reused
  scale rather than a new one (design.md decision #28; this value was never
  quantified before, an orphaned gap left over from before the 9-subsystem
  consumption model existed).

All estimated baseline/conversion values above are starting points for playtesting
(design.md decision #25), same treatment as other numeric constants in this change.

#### Scenario: Firing phasers increases the shared draw
- **WHEN** `WeaponsConsole` fires phasers at a nonzero power setting
- **THEN** `EngineeringConsole`'s Subsystem Load value increases by the corresponding
  amount in the same turn

#### Scenario: Auto-Nav Computer adds to the draw while a trip is underway
- **WHEN** a warp trip is resolving with the Auto-Navigation Computer engaged
- **THEN** `subsystemDraw` includes its energy draw for every turn of that trip, on
  top of the other active subsystems' consumption

#### Scenario: Held shield energy taxes the budget every turn it is up
- **WHEN** `shieldEnergy` is held at a nonzero level across multiple turns, with no
  further transfer action taken
- **THEN** `subsystemDraw` includes that level's contribution every one of those
  turns, not just the turn it was raised

#### Scenario: Photon Tubes draw scales with how many tubes are loaded
- **WHEN** 2 of 3 torpedo tubes are currently loaded and 1 is empty
- **THEN** Photon Tubes' contribution to `subsystemDraw` is `2 × 20 + 1 × 5 = 45`
  — loaded tubes at `20` each, the remaining empty tube still at its `5` idle
  draw, not a flat amount regardless of load state

#### Scenario: Empty tubes still draw a small idle amount
- **WHEN** all torpedo tubes are unloaded (Photon Tubes subsystem still toggled
  on)
- **THEN** Photon Tubes' contribution to `subsystemDraw` is `3 × 5 = 15`, not `0`
  — the loading mechanism stays active and ready even with no torpedo inside

#### Scenario: Firing torpedoes adds a small active draw on top of the baseline
- **WHEN** the player fires torpedoes
- **THEN** `subsystemDraw` for that turn includes `2` energy units per torpedo
  fired, on top of Photon Tubes' passive baseline

#### Scenario: Weapons/shields/boosted impulse alone can exceed nominal output
- **WHEN** Phaser Power is at max (3000), `shieldEnergy` is at max (2500), and
  boosted Impulse is engaged (2000) simultaneously
- **THEN** their combined contribution (7500) alone exceeds `WARP_CORE_OUTPUT`
  (4500), triggering `autoOverload` without needing any passive baseline at all —
  confirming these 3 systems can force overload on their own, as intended

### Requirement: Non-essential subsystems can be toggled off
`Short-Range Sensors`, `Long-Range Sensors`, and `Photon Tubes` SHALL each expose an
explicit on/off toggle (free action, no turn cost, same pattern as the
Auto-Navigation Computer toggle). While off, a subsystem stops contributing its
passive baseline to `subsystemDraw` and its function becomes unavailable: SRS off
blanks `NavSensingConsole`'s SRS grid (and forces `weaponsLocked` to false/
unavailable — see `combat` capability, "Weapons Lock gates phaser fire" — sensors
cannot lock weapons while switched off, distinct from the probabilistic loss from
SRS damage); LRS off disables new LRS scans (existing decayed data stays frozen,
no further decay-refresh); Photon Tubes off disables torpedo firing entirely.
`Life Support` and `Warp Core` have no toggle — both are always on (life-critical
and reactor self-regulation respectively). Toggling any of these on/off SHALL
play a distinct power-up/power-down sound cue (`useSound` composable, design.md
decision #33) — same UI feedback pattern already used for button clicks
(confirm/deny sounds), giving the player audible confirmation of which
direction the toggle went.

#### Scenario: Toggling a subsystem on plays the power-up cue
- **WHEN** the player toggles SRS, LRS, or Photon Tubes from off to on
- **THEN** the power-up sound plays

#### Scenario: Toggling a subsystem off plays the power-down cue
- **WHEN** the player toggles SRS, LRS, or Photon Tubes from on to off
- **THEN** the power-down sound plays

#### Scenario: Toggling SRS off stops its draw and blanks the grid
- **WHEN** the player toggles Short-Range Sensors off
- **THEN** `subsystemDraw` no longer includes its `100`/turn baseline and
  `NavSensingConsole`'s SRS grid shows no data until toggled back on

#### Scenario: SRS off also forces Weapons Lock unavailable
- **WHEN** Short-Range Sensors is toggled off
- **THEN** `weaponsLocked` cannot be true and phaser fire remains rejected,
  independent of the sensor-damage roll

#### Scenario: Toggling a subsystem is free
- **WHEN** the player toggles SRS, LRS, or Photon Tubes on or off
- **THEN** no turn is consumed by the toggle itself

#### Scenario: Life Support and Warp Core cannot be toggled off
- **WHEN** the player looks for an off-toggle for Life Support or Warp Core
- **THEN** none is exposed — both always contribute their passive baseline

### Requirement: Automatic overload from over-consumption
When total routed energy exceeds `WARP_CORE_OUTPUT`, the engine SHALL compute
`autoOverload = max(1, round((consumo - output) / output * 100))`; otherwise
`autoOverload = 0`. `autoOverload` feeds into the effective overload used for
Warp Core damage/explosion rolls together with `manualOverload` and any
warp-travel stress — see `turn-engine` capability's "Warp Core overload and
breach rolls" for the unified, clamped formula (design.md decision #29).

#### Scenario: Over-consumption triggers at least 1% overload
- **WHEN** total routed energy exceeds `WARP_CORE_OUTPUT` by any amount
- **THEN** `autoOverload` is at least 1 and scales with how much the output was
  exceeded
