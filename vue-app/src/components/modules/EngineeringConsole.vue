<script setup lang="ts">
import { computed, ref } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import SolidLevelBar from "@/components/widgets/SolidLevelBar.vue";
import { Sound, useSound } from "@/composables/useSound";
import { useGameState } from "@/stores/useGameState";
import { usePresentation } from "@/stores/usePresentation";
import { OVERLOAD_MAX, isCritical } from "@/engine/constants";
import { autoOverload as autoOverloadOf, effectiveOverload } from "@/engine/warpCore";
import { warpStress } from "@/engine/navigation";
import {
  SectorEntityType,
  SUBSYSTEM_KEYS,
  SUBSYSTEM_LABELS,
  type DamageControlTeam,
  type SubsystemKey,
} from "@/types/game";

const { statusColor } = useLcarsColors();
const { playSound } = useSound();
const gameState = useGameState();
const presentation = usePresentation();

// ── Matriz de energia ────────────────────────────────────────────────────────

// O WC entrega output nominal fixo e os subsistemas consomem dele. `subsystemLoad`
// e a MESMA funcao que alimenta `autoOverload` no turno -- painel e mecanica nao
// podem divergir, e antes divergiam: aqui era um `ref(3000)` cravado.
const subsystemDraw = computed(() => Math.round(gameState.subsystemLoad));

// Output EFETIVO do core, nao o nominal: core danificado gera menos e o mesmo
// consumo passa a estourar o orcamento.
const energyProduced = computed(() => Math.round(gameState.energyProduced));

const autoOverload = computed(() =>
  autoOverloadOf(gameState.subsystemLoad, gameState.energyProduced)
);

const manualOverload = computed({
  get: () => gameState.manualOverload,
  set: (value) => gameState.setManualOverload(value),
});

// Label mostra o valor real de overload (0/5/10/15/20%), nao a fracao do dial.
const OVERLOAD_PRESETS = [0, 5, 10, 15, 20].map((value) => ({
  label: value === 0 ? "OFF" : `${value}%`,
  value,
}));

// Estresse de viagem entra no overload efetivo: warp acima de 4 empurra o core
// junto com o manual e o automatico (decisao #29).
const overload = computed(() =>
  effectiveOverload(
    gameState.manualOverload,
    autoOverload.value,
    gameState.warpTrip ? warpStress(gameState.warpTrip.warpFactor) : 0
  )
);

const overloadColor = computed(() => {
  if (overload.value < 8) return statusColor("nominal");
  if (overload.value <= 15) return statusColor("damaged");
  return statusColor("critical");
});

// ── Subsistemas: os 9, incluindo Auto-Navigation Computer ────────────────────

// Ordem e rotulos vem de `types/game.ts` (fonte unica): a lista antiga tinha 8
// entradas escritas a mao e nao incluia o Auto-Navigation Computer.
const subsystems = computed(() =>
  SUBSYSTEM_KEYS.map((key) => ({
    key,
    name: SUBSYSTEM_LABELS[key],
    integrity: Math.round(gameState.subsystems[key]),
  }))
);

const getSystemStatus = (integrity: number) => {
  if (integrity >= 100) {
    return { text: "OPERATIONAL", color: statusColor("nominal"), isBlinking: false };
  }
  // Critico (< 40) e paralisado, nao "danificado": a diferenca importa porque o
  // subsistema para de funcionar de fato (decisoes #35/#37).
  if (isCritical(integrity)) {
    return { text: "OFFLINE", color: statusColor("critical"), isBlinking: true };
  }
  return { text: "DAMAGED", color: statusColor("damaged"), isBlinking: false };
};

// ── Toggles de subsistema nao-essencial ─────────────────────────────────────

const TOGGLEABLE: SubsystemKey[] = ["srs", "lrs", "photons", "autoNav"];

const isToggleable = (key: SubsystemKey) => TOGGLEABLE.includes(key);

const isOn = (key: SubsystemKey) =>
  !isToggleable(key) ||
  gameState.subsystemsOn[key as "srs" | "lrs" | "photons" | "autoNav"];

const toggleSubsystem = (key: SubsystemKey) => {
  if (!isToggleable(key)) return;
  playSound(isOn(key) ? Sound.POWER_DOWN : Sound.POWER_UP);
  gameState.toggleSubsystemOn(key as "srs" | "lrs" | "photons" | "autoNav");
};

// ── Equipes de Controle de Danos ────────────────────────────────────────────

const teams = computed(() => gameState.teams);

const teamEfficiencyColor = (efficiency: number) => {
  if (efficiency > 60) return statusColor("nominal");
  if (efficiency > 20) return statusColor("damaged");
  return statusColor("critical");
};

const teamLabel = (team: DamageControlTeam) =>
  team.assignedSystem ? SUBSYSTEM_LABELS[team.assignedSystem] : "—";

/**
 * Rotulo de status da equipe.
 *
 * `DISPATCHING` no turno do despacho: o reparo so comeca a contar no turno
 * seguinte (a equipe esta indo ate o subsistema), e o painel dizia `WORKING`
 * imediatamente -- o jogador via equipe "trabalhando" sem render nada e nao
 * tinha como saber se a mecanica estava quebrada ou so atrasada.
 *
 * Derivado de `turnsWorked === 0`, nao de um `TeamStatus` novo: a informacao ja
 * esta no estado, e um status a mais obrigaria todo leitor a aprender mais um
 * caso.
 */
const teamStatusLabel = (team: DamageControlTeam) =>
  team.status === "working" && team.turnsWorked === 0
    ? "DISPATCHING"
    : team.status.toUpperCase();

/** Equipe travada na cela nao e despachavel -- a linha inteira fica inerte. */
const teamLocked = (team: DamageControlTeam) => team.status === "guard";

/**
 * Numa Drydock o reparo e automatico (drones) -- designar equipe nao acelera
 * nada, a tripulacao inteira esta de folga (docking-overhaul). O painel avisa
 * isso em vez de deixar o jogador achar que a mecanica esta quebrada.
 */
const drydockRepairing = computed(() => {
  if (!gameState.docked) return false;
  const base = gameState.starbases.find((b) => b.id === gameState.dockedBaseId);
  return base?.type === SectorEntityType.STARBASE_DOCK;
});

/**
 * Cicla o subsistema atribuido. Despacho e LIVRE (nao consome turno), mas o
 * reparo so comeca a contar no turno SEGUINTE -- e o engine que garante isso
 * via `turnsWorked`, nao esta tela.
 */
const cycleAssignment = (team: DamageControlTeam) => {
  if (team.status === "cooldown" || team.status === "guard" || team.status === "away") {
    return;
  }
  const current = team.assignedSystem;
  const idx = current ? SUBSYSTEM_KEYS.indexOf(current) : -1;
  const next = idx + 1;
  if (next >= SUBSYSTEM_KEYS.length) {
    gameState.recallTeam(team.id);
  } else {
    gameState.dispatchTeam(team.id, SUBSYSTEM_KEYS[next]);
  }
};

const recallTeam = (team: DamageControlTeam) => {
  if (team.status !== "working") return;
  gameState.recallTeam(team.id);
};

// ── Loop de docking ─────────────────────────────────────────────────────────

const busy = ref(false);

/** Turno de reparo em base atracada: tier 5, dano redirecionado pra base. */
const repairTurn = async () => {
  if (busy.value || !gameState.docked) return;
  busy.value = true;
  try {
    await gameState.executeDockingRepairTurn();
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <LcarsRow
    id="engCnsDsp"
    :style="{
      'padding-top': '1.25rem',
      'justify-content': 'space-evenly',
      width: '100%',
    }"
  >
    <!-- Column 1: Energy Matrix -->
    <LcarsColumn
      flex="v"
      :style="{
        'justify-content': 'flex-start',
        'align-items': 'center',
      }"
    >
      <LcarsTitle version="centered" size="small" text="Energy Matrix" />

      <!-- Main Energy = o que o core CONSEGUE gerar agora (cai com o dano no
           core). Nao e estoque: energia e vazao, e consumir acima disso gera
           sobrecarga em vez de esvaziar tanque. -->
      <LcarsComplexButton
        color="primary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Core Output" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="String(energyProduced)"
          color="text-light"
          :style="{ flex: '1', textAlign: 'center' }"
        />
        <LcarsBlock label="Subsystem Load" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="String(subsystemDraw)"
          :color="
            subsystemDraw > energyProduced
              ? statusColor('critical')
              : 'text-light'
          "
          :style="{ flex: '1', textAlign: 'center' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
      <LcarsTitle
        version="centered"
        size="small"
        text="Warp Core Overload"
        :style="{ 'margin-top': '1rem' }"
      />
      <!-- Overload indicator: total real (manual + automatico por excesso
           de Subsystem Load) -->
      <LcarsComplexButton
        color="secondary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Overload" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="`${overload}%`"
          :color="overloadColor"
          :style="{ flex: '1', textAlign: 'center', fontWeight: 'bold' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Set Overload: dial manual, mesma linguagem visual do Set
           Power/Set Impulse -->
      <LcarsComplexButton
        color="tertiary-interactive"
        size="large"
        :style="{ width: '100%', 'margin-top': '0.5rem' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Set Overload" :style="{ width: '8.5rem' }" />
        <LcarsButton
          version="round-left"
          color="highlight-interactive"
          label="-"
          :style="{ width: '3rem', flex: 'none' }"
          @click="manualOverload = Math.max(0, manualOverload - 1)"
        />
        <SolidLevelBar
          version="horizontal"
          :max="OVERLOAD_MAX"
          :min="0"
          :color="overloadColor"
          :level="manualOverload"
        />
        <LcarsButton
          version="round-right"
          color="highlight-dark-interactive"
          label="+"
          :style="{ width: '3rem', flex: 'none' }"
          @click="manualOverload = Math.min(OVERLOAD_MAX, manualOverload + 1)"
        />
      </LcarsComplexButton>

      <LcarsComplexButton
        :style="{
          width: '100%',
          'margin-top': '0.5rem',
          justifyContent: 'center',
        }"
      >
        <LcarsCap version="round-left" color="primary-interactive" />
        <LcarsButton
          v-for="preset in OVERLOAD_PRESETS"
          :key="preset.value"
          :label="preset.label"
          color="secondary-interactive"
          :style="{ flex: '1' }"
          @click="manualOverload = preset.value"
        />
        <LcarsCap version="round-right" color="tertiary-interactive" />
      </LcarsComplexButton>
    </LcarsColumn>

    <!-- Column 2: Damage Control Teams -->
    <LcarsColumn flex="v" :style="{ flex: '1', 'max-width': '32rem' }">
      <LcarsRow
        :style="{ 'justify-content': 'center', 'margin-bottom': '1rem' }"
      >
        <LcarsTitle
          version="centered"
          size="small"
          text="Damage Control Teams"
        />
      </LcarsRow>

      <LcarsRow v-if="drydockRepairing" :style="{ 'justify-content': 'center', 'margin-bottom': '0.5rem' }">
        <LcarsText
          text="Drydock: automated drones repairing — team assignment has no effect"
          color="text-light"
          :style="{ 'text-align': 'center', 'font-style': 'italic' }"
        />
      </LcarsRow>

      <div class="systems-grid">
        <div v-for="team in teams" :key="team.id" class="system-row">
          <LcarsComplexButton
            color="tertiary-interactive"
            size="medium"
            :style="{ width: '100%' }"
          >
            <LcarsCap version="round-left" />
            <LcarsBlock
              :label="`Team ${team.id}`"
              :style="{ width: '6rem', 'text-align': 'left' }"
            />
            <LcarsText
              :text="team.efficiency + '%'"
              color="text-light"
              :style="{
                minWidth: '7.5rem',
                'text-align': 'center',
                'font-weight': 'bold',
              }"
            />
            <!-- Unico elemento com cor semantica (eficiencia) -- o resto
                 da linha usa cor normal de tema, pra nao ficar invasivo. -->
            <LcarsButton
              :color="teamEfficiencyColor(team.efficiency)"
              :label="teamStatusLabel(team)"
              :disabled="teamLocked(team)"
              :style="{ width: '7rem' }"
              @click="recallTeam(team)"
            />
            <LcarsBlock
              version="decorator"
              :class="{
                'dark-light': team.status === 'working',
                blink: team.status === 'cooldown',
              }"
            />
            <LcarsButton
              version="round-right"
              color="highlight-interactive"
              :label="team.assignedSystem ? teamLabel(team) : 'Dispatch'"
              :disabled="teamLocked(team)"
              :style="{ width: '11rem' }"
              @click="cycleAssignment(team)"
            />
          </LcarsComplexButton>
        </div>
      </div>
    </LcarsColumn>

    <!-- Column 3: Subsystem Integrity -->
    <LcarsColumn flex="v" :style="{ flex: '1', 'max-width': '32rem' }">
      <LcarsRow
        :style="{ 'justify-content': 'center', 'margin-bottom': '1rem' }"
      >
        <LcarsTitle
          version="centered"
          size="small"
          text="Subsystem Integrity"
        />
      </LcarsRow>

      <!-- Systems list/grid -->
      <div class="systems-grid">
        <div v-for="sys in subsystems" :key="sys.key" class="system-row">
          <LcarsComplexButton
            color="tertiary-interactive"
            size="medium"
            :style="{ width: '100%' }"
          >
            <LcarsCap version="round-left" />
            <!-- System Label -->
            <LcarsBlock
              :label="isToggleable(sys.key) && !isOn(sys.key)
                ? `${sys.name} (OFF)`
                : sys.name"
              :style="{
                width: '13rem',
                'text-align': 'left',
                cursor: isToggleable(sys.key) ? 'pointer' : 'default',
              }"
              @click="toggleSubsystem(sys.key)"
            />
            <!-- Textual Status: unico elemento com cor semantica, resto da
                 linha usa cor normal de tema -->
            <LcarsBlock
              :color="getSystemStatus(sys.integrity).color"
              :class="{ blink: getSystemStatus(sys.integrity).isBlinking }"
              :label="getSystemStatus(sys.integrity).text"
              :style="{ width: '9rem' }"
            />
            <!-- Integrity level (percentage) -->
            <LcarsText
              :text="sys.integrity + '%'"
              color="text-light"
              :style="{
                minWidth: '7.5rem',
                'text-align': 'right',
                'font-weight': 'bold',
              }"
            />
            <LcarsCap version="round-right" />
          </LcarsComplexButton>
        </div>
      </div>

      <!-- Loop de docking: unico jeito de reparar em tier 5 -->
      <LcarsRow
        :style="{
          'margin-top': '1.5rem',
          gap: '0.75rem',
          'justify-content': 'center',
        }"
      >
        <LcarsButton
          id="dock-repair-btn"
          label="REPAIR TURN (DOCKED)"
          color="primary-interactive"
          :disabled="!gameState.docked || busy || presentation.busy"
          :style="{ width: '20rem' }"
          @click="repairTurn"
        />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>

<style scoped>
.systems-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.system-row {
  width: 100%;
}
</style>
