# Roteiro de Playthrough — 5ª rodada

Substitui `PLAYTHROUGH_4.md`, que virou histórico junto com
`changes/engine-integration/PLAYTHROUGH.md` (rodadas 1–3). Aqui está só o que
ainda não foi verificado, mais o que esta leva introduziu.

**Como usar:** marque `[x]` no que passar, escreva o observado embaixo do que
falhar. Cada item tem o **esperado** explícito pra não virar "achei estranho".

```
npm run dev          # app
npm run storybook    # cenários isolados (stories por console)
```

## O que está no jogo nesta rodada

| Change                                                                          | Estado               | O que esta rodada verifica                                          |
| ------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `combat-balance`                                                                | **nova**             | escudo inimigo, distância, cobertura, esquiva, regen, termodinâmica |
| `mission-scaling`                                                               | **nova**             | relógio derivado da frota                                           |
| `round-4-fixes`                                                                 | **nova**             | undock, atracagem, rótulos de CdD, warp alto                        |
| `game-feel-and-pacing`                                                          | aplicada + 2 emendas | sincronia do grid (agora com o fix de escala)                       |
| `mission-pacing`, `playtest-round-3`, `hail-and-identity`, `engine-integration` | aplicadas            | itens ainda não alcançados                                          |
| `enemy-species`                                                                 | **não aplicada**     | — seção 20 bloqueada                                                |
| `bridge-awareness`                                                              | **não aplicada**     | — seção 22 bloqueada                                                |

Estado inicial de referência (semente aleatória por partida):

| Campo                                    | Valor                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| `stardate`                               | 3600.0, limite = 3600 + (25 + 1.2 × frota)                   |
| `WARP_CORE_OUTPUT` (vazão, core intacto) | 4500                                                         |
| `hullIntegrity`                          | 100                                                          |
| **orçamento em New Game**                | **~2585**                                                    |
| `shieldEnergy`                           | 1500                                                         |
| `phaserPower`                            | 1500 (a potência onde o aquecimento vale 30)                 |
| `torpedoStock`                           | 8, tubos vazios                                              |
| `remainingProbes`                        | 4                                                            |
| inimigos na galáxia                      | ~17 (13–22), **todos `KLINGON_CRUISER` até `enemy-species`** |
| escudo do inimigo                        | 0.5–1.0 × 200 = **100–200** (cruiser)                        |
| poder do inimigo                         | 100–300                                                      |

---

# PARTE A — Novo nesta leva

## 23. Combate tático (`combat-balance`)

O grande teste da rodada. Medido na engine: **2 tiros** de 1500 pra derrubar um
alvo médio à queima-roupa, **12** do canto oposto do setor.

- [x] 23.1 Uma batalha 1v1 **não** se resolve no primeiro tiro.
- [x] 23.2 `SHD/PWR` do alvo aparece nas linhas de tubo do Weapons e cai a cada
      acerto, dá pra saber se está progredindo.
- [ ] 23.3 Escudo do inimigo cai primeiro; só depois o poder começa a cair.

      - Power caiu enquanto ainda havia escudo disponível.

- [x] 23.4 Escudo inimigo **não** volta entre turnos.
- [x] 23.5 O mesmo tiro dói bem mais de perto que de longe. Aproximar-se é
      decisão perceptível, não detalhe.
- [x] 23.6 O inimigo também erra/machuca menos de longe — a atenuação é
      simétrica.
- [x] 23.7 **Cobertura:** com estrela ou planeta na linha reta, o phaser é
      recusado com motivo no log e **sem gastar turno**.
- [x] 23.8 O inimigo também não atira através de cobertura.

      - Inimigo coberto deveria se reposicionar para atacar. Anotar isso no backlog, na seção de IA dos inimigos.

- [x] 23.9 Torpedo **passa** pela cobertura, mas erra às vezes — e erra mais com
      2 obstáculos que com 1.
- [x] 23.10 **Esquiva:** turno em que a nave cobriu muitas células recebe menos
      dano; turno parado nunca esquiva.
- [x] 23.11 Inimigo que reposicionou também escapa de tiro — simétrico.
- [x] 23.12 **Evade** (ex-Boost): 8 células e esquiva máxima. Fugir é resposta
      real agora, não desistir.
- [x] 23.13 **Regeneração de escudo:** depois de apanhar, passar turnos com
      escudo erguido faz a integridade voltar a subir.

      - Integridade de escudo também deve se recuperar com eles baixados. De fato, deviam recuperar mais rápido com os escudos baixados.

- [x] 23.14 Escudo alto recupera mais rápido que escudo baixo.

      - O contrário, escudos baixos recuperam mais rápido, toda energia concentrada na recuperação com a emissão desligada.

- [ ] 23.15 Shield Control em crítico **para** a regeneração de vez.
- [ ] 23.16 Atracar zera o dano acumulado de escudo.
- [x] 23.17 **Termodinâmica:** disparar a 3000 esquenta o dobro de 1500; a 1500
      o aquecimento é o de sempre (30).

      - Vamos fazer uma análise, pois temos um modelo físico real aqui: a equação do efeito joule.

- [x] 23.18 **Sensação geral:** o setor 8×8 virou tabuleiro? Posição importa? - Perfeito, agora o combate está tático de verdade. Apenas achei que a reação dos inimigos está muito rápida, fiz uma corrida de 7 células a 100% de impulso e no mesmo turno o inimigo estava à queima roupa outra vez. Temos que balancear isto, ou então uma nave com phasers super-aquecidos não tem como fugir.

## 24. Relógio derivado da frota (`mission-scaling`)

- [x] 24.1 Partida com frota grande (20+) não é mais sentença — o relógio veio
      maior junto.

      - Sim, mas a tela de briefing ainda traz uma mensagem fixa, então não tem como saber quantos turnos foram alocados na partida antes do fim, sem olhar o localStorage.

- [ ] 24.2 Partida com frota pequena (13–14) não ficou frouxa demais.
- [x] 24.3 (21.1) 40+ stardates e a curva de fadiga nova dão pra caçar a frota
      **e** se recuperar de uma batalha dura. - Sim, com alguma gordura. Explorar demais ainda consome o tempo. Como os inimigos ainda não estão destruindo bases, está ok, mas pode não ser mais quando isso acontecer.

## 25. Consertos (`round-4-fixes`)

- [x] 25.1 **Undock põe a nave ao lado da base**, inclusive com a base na borda
      do setor — o caso da 4ª rodada.

      - Sim, mas o ponto é, o ícone da nave deve sumir enquanto estiver docada, afinal, ela estará dentro da base. Se ela ficar parada no ponto onde chegou, essa mecänica fica inútil.

- [x] 25.2 Undock com a vizinhança da base lotada não sobrepõe a nave em nada.

      - Vide anterior

- [x] 25.3 **Atracar consome 1 turno**; desatracar continua livre.
- [x] 25.4 Engajar impulso ou warp atracado é **recusado**, com motivo no log e
      sem gastar turno.
- [x] 25.5 Escudos continuam em 0 depois do undock — sair do porto desprotegido
      é erro que dá pra cometer.
- [x] 25.6 Equipe despachada mostra `DISPATCHING` no turno do despacho e
      `WORKING` a partir do seguinte.
- [x] 25.7 Equipe travada na cela aparece **desabilitada**, não disponível.
- [x] 25.8 (5.7) Warp acima de 4 escreve no log de engenharia e o dano agora
      dá pra sentir ao longo de uma missão.

## 26. Sincronia do grid, 2ª tentativa (emenda `game-feel-and-pacing`)

A 4ª rodada disse "melhorou, mas ainda deslocada". A causa era escala, não
posição: o app roda dentro de `transform: scale(0.8)` e o overlay media
coordenada visual, levando o fator duas vezes. Por isso o erro crescia com a
distância do canto do scanner.

- [x] 26.1 (16.1) A linha de phaser começa **no ícone** da nave e termina **no
      ícone** do alvo — nas duas pontas, inclusive alvo no canto oposto.
- [x] 26.2 (16.2) O asterisco do torpedo chega na célula do ícone, não ao lado.
- [x] 26.3 O erro não cresce com a distância: alvo perto e alvo longe ancoram
      igualmente bem.
- [ ] 26.4 (18.3) O som da explosão não atropela mais o do phaser.

       - Ainda atropela, a nave explode antes do phaser terminar de tocar. A animação de phaser também está mais curta que o som.

---

# PARTE B — Nunca alcançado

## 3. Turno

- [ ] 3.2 "Skip 5" avança até 5, **parando antes** se aparecer inimigo, tomar
      dano, começar breach ou fim de jogo. (Inconclusivo em 3 tentativas na 4ª
      rodada — sem ocorrência.)

## 4. Energia e sobrecarga

- [ ] 4.5 Danificar o Warp Core faz "Core Output" **cair** sem o consumo mudar.
- [ ] 4.6 Com core ≤40% e consumo de cruzeiro, "Overload" sobe **sozinho**, sem
      tocar no dial manual — mas devagar: a 40% são 0.02 de dano/turno, a 20%
      são 0.26. Nada de morte súbita.
- [ ] 4.7 Baixar escudo e desligar sensores **para** a sobrecarga (vai a zero) —
      é a resposta tática pretendida, e funciona até com o core a 10%.
- [ ] 4.8 Status vira `Overload` quando o orçamento fica negativo.
- [ ] 4.9 Disparar phaser a 3000 com escudo no teto: consumo ~4415, cabe no core
      intacto e estoura em core danificado.

## 6. Combate

- [ ] 6.4 Phaser Banks em crítico (<40): disparo bloqueado, não só mais fraco.
- [ ] 6.7 Dano no SRS às vezes **perde** o lock no fim do turno.

## 9. Atracagem

- [x] 9.2 Atracar repõe **casco** e torpedos, baixa escudo, zera overload,
      transfere prisioneiros, libera guarda. (Só `STARBASE_DOCK` reforma casco;
      `STARBASE_SUPPLY` só repõe torpedo; `STARBASE_SCIENCE` acelera o descanso
      das equipes de CdD em vez de repor material.)
- [x] 9.3 "REPAIR TURN (DOCKED)" no Engineering repara em tier 5 e redireciona o
      dano inimigo pro pool da base.

      - Tudo funcionou, mas um esclarecimento. Ao docar em uma Drydock, não é necessário alocar equipe para reparo, todos os sistemas são reparados automaticamente. Os bônus são para efeito de turnos em reparo, apenas. Afinal, o ponto de atracar em uma base para reparos é usar as oficinas automatizadas cheias de drones de reparo brilhantes e não usar suas equipes de reparo de emergência. Elas saem em licença e descansam enquanto os robôs consertam a nave, recuperando fadiga a ritmo mais alto. Logicamente, nos depots e science stations, tais oficinas não estão disponíveis, então nesses casos, sim, os reparos terão de ser feitos pela próprias equipes, exigindo que o jogador as ative, porém ganhando bônus diferentes: depots tem suprimentos, então as penalidades por stacking não se aplicam, podemos alocar mais de duas equipes para acelerar os consertos. Science stations tem instalações de recreação e informação, a fadiga recupera mais rápido e sem cooldown. Assim, todas as estações terão mecänicas diferenciadas por tipo.

      - **Implementado pela `docking-overhaul`:** Drydock repara todo subsistema a 25/tick por drone, equipe designada não muda nada e TODA a tripulação (mesmo quem está `working`) descansa em dobro; Depot mantém o reparo por equipe mas sem teto de stacking (toda posição vale 1.0); Science tira a trava de cooldown (piso de eficiência despacha na hora). Reteste na 6ª rodada.

- [ ] 9.4 Pool da base zerado → base destruída → se você estiver atracado,
      **fim de jogo** (`destroyed_with_base`).

      - Os klingons nunca me atacaram enquanto atracado em setor hostil.

## 11. Condições terminais

- [x] 11.3 **Morte por radiação** — deixar o breach sem equipe designada, 5 turnos.

       - Finalmente apareceu uma rolagem de breach! E foi desastroso! Mesmo despachando duas equipes para o WC e reparando a 100%, o contador não parou e perdi a partida por radiação.

- [ ] 11.4 **Breach contido** — designar equipe e chegar a 100% antes do relógio.

       - Não funcionou. Vide anterior.

- [ ] 11.8 **Base atracada destruída** — item 9.4.

## 13. Balanceamento (anotar, não corrigir agora)

- [x] 13.2 Overload/breach está punitivo demais? (segue sem observação desde a
      1ª rodada)

       - Vide anterior para breach. Forcei um overload e consegui recuperar com duas equipes facilmente. Com uma equipe só, ficou mais apertado, mas ainda deu para salvar, porém, disparou um evento de breach e aconteceu o problema já relatado.

- [ ] 13.4 Send Party às cegas é dilema ou frustração? (o Survey da
      `bridge-awareness` é a resposta desenhada — ver seção 22)

      - Ainda não deu para testar, pois não aplicamos ainda a change relativa ao survey de planetas. Fica para a próxima rodada.

- [x] 21.6 Concentrar 2 equipes num sistema continua batendo espalhar 1 por
      sistema? (`STACKING_MULTIPLIERS` começa `[1, 1, ...]`.) Estratégia
      dominante e invisível: se pesar demais, vira dica no Briefing.

## 14. Degradação de sensor por dano

- [ ] 14.7 SRS/LRS com dano moderado (`d > 0.30`) **piscam**; dano crítico apaga
      o display por completo.
- [ ] 14.8 LRS com dano moderado ou pior: dígitos do KBS variam sozinhos na
      tela, mas o Star Chart mantém o dado real depois de reparar o sensor.

## 15. Base científica

- [ ] 15.7 Atracar em base científica com equipes de CdD exaustas: fadiga
      recupera mais rápido que numa doca comum, com as mesmas equipes e o mesmo
      tempo atracado.

      - **Implementado pela `docking-overhaul`:** além da recuperação mais
        rápida, uma equipe no piso (20%) volta direto ao pool despachável, sem
        esperar chegar a 50% (trava de cooldown não se aplica na science
        station). Reteste na 6ª rodada.

---

# PARTE C — Bloqueado até a change ser aplicada

## 20. `enemy-species`

- [ ] 20.1 Os 5 tipos aparecem ao longo de uma partida — inclusive Romulano, que
      **nunca nasceu** (`materializeSector` crava `KLINGON_CRUISER`).
- [ ] 20.2 Scout é perceptivelmente mais fraco que warbird/D7 — em poder **e**
      em escudo, já que `combat-balance` deixou a faixa por tipo pronta.
- [ ] 20.3 Recusa de hail traz fala Romulana quando o alvo é Romulano — a tabela
      existe desde a `hail-and-identity` e é código morto.
- [ ] 20.4 (15.4) Klingon amassado raramente se rende; raider se entrega fácil.
- [ ] 20.5 Combate com 3 atacantes de facções diferentes: dá pra dizer quem
      atirou **pela cor**. Azul/nós, vermelho Klingon, verde Romulano, roxo
      raider.
- [ ] 20.6 As cores seguem o tema nos 7 temas, e continuam legíveis sob
      `.red-alert`.

## 22. `bridge-awareness`

- [ ] 22.1 (10.0) Entrar em setor com hostil visível sobe o alerta pra `red`
      sozinho.
- [ ] 22.2 Hostil conhecido na vizinhança põe em `yellow`.
- [ ] 22.3 Limpar o setor **não** baixa o alerta — descida é sempre do jogador.
- [ ] 22.4 (11.5) Life Support crítico: o mostrador troca `%` por `T-n`.
- [ ] 22.5 Warp Core em breach mostra `T-n`; Hull nunca mostra contagem.
- [ ] 22.6 Alert 10 toca todo turno com WC/LS crítico **sem** equipe designada e
      trabalhando; despachar equipe **cala**; equipe caindo em `cooldown`
      ressoa.
- [ ] 22.7 Hull crítico toca **uma vez** ao cruzar, e rearma se recuperar e cair
      de novo.
- [ ] 22.8 (13.4) Survey custa 1 turno, diz só se há dilítio, e não consome
      carga.
- [ ] 22.9 Survey com SRS amassado às vezes mente, sem marcar qual leitura é
      confiável; com SRS crítico o botão nem está disponível.
- [ ] 22.10 Reparar o SRS e refazer o Survey lê certo — a corrupção era do
      relatório, nunca do estado.
- [ ] 22.11 (15.9) 3ª coluna no NavSensing mostra scan, survey e achado da
      equipe, em tamanho legível.
- [ ] 22.12 Lançar sonda cai em `captain`; o que ela reporta cai em `science`.

---

## Observações Gerais

      - É um pouco difícil acertar uma célula específica nos sensores. Vamos colocar um efeito se brilho a 1.25 no hover sobre a célula.

      - Também seria bom colocar um marcador de objeto selecionado no SRS, como a moldura de posição no SRS. Ambas usando a cor primary-static, para acompanhar o tema e reagir a alertas.

      - Insira um delay de 500ms antes do início do turno do inimigo. O contra-ataque está acontecendo imediatamente após o ataque do jogador, está confuso. Mesmo com o código por cores a chegar, é interessante dar um respiro ao jogador.

---

## Tratamento dos achados da 5ª rodada

| Achado | Tratamento | Onde |
| --- | --- | --- |
| 11.3/11.4 breach incontível | equipe fica no núcleo com breach ativo | commit `656bf6b` ✅ |
| 23.3 poder caía com escudo cheio | auto-dreno de 1978 removido | `combat-tuning` |
| 9.4 Klingons inertes atracado | idem — eram zumbis (poder 0) | `combat-tuning` (reteste) |
| 23.18 inimigo teleporta na fuga | movimento deliberado, 3 células/turno | `combat-tuning` |
| — pressão infinita sem o dreno | `enemyEnergy`: rajada e recarga | `combat-tuning` |
| 23.13/23.14 regen invertida | baixado = taxa cheia, erguido ~40% | `combat-tuning` |
| 23.17 termodinâmica | Joule: calor ∝ potência² | `combat-tuning` |
| 26.4 som atropelado | disparo migra pra fila de apresentação | `round-5-fixes` |
| 24.1 briefing fixo | frota + stardates reais na tela | `round-5-fixes` |
| 25.1 nave "estacionada" | ícone some enquanto atracada | `round-5-fixes` |
| 9.3 modelo por tipo de base | drones / sem stacking / sem cooldown | `docking-overhaul` ✅ |
| 23.8 inimigo coberto passivo | refinamento de IA | `BACKLOG.md` |

**Fechadas de tabela pela `docking-overhaul`:** a dívida
`DOCKED_REPAIR_PER_TICK` (allowlist do ratchet) e "working como idle" (backlog).

**Nesta rodada também nasceu o `reachability.test.ts`** (ratchet de integração
oca), que pegou 4 achados na primeira execução — `toggleRedAlert` morta, pesos
de rating nunca lidos, `CRITICAL_INTEGRITY` cravado como `40`, e
`MISSION_DURATION` morta desde a `mission-scaling`.
