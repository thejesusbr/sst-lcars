## Context

O `hailTarget` de `combat.ts` já distingue base de inimigo e já tem o roll de
rendição e o de interrogatório. O que falta não é estrutura, é alcance e
conteúdo:

- Quem decide se o botão "Hail" habilita é o `NavSensingConsole`, procurando
  entidade **na célula selecionada** do scanner. Uma base a duas células de
  distância não é alcançável sem o jogador adivinhar onde clicar.
- `HailResult` devolve `status` e `revealedBasePool`. Não há campo para tipo nem
  para quadrante.
- `HAIL_SURRENDER_CHANCE` é uma constante única, aplicada igual a qualquer alvo.

A base científica está num estado curioso: existe no gerador, conta como base
viva para `starbasesLeft`, permite atracar — e o `docking` diz explicitamente
que ela não entrega nada. É um tipo de base cuja única função é não ser as outras
duas.

A identidade da nave nunca existiu no `GameState`. `useScannerIcons.ts` tem
`playerShipOptions` com 7 naves rotuladas e um comentário dizendo que é para uma
tela futura de seleção.

## Goals / Non-Goals

**Goals:**

- Tornar o Hail uma ação com uso real, contra base e contra inimigo.
- Dar função à base científica sem duplicar o que doca e depósito já fazem.
- Fazer a rendição responder ao estado do alvo, não a um dado fixo.
- Deixar o jogador nomear a própria nave.

**Non-Goals:**

- Rebalancear combate direto (dano, `enemyPower`, torpedo). Segue dependente da
  `game-feel-and-pacing`, cuja task 6.1 carrega essa dívida.
- Placar contínuo durante a partida. O rating só é calculado no fim e conta
  prisioneiro capturado ao longo da partida — confirmado correto, não é escopo.
- Diplomacia com profundidade (negociação, facções, reputação). O Hail continua
  sendo um roll com resposta, não uma árvore de conversa.
- Arte nova. Os 7 ícones de nave já existem.

## Decisions

### 1. Alcance do Hail é o setor inteiro, com escolha de alvo

O canal abre se houver **qualquer** alvo válido no setor. Havendo mais de um, o
jogador escolhe; havendo um só, ele é o alvo implícito.

**Por quê:** exigir a célula exata transforma uma ação de comunicação num
exercício de mira. Hail não é arma — não faz sentido ter precisão espacial.

**Alternativa descartada:** hail automático no alvo mais próximo. Rejeitada —
com base e inimigo no mesmo setor, "mais próximo" escolheria por acidente algo
com consequências completamente diferentes.

### 2. Resposta de base identifica tipo e quadrante, não só o pool

`HailResult` ganha o tipo da base e o quadrante onde ela está, além do nível de
recursos que já devolvia.

**Por quê:** o tipo é o que decide se vale a viagem. Saber que há 400 de pool
numa base não ajuda se o jogador não sabe se ela reforma casco. O quadrante
importa porque a resposta vai para o combat log, que é lido depois — e "uma base
respondeu" sem coordenada é inútil dois turnos depois.

### 3. Rendição escala com o dano do alvo, com os 30% como piso

A chance sobe conforme `enemyPower` cai em relação ao valor com que a entidade
foi gerada. Alvo intacto rende os 30% de hoje; alvo em farrapos rende
consideravelmente mais.

**Por quê:** é a mesma lógica que o resto do jogo já usa — efetividade
degradando com dano (decisões #35/#37). Rendição não responder ao estado do alvo
é a única mecânica de combate que ignora isso.

**Restrição de implementação:** `SectorEntity` guarda só `enemyPower` corrente,
não o inicial. A fração de dano precisa de referência — ou o gerador passa a
guardar o valor inicial, ou a escala usa `ENEMY_BASE_POWER` como denominador
nominal. A segunda é mais barata e não muda o schema; a primeira é mais correta
quando o inimigo nasce com poder acima da média. **A decidir na implementação.**

**Alternativa descartada:** chance fixa maior. Rejeitada — resolve a frequência
mas não cria a decisão interessante, que é "amasso primeiro e chamo depois".

### 4. Roll falho responde com caráter

Falhar a rendição gera uma linha no combat log com a recusa, variada, com o tom
que a espécie do alvo justifica.

**Por quê:** hoje o roll falho é silêncio — o jogador não distingue "tentei e ele
recusou" de "o botão não fez nada". Uma resposta confirma que a ação aconteceu, e
é onde o jogo pode ter voz sem custar mecânica.

**Restrição:** as falas são conteúdo, não regra. Vivem numa tabela de dados, não
espalhadas em `if`s dentro do engine.

### 5. Base científica dá descanso, não recurso

Atracar em `STARBASE_SCIENCE` acelera a recuperação das equipes de Controle de
Danos enquanto a nave estiver atracada. Sem torpedo, sem casco.

**Por quê:** dá função ao terceiro tipo de base sem duplicar os outros dois, e
encaixa na ficção — a tripulação desce de licença. Mecanicamente cria uma escolha
real: com o casco inteiro mas as equipes exaustas, a base científica passa a ser
o destino certo.

A constante `DOCKED_TEAM_RECOVERY_PER_TURN` já existe (dobro do normal enquanto
docado). A base científica aplica um multiplicador sobre ela.

**Alternativa descartada:** base científica revelar quadrantes do Star Chart.
Rejeitada — sobrepõe o que a sonda e o interrogatório já fazem, e a sonda é a
mecânica que o `world-generation` desenhou como trunfo escasso.

### 6. Identidade da nave é estado persistido, escolhido no Captain's Lounge

Nome da nave, ícone da nave e nome do capitão entram no `GameState`, persistem
com o resto do save, e são escolhidos numa seção do Captain's Lounge.

**Por quê:** o Captain's Lounge já é a tela de configuração (temas, catálogo de
cores). Identidade pertence ali, não numa tela nova.

O ícone escolhido passa a ser o que o `LcarsScanner` desenha para a nave —
`useScannerIcons` hoje devolve um `playerShip` fixo.

**Aberto:** trocar nave no meio de uma partida é permitido? Cosmético não
quebra nada, mas trocar o nome da nave no meio da missão é estranho. Ver Open
Questions.

## Risks / Trade-offs

- **[Risco] Rendição escalada pode inverter a economia de captura.** Se ficar
  fácil demais, capturar vira dominante sobre destruir — e captura vale 1.5× no
  rating → Mitigação: o teto da escala é constante de playtest, e a cela de 4
  lugares mais a equipe de CdD travada em `guard` já são o freio natural.

- **[Risco] Base científica virar parada obrigatória.** Se o bônus de descanso
  for alto, o loop ótimo passa a ser "atraca sempre" → Mitigação: o custo é
  tempo, e o relógio da missão é de 30 stardates. Começar conservador.

- **[Trade-off] `HailResult` cresce.** Mais campos num tipo que já tem `status`
  e um opcional. Aceito — é o mínimo para a resposta ser útil, e o alternativo
  (o console consultar `starbases` por conta própria depois do hail) espalharia
  a regra.

- **[Risco] Falas de recusa envelhecem.** Repetição vira ruído em playthrough
  longo → Mitigação: tabela com variações e sorteio, não linha única.

## Open Questions

*(As 3 abaixo foram resolvidas na implementação, 2026-07-30.)*

1. ~~**Denominador da fração de dano do inimigo**~~ — resolvido: `ENEMY_BASE_POWER`
   (200) como nominal, sem campo novo em `SectorEntity`. Mais barato e sem mudar
   schema; o custo aceito é um inimigo nascido acima da média (até 300) começar
   "acima de 100%" e só entrar na escala quando o dano real cruzar o nominal —
   atraso no início da curva, nunca inversão dela. `hailSurrenderChance()` em
   `engine/constants.ts`.

2. ~~**Trocar identidade no meio da partida**~~ — resolvido: permitido, a
   qualquer momento. O Captain's Lounge é uma aba do `TacticalConsole` montada
   com `v-show` durante o jogo inteiro (nunca desmontada em `mode: 'playing'`),
   então bloquear a troca exigiria lógica de gate que a estrutura da UI não
   pedia. O ícone do scanner segue a escolha reativamente
   (`useQuadrantCells.playerIcon`, um `computed` sobre `shipIconKey`); o combat
   log já escrito mantendo o nome antigo é aceito como cosmético.

3. ~~**Multiplicador de descanso da base científica**~~ — resolvido: `1.5×`
   sobre `DOCKED_TEAM_RECOVERY_PER_TURN` (`STARBASE_SCIENCE_RECOVERY_MULTIPLIER`
   em `engine/constants.ts`). Achado na implementação: `DOCKED_TEAM_RECOVERY_PER_TURN`
   já existia desde a `engine-integration` mas **nenhum código o lia** — o dobro
   de recuperação em qualquer atracagem nunca tinha acontecido de fato (mesma
   classe de bug do `hollow-integration-pattern`). Corrigido junto: sem o dobro
   base funcionando, não havia o que multiplicar.
