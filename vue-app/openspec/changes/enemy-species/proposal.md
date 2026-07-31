## Why

`ENEMY_TYPES` declara 5 tipos de inimigo. `materializeSector` cria todos como
`KLINGON_CRUISER`, cravado. Os outros quatro nunca nasceram, em partida nenhuma.

Isso não viola spec — `world-generation` nunca disse nada sobre tipo de inimigo,
só sobre quantidade. É lacuna, e ela deixou mecânica inteira inerte: as falas de
recusa de rendição por espécie (`ROMULAN_REFUSALS` em `hailRefusals.ts`,
entregues pela `hail-and-identity`) são código morto, porque nenhum Romulano
existe pra recusar. O jogador reportou na 3ª rodada: "não encontrei nenhum
Romulano vagando por aí".

Com os tipos nascendo de verdade, duas coisas que hoje não teriam como se
manifestar passam a fazer sentido: rendição diferenciada por espécie (o teto
único de 75% deixou "muitos inimigos danificados se renderem" — Klingon não
morre pedindo clemência) e cor de facção nas animações de combate.

## What Changes

- **Os 5 tipos passam a nascer**, por sorteio ponderado, e cada um com sua faixa
  de poder: o tipo passa a significar ameaça, não só arte.
- **Teto de rendição por espécie**, substituindo o `HAIL_SURRENDER_CHANCE_MAX`
  único. Klingon quase nunca se rende; Romulano é pragmático mas orgulhoso;
  raider é escória pirata e se entrega fácil.
- **Cor de facção nas animações de combate**: azul pro jogador, vermelho
  Klingon, verde Romulano, roxo raider — lidas de variáveis de tema, não de hex
  cravado.
- O dígito K do código KBS continua contando **hostis**, sem distinguir espécie —
  o código é de 1978 e tem 3 dígitos.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `world-generation`: materialização passa a sortear o tipo do inimigo e a
  derivar a faixa de poder do tipo
- `combat`: a chance de rendição passa a depender da espécie do alvo, não só do
  dano
- `turn-presentation`: o overlay de combate passa a ser colorido por facção

## Impact

`src/engine/worldGen.ts`, `src/engine/constants.ts`, `src/engine/combat.ts`,
`src/composables/useCombatOverlay.ts`,
`src/components/elements/LcarsScanner.vue`, e as variáveis de tema em
`src/assets/css/`.
