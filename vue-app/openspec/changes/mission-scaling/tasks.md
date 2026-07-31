## 1. Relógio derivado da frota

- [x] 1.1 `MISSION_BASE` (25) e `MISSION_PER_ENEMY` (1.2) em `constants.ts`,
      substituindo `MISSION_DURATION`
- [x] 1.2 `worldGen` computa a duração a partir da frota gerada
- [x] 1.3 Salvaguarda `total + 1` continua, agora como piso explícito
- [x] 1.4 Atualizar os testes de `missionPacing.test.ts` que cravam 40

## 2. Verificação

- [x] 2.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [x] 2.2 Teste: turnos-por-inimigo varia menos de 1.4× na faixa 13–22
- [x] 2.3 Atualizar a tabela de estado inicial do `PLAYTHROUGH_4.md`
- [ ] 2.4 5ª rodada: partida com frota grande deixou de ser sentença
