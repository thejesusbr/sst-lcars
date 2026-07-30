## Context

Todo o estado de jogo hoje é mock local por console (`ref`/`computed`), sem regra,
sem persistência, com domínios compartilhados já duplicados/desincronizados (posição
da nave em 2 lugares, `mainEnergy` com 2 cópias). `SST_LCARS_SPECS.md` seção 14
(2026-07-28) já fez o levantamento completo — este design não repete esse
levantamento, só toma as decisões técnicas em cima dele. Decisões de arquitetura de
mais alto nível (engine TS puro desacoplado de Vue/Pinia, Pinia como camada fina)
já estavam fechadas desde a seção 8.3/8.4; este documento detalha como isso se
traduz em módulos de arquivo e, principalmente, como fatiar o trabalho pra múltiplos
agentes rodarem em paralelo sem pisar no mesmo arquivo.

## Goals / Non-Goals

**Goals:**
- Engine core 100% TS puro, testável sem montar nenhum componente Vue.
- Um único `GameState` real substituindo todo mock local dos 7 consoles de gameplay.
- Fatiar as 10 capabilities em tracks de implementação com **fronteira de arquivo
  clara**, pra rodar em paralelo sem dois agentes editando o mesmo arquivo ao mesmo
  tempo.
- Persistência via `localStorage` sem código de serialização manual.
- Selo de integridade honesto (não vendido como segurança real) + easter egg dos
  Tribbles.

**Non-Goals:**
- ~~Resolver a pergunta em aberto da seção 14.3 (Subsystem Integrity afetando
  outros painéis)~~ — **totalmente revertido**: decisões #35 (Phaser Banks/
  Photon Tubes/Shield Control) e #37 (LRS/Auto-Nav/Warp Engines/Life Support)
  fecham os 7 subsistemas de gameplay. Não é mais Open Question nem Non-Goal.
- Multiplayer, leaderboard, ou qualquer autoridade de servidor — fora de escopo
  (é exatamente por isso que o anti-trapaça vira "selo", não segurança real).
- Dificuldade configurável (NOVICE/FAIR/GOOD/EXPERT/EMERITUS) e sistema de pontos de
  ação pra IA — já eram itens 7/8 da seção 9, fora do MVP.
- Companion app tricorder — só preparamos o terreno (engine sem import de Vue), não
  construímos o segundo client.

## Decisions

### 1. Estrutura de arquivos

```
vue-app/src/
  types/game.ts            — GameState e todos os sub-tipos (1 arquivo, fundação)
  engine/
    constants.ts            — constantes da seção 2.3 + LUTs da seção 10.2
    turnEngine.ts            — orquestrador (seção 8.2), chama os módulos abaixo
    warpCore.ts               — overload/breach (seção 10)
    combat.ts                 — dano de phaser/torpedo + IA Klingon (seção 5.1)
    navigation.ts             — movimento, validação, auto-nav
    damageControl.ts          — fadiga/stacking/repair das equipes de CdD (seção 10.3)
    docking.ts                — sequência de atracagem (seção 5.4)
    endGame.ts                — condições terminais + rating (seção 5.3)
    saveIntegrity.ts          — checksum (seção 14.6)
    tribbleInfestation.ts    — mecânica secreta (seção 14.6)
  stores/
    useGameState.ts           — Pinia, importa só de engine/ e types/
```

Cada arquivo de `engine/` corresponde a 1 capability (exceto `turnEngine.ts`, que é o
orquestrador da capability `turn-engine` chamando `warpCore`/`combat`/`damageControl`).
Essa correspondência 1:1 é o que permite paralelizar: cada agente trabalha num arquivo
`engine/*.ts` novo, sem tocar nos arquivos dos outros. `constants.ts` é a exceção
combinada: é uma folha (só dados + funções puras, sem import de nenhum outro
`engine/*.ts`) que TODOS os outros importam — inclui agora a fração de dano
compartilhada `damageFraction(integrity)` e as bandas leve/moderado/crítico
(design.md decisão #35), usadas tanto por `combat.ts` (Phaser Banks/Photon Tubes)
quanto por `warpCore.ts` (multiplicador de draw do Shield Control no cálculo de
`subsystemDraw`) — colocar essa lógica ali em vez de duplicá-la ou deixá-la só em
`combat.ts` é o que evita `warpCore.ts` importar de `combat.ts` (revisão pré-
`/opsx:apply`, 2026-07-29, ver decisão #36).

### 2. Ordem de implementação e paralelismo real

**Não dá pra paralelizar tudo de uma vez** — `types/game.ts` e `stores/useGameState.ts`
são fundação compartilhada; todo o resto importa deles. Fatiamento realista:

```
FASE A (sequencial, 1 agente) — fundação
  types/game.ts + stores/useGameState.ts (esqueleto, sem regra ainda)
  ↓
FASE A.1 (sequencial, 1 agente) — folha compartilhada da Fase B
  constants.ts (constantes + damageFraction/bandas leve-moderado-crítico, decisão
  #35) — só importa types/game.ts, TODOS os arquivos da Fase B importam dele;
  precisa existir antes de abrir a Fase B pra não virar dependência cruzada
  ENTRE os agentes paralelos (revisão pré-apply, decisão #36)
  ↓
FASE B (paralelo, até 5 agentes — cada um só mexe no seu arquivo engine/*.ts)
  ├── navigation.ts          (capability: navigation)
  ├── warpCore.ts            (capability: turn-engine, parte 1)
  ├── combat.ts              (capabilities: combat + shields)
  ├── damageControl.ts       (capability: damage-control)
  └── docking.ts             (capability: docking)
  (save-integrity roda à parte, ver abaixo)
  ↓
FASE C (sequencial, 1 agente) — integração
  turnEngine.ts orquestrando B na ordem da seção 8.2 + endGame.ts (depende de todo o
  resto pra saber quando checar condições terminais)
  ↓
FASE D (paralelo, até 7 agentes — cada um só mexe no seu .vue)
  Wire dos 7 consoles de gameplay pra `useGameState` (1 console = 1 arquivo = 1 agente)
```

Fase B é segura em paralelo porque cada `engine/*.ts` importa só de `types/game.ts`
(Fase A) e `constants.ts` (Fase A.1, folha), sem dependência cruzada ENTRE si —
essa garantia só se sustenta com `constants.ts` fechado ANTES de abrir a Fase B;
sem essa sequência, `warpCore.ts` (multiplicador de Shield Control) precisaria
importar de `combat.ts` (onde a fração de dano foi especificada), quebrando o
paralelismo dos 2. Fase D é segura pelo mesmo motivo (1 `.vue` por agente, nenhum
consumido por outro). Fase C **não** é paralela — é literalmente o arquivo que
amarra os outros, só 1 agente por vez evita conflito de merge no mesmo arquivo.

`save-integrity` é a única capability isolada o bastante pra rodar **fora dessa
sequência inteira**, inclusive antes da Fase A — não depende de nenhum outro domínio de
`GameState` além de "serializar o estado inteiro", então pode ser feita a qualquer
momento sem bloquear nem ser bloqueada.

### 3. Persistência: `pinia-plugin-persistedstate`

Alternativa considerada: serialização manual (`localStorage.setItem` num `watch`
próprio). Rejeitada — é reinventar o que a lib já faz (debounce, `storage` event
listener pra sincronizar abas, opção de `paths` pra persistir só parte do state),
ponytail: usar lib madura em vez de escrever à mão.

### 4. `shieldIntegrity` como valor derivado, não persistido bruto

Por decisão já tomada na seção 12.5, `shieldIntegrity` não é um campo próprio de
`GameState` — é `computed` no engine a partir de `shieldEnergy` + histórico de dano
acumulado (`damageHistory` ou equivalente, a decidir em `combat.ts`). Persistir só o
histórico (não o valor derivado) evita o campo dessincronizar do resto do estado após
uma migração/patch futuro no `GameState`.

### 5. Selo de integridade: SHA-256 nativo, sem lib nova

`crypto.subtle.digest('SHA-256', ...)` (Web Crypto API) em vez de uma lib de hash —
já nativo em todo browser moderno, zero dependência nova, e é rigorosamente honesto
sobre o que está sendo usado (não pretende ser HMAC com chave secreta real, já que
não existe segredo real possível client-side — ver seção 14.6 do specs e Risco #1
abaixo).

### 6. Mira de torpedo: mapa tubo→id de inimigo, não índice de array

**Decisão (2026-07-29, revisão de plano):** cada entidade em `currentSector` ganha um
`id` estável (nunca reaproveitado), atribuído na criação/spawn. Mira de torpedo vira
`Map<tubeId, enemyId | null>` — Cycle percorre a lista de inimigos atualmente
detectados e atualiza o valor da chave correspondente ao tubo.

**Alternativa rejeitada:** `targetIndex: number` apontando direto pro array
`currentSector` (era o que a v1 da spec de `combat` descrevia, espelhando o mock atual
de `WeaponsConsole.vue`). Rejeitada porque destruir qualquer inimigo ANTES de outro no
array desloca os índices seguintes — todo tubo mirando um índice depois do removido
passa a mirar silenciosamente outro alvo. Esse bug já existe hoje na estrutura de dados
do mock, só nunca foi observado porque o mock nunca remove item nenhum de
`enemyTargets`. Índice-como-referência-em-lista-mutável é a classe de bug clássica que
motivou a troca.

Detalhe completo (requirements + cenários) em `specs/combat/spec.md`.

### 7. Prioridade entre condições terminais simultâneas — "regra Kobayashi Maru"

**Decisão (2026-07-29, revisão de plano):** derrota sempre vence vitória. Ordem fixa,
checada só no passo 4 do `turnEngine` (maior prioridade primeiro): explosão do WC →
nave destruída junto com base docada → morte por radiação → `mainEnergy<=0` →
`starbasesLeft=0` → stardate esgotado → vitória. Só o resultado de maior prioridade é
mostrado, nunca dois ao mesmo tempo. (Lista atualizada depois, ver decisão #8 — a
posição 2 foi inserida junto com a mecânica de docking multi-turno.)

**Alternativa rejeitada:** checar condição terminal depois de CADA passo do turno
(passo 1/2/3), parando assim que qualquer uma virasse verdadeira, na ordem em que
aconteceu — narrativamente mais "justo" (não morre depois de já ter vencido), mas
exigiria reestruturar o passo 4 do `turn-engine/spec.md` de check único pra check
intercalado. Descartada em favor da regra fixa, mais simples de especificar e
implementar, e propositalmente dura — o jogador destruir o último Klingon no mesmo
turno em que o núcleo explode é o Kobayashi Maru do jogo: cenário sem saída limpa por
design, não bug.

Detalhe completo em `specs/end-game/spec.md` (`Requirement: Terminal condition
priority`).

### 8. Docking em StarBase vira resolução multi-turno, não ação instantânea

**Decisão (2026-07-29, revisão de plano):** atracar em `STARBASE_DOCK` não é mais 1
ação de turno único — dispara um loop `while (reparo incompleto E base não destruída)`
rodando `turnEngine` em "modo docking" a cada iteração (ver `turn-engine/spec.md`,
`Requirement: Docking resolution mode`). `stardate` avança exatamente o número de
iterações que o loop rodar; tela só atualiza no final, `combatLog` recebe 1 entrada
por iteração. Consequências fechadas nesta rodada:

- **Nave protegida, base é quem apanha:** em setor hostil, ataque inimigo por
  iteração reduz o pool de recursos da base, não `shieldEnergy`/subsistemas da nave.
- **Reparo pelas equipes da estação:** todo subsistema (incl. WC) repara em paralelo
  a `5 × 5 × 1.0 = 25 pontos/turno`, sem cap de stacking (1 equipe dedicada por
  sistema, sem fila). Fórmula direta da seção 10.3, só com `efficiency=100%` e
  `stackMult=1` fixos.
- **CdD da nave descansam em dobro, não resetam instantâneo:** recuperam a `+16%/turno`
  (2× a taxa normal de idle, `+8%/turno` — full leave na estação, não só ociosas em
  zona de combate) pelo número de iterações reais — supera a regra mais simples
  ("reset pra 100% instantâneo") que estava em `docking/spec.md` v1.
- **Escudos baixam e overload zera ao atracar (qualquer tipo de base, correção
  2026-07-29):** base é porto seguro (não precisa de escudo) e fornece energia extra
  direto pra nave (não precisa rodar o núcleo quente) — `shieldEnergy` volta pra
  `mainEnergy` (mesmo efeito de "Lower Shields"), `manualOverload` zera, antes de
  qualquer loop de reparo começar. Vale pra `SUPPLY`/`SCIENCE` também, mesmo sem loop.
- **WC não pode explodir, vazar radiação, nem tomar dano enquanto docado:** já que
  overload fica sempre em 0 durante o docking (ponto acima), não há dano de overload
  pra aplicar nos ticks do loop — WC só repara, nunca regride, enquanto atracado. As 2
  rolagens catastróficas ficam suspensas de qualquer forma (engenheiros da estação
  "contêm" o problema), mas na prática nem precisariam mais rolar contra dano zero.
- **Aviso único:** mensagem de "Klingons vão atacar a base" só na 1ª vez que o
  jogador atraca em setor hostil na partida, não toda vez.
- **Bases ganham pool de recursos próprio, limitado e regenerável** — impede o spam
  (atracar repetido em sucessão rápida rende menos se o pool não regenerou). Números
  exatos de depleção/regen ficam em aberto (ver Open Questions).
- **Nova condição terminal, prioridade 2** (logo abaixo de explosão do WC, acima de
  morte por radiação): base docada destruída = nave destruída junto, mesmo que
  `starbasesLeft` ainda seja > 0 — distinto da condição agregada de prioridade 5.

**Consequência técnica herdada da decisão #6:** o padrão de "id estável, nunca
reaproveitado" criado pra entidades de `currentSector` (mira de torpedo) agora
precisa se estender a **starbases no nível da galáxia inteira**, não só do setor
atual — o pool de recursos por base só faz sentido se a MESMA base for reconhecível
entre visitas diferentes ao longo da partida toda, não só dentro de 1 sessão de
combate. `types/game.ts` (Fase A) precisa modelar isso.

**Alternativa rejeitada:** manter docking como ação instantânea de turno único (como
a v1 desta spec descrevia) e resolver dano de base via fórmula fechada agregada (tipo
as tabelas do WC) em vez de loop de verdade. Rejeitada a pedido do usuário — loop real
reaproveita o `turnEngine` já existente (nenhuma fórmula nova pra derivar/validar) e é
mais robusto a cenários onde a base sendo atacada atrasa o próprio reparo (uma
fórmula fechada precomputada não reagiria a isso).

Detalhe completo em `specs/docking/spec.md` (reescrito) e
`specs/turn-engine/spec.md` (`Requirement: Docking resolution mode`).

### 9. `subsystems.warpCore`: delta agregado por tick, não mutação sequencial

**Decisão (2026-07-29, revisão de plano):** dano (`warpCore.ts`, por overload) e
reparo (`damageControl.ts`, dispatch de CdD) que escrevem `subsystems.warpCore` no
MESMO tick calculam seus deltas a partir do mesmo valor de entrada e somam, em vez de
mutar em sequência (`integrity -= dano; integrity += reparo`). Mesmo resultado
numérico hoje (as duas fórmulas são valor fixo por tick, não percentual composto),
mas cada função vira testável isoladamente contra o mesmo estado de entrada, sem
depender de qual "vai primeiro" — e não quebra se uma das duas fórmulas virar
percentual no futuro.

**Escopo revisto pela decisão #8:** originalmente essa questão valia tanto pra turno
normal quanto pro loop de docking. Como a decisão #8 zera `manualOverload` ao atracar,
o loop de docking nunca tem dano de overload pra somar — só reparo. Essa decisão #9
só importa de verdade em **turno normal** (fora de docking), quando overload ativo e
CdD dispatchada no WC coincidem no mesmo turno.

**Alternativa rejeitada:** mutação sequencial (dano primeiro, depois reparo, ou
vice-versa). Descartada por ser dependente de ordem sem necessidade — mesmo dando o
mesmo resultado hoje, é um contrato mais frágil pra manter conforme o engine cresce.

### 10. Sonda (`PRB`) vira turno-based, ganha casa na capability `navigation`

**Decisão (2026-07-29, revisão de plano, categoria B.1):** o mock atual usa
`setTimeout(2000ms)` de relógio real — incompatível com um motor 100% orientado a
turno (mesmo problema de fundo que motivou o loop de docking em turnos, não
segundos). Nenhuma das 10 capabilities originais cobria sonda; foi pra `navigation`
por reaproveitar a mesma métrica de distância (Chebyshev) que movimento de nave já
precisa.

Regras fechadas: duração = `distância + 1` turnos (distância assumindo fator de dobra
1, ou seja, 1 unidade de distância = 1 turno de viagem; +1 turno fixo pra escanear).
Se o setor-alvo for hostil, 1 checagem de risco de destruição acontece na chegada,
antes do turno de scan — se destruída, sem dado revelado, sonda não é reembolsada,
log recebe entrada de "contato perdido". Fórmula exata da chance de destruição fica
em aberto (ver Open Questions), mesmo tratamento dado a outras constantes de
probabilidade ainda não balanceadas nesta mudança (crescimento de Tribbles, regen do
pool de recursos da base).

**Consequência pra Fase 2:** `engine/navigation.ts` (task 2.2) ganha escopo — não é
mais só movimento de nave, é dono da métrica de distância compartilhada + sonda.

Detalhe completo em `specs/navigation/spec.md`.

### 11. Checksum recalculado só em fronteira de turno, não em toda mutação

**Decisão (2026-07-29, revisão de plano, categoria B.2):** `save-integrity/spec.md`
só descrevia o lado da leitura (recalcula e compara no load), sem dizer quando o hash
armazenado é atualizado. Resposta óbvia ("toda mutação") seria uma race real:
`crypto.subtle.digest` é assíncrono, duas mutações próximas disparam 2 Promises que
podem resolver fora de ordem, gravando um hash desatualizado por cima de um mais
novo — dispararia Tribbles sozinho, sem trapaça nenhuma envolvida.

Fechado: recalcula e grava só em fronteira de turno (fim de cada resolução do
`turnEngine`, inclusive cada tick individual do loop de docking). Resolução de turno
já é sequencial/atômica por construção — ancorar a escrita do checksum ali elimina a
race por desenho, sem precisar de debounce/lock explícito.

**Alternativa rejeitada:** debounce/lock explícito em torno da chamada de
`crypto.subtle.digest`, independente de quando ela for disparada. Descartada por ser
mais mecanismo pra manter (mais um lock pra esquecer de testar) resolvendo o mesmo
problema que já se resolve de graça só escolhendo o ponto de gatilho certo.

Detalhe completo em `specs/save-integrity/spec.md` (`Requirement: Checksum
recomputed and written only at turn boundaries`).

### 12. Checksum: chave separada + versão de schema excluída do hash

**Decisão (2026-07-29, revisão de plano, categoria D):** dois bugs achados na
revisão, ambos de implementação (não de design), fechados juntos:

- **Hash circular:** checksum grava em chave PRÓPRIA do `localStorage`, nunca como
  campo dentro do próprio objeto `GameState` que está sendo hasheado — senão cada
  gravação muda o objeto que gerou o hash anterior.
- **Falso positivo por versionamento:** `GameState` ganha `schemaVersion`. Checksum
  só é computado sobre os campos da versão ATUAL, depois de migrar um save antigo —
  nunca hasheando ingenuamente o que já existir no objeto carregado. Sem isso, todo
  jogador com save de antes de um patch futuro (que adicione/remova campo) levaria
  Tribbles por causa da atualização do jogo, não de trapaça.

Sem alternativas rejeitadas aqui — são correções diretas de lacuna de implementação,
não escolhas de design com trade-off.

Detalhe completo em `specs/save-integrity/spec.md` (`Requirement: Checksum stored
separately from the hashed payload`, `Requirement: Schema version excluded from
hash`).

### 13. HelmConsole — revisão painel-por-painel, Tópico 1 (2026-07-29)

**Decisão consolidada** (5 sub-achados, todos em `navigation/spec.md` reescrito +
`energy-management`/`turn-engine` ajustados):

- **Duração de warp = `ceil(distância / warpFactor)` turnos**, mesma fórmula da
  sonda (decisão #10), generalizada pro fator escolhido pelo jogador. Verificado
  contra o código-fonte primário original (`vintage-basic.net/bcg/superstartrek.bas`,
  1978) — relação é **linear**, não quadrática como uma fonte secundária sugeria
  (`N=INT(W1*8+.5)` setores por comando de custo fixo).
- **Sem consumo de energia em warp** (pedido explícito do usuário) — contrapeso vira
  **estresse no WC**: cruzeiro seguro até warp 4 (usuário confirmou, bate com
  episódios da série), acima disso soma estresse transitório ao overload efetivo das
  rolagens de dano/explosão (reaproveita a tabela Fibonacci já existente, seção 10.2
  — nenhuma fórmula nova). Fator/turno exato de estresse é constante de balanceamento
  em aberto.
- **Navegação manual para 1 célula antes de obstáculo**, não rejeita a jogada inteira
  — comportamento verificado linha a linha no BASIC original (`sst_original.bas`
  3240-3350, "WARP ENGINES SHUT DOWN ... DUE TO BAD NAVIGATION"). Corrige o rascunho
  anterior desta spec, que rejeitava a jogada inteira (mais pobre que o original).
- **Auto-Nav Computer — autopilot de verdade, não existe no original.** Pesquisei o
  "LIBRARY-COMPUTER" clássico (`COM` → função 3/4): só calculava rumo/distância, o
  capitão sempre pilotava manualmente. Usuário decidiu deliberadamente ir além do
  canônico ("Teslas já quase fazem isso, século 23 então") — toggle explícito
  (default off) em `HelmConsole`, calcula rota que desvia de obstáculos (mais longa
  que o caminho direto), nunca para no meio do caminho, mas consome energia contínua
  enquanto ligado (novo 4º contribuinte de `subsystemDraw`, junto de Impulse/Phaser/
  Shield). Complementa (não substitui) o "Auto-Navigate to nearest base" já existente
  — um escolhe o destino, o outro decide como chegar lá, compõem livremente.
  Algoritmo de pathfinding é detalhe de implementação (Fase B), não de spec.
  Trade-off explícito: caminho mais seguro (sem risco de parar por obstáculo, sem
  encontro de combate no meio) custa mais turnos + mais energia.
- **Boost em turnos, só desconta em movimento de verdade** (ativar sem se mover não
  gasta duração), duração máxima menor (uso intra-setor, não trip inteira), cooldown
  agora escala com a distância voada sob boost, não é mais duração fixa. Mesmo
  padrão categoria B (relógio real → turnos) já aplicado à sonda (decisão #10) e ao
  checksum (decisão #11).
- **Dock vira Undock, ação livre** (sem custo de turno), sempre reaparece na célula a
  sudoeste da base. Helm (`NAV`/`WRP`/Auto-Nav/Boost) fica desabilitado enquanto
  docado.

**Fontes primárias consultadas** (achado de pesquisa, não decisão de design): o repo
GitHub que o usuário linkou originalmente (`philspil66/Super-Star-Trek`) está
bloqueado por DMCA no próprio GitHub (confirmado via `curl`, HTTP 451, `block.reason:
"dmca"`) — usado mirror alternativo (`vintage-basic.net/bcg/superstartrek.bas`, mesmo
código-fonte de 1978) para as consultas acima.

Detalhe completo em `specs/navigation/spec.md` (reescrito quase por completo),
`specs/energy-management/spec.md` (`Real aggregate subsystem draw`),
`specs/turn-engine/spec.md` (`Warp Core overload and breach rolls`).

### 14. NavSensingConsole — revisão painel-por-painel, Tópico 2 (2026-07-29)

**Decisão consolidada:**

- **Dock/Undock permanece no NavSensingConsole** (confirmado pelo usuário) — mesmo
  console de sempre, lógica mora em `navigation` (mesmo padrão da sonda: botão num
  console, regra na capability).
- **LRS ganhou 2 requirements que nunca tinham virado spec**, apesar de já
  decididos há tempo (seção 12.7) e implementados como mock: escopo só nos 9
  quadrantes vizinhos (3×3), sem memória própria (diferente do Star Chart,
  cumulativo); decaimento de confiança de sinal 5%/turno, piso 30%. Botão "Advance
  Turn" (debug) é removido — decaimento passa a vir do `turnEngine` de verdade.
- **`currentSector` por id (combate) vs grid por posição (renderização) — nota de
  implementação**, não requirement novo: `LcarsScanner` consome
  `Record<"row,col", ScannerCell>`, `GameState.currentSector` é lista por `id`
  (decisão #6). Fase D precisa de uma projeção/`computed` entre os dois, não são a
  mesma estrutura.
- **Hail e Send Party — não existem no BASIC original de 1978** (confirmado via
  grep no código-fonte já baixado: sem `HAIL`/`SURRENDER`/`DILITHIUM`/`PLANET`) — são
  desenho novo desta revisão, não resgate de canon:
  - **Hail** (`combat`): contra inimigo, tentativa de rendição (chance fixa, em
    aberto) — sucesso **captura** (não destrói), adiciona 1 prisioneiro à
    cela (`brig`, capacidade fixa em aberto), rejeitado se a cela estiver cheia.
    Contra base, sempre revela o pool de recursos (decisão #8) de graça, sem risco.
  - **Captura vale mais que destruir no rating** (`end-game`) — pedido explícito do
    usuário: rendição habilita interrogatório, então `klingonsCaptured` pesa mais
    que `klingonsDestroyed` na fórmula (multiplicador exato em aberto).
  - **Interrogatório** (`combat`): 1 rolagem fixa por captura (não repetível),
    sucesso revela localização de nave/esquadrilha Klingon — marca 1 quadrante do
    Star Chart como explorado, de graça (sem gastar sonda/scan).
  - **Send Party** (`damage-control`, fecha o gancho órfão do dilítio, seção 10.5):
    botão desabilitado por padrão, habilita só com planeta ADJACENTE (mesmo padrão
    de adjacência do docking, corrigido de "mesmo setor" pra "setor adjacente" a
    pedido do usuário). Duração **fixa em 3 turnos** (partida-pesquisa-regresso, não
    é constante de balanceamento como os outros prazos desta revisão). Sucesso =
    boost instantâneo de integridade do WC, independente do dispatch de CdD. Risco
    de perda em setor hostil, mesmo estilo de checagem única da sonda.
- **Indicador de prisioneiros/vagas no SituationPanel** — usuário já sinalizou que
  cabe no HUD; layout exato fica pro Tópico 7 (revisão do SituationPanel), só a
  necessidade do campo já está registrada aqui.

Detalhe completo em `specs/combat/spec.md` (Hail/captura/interrogatório),
`specs/damage-control/spec.md` (Send Party), `specs/end-game/spec.md` (rating),
`specs/navigation/spec.md` (LRS).

### 15. Nomenclatura "System" → "Quadrant" na UI (2026-07-29)

**Contexto:** usuário questionou se setor deveria ser 10×10 (citando o manual do
nakajim.net) — verificado contra o código-fonte primário (`DIM G(8,8),...,Z(8,8)`,
bound check `S1<1 OR S1>=9`) que **setor já é 8×8**, igual a UI atual; nakajim.net
descreve uma variante/manual diferente da mesma família de jogos. Mantido 8×8 nos
dois níveis, sem mudança de dimensão.

**Decisão real desta rodada:** a UI usa "System"/"Sistema" pro nível GRANDE (o que o
original sempre chamou de **Quadrant**) e "Sector" pro nível pequeno (que já bate
com o original). O `GameState` (seção 8.1, campo `quadrant: {x,y}`) **já usava o nome
certo** — o desalinhamento é só nos rótulos/ids visíveis da UI, nenhuma spec desta
mudança precisou de correção (confirmado via grep, zero ocorrência de "System" no
sentido de quadrante em nenhuma das 10 capabilities). Escopo é puramente
renomeação, registrado como task na Fase 4 (wiring dos consoles), não como
requirement novo:

- `HelmConsole.vue`: `destination.sys` → `destination.quadrant`, labels "System" →
  "Quadrant", ids `cur-loc-sys`/`dst-sys-ind` → `cur-loc-quadrant`/`dst-quadrant-ind`
- `NavSensingConsole.vue` / `StarChartConsole.vue`: `selectedSystem` →
  `selectedQuadrant`, label "Selected System" → "Selected Quadrant",
  `sendSystemToHelm` → `sendQuadrantToHelm`, ids `sndHlmSysTxt`/`sndSysHlm` →
  equivalentes com `Quadrant`

"Sector"/"Setor" não muda em lugar nenhum — já estava certo.

### 16. StarChartConsole — revisão painel-por-painel, Tópico 3 (2026-07-29)

**Decisão consolidada** (2 achados, ambos em `navigation/spec.md`):

- **Acúmulo permanente + confiança que decai e se atualiza.** `exploredQuadrants`
  (previsto desde a seção 8.1, nunca usado em capability nenhuma) agora tem regra:
  LRS scan, sonda bem-sucedida, ou interrogatório (decisão #14) marcam quadrante como
  explorado, código KBS gravado. Diferente do LRS (sem memória própria), o registro
  do Star Chart é permanente — mas ganha **confiança que decai** (mesmo formato do
  LRS, taxa própria em aberto) porque inimigo se move e base pode ser destruída
  (achado do usuário: dado congelado pra sempre ficaria enganoso). Qualquer revelação
  nova da mesma quadrante (rescan, sonda, interrogatório, ou evento relatado tipo
  "base destruída") reseta confiança pra 100% e atualiza o código. Desenhado de
  propósito genérico o bastante pra já dar suporte à mecânica ambiente de Klingons
  destruindo bases (seção 14.3, ainda adiada) quando ela existir — só reusa essa
  mesma operação de refresh + entrada no combat log, sem replumbing depois.
- **"Snd to Helm" manual** (Star Chart e LRS) — clicar numa célula e mandar pro Helm
  preenche `destination`, mesmo efeito do "Auto-Navigate to nearest base", só que
  escolha manual em vez de auto-seleção. Nunca tinha virado requirement próprio.

Detalhe completo em `specs/navigation/spec.md` ("Star Chart accumulates explored
quadrants permanently", "Star Chart entries carry confidence...", "Manual 'Send to
Helm'...").

### 17. WeaponsConsole — revisão painel-por-painel, Tópico 4 (2026-07-29)

**Achado inicial:** phaser targeting não existia em lugar nenhum — nem no mock
(`firePhasers()` só somava `phaserTemp`, nunca tocava `enemyTargets`; botão "Lock"
era no-op literal, `lockedTargets.value = Math.max(0, lockedTargets.value)`), nem em
`specs/combat/spec.md` (texto original dizia só "apply damage to **the** targeted
enemy", singular, sem dizer como esse alvo era escolhido). Verificado contra o
código-fonte primário (`sst_original.bas` 4250-4670): o clássico não tem seleção de
alvo pra phaser — jogador digita energia total, motor divide igual entre TODOS os
Klingons do setor (`H1=INT(X/K3)`) e aplica dano em todos automaticamente.

**Decisão consolidada:**

- **Splash clássico confirmado:** phaser divide a potência selecionada igualmente
  entre todos os inimigos atualmente visíveis (não cloacados) do setor, dano por alvo
  reaproveitando o formato de rolagem aleatória escalada por distância do original,
  depois escalado de novo pela efetividade de calor já existente.
- **Weapons Lock — novo estado, obrigatório pra disparar phaser.** Auto-adquirido de
  graça ao entrar num setor com ao menos 1 hostil visível. Perdido quando: todos os
  alvos travados saem/cloacam, OU pela rolagem de dano de sensor abaixo. Reaquisição
  manual via botão "Lock" agora tem efeito de verdade — custa exatamente 1 turno,
  mesma classe de custo de Hail/Send Party/Dock.
- **Primeira resolução concreta do "Subsystem Integrity cross-panel effects"**
  (open question mais antiga do design, herdada da seção 14.3): dano em
  `Short-Range Sensors` (subsistema já existente em `EngineeringConsole.vue`) agora
  tem efeito cruzado real — abaixo de integridade "Nominal", rolagem por turno
  (chance escalando com o dano, número exato em aberto) pode derrubar um
  `weaponsLocked` ativo. Escopo é só esse elo específico; o restante da pergunta
  (Warp Engines → Helm, etc.) continua em aberto.
- **Novo subtipo de inimigo, `Cloaked Raider`** (distinto do Klingon padrão — cloak
  como tech de outra potência no canon original, não do Klingon clássico). Cloacado:
  invisível por completo (some de SRS/LRS/Star Chart, como se não existisse),
  intargetável (fora da splash de phaser e do Cycle de torpedo), e não ataca.
  Estresse de cloak reaproveita o mesmo formato de tabela de estresse transitório já
  criado pro Warp Core do jogador (decisão #13) — nenhuma curva nova. Atingir o teto
  força decloak automático e inofensivo (sem risco de autodestruição, opção
  descartada abaixo) + cooldown antes de poder cloacar de novo.

**Alternativas descartadas:**
- Seleção manual de alvo pra phaser (clicar em inimigos no scanner pra restringir a
  divisão de energia, tipo os tubos de torpedo). Rejeitada — usuário confirmou querer
  o cálculo clássico (splash em todos), não uma reinterpretação seletiva.
- Perda de lock por faixa de integridade (Nominal/Damaged/Critical, determinístico,
  reaproveitando o padrão de 3 cores já usado em phaserTemp/torpedoStock). Rejeitada
  a favor de rolagem por turno com chance escalando — usuário preferiu esse
  tratamento, consistente com as demais constantes de probabilidade ainda em aberto
  nesta mudança (Hail, sonda, Tribbles).
- Cloak aplicável a qualquer Klingon (habilidade genérica). Rejeitada — usuário
  preferiu isolar num subtipo novo (`Cloaked Raider`), mais fiel à origem canônica da
  tecnologia de cloak.
- Blip fantasma nos sensores enquanto cloacado (detectável, não mirável). Rejeitada —
  usuário escolheu invisibilidade total, setor aparece vazio.
- Risco crescente de autodestruição ao atingir o teto de estresse do cloak (reusando
  a tabela de chance de explosão do WC). Rejeitada em favor do decloak forçado sem
  risco — mantém a mecânica mais simples, só limita duração.

Detalhe completo em `specs/combat/spec.md` ("Phaser fire splashes across all locked,
visible enemies", "Weapons Lock gates phaser fire", "Weapons Lock degrades with
Short-Range Sensors damage", "Cloaked Raider — undetectable while cloaked", "Cloak
duration is bounded by stress...").

### 18. ShieldConsole — revisão painel-por-painel, Tópico 5 (2026-07-29)

**Achado:** `EnterpriseShieldSvg`'s 8 zonas (`ShieldZoneKey`) têm 7 chaves batendo
1:1 com `subsystems` real do `EngineeringConsole.vue` (warp/srs/lrs/phasers/
photons/shields/life) — hoje mock local sempre 100%, nunca ligado ao estado
compartilhado. A 8ª chave, `damage`, não bate com nada na lista atual de
subsistemas (Warp Core já é excluído de propósito, comentário no próprio
componente: "não é uma região do casco visível") e `SST_LCARS_SPECS.md` §12.5
nunca explica o que ela representa — zona órfã.

**Decisão consolidada:**

- **`damage` era o subsistema "Damage Control" standalone**, aposentado quando o
  jogo trocou pra 6 equipes de CdD — zona ficou sem dono desde então. Repropositada
  pro novo subsistema **Auto-Navigation Computer** (introduzido pela decisão #13,
  hoje só existe como 4º contribuinte de `subsystemDraw`, nunca ganhou entrada
  própria em `EngineeringConsole`/dispatch de CdD). Fecha duas lacunas com 1 golpe:
  zona órfã do SVG + Auto-Nav Computer sem integridade/dispatch.
  - **Bônus de consistência:** com essa 8ª entrada nova, Warp Core finalmente é
    de fato o "9º item" da lista de subsistemas — `damage-control/spec.md` já
    dizia isso desde a v1, mas a implementação real só tinha 8 no total (7 + WC).
    Agora bate.
- **Diagrama do casco lê estado real compartilhado**, não mock local — mesma
  correção-padrão já aplicada em todo domínio duplicado encontrado nesta revisão
  (posição, `mainEnergy`, `currentSector`).
- **Ajustes de energia do escudo (transfer/raise/lower) são de graça, sem custo de
  turno** — mesmo tratamento dos dials de Impulse/Phaser Power (decisões #13/#17):
  realocar energia entre subsistemas da própria nave não interage com o mundo
  externo, só ações que interagem (disparar, mover, atracar, hail, relock) custam
  turno.

**Alternativas descartadas:**
- Derivar `damage` como média dos outros 7 (resumo agregado, sem subsistema
  próprio). Rejeitada — usuário preferiu dar um dono de verdade à zona (Auto-Nav
  Computer), que também precisava de um lugar pra existir.
- Remover a zona, deixando o SVG com 7. Rejeitada pelo mesmo motivo.
- Cada ajuste de escudo custar 1 turno (fiel ao padrão de 1 comando = 1 turno do
  clássico). Rejeitada — usuário confirmou o padrão já estabelecido pros outros
  dials (ajuste livre, só ação que interage com o mundo externo custa turno).

Detalhe completo em `specs/shields/spec.md` ("Hull diagram reflects real subsystem
integrity", "Shield energy adjustments are free") e `specs/damage-control/spec.md`
("Auto-Navigation Computer is a dispatchable subsystem").

### 19. EngineeringConsole — revisão painel-por-painel, Tópico 6 (2026-07-29)

**Decisão consolidada:**

- **"Subsystem Integrity cross-panel effects" continua Non-Goal desta mudança**
  (confirmado de novo, mesmo estando no painel dono da integridade) — só a exceção
  pontual SRS→Weapons Lock (decisão #17) fica dentro do escopo. Resto (Warp
  Engines→velocidade no Helm, Phaser Banks→dano extra, Photon Tubes→tubos offline,
  Shield Control→cap de energia, Life Support→??) segue como Open Question pra
  mudança futura, sem mudança nesta rodada.
- **`cooldown` de equipe de CdD é mecânica real, não só mock** — achado: o mock tinha
  3 status (`idle`/`working`/`cooldown`) mas `damage-control/spec.md` só modelava
  fadiga contínua, sem gatilho pro 3º estado. Regra: equipe que bate no piso de 20%
  de eficiência e para de trabalhar entra em `cooldown` (dispatch rejeitado) em vez
  de `idle` direto — só sai do cooldown (vira `idle` de verdade) ao recuperar 50%+
  de eficiência pela regen normal de `+8%/turno`. Equipe acima do piso ao ser
  recolhida vai direto pra `idle`, sem cooldown. Motivo do usuário: equipe exaurida
  numa nave criticamente danificada não tem luxo de descanso completo antes de ser
  necessária de novo.

**Alternativas descartadas:**
- Expandir agora o cross-panel effects já que estamos no painel certo. Rejeitada —
  usuário preferiu manter o Non-Goal já declarado, evitando inflar ainda mais uma
  mudança já grande.
- Remover o 3º estado (`cooldown`), fadiga só via efficiency% contínua (`idle`/
  `working`). Rejeitada — usuário confirmou que é mecânica real, não mock órfão.

Detalhe completo em `specs/damage-control/spec.md` ("Exhausted teams enter forced
cooldown before redispatch").

### 20. SituationPanel — revisão painel-por-painel, Tópico 7 (2026-07-29)

**Decisão:** fecha a pendência aberta desde a decisão #14 (indicador de
prisioneiros/vagas na cela, layout adiado até chegar neste tópico). Grid de 4
colunas hoje: A e B já têm 4 linhas cheias cada (Energy/Enemies/Torpedoes/Warp
Core | Stardate/Starbases/Shields/Overload); C só tem 1 linha (Red Alert), D é o
Combat Log. Indicador vira 2ª linha da coluna C, mesmo padrão visual das outras
linhas, valor `count/capacity`, cor crítica quando a cela está cheia (mesmo padrão
nominal/damaged/critical já usado em Overload/Warp Core). Somente leitura, sem
interação — igual todo o resto do painel fora do toggle de Red Alert. Nenhum
requirement novo em `specs/` (dado já existe via `combat` capability, "Brig has
limited prisoner capacity"; isso é só posicionamento de UI), registrado como
detalhe de implementação em `tasks.md` (4.7).

Sem alternativas descartadas — colocação era a única lacuna real neste painel, o
resto (Red Alert bidirecional, Combat Log real) já tinha tarefa própria.

### 21. Mecânicas gerais — revisão painel-por-painel, Tópico 8 (2026-07-29)

**Achado:** a convenção de "custo de turno" (livre vs consome turno) estava
espalhada em 5 decisões diferentes (#13, #17, #18, Hail/Send Party/Dock/Undock)
sem nunca virar 1 regra explícita — risco real de cada console da Fase D
implementar isso de um jeito diferente. Ao formalizar, apareceu uma lacuna maior:
**não existe nenhum jeito de só deixar o tempo passar** — todo console de gameplay
só avança turno através de uma ação que TAMBÉM faz alguma outra coisa (atirar,
mover, hail...). Sem isso, esperar reparo de CdD, cooldown de boost, estresse de
cloak do `Cloaked Raider` estourar, ou missão de sonda/Send Party concluir, não tem
como acontecer sem o jogador forçar uma ação indesejada.

**Decisão consolidada:**

- **Regra única de custo de turno**, formalizada em `turn-engine/spec.md`: dials
  (Impulse/Phaser/Shield/Overload/Auto-Nav toggle) + dispatch de CdD são livres;
  Fire Phasers/Torpedoes, Hail, Lock, sonda, Send Party, engajar
  warp/impulso, e o gatilho de Dock consomem turno (1 ou a duração multi-turno já
  definida em cada decisão anterior). Undock continua livre.
- **Dispatch de CdD é livre, mas o reparo só conta a partir do turno seguinte** —
  equipe precisa "viajar" até o subsistema designado primeiro. Reatribuir antes do
  próximo turno resolver não acumula nada retroativo.
- **Novo: "End Turn"** — ação de passar exatamente 1 turno sem ação do jogador,
  exposta no `SituationPanel` (mesma coluna do Red Alert/prisioneiros, decisão #20),
  disponível independente de qual console está ativo.
- **Novo: "Skip N Turns"** — repete End Turn até N vezes, mas para cedo se: inimigo
  fica visível no setor, nave sofre qualquer dano, breach de radiação começa,
  qualquer condição terminal fica verdadeira, ou uma missão em andamento (sonda/
  Send Party) conclui. Evita o jogador "dormir" através de um evento importante.
- **2 amarrações finais entre decisões já fechadas** (não são decisões novas, só
  pontas soltas): `Cloaked Raider` cloacado agora também está explicitamente
  excluído de Hail (decisão #17 só cobria phaser splash + torpedo Cycle); estresse
  de cloak agora tem passo explícito no `turnEngine` (dentro do "Klingon MVP turn
  behavior", junto do turno inimigo).

**Alternativas descartadas:**
- Skip N Turns sempre completar os N turnos pedidos, sem parar cedo. Rejeitada —
  usuário preferiu o comportamento mais seguro (para automaticamente em qualquer
  evento relevante).
- Dispatch de CdD custar 1 turno (fiel ao 1-comando-por-turno clássico). Rejeitada
  — usuário confirmou que é livre, só o reparo em si é que tem atraso de 1 turno.

Detalhe completo em `specs/turn-engine/spec.md` ("Free adjustments vs
turn-consuming actions", "End Turn...", "Skip N Turns..."), `specs/damage-control/
spec.md` ("Dispatch is free, but repair begins next turn"), `specs/combat/spec.md`
(exclusão de Hail no `Cloaked Raider`).

### 22. Revisão de balanceamento, Passada 1 — direto do código-fonte original (2026-07-29)

**Contexto:** com os 8 tópicos de revisão painel-por-painel fechados, usuário pediu
uma segunda rodada — revisar/estimar as constantes e fórmulas ainda em aberto antes
de implementar, aproveitando o acesso ao BASIC original já baixado
(`vintage-basic.net/bcg/superstartrek.bas`, ver decisão #13). Plano de 4 passadas:
(1) direto do original, (2) mecânica análoga adaptada, (3) estimativa sem análogo,
(4) mecanismo em aberto (não é número). Esta entrada cobre a Passada 1.

**Achados e decisões (localizados nas linhas BASIC 5990-6200 "KLINGONS SHOOTING" e
2580-2700 "KLINGONS MOVE/FIRE ON MOVING STARSHIP"):**

- **Fórmula de dano do ataque inimigo, reaproveitada exata:** `H =
  INT((enemyPower/distânciaEuclidiana) × (2+RND(1)))` — mesmo formato de
  distância/aleatoriedade já usado pro phaser (decisão #17), mas a distância aqui é
  Euclidiana (métrica própria do original, distinta do Chebyshev que `navigation`
  usa pra movimento).
- **Poder do inimigo é 1 stat só, não 2** (`enemyPower`) — arma do jogador reduz E o
  próprio ataque do inimigo também esgota (`enemyPower/(3+RND(0))` a cada disparo,
  achado que não estava em nenhuma decisão anterior). Confirmado com o usuário:
  reusar exatamente essa mecânica dupla-função do original, não separar em
  "power"/"health".
- **Constante de poder inicial reusada direto:** `enemyPower = 200×(0.5+RND(1))`
  (100-300), do `S9=200` do original — já bate de escala com nossa energia
  (escudo máx 2500, `WARP_CORE_OUTPUT` 4500 vs. `E0=3000` do original), sem reescalar.
- **Dano em subsistema por acerto forte, reaproveitado exato:** só rola se `H>=20` E
  `RND(1)<=0.6` E `H/escudoAtual>0.02`; se passar, 1 subsistema aleatório perde
  `H/escudoAtual + 0.5×RND(1)`.
- **Reposicionamento do inimigo corrigido pra bater com o original:** não é "chance
  pequena por turno" (como o rascunho anterior do `turn-engine/spec.md` dizia) — é
  **determinístico**, só dispara quando a ação do turno do jogador é engajar
  movimento (warp/impulso), antes do deslocamento resolver. Confirmado com o
  usuário: reusar o gatilho exato do original em vez do genérico.
- **Confirmação de graça, sem mudança de spec:** o contra-ataque no original só é
  chamado depois de Fire Phasers/Torpedoes/tentativa de movimento — nunca depois de
  ajuste de escudo (SHE) ou consulta — bate exatamente com a decisão #18 (escudo
  livre), vindo direto da fonte primária, não precisou de correção nenhuma.
- **`starbasesLeft` inicial corrigido de 14 pra 5:** conferi a geração de galáxia do
  original (2 base + ~4% de chance por quadrante em 64 quadrantes) — expectativa é
  ~4-5 starbases, não 14. 14 provavelmente era placeholder de fase anterior nunca
  checado contra o original; deixaria o pool de recursos/docking (decisão #8) bem
  menos relevante do que pretendido. `enemiesLeft=12` já estava próximo do esperado
  do original (~17) e não foi alterado (usuário só sinalizou `starbasesLeft`).

**Alternativas descartadas:**
- Separar `enemyPower` em 2 stats (ataque vs vida). Rejeitada — usuário confirmou
  reusar o stat único do original.
- Manter reposicionamento como rolagem de chance genérica por turno. Rejeitada —
  usuário preferiu o gatilho exato (só em movimento) do original.
- Manter `starbasesLeft=14`. Rejeitada — usuário confirmou ajustar pra perto do
  esperado pelo original.

Detalhe completo em `specs/turn-engine/spec.md` ("Klingon attack damage...",
"Random subsystem damage on a strong hit", "Enemy repositions when the player
engages movement"), `specs/combat/spec.md` ("Enemy power is a single stat..."),
`specs/game-state-store/spec.md` (`starbasesLeft` corrigido).

### 23. Revisão de balanceamento, Passada 3 — estimativas justificadas (2026-07-29)

**Contexto:** Passada 2 (mecânica análoga no original) não achou nenhum precedente
real pros 3 itens propostos (estresse de warp, pool de recursos da base, risco de
sonda/landing party em setor hostil — original não tem nenhum dos três conceitos) —
foram incorporados aqui na Passada 3 junto com os itens que já eram estimativa pura
(Hail, cela, interrogatório, `klingonsCaptured`, dilítio, boost, Tribbles, Weapons
Lock, cloak). Todos os valores abaixo são **ponto de partida pra playtesting**, não
números finais — mesmo tratamento dado a toda constante de balanceamento nesta
mudança, só que agora com um valor concreto em vez de "em aberto".

**Valores fechados** (coerentes com escalas já decididas: dial 0-20 do overload,
tabela Fibonacci do WC, tier 5×5=25pts/turno do CdD — decisão #8, energia
2500-4500):

| Constante | Valor | Onde |
|---|---|---|
| Estresse de warp/ponto acima de warp 4 | `+2` overload-pontos | `navigation` |
| Pool de recursos da base (capacidade) | `500` | `docking` |
| Regen do pool da base | `+10`/turno (só quando não sacado) | `docking` |
| Chance de destruição (sonda/landing party) em setor hostil | `40% + 5%`/inimigo adicional | `navigation` + `damage-control` |
| Chance de sucesso do Hail (rendição) | `30%` | `combat` |
| Capacidade da cela (brig) | `4` | `combat` |
| Chance de interrogatório | `50%` | `combat` |
| Multiplicador `klingonsCaptured` no rating | `1.5×` (vs `1×` de `klingonsDestroyed`) | `end-game` |
| Rendimento de WC do dilítio (Send Party) | `+30` integridade, instantâneo | `damage-control` |
| Duração máx. do boost | `5` turnos | `navigation` |
| Cooldown do boost | `1.5×` turnos usados (ajustado do 2× proposto originalmente) | `navigation` |
| Teto de render dos Tribbles | `200` ícones (população interna segue dobrando sem limite) | `save-integrity` |
| Chance/turno de perder Weapons Lock | `(100-integridadeSRS)×0.5%` | `combat` |
| Estresse de cloak/turno | `+4`/turno, teto 20 (= 5 turnos cloacado) | `combat` |
| Cooldown pós-decloak forçado | `8` turnos | `combat` |

**Nova mecânica, não estava em nenhuma lista anterior — surgiu ao fechar a
capacidade da cela:** usuário levantou que prisioneiros exigem segurança. Em vez de
inventar um stat de tripulação/segurança novo, reaproveita o pool já escasso de CdD
(6 equipes): **enquanto a cela tiver ≥1 prisioneiro, 1 equipe de CdD fica travada em
"guarda", fora do pool de dispatch**, liberada de volta assim que a cela zerar. Não
escala com quantidade de prisioneiros (sempre só 1 equipe presa, não mais). Dá custo
contínuo à captura (além do risco inicial do Hail), e aumenta a urgência de resolver
o mecanismo de liberação da cela (ainda em aberto, Passada 4).

**Alternativas descartadas:**
- Cooldown do boost em `2×` turnos usados (proposta inicial). Rejeitada — usuário
  pediu `1.5×`.
- Chance de destruição da sonda fixa em 40%, sem escalar com número de inimigos.
  Rejeitada — usuário pediu `+5%` por inimigo adicional no setor (mais naves, mais
  chance de uma delas interceptar).
- Não adicionar nenhum custo pela cela de prisioneiros. Rejeitada — usuário
  levantou a necessidade de segurança; reaproveitar CdD (em vez de um stat novo de
  tripulação) foi a escolha consistente com o resto do design.

Detalhe completo em `specs/navigation/spec.md`, `specs/docking/spec.md`,
`specs/combat/spec.md`, `specs/damage-control/spec.md`, `specs/end-game/spec.md`,
`specs/save-integrity/spec.md` (todos os valores acima, cada um citando esta
decisão).

### 24. Revisão de balanceamento, Passada 4 — mecanismo de liberação da cela (2026-07-29)

**Contexto:** última pendência da revisão de balanceamento — não é constante, é
mecanismo (nunca decidido desde a decisão #14). Ganhou urgência com a decisão #23
(prisioneiro já custa 1 equipe de CdD travada em guarda o tempo todo).

**Decisão:** reaproveita docking (nenhuma UI nova) — ao atracar, a cela é esvaziada
automaticamente e de graça, nos 3 tipos de base (`STARBASE_DOCK`/`STARBASE_SUPPLY`/
`STARBASE_SCIENCE`), já que entregar prisioneiro é handoff administrativo, não
serviço de reparo/resupply que já diferencia por tipo. Equipe de guarda volta ao
pool no mesmo instante que a cela zera. Sem crédito extra de rating na entrega — o
`klingonsCaptured` já foi contado na captura, não na entrega, evita contar o mesmo
prisioneiro 2×.

**Alternativas descartadas:**
- Restringir entrega só a `STARBASE_DOCK` (mesma que faz o loop de reparo).
  Rejeitada — usuário preferiu qualquer uma das 3, já que é só handoff
  administrativo, sem exigir capacidade de reparo/resupply.

Detalhe completo em `specs/docking/spec.md` ("Prisoner transfer on docking (any
base type)").

Com isso, a revisão de balanceamento (4 passadas) está completa — todas as
constantes/mecanismos que estavam em aberto antes da Fase 4 agora têm valor ou
desenho concreto, prontos pra implementação e ajuste fino via playtesting real.

### 25. Budget de energia — todos os 9 subsistemas contribuem (2026-07-29)

**Contexto:** usuário perguntou, depois da revisão completa, como ficou o budget de
consumo vs. geração do WC. Achado: `energy-management/spec.md` só somava 4 dos 9
subsistemas (Impulse/Phaser/Shield/Auto-Nav); os outros 5 (SRS, LRS, Photon Tubes,
Life Support, Warp Core) não tinham nenhum consumo modelado, apesar de
`SST_LCARS_SPECS.md` §10.1 já ter flagado isso como pré-requisito técnico desde
antes desta revisão inteira — nunca virou decisão de verdade. Achou também 2 bugs
de escala: `impulsePower` é 0-100% (sem conversão pra unidade de energia, não dava
pra somar com o 0-3000 do Phaser) e o texto antigo falava em "active shield
transfer" (ação instantânea, decisão #18) como se fosse um draw contínuo por turno
— contradição não resolvida antes.

**Decisão consolidada:**

- **`IMPULSE_POWER_MAX = 2000`** — converte o dial 0-100% do Impulse pra unidade de
  energia (mesma escala do Phaser/WC). Boost força 100% efetivo (2000), mesmo
  cálculo do `boostedImpulsePower` já existente.
- **Shield vira draw pelo nível mantido (`shieldEnergy`), não pela transferência** —
  resolve a contradição: transferir continua livre/instantâneo (decisão #18), mas o
  nível resultante taxa o `subsystemDraw` todo turno enquanto mantido, igual o
  trope "escudos levantados custam energia".
- **Photon Tubes ganha draw passivo (`50`/turno armado) + ativo (`2`/torpedo
  disparado, reaproveitado direto do `E=E-2` do original).**
- **SRS e LRS ganham draw passivo (`100`/turno cada) + toggle on/off explícito**
  (ação livre, mesmo padrão do toggle do Auto-Nav Computer) — usuário escolheu a
  visão completa do §10.1 em vez de só taxa fixa sem controle. Desligar libera o
  draw mas desativa a função (SRS off = grid do NavSensing em branco + força
  `weaponsLocked` indisponível; LRS off = sem novo scan, dado antigo congela).
- **Photon Tubes também ganha o mesmo toggle**, por simetria/simplicidade de regra
  (3 sistemas "não-essenciais" com toggle, em vez de tratar cada um diferente) —
  desligado, sem disparo de torpedo.
- **Life Support (`150`/turno) e Warp Core (`50`/turno, "house load" do próprio
  reator) ficam sempre ligados, sem toggle** — críticos, sem opção de desligar.
- **Confirmado (não precisou de nova decisão, só validação):** Armas+Escudo+Impulso
  com boost, todos no máximo simultaneamente, somam 7500 — já excede os 4500 do WC
  sozinhos, sem precisar de nenhum draw passivo — confirma a intenção do usuário
  ("devem exigir overload") sem precisar inflar mais nenhum número.

**Alternativas descartadas:**
- Só taxa fixa passiva pros 5 subsistemas sem toggle nenhum. Rejeitada — usuário
  quis a visão completa (liga/desliga), mais fiel ao §10.1 original.
- Manter Shield como draw pela ação de transferência. Rejeitada — contradição com
  ação livre/instantânea (decisão #18) exigia resolução; nível mantido é a leitura
  coerente.

Detalhe completo em `specs/energy-management/spec.md` ("All 9 subsystems
contribute to subsystemDraw", "Non-essential subsystems can be toggled off"),
cross-referência em `specs/combat/spec.md` (Weapons Lock vs. SRS desligado).

### 26. SituationPanel "Energy Level" = mainEnergy disponível, não subsystemDraw (2026-07-29)

**Achado:** indicador "Energy Level" (coluna A) é hoje prop mock (`3000`, status
nominal/caution/critical crescente — "quanto maior melhor"), sem nenhum requirement
em `specs/` dizendo de onde vem. Padrão de status batia com uma reserva que
esgota, não com um total consumido (que seria "quanto maior pior", igual Overload).

**Decisão:** widget mostra `mainEnergy` — a reserva depletável (docking reabastece,
`mainEnergy<=0` é condição de fim de jogo), a mesma leitura que `EngineeringConsole`
já usa pros seus limiares nominal/caution/critical. Não mostra `subsystemDraw`
(consumo agregado dos 9 subsistemas) — isso já tem casa própria no
`EngineeringConsole` (produzido vs. consumido, decisão #25); o `SituationPanel` é
um resumo rápido de "quanto combustível resta", painel separado do detalhamento de
Engenharia.

Sem alternativas descartadas — única leitura coerente com o padrão de cor já
usado no resto do painel.

Requirement novo em `specs/energy-management/spec.md` ("Shared energy pool" ganha
`SituationPanel` como leitor + cenário dedicado), task 4.7 atualizada.

### 27. Combat Log — abas piscando por categoria não lida + posição de scroll (2026-07-29)

**Achado:** `CombatLog.vue` hoje sempre faz `scrollTop = scrollHeight` a cada
mudança em `entries` — pula pro fim mesmo se o jogador não viu as mensagens
anteriores. As 3 abas de categoria (`captain`/`general`/`engineering`, em
`SituationPanel.vue`) não têm nenhuma noção de lido/não lido.

**Pergunta levantada:** o que marca uma categoria como lida — abrir a aba, ou
rolar até o fim?

**Decisão:** só rolar até o fim da lista, com aquela aba ativa, marca a
categoria como lida. Abrir a aba sozinho não zera o pisca-pisca. Modelo de
dado: `GameState` ganha um marcador por categoria (contagem de entradas lidas);
categoria é "não lida" quando seu total filtrado > marcador. Consequência
direta: o auto-scroll-pro-fim atual precisa sair — se ele continuasse, toda
entrada nova marcaria como lida automaticamente e o pisca-pisca nunca
apareceria. No lugar, a posição de scroll passa a só mudar por ação do próprio
jogador (rolar), preservando "onde parei de ler" — se uma entrada nova chega
numa categoria que o jogador já rolou parcialmente, a tela não pula, e passa
a haver diferença visível entre o que já foi visto e o que é novo.

**Alternativas descartadas:**
- Marcar como lido só de abrir a aba. Rejeitada pelo usuário — não garante que
  o jogador realmente viu o conteúdo, só que clicou.

Requirement novo em `specs/game-state-store/spec.md` ("Combat Log unread
tracking per category"), tasks 1.1 (campo no `GameState`) e 4.7/4.7.1
(`SituationPanel.vue` pisca a aba, `CombatLog.vue` perde o auto-scroll e ganha
handler de scroll).

### 28. Auto-Navigation Computer — draw de energia nunca quantificado (2026-07-29)

**Achado:** ao checar o budget de cruzeiro (impulso 50%/warp 4/escudo 50%),
`energy-management/spec.md` dizia só "unchanged, contributes only while engaged"
pro Auto-Nav — mas ele nunca teve valor nenhum antes da decisão #25 (subsistema
foi introduzido na decisão #13, draw de energia só virou modelo real na #25, e
ficou órfão na travessia entre as duas).

**Decisão:** `100`/turno engajado — mesmo patamar do passivo de SRS/LRS, reusa
escala existente em vez de inventar uma nova (mesmo princípio de todas as outras
constantes estimadas desta mudança). Ponto de partida pra playtesting, como o
resto.

Sem alternativas descartadas — não havia âncora melhor que o próprio padrão já
estabelecido pros outros passivos de sensor/computador.

Requirement atualizado em `specs/energy-management/spec.md` (bullet do Auto-Nav)
e `specs/navigation/spec.md` (cenário "Auto-nav draws extra energy every turn
it's active"), task 2.3 atualizada.

### 29. Overload efetivo — unifica manualOverload + autoOverload + estresse de warp (2026-07-29)

**Achado:** ao calcular cenários de overload leve/moderado/perigoso pro cruzeiro
seguro, apareceu uma contradição real entre 2 specs: `energy-management/spec.md`
dizia "overload total = `manualOverload + autoOverload`"; `turn-engine/spec.md`
dizia "overload efetivo (o que alimenta `WARP_CORE_DAMAGE_TABLE`/explosão) =
`manualOverload` + estresse de warp". Nenhuma das duas somava as 3 fontes juntas
— na prática, `autoOverload` (o gatilho inteiro da decisão #25, "armas+escudo+
impulso boost forçam overload") nunca chegava a afetar dano/explosão de verdade.

**Decisão:** overload efetivo vira `manualOverload + autoOverload + estresse
transitório de warp`, somados e travados em `[0, 20]` antes de indexar
`WARP_CORE_DAMAGE_TABLE`/`WARP_CORE_EXPLOSION_CHANCE_TABLE` (só têm entradas
0-20, confirmado pelo cap de explosão a 20). Sem essa trava, consumo muito acima
do output poderia gerar um índice fora da tabela.

Sem alternativas descartadas — única leitura que faz a decisão #25 valer
alguma coisa de verdade (senão o over-consumption só mudava um número decorativo
em Engineering, sem consequência real).

Requirement corrigido em `specs/turn-engine/spec.md` ("Warp Core overload and
breach rolls", novo cenário "Over-consumption alone can trigger the damage/
explosion roll") e `specs/energy-management/spec.md` (aponta pra fórmula
unificada em vez de repetir uma versão incompleta); task 2.3 atualizada.

### 30. Resfriamento passivo de phaserTemp (2026-07-29)

**Achado:** ao revisar as fórmulas de phaser (dano/efetividade/regeneração),
`phaserTemp` tinha fórmula de aquecimento completa (+30/tiro, cap 270,
efetividade `max(0,100-phaserTemp/2.7)`) mas nenhuma de resfriamento — nem em
spec, nem no código atual (`WeaponsConsole.vue` só soma, nunca subtrai). Sem
fonte no original 1978 (não existe conceito de temperatura de phaser lá).

**Decisão:** resfriamento passivo, automático, sem custo de turno nem ação do
jogador: `-30`/turno em qualquer turno sem disparo (mesma magnitude do
aquecimento por tiro, decaimento simétrico — fácil de explicar: 1 turno sem
atirar desfaz 1 tiro de calor). Ponto de partida pra playtesting, como as
demais constantes desta mudança.

**Alternativas descartadas:**
- Resfriamento só via equipe de CdD despachada pro Phaser Banks (reusaria o
  sistema de reparo existente). Rejeitada — usuário preferiu passivo simples,
  sem criar mais uma demanda pra escassa equipe de CdD.

Requirement novo em `specs/combat/spec.md` ("Phaser banks cool down passively
when not fired"), task 2.4 atualizada.

### 31. Torpedo — dano, custo de turno pra carregar/descarregar, draw proporcional (2026-07-29)

**Achado:** revisão das fórmulas de torpedo achou 3 lacunas reais nunca
fechadas: (1) nenhum valor de dano de torpedo existia em specs — só o dano de
phaser e o ataque Klingon tinham fórmula; (2) carregar/descarregar tubo
(`loadTube`/`unloadTube`) nunca aparecia na lista de ações livre-vs-turno,
implicitamente tratado como livre no mock atual; (3) Photon Tubes tinha um
draw passivo fixo (`50`/turno "enquanto armado", decisão #25) que não escalava
com quantos tubos estavam realmente carregados — ficou órfão quando o usuário
pediu o modelo dos 9 subsistemas.

**Decisão:**
- **Dano**: `200 + random(0,1)×100` (200-300, roll por tiro, não fixo — usuário
  preferiu variação ao valor fixo de 250 que eu tinha sugerido). Sem redução por
  `phaserTemp` (subsistema separado do Phaser Banks) e sem split entre alvos
  (cada tubo carregado atira seu próprio roll pro seu próprio alvo mapeado).
  Faixa dimensionada contra o teto de `enemyPower` (100-300, decisão #22): o
  piso do roll (200) já garante destruir qualquer inimigo até a média de
  spawn (200) em 1 tiro; o teto (300) deixa só um resto pequeno nos spawns mais
  fortes — bate com "destrói menores, quase destrói maiores num tiro" (pedido
  do usuário). Original de 1978 não tem fórmula equivalente (torpedo lá é
  hit/miss binário contra um "existe/não existe", não uma rolagem de dano
  contra um stat) — formula nova, não estimativa contra fonte.
- **Custo de turno**: carregar OU descarregar um tubo passa a custar 1 turno
  cada (antes implicitamente livre no mock) — vai pra lista de ações
  turn-consuming em `turn-engine/spec.md`, ao lado de Fire Torpedoes.
- **Draw proporcional**: Photon Tubes passivo vira `20`/turno **por tubo
  carregado** (tubo vazio não consome nada), não mais um flat `50` "enquanto
  armado" — reflete a justificativa do próprio usuário (ignição pré-aquecida +
  link de sensores por tubo pronto pra disparar). Com os 3 tubos do mock atual,
  todos carregados = `60`/turno, próximo da ordem de grandeza do flat anterior
  (`50`) — não reabre o cálculo de budget de cruzeiro já fechado antes.

**Alternativas descartadas:**
- Dano fixo (`250`). Rejeitada pelo usuário — preferiu variação tiro a tiro.

Requirement novo em `specs/combat/spec.md` ("Torpedo damage is massive and
randomized, no heat penalty"), `specs/turn-engine/spec.md` (load/unload tubo
na lista turn-consuming), `specs/energy-management/spec.md` (Photon Tubes
bullet + 2 cenários novos); tasks 2.3/2.4/4.3 atualizadas.

### 32. Correção: tubo vazio também consome, em standby (2026-07-29)

**Achado:** decisão #31 zerou o draw de tubo vazio (`0`/turno), mas o mecanismo
de carregamento em si fica ativo/pronto mesmo sem torpedo dentro — não é
"desligado", só sem munição.

**Decisão:** todo tubo, vazio ou carregado, consome `5`/turno em standby
enquanto Photon Tubes estiver ligado; um tubo **carregado** consome `20`/turno
no lugar do `5` (não somam — o `20` já cobre o standby do próprio mecanismo
mais o torpedo primed). Com os 3 tubos do mock: todos vazios = `15`/turno
(antes seria `0`); todos carregados = `60`/turno (sem mudança vs. decisão #31).

Sem alternativas descartadas — correção direta do usuário sobre a decisão
anterior, sem fork.

Requirement corrigido em `specs/energy-management/spec.md` (bullet Photon
Tubes + cenários "Photon Tubes draw scales..."/"Empty tubes still draw a small
idle amount"); tasks 2.3/4.3 atualizadas.

### 33. Sons de UI — biblioteca de áudio ligada a ações (2026-07-29)

**Contexto:** fora do escopo original da revisão (painel-por-painel +
balanceamento), usuário pediu uma leva de feedback sonoro usando os arquivos já
existentes em `vue-app/src/assets/audio/`. Implementado direto no código (não
é mecânica de jogo, é UI), registrado aqui só pra rastrear a decisão de mapear
arquivo→ação.

**Decisão:** `composables/useSound.ts` novo (cache de `Audio()` por chave,
corte de duração opcional via `maxDuration`). Mapeamento arquivo→ação:
- `computerbeep_17.mp3` → clique de botão (`Sound.CONFIRM`, todo `LcarsButton`/
  `LcarsComplexButton`)
- `tactinput_neg_acknowledge.webm` → clique em botão desabilitado
  (`Sound.DENY`) — exigiu `pointer-events:auto` local em `LcarsButton.vue`
  pra sobrepor o `.disabled` global (que tem `pointer-events:none`), senão o
  clique nem chegava no handler
- `tos_red_alert.mp3` → Red Alert ligando (`SituationPanel.vue`), cortado em
  5s (longo demais pra repetir toda vez)
- `tng_warp3_clean.mp3`/`tng_warp_exit.mp3` → engajar/desengajar warp
  (`HelmConsole.vue`, toggle único `engageWarp()`)
- `tos_ship_phaseer_2.mp3` → disparo de phaser (`WeaponsConsole.vue`), cortado
  em 3s
- `tos_photon_torpedo.mp3` → disparo de torpedo (só quando há tubo carregado)
- `probe_launch_1.mp3` → lançar sonda (`NavSensingConsole.vue`)
- `hailalert_1.mp3`/`tos_transporter1_top.mp3` → Hail/Send Party
  (`NavSensingConsole.vue` — mock já tinha os 2 botões como `console.log`,
  só faltava o som)
- `power_up2_clean.mp3`/`power_down.mp3` → ligar/desligar subsistema (toggle
  SRS/LRS/Photon Tubes/Auto-Nav) — registrado no composable agora, mas os
  toggles em si ainda não existem no mock (chegam nas tasks 4.3/4.5/4.6 da
  Fase 4); requirement anotado em `energy-management/spec.md` e
  `navigation/spec.md` pra não perder o vínculo até a implementação chegar lá

Sons não usados dos assets: `alert10.mp3` (variante de alerta não pedida) e
os pares acima ficam registrados, sem uso não pedido além do que está listado.

Sem alternativas descartadas — mapeamento 1:1 direto do nome do arquivo pra
ação, sem ambiguidade real além da escolha entre `tos_phaser_1.mp3`/
`tos_ship_phaseer_2.mp3` (usei o segundo por citar "ship" explicitamente).

Requirement novo em `specs/energy-management/spec.md` ("Non-essential
subsystems can be toggled off", 2 cenários) e `specs/navigation/spec.md`
("Auto-Navigation Computer"); task 4.5 atualizada. Implementação: `useSound.ts`
+ `LcarsButton.vue`/`LcarsComplexButton.vue`/`SituationPanel.vue`/
`HelmConsole.vue`/`WeaponsConsole.vue`/`NavSensingConsole.vue`.

### 34. Correção + extensão de sons (2026-07-29)

**Decisão:**
- `Sound.TRANSPORTER` (`tos_transporter1_top.mp3`) também é longo demais —
  cortado em 3s, mesmo mecanismo de `maxDuration` já usado em Red Alert/Phaser.
- `alert10.mp3` (até então sem uso) vira `Sound.WC_BREACH` — alarme de início
  de radiation breach, distinto do klaxon de Red Alert. Registrado no
  composable agora; o disparo em si depende do motor de breach ainda não
  implementado (`engine/turnEngine.ts`, task 3.1), então fica anotado na spec
  até a implementação chegar lá, mesmo tratamento dado a `POWER_UP`/
  `POWER_DOWN` na decisão #33.

Sem alternativas descartadas — correções diretas do usuário.

Requirement novo em `specs/turn-engine/spec.md` ("Warp Core overload and
breach rolls", cenário "Breach starting plays a distinct alarm cue"); task 3.1
atualizada; `useSound.ts` atualizado (`maxDuration` do transporter, nova
entrada `WC_BREACH`).

### 35. Subsystem Integrity reabre — Phaser Banks/Photon Tubes/Shield Control degradam efetividade (2026-07-29)

**Achado:** ao revisar se ainda havia questão em aberto antes de partir pra
implementação, o Non-Goal "Subsystem Integrity cross-panel" (decisão #19,
reconfirmado) apareceu na lista. Usuário decidiu reabrir pro trio de sistemas
de combate.

**Decisão:** base compartilhada `d = (100-integridade)/100` (0 saudável, 1
destruído), 3 bandas: **leve** (`d` 0-0.30, integridade 70-100), **moderado**
(`d` 0.30-0.60, integridade 40-70), **crítico** (`d`>0.60, integridade<40) —
o corte em 60% de dano pro crítico veio direto do usuário (pra phaser,
generalizei pros outros 2 por consistência, já que ele descreveu a mesma
estrutura leve/moderado/crítico pros 3). Efeitos contínuos (multiplicadores)
escalam com `d` desde o primeiro ponto de dano (já em "leve"); efeitos
probabilísticos (falha de carregar, flickering) só ativam a partir de
"moderado", usando `max(0,d-0.3)×100%` — 0% na fronteira leve/moderado,
30% na fronteira do crítico. Reusa a mesma forma linear já usada em
Weapons Lock/SRS (decisão #23) e o mesmo padrão de bandas 3-níveis já usado em
overload/eficiência de CdD na UI (nominal/damaged/critical).

Por sistema:
- **Phaser Banks**: calor por tiro `30×(1+d)`, resfriamento passivo `30×(1-d)`,
  dano final `×(1-d)` (empilha com a penalidade de calor, não substitui).
  Crítico: "Fire Phasers" rejeitado, paralisado.
- **Photon Tubes**: dano do torpedo `×(1-d)` (solução de tiro imprecisa, não
  ogiva mais fraca). A partir de moderado, carregar/descarregar tem
  `max(0,d-0.3)×100%` chance de falhar (turno ainda é gasto — decisão #31 —
  mas tubo não muda de estado, estoque não é debitado/creditado). Crítico:
  disparo e carregar/descarregar rejeitados, tubos congelados no estado atual.
- **Shield Control** (o subsistema, não `shieldIntegrity` — são conceitos
  diferentes: `shieldIntegrity` mede a força do próprio escudo defletor,
  `subsystems.shields` mede a saúde do hardware de controle, só este último
  degrada aqui): multiplica o draw de `shieldEnergy` por `×(1+d)` (mesma forma
  do calor de phaser). A partir de moderado, `max(0,d-0.3)×100%` chance/turno
  de "flickering" (`shieldStatus` força `DOWN` só naquele turno, restaura
  sozinho). Crítico: escudo forçado a 0 (mesmo efeito de "Lower Shields") e
  trava — não pode levantar de novo até reparar acima de 40.

**Alternativas descartadas:** nenhuma — usuário deu a estrutura qualitativa
completa (quais 3 sistemas, o que cada banda faz), só faltava a
parametrização numérica, preenchida reusando as formas já estabelecidas nesta
mudança. Warp Engines→velocidade no Helm e Life Support seguiam sem efeito
cross-panel neste momento — **revertido logo em seguida pela decisão #37**,
que fecha os 4 subsistemas restantes.

Requirement novo em `specs/combat/spec.md` ("Subsystem damage fraction...",
"Phaser Banks damage degrades...", "Photon Tubes damage degrades..."),
`specs/shields/spec.md` ("Shield Control damage increases draw..."),
cross-referência em `specs/energy-management/spec.md` (bullet Shield Control);
task 2.4 atualizada; item correspondente riscado em "Open Questions".

### 36. Revisão pré-`/opsx:apply` — plano de paralelismo desatualizado pela decisão #35 (2026-07-29)

**Achado:** usuário pediu revisão do plano de paralelismo antes de aplicar.
2 problemas reais:

1. **Dependência cruzada nova entre Fase B**: decisão #35 especificou o
   multiplicador de draw do Shield Control (`×(1+d)`) dentro de `combat/spec.md`
   (junto de Phaser Banks/Photon Tubes), mas esse multiplicador precisa entrar
   no cálculo de `subsystemDraw` de `warpCore.ts` (task 2.3) — se implementado
   como escrito, `warpCore.ts` precisaria importar de `combat.ts`, quebrando a
   garantia "Fase B sem dependência cruzada ENTRE si" que sustenta rodar até
   6 agentes em paralelo.
2. **Task 2.1 (`constants.ts`) desatualizada e mal-posicionada**: ainda listava
   `Photon Tubes 50` (valor pré-decisões #31/#32, deveria ser `5` standby/`20`
   carregado) e não citava o draw do Auto-Nav (`100`, decisão #28) — drift
   normal de várias decisões subsequentes não terem revisitado a task 2.1 a
   cada correção. Além disso, o diagrama FASE B do design.md nunca listava
   `constants.ts` como um dos arquivos paralelos, mas todos os outros 6 já
   dependiam dele implicitamente (constantes/tabelas) — omissão que só não
   doeu até agora porque nada em `constants.ts` dependia de lógica nova
   específica de outro arquivo da Fase B.

**Decisão:**
- `damageFraction(integrity)` + bandas leve/moderado/crítico + `degradedChance`
  viram funções puras em `engine/constants.ts` (task 2.1), não em `combat.ts`.
  `combat.ts` (2.4) e `warpCore.ts` (2.3) importam de `constants.ts`, nenhum dos
  2 importa do outro — restaura arquivos disjuntos na Fase B.
- `constants.ts` (2.1) vira explicitamente uma **sub-fase sequencial antes da
  Fase B** ("Fase A.1"), não mais um dos slots paralelos — é folha, só importa
  `types/game.ts`, e agora TEM lógica (as funções acima) que 2 arquivos
  paralelos precisam, então precisa fechar primeiro.
- Task 2.1 corrigida: `Photon Tubes 50` → `5`/turno standby + `20`/turno
  carregado (decisões #31/#32); Auto-Nav `100`/turno engajado (decisão #28)
  adicionado.
- Non-Goals do design.md atualizado: Subsystem Integrity cross-panel não é mais
  Non-Goal total — parcialmente resolvido (decisão #35) pros 3 sistemas de
  combate, ainda Non-Goal só pra Warp Engines→Helm e Life Support.

**Alternativas descartadas:**
- Deixar `warpCore.ts` importar de `combat.ts` diretamente. Rejeitada — é
  exatamente a dependência cruzada que o design inteiro foi desenhado pra
  evitar, sem necessidade real (a lógica é pura, cabe perfeitamente numa folha).

Sem mudança de comportamento/números — só reorganização de onde a lógica mora,
pra manter o paralelismo da Fase B íntegro. `openspec validate` seguiu limpo.
Diagrama FASE B do design.md atualizado (5 agentes em vez de 6, `constants.ts`
vira Fase A.1 sequencial); `save-integrity` continua podendo rodar solto, fora
da contagem.

### 37. Fecha os 4 subsistemas restantes — LRS, Auto-Nav, Warp Engines, Life Support (2026-07-29)

**Contexto:** logo depois de identificar (nesta mesma revisão pré-apply) que só
Phaser Banks/Photon Tubes/Shield Control tinham dano→efetividade especificado
(decisão #35), usuário pediu pra fechar os 4 subsistemas restantes que nunca
tinham sido marcados como Non-Goal — só ficaram de fora por omissão, não por
decisão consciente.

**Decisão, reusando a mesma base `d`/bandas da decisão #35** (mesmo
`damageFraction`/`degradedChance` de `constants.ts`, sem duplicar):

- **Long-Range Sensors**: decaimento de confiança (hoje `5%`/turno fixo) vira
  `5%×(1+d)`. Crítico: força "desligado" (mesmo efeito do toggle manual off —
  sem novo scan, dado existente congelado) e trava o toggle até reparar acima
  de 40 — mesmo padrão de trava já usado em Shield Control/LRS-por-toggle.
- **Auto-Navigation Computer**: draw `×(1+d)` (mesma forma do Shield Control).
  A partir de moderado, `max(0,d-0.3)×100%` chance/turno de "degradar a rota":
  em vez de recalcular contorno, cai pro comportamento de navegação manual
  (para na última célula livre antes do obstáculo) — reusa um requirement já
  existente em vez de inventar um novo tipo de falha. Crítico: paralisado,
  toggle rejeitado, viagem em andamento cai pra manual na hora.
- **Warp Engines** (1 subsistema cobrindo Impulso E Warp — mesmo hardware de
  propulsão, só 2 modos de operação): reduz teto efetivo dos dois
  (`IMPULSE_POWER_MAX×(1-d)`, `warpFactor` máx `floor(8×(1-d))`), com clamp
  automático se o valor selecionado ficar acima do novo teto. A partir de
  moderado, `max(0,d-0.3)×100%` chance/turno de estagnar (turno consumido, nave
  não avança — efetivamente estica a viagem em 1 turno). Crítico: paralisado,
  nem Impulso nem Warp engajam.
- **Life Support**: **não** usa o modelo genérico de bandas — usuário foi
  explícito que é "mecânica própria". Leve/moderado não fazem nada (decisão
  consciente, não omissão). Só crítico (integridade <40) importa: dispara
  contagem regressiva `lifeSupportTurnsRemaining=5`, decrementa 1/turno
  enquanto continuar crítica, limpa se reparada de volta a 40+, e — se chegar
  a 0 ainda crítica — condição de derrota nova ("crew asphyxiation"), inserida
  na posição 4 da prioridade Kobayashi Maru (entre morte por radiação e
  `mainEnergy<=0` — mesma categoria de "contagem regressiva chegando a zero"
  da morte por radiação, por isso vizinhas na prioridade).

**Alternativas descartadas:**
- Auto-Nav degradado inventar um novo tipo de falha de rota. Rejeitada — cair
  pro comportamento de navegação manual já especificado é mais simples e já
  testável/documentado, sem duplicar mecânica.
- Life Support usando as mesmas bandas leve/moderado dos outros. Rejeitada
  pelo próprio usuário — quis mecânica própria, só o crítico com timer.

Requirement novo em `specs/navigation/spec.md` (LRS/Auto-Nav/Warp Engines, 3
requirements), `specs/turn-engine/spec.md` ("Life Support critical damage
starts a 5-turn survival countdown"), `specs/end-game/spec.md` (motivo "crew
asphyxiation" na lista de derrota + prioridade renumerada 1-8),
`specs/energy-management/spec.md` (cross-ref no bullet Warp Engines),
`specs/game-state-store/spec.md` (`lifeSupportTurnsRemaining` no reset de New
Game); tasks 1.1/2.1/2.2/3.1/3.3 atualizadas; Non-Goals e Open Questions do
design.md fecham totalmente o item herdado da seção 14.3.

### 38. Revisão completa pós-implementação — escopo encolhe, dívida vira 2 mudanças (2026-07-29)

**Contexto:** depois de implementar Fases A/A.1/B (e uma primeira passada de C),
o usuário pediu revisão completa. Verificação real, não presumida: 86/86 testes
unitários passando, `vue-tsc` limpo em `engine`/`stores`/`types` (os 10 erros
restantes são todos pré-existentes em `src/stories/**`), nada commitado.

**Achado central — testes unitários verdes esconderam integração oca.** Cada
módulo foi testado contra si mesmo; nada exercita a composição. Concretamente:

1. **`navigation.ts` (445 linhas) e `damageControl.ts` (302 linhas) são órfãos** —
   importados por nada além dos próprios testes. Duas capabilities completas,
   testadas e inertes.
2. **Nenhum console chama ação nenhuma da store** — engine inalcançável pela UI.
3. **~12 comportamentos por turno ausentes no `turnEngine`**: sem reparo/fadiga
   de CdD, sem progressão de warp/sonda/boost, sem decaimento de sensores, sem
   tick de breach/cloak, `remainingProbes` nunca decrementa, sonda com duração
   hardcoded em 2 (spec: `distância + 1`), e `move_impulse`/`move_warp`/
   `send_party` declarados em `PlayerActionType` **sem ramo de implementação**
   (consomem turno e não fazem nada).
4. **`warpStress: 0` hardcoded** — ironia: `effectiveOverload()` está correto
   (soma manual+auto+stress, clampa 0-20; decisão #29 satisfeita na função), mas
   alimentado com zero, então metade da mecânica que a #29 existiu pra consertar
   segue inerte.
5. **Violação da decisão #36**: `damageControl.ts` importa `getVisibleEnemies` de
   `combat.ts` — irmãos da Fase B não podem se importar. Acoplamento pequeno,
   mas o invariante quebrou.
6. **O mundo do jogo não existe e nunca foi planejado**: `currentSector` e
   `starbases` inicializam vazios e nada os popula. Zero menção a geração/spawn
   em `tasks.md` ou em qualquer das 10 specs. Após 37 decisões, revisão
   painel-por-painel e 4 passadas de balanceamento, ninguém perguntou quem cria
   as entidades.

**Também verificado como CORRETO** (para não jogar fora o que está bom):
`endGame` com as 8 prioridades na ordem exata (asfixia na 4); `combat` com zero
`targetIndex` e 15 `targetId` (bug latente da decisão #6 realmente evitado);
`saveIntegrity` com o comentário obrigatório "NÃO É ANTI-CHEAT" e checksum em
chave própria fora do payload hasheado; `constants` com tabelas de 21 entradas,
caps 85/0.55 e bandas nas fronteiras exatas.

**Decisão (a pedido do usuário):** esta mudança **encolhe** pro que está pronto e
verificado — Fase A (`types/game.ts`), Fase A.1 (`constants.ts`) e Fase B (os 7
módulos + testes). A dívida sai em 2 mudanças novas:
- **`engine-integration`**: corrigir as lacunas do `turnEngine`, ligar os 2
  módulos órfãos, corrigir o import que viola a #36, ligar os 7 consoles
  (4.2–4.9), e verificação de ponta a ponta (Fase 5).
- **`world-generation`**: geração de galáxia, povoamento de setor, KBS, posição
  inicial válida, fluxo de New Game.

As tasks 3.1–3.4 ficam registradas como entregues-em-primeira-passada, não como
completas — a marca `[x]` original superdeclarava.

**Lição registrada:** o risco "Fase C é ponto sequencial único que pode virar
gargalo", já listado em Risks abaixo, se materializou de forma diferente da
prevista — não virou gargalo de tempo, virou gargalo de *completude*, e testes
unitários por módulo não detectam isso. `engine-integration` precisa de testes de
integração, não só unitários.

## Risks / Trade-offs

- **[Risco] `save-integrity` pode ser mal-entendido como segurança real por quem ler o
  código depois** → Mitigação: comentário explícito no topo de `saveIntegrity.ts`
  explicando o limite (chave sempre lível no bundle), igual já documentado na seção
  14.6 do specs. Não é negociável — não implementar sem esse comentário.
- **[Risco] Fase C (integração do `turnEngine.ts`) é um único ponto sequencial que
  pode virar gargalo** se a Fase B demorar mais do que o previsto → Mitigação: Fase C
  só precisa da ASSINATURA de cada função de B (não da implementação completa) pra
  começar a escrever a orquestração; pode começar com stubs e substituir conforme B
  termina, sem esperar tudo pronto.
- **[Risco] Mudança de shape do `GameState` depois que Fase B já começou** (ex:
  alguém percebe que falta um campo no meio da implementação) força retrabalho em
  paralelo → Mitigação: `types/game.ts` (Fase A) deve ser revisado contra as 10 specs
  ANTES de abrir a Fase B, não descoberto incrementalmente.
- **[Trade-off] `subsystemDraw` como `computed` reativo** (soma de Helm+Weapons+Shield)
  cria uma dependência circular de leitura entre consoles até a Fase D terminar todos
  os 7 — até lá, testar `energy-management` isoladamente exige mocks dos 3 valores de
  entrada, não dá pra validar end-to-end antes da Fase D completa.
- **[Risco] Remoção de props (`initialShieldEnergy`/`initialMainEnergy` etc, marcada
  BREAKING na proposta) quebra Storybook stories existentes** → Mitigação: ajuste das
  stories entra explicitamente nas tasks de Fase D de cada console (não é trabalho
  esquecido/implícito).

## Migration Plan

1. Fase A: fundação (`types/game.ts`, `stores/useGameState.ts` esqueleto) — sem
   remover nenhum mock local ainda, app continua funcionando como está.
1.1. Fase A.1: `engine/constants.ts` (folha — constantes + `damageFraction`/bandas
   da decisão #35) — fecha antes de abrir a Fase B (decisão #36).
2. Fase B: implementar os demais `engine/*.ts` em paralelo, com testes unitários
   próprios (funções puras, fáceis de testar sem Vue) — ainda sem consumidor real,
   zero risco de regressão visual.
3. Fase C: `turnEngine.ts` orquestra, `endGame.ts` fecha condições terminais.
4. Fase D: consoles trocam mock local por `useGameState`, 1 por vez ou em paralelo
   (arquivos disjuntos) — cada troca é uma mudança pequena e visualmente verificável
   (mesma técnica de screenshot via Electron já usada nesta sessão).
5. Rollback: cada fase é um commit próprio; reverter Fase D não quebra A/B/C (engine
   continua existindo, só não conectado); reverter B individualmente (ex:
   `save-integrity`) não afeta nenhuma outra capability, por design.

## Open Questions

- ~~Herdada da seção 14.3 (Non-Goal explícito, reconfirmado no Tópico 6/decisão
  #19): Subsystem Integrity danificado deveria afetar outros painéis?~~ —
  **totalmente resolvida** (decisões #35 e #37, 2026-07-29): dano gradua
  efetividade em 3 bandas (leve/moderado/crítico) nos 7 subsistemas de
  gameplay — Phaser Banks/Photon Tubes/Shield Control (#35) e LRS/Auto-Nav/
  Warp Engines/Life Support (#37, esta última com mecânica própria de
  contagem regressiva, não as bandas genéricas).
- ~~Fator de estresse de warp por ponto acima de warp 4~~ — **resolvida** (decisão
  #23: `+2` overload-pontos/ponto acima de warp 4, estimativa pra playtesting).
- ~~Duração máxima do boost + fórmula de cooldown~~ — **resolvida** (decisão #23:
  máx. 5 turnos, cooldown `1.5×` turnos usados).
- ~~Números da decisão #14 (Hail%, capacidade da cela, interrogatório%,
  multiplicador `klingonsCaptured`, rendimento de WC do dilítio)~~ — **resolvidas**
  (decisão #23: 30%, 4, 50%, 1.5×, +30 respectivamente).
- ~~Mecanismo de liberar/reduzir a cela de prisioneiros~~ — **resolvida** (decisão
  #24: entrega automática e de graça ao atracar, qualquer tipo de base).
- ~~Taxa de crescimento dos Tribbles + teto de performance~~ — **resolvida**
  (decisão #23: dobra por turno sem limite no dado interno, renderização trava em
  200 ícones).
- ~~Docking consome turno? / prioridade terminal~~ — **resolvidas** (decisões #7/#8).
- ~~Números do pool de recursos da base~~ — **resolvida** (decisão #23: cap 500,
  regen +10/turno quando não sacado).
- **IA Klingon caçando/destruindo bases pela galáxia, mecânica ambiente (adiada a
  pedido do usuário, 2026-07-29):** a decisão #8 introduz o CONCEITO de base ser
  destruível, mas só no caso "enquanto a nave está docada ali". Intenção maior
  (Klingons explorando a galáxia, atacando bases independente do jogador) é
  IA/balanceamento maior, explicitamente adiado pra mudança futura.
- ~~B.1 — Sonda usando relógio real~~ — **resolvida** (decisão #10).
- ~~Chance de destruição da sonda em setor hostil~~ — **resolvida** (decisão #23:
  `40% + 5%`/inimigo adicional, mesma fórmula reusada pro landing party).
- ~~Números da decisão #17 (chance de perder Weapons Lock, estresse de cloak)~~ —
  **resolvidas** (decisão #23: `(100-integridadeSRS)×0.5%`/turno; cloak `+4`/turno,
  teto 20 (5 turnos), cooldown 8 turnos).
