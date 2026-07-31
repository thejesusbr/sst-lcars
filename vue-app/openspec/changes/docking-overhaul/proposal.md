## Why

O item 9.3 da 5ª rodada passou — e o playtest revelou que o modelo certo é
outro. Nas palavras do relatório: o ponto de atracar numa Drydock é usar as
oficinas automatizadas cheias de drones de reparo, **não** as equipes de
emergência da nave. Elas saem de licença enquanto os robôs consertam. Já nos
depots e science stations não há oficinas — lá o reparo é das próprias equipes,
e cada tipo de base compensa com um bônus diferente.

Hoje o loop de reparo atracado usa `calculateRepairRate` em tier 5 — depende de
equipe designada, cobra fadiga, aplica teto de stacking. E carrega duas dívidas
conhecidas: `DOCKED_REPAIR_PER_TICK` existe sem leitor (allowlist do
`reachability.test.ts`), e a spec antiga pedia equipes tratadas como idle
durante a atracagem sem que ninguém implementasse (item 9.3 do backlog). Este
redesenho resolve as duas.

## What Changes

Cada tipo de base ganha mecânica própria:

- **`STARBASE_DOCK` (Drydock):** reparo **automático** por drones a
  `DOCKED_REPAIR_PER_TICK` (25/subsistema/tick), **sem** equipe designada.
  Todas as equipes são tratadas como de licença: recuperam fadiga em dobro,
  inclusive as que estavam `working`. Designar equipe não acelera nada.
- **`STARBASE_SUPPLY` (Depot):** sem oficinas — reparo é das equipes da nave,
  MAS com suprimentos ilimitados o **teto de stacking não se aplica**: toda
  equipe adicional entra com valor cheio (multiplicador 1.0), em vez de
  0.5/0.25/...
- **`STARBASE_SCIENCE` (Science Station):** reparo é das equipes, sem bônus de
  stacking — o que a estação oferece é recreação: fadiga recupera **mais
  rápido** (multiplicador já existente) e **sem cooldown** — equipe no piso
  volta ao pool imediatamente ao ser dispensada/recuperada.

Assim as três bases respondem perguntas diferentes: Drydock = "conserta pra
mim", Depot = "me deixa consertar rápido", Science = "descansa minha
tripulação".

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `docking`: taxa assistida vira reparo por drones exclusivo do Drydock;
  descanso em dobro passa a cobrir equipes `working`; depots e science ganham
  suas mecânicas
- `damage-control`: isenção de stacking no depot; isenção de cooldown na
  science station

## Impact

`src/engine/damageControl.ts` (`calculateRepairRate`, `teamRecoveryRate`,
dispensa/cooldown), `src/engine/turnEngine.ts` (loop de docking),
`src/engine/constants.ts`, `EngineeringConsole` (rótulo do repair turn por
tipo de base). Remove `DOCKED_REPAIR_PER_TICK` da allowlist do
`reachability.test.ts` e a dívida "working como idle" do `BACKLOG.md`.
