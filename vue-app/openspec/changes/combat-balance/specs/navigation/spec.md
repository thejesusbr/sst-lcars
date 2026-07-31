## MODIFIED Requirements

### Requirement: Boost duration and cooldown in turns, gated by actual movement
`impulseBoost` SHALL be measured in turns, not real-world seconds. The boost
duration SHALL only elapse on turns where the player actually moves the ship under
impulse — toggling boost on by itself, without moving, SHALL NOT consume any of its
duration. Its maximum duration SHALL be shorter than a full warp trip (intra-sector
use only). Cooldown length SHALL scale with the distance actually traveled while
boosted.

**Boost SHALL be an emergency escape, not a second maximum on the dial.** Measured
against the impulse traversal table, it duplicated the dial exactly:

```
 dial%   células/turno   turnos p/ cruzar o setor
   20          2                 4
   45          4                 2      ← daqui a 90%, sempre 2
   95          8                 1
  100          8                 1
```

The dial has 100 positions and 4 useful outcomes, and boost's 8 cells is what 95%
already gives. It carried duration, cooldown and its own state to add nothing.

Engaging boost SHALL therefore, on each turn it is active and moving:

- cover the full 8 cells, regardless of the dial, and
- grant **maximum evasion** for that turn (`combat` capability, "A moving target is
  harder to hit"), above what the dial alone would give.

With distance attenuating damage, breaking away is now a real answer instead of
giving up — and the long cooldown is what stops it from being the answer to
everything.

#### Scenario: Boost does not tick down while idle
- **WHEN** the player enables boost but does not engage any impulse movement that
  turn
- **THEN** no boost duration is consumed

#### Scenario: Boost outruns the dial defensively, not just in distance
- **WHEN** the ship moves 8 cells under boost versus 8 cells at dial 100%
- **THEN** the boosted turn evades incoming fire more often

#### Scenario: Escaping is worth the cooldown
- **WHEN** the player boosts away from a sector under fire
- **THEN** the distance opened reduces incoming damage on the following turns, and
  boost is unavailable until its cooldown elapses
