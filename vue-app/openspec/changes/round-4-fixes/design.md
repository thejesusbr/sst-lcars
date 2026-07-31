## Context

Cinco achados da 4ª rodada que não cabem em `combat-balance` nem em
`mission-scaling`, e que ficariam bloqueados atrás delas sem motivo.

## Goals / Non-Goals

**Goals:**
- Fechar o buraco da atracagem, que é o único bug real do grupo.
- Tirar o atrito de leitura dos painéis.

**Non-Goals:**
- Redesenhar atracagem. O loop de reparo, o pool da base e o tipo de base ficam
  exatamente como estão.
- Calibrar o dano de warp alto de verdade — aqui só entra a mensagem e uma taxa
  que dá pra sentir. A calibragem fina volta na rodada seguinte, com dado.

## Decisions

**Qualquer célula adjacente livre, não uma direção fixa.** "Sudoeste da base",
como o roteiro dizia, quebra com a base na borda — que foi exatamente o caso que
a rodada encontrou. Buscar entre as adjacentes livres e, no pior caso, cair pra
célula livre mais próxima, resolve sem caso especial de borda.

**Atracar custa turno, desatracar não.** Manobrar ao lado de uma estação e
atracar é trabalho; largar amarra não é. De quebra, a assimetria impede que o par
dock/undock vire ação gratuita ciclável.

**Escudo não sobe sozinho ao desatracar.** Sair do porto desprotegido é erro que
o jogador tem direito de cometer, e levantar escudo já é ação livre — o custo de
lembrar é um clique. Restaurar automaticamente gastaria vazão que ele não pediu.

**`Dispatching` é rótulo, não estado novo.** A regra de que reparo começa no
turno seguinte já existe e já é testada; o que faltava era a UI dizer isso. Um
`TeamStatus` novo obrigaria todo leitor de status a aprender mais um caso, pra
representar informação que `turnsWorked === 0` já carrega.

## Risks / Trade-offs

[Atracar passar a custar turno encarece a estratégia de doca] → é a intenção. Com
o loop de reparo já avançando o stardate por tick, um turno a mais é marginal
perto da viagem até a base.

[Reposicionar no undock pode empurrar a nave pra perto de inimigo] → possível, e
aceitável: o setor é do inimigo também. A busca prefere célula livre adjacente à
base, que é o mais perto do abrigo que dá.
