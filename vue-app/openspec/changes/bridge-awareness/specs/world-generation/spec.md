## MODIFIED Requirements

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

A planet's contents SHALL be revealed in two stages:

- **Presence** — whether the planet holds dilithium at all — is learnable from
  orbit by the Survey action (`navigation` capability, "Survey reads a planet
  from orbit, for one turn"), for one turn and subject to SRS health.
- **Quantity** — the remaining charge count — SHALL remain unknown until a Send
  Party mission surveys the planet.

This is the tactical dilemma (modelled on EGA Trek), now with a rung the player
can pay for. The blind version stays available and stays the only way to learn
the count; what Survey buys is the answer to "is this worth three turns and a
team", not "how much will I get".

#### Scenario: Unsurveyed planet reveals nothing about its contents
- **WHEN** the player views a sector containing a never-surveyed planet
- **THEN** no charge count is shown — only that a planet is present

#### Scenario: Survey reveals presence but never the count
- **WHEN** the player surveys a planet holding 2 charges from orbit
- **THEN** the report states that dilithium is present, and the count stays
  unknown

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

#### Scenario: Orbital survey never consumes a charge
- **WHEN** a planet with 2 charges is surveyed from orbit
- **THEN** it still holds 2 charges afterwards
