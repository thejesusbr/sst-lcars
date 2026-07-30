## MODIFIED Requirements

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
`E=E-N-10`; this version has no energy stock at all) — its cost is instead paid in
Warp Core stress: warp factor 4 and below is "safe cruising speed" and adds no
stress. For any travel turn where `warpFactor > 4`, the engine SHALL add a
transient "warp stress" amount to the effective overload used for that turn's Warp
Core damage/explosion rolls (see `turn-engine` capability's Warp Core
overload/breach rolls), on top of `manualOverload`, reverting once the trip
completes.

**Those turns advance automatically and the ship is unreachable during them** (see
`warp-travel-mode` capability): engaging clears `currentSector`, no turn-consuming
action is accepted until arrival, and the destination quadrant is materialised on
the final turn. The turn count therefore stops being something the player clicks
through and becomes the trip's actual length — which the presentation duration is
derived from.

#### Scenario: Distance and factor determine the trip length
- **WHEN** the player engages warp toward a destination 6 quadrants away at
  warp factor 3
- **THEN** the trip resolves over `ceil(6 / 3) = 2` turns

#### Scenario: Cruising at or below warp 4 adds no stress
- **WHEN** a travel turn resolves at `warpFactor <= 4`
- **THEN** no warp stress is added to that turn's Warp Core rolls

#### Scenario: The trip runs itself
- **WHEN** a multi-turn warp trip is engaged
- **THEN** its remaining turns resolve without player input, and the ship is out
  of reach of enemies for the whole trip
