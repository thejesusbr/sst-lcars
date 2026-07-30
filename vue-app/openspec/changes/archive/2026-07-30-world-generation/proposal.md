## Why

**O mundo do jogo não existe.** `GameState.currentSector` e `GameState.starbases`
inicializam como arrays vazios e **nada nunca os popula**. `enemiesLeft` começa em
12 mas o setor fica vazio pra sempre: sem inimigos, sem bases, sem planetas, sem
estrelas.

Achado numa revisão completa pós-implementação da `fase-4-engine` (2026-07-29).
O mais notável é que **isto nunca foi planejado**: zero menção a geração/spawn/
povoamento em `tasks.md` ou em qualquer uma das 10 specs daquela mudança. Depois
de 37 decisões de design, uma revisão painel-por-painel de 8 tópicos e 4 passadas
de balanceamento, ninguém perguntou *quem cria as entidades*.

As specs existentes definem a **potência** de spawn de um inimigo
(`enemyPower = 200 × (0.5 + random)`, faixa 100–300) e o **código KBS** que o
Star Chart/LRS exibem — mas nunca *onde*, *quando* ou *com que distribuição* algo
nasce. O original de 1978 resolve isso em ~20 linhas
(`sst_original.bas` linhas 820–870, `G(I,J)=K3*100+B3*10+FNR(1)`): sorteia
Klingons/bases/estrelas por quadrante com odds fixas e codifica tudo no valor KBS.

Sem esta mudança, `engine-integration` não tem como ser verificada de ponta a
ponta — não existe nada pra atacar, atracar ou explorar.

## What Changes

- **Geração de galáxia 8×8**: para cada um dos 64 quadrantes, sorteia contagem de
  Klingons, bases e estrelas, e deriva o código KBS que o Star Chart e o LRS já
  consomem. Deve reusar as odds do fonte de 1978 como ponto de partida (mesma
  metodologia das decisões #22/#23 da `fase-4-engine`: extrair do original em vez
  de inventar, e tratar o número como estimativa pra playtesting).
- **Coerência com as constantes já fixadas**: o total de Klingons gerados precisa
  fechar com `ENEMIES_INITIAL = 12` e o de bases com `STARBASES_INITIAL = 5`
  (este último já foi corrigido de 14 pra 5 justamente checando as odds do
  original, decisão #22 — agora a geração precisa honrar isso de fato).
- **Povoamento de setor ao entrar num quadrante**: materializa as entidades do
  quadrante corrente em `currentSector` com `id` estável (invariante da
  capability `combat`, "Stable entity identity"), posições em células
  desocupadas, e `enemyPower` sorteado pela fórmula já especificada.
- **Entidades faltando no `SectorEntityType`**: `STAR` e `PLANET` já existem no
  tipo mas nunca são criadas; `KLINGON_BASE` idem. A geração precisa cobrir os
  tipos que as specs de navegação/docking/Send Party assumem existir (obstáculo
  pra rota, planeta adjacente pra Send Party, base pra docking).
- **Posição inicial da nave** coerente com o mundo gerado (hoje é fixa em
  quadrante 4,4 / setor 4,4 — precisa ser um ponto válido e não ocupado).
- **Fluxo de New Game**: `createInitialGameState()` hoje devolve um mundo vazio.
  Precisa gerar o mundo, e o "New Game" do `ResultScreen` precisa gerar um mundo
  **novo** (não reaproveitar o anterior).
- **Determinismo/semente**: geração deve aceitar RNG injetável, como todo o resto
  do engine, pra teste determinístico e pra permitir uma partida reproduzível por
  semente.

## Capabilities

### New Capabilities

- `world-generation`: geração da galáxia (odds por quadrante, código KBS,
  contagens totais coerentes com as constantes), povoamento de setor com `id`
  estável, posição inicial válida, e semente/RNG injetável.

### Modified Capabilities

- `game-state-store`: "New Game resets to initial constants" hoje descreve um
  estado inicial de mundo vazio — passa a incluir geração de mundo, e um New Game
  precisa produzir uma galáxia nova.

## Impact

- **Novo:** `vue-app/src/engine/worldGen.ts` (TS puro, RNG injetável, folha —
  importa só de `types/game.ts` e `constants.ts`, mesmo invariante de dependência
  da decisão #36 da `fase-4-engine`) + testes.
- **Modificado:** `vue-app/src/engine/constants.ts` (`createInitialGameState`
  passa a povoar o mundo, ou a delegar pra `worldGen`), possivelmente
  `vue-app/src/types/game.ts` se faltar campo pra semente.
- **Relação com `engine-integration`:** independente pra implementar, mas
  **pré-requisito da verificação de ponta a ponta** daquela mudança. As duas
  podem ser desenvolvidas em paralelo; o playthrough só é possível com as duas.
- **Questão aberta:** movimento entre quadrantes precisa repovoar `currentSector`
  a cada entrada em quadrante novo. Isso é geração (esta mudança) sendo chamada
  pelo movimento (`engine-integration`) — a fronteira exata entre as duas merece
  ser fechada antes de implementar, pra não virar dependência circular.
