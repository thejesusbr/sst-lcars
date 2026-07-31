## Context

Consequência direta da `mission-pacing`: subir o relógio de 30 pra 40 melhorou a
média e não tocou na variância, que é o que a 4ª rodada sentiu.

## Goals / Non-Goals

**Goals:**
- Tirar a sorte da geração de cima da dificuldade.

**Non-Goals:**
- Reduzir a variação da própria frota. Galáxia de tamanho variável é do fonte de
  1978 e é o que faz cada partida diferente — o defeito não é ela variar, é o
  relógio não acompanhar.
- Mexer de novo na fadiga ou nas sondas. A `mission-pacing` acabou de calibrar
  os dois, e mover junto impediria atribuir causa na 5ª rodada.

## Decisions

**Base + termo por inimigo, não proporcional puro.** Proporcional puro
(`2.6 × frota`) achataria a variância a zero, mas uma galáxia de 13 inimigos
daria 34 stardates e uma de 22 daria 57 — a partida pequena ficaria curta demais
pra explorar. O termo fixo modela o custo que não escala com a frota: viajar,
escanear, reparar entre brigas. O termo por inimigo modela o que escala.

**1.36× de variância residual é deliberado.** Achatar a zero tiraria a diferença
entre galáxia cheia e galáxia vazia, que é variedade legítima. O que se está
tirando é a diferença de 1.7×, que é grande o bastante pra decidir a partida.

**A salvaguarda de 1978 vira piso explícito.** Ela sempre foi isso; com relógio
fixo em 30 ou 40 nunca disparava, e ficou parecendo código morto.

## Risks / Trade-offs

[Frota grande passa a dar partida longa demais] → 22 inimigos dão 51 stardates.
Se a 5ª rodada achar arrastado, o knob é `MISSION_PER_ENEMY`, não a base.

[Mais uma constante de tempo mudando logo depois da `mission-pacing`] → é o
motivo de esta ser change separada e mínima: se a 5ª rodada apontar problema de
ritmo, dá pra dizer se veio da meia-vida de fadiga (aquela) ou do relógio (esta).
