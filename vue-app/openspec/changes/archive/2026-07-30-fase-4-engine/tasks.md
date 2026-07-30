## 1. Fundação (sequencial — bloqueia tudo abaixo)

- [x] 1.1 Criar `vue-app/src/types/game.ts` com `GameState` e sub-tipos (posição,
      energia, subsistemas, `DamageControlTeam[]`, Warp Core, alerta, combat log,
      entidades de `currentSector` com `id` estável, starbases com `id` estável +
      pool de recursos no nível da galáxia — não só do setor atual, ver design.md
      decisão #8) + campo `schemaVersion` (design.md decisão #12) + cela de
      prisioneiros (`count`/`capacity`) e `klingonsCaptured` pro rating (decisão #14)
      + marcador de leitura por categoria do combat log (`captain`/`general`/
      `engineering`, contagem lida vs. total, decisão #27) + `lifeSupportTurnsRemaining`
      (`number | null`, contagem regressiva de 5 turnos em crítico, decisão #37)
- [x] 1.2 Instalar `pinia` + `pinia-plugin-persistedstate`; criar
      `vue-app/src/stores/useGameState.ts` (esqueleto, sem regra ainda) registrando o
      plugin de persistência
- [x] 1.3 Revisar `types/game.ts` contra as 10 specs de `openspec/changes/fase-4-engine/specs/`
      antes de liberar a Fase 2 (risco documentado em `design.md`)

## 2. Engine core — capabilities independentes (paralelizável: até 5 agentes na 2.2-2.6, arquivos disjuntos — mas 2.1 é pré-requisito sequencial de todas elas, ver design.md decisão #36)

- [x] 2.1 `engine/constants.ts` — **folha, sem import de nenhum outro `engine/*.ts`,
      precisa fechar ANTES de abrir 2.2-2.6 em paralelo** (design.md decisão #36):
      constantes (seção 2.3) + `WARP_CORE_DAMAGE_TABLE`/
      `WARP_CORE_EXPLOSION_CHANCE_TABLE` (seção 10.2); `ENEMY_BASE_POWER = 200`
      (reaproveitado de `S9` do original, design.md decisão #22);
      `starbasesLeft` inicial = 5 (corrigido de 14, decisão #22);
      `IMPULSE_POWER_MAX = 2000`, draws passivos (SRS/LRS `100`/turno cada, Photon
      Tubes `5`/turno por tubo em standby + `20`/turno por tubo carregado — não
      `50` flat, decisões #31/#32 corrigiram o valor original da #25 —, Life
      Support `150`/turno, Warp Core `50`/turno, Auto-Nav Computer `100`/turno
      engajado, decisão #28), custo ativo de torpedo (`2`/disparo) (design.md
      decisão #25); `damageFraction(integrity) = (100-integrity)/100` + bandas
      leve (0-0.30)/moderado (0.30-0.60)/crítico (>0.60) + helper
      `degradedChance(d) = max(0,d-0.3)*100` (design.md decisão #35, generalizado
      pela #37) — importado por `combat.ts` (2.4, Phaser Banks/Photon Tubes),
      `warpCore.ts` (2.3, multiplicador de draw do Shield Control) e
      `navigation.ts` (2.2, LRS/Auto-Nav/Warp Engines), evitando que qualquer um
      desses 3 dependa dos outros
- [x] 2.2 `engine/navigation.ts` — métrica de distância compartilhada (Chebyshev);
      duração de warp `ceil(distância/warpFactor)` + estresse transitório de WC acima
      de warp 4 (`+2` overload-pontos/ponto, decisão #23); navegação manual parando 1
      célula antes de obstáculo (não rejeição); Auto-Nav Computer (pathfinding
      evitando obstáculos, custo de energia contínuo); Auto-Navigate pra base mais
      próxima (só preenche destino); boost em turnos (só desconta em movimento real,
      máx. 5 turnos, cooldown `1.5×` turnos usados, decisão #23); undock livre
      (sempre sudoeste da base); lançamento/resolução de sonda (`distância + 1`
      turnos, risco de destruição `40%+5%`/inimigo adicional em setor hostil,
      decisão #23); LRS escopo 3×3 sem memória própria + decaimento
      de confiança 5%/turno piso 30%; Star Chart — marca `exploredQuadrants` (scan/
      sonda/interrogatório), confiança própria com decaimento + refresh; "Snd to
      Helm" manual (Star Chart/LRS preenchem `destination`) (capability `navigation`
      — escopo grande após revisão painel-por-painel, design.md decisões #13/#14/#16);
      dano em LRS acelera decaimento `×(1+d)`, desliga (mesmo efeito do toggle off,
      travado) em crítico; dano em Auto-Nav aumenta draw `×(1+d)`, a partir de
      moderado `max(0,d-0.3)×100%` chance/turno de cair pra "para curto" (mesma
      regra da navegação manual), paralisado em crítico; dano em Warp Engines
      reduz teto efetivo (`IMPULSE_POWER_MAX×(1-d)`, `warpFactor` máx
      `floor(8×(1-d))`, clampando valor já selecionado), a partir de moderado
      `max(0,d-0.3)×100%` chance/turno de estagnar (turno consumido, sem avançar),
      paralisado em crítico (nenhum dos 2 modos de propulsão engaja) (design.md
      decisão #37, usa `damageFraction`/bandas de `constants.ts`, 2.1)
- [x] 2.3 `engine/warpCore.ts` — overload efetivo = `manualOverload + autoOverload +
      estresse transitório de warp`, travado em 0-20 antes de indexar as tabelas
      (design.md decisão #29, corrige inconsistência onde `autoOverload` nunca
      chegava a afetar dano/explosão em versão anterior das specs), rolls de
      dano/explosão/breach, com flag pra suprimir explosão/breach (usada pelo modo
      docking, task 3.2) (capability `turn-engine`,
      parte Warp Core; capability `energy-management` pro cálculo de `subsystemDraw`
      real, agora com os 9 subsistemas — Impulse (convertido via
      `IMPULSE_POWER_MAX`)/Phaser/Shield (pelo nível mantido, não pela
      transferência)/Photon Tubes (`5`/turno por tubo em standby, `20`/turno por
      tubo **carregado** — não somam, `20` substitui o `5` no tubo carregado,
      decisões #31/#32, + ativo `2`/torpedo disparado)/SRS/LRS (passivo +
      toggle)/Life Support/Warp Core (passivo, sempre ligados)/Auto-Nav Computer
      (`100`/turno engajado, decisão #28), design.md decisão #25); multiplicador
      de draw do Shield Control `×(1+d)` usando `damageFraction`/`d` importado de
      `constants.ts` (2.1) — **não** de `combat.ts`, pra não criar dependência
      cruzada entre os 2 arquivos paralelos (design.md decisões #35/#36)
- [x] 2.4 `engine/combat.ts` — dano de phaser/torpedo, efetividade por temperatura
      (`phaserTemp` +30/tiro cap 270, -30/turno passivo sem atirar, decisão #30);
      dano de torpedo `200-300` aleatório contra `enemyPower`, sem redução por
      `phaserTemp`/calor (subsistema separado do Phaser Banks), sem split entre
      alvos (cada tubo carregado atira independente pro seu alvo mapeado,
      decisão #31); contra-ataque Klingon MVP com alvo parametrizável (nave OU
      pool de recursos de
      uma base — usado pelo modo docking, task 3.2), `shieldIntegrity` derivada;
      Hail (rendição contra inimigo, 30% chance, status de graça contra base),
      captura de prisioneiro + limite de capacidade da cela (4), interrogatório
      (1 roll fixo 50% por captura, revela quadrante no Star Chart de graça)
      (capabilities `combat` + `shields`, design.md decisão #14, números decisão
      #23); Hail rejeita `Cloaked Raider` cloacado, mesma exclusão de phaser/torpedo
      (design.md decisão #21); `enemyPower` como stat único de vida/ataque
      (`ENEMY_BASE_POWER=200×(0.5+RND(1))` na criação, esgota ao atacar, design.md
      decisão #22); splash de phaser dividindo potência entre todos os inimigos
      visíveis (fórmula clássica reaproveitada), `weaponsLocked` (auto ao entrar em
      setor hostil, perda `(100-integridadeSRS)×0.5%`/turno por sensor danificado ou
      por cloak/saída de alvo, reaquisição manual custando 1 turno, decisão #23),
      novo tipo `Cloaked Raider` (invisível/intargetável/não-ataca enquanto
      cloacado, estresse `+4`/turno teto 20, decloak forçado sem risco ao atingir o
      teto + cooldown 8 turnos, decisões #17/#23); usa `damageFraction`/bandas
      leve-moderado-crítico de `constants.ts` (2.1, **não** definidas aqui — ver
      decisão #36) aplicadas a Phaser Banks (calor `×(1+d)`, resfriamento
      `×(1-d)`, dano `×(1-d)`, paralisado em crítico) e Photon Tubes (dano
      `×(1-d)`, falha de carregar/descarregar `max(0,d-0.3)×100%` a partir de
      moderado, paralisado em crítico) (design.md decisão #35, reabre o Non-Goal
      da decisão #19; Shield Control fica em `warpCore.ts`/task 2.3, não aqui)
- [x] 2.5 `engine/damageControl.ts` — fadiga/recuperação/stacking das 6 equipes de CdD,
      fórmula de reparo, Core Breach; Send Party (elegibilidade por planeta
      adjacente, duração fixa 3 turnos, boost de integridade do WC de `+30`, risco
      `40%+5%`/inimigo adicional em setor hostil, decisão #23) (capability
      `damage-control`, design.md decisão #14); nova entrada dispatchável
      "Auto-Navigation Computer" na lista de subsistemas, 8ª antes do Warp Core
      (design.md decisão #18); estado `cooldown` forçado ao bater no piso de 20% de
      eficiência, só libera redispatch ao recuperar 50%+ (design.md decisão #19);
      dispatch/recall livre (sem custo de turno), mas contribuição pro
      `repairPerTurn` e fadiga só contam a partir do próximo turno resolvido
      (design.md decisão #21); enquanto a cela tiver ≥1 prisioneiro, 1 equipe fica
      travada em "guarda" fora do pool de dispatch, libera ao zerar a cela (design.md
      decisão #23)
- [x] 2.6 `engine/docking.ts` — **só os primitivos independentes**: elegibilidade,
      resupply instantâneo por tipo de base, baixar escudos + zerar `manualOverload`
      (qualquer tipo de base, antes de qualquer loop), mutação do pool de recursos da
      base (capacidade 500, regen `+10`/turno quando não sacado, decisão #23);
      entrega de prisioneiros (esvazia a cela de graça, qualquer tipo de base,
      libera a equipe de guarda no mesmo instante, decisão #24). **Não inclui o
      loop de reparo** — isso depende do modo docking
      do `turnEngine` (Fase C, ver tasks 3.3) e do reajuste dos parâmetros de
      `warpCore.ts`/`combat.ts` pra aceitarem alvo=base em vez de alvo=nave
- [x] 2.7 `engine/saveIntegrity.ts` + `engine/tribbleInfestation.ts` — checksum
      SHA-256 via `crypto.subtle` gravado em chave própria do `localStorage` (nunca
      dentro do `GameState` hasheado), recomputado só em fronteira de turno,
      calculado sobre os campos da `schemaVersion` atual (migração antes de
      comparar) + flag oculta + crescimento exponencial sem limite no dado interno,
      renderização travada em 200 ícones (decisão #23) (capability `save-integrity`
      — **independente do resto, pode ser feita a qualquer momento**, inclusive
      antes da Fase 1)
- [x] 2.8 Testes unitários de cada módulo acima (funções puras, sem Vue)


## 3. Escopo movido pra outras mudanças (revisão 2026-07-29)

A revisão completa pós-implementação encontrou o núcleo do engine sólido (86
testes, typecheck limpo) mas a integração oca. As Fases C/D/5 originais saíram
desta mudança:

- **`engine-integration`** — herda: correção das ~12 lacunas por turno do
  `turnEngine.ts`; ligar `navigation.ts` e `damageControl.ts` (747 linhas
  testadas, hoje órfãs, importadas por nada); corrigir o import
  `damageControl → combat` que viola a decisão #36; ligar os 7 consoles à store
  (4.2–4.9; `HelmConsole`/4.1 já feito); verificação de ponta a ponta.
- **`world-generation`** — herda o que **nunca foi planejado aqui**: geração de
  galáxia, povoamento de setor, código KBS, posição inicial válida e fluxo de
  New Game. `currentSector`/`starbases` inicializam vazios e nada os popula.

**Nota sobre as marcas originais:** as tasks 3.1–3.4 estavam marcadas `[x]`, mas
superdeclaravam — os arquivos existem e passam testes unitários, porém o
`turnEngine` nunca invoca reparo de CdD, navegação, decaimento de sensores,
tick de breach/cloak/boost, nem aplica estresse de warp (passa `warpStress: 0`
hardcoded). Ficam registradas como entregues-em-primeira-passada, e a dívida
está enumerada em `engine-integration`.
