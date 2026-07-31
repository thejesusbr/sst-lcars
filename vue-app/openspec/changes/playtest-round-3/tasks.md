## 1. Selo de integridade passa a ser verificado (item 12.2)

- [x] 1.1 Ligar `checkSaveIntegrity` no `afterHydrate` do
      `pinia-plugin-persistedstate`, com o payload cru
- [x] 1.2 Fechar a janela assíncrona: nenhum turno resolve (e regrava checksum)
      antes da comparação terminar
- [x] 1.3 Acrescentar `tos_many_tribble.mp3` ao catálogo de `useSound.ts`
- [x] 1.4 Tocar o som quando `renderedTribbleCount` passar de 10, sem nenhuma
      mensagem acompanhando
- [x] 1.4b `TribbleSwarm.vue`: NENHUM componente renderizava Tribble —
      `renderedTribbleCount` também não tinha chamador, então 12.2 era
      inverificável mesmo com o selo ligado. Achado durante a aplicação
- [x] 1.5 Teste: save adulterado liga a flag no load; save honesto não

## 2. KBS vivo (item 2.4)

- [x] 2.1 Extrair uma função única que devolve o código KBS vivo
      (`klingons - clearedEnemies`) a partir de `QuadrantContent`
- [x] 2.2 Trocar os 5 produtores pra chamá-la: SRS do quadrante atual
      (`NavSensingConsole`), `scanLongRange`, relatório de sonda
      (`navigation.ts`), Star Chart e `worldGen.kbsCode`
- [x] 2.3 Destruir inimigo atualiza `exploredQuadrants` do quadrante com o
      código vivo e confiança 100
- [x] 2.4 Teste: limpar setor derruba o dígito nos 4 leitores; sair e voltar
      mantém o valor

## 3. Life Support lê o campo certo (item 11.5, parte de fiação)

- [x] 3.1 `SituationPanel`: `gameState.lifeSupportIntegrity` →
      `gameState.subsystems.life`

## 4. Registro da rodada

- [x] 4.1 Formalizar os achados da 3ª rodada em `PLAYTHROUGH.md` (hoje são
      anotações cruas), com o tratamento dado a cada um e a change que o cobre
- [x] 4.2 Escrever o procedimento de teste do item 12.2 no próprio item, já que
      nenhum procedimento funcionava antes
- [x] 4.3 Abrir a seção "Retestar na 4ª rodada"
- [ ] 4.4 Marcar 5.4-5.7 em `game-feel-and-pacing/tasks.md` e
      `hail-and-identity/tasks.md`, e os 2 itens de playthrough restantes em
      `engine-integration/tasks.md`

## 5. Verificação

- [x] 5.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [ ] 5.2 4ª rodada: itens 2.4 e 12.2 do `PLAYTHROUGH.md`
