/**
 * Constantes do jogo + helpers puros de dano.
 *
 * Não monta `GameState` — a fábrica de estado inicial vive em `newGame.ts`,
 * porque ela precisa de `worldGen`, que importa daqui (evita ciclo).
 *
 * **Folha da árvore de dependências**: este arquivo NÃO importa de nenhum outro
 * `engine/*.ts` — só de `types/game.ts`. Todos os outros módulos do engine
 * importam daqui. É o que permite `combat.ts`, `warpCore.ts` e `navigation.ts`
 * serem escritos em paralelo sem depender uns dos outros
 * (design.md decisão #36).
 */

// ── Energia (seção 2.3) ─────────────────────────────────────────────────────

/**
 * Output NOMINAL do Warp Core, com o core intacto. Teto antes de `autoOverload`
 * disparar.
 *
 * ⚠️ Energia aqui é **vazão, não estoque**. O core gera potência por turno e os
 * subsistemas querem consumir; consumir acima disso não esvazia tanque nenhum,
 * gera sobrecarga → dano no core → breach. Não existe condição de "fim de
 * energia" (o `E=E-N-10` do original de 1978 foi descartado de propósito) — ver
 * `engine/endGame.ts`.
 *
 * O output EFETIVO cai com o dano no core: use `warpCoreOutput()`, não esta
 * constante, em qualquer cálculo de orçamento.
 */
export const WARP_CORE_OUTPUT = 4500

/**
 * Output efetivo: `4500 × (1 - d)`. Core danificado entrega menos, então o mesmo
 * consumo que cabia passa a estourar o orçamento — e a sobrecarga resultante
 * danifica mais o core. É a espiral que dá peso real a desligar subsistema:
 * deixa de ser economia e passa a ser sobrevivência.
 *
 * Sem piso, por decisão: um core em frangalhos pode ficar incapaz de sustentar a
 * nave, e a saída é desligar tudo que der e correr pra uma base.
 */
export function warpCoreOutput(warpCoreIntegrity: number): number {
  return WARP_CORE_OUTPUT * (1 - damageFraction(warpCoreIntegrity))
}

export const SHIELD_ENERGY_MAX = 2500
export const SHIELD_ENERGY_INITIAL = 1500

// ── Casco (integridade estrutural) ──────────────────────────────────────────

export const HULL_INTEGRITY_MAX = 100

/**
 * Divisor do dano que passa dos escudos antes de virar perda de casco.
 *
 * Dano inimigo bruto (`H`) vem em centenas; casco é 0-100 como os subsistemas.
 * Com 20, um acerto de 200 sem escudo tira 10 pontos — cerca de 5 turnos
 * totalmente desprotegido até a destruição. Valor de partida pra playtest, mesmo
 * tratamento dos outros números (decisão #25).
 */
export const HULL_DAMAGE_DIVISOR = 20

// ── Armas (seção 2.3) ───────────────────────────────────────────────────────

export const PHASER_POWER_MAX = 3000
export const PHASER_TEMP_MAX = 270
export const PHASER_TEMP_INITIAL = 50
/** Aquecimento por disparo E resfriamento passivo por turno sem atirar. */
export const PHASER_TEMP_PER_SHOT = 30
export const TORPEDO_STOCK_MAX = 12
export const TORPEDO_STOCK_INITIAL = 8
export const TORPEDO_TUBE_COUNT = 3
/** Dano de torpedo: `200 + random*100`, sem redução por calor (decisão #31). */
export const TORPEDO_DAMAGE_MIN = 200
export const TORPEDO_DAMAGE_SPREAD = 100

// ── Inimigos ────────────────────────────────────────────────────────────────

/**
 * Base do stat único vida/ataque: `enemyPower = 200 * (0.5 + random)` →
 * faixa 100-300. Reusa o `S9=200` do fonte de 1978 (decisão #22).
 */
export const ENEMY_BASE_POWER = 200
/** Chance de rendição ao dar Hail num inimigo intacto — o PISO da escala (decisão #23). */
export const HAIL_SURRENDER_CHANCE = 0.3
/**
 * Teto da escala de rendição: chance quando o alvo está reduzido a 0 de poder
 * (o instante antes de morrer). Constante de playtest — o freio real contra
 * captura virar dominante sobre destruição é a cela de 4 lugares e a equipe de
 * CdD travada em `guard` (hail-and-identity design.md decisão 3, risco 1).
 */
export const HAIL_SURRENDER_CHANCE_MAX = 0.75
/** Chance de um prisioneiro revelar posição de frota, 1x por captura. */
export const INTERROGATION_CHANCE = 0.5
/** Estresse de cloak por turno, na mesma escala 0-20 do overload. */
export const CLOAK_STRESS_PER_TURN = 4
export const CLOAK_STRESS_CAP = 20
/** Turnos antes de poder cloacar de novo após decloak forçado. */
export const CLOAK_COOLDOWN_TURNS = 8

// ── Consumo de energia por subsistema (decisões #25/#28/#31/#32) ────────────

/** Impulso a 100% do dial. Boost força 100% independente do dial. */
export const IMPULSE_POWER_MAX = 2000
/** Passivo por turno de cada sensor, enquanto ligado. */
export const SRS_PASSIVE_DRAW = 100
export const LRS_PASSIVE_DRAW = 100
/** Tubo vazio em standby: mecanismo de carregamento fica ativo (decisão #32). */
export const PHOTON_TUBE_IDLE_DRAW = 5
/** Tubo carregado: substitui o standby, não soma (decisão #31). */
export const PHOTON_TUBE_LOADED_DRAW = 20
/** Custo ativo por torpedo disparado (reusa `E=E-2` do original). */
export const TORPEDO_FIRE_COST = 2
/** Sempre ligados, sem toggle. */
export const LIFE_SUPPORT_DRAW = 150
export const WARP_CORE_HOUSE_DRAW = 50
/** Auto-Nav só consome enquanto engajado numa viagem (decisão #28). */
export const AUTO_NAV_DRAW = 100

// ── Navegação (seção 2.3) ───────────────────────────────────────────────────

export const WARP_FACTOR_MIN = 1
export const WARP_FACTOR_MAX = 8
/** Acima disso, viagem estressa o Warp Core (decisão #23). */
export const WARP_SAFE_FACTOR = 4
/** Pontos de overload efetivo por ponto de warp acima do seguro. */
export const WARP_STRESS_PER_POINT = 2
/**
 * Duração da APRESENTAÇÃO de um turno de viagem, em ms, indexada pelo fator de
 * warp (índice 0 = warp 1). Duração total = `turnos × LUT[fator]`, com
 * `turnos = ceil(distância / fator)`.
 *
 * Na diagonal completa da galáxia (distância 7): **~30 s** em warp 1 (7 turnos ×
 * 4300) e **~3 s** em warp 8 (1 turno × 3000).
 *
 * **Decrescente, NÃO inversamente proporcional ao fator.** A contagem de turnos
 * já carrega um `1/w`; somar outro na duração do turno compõe pra `1/w²` e
 * colapsa a escala — ancorando warp 1 em 4300 ms, warp 8 animaria 0,56 s;
 * ancorando warp 8 em 5 s, warp 1 levaria 280 s. O declive suave adiciona a
 * percepção de agilidade sem destruir a proporção.
 *
 * **Não-crescente por obrigação.** Uma rampa crescente era o único jeito de
 * bater exatamente as âncoras iniciais de 30 s / 5 s, mas tornava o total
 * NÃO-monotônico: warps 4, 5 e 6 custam os mesmos 2 turnos na diagonal, então
 * subir a velocidade deixava a viagem mais longa.
 *
 * Sem piso nem teto: toda entrada já cai entre 3000 e 4300 ms, então um clamp
 * seria código inalcançável (design.md decisão 7).
 */
export const WARP_ANIMATION_MS = [4300, 4100, 3900, 3700, 3600, 3400, 3200, 3000]

/** Duração de apresentação de um turno de viagem no fator dado (1-8). */
export function warpAnimationMs(warpFactor: number): number {
  const idx = clamp(Math.round(warpFactor), WARP_FACTOR_MIN, WARP_FACTOR_MAX) - 1
  return WARP_ANIMATION_MS[idx]
}

/**
 * Tempo que cada evento de combate fica em cena durante a apresentação de um
 * turno. Valor de partida — calibrado no playthrough (task 5.4).
 */
export const TURN_EVENT_PRESENT_MS = 650

export const PROBES_INITIAL = 4
export const BOOST_MAX_TURNS = 5
/** Cooldown = turnos usados × isto, arredondado pra cima (decisão #23). */
export const BOOST_COOLDOWN_FACTOR = 1.5

// ── Missão (seção 2.3, corrigido por decisão #22) ───────────────────────────

export const STARDATE_INITIAL = 3600.0
/**
 * Duração da missão em stardates. O original sorteia `T9=25+INT(RND(1)*10)`
 * (25-34); usávamos o meio da faixa.
 *
 * **Subiu pra 40 na 3ª rodada de playthrough.** Trinta era o número de 1978,
 * calibrado pra um jogo cujo controle de danos era uma taxa de reparo sobre o
 * array `D` — sem fadiga, sem alocação de equipe, sem missão de superfície.
 * Esta engine cobra as três, e a rodada bateu no muro: uma batalha dura mais a
 * recuperação dela consumiam a maior parte da missão, e o relógio decidia a
 * partida em vez do jogador.
 *
 * Sobe JUNTO com a suavização da fadiga (ver `TEAM_FATIGUE_HALFLIFE`), não no
 * lugar dela: sozinho, mais tempo só daria mais espaço pra sofrer o mesmo
 * defeito, com a equipe ainda virando inerte no 8º turno trabalhado.
 *
 * Stardate avança exatamente 1 por turno resolvido (`T=T+1`, linha 3870 do
 * fonte de 1978) — turno é a unidade indivisível de tempo. Custo fracionário
 * por ação foi avaliado com número e recusado: a queixa era a ESPERA de
 * reparo, que custa 1.0 sob qualquer esquema de preço, e baratear ação de
 * combate deixaria a espera relativamente mais cara.
 */
export const MISSION_DURATION = 40
export const STARDATE_PER_TURN = 1

/**
 * ⚠️ Totais de inimigo e base **não são mais constantes de estado inicial** —
 * viraram resultado da geração de mundo (`world-generation` design.md decisão 1),
 * como no original, onde `K9`/`B9` acumulam das rolagens por quadrante.
 *
 * Ficam aqui só como valor de referência esperado, pra teste e documentação:
 * ~17.3 inimigos e ~4.6 bases. Não usar pra inicializar `GameState`.
 */
export const ENEMIES_EXPECTED = 17
export const STARBASES_EXPECTED = 5

// ── Cela de prisioneiros (decisão #23) ──────────────────────────────────────

export const BRIG_CAPACITY = 4

// ── Warp Core: sobrecarga e breach (seção 10.2) ─────────────────────────────

export const OVERLOAD_MIN = 0
export const OVERLOAD_MAX = 20

/**
 * Unidades de energia de excesso por ponto de sobrecarga automática.
 *
 * A sobrecarga automática é **linear no excesso absoluto**
 * (`ceil(excesso / 150)`), não percentual sobre o output. A versão percentual
 * empilhava duas exponenciais e produzia um penhasco em vez de curva:
 *
 * - `%` do excesso é **hiperbólico** — quando o core se danifica o output cai,
 *   então o denominador cai junto e a razão dispara;
 * - `WARP_CORE_DAMAGE_TABLE` é **Fibonacci**, super-exponencial no índice.
 *
 * Resultado medido: 7 pontos de integridade atravessavam a tabela inteira
 * (integridade 42 → 0.02 de dano/turno; integridade 35 → 85/turno + 55% de
 * explosão). Core a 30% morria em 1 turno, sem decisão possível.
 *
 * Com 150, partindo de cruzeiro (~1915) e sem reparo: integridade 30 sustenta
 * 60+ turnos, 25 dá ~49, **20 dá ~23 turnos com 8% de risco acumulado**, 15 dá
 * ~11. Terror com saída — e cortar consumo zera a sobrecarga em qualquer
 * integridade, que é a resposta tática pretendida.
 *
 * Menor = mais punitivo (125 deixa integridade 20 em ~12 turnos).
 */
export const OVERLOAD_PER_EXCESS = 150

/**
 * Dano/turno ao WC por ponto de overload efetivo. Curva Fibonacci
 * (`min(85, fib(n)/50)`), pré-calculada pra não recomputar em runtime.
 * Índice = overload efetivo, já travado em 0-20.
 */
export const WARP_CORE_DAMAGE_TABLE = [
  0, 0.02, 0.02, 0.04, 0.06, 0.1, 0.16, 0.26, 0.42, 0.68, 1.1, 1.78, 2.88,
  4.66, 7.54, 12.2, 19.74, 31.94, 51.68, 83.62, 85,
] as const

/** Chance de explosão/turno, `min(0.55, fib(n)/12300)`. Mesmo índice. */
export const WARP_CORE_EXPLOSION_CHANCE_TABLE = [
  0, 0.00008, 0.00008, 0.00016, 0.00024, 0.00041, 0.00065, 0.00106, 0.00171,
  0.00276, 0.00447, 0.00724, 0.01171, 0.01894, 0.03065, 0.04959, 0.08024,
  0.12984, 0.21008, 0.33992, 0.55,
] as const

/** Turnos pra conter um breach antes de virar morte por radiação. */
export const BREACH_TURNS = 5
/** Reparo fora do breach roda a metade enquanto ele estiver ativo. */
export const BREACH_REPAIR_PENALTY = 0.5

// ── Sonda / landing party (decisão #23) ─────────────────────────────────────

/** Chance base de destruição em setor hostil... */
export const HOSTILE_RISK_BASE = 0.4
/** ...mais isto por inimigo ADICIONAL além do primeiro. */
export const HOSTILE_RISK_PER_EXTRA_ENEMY = 0.05
/** Duração fixa da missão de mineração (ida, pesquisa, volta). */
export const LANDING_PARTY_TURNS = 3
/** Integridade de WC ganha numa mineração bem-sucedida. */
export const DILITHIUM_WC_BOOST = 30

// ── Docking (decisões #8/#23) ───────────────────────────────────────────────

export const STARBASE_POOL_CAPACITY = 500
/** Regen/turno enquanto o pool não está sendo sacado por um loop de docking. */
export const STARBASE_POOL_REGEN = 10
/** Reparo por subsistema por tick docado: `5 (base) * 5 (tier) * 1.0`. */
export const DOCKED_REPAIR_PER_TICK = 25
/** Equipes descansam em dobro enquanto docadas. */
export const DOCKED_TEAM_RECOVERY_PER_TURN = 16
/**
 * Multiplicador de `DOCKED_TEAM_RECOVERY_PER_TURN` numa `STARBASE_SCIENCE`.
 *
 * Sem âncora existente — valor inicial de playtest (hail-and-identity
 * design.md Open Question 3). Começa conservador: o risco anotado é a base
 * científica virar parada obrigatória se o bônus for alto demais.
 */
export const STARBASE_SCIENCE_RECOVERY_MULTIPLIER = 1.5

// ── Rating / easter egg ─────────────────────────────────────────────────────

/** Capturar pesa mais que destruir — captura também rende inteligência. */
export const CAPTURED_RATING_WEIGHT = 1.5
export const DESTROYED_RATING_WEIGHT = 1
/** Teto de ícones renderizados; a população interna cresce sem limite. */
export const TRIBBLE_RENDER_CAP = 200
/**
 * Acima deste número de ícones a infestação ganha som.
 *
 * Fica passado do seed de propósito: a população parte de 2 e dobra, então o
 * som chega no 4º turno (2, 4, 8, 16) — três turnos de "por que tem Tribbles na
 * minha ponte" antes de a piada se anunciar.
 */
export const TRIBBLE_SOUND_THRESHOLD = 10

// ── Sensores ────────────────────────────────────────────────────────────────

/** Confiança do LRS decai isto por turno desde o último scan... */
export const SCAN_DECAY_PER_TURN = 0.05
/** ...com piso aqui (estrelas não se movem, nunca some de vez). */
export const SCAN_CONFIDENCE_FLOOR = 0.3

// ── Dano em subsistema: fração compartilhada e bandas (decisões #35/#37) ─────

/** Fronteira leve→moderado. Abaixo disso, só efeito contínuo. */
export const DAMAGE_BAND_MODERATE = 0.3
/** Fronteira moderado→crítico. Acima disso, subsistema paralisado. */
export const DAMAGE_BAND_CRITICAL = 0.6
/** Integridade abaixo da qual o subsistema está em crítico (= `d > 0.60`). */
export const CRITICAL_INTEGRITY = 40

export type DamageBand = 'leve' | 'moderado' | 'critico'

/**
 * Fração de dano `d`: 0 com integridade cheia, 1 com integridade zero.
 * Base compartilhada de TODO efeito de dano→efetividade desta mudança —
 * `combat.ts` (Phaser Banks/Photon Tubes), `warpCore.ts` (draw do Shield
 * Control) e `navigation.ts` (LRS/Auto-Nav/Warp Engines) importam daqui em vez
 * de um do outro, o que mantém os 3 paralelizáveis (decisão #36).
 *
 * Efeitos contínuos escalam com `d` desde o primeiro ponto de dano (integridade
 * 99 já dá `d = 0.01`); efeitos probabilísticos só a partir de moderado, ver
 * `degradedChance`.
 */
export function damageFraction(integrity: number): number {
  // Arredonda pra 4 casas: sem isso, `0.45 - 0.3` vira 0.15000000000000002 e a
  // fronteira exata das bandas (integridade 55 -> 15%) falha por ponto
  // flutuante, fazendo o roll disparar num limite onde a spec diz que não.
  return round4(clamp((100 - integrity) / 100, 0, 1))
}

/**
 * Chance de rendição no Hail, escalando com o dano do alvo.
 *
 * `enemyPower` é o único stat de vida do inimigo — não existe um `initialPower`
 * guardado por entidade (hail-and-identity design.md decisão 3, Open Question
 * 1). Duas opções: acrescentar `initialPower` ao schema, ou usar
 * `ENEMY_BASE_POWER` como denominador nominal. A segunda é mais barata e não
 * muda o schema — decisão tomada aqui — ao custo de um inimigo que nasceu acima
 * da média (até 300, contra o nominal 200) começar já "acima de 100%" e ler como
 * intacto até o dano real alcançar o nominal, o que é aceitável: o efeito é só
 * atrasar o início da escala, nunca invertê-la.
 *
 * Alvo intacto (`enemyPower >= ENEMY_BASE_POWER`) rende no piso
 * `HAIL_SURRENDER_CHANCE`; caindo a 0 de poder, no teto
 * `HAIL_SURRENDER_CHANCE_MAX`.
 */
export function hailSurrenderChance(enemyPower: number): number {
  const damaged = clamp(1 - enemyPower / ENEMY_BASE_POWER, 0, 1)
  return HAIL_SURRENDER_CHANCE + (HAIL_SURRENDER_CHANCE_MAX - HAIL_SURRENDER_CHANCE) * damaged
}

/** Banda em que a integridade cai. */
export function damageBand(integrity: number): DamageBand {
  const d = damageFraction(integrity)
  if (d > DAMAGE_BAND_CRITICAL) return 'critico'
  if (d > DAMAGE_BAND_MODERATE) return 'moderado'
  return 'leve'
}

/** `true` quando o subsistema está paralisado/forçado a estado seguro. */
export function isCritical(integrity: number): boolean {
  return damageFraction(integrity) > DAMAGE_BAND_CRITICAL
}

/**
 * Chance (0-1) de falha probabilística: 0 até a fronteira do moderado,
 * subindo linear até 0.30 na borda do crítico. Usado pela falha de
 * carregar/descarregar tubo, flickering de escudo, estagnação de motor e
 * degradação de rota do Auto-Nav — todos com a mesma curva.
 */
export function degradedChance(integrity: number): number {
  return round4(Math.max(0, damageFraction(integrity) - DAMAGE_BAND_MODERATE))
}

// ── Utilitários ─────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Corta lixo de ponto flutuante mantendo 4 casas — ver `damageFraction`. */
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

// ── Equipes de Controle de Danos (seção 10.3) ───────────────────────────────

export const DAMAGE_CONTROL_TEAM_COUNT = 6
export const TEAM_EFFICIENCY_FLOOR = 20
export const TEAM_RECOVERY_PER_TURN = 8

/**
 * Meia-vida da fadiga, em turnos trabalhados:
 * `efficiency = max(FLOOR, 100 × 0.5^(turnsWorked / HALFLIFE))`.
 *
 * Era 3, cravado no expoente. Simulado contra a engine, isso fazia uma equipe
 * entregar 29 dos primeiros 60 pontos de um subsistema em 4 turnos e depois
 * virar quase inerte no piso, rendendo 3 pontos por turno pra sempre.
 * Restaurar 6 subsistemas de 20% levava 19 turnos — 63% de uma missão de 30
 * stardates, que é o que transformava "ganhei uma batalha dura" em "perdi no
 * relógio".
 *
 * Com 6, o mesmo reparo leva 11 turnos, e a fadiga continua mordendo: 89%
 * depois do 1º turno trabalhado, 71% no 3º, 50% no 6º, 25% no 12º. A mecânica
 * mantém o formato no dobro da escala de tempo, em vez de ser removida.
 *
 * 8 foi medido e descartado (9 turnos, pouco a mais que 11) porque deixa
 * parquear equipe e esquecer — a alocação deixa de ser decisão.
 *
 * **`TEAM_EFFICIENCY_FLOOR` e `TEAM_RECOVERY_PER_TURN` ficam como estão, e
 * isso é medido, não esquecimento.** Subir a recuperação idle de 8 pra 16 moveu
 * ZERO turnos em todo cenário simulado: equipe reparando está `working` e nunca
 * entra no ramo de recuperação. E o piso deixa de importar acima de meia-vida
 * 5, quando a curva já não chega lá num reparo realista. Mexer neles seria
 * mudar número sem mudar jogo.
 */
export const TEAM_FATIGUE_HALFLIFE = 6

/**
 * Calcula a integridade percentual do escudo (0-100) derivada da energia atual
 * e do dano acumulado em `shieldDamageTaken`.
 */
export function computeShieldIntegrity(
  shieldEnergy: number,
  shieldDamageTaken: number
): number {
  if (shieldEnergy <= 0 && shieldDamageTaken > 0) return 0
  const effectiveDamage = Math.max(0, shieldDamageTaken - Math.floor(shieldEnergy * 0.2))
  const loss = (effectiveDamage / 1500) * 100
  return clamp(Math.round(100 - loss), 0, 100)
}

// ── Código KBS ──────────────────────────────────────────────────────────────

/**
 * Código KBS de 3 dígitos (**K**lingons, **B**ases, **S**tars) que Star Chart e
 * LRS leem. Mora nesta folha, e não em `worldGen.ts`, pra que `navigation.ts`
 * (resolução de sonda) também possa usá-lo sem importar um módulo irmão
 * (invariante da decisão #36).
 *
 * Planeta NÃO entra no código de propósito: é o que torna planeta invisível a
 * longa distância (world-generation design.md decisão 8).
 */
export function kbsCode(parts: {
  klingons: number
  bases: number
  stars: number
}): string {
  const d = (n: number) => Math.min(9, Math.max(0, Math.floor(n)))
  return `${d(parts.klingons)}${d(parts.bases)}${d(parts.stars)}`
}

/**
 * Código KBS **vivo** de um quadrante: o dígito K desconta os inimigos já
 * destruídos ali.
 *
 * ÚNICO produtor de código pro jogador. Antes eram cinco, montando
 * `{ klingons: content.klingons, ... }` na mão — SRS do quadrante atual,
 * `scanLongRange`, relatório de sonda, Star Chart e `worldGen.kbsCode` — e só
 * a materialização de setor sabia de `clearedEnemies`. O dígito nunca mudava:
 * limpar um setor deixava o código afirmando que os inimigos seguiam lá,
 * contradizendo o SRS, que varre continuamente.
 *
 * A duplicação ERA o defeito. Uma função só é o conserto e a prevenção: o sexto
 * produtor nasce certo.
 */
export function liveKbsCode(content: {
  klingons: number
  clearedEnemies: number
  baseIds: string[]
  stars: number
}): string {
  return kbsCode({
    klingons: Math.max(0, content.klingons - content.clearedEnemies),
    bases: content.baseIds.length,
    stars: content.stars,
  })
}
