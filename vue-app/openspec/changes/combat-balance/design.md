## Context

A 4ª rodada foi a primeira em que o combate deu pra acompanhar — a encenação da
`game-feel-and-pacing` existe, o ritmo da `mission-pacing` assentou. E com isso
o balanceamento, que era Non-Goal declarado desde a `game-feel-and-pacing` (task
6.1, "medir antes seria medir no escuro"), virou mensurável.

O que se mediu: batalha 1v1 resolve no primeiro tiro, inimigo não tem escudo,
escudo do jogador nunca volta, e o setor 8×8 não influencia nada.

## Goals / Non-Goals

**Goals:**
- Uma batalha durar mais de um turno.
- O tabuleiro significar alguma coisa: distância, cobertura, movimento.
- O escudo do jogador ter volta.

**Non-Goals:**
- **IA de inimigo.** Inimigo continua reagindo, não caçando nem manobrando pra
  buscar linha de tiro. Registrado como pendência desde a `bridge-awareness`.
- Tipos de inimigo nascerem (é a `enemy-species`) — esta change define a faixa
  de escudo **por tipo**, mas até a `enemy-species` entrar todos são
  `KLINGON_CRUISER` e só a faixa dele se manifesta.
- Reescrever a fórmula de ataque inimigo do fonte de 1978. A atenuação por
  distância entra como fator sobre o que já existe.

## Decisions

**Números iniciais.** Conversão `0.15` de dano por unidade de potência, e LUT de
atenuação por distância Chebyshev:

```
 dist  mult   dano de 1500   tiros p/ derrubar alvo medio (350)
   1   1.00       225                1.6
   2   0.75       169                2.1
   3   0.55       124                2.8
   4   0.40        90                3.9
   5   0.30        68                5.2
   7   0.15        34               10.4
```

Alvo médio = escudo 150 + poder 200. À queima-roupa morre em 2 tiros; do outro
canto do setor, em 10. É a diferença que faz aproximar-se ser decisão.

LUT explícita em vez de fórmula pelo mesmo motivo da `WARP_ANIMATION_MS`: é
tabela de balanceamento, mexida por playtest, e uma curva fechada esconde onde
tocar.

**Escudo inimigo não regenera, o do jogador sim.** Assimetria deliberada. O
jogador tem convés de engenharia, equipes de CdD e orçamento de energia pra
trocar; o inimigo é um alvo com buffer finito. Os dois regenerando transformaria
toda briga em empate resolvido por quem trouxe mais turnos.

**Phaser bloqueia, torpedo passa com risco.** É o que finalmente separa as duas
armas — até aqui torpedo era phaser com estoque: mesmo alcance, mesmas
condições, animação diferente. Phaser viaja reto (é o vocabulário visual que a
apresentação já desenha); torpedo é guiado, e a chance de erro modela a correção
de trajetória no meio da batalha.

**Esquiva escala com células cobertas, não com o dial.** O dial já mapeia pra
células por turno (`max(1, round(8 × dial/100))`), e é o deslocamento real que
torna a nave difícil de acertar — não a posição do botão. De quebra, isso faz o
dial ter consequência defensiva, que é o que faltava pra ele ter 100 posições e
não 4.

**Trânsito não é abrigo.** Movimento de impulso multi-turno continua sob fogo. A
esquiva é o prêmio por estar em movimento, não imunidade — imunidade
transformaria "andar pra longe" na resposta a tudo, que é justamente o que o
boost com cooldown longo existe pra precificar.

**Aquecimento normalizado em 1500.** A potência padrão mantém os 30 de hoje, e o
topo do dial dobra. Assim a mudança não altera o comportamento que o jogador já
conhece no default, e só morde quando ele escolhe queimar potência.

## Risks / Trade-offs

[Muita variável se movendo junto] → é o risco central. Escudo inimigo, atenuação,
linha de tiro, esquiva e regeneração de escudo mudam o combate inteiro de uma
vez. Mitigação: todos os números são constantes numa folha (`constants.ts`), a
LUT é explícita, e a 5ª rodada tem seção própria. Se ficar ruim, dá pra reverter
por partes — a linha de tiro é independente da atenuação, que é independente da
esquiva.

[Linha de tiro pode travar o jogador] → um setor com estrelas mal posicionadas
poderia deixar o jogador sem tiro nenhum. Mitigações que já existem: torpedo
passa, movimento é livre de custo de turno pra reposicionar, e o warp tira do
setor. Se na prática travar, o knob é atenuação em vez de bloqueio.

[Esquiva simétrica pode alongar demais a batalha] → inimigo reposicionando toda
vez que o jogador se move já é mecânica existente; somar esquiva pode fazer
combate móvel virar troca de tiros que não acerta. O knob é o fator por célula.

[`ENEMY_BASE_POWER` fica onde está] → deliberado. Com escudo somando ao pool
efetivo, subir o poder também mudaria duas coisas ao mesmo tempo e impediria
atribuir causa na 5ª rodada.
