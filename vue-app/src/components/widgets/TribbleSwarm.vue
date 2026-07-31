<script setup lang="ts">
/**
 * Infestação de Tribbles: ícones flutuantes por cima de tudo.
 *
 * Nunca teve componente. `renderedTribbleCount` existia com teste verde e
 * nenhum chamador, do mesmo jeito que a verificação do selo — então mesmo um
 * save adulterado não mostrava nada, e o item 12.2 do playthrough era
 * inverificável por construção.
 *
 * Não há nada aqui que anuncie por que os Tribbles apareceram: é o contrato de
 * punição silenciosa da capability `save-integrity`. Sem toast, sem entrada de
 * log, sem tooltip.
 */

import { computed, watch } from "vue";
import { renderedTribbleCount } from "@/engine/tribbleInfestation";
import { TRIBBLE_SOUND_THRESHOLD } from "@/engine/constants";
import { useGameState } from "@/stores/useGameState";
import { Sound, useSound } from "@/composables/useSound";
import tribble1 from "@/assets/icons/objects/tribble-1.png";
import tribble2 from "@/assets/icons/objects/tribble-2.png";

const gameState = useGameState();
const { playSound } = useSound();

const count = computed(() =>
  gameState.tribbleInfestationActive
    ? renderedTribbleCount(gameState.tribblePopulation)
    : 0
);

/**
 * Posição e arte por índice, não por sorteio a cada render: sorteando, todo
 * Tribble saltaria pela tela a cada atualização de estado. O hash abaixo é
 * estável por índice, então um Tribble que já está lá fica onde está e só os
 * novos entram.
 */
const tribbles = computed(() =>
  Array.from({ length: count.value }, (_, i) => {
    const h = (i * 2654435761) >>> 0;
    return {
      key: i,
      img: h % 2 === 0 ? tribble1 : tribble2,
      style: {
        left: `${(h >>> 8) % 96}%`,
        top: `${(h >>> 16) % 92}%`,
        animationDelay: `${((h >>> 4) % 40) / 10}s`,
        animationDuration: `${3 + (((h >>> 12) % 30) / 10)}s`,
      },
    };
  })
);

// O som chega no 4º turno da infestação: a população parte de 2 e dobra
// (2, 4, 8, 16), então o jogador ganha três turnos de "por que tem Tribbles
// aqui" antes de a piada se anunciar.
watch(
  () => count.value > TRIBBLE_SOUND_THRESHOLD,
  (loud, wasLoud) => {
    if (loud && !wasLoud) playSound(Sound.TRIBBLES);
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="count > 0" class="tribble-swarm" aria-hidden="true">
    <img
      v-for="t in tribbles"
      :key="t.key"
      class="tribble"
      :src="t.img"
      :style="t.style"
    />
  </div>
</template>

<style scoped>
.tribble-swarm {
  position: fixed;
  inset: 0;
  /* Não intercepta clique: a infestação atrapalha a leitura, não o controle —
     o jogo continua jogável, degradado. */
  pointer-events: none;
  z-index: 9000;
  overflow: hidden;
}

.tribble {
  position: absolute;
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
  image-rendering: pixelated;
  animation-name: tribble-drift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes tribble-drift {
  0%,
  100% {
    transform: translate(0, 0) rotate(-4deg);
  }
  50% {
    transform: translate(0.6rem, -0.9rem) rotate(4deg);
  }
}
</style>
