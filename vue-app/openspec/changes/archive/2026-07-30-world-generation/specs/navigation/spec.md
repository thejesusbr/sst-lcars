## MODIFIED Requirements

### Requirement: Probe travel and scan duration
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
