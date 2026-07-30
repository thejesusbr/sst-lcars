# ship-identity

## Purpose

The player's ship icon, ship name and captain name — chosen in the Captain's
Lounge, persisted with the save, and reflected wherever the game addresses the
player or draws their ship on the scanner.

## Requirements

### Requirement: The ship and captain have names the player chooses
`GameState` SHALL carry the ship's name, the ship's icon, and the captain's name.
They SHALL persist with the rest of the save.

The 7 ship options already exist in `useScannerIcons.ts` as `playerShipOptions`,
each with a label, alongside a comment reading "for future ship-selection
screen". They have never been used — the scanner draws a fixed `playerShip`.

#### Scenario: A new game starts with a default identity
- **WHEN** a new game begins without the player choosing anything
- **THEN** the ship and captain carry sensible defaults, and the game is playable

#### Scenario: Identity survives a reload
- **WHEN** the player names the ship and reloads the page
- **THEN** the chosen name, icon and captain come back

### Requirement: Identity is chosen in the Captain's Lounge
The Captain's Lounge SHALL offer selection of ship icon, ship name and captain
name. It is already the configuration screen (themes, colour catalogue), so
identity belongs there rather than in a new screen.

#### Scenario: Picking a ship updates the selection
- **WHEN** the player picks one of the available ships in the Captain's Lounge
- **THEN** that becomes the ship's icon and its label the suggested name

#### Scenario: Names are editable
- **WHEN** the player types a ship name or captain name
- **THEN** it is stored, replacing whatever the default or the ship's label was

### Requirement: The chosen identity is what the game displays
The selected ship icon SHALL be what the sector scanner draws for the player's
ship, replacing the fixed icon. The ship and captain names SHALL appear where the
game addresses the player — the Briefing and the Result screen.

An identity that only exists in the settings screen is not identity.

#### Scenario: The scanner draws the chosen ship
- **WHEN** the player selects a different ship and returns to the sector scanner
- **THEN** the player's marker uses the chosen icon

#### Scenario: The briefing addresses the captain by name
- **WHEN** the Briefing screen is shown
- **THEN** it uses the captain's name and the ship's name

#### Scenario: The result screen credits the same ship
- **WHEN** the game ends by any terminal condition
- **THEN** the Result screen names the same ship and captain the game was played
  with
