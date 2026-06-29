# TECHSTACK.md - Pilha Tecnológica do Projeto

Este documento lista todas as tecnologias, ferramentas e bibliotecas utilizadas no desenvolvimento e teste do **SST LCARS-SDK**.

---

## 1. Aplicação Principal (Electron / Legada)

Esta é a casca nativa que empacota o simulador e provê acesso a recursos do sistema operacional.

- **Electron** (`^12.0.2`): Framework para desenvolvimento desktop multiplataforma usando HTML, CSS e JS.
- **Electron Forge** (`^6.0.0-beta.54`): CLI e utilitários para criar, empacotar e distribuir a aplicação Electron (geradores de pacotes Squirrel, Debian, RPM e ZIP).
- **Nodemon**: Reinicia o processo principal do Electron dinamicamente durante o desenvolvimento (`npm run dev`).
- **Electron Icon Builder**: Gera ícones em múltiplos tamanhos a partir de uma imagem de origem.
- **jQuery** & **jQuery Mobile Events**: Utilizados para gerenciamento tátil de cliques e estruturação da árvore DOM legada do LCARS-SDK.
- **Arrive.js**: Biblioteca leve para monitoramento de mutações no DOM, essencial para o LCARS-SDK legada detectar dinamicamente novos elementos inseridos e inicializá-los.
- **WarpSpeed.js**: Canvas 2D/3D leve para simular o efeito de estrelas em velocidade de dobra (Warp) no console do leme.

---

## 2. Aplicação de Transição/Migração (`vue-app/`)

Uma reescrita moderna baseada em componentes reativos, modularizados e testáveis.

- **Vue 3** (`^3.5.13`): Framework de interface utilizando a **Composition API** e a sintaxe `<script setup lang="ts">`.
- **Vite** (`^6.0.1`): Ferramenta de build extremamente rápida para gerenciamento de assets e recarregamento a quente (HMR).
- **TypeScript** (~`5.6.3`): Tipagem estática para todo o código de interface e lógica da nave.
- **Storybook** (`^10.1.0`): Utilizado para desenvolvimento isolado dos componentes visuais LCARS.
- **Vitest** (`^4.0.14`): Framework de testes unitários integrado com Vite.
- **Playwright** (`^1.57.0`): Automação e testes no navegador de ponta a ponta (e2e).
- **vue-tsc**: CLI para checagem estática de tipos do Vue/TS (`npm run type-check`).

---

## 3. Qualidade de Código e Estilo

- **ESLint** (Configurado na raiz para JS clássico e em `vue-app` para Vue/TypeScript).
- **Prettier** (Formatador de código padrão do projeto).
- **Prettier + ESLint Configs**: Integração para evitar conflitos de formatação automática.
