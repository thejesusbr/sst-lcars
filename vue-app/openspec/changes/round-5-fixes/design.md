## Context

Consertos da 5ª rodada sem decisão de balanço. Separados do `combat-tuning`
pra entrarem e reverterem de forma independente.

## Goals / Non-Goals

**Goals:** uma linha do tempo só pra som e imagem; briefing honesto; atracagem
legível.

**Non-Goals:** mexer em duração de evento da fila (650ms fica); redesenhar o
Briefing (é a pendência futura de Briefing/manual — aqui entra só o número).

## Decisions

**Som migra pro relógio da fila, não o contrário.** Ajustar offsets entre dois
relógios (clique vs fila) seria consertar o sintoma; a causa é existirem dois.
`playEventSound` já é o ponto único — phaser/torpedo entram lá.

**Corte do phaser alinhado ao evento.** O sample de 3s não cabe em 650ms de
cena; corta como os de impacto. Se ficar seco, o knob é subir a duração DO
EVENTO de disparo, não deixar o som vazar por cima dos seguintes.

**Ícone some via `sectorCells`**, que já é a projeção única dos dois scanners —
um `if (docked)` num lugar cobre SRS e Weapons ao mesmo tempo.

## Risks / Trade-offs

[Phaser cortado em ~650ms pode soar truncado] → aceito pra primeira rodada;
knob documentado (duração do evento de disparo).
