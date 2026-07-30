## Why

O playthrough manual da `engine-integration` (2ª rodada, 2026-07-30) fechou os
achados de correção, mas deixou um problema que nenhum bug explica: **o jogador
não percebe o que acontece**. Palavras do usuário:

> "Sinto que faltam animações de ataques, principalmente para sinalizar o turno
> do inimigo, a sensação geral é que o jogo está muito rápido."

O turno resolve inteiro num clique. As 5 etapas — ação, Warp Core, inimigo,
condições terminais, atualização de domínios — acontecem de forma síncrona e o
jogador só lê o resultado no combat log. Não há momento em que o inimigo *age*
na tela.

Isso contamina mais do que o conforto. O próprio roteiro registra o item 13.1
("30 stardates dão pra caçar ~17 inimigos?") como **inconclusivo**, com a
justificativa: *"como o pace do jogo está muito rápido pela falta de animações,
não deu tempo de sentir o efeito do tempo"*. E o achado de balanceamento — a
nave do jogador está forte demais — não é mensurável enquanto o jogador não
conseguir acompanhar o combate acontecendo. **Corrigir balanceamento antes disso
seria medir no escuro.**

O warp tem a mesma doença numa forma mais aguda: uma viagem de 1 turno resolve
dentro da própria chamada de `resolvePlayerTurn`, e a `engine-integration` já
precisou de um piso artificial de 5 segundos só para a animação existir. O piso
resolve o sintoma e apaga a informação: warp 1 e warp 8 ficam visualmente
idênticos, quando a diferença entre eles é justamente o ponto.

## What Changes

- **Viagem de warp passa a correr sozinha.** Enquanto `warpTrip` existe, os
  turnos avançam automaticamente até a chegada e **nenhuma ação do jogador é
  aceita** — a nave está em dobra, não há o que comandar. Hoje o jogador precisa
  clicar "End Turn" a cada turno de viagem, o que é ruído sem decisão.

- **Duração da animação proporcional à viagem**, substituindo o piso fixo de 5s.
  LUT de milissegundos por turno indexada pelo fator de warp, decrescente
  (`4300ms` em warp 1 → `3000ms` em warp 8). O contraste de duração total vem da
  contagem de turnos, que já é `ceil(distância / fator)`; a LUT acrescenta a
  percepção de que um turno em warp alto é mais ágil. Diagonal completa da
  galáxia: **30s** em warp 1, **3s** em warp 8.

- **A nave sai de alcance ao engajar warp.** `currentSector` esvazia
  imediatamente e nenhum inimigo alcança durante o trânsito. **BREAKING** em
  relação ao comportamento atual, em que a nave permanece no quadrante de origem
  levando fogo a viagem inteira sem poder revidar — dano sem decisão. Warp passa
  a ser fuga legítima de combate; o risco fica no que espera na chegada e no
  estresse do Warp Core.

- **Turno inimigo ganha presença na tela.** A resolução deixa de ser instantânea
  e passa a ser encenada: cada evento de combate (disparo do jogador, resposta
  inimiga, absorção de escudo, dano em casco) é apresentado em sequência, com
  ritmo legível, antes de o controle voltar ao jogador.

- **Combat log deixa de ser o único canal de feedback.** Continua sendo o
  registro, mas o que aconteceu no turno precisa ser visível sem lê-lo.

## Capabilities

### New Capabilities

- `turn-presentation`: encenação da resolução de turno na UI — sequenciamento
  dos eventos, sinalização do turno inimigo, e o contrato entre o engine (que
  resolve instantaneamente e é puro) e a camada visual (que apresenta ao longo
  do tempo). Inclui a regra de que o engine **não** ganha `setTimeout`.

- `warp-travel-mode`: viagem de warp como modo próprio — avanço automático de
  turnos, bloqueio de ações, saída de alcance ao engajar, e a LUT de duração da
  animação por fator de warp.

### Modified Capabilities

- `navigation`: a viagem de warp deixa de exigir avanço manual de turno e passa
  a esvaziar `currentSector` ao engajar.

- `turn-engine`: precisa expor o que aconteceu no turno de forma **ordenada e
  tipada**, não como lista de strings — a apresentação depende de saber qual
  evento é de qual etapa e contra qual entidade.

- `game-state-store`: modo de viagem no estado (ações rejeitadas enquanto ativo)
  e o canal por onde a UI consome os eventos encenados.

## Impact

- **Modificado:** `engine/turnEngine.ts` (formato do `TurnResult`),
  `engine/navigation.ts` (saída de alcance), `stores/useGameState.ts` (modo de
  viagem, fila de apresentação), `components/modules/HelmConsole.vue` (LUT
  substitui o piso fixo), `components/modules/SituationPanel.vue` e demais
  consoles (desabilitar ações em trânsito), `engine/constants.ts` (LUT).

- **Não afetado:** geração de mundo, modelo de energia, controle de danos,
  atracagem. Nenhuma constante de balanceamento muda aqui.

- **Depende de:** nada. A `engine-integration` já entregou o motor funcionando;
  esta mudança é sobre percepção.

- **Bloqueia:** o rebalanceamento de combate. O achado "jogador forte demais" só
  pode ser medido depois que o jogador conseguir acompanhar um combate — é
  Non-Goal aqui de propósito, não esquecimento.

- **Fora de escopo, mudança própria:** interação com bases e inimigos via Hail
  (base responde tipo/quadrante/recursos; rendição escalando com dano do
  inimigo; base científica dando descanso às equipes de CdD) e identidade da
  nave no Captain's Lounge (nome/ícone da nave, nome do capitão). São achados da
  mesma rodada, mas de outro eixo — não têm relação com percepção de tempo, e
  misturá-los daria a esta mudança duas razões para existir.
