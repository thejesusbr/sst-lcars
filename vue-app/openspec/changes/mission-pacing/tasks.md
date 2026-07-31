## 1. Curva de fadiga (item 13.3)

- [ ] 1.1 Constante nomeada pra meia-vida (hoje `3` cravado no expoente de
      `resolveDamageControlTurn`), valor `6`
- [ ] 1.2 Aplicar na fórmula, mantendo piso `TEAM_EFFICIENCY_FLOOR` e
      recuperação `TEAM_RECOVERY_PER_TURN` inalterados
- [ ] 1.3 Comentário na função registrando que piso e recuperação foram medidos
      como alavancas e são inertes — pra não serem "otimizados" depois
- [ ] 1.4 Teste: 6 turnos trabalhados = 50% de eficiência
- [ ] 1.5 Teste: 12 turnos trabalhados ainda acima do piso

## 2. Relógio da missão (item 13.1)

- [ ] 2.1 `MISSION_DURATION` 30 → 40
- [ ] 2.2 Atualizar testes que cravam o limite de stardate
- [ ] 2.3 Verificar que a salvaguarda `total + 1` (frota grande demais) continua
      correta com 40

## 3. Sondas (item 13.5)

- [ ] 3.1 Sonda inicial 3 → 4 em `createNewGameState`
- [ ] 3.2 Atualizar testes e a tabela de estado inicial do `PLAYTHROUGH.md`

## 4. Verificação

- [ ] 4.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [ ] 4.2 Reproduzir a simulação de reparo com os valores novos e conferir contra
      o design (11 turnos na batalha severa, 7 na grande)
- [ ] 4.3 4ª rodada: itens 13.1, 13.3, 13.5 — e anotar se afrouxou demais
