## ADDED Requirements

### Requirement: Undocking puts the ship back in the sector
Undocking SHALL place the ship on a free cell adjacent to the base, and SHALL
remain a free action (no turn cost).

`undock()` cleared two flags and moved nothing. The requirement that the ship ends
up beside the base was written into the playthrough script and never implemented,
so the ship undocked into whatever cell it already occupied.

Placement SHALL handle the base sitting against any sector edge — the 4th
playthrough round hit exactly this ("e quando a base está na borda esquerda do
mapa?"). A fixed compass direction cannot work at an edge; any free adjacent cell
SHALL do, and if every adjacent cell is occupied the nearest free cell SHALL be
used.

#### Scenario: The ship ends up beside the base
- **WHEN** the player undocks
- **THEN** the ship occupies a free cell adjacent to the base, and no turn is
  consumed

#### Scenario: A base against the sector edge still works
- **WHEN** the docked base sits on the sector boundary, so some neighbouring cells
  are off-grid
- **THEN** the ship is placed on a valid in-sector cell, never off-grid

#### Scenario: A crowded neighbourhood still resolves
- **WHEN** every cell adjacent to the base is occupied
- **THEN** the ship is placed on the nearest free cell instead of overlapping

### Requirement: Docking costs a turn, undocking does not
Docking SHALL consume one turn. Undocking SHALL NOT.

Manoeuvring alongside a station and making fast is work; casting off is not. The
asymmetry also stops dock/undock from being a free action pair that could be
cycled at no cost.

This is distinct from the multi-turn repair loop that follows a `STARBASE_DOCK`
docking, which continues to advance the stardate by its own tick count.

#### Scenario: Docking advances the clock
- **WHEN** the player docks
- **THEN** the stardate advances by one turn, before any repair loop runs

#### Scenario: Undocking is free
- **WHEN** the player undocks
- **THEN** the stardate does not advance

### Requirement: A docked ship cannot manoeuvre
Every movement action SHALL be rejected while docked, with the reason recorded in
the log. The player SHALL undock first.

Nothing prevented engaging impulse or warp straight out of a docking clamp.

#### Scenario: Movement is refused while docked
- **WHEN** the player engages impulse or warp while docked
- **THEN** the action is rejected, no turn is consumed, and the log explains that
  the ship must undock first

### Requirement: Shields stay down until the player raises them
Undocking SHALL NOT restore `shieldEnergy` automatically. It was set to 0 on
docking ("Docking lowers shields and zeroes overload") and SHALL stay there until
the player raises it.

Leaving harbour with shields down is a real mistake the player should be able to
make — and raising shields is already a free action, so the cost of remembering is
one click, while an automatic restore would quietly spend throughput the player
did not ask for.

#### Scenario: The ship leaves harbour unshielded
- **WHEN** the player undocks after a docking that lowered shields
- **THEN** `shieldEnergy` is still 0
