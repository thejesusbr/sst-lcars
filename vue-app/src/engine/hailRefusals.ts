/**
 * Falas de recusa de rendição no Hail. CONTEÚDO, não regra — vivem numa tabela
 * de dados em vez de espalhadas em `if`s dentro de `combat.ts`
 * (hail-and-identity design.md decisão 4).
 *
 * Uma linha falha vira ruído num playthrough longo, daí a variação sorteada por
 * espécie. "Já tentou perguntar a um Klingon se ele quer se render?" — a piada
 * do usuário que originou este requisito.
 *
 * Folha: importa só de `types/game.ts`.
 */

import type { EnemyType } from '@/types/game'

const KLINGON_REFUSALS = [
  'Klingons não se rendem — morremos em combate ou vivemos para lutar de novo!',
  'Sua proposta é um insulto! Preparem-se para morrer!',
  'Rendição é para os fracos. Venha nos buscar.',
  'Klingons não conhecem a palavra rendição.',
  'Heghlu\'meH QaQ jajvam! (Hoje é um bom dia para morrer!)',
  'Vida sem honra é morte!',
]

const ROMULAN_REFUSALS = [
  'O Império Romulano não negocia com invasores.',
  'Silêncio no canal. A resposta é o disparo que vem a seguir.',
  'Sua oferta foi registrada — e ignorada.',
  'Sim, mas meu julgamento prevalece!',
  'Somos criaturas do dever, capitão. Vivi minha vida por isso. Apenas mais um dever a cumprir.',
]

const CLOAKED_RAIDER_REFUSALS = [
  'Estática no canal. Quem responde não quer ser ouvido.',
  'Nenhuma resposta — só o eco de motores em silêncio.',
]

/** Os 5 `EnemyType` cobertos — união fechada, sem fallback genérico morto. */
const REFUSALS_BY_TYPE: Record<EnemyType, readonly string[]> = {
  klingon_cruiser: KLINGON_REFUSALS,
  klingon_d7: KLINGON_REFUSALS,
  romulan_warbird: ROMULAN_REFUSALS,
  romulan_scout: ROMULAN_REFUSALS,
  cloaked_raider: CLOAKED_RAIDER_REFUSALS,
}

/** Sorteia uma recusa no tom da espécie do alvo. */
export function pickHailRefusal(type: EnemyType, rng: () => number = Math.random): string {
  const pool = REFUSALS_BY_TYPE[type]
  return pool[Math.floor(rng() * pool.length)]
}
