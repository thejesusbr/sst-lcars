## Why

Item 13.1 da 3ª rodada: "está curto — depois de uma batalha difícil, a espera
para recuperar dano sempre levou a derrota por tempo". Item 13.3, escrito
separado: "o consumo de fadiga está alto, a equipe repara muito pouco antes de
fatigar".

São o mesmo problema. Simulação sobre o engine confirma:

```
BATALHA SEVERA (6 subsistemas a 20%, 6 equipes, 1 por sistema)
  hoje  → 19 turnos de reparo = 63% de uma missão de 30 stardates
```

A curva `100 × 0.5^(turnsWorked/3)` tem meia-vida de 3 turnos: a equipe entrega
29 dos primeiros 60 pontos em 4 turnos e depois vira quase inerte, presa no piso
de 20% rendendo 3 pontos por turno. Reparar não é escolha tática se a única
resposta possível é esperar mais.

A pergunta original — "algumas ações podiam custar fração de turno?" — foi
medida e descartada: fração barateia combate, não barateia espera. O que a
espera cobra é a curva.

## What Changes

- **Meia-vida de fadiga 3 → 6.** Batalha severa cai de 19 para 11 turnos de
  reparo; batalha grande, de 13 para 7. A equipe continua degradando de verdade
  (89% no 1º turno trabalhado, 50% no 6º, 25% no 12º) — em o dobro da escala de
  tempo.
- **`MISSION_DURATION` 30 → 40.** Com o reparo mais barato, 40 stardates dão
  espaço pra duas campanhas de combate e recuperação sem o relógio decidir a
  partida sozinho.
- **`remainingProbes` 3 → 4** (item 13.5: "quase bom, vamos aumentar para 4").
- **Piso de eficiência e recuperação idle ficam como estão.** Medidos, não são
  alavanca: subir a recuperação de +8 para +16 não moveu um único turno em
  nenhum cenário simulado, porque as equipes ficam `working` e nunca chegam a
  recuperar.
- Registro de que **turnos fracionários foram avaliados e recusados**, com a
  medição, pra ninguém reabrir a questão sem dado novo.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `damage-control`: a curva de fadiga passa a ter meia-vida de 6 turnos
- `turn-engine`: a missão passa a durar 40 stardates, e o turno continua sendo a
  unidade indivisível de tempo
- `navigation`: 4 sondas por partida

## Impact

`src/engine/constants.ts` (três constantes), `src/engine/damageControl.ts`
(fórmula da curva), e os testes que cravam `MISSION_DURATION`, a contagem de
sondas ou valores de eficiência.
