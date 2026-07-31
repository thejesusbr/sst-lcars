/**
 * Ratchet contra **integração oca**: função escrita, testada e nunca chamada.
 *
 * É o defeito mais frequente deste projeto — 13 ocorrências até a 4ª rodada, ao
 * menos uma por rodada de playthrough. O modo de falha não é lógica errada, é
 * ligação ausente: o teste unitário do módulo fica verde porque o módulo está
 * certo, e a mecânica simplesmente não existe no jogo.
 *
 * Este teste cobre as duas formas que uma ferramenta consegue ver:
 *
 * 1. **função exportada do engine** sem chamador de produção
 *    (ex.: `renderedTribbleCount` — nenhum componente desenhava Tribble)
 * 2. **action de store** sem chamador nenhum
 *    (ex.: `checkSaveIntegrity` — correta, testada, e o selo de integridade
 *    nunca foi verificado; custou 2 rodadas de playthrough sem sinal)
 *
 * **O que ele NÃO pega**, e por isso não substitui o playthrough: argumento
 * errado passado pra função certa (`warpStress: 0`), produtor parcial
 * (`materializeSector` cravando 1 de 5 tipos), lógica duplicada com só uma
 * cópia correta (os 5 produtores de KBS) e promessa de spec nunca implementada
 * (`shields` dizia "absorption **and** regen" havia meses). Dessas 8 de 13, só
 * jogar ou ler spec-contra-código encontra.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENGINE_DIR = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = join(ENGINE_DIR, '..')

/**
 * Exceções conscientes. Lista fechada de propósito: acrescentar nome aqui é
 * decisão registrada, não conveniência — foi o que fez o `architecture.test.ts`
 * funcionar.
 */
const ALLOWED_UNREACHABLE = new Set<string>([
  // Dívida herdada, registrada em `openspec/BACKLOG.md`. Cada entrada precisa
  // de motivo; nome novo aqui sem justificativa no diff é o que o ratchet
  // existe pra impedir.

  // Taxa de reparo de doca especificada em `docking` ("25 pontos por
  // subsistema por tick, sem o teto de stacking"), mas o loop usa
  // `calculateRepairRate` com tier 5 — que só dá 25 com UMA equipe a 100%.
  // Equipe cansada rende menos, contrariando a spec. É a dívida do item 9.3,
  // nunca verificado em playthrough.
  'DOCKED_REPAIR_PER_TICK',

  // Helpers de navegação sem consumidor. Não foram removidos junto com os
  // outros porque a tentativa de recorte automático quebrou o arquivo
  // (assinatura multi-linha), e mexer neles à mão no meio da 5ª rodada é
  // risco sem retorno. Limpeza registrada no backlog.
  'undockSector',
  'effectiveImpulseMax',
  'markManyExplored',
  'nearestKnownStarbase',
  'canEngageBoost',
])

/** Todo arquivo de PRODUÇÃO: exclui teste e Storybook. */
function productionFiles(dir = SRC_DIR): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'stories') continue
      out.push(...productionFiles(full))
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) &&
      !entry.name.endsWith('.test.ts')
    ) {
      out.push(full)
    }
  }
  return out
}

const PRODUCTION = productionFiles().map((f) => ({ path: f, src: readFileSync(f, 'utf8') }))

function engineSources(): { mod: string; path: string; src: string }[] {
  return readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => ({
      mod: f.replace(/\.ts$/, ''),
      path: join(ENGINE_DIR, f),
      src: readFileSync(join(ENGINE_DIR, f), 'utf8'),
    }))
}

/** Ocorrências do símbolo fora da própria linha de declaração. */
function usesOutsideDeclaration(src: string, symbol: string): number {
  const hits = src.match(new RegExp(`\\b${symbol}\\b`, 'g'))?.length ?? 0
  return Math.max(0, hits - 1)
}

describe('engine/reachability — ratchet de integração oca', () => {
  it('toda função exportada do engine tem chamador de produção', () => {
    const unreachable: string[] = []

    for (const { mod, path, src } of engineSources()) {
      for (const m of src.matchAll(/^export (?:async )?function (\w+)/gm)) {
        const symbol = m[1]
        if (ALLOWED_UNREACHABLE.has(symbol)) continue

        // Usada DENTRO do próprio módulo já conta: exportar um helper só pra
        // poder testá-lo é legítimo, desde que o módulo o use de fato.
        if (usesOutsideDeclaration(src, symbol) > 0) continue

        const importedByProduction = PRODUCTION.some(
          (f) => f.path !== path && new RegExp(`\\b${symbol}\\b`).test(f.src),
        )
        if (!importedByProduction) {
          unreachable.push(`${mod}.ts → ${symbol}() nunca é chamada em produção`)
        }
      }
    }

    expect(unreachable).toEqual([])
  })

  it('toda constante exportada do engine é lida em algum lugar', () => {
    const unread: string[] = []

    for (const { mod, path, src } of engineSources()) {
      for (const m of src.matchAll(/^export const (\w+)\s*[:=]/gm)) {
        const symbol = m[1]
        if (ALLOWED_UNREACHABLE.has(symbol)) continue
        if (usesOutsideDeclaration(src, symbol) > 0) continue

        const readSomewhere = PRODUCTION.some(
          (f) => f.path !== path && new RegExp(`\\b${symbol}\\b`).test(f.src),
        )
        // Teste vale como leitor pra constante: `MISSION_PER_ENEMY` só é
        // afirmada em teste, e é exatamente onde ela deve ser afirmada.
        if (!readSomewhere) {
          unread.push(`${mod}.ts → ${symbol} não é lida por ninguém`)
        }
      }
    }

    expect(unread).toEqual([])
  })

  it('toda action da store é chamada por alguém', () => {
    // A forma exata do `checkSaveIntegrity`: método de store, invisível pro
    // grafo de import porque só se alcança por `gameState.nome(...)`.
    const storePath = join(SRC_DIR, 'stores', 'useGameState.ts')
    const src = readFileSync(storePath, 'utf8')

    const actionsBlock = src.slice(src.indexOf('\n  actions: {'))
    const actions = [...actionsBlock.matchAll(/^ {4}(?:async )?(\w+)\s*\(/gm)].map((m) => m[1])
    expect(actions.length).toBeGreaterThan(10)

    const consumers = PRODUCTION.filter((f) => f.path !== storePath)
    const uncalled = actions.filter((name) => {
      if (ALLOWED_UNREACHABLE.has(name)) return false
      // Chamada interna da própria store conta: `this.dispatchPlayerAction(...)`
      // e também `ctx.store.checkSaveIntegrity(...)` no hook `afterHydrate` do
      // plugin de persistência, que é onde o selo de integridade é verificado.
      if (new RegExp(`\\.${name}\\b`).test(src.replace(new RegExp(`^ {4}(?:async )?${name}\\(`, 'm'), ''))) {
        return false
      }
      return !consumers.some((f) => new RegExp(`\\.${name}\\b`).test(f.src))
    })

    expect(uncalled).toEqual([])
  })
})
