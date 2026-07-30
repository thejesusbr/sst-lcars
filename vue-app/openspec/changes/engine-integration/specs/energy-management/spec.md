## MODIFIED Requirements

### Requirement: Automatic overload from over-consumption
When total routed energy exceeds what the Warp Core can currently generate, the
engine SHALL compute
`autoOverload = clamp(ceil((consumo - output) / OVERLOAD_PER_EXCESS), 1, 20)`;
otherwise `autoOverload = 0`.

Two corrections to the earlier formula
(`max(1, round((consumo - output) / output * 100))`):

1. **The scale is the absolute excess, not a percentage of output.** The
   percentage form is hyperbolic — a damaged core's shrinking output shrinks the
   denominator, so the ratio explodes — and it indexed a Fibonacci damage table.
   Two stacked exponentials made 7 points of Warp Core integrity span the entire
   table. See `game-state-store` capability, "Automatic overload scales linearly
   with absolute excess".
2. **`output` is the core's EFFECTIVE output, not the nominal constant.**
   `warpCoreOutput(integrity) = WARP_CORE_OUTPUT × (1 - d)`: a damaged core
   generates less, so unchanged consumption can begin to exceed it. That is the
   intended spiral, and it is what gives the subsystem toggles their purpose.

`autoOverload` feeds the effective overload used for Warp Core damage/explosion
rolls together with `manualOverload` and any warp-travel stress — see
`turn-engine` capability's "Warp Core overload and breach rolls" for the unified,
clamped formula (design.md decision #29).

#### Scenario: Over-consumption triggers at least 1 point of overload
- **WHEN** total routed energy exceeds the core's effective output by any amount
- **THEN** `autoOverload` is at least 1 and scales with the size of the excess

#### Scenario: Same excess yields the same overload regardless of output
- **WHEN** the excess is 500 energy units, once against a healthy core and once
  against a heavily damaged one
- **THEN** `autoOverload` is the same in both cases — the percentage form gave 11
  and 111 respectively, which is what produced the cliff

#### Scenario: A damaged core overloads on unchanged consumption
- **WHEN** Warp Core integrity falls while the ship's consumption stays constant
- **THEN** the effective output falls with it and `autoOverload` can rise from 0
  without the player changing anything

### Requirement: Shared energy pool
The ship's energy figures SHALL live in `GameState` as single values read by
`EngineeringConsole`, `HelmConsole` (Impulse), `WeaponsConsole` (Phaser),
`ShieldConsole` (level) and `SituationPanel` (read-only "Energy Level" widget) —
never a separately-seeded local copy in any of them.

**The shared figure is no longer `mainEnergy`.** That field is removed; energy is
throughput. What the consoles share is the derived pair: the core's effective
output (`warpCoreOutput(warpCore integrity)`) and `subsystemDraw`, whose
difference is the **budget** the `SituationPanel` displays.

#### Scenario: Shield level change reflects in Engineering immediately
- **WHEN** `ShieldConsole` changes the held shield level
- **THEN** `EngineeringConsole`'s Core Output/Subsystem Load display and the
  `SituationPanel` budget update in the same tick, without a reload or console
  switch

#### Scenario: No console keeps its own energy number
- **WHEN** any console displays an energy figure
- **THEN** it derives it from the store, never from a local `ref` seeded by a prop

