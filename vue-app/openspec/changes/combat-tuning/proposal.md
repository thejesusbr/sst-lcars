## Why

A 5ª rodada validou o combate tático ("agora o combate está tático de verdade",
item 23.18) e encontrou os três defeitos que sobraram — todos com causa medida:

- **O inimigo se neutraliza sozinho.** Cada ataque dele executa a fórmula de
  1978 `enemyPower = floor(power / 3.5)`: 300 → 85 → 24 → 6 → 1 → 0 em cinco
  ataques. Vira zumbi — não ataca, não morre por conta própria. Explica o
  mostrador confuso do item 23.3 (poder caindo com escudo intacto: o dreno passa
  por fora do `applyHostileDamage`), os Klingons inertes do 9.4 (já estavam
  zerados quando a nave atracou) e metade do "batalhas fáceis". A fórmula era
  coerente no design de stat único sem escudo e sem atenuação; com a
  `combat-balance`, virou auto-sabotagem.
- **Fugir não funciona.** O inimigo reposiciona pra célula **aleatória** do
  setor: o jogador correu 7 células a 100% de impulso e o inimigo reapareceu à
  queima-roupa no mesmo turno. Com atenuação por distância, uma nave de phasers
  superaquecidos precisa que distância aberta seja distância mantida.
- **Regen de escudo com o modelo invertido** (23.13/23.14): recuperava mais
  rápido com escudo **erguido**, quando emissores ligados deveriam consumir a
  energia que a recuperação usaria.
- **Termodinâmica de mentira** (23.17): aquecimento linear na potência, quando
  efeito Joule (`Q = I²Rt`) é quadrático.

## What Changes

- **Auto-dreno removido; o inimigo ganha energia própria.** `enemyPower` passa a
  cair **só** por dano do jogador. Entra `enemyEnergy`, consumível (diferente do
  jogador, que é vazão): atacar custa, repõe nos turnos sem atacar, e sem
  energia o inimigo **não ataca**.
- **Movimento inimigo vira intenção, reagindo no turno seguinte:** com energia
  pra atacar, aproxima-se do jogador; sem energia, evade pra recarregar. Passos
  limitados por turno — nada de teleporte. Fugir passa a abrir distância de
  verdade. (Comportamentos finos ficam pra change futura de IA, já no backlog.)
- **Regen de escudo invertida:** taxa cheia com escudo baixado (emissores
  desligados, energia toda na recuperação), fração com escudo no teto. Degradação
  por dano em Shield Control e paralisia em crítico continuam.
- **Efeito Joule:** aquecimento ∝ (potência/1500)², ancorado em 30 na potência
  padrão. A 3000 esquenta 4×, não 2×.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `combat`: modelo de energia do inimigo, aquecimento quadrático
- `turn-engine`: movimento inimigo deliberado substitui o reposicionamento
  aleatório
- `shields`: curva de regeneração invertida

## Impact

`src/engine/turnEngine.ts` (dreno, movimento, regen), `src/engine/combat.ts`,
`src/engine/constants.ts`, `src/engine/worldGen.ts` (energia na
materialização), `src/types/game.ts` (`enemyEnergy`), e o `WeaponsConsole`
(mostrador do alvo).
