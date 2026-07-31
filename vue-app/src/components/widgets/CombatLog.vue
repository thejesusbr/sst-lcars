<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { CombatLogEntry, LogCategory } from "@/types/game";

// Re-export pra não quebrar quem importava os tipos daqui; a definição agora
// mora em types/game.ts, junto do resto do GameState.
export type { CombatLogEntry, LogCategory };

const props = defineProps<{
  entries: CombatLogEntry[];
  /**
   * Índice da primeira entrada NÃO lida na lista filtrada (= marcador de
   * leitura da categoria). Ao trocar de aba, o widget rola até ela — nem topo,
   * nem fim: retoma de onde a leitura parou. UX pedida no playthrough (10.5).
   */
  firstUnreadIndex?: number;
}>();

/**
 * Emitido só quando o jogador chega ao FIM da rolagem. É o único gatilho que
 * avança o marcador de leitura — abrir a aba não basta (`fase-4-engine`
 * design.md decisão #27).
 */
const emit = defineEmits<{ (e: "reached-end"): void }>();

const logContent = ref<HTMLElement | null>(null);

// Tolerância de 4px: scroll fracionário (zoom, DPI) raramente bate exato no fim.
const AT_END_SLACK = 4;

const atEnd = (el: HTMLElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= AT_END_SLACK;

const onScroll = () => {
  const el = logContent.value;
  if (el && atEnd(el)) emit("reached-end");
};

// SEM auto-scroll pro fim em entrada nova: a posição de leitura fica onde o
// jogador deixou. Só o caso de log curto o bastante pra caber inteiro já conta
// como lido.
onMounted(() => {
  const el = logContent.value;
  if (el && el.scrollHeight <= el.clientHeight) emit("reached-end");
  scrollToFirstUnread();
});

/** Rola até a primeira não lida. Sem não lida, vai pro fim (tudo visto). */
const scrollToFirstUnread = () => {
  const el = logContent.value;
  if (!el) return;
  const idx = props.firstUnreadIndex;
  if (idx === undefined || idx >= props.entries.length) {
    el.scrollTop = el.scrollHeight;
    if (atEnd(el)) emit("reached-end");
    return;
  }
  const target = el.children[idx] as HTMLElement | undefined;
  if (target) el.scrollTop = target.offsetTop - el.offsetTop;
};

// Troca de aba = a IDENTIDADE do array muda (filtro novo). Entrada nova na
// mesma aba muda só o length — e essa não rola nada.
watch(
  () => props.entries,
  () => nextTick(scrollToFirstUnread)
);
</script>

<template>
  <div
    ref="logContent"
    class="log-content text-light"
    @scroll.passive="onScroll"
  >
    <p v-for="(entry, i) in entries" :key="i" class="log-entry">
      <span class="log-stardate text-highlight"
        >[{{ entry.stardate.toFixed(1) }}]</span
      >
      {{ entry.text }}
    </p>
    <p v-if="entries.length === 0" class="log-entry log-empty">No entries.</p>
  </div>
</template>

<style scoped>
.log-content {
  width: 0;
  min-width: 100%;
  max-height: 13.25rem;
  box-sizing: border-box;
  padding: 0.5rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: "LCARS-Mono", monospace;
}

.log-entry {
  overflow-wrap: break-word;
  word-break: break-word;
  margin: 0 0 0.35rem 0;
}

.log-stardate {
  margin-right: 0.5rem;
}

.log-empty {
  opacity: 0.5;
}
</style>
