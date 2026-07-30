## Why

A mudança `fase-4-engine` entregou o **núcleo do engine** (TS puro, 86 testes
unitários passando, typecheck limpo): `constants.ts`, `navigation.ts`,
`warpCore.ts`, `combat.ts`, `damageControl.ts`, `docking.ts`,
`saveIntegrity.ts`, `tribbleInfestation.ts`, mais uma primeira passada de
integração (`turnEngine.ts`, `endGame.ts`, `stores/useGameState.ts`).

Uma **revisão completa pós-implementação (2026-07-29)** mostrou que o núcleo é
sólido mas a camada de integração é oca. Os testes unitários passam porque cada
módulo foi testado contra si mesmo; nada exercita a composição. Achados
verificados, não presumidos:

```
        ┌──────────────── UI (7 consoles) ────────────────┐
        │  0 chamadas a dispatchPlayerAction/endTurn/...   │
        └────────────────────┬────────────────────────────┘
                             ✗  DESCONECTADO
        ┌────────────────────┴────────────────────────────┐
        │  useGameState (store) — ações existem, sem uso   │
        └────────────────────┬────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────────────┐
        │  turnEngine ── combat, warpCore, endGame, docking│
        │        ✗ navigation      ✗ damageControl         │
        └─────────────────────────────────────────────────┘
                    747 linhas testadas, ÓRFÃS
```

1. **`navigation.ts` (445 linhas) e `damageControl.ts` (302 linhas) são órfãos** —
   importados por nada além dos próprios testes. Duas capabilities completas e
   inertes.
2. **Nenhum console chama ação nenhuma da store** — o engine é inalcançável pela
   UI. `dispatchPlayerAction`/`executeEndTurn`/`executeSkipTurns`/
   `executeDockingRepairTurn` têm zero chamadores.
3. **~12 comportamentos por turno ausentes no `turnEngine`** (tabela abaixo) —
   várias mecânicas explicitamente desenhadas e balanceadas na `fase-4-engine`
   estão inertes.

Consequência de escopo: as tasks 3.1–3.4 da `fase-4-engine` estavam marcadas
como concluídas, mas superdeclaravam. Esta mudança assume essa dívida, e a
`fase-4-engine` encolhe pro que está de fato pronto e verificado (engine core).

## What Changes

- **Corrige as lacunas por turno do `turnEngine.ts`:**

  | # | Lacuna | O que a spec exige |
  |---|---|---|
  | 1 | `warpStress: 0` hardcoded | `+2`/ponto acima de warp 4 (`fase-4-engine` decisões #23/#29) |
  | 2 | Sonda com `turnsRemaining: 2` hardcoded | `distância + 1` (Chebyshev) |
  | 3 | `move_impulse`/`move_warp`/`send_party` declarados em `PlayerActionType` **sem ramo de implementação** — consomem turno e não fazem nada | movimento real, com reposicionamento determinístico de inimigo (#22) |
  | 4 | Sem reparo/fadiga/recuperação de CdD por turno | capability `damage-control` inteira |
  | 5 | Sem resfriamento passivo de phaser | `-30`/turno sem atirar (#30) |
  | 6 | Sem roll de perda de Weapons Lock por dano no SRS | `(100-srsIntegrity)×0.5%`/turno (#23) |
  | 7 | Breach nunca tica containment/`turnsRemaining` | 5 turnos → morte por radiação |
  | 8 | Sem decaimento de confiança LRS/Star Chart | `5%×(1+d)`/turno, piso 30% |
  | 9 | Sem tick de duração/cooldown de boost | máx 5 turnos, cooldown `1.5×` (#23) |
  | 10 | `remainingProbes` nunca decrementa | sondas hoje são infinitas |
  | 11 | Sonda resolve sem revelar dado e sem roll de destruição | `40% + 5%`/inimigo extra |
  | 12 | Sem tick de cooldown de cloak | 8 turnos (#17) |

  Ironia registrada: `effectiveOverload()` está **correto** (soma
  `manual + auto + warpStress`, clampa 0–20 — decisão #29 satisfeita no nível da
  função), mas é alimentado com `warpStress: 0`, então metade da mecânica que a
  decisão #29 existiu pra consertar segue inerte.

- **Liga os dois módulos órfãos** ao `turnEngine`: progressão de viagem de warp,
  sonda, boost, decaimento de sensores (`navigation`); reparo, fadiga, stacking,
  cooldown, guarda de prisioneiro, breach, Send Party (`damage-control`).
- **Corrige violação arquitetural**: `damageControl.ts` importa
  `getVisibleEnemies` de `combat.ts`, quebrando o invariante da decisão #36
  (irmãos da Fase B não se importam). Acoplamento pequeno — mover o helper pra
  uma folha resolve.
- **Liga os 7 consoles de gameplay à store** (tasks 4.2–4.9 herdadas da
  `fase-4-engine`): Shield, Weapons, Engineering, NavSensing, StarChart,
  SituationPanel, GameScreen. `HelmConsole` já foi ligado (4.1).
- **Verificação de ponta a ponta** (Fase 5 herdada): typecheck/lint limpos,
  playthrough manual cobrindo cada condição terminal, persistência sobrevive a
  reload, selo de integridade dispara Tribbles.

## Capabilities

### Modified Capabilities

- `turn-engine`: a ordem fixa de resolução já está implementada, mas o passo de
  atualização por turno está incompleto — precisa cobrir reparo de CdD,
  progressão de navegação/sonda/boost, decaimento de sensores, ticks de breach e
  cloak, e estresse de warp real.
- `navigation`: implementada e testada, mas nunca invocada — precisa entrar na
  resolução de turno e ganhar ações de movimento de verdade.
- `damage-control`: mesma situação — implementada, testada, nunca invocada.
- `game-state-store`: ações existem, precisam de chamadores reais nos consoles.

*(Nenhuma capability nova: esta mudança é integração e correção do que a
`fase-4-engine` já especificou.)*

## Impact

- **Modificado:** `vue-app/src/engine/turnEngine.ts` (foco principal),
  `vue-app/src/engine/damageControl.ts` (remover import de `combat`),
  `vue-app/src/engine/constants.ts` (receber o helper movido),
  `vue-app/src/stores/useGameState.ts` (ações de movimento), e os 7 consoles de
  gameplay + `GameScreen.vue`.
- **Depende de:** `world-generation` pra verificação de ponta a ponta — sem
  galáxia povoada, `currentSector`/`starbases` ficam vazios e nenhum playthrough
  é possível. A correção do `turnEngine` em si não bloqueia.
- **Não afetado:** os módulos da Fase B já verificados (`warpCore`, `combat`,
  `docking`, `saveIntegrity`, `tribbleInfestation`), SDK de elementos LCARS,
  sistema de temas.
- **Risco herdado:** o `turnEngine` é o ponto sequencial único que a
  `fase-4-engine` já sinalizava como possível gargalo — a revisão confirmou o
  risco se materializando. Testes de integração (não só unitários por módulo)
  são o que faltou; esta mudança deve fechar essa lacuna, senão o mesmo tipo de
  buraco reaparece.
