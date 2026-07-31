## Why

Achados soltos da 4ª rodada — bugs e atritos que não pertencem ao combate nem ao
ritmo, e que ficariam presos esperando as changes grandes.

O mais grave está na atracagem: **`undock()` não move a nave.** Ele só limpa
`docked` e `dockedBaseId`. O item 9.5 do roteiro ("põe a nave a sudoeste da
base") descreve comportamento que nunca existiu. E enquanto atracado o jogador
pode simplesmente engajar movimento — não há guarda nenhuma.

O resto é atrito de leitura: a equipe de CdD mostra `Working` no turno do
despacho, quando por especificação ela só começa a trabalhar no turno seguinte;
a equipe travada na cela aparece como se estivesse disponível; e o Warp Core
sofre dano por warp alto sem uma linha sequer no log de engenharia.

## What Changes

- **`undock` reposiciona a nave** numa célula adjacente livre, tratando o caso
  de a base estar na borda do setor — a 4ª rodada bateu nisso ("e quando a base
  está na borda esquerda do mapa? Aconteceu comigo").
- **Mover atracado é recusado**, com motivo no log. Undock primeiro.
- **Atracar consome 1 turno; desatracar é livre.**
- **Escudos não sobem sozinhos ao desatracar** — hoje descem ao atracar e
  ninguém os levanta, então a nave sai da base desprotegida sem aviso.
- **Equipe despachada mostra `Dispatching` no turno do despacho**, e `Working`
  a partir do seguinte — refletindo a regra que já existe.
- **Equipe em `guard` aparece desabilitada**, não disponível.
- **Dano por warp alto vira entrada no log de engenharia**, e a taxa sobe: 5
  travessias em warp 8 causaram 1% de dano.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `docking`: undock reposiciona, atracagem custa turno, movimento atracado é
  recusado, escudos ficam baixos até o jogador levantá-los
- `damage-control`: estado visível da equipe distingue despacho de trabalho, e
  guarda de disponível
- `navigation`: dano de Warp Core por warp alto é reportado e recalibrado

## Impact

`src/engine/docking.ts`, `src/engine/turnEngine.ts`, `src/engine/navigation.ts`,
`src/engine/constants.ts`, `src/components/modules/EngineeringConsole.vue`,
`src/components/modules/HelmConsole.vue`.
