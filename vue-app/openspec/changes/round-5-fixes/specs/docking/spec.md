## ADDED Requirements

### Requirement: A docked ship is inside the base, not parked beside it
While `docked` is true, the sector scanner SHALL NOT draw the player's ship
marker. It reappears at the undock position when the player casts off.

The ship icon sitting frozen beside the base read as "parked outside", which
made the undock repositioning meaningless — the 5th round put it directly: "ela
estará dentro da base". Hiding the marker is what makes dock/undock legible as
entering and leaving.

#### Scenario: Docking removes the marker
- **WHEN** the player docks
- **THEN** the ship marker is absent from the SRS and Weapons scanners

#### Scenario: Undocking restores it beside the base
- **WHEN** the player undocks
- **THEN** the marker reappears at the position the undock placed the ship
