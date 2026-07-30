<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useGameState } from "@/stores/useGameState";
import { playerShipOptions } from "@/composables/useScannerIcons";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";

// ── Identidade da nave/capitão (hail-and-identity) ──────────────────────────
//
// Escolha persiste com o resto do save (GameState), não é config local da
// tela — identidade que só existisse aqui não seria identidade (spec
// ship-identity, "The chosen identity is what the game displays").
const gameState = useGameState();

const selectShip = (key: string, label: string) => {
  gameState.setShipIcon(key, label);
};

// Stub minimo -- so o seletor de tema + catalogo de cores funcionando. O
// painel geral de configuracoes (audio, dificuldade, etc) e trabalho
// futuro, ver SST_LCARS_SPECS.md secao 7.4.
const { themes, activeTheme, setTheme } = useTheme();

// Catalogo de cores do tema ativo, por categoria -- mesmas 2 categorias
// reais da arquitetura de tema (documentation/design/COLOR_REFERENCE.md,
// SST_LCARS_SPECS.md secao 13.1): frames+botoes (os 5 papeis --role-* de
// theme.css) e status (semantica nominal/damaged/critical). Cada item
// mostra o par normal/red-alert -- a versao alerta e a var que o
// `.red-alert` do tema realmente sobrescreve (ver colors.css/themes/*.css),
// nao uma transformacao da cor normal.
interface Swatch {
  label: string;
  varName: string;
  hex: string;
  alertVarName: string | null; // null = sem variante (ja e vermelho, ex.: critical)
  alertHex: string;
}

const categories = ref<{ title: string; items: Swatch[] }[]>([
  {
    title: "Frames & Buttons",
    items: [
      {
        label: "Primary",
        varName: "--role-primary",
        hex: "",
        alertVarName: "--role-primary-alert",
        alertHex: "",
      },
      {
        label: "Secondary",
        varName: "--role-secondary",
        hex: "",
        alertVarName: "--role-secondary-alert",
        alertHex: "",
      },
      {
        label: "Tertiary",
        varName: "--role-tertiary",
        hex: "",
        alertVarName: "--role-tertiary-alert",
        alertHex: "",
      },
      {
        label: "Highlight",
        varName: "--role-highlight",
        hex: "",
        alertVarName: "--role-highlight-alert",
        alertHex: "",
      },
      {
        label: "Highlight Dark",
        varName: "--role-highlight-dark",
        hex: "",
        alertVarName: "--role-tertiary-alert",
        alertHex: "",
      },
    ],
  },
  {
    title: "Status",
    items: [
      {
        label: "Nominal",
        varName: "--status-nominal",
        hex: "",
        alertVarName: "--status-nominal-alert",
        alertHex: "",
      },
      {
        label: "Damaged",
        varName: "--status-damaged",
        hex: "",
        alertVarName: "--status-damaged-alert",
        alertHex: "",
      },
      {
        label: "Critical",
        varName: "--status-critical",
        hex: "",
        alertVarName: "--status-critical",
        alertHex: "",
      },
      {
        label: "Disabled",
        varName: "--status-disabled",
        hex: "",
        alertVarName: null,
        alertHex: "",
      },
    ],
  },
]);

// Sonda invisivel usada so pra ler o valor das vars sob `.red-alert` sem
// ligar o alerta de verdade na tela inteira (que e um toggle global em
// SituationPanel.vue). Mesmo [data-theme]+.red-alert que colors.css/
// themes/*.css usam, so que isolado num elemento fora da tela.
let probe: HTMLDivElement | null = null;
const getProbe = (): HTMLDivElement => {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.display = "none";
    probe.classList.add("red-alert");
    document.body.appendChild(probe);
  }
  return probe;
};

const refreshSwatches = () => {
  const normalStyles = getComputedStyle(document.body);
  const probeEl = getProbe();
  probeEl.dataset.theme = activeTheme.value;
  const alertStyles = getComputedStyle(probeEl);
  for (const category of categories.value) {
    for (const item of category.items) {
      item.hex = normalStyles.getPropertyValue(item.varName).trim();
      item.alertHex = item.alertVarName
        ? alertStyles.getPropertyValue(item.alertVarName).trim()
        : item.hex;
    }
  }
};

const showCatalog = ref(false);

const openCatalog = () => {
  refreshSwatches();
  showCatalog.value = true;
};

// Tema muda a cor via CSS puro (document.body.dataset.theme, ver
// useTheme.ts) -- so precisamos reler os valores computados quando isso
// acontece, o proprio catalogo nao dispara repaint nenhum.
watch(activeTheme, () => {
  nextTick(refreshSwatches);
});
</script>

<template>
  <LcarsRow id="cpt-lng-dsp" flexc="h" :style="{ 'justify-content': 'center', gap: '2rem' }">
    <!-- Identidade: ícone, nome da nave, nome do capitão -->
    <LcarsColumn
      id="cpt-lng-identity"
      flex="v"
      :style="{
        'justify-content': 'center',
        'align-items': 'center',
        gap: '1rem',
        width: '20rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Ship Identity"
        color="text-light"
      />
      <div class="ship-icon-grid">
        <button
          v-for="ship in playerShipOptions"
          :key="ship.key"
          type="button"
          class="ship-icon-option"
          :class="{ selected: ship.key === gameState.shipIconKey }"
          :title="ship.label"
          @click="selectShip(ship.key, ship.label)"
        >
          <img :src="ship.img" :alt="ship.label" />
        </button>
      </div>
      <LcarsText
        text="Ship name"
        color="text-light"
        :style="{ opacity: '0.6', fontSize: '.9rem' }"
      />
      <input
        id="ship-name-input"
        class="identity-input"
        type="text"
        :value="gameState.shipName"
        @input="gameState.setShipName(($event.target as HTMLInputElement).value)"
      />
      <LcarsText
        text="Captain name"
        color="text-light"
        :style="{ opacity: '0.6', fontSize: '.9rem' }"
      />
      <input
        id="captain-name-input"
        class="identity-input"
        type="text"
        :value="gameState.captainName"
        @input="gameState.setCaptainName(($event.target as HTMLInputElement).value)"
      />
    </LcarsColumn>

    <!-- Painel principal: seletor de tema -->
    <LcarsColumn
      id="cpt-lng-pnl"
      flex="v"
      :style="{
        'justify-content': 'center',
        'align-items': 'center',
        gap: '1.5rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Captain's Lounge"
        color="text-light"
      />
      <LcarsText
        text="Color theme"
        color="text-light"
        :style="{ opacity: '0.75' }"
      />
      <!-- Botões de tema, um por entrada de THEMES (useTheme.ts) -->
      <LcarsRow :style="{ gap: '.75rem' }">
        <LcarsButton
          v-for="t in themes"
          :key="t.id"
          :label="t.label"
          :color="
            t.id === activeTheme ? 'primary-interactive' : 'tertiary-static'
          "
          :style="{ width: '12rem' }"
          @click="setTheme(t.id)"
        />
      </LcarsRow>
      <LcarsText
        :text="themes.find((t) => t.id === activeTheme)?.description ?? ''"
        color="text-light"
        :style="{ opacity: '0.6', fontSize: '1.1rem' }"
      />
      <LcarsButton
        id="clr-ctlg-btn"
        label="Color Catalog"
        color="highlight-interactive"
        :style="{ width: '14rem' }"
        @click="openCatalog"
      />
    </LcarsColumn>

    <!-- Modal do catálogo de cores: papéis de tema x variante de red-alert -->
    <div
      v-if="showCatalog"
      class="catalog-backdrop"
      @click.self="showCatalog = false"
    >
      <LcarsColumn flex="v" class="catalog-panel" :style="{ gap: '1rem' }">
        <LcarsRow :style="{ 'align-items': 'center' }">
          <LcarsCap version="round-left" color="highlight-interactive" />
          <LcarsBlock
            :label="`Color Catalog — ${
              themes.find((t) => t.id === activeTheme)?.label
            }`"
            color="highlight-interactive"
            :style="{ flex: '1', 'text-align': 'left' }"
          />
          <LcarsButton
            label="Close"
            color="tertiary-interactive"
            :style="{ width: '7rem' }"
            @click="showCatalog = false"
          />
        </LcarsRow>

        <!-- Uma coluna por categoria (Frames & Buttons, Status) -->
        <LcarsColumn
          v-for="category in categories"
          :key="category.title"
          flex="v"
          :style="{ gap: '.5rem' }"
        >
          <LcarsText
            :text="category.title"
            color="text-light"
            :style="{ opacity: '0.75' }"
          />
          <!-- Linha por swatch: cor normal + par red-alert -->
          <LcarsRow
            v-for="item in category.items"
            :key="item.varName"
            :style="{ 'align-items': 'center', gap: '.75rem' }"
          >
            <div
              class="swatch"
              :style="{ backgroundColor: `var(${item.varName})` }"
            />
            <LcarsText
              :text="item.label"
              color="text-light"
              :style="{ width: '7rem' }"
            />
            <LcarsText
              :text="item.hex"
              color="text-light"
              :style="{ opacity: '0.6', width: '4.5rem' }"
            />
            <LcarsText
              text="Alert:"
              color="text-light"
              :style="{ opacity: '0.5', fontSize: '.9rem' }"
            />
            <div class="swatch" :style="{ backgroundColor: item.alertHex }" />
            <LcarsText
              :text="item.alertHex"
              color="text-light"
              :style="{ opacity: '0.6' }"
            />
          </LcarsRow>
        </LcarsColumn>
      </LcarsColumn>
    </div>
  </LcarsRow>
</template>

<style scoped>
.catalog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.catalog-panel {
  background: #000;
  border: 2px solid #999;
  border-radius: 1rem;
  padding: 1.5rem;
  width: 36rem;
  max-height: 80vh;
  overflow-y: auto;
}
.swatch {
  width: 2rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid #999;
  flex: none;
}

.ship-icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}
.ship-icon-option {
  background: #000;
  border: 2px solid #666;
  border-radius: 0.4rem;
  padding: 0.25rem;
  cursor: pointer;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ship-icon-option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ship-icon-option.selected {
  border-color: var(--role-highlight-interactive, #ff9c00);
}
.identity-input {
  width: 100%;
  background: #000;
  color: #fff;
  border: 2px solid #666;
  border-radius: 0.4rem;
  padding: 0.4rem 0.6rem;
  font-family: "LCARS", sans-serif;
}
.identity-input:focus {
  outline: none;
  border-color: var(--role-highlight-interactive, #ff9c00);
}
</style>
