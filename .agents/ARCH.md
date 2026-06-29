# ARCH.md - Arquitetura do Projeto

Este documento detalha a arquitetura do **SST LCARS-SDK**, explicando a estrutura de ambas as abordagens (legada em jQuery/Electron e moderna em Vue 3).

---

## 1. Visão Geral da Arquitetura

O projeto adota uma arquitetura híbrida de transição. Atualmente, o core da aplicação desktop roda via Electron a partir da raiz do projeto, enquanto a pasta `vue-app` contém um esforço de migração e modernização do ecossistema de componentes para Vue 3.

```mermaid
graph TD
    subgraph Electron (Raiz)
        MainJS[main.js] --> MainWindow[MainWindow.js]
        MainWindow --> IndexHTML[src/index.html]
        IndexHTML --> LCARS_Core[lcars-sdk/core]
        IndexHTML --> LegacyModules[src/modules/*]
    end

    subgraph Vue 3 (vue-app)
        AppVue[App.vue] --> GameHudVue[GameHud.vue]
        GameHudVue --> SituationPanelVue[SituationPanel.vue]
        GameHudVue --> TacticalConsoleVue[TacticalConsole.vue]
        SituationPanelVue --> VueElements[src/components/elements/*]
        SituationPanelVue --> VueWidgets[src/components/widgets/*]
        VueElements --> Composables[src/composables/*]
    end
```

---

## 2. Arquitetura Legada (Electron + jQuery + LCARS SDK)

### 2.1. Processo Principal (Electron)
- **[main.js](file:///home/wendell/Projetos/sst-lcars/main.js)**: Configura o ciclo de vida do Electron, menu da aplicação (incluindo atalhos de tela cheia e ferramentas de desenvolvedor) e instancia a janela principal.
- **[MainWindow.js](file:///home/wendell/Projetos/sst-lcars/MainWindow.js)**: Configura a janela do navegador (`BrowserWindow`), habilita a integração com o Node (`nodeIntegration: true`), desabilita o isolamento de contexto (`contextIsolation: false`) para permitir chamadas nativas simples, maximiza a janela e carrega o arquivo de entrada `src/index.html`.

### 2.2. Processo de Renderização (Frontend Legado)
- **Declaração de Interface**: Os consoles (como [shield-console.js](file:///home/wendell/Projetos/sst-lcars/src/modules/shield-console.js) e [helm-console.js](file:///home/wendell/Projetos/sst-lcars/src/modules/helm-console.js)) são declarados como árvores de objetos literais JavaScript.
- **Renderizador LCARS-SDK**: O arquivo `src/lcars-sdk/core/lcars-sdk.js` varre essa definição de árvore e gera a estrutura DOM do jQuery correspondente, aplicando classes CSS temáticas.
- **Ponto de Entrada**: O script **[module.js](file:///home/wendell/Projetos/sst-lcars/src/module.js)** gerencia o bootstrap, invocando `LCARS.create(gameHud).dom` e inserindo o resultado no corpo do documento (`body`).
- **Efeitos Especiais**: O efeito de Warp Speed na navegação é implementado através do canvas 2D usando a biblioteca `WarpSpeed` (em `src/js/warpspeed.min.js`).

---

## 3. Arquitetura Moderna (`vue-app/` - Vue 3 + Vite + TypeScript)

A pasta `vue-app` é um aplicativo modularizado projetado para converter a estrutura rígida do LCARS SDK legada em componentes Vue 3 reativos e fortemente tipados.

### 3.1. Organização de Pastas
- **`src/types/`**: Contém tipagens estritas em TypeScript (especialmente em [lcars.ts](file:///home/wendell/Projetos/sst-lcars/vue-app/src/types/lcars.ts)) para garantir a conformidade dos dados dos componentes e das propriedades dos elementos LCARS.
- **`src/composables/`**:
  - `useLcarsColors.ts`: Fornece paletas de cores centralizadas e geradores de cores pseudo-aleatórias característicos da interface LCARS.
  - `useLcarsRegistry.ts`: Gerencia o registro ativo de componentes e o controle de estado global de visibilidade/habilitação.
- **`src/components/elements/`**: Componentes básicos que representam tags primitivas do LCARS (ex: `LcarsBar`, `LcarsCap`, `LcarsElbow`). Todos exportados através de um arquivo `index.ts`.
- **`src/components/widgets/`**: Componentes compostos complexos baseados em múltiplos elementos primitivos (ex: `SolidLevelBar`, `DefaultBracket`).
- **`src/components/modules/`**: Consoles completos do jogo estruturados em painéis reativos (ex: `SituationPanel.vue`, `HelmConsole.vue`, `TacticalConsole.vue`).

### 3.2. Storybook Integration
Localizado em `vue-app/.storybook` e `vue-app/src/stories/`, serve para testar isoladamente a conformidade estética e comportamental de cada elemento e widget LCARS migrado.

---

## 4. Fluxo de Dados e Reatividade

### No Legado:
O estado do jogo e as variáveis globais eram gerenciados no escopo do objeto global `window` ou por atualizações de texto diretas no DOM via seletores jQuery (ex: `$("#sdtIndTxt").text(...)`).

### No Vue 3:
- Estado reativo com `ref` e `computed` do Vue 3.
- Utilização de propriedades (`props`) e eventos (`emits`) para propagação de ações de controle (ex: clique no teclado direcional do Helm atualizando a rota).
- Potencial futura integração com um gerenciador de estado (Pinia) para unificar a lógica do jogo Super Star Trek.
