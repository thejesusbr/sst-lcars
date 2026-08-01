# Backlog — pendências registradas, sem change aberta

Ideias e dívidas que apareceram durante playthrough ou implementação e foram
**deliberadamente adiadas**. Não são bugs (esses viram change na hora) nem
tarefas de uma change ativa — são coisas que valem fazer e ainda não têm dono.

Estavam espalhadas pelos `design.md` das changes que as geraram, o que
funcionava pra justificar o Non-Goal daquela change e não pra achar a ideia
depois. Aqui ficam juntas.

**Como usar:** ao abrir uma change que cobre um item, apague o item daqui e
cite a origem no `proposal.md` dela.

## Ordem: engine primeiro, UI depois

Decisão de 31/07, e é ela que segura a maior parte desta lista.

Ajuste de UI só depois de a engine consolidar, porque **cada rodada de
playthrough tem pedido elemento novo** — indicador de Life Support, `SHD/PWR`
do inimigo, mostrador `T-n`, 3ª coluna de ciência, previsão de turnos. Mexer na
apresentação antes disso é retrabalho garantido: o layout muda de novo assim que
a rodada seguinte encontrar o que falta.

Vale inclusive pro **baseline de regressão visual**: montado agora, ele fixaria
uma foto de algo que ainda vai mudar, e cada elemento novo o invalidaria. Ele é
pré-requisito do refactor de CSS, não coisa a fazer antes dele.

Itens segurados por esta ordem: refactor de CSS scoped, baseline visual,
Briefing/manual, e os dois de antecipação de custo/tempo.

---

## Antecipação de custo e de tempo

O painel nunca diz o preço de uma ação **antes** de ela ser tomada. O jogador
decide no escuro e descobre no log.

### Consumo projetado do disparo de phaser

`subsystemDraw` só soma `phaserPower` no turno em que dispara, e o excedente
sobre o output do core vira `autoOverload` → dano → chance de explosão. A
mecânica está correta e verificada; o que falta é o aviso.

```
                                    consumo   overload   dano/turno
escudo 2500 + phaser 1500             4415        0          0     ← cabe raspando
escudo 2500 + phaser 3000             5915       10        1.10    ← estoura
```

O Engineering mostra "Core Output" e "Subsystem Load", mas a soma só reflete
**depois** do turno resolver. Faltaria mostrar no Weapons, antes de disparar,
que aquela potência estoura o orçamento — e quanto custa.

**Origem:** verificação do usuário, 31/07, depois da `combat-balance`.

### Previsão de turnos para warp e impulso

Com destino selecionado, mostrar quantos turnos a viagem vai levar, **antes** de
engajar. As duas fórmulas já existem no engine:

- **Warp:** `ceil(distância / warpFactor)` (`planWarpTrip`)
- **Impulso:** `ceil(distância / max(1, round(8 × dial/100)))`
  (`impulseCellsPerTurn`)

Hoje o jogador escolhe o fator de warp e o dial de impulso sem saber o que cada
posição compra em turnos — e o relógio da missão é o recurso mais escasso do
jogo. Ganha peso com a `mission-scaling`, que atou o relógio à frota: o custo em
turnos passou a ser a moeda real.

Vale mostrar no Helm (onde o fator/dial são ajustados) e/ou no StarChart e
NavSensing (onde o destino é escolhido).

**Origem:** pedido do usuário, 31/07.

---

## Ensino e apresentação

### Briefing + manual do jogador

O jogo não ensina nada. Dois itens concretos já identificados:

- **Concentrar equipes de CdD bate espalhar em ~30%.** `STACKING_MULTIPLIERS`
  começa `[1, 1, 0.5, ...]` — a 2ª equipe no mesmo subsistema entra com valor
  cheio, a 3ª já cai pela metade. Estratégia dominante e invisível: 2 equipes
  resolvem a mesma batalha em 10 turnos onde 1-por-sistema leva 13.
- O resto do ensino do jogo, quando a engine assentar.

Decisão explícita de manter **invisível na UI** e mencionar no Briefing quando
ele for reescrito.

**Origem:** `mission-pacing`, simulação de fadiga.

### Tema do alerta amarelo

`alertLevel` aceita `yellow` desde a `engine-integration` e a `bridge-awareness`
lhe dá função mecânica (hostil conhecido na vizinhança). Falta o visual: a
camada de tema é binária por construção — cada um dos 7 temas define **uma**
variante `-alert` por papel de cor, e `theme.css` carrega 29 regras
`.red-alert`. Um tratamento `yellow` distinto significa ~49 variáveis novas mais
o conjunto de regras equivalente nos 7 temas.

É trabalho de sistema de cor (seção 13 do dossiê), não de engine.

**Origem:** `game-state-store` / `bridge-awareness`.

---

## Mecânica

### IA de inimigo

O `combat-tuning` (rodada 5) plantou a semente: movimento deliberado por estado
de energia — aproxima com energia pra atacar, evade pra recarregar sem. O que
fica pra cá é o refinamento:

- **Inimigo coberto reposiciona pra buscar linha de tiro** (5ª rodada, item
  23.8: hoje ele fica parado atrás da estrela, inofensivo).
- Recuar quando ferido; pesar escudo/poder na decisão de aproximar.
- Coordenação entre inimigos do setor (flanquear, revezar rajadas).
- Caçar o jogador ENTRE setores (a ambição original desta entrada).

O `yellow` da `bridge-awareness` antecipa parte disso — responde a hostil
*conhecido* na vizinhança, não a hostil se aproximando.

**Origem:** `bridge-awareness`, `enemy-species`, e itens 23.8/23.18 da 5ª
rodada.

### Território romulano

`enemy-species` distribui os 5 tipos por peso fixo. Concentrar Romulanos numa
região da galáxia foi considerado e adiado: exige um conceito de território em
`worldGen` que não existe, e o ganho depende de o jogador cruzar a galáxia o
bastante pra notar o padrão.

Encontrar Romulano viraria informação geográfica.

**Origem:** `enemy-species`, decisão de design.

---

## Mecânica (exploração)

### Sistema de inventário — cristais de dilítio e itens especiais em planetas

Hoje "minerar" é direto: `damageControl.ts` (Send Party) consome 1 carga do
planeta e converte na hora em `DILITHIUM_WC_BOOST` pro Warp Core — sem
inventário, sem escolha do jogador sobre o que fazer com o item. Proposta:
dilítio (e outros itens especiais a definir) viram entidades guardadas, não
efeito automático — abre espaço pra usar depois (reparo sob demanda, venda em
base, item raro que desbloqueia algo).

Pontos de integração já existentes que a mudança precisa atravessar:

- `damageControl.ts` (`sendLandingParty`/resolução de missão, ~L403-430):
  onde a carga é consumida hoje — vira "adiciona ao inventário" em vez de
  "aplica boost direto".
- `navigation.ts` (sonda, `dilithiumCharges` revelado sem consumir carga) e
  `worldGen.ts` (geração de `planet`/`dilithiumCharges` por quadrante) — fonte
  dos itens, não precisam mudar, só o consumidor.
- Painel dono ainda não decidido: Engineering (é reparo hoje) vs. um painel
  novo de inventário/ciência. Decisão de UI, não bloqueia desenho da engine.

Exploração vira parte do jogo de fato (não só "risco vs. reparo pontual") só
quando o inventário tiver por que ser gerenciado — decidir os "outros itens
especiais" antes de implementar, senão o sistema nasce com 1 item só e o
mesmo efeito automático de hoje, travestido de inventário.

**Origem:** pedido do usuário, 01/08, durante a 6ª rodada de playthrough.

### Rebalancear fórmula de duração de missão para acomodar exploração

`missionDurationFor(enemyTotal) = MISSION_BASE + MISSION_PER_ENEMY * enemyTotal`
(`constants.ts:390-396`). `MISSION_BASE = 25` já é, por desenho, "o custo que
NÃO escala com a frota: explorar, viajar, reparar entre brigas" — mas foi
calibrado pra exploração pontual (Send Party de 3 turnos, survey de sonda),
não pro loop mais rico que o inventário acima cria. Se explorar plantas passa
a valer a pena com mais frequência (mais itens, mais motivo pra desviar do
caminho), `MISSION_BASE` precisa medir de novo — mesma disciplina de
[[balance-by-measurement]]: simular contra a engine antes de mudar a
constante, não chutar um número novo.

Depende do desenho do inventário acima (não dá pra calibrar tempo de
exploração sem saber quanto ela passa a exigir).

**Origem:** pedido do usuário, 01/08, durante a 6ª rodada de playthrough.

---

## Apresentação de resultado

### Dissecar o relatório da tela de resultado

`ResultScreen.vue` hoje é stub visual: recebe `outcome`/`rating`/`reason` como
props soltas com default fixo, nem lê `state.result`/`GameState` de verdade.
Pedido: detalhar a pontuação — inimigos destruídos/capturados, bases
encontradas, torpedos atirados/acertados/errados etc.

**Superfície de mudança, por dado:**

- **Destruídos/capturados (total)** — já existe pronto:
  `state.klingonsDestroyed`/`klingonsCaptured` (`types/game.ts:574-575`), já
  usados por `calculateCommanderRating` (`endGame.ts:110-111`). Só falta
  passar pro `ResultScreen` via `state.result`.
- **Destruídos/capturados por espécie** — NÃO existe, precisa contador novo.
  `removeEnemyFromSector` (`combat.ts:652-680`) incrementa os totais mas só
  recebe `enemyId`, não o tipo — a entidade ainda está em
  `state.currentSector` na linha 657 ANTES do filter, dá pra ler `.type` ali
  mesmo sem mudar a assinatura. Precisaria de `Record<EnemyType, number>` em
  vez de (ou além de) `klingonsDestroyed`/`klingonsCaptured` — nome dos campos
  ficou datado desde o `enemy-species` (são todos os 5 tipos, não só Klingon).
- **Bases encontradas** — de graça, não precisa contador novo: derivável em
  `endGame.ts` cruzando `state.starbases[].quadrant` contra
  `state.exploredQuadrants`/`galaxy[key].surveyed` no momento de montar o
  resultado. Não precisa tocar engine de turno.
- **Torpedos atirados/acertados/errados** — parcialmente existe e seria fácil
  de sobrar: `fireTorpedoes` (`combat.ts:238-315`) já calcula `missed: boolean`
  por tiro em `TorpedoFireResult.hits`, mas esse resultado é transiente (só
  vive dentro da chamada) — `state.torpedoesUsed` conta só o total disparado,
  sem separar hit/miss. Precisa 2 contadores novos
  (`torpedoesHit`/`torpedoesMissed`) incrementados no loop de `turnEngine.ts`
  (~L323-334) que já itera `res.hits` pra gerar os eventos — mesmo ponto,
  sem laço novo.
  - Achado incidental (bug pequeno, não é escopo desta mudança mas convém
    corrigir junto): o texto do evento pra tiro errado (`turnEngine.ts:330-332`)
    diz "atingiu com 0 de dano" em vez de indicar erro — `hit.missed` existe
    no resultado mas o texto do evento ignora esse campo.

**Arquivos tocados, estimativa:** `types/game.ts` (campos novos em
`GameState`+`Starbase`/result), `combat.ts` (split por espécie + hit/miss),
`turnEngine.ts` (contadores + texto do evento de erro), `endGame.ts` (deriva
bases encontradas, monta `result` completo), `newGame.ts` (zera campos novos),
`ResultScreen.vue` (rewiring de stub pra dado real + layout novo) + testes em
`combat.test.ts`, `endGame.test.ts`, `turnEngine.test.ts`.

Ordem sugerida: derivar bases encontradas primeiro (zero campo novo, zero
risco), depois split por espécie e hit/miss de torpedo (mesmo padrão dos dois:
contador novo plugado no ponto onde o dado já é calculado, mas hoje descartado).

**Origem:** pedido do usuário, 01/08, durante a 6ª rodada de playthrough —
registrado como próxima change após a rodada fechar.

---

## Dívida técnica

### Flight recorder (replay determinístico de partida)

Log de input, não de snapshot: grava `{ seed, actions: PlayerAction[] }`, replay
recria `createNewGameState(seed)` e reaplica a lista de ações pela engine.
Viável porque a engine já é pura em relação a RNG — toda função de turno recebe
`rng: () => number` por parâmetro, nenhum `Math.random()` solto dentro da
lógica (confirmado por grep em `combat.ts`, `navigation.ts`, `damageControl.ts`,
`warpCore.ts`). `PlayerAction` já é serializável (`turnEngine.ts`), `state.seed`
já persiste (`newGame.ts`), `mulberry32`/`randomSeed` já existem (`prng.ts`),
`commitTurnChecksum` (`saveIntegrity.ts`) já hasheia o estado por turno — dá pra
reusar o mesmo hash pra comparar replay contra o log original, turno a turno.

**Bloqueador a resolver primeiro:** os 4 call-sites em `useGameState.ts`
(`dispatchPlayerAction`, `executeEndTurn`, `executeSkipTurns`,
`executeDockingRepairTurn`) passam `Math.random` direto em vez de um stream
seedado derivado de `state.seed` — sem isso, replay é impossível não importa a
estratégia.

**Passos:**

1. Trocar os 4 `Math.random` por RNG seedado persistente (infra já existe).
2. Módulo `flightRecorder.ts`: acumula `{ seed, actions[] }`, export/import JSON.
3. Runner de replay: recria estado do seed, reaplica ações, compara checksum
   por turno via `saveIntegrity.ts`.
4. Teste de determinismo (mesmo log 2x, checksums iguais) — vira ratchet
   permanente tipo `reachability.test.ts`, pega regressão de RNG que hoje
   ninguém detecta.

UI de export/import de log fica de fora por enquanto — é ferramenta de debug
interna, não feature de jogador.

**Origem:** pedido do usuário, 01/08, durante a 6ª rodada de playthrough.

### CSS global do SDK migrando pro `<style scoped>`

O framework antigo era CSS + JS puro, então o CSS dos elementos está espalhado
em arquivos por tipo. Com a migração pro Vue, faz sentido colocar cada regra no
componente que a renderiza. **Medido em 31/07:**

```
CSS total                                      4565 linhas
  colors.css + theme.css + themes/*            1336  (29%)  fica global
  estrutura de elemento                        3229  (71%), ~557 regras

lcars-sdk.css                                   413 regras
  reset / seletor de tag HTML                    30   fica global
  1 classe so -- scopavel direto                234   57%
  descendente/combinador -- precisa :deep       149   36%

regras que atravessam fronteira de componente   208  (todos os arquivos)
componentes: 22; so 4 ja tem <style scoped>
```

**Fatiar em 3 camadas, valor decrescente:**

1. **377 linhas, 4 arquivos que ja mapeiam 1:1 a um componente** —
   `default-bracket.css` → `DefaultBracket.vue`, `solid-level-bar.css` →
   `SolidLevelBar.vue`, `default-bar-frame.css` → `DefaultBarFrame.vue`,
   `scroll-button.css` → `ScrollButton.vue`. Zero ambiguidade de dono. É o
   pedaço que compensa sozinho.
2. **234 regras de classe única** em `lcars-sdk.css`. Mecânico, toca todos os
   16 elements.
3. **149+208 regras descendentes.** É a dívida de verdade, e mover pro scoped
   **não a remove** — converte pra `:deep()`, que é o mesmo acoplamento com
   ergonomia pior. O conserto real é redesenhar a API (prop em vez de seletor
   descendente), e isso é bem maior que relocar CSS.

**Nunca migrar:** `colors.css` (889 linhas — sistema de papéis de cor que os
props referenciam por nome), `theme.css`, `themes/*` e os 30 resets.

**Pré-requisito: baseline de regressão visual.** São 3229 linhas mexidas sem
teste nenhum cobrindo aparência, e o modo de falha é quebra visual silenciosa.
Com Playwright dirigindo o Storybook (verificado funcionando em 31/07:
`node_modules/playwright` + chromium do cache, o MCP nao serve porque procura o
Chrome do sistema em `/opt/google/chrome`), um screenshot por story vira rede
de segurança — e serve pra muito além deste refactor.

**Por que nao agora:** rodada 5 em curso, e `bridge-awareness` (29 tasks) e
`enemy-species` (17) ainda vao mexer em UI. Depois delas ha menos atrito.

**Origem:** ponderação do usuário, 31/07, depois do bug de largura do
`LcarsToggleSwitch` — em que `.complex-button .text` em `module.css` governava
um componente tres arquivos longe e custou 4 tentativas pra achar.



### Limpeza da lista de exceções do `reachability.test.ts`

O ratchet contra integração oca nasceu com 6 exceções, todas dívida herdada.
`DOCKED_REPAIR_PER_TICK` foi resolvida e removida pela `docking-overhaul`
(31/07): a Drydock agora repara por drones, sem ler equipe nenhuma. Restam 5:

- **`undockSector`, `effectiveImpulseMax`, `markManyExplored`,
  `nearestKnownStarbase`, `canEngageBoost`** — helpers de navegação sem
  consumidor. `undockSector` é o mais irônico: implementava exatamente o
  "sudoeste da base" do item 9.5 e ficou parado enquanto o item era reportado
  como quebrado; a `round-4-fixes` acabou escrevendo posicionamento novo em
  `docking.ts` (melhor, porque trata ocupação e borda) sem saber que ele
  existia.

Removê-los é seguro mas exige recorte à mão — a tentativa automática quebrou
`navigation.ts` numa assinatura multi-linha, e não vale o risco no meio de uma
rodada de playthrough.

**Origem:** primeira execução do `reachability.test.ts`, 31/07.
