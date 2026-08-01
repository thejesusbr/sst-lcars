# Roteiro de Playthrough — 6ª rodada

Substitui `PLAYTHROUGH_5.md`, que vira histórico. Aqui está só o que ainda não
foi verificado, mais o que esta leva introduziu.

**Como usar:** marque `[x]` no que passar, escreva o observado embaixo do que
falhar. Cada item tem o **esperado** explícito pra não virar "achei estranho".

```
npm run dev          # app
npm run storybook    # cenários isolados (stories por console)
```

## O que está no jogo nesta rodada

| Change             | Estado   | O que esta rodada verifica                                        |
| ------------------ | -------- | ----------------------------------------------------------------- |
| `combat-tuning`    | **nova** | energia inimiga (rajada/recarga), movimento deliberado, regen invertida, Joule |
| `round-5-fixes`    | **nova** | som na fila, briefing real, nave invisível atracada               |
| `docking-overhaul` | **nova** | drydock com drones, depot sem stacking, science sem cooldown      |
| `enemy-species`    | **nova** | os 5 tipos nascem, rendição por espécie, cor de facção            |
| `bridge-awareness` | **nova** | alerta automático, Alert 10, T-n, Survey, log de ciência          |
| quick-fixes        | **novas**| autoload de torpedo, phaser não esquenta com torpedo, estoque 7-9, botão Regenerate |
| rodadas anteriores | aplicadas| itens ainda não alcançados (Parte B)                              |

Estado inicial de referência (semente aleatória por partida):

| Campo                                    | Valor                                                     |
| ---------------------------------------- | --------------------------------------------------------- |
| `stardate`                               | 3600.0, limite = 3600 + (25 + 1.2 × frota)                |
| `WARP_CORE_OUTPUT` (vazão, core intacto) | 4500                                                      |
| `hullIntegrity`                          | 100                                                       |
| `shieldEnergy`                           | 1500 (regen: 50/turno baixado, ~20/turno no teto)         |
| `phaserPower`                            | 1500 (o ponto onde o aquecimento vale 30; Joule: 3000 = 4×) |
| `torpedoStock`                           | **sorteio 7–9** (max 12), tubos vazios                    |
| `remainingProbes`                        | 4                                                         |
| inimigos na galáxia                      | ~17 (13–22), **sorteio dos 5 tipos por peso**             |
| energia de ataque inimiga                | 100; ataque custa 25; recarrega 15/turno ocioso           |
| movimento inimigo                        | 3 células/turno: aproxima com energia, evade sem          |
| poder por tipo (× 200)                   | cruiser 0.5–1.5 · D7/warbird 1.2–2.0 · scout 0.3–0.8 · raider 0.8–1.4 |
| escudo por tipo (× 200)                  | cruiser 0.5–1.0 · D7/warbird 0.9–1.4 · scout 0.2–0.5 · raider 0.4–0.8 |
| rendição (intacto → farrapos)            | Klingon 10→35% · Romulano 15→45% · raider 30→70%          |

---

# PARTE A — Novo nesta leva

## 27. Combate com energia e movimento (`combat-tuning`)

O auto-dreno de 1978 morreu: inimigo não se desarma mais sozinho. Em troca,
ganhou pool de energia (rajada de ~4 tiros, depois pausa pra recarregar) e
movimento deliberado.

- [ ] 27.1 (23.3) Escudo do inimigo cai primeiro; o poder **só** cai por dano
      seu — nunca sozinho, nunca com o escudo ainda de pé.
- [ ] 27.2 Inimigo ataca em rajada e depois passa turnos sem atacar
      (recarregando) — combate tem ritmo, não pressão contínua.
- [ ] 27.3 (23.18) Fuga funciona: correr 7–8 células em impulso/evade abre
      distância de verdade — o inimigo cobre no máximo 3 células/turno e **não
      teleporta** mais.
- [ ] 27.4 Inimigo **sem** energia evade (abre distância); **com** energia
      aproxima. Observável em 2–3 turnos seguidos de combate.
- [ ] 27.5 (9.4) Klingons **atacam** a nave atracada em setor hostil — o pool da
      base absorve o dano. Eram zumbis com poder 0, agora não são.
- [ ] 27.6 (11.8) Pool da base zerado por esses ataques → base destruída → se
      atracado, fim de jogo `destroyed_with_base`.
- [ ] 27.7 (23.13/23.14) Regen de escudo **invertida**: escudos baixados
      recuperam rápido (taxa cheia), erguidos recuperam devagar (~40%).
- [ ] 27.8 (23.17) Joule: disparar a 3000 esquenta 4× o de 1500 (120 vs 30).
      Potência acima do padrão agora cobra caro de verdade.

## 28. Apresentação e feedback (`round-5-fixes`)

- [ ] 28.1 (26.4) Som de phaser/torpedo toca **junto** do evento na fila, e o
      da explosão não atropela mais o do disparo.
- [ ] 28.2 (24.1) Briefing mostra a frota real e os stardates alocados da
      partida — sem texto fixo, sem olhar localStorage.
- [ ] 28.3 (25.1/25.2) Ícone da nave **some** do scanner enquanto atracada (ela
      está dentro da base); reaparece ao lado da base no undock.

## 29. Atracagem por tipo de base (`docking-overhaul`)

- [ ] 29.1 (9.3) **Drydock:** repair turn conserta ~25/subsistema/tick **sem
      equipe nenhuma designada**; designar equipe não muda a taxa; o
      Engineering avisa que o reparo é automático.
- [ ] 29.2 Drydock: equipe que estava `WORKING` ao atracar **descansa** durante
      o loop (+16%/turno) em vez de acumular fadiga.
- [ ] 29.3 **Depot:** reparo continua sendo das equipes, mas 3–4 equipes no
      mesmo sistema rendem valor cheio cada — sem penalidade de stacking.
- [ ] 29.4 Depot: **não** repara sozinho — sem equipe designada, nada acontece.
- [ ] 29.5 (15.7) **Science:** fadiga recupera mais rápido que na drydock, e
      equipe no piso (20%) volta **direto** ao pool despachável — sem esperar
      50%.
- [ ] 29.6 Science: no undock a trava de cooldown **volta** ao normal.

## 20. Espécies inimigas (`enemy-species`) — desbloqueada

- [ ] 20.1 Os 5 tipos aparecem ao longo de uma partida — inclusive Romulano.
- [ ] 20.2 Scout é perceptivelmente mais fraco que warbird/D7 — em poder **e**
      em escudo. Um setor com 1 D7 é problema diferente de um com 3 scouts.
- [ ] 20.3 Recusa de hail traz fala Romulana quando o alvo é Romulano.
- [ ] 20.4 (15.4) Klingon amassado raramente se rende; raider se entrega fácil.
      Amaciar antes de saudar agora compensa — e compensa mais contra raider.
- [ ] 20.5 Combate com atacantes de facções diferentes: dá pra dizer quem atirou
      **pela cor**. Azul/nós, vermelho Klingon, verde Romulano, roxo raider.
- [ ] 20.6 As cores seguem o tema nos 7 temas, e continuam legíveis sob
      `.red-alert`. (Stories novas de `LcarsScanner` ajudam a conferir isolado.)
- [ ] 20.7 Raider nasce **cloacado** — invisível no scanner até decloacar, nas
      regras de estresse/cooldown que já existiam.

## 22. Consciência da ponte (`bridge-awareness`) — desbloqueada

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
      carga. Send Party às cegas deixou de ser a única opção — virou dilema?
- [ ] 22.9 Survey com SRS amassado às vezes mente, sem marcar qual leitura é
      confiável; com SRS crítico o botão nem está disponível.
- [ ] 22.10 Reparar o SRS e refazer o Survey lê certo — a corrupção era do
      relatório, nunca do estado.
- [ ] 22.11 (15.9) 3ª coluna no NavSensing mostra scan, survey e achado da
      equipe, em tamanho legível — e a dica de base adjacente mudou pra lá.
- [ ] 22.12 Lançar sonda cai em `captain`; o que ela reporta cai em `science`.
      Aba "Sci. Log" nova no SituationPanel com contador de não-lidos próprio.

## 30. Quick-fixes da entre-rodada

- [ ] 30.1 **Autoload:** tubo com o toggle ligado carrega sozinho no fim do
      turno (sem gastar a ação), respeitando estoque e falha por dano — linha
      no log de general quando carrega.
- [ ] 30.2 Disparar **torpedo** não esquenta o phaser — e o phaser **resfria**
      normalmente num turno de só-torpedo.
- [ ] 30.3 Estoque inicial de torpedos varia 7–9 entre partidas (era sempre 8).
- [ ] 30.4 Botão **Regenerate** no Briefing sorteia outra missão sem sair da
      tela; Start continua funcionando igual.

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
- [ ] 23.15 Shield Control em crítico **para** a regeneração de vez.
- [ ] 23.16 Atracar zera o dano acumulado de escudo.

## 11. Condições terminais

- [ ] 11.4 **Breach contido** — designar equipe e chegar a 100% antes do
      relógio. (O bug que congelava a contenção foi corrigido no `656bf6b`;
      reteste com a correção.)

## 13. Balanceamento (anotar, não corrigir agora)

- [ ] 24.2 Partida com frota pequena (13–14) não ficou frouxa demais.
- [ ] 13.5 Depot com 4+ equipes no mesmo sistema repara rápido demais? (90/turno
      é o teto teórico com todas a 100%; a fadiga morde do 2º turno em diante —
      medir a sensação.)
- [ ] 13.6 Rajada de 4 ataques inimigos seguidos está letal demais em setor com
      3+ hostis? (Cada um tem pool próprio de 100.)

## 14. Degradação de sensor por dano

- [ ] 14.7 SRS/LRS com dano moderado (`d > 0.30`) **piscam**; dano crítico apaga
      o display por completo.
- [ ] 14.8 LRS com dano moderado ou pior: dígitos do KBS variam sozinhos na
      tela, mas o Star Chart mantém o dado real depois de reparar o sensor.

---

## Pendências registradas, ainda não implementadas

Da 5ª rodada, aguardando virar change (não testar, só lembrar que existem):

- Brilho 1.25 no hover das células dos sensores (mira difícil).
- Marcador de objeto selecionado no SRS, em `primary-static` (acompanha tema e
  alertas), como a moldura de posição.
- Delay de 500ms antes do turno do inimigo (contra-ataque cola no ataque).
- Sobrecarga temporária de reator quando a potência de phaser ajustada excede o
  orçamento (`BACKLOG.md`).
- Previsão de turnos de warp/impulso pras coordenadas selecionadas
  (`BACKLOG.md`).

---

## Tratamento dos achados da 6ª rodada

_(preencher após a rodada, achado → tratamento → onde)_

| Achado | Tratamento | Onde |
| ------ | ---------- | ---- |
