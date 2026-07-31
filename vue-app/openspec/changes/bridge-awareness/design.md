## Context

Quatro achados da 3ª rodada com a mesma raiz: o estado carrega informação que a
ponte não mostra. `lifeSupportTurnsRemaining` conta cinco turnos até a asfixia e
nunca foi renderizado. `alertLevel` aceita `yellow` desde a `engine-integration`
e nunca teve função. O resultado de scan e hail não tem onde aparecer. E a única
forma de reduzir incerteza sobre um planeta é a ação mais cara do jogo.

## Goals / Non-Goals

**Goals:**
- Tornar visível e audível o que já está no estado e mata o jogador.
- Dar função ao `yellow`.
- Dar ao jogador uma forma barata de reduzir incerteza sobre planeta.
- Dar lugar aos relatórios de sensor.

**Non-Goals:**
- **Tema do alerta amarelo.** ~49 variáveis × 7 temas é trabalho de sistema de
  cor (seção 13 do dossiê), registrado como pendência futura. `yellow` funciona
  mecanicamente sem tema próprio.
- **IA de inimigo.** O `yellow` responde a hostil *conhecido* na vizinhança, não
  a hostil se aproximando. Inimigo que caça o jogador é pendência futura.
- Reescrever o Briefing / escrever manual do jogador — pendência futura do
  usuário, junto da dica de stacking de equipes.

## Decisions

**Alarme que cala quando você responde.** Três regras foram consideradas pro
Alert 10: uma vez ao cruzar o limiar, todo turno em crítico, e todo acerto no
sistema. As duas primeiras têm defeito oposto — "uma vez" some numa batalha
grande, que é exatamente onde o item 11.5 nasceu; "todo turno" vira ruído em 5
turnos de crítico. A regra escolhida — todo turno em crítico **sem equipe
designada e trabalhando** — não tem nenhum dos dois: soa enquanto há ação
disponível e cala no instante em que o jogador age. E a volta do alarme quando a
equipe cai em `cooldown` é informação nova, não repetição: o reparo parou.

**Hull foge da regra, de propósito.** Não existe equipe designável pro casco —
ele só repara em doca. Aplicar a regra literalmente daria um alarme sem condição
de silenciamento, tocando pra sempre. Escudo erguido foi considerado como
análogo de "estou respondendo", mas escudo pode estar erguido e saturando, então
não é resposta confiável. Uma vez ao cruzar, rearmando na recuperação, é o que
sobra que não vira ruído.

**Alerta sobe sozinho, desce só na mão.** Auto-descida foi descartada: o jogador
que ergue alerta durante uma retirada tem motivo, e o engine desligando por conta
própria briga com ele. O custo de um alerta vermelho esquecido é uma interface
vermelha, não penalidade mecânica — assimetria que justifica a assimetria da
regra.

**Survey amarrado ao SRS, não ao preço em turnos.** Medido:

```
                     turnos/planeta   equipe imobilizada
às cegas (hoje)           3.00          3.00 turnos-equipe
survey 1 turno            1.90          0.90
survey 2 turnos           2.90          0.90
```

Survey domina em qualquer preço porque o custo caro da viagem às cegas não são os
turnos — é a equipe fora do pool por 3 turnos, mais 40% de chance de perdê-la em
setor hostil. Cobrar 2 turnos adiciona atrito sem criar escolha. Amarrar a
confiabilidade ao SRS cria: com sensor íntegro é formalidade, com sensor amassado
é aposta sobre aposta, e reparar sensor passa a ter consequência fora de combate.

**Leitura errada não se anuncia.** Um survey marcado como "não confiável" não
carrega risco nenhum — o jogador simplesmente ignoraria. A corrupção fica no
relatório, nunca no estado: as cargas reais do planeta não mudam, então
consertar o SRS e refazer o survey lê certo. Mesmo princípio já aplicado à
corrupção de dígitos do KBS na `game-feel-and-pacing`.

**Categoria `science`, não view filtrada de `captain`.** A alternativa mais
barata era espelhar `captain` na coluna nova. Descartada porque a linha divisória
que o jogo precisa não é "capitão vs resto" — é **decisão vs leitura**. Lançar
sonda é comando; o que ela reporta é sensor. Com uma categoria só, a coluna de
ciência mostraria o hail junto do scan, e o marcador de não-lido de `captain`
piscaria por relatório de sensor. Custa migrar `LogReadMarkers` pra 4 chaves.

## Risks / Trade-offs

[4ª aba no Combat Log aperta o layout] → o widget já é tabulado e o
`SituationPanel` foi reagrupado nesta rodada; se não couber, a coluna do
NavSensing é o lugar primário de `science` e a aba pode ser a secundária.

[Alert 10 concorrendo com o klaxon de Red Alert] → os dois podem tocar no mesmo
turno (entrar em setor hostil com Life Support crítico). O catálogo de
`useSound` já corta o Red Alert em 5s; Alert 10 é curto. Se ficar confuso no
playtest, o knob é prioridade entre os dois, não remover um.

[Migração de `LogReadMarkers` pra 4 categorias quebra save antigo] → o selo de
integridade já ignora comparação quando a versão de schema muda, e `migrateSave`
preenche campo ausente com o default. Subir `GAME_SCHEMA_VERSION` cobre.

[Survey mentindo pode frustrar sem o jogador entender por quê] → é o ponto, mas
depende de o jogador saber que o SRS está amassado. A degradação visual de
sensor entregue pela `game-feel-and-pacing` (piscar em moderado, apagar em
crítico) é o que fecha esse laço — sem ela, a mentira seria arbitrária.
