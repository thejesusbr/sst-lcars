## ADDED Requirements

### Requirement: Survey reads a planet from orbit, for one turn
The player SHALL be able to survey a planet in the current sector, consuming one
turn, learning **whether** it holds dilithium. The survey SHALL NOT reveal how
many charges, and SHALL NOT consume one.

Sending a landing party blind costs 3 turns, immobilises a Damage Control team
for all of them, and risks losing that team entirely in a hostile sector — for a
planet that is barren 70% of the time. The frustration is intended (the hidden
content is a `world-generation` decision), but with no way at all to reduce the
uncertainty the player is not making a decision, only rolling dice.

Quantity stays hidden because that is what the landing party is for. Survey
answers "is it worth going", not "how much will I get".

#### Scenario: Survey reveals presence
- **WHEN** the player surveys a planet holding 2 dilithium charges
- **THEN** the report says the planet holds dilithium, without naming a number,
  and the planet still holds 2 charges

#### Scenario: Survey reveals absence
- **WHEN** the player surveys a barren planet
- **THEN** the report says so, and one turn has passed

#### Scenario: Survey needs a planet in the sector
- **WHEN** the player attempts a survey with no planet in the current sector
- **THEN** the action is rejected and no turn is consumed

### Requirement: A survey is only as good as the sensor taking it
Survey reliability SHALL follow the shared subsystem damage bands for the SRS
(`combat` capability, "Subsystem damage fraction is the shared basis for degraded
effectiveness"):

| SRS band | Survey |
|---|---|
| leve (`d ≤ 0.30`) | correct |
| moderado (`d > 0.30`) | may report the wrong answer |
| crítico (`d > 0.60`) | unavailable |

Without this, Survey would strictly dominate: measured against blind dispatch it
costs 1 turn to avoid 3 turns and — the real cost — the team immobilised for all
of them. No turn price fixes that, because the turns are not what makes the blind
trip expensive. Tying the reading to the instrument taking it is what turns
Survey into a decision: an intact SRS makes it a formality, a damaged one makes
it a gamble about a gamble, and it gives sensor repair a consequence outside of
combat.

A wrong reading SHALL be indistinguishable from a right one at the moment it is
given. A survey flagged as unreliable would carry no risk.

The corruption SHALL be in the **report**, never in the stored state — the
planet's real charges are untouched, so an accurate survey after repairing the
SRS reads correctly.

#### Scenario: An intact sensor tells the truth
- **WHEN** the SRS is undamaged and the player surveys a planet
- **THEN** the report matches the planet's real content

#### Scenario: A damaged sensor can lie
- **WHEN** the SRS is in the moderado band and many surveys are taken
- **THEN** some report the wrong answer, with nothing marking which

#### Scenario: A critical sensor cannot survey
- **WHEN** the SRS is in the crítico band
- **THEN** the survey action is unavailable

#### Scenario: Repairing the sensor restores the truth
- **WHEN** a planet surveyed through a damaged SRS is surveyed again after repair
- **THEN** the new report matches the planet's real content

### Requirement: Sensor findings and command decisions log separately
Log entries SHALL be categorised by who they are addressed to: readings go to
`science`, decisions go to `captain`.

| Event | Category |
|---|---|
| LRS scan result | `science` |
| Survey report | `science` |
| Landing party's dilithium finding | `science` |
| Probe's arrival report | `science` |
| Hail and its answer | `captain` |
| Landing party dispatch and recall | `captain` |
| Probe launch | `captain` |

The split follows the action/finding line consistently: launching the probe is a
command decision, what it reports back is a sensor reading — the same division
already applied to the landing party.

#### Scenario: A probe's launch and its report split
- **WHEN** the player launches a probe and it later reports on a quadrant
- **THEN** the launch is recorded under `captain` and the report under `science`

#### Scenario: Hail stays with the captain
- **WHEN** a hail is answered, refused, or accepted as a surrender
- **THEN** the entry is recorded under `captain`
