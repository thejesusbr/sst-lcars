## MODIFIED Requirements

### Requirement: Probe launch consumes stock and uses the real travel duration
Launching a probe SHALL decrement `remainingProbes` and SHALL compute duration as
`distance + 1` turns using the shared Chebyshev metric. A new game SHALL start
with **4** probes.

Three was the starting figure and the 3rd playthrough round judged it "quase
bom". A fourth probe is one more chance to trade a scarce resource for
information without making probes routine — the hostile-sector destruction roll
(40% plus 5% per extra enemy, unrefunded) is what keeps them from being free
reconnaissance, and that is unchanged.

#### Scenario: A new game starts with four probes
- **WHEN** a new game begins
- **THEN** `remainingProbes` is 4

#### Scenario: Launching decrements the probe counter
- **WHEN** the player launches a probe with 4 remaining
- **THEN** `remainingProbes` becomes 3 immediately

#### Scenario: Duration scales with distance
- **WHEN** probes are launched at Chebyshev distances 1 and 3
- **THEN** they resolve after exactly 2 and 4 turns respectively

#### Scenario: Launch is rejected with no probes left
- **WHEN** `remainingProbes` is 0 and the player attempts a launch
- **THEN** the action is rejected and no turn is consumed
