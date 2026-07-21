<script setup lang="ts">
import GameScreen from '@/components/modules/GameScreen.vue'
</script>

<template>
  <div class="zoom-wrapper">
    <GameScreen />
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #000;
}

#app {
  height: 100%;
  width: 100%;
}

/* Reproduz zoom de 80% do navegador via CSS -- a tipografia do LCARS SDK
   é em px fixo, não rem, então escalar font-size da raiz não bastaria. */
.zoom-wrapper {
  width: 125%;
  height: 125%;
  transform: scale(0.8);
  transform-origin: top left;
}
</style>
