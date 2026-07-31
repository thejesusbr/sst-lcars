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

Inimigo hoje **reage**: reposiciona quando o jogador engaja movimento, atira se
tiver linha de tiro. Não caça, não manobra pra buscar ângulo, não recua ferido,
não coordena com outros no setor.

Ganhou peso com a `combat-balance`: agora que distância atenua dano e obstáculo
bloqueia linha, um inimigo que **manobra** seria adversário de verdade em vez de
alvo que se move ao acaso.

O `yellow` da `bridge-awareness` já antecipa parte disso — responde a hostil
*conhecido* na vizinhança, não a hostil se aproximando.

**Origem:** `bridge-awareness` e `enemy-species`.

### Território romulano

`enemy-species` distribui os 5 tipos por peso fixo. Concentrar Romulanos numa
região da galáxia foi considerado e adiado: exige um conceito de território em
`worldGen` que não existe, e o ganho depende de o jogador cruzar a galáxia o
bastante pra notar o padrão.

Encontrar Romulano viraria informação geográfica.

**Origem:** `enemy-species`, decisão de design.

---

## Dívida técnica

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

O ratchet contra integração oca nasceu com 6 exceções, todas dívida herdada:

- **`DOCKED_REPAIR_PER_TICK`** — a spec de `docking` diz "25 pontos por
  subsistema por tick, **sem** o teto de stacking da CdD", mas o loop usa
  `calculateRepairRate` com tier 5, que só dá 25 com UMA equipe a 100% de
  eficiência. Equipe cansada rende menos, contrariando a spec. Mesma família da
  dívida do item 9.3 logo abaixo, e nunca verificado em playthrough.
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

### Equipes `working` tratadas como idle durante atracagem

A spec de `docking` pede que **todas** as 6 equipes sejam tratadas como idle
enquanto atracadas (tripulação de folga), recuperando fadiga em dobro. Hoje só
quem já está `idle`/`cooldown` recupera; equipe designada continua acumulando
fadiga no berço.

Consertar exige reformular `calculateRepairRate` pro reparo tier-5 de doca parar
de depender de equipe designada — o reparo assistido é da estação, não da
tripulação.

**Origem:** `hail-and-identity`, item 9.3 do playthrough (nunca verificado).
