## Why

Quatro achados da 3ª rodada dizem a mesma coisa por ângulos diferentes: **o
jogo sabe mais do que mostra**.

- Item 11.5: "em uma batalha grande, não notei o dano no sistema de suporte de
  vida". O estado já carrega `lifeSupportTurnsRemaining` — uma contagem de 5
  turnos até `crew_asphyxiation`, armada automaticamente — e a UI nunca a
  mostrou. O jogador perdeu a tripulação com o relógio correndo em silêncio.
- Item 10.0: alerta vermelho não engaja sozinho ao entrar em setor hostil. A
  spec de `game-state-store` já previa isso como `MAY`, e ninguém implementou.
  O nível `yellow` existe no estado desde a `engine-integration` e nunca teve
  função nenhuma.
- Item 13.4: Send Party às cegas gasta 3 turnos e imobiliza uma equipe num
  planeta que é estéril 70% das vezes. O jogador aceita a frustração, mas quer a
  opção de gastar turno pra reduzir incerteza.
- Item 15.9: a dica de base adjacente apareceu, mas em fonte minúscula, espremida
  entre os dois scanners. Resultado de scan, hail e exploração não têm lugar —
  são exatamente o que uma estação de ciência reportaria.

## What Changes

- **Mostrador de sistema terminal** no `SituationPanel`: quando um relógio
  terminal está armado, o valor dá lugar a `T-n`. Warp Core mostra a contagem do
  breach, Life Support a da asfixia; Hull não tem relógio e continua em `%`.
- **Alert 10 nos sistemas que matam**: Warp Core e Life Support tocam a cada
  turno em crítico **sem equipe designada e trabalhando** — o alarme cala quando
  o jogador responde, então nunca vira ruído. Hull toca uma vez ao cruzar o
  limiar, porque não há equipe a designar pro casco.
- **Alerta automático com os três níveis**: `red` ao entrar em setor com hostil
  visível, `yellow` com hostil conhecido na vizinhança, e descida **sempre**
  manual — o engine nunca briga com o toggle do jogador.
- **Ação Survey**: 1 turno, revela se o planeta do setor tem dilítio (presença,
  não quantidade — quantidade ainda exige a equipe), e sua confiabilidade
  depende da saúde do SRS.
- **Categoria de log `science`** e uma **3ª coluna** no `NavSensingConsole` pra
  ela: scan, survey e o achado da equipe de exploração. `captain` fica com hail e
  com as decisões de comando (lançar/recolher equipe, lançar sonda).

## Capabilities

### New Capabilities
- `bridge-alarms`: o contrato entre estado terminal e o que a ponte mostra e toca
  — mostrador `T-n`, Alert 10 por sistema, e a regra de silenciamento

### Modified Capabilities
- `game-state-store`: alerta automático deixa de ser `MAY` e vira `SHALL`, com
  `yellow` ganhando função; `LogCategory` ganha `science`
- `navigation`: ação Survey nova, com confiabilidade atrelada ao SRS
- `world-generation`: o que Survey revela de um planeta (presença, não
  quantidade)

## Impact

`src/components/modules/SituationPanel.vue`,
`src/components/modules/NavSensingConsole.vue`, `src/composables/useSound.ts`,
`src/engine/turnEngine.ts`, `src/engine/navigation.ts`, `src/types/game.ts`
(`LogCategory`, `TURN_EVENT_CATEGORY`), `src/stores/useGameState.ts`.
