## 1. Som na fila (26.4)

- [x] 1.1 `playEventSound` toca phaser em `player_phasers` e torpedo em
      `player_torpedo`
- [x] 1.2 Remover o `playSound` do clique no `WeaponsConsole`
- [x] 1.3 Cortes alinhados à duração do evento (nenhum sample vaza mais que um
      compasso sobre o seguinte)
- [x] 1.4 Explosão continua no evento do acerto fatal — agora sem atropelo,
      porque o disparo toca no próprio slot

## 2. Briefing real (24.1)

- [x] 2.1 `BriefingScreen` recebe frota gerada e stardates alocados da store
- [x] 2.2 Texto do briefing usa os números (mantendo o resto fixo — reescrita
      completa é pendência futura)

## 3. Nave invisível atracada (25.1)

- [x] 3.1 `sectorCells` não desenha o marcador do jogador com `docked` true
- [x] 3.2 Undock reaparece na posição nova (já reposicionada pela round-4-fixes)
- [x] 3.3 Teste: grid sem marcador atracada; marcador de volta após undock

## 4. Verificação

- [x] 4.1 type-check, lint, unit verdes
- [ ] 4.2 6ª rodada: 26.4, 24.1, 25.1
