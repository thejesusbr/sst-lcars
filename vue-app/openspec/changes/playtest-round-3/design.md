## Context

A 3ª rodada de playthrough encontrou quatro defeitos da mesma família:
**integração oca** — a função certa existe, tem teste unitário verde, e nenhum
chamador. Já é padrão recorrente neste projeto (`DOCKED_TEAM_RECOVERY_PER_TURN`
sem leitor, descoberto na `hail-and-identity`; `playerShipOptions` com o
comentário "for future ship-selection screen" que nunca chegou).

O teste automatizado não pega essa classe: a unidade passa porque a unidade está
certa. Só o playthrough pega.

## Goals / Non-Goals

**Goals:**
- Ligar o que já existe: verificação do selo, KBS vivo, campo certo do Life
  Support.
- Formalizar os achados da rodada 3 em `PLAYTHROUGH.md` e preparar a 4ª.

**Non-Goals:**
- Balanceamento (relógio, fadiga, sondas, rendição) — vai em `mission-pacing`.
- Tipos de inimigo — vai em `enemy-species`.
- Mostrador terminal, alerta automático, Survey, coluna de ciência — vai em
  `bridge-awareness`.
- Sincronia do grid com a encenação — emenda em `game-feel-and-pacing`.

## Decisions

**Onde a verificação do selo entra.** `pinia-plugin-persistedstate` hidrata a
store por conta própria; a verificação precisa ver o payload cru **antes** de um
turno resolver e regravar o checksum. O gancho `afterHydrate` do plugin é o
ponto natural: roda depois da restauração, com acesso à store, e é único por
store — não há risco de dois caminhos de carregamento divergirem. Alternativa
descartada: ler `localStorage` na mão em `main.ts` antes do `mount`, que
duplicaria a chave de persistência em dois lugares.

`checkSaveIntegrity` é `async` (`crypto.subtle.digest` devolve promise). A
janela entre hidratar e comparar precisa ficar fechada pra ação do jogador,
senão um turno resolvido no meio regrava a baseline por cima da evidência —
falso negativo em vez de falso positivo, mas igualmente inútil.

**Uma função só pro KBS vivo.** O defeito era a duplicação: cinco produtores do
mesmo código, um deles ciente de `clearedEnemies`. A correção lazy é também a
correção de raiz — uma função que recebe o `QuadrantContent` e devolve o código
vivo, chamada pelos cinco. Consertar os quatro call sites um a um deixaria o
sexto produtor futuro nascer errado de novo.

**Atualizar o mapa na destruição, não na saída do quadrante.** As duas opções
dão o mesmo resultado observável na prática, e "no momento da destruição" tem um
gancho que já existe (`removeEnemyFromSector`, que já grava `clearedEnemies`).
"Ao sair do quadrante" precisaria de um evento de saída que hoje não existe como
ponto único.

## Risks / Trade-offs

[A infestação de Tribbles finalmente funcionar assusta um save honesto] →
`verifySaveIntegrity` já não compara quando não há checksum gravado ou quando a
versão de schema difere, exatamente pra que um patch que adicione campo não
gere Tribbles pela atualização do jogo. O risco real é o inverso — que a
verificação continue inerte por outro motivo — e o item 12.2 do `PLAYTHROUGH.md`
é o que fecha isso, com procedimento escrito.

[Atualizar `exploredQuadrants` na destruição vaza informação] → não vaza: o
jogador está no quadrante e o SRS já mostra o setor. A entrada guardada passa a
concordar com o que ele vê, não a revelar o que ele não viu.
