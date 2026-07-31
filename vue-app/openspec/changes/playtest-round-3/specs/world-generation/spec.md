## ADDED Requirements

### Requirement: Displayed KBS reflects the living quadrant, not the generated one
Every path that produces a KBS code for the player SHALL derive the Klingon digit
from the quadrant's **living** enemy count (`klingons - clearedEnemies`), the same
figure `materializeSector` already uses to decide how many enemies to place.

Four call sites built the code from the raw generated `klingons` — the current
quadrant's SRS readout, `scanLongRange`, the probe report and the Star Chart
entry — while only materialization subtracted the kills. The result was a digit
that never moved: clearing a sector left the code claiming the enemies were
still there, and the SRS, which scans continuously, contradicted what the player
had just done on screen.

The derivation SHALL live in one place that all producers call, rather than
being repeated per call site. The bug's shape *was* the duplication: one of five
copies knew about `clearedEnemies` and four did not.

#### Scenario: Clearing a sector lowers the current quadrant's code
- **WHEN** the player destroys the last enemy in the quadrant they occupy
- **THEN** the KBS code shown for that quadrant drops its Klingon digit to `0`
  without any rescan

#### Scenario: Every producer agrees
- **WHEN** the same partially-cleared quadrant is read through the SRS readout,
  an LRS scan, a probe report and the Star Chart
- **THEN** all four report the same Klingon digit

### Requirement: The player's own actions update the player's own chart
Destroying an enemy SHALL update that quadrant's stored chart entry
(`exploredQuadrants`) to the new living code, at full confidence.

Confidence decay models information *ageing* — a reading grows stale because the
galaxy moved on while you were elsewhere. It does not model forgetting what you
personally did. Without this, flying out of a quadrant you just cleared would
make the Star Chart revert to the pre-combat code, and the player would have to
rescan to learn something they already knew first-hand.

#### Scenario: Leaving a cleared quadrant keeps the knowledge
- **WHEN** the player clears a quadrant and then warps away
- **THEN** the Star Chart entry for it shows the cleared code at full confidence,
  with no rescan

#### Scenario: Knowledge of other quadrants still ages
- **WHEN** the player clears one quadrant while holding older scan data about
  others
- **THEN** only the cleared quadrant's entry refreshes; the rest keep decaying
  normally
