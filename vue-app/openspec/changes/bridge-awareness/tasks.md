## 1. Mostrador de sistema terminal (item 11.5)

- [x] 1.1 `SituationPanel`: indicador de Warp Core mostra `T-n` de
      `breach.turnsRemaining` quando o breach está ativo
- [x] 1.2 Indicador de Life Support mostra `T-n` de `lifeSupportTurnsRemaining`
      quando armado, e `%` quando não
- [x] 1.3 Hull segue em `%`, com o tratamento crítico que já tem
- [x] 1.4 Teste: relógio arma e desarma conforme a integridade cruza
      `CRITICAL_INTEGRITY`

## 2. Alert 10 (item 11.5)

- [x] 2.1 Acrescentar o som ao catálogo (`alert10.mp3` já importado como
      `Sound.WC_BREACH` — decidir se reusa a chave ou cria `SYSTEM_CRITICAL`)
- [x] 2.2 Predicado "há equipe designada E `working` neste subsistema"
- [x] 2.3 WC e LS: tocar a cada turno em crítico sem equipe working
- [x] 2.4 Hull: tocar 1× ao cruzar pra baixo do limiar, com rearme na
      recuperação
- [x] 2.5 Teste: despachar equipe silencia; equipe caindo em `cooldown`
      ressoa; equipe `away`/`guard` não silencia

## 3. Alerta automático (item 10.0)

- [x] 3.1 `red` ao haver hostil visível no setor atual
- [x] 3.2 `yellow` com hostil conhecido na vizinhança (revelado por scan de LRS
      ou por mover-se adjacente a quadrante já detectado hostil), sem hostil no
      setor
- [x] 3.3 O engine nunca baixa o nível — descida só pelo toggle
- [x] 3.4 Teste: entrar em setor hostil sobe pra `red`; limpar o setor não desce

## 4. Ação Survey (item 13.4)

- [x] 4.1 Ação `survey` no `PlayerAction`, custo 1 turno, exige planeta no setor
- [x] 4.2 Revela presença de dilítio sem revelar quantidade e sem consumir carga
- [x] 4.3 Confiabilidade pelas faixas de dano do SRS: leve = correto, moderado =
      pode errar, crítico = indisponível
- [x] 4.4 Corrupção só no relatório — `dilithiumCharges` do estado intacto
- [x] 4.5 Botão no `NavSensingConsole`, desabilitado sem planeta ou com SRS
      crítico
- [x] 4.6 Teste: SRS íntegro sempre certo; SRS moderado erra parte das vezes;
      SRS crítico rejeita

## 5. Categoria `science` e coluna (item 15.9)

- [x] 5.1 `LogCategory` ganha `'science'`; `LogReadMarkers` passa a 4 chaves
- [x] 5.2 Subir `GAME_SCHEMA_VERSION` (migração de save)
- [x] 5.3 Recategorizar em `TURN_EVENT_CATEGORY`: relatório de sonda, achado da
      party e os novos `scan`/`survey` vão pra `science`; hail, lançamento de
      sonda e despacho/recolhimento de party ficam em `captain`
- [x] 5.4 4ª aba no `CombatLog`
- [x] 5.5 3ª coluna no `NavSensingConsole` renderizando `science` (view do mesmo
      log, sem estado próprio)
- [x] 5.6 Mover a dica de base adjacente pra essa coluna, em tamanho legível
- [x] 5.7 Teste: despacho de party em `captain`, achado em `science`

## 6. Verificação

- [x] 6.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [ ] 6.2 Stories: `SituationPanel` com relógio armado; `NavSensingConsole` com
      a 3ª coluna povoada (adiado — projeto não tem convenção de teste de
      componente, cabe revisitar quando as stories forem tocadas de novo)
- [ ] 6.3 4ª rodada: itens 10.0, 11.5, 13.4, 15.9 (playthrough manual do usuário)
