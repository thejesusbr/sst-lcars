## Context

A 5ª rodada aprovou o combate tático e apontou o que sobrou: inimigo que se
neutraliza (fórmula de 1978), fuga que não abre distância (teleporte), regen de
escudo de trás pra frente e termodinâmica linear.

As respostas vieram do usuário com desenho pronto — energia consumível pro
inimigo, intenção de movimento por estado de energia, regen invertida, Joule.

## Goals / Non-Goals

**Goals:**
- Inimigo com ritmo de combate: rajada e pausa, não pressão infinita nem
  autodesarme.
- Fuga como tática real.
- Regen e calor fisicamente legíveis.

**Non-Goals:**
- **IA fina.** Buscar linha de tiro contornando cobertura, coordenação entre
  inimigos, recuo por dano — tudo na change futura de IA (`openspec/BACKLOG.md`).
  Aqui entra só o esqueleto aproxima/evade por energia, que é a semente dela.
- Tipos de inimigo (`enemy-species`, pendente). As constantes de energia são
  únicas por ora; a faixa por tipo entra lá.

## Decisions

**Energia consumível, deliberadamente diferente do jogador.** O jogador é
vazão (Warp Core gera por turno); o inimigo é pool. A assimetria é a mesma do
escudo (jogador regenera, inimigo não) e pelo mesmo motivo: o inimigo não tem
convés de engenharia. 100/25/15 dá 4 tiros de rajada e ~2 turnos por tiro
recuperado — knobs de playtest.

**Reação no turno seguinte, não no mesmo.** O usuário pediu explicitamente:
o inimigo reage ao que viu, não ao que o jogador está fazendo agora. Também
elimina a esquisitice do modelo velho, em que o inimigo só se movia quando o
JOGADOR se movia.

**`ENEMY_MOVE_CELLS = 3` contra 8 do jogador.** Fuga a impulso máximo abre 5
células/turno. Boost (esquiva máxima) continua sendo o escape de emergência;
isto dá o escape sustentado.

**Regen invertida com piso de 40% no teto.** Zero regen com escudo erguido foi
considerado (mais duro) e adiado: pune manter escudo em viagem longa, que é o
comportamento padrão prudente. O piso mantém recuperação lenta passiva; o
mergulho pra 0 vira a escolha agressiva.

**Joule ancorado no padrão.** `(power/1500)²` mantém 30 no default — o topo do
dial é que muda (4×). Mesmo princípio da normalização anterior: não mover o
comportamento que o jogador já conhece.

## Risks / Trade-offs

[Inimigo evadindo pode alongar limpeza de setor] → com 3 células/turno contra 8
do jogador, perseguir é viável; e um inimigo evadindo não atira. Se virar
gato-e-rato chato, o knob é `ENEMY_ENERGY_RECHARGE` (recarrega mais rápido =
volta a lutar mais cedo).

[Rajada de 4 tiros pode ser pico de dano alto] → o custo por tiro e a recarga
são constantes de folha; a 6ª rodada mede.

[Três mudanças de combate juntas de novo] → mesmo mitigante das anteriores:
constantes isoladas em folha, seção própria no roteiro da 6ª rodada.
