<script setup lang="ts">
import LcarsText from "./LcarsText.vue";
import LcarsRow from "./LcarsRow.vue";
import LcarsBlock from "./LcarsBlock.vue";
import { useLcarsRegistry } from "@/composables/useLcarsRegistry";
import { computed, onMounted, onUnmounted } from "vue";

interface Props {
  id?: string;
  text: string;
  /** Cor do(s) block(s) decorativos — nunca da row (ver .lcars-indicator abaixo). */
  color?: string;
  /**
   * Cor do TEXTO. Sem valor, cai pra `color` — decorator e texto ficam
   * iguais por padrão. Mas são famílias de classe diferentes: `color` é um
   * papel `-interactive`/`-static` (pinta fundo); `textColor` deve ser a
   * variante só-cor (`text-light`/`text-dark`/`text-white`, ou
   * `text-primary`/`text-secondary`/`text-tertiary`/`text-highlight`/
   * `text-highlight-dark` — theme.css, 2026-07-26, feita pra isto). Passar um
   * papel `-interactive` aqui pinta um destaque atrás do texto (span também
   * recebe `background-color`), então só use quando quiser esse efeito.
   */
  textColor?: string;
  /** min-width do conjunto: small=3.75rem, large=15rem, padrão=7.5rem (grid LCARS). */
  size?: "small" | "large";
  decorator?: "left" | "right" | "none";
  hidden?: boolean;
  noEvent?: boolean;
  style?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  color: undefined,
  textColor: undefined,
  size: undefined,
  decorator: "none",
  hidden: false,
  noEvent: true,
  style: () => ({}),
});

const resolvedTextColor = computed(
  () => props.textColor ?? props.color ?? "text-light"
);

const { register, unregister, generateId } = useLcarsRegistry();

const elementId = computed(() => props.id ?? generateId("indicator"));

onMounted(() => {
  register(elementId.value, null, { type: "indicator", ...props });
});

onUnmounted(() => {
  unregister(elementId.value);
});
</script>

<template>
  <LcarsRow
    :id="elementId"
    class="lcars-indicator"
    :class="{ small: size === 'small', large: size === 'large' }"
    :hidden="hidden"
    :noEvent="noEvent"
    :style="style"
  >
    <LcarsBlock
      v-if="decorator === 'left'"
      version="round-left"
      :color="color"
    />
    <LcarsText
      :color="resolvedTextColor"
      :text="text"
      :style="{
        fontFamily: 'LCARS',
        letterSpacing: 'normal',
        textTransform: 'uppercase',
      }"
    />
    <LcarsBlock
      v-if="decorator === 'right'"
      version="round-right"
      :color="color"
    />
  </LcarsRow>
</template>

<style scoped>
/* Mesmo raciocínio do LcarsToggleSwitch: min-width no CONTAINER (row), nunca
   cor — quem pinta é só o LcarsBlock decorativo, do contrário a row vira fundo
   sólido da mesma cor do decorator e ele some (bug já caçado no toggle). */
.lcars-indicator {
  min-width: 7.5rem;
  /* `gap`, não `margin-left` no texto: o decorator pode estar dos dois lados
     (`decorator="right"`), margin de um lado só erra a metade dos casos. */
  gap: 0.5rem;

  /* O indicador é pra ler como o LcarsText puro (ex.: "Energy Level" / 2585
     no SituationPanel): texto na cor do tema, fundo transparente — NUNCA
     como um LcarsBlock preenchido. Mas a row é um <div> de bloco, e quando
     é filha direta de um LcarsComplexButton colorido, a cascata do tema
     (`.papel-interactive > *:not([class*="-bg"], ...)`) pinta o fundo dela
     igual a um block comum — um <span> de LcarsText não mostra isso do
     mesmo jeito. `!important` pra vencer essa cascata (mesma especificidade
     de classe, ela ganharia por vir depois em cascata sem isto). */
  background-color: transparent !important;
}
.lcars-indicator.small {
  min-width: 3.75rem;
}
.lcars-indicator.large {
  min-width: 15rem;
}

/* `LcarsBlock` sem essa regra herda `min-width: 7.5rem` de `module.css`
   (base de QUALQUER `.block`/`.button`) e engole a largura inteira do
   indicador, apagando o texto — confirmado no Storybook (`GridAlignment`):
   row e block com a MESMA largura, `1234` sem nenhum espaço pra desenhar.
   Mesmo tamanho do check do `LcarsToggleSwitch`, é só um nub decorativo. */
.lcars-indicator :deep(.block) {
  min-width: 1rem;
  max-width: 1.5rem;
  flex: 1 1 auto;
}

/* Texto ocupa a sobra — sem isso ele soma ao min-width do block em vez de
   dividir o espaço, e o container cresce além do grid (mesmo ajuste do
   toggle). */
.lcars-indicator :deep(.text) {
  min-width: 0;
  flex: 1 1 0;
  font-size: 2.8rem;
}
</style>
