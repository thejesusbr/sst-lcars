## Context

O item 9.3 passou no playtest e o usuário especificou o modelo certo por cima:
drydock repara com drones (equipes de licença), depot repara com as equipes sem
teto de stacking, science station descansa sem cooldown. Três bases, três
respostas: "conserta pra mim" / "me deixa consertar rápido" / "descansa minha
tripulação".

Resolve de tabela duas dívidas: `DOCKED_REPAIR_PER_TICK` sem leitor (allowlist
do ratchet) e "working tratadas como idle" (backlog, spec de `fase-4-engine`
nunca implementada).

## Goals / Non-Goals

**Goals:**
- Mecânica distinta e legível por tipo de base.
- Fechar as duas dívidas.

**Non-Goals:**
- Mexer no pool da base, no custo de turno da atracagem, no resupply ou nos
  prisioneiros — tudo fica como está.
- Klingons atacando a base atracada (item 9.4): depende do `combat-tuning`
  (inimigos zumbis eram a causa) — reteste, não implementação daqui.

## Decisions

**Drone repara no lugar da equipe, não junto.** Se equipe somasse com drone, a
Drydock viraria estritamente melhor em tudo e apagaria a diferença entre bases.
Designar equipe na doca não faz nada — e o Engineering deve dizer isso.

**Depot remove o teto, não o tier.** As equipes reparam no tier normal (3) —
o que muda é `[1,1,0.5,...]` virar `[1,1,1,...]`. Com 6 equipes num sistema:
espaço aberto dá 5×3×2.9 ≈ 44/turno; depot dá 5×3×6 = 90 (equipes a 100%). O
teto era o freio de spam; suprimentos ilimitados são exatamente a licença pra
tirá-lo.

**Science tira o cooldown só enquanto atracada.** A regra volta no undock —
não é buff permanente, é instalação da estação.

## Risks / Trade-offs

[Drydock fica "AFK repair"] → é o desenho: o custo real é viagem + turno de
atracagem + pool da base + relógio da missão andando por tick.

[Depot com 6 equipes pode reparar rápido demais] → 90/turno com todas a 100% é
teto teórico; fadiga morde a partir do 2º turno. 6ª rodada mede.
