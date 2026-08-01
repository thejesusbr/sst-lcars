## 1. Drydock: drones

- [x] 1.1 Loop de docking em `STARBASE_DOCK` repara a `DOCKED_REPAIR_PER_TICK`
      por subsistema, sem ler equipe (constante finalmente ganha leitor —
      remover da allowlist do `reachability.test.ts`)
- [x] 1.2 Todas as equipes (inclusive `working`) recuperam +16%/turno durante o
      loop — fecha a dívida "working como idle" do BACKLOG.md
- [x] 1.3 `EngineeringConsole`: durante loop em drydock, indicar que reparo é
      automático (equipe designada não acelera)
- [x] 1.4 Teste: reparo sem equipe; equipe designada não muda a taxa; working
      recupera fadiga

## 2. Depot: sem teto de stacking

- [x] 2.1 `calculateRepairRate` com multiplicador 1.0 pra toda posição quando
      atracado em `STARBASE_SUPPLY`
- [x] 2.2 Teste: 4 equipes no mesmo sistema rendem 4× em depot, ~2.75× fora

## 3. Science: sem cooldown

- [x] 3.1 Piso de eficiência não trava em `cooldown` enquanto atracada em
      `STARBASE_SCIENCE`; equipe é despachável direto
- [x] 3.2 Regra normal volta no undock
- [x] 3.3 Teste: piso despachável na science; cooldown de volta após undock

## 4. Verificação

- [x] 4.1 type-check, lint, unit verdes
- [x] 4.2 Atualizar itens 9.3/15.7 no roteiro da 6ª rodada com as mecânicas
      novas
