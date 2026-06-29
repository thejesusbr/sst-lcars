# AGENTS.md - Instruções Gerais para Agentes

Bem-vindo ao projeto **SST LCARS-SDK**. Este arquivo contém diretrizes essenciais para agentes de IA e desenvolvedores que atuam no repositório.

## 1. Visão Geral do Projeto
O projeto consiste em um revival visual e interativo do clássico jogo em modo texto *Super Star Trek* (SST), utilizando a interface **LCARS** (inspirada na franquia Star Trek: The Next Generation).

O repositório está estruturado em duas partes principais:
1. **Aplicação Principal (Raiz / Electron)**: Uma aplicação baseada em Electron que encapsula uma interface desenvolvida com jQuery e um framework LCARS em JavaScript legado (`src/`).
2. **Nova Aplicação Vue 3 (`vue-app/`)**: Uma migração em andamento da interface e lógica do jogo para Vue 3 com Composition API, TypeScript, Vite e Storybook para catalogação de componentes.

---

## 2. Diretrizes de Codificação e Desenvolvimento

### 2.1. Alterações na Aplicação Legada (`src/`)
- **Estilo Declarativo**: Os consoles e painéis da interface legada são construídos a partir de definições de objetos JavaScript (ex: `situationPanel` em [situation-panel.js](file:///home/wendell/Projetos/sst-lcars/src/modules/situation-panel.js)). Siga esse padrão ao modificar ou estender componentes legados.
- **jQuery e Eventos**: Utiliza eventos de toque e manipulações DOM diretas do jQuery. Evite injetar frameworks modernos na pasta `src/`.
- **Áudio**: A reprodução de sons e alertas de LCARS utiliza o utilitário [lcars_audio.js](file:///home/wendell/Projetos/sst-lcars/src/js/lcars_audio.js).

### 2.2. Alterações na Aplicação Vue 3 (`vue-app/`)
- **Padrão Vue 3**: Utilize exclusivamente a **Composition API** com `<script setup lang="ts">`.
- **TypeScript**: Tipagem estrita é obrigatória. Definições de tipo comuns devem ser importadas ou estendidas de [lcars.ts](file:///home/wendell/Projetos/sst-lcars/vue-app/src/types/lcars.ts).
- **Componentização**:
  - Elementos primitivos do LCARS (ex: `LcarsBar`, `LcarsButton`, `LcarsElbow`) residem em `vue-app/src/components/elements`.
  - Consoles completos do jogo residem em `vue-app/src/components/modules`.
- **Storybook**: Sempre que criar ou modificar um componente visual, certifique-se de que ele possui uma história (Story) correspondente na pasta `stories` e que ela esteja funcionando.
- **Composables**: Utilize os composables existentes para gerenciar cores (`useLcarsColors`) e registro de elementos (`useLcarsRegistry`).

---

## 3. Comandos e Verificações Recomendadas

Antes de dar uma tarefa por concluída, execute as ferramentas de validação relevantes:

### Na raiz do projeto:
- Formatar código: `npm run format`
- Verificar lint: `npm run lint`

### Na pasta `vue-app/`:
- Iniciar Storybook para testes visuais: `npm run storybook`
- Verificar tipos (TypeScript): `npm run type-check`
- Executar lint do Vue 3: `npm run lint`
- Rodar os testes com Vitest (se houver): `npm run test` (ou `vitest`)

---

## 4. Preservação de Documentação e Legibilidade
- Mantenha comentários originais que explicam a lógica matemática ou física do jogo original Super Star Trek (ex: cálculos de distância, consumo de energia).
- Prefira commits pequenos e focados.
- Documente novas regras de negócio criadas ou descobertas em [BRULES.md](file:///home/wendell/Projetos/sst-lcars/.agents/BRULES.md).
