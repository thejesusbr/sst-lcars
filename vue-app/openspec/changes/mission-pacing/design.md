## Context

Itens 13.1 e 13.3 da 3ª rodada foram escritos como queixas separadas — "está
curto" e "a equipe repara muito pouco antes de fatigar" — e a simulação mostrou
que são a mesma coisa. Três constantes mudam; a justificativa é medida, não
sentida.

## Goals / Non-Goals

**Goals:**
- Reparo pesado deixar de consumir a maior parte da missão.
- Fadiga continuar sendo decisão tática, não só atrito.
- Registrar a medição pra que a 4ª rodada tenha baseline.

**Non-Goals:**
- Dano do jogador / poder do inimigo. Segue sendo Non-Goal explícito desde a
  `game-feel-and-pacing` (task 6.1). Com a encenação em vigor e o ritmo
  mensurável, isto vira medível de verdade — mas depois desta rodada, não junto.
- Turnos fracionários. Avaliados e recusados; a recusa virou requisito em
  `turn-engine` pra não voltar sem dado novo.
- Reparo assistido de doca (tier 5) e a dívida do item 9.3 (equipes `working`
  tratadas como idle enquanto atracadas) — continuam abertas, fora daqui.

## Decisions

**Meia-vida 6, não 5 nem 8.** Medido, restaurando 6 subsistemas de 20%:

```
meia-vida    3 (hoje)    5       6      8
turnos          19       12      11     9
```

8 não compra muito além de 6 (9 vs 11) e custa a mecânica: com meia-vida 8 dá
pra parquear equipe e esquecer, e a alocação deixa de ser decisão. 5 deixa 12
turnos, ainda perto de um terço da missão. 6 é onde o ganho por ponto de
suavização começa a achatar.

**Duas alavancas, não uma.** Só a curva deixaria a missão em 30 stardates com 11
turnos de reparo — 37%, melhor que 63% mas ainda dominante. Só o relógio deixaria
a equipe inerte no 8º turno, dando mais espaço pra sofrer o mesmo defeito. Juntas
levam reparo pesado a ~27% da missão.

**O que NÃO muda, e por quê.** Piso de eficiência (20) e recuperação idle (+8)
foram simulados como alavancas e são inertes:

```
batalha grande, 1 equipe/sistema, piso 20
meia-vida    rec +8   rec +12   rec +16
    3          13       13        13
    6           7        7         7
```

A recuperação idle não move nada porque equipe reparando está `working` — nunca
entra no ramo de recuperação. O piso deixa de importar acima de meia-vida 5,
quando a curva já não chega lá num reparo realista. Mexer neles seria mudar
número sem mudar jogo, e atrapalharia atribuir causa na 4ª rodada.

**Concentrar bate espalhar.** Achado da simulação, não mudança: 2 equipes no
mesmo sistema resolvem a mesma batalha em 10 turnos onde 1-por-sistema leva 13,
porque `STACKING_MULTIPLIERS` começa `[1, 1, ...]` — a segunda equipe entra com
valor cheio. É estratégia dominante e invisível. Decisão: **fica invisível por
ora**, e o Briefing menciona o princípio quando for reescrito (pendência futura,
junto do manual do jogador).

## Risks / Trade-offs

[40 stardates + fadiga suave afrouxam demais e a partida vira passeio] → é o
risco real desta change. Mitigação: são 3 constantes num arquivo folha, todas
reversíveis, e a 4ª rodada tem item de playthrough pra isso. O piso de 20 e o
teto de stacking continuam limitando o quanto reparo escala.

[Testes cravam 30 stardates ou 3 sondas] → esperado; fazem parte do diff. Teste
que quebra por constante mudada é teste fazendo o trabalho dele.

[Três mudanças de balanço na mesma rodada que `enemy-species` mexe em poder de
inimigo] → `enemy-species` mantém deliberadamente a faixa do `KLINGON_CRUISER`
(35% dos inimigos) exatamente onde estava, pra que o encontro típico não se mova
junto.
