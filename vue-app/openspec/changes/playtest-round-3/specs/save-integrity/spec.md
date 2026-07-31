## ADDED Requirements

### Requirement: Verification runs on load, before the player can act
Some point in application startup SHALL invoke the integrity verification on the
persisted payload and apply its result to the loaded `GameState`, before the
player takes a first action.

Every other requirement in this capability describes what verification *does*
once it runs. None of them says anyone runs it, and nobody did:
`checkSaveIntegrity` was written, unit-tested and never called from a single
line of application code. `pinia-plugin-persistedstate` restores state straight
from `localStorage` without passing through it, so a tampered save loaded
exactly like an honest one. This is the same failure shape the project keeps
hitting — correct function, absent caller — and it made the entire capability
inert from the day it shipped.

Verification SHALL survive its own asynchrony: `crypto.subtle.digest` returns a
promise, so startup MUST NOT let a turn resolve (and rewrite the checksum) before
the comparison against the loaded payload completes, or an honest baseline would
overwrite the evidence.

#### Scenario: A tampered save is detected on the next load
- **WHEN** the persisted `GameState` is edited outside the app, the stored
  checksum is left untouched, and the page is reloaded
- **THEN** the mismatch is detected during startup and the hidden infestation
  flag is set

#### Scenario: An honest save loads clean
- **WHEN** a save written by the game itself is reloaded with no external edits
- **THEN** the checksums match and the hidden flag stays `false`

#### Scenario: No turn resolves before the comparison finishes
- **WHEN** startup verification is still in flight
- **THEN** no turn resolution writes a new checksum over the stored one

### Requirement: A large infestation is audible
Once the number of **rendered** tribble icons exceeds `10`, the infestation
SHALL be accompanied by its sound (`tos_many_tribble.mp3`), joining the existing
sound catalogue.

The threshold is deliberately past the seed: population starts at `2` and
doubles, so the sound arrives on the 4th turn of an active infestation (2, 4,
8, 16). The player gets three quiet turns of "why are there tribbles" before the
joke announces itself.

This SHALL NOT be treated as a warning. It is the same silent-punishment
contract as the rest of the capability: no UI element, tooltip, or log entry
explains the sound, and nothing connects it to the save.

#### Scenario: Sound joins the infestation past the threshold
- **WHEN** the rendered tribble count crosses 10
- **THEN** the tribble sound plays

#### Scenario: A small infestation stays silent
- **WHEN** an infestation is active but the rendered count is 10 or fewer
- **THEN** no tribble sound plays

#### Scenario: The sound explains nothing
- **WHEN** the tribble sound plays
- **THEN** no accompanying message, toast, or log entry appears
