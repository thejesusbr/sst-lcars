## 1. Relógio derivado da frota

- [ ] 1.1 `MISSION_BASE` (25) e `MISSION_PER_ENEMY` (1.2) em `constants.ts`,
      substituindo `MISSION_DURATION`
- [ ] 1.2 `worldGen` computa a duração a partir da frota gerada
- [ ] 1.3 Salvaguarda `total + 1` continua, agora como piso explícito
- [ ] 1.4 Atualizar os testes de `missionPacing.test.ts` que cravam 40

## 2. Verificação

- [ ] 2.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [ ] 2.2 Teste: turnos-por-inimigo varia menos de 1.4× na faixa 13–22
- [ ] 2.3 Atualizar a tabela de estado inicial do `PLAYTHROUGH_4.md`
- [ ] 2.4 5ª rodada: partida com frota grande deixou de ser sentença
