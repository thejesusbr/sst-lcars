## Context

`ENEMY_TYPES` tem 5 membros desde a `fase-4-engine`. `materializeSector` sempre
criou `KLINGON_CRUISER` e nada mais. `world-generation` nunca especificou tipo,
então nada estava tecnicamente errado — mas `hailRefusals.ts`, entregue pela
`hail-and-identity` com tabela cobrindo os 5 tipos, ficou 60% código morto no
mesmo dia em que nasceu.

## Goals / Non-Goals

**Goals:**
- Os 5 tipos nascem, com peso e faixa de poder próprios.
- Rendição diferenciada por espécie.
- Cor de facção no overlay de combate.

**Non-Goals:**
- **IA de inimigo.** Inimigo continua reagindo, não caçando. Movimento
  intencional (perseguir o jogador entre setores) está registrado como pendência
  futura (`openspec/BACKLOG.md`) e não entra aqui.
- Comportamento tático por espécie (scout foge, D7 avança). O tipo muda poder e
  disposição a se render; não muda como o inimigo decide agir no turno.
- Ícones novos: a arte dos 5 tipos já existe.

## Decisions

**Peso fixo, não região.** Concentrar Romulanos numa região da galáxia foi
considerado e adiado: exige um conceito de território em `worldGen` que hoje não
existe, e o ganho — "encontrar Romulano vira informação geográfica" — depende de
o jogador cruzar a galáxia o bastante pra notar o padrão, o que 40 stardates
podem não dar. Sorteio ponderado entrega variedade agora; território pode vir
depois sem desfazer isto.

**Faixa de poder por tipo, e o cruiser fica onde estava.** Se todos os 5 tipos
ganhassem faixa nova, o balanço médio de encontro mudaria de uma vez, junto com
o relógio da `mission-pacing` e a fadiga — três variáveis se movendo na mesma
rodada, impossível de atribuir no playtest seguinte. Mantendo o cruiser em
`0.5–1.5` (35% dos inimigos), o encontro típico continua sendo o encontro
típico, e os outros quatro são desvio mensurável.

**Piso e teto de rendição por espécie, não multiplicador.** Um multiplicador
sobre o par global preservaria a razão piso/teto entre espécies, que é
justamente o que precisa variar: o Klingon tem faixa estreita (10→35, quase não
importa quanto apanhe) e o raider tem faixa larga e alta (30→70). Tabela por
espécie diz isso diretamente; multiplicador não conseguiria.

**Cor de tema, não hex.** A regra do projeto é que cor é do tema (7 temas, seção
13 do dossiê). Vermelho cravado colidiria com o tratamento de Red Alert, que já
repinta 29 regras — durante alerta vermelho, um feixe "vermelho Klingon" fixo
sumiria no fundo.

## Risks / Trade-offs

[Roxo e verde podem não existir em todos os 7 temas] → a variável de facção é
definida com fallback no `colors.css` base; tema que não sobrescrever herda o
padrão. Nenhum tema precisa ser tocado pra isto funcionar, mas todos podem.

[Poder por tipo somado ao relógio maior e à fadiga suavizada muda muita coisa de
uma vez] → mitigado por manter a faixa do cruiser e por essas mudanças estarem em
changes separadas, cada uma com seus itens de playthrough. Se a 4ª rodada
apontar dificuldade, dá pra identificar qual alavanca mexeu.

[`CLOAKED_RAIDER` nascendo cloaked pode frustrar] → 10% de peso, e a mecânica de
cloak já existe e já foi jogada. Se virar problema, o peso é o knob.
