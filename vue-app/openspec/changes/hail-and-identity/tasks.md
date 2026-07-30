## 1. Hail: alcance e resposta de base

- [x] 1.1 `engine/combat.ts` — `HailResult` ganha tipo da base e quadrante, além
      do `revealedBasePool` que já existe. O tipo é o dado que decide se vale a
      viagem; o quadrante é o que torna a linha do log útil dois turnos depois
- [x] 1.2 `engine/combat.ts` — `hailTarget` aceita alvo em **qualquer** célula do
      setor, não só na selecionada
- [x] 1.3 `components/modules/NavSensingConsole.vue` — botão "Hail" habilita
      havendo qualquer alvo válido no setor. Com mais de um, o jogador escolhe;
      com um só, é implícito. **Não** escolher por ele (design.md decisão 1)
- [x] 1.4 Mensagem de log da resposta de base: tipo, quadrante (X,Y) e pool
- [x] 1.5 Testes: base a 3 células de distância é alcançável; resposta traz os 3
      dados; com base e inimigo no setor, nenhum é escolhido automaticamente

## 2. Hail: rendição escalada e resposta a recusa

- [x] 2.1 **Decidir o denominador da fração de dano do inimigo** (design.md Open
      Question 1): guardar `initialPower` em `SectorEntity` ou usar
      `ENEMY_BASE_POWER` como nominal. Registrar a escolha e o porquê
- [x] 2.2 `engine/constants.ts` — teto da escala de rendição. `HAIL_SURRENDER_CHANCE`
      (30%) passa a ser o **piso**, valor do alvo intacto
- [x] 2.3 `engine/combat.ts` — chance de rendição sobe conforme `enemyPower` cai
- [x] 2.4 Tabela de falas de recusa, em **dados**, não em `if` dentro do engine.
      Variações sorteadas — linha única vira ruído em playthrough longo
- [x] 2.5 `engine/combat.ts` — roll falho devolve a recusa pro combat log
- [x] 2.6 Testes: alvo em farrapos rende mais que intacto; alvo intacto fica no
      piso; recusa aparece no log; recusas variam

## 3. Base científica: descanso

- [x] 3.1 `engine/constants.ts` — multiplicador de recuperação da
      `STARBASE_SCIENCE` sobre `DOCKED_TEAM_RECOVERY_PER_TURN`. Valor inicial de
      playtest, sem âncora existente (design.md Open Question 3) — começar
      conservador, o risco é virar parada obrigatória
- [x] 3.2 `engine/docking.ts` — aplicar o multiplicador no tick de recuperação
      quando a base atracada for científica
- [x] 3.3 `components/modules/NavSensingConsole.vue` — deixar visível qual bônus
      a base adjacente oferece, pra a escolha ser informada antes de atracar
- [x] 3.4 Testes: mesmas equipes, mesmos ticks, recuperam mais em base científica
      que em doca; científica segue sem repor torpedo nem casco

## 4. Identidade da nave

- [x] 4.1 `types/game.ts` — nome da nave, chave do ícone e nome do capitão no
      `GameState`, com defaults sensatos
- [x] 4.2 `engine/newGame.ts` — inicializar com os defaults. Partida nova sem
      escolha nenhuma tem que ser jogável
- [x] 4.3 **Decidir se trocar identidade no meio da partida é permitido**
      (design.md Open Question 2). Cosmético não quebra nada, mas o combat log já
      escrito passa a mencionar uma nave que não existe mais
- [x] 4.4 `components/modules/CptLoungeConsole.vue` — seção de seleção: os 7
      ícones de `playerShipOptions`, nome da nave (rótulo da nave como sugestão)
      e nome do capitão
- [x] 4.5 `composables/useScannerIcons.ts` — `playerShip` deixa de ser fixo e
      passa a seguir a escolha
- [x] 4.6 `BriefingScreen.vue` e `ResultScreen.vue` — usar os nomes escolhidos.
      Identidade que só existe na tela de configuração não é identidade
- [x] 4.7 Testes de store: identidade sobrevive a reload; New Game volta aos
      defaults

## 5. Verificação

- [x] 5.1 `npx vue-tsc --noEmit` e `npx eslint` limpos no código novo/tocado
      (os 9 erros pré-existentes em `src/stories/**` são de outra origem)
- [x] 5.2 `npx vitest run --project unit` verde
- [x] 5.3 Grafo de import do engine intacto — `architecture.test.ts` continua
      passando (nenhum módulo novo importando irmão)
- [ ] 5.4 Playthrough: hail numa base informa o que precisa pra decidir a viagem
- [ ] 5.5 Playthrough: amassar antes de chamar muda a taxa de rendição de forma
      perceptível, sem tornar captura dominante sobre destruição
- [ ] 5.6 Playthrough: existe situação em que atracar na base científica é a
      escolha certa (casco inteiro, equipes exaustas)
- [ ] 5.7 Playthrough: as recusas de rendição têm graça na primeira vez e não
      irritam na décima
