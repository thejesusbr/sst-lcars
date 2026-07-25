# SST LCARS Edition — Dossiê de Especificações de Engine

> \*\*Documento de revisão pré-Fase 4.\*\* Não implementar nada sem aprovação do autor.
> Status: todos os 16 itens da seção 9 revisados e decididos (2026-07-20). Fase 3.5
> (ajustes de interface, seção 11) planejada antes da Fase 4.

\---

## 1\. Resumo Executivo

O SST LCARS Edition é um revival do clássico *Super Star Trek* com interface LCARS. A Fase 3
concluiu a migração visual de todos os consoles. Uma **Fase 3.5** (seção 11) fecha os
displays que as mecânicas novas (Warp Core, CdD, Core Breach) exigem. A Fase 4 então
cria a **engine de jogo** — desacoplada da UI (seção 8\.4) — que conecta os controles
visuais a um estado reativo centralizado.

Este documento mapeia:

* Todos os comandos do SST clássico e como se traduzem nos consoles atuais
* O que cada console já cobre e o que está faltando
* Mecânicas sem nenhum console correspondente
* Propostas de integração (sem implementação)

\---

## 2\. Modelo de Dados do Universo

O SST usa uma grade bidimensional de dois níveis:

```
GALÁXIA (Galaxy)   — grade 8×8 de Quadrantes
  └── QUADRANTE (Quadrant/System) — grade 8×8 de Setores
        └── SETOR (Sector) — uma célula da grade

Posição do jogador: { quadrant: {x, y}, sector: {x, y} }
```

### 2.1. Conteúdo de uma célula de Quadrante (LRS)

O Long Range Scanner exibe um código de 3 dígitos `KBS`:

* **K** = número de naves Klingon no quadrante
* **B** = número de starbases no quadrante
* **S** = número de estrelas no quadrante

Exemplo: `'104'` = 1 Klingon, 0 starbases, 4 estrelas

### 2.2. Conteúdo de uma célula de Setor (SRS)

Cada célula do Short Range Scanner pode conter:

|Entidade|`ScannerEntity`|Ícone|
|-|-|-|
|Nave do jogador|`PLAYER`|Enterprise (configurável)|
|Klingon Cruiser|`KLINGON\_CRUISER`|`klingon-Cruiser.png`|
|Klingon D7|`KLINGON\_D7`|`klingon-D7.png`|
|Warbird Romulano|`ROMULAN\_WARBIRD`|`warbird.png`|
|Nave Romulana|`ROMULAN\_SCOUT`|`romulan-Scout.png`|
|StarBase (doca, resupply completo)|`STARBASE\_DOCK`|`space-Dock.png`|
|Research Station (só life support)|`STARBASE\_SCIENCE`|`regula-1.png`|
|Supply Depot (life support + torpedos)|`STARBASE\_SUPPLY`|`k7.png`|
|Base Klingon (hostil, fora da contagem de bases)|`KLINGON\_BASE`|`battelh.png`|
|Planeta|`PLANET`|aleatório do pool|
|Estrela|`STAR`|`★` (placeholder)|
|Vazio|—|célula em branco|

### 2.3. Constantes do Jogo

|Constante|Valor|Origem|
|-|-|-|
|Energia Principal máx.|4500|`engineering-console.js`|
|Energia Principal inicial|3000|`situation-panel.js`|
|Energia de Escudo máx.|2500|`ShieldConsole.vue`|
|Energia de Escudo inicial|1500|`ShieldConsole.vue`|
|Temperatura de Phaser máx.|270|`weapons-console.js`|
|Temperatura de Phaser inicial|50|`WeaponsConsole.vue`|
|Potência de Phaser máx.|3000|`weapons-console.js`|
|Estoque de Torpedos máx.|12|`weapons-console.js`|
|Estoque de Torpedos inicial|8|`WeaponsConsole.vue`|
|Fator de Dobra máx.|8|`helm-console.js`|
|Fator de Dobra mín.|1|`helm-console.js`|
|Stardate inicial|3600.0|`situation-panel.js`|
|Inimigos iniciais|12|`situation-panel.js`|
|Starbases iniciais|14|`situation-panel.js`|
|Probes iniciais|3|`navsensing-console.js`|
|Tubos de Torpedos|3|`weapons-console.js`|

### 2.4. Fórmulas Estabelecidas

```
// Efetividade dos Phasers (decai com temperatura)
effectiveness = max(0, 100 - phaserTemp / 2.7)

// Aquecimento por disparo
phaserTemp = min(270, phaserTemp + 30)   // \~9 disparos até travar

// Status de energia
energyLevel > 1500 → "Nominal"
energyLevel > 500  → "Warning"
energyLevel ≤ 500  → "Critical"

// Código LRS: KBS (Klingons / Bases / Estrelas)
lrsCode = String(klingons) + String(starbases) + String(stars)
```

\---

## 3\. Comandos SST Clássico → UI LCARS

Mapeamento completo. Status: ✅ coberto | ⚠️ parcial | ❌ ausente

### 3.1. Navegação

|Comando SST|Descrição clássica|Console|Controles existentes|Status|
|-|-|-|-|-|
|`NAV`|Navegar para quadrante (warp)|HelmConsole|`wrpFct` (factor 1–8) + "Engage"|⚠️ Visual OK, lógica ausente|
|`WRP`|Mover dentro do setor|HelmConsole|D-Pad SVG (8 direções)|⚠️ Visual OK, eventos inertes|
|`AUT`|Auto-navegar até starbase mais próxima|HelmConsole|**Ausente**|❌|
|`WARP`|Definir fator de dobra|HelmConsole|`wrpFctSelBar` slider|⚠️ Visual OK, valor não reativo|
|—|Exibir posição atual|HelmConsole|`cur-loc-sys` + `cur-loc-sec`|⚠️ Hardcoded `3,4`|
|—|Efeito visual de viagem warp|HelmConsole|Canvas `#vwrScrDsp` (WarpSpeed)|⚠️ Canvas existe, WarpSpeed não instanciado|

### 3.2. Sensores

|Comando SST|Descrição|Console|Controles existentes|Status|
|-|-|-|-|-|
|`SRS`|Scanner de curto alcance (setor atual)|NavSensingConsole|Grid 8×8 `LcarsScanner` com ícones|✅ Completo (demo)|
|`LRS`|Scanner de longo alcance (quadrantes viz.)|NavSensingConsole|Grid 8×8 LRS + botão "Scan"|⚠️ Demo com dados fixos|
|`SRS`→Helm|Enviar coordenada do setor ao Helm|NavSensingConsole|Botão "Snd Helm"|⚠️ Só `console.log`|
|`LRS`→Helm|Enviar quadrante ao Helm|NavSensingConsole|Botão "Snd to Helm"|⚠️ Só `console.log`|
|`COM 4`|Starchart — mapa de toda a galáxia|**Ausente**|—|❌|

### 3.3. Combate

|Comando SST|Descrição|Console|Controles existentes|Status|
|-|-|-|-|-|
|`PHA`|Disparar phasers com potência definida|WeaponsConsole|Seletor de potência + Lock + "Fire Phasers"|⚠️ Local, sem dano real|
|`TOR`|Disparar torpedo fotônico|WeaponsConsole|Load + Cycle target + "Fire Torpedoes"|⚠️ Local, sem dano real|
|—|Aquecimento pós-disparo|WeaponsConsole|Barra de temperatura + efetividade|✅ Lógica local ok|
|—|Auto-load de tubos|WeaponsConsole|Toggle por tubo|✅ Lógica local ok|
|—|Mira X,Y no scanner|WeaponsConsole|Scanner de Targeting + Cycle|✅ Com ícones|

### 3.4. Escudos

|Comando SST|Descrição|Console|Controles existentes|Status|
|-|-|-|-|-|
|`SHE UP`|Ativar escudos|ShieldConsole|Botão "Raise Shields"|⚠️ Local|
|`SHE DOWN`|Desativar escudos|ShieldConsole|Botão "Lower Shields"|⚠️ Local|
|`SHE NNN`|Definir energia de escudo para N|ShieldConsole|Presets 250/500/1000 + "Set to"|⚠️ Local|
|—|Transferir energia Main ↔ Shield|ShieldConsole|Botões +/- por preset|⚠️ Local|
|—|Visor SVG da Enterprise com escudos|ShieldConsole|SVG placeholder atual|⚠️ Precisa do SVG real|

### 3.5. Engenharia e Status

|Comando SST|Descrição|Console|Controles existentes|Status|
|-|-|-|-|-|
|`DAM`|Relatório de danos dos subsistemas|EngineeringConsole|Tabela de 8 subsistemas|✅ Visual completo|
|—|Energia principal (indicador)|EngineeringConsole|`maiEngInd` SolidLevelBar|✅ Visual|
|`REST`|Aguardar (avançar stardate, reparar)|**Ausente**|—|❌|
|—|Repair simulado (Starbase)|EngineeringConsole|Botão "REPAIR ALL" (mock)|⚠️ Placeholder|

### 3.6. Comunicações e Interação

|Comando SST|Descrição|Console|Controles existentes|Status|
|-|-|-|-|-|
|`COM 1–3`|Calcular distâncias e tempo restante|**Ausente**|—|❌|
|`COM 4`|Starchart (mapa galáctico)|**Ausente**|—|❌|
|`COM 5`|Listar recursos restantes|SituationPanel|Energy + Enemies + Starbases|⚠️ Parcial|
|`HAI`|Contatar nave/base|NavSensingConsole|Botão "Hail"|⚠️ Só `console.log`|
|`DOC`|Atracar em Starbase|NavSensingConsole|Botão "Dock"|⚠️ Só `console.log`|
|`PRB`|Lançar sonda|NavSensingConsole|"Send to selected system" + contador|⚠️ Timer mock (2s)|
|—|Enviar tripulação ao solo|NavSensingConsole|Botão "Snd Party"|⚠️ Só `console.log`|
|`ALE`|Alerta Vermelho / Normal|SituationPanel|Botão "Toggle Red Alert"|⚠️ Sem lógica automática|

### 3.7. Missão

|Comando SST|Descrição|Console|Controles existentes|Status|
|-|-|-|-|-|
|`STAT`|Relatório de status completo|SituationPanel|Energy/Stardate/Enemies/Starbases|⚠️ Parcial|
|`QUIT` / `SURR`|Render / Abandonar nave|**Ausente**|—|❌|
|—|Condição de vitória (inimigos = 0)|**Ausente**|—|❌|
|—|Condição de derrota (energia = 0)|**Ausente**|—|❌|
|—|Condição de derrota (stardate esgotado)|**Ausente**|—|❌|
|—|Resumo pós-jogo (rating do comandante)|**Ausente**|—|❌|

\---

## 4\. Análise por Console

### 4.1. SituationPanel ⚠️ Parcial

**O que cobre:** Energy Level (com status Nominal/Warning/Critical), Stardate, Enemies Left,
Starbases Left, Toggle Red Alert.

**O que falta:**

* Binding ao `useGameState` (todos os valores são props hardcoded com defaults)
* Red Alert automático ao entrar em quadrante hostil
* Indicador de **Torpedos restantes** (atualmente ausente do HUD)
* Indicador de **Escudo ativo/status** (ausente do HUD)
* **Tempo restante para limite de Stardate** (urgência da missão)
* Emit `toggle-red-alert` existe, mas sem efeito visual nos outros consoles

\---

### 4.2. HelmConsole ⚠️ Visual e interação completos, sem estado global

**O que cobre (atualizado na revisão de UX pré-Fase 4, seção 12):** D-Pad 8 direções
funcional (altera coordenada local `destination`), Current Location, Set Destination
(toggle System/Sector com highlight de seleção), Warp Factor slider (1–8) sem redundância
de label, botão Engage liga/desliga o efeito WarpSpeed de verdade (com aceleração/
desaceleração assimétricas), Impulse Power (0-100%) com botão Boost (overdrive a 100%,
cooldown, timeout de segurança).

**O que falta (fica pra Fase 4 — ver seção 12.4 pra não regredir o que já existe):**

* **Todos os efeitos do D-Pad são locais** — só mudam o `destination` (mock), não
o estado real da nave nem energia
* **Lógica de movimento** — consumo de energia proporcional à distância, ainda não
existe
* **Fórmula de Stardate** — deslocamento warp avança o stardate, ainda não existe
* **Current Location hardcoded** (`cur-loc-sys`/`cur-loc-sec`, sempre "3, 4") — precisa
amarrar à posição real da nave no `useGameState.ts`, condizente com o que o
NavSensingConsole mostrar
* **Botão Auto-Navigate** — ir automaticamente à Starbase mais próxima
* **Validação de destino** — impedir movimento para célula ocupada ou fora de grade
* **Atualização das coordenadas** após movimento bem-sucedido
* **Impulse Power sem efeito real** — não consome energia nem afeta velocidade de
deslocamento sub-warp ainda

**Proposta de integração (sem implementar):**

> Adicionar ao Helm uma seção "Navigation Computer" com:
> - Botão \*\*"Auto-Nav to Base"\*\* → calcula rota até starbase mais próxima e executa
> - Indicador de \*\*energia estimada para o trajeto\*\* antes do Engage
> - Indicador de \*\*stardate estimada de chegada\*\*

\---

### 4.3. WeaponsConsole ⚠️ Funcional localmente, sem efeito no estado global

**O que cobre:** Controle de temperatura e efetividade dos phasers (efetividade exibida
como inteiro, valor real usado em cálculo continua decimal — bug do `SolidLevelBar`
corrigido, ver 12.6), seletor de potência com presets 25/50/75/100% (indicador + Set Power
na mesma linguagem visual do Impulse Power do Helm), Lock; Load/Unload de torpedos,
Auto-load (recarrega o tubo sozinho ao disparar, desligado ao descarregar manualmente),
Cycle de mira entre alvos reais do setor com etiqueta de tubo(s) no scanner, Fire
Torpedoes.

**O que falta:**

* **Cálculo de dano real** — `firePhasers()` e `fireTorpedoes()` não deduzem energia nem
calculam dano nos Klingons
* **Binding ao inventário global de torpedos** — `torpedoStock` é local e não sincroniza com `useGameState`
* **`enemyTargets` é mock local** (`WeaponsConsole.vue`) — precisa vir do estado real dos
Klingons no setor (`useGameState`) na Fase 4, não uma lista fixa de 3 posições
* **Resposta dos Klingons** — após disparo, IA inimiga não executa contra-ataque
* **Cálculo de dano inimigo nos escudos** — nenhuma ligação com ShieldConsole
* **Mira automática** — "Lock" existe mas não identifica inimigos reais do estado global
* **Energia de phaser da energia principal** — disparo devia consumir `phaserPower` da Main Energy
* ~~Mira de torpedo por clique~~ — **decidido e depois revertido** (revisão 2026-07-20 item 9,
revertido 2026-07-25). Ver 12.6 pro mecanismo final (Cycle entre alvos reais).

\---

### 4.4. ShieldConsole ⚠️ Lógica de transferência ok, sem estado global

**O que cobre:** Raise/Lower Shields, presets de transferência, SolidLevelBar de
Shield Energy e Main Energy, SVG placeholder da Enterprise.

**O que falta:**

* **SVG real da Enterprise (decidido, revisão 2026-07-20, item 5 da seção 9)** — extrair o
SVG técnico de 188 KB do legado `shield-console.js` (sem problema conhecido, não redesenhar)
e encapsular num componente Vue com props reativas: opacidade do escudo por nível de energia,
cor de partes danificadas por subsistema
* **Binding ao estado global** — `shieldEnergy` e `mainEnergy` são locais; precisam ser
espelhados de/para `useGameState`
* **Fadiga dos escudos por dano inimigo** — Klingons reduzem `shieldEnergy` em cada turno
* **Visual de dano** — ao receber ataque, o SVG da Enterprise deveria animar o escudo atingido

\---

### 4.5. EngineeringConsole ✅ Visual completo, sem estado global

**O que cobre:** Main Energy SolidLevelBar, tabela de 8 subsistemas (Warp, SRS, LRS, Phasers,
Photons, Shields, Damage Control, Life Support) com barra de integridade e status
OPERATIONAL/DAMAGED/OFFLINE, controles de simulação DRAIN/CHARGE/SIMULATE/REPAIR.

**O que falta:**

* **Binding ao estado global** — todos os valores são locais
* **Repair over time** — no SST clássico, sistemas danificados se reparam com o passar do
Stardate (taxa proporcional à integridade danificada)
* **Botão "Rest"** — equivalente ao comando `REST`, avança Stardate e acelera reparos; poderia
ser adicionado aqui
* **Starbase repair** — ao atracar em Starbase, todos os subsistemas voltam a 100% e energia
é reabastecida; isso precisa ser acionado a partir de Engineering ou de um evento global
* **Warp Core (WC) como 9º subsistema** — nova mecânica proposta (sobrecarga + core breach),
ainda não representada na tabela de subsistemas; ver seção 10\.

**Proposta de integração (sem implementar):**

> Adicionar no painel de Energy Matrix:
> - Botão \*\*"Rest / Hold Position"\*\* → avança Stardate em +0.1 e executa reparo parcial
> - Indicador de \*\*taxa de reparo\*\* por subsistema
> - Evento `@starbase-docked` que dispara REPAIR ALL automático

\---

### 4.6. NavSensingConsole ✅ Visual completo, dados demo, ações só `console.log`

**O que cobre:** SRS 8×8 com ícones reais (Player, Planet, Starbase, Klingon, Romulan, ★),
LRS 8×8 com códigos KBS, Selected Sector/System, Snd Helm, Hail, Dock, Snd Party, Scan
LRS, Probe Control (contador + status + envio).

**O que falta:**

* **Dados reais** — ambos os grids precisam receber dados do `useGameState`
* ~~Decodificação KBS~~ — **feito** (revisão 2026-07-25, ver 12.7): legenda fixa abaixo do
LRS + cor do código derivada do conteúdo (`alert-fg` se K>0, `anakiwa-fg` se B>0, senão
`text-white`)
* **Snd Helm real** → emitir evento que atualiza o destino no HelmConsole
* **Hail** → lógica de comunicação (com Klingons: tentativa de rendição; com Starbase: status)
* **Dock** → sequência de atracagem com resultado (reabastecimento, reparos)
* **Probe** → delay real proporcional à distância, resultado ao chegar
* ~~Starchart~~ — **feito na Fase 3.5**, `StarChartConsole.vue` (6ª aba do
`TacticalConsole`). Ver 5.2 (seção desatualizada, corrigida) — falta só dados reais e
destaque da posição atual do jogador (hoje só mostra o quadrante clicado)

\---

### 4.7. TacticalConsole ✅ Completo

Gerencia a alternância entre os 5 consoles via `v-show`. Sem necessidade de mudanças exceto
adicionar novos tabs se novos consoles forem criados.

\---

## 5\. Mecânicas sem Console Correspondente

### 5.1. Turno Inimigo (IA Klingon)

O SST clássico opera em **turnos implícitos**: após cada ação do jogador, os Klingons
no mesmo quadrante **atacam e se movem**. Isso não tem nenhuma representação visual atual.

**Necessário:**

* Cálculo de dano por Klingon (baseado em distância e energia do escudo)
* Redução de `shieldEnergy` (e eventualmente `mainEnergy` se escudos caírem)
* Dano aleatório a subsistemas
* **Feedback visual** — o jogador precisa saber que foi atacado

**Proposta:** Um componente de **overlay de combate** ou **painel de alerta de ataque** que
aparece brevemente (tipo modal não-bloqueante) mostrando:

* "Klingon at 3,6 fired! Shields absorbed 340 units."
* Status dos escudos após o ataque

\---

### 5.2. Starchart / Mapa Galáctico ✅ Implementado na Fase 3.5 (`StarChartConsole.vue`)

> **Seção desatualizada — corrigida em 2026-07-25.** O texto abaixo (proposta original) foi
> mantido por referência, mas o console **já existe**: decisão do item 1/seção 9 (Starchart
> = 6ª aba do `TacticalConsole`), implementado na Fase 3.5. Ver `StarChartConsole.vue`.

O comando `COM 4` do SST clássico exibe um mapa da galáxia inteira (8×8 quadrantes) mostrando:

* Quadrantes já explorados (com código KBS) — ✅ feito, mesma lógica de cor do LRS (12.7)
* Quadrantes inexplorados (`???` em vez de `---`) — ✅ feito
* Posição atual do jogador (destacada) — ⚠️ falta: só existe "Selected Quadrant" (último
clique), não uma marcação fixa da posição real do jogador
* Localização das Starbases conhecidas — ⚠️ dados demo (`demoGalaxyGrid`), precisa de
`useGameState` real (Fase 4)

**Proposta A (implementada):** 6º console no `TacticalConsole`, **"Star Chart"**, com:

* Grid 8×8 usando `LcarsScanner` — ✅ feito
* Células que mostram código KBS ou `???` para inexplorado — ✅ feito
* Posição do jogador destacada — ⚠️ falta (ver acima)
* Filtros: mostrar só Klingons, só Starbases, etc. — ⚠️ falta, não crítico pro MVP

**Proposta B (não usada):** Integrar como painel secundário no `NavSensingConsole` (3ª coluna ou aba
dentro do console), mantendo a estrutura de 5 consoles no Tactical.

\---

### 5.3. Condições de Fim de Jogo

Não há nenhuma tela, lógica ou componente para:

* **Vitória** — todos os Klingons destruídos
* **Derrota por energia** — Main Energy chega a 0
* **Derrota por stardate** — tempo esgotado com Klingons restantes
* **Derrota por starbases** — todas as starbases destruídas
* **Rendição** — `QUIT`/`SURR` do clássico
* **Derrota por explosão do Warp Core** — sobrecarga descontrolada (nova mecânica, ver seção 10\.)
* **Derrota por radiação** — core breach não reparado em 5 turnos (nova mecânica, ver seção 10\.)

**Proposta:** Um componente de **tela de resultado** (overlay fullscreen) ativado pelo
`useGameState` quando qualquer condição terminal for detectada, mostrando:

* Resultado (Vitória / Derrota e motivo)
* Rating de Comandante (fórmula clássica do SST)
* Botão "New Game"

O **rating de Comandante** no SST clássico é calculado como:

```
score = klingonsDestroyed \* 10 - (startardate\_limit - currentStardate) \* 2
      - starsbasesDestroyed \* 100 + torpedoesUsed \* (-1)
```

*(Fórmula exata a confirmar com versão de referência do SST)*

\---

### 5.4. Atracagem em Starbase (Docking Sequence)

O botão "Dock" existe no NavSensing, mas a sequência de atracagem não está especificada.
Confirmado no manual oficial (revisão 2026-07-20, ver item 10 da seção 9): resupply varia
**por tipo de base**, não é igual pra todas.

|Tipo|Energia|Torpedos|Life Support|Reparo sistemas|
|-|-|-|-|-|
|`STARBASE\_DOCK` (StarBase)|✅ máximo|✅ máximo|✅|✅ instant, todos os sistemas|
|`STARBASE\_SUPPLY` (Supply Depot)|❌|✅ máximo|✅|❌|
|`STARBASE\_SCIENCE` (Research Station)|❌|❌|✅|❌|

**Condição:** precisa estar em setor adjacente à base.

**Proposta:** Um evento `dock-complete` emitido por `useGameState`, com o resultado
dependente do `ScannerEntity` da base — ex: `dock-complete({ type: 'STARBASE_DOCK' })` →
`mainEnergy → 4500`, `torpedoStock → 12`, todos os subsistemas → 100%; já
`dock-complete({ type: 'STARBASE_SCIENCE' })` só confirma life support (sem efeito
mecânico hoje modelado — life support não tem contraparte no `GameState` ainda).
Emite feedback visual no SituationPanel ("Docking complete. All systems nominal." /
variante por tipo).

\---

### 5.5. Rest / Hold Position

O comando `REST` do SST clássico permite ao jogador aguardar passagem de tempo sem agir,
acelerando reparos automáticos mas dando aos Klingons tempo para se mover.

**Proposta:** Botão no `EngineeringConsole`, seção Energy Matrix:

* **"Hold Position"** (ou "Rest X stardates")
* Avança Stardate em +0.1 por clique
* Aplica reparo parcial em subsistemas danificados (taxa: +5%/+0.1 stardate)
* Klingons têm chance de mover ou atacar (lógica da engine)

\---

### 5.6. Feedback de Combate / Log de Eventos

No SST de texto, o jogo imprime mensagens em tempo real:

```
"\*\*\* KLINGON DESTROYED \*\*\*"
"Shields absorb 340 units."
"\*\*\* RED ALERT \*\*\* Klingons in this quadrant!"
"Starbase damaged!"
```

Na versão LCARS, não há nenhum canal para exibir este tipo de mensagem.

**Proposta:** Um componente **"Combat Log" / "Captain's Log"** — um painel de texto scrollável
que recebe eventos do `useGameState` e os exibe em ordem cronológica (com stardate). Pode ser:

* Uma terceira seção no `SituationPanel` (abaixo dos indicadores)
* Um painel fixo na parte inferior da tela, sempre visível
* Uma sobreposição ativada por evento (aparecer e sumir automaticamente)

\---

## 6\. Comandos a Integrar nos Consoles Existentes

*Propostas de onde adicionar os comandos ❌ sem criar novos consoles, quando possível.*

### 6.1. HelmConsole — acréscimos sugeridos

|Funcionalidade|Onde|Controle|
|-|-|-|
|Auto-Navigate to Base|Nova linha no painel de destino|Botão "Auto-Nav"|
|Energia estimada do trajeto|Junto ao Warp Factor|Texto calculado reativo|
|Stardate de chegada estimada|Junto ao Engage|Texto calculado reativo|
|WarpSpeed (canvas)|Viewport existente `#vwrScrDsp`|Instanciar `WarpSpeed.js`|

### 6.2. EngineeringConsole — acréscimos sugeridos

|Funcionalidade|Onde|Controle|
|-|-|-|
|Rest / Hold Position|Abaixo do Energy Matrix|Botão "Hold Position (+0.1)"|
|Taxa de reparo por subsistema|Coluna adicional na tabela|Texto "+X%/turno"|
|Reabastecimento (Starbase)|Evento externo → botão "Reabastece"|Botão só visível quando atracado|

### 6.3. NavSensingConsole — acréscimos sugeridos

|Funcionalidade|Onde|Controle|
|-|-|-|
|Starchart galáctico|Nova coluna ou 3ª aba|`LcarsScanner` 8×8 modo "galaxy"|
|Legenda do LRS (K/B/S)|Abaixo do grid LRS|Linha de legenda fixa|
|Hail com resultado|Botão "Hail" existente|Feedback no Combat Log|

### 6.4. SituationPanel — acréscimos sugeridos

|Funcionalidade|Onde|Controle|
|-|-|-|
|Indicador de torpedos restantes|Nova linha (3ª linha ou expandir 2×2 para 2×3)|Texto + status|
|Stardate limit countdown|Nova linha junto à Stardate|Texto "Time left: X.X"|
|Red Alert automático|Evento do `useGameState`|Emit `toggle-red-alert` acionado pela engine|

\---

## 7\. Novos Consoles Propostos

### 7.1. Star Chart Console ⭐ Alta prioridade

**Justificativa:** Fundamental para a jogabilidade — o jogador precisa ver onde estão os
Klingons, starbases e sua posição na galáxia. Não cabe razoavelmente em nenhum console existente
sem sobrecarregá-lo.

**Proposta de UI:**

```
┌──────────────────────────────────────┐
│ STAR CHART                           │  ← LcarsTitle
│                                      │
│  \[Grid 8×8 LcarsScanner — galáxia]  │  ← Quadrante atual destacado
│  Células: KBS / ??? (inexplorado)    │
│                                      │
│  \[Legenda: K=Klingon B=Base S=Stars] │
│  \[Filtro: ALL | ENEMIES | BASES]     │
│  \[Mark Quadrant] \[Clear Marks]       │
└──────────────────────────────────────┘
```

**Adicionado como 6ª aba no TacticalConsole.** Decidido (revisão 2026-07-20, item 1 da seção 9).

\---

### 7.2. Combat Log / Captain's Log ⭐ Alta prioridade

**Justificativa:** O SST de texto depende de mensagens para comunicar o que acontece. Sem um log,
o jogador não sabe se seu disparo acertou, quantos escudos absorveu, se um Klingon morreu.

**Decidido (revisão 2026-07-20, item 2 da seção 9):** painel fixo inferior, abaixo do GameHud,
sempre visível. Com scroll e **auto-scroll pra última mensagem**. Dividido em **abas** por
categoria de entrada: **Captain's Log**, **General**, **Engineering** — ver `CombatLogEntry`
na seção 8.1.

\---

### 7.3. Mission Briefing / End Game Screen ⚠️ Média prioridade

**Justificativa:** Necessário para completude — iniciar e terminar o jogo.

**Proposta:** Um único componente `GameScreen.vue` com 3 modos (`v-if`):

* `'briefing'` — tela inicial com nome do comandante, dificuldade, início de missão
* `'playing'` — exibe `GameHud.vue` (estado atual)
* `'result'` — resultado (vitória/derrota), rating, botão "New Game"

\---

## 8\. Arquitetura da Engine (Sugestões para Fase 4)

### 8.1. Estrutura de Estado Global

```typescript
// useGameState.ts — propostas de campos
interface GameState {
  // Missão
  stardate: number          // ex: 3600.0
  stardateLimit: number     // ex: 3612.0 (14 dias para limpar 12 Klingons = \~1.16/Klingon)
  score: number

  // Posição
  quadrant: { x: number; y: number }   // 1-8
  sector: { x: number; y: number }     // 1-8

  // Recursos
  mainEnergy: number        // 0–4500
  shieldEnergy: number      // 0–2500
  torpedoes: number         // 0–12
  probes: number            // 0–3

  // Missão
  enemiesLeft: number       // contagem global de Klingons
  starbasesLeft: number

  // Armas
  phaserTemp: number        // 0–270
  phaserPower: number       // 0–3000

  // Subsistemas (0–100)
  systems: Record<SystemKey, number>   // inclui `warpCore` (nova mecânica, ver seção 10\.)

  // Warp Core (WC) — nova mecânica, ver seção 10\.
  warpCoreOverload: number             // 0–20 (%), estado persistente definido pelo jogador
  radiationBreach: { active: boolean; turnsRemaining: number } | null

  // Universo
  galaxy: QuadrantData\[]\[]  // grade 8×8
  currentSector: SectorData\[]\[] // grade 8×8 do quadrante atual
  exploredQuadrants: boolean\[]\[] // grade 8×8

  // Alertas
  alertLevel: 'normal' | 'yellow' | 'red'
  combatLog: CombatLogEntry\[]   // category: 'captain' | 'general' | 'engineering' — ver seção 7.2
}
```

### 8.2. Fluxo de Turno

```
1. AÇÃO DO JOGADOR
   └── NAV → move nave, consome energia, avança stardate
   └── PHA → calcula dano em Klingons, consome energia, aquece phasers
   └── TOR → calcula dano em Klingons, consome torpedo
   └── SHE → transfere energia Main ↔ Shield
   └── DOC → reabastece (se adjacente a starbase)
   └── REST → avança stardate, repara sistemas
   └── PRB → lança sonda (resultado async)

2. RESOLVER WARP CORE (autônomo, todo turno — nova mecânica, ver seção 10\.)
   └── Se overload ativo (warpCoreOverload > 0):
       ├── Dano contínuo ao WC, proporcional a warpCoreOverload
       └── Roll de explosão, chance proporcional a warpCoreOverload
   └── Sempre (independente de overload):
       └── Roll de core breach, chance proporcional ao dano acumulado do WC

3. TURNO INIMIGO (após cada ação do jogador)
   └── Para cada Klingon no quadrante atual:
       ├── Calcula dano ao jogador (distância × poder Klingon)
       ├── Reduz shieldEnergy (e mainEnergy se escudos a 0)
       ├── Dano aleatório a subsistema (chance %)
       └── Klingon pode mover (pequena chance)

4. VERIFICAR CONDIÇÕES TERMINAIS
   └── Vitória: enemiesLeft === 0
   └── Derrota: mainEnergy <= 0 || stardate >= stardateLimit || starbasesLeft === 0
   └── Derrota: explosão do WC || radiationBreach.turnsRemaining <= 0

5. ATUALIZAR DISPLAYS
   └── SituationPanel recebe novos valores
   └── SRS/LRS atualizam grids
   └── EngineeringConsole atualiza subsistemas
   └── CombatLog recebe mensagens do turno
```

### 8.3. Decisão Pendente: Pinia vs. Composable Simples

|Critério|Pinia|Composable Simples|
|-|-|-|
|DevTools Vue|✅ Timeline, snapshot|❌ Sem suporte nativo|
|Boilerplate|⚠️ Store + actions|✅ Apenas `ref`/`computed`|
|Testabilidade|✅ Facilmente mockável|✅ Também mockável|
|Serialização (save game)|✅ `$patch` + `JSON.stringify`|⚠️ Manual|
|Undo/Redo|✅ Plugin disponível|❌ Manual|
|Adequação ao projeto|✅ Estado complexo, multi-console|⚠️ OK para estados simples|

**Recomendação:** Pinia, dado o volume de estado e a necessidade de inspeção durante
desenvolvimento da engine. **Decidido (revisão 2026-07-20, item 4 da seção 9).**

\---

### 8.4. Arquitetura: Engine Desacoplada da UI

> Decidido em revisão 2026-07-20 (item 4 da seção 9). Motivação: reaproveitar a engine num
> futuro **companion app tricorder** (mobile), fora da Vue app atual.

* **Engine core em TS puro** — toda a lógica de regra (turno, combate, fórmulas do Warp Core,
condições de vitória/derrota, docking) mora em módulo(s) sem import de Vue nem Pinia. Funções
puras/classes que recebem estado e retornam novo estado (ou mutam um objeto plano).
* **Pinia como camada de estado fina** — a store da Vue app chama o engine core e expõe o
resultado como estado reativo. Pinia não implementa regra nenhuma, só adapta.
* Qualquer client futuro (o tricorder, ou outro) importa o mesmo engine core e escreve sua
própria camada de estado/adapter (Pinia, Zustand, o que for).

\---

## 9\. Itens para Discussão

> Revisão item a item concluída em 2026-07-20 (itens 1–16).

1. ✅ **Starchart:** nova aba no TacticalConsole (6ª aba). Ver seção 7.1.
2. ✅ **Combat Log:** painel fixo inferior, com scroll + auto-scroll, abas Captain's Log /
General / Engineering. Ver seção 7.2 e `CombatLogEntry` na seção 8.1.
3. ✅ **Tela de resultado:** componente `GameScreen.vue` com 3 modos (briefing/playing/result),
envolvendo o `GameHud`. Ver seção 7.3.
4. ✅ **Pinia vs. composable simples:** Pinia confirmado, mas como camada fina — a lógica de
regra vai num engine core em TS puro, desacoplado de Vue/Pinia, pensando em reaproveitamento
futuro (companion app tricorder). Ver seção 8.4.
5. ✅ **SVG real do ShieldConsole:** extrair o SVG do legado (sem problema conhecido),
encapsular em componente com props reativas (opacidade do escudo, cor de dano por parte).
Ver seção 4.4.
6. ✅ **WarpSpeed:** reusar `warpspeed.min.js` (confirmado sem dependência de jQuery — Canvas
API + DOM vanilla). Encapsular em componente com prop `warpFactor`. Ver seção 4.2.
7. ✅ **IA Klingon (MVP):** turno simples pro MVP — mais próximo do clássico, upgrade pra
sistema de pontos de ação fica pra depois, quando/se dificuldade (item 8) entrar. Ver
comparativo de prós/contras discutido em sessão de revisão.
8. ✅ **Dificuldade (MVP):** fora do MVP. Nível único fixo (FAIR) por ora; seletor
NOVICE/FAIR/GOOD/EXPERT/EMERITUS é upgrade futuro, junto com item 7.
9. ✅ **Torpedos:** ~~mira por clique no scanner~~ **superado, revisão 2026-07-25** — fica
com botão "Cycle" por tubo, mas cicla entre os **alvos disponíveis de verdade** (não mais
coordenada aleatória): dá liberdade tática pro capitão distribuir os tubos como quiser
(todos num alvo, um em cada, 2:1...). Etiqueta no scanner mostra o(s) número(s) do(s) tubo(s)
mirando cada alvo. Sem bearing 0-360°. Ver seção 4.3 e 12.6.
10. ✅ **Starbases:** confirmado no manual oficial — **3 tipos de base federação**, não 2:
`STARBASE_DOCK` (StarBase, resupply completo), `STARBASE_SCIENCE` (Research Station, só
life support), `STARBASE_SUPPLY` (Supply Depot, life support + torpedos, **novo**).
`KLINGON_BASE` é hostil, fora dessa contagem. Ver seção 2.2 e 5.4.
11. ✅ **Sobrecarga do WC:** curva Fibonacci indexada por overload%, dano cap 85, chance
cap 55%. Lookup tables prontas. Ver seção 10\.2.
12. ✅ **Balanceamento reparo vs. sobrecarga:** validado com os multiplicadores clássicos
de FIX (achados no manual oficial: 1x/2.5x/3x/5x). Reparo focado (3x, 1 equipe, 100%)
sobra até overload 10% (15%/turno vs. 1.10 de dano), empata perto de 15%, perde sozinho
a partir de 18%. Ver seção 10\.3 e 10\.4.
13. ✅ **Equipe de Controle de Danos (CdD):** mecânica completa — 6 equipes, fadiga com
meia-vida de 3 turnos (floor 20%), empilhamento com penalidade a partir da 3ª equipe,
recuperação linear 8%/turno idle, reset instantâneo ao docar em StarBase/Research Station
(não em Supply Depot). Ver seção 10\.3.
14. ✅ **Core breach — reparo parcial ou binário?** Parcial: barra de contenção 0-100,
equipes dispatchadas nele reparam em tier de urgência máxima (5x, mesmo no espaço), e
**todo reparo fora do breach sofre penalidade ×0.5** enquanto ele estiver ativo (radiação
distraindo/envenenando a tripulação inteira). Simulado: equipe solo precisa de ≥80% de
eficiência pra conter sozinha dentro dos 5 turnos; negligência total (6 equipes exaustas)
falha por pouco. Ver seção 10\.4.
15. ✅ **HUD do SituationPanel:** requisitos especificados (revisão 2026-07-20, item 15
da seção 9) — torpedos restantes, status do escudo, status do WC/sobrecarga, alerta de
breach (contagem regressiva, urgente). Layout final fica pra Fase 3.5, ver seção 11.
16. ✅ **Ícones de base:** `k7.png` (K-7, estação **federal** de "The Trouble with
Tribbles" — nunca foi klingon) é reaproveitado pra `STARBASE_SUPPLY`, junto com
`space-Dock.png` (StarBase) e `regula-1.png` (Research Station) — os 3 ícones de estação
disponíveis no pool cobrem os 3 tipos federais. `KLINGON_BASE` passa a usar
`battelh.png` (bat'leth), já que não há ícone de base klingon no estilo do pool. Ver
seção 2\.2.

\---

## 10\. Mecânica Proposta: Warp Core (WC) e Gerenciamento de Energia

> Consolidado em sessão de design de 2026-07-20. Expande o M/A-M Converter do manual
> original (seção 2\., gera 400 unidades/stardate a 100% de reparo) para um modelo de
> potência distribuída entre sistemas. Pontos em aberto listados na seção 9\., itens 11–15.

### 10.1. Conceito

* O WC passa a ser um **subsistema próprio** — hoje ausente da tabela de 8 subsistemas do
EngineeringConsole (seção 4\.5); precisa virar o 9º, ou substituir "Damage Control" (que
é função de reparo, não sistema de fato).
* Energia gerada pelo WC é função da % de dano do WC (`systems.warpCore`). O modelo deixa
de ser um pool único simples (`mainEnergy`) e passa a ser **distribuído entre sistemas**,
com prioridade: sistemas não-essenciais (luzes, equipamento não-crítico) podem ser
desligados ou reduzidos para liberar energia aos sistemas de combate quando o WC não
está a 100%.
* **Pré-requisito técnico:** um dreno passivo por sistema (consumo mesmo sem uso ativo)
que hoje não existe em nenhum lugar do modelo atual — sem ele, não há nada para "liberar"
ao desligar sistemas não-essenciais.

### 10.2. Sobrecarga (Overload)

* Jogador define um valor de sobrecarga entre **1% e 20%**, contínuo — o valor fica ativo
até o jogador reajustar (estado persistente, não ação pontual — mesmo padrão do Red Alert).
* Sobrecarga aumenta a energia fornecida pelo WC em até +20% acima do normal.
* Enquanto ativa: **dano contínuo ao WC**, proporcional ao valor da sobrecarga.
* Enquanto ativa: **chance de explosão por turno**, proporcional ao valor da sobrecarga.
Explosão = condição de derrota instantânea (seção 5\.3).
* **Fórmulas (decidido, revisão 2026-07-20, item 11 da seção 9\.):** curva Fibonacci
indexada por `overload%` (0-20), com cap de dano em 85 e cap de chance em 55%:

```
fib(overload)  = Fibonacci(overload)        // 0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765
danoWC/turno   = min(85, fib(overload) / 50)
chanceExplosao = min(0.55, fib(overload) / 12300)   // kChance = fib(20)/0.55 = 12300
```

Cap de dano em 85 só afeta `overload = 20` (19% já chega a 83.62 sem cap) — overload máximo
ainda destrói o WC em ~2 turnos sem reparo, mantendo peso à decisão. Lookup tables prontas
pra engine (evita recalcular Fibonacci em runtime):

```typescript
// índice = overload% (0-20)
const WARP_CORE_DAMAGE_TABLE = [
  0, 0.02, 0.02, 0.04, 0.06, 0.1, 0.16, 0.26, 0.42, 0.68, 1.1,
  1.78, 2.88, 4.66, 7.54, 12.2, 19.74, 31.94, 51.68, 83.62, 85,
]

const WARP_CORE_EXPLOSION_CHANCE_TABLE = [
  0, 0.00008, 0.00008, 0.00016, 0.00024, 0.00041, 0.00065, 0.00106,
  0.00171, 0.00276, 0.00447, 0.00724, 0.01171, 0.01894, 0.03065,
  0.04959, 0.08024, 0.12984, 0.21008, 0.33992, 0.55,
]
```

Abaixo de 10% de sobrecarga o WC aguenta tranquilo (dano e chance quase zero); acima de
10-11% acelera rápido — 18%+ já é jogar os dados a cada turno.

### 10.3. Equipes de Controle de Danos (CdD)

> Decidido em revisão 2026-07-20 (item 13 da seção 9\.). Substitui o reparo focado
> genérico (FIX) do manual original por um pool de equipes nomeadas, com fadiga.

* **6 equipes** fixas (`teamCount = 6`), menos que os 9 subsistemas (8 + WC) — força
priorização, nunca dá pra cobrir tudo ao mesmo tempo.
* Cada equipe: `{ efficiency: 0-100, assignedSystem: SystemKey | null, status: 'idle' |
'working' | 'cooldown' }`.
* **Fadiga** — cai enquanto trabalha, meia-vida de 3 turnos, floor em 20% (nunca para,
"queima" força de vontade):

```
efficiency(turnosTrabalhados) = max(20, 100 * 0.5^(turnosTrabalhados / 3))
```

| turnos trabalhando | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7+ |
|-|-|-|-|-|-|-|-|-|
| efficiency | 100% | 79.4% | 63.0% | 50% | 39.7% | 31.5% | 25% | 20% (floor) |

* **Recuperação** — linear, idle, `+8%/turno` (recuperação plena de uma equipe no floor
até 100% leva exatamente 10 turnos: `(100-20)/10 = 8`).
* **Docking:** `STARBASE_DOCK` e `STARBASE_SCIENCE` restauram todas as equipes a 100%
instantaneamente (licença/entretenimento da tripulação). `STARBASE_SUPPLY` **não**
recupera fadiga (sem área de lazer).
* **Empilhamento** — múltiplas equipes no mesmo sistema somam, mas com retorno
decrescente a partir da **3ª** equipe (excesso de gente atrapalha):

```
multiplicador por posição na fila: [1, 1, 0.5, 0.25, 0.125, 0.0625]
```

* **Taxa de reparo** — reusa os multiplicadores clássicos de FIX do manual oficial
(1x/2.5x/3x/5x), com base `1x = 5%/turno` (mesma taxa já fixada pro `REST`, seção 5\.5):

```
repairPerTurn(sistema) = 5 * tier * Σ(efficiency_i/100 * stackMult_i)
// tier = 3 (equipe focada, no espaço) ou 5 (focada + docado em STARBASE_DOCK)
```

**Validação (item 12 da seção 9\.)** contra a tabela de dano do WC (seção 10\.2, 1 equipe
100%, tier 3): sobra até overload 10% (15/turno vs. 1.10 de dano), empata perto de 15%
(15 vs. 12.2), perde sozinho a partir de 18% (15 vs. 51.68) — precisa empilhar.

### 10.4. Core Breach (Vazamento de Radiação)

* Roll **independente** do de explosão — não depende de sobrecarga estar ativa.
* Chance por turno proporcional à % de dano acumulado do WC (não à sobrecarga). Ou seja:
dano de combate no WC já é perigoso por si só, mesmo que sobrecarga nunca tenha sido usada.
* Ao disparar: tripulação tem **5 turnos** para reparo imediato (despacho de equipe de
CdD) antes de morrer por envenenamento de radiação — condição de derrota (seção 5\.3).

**Modelagem (decidido, revisão 2026-07-20, item 14 da seção 9\.):**

```typescript
radiationBreach: {
  active: boolean
  containment: number       // 0-100, progresso de contenção
  turnsRemaining: number    // começa em 5, regressivo
} | null
```

* Reparo do breach é **parcial** (barra de contenção), não binário. Equipes dispatchadas
nele usam a mesma fórmula da seção 10\.3, mas com **tier fixo em 5x** (urgência máxima —
vale o bônus de "docado" mesmo no espaço, é vida ou morte):
`repairPerTurn(breach) = 5 * 5 * Σ(efficiency_i/100 * stackMult_i)`
* Enquanto `active`, **todo reparo fora do breach sofre penalidade ×0.5** — radiação
distrai/envenena a tripulação inteira, não só quem está na ruptura.
* Resolve quando `containment >= 100` antes de `turnsRemaining` zerar. Se zerar antes:
morte por radiação (derrota, seção 5\.3).
* Dispatch é decisão manual do jogador (igual FIX normal) — não puxa equipes
automaticamente.

**Simulação de verificação:**

| cenário | taxa/turno | turnos p/ conter | resultado |
|-|-|-|-|
| 1 equipe fresca (100%) | 25.00 | 4 | ✅ contido |
| 1 equipe meio-fatigada (50%) | 12.50 | 8 | ☠️ morte por radiação |
| 1 equipe exausta (floor 20%) | 5.00 | 20 | ☠️ morte por radiação |
| 2 equipes frescas | 50.00 | 2 | ✅ contido |
| 2 equipes: 1 fresca + 1 exausta | 30.00 | 4 | ✅ contido |
| 3 equipes frescas | 62.50 | 2 | ✅ contido |
| todas as 6 exaustas (20% cada) | 14.69 | 7 | ☠️ morte por radiação |

Equipe solo precisa de **≥80% de eficiência** pra conter sozinha dentro de 5 turnos
(`25*(e/100)*5 >= 100 → e>=80`). Negligência total (nenhuma equipe descansada) falha por
pouco — castigo justo por má gestão de fadiga, não RNG cego.

### 10.5. Integração com Sistemas Existentes

|Sistema existente|Como se conecta|
|-|-|
|EngineeringConsole|Home natural: WC vira linha na tabela de subsistemas; slider de sobrecarga reusa o padrão visual de temperatura/efetividade já usado no WeaponsConsole; novo painel de gerenciamento das 6 equipes de CdD (dispatch, efficiency, status) — ver Fase 3.5, seção 11|
|SituationPanel (HUD)|Indicador persistente de status do WC/sobrecarga e, se core breach ativo, alerta próprio urgente com contagem regressiva (paralelo ao Red Alert) — ver seção 11|
|Fila de mensagens (seção 5\.6 / 7\.2)|Canal natural para alertas de core breach e explosão iminente — mesmo padrão de 4 slots com ack do manual original|
|FIX / reparo focado (seção 5\.5, 6\.2)|Substituído pela mecânica de equipes de CdD (seção 10\.3) — reusa os multiplicadores 1x/2.5x/3x/5x do manual, agora por equipe nomeada com fadiga|
|Dilítio / planetas (LAND/ORBIT/USE)|Cristal de dilítio vira o reabastecimento de emergência do WC danificado — conecta duas mecânicas hoje órfãs no dossiê|
|Fim de jogo (seção 5\.3)|+2 condições de derrota: explosão do WC, morte da tripulação por radiação|

\---

## 11\. Fase 3.5 — Ajustes de Interface (pré-Fase 4)

> Decidido em revisão 2026-07-20 (item 15 da seção 9\.). As mecânicas novas (Warp Core,
> CdD, Core Breach) e as decisões dos itens 1–10 pedem displays que não existem em nenhum
> console hoje. Antes de escrever a engine (Fase 4), fechar essas telas evita
> retrabalho de layout no meio da implementação — trabalho de **UI apenas**, sem lógica
> de estado real (segue com props/mock, igual o resto da Fase 3).

**Escopo:**

* **SituationPanel** — reorganizar o layout 2×2 pra caber: torpedos restantes, status do
escudo, status do WC/sobrecarga (nominal/danificado/breach), alerta de breach (contagem
regressiva de turnos, visual urgente — não pode ser discreto)
* **EngineeringConsole** — WC como 9ª linha na tabela de subsistemas + slider de
sobrecarga (1-20%, reusa padrão visual de temperatura/efetividade do WeaponsConsole);
novo painel de gerenciamento de equipes de CdD (6 equipes: status, efficiency, dispatch)
* **ShieldConsole** — extrair e integrar o SVG real da Enterprise (item 5), props
reativas de opacidade/dano
* **HelmConsole** — instanciar `WarpSpeed` no canvas existente, componente com prop
`warpFactor` (item 6)
* **TacticalConsole** — 6ª aba Star Chart (item 1)
* **Combat Log** — novo painel fixo inferior, scroll + auto-scroll, abas Captain's
Log/General/Engineering (item 2)
* **GameScreen** — scaffold dos 3 modos (briefing/playing/result), sem lógica de
transição real ainda (item 3)

\---

## 12\. Revisão de UX painel-por-painel (pré-Fase 4, 2026-07-24)

> Depois da Fase 3.5, o usuário revisou os consoles um a um pedindo ajustes de UX pontuais
> antes de começar a Fase 4 de fato (SituationPanel e TacticalConsole revisados e
> aprovados, HelmConsole em detalhe abaixo). Tudo aqui é **mecânica de UI com estado
> local** (`ref`/`computed` no próprio componente) — a Fase 4 deve **plugar o estado real
> por cima disso sem redesenhar a interação**, os comportamentos abaixo já foram
> validados com o usuário e não devem regredir.

### 12.1. Padrão de destaque de seleção ativa

Convenção consolidada nesta revisão, usada em toda aba/botão de seleção mútua exclusiva:

* **Inativo:** `filter: brightness(0.6)` no elemento
* **Ativo:** sem filtro (`''`)

Aplicado em: abas do Combat Log (Cap./Ship/Eng. Log) no `SituationPanel.vue`, nos 6
botões do menu do `TacticalConsole.vue` (Helm/Shields/Weapons/Nav/Engineering/Star
Chart), e nos botões System/Sector do `set-dst-inp` no `HelmConsole.vue`.

### 12.2. HelmConsole — D-Pad e Set Destination

* Estado local: `destination = { sys: {x,y}, sec: {x,y} }`, cada eixo clampado 1-8.
* `activeDstToggle` (`'sys' | 'sec'`) escolhido pelos botões System/Sector (highlight
padrão da seção 12.1) — define qual dupla de coordenadas o D-Pad altera.
* D-Pad (`adjustDestination(dx, dy)`, ligado via `bindPadButtons()` em `onMounted`):
  * Cardeais: `xy_ctl_left/right` alteram X, `xy_ctl_up/down` alteram Y
  * Diagonais alteram os dois eixos ao mesmo tempo: `NE`→(+1,-1), `SE`→(+1,+1),
  `SW`→(-1,+1), `NW`→(-1,-1)
* **Bug corrigido (herdado do legado `src/modules/helm-console.js`):** os ids
`dst-sys-ind`/`dst-sec-ind` estavam trocados de posição (texto de `sys` renderizava do
lado do label "Sector" e vice-versa). Corrigido — sem outras referências no código a
esses ids, seguro de ter corrigido.
* **Current Location continua mock** (ver 4.2) — a ligação real é trabalho de Fase 4.

### 12.3. HelmConsole — Impulse Power e Boost

* `impulsePower` (0-100%, passo 5 nos botões -/+) é a base; `boostedImpulsePower`
(computed) retorna **100% fixo** enquanto `impulseBoost` estiver ativo (não 120% —
correção do usuário sobre o pedido original de "afterburner").
* **Esclarecimento do usuário (2026-07-24), importante pra Fase 4:** o indicador é um
medidor de **potência nominal**, por isso trava em 100% mesmo com boost — ele nunca deve
mostrar acima disso. A **potência real do motor**, porém, vai a **120%** enquanto o boost
está ativo, e é esse valor real (não o exibido) que deve entrar na fórmula de tempo de
deslocamento dentro de um sistema quando a Fase 4 implementar isso — não usar
`boostedImpulsePower` (que é só de display) pra esse cálculo, e sim algo como
`impulseBoost ? 120 : impulsePower`.
* Boost (`toggleBoost()`):
  * Duração máxima **60s** (auto-desliga via `setTimeout`, `BOOST_MAX_DURATION`)
  * Cooldown = `30s mínimo + max(0, segundos_ativo − 30)` (`BOOST_COOLDOWN_BASE = 30`) —
  ou seja, cooldown máximo é 60s (boost usado pelo tempo máximo permitido)
  * Não pode reativar durante o cooldown (`canActivateBoost`)
  * Barra de cooldown (`SolidLevelBar`) ao lado do botão, drena de `boostCooldownTotal`
  até 0
* **Efeitos visuais (pedido explícito do usuário, não inverter sem confirmar de novo):**
  * Boost **ativo** → classe `white-flash` (`lcars-sdk.css`, já existente)
  * **Cooldown** (não ativo, `boostCooldownRemaining > 0`) → classe `blink`
  * Filtro de brightness foi removido do botão de Boost — redundante com o `white-flash`

### 12.4. HelmConsole — Warp Engage/desengate

* `WARP_SPEED_SCALE = 15` — a lib `WarpSpeed` não trava `TARGET_SPEED` (só `SPEED >= 0`),
mas o default da lib (`SPEED=0.7`) é pensado pra um fundo parado sutil. `warpFactor` (1-8)
é multiplicado por esse fator antes de virar `TARGET_SPEED`, senão o rastro
(`WARP_EFFECT_LENGTH * SPEED`) fica imperceptível. `warpEffectLength` também subiu de 5
(default da lib) pra 8 na config do `new WarpSpeed(...)`.
* **`SPEED_ADJ_FACTOR` é mutável na instância** (não só no construtor) e é trocado
dinamicamente pelo `engageWarp()`:
  * Engajando: `WARP_ACCEL_FACTOR = 0.08` (entrada suave em warp)
  * Desengajando: `WARP_DECEL_FACTOR = 0.2` (ajustado manualmente pelo usuário; 0.25
  testado e achado rápido demais) — decaimento bem mais rápido que o acelerar, pra não
  deixar a animação "arrastando" depois que o jogador desengata. Motivo: o capitão só
  pode agir de novo depois que a nave sai do warp de verdade, então o dropout não pode
  ficar lento.
* `TARGET_SPEED` só é setado pra `warpFactor * WARP_SPEED_SCALE` quando `warpEngaged`
é `true`; ao desengatar vai pra `0`. Mudar `warpFactor` (Set Warp) enquanto engajado
atualiza a velocidade ao vivo (`watch(warpFactor, ...)`), guardado por `warpEngaged`.
* Botão Engage: classe `white-flash` enquanto `warpEngaged` (mesmo padrão do Boost, seção
12.3) — sem filtro de brightness (removido pelo usuário, redundante com o flash).
* **Tipos:** `vite-env.d.ts` — `WarpSpeed` ganhou `SPEED_ADJ_FACTOR: number` na declaração
(além de `TARGET_SPEED` que já existia).

### 12.5. ShieldConsole — indicador do casco e mecânica de integridade (proposta, Fase 4)

* Coluna do visor (`DefaultBracket` + `EnterpriseShieldSvg`) aumentada: 22rem → 34rem de
largura, `minHeight` do bracket 14rem → 22rem — o casco/contorno estava pequeno demais.
* **Contorno do escudo com gradiente contínuo de cor** (não mais degraus): preto
(0%/desativado) → vermelho (25%) → laranja (50%) → amarelo (75%) → verde (100%),
interpolado linearmente entre os stops mais próximos do valor atual (`SHIELD_COLOR_STOPS`
em `EnterpriseShieldSvg.vue`). Opacidade (`shieldOpacity`, piso 0.15) soma a variação de
brilho por cima da cor.
* **Botão "Simulate Hit"** (`ShieldConsole.vue`) — sem mecânica de combate real ainda,
escolhe uma zona aleatória entre as 8 (`SHIELD_ZONE_KEYS`) e aplica um flash branco
momentâneo nela. Usa `:fill` direto + `transition: fill 0.25s ease-out` em vez da classe
global `white-flash` — essa classe anima `background-color`/`color`, que não tem efeito em
`fill` de elementos SVG (`<path>`/`<rect>`).
* **Esclarecimento do usuário (2026-07-24) — separar as duas variáveis, importante pra
Fase 4:**
  * `shieldEnergy` (0-2500, já existe) é **energia**: afeta **quanto o escudo consegue
  absorver** de dano e a **velocidade de regeneração**.
  * `shieldIntegrity` (0-100%, **nova prop** em `EnterpriseShieldSvg.vue`, substituiu a
  antiga `shieldLevel`) é o **resultado** dessa dinâmica de energia — é o que o gradiente
  de cor do contorno do escudo representa, **não** a energia bruta.
  * **Ainda não implementado** (fica pra Fase 4, junto do resto da lógica de combate):
  a fórmula real de como energia (capacidade de absorção + regen) produz integridade ao
  longo do tempo/turnos. Hoje `shieldIntegrity` em `ShieldConsole.vue` é só um `ref` mock
  local (começa em 100, cai 5-15 a cada "Simulate Hit", sem regen) — suficiente pra
  visualizar o gradiente, mas **não** é a mecânica de verdade.
  * Ao implementar: `shieldIntegrity` deve ser derivada de `shieldEnergy` + histórico de
  dano (não substituída por ele) — não reintroduzir o acoplamento direto que a revisão
  desfez.
* **Contorno mais grosso:** `stroke-width` do path de contorno subiu de `1.80028` pra `4`
— em integridade baixa (perto do preto) o traço fino ficava difícil de enxergar.
* **`shieldStatus` agora também depende de `shieldIntegrity`** (`ShieldConsole.vue`):
`'UP'` só se `shieldEnergy > 0 && shieldIntegrity > 0`, senão `'DOWN'` — antes só olhava
energia. Texto `shdStsIndTxt` pisca (`blink`) quando `DOWN`.
* **Reset ao entrar no console:** `TacticalConsole.vue` usa `v-show` (todos os consoles
ficam montados, só escondidos) — `ShieldConsole` ganhou prop `active` (recebe
`activeConsole === 'shield'` do pai) e um `watch` que reseta `shieldIntegrity` pra 100
toda vez que `active` vira `true`. Necessário porque ainda não existe regen: sem o reset,
o dano acumulado do "Simulate Hit" ficaria preso pra sempre depois da primeira visita à
aba. **Fase 4 remove esse reset** quando a regen de verdade existir.

### 12.6. WeaponsConsole — Set Power e mira por Cycle entre alvos reais

* **Set Power do Phaser na linguagem visual do Impulse Power (Helm, seção 12.3):**
indicador dedicado acima (`LcarsComplexButton` "Phaser Power" + `LcarsText` com o valor)
e a `SolidLevelBar` do "Set Power" sem `:label` — mesma correção de redundância aplicada
no warp/impulse (texto pequeno demais dentro da barra pra ler bem).
* **Mira por Cycle revista (reverte a decisão de mira-por-clique do item 9/seção 9):** o
usuário lembrou que já tinha trocado a mira por clique pelo mecanismo de **Cycle**, e a
mecânica correta é:
  * `enemyTargets` (mock local, `WeaponsConsole.vue`) é uma lista **independente** dos
  tubos — os alvos de verdade no setor (Fase 4: vem do estado real dos Klingons).
  * Cada `Tube` guarda `targetIndex` (índice em `enemyTargets`), não mais `targetX/targetY`
  soltos.
  * Botão **"Cycle"** por tubo avança `targetIndex` pro próximo alvo da lista
  (`(targetIndex + 1) % enemyTargets.length`), dando **liberdade tática** pro capitão:
  todos os tubos no mesmo alvo, um em cada, 2:1, como preferir — sem ficar preso a 1
  tubo = 1 alvo fixo.
  * `scannerGrid` agora renderiza os alvos a partir de `enemyTargets` (não mais derivado
  da posição dos tubos) — os inimigos aparecem no scanner independente de qualquer tubo
  estar mirando neles.
  * **Etiqueta do(s) número(s) de tubo no alvo:** célula do scanner com inimigo mostra um
  badge (`.scanner-cell-badge` em `LcarsScanner.vue`) com os tubos mirando ali (ex: `"1,3"`
  se os tubos 1 e 3 miram o mesmo Klingon).
  * **Mudança na `LcarsScanner.vue` (componente compartilhado):** antes `img` e `text` de
  uma `ScannerCell` eram mutuamente exclusivos (`v-else-if`) — agora renderizam juntos
  quando os dois existem (ícone + badge sobreposto no canto). `.item` ganhou
  `position: relative` pra ancorar o badge absolute. Não quebra uso existente (Nav/
  StarChart só usam um ou outro campo, nunca os dois).
* **Unload + Auto-load:** botão de tubo vira `Load N` ↔ `Unload N` conforme `tube.status`
(mesmo botão, não dois). `unloadTube()` devolve o torpedo ao `torpedoStock` e **desliga**
`autoLoad` (esvaziar manualmente é uma decisão explícita do capitão, não deve continuar
recarregando sozinho). `fireTorpedoes()` recarrega na hora os tubos com `autoLoad` ativo
e estoque disponível — dispara e já deixa `Loaded` de novo no mesmo ciclo, sem passo manual.
* **Bug corrigido no `SolidLevelBar.vue` (componente compartilhado):** `displayLabel`
ignorava o conteúdo de `props.label` e sempre re-renderizava `currentLevel` bruto
(`if (props.label) return currentLevel.value.toString()`) — qualquer label formatado
diferente do valor cru (ex: `Math.round()`) nunca aparecia. Corrigido pra usar
`props.label` de verdade. Afetava a Effectiveness dos Phasers (queria inteiro, mostrava
decimal) e o Overload do `EngineeringConsole` (queria `"20%"`, mostrava `"20"` sem o `%`)
— achado de bônus ao corrigir. `:level` continua sempre o valor decimal/cru (preenchimento
da barra e cálculo de dano futuro não mudam, só o texto exibido).
* **Presets de potência do Phaser:** 4 botões (25/50/75/100%) abaixo do "Set Power" —
mostram a porcentagem, calculam `phaserPower = (percent/100) * PHASER_POWER_MAX`. Mesmo
padrão dos presets do Impulse Power (12.3): **sem** highlight de seleção, são atalhos, não
um seletor mutuamente exclusivo.

\---

### 12.7. NavSensingConsole — legenda do LRS; HelmConsole — ordem Sector/System

* **Legenda do LRS** (`NavSensingConsole.vue`, item pendente desde a seção 6.3) — linha de
texto fixa abaixo do grid de longo alcance: `"Code: KBS — K=Klingons  B=Starbases
S=Stars"`, `fontSize: 1.15rem`, `opacity: 0.75` (tamanho pequeno demais na 1ª tentativa,
ajustado a pedido do usuário).
* **Cor do código LRS derivada do conteúdo, não fixada por célula** — `lrsCodeColor(code)`
lê o 1º dígito (Klingons) e o 2º (Bases) do código `KBS`: `alert-fg` se K>0 (inimigo,
prioridade de leitura), senão `anakiwa-fg` se B>0 (base aliada), senão `text-white` (só
estrelas, nada de interesse). `longRangeGrid` agora é gerado a partir de
`LRS_DEMO_CODES` (mapa código-por-célula) + essa função, em vez de cor manual por entrada
— **mesma função de cor reaproveitada implicitamente** no `StarChartConsole.vue` (já usava
a mesma convenção `alert-fg`/`anakiwa-fg`/`text-light`, ver seção 5.2).
* **`HelmConsole.vue` — ordem Sector antes de System:** usuário notou que a convenção dos
sensores (Nav/LRS: sempre setor primeiro) não batia com o Helm, que mostrava System antes
de Sector tanto no indicador "Current Location" quanto no "Set Destination". Trocada a
ordem visual nos dois blocos (`cur-loc-sec`/`cur-loc-sys`, `dst-sec-ind`/`dst-sys-ind`) —
só reordenação de template, o estado (`activeDstToggle` default `'sec'`, `destination.sec`/
`destination.sys`) já seguia essa convenção internamente.
* **Doc corrigida:** seção 4.6 e seção 5.2 estavam desatualizadas — item "Starchart" listado
como pendente, mas já tinha sido implementado na Fase 3.5 (`StarChartConsole.vue`, 6ª aba
do `TacticalConsole`). Ver 5.2 pro que realmente falta lá (posição do jogador destacada,
dados reais, filtros).
* **LRS redesenhado pra não ser redundante com o Star Chart:** usuário notou que os dois
painéis pareciam fazer a mesma coisa. Diferença real do clássico (confirmada contra a
seção 3.2): **LRS** = sensor ao vivo, só cobre os quadrantes **vizinhos** (bloco 3×3 ao
redor da nave), **sem memória** (some de novo até o próximo Scan); **Star Chart** = mapa
**acumulado** da galáxia inteira (8×8), memória permanente de tudo já explorado, não
precisa reescanear.
  * **1ª tentativa (revertida):** encolher o grid do LRS pra 3×3 de verdade. Quebrou a
  mecânica de clicar num sistema e mandar a coordenada real pro Helm (usuário apontou:
  "o sensor reduzido prejudica essa mecânica") — grid pequeno não bate mais 1:1 com
  coordenada absoluta da galáxia sem tradução local↔absoluto.
  * **Versão final:** grid do `LcarsScanner` continua **8×8 cheio** (mesmo tamanho/posições
  absolutas do Star Chart, clique manda coordenada real direto, sem tradução) — só que
  `longRangeGrid` (computed) só popula os **9 quadrantes vizinhos** de `playerQuadrant`
  (mock local, `{row:4,col:4}`), e só **depois do botão "Scan"** (`longRangeScanned` ref,
  `scanLongRange()` liga). Antes de escanear ou fora do alcance = célula em branco (não
  `???` — isso é conceito do Star Chart/"inexplorado", aqui é "fora de alcance dos
  sensores", coisa diferente).
  * `LRS_DEMO_CODES` mock só tem entrada pra células dentro do alcance (vizinhos de 4,4) —
  fora disso não tem dado nenhum, de propósito.
  * **Achado do bug de CSS ao testar a 1ª tentativa (3×3):** `.scanner.long` (`lcars-sdk.css`)
  tem `width: 38rem` **fixo via classe**, não calculado a partir das props `width`/`height`
  — o grid é um único flex container com `flex-wrap`, e o wrap pra próxima linha depende de
  quantos itens de `4rem` cabem nos 38rem do container bater exatamente com o número de
  colunas (border + N). Pra 8 colunas isso by design cabe certo (9×4rem≈36rem). Reduzir
  `width`/`height` pra 3 sem also sobrescrever o `:style` do próprio `LcarsScanner` (que
  repassa direto pro elemento raiz) faz o wrap quebrar — texto de células de linhas
  diferentes cai na mesma linha visual. Confirmado com screenshot via Playwright antes de
  reverter a abordagem. Registrado aqui porque qualquer futuro uso de `version="long"` com
  `width`/`height` ≠ 8 no `LcarsScanner` **precisa** de `:style="{ width: '<N+1>*4.1rem' }"`
  pra não quebrar — a classe CSS não escala sozinha.
* **Bug irmão encontrado no `StarChartConsole.vue`:** mesma classe `.scanner.long`
(38rem fixo), mas dessa vez o `DefaultBracket` (moldura) é que estava pequeno demais —
`width: '24rem'` pra um scanner `version="long"` 8×8 que renderiza 38rem de largura de
verdade. Moldura não cobria a extensão inteira do grid (colunas da direita ficavam fora/
cortadas). Corrigido pra `42rem` (mesmo valor já usado no bracket do LRS,
`NavSensingConsole.vue`, pro mesmo tipo de scanner) — junto com a `LcarsComplexButton`
"Selected Quadrant" e a `LcarsRow` da legenda, que também estavam em 24rem e ficariam
desalinhadas com o bracket mais largo. Confirmado com screenshot via Playwright.
* **Moldura na posição atual da nave (Star Chart e LRS)** — resolve o item "posição do
jogador destacada" pendente na seção 5.2. `PLAYER_MARKER_STYLE = { boxShadow: 'inset 0 0
0 3px #ffffff' }` (mesmo valor nos dois arquivos, sem composable novo — só 2 usos) aplicado
via `ScannerCell.style` na célula de `playerQuadrant` (mock local `{row:4,col:4}` em cada
componente, ainda não sincronizado entre os dois nem com estado real — Fase 4). `boxShadow`
em vez de `border` pra não alterar o box-model da célula (`.scanner > .item` já tem
tamanho fixo via CSS, `border` somaria ao tamanho sem `box-sizing:border-box`).
  * **No LRS:** a moldura aparece **sempre**, mesmo antes do Scan — a nave sempre sabe onde
  ela está, isso não depende do sensor revelar o conteúdo dos vizinhos (`longRangeGrid`
  computed monta o grid vazio/escaneado primeiro, depois sempre sobrescreve o estilo da
  célula do jogador por cima, preservando texto/cor se já existir).
  * **No Star Chart:** `activeGalaxyGrid` virou `computed` (era `ref` direto de
  `props.galaxyGrid ?? demoGalaxyGrid`, renomeado pra `baseGalaxyGrid`) que sempre
  sobrepõe o estilo da célula do jogador por cima do grid base, preservando o código
  KBS que já estava lá.
  * **SRS não precisou de mudança** — já mostra a nave com ícone real
  (`getIcon(ScannerEntity.PLAYER)`), não precisa de moldura adicional.
* **Bug de centralização vertical no `LcarsScanner.vue` (compartilhado):** texto de célula
central (`.item`, flex `align-items:center`) ficava colado no topo da célula. Causa: a regra
global `line-height: 1.25` (font-size 24px → line-height 30px computado) cria uma caixa de
linha quase do tamanho da célula (32px), e a fonte `"LCARS Lower"` renderiza o glifo com o
grosso do espaço reservado abaixo da linha de base — resultado visual é texto "subindo"
mesmo com o flex centralizando a caixa de linha corretamente. Fix: nova classe
`.scanner-cell-text` (`line-height: 1`) no `<span>` de texto central (não afeta o badge, que
já tinha seu próprio `line-height`, nem os labels de borda). Achado ao investigar a moldura
do jogador, mas é bug pré-existente, independente dela — afeta qualquer célula com `text`
em qualquer consumidor do `LcarsScanner` (SRS/LRS/Star Chart/Weapons targeting).
* **`StarChartConsole.vue` — nomenclatura e ação:** "Selected Quadrant" renomeado pra
"Selected System" (`selectedQuadrant` → `selectedSystem`), consistente com a convenção já
usada no LRS (`NavSensingConsole.vue`) e no Helm (`destination.sys`) — "quadrante" no jogo
clássico é chamado de "system" nessa UI. Adicionado botão "Snd to Helm"
(`sendSystemToHelm()`, mesmo stub `console.log` do LRS) do lado do indicador — antes a
seleção de sistema no Star Chart não tinha nenhuma ação associada.

\---

*Fim do dossiê. Todos os 16 itens da seção 9 revisados e decididos (2026-07-20; item 9
revisto 2026-07-25, seção 12.6). Fase 3.5 concluída, revisão de UX pré-Fase 4 em andamento
(seção 12). Próximo passo: terminar a
revisão painel-por-painel (Engineering restante), depois Fase 4
(engine core + Pinia, seção 8\.4).*

