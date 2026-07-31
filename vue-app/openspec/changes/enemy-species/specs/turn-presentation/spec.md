## ADDED Requirements

### Requirement: Combat overlays are coloured by faction
Every overlay drawn for an attack SHALL take its colour from the faction of
whoever fired it: the player's own shots in blue, Klingon in red, Romulan in
green, `CLOAKED_RAIDER` in purple.

With one colour for everything, a sector holding three attackers produced three
identical beams and the player could not tell who had fired — the exact gap the
staged presentation exists to close. Faction colour is what makes the animation
readable when more than one thing is shooting.

Colours SHALL come from theme variables, not from hex literals in TypeScript, so
that the seven themes keep control of the palette the way they do for every other
colour in the interface.

#### Scenario: An exchange is legible by colour alone
- **WHEN** the player fires and two enemies of different factions return fire
- **THEN** each beam carries its own faction colour

#### Scenario: The palette follows the theme
- **WHEN** the player switches themes
- **THEN** the faction colours resolve through that theme's variables

#### Scenario: Every enemy type has a colour
- **WHEN** any member of `ENEMY_TYPES` attacks
- **THEN** a faction colour exists for it, with no fallback to a generic colour
