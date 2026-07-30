## Context

A `fase-4-engine` entregou 8 módulos de engine em TS puro com 86 testes unitários
verdes e `vue-tsc` limpo. A revisão pós-implementação (2026-07-29, registrada como
decisão #38 no design daquela mudança) mostrou que **testes unitários por módulo
não detectam integração oca**: cada módulo foi testado contra si mesmo, e nada
exercita a composição.

Estado herdado, verificado:

```
navigation.ts    445 linhas, testado ── importado por NADA
damageControl.ts 302 linhas, testado ── importado por NADA
turnEngine.ts    351 linhas ────────── ~12 comportamentos por turno ausentes
7 consoles ──────────────────────────── 0 chamadas a ações da store
```

O `turnEngine` hoje é um `if`-chain monolítico dentro de `resolvePlayerTurn`, com
5 etapas inline (ação → Warp Core → inimigo → terminal → log). Três ações estão
declaradas em `PlayerActionType` (`move_impulse`, `move_warp`, `send_party`) sem
nenhum ramo correspondente: são aceitas, consomem turno, e não fazem nada.

Restrição forte herdada: a decisão #36 da `fase-4-engine` estabeleceu que módulos
irmãos do engine **não se importam** — só de `types/game.ts` e de uma folha
compartilhada. Isso é o que permitiu escrevê-los em paralelo. Hoje esse invariante
está quebrado em um ponto (`damageControl → combat`).

## Goals / Non-Goals

**Goals:**
- Fazer o `turnEngine` invocar de verdade tudo que os módulos já implementam, na
  ordem fixa que a spec `turn-engine` define.
- Restaurar o invariante de dependência da decisão #36.
- Dar ao jogador acesso ao engine: os 7 consoles passam a ler e escrever pela
  store.
- Fechar a lacuna de método que causou o problema: **testes de integração**, não
  só unitários.
- Permitir que esta mudança avance **sem depender** de `world-generation` estar
  pronta.

**Non-Goals:**
- Geração de galáxia, povoamento de setor e fluxo de New Game — pertencem a
  `world-generation`.
- Rebalancear qualquer constante. Todos os números vêm das decisões #22–#37 da
  `fase-4-engine` e seguem sendo estimativas pra playtesting.
- Reescrever os módulos da Fase B já verificados (`warpCore`, `combat`, `docking`,
  `saveIntegrity`, `tribbleInfestation`). A correção é de integração, não deles.
- Playthrough manual completo — depende de mundo gerado, fica pra depois das duas
  mudanças.

## Decisions

### 1. Pipeline de tick por turno, em vez de crescer o `if`-chain

O `turnEngine` precisa ganhar ~12 comportamentos por turno. Enfiá-los inline em
`resolvePlayerTurn` levaria uma função de 100 linhas a algo intratável, e foi
justamente a falta de estrutura que deixou passar a ausência deles.

**Decisão:** extrair uma etapa explícita de *tick* na resolução de turno, que
chama uma função de tick por módulo. Cada módulo continua dono da sua própria
regra por turno (`navigation` sabe progredir viagem/sonda/boost/decaimento;
`damageControl` sabe reparar/fatigar/ticar breach); o `turnEngine` só decide a
**ordem**. A ordem fixa das 5 etapas da spec não muda — o tick entra dentro da
etapa 5 (atualização de domínios), exceto o que a spec ancora em etapa própria.

**Alternativa descartada:** manter tudo inline no `turnEngine`. Rejeitada — foi o
que produziu a lacuna atual, e concentraria regra de navegação/reparo longe do
módulo que a testa.

### 2. Nova folha `engine/sector.ts` pra consultas de setor

`damageControl.ts` importa `getVisibleEnemies` de `combat.ts`, violando a decisão
#36. Mover o helper pra `constants.ts` resolveria o grafo, mas colocaria consulta
de domínio num arquivo cujo nome promete constantes e matemática pura.

**Decisão:** criar `engine/sector.ts` como **segunda folha** (importa só de
`types/game.ts`), reunindo as consultas sobre `currentSector`: entidades
visíveis/não-cloacadas, classificação de tipo (inimigo/base/obstáculo), células
ocupadas, adjacência. `combat`, `damageControl`, `navigation` e `docking` passam a
importar dela.

Não é abstração especulativa: são 4 consumidores hoje, e `world-generation` será o
quinto (precisa de célula desocupada pra posicionar entidade).

**Alternativa descartada:** mover pra `constants.ts`. Rejeitada — mistura
responsabilidade e piora a legibilidade da folha que hoje está clara.

### 3. Repovoamento de setor entra por *callback injetado*, não por import

Movimento entre quadrantes precisa repovoar `currentSector`. Isso é geração
(`world-generation`) sendo chamada por movimento (esta mudança) — se o
`turnEngine` importar `worldGen`, as duas mudanças ficam acopladas e nenhuma pode
ser verificada sozinha. Era a questão aberta registrada na proposta de
`world-generation`.

**Decisão:** o `turnEngine` recebe um hook opcional
`onQuadrantEnter?: (state, quadrant) => void`, com **default no-op**. Esta mudança
implementa a chamada do hook; `world-generation` fornece a implementação real. Os
testes de integração daqui injetam fixtures de setor pelo mesmo hook.

Benefício: as duas mudanças podem ser desenvolvidas e testadas em paralelo, e a
fronteira fica explícita em vez de virar dependência circular descoberta no meio
da implementação.

**Alternativa descartada:** `engine-integration` esperar `world-generation`
terminar. Rejeitada — serializa sem necessidade, e o hook é mais barato que a
espera.

### 4. Contrato da store congela antes de abrir os consoles em paralelo

Os 7 consoles são arquivos disjuntos, então são paralelizáveis — mesma lógica que
funcionou na Fase B. Mas todos consomem a **mesma** superfície de ações da store.
Se ela mudar no meio, os 7 retrabalham.

**Decisão:** reusar exatamente o padrão da decisão #36 — a superfície de ações da
store é um **portão sequencial** que fecha antes de abrir os consoles em paralelo,
igual `constants.ts` foi pra Fase B.

### 5. Testes de integração são requisito, não opcional

A lição da decisão #38: 86 testes verdes conviveram com 747 linhas órfãs. Testes
unitários por módulo, escritos pelo mesmo autor do módulo, não detectam isso.

**Decisão:** esta mudança adiciona `engine/integration.test.ts` que dirige o
`turnEngine` e afirma efeitos **cross-module** observáveis: despachar equipe e
rodar 2 turnos → integridade subiu (e não subiu no turno do despacho); engajar
warp 6 → overload efetivo recebeu estresse; lançar sonda a distância 3 → resolve
em 4 turnos e decrementa `remainingProbes`; deixar Life Support crítico 5 turnos →
derrota por asfixia. O critério é: **um módulo órfão deve fazer um teste falhar**.

**Alternativa descartada:** confiar em playthrough manual. Rejeitada — manual não
roda em CI e não protege contra regressão futura.

### 6. Verificação fatiada por dependência de mundo

Playthrough manual precisa de galáxia povoada. Testes de integração não — podem
injetar fixtures via o hook da decisão 3.

**Decisão:** separar verificação em dois níveis: o automatizável fecha nesta
mudança; o playthrough manual das condições terminais fica explicitamente marcado
como dependente de `world-generation`.

## Risks / Trade-offs

- **[Risco] `turnEngine` é ponto sequencial único, e é onde toda a dívida está
  concentrada** — a `fase-4-engine` já listava esse risco, e ele se materializou
  como falha de completude, não de prazo → Mitigação: pipeline de tick da decisão
  1 torna cada comportamento uma unidade nomeada e testável; teste de integração
  da decisão 5 falha se algum ficar desconectado. O mesmo tipo de buraco passa a
  ser detectável.
- **[Risco] As 12 lacunas foram enumeradas por inspeção manual; pode faltar
  alguma** → Mitigação: a spec desta mudança lista requirement por lacuna, e o
  fechamento exige cruzar a lista contra as specs originais da `fase-4-engine`,
  não contra a minha enumeração.
- **[Risco] Ligar console por console pode quebrar UI que hoje funciona com mock**
  — os consoles renderizam bem hoje justamente porque os mocks são benignos →
  Mitigação: um console por commit, cada um verificável visualmente; `HelmConsole`
  (já ligado) serve de referência de padrão.
- **[Trade-off] O hook `onQuadrantEnter` com default no-op permite que a mudança
  passe verde com o mundo vazio** — é o preço de desacoplar de `world-generation`.
  Aceito conscientemente: o teste de integração injeta fixture, então o caminho
  fica exercitado mesmo sem geração real.
- **[Risco] Working tree suja** — a `fase-4-engine` nunca foi commitada e mistura
  trabalho de tema não relacionado → Mitigação: registrado na proposta daquela
  mudança; separar commits antes de começar esta, pra o diff desta ser legível.

### 7. `alertLevel` enumerado agora, tratamento visual dos níveis novos adiado

`types/game.ts` hoje tem `redAlert: boolean`. O usuário confirmou (2026-07-29) a
intenção de implementar outros níveis de alerta no futuro, então o campo vira um
enumerado — decidir isso **antes** de os consoles baterem nele evita migrar o
campo depois de 7 arquivos passarem a lê-lo.

**Decisão:** `alertLevel: AlertLevel` com `'green' | 'yellow' | 'red'`. O modelo de
estado, a store e o engine suportam os 3 desde já.

**Mas o visual fica escopado a green/red nesta mudança.** Achado ao dimensionar: o
tema de alerta é **binário por construção** — cada um dos 7 temas define uma única
variante `-alert` por papel de cor (7 vars por tema), e `theme.css` tem 29 regras
`.red-alert` que trocam cada papel pela sua contraparte. Um terceiro nível exigiria
~49 vars novas e o conjunto equivalente de regras, nos 7 temas.

Consequência prática: `alertLevel === 'yellow'` é representável, persistível e
legível por qualquer console desde já, mas renderiza sem tema próprio até uma
mudança futura estender o sistema de cor (seção 13). Isso mantém esta mudança
honesta ao que a proposta declara — o sistema de temas segue **não afetado** aqui.

**Alternativa descartada:** manter booleano e migrar quando o Yellow Alert chegar.
Rejeitada pelo usuário — migrar depois custa mais, porque os 7 consoles desta
mudança já vão estar lendo o campo.

**Alternativa descartada:** estender os 7 temas agora. Rejeitada — ~49 vars de CSS
mais 29 regras é uma mudança de sistema de cor, não de integração de engine, e
arrastaria pra cá escopo que a proposta declara fora.

## Open Questions

*(Nenhuma. A ordem de ancoragem dos ticks foi fixada como requirement em
`specs/turn-engine/spec.md`; `alertLevel` foi resolvido na decisão 7 acima.)*
