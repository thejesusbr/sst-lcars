## Why

Item 21.1 da 4ª rodada, sobre o relógio de 40 stardates que a `mission-pacing`
acabou de entregar:

> "Depende muito da sorte. Em uma rodada com 20+ inimigos, não foi suficiente."

O diagnóstico não é "faltam turnos" — é que a **frota varia e o relógio não**.
A geração produz 13–22 inimigos (±40% em torno de ~17), contra um limite fixo:

```
 frota   turnos por inimigo
   13         3.08
   17         2.35
   22         1.82        ← a mesma missão, 1.7× mais apertada
```

A dificuldade real oscila 1.7× entre partidas por sorteio, antes de o jogador
tocar em nada. Somar +10 fixo desloca a média e mantém a sorte decidindo.

A salvaguarda do fonte de 1978 (`IFK9>T9THENT9=K9+1`) existe justamente pra isto,
mas só dispara com mais inimigos que stardates — com 40, nunca.

## What Changes

- **O relógio passa a escalar com a frota gerada**: uma base fixa mais um termo
  por inimigo, substituindo o `MISSION_DURATION` constante. Variância de
  dificuldade cai de 1.7× pra 1.36×.
- A salvaguarda do original continua, agora como o piso que ela sempre foi.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `world-generation`: a duração da missão passa a ser derivada da frota gerada,
  como os totais de inimigo e base já são

## Impact

`src/engine/constants.ts`, `src/engine/worldGen.ts`, e os testes de
`mission-pacing` que cravam 40.
