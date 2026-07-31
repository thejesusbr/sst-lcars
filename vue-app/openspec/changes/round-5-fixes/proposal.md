## Why

Três achados da 5ª rodada que são conserto e apresentação, sem decisão de
balanço — separados do `combat-tuning` pra poderem entrar (e serem revertidos)
de forma independente.

- **26.4, som atropelado.** O som do phaser toca no **clique** (corte em 3s),
  mas a fila apresenta cada evento em 650ms — a explosão do alvo dispara junto
  do evento do acerto, com o phaser ainda tocando. E a animação do feixe (650ms)
  é mais curta que o próprio som. O disparo e o resto da encenação vivem em
  relógios diferentes.
- **24.1, briefing cego.** Com o relógio derivado da frota (`mission-scaling`),
  cada partida tem duração própria — e o Briefing segue com texto fixo. O
  jogador só descobre o prazo real olhando o localStorage.
- **25.1, nave "estacionada" ao lado da base.** Atracada, a nave está DENTRO da
  base; o ícone dela parado do lado de fora anula a leitura do undock
  reposicionando.

## What Changes

- **Sons de disparo migram pra fila de apresentação:** phaser e torpedo tocam
  quando o evento entra em cena, não no clique — na mesma linha do tempo da
  animação e dos sons de impacto. Cortes alinhados à duração do evento.
- **Briefing informa a missão real:** frota gerada e stardates alocados.
- **Ícone da nave some do scanner enquanto atracada**, e reaparece no undock.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `turn-presentation`: sons de disparo entram no contrato da fila
- `world-generation`: o briefing expõe a alocação real da missão
- `docking`: a nave atracada não é desenhada no setor

## Impact

`src/stores/usePresentation.ts`, `src/components/modules/WeaponsConsole.vue`,
`src/composables/useSound.ts`, `src/components/modules/BriefingScreen.vue`,
`src/composables/useQuadrantCells.ts`.
