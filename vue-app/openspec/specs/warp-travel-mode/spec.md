# warp-travel-mode

## Purpose

Governs warp as a distinct travel mode: turns advance automatically until
arrival, no player action is accepted while in transit, the ship is out of
reach of enemies, and the visual duration of each travel turn is proportional
to the trip via a lookup table indexed by warp factor.

## Requirements

### Requirement: Warp travel advances turns automatically
While a warp trip is in progress, turns SHALL advance on their own until arrival.
The player SHALL NOT need to advance them manually.

Clicking "End Turn" seven times during a warp 1 crossing is not a decision — it
is noise. The ship is at warp; there is nothing to command.

#### Scenario: A multi-turn trip completes without player input
- **WHEN** the player engages a warp trip lasting 4 turns
- **THEN** all 4 turns resolve in sequence without further input, and the ship
  arrives at its destination

#### Scenario: Arrival hands control back
- **WHEN** the final turn of a trip resolves
- **THEN** the trip ends, the destination quadrant is populated, and the player
  regains control

### Requirement: No player action is accepted while at warp
Every turn-consuming action SHALL be rejected while a warp trip is in progress —
not only navigation actions. Firing phasers, loading a tube, launching a probe,
hailing or sending a landing party from inside a warp bubble makes no sense.

Free adjustments that do not consume a turn (dials, subsystem toggles, shield
level, Damage Control dispatch) MAY remain available: the crew can still work
during transit.

#### Scenario: Turn-consuming controls are unavailable at warp
- **WHEN** a warp trip is in progress and the player attempts to fire
- **THEN** the action is rejected and no turn is consumed by it

#### Scenario: Free adjustments still work in transit
- **WHEN** a warp trip is in progress and the player dispatches a Damage Control
  team or lowers shields
- **THEN** it applies normally — those never consumed a turn

### Requirement: Engaging warp takes the ship out of reach
Engaging a warp trip SHALL clear `currentSector` immediately. No enemy SHALL
reach the ship while it is in transit.

This replaces the previous behaviour, in which the ship remained in the origin
quadrant absorbing fire for the whole trip while unable to respond — damage
without a decision, which is the opposite of what this change is for. Warp
becomes a legitimate escape from combat; the cost is already carried by Warp Core
stress and by whatever waits at the destination.

#### Scenario: Warping out of a hostile sector escapes it
- **WHEN** the player engages warp with enemies present
- **THEN** the sector empties on that turn and the ship takes no further fire
  from them during the trip

#### Scenario: The destination is populated on arrival
- **WHEN** the trip's final turn resolves
- **THEN** the arrival quadrant's sector is materialised, including whatever
  hostiles it holds

### Requirement: Animation duration is proportional to the trip
The visual duration of each travel turn SHALL come from a lookup table indexed by
warp factor, replacing the fixed 5-second floor introduced by
`engine-integration`. The table SHALL decrease with warp factor:

```
warp    1     2     3     4     5     6     7     8
ms/t  4300  4100  3900  3700  3600  3400  3200  3000
```

Total trip duration is `turns × table[factor]`, where `turns` is
`ceil(distance / factor)`. Crossing the full galactic diagonal (distance 7) takes
about **30 s** at warp 1 and **3 s** at warp 8.

The table SHALL NOT be inversely proportional to the warp factor. Turn count
already carries a `1/w` term; a second one compounds to `1/w²` and collapses the
scale — anchored at 4300 ms for warp 1, warp 8 would animate for 0.56 s;
anchored at 5 s for warp 8, warp 1 would take 280 s.

The table SHALL be non-increasing. A rising table was the only way to hit an
initial 30 s / 5 s pair of anchors exactly, but it made total duration
non-monotonic: warps 4, 5 and 6 all cost 2 turns across the diagonal, so a rising
per-turn value made the trip *longer* as speed increased.

#### Scenario: A slow crossing feels long
- **WHEN** the player crosses the galaxy diagonally at warp 1
- **THEN** the trip is presented over roughly 30 seconds, conveying the distance

#### Scenario: A fast crossing feels short
- **WHEN** the same crossing is made at warp 8
- **THEN** it is presented in roughly 3 seconds

#### Scenario: Raising the warp factor never lengthens the trip
- **WHEN** the same destination is compared across every warp factor
- **THEN** total presented duration never increases as the factor rises

#### Scenario: Warp factor is legible from the animation alone
- **WHEN** trips at warp 1 and warp 8 are observed
- **THEN** they are visibly different in pace — the previous fixed floor made
  them identical

#### Scenario: No duration clamp is applied
- **WHEN** any trip is presented at any warp factor
- **THEN** the per-turn duration is exactly the table value, with no floor or
  ceiling applied — every entry already sits between 3000 and 4300 ms, so a
  clamp would be unreachable code
