## Context

O engine resolve um turno **inteiro e de forma síncrona** dentro de
`resolvePlayerTurn`: 5 etapas fixas, mutação direta do `GameState`, retorno de
um `TurnResult` com `events: string[]`. Isso é deliberado e não vai mudar — é o
que permite 185 testes rodarem em node sem DOM, com RNG injetável, e o que a
decisão #36 da `fase-4-engine` protege.

O problema é que a UI consome esse resultado como se fosse um instante. O
jogador clica, tudo acontece, e o único vestígio é o combat log.

Duas restrições herdadas moldam o desenho:

1. **O engine não pode ganhar `setTimeout`.** Um engine que espera é um engine
   que não roda em teste. A encenação é responsabilidade da camada de
   apresentação.
2. **`events: string[]` é insuficiente.** A UI precisa saber *qual etapa*, *qual
   entidade* e *qual efeito* para encenar. Hoje a store já faz classificação por
   substring (`categoryOf`) — um remendo que existe justamente por essa lacuna e
   que este desenho remove.

O warp acumula um terceiro problema: a `engine-integration` colocou um piso fixo
de 5s na animação porque viagens de 1 turno resolvem antes do watcher rodar. O
piso funciona mas apaga a informação — warp 1 e warp 8 ficam idênticos na tela.

## Goals / Non-Goals

**Goals:**

- Tornar a resolução de turno **perceptível**: o jogador vê o inimigo agir.
- Fazer a duração da viagem de warp **comunicar distância e velocidade**.
- Tirar do jogador o clique sem decisão (avançar turno durante uma viagem).
- Manter o engine puro, síncrono e testável em node.
- Substituir a classificação por substring do combat log por evento tipado.

**Non-Goals:**

- **Rebalancear combate.** O achado "jogador forte demais" é real e está
  registrado, mas medir antes de o jogador conseguir acompanhar o combate é
  medir no escuro — foi a própria observação do usuário no item 13.1. Fica para
  a mudança seguinte, com esta como pré-requisito.
- Interação com Hail/bases, rendição escalando com dano, base científica, e
  identidade da nave no Captain's Lounge. Mesma rodada de achados, outro eixo.
- Animação por sprite ou motor de partículas. A encenação aqui é temporal e de
  estado (o que aparece, quando, por quanto tempo), não arte nova.
- Tornar o turno interrompível. Uma vez resolvido, é resolvido; a apresentação
  só distribui no tempo o que já aconteceu.

## Decisions

### 1. O engine emite eventos TIPADOS; a UI encena

`TurnResult.events` deixa de ser `string[]` e passa a ser uma lista ordenada de
eventos estruturados, cada um sabendo de qual das 5 etapas veio, que tipo de
efeito representa, e contra qual entidade (por `id` estável).

O engine continua **instantâneo**: produz a lista inteira e retorna. Quem
distribui no tempo é a camada de apresentação, que consome a lista como uma
fila.

**Por quê:** é a única divisão que preserva as duas propriedades que importam —
engine testável sem DOM, e UI capaz de encenar. Também elimina a classificação
por substring que a store faz hoje (`categoryOf` casando `/reparo|radiação|.../`
no texto), que é frágil e quebra ao traduzir uma mensagem.

**Alternativa descartada:** callbacks de progresso no engine
(`onEvent(evt) => await delay()`). Rejeitada — torna `resolvePlayerTurn`
assíncrono, contamina todos os 185 testes e coloca tempo real dentro da regra de
jogo.

**Alternativa descartada:** UI relendo o `GameState` antes/depois e diferenciando.
Rejeitada — perde a *ordem* dos eventos, que é justamente o que dá a sensação de
sequência, e não distingue causa (quem atirou) de efeito (quem perdeu energia).

### 2. Fila de apresentação na store, não no componente

A store ganha uma fila dos eventos do último turno e um estado "apresentando".
Os consoles observam esse estado; ações ficam bloqueadas enquanto a fila drena.

**Por quê:** os eventos de um turno tocam vários consoles ao mesmo tempo (escudo
absorve no Shield, casco cai no Shield, log no SituationPanel, inimigo some no
NavSensing/Weapons). Se cada console tivesse seu próprio relógio, eles
dessincronizariam. Uma fila só, num lugar só.

### 3. Viagem de warp é um MODO, não uma sequência de turnos manuais

Enquanto `warpTrip` existe: turnos avançam sozinhos, nenhuma ação é aceita, e a
apresentação de cada turno dura o que a LUT mandar.

**Por quê:** clicar "End Turn" 7 vezes durante uma viagem não é decisão, é
ruído. E "não há ações possíveis em warp" é a regra de ficção que torna o avanço
automático natural em vez de arbitrário.

Bloquear ação vale para **toda** ação que consome turno, não só as de navegação
— disparar phaser em dobra não faz sentido.

### 4. LUT decrescente de ms/turno, indexada pelo fator de warp

```
warp    1     2     3     4     5     6     7     8
ms/t  4300  4100  3900  3700  3600  3400  3200  3000
```

Total = `turnos × LUT[fator]`, com `turnos = ceil(distância / fator)`.
Na diagonal completa (distância 7): **30,1s** em warp 1, **3,0s** em warp 8.

**Por que decrescente e não inversamente proporcional:** a contagem de turnos
*já* carrega um fator `1/w`. Somar outro `1/w` na duração do turno compõe para
`1/w²` — ancorando warp 1 em 4300ms, warp 8 daria 0,56s; ancorando warp 8 em 5s,
warp 1 daria 280s. Nenhum dos dois serve. A LUT decrescente adiciona a percepção
de agilidade sem colapsar a escala.

**Alternativa descartada:** ms/turno crescente (4300→5000), que era o único jeito
de bater exatamente as âncoras iniciais de 30s e 5s. Rejeitada por produzir
**total não-monotônico**: warps 4, 5 e 6 custam os mesmos 2 turnos na diagonal,
então com ms/turno subindo a viagem ficava *mais longa* ao aumentar a
velocidade. Absurdo visível.

**Alternativa descartada:** constante única (sem LUT). Rejeitada — funcionaria,
mas perde a nuance de que um turno em warp alto deve parecer mais ágil, que era
a intenção original.

**Alternativa descartada:** manter o piso fixo de 5s da `engine-integration`.
Rejeitada — é o que apaga a diferença entre warp 1 e warp 8.

⚠️ **Piso e teto ainda em aberto** — ver Open Questions.

### 5. Ao engajar warp, a nave sai de alcance imediatamente

`currentSector` esvazia no turno do engage; ninguém alcança durante o trânsito.

**Por quê:** o comportamento atual (nave fica no quadrante de origem levando
fogo até chegar) produz dano sem decisão — o jogador assiste, porque nenhuma
ação é possível em warp. Isso é o oposto do que esta mudança busca.

**Alternativa descartada:** levar o fogo do turno em que engaja e sumir depois.
Rejeitada pelo usuário — warp deve ser fuga limpa; o preço já está no estresse do
core e no que espera na chegada.

### 6. Sem abortar viagem

A viagem corre até o fim. 30s é o máximo (warp 1 na diagonal completa) e é o
preço de escolher não estressar o core.

**Alternativa descartada:** botão "Abort Warp". Rejeitada pelo usuário — adiciona
estado e uma decisão que enfraquece a escolha do fator de warp.

## Risks / Trade-offs

- **[Risco] Mudar `TurnResult.events` de `string[]` para evento tipado toca todos
  os chamadores** — 4 caminhos de turno na store, o combat log, e os testes que
  afirmam sobre `events` → Mitigação: os testes de integração afirmam sobre
  *efeito no estado*, não sobre texto, então a maioria não é afetada. Os que
  olham `events.length` precisam de ajuste pontual.

- **[Risco] Encenação e estado divergirem.** O `GameState` já está mutado quando
  a apresentação começa; um console que lê o estado direto mostra o resultado
  final enquanto a fila ainda encena o meio → Mitigação: definir na spec o que é
  encenado (efeitos de combate) e o que reflete imediatamente (contadores,
  posição). Não tentar encenar tudo.

- **[Risco] Jogador impaciente.** 30s de warp sem input pode irritar mesmo sendo
  o extremo → Mitigação: é o caso raro (warp 1 atravessando a galáxia inteira);
  o comum fica abaixo de 10s. Decisão consciente do usuário, e reversível — a
  LUT é uma constante.

- **[Trade-off] A apresentação torna o jogo mais lento por construção.** É o
  objetivo, não um efeito colateral. Mas significa que qualquer medição de
  balanceamento feita antes desta mudança está invalidada.

- **[Risco] Timers acumulando em troca de console ou desmontagem** — a
  `engine-integration` já teve esse bug com o `warpVisualTimer` → Mitigação: a
  fila viver na store (decisão 2) centraliza a limpeza num lugar só.

### 7. Sem piso nem teto de duração por turno

A LUT opera em **ms por turno**, não por quadrante, e toda entrada cai entre
3000 e 4300 ms. Um piso de 1,5 s e um teto de 8 s nunca disparariam.

A proposta de piso/teto veio de um modelo intermediário descartado, em que a LUT
era ms **por quadrante** e a duração do turno escalava com a distância coberta —
ali warp 8 num salto de 1 quadrante animava por 710 ms, curto demais para o
efeito acelerar e desacelerar de forma legível. A curva C eliminou o caso.

**Decisão:** não implementar os limites. Escrever guarda para um caso que a
tabela torna impossível é código morto que dá falsa sensação de robustez. Se a
LUT for retunada para valores extremos algum dia, aí sim.

### 8. Dano no sensor degrada o DISPLAY; confiança segue só esmaecendo

Duas coisas distintas que é fácil confundir, e que aqui ficam separadas de
propósito:

**Perda de confiança (tempo) — inalterada.** Continua sendo esmaecimento
gradual por turno, `5% × (1 + d)`, piso 30%. Sem piscar, sem ruído. É informação
envelhecendo, não equipamento falhando.

**Dano no subsistema (SRS/LRS) — novo tratamento visual**, escalonado pelas
bandas que já existem (`combat`, "Subsystem damage fraction is the shared basis
for degraded effectiveness"):

| Banda | SRS e LRS |
|---|---|
| leve (`d ≤ 0.30`) | display normal |
| moderado (`d > 0.30`) | display **pisca** |
| moderado→severo, só LRS | além de piscar, os dígitos do código KBS **variam aleatoriamente** |
| crítico (`d > 0.60`) | display **apagado por completo** |

A variação dos dígitos é o que comunica "leitura não confiável" sem precisar de
texto — o operador vê o número dançando e sabe que não pode confiar nele. O
crítico já força o LRS a se comportar como desligado na capability `navigation`;
apagar o display é a expressão visual disso.

**Restrição:** a corrupção é **de exibição, nunca de estado**. O KBS armazenado
em `exploredQuadrants`/`lrsScan` permanece intacto — reparar o sensor devolve a
leitura correta. Corromper o estado transformaria dano temporário em perda
permanente de conhecimento, o que nenhuma spec pede.

**Alternativa descartada:** piscar quando a confiança atinge o piso. Foi a
leitura inicial (errada) do pedido do usuário. Rejeitada — confunde "dado velho"
com "sensor quebrado", que são problemas diferentes com soluções diferentes
(rescanear vs. reparar), e o piso de confiança nem é um estado ruim: com estrelas
paradas, 30% ainda é informação útil.

### 9. Encenação de combate no vocabulário do EGA Trek

- **Phaser:** linha pulsante entre a nave que atira e o alvo.
- **Torpedo:** asterisco percorrendo as células do grid até o alvo.

**Por quê:** é o vocabulário visual que o usuário reconhece do EGA Trek, e
resolve o requisito central (ver o inimigo agir) sem arte nova — linha e
caractere, ambos desenháveis sobre o `LcarsScanner` existente.

**Consequência técnica:** o `LcarsScanner` precisa de uma camada de overlay
transitório, separada do `gridData`. Hoje ele só sabe desenhar conteúdo estático
de célula; a animação vive *entre* células (a linha) e *através* delas (o
asterisco), então não cabe no modelo atual de célula.

**Alternativa descartada:** animar mexendo no `gridData` (pôr o asterisco como
conteúdo de célula, quadro a quadro). Rejeitada — mistura estado do jogo com
estado de animação no mesmo campo, e a célula ocupada pelo asterisco perderia
seu conteúdo real durante o trajeto.

## Open Questions

*(Nenhuma. As três abertas na redação inicial foram resolvidas pelo usuário em
2026-07-30 e viraram as decisões 7, 8 e 9 acima.)*
