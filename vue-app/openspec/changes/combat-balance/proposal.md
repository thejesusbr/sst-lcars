## Why

A 4ª rodada mediu o combate e ele não é um combate: **uma batalha 1v1 se
resolve no primeiro tiro**.

```
phaser 1500 (padrão) contra 1 inimigo, subsistema intacto
  dano 1200–1800   vs   HP do inimigo 100–300
  overkill de 4× a 18×
```

E o jogador leu a causa na própria animação: "notei que os inimigos não
parecem estar com escudos ativos". Não estão — `enemyPower` é a **única**
estatística que um inimigo tem. O feixe acerta e o alvo evapora, sem etapa
intermediária.

Do outro lado o problema é simétrico e pior: `shieldDamageTaken` do jogador só
**acumula**, e nenhuma linha do projeto o reduz — nem atracar. A integridade do
escudo cai monotonicamente até o fim da partida. Não é regeneração faltando, é
dano permanente por construção.

Junto disso, três coisas que o setor 8×8 deveria significar e não significa:
distância não afeta nada, estrela no caminho não bloqueia nada, e estar em
movimento não torna a nave mais difícil de acertar. O tabuleiro é cenário.

E a termodinâmica: o aquecimento do phaser é `30 × (1 + dano)` — a potência
disparada não entra na conta. Disparar a 100 esquenta igual a disparar a 3000.

## What Changes

- **Inimigo ganha escudo**, pool separado que absorve antes do `enemyPower`,
  com faixa por tipo — a etapa intermediária que faltava.
- **Dano de phaser atenua com a distância**, simetricamente: vale pro inimigo
  também. Aproximar-se passa a ser decisão, com o preço de ficar no alcance
  bom do outro.
- **Dano deixa de ser ~igual à potência comprometida** e vira fração dela,
  calibrada pra matar em 2–3 tiros à queima-roupa, não em 1.
- **Linha de tiro importa.** Phaser viaja reto e é bloqueado por estrela ou
  planeta no caminho. Torpedo é guiado e passa — mas corrigir trajetória no
  meio da batalha é difícil, então ganha chance de errar.
- **Alvo em movimento esquiva**, simetricamente, com a chance escalando pela
  velocidade: quantas células a nave cobriu naquele turno.
- **Boost vira fuga de emergência**: 8 células e esquiva máxima, com cooldown
  longo. Deixa de duplicar o dial em 95% e passa a ser o "correr" que o jogo
  não tem.
- **Escudo do jogador regenera** por turno, proporcional à energia alocada,
  degradado pelo dano em Shield Control e **paralisado em crítico**. Atracar
  recupera tudo.
- **Aquecimento do phaser escala com a potência disparada.**

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `combat`: escudo inimigo, atenuação por distância, linha de tiro, esquiva de
  alvo em movimento, aquecimento proporcional à potência
- `shields`: regeneração do escudo do jogador, atrelada à energia alocada e ao
  dano em Shield Control
- `navigation`: boost passa a ser fuga de emergência, e a velocidade de impulso
  passa a alimentar a esquiva

## Impact

`src/engine/combat.ts`, `src/engine/constants.ts`, `src/engine/sector.ts`
(linha de tiro), `src/engine/navigation.ts`, `src/engine/turnEngine.ts`,
`src/types/game.ts` (`enemyShield`), `src/engine/worldGen.ts` (escudo na
materialização), e os consoles que mostram escudo inimigo.
