## 1. Atracagem

- [ ] 1.1 `undock` reposiciona a nave numa célula adjacente livre à base
- [ ] 1.2 Tratar base na borda do setor — nunca colocar a nave fora do grid
- [ ] 1.3 Vizinhança lotada cai pra célula livre mais próxima
- [ ] 1.4 Atracar consome 1 turno; desatracar continua livre
- [ ] 1.5 Recusar movimento (impulso e warp) enquanto atracado, com motivo no log
- [ ] 1.6 Confirmar que o escudo continua em 0 depois do undock
- [ ] 1.7 Teste: base em cada uma das 4 bordas e num canto

## 2. Leitura dos painéis de CdD

- [ ] 2.1 `Dispatching` no turno do despacho (derivado de `turnsWorked === 0`,
      sem `TeamStatus` novo), `Working` a partir do seguinte
- [ ] 2.2 Equipe em `guard` renderiza desabilitada no `EngineeringConsole`
- [ ] 2.3 Teste: rótulo vira `Working` só na resolução seguinte

## 3. Dano de warp alto

- [ ] 3.1 Entrada no log de engenharia quando o core sofre dano por warp alto
- [ ] 3.2 Subir a taxa até dar pra sentir numa missão
- [ ] 3.3 Teste: warp ≤ seguro não gera dano nem entrada de log

## 4. Verificação

- [ ] 4.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [ ] 4.2 5ª rodada: itens 9.5 e 5.7 do roteiro
