/**
 * PRNG com semente — mulberry32.
 *
 * **Folha**: não importa nada. Existe porque `Math.random` não aceita semente, e
 * a geração de mundo precisa ser reproduzível: a mesma semente tem que produzir a
 * mesma galáxia (world-generation design.md decisão 4). Mockar `Math.random`
 * global no teste resolveria o determinismo, mas não daria partida reproduzível.
 *
 * mulberry32 é suficiente aqui: distribuição uniforme boa o bastante pra sorteio
 * de jogo, período de 2^32, e 4 linhas sem dependência. Não serve pra
 * criptografia — e não precisa.
 */

/** Cria um gerador `() => number` em `[0, 1)` a partir de uma semente. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Semente nova pra um jogo novo. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
