# turn-presentation

## Purpose

The engine resolves a turn synchronously and instantly; this capability governs
how the UI distributes that already-resolved turn over time so the player can
perceive it — typed events, a shared presentation queue, staged combat
animation, and sensor-damage display degradation.

## Requirements

### Requirement: The engine emits typed, ordered turn events
`TurnResult` SHALL carry an ordered list of **typed** events instead of plain
strings. Each event SHALL identify the resolution step it came from, the kind of
effect it represents, and the entity it concerns (by stable `id`, never by array
index).

The engine SHALL remain synchronous and free of any real-time delay. It produces
the whole list and returns; distributing those events over time is the
presentation layer's job. A `setTimeout` inside the engine would break the 185
tests that run in node without a DOM, and would put wall-clock time inside game
rules.

This also removes the substring classification the store performs today
(`categoryOf` matching `/reparo|radiação|.../` against message text) — a stopgap
that exists precisely because the event carried no type, and that breaks the
moment a message is reworded.

#### Scenario: Events know their step and subject
- **WHEN** a turn resolves in which the player fires phasers and an enemy returns fire
- **THEN** the resulting events distinguish the player's shot (step 1) from the
  enemy's response (step 3), and each names the entity it concerns by `id`

#### Scenario: Resolution stays instantaneous
- **WHEN** `resolvePlayerTurn` is called from a test
- **THEN** it returns synchronously with the full event list, consuming no
  real-world time

#### Scenario: Log category comes from the event, not from its text
- **WHEN** an event is appended to the combat log
- **THEN** its category is read from the event's own type, and rewording the
  message text SHALL NOT change which tab it lands in

### Requirement: Turn resolution is presented over time
The UI SHALL present a resolved turn as a sequence, not an instant. Combat
events — the player's attack, each enemy's response, shield absorption, hull
damage, destruction — SHALL appear in order, at a readable pace, before control
returns to the player.

The player SHALL be able to tell what happened in a turn **without reading the
combat log**. The log remains the record, not the only channel.

#### Scenario: The enemy turn is visible
- **WHEN** a turn resolves with enemies present in the sector
- **THEN** each enemy's action is presented distinctly on screen, so the player
  perceives the enemy acting rather than only reading about it afterwards

#### Scenario: Control returns only after the presentation finishes
- **WHEN** a turn's presentation is still running
- **THEN** turn-consuming controls are unavailable, and they become available
  again when it completes

### Requirement: A single presentation queue drives every console
The queue of a turn's events and the "presenting" state SHALL live in one place
(the store), not per console. Consoles observe that shared state.

A turn's events land across several consoles at once — shields absorb in
`ShieldConsole`, hull falls there too, the enemy disappears from
`NavSensingConsole` and `WeaponsConsole`, the log fills in `SituationPanel`. Per
console timers would drift out of sync with each other.

Centralising it also gives timer cleanup a single owner: the `engine-integration`
already shipped one bug of this shape (`warpVisualTimer` surviving unmount).

#### Scenario: Consoles stay in step
- **WHEN** an event affecting several consoles is presented
- **THEN** all of them reflect it at the same moment, driven by the shared queue

#### Scenario: Leaving the screen cancels cleanly
- **WHEN** the player switches console or the view unmounts mid-presentation
- **THEN** no timer survives, and the game state remains the resolved one

### Requirement: Only combat events are staged
Staging SHALL apply to what the player needs to *witness* — combat effects.
Background bookkeeping SHALL apply immediately: Damage Control repair, starbase
pool regeneration, stardate advance.

Trying to stage everything would make a quiet turn take as long as a battle, for
nothing.

#### Scenario: A quiet turn resolves without a wait
- **WHEN** a turn resolves with no enemies and no combat
- **THEN** there is no staged sequence to sit through

#### Scenario: Background effects are not withheld
- **WHEN** a turn includes both combat and Damage Control repair
- **THEN** the repair is reflected immediately while the combat is staged

### Requirement: Combat is animated in the EGA Trek vocabulary
Attacks SHALL be drawn on the sector scanner, not merely reported:

- **Phasers:** a pulsing line between the firing ship and its target.
- **Torpedoes:** an asterisk travelling the grid cells toward its target.

Both apply to the player's attacks and to enemy responses — seeing the enemy act
is the point of this change.

This SHALL be drawn on a **transient overlay layer**, separate from the scanner's
`gridData`. Animation lives *between* cells (the line) and *across* them (the
asterisk), which the current per-cell content model cannot express; and writing
animation frames into `gridData` would blank a cell's real content while the
asterisk passes over it.

#### Scenario: A phaser exchange is visible on the scanner
- **WHEN** the player fires phasers and a surviving enemy returns fire
- **THEN** a pulsing line is drawn for each attack, in sequence, so the player
  sees who shot whom

#### Scenario: A torpedo travels to its target
- **WHEN** a torpedo is fired at an enemy several cells away
- **THEN** an asterisk crosses the intervening cells before the hit resolves

#### Scenario: Cell content survives the animation
- **WHEN** the torpedo's asterisk passes over a cell holding a star or a planet
- **THEN** that cell's own content is intact once the animation finishes

### Requirement: Sensor damage degrades the display itself
A damaged SRS or LRS SHALL show it on the display, escalating by the shared
damage bands (`combat` capability, "Subsystem damage fraction is the shared basis
for degraded effectiveness"):

| Band | SRS and LRS display |
|---|---|
| leve (`d ≤ 0.30`) | normal |
| moderado (`d > 0.30`) | the display **blinks** |
| moderado onward, LRS only | additionally, the KBS code digits **vary randomly** |
| crítico (`d > 0.60`) | the display goes **fully dark** |

The jittering digits are what communicates "unreliable reading" without words —
the operator watches the number dance and knows not to trust it. Going dark at
crítico is the visual expression of what `navigation` already specifies: a
critical LRS behaves as if switched off.

**The corruption SHALL be display-only, never state.** The KBS stored in
`exploredQuadrants` and `lrsScan` stays intact, so repairing the sensor restores
the correct reading. Corrupting the state would turn temporary damage into
permanent loss of knowledge, which no requirement asks for.

This is distinct from confidence decay, which is unchanged and stays a silent,
gradual fade — that is information ageing, not equipment failing. A quadrant can
be dim (old) and steady, or bright (fresh) and jittering (broken sensor), and the
two mean different things: rescan versus repair.

#### Scenario: Moderate sensor damage blinks the display
- **WHEN** SRS or LRS integrity falls into the moderado band
- **THEN** that console's scanner display blinks

#### Scenario: Damaged LRS shows unreliable digits
- **WHEN** LRS integrity is in the moderado band or worse
- **THEN** the KBS digits shown vary randomly over time, while the stored code
  is unchanged

#### Scenario: Repair restores the true reading
- **WHEN** a damaged LRS is repaired back above the moderado threshold
- **THEN** the displayed KBS matches the stored value again, with no data lost

#### Scenario: Critical sensor damage blanks the display
- **WHEN** SRS or LRS integrity drops below 40 (`d > 0.60`)
- **THEN** that display goes fully dark

#### Scenario: Ageing and damage are told apart
- **WHEN** one quadrant holds old data from an undamaged sensor and another
  holds fresh data read through a damaged one
- **THEN** the first renders dim and steady, the second bright and unstable
