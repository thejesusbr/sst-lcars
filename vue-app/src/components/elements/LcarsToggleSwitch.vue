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
/* O LCARS organiza um grid uniforme, e a base dele NESTE projeto e a de
   `module.css`:

     .block, .button { min-width: 7.5rem; min-height: 3rem; }

   `.complex-button` -- que e o root deste componente -- nao recebe esse
   override e fica com os `150px` do `lcars-sdk`, mais largos que a base. Somado
   ao conteudo (dois check blocks + um texto com piso de 7.5rem proprio), o
   toggle chegava a estourar a caixa e desalinhar da etiqueta acima dele. */
.lcars-toggle-switch {
  min-width: 7.5rem;
  min-height: 3rem;
}

/* O texto ocupa a SOBRA da caixa em vez de definir o tamanho dela.
   `width: 0` e o que faz isso ser deterministico: com largura definida em zero,
   a contribuicao dele pra largura intrinseca do toggle e zero, entao o
   `min-width: 7.5rem` acima passa a valer como largura final, e nao como piso
   que o texto empurra. Sem isso a caixa media a palavra renderizada -- "OFF" a
   2.8rem sobrava ~0.5rem, e qualquer troca de fonte ou tema desalinharia de
   novo.

   O `margin-left: 0.5rem` herdado tambem sai: ele existe pros displays
   numericos, onde o texto vem depois de um rotulo.

   A fonte fica no padrao de um LcarsText indicativo -- sem `font-size` proprio,
   herda os 2.8rem do SDK. */
.lcars-toggle-switch :deep(.text) {
  width: 0;
  min-width: 0;
  flex: 1 1 0;
  margin-left: 0;
  text-align: center;
}
</style>
