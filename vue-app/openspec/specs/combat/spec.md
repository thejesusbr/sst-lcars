# combat

## Purpose

Dano de phasers e torpedos, alvos no setor atual, contra-ataque inimigo,
Hail (rendição/captura/interrogatório) e o Cloaked Raider.

## Requirements

### Requirement: Shared sector entities
The list of enemies/entities in the player's current sector SHALL be one
`GameState.currentSector` collection, consumed by both `NavSensingConsole`'s SRS grid
and `WeaponsConsole`'s `enemyTargets`/scanner targeting — not two independent lists.

#### Scenario: Destroying an enemy updates the SRS
- **WHEN** a torpedo or phaser hit reduces an enemy's health to 0
- **THEN** the enemy is removed from `GameState.currentSector` and disappears from
  `NavSensingConsole`'s SRS grid in the same update, with no separate action needed

### Requirement: Stable entity identity
Every entity in `GameState.currentSector` SHALL carry a unique `id` that is assigned
once when the entity is created/spawned and never reused or reassigned, independent of
its position in the array. No code SHALL reference a sector entity by array index.

#### Scenario: Id survives removal of other entities
- **WHEN** an entity earlier in `currentSector` is destroyed and removed
- **THEN** every remaining entity's `id` is unchanged, even though their array indices
  shifted

### Requirement: Phaser fire splashes across all locked, visible enemies
Firing phasers SHALL consume energy from the shared pool, increase `phaserTemp`
(capped at 270, +30 per shot), and — reusing the classic 1978 splash formula — split
the committed phaser power evenly across every currently-visible (non-cloaked)
enemy while Weapons Lock is active, applying a randomized, distance-scaled damage
roll to each (same shape as the original game's per-target hit calculation), then
scaling the result by heat effectiveness `max(0, 100 - phaserTemp / 2.7)`. Firing
without an active Weapons Lock (see "Weapons Lock gates phaser fire") SHALL be
rejected.

#### Scenario: Overheated phasers deal reduced damage
- **WHEN** `phaserTemp` is high enough that effectiveness is below 100%
- **THEN** the damage applied to every hit target is proportionally reduced, not the
  full nominal amount

#### Scenario: Committed power splits evenly across all visible enemies
- **WHEN** 3 non-cloaked enemies are present in the current sector and the player
  fires phasers
- **THEN** each of the 3 receives a damage roll based on an equal one-third share of
  the committed phaser power, not just one designated target

#### Scenario: Cloaked enemies are excluded from the splash
- **WHEN** a `Cloaked Raider` (see below) is currently cloaked in the sector
- **THEN** it receives no phaser damage from that shot and does not count toward the
  power-split denominator

### Requirement: Phaser banks cool down passively when not fired
On any turn where phasers are not fired, `phaserTemp` SHALL decrease by `30`
(floor 0) — the same magnitude as the per-shot increase, a symmetric cooldown
(design.md decision #30; not from the 1978 source, which has no phaser-heat
concept — passive decay is a new invention for this mechanic, not an estimate
against a source formula). No player action or Damage Control dispatch is
required; cooldown is automatic and free.

#### Scenario: Phaser temperature drops on a turn without firing
- **WHEN** a turn resolves and the player did not fire phasers that turn
- **THEN** `phaserTemp` decreases by `30`, down to a floor of `0`

#### Scenario: Firing and cooling do not both apply the same turn
- **WHEN** the player fires phasers on a turn
- **THEN** `phaserTemp` only increases by the per-shot amount that turn — the
  passive cooldown does not also apply on a turn phasers were fired

### Requirement: Phaser Banks damage degrades heat, cooldown, and output
Using the shared damage fraction `d` (see "Subsystem damage fraction..."
below), a damaged Phaser Banks subsystem SHALL: increase heat gain per shot to
`30 * (1 + d)`; slow passive cooldown to `30 * (1 - d)`; and multiply final
phaser damage by `(1 - d)`, on top of (not instead of) the existing heat
effectiveness multiplier. At crítico (`d > 0.60`, integrity below 40), Phaser
Banks SHALL be paralyzed — "Fire Phasers" is rejected entirely, same rejection
UX as firing without Weapons Lock.

#### Scenario: Damaged phasers heat up faster and cool slower
- **WHEN** Phaser Banks integrity is 70 (`d = 0.30`) and the player fires
- **THEN** that shot adds `30 * 1.30 = 39` to `phaserTemp`, and any turn without
  firing removes only `30 * 0.70 = 21`

#### Scenario: Damaged phasers deal less damage independent of heat
- **WHEN** Phaser Banks integrity is 55 (`d = 0.45`) and `phaserTemp` is 0 (full
  heat effectiveness)
- **THEN** the damage roll is still multiplied by `(1 - 0.45) = 0.55` — the
  subsystem damage penalty applies even with a cold phaser bank

#### Scenario: Critical Phaser Banks damage prevents firing
- **WHEN** Phaser Banks integrity is below 40
- **THEN** "Fire Phasers" is rejected and no shot is fired, regardless of
  `phaserTemp` or Weapons Lock state

### Requirement: Photon Tubes damage degrades torpedo accuracy and reliability
Using the shared damage fraction `d`, a damaged Photon Tubes subsystem SHALL
multiply torpedo damage by `(1 - d)` — an imprecise firing solution, not a
lower-yield warhead. Once in the moderado band (`d > 0.30`), each load or
unload attempt SHALL have a `max(0, d - 0.3) * 100` percent chance to fail
(the attempt still consumes its turn — design.md decision #31 — but the tube's
load state does not change and no `torpedoStock` unit is consumed/returned).
At crítico (`d > 0.60`), Photon Tubes SHALL be paralyzed — "Fire Torpedoes" and
both load/unload are rejected entirely, tubes frozen in whatever state they
were last in.

#### Scenario: Damaged tubes deal less torpedo damage
- **WHEN** Photon Tubes integrity is 70 (`d = 0.30`) and a torpedo hits
- **THEN** the `200–300` damage roll is multiplied by `0.70` before applying to
  the target's `enemyPower`

#### Scenario: Moderado damage risks a failed load/unload
- **WHEN** Photon Tubes integrity is 55 (`d = 0.45`) and the player attempts to
  load a tube
- **THEN** there is a `15%` chance the attempt fails — the turn is still spent,
  but the tube remains empty and `torpedoStock` is unchanged

#### Scenario: Critical Photon Tubes damage freezes the tubes
- **WHEN** Photon Tubes integrity is below 40
- **THEN** firing, loading, and unloading are all rejected until repaired above
  that threshold

### Requirement: Subsystem damage fraction is the shared basis for degraded effectiveness
Every subsystem-damage effect in this change (Phaser Banks, Photon Tubes, Shield
Control — this reopens the "Subsystem Integrity cross-panel effects" Non-Goal
from design.md decision #19, per user direction on 2026-07-29, design.md
decision #35) SHALL derive from one shared value, `d = (100 - integrity) / 100`
(0 at full health, 1 at 0 integrity). Three damage bands apply uniformly:
**leve** (`d` in `0.00–0.30`, integrity 70–100), **moderado** (`d` in
`0.30–0.60`, integrity 40–70), **crítico** (`d > 0.60`, integrity below 40).
Continuous degradation (heat/draw/damage multipliers) applies across leve and
moderado alike, scaling with `d` from the first point of damage. Probabilistic
failure effects (load/unload failure, shield flicker) only activate once `d`
crosses into moderado (`d > 0.30`), using `max(0, d - 0.3) * 100` as their
percent chance — 0% at the leve/moderado boundary, ramping to 30% at the edge
of crítico. Crítico always means the subsystem is paralyzed/forced to a safe
state, never just a worse roll. This is a new mechanic, not adapted from the
1978 source (which has a simpler damaged/not-damaged device model, no
graduated bands) — starting point for playtesting, same treatment as other
estimated constants in this change.

#### Scenario: Continuous degradation scales smoothly from first damage
- **WHEN** a subsystem's integrity drops from 100 to 90 (light damage, still
  in the leve band)
- **THEN** its continuous multipliers already reflect `d = 0.10`, not 0 — the
  effect is not deferred until the moderado band

#### Scenario: Probabilistic failure is absent in leve, present in moderado
- **WHEN** a subsystem's integrity is 80 (leve, `d = 0.20`) versus 55
  (moderado, `d = 0.45`)
- **THEN** the probabilistic failure chance is 0% at 80 integrity and `15%` at
  55 integrity

### Requirement: Weapons Lock gates phaser fire
The ship SHALL track a `weaponsLocked` state, auto-acquired at no turn cost the
moment the ship enters a sector containing at least one visible (non-cloaked)
hostile entity. Phaser fire SHALL be rejected while `weaponsLocked` is false. Once
lost (by every locked target cloaking/leaving, or by the sensor-damage roll below),
the player SHALL be able to trigger re-acquisition via the "Lock" control, which
consumes exactly 1 turn, same cost class as Hail/Send Party/Dock.

#### Scenario: Entering a sector with visible hostiles auto-locks for free
- **WHEN** the ship enters a sector containing a non-cloaked enemy
- **THEN** `weaponsLocked` becomes true without consuming a turn

#### Scenario: Firing without lock is rejected
- **WHEN** `weaponsLocked` is false and the player attempts to fire phasers
- **THEN** the action is rejected, no energy is spent, and no damage is applied

#### Scenario: Manual re-lock costs exactly 1 turn
- **WHEN** the player clicks "Lock" after losing `weaponsLocked`
- **THEN** re-acquiring it consumes exactly 1 turn, the same way Hail/Send
  Party/Dock do

### Requirement: Weapons Lock degrades with Short-Range Sensors damage
While the `Short-Range Sensors` subsystem's integrity is below "Nominal", each turn
SHALL roll a `(100 - srsIntegrity) × 0.5%` chance (design.md decision #23 —
estimated starting value for playtesting, linear in damage severity, same shape as
the 1978 source's `H/S`-ratio-driven device-damage roll) to drop an active
`weaponsLocked` to false — the first concrete resolution
of the previously-open "Subsystem Integrity cross-panel effects" question (see
`design.md` Open Questions), scoped specifically to this one cross-panel link.

#### Scenario: Damaged sensors can drop an active lock
- **WHEN** `Short-Range Sensors` integrity is below "Nominal" and `weaponsLocked` is
  currently true
- **THEN** that turn rolls a chance to set `weaponsLocked` back to false

#### Scenario: Nominal sensors never drop lock on their own
- **WHEN** `Short-Range Sensors` integrity is at "Nominal"
- **THEN** no sensor-damage roll occurs and `weaponsLocked` is unaffected by this
  requirement

*(Short-Range Sensors can also be deliberately switched off to save energy —
distinct from being damaged — which likewise forces `weaponsLocked` unavailable;
see `energy-management` capability, "Non-essential subsystems can be toggled off".)*

### Requirement: Cloaked Raider — undetectable while cloaked
A new enemy subtype, `Cloaked Raider` (distinct from the standard Klingon cruiser,
matching the canon association of cloaking with a different power in the source
material), SHALL support a `cloaked` state. While cloaked, it SHALL be entirely
invisible — absent from `NavSensingConsole`'s SRS grid, the LRS 3×3 scan, and the
Star Chart, as if the sector contained no such entity — SHALL be excluded from
phaser's target splash and torpedo's Cycle target list (see `combat` targeting
requirements above), and SHALL NOT participate in enemy counter-attack resolution
while cloaked.

#### Scenario: Cloaked raider is absent from every sensor display
- **WHEN** a `Cloaked Raider` is cloaked in the player's current sector
- **THEN** it does not appear on the SRS grid, LRS scan, or Star Chart

#### Scenario: Cloaked raider cannot be targeted
- **WHEN** a `Cloaked Raider` is cloaked
- **THEN** it is excluded from phaser's splash targets, cannot be selected via
  torpedo tube Cycle, and cannot be hailed (same exclusion as targeting — the
  player cannot hail what sensors cannot detect)

#### Scenario: Cloaked raider does not attack
- **WHEN** enemy-turn resolution runs and a `Cloaked Raider` is currently cloaked
- **THEN** it is skipped — it contributes no attack that turn

### Requirement: Cloak duration is bounded by stress, forcing decloak at the cap
While cloaked, a `Cloaked Raider` SHALL accumulate cloak stress reusing the same
transient-stress table shape already established for the player's own Warp Core
stress (`navigation` capability, "Warp travel duration and Warp Core stress",
design.md decision #13) — no new curve. Reaching the stress cap SHALL force an
automatic, harmless decloak (the raider becomes visible/targetable/attack-capable
again) and start a cooldown during which it cannot cloak again. Stress accumulates
`+4` per turn cloaked on the same 0–20 scale as `manualOverload` (cap reached after
5 turns cloaked); cooldown is 8 turns before it can cloak again (design.md decision
#23 — estimated starting values for playtesting, longer than the cloak duration
itself so cloak stays a limited tactical tool, not permanent invisibility).

#### Scenario: Hitting the stress cap forces decloak, not a self-destruct roll
- **WHEN** a cloaked `Cloaked Raider`'s accumulated stress reaches the cap
- **THEN** it becomes visible and attack-capable again and begins a cooldown — no
  explosion/damage roll is applied to it

#### Scenario: Cooldown blocks immediate re-cloak
- **WHEN** a `Cloaked Raider` is in its post-decloak cooldown
- **THEN** it cannot re-enter the cloaked state until the cooldown elapses

### Requirement: Torpedo targeting via tube→enemy id map
Torpedo targeting SHALL be represented as a map from tube id to enemy `id` (nullable,
`null` meaning unassigned) — never as an array index into `currentSector`. Firing
torpedoes SHALL consume `torpedoStock` and apply damage to whichever enemy each loaded
tube's map entry currently references.

**Rejected alternative (see design.md decision log):** a per-tube `targetIndex:
number` pointing into the `currentSector` array. Rejected because destroying any
enemy earlier in the array silently retargets every tube pointing past it — a real
latent bug already present in the current mock (`WeaponsConsole.vue`), just never
triggered because the mock never removes an entity.

#### Scenario: Multiple tubes on the same target stack damage
- **WHEN** 2 tubes have their map entry set to the same enemy `id` and both fire
- **THEN** that single enemy receives damage from both tubes, not just one

#### Scenario: Destroying an enemy does not retarget unrelated tubes
- **WHEN** an enemy is destroyed and removed from `currentSector`
- **THEN** every tube whose map entry references a *different* enemy `id` keeps
  targeting that same enemy, unaffected by the removal

#### Scenario: Tube targeting a destroyed enemy clears instead of silently shifting
- **WHEN** a tube's map entry references an enemy `id` that no longer exists in
  `currentSector`
- **THEN** that tube's map entry becomes `null` (no target) — it SHALL NOT
  automatically pick up whatever enemy now occupies a former array position

### Requirement: Torpedo damage is massive and randomized, no heat penalty
Each torpedo hit SHALL deal `200 + round(random(0,1) * 100)` damage (200–300,
uniform) to its target's `enemyPower` — unlike phaser fire, torpedo damage is
NOT reduced by `phaserTemp`/heat effectiveness (Photon Tubes are a separate
subsystem from Phaser Banks) and is not split/shared across targets (each loaded
tube's shot applies its own independent roll to its own mapped target). The
1978 source has no equivalent formula to reuse here (a classic-game torpedo hit
is a binary instant-kill, not a damage roll against a stat that didn't exist
there) — this is a new formula sized against this change's own `enemyPower`
spawn range (`100–300`, "Enemy power is a single stat..." below): the roll's
floor (200) guarantees destroying anything at or below the spawn average (200)
in one hit, and its ceiling (300) still leaves only the toughest spawns
(near 300) barely standing — matching "destroys smaller ships, nearly destroys
bigger ones in one shot" (design.md decision #31). Starting point for
playtesting, same treatment as other estimated constants in this change.

#### Scenario: Torpedo one-shots an average or weaker enemy
- **WHEN** a torpedo hits an enemy whose current `enemyPower` is 200 or less
- **THEN** the hit reduces `enemyPower` to 0 or below, destroying it

#### Scenario: Torpedo nearly destroys the toughest enemies
- **WHEN** a torpedo hits an enemy whose current `enemyPower` is near the 300
  spawn ceiling
- **THEN** the hit leaves only a small remainder of `enemyPower`, not a full
  second hit's worth

#### Scenario: Torpedo damage ignores phaser heat
- **WHEN** `phaserTemp` is high enough to reduce phaser effectiveness
- **THEN** torpedo damage that same turn is unaffected — it applies its full
  200–300 roll regardless of `phaserTemp`

### Requirement: Cycle iterates currently detected enemies
The "Cycle" action for a tube SHALL advance its map entry to the next enemy `id` in
the current `currentSector` list (wrapping to the first after the last), based on the
list of enemies actually present — not a fixed-size/stale list.

#### Scenario: Cycle skips destroyed enemies automatically
- **WHEN** the player cycles a tube's target after an enemy was destroyed this turn
- **THEN** the cycle only offers `id`s currently present in `currentSector`, never the
  destroyed enemy's `id`

#### Scenario: Cycle skips cloaked enemies
- **WHEN** a `Cloaked Raider` (see "Cloaked Raider — undetectable while cloaked"
  below) is currently cloaked
- **THEN** its `id` is not offered by Cycle, same as a destroyed enemy would not be

### Requirement: Enemy power is a single stat for both health and attack strength
Each enemy entity SHALL carry one `enemyPower` value, reused directly from the 1978
source's unified design: player weapon hits (phaser/torpedo) reduce it toward 0
(destruction), and the enemy's own attacks deplete it further (`turn-engine`
capability, "Klingon attack damage"). There SHALL NOT be a separate "health" stat
independent of attack strength. Initial `enemyPower` on spawn SHALL be `200 * (0.5 +
random(0,1))` (100–300 range), reusing the source's `S9=200` base constant directly
— it already sits at the same order of magnitude as this change's energy scale
(`shieldEnergy` max 2500, `WARP_CORE_OUTPUT` 4500 vs. the source's `E0=3000`), so no
rescaling is needed.

#### Scenario: An enemy weakened by its own attacks is easier to finish off
- **WHEN** an enemy has attacked several times this encounter, depleting its own
  `enemyPower`
- **THEN** a subsequent phaser/torpedo hit of the same nominal strength destroys it
  more easily than it would have against its initial `enemyPower`

### Requirement: Enemy counter-attack response
After the player's weapons fire, the turn engine (see `turn-engine` capability) SHALL
resolve surviving enemies attacking back — combat is not one-sided.

#### Scenario: Surviving enemy retaliates
- **WHEN** an enemy survives a phaser/torpedo hit in the current sector
- **THEN** the subsequent enemy-turn resolution includes that enemy attacking the
  player's shields

### Requirement: Hailing enemies and starbases
The engine SHALL support hailing a target in the current sector (`NavSensingConsole`'s
"Hail" control), consuming 1 turn like any standard action. Hailing an enemy SHALL
attempt a surrender request with a fixed `30%` success chance (design.md decision
#23 — estimated starting value for playtesting, harder than a coin flip since
forcing a warship to surrender is a bigger ask than the 60% subsystem-damage roll).
Hailing a starbase SHALL always
succeed, at no risk, and reveal that base's current resource pool level (see
`docking` capability's "Base resource pool with limited capacity and regeneration").

#### Scenario: Hailing a base always reveals its status for free
- **WHEN** the player hails a starbase in the current sector
- **THEN** its current resource pool level is revealed, at no risk

### Requirement: Successful surrender captures a prisoner instead of destroying
When a hail surrender attempt against an enemy succeeds, that enemy SHALL be removed
from `currentSector` (counts toward `enemiesLeft`, same as destruction) and 1
prisoner SHALL be added to the ship's brig — **not** counted toward
`klingonsDestroyed` for the Commander rating; capture has its own, higher-weighted
rating term (see `end-game` capability, "Commander rating on game end"), since
capture also yields intelligence value (see "Interrogation" below).

#### Scenario: Successful surrender captures rather than destroys
- **WHEN** a hail surrender attempt against an enemy succeeds and the brig has
  available capacity
- **THEN** that enemy is removed from `currentSector`, `enemiesLeft` decreases, a
  prisoner is added to the brig, and `klingonsDestroyed` is unaffected

### Requirement: Brig has limited prisoner capacity
The ship SHALL track a brig with a fixed prisoner capacity of `4` (design.md
decision #23 — estimated starting value for playtesting, deliberately smaller than
the 6 Damage Control teams to force a real capacity choice) and a current prisoner
count. A surrender attempt
SHALL be rejected outright if the brig is already at capacity — the enemy is neither
captured nor destroyed, the hail simply fails for that reason.

*(How prisoners are released/freed from brig capacity is specified by the `docking`
capability — see "Prisoner transfer on docking (any base type)" — not by this
requirement.)*

#### Scenario: Surrender rejected when brig is full
- **WHEN** the brig is at full capacity
- **THEN** a hail surrender attempt against an enemy is rejected, and the enemy
  remains in `currentSector` unaffected

### Requirement: Interrogation reveals enemy fleet locations
At the moment of each successful capture (not repeatable later for the same
prisoner), the engine SHALL roll once, at a fixed `50%` chance (design.md decision
#23 — estimated starting value for playtesting), to determine whether that prisoner
reveals the
location of an undiscovered enemy ship or squadron. On success, the corresponding
galaxy quadrant SHALL be marked explored on the Star Chart (same effect as a
completed scan), at no cost to the player.

#### Scenario: Successful interrogation grants a free Star Chart reveal
- **WHEN** a capture's interrogation roll succeeds
- **THEN** one previously-unexplored quadrant containing an enemy ship/squadron
  becomes marked explored on the Star Chart, without spending a probe or LRS scan

#### Scenario: Interrogation is checked once per capture, never repeated
- **WHEN** a prisoner has already been checked for intel at the moment of capture
- **THEN** no further interrogation rolls occur for that same prisoner later
