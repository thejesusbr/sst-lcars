## 1. Folha compartilhada (sequencial — bloqueia a Fase 2)

- [x] 1.1 Criar `engine/sector.ts` como **segunda folha** (importa só de
      `types/game.ts`, nunca de outro `engine/*.ts`): entidades visíveis/não
      cloacadas, classificação de tipo (inimigo/base/obstáculo/planeta), células
      ocupadas, adjacência. Mover `getVisibleEnemies` pra cá tirando de
      `combat.ts` (design.md decisão 2)
- [x] 1.2 Remover o import `damageControl.ts → combat.ts`, apontando pra
      `sector.ts` — restaura o invariante de dependência da decisão #36 da
      `fase-4-engine`. Verificar o grafo inteiro depois: nenhum módulo importa
      irmão, exceto `turnEngine.ts`/`endGame.ts` que compõem

      **Achado:** o grafo tinha **2** violações, não 1. Além de
      `damageControl → combat`, `saveIntegrity.ts` importava `newGame.ts` pra
      derivar a lista de campos hasheados e os defaults de migração — e chamava
      `createNewGameState(0)` no topo do módulo, gerando uma galáxia inteira só
      pra listar chaves. Consertado invertendo a dependência: `computeChecksum`
      deriva os campos do próprio estado recebido e `migrateSave`/
      `verifySaveIntegrity` recebem `defaults` **injetado** pela store. Efeito
      colateral bem-vindo: campo estranho enfiado no save agora entra no digest.

      Também removida `resolveEnemyCounterAttacks` de `combat.ts`: código morto
      (zero chamadores) e **segunda implementação** de ataque inimigo, com
      fórmula divergente da que a spec manda e o `turnEngine` usa. Duas fórmulas
      pro mesmo evento é a classe de armadilha que esta mudança existe pra matar.

      Consolidadas 3 cópias de adjacência (privada em `docking.ts`, inline em
      `damageControl.ts`, `chebyshev` em `navigation.ts`) em `sector.isAdjacent`.
      `newGame.ts` entra na lista de compositores (criado pela
      `world-generation`, posterior à redação da decisão #36).
- [x] 1.3 Migrar `redAlert: boolean` → `alertLevel: 'green' | 'yellow' | 'red'` em
      `types/game.ts` + `createInitialGameState()` (`constants.ts`). Fazer ANTES da
      Fase 4 — depois de 7 consoles passarem a ler o campo, migrar custa 7 vezes
      mais (design.md decisão 7). Visual segue binário: `red` mantém a classe
      `.red-alert` no body, `yellow` é estado válido sem tema próprio (estender os
      7 temas é escopo de outra mudança)
- [x] 1.4 Congelar a superfície de ações da store (`useGameState`): revisar contra
      `specs/game-state-store/spec.md` e acrescentar o que falta (ações de
      movimento, Send Party, ajustes livres, `setAlertLevel`). **Portão sequencial**
      — abre a Fase 4 em paralelo (design.md decisão 4)

      Acrescentado: atalhos de ação por turno (`firePhasers`, `fireTorpedoes`,
      `loadTube`/`unloadTube`, `hail`, `acquireLock`, `launchProbe`,
      `moveImpulse`, `moveWarp`, `sendPartyTo`), livres (`dock`/`undock`,
      `dispatchTeam`/`recallTeam`, `cycleTubeTarget`, `toggleTubeAutoLoad`,
      `scanLongRange`, `setAlertLevel`/`toggleRedAlert`, `markLogRead`,
      `setMode`) e getters derivados (`subsystemLoad`, `energyProduced`,
      `energyAvailable`, `unreadByCategory`, `quadrantConfidence`, `canDockNow`).

      **Achado:** o `recordTurn` não existia — os 4 caminhos de turno resolviam
      o turno e **descartavam `res.events`**, então o combat log ficaria sempre
      vazio com o engine produzindo eventos. Centralizado num lugar só.

      **Ação nova necessária:** `lock_weapons` não existia em
      `PlayerActionType`. `acquireWeaponsLock` estava implementada em
      `combat.ts` e órfã, e a spec exige que "Lock" custe 1 turno — sem a ação,
      o botão não tinha o que chamar.

## 2. Ticks por turno (paralelizável por módulo — arquivos disjuntos)

Cada task acrescenta a função de tick no **próprio módulo**, sem tocar no
`turnEngine`. A ordem de invocação é da Fase 3.

- [x] 2.1 `engine/navigation.ts` — função de tick: progressão de viagem de warp
      (com chegada ao destino), progressão/resolução de sonda, duração de boost
      (só em turno de movimento real) e cooldown de boost, envelhecimento de scan
      LRS e de entradas do Star Chart
- [x] 2.2 `engine/navigation.ts` — lançamento de sonda de verdade: decrementa
      `remainingProbes`, duração `distância + 1` (Chebyshev), rejeita sem sonda
      disponível; resolução roda o risco hostil `40% + 5%`/inimigo extra e, se
      sobreviver, grava o quadrante em `exploredQuadrants`
- [x] 2.3 `engine/damageControl.ts` — função de tick: aplica `repairPerTurn` por
      subsistema atribuído (só equipes com `turnsWorked >= 1`), fadiga de quem
      trabalha, recuperação de quem está idle, libera `cooldown` ao cruzar 50%,
      aplica trava de guarda da cela, incrementa `turnsWorked` no fim
- [x] 2.4 `engine/damageControl.ts` — tick de breach: containment por equipe
      atribuída (tier 5), penalidade de 0.5 no reparo externo, decremento de
      `turnsRemaining`, sinaliza morte por radiação ao zerar sem conter; tick da
      missão de landing party (3 turnos, boost de WC, risco hostil, devolve a
      equipe ao pool)
- [x] 2.5 `engine/combat.ts` — expõe tick de fim de turno: resfriamento passivo de
      phaser (`-30 × (1-d)`, só em turno sem disparo) e roll de perda de Weapons
      Lock por dano no SRS (`(100-srsIntegrity) × 0.5%`); tick de cooldown de
      cloak dos `Cloaked Raider`
- [x] 2.6 Testes unitários de cada tick acima (funções puras, RNG injetável)

## 3. Integração no turnEngine (sequencial — depende das Fases 1 e 2)

- [x] 3.1 `engine/turnEngine.ts` — ancorar os ticks nas 5 etapas conforme
      `specs/turn-engine/spec.md`: etapa 2 recebe estresse de warp real (substitui
      o `warpStress: 0` hardcoded) + tick de containment do breach; etapa 3 recebe
      estresse/cooldown de cloak; etapa 5 recebe reparo de CdD, ticks de
      navegação, resfriamento de phaser e roll de perda de lock
- [x] 3.2 `engine/turnEngine.ts` — ramos de ação que hoje não existem:
      `move_impulse` e `move_warp` (deslocamento real via `navigation`, com
      reposicionamento de inimigo ANTES do deslocamento) e `send_party`.
      Garantir que nenhuma ação declarada em `PlayerActionType` consuma turno sem
      efeito — ou produz efeito, ou é rejeitada com motivo
- [x] 3.3 `engine/turnEngine.ts` — hook `onQuadrantEnter(state, quadrant)` opcional
      com default no-op, invocado 1× quando o movimento troca de quadrante. É o
      seam pro `world-generation` povoar `currentSector` sem import cruzado
      (design.md decisão 3)
- [x] 3.4 `engine/integration.test.ts` — testes que dirigem o `turnEngine` e
      afirmam efeito **cross-module**. Critério de aceite: **um módulo órfão tem
      que fazer teste falhar**. Cobrir no mínimo: despacho não repara no turno do
      despacho mas repara no seguinte; warp 6 gera overload efetivo 4; sonda a
      distância 3 resolve em 4 turnos e decrementa estoque; breach sem equipe mata
      em 5 turnos; Life Support crítico 5 turnos → asfixia; confiança de LRS decai
      com piso em 30%

## 4. Consoles → store (paralelizável: 1 agente por arquivo, depois do portão 1.3)

- [x] 4.1 `ShieldConsole.vue` — remove locais/props `initial*`, lê `useGameState`;
      `EnterpriseShieldSvg` lê integridade real das 8 entradas (chave `damage` →
      Auto-Navigation Computer); transfer/raise/lower são livres (não chamam
      `turnEngine`)
- [x] 4.2 `WeaponsConsole.vue` — remove `phaserTemp`/`phaserPower`/`torpedoStock`/
      `enemyTargets` locais; "Lock" vira ação real (1 turno); "Fire Phasers"
      desabilita sem `weaponsLocked` e em crítico; tubos usam `targetId`;
      load/unload passam a custar 1 turno; toggle de Photon Tubes
- [x] 4.3 `EngineeringConsole.vue` — remove `subsystems`/`teams`/`manualOverload`/
      `subsystemDraw` locais; `subsystemDraw` vira `computed` real dos 9;
      lista ganha "Auto-Navigation Computer"; remove "SIMULATE DAMAGE"/"REPAIR ALL"
      de debug; dispatch/recall livres
- [x] 4.4 `NavSensingConsole.vue` — remove `playerQuadrant` local e o `setTimeout`
      da sonda e o "Advance Turn" de debug; liga Dock/Undock, Hail, Send Party de
      verdade; toggles de SRS/LRS com som `POWER_UP`/`POWER_DOWN`; projeta
      `currentSector` (por `id`) pro formato do `LcarsScanner`
- [x] 4.5 `StarChartConsole.vue` — remove `playerQuadrant` duplicado; cor por
      célula derivada do código KBS (reusa a função do NavSensing); exibe
      confiança/opacidade por quadrante; liga "Snd to Helm"
- [x] 4.6 `SituationPanel.vue` — alerta bidirecional real via `alertLevel` (toggle
      alterna `red`/`green`, texto mostra o nível); `energyLevel` lê
      `mainEnergy`; indicador de prisioneiros `count/capacity`; controles "End Turn"
      e "Skip N Turns"; abas do Combat Log piscando por categoria não lida
- [x] 4.7 `CombatLog.vue` — remove o auto-scroll pro fim; handler de scroll que
      avança o marcador de leitura da categoria ativa só ao atingir o fim
- [x] 4.8 `GameScreen.vue` — modo `briefing`/`playing`/`result` dirigido por
      `useGameState`/`endGame`, não `v-if` estático
- [x] 4.9 Ajustar as stories do Storybook dos consoles acima (props `initial*`
      removidas — **BREAKING**, já sinalizado na proposta da `fase-4-engine`)

## 5. Verificação

- [x] 5.1 `npx vue-tsc --noEmit` e `npx eslint` limpos no código novo/tocado
      (os 10 erros pré-existentes em `src/stories/**` são de outra origem)
- [x] 5.2 `npx vitest run --project unit` verde, incluindo os testes de integração
      da 3.4
- [x] 5.3 Verificar o grafo de import do engine: nenhum módulo importa irmão
      (exceto `turnEngine`/`endGame`) — o mesmo check que pegou a violação da
      decisão #36

      Virou **teste** (`engine/architecture.test.ts`), não conferência manual: o
      grafo já quebrou 2× passando por revisão e por 123 testes verdes. Regra
      que só vive em prosa não segura nada. Classifica folha / compositor /
      capability e falha em import de irmão fora da lista fechada.
- [x] 5.4 Confirmar que o estado sobrevive a reload de página (persistência real)

      `pinia-plugin-persistedstate` já grava sob `sst-lcars-game-state` e
      `alertLevel` sobrevive (teste de store). O selo de integridade ganhou o
      primeiro teste que exercita o caminho de adulteração de verdade — antes
      `verifySaveIntegrity` só era testado no caminho felizes. **Reload real no
      browser não foi executado** (fica junto do playthrough da 5.5).
- [ ] 5.5 Roteiro escrito em **`PLAYTHROUGH.md`** (13 seções, ~90 itens).
      Execução em curso pelo usuário. Achados da 1ª rodada, todos corrigidos:
      Energy Level lia `mainEnergy` (estoque que o consumo nunca desconta) em vez
      do orçamento; `subsystemDraw` era chamado sem o parâmetro de ações, então
      Impulso e Phaser contribuíam sempre zero e `autoOverload` era inalcançável;
      `phaserPower` tinha duas escalas (energia no engine, porcentagem no clamp da
      store) e truncava 1500→100 no primeiro toque no dial.
      **Bloqueio real:** semântica de `mainEnergy` é ambígua na spec
      (`energy-management` diz "nominal output" no Requirement e "depletable
      reserve" no Scenario) — `out_of_energy` é praticamente inalcançável até
      isso ser decidido. Ver PLAYTHROUGH.md item 1.
- [ ] 5.5b **Depende de `world-generation`:** playthrough manual cobrindo cada
      condição terminal (vitória, energia, stardate, explosão de WC, radiação,
      asfixia, base docada destruída). Sem galáxia povoada não há o que atacar nem
      onde atracar — deixar explicitamente pendente até aquela mudança fechar
