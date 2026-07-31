## MODIFIED Requirements

### Requirement: A hit is heard, not only seen
Staged combat events SHALL carry sound, alongside the overlay drawn for them —
**including the firing itself**:

| Event | Sound |
|---|---|
| player phaser fire | phaser, played when the event presents |
| player torpedo fire | torpedo, played when the event presents |
| shield absorption | `shield_sizzle.mp3` |
| hull damage | one of `tos_hullhit_1..4.mp3`, varied per hit |
| a ship destroyed | `largeexplosion4.mp3` |

Firing sounds used to play on the **button click**, on a different clock from
everything else: the queue presents each event at 650ms, so the explosion of a
killed target fired while the 3-second phaser sample was still playing, and the
beam animation ended long before its own sound. One timeline for picture and
audio — the queue — is the fix, not adjusted offsets between two timelines.

Sound cutoffs SHALL be aligned with the presented duration of their event, so
no sample outlives the animation it belongs to by more than a beat.

#### Scenario: The shot sounds when the shot is seen
- **WHEN** a player_phasers event enters presentation
- **THEN** the phaser sound starts with the beam animation, not at the moment
  the button was clicked

#### Scenario: The explosion waits its turn
- **WHEN** a shot destroys the target
- **THEN** the explosion plays when the kill is presented, after the firing
  sound's cutoff — not on top of it

#### Scenario: Absorption and penetration sound different
- **WHEN** one attack is absorbed by shields and the next reaches the hull
- **THEN** each plays its own sound, in step with its own overlay
