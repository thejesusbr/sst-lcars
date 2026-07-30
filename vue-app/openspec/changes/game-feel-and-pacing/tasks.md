## 1. Evento tipado (sequencial — bloqueia todo o resto)

- [ ] 1.1 `types/game.ts` — tipo `TurnEvent`: etapa de origem (1-5), tipo de
      efeito, `entityId` opcional (por `id` estável, nunca índice), payload
      numérico quando houver (dano, absorção, reparo) e a categoria de log.
      Categoria vem do TIPO, não do texto (design.md decisão 1)
- [ ] 1.2 `engine/turnEngine.ts` — `TurnResult.events` passa de `string[]` a
      `TurnEvent[]`. Cada `events.push` das 5 etapas carimba a própria etapa.
      **BREAKING** pros chamadores
- [ ] 1.3 Propagar nos módulos que hoje devolvem `events: string[]`:
      `navigation.resolveNavigationTurn`, `combat.resolveCombatTurn`,
      `navigation.resolveProbeScan`
- [ ] 1.4 `stores/useGameState.ts` — `recordTurn` lê `evt.category` e **remove
      `categoryOf`**, a classificação por substring que só existia porque o
      evento não tinha tipo. Confirmar que nenhum regex sobrou
- [ ] 1.5 Ajustar os testes que afirmam sobre `events`. Os de integração afirmam
      sobre efeito no estado e não devem precisar de mudança — se precisarem,
      é sinal de que estavam acoplados a texto

## 2. Modo de viagem de warp (depende da Fase 1)

- [ ] 2.1 `engine/constants.ts` — LUT `WARP_ANIMATION_MS` decrescente
      `[4300, 4100, 3900, 3700, 3600, 3400, 3200, 3000]`, com o comentário
      explicando por que NÃO é inversamente proporcional (turnos já carregam
      `1/w`; compor daria `1/w²`). **Sem piso nem teto** — toda entrada já cai
      entre 3000 e 4300 ms, então clamp seria código inalcançável
      (design.md decisão 7)
- [ ] 2.2 `engine/turnEngine.ts` — engajar warp **esvazia `currentSector`** no
      mesmo turno, depois do reposicionamento inimigo (é a última reação deles à
      partida). Chegada materializa o quadrante de destino pelo hook que já existe
- [ ] 2.3 `engine/turnEngine.ts` — rejeitar **toda** ação que consome turno
      enquanto `warpTrip` existe, com motivo. Ações livres seguem passando
- [ ] 2.4 `stores/useGameState.ts` — modo de viagem: ao engajar, avança os turnos
      restantes sozinho até a chegada, respeitando a duração da LUT entre eles
- [ ] 2.5 `components/modules/HelmConsole.vue` — LUT substitui o piso fixo de 5s
      (`WARP_MIN_VISUAL_MS`), e a duração passa a ser por turno de viagem
- [ ] 2.6 Testes: viagem multi-turno resolve sem input; ação recusada em trânsito
      não consome turno; setor esvazia ao engajar e é repovoado na chegada;
      duração total nunca sobe ao subir o fator de warp (a regressão que a
      rampa crescente teria introduzido)

## 3. Fila de apresentação (depende da Fase 1)

- [ ] 3.1 `stores/useGameState.ts` — fila dos eventos do turno + flag
      `presenting`. Um dono só do timer (design.md decisão 2), limpo ao
      desmontar/trocar de tela
- [ ] 3.2 `stores/useGameState.ts` — turno novo é recusado enquanto a fila drena;
      a fila não é sobrescrita no meio
- [ ] 3.3 Encenar SÓ combate. Reparo de CdD, regen de pool e avanço de stardate
      aplicam direto (design.md decisão 8)
- [ ] 3.4 Testes de store: fila drena na ordem; ação recusada durante drenagem;
      nenhum timer sobrevive ao fim

## 4. Encenação na UI (depende da Fase 3)

- [ ] 4.1 `LcarsScanner` — camada de **overlay transitório**, separada do
      `gridData`. A animação vive ENTRE células (linha) e ATRAVÉS delas
      (asterisco), o que o modelo por célula não expressa; e escrever quadro de
      animação no `gridData` apagaria o conteúdo real da célula na passagem
      (design.md decisão 9)
- [ ] 4.2 Animação de phaser: linha pulsante entre quem atira e o alvo. Vale
      pro jogador E pro inimigo — ver o inimigo agir é o ponto da mudança
- [ ] 4.3 Animação de torpedo: asterisco percorrendo as células até o alvo
- [ ] 4.4 Feedback de absorção de escudo / dano em casco, em sequência
- [ ] 4.5 Degradação do display por DANO no sensor (não por confiança — essa
      segue só esmaecendo). Moderado (`d > 0.30`): SRS/LRS piscam. Crítico
      (`d > 0.60`): display apaga por completo (design.md decisão 8)
- [ ] 4.5b LRS em moderado ou pior: dígitos do KBS **variam aleatoriamente** na
      exibição. Corrupção é SÓ visual — `exploredQuadrants`/`lrsScan` ficam
      intactos, reparar devolve a leitura certa. Teste: estado não muda enquanto
      o display dança
- [ ] 4.6 Todos os consoles desabilitam ação que consome turno lendo a MESMA flag
      da store (`presenting` ou viagem em curso) — nenhum decide por conta
- [ ] 4.7 Verificar que um turno tranquilo (sem inimigo) **não** tem espera:
      encenação vazia resolve na hora

## 5. Verificação

- [ ] 5.1 `npx vue-tsc --noEmit` e `npx eslint` limpos no código novo/tocado
      (os 9 erros pré-existentes em `src/stories/**` são de outra origem)
- [ ] 5.2 `npx vitest run --project unit` verde, com os testes das fases 2 e 3
- [ ] 5.3 Confirmar que o engine segue **síncrono e sem `setTimeout`**: o grep de
      `setTimeout|setInterval` em `src/engine/` tem que voltar vazio
- [ ] 5.4 Playthrough: warp 1 na diagonal leva ~30s, warp 8 leva ~3s, e a
      diferença é perceptível sem cronômetro. **Calibrar a LUT pelo feeling
      aqui** — os valores são ponto de partida, não medida final
- [ ] 5.5 Playthrough: dá pra dizer o que aconteceu no turno **sem ler o combat
      log** — é o critério que originou esta mudança
- [ ] 5.6 Fechar os itens 3.2, 5.7 e 5.8 do `PLAYTHROUGH.md` da
      `engine-integration`, que dependiam de conseguir acompanhar o turno
- [ ] 5.7 Reavaliar o item 13.1 ("30 stardates dão pra caçar ~17 inimigos?"),
      registrado como inconclusivo justamente por falta de ritmo perceptível

## 6. Desbloqueado por esta mudança (NÃO fazer aqui)

- [ ] 6.1 Medir o balanceamento de combate com o ritmo novo e só então mexer em
      constante. É Non-Goal desta mudança de propósito — medir antes seria medir
      no escuro (design.md Non-Goals)
