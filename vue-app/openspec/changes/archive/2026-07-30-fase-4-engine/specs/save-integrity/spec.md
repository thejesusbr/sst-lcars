## ADDED Requirements

### Requirement: Integrity checksum, not real anti-cheat
The system SHALL compute a SHA-256 digest (via `crypto.subtle`) over the serialized
`GameState` plus a fixed constant string, storing it alongside the save. This SHALL be
documented in code comments as a client-side integrity marker only — it MUST NOT be
represented anywhere (UI, code comments, or docs) as real anti-cheat protection, since
any client-embedded key is readable by the player.

#### Scenario: Checksum recomputed on load
- **WHEN** the game loads a persisted `GameState`
- **THEN** the engine recomputes the SHA-256 digest and compares it against the
  stored one

### Requirement: Checksum stored separately from the hashed payload
The checksum SHALL be stored under its own `localStorage` key, never as a field
inside the `GameState` object that gets serialized and hashed. A checksum stored
inside its own input would make every write change the very object the previous
checksum was computed over (circular hashing).

#### Scenario: Checksum key is independent of the GameState save key
- **WHEN** the game persists a checksum
- **THEN** it is written to a `localStorage` key that is never itself included when
  `GameState` is serialized for the next hash computation

### Requirement: Schema version excluded from hash, guards against false positives
`GameState` SHALL carry a `schemaVersion` field. The checksum SHALL be computed only
over the fields defined by the current schema version, after migrating a loaded save
to that version — never by naively hashing whatever fields happen to already exist
in the loaded object. Adding or removing fields in a future schema version SHALL NOT
cause a mismatch for a save that was never tampered with.

#### Scenario: Loading an older-schema save does not falsely flag tampering
- **WHEN** a save persisted under an older `schemaVersion` is loaded after the game
  added new `GameState` fields in a later version
- **THEN** the save is migrated to the current schema before the checksum is
  recomputed/compared, and no false `tribbleInfestationActive` is triggered purely
  from the version difference

### Requirement: Checksum recomputed and written only at turn boundaries
The stored checksum SHALL be recomputed and persisted exactly once per resolved turn
(at the end of each `turnEngine` resolution, including each individual tick of a
docking repair loop) — never on every fine-grained `GameState` mutation. Since
`crypto.subtle.digest` is asynchronous, recomputing on arbitrary mutations could let
two overlapping digests resolve out of order and persist a stale checksum over a
newer one, self-triggering a false-positive tamper detection with no actual
tampering involved. Turn resolution is already sequential/atomic by construction, so
anchoring the checksum write there avoids the race entirely rather than requiring an
explicit debounce/lock.

#### Scenario: UI-only changes before a turn resolves do not trigger a checksum write
- **WHEN** the player adjusts sliders/selections in a console without yet resolving a
  turn
- **THEN** no checksum recompute or write happens until a turn actually resolves

#### Scenario: Each docking-loop tick writes its own checksum
- **WHEN** a docking repair loop runs for multiple ticks
- **THEN** the checksum is recomputed and persisted after each tick's turn
  resolution, same as any other turn — never deferred until the whole loop finishes

### Requirement: Mismatch silently sets a hidden flag
When the recomputed checksum does not match the stored one, the system SHALL set a
hidden `tribbleInfestationActive` flag in `GameState`. This flag SHALL NOT be surfaced
in any UI element, tooltip, or combat log message.

#### Scenario: Tampering detected without any warning shown
- **WHEN** the persisted `GameState` was edited outside the app (e.g. via DevTools)
  and the checksum fails to match on load
- **THEN** `tribbleInfestationActive` becomes `true` and no visible warning, toast, or
  log entry is produced

### Requirement: Tribble population doubles every turn, rendering caps at 200
While `tribbleInfestationActive` is `true`, the underlying tribble population count
SHALL double each turn resolution, starting from a small seed count, uncapped as a
number. The number of rendered floating icons above `GameHud` (using the existing
`tribble-1.png`/`tribble-2.png` assets) SHALL be capped at `200` regardless of how
large the true population grows (design.md decision #23 — estimated starting value
for playtesting, protects DOM/render performance; the joke is the exponential
population, not literally rendering thousands of DOM nodes).

#### Scenario: Population grows exponentially
- **WHEN** `tribbleInfestationActive` is `true` and 3 turns resolve consecutively
- **THEN** the underlying population count after 3 turns is 8× the seed count
  (doubling each turn)

#### Scenario: Rendered icons never exceed the performance cap
- **WHEN** the underlying population count exceeds 200
- **THEN** exactly 200 floating icons are rendered, not one per actual unit of
  population

### Requirement: No exposed cure
The system SHALL NOT provide any documented or UI-visible way to clear
`tribbleInfestationActive` from within the game.

#### Scenario: Untampered saves never show tribbles
- **WHEN** the checksum matches on every load throughout a playthrough
- **THEN** `tribbleInfestationActive` stays `false` and no tribble icon ever renders
