## Context

`GameState.currentSector` e `GameState.starbases` inicializam como arrays vazios e
**nada nunca os popula**. Achado na revisão completa pós-implementação da
`fase-4-engine` (decisão #38 daquela mudança). O mais relevante: isto **nunca foi
planejado** — zero menção a geração/spawn em `tasks.md` ou em qualquer uma das 10
specs, mesmo após 37 decisões de design, revisão painel-por-painel e 4 passadas de
balanceamento.

As specs existentes definem a **potência** de um inimigo
(`enemyPower = 200 × (0.5 + random)`) e o **código KBS** que Star Chart e LRS
exibem, mas nunca *onde*, *quando* ou *com que distribuição* algo nasce.

O original de 1978 resolve isso em ~6 linhas, e as odds são extraíveis
verbatim (`sst_original.bas` linhas 810–1040):

```
para cada um dos 64 quadrantes:
  R1 = random()
  R1 > 0.98  ->  3 Klingons          (2%)
  R1 > 0.95  ->  2 Klingons          (3%)
  R1 > 0.80  ->  1 Klingon           (15%)
  senão      ->  0                   (80%)

  random() > 0.96  ->  1 starbase    (4%)
  estrelas = INT(random × 7.98 + 1.01)  ->  1..8, sempre >= 1

  G(I,J) = K3×100 + B3×10 + S3       <- código KBS de 3 dígitos
```

Restrição herdada: o engine é TS puro com RNG injetável e o invariante de
dependência da decisão #36 (`fase-4-engine`) — módulos não importam irmãos, só
`types/game.ts` e folhas compartilhadas.

## Goals / Non-Goals

**Goals:**
- Galáxia 8×8 gerada com as odds do original, produzindo os códigos KBS que Star
  Chart e LRS já consomem.
- Setor materializado com entidades de `id` estável ao entrar num quadrante.
- Posição inicial da nave válida e desocupada.
- New Game gera um mundo **novo**, não reaproveita o anterior.
- Determinismo por semente, pra teste e pra partida reproduzível.
- Avançar **sem depender** de `engine-integration` estar pronta.

**Non-Goals:**
- Movimento, resolução de turno ou qualquer integração no `turnEngine` — pertence a
  `engine-integration`. Esta mudança só fornece a função que aquele hook chama.
- IA Klingon ambiente (frota caçando bases pela galáxia) — Open Question adiada
  desde a `fase-4-engine`, segue fora de escopo.
- Rebalancear combate, energia ou reparo.
- Tela/fluxo de briefing além do que o `GameState.mode` já define.

## Decisions

### 1. Totais de inimigos e bases são DERIVADOS da geração, não constantes

No original, `K9` (total de Klingons) e `B9` (total de bases) **acumulam** do
sorteio por quadrante — são resultado, não parâmetro. Hoje `constants.ts` fixa
`ENEMIES_INITIAL = 12` e `STARBASES_INITIAL = 5`.

**Decisão (confirmada pelo usuário, 2026-07-29):** derivar das odds. `enemiesLeft`
passa a ser o total efetivamente gerado (~17.3 esperado, variando tipicamente 13–22
entre partidas). `ENEMIES_INITIAL` deixa de ser constante de estado inicial.

Consequência assumida: mais combate que os 12 assumidos antes, e partidas de
tamanhos diferentes — o rating de comandante passa a comparar partidas não
idênticas. Aceito em troca de fidelidade e rejogabilidade.

**Salvaguarda do próprio original, mantida:** `IFK9>T9THENT9=K9+1` — se o total de
Klingons exceder a duração da missão, a duração vira `total + 1`. Com ~17 inimigos
e 30 stardates nunca dispara, mas protege a cauda (sorteio azarado de 30+
inimigos virando partida impossível). É regra da fonte, não escala proporcional
(que foi a alternativa descartada).

**Alternativa descartada:** normalizar o total pra exatamente 12 usando as odds só
como peso de distribuição. Rejeitada pelo usuário — preserva balanceamento mas
perde a variância.

### 2. O seed `B9=2` do original vira 2 bases garantidas e POSICIONADAS

O original faz `B9=2` antes de gerar e depois soma as bases sorteadas
(`B9=B9+1`), chegando a ~4.6 no total — o que confirma a decisão #22 da
`fase-4-engine` (que corrigiu `starbasesLeft` de 14 pra 5 justamente estimando
isso). Mas o `B9=2` é incoerente na fonte: conta 2 bases que **não existem** em
nenhuma célula de `G(I,J)`.

**Decisão:** reproduzir o total, corrigindo a incoerência — 2 bases **garantidas e
efetivamente posicionadas** em quadrantes sorteados, mais o sorteio de 4% por
quadrante. Total esperado ~4.6, mesma faixa da decisão #22, mas cada base contada
existe de fato no mapa.

Isso também torna redundante o fallback das linhas 1100–1160 do original (que
enfia uma base no quadrante do jogador quando nenhuma foi gerada): com 2
garantidas, o caso "zero bases" não existe.

**Alternativa descartada:** odds puras sem o seed. Rejeitada — daria ~2.56 bases,
metade do que o balanceamento de docking/pool de recursos (decisões #8/#23) assumiu.

### 3. Galáxia eager, setor lazy

O original mantém `G(8,8)` com os códigos KBS de toda a galáxia desde o início
(é o que o Star Chart lê), mas só materializa as entidades do setor
(`K(3,3)`, posições) quando a nave entra no quadrante.

**Decisão:** mesma divisão. A geração de galáxia roda 1× no New Game e preenche o
grid de 64 códigos KBS; a materialização de setor roda a cada entrada em
quadrante, criando as entidades com `id` estável e posição em célula desocupada.

Encaixa exatamente no hook `onQuadrantEnter(state, quadrant)` que
`engine-integration` está definindo (decisão 3 daquele design) — esta mudança
fornece a implementação, aquela fornece a chamada. As duas ficam desacopladas.

### 4. `engine/worldGen.ts` como folha, RNG injetável e semente persistida

**Decisão:** módulo folha (importa só de `types/game.ts` e das folhas
`constants.ts`/`sector.ts`), com `rng: () => number = Math.random` injetável, igual
todo o resto do engine.

A **semente** é guardada no `GameState`, o que dá dois ganhos: teste determinístico
sem mock global, e a possibilidade de reproduzir uma partida específica. Isso exige
um gerador com semente (o `Math.random` do JS não aceita seed) — um PRNG pequeno
(mulberry32 ou xorshift, ~5 linhas) resolve, sem dependência nova.

**Alternativa descartada:** mockar `Math.random` no teste. Rejeitada — não permite
partida reproduzível e polui estado global de teste.

### 5. Posição inicial precisa ser válida, não fixa

`createInitialGameState()` hoje fixa quadrante 4,4 / setor 4,4 — com mundo vazio
isso nunca deu problema. Com mundo gerado, pode cair sobre uma estrela ou base.

**Decisão:** posição inicial sorteada (como o original, `Q1=FNR(1):Q2=FNR(1)`), com
o setor garantidamente desocupado. Registrar em `exploredQuadrants` o quadrante
inicial, já que a nave obviamente conhece onde está.

## Risks / Trade-offs

- **[Risco] `enemiesLeft` derivado quebra a spec `game-state-store` da
  `fase-4-engine`**, que diz "New Game resets to initial constants (… enemiesLeft
  12 …)" → Mitigação: esta mudança declara esse requirement como MODIFIED
  explicitamente, em vez de deixar duas specs se contradizendo.
- **[Risco] ~17 inimigos contra 30 stardates pode ficar apertado** — o
  balanceamento anterior assumia 12 → Mitigação: a salvaguarda da decisão 1
  protege só a cauda; o ajuste fino fica pra playtesting, como todas as constantes
  desta família (decisões #23/#25/#31 da `fase-4-engine`).
- **[Risco] Variância entre partidas dificulta comparar rating** → Mitigação:
  aceito conscientemente pelo usuário. Se incomodar no playtest, normalizar o
  rating pelo total gerado é um ajuste pequeno e localizado em `endGame.ts`.
- **[Trade-off] PRNG próprio em vez de `Math.random`** — 5 linhas a mais e um
  gerador menos "aleatório" estatisticamente → aceito: reprodutibilidade vale mais
  que qualidade estatística num jogo de turnos.
- **[Risco] Fronteira com `engine-integration`** — se as duas mudarem a assinatura
  do hook em paralelo, quebra → Mitigação: a assinatura
  `onQuadrantEnter(state, quadrant)` já está fixada como requirement na spec
  `turn-engine` daquela mudança; esta só a consome.

### 6. Pelo menos 1 `STARBASE_DOCK` garantida

O original tem um tipo único de base. Esta versão tem 3, com efeitos de docking bem
diferentes — **só `STARBASE_DOCK` repara subsistemas** (capability `docking`). Com
~4.6 bases sorteadas uniformemente, uma fração real das partidas nasceria sem
nenhuma base de reparo, tornando dano permanente e o jogo praticamente invencível.

**Decisão:** das 2 bases garantidas (decisão 2), a primeira é sempre
`STARBASE_DOCK`; a segunda e todas as vindas do sorteio de 4% recebem tipo
aleatório entre os 3. Elimina o caso degenerado sem achatar a variância do resto.

**Alternativas descartadas:** peso fixo 50/25/25 (ainda deixa ~6% das partidas sem
base de reparo) e uniforme 1/3 (~9%). Ambas rejeitadas — probabilidade pequena de
uma falha catastrófica ainda é falha catastrófica.

### 7. Planetas: dilítium escondido é o dilema tático (mecânica do EGA Trek)

O original não gera planetas — entidade nova desta versão, sem odds pra extrair.
Referência declarada pelo usuário: **EGA Trek**, onde o valor de um planeta só se
descobre indo até ele.

**Decisão:**
- **~50% dos quadrantes** têm 1 planeta.
- **~30% dos planetas** carregam **1–3 cargas** de dilítium; os outros 70% não têm
  nada.
- Cada carga vale `+30` de integridade do Warp Core — reusa
  `DILITHIUM_WC_BOOST` já fixado (decisão #23 da `fase-4-engine`), sem número novo.
- **Uma missão de Send Party consome exatamente 1 carga.** Um planeta de 3 cargas
  suporta 3 missões e vale ser revisitado.
- **As cargas são desconhecidas até a primeira missão.** É daqui que vem o dilema:
  o jogador gasta 3 turnos e assume o risco de setor hostil sem saber se o planeta
  tem algo. Depois de pesquisado, o total passa a ser conhecido.

Efeito combinado: metade da galáxia oferece a *possibilidade* de reparo alternativo
ao docking, mas só ~15% dos quadrantes (50% × 30%) realmente entrega — e descobrir
qual custa turno e risco. Docking segue sendo a via confiável; dilítium é a aposta.

**Consequência em spec existente:** a requirement "Dilithium mining takes exactly 3
turns" (`damage-control`, `fase-4-engine`) hoje diz que sucesso **sempre** dá `+30`.
Passa a ser condicional à existência de carga — declarado como MODIFIED nesta
mudança, em vez de deixar duas specs se contradizendo.

### 7b. Regra "planeta só onde há estrela" descartada como inócua

Foi considerada (a pedido do usuário) uma restrição de que planetas só existiriam em
quadrantes com estrelas, pra que a exploração não fosse 100% cega.

**Checagem que a descartou:** o gerador de estrelas do original é
`FNR(1) = INT(RND × 7.98 + 1.01)`, que com `RND ∈ [0,1)` produz `1..8` e **nunca 0**
— logo 100% dos 64 quadrantes têm estrela, e a restrição não filtraria nada.

**Decisão:** descartar a regra e **manter a garantia de ≥1 estrela por quadrante**,
que o usuário considerou interessante por si (nenhuma célula da galáxia é vazia).
A proporção de planetas segue **50% dos quadrantes / 30% deles com carga**, sem
vínculo com contagem de estrelas.

O problema que a regra tentava resolver — exploração cega — é resolvido pela sonda
(decisão 9), não pela topologia.

**Alternativas descartadas:** permitir quadrantes com 0 estrelas (havia setores
vazios no EGA Trek, mas o usuário preferiu manter a garantia da fonte) e
correlacionar chance de planeta com contagem de estrelas (complexidade sem ganho,
já que a sonda cobre a necessidade).

### 8. Planeta não aparece no código KBS — descoberta exige entrar no quadrante

O código KBS tem 3 dígitos: **K**lingons, **B**ases, **S**tars. Planeta não cabe
nele, e o Star Chart/LRS leem exatamente esse código.

**Decisão:** manter assim, deliberadamente. Planeta só é visível ao entrar no
quadrante (via SRS), o que reforça exploração e combina com o dilema da decisão 7
— nem a existência do planeta, nem suas cargas, são visíveis de longe. Mesmo
comportamento do EGA Trek.

Registrado como decisão explícita e não como omissão, porque é uma consequência
não-óbvia do esquema KBS herdado.

### 9. A sonda é o trunfo: revela planeta E dilítium, no log

Se planeta e cargas são invisíveis de longe (decisões 7 e 8), o jogador precisaria
gastar 3 turnos de Send Party só pra descobrir se vale gastar 3 turnos de Send
Party. A sonda resolve isso sem tirar o dilema.

**Decisão:** uma sonda que sobrevive e completa o scan revela, além do código KBS,
**a presença de planeta e a quantidade de cargas de dilítium**, com entrada no
combat log. O planeta fica marcado como pesquisado (`surveyed`) sem custo de missão.

O que mantém isso equilibrado é a escassez já especificada, sem número novo:
- Só **3 sondas** por partida (`PROBES_INITIAL`, já fixado).
- Resolução leva `distância + 1` turnos.
- **Risco de destruição** de `40% + 5%` por inimigo adicional no setor-alvo
  (decisão #23 da `fase-4-engine`) — e sonda destruída não é reembolsada.

Efeito de design: a sonda deixa de ser só "revelar KBS" e vira o instrumento
escasso de inteligência, criando decisão real — usar as 3 sondas pra reconhecer
frota inimiga ou pra caçar dilítium. E o quadrante mais promissor para dilítium é
justamente o que pode ter inimigo que destrói a sonda.

**Alternativa descartada:** sonda revelar apenas presença do planeta, sem as cargas.
Rejeitada — deixaria o jogador ainda tendo que gastar a missão pra saber se há algo,
o que esvazia o valor da sonda sem aumentar o dilema (o dilema já vem da escassez
das sondas).

## Open Questions

*(Nenhuma. Distribuição de planetas, tipos de base, a regra descartada das estrelas
e o alcance da sonda foram fechados nas decisões 6–9.)*
