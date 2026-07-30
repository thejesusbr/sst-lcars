## Why

Achados da 2ª rodada de playthrough (2026-07-30) que não têm relação com
percepção de tempo — foram deliberadamente deixados fora da
`game-feel-and-pacing` para não dar duas razões de existir àquela mudança.

Três deles apontam para o mesmo buraco: **o Hail é quase inútil hoje**.

- Com uma base no setor, o botão só habilita se o jogador acertar a célula exata
  dela no scanner. A base está ali, visível, e mesmo assim o canal não abre.
- A base responde só o nível do pool de recursos. Não diz que tipo é — e o tipo é
  o que decide se vale atracar (`STARBASE_DOCK` reforma casco, `STARBASE_SUPPLY`
  só repõe torpedo, `STARBASE_SCIENCE` nada disso).
- Contra inimigo, a chance de rendição é fixa em 30%, independente de o alvo
  estar intacto ou em farrapos. Um cruiser com 10 de `enemyPower` recusa com a
  mesma frequência de um a 300. Palavras do usuário sobre o roll falho:

  > "Rolls falhos resultam em respostas... não muito educadas. Já tentou perguntar
  > a um Klingon se ele quer se render? Nada saudável."

O quarto achado é de outro tipo: **a base científica não faz nada**. Não repõe
torpedo, não reforma casco, e o `docking` explicitamente diz "no resource
resupply (life support confirmation only)". É um dos três tipos de base gerados
no mundo e o jogador não tem razão nenhuma para atracar nela.

O quinto é identidade: os assets de 7 naves já existem em `useScannerIcons.ts`,
com rótulo, e o comentário no próprio arquivo diz **"for future ship-selection
screen"**. Nunca foram usados.

## What Changes

- **Hail passa a alcançar qualquer alvo do setor**, não só a célula selecionada.
  Havendo base no setor, o canal está disponível.

- **Base responde com identificação completa**: tipo, quadrante e nível de
  recursos. O tipo é o dado que faltava — sem ele o jogador não sabe se a viagem
  até lá vale a pena.

- **Chance de rendição escala com o dano do inimigo.** Um alvo em farrapos se
  rende mais que um intacto, proporcionalmente. Os 30% fixos passam a ser o piso
  (alvo intacto), não o valor único.

- **Roll de rendição falho ganha resposta.** Klingon recusando não é silêncio: é
  uma resposta com caráter, no combat log.

- **Base científica dá descanso à tripulação.** Sem torpedo e sem casco, mas
  atracar nela acelera a recuperação das equipes de Controle de Danos — os
  engenheiros ainda podem descer de licença. Dá função ao terceiro tipo de base,
  hoje inerte.

- **Captain's Lounge ganha identidade da nave**: escolha de ícone e nome da nave,
  e nome do capitão. Os 7 ícones já existem nos assets.

## Capabilities

### New Capabilities

- `ship-identity`: nome e ícone da nave, nome do capitão. Onde vivem no
  `GameState`, como persistem, e onde aparecem (Captain's Lounge para escolher,
  Briefing e Result para exibir).

### Modified Capabilities

- `combat`: alcance do Hail dentro do setor; conteúdo da resposta de uma base;
  chance de rendição escalando com o dano do alvo; resposta em roll falho.

- `docking`: `STARBASE_SCIENCE` passa a conceder bônus de recuperação às equipes
  de CdD, deixando de ser um tipo de base sem efeito.

## Impact

- **Modificado:** `engine/combat.ts` (`hailTarget` — alcance, escala de rendição,
  respostas), `engine/docking.ts` (bônus da base científica),
  `engine/constants.ts` (constantes de escala e de descanso),
  `types/game.ts` (identidade da nave),
  `components/modules/NavSensingConsole.vue` (habilitação do Hail),
  `components/modules/CptLoungeConsole.vue` (seleção de nave e capitão),
  `components/modules/BriefingScreen.vue` e `ResultScreen.vue` (exibir o nome).

- **Não afetado:** modelo de energia, geração de mundo, resolução de turno,
  navegação. Nenhuma constante de balanceamento de combate direto muda —
  a escala de rendição é sobre captura, não sobre dano.

- **Independente da `game-feel-and-pacing`.** As duas tocam `combat.ts` mas em
  funções distintas (`hailTarget` aqui, emissão de evento lá); podem ser
  implementadas em qualquer ordem.

- **Fora de escopo:** rebalanceamento de combate (segue dependente da
  `game-feel-and-pacing`, ver task 6.1 de lá) e placar contínuo durante a
  partida. O rating hoje só é calculado no fim, e conta prisioneiro **capturado**
  ao longo da partida, não o que está na cela no momento — confirmado como
  correto pelo usuário, fica registrado aqui só para não ser "descoberto" de novo.
