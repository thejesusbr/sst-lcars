<script setup lang="ts">
import LcarsComplexButton from "./LcarsComplexButton.vue";
import LcarsBlock from "./LcarsBlock.vue";
import LcarsText from "./LcarsText.vue";

// Reproduz o switch on/off do app legado (src/modules/weapons-console.js,
// coluna Auto-load): dois blocos "check" lado a lado, um deles sempre
// transparente -- alternar qual deles some cria a ilusao de indicador
// movel. Nao existe animacao de posicao real, so troca de transparencia
// (ver src/css/module.css:51-58 e a funcao toggle() original).
const props = withDefaults(
  defineProps<{
    id?: string;
    modelValue: boolean;
    color?: string;
    onLabel?: string;
    offLabel?: string;
    style?: Record<string, string>;
  }>(),
  {
    id: undefined,
    color: undefined,
    onLabel: "on",
    offLabel: "off",
    style: () => ({}),
  }
);

const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

const toggle = () => emit("update:modelValue", !props.modelValue);
</script>

<template>
  <LcarsComplexButton
    :id="id"
    class="lcars-toggle-switch"
    :color="color"
    :style="{ cursor: 'pointer', ...style }"
    @click="toggle"
  >
    <LcarsBlock
      version="check"
      :class="{ transparent: modelValue }"
      :style="!modelValue ? { filter: 'brightness(0.5)' } : {}"
    />
    <LcarsBlock version="check" :class="{ transparent: !modelValue }" />
    <!--
      LcarsText (nao LcarsBlock): o label precisa de fundo transparente, e
      todo `:before` (usado por LcarsBlock pra exibir o label) tem
      `color:#000` forcado por um reset global -- ficaria invisivel sobre
      fundo transparente. `.complex-button .text` tambem forca a fonte
      "LCARS Block" (a mesma dos displays numericos tipo "3000"/"100%"),
      por isso os overrides abaixo pra usar a fonte "LCARS" (Antonio Bold)
      igual todo outro label de palavra no app.
    -->
    <LcarsText
      color="text-white"
      :text="modelValue ? onLabel : offLabel"
      :style="{
        fontFamily: 'LCARS',
        letterSpacing: 'normal',
        textTransform: 'uppercase',
        filter: !modelValue ? 'brightness(0.5)' : '',
      }"
    />
  </LcarsComplexButton>
</template>

<style scoped>
/* O LCARS organiza um grid uniforme: todo controle ocupa a mesma pegada base
   que um `.button` (150x60px no lcars-sdk). O root ja herda isso de
   `.complex-button`, mas o CONTEUDO estourava a caixa e empurrava a linha
   inteira -- `.complex-button .text` forca `min-width: 7.5rem`, que sozinho ja
   e a largura de um button, e somados os dois check blocks o toggle chegava a
   ~220px contra 150px de um botao vizinho. */
.lcars-toggle-switch {
  min-width: 150px;
  min-height: 60px;
}

/* module.css fixa .complex-button .block.check em 1rem com !important --
   precisa de um seletor mais especifico (escopo do Vue) pra vencer e
   aumentar em 50%. */
.lcars-toggle-switch :deep(.block.check) {
  min-width: 1.5rem !important;
  flex: none;
}

/* Solta o piso de largura herdado dos displays numericos ("3000"/"100%"), que
   e pra onde aquele 7.5rem foi calibrado. Aqui o texto e uma palavra curta:
   ocupa a sobra da caixa em vez de definir o tamanho dela. */
.lcars-toggle-switch :deep(.text) {
  min-width: 0;
  flex: 1;
  font-size: 2.2rem;
  text-align: center;
}
</style>
