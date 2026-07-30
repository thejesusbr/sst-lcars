## ADDED Requirements

### Requirement: Galaxy generation with the 1978 source's odds
A new game SHALL generate an 8×8 galaxy by rolling, independently for each of the
64 quadrants, the Klingon/starbase/star content using the odds extracted verbatim
from the original (`sst_original.bas` lines 810–1040):

| Roll | Result | Chance |
|---|---|---|
| `r > 0.98` | 3 Klingons | 2% |
| `r > 0.95` | 2 Klingons | 3% |
| `r > 0.80` | 1 Klingon | 15% |
| otherwise | 0 Klingons | 80% |
| separate roll `> 0.96` | 1 starbase | 4% |
| always | 1–8 stars | 100% |

Each quadrant SHALL store a 3-digit KBS code (`klingons×100 + bases×10 + stars`) —
the same encoding `StarChartConsole` and the LRS grid already read.

#### Scenario: Every quadrant gets at least one star
- **WHEN** the galaxy is generated
- **THEN** every one of the 64 quadrants has a star count between 1 and 8, never 0

#### Scenario: KBS code encodes the quadrant's real content
- **WHEN** a quadrant is generated with 2 Klingons, 1 starbase and 5 stars
- **THEN** its stored code is `215`

#### Scenario: Klingon distribution follows the tiered odds
- **WHEN** a large number of quadrants is generated with a uniform RNG
- **THEN** roughly 80% hold no Klingons, ~15% hold one, ~3% hold two and ~2% hold
  three

### Requirement: Enemy and starbase totals are derived from generation
`enemiesLeft` SHALL be the total number of Klingons actually generated, not a fixed
constant. In the original these totals accumulate from the per-quadrant rolls
(`K9`/`B9`) — they are an outcome, not a parameter. Expected value is ~17.3 with
typical spread 13–22, so each playthrough differs in size.

The original's own safeguard SHALL be preserved: if the generated Klingon total
exceeds the mission duration in stardates, the duration becomes `total + 1`
(`IFK9>T9THENT9=K9+1`). With ~17 enemies against 30 stardates this never fires; it
protects the unlucky tail.

#### Scenario: Enemy count reflects what was generated
- **WHEN** generation produces 19 Klingons across the galaxy
- **THEN** `enemiesLeft` is 19, not a fixed constant

#### Scenario: An oversized fleet extends the mission clock
- **WHEN** generation produces more Klingons than the mission's stardate duration
- **THEN** the stardate limit becomes that total plus 1

#### Scenario: Victory still requires clearing the generated fleet
- **WHEN** the player destroys or captures every generated Klingon
- **THEN** `enemiesLeft` reaches 0 and victory triggers

### Requirement: Two starbases are guaranteed, at least one of them a repair dock
Generation SHALL place 2 guaranteed starbases in randomly chosen quadrants, on top
of the 4%-per-quadrant roll, reproducing the original's total (~4.6 expected). The
original seeds this count as `B9=2` without placing those bases in any cell — this
requirement fixes that incoherence by placing every base it counts.

The **first guaranteed base SHALL be a `STARBASE_DOCK`**; the second and every
rolled base SHALL take a random type among the three. Only `STARBASE_DOCK` repairs
subsystems (`docking` capability), so a galaxy without one would make damage
permanent and the game effectively unwinnable.

#### Scenario: Every game has at least one repair-capable base
- **WHEN** any galaxy is generated
- **THEN** at least one `STARBASE_DOCK` exists somewhere in it

#### Scenario: Every counted base exists on the map
- **WHEN** `starbasesLeft` reports a number
- **THEN** exactly that many placed, non-destroyed starbase entities exist

#### Scenario: Base types vary beyond the guaranteed dock
- **WHEN** many galaxies are generated
- **THEN** the non-guaranteed bases show a mix of all three types

### Requirement: Planets carry hidden dilithium, discovered only by surveying
Roughly **50% of quadrants** SHALL contain 1 planet, independent of that quadrant's
star count — planet placement is NOT gated on stars. (A "planets only where stars
exist" rule was considered and discarded as inert: the star generator yields `1..8`
and never `0`, so every quadrant has stars and the gate would filter nothing. The
≥1-star-per-quadrant guarantee itself is kept — design.md decision 7b.)

Roughly **30% of planets** SHALL carry **1–3 dilithium charges**; the rest carry
none. Each charge is worth
`DILITHIUM_WC_BOOST` (`+30` Warp Core integrity, already fixed by `fase-4-engine`
decision #23) and one Send Party mission consumes exactly one charge — so a
3-charge planet supports three missions and is worth revisiting.

A planet's charge count SHALL be **unknown to the player until the first Send Party
mission surveys it**. This is the tactical dilemma (modelled on EGA Trek): the
player spends 3 turns and accepts hostile-sector risk without knowing whether the
planet holds anything. After surveying, the remaining count is known.

#### Scenario: Unsurveyed planet reveals nothing about its contents
- **WHEN** the player views a sector containing a never-surveyed planet
- **THEN** no charge count is shown — only that a planet is present

#### Scenario: Surveying reveals the remaining charges
- **WHEN** a Send Party mission completes against an unsurveyed planet
- **THEN** that planet's remaining charge count becomes known and stays visible

#### Scenario: A barren planet costs the mission with no yield
- **WHEN** a Send Party mission surveys a planet holding no charges
- **THEN** the 3 turns and any risk were spent, no Warp Core repair occurs, and the
  planet is known to be barren thereafter

#### Scenario: A rich planet supports repeated missions
- **WHEN** a planet with 3 charges is mined by three successive missions
- **THEN** each grants `+30` Warp Core integrity and the planet is barren afterwards

### Requirement: Planets are invisible to long-range sensors
The KBS code carries only Klingons, Bases and Stars — planets have no digit in it,
and both the Star Chart and the LRS grid read exactly that code. Planets SHALL
therefore be discoverable only by entering the quadrant and reading the SRS. This
is deliberate, reinforcing exploration and compounding the dilemma above: neither a
planet's existence nor its charges are visible from a distance.

#### Scenario: Star Chart does not reveal planets
- **WHEN** a quadrant containing a planet is explored via LRS scan or probe
- **THEN** its Star Chart entry shows only the KBS code, with no planet indication

#### Scenario: Entering the quadrant reveals the planet
- **WHEN** the ship enters a quadrant containing a planet
- **THEN** the planet appears on the SRS grid

#### Scenario: Star count carries no information about planets
- **WHEN** two quadrants have 1 and 8 stars respectively
- **THEN** neither is more likely to contain a planet — the ~50% chance is
  independent of star count

### Requirement: Sector materialization on quadrant entry
Entering a quadrant SHALL materialize that quadrant's contents into
`GameState.currentSector` as entities with stable, never-reused `id`s (`combat`
capability, "Stable entity identity"), each placed in an unoccupied cell of the 8×8
sector. Enemy entities SHALL receive `enemyPower` per the already-specified spawn
formula (`ENEMY_BASE_POWER × (0.5 + random)`).

The galaxy's KBS grid is generated eagerly once per new game; sector contents are
materialized lazily per entry — matching how the original keeps `G(8,8)` for the
whole galaxy but only builds sector entities on arrival.

This requirement is the implementation consumed by the turn engine's
`onQuadrantEnter(state, quadrant)` hook (`engine-integration`), which keeps the two
changes decoupled.

#### Scenario: Materialized contents match the quadrant's KBS code
- **WHEN** the ship enters a quadrant whose code is `215`
- **THEN** `currentSector` receives 2 enemy entities, 1 starbase and 5 stars

#### Scenario: No two entities share a cell
- **WHEN** a sector is materialized
- **THEN** every entity occupies a distinct cell within 1–8 on both axes

#### Scenario: Re-entering a quadrant preserves prior losses
- **WHEN** the player destroys an enemy, leaves the quadrant and returns
- **THEN** the destroyed enemy does not reappear

### Requirement: Deterministic generation from a persisted seed
Generation SHALL be driven by an injectable RNG and a **seed persisted in
`GameState`**, so a given seed always produces the same galaxy. Since JavaScript's
`Math.random` accepts no seed, a small self-contained PRNG SHALL be used — no new
dependency.

#### Scenario: Same seed yields the same galaxy
- **WHEN** two galaxies are generated from the same seed
- **THEN** their KBS grids, base placements/types and planet charges are identical

#### Scenario: Different seeds yield different galaxies
- **WHEN** two galaxies are generated from different seeds
- **THEN** their contents differ

#### Scenario: Seed survives persistence
- **WHEN** a game is saved and reloaded
- **THEN** the stored seed is unchanged

### Requirement: Starting position is valid and pre-explored
The ship's starting quadrant and sector SHALL be chosen so the starting cell is
unoccupied — the current fixed 4,4 / 4,4 was safe only while the world was empty.
The starting quadrant SHALL be marked explored on the Star Chart, since the ship
plainly knows where it is.

#### Scenario: Ship never starts inside another entity
- **WHEN** a new game begins
- **THEN** the ship's starting sector cell holds no star, planet, base or enemy

#### Scenario: Starting quadrant begins explored
- **WHEN** a new game begins
- **THEN** the starting quadrant is already marked explored with its KBS code
