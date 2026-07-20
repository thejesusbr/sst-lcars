# SST LCARS Edition — Dossiê de Especificações de Engine

> \*\*Documento de revisão pré-Fase 4.\*\* Não implementar nada sem aprovação do autor.
> Status: rascunho para discussão — 2026-07-08

\---

## 1\. Resumo Executivo

O SST LCARS Edition é um revival do clássico *Super Star Trek* com interface LCARS. A Fase 3
concluiu a migração visual de todos os consoles. A Fase 4 precisa criar a **engine de jogo**
que conecta os controles visuais a um estado reativo centralizado.

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
|Starbase (doca)|`STARBASE\_DOCK`|`space-Dock.png`|
|Estação Científica|`STARBASE\_SCIENCE`|`regula-1.png`|
|Base Klingon|`KLINGON\_BASE`|`k7.png`|
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

### 4.2. HelmConsole ⚠️ Quase completo (visual), sem lógica

**O que cobre:** D-Pad 8 direções (visual), Current Location, Set Destination (System/Sector),
Warp Factor slider (1–8), botão Engage, canvas WarpSpeed.

**O que falta:**

* **Todos os eventos do D-Pad** — apenas `up` tem listener e só faz `console.log`
* **Lógica de movimento** — consumo de energia proporcional à distância
* **Fórmula de Stardate** — deslocamento warp avança o stardate
* **WarpSpeed no Vue** — `WarpSpeed` não é importado nem instanciado no canvas
* **Botão Auto-Navigate** — ir automaticamente à Starbase mais próxima
* **Validação de destino** — impedir movimento para célula ocupada ou fora de grade
* **Atualização das coordenadas** após movimento bem-sucedido

**Proposta de integração (sem implementar):**

> Adicionar ao Helm uma seção "Navigation Computer" com:
> - Botão \*\*"Auto-Nav to Base"\*\* → calcula rota até starbase mais próxima e executa
> - Indicador de \*\*energia estimada para o trajeto\*\* antes do Engage
> - Indicador de \*\*stardate estimada de chegada\*\*

\---

### 4.3. WeaponsConsole ⚠️ Funcional localmente, sem efeito no estado global

**O que cobre:** Controle de temperatura e efetividade dos phasers, seletor de potência, Lock,
Fire Phasers; Load/Unload torpedos, Auto-load, mira X,Y no scanner com ícones,
Fire Torpedoes.

**O que falta:**

* **Cálculo de dano real** — `firePhasers()` e `fireTorpedoes()` não deduzem energia nem
calculam dano nos Klingons
* **Binding ao inventário global de torpedos** — `torpedoStock` é local e não sincroniza com `useGameState`
* **Resposta dos Klingons** — após disparo, IA inimiga não executa contra-ataque
* **Cálculo de dano inimigo nos escudos** — nenhuma ligação com ShieldConsole
* **Mira automática** — "Lock" existe mas não identifica inimigos reais do estado global
* **Energia de phaser da energia principal** — disparo devia consumir `phaserPower` da Main Energy

\---

### 4.4. ShieldConsole ⚠️ Lógica de transferência ok, sem estado global

**O que cobre:** Raise/Lower Shields, presets de transferência, SolidLevelBar de
Shield Energy e Main Energy, SVG placeholder da Enterprise.

**O que falta:**

* **SVG real da Enterprise** — o legado `shield-console.js` tem um SVG técnico de 188 KB que
mostra as linhas de força dos escudos; o atual é um placeholder simples
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
* **Decodificação KBS** — o LRS precisa de um tooltip ou legenda explicando o formato `KBS`
* **Snd Helm real** → emitir evento que atualiza o destino no HelmConsole
* **Hail** → lógica de comunicação (com Klingons: tentativa de rendição; com Starbase: status)
* **Dock** → sequência de atracagem com resultado (reabastecimento, reparos)
* **Probe** → delay real proporcional à distância, resultado ao chegar
* **Starchart** — mapa completo da galáxia 8×8 (ver Seção 5.2)

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

### 5.2. Starchart / Mapa Galáctico

O comando `COM 4` do SST clássico exibe um mapa da galáxia inteira (8×8 quadrantes) mostrando:

* Quadrantes já explorados (com código KBS)
* Quadrantes inexplorados (`---`)
* Posição atual do jogador (destacada)
* Localização das Starbases conhecidas

**Não existe nenhum console ou componente para isso.**

**Proposta A:** Adicionar como nova aba no `TacticalConsole` — um 6º console chamado
**"Navigation Computer"** ou **"Star Chart"** com:

* Grid 8×8 usando `LcarsScanner` em versão extra-large (ou componente novo)
* Células que mostram código KBS ou `???` para inexplorado
* Posição do jogador destacada
* Filtros: mostrar só Klingons, só Starbases, etc.

**Proposta B:** Integrar como painel secundário no `NavSensingConsole` (3ª coluna ou aba
dentro do console), mantendo a estrutura de 5 consoles no Tactical.

\---

### 5.3. Condições de Fim de Jogo

Não há nenhuma tela, lógica ou componente para:

* **Vitória** — todos os Klingons destruídos
* **Derrota por energia** — Main Energy chega a 0
* **Derrota por stardate** — tempo esgotado com Klingons restantes
* **Derrota por starbases** — todas as starbases destruídas
* **Rendição** — `QUIT`/`SURR` do clássico

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
No SST clássico, atracar em uma Starbase:

1. Reabastece Main Energy até o máximo
2. Reabastece Torpedos até o máximo
3. Repara todos os sistemas danificados (instant)
4. **Condição:** precisa estar em setor adjacente a uma Starbase

**Proposta:** Um evento `dock-complete` emitido por `useGameState` que:

* Atualiza `mainEnergy → 4500`
* Atualiza `torpedoStock → 12`
* Atualiza todos os subsistemas → 100%
* Emite feedback visual no SituationPanel ("Docking complete. All systems nominal.")

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

**Adicionado como 6ª aba no TacticalConsole.**

\---

### 7.2. Combat Log / Captain's Log ⭐ Alta prioridade

**Justificativa:** O SST de texto depende de mensagens para comunicar o que acontece. Sem um log,
o jogador não sabe se seu disparo acertou, quantos escudos absorveu, se um Klingon morreu.

**Proposta A — Painel fixo inferior:** Uma área de texto persistente abaixo do GameHud,
sempre visível, com os últimos N eventos em ordem reversa.

**Proposta B — Sobreposição de evento:** Um componente tipo "toast" que aparece por 3–5 segundos
com a mensagem e desaparece. Múltiplas mensagens em sequência.

**Proposta C — Painel no SituationPanel:** Uma 3ª seção expandível abaixo dos indicadores de
status, com scroll, que mostra o log da missão atual.

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
  systems: Record<SystemKey, number>

  // Universo
  galaxy: QuadrantData\[]\[]  // grade 8×8
  currentSector: SectorData\[]\[] // grade 8×8 do quadrante atual
  exploredQuadrants: boolean\[]\[] // grade 8×8

  // Alertas
  alertLevel: 'normal' | 'yellow' | 'red'
  combatLog: CombatLogEntry\[]
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

2. TURNO INIMIGO (após cada ação do jogador)
   └── Para cada Klingon no quadrante atual:
       ├── Calcula dano ao jogador (distância × poder Klingon)
       ├── Reduz shieldEnergy (e mainEnergy se escudos a 0)
       ├── Dano aleatório a subsistema (chance %)
       └── Klingon pode mover (pequena chance)

3. VERIFICAR CONDIÇÕES TERMINAIS
   └── Vitória: enemiesLeft === 0
   └── Derrota: mainEnergy <= 0 || stardate >= stardateLimit || starbasesLeft === 0

4. ATUALIZAR DISPLAYS
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
desenvolvimento da engine.

\---

## 9\. Itens para Discussão

1. **Starchart:** nova aba no TacticalConsole (6ª aba) ou painel no NavSensingConsole?
2. **Combat Log:** toast efêmero, painel fixo inferior, ou seção no SituationPanel?
3. **Tela de resultado:** componente GameScreen wrapping GameHud, ou overlay fullscreen?
4. **Pinia vs. composable simples** para o estado global
5. **SVG real do ShieldConsole:** extrair os \~188KB do legado, ou redesenhar?
6. **WarpSpeed:** reusar `warpspeed.min.js` via `<script>` global, ou reimplementar em Canvas API?
7. **IA Klingon:** turno simples (ataque após cada ação), ou sistema de pontos de ação?
8. **Dificuldade:** o SST clássico tem dificuldades NOVICE/FAIR/GOOD/EXPERT/EMERITUS — implementar?
9. **Torpedos:** manter mira X,Y (atual) ou adicionar também a opção de bearing 0-360° do clássico?
10. **Starbases:** apenas STARBASE\_DOCK ou manter os dois tipos (Dock + Science)?

\---

*Fim do dossiê. Aguardando revisão antes de iniciar implementação da Fase 4.*

