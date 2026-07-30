## 1. Tipos e semente (sequencial — bloqueia o resto)

- [x] 1.1 `types/game.ts` — acrescentar `seed: number` no `GameState` (semente
      persistida, permite partida reproduzível, design.md decisão 4);
      `SectorEntity` ganha `dilithiumCharges?: number` e `surveyed?: boolean` pros
      planetas (cargas escondidas até a primeira missão, decisão 7); tipo
      `QuadrantContent` pro grid da galáxia (código KBS + conteúdo gerado)
- [x] 1.2 `types/game.ts` — campo pro grid 8×8 da galáxia no `GameState` (os 64
      códigos KBS gerados de uma vez, lidos por Star Chart e LRS). Distinto de
      `exploredQuadrants`, que é o que o jogador **já descobriu**

## 2. Gerador (paralelizável em 2 frentes — arquivos disjuntos)

- [x] 2.1 `engine/prng.ts` — PRNG com semente, autocontido (mulberry32 ou xorshift,
      ~5 linhas), sem dependência nova. `Math.random` não aceita seed, e mockar
      global no teste não permitiria partida reproduzível (design.md decisão 4)
- [x] 2.2 `engine/worldGen.ts` — **folha** (importa só de `types/game.ts` +
      `constants.ts`/`sector.ts`, nunca de outro módulo do engine, invariante da
      decisão #36 da `fase-4-engine`): geração da galáxia 8×8 com as odds
      verbatim do original (`>0.98`→3, `>0.95`→2, `>0.80`→1 Klingon; `>0.96`→1 base;
      estrelas `1-8` sempre ≥1), código KBS `K×100 + B×10 + S`
- [x] 2.3 `engine/worldGen.ts` — totais **derivados**: `enemiesLeft` = Klingons
      efetivamente gerados (~17.3 esperado, spread 13–22), `starbasesLeft` = bases
      posicionadas; salvaguarda do original mantida (`se total > duração, duração =
      total + 1`) (design.md decisão 1)
- [x] 2.4 `engine/worldGen.ts` — 2 bases garantidas e **posicionadas** (corrige a
      incoerência do `B9=2` da fonte, que contava sem posicionar), a 1ª sempre
      `STARBASE_DOCK`; 2ª e as do sorteio de 4% com tipo aleatório entre os 3.
      Garante ≥1 base de reparo por partida (decisões 2 e 6)
- [x] 2.5 `engine/worldGen.ts` — planetas: ~50% dos quadrantes com 1 planeta
      **independente da contagem de estrelas** (a regra "só onde há estrela" foi
      descartada como inócua — todo quadrante tem ≥1 estrela, decisão 7b), ~30%
      deles com `1-3` cargas de dilítium, cargas **escondidas** até serem
      pesquisadas (`surveyed`). Planeta NÃO entra no código KBS — invisível pra
      LRS/Star Chart por decisão explícita (decisões 7 e 8)
- [x] 2.6 `engine/worldGen.ts` — materialização de setor ao entrar num quadrante:
      entidades com `id` estável nunca reaproveitado, cada uma em célula
      desocupada, inimigos com `enemyPower = ENEMY_BASE_POWER × (0.5 + random)`.
      Assinatura compatível com o hook `onQuadrantEnter(state, quadrant)` que
      `engine-integration` define (design.md decisão 3)
- [x] 2.7 `engine/worldGen.ts` — posição inicial: quadrante/setor sorteados com
      célula garantidamente desocupada, quadrante inicial já marcado explorado
      (decisão 5)
- [x] 2.8 Testes unitários: mesma semente → galáxia idêntica; sementes diferentes →
      galáxias diferentes; todo quadrante com ≥1 estrela; KBS `215` materializa 2
      inimigos + 1 base + 5 estrelas; sempre ≥1 `STARBASE_DOCK`; nenhuma célula com
      2 entidades; distribuição de Klingon converge nas odds em amostra grande;
      nave nunca nasce sobre entidade

## 3. Integração no estado inicial (sequencial — depende da Fase 2)

- [x] 3.1 ~~`engine/constants.ts` — `createInitialGameState()` passa a gerar o
      mundo (ou delegar pra `worldGen`)~~ → **feito em `engine/newGame.ts` novo**.
      Delegar de `constants.ts` criaria import circular: `worldGen` importa
      `constants` (`ENEMY_BASE_POWER`, `MISSION_DURATION`), então `constants` não
      pode importar `worldGen`. A fábrica `createNewGameState(seed?)` foi movida
      pra módulo próprio que compõe os dois; `constants.ts` segue folha e só com
      constantes/matemática pura. `ENEMIES_INITIAL`/`STARBASES_INITIAL` viraram
      `ENEMIES_EXPECTED`/`STARBASES_EXPECTED` (só referência, não inicialização) —
      totais agora vêm da geração (design.md decisão 1)
- [x] 3.2 `stores/useGameState.ts` — `newGame()` gera galáxia **nova** com semente
      nova, não reaproveita a anterior; materializa o setor inicial
- [x] 3.3 `engine/damageControl.ts` — Send Party consome exatamente 1 carga do
      planeta e concede `+30` só se houver carga; marca o planeta como `surveyed`
      na primeira missão; planeta sem carga resolve sem rendimento (spec
      `damage-control` MODIFIED)
- [x] 3.4 `engine/navigation.ts` — resolução de sonda passa a revelar **planeta e
      cargas de dilítium** além do código KBS, com entrada no combat log, marcando
      o planeta como `surveyed` sem consumir carga. Sonda destruída não revela nada
      e não é reembolsada (spec `navigation` MODIFIED, design.md decisão 9).
      **Coordenar com `engine-integration` task 2.2**, que mexe na mesma função de
      resolução de sonda — fazer uma depois da outra, não em paralelo

## 4. Verificação

- [x] 4.1 `npx vue-tsc --noEmit` e `npx eslint` limpos no código novo/tocado
- [x] 4.2 `npx vitest run --project unit` verde, incluindo os testes da 2.8
- [x] 4.3 Verificar o grafo de import: `worldGen.ts` e `prng.ts` não importam
      irmão nenhum do engine (mesmo check que pegou a violação da decisão #36)
- [x] 4.4 Sanidade da economia de dilítium numa amostra de galáxias geradas:
      ~9-10 quadrantes com planeta carregado, ~19 cargas totais (~576 pontos de
      integridade de WC na galáxia inteira). Se divergir muito, é sinal de bug nas
      odds, não de balanceamento
- [x] 4.5 Confirmar que a semente sobrevive a reload e regenera a mesma galáxia
- [ ] 4.6 **Coordenar com `engine-integration`:** assim que o hook
      `onQuadrantEnter` estiver implementado lá, ligar a materialização de setor
      nele e rodar o playthrough manual (task 5.5 daquela mudança, que depende
      desta)
