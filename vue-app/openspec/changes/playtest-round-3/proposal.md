## Why

A 3ª rodada de playthrough rodou (`engine-integration/PLAYTHROUGH.md`, seções
14 e 15 mais os retestes) e revelou quatro **integrações ocas**: função ou
constante correta, escrita, testada, e nunca chamada por ninguém. Nenhuma delas
é regressão — são mecânicas que nunca funcionaram desde que foram escritas, e
que o teste automatizado não pega porque a unidade em si passa.

Esta change fecha o registro da rodada e conserta a fiação. O que a rodada
revelou de **lacuna** (nunca especificado) e de **balanceamento** sai em
changes próprias: `enemy-species`, `mission-pacing`, `bridge-awareness`, mais
uma emenda em `game-feel-and-pacing`.

## What Changes

- **O selo de integridade passa a ser verificado.** `checkSaveIntegrity` existe
  em `useGameState.ts` e faz o certo, mas nenhuma linha do app a chama:
  `pinia-plugin-persistedstate` restaura o estado direto do `localStorage` sem
  passar por ela. Efeito: a infestação de Tribbles nunca pôde disparar, por
  procedimento nenhum (item 12.2, não verificado em 2 rodadas).
- **O código KBS passa a refletir inimigo já destruído.** Quatro call sites
  montam o código com `content.klingons` cru — SRS do quadrante atual,
  `scanLongRange`, relatório de sonda e Star Chart. Só `materializeSector`
  desconta `clearedEnemies`. Consequência: limpar um setor não muda o dígito
  em lugar nenhum (item 2.4).
- **Destruir inimigo atualiza o mapa guardado.** Sua própria ação passa a
  atualizar o código do quadrante em `exploredQuadrants` com confiança 100 —
  você estava lá, você sabe. Sem isso, sair do quadrante faria o Star Chart
  voltar ao valor pré-combate.
- **O indicador de Life Support lê o campo certo.** O mostrador acrescentado ao
  `SituationPanel` lê `gameState.lifeSupportIntegrity`, campo que não existe; a
  fonte real é `gameState.subsystems.life`.
- Registro formal dos achados da rodada em `PLAYTHROUGH.md` e preparação da 4ª
  rodada.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `save-integrity`: a verificação do selo passa a rodar de fato na
  inicialização — hoje a spec descreve o comportamento sem exigir que algum
  ponto do app o invoque
- `world-generation`: o código KBS exposto ao jogador passa a ser o **vivo**
  (`klingons - clearedEnemies`), não o gerado; e a própria ação do jogador
  atualiza o conhecimento guardado do quadrante

## Impact

`src/main.ts` ou `App.vue` (ponto de verificação do selo),
`src/stores/useGameState.ts`, `src/engine/navigation.ts`,
`src/engine/combat.ts`, `src/components/modules/NavSensingConsole.vue`,
`src/components/modules/SituationPanel.vue`, e
`openspec/changes/engine-integration/PLAYTHROUGH.md`.
