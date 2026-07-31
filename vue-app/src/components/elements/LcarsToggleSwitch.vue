<script setup lang="ts">
import LcarsRow from "./LcarsRow.vue";
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
  <LcarsRow
    :id="id"
    class="lcars-toggle-switch"
    :style="{ cursor: 'pointer', ...style }"
    @click="toggle"
  >
    <LcarsBlock
      version="check"
      :color="color"
      :class="{ transparent: modelValue }"
      :style="!modelValue ? { filter: 'brightness(0.5)' } : {}"
    />
    <LcarsBlock version="check" :color="color" :class="{ transparent: !modelValue }" />
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
  </LcarsRow>
</template>

<style scoped>
/* Container e `LcarsRow`, nao `LcarsComplexButton`: o complex-button carrega
   `min-width: 150px` do `lcars-sdk` e nao recebe o override de `module.css`
   (`.block, .button { min-width: 7.5rem }`), entao ficava sempre mais largo que
   a etiqueta ao lado. A `.row` herda a base certa. */
.lcars-toggle-switch {
  min-width: 7.5rem;
  min-height: 3rem;
  align-items: stretch;
}

/* Quem pinta sao os DOIS check blocks, nunca o container.
   Com a cor no ROW, o check herdava esse mesmo fundo e o indicador ficava
   invisivel contra ele: no estado ON o toggle inteiro virava um retangulo de
   cor solida, e o unico contraste vinha do check TRANSPARENTE, ou seja, do
   buraco. Verificado no browser: `.block.check` com a classe de cor aplicada
   direto pinta certo. */
.lcars-toggle-switch :deep(.block.check) {
  min-width: 1rem;
  max-width: 1.5rem;
  flex: 1 1 auto;
}

.lcars-toggle-switch :deep(.block.check.transparent) {
  background-color: transparent;
}

/* O texto ocupa a sobra da caixa. `min-width: 0` solta o piso de 7.5rem que
   `module.css` da a `.text` -- a largura de um button INTEIRO, calibrado pros
   displays numericos ("3000"/"100%").

   `font-size` no padrao de um LcarsText indicativo, o mesmo 2.8rem que o
   `.complex-button .text` aplicava antes da troca de container. */
.lcars-toggle-switch :deep(.text) {
  min-width: 0;
  flex: 1 1 0;
  margin-left: 0.5rem;
  font-size: 2.8rem;
  line-height: 1;
  align-self: center;
  text-align: right;
  background-color: transparent;
}
</style>
