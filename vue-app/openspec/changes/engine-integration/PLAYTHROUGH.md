# Roteiro de Playthrough — task 5.5 da `engine-integration`

Verificação manual das condições terminais e do fluxo de turno. Testes
automatizados cobrem o engine (161 verdes); isto cobre o que só aparece
**rodando o app**: reatividade entre consoles, som, habilitação de botão,
persistência real e balanceamento.

**Como usar:** marque `[x]` no que passar, escreva o observado embaixo do que
falhar. Cada item tem o **esperado** explícito pra não virar "achei estranho".

```
npm run dev          # app
npm run storybook    # cenários isolados (stories por console)
```

Estado inicial de referência (semente aleatória por partida):

| Campo                                    | Valor                      |
| ---------------------------------------- | -------------------------- |
| `stardate`                               | 3600.0, limite 3630.0      |
| `WARP_CORE_OUTPUT` (vazão, core intacto) | 4500                       |
| `hullIntegrity`                          | 100                        |
| consumo em New Game                      | ~1915                      |
| **orçamento em New Game**                | **~2585**                  |
| `shieldEnergy`                           | 1500                       |
| `phaserPower`                            | 1500 (unidades de energia) |
| `torpedoStock`                           | 8, tubos vazios            |
| `remainingProbes`                        | 3                          |
| inimigos na galáxia                      | ~17 (13–22)                |
| bases                                    | ~4,6 (≥1 `STARBASE_DOCK`)  |

---

## 0. Bugs já reportados nesta sessão

- [x] **Energy Level travado em 3000.** Corrigido: o widget lia `mainEnergy`
      (estoque), que o consumo por turno nunca desconta. Agora mostra
      `energyBudget` = gerada − consumida. Em New Game deve ler **~2585**, não
      3000, e **mexer** ao ligar/desligar sensor ou transferir escudo.
- [x] **`subsystemDraw` ignorava as ações do turno.** O 2º parâmetro
      (`movedUnderImpulse`/`firedPhasers`/`torpedoesFired`) nunca era passado, então
      Impulso (até 2000) e Phaser (até 3000) contribuíam **sempre zero** — consumo
      máximo alcançável era ~2960 de 4500 e `autoOverload` nunca disparava.
- [x] **`phaserPower` com duas escalas.** `combat`/`warpCore` leem unidades de
      energia (inicia em 1500); a store clampava em `0..100`. Tocar no dial
      truncava 1500 → 100 e derrubava dano e consumo junto.

---

## 1. Modelo de energia — RESOLVIDO (2026-07-30)

Energia é **vazão, não estoque**. O Warp Core gera potência por turno, os
subsistemas consomem. Consumir acima do que ele gera não esvazia tanque: gera
**sobrecarga**, que danifica o core e pode virar breach. Sobrecarga e breach
substituem a perda por esgotamento do original de 1978 (`E=E-N-10`, descartado).

Consequências já implementadas:

- **`out_of_energy` removido** das condições terminais e do tipo `EndGameReason`.
- **`mainEnergy` removido** do `GameState`. Não há estoque.
- **Escudo é nível**, não transferência: ajustar é livre e instantâneo, sem pool
  de origem; o nível erguido taxa o consumo todo turno.
- **Disparo de phaser não é barrado** por falta de estoque. Sai sempre na potência
  escolhida; o preço é o consumo daquele turno, que pode estourar o orçamento.
- **`hullIntegrity` (0-100) é novo**: é o que o dano inimigo consome depois que os
  escudos saturam. Zerar = `hull_destroyed`. Sem estoque de energia, o excedente
  precisava de um sink real.
- **Output do core cai com o dano**: `4500 × (1 - d)`, sem piso.

A curva, medida no engine (consumo de cruzeiro 1915, sem reparo de equipe):

```
integ  output  orçamento  overload  dano/turno  explode%   turnos até zerar
   40    1800       -115         1        0.02     0.01%    partida inteira
   35    1575       -340         3        0.04     0.02%    partida inteira
   30    1350       -565         4        0.06     0.02%    partida inteira
   25    1125       -790         6        0.16     0.07%    partida inteira
   20     900      -1015         7        0.26     0.11%    23 turnos
   15     675      -1240         9        0.68     0.28%    11 turnos
   10     450      -1465        10        1.10     0.45%     5 turnos
```

Com **tudo desligado e escudo em 0** (consumo cai pro piso de 200: Life Support
150 + house load 50), a sobrecarga vai a **zero em qualquer integridade** — a
nave atravessa a partida inteira mesmo com o core a 10%. É a saída tática.

### Por que a curva mudou (2026-07-30)

A primeira versão usava `autoOverload = % do excesso sobre o output`, o que
empilhava **duas exponenciais**: a razão é hiperbólica (output encolhe → o
denominador encolhe → a razão dispara) e `WARP_CORE_DAMAGE_TABLE` é Fibonacci.
Resultado: **7 pontos de integridade atravessavam a tabela inteira**.

```
ANTES (% do excesso)              AGORA (excesso / 150)
integ 42  ->  0.02 dano/turno     integ 40  ->  0.02
integ 38  ->  2.88                integ 30  ->  0.06
integ 36  -> 51.68                integ 20  ->  0.26
integ 35  -> 85.00 + 55% expl.    integ 10  ->  1.10
      ^ morte em 1 turno                ^ 5 turnos, com saída
```

Aumentar o throughput do core (precisaria de 7979, 1,77×) ou suavizar a
degradação (`k = 0.81`) foram calculados e **descartados**: os dois só moviam o
penhasco de 35% pra 20% sem tirar a verticalidade, e o de throughput ainda
matava a mecânica — com 1277 de folga a 40% de integridade, consumo deixaria de
importar e desligar subsistema perderia função.

`OVERLOAD_PER_EXCESS = 150` é o knob. Menor = mais punitivo (125 deixa
integridade 20 em ~12 turnos em vez de 23).

## 2. New Game e geração de mundo

- [x] 2.1 App abre no Briefing; "Start" leva ao HUD.
- [x] 2.2 SRS mostra a nave **e** pelo menos 1 estrela (toda célula da galáxia
      tem ≥1 estrela — setor vazio aqui = hook `onQuadrantEnter` desligado).
- [x] 2.3 A nave **não** está em cima de nenhuma entidade.
- [ ] 2.4 Star Chart mostra só o quadrante atual, com moldura branca; o resto vazio
      (é o mapa do que foi explorado, não a verdade da galáxia).
- [ ] 2.5 Recarregar a página (F5): **mesma** galáxia, mesma posição, mesmo
      stardate. Semente persiste.
- [x] 2.6 "New Game" do ResultScreen gera galáxia **diferente**.

## 3. Turno: o relógio anda e para

- [x] 3.1 "End Turn" avança stardate em exatamente **1.0**.
- [ ] 3.2 "Skip 5" avança até 5, **parando antes** se aparecer inimigo, tomar
      dano, começar breach ou fim de jogo.
- [x] 3.3 Ação **recusada** não gasta turno: com 0 sondas, clicar "Send probe"
      não move o stardate e escreve o motivo no log.
- [x] 3.4 Combat log recebe entrada a cada turno com evento, com o stardate certo.

## 4. Energia

- [x] 4.1 Energy Level em New Game ≈ **2585**.
- [x] 4.2 Desligar LRS no Engineering: orçamento **sobe ~100**.
- [x] 4.3 Subir escudo pra 2500: orçamento **cai ~1000** a mais (escudo mantido
      custa `shieldEnergy` por turno) — e **não** existe pool de origem: o escudo
      chega ao teto sem "tirar de" lugar nenhum.
- [x] 4.4 Engineering: "Core Output" + "Subsystem Load" batem com o Energy Level
      (output − load), sempre.
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

- [ ] 5.1 **Impulso:** NavSensing → clicar célula do SRS → "Snd Helm". A nave
      move dentro do setor, 1 turno.
- [ ] 5.2 Impulso para **curto** ao ter estrela/planeta no caminho reto — não
      atravessa, não é recusado.
- [ ] 5.3 Inimigos no setor **reposicionam** quando você engaja movimento, e
      **não** reposicionam num "End Turn".
- [x] 5.4 **Warp:** Star Chart → clicar quadrante → "Snd to Helm" → Helm engaja.
      Duração = `ceil(distância / warpFactor)` turnos.
- [x] 5.5 Ao chegar em quadrante novo, o SRS repovoa (estrelas, talvez base/planeta)
      e a nave não nasce em cima de nada.
- [x] 5.6 Som de entrada e saída de warp toca.
- [ ] 5.7 Warp 6+ danifica o Warp Core aos poucos durante a viagem; warp ≤4 não.
- [ ] 5.8 Boost: só gasta duração em turno com movimento real; cooldown decai em
      qualquer turno.

## 6. Combate

- [x] 6.1 Sem inimigo visível: "Fire Phasers", "Lock" e "Cycle" desabilitados
      (clique toca som de negação).
- [x] 6.2 Com inimigo: "Lock" custa 1 turno e habilita "Fire Phasers".
- [x] 6.3 Disparar phaser aquece; turno sem disparar **esfria** (−30 × (1−d)).
- [ ] 6.4 Phaser Banks em crítico (<40): disparo bloqueado, não só mais fraco.
- [x] 6.5 Carregar tubo custa **1 turno** e tira 1 do estoque.
- [x] 6.6 Torpedo destrói cruiser em 1 acerto (dano 200–300 vs poder 100–300).
- [ ] 6.7 Dano no SRS às vezes **perde** o lock no fim do turno.
- [x] 6.8 Toggle "Photon Tubes" muda o consumo e toca power up/down.
- [ ] 6.9 Hail: ~30% de rendição; captura enche a cela; cela cheia recusa.
- [ ] 6.10 Prisioneiro na cela **trava 1 equipe** de CdD em `guard`.
- [ ] 6.11 Escudo erguido protege o casco: tomar dano com escudo no teto não
      mexe em "Hull". Com escudo em 0, "Hull" cai.

## 7. Controle de danos

- [x] 7.1 Despachar equipe é **livre** (não gasta turno).
- [x] 7.2 Integridade **não** sobe no turno do despacho; sobe no seguinte.
- [x] 7.3 Equipe trabalhando perde eficiência; equipe idle recupera (+8/turno).
- [ ] 7.4 Equipe no piso (20%) entra em `cooldown` e só volta com 50%+.
- [x] 7.5 Engineering lista **9** subsistemas, incluindo "Auto-Navigation Computer".
- [ ] 7.6 Subsistema <40 mostra `OFFLINE` piscando, não `DAMAGED`.

## 8. Sensores e sonda

- [x] 8.1 "Scan" do LRS revela o bloco 3×3 com código KBS.
- [x] 8.2 Confiança **decai** a cada turno; células vão esmaecendo, piso 30%.
- [ ] 8.3 Dano no LRS **acelera** o decaimento.
- [ ] 8.4 LRS em crítico: "Scan" desabilitado.
- [x] 8.5 Sonda a distância 3 resolve em **4 turnos**; contador mostra `T-n`.
- [x] 8.6 Sonda revela planeta **e** cargas de dilítio no log.
- [x] 8.7 Sonda em quadrante hostil às vezes é destruída (40% + 5%/inimigo extra),
      não revela nada e **não** é reembolsada.
- [x] 8.8 Planeta **não** aparece no LRS nem no Star Chart (só no SRS ao entrar).

## 9. Atracagem

- [x] 9.1 "Dock" desabilitado sem base adjacente.
- [ ] 9.2 Atracar repõe **casco** e torpedos, baixa escudo, zera overload,
      transfere prisioneiros, libera guarda. (Só `STARBASE_DOCK` reforma casco;
      `STARBASE_SUPPLY` só repõe torpedo; `STARBASE_SCIENCE` nada.)
- [ ] 9.3 "REPAIR TURN (DOCKED)" no Engineering repara em tier 5 e redireciona o
      dano inimigo pro pool da base.
- [ ] 9.4 Pool da base zerado → base destruída → se você estiver atracado,
      **fim de jogo** (`destroyed_with_base`).
- [ ] 9.5 "Undock" põe a nave a sudoeste da base, sem gastar turno.

## 10. Alerta e Combat Log

- [x] 10.1 Toggle de alerta: texto mostra `RED` / `GREEN` (o **nível**, não booleano).
- [x] 10.2 `RED` pinta a UI de vermelho e toca o alarme, cortado em 5s.
- [x] 10.3 Aba do log **pisca** quando chega entrada na categoria que você não
      está lendo.
- [x] 10.4 Trocar de aba **não** para de piscar. Só rolar até o fim para.
- [ ] 10.5 Entrada nova **não** arrasta o scroll — a posição de leitura fica onde
      você deixou.

## 11. Condições terminais (o núcleo da task 5.5)

Ordem de prioridade Kobayashi Maru: derrota sempre supera vitória.

- [x] 11.1 **Vitória** — destruir todos os inimigos.
- [x] 11.2 **Explosão do WC** — subir o overload manual pra 20 e passar turnos.
- [ ] 11.3 **Morte por radiação** — deixar o breach sem equipe designada, 5 turnos.
- [ ] 11.4 **Breach contido** — designar equipe e chegar a 100% antes do relógio.
- [ ] 11.5 **Asfixia** — Life Support <40 por 5 turnos sem reparar.
- [ ] 11.6 **Casco destruído** — baixar escudo e levar dano até `hullIntegrity`
      chegar a 0. Indicador "Hull" no SituationPanel deve piscar antes.
- [ ] 11.7 **Fim de tempo** — passar do stardate 3630.
- [ ] 11.8 **Base atracada destruída** — item 9.4.
- [x] 11.9 **NÃO existe** fim por energia: rodar com consumo alto por 10+ turnos
      não deve gerar condição terminal nenhuma por si só.
- [ ] 11.10 Toda condição leva ao ResultScreen com motivo e rating certos.

## 12. Persistência

- [x] 12.1 F5 no meio da partida: stardate, posição, integridades, log e nível de
      alerta voltam iguais.
- [ ] 12.2 Editar `sst-lcars-game-state` no DevTools **sem** regravar o selo:
      Tribbles aparecem depois de alguns turnos, **sem** aviso na UI.
      (Não é anti-cheat, é piada — ver `saveIntegrity.ts`.)

## 13. Balanceamento (anotar, não corrigir agora)

Sem número esperado — é pra registrar sensação:

- [x] 13.1 30 stardates dão pra caçar ~17 inimigos?
- [ ] 13.2 Overload/breach está punitivo demais?
- [ ] 13.3 Fadiga de CdD faz o reparo valer a pena?
- [ ] 13.4 Send Party às cegas (70% dos planetas estéreis) é dilema ou frustração?
- [ ] 13.5 3 sondas é pouco?

---

## Observado — 1ª rodada (todos tratados, 2026-07-30)

**2.2** LRS mostrava só a moldura, sem o KBS do quadrante atual.
→ **Corrigido.** O grid do LRS agora injeta SEMPRE o código do quadrante onde a
nave está, a confiança 100% fixa (o SRS já escaneou ali; não depende de Scan e
não esmaece). De quebra, cada entrada do LRS passou a esmaecer pela própria
idade, não por um relógio global — necessário pro datalink da sonda (8.6).

**2.4a** Star Chart com quadrantes "explorados" desde o início.
→ **Corrigido — era vazamento do save anterior.** `newGame()` usava `$patch`,
que faz **merge** de objetos aninhados: `exploredQuadrants`/`lrsScan` da partida
velha (persistidos no localStorage) sobreviviam ao New Game. Trocado por
`Object.assign`, que substitui cada campo por inteiro. Teste de regressão
cobre.

**2.4b** Current Location do Helm não batia com os sensores.
→ **Corrigido.** Era texto **cravado** `"3, 4"` no template. Agora lê
`position` da store, em X,Y.

**2.4c** Ordem de coordenadas Y,X no SRS/LRS.
→ **Corrigido em toda a UI e nos logs do engine.** Convenção: interno é
`row,col` (chave de grid), mas **todo texto visível é X,Y** (`col,row`) —
seletores do NavSensing/StarChart, Current Location, mensagens de chegada,
impulso e sonda.

**2.5** Planeta trocando de arte a cada refresh, e diferente entre SRS e Weapons.
→ **Corrigido.** `getRandomPlanet()` sorteava a cada render, por console. Agora
`getPlanetIconFor(id)`: hash do id estável da entidade → mesma arte em todo
console, todo render, toda a sessão. (A entidade em si nunca mudou — era só o
ícone.)

**4.7b** Overload manual 20 + 1 turno = derrota.
→ **Comportamento projetado, não bug — mas anote no 13.2.** Não foi 100% de
dano: overload 20 é o TOPO da tabela Fibonacci (spec 10.2) = 85 de dano + **55%
de chance de explosão POR TURNO**. Você rolou os 55%. O dial no máximo é a
ponta suicida por construção; se 55%/turno parecer demais pro playtest, o knob
é `WARP_CORE_EXPLOSION_CHANCE_TABLE[20]`.

**5.1 / 5.4** Snd Helm movia direto; Engage Warp não movia nada.
→ **Corrigido, com o fluxo que você especificou.**

- "Snd Helm" (setor) e "Snd to Helm" (quadrante) agora **só preenchem** o Set
  Destination (campo novo `destinationSector` + o `destination` existente).
- **Engage Impulse** (botão não tinha handler nenhum) despacha o movimento
  intra-setor; **Engage Warp** despacha a viagem (antes só ligava o efeito
  visual — a nave nunca saía do lugar).
- Warp **desengaja sozinho** na chegada: o efeito visual segue `warpTrip` no
  estado, não um toggle local.
- **Potência influencia a duração**: impulso cobre `max(1, round(8×dial/100))`
  células/turno (dial 25% = 2, 50% = 4, 100% = cruza o setor; boost força 8) —
  régua do `N=INT(W1*8+.5)` do fonte de 1978. Warp já era
  `ceil(distância/fator)`. Destino além do alcance do turno fica "em trânsito";
  engaje de novo.

**8.6** Sonda não alimentava o LRS; log sem coordenadas.
→ **Corrigido.** `resolveProbeScan` escreve também em `lrsScan` (datalink) — o
código aparece no display de longo alcance com idade própria. Mensagens:
`Sonda reporta quadrante X,Y: KBS nnn.` e
`Planeta detectado em X,Y com n carga(s) de dilítium.`

**10.5** Log voltava pro topo ao trocar de aba.
→ **Implementada a UX que você desenhou.** Ao ativar uma aba, o log rola
automaticamente até a **primeira mensagem não lida** (o marcador de leitura é o
índice). O blink para quando a rolagem atinge o fim (`reached-end` →
`markLogRead`), que já era o gatilho. Sem não lida, abre no fim.

### Retestar na 2ª rodada

Itens destravados: 5.1–5.8 (fluxo Engage completo), 2.2/2.4/2.5, 8.6, 10.5.
Atenção nova: item 3.2 (Skip 5) ficou sem observação na 1ª rodada.

#### Comentários

    - Temos um problema de balanceamento, a nave do jogador está muito mais poderosa que a nave dos inimigos, os combates estão fáceis demais.
    - Sinto que faltam animações de ataques, principalmente para sinalizar o turno do inimigo, a sensação geral é que o jogo está muito rápido

5. Comentários

   - Warps curtos, de 1 turno, terminam muito rápido, nem dá tempo de ativar a animação. Uma viagem de warp devia durar pelo menos 5 segundos, para dar tempo de ativar e desativar a animação de warp.

6. Comentários

   - Temos que colocar um indicador de hull integrity abaixo do bracket de escudos.
   - Inimigos destruídos ressucitam... Eles devem ser removidos permanentemente, senão basta ficar ir e voltando entre dois setores com inimigos até zerar o contador (a destruição contava, mas os inimigos estavam de volta ao retornar ao setor).

7. Comentários

   - scan ativo no LRS apagou toda a informação anterior. Não deveria, a informação no LRS nunca é perdida, somente perde confiança. Scan ou sonda renova confiança.
   - as equipes de CdD devem retornar para Idle ou Cooldown automaticamente se o sistema em que estão alocadas for totalmente reparado.

8. Comentários

   - se houver uma base no setor em que a nave se encontra, hail deve estar disponível. Bases respondem informando tipo, quadrante em que se encontram e nível de recursos atuais. Se houver inimigos, eles respondem ao hail conforme os rolls de rendição. Nota: verificar a chance de rendição, ela deve aumentar um pouco se o inimigo estiver danificado, proporcionalmente. Rolls falhos resultam em respostas... não muito educadas. Já tentou perguntar a um Klingon se ele quer se render? Nada saudável.
   - Bases científicas não recuperam torpedos ou dano, mas oferecem o bonus de recuperação para os engenheiros, pois eles ainda podem visitar a base em licença e descansar. Engenheiros em uma base científica? Parque de diversões.

9. Comentários

- Tentei editar os dados para testar a infestação de tribbles, mas não consegui, ou não deu tempo de aparecerem.

13. Comentários

    13.1 - Inconclusivo, mas parece curto. Como o pace do jogo está muito rápido pela falta de animações, não deu tempo de sentir o efeito do tempo.
    13.2 -
