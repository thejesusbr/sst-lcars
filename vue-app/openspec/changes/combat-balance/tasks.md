## 1. Escudo inimigo

- [x] 1.1 Campo `enemyShield` em `SectorEntity`, com faixa por tipo em
      `constants.ts` (só a do `KLINGON_CRUISER` se manifesta até a
      `enemy-species`)
- [x] 1.2 `materializeSector` popula o escudo junto do poder
- [x] 1.3 Dano absorve no escudo antes de tocar `enemyPower`, com o excedente
      transbordando
- [x] 1.4 Escudo inimigo **não** regenera — teste que fixa a assimetria
- [x] 1.5 Mostrar escudo inimigo no `WeaponsConsole` junto do poder
- [x] 1.6 Teste: acerto menor que o escudo não toca o poder; acerto maior
      transborda

## 2. Atenuação por distância

- [x] 2.1 LUT `PHASER_FALLOFF` por distância Chebyshev em `constants.ts`
- [x] 2.2 Constante de conversão potência→dano (`0.15`)
- [x] 2.3 `firePhasers` aplica conversão e atenuação pela distância nave→alvo
- [x] 2.4 Ataque inimigo aplica a mesma atenuação, pela distância alvo→nave
- [x] 2.5 Teste: mesmo tiro a distância 1 e 5 dá dano bem diferente
- [x] 2.6 Teste: 1 tiro a potência máxima não mata inimigo médio intacto

## 3. Linha de tiro

- [x] 3.1 Função de linha (Bresenham) em `sector.ts` (folha), devolvendo as
      células entre dois pontos
- [x] 3.2 Phaser recusa disparo com estrela/planeta na linha, **sem** gastar
      turno, com motivo no log
- [x] 3.3 Ataque inimigo respeita a mesma regra
- [x] 3.4 Torpedo passa, com chance de erro por obstáculo, acumulando com a
      degradação de Photon Tubes que já existe
- [x] 3.5 Teste: cobertura funciona nos dois sentidos; torpedo erra mais com 2
      obstáculos que com 1

## 4. Esquiva de alvo em movimento

- [x] 4.1 Registrar no estado quantas células a nave cobriu no turno
- [x] 4.2 Chance de esquiva escalando por células cobertas, aplicada ao dano
      recebido
- [x] 4.3 Mesma regra pros inimigos que reposicionaram no turno
- [x] 4.4 Trânsito multi-turno **continua** sob fogo, só com a esquiva
- [x] 4.5 Teste: turno parado nunca esquiva; 8 células esquiva mais que 1

## 5. Boost como fuga de emergência

- [x] 5.1 Boost força 8 células independente do dial (já é o comportamento) e
      concede esquiva máxima no turno
- [x] 5.2 Verificar que o cooldown longo continua precificando a fuga
- [x] 5.3 Rótulo/hint no `HelmConsole` refletindo que boost é evasivo, não só
      rápido

## 6. Regeneração de escudo do jogador

- [x] 6.1 `shieldDamageTaken` decai por turno, proporcional a `shieldEnergy`
- [x] 6.2 Taxa degradada pelas faixas de dano de Shield Control
- [x] 6.3 Regeneração **para** em crítico
- [x] 6.4 Atracar zera `shieldDamageTaken`, em qualquer tipo de base
- [x] 6.5 Teste: recupera com escudo alto, recupera menos com escudo baixo, não
      recupera com Shield Control crítico

## 7. Termodinâmica do phaser

- [x] 7.1 Aquecimento proporcional à potência disparada, normalizado pra que
      1500 mantenha os 30 de hoje
- [x] 7.2 Multiplicador por dano no subsistema continua como está
- [x] 7.3 Teste: 3000 esquenta o dobro de 1500; potência pequena quase não
      esquenta

## 8. Verificação

- [x] 8.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [x] 8.2 Simular uma batalha típica e conferir contra a tabela do design (~2
      tiros à queima-roupa, ~10 do canto oposto)
- [ ] 8.3 5ª rodada: batalha dura mais de um turno; aproximar-se é decisão;
      cobertura funciona; fugir é resposta real
