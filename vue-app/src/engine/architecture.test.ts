/**
 * Guarda do invariante de dependência da decisão #36 da `fase-4-engine`:
 * módulos irmãos do engine NÃO se importam.
 *
 * Existe como teste, e não como conferência manual, porque o grafo já quebrou
 * duas vezes sem ninguém notar (`damageControl → combat` e
 * `saveIntegrity → newGame`) — os dois passaram por revisão e por 123 testes
 * verdes. Regra que só vive em prosa não segura nada.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENGINE_DIR = dirname(fileURLToPath(import.meta.url))

/** Folhas: não importam nada do engine, todos podem importar delas. */
const LEAVES = ['constants', 'prng', 'sector']

/**
 * Compositores: podem importar irmãos, porque orquestrar é o trabalho deles.
 * A lista é fechada de propósito — acrescentar nome aqui é decisão de
 * arquitetura, não conveniência de import.
 */
const COMPOSERS = ['turnEngine', 'endGame', 'newGame']

function engineModules(): string[] {
  return readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => f.replace(/\.ts$/, ''))
}

/** Nomes de módulo do engine importados por `mod`. */
function engineImportsOf(mod: string): string[] {
  const src = readFileSync(join(ENGINE_DIR, `${mod}.ts`), 'utf8')
  const found = new Set<string>()
  // Cobre as duas formas em uso: '@/engine/x' e './x'.
  for (const m of src.matchAll(/from '(?:@\/engine\/|\.\/)([A-Za-z]+)'/g)) {
    found.add(m[1])
  }
  return [...found]
}

describe('engine/architecture', () => {
  it('nenhum módulo importa irmão, exceto compositores', () => {
    const offenders: string[] = []

    for (const mod of engineModules()) {
      if (COMPOSERS.includes(mod)) continue
      for (const dep of engineImportsOf(mod)) {
        if (!LEAVES.includes(dep)) {
          offenders.push(`${mod}.ts importa irmão ${dep}.ts`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('folhas não importam nada do engine', () => {
    for (const leaf of LEAVES) {
      expect(engineImportsOf(leaf), `${leaf}.ts deveria ser folha`).toEqual([])
    }
  })

  it('todo módulo do engine está classificado', () => {
    // Módulo novo que não seja folha nem compositor tem que ser consciente:
    // este teste força a decisão em vez de deixar o grafo crescer no escuro.
    const unclassified = engineModules().filter(
      (m) => !LEAVES.includes(m) && !COMPOSERS.includes(m),
    )
    // Os demais são módulos de capability: podem importar folhas, nada mais.
    for (const mod of unclassified) {
      for (const dep of engineImportsOf(mod)) {
        expect(LEAVES).toContain(dep)
      }
    }
  })
})
