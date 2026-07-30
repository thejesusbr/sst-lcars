## Why

A Fase 3 e a revisão de UX pré-Fase 4 (`SST_LCARS_SPECS.md` seções 1–13) terminaram
toda a camada visual dos 7 consoles, mas **nenhuma mecânica de jogo real existe** —
cada console guarda seu próprio `ref`/`computed` mock (energia, posição, alvos,
subsistemas), sem regra de turno, sem condição de vitória/derrota, sem persistência, e
com dados cruzados entre painéis já desincronizados hoje (posição da nave duplicada em
2 consoles, `mainEnergy` com cópias locais divergentes no Shield e no Engineering). A
seção 14 (2026-07-28) mapeou esse estado por painel e por domínio — esta proposta
implementa a engine que fecha essas lacunas.

## What Changes

- Cria o **engine core em TS puro** (sem import de Vue/Pinia, decidido na seção 8.4):
  motor de turno, IA Klingon (MVP), fórmulas de Warp Core (seção 10), docking (seção
  5.4), condições de fim de jogo (seção 5.3) e rating de comandante.
- Cria a **store Pinia** (`useGameState`) como camada fina sobre o engine core, com
  persistência via `pinia-plugin-persistedstate` (`localStorage`, seção 14.5).
- **BREAKING**: remove estado local mock (`ref`/`computed` de energia, posição, alvos,
  subsistemas, equipes de CdD) de `HelmConsole.vue`, `ShieldConsole.vue`,
  `WeaponsConsole.vue`, `EngineeringConsole.vue`, `NavSensingConsole.vue`,
  `StarChartConsole.vue`, `SituationPanel.vue` — cada um passa a ler/escrever a store
  compartilhada. Props tipo `initialShieldEnergy`/`initialMainEnergy` (usadas só pra
  seedar o mock local) são removidas; Storybook stories dessas props precisam de ajuste.
- Unifica a **posição da nave** (hoje `playerQuadrant` duplicado e desincronizado em
  `NavSensingConsole.vue`/`StarChartConsole.vue`, ausente no Helm) numa única fonte.
- Unifica o **pool de energia** (hoje `mainEnergy` com cópia própria no `ShieldConsole`,
  desincronizada do `EngineeringConsole`) e substitui `subsystemDraw` (mock de 1 número)
  pela soma real do consumo dos **9 subsistemas** — não só dos 3 consumidores originais
  (Impulse/Phaser/Shield). Photon Tubes, SRS, LRS, Life Support, Warp Core e Auto-Nav
  ganharam dreno próprio, e SRS/LRS/Photon Tubes ganharam toggle liga/desliga, fechando
  o pré-requisito da seção 10.1 (design.md decisões #25/#28/#31/#32).
- Unifica as **entidades do setor atual** (hoje `enemyTargets` do Weapons e
  `demoShortRangeGrid` do NavSensing são listas mock desconectadas).
- Implementa **docking** (seção 5.4) como evento único consumido por Engineering
  (reparo + reset de fadiga das equipes de CdD), Shield (energia) e Weapons (torpedos).
- Implementa **fim de jogo** (seção 5.3): `GameScreen.vue` passa a trocar de modo
  (`briefing`/`playing`/`result`) por condição real, não só `v-if` estático.
- Adiciona **selo de integridade do save** (checksum via `crypto.subtle`, seção 14.6) —
  explicitamente **não** é anti-cheat de verdade (limite client-side documentado), só
  detecta adulteração/corrupção do `localStorage`.
- Adiciona a mecânica secreta de punição (**infestação de Tribbles**, ideia do usuário,
  seção 14.6) disparada quando o selo não bate — não anunciada na UI.
- Faz **dano em subsistema afetar efetividade** nos 7 subsistemas de gameplay, sobre uma
  fração de dano compartilhada `d = (100-integridade)/100` e 3 bandas
  (leve/moderado/crítico): Phaser Banks, Photon Tubes, Shield Control, LRS, Auto-Nav,
  Warp Engines, e Life Support com mecânica própria (contagem de 5 turnos em crítico →
  derrota por asfixia). Isto **reverte** o Non-Goal original desta proposta, a pedido do
  usuário (design.md decisões #35/#37).
- Adiciona **camada de som de UI** (`composables/useSound.ts` + biblioteca de áudio):
  clique de botão, clique negado, Red Alert, entrada/saída de warp, phaser, torpedo,
  sonda, Hail, transporter, liga/desliga de subsistema e alarme de breach do Warp Core
  (design.md decisões #33/#34). Não estava no escopo original — entrou durante a
  implementação.

## Capabilities

### New Capabilities

- `game-state-store`: store Pinia (`useGameState`) + persistência `localStorage` — a
  camada fina que todo o resto consome; contém o shape completo do `GameState`
  (posição, energia, subsistemas, equipes de CdD, Warp Core, alerta, combat log).
- `turn-engine`: motor de turno em TS puro — resolve ação do jogador → Warp Core →
  turno inimigo → condições terminais (seção 8.2), sem import de Vue/Pinia.
- `navigation`: posição real da nave (quadrant/sector), movimento (`NAV`/`WRP`),
  Set Destination, Auto-Navigate — unifica Helm/NavSensing/StarChart numa fonte só.
  Também dona da métrica de distância compartilhada (Chebyshev) e do lançamento de
  sonda (`PRB`, duração em turnos = distância + 1, risco de destruição em setor
  hostil) — achado na revisão de plano, 2026-07-29: nenhuma das 10 capabilities
  originais cobria sonda, mock atual usa `setTimeout` de relógio real.
- `energy-management`: pool de energia real (`mainEnergy`/WC output), consumo agregado
  de Impulse/Phaser/transferência de escudo, sobrecarga automática por excesso.
- `combat`: disparo de Phaser/Torpedo com dano real, `enemyTargets` como fonte única
  compartilhada com o SRS do NavSensing, resposta da IA Klingon.
- `shields`: `shieldEnergy` real + `shieldIntegrity` derivada (energia + histórico de
  dano, não substituída — decisão da seção 12.5), dano de combate real no escudo.
- `damage-control`: equipes de CdD (fadiga, recuperação, empilhamento, dispatch) +
  integridade real de subsistemas (dano/reparo), incluindo Warp Core como 9º subsistema
  e Core Breach (seção 10.4).
- `docking`: sequência de atracagem (seção 5.4) — evento único, efeito por tipo de base
  em Engineering/Shield/Weapons/CdD.
- `end-game`: condições de vitória/derrota (seção 5.3), rating de comandante,
  `GameScreen`/`ResultScreen` reais.
- `save-integrity`: checksum do save (`crypto.subtle`, seção 14.6) + mecânica secreta de
  punição (infestação de Tribbles) quando adulteração é detectada.

### Modified Capabilities

*(nenhuma — `openspec/specs/` está vazio, não há capability existente para modificar)*

## Impact

- **Novo:** `vue-app/src/stores/useGameState.ts` (Pinia), `vue-app/src/engine/**`
  (TS puro: `constants.ts` — folha compartilhada, ver decisão #36 —, `navigation.ts`,
  `turnEngine.ts`, `warpCore.ts`, `combat.ts`, `damageControl.ts`, `docking.ts`,
  `endGame.ts`, `saveIntegrity.ts`, `tribbleInfestation.ts`, + um `*.test.ts` por
  módulo), tipos em `vue-app/src/types/game.ts`, som em
  `vue-app/src/composables/useSound.ts` + assets em `vue-app/src/assets/audio/**`.
- **Dependências novas:** `pinia`, `pinia-plugin-persistedstate` (nenhuma outra — hash
  usa `crypto.subtle`, nativo do browser).
- **Config:** `vite.config.ts` ganha um projeto de teste `unit` (node, `src/engine/**`) —
  antes só existia o projeto Storybook, que exige um Chromium não disponível aqui;
  `tsconfig.json` sobe `lib` de ES2020 pra ES2022 (o `target` NÃO muda, então o emit
  fica igual) porque o engine usa `Array.prototype.at`.
- **Modificado:** todos os 7 consoles de gameplay (`HelmConsole.vue`,
  `ShieldConsole.vue`, `WeaponsConsole.vue`, `EngineeringConsole.vue`,
  `NavSensingConsole.vue`, `StarChartConsole.vue`, `SituationPanel.vue`) — trocam
  estado local por binding à store. `GameScreen.vue` ganha lógica real de transição de
  modo. Storybook stories dos consoles acima precisam de ajuste (props removidas).
- **Modificado no SDK de elementos LCARS** (corrigido 2026-07-29 — a versão original desta
  proposta declarava `components/elements` como "não afetado", o que deixou de ser verdade
  durante a implementação): `LcarsButton.vue`/`LcarsComplexButton.vue` (som de confirmação
  no clique + som de negação em botão desabilitado, exigindo `pointer-events:auto` local
  no estado `disabled` pra o clique chegar ao handler); `LcarsText.vue`/`LcarsTitle.vue`
  (cor padrão `text-light` quando `color` não é declarada); `EnterpriseShieldSvg.vue`
  (zona órfã `damage` remapeada pro Auto-Navigation Computer, decisão #18).
- **Não afetado:** `components/widgets`, sistema de temas de cor (seção 13).
- **Atenção ao commitar:** a working tree mistura esta mudança com trabalho ambiente NÃO
  relacionado a ela (swatches de Red Alert no `CptLoungeConsole.vue`, +138 linhas;
  `themes/nemesis.css`; `module.css`; `.storybook/preview.ts`) e com o diretório de build
  `vue-app/dist/` untracked. Nada commitado ainda — vale separar por commit antes de
  arquivar, senão a mudança arrasta edição de tema que não é dela.
- **Efeitos cruzados dos subsistemas (seção 14.3)**: totalmente resolvidos pelas decisões #35 (Phaser Banks, Photon Tubes, Shield Control) e #37 (LRS, Auto-Nav, Warp Engines, Life Support) no design, integrando o dano de cada um aos seus respectivos consoles e ao cálculo de draw.
