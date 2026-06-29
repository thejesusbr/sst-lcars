# STORY.md - Histórico de Desenvolvimento

Este documento descreve a evolução do projeto **SST LCARS-SDK**, registrando marcos históricos e decisões arquiteturais.

---

## 1. Origem do Projeto
O projeto nasceu da ideia de modernizar visualmente o clássico jogo *Super Star Trek (SST)* da era dos computadores de texto. Para isso, foi adotado o design **LCARS** (Library Computer Access and Retrieval System) do universo Star Trek.

---

## 2. Linha do Tempo e Principais Commits

Abaixo estão listados os principais marcos de desenvolvimento registrados no histórico do Git:

### Fase 1: Fundação do Jogo em Electron e jQuery
*   **Implementação das Consolas Legadas**: O desenvolvimento inicial focou em criar a estrutura de janelas com Electron e configurar os painéis de controle do jogo ([weapons-console.js](file:///home/wendell/Projetos/sst-lcars/src/modules/weapons-console.js), [helm-console.js](file:///home/wendell/Projetos/sst-lcars/src/modules/helm-console.js), [shield-console.js](file:///home/wendell/Projetos/sst-lcars/src/modules/shield-console.js)).
*   `44c29c5 - Começando painel de Engenharia`: Início do desenvolvimento da matriz energética no painel de engenharia para distribuição de energia.
*   `e89945d - Add ESLint configuration and lint scripts`: Configuração do ESLint e Prettier para garantir conformidade estilística e linting nos arquivos JavaScript legados.

### Fase 2: Migração para Vue 3 (`sst-lcars-vue`)
Com o objetivo de melhorar a manutenibilidade, reatividade e isolamento dos componentes visuais, iniciou-se o projeto de migração para um ecossistema baseado em Vue 3 e TypeScript.
*   `9478dc6 - Add Vue 3 LCARS SDK with Composition API`: Criação do subprojeto `vue-app` portando os elementos básicos do LCARS SDK como componentes nativos do Vue 3 usando Composition API.
*   `1c23945 - Add Storybook with stories for all LCARS components`: Adição do Storybook com a documentação interativa e histórias de teste para todos os elementos portados.
*   `5132731 - Merge pull request #2 from thejesusbr/sst-lcars-vue`: Integração da branch do Vue 3 (`sst-lcars-vue`) de volta à branch principal `main`, estabelecendo a estrutura híbrida atual do repositório.

---

## 3. Próximos Passos e Metas de Desenvolvimento

- **Portar Consolas Restantes**: Finalizar a conversão das consolas em `src/modules/` para componentes dentro do subdiretório `vue-app/src/components/modules/`.
- **Implementar a Máquina de Estados do SST**: Unificar o estado de jogo (energia, inimigos, stardates, coordenadas, colisões) através de composables ou Pinia no Vue 3.
- **Empacotamento Unificado**: Adaptar o Electron Forge para servir a build gerada pelo Vite (`vue-app/dist`) em vez de apontar para a pasta legada `src/`.
