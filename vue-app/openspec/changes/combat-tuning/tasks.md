## 1. Energia do inimigo

- [ ] 1.1 `enemyEnergy` em `SectorEntity`; constantes `ENEMY_ENERGY_MAX`,
      `ENEMY_ATTACK_COST`, `ENEMY_ENERGY_RECHARGE` na folha
- [ ] 1.2 `materializeSector` popula energia cheia
- [ ] 1.3 Ataque custa energia; sem energia suficiente, não ataca
- [ ] 1.4 Turno sem atacar recarrega
- [ ] 1.5 **Remover o auto-dreno** (`enemyPower = floor(power/(3+rng))`)
- [ ] 1.6 Teste: 4 tiros esvaziam; drenado não atira; recarga só em turno ocioso
- [ ] 1.7 Teste: enemyPower intocado por ataques próprios (23.3 fecha)

## 2. Movimento deliberado

- [ ] 2.1 Substituir `repositionEnemies` (teleporte no engage) por passo por
      turno na etapa 3: aproxima com energia, evade sem
- [ ] 2.2 `ENEMY_MOVE_CELLS = 3`, respeitando ocupação e grid
- [ ] 2.3 `cellsMovedThisTurn` do inimigo alimentado pelo passo real (esquiva
      continua funcionando)
- [ ] 2.4 Teste: fuga de 8 células abre ≥5; armado aproxima; drenado abre
- [ ] 2.5 Atualizar spec-refs/testes que assumiam reposicionamento no engage

## 3. Regen invertida

- [ ] 3.1 `regenShields`: taxa interpolada de 100% (escudo 0) a 40% (teto)
- [ ] 3.2 Teste: baixado recupera mais rápido que erguido; erguido ainda
      recupera; crítico para tudo

## 4. Joule

- [ ] 4.1 `heatGain = PHASER_TEMP_PER_SHOT × (power/PHASER_POWER_DEFAULT)² × (1+d)`
- [ ] 4.2 Teste: 3000 → 120; 750 → 7.5; 1500 → 30 exato

## 5. Verificação

- [ ] 5.1 type-check, lint, unit verdes
- [ ] 5.2 6ª rodada: ritmo de rajada perceptível; fuga viável com phaser quente;
      SHD/PWR legível; itens 9.4 e 23.3 retestados
