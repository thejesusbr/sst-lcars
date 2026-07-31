# Roteiro de Playthrough — 4ª rodada

Substitui `changes/engine-integration/PLAYTHROUGH.md`, que virou histórico: as
3 primeiras rodadas, os achados de cada uma e o tratamento que receberam ficam
lá. Aqui está só o **que ainda não foi verificado**, mais o que as changes
desta leva introduziram.

**Como usar:** marque `[x]` no que passar, escreva o observado embaixo do que
falhar. Cada item tem o **esperado** explícito pra não virar "achei estranho".

```
npm run dev          # app
npm run storybook    # cenários isolados (stories por console)
```

## O que está no jogo nesta rodada

| Change | Estado | O que esta rodada verifica |
| --- | --- | --- |
| `engine-integration` | aplicada | itens antigos nunca alcançados |
| `game-feel-and-pacing` | aplicada + emenda | encenação, LUT de warp, sincronia do grid, som de impacto |
| `hail-and-identity` | aplicada | base científica |
| `playtest-round-3` | aplicada | KBS vivo, selo/Tribbles, campo do Life Support |
| `enemy-species` | **não aplicada** | — seção 20 fica bloqueada |
| `mission-pacing` | aplicada | relógio de 40, fadiga meia-vida 6, 4 sondas |
| `bridge-awareness` | **não aplicada** | — seção 22 fica bloqueada |

Estado inicial de referência (semente aleatória por partida):

| Campo | Valor |
| --- | --- |
| `stardate` | 3600.0, limite **3640.0** |
| `WARP_CORE_OUTPUT` (vazão, core intacto) | 4500 |
| `hullIntegrity` | 100 |
| consumo em New Game | ~1915 |
| **orçamento em New Game** | **~2585** |
| `shieldEnergy` | 1500 |
| `phaserPower` | 1500 (unidades de energia) |
| `torpedoStock` | 8, tubos vazios |
| `remainingProbes` | **4** |
| inimigos na galáxia | ~17 (13–22), **todos `KLINGON_CRUISER` até `enemy-species`** |
| bases | ~4,6 (≥1 `STARBASE_DOCK`) |

---

# PARTE A — Novo nesta leva

## 16. Sincronia do grid com a encenação (emenda `game-feel-and-pacing`)

A 3ª rodada reportou "a animação aparece deslocada em relação à posição dos
ícones". A causa não era pixel: o engine resolve o turno **inteiro** antes do
primeiro evento entrar em cena, então o scanner desenhava o estado final
enquanto o feixe ancorava em `evt.at`, a célula do instante do tiro. Agora o
grid pertence à apresentação enquanto a fila drena.

- [ ] 16.1 Disparar phaser: a linha começa na célula onde a nave **está
      desenhada** e termina na célula onde o alvo **está desenhado** — as duas
      pontas batem com os ícones, não com posições invisíveis.
- [ ] 16.2 Torpedo: o asterisco chega na célula do ícone do alvo, não ao lado.
- [ ] 16.3 Inimigo destruído continua desenhado enquanto o tiro que o matou é
      encenado, e some quando a fila termina — não some antes do feixe chegar.
- [ ] 16.4 Turno com movimento **e** combate: a nave é desenhada onde estava
      quando atirou, e salta pro destino só no fim da fila.
- [ ] 16.5 Turno sem nada encenável (só reparo/movimento) assenta na hora — não
      existe grid congelado esperando fila vazia.
- [ ] 16.6 Trocar de console no meio da encenação e voltar: nada de timer órfão,
      nada de grid preso no congelado.

## 17. SRS durante o warp (item 14.10 da 3ª rodada)

- [ ] 17.1 Engajar warp: o SRS fica **em branco** durante a viagem inteira — não
      mostra nem o setor de origem nem o de destino.
- [ ] 17.2 O setor de destino aparece só quando a animação de warp termina, não
      no instante do engage.
- [ ] 17.3 O LRS **continua** como antes: KBS e idade da informação atualizam na
      chegada. É conhecimento, não a vista da janela.
- [ ] 17.4 Viagem de 1 turno: o branco dura o intervalo da LUT daquele fator, e
      não pisca instantaneamente.

## 18. Som de impacto (emenda `game-feel-and-pacing`)

Disparo já tinha som; faltava a chegada.

- [ ] 18.1 Escudo absorvendo toca `shield_sizzle`, em passo com o pulso na nave.
- [ ] 18.2 Dano de casco toca acerto de casco, e ele **varia** entre golpes numa
      troca longa (4 amostras) — não soa como loop travado.
- [ ] 18.3 Destruir inimigo toca a explosão, no evento do acerto que o matou.
- [ ] 18.4 Numa batalha com 3+ eventos seguidos, nenhum som atropela o próximo
      (cortes de 1.2–2s contra 650ms por evento).
- [ ] 18.5 Turno sem combate é silencioso.

## 19. KBS vivo e selo de integridade (`playtest-round-3`)

- [ ] 19.1 Limpar todos os inimigos do setor: o dígito K do quadrante atual cai
      pra `0` no SRS, **sem** reescanear.
- [ ] 19.2 Os 4 leitores concordam no mesmo quadrante parcialmente limpo: SRS,
      Scan de LRS, relatório de sonda e Star Chart.
- [ ] 19.3 Sair do quadrante recém-limpo e olhar o Star Chart: o código continua
      o vivo, com confiança cheia — não volta ao pré-combate.
- [ ] 19.4 Conhecimento de **outros** quadrantes continua envelhecendo normal —
      só o que você tocou é que refresca.
- [ ] 19.5 Indicador de Life Support no SituationPanel mostra número, não erro.
- [ ] 19.6 **Tribbles por selo adulterado.** Procedimento (nenhum funcionava
      antes das 3 primeiras rodadas: a verificação nunca era chamada, e nenhum
      componente desenhava Tribble):
      1. Jogar **1 turno** — o selo só é gravado no fim de um turno resolvido.
      2. DevTools → Application → Local Storage. Existem **duas** chaves:
         `sst-lcars-game-state` (o save) e `sst-lcars:save-checksum` (o selo).
      3. Editar **só** o save — `stardate`, `torpedoStock`, o que for — e **não
         tocar** no `sst-lcars:save-checksum`.
      4. F5. A população dobra a cada turno: 2, 4, 8, 16…
      5. Esperado: Tribbles flutuando sobre a UI já no 1º turno depois do
         reload, som entrando no 4º (>10 ícones), e **nenhuma** mensagem
         explicando. Editar pelo devtools do Vue **não** serve: o selo compara
         contra o `localStorage`, não contra o estado em memória.
- [ ] 19.7 Save honesto atravessa a partida inteira sem um Tribble.
- [ ] 19.8 Tribbles não interceptam clique — o jogo segue jogável, degradado.

---

## 21. Ritmo da missão (`mission-pacing`)

Três constantes mudaram com base em simulação, e a simulação está presa em
teste (`missionPacing.test.ts`): a engine confirma 11 turnos de reparo pesado e
a curva `89 / 71 / 50 / 25` nos turnos 1 / 3 / 6 / 12. **O que a 4ª rodada
mede é se o número certo produz a sensação certa** — teste verde não diz isso.

- [ ] 21.1 (13.1) 40 stardates dão pra caçar ~17 inimigos **e** se recuperar de
      uma batalha dura? A 3ª rodada: "depois de uma batalha difícil, a espera
      para recuperar dano sempre levou a derrota por tempo".
- [ ] 21.2 (13.3) Reparo pesado (6 subsistemas a 20%, 1 equipe cada) sai em ~11
      turnos, não ~19 — e dá pra sentir a diferença jogando, não só na tabela.
- [ ] 21.3 Equipe trabalhando 12 turnos seguidos ainda rende. Antes ela batia no
      piso no 7º e virava inerte a 3 pontos/turno.
- [ ] 21.4 (13.5) 4 sondas. Ainda é pouco?
- [ ] 21.5 **Afrouxou demais? A partida virou passeio?** É o risco declarado
      desta change — anotar sensação, não corrigir. Três constantes se moveram
      juntas, então se ficou fácil demais o suspeito é o conjunto.
- [ ] 21.6 Concentrar 2 equipes num sistema continua batendo espalhar 1 por
      sistema? (`STACKING_MULTIPLIERS` começa `[1, 1, ...]` — a 2ª equipe entra
      com valor cheio.) Estratégia dominante e invisível: se pesar demais no
      jogo real, vira candidata a dica no Briefing.

---

# PARTE B — Nunca alcançado nas rodadas 1–3

## 3. Turno

- [ ] 3.2 "Skip 5" avança até 5, **parando antes** se aparecer inimigo, tomar
      dano, começar breach ou fim de jogo.

## 4. Energia e sobrecarga

- [ ] 4.5 Danificar o Warp Core faz "Core Output" **cair** sem o consumo mudar.
- [ ] 4.6 Com core ≤40% e consumo de cruzeiro, "Overload" sobe **sozinho**, sem
      tocar no dial manual — mas devagar: a 40% são 0.02 de dano/turno, a 20%
      são 0.26. Nada de morte súbita.
- [ ] 4.7 Baixar escudo e desligar sensores **para** a sobrecarga (vai a zero) —
      é a resposta tática pretendida, e funciona até com o core a 10%.
- [ ] 4.7b Com o core a 20% e consumo de cruzeiro, a nave aguenta ~23 turnos.
      Com o core a 10%, ~5 turnos. Terror com janela de reação, não penhasco.
- [ ] 4.8 Status vira `Overload` quando o orçamento fica negativo.
- [ ] 4.9 Disparar phaser a 3000 com escudo no teto: consumo ~4415, cabe no core
      intacto e estoura em core danificado.

## 5. Movimento

- [ ] 5.7 Warp 6+ danifica o Warp Core aos poucos durante a viagem; warp ≤4 não.
- [ ] 5.8 Boost: só gasta duração em turno com movimento real; cooldown decai em
      qualquer turno.

## 6. Combate

- [ ] 6.4 Phaser Banks em crítico (<40): disparo bloqueado, não só mais fraco.
- [ ] 6.7 Dano no SRS às vezes **perde** o lock no fim do turno.
- [ ] 6.10 Prisioneiro na cela **trava 1 equipe** de CdD em `guard`.
- [ ] 6.11 Escudo erguido protege o casco: tomar dano com escudo no teto não
      mexe em "Hull". Com escudo em 0, "Hull" cai.

## 7. Controle de danos

- [ ] 7.4 Equipe no piso (20%) entra em `cooldown` e só volta com 50%+.
- [ ] 7.6 Subsistema <40 mostra `OFFLINE` piscando, não `DAMAGED`.

## 9. Atracagem

- [ ] 9.2 Atracar repõe **casco** e torpedos, baixa escudo, zera overload,
      transfere prisioneiros, libera guarda. (Só `STARBASE_DOCK` reforma casco;
      `STARBASE_SUPPLY` só repõe torpedo; `STARBASE_SCIENCE` acelera o descanso
      das equipes de CdD em vez de repor material.)
- [ ] 9.3 "REPAIR TURN (DOCKED)" no Engineering repara em tier 5 e redireciona o
      dano inimigo pro pool da base.
- [ ] 9.4 Pool da base zerado → base destruída → se você estiver atracado,
      **fim de jogo** (`destroyed_with_base`).
- [ ] 9.5 "Undock" põe a nave a sudoeste da base, sem gastar turno.

## 11. Condições terminais

Ordem de prioridade Kobayashi Maru: derrota sempre supera vitória.

- [ ] 11.3 **Morte por radiação** — deixar o breach sem equipe designada, 5 turnos.
- [ ] 11.4 **Breach contido** — designar equipe e chegar a 100% antes do relógio.
- [ ] 11.6 **Casco destruído** — baixar escudo e levar dano até `hullIntegrity`
      chegar a 0. Indicador "Hull" no SituationPanel deve piscar antes.
- [ ] 11.8 **Base atracada destruída** — item 9.4.

## 13. Balanceamento (anotar, não corrigir agora)

Sem número esperado — é pra registrar sensação. 13.1, 13.3 e 13.5 migraram
pra seção 21, que agora está liberada.

- [ ] 13.2 Overload/breach está punitivo demais? (segue sem observação desde a
      1ª rodada)
- [ ] 13.4 Send Party às cegas (70% dos planetas estéreis) é dilema ou
      frustração? (o Survey da `bridge-awareness` é a resposta desenhada — ver
      seção 22)

## 14. Degradação de sensor por dano

- [ ] 14.7 SRS/LRS com dano moderado (`d > 0.30`) **piscam**; dano crítico apaga
      o display por completo.
- [ ] 14.8 LRS com dano moderado ou pior: dígitos do KBS variam sozinhos na
      tela, mas o Star Chart mantém o dado real depois de reparar o sensor.

## 15. Base científica

- [ ] 15.7 Atracar em base científica com equipes de CdD exaustas: fadiga
      recupera mais rápido que numa doca comum, com as mesmas equipes e o mesmo
      tempo atracado.

---

# PARTE C — Bloqueado até a change ser aplicada

Não testar agora. Fica aqui pra a rodada não redescobrir o que já está
desenhado, e pra o item nascer junto da change que o resolve.

## 20. `enemy-species`

- [ ] 20.1 Os 5 tipos aparecem ao longo de uma partida — inclusive Romulano,
      que **nunca nasceu** até esta change (`materializeSector` cravava
      `KLINGON_CRUISER`).
- [ ] 20.2 Scout é perceptivelmente mais fraco que warbird/D7.
- [ ] 20.3 Recusa de hail traz fala Romulana quando o alvo é Romulano — a tabela
      existe desde a `hail-and-identity` e era código morto.
- [ ] 20.4 (15.4) Klingon amassado raramente se rende; raider se entrega fácil.
      A 3ª rodada reportou "muitos inimigos danificados se renderam".
- [ ] 20.5 (14.1/14.2) Combate com 3 atacantes de facções diferentes: dá pra
      dizer quem atirou **pela cor**, sem ler o log. Azul/nós, vermelho Klingon,
      verde Romulano, roxo raider.
- [ ] 20.6 As cores seguem o tema nos 7 temas, e continuam legíveis sob
      `.red-alert`.

## 22. `bridge-awareness`

- [ ] 22.1 (10.0) Entrar em setor com hostil visível sobe o alerta pra `red`
      sozinho.
- [ ] 22.2 Hostil conhecido na vizinhança (por scan ou por mover-se adjacente a
      quadrante detectado hostil) põe em `yellow`.
- [ ] 22.3 Limpar o setor **não** baixa o alerta — descida é sempre do jogador.
- [ ] 22.4 (11.5) Life Support crítico: o mostrador troca `%` por `T-n` e a
      contagem anda a cada turno.
- [ ] 22.5 Warp Core em breach mostra `T-n` do breach; Hull nunca mostra
      contagem, só `%`.
- [ ] 22.6 Alert 10 toca todo turno com WC/LS crítico **sem** equipe designada e
      trabalhando; despachar equipe **cala**; equipe caindo em `cooldown`
      ressoa.
- [ ] 22.7 Hull crítico toca **uma vez** ao cruzar, e rearma se recuperar e cair
      de novo.
- [ ] 22.8 (13.4) Survey custa 1 turno, diz só se há dilítio (não quanto), e não
      consome carga.
- [ ] 22.9 Survey com SRS amassado às vezes mente, sem nada marcando qual leitura
      é confiável; com SRS crítico o botão nem está disponível.
- [ ] 22.10 Reparar o SRS e refazer o Survey no mesmo planeta lê certo — a
      corrupção era do relatório, nunca do estado.
- [ ] 22.11 (15.9) 3ª coluna no NavSensing mostra scan, survey e achado da
      equipe, em tamanho legível — a dica de base adjacente sai da fonte
      minúscula.
- [ ] 22.12 Lançar sonda cai em `captain`; o que ela reporta cai em `science`.
      Mesma divisão pra landing party.

---

## Observado — 4ª rodada
