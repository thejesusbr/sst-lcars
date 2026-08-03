/**
 * ============================================================================
 * ISTO NÃO É ANTI-CHEAT. É UM MARCADOR DE INTEGRIDADE CLIENT-SIDE, SÓ ISSO.
 * ============================================================================
 *
 * THIS IS NOT ANTI-CHEAT. IT IS A CLIENT-SIDE INTEGRITY MARKER ONLY.
 *
 * Todo o hash roda no navegador do jogador, com uma constante que vai junto no
 * bundle. Qualquer pessoa que abra o DevTools consegue ler `INTEGRITY_SALT`,
 * recalcular o digest do save editado e gravar o checksum "correto" na mão.
 * Isso é esperado e não é um bug — o objetivo aqui é um easter egg (Tribbles),
 * não proteção. Não descreva isto como segurança em UI, comentário, doc, issue
 * ou commit; não construa nada em cima disto que dependa de ser inviolável.
 *
 * Any key embedded in the bundle is readable by the player — by construction
 * this can always be forged. Do not represent it as real anti-cheat anywhere.
 *
 * Spec: openspec/changes/fase-4-engine/specs/save-integrity/spec.md
 */

import { GAME_SCHEMA_VERSION, type GameState } from '@/types/game'

/** Constante fixa misturada no digest. NÃO é secreta (vai no bundle). */
const INTEGRITY_SALT = 'sst-lcars/save-integrity/v1'

/**
 * Chave PRÓPRIA do checksum. Nunca é campo dentro do `GameState` serializado —
 * um checksum guardado dentro da própria entrada mudaria, a cada gravação, o
 * objeto sobre o qual o checksum anterior foi calculado (hash circular).
 */
export const SAVE_CHECKSUM_KEY = 'sst-lcars:save-checksum'

/**
 * Campos hasheados = os do próprio estado sendo selado, ordenados pra não
 * depender da ordem de inserção. `schemaVersion` fica de fora: subir a versão
 * não pode, sozinho, mudar o digest.
 *
 * Derivar do estado recebido (e não de uma fábrica importada) é o que mantém
 * este módulo **folha** — importa só de `types/game.ts`. Antes ele chamava
 * `createNewGameState(0)` no topo do módulo, o que gerava uma galáxia inteira só
 * pra listar chaves E fazia um irmão importar outro irmão, violando o
 * invariante da decisão #36. Efeito colateral bem-vindo: campo estranho enfiado
 * no save entra no digest e o marcador detecta.
 */
function hashedFields(state: GameState): (keyof GameState)[] {
  return (Object.keys(state) as (keyof GameState)[])
    .filter((key) => key !== 'schemaVersion')
    .sort()
}

/** Registro persistido: hash + a versão de schema em que ele foi calculado. */
interface ChecksumRecord {
  v: number
  hash: string
}

/** Só o que usamos de `localStorage` — injetável pra testar fora do browser. */
type IntegrityStorage = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): IntegrityStorage | undefined {
  return globalThis.localStorage
}

/**
 * Migra um save carregado pro schema atual. v1 é no-op de fato (só preenche
 * campos ausentes com o default e carimba a versão); a costura existe pra que
 * um patch futuro tenha onde converter antes do hash ser recalculado.
 *
 * `defaults` é **injetado** pelo chamador (a store passa `createNewGameState()`)
 * em vez de importado: é o que evita este módulo depender de `newGame.ts`, e de
 * quebra deixa o teste passar um estado fixo sem gerar mundo.
 */
export function migrateSave(raw: unknown, defaults: GameState): GameState {
  const loaded = (raw ?? {}) as Partial<GameState>
  const state: GameState = {
    ...defaults,
    ...loaded,
    schemaVersion: GAME_SCHEMA_VERSION,
  }
  // v2 (`bridge-awareness`): `logReadMarkers` ganhou a chave `science`. O
  // merge acima é RASO — se o save carregado já tinha `logReadMarkers` (save
  // de v1, sem `science`), esse objeto inteiro substitui o default, e
  // `science` fica `undefined`. Corrige aqui, não no spread.
  if (state.logReadMarkers.science === undefined) {
    state.logReadMarkers = { ...state.logReadMarkers, science: 0 }
  }
  return state
}

/** Payload canônico: só os campos da versão atual, em ordem estável. */
function canonicalPayload(state: GameState): string {
  return JSON.stringify(hashedFields(state).map((key) => state[key]))
}

/**
 * FNV-1a 32-bit, síncrono — não `crypto.subtle.digest`. Não é enfraquecer
 * segurança nenhuma (não existe segurança real aqui, ver topo do arquivo); é
 * o que permite chamar isto depois de QUALQUER mutação (`save-integrity-fix`)
 * sem risco de dois digests resolverem fora de ordem: sem `await` de verdade
 * no meio, não há como uma chamada mais nova terminar antes de uma mais
 * velha e sobrescrever o hash certo com um velho.
 */
export function computeChecksum(state: GameState): string {
  const payload = INTEGRITY_SALT + canonicalPayload(state)
  let hash = 0x811c9dc5
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Recalcula e grava o checksum. Antes só era chamada nos 4 caminhos de turno
 * porque o hash era assíncrono (`crypto.subtle`); agora que é síncrono, é
 * seguro chamar depois de QUALQUER mutação — é o que `installIntegrityReseal`
 * (`stores/useGameState.ts`) faz via `$subscribe`, fechando o gap das ~23
 * ações livres que antes deixavam o selo desatualizado (ver
 * `hollow-integration-pattern`).
 */
export async function commitTurnChecksum(
  state: GameState,
  storage: IntegrityStorage | undefined = defaultStorage(),
): Promise<void> {
  if (!storage) return
  const record: ChecksumRecord = { v: GAME_SCHEMA_VERSION, hash: await computeChecksum(state) }
  try {
    storage.setItem(SAVE_CHECKSUM_KEY, JSON.stringify(record))
  } catch {
    // localStorage bloqueado (aba anônima/sandbox): sem checksum, sem drama.
  }
}

function readRecord(storage: IntegrityStorage): ChecksumRecord | null {
  try {
    const raw = storage.getItem(SAVE_CHECKSUM_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<ChecksumRecord>) : null
    return typeof parsed?.hash === 'string' && typeof parsed.v === 'number'
      ? { v: parsed.v, hash: parsed.hash }
      : null
  } catch {
    return null
  }
}

/**
 * Migra o save carregado e compara o digest com o armazenado. Divergiu → liga
 * o flag escondido `tribbleInfestationActive`, em silêncio: nada de toast, log
 * de combate ou qualquer pista na UI.
 *
 * Sem checksum gravado, ou gravado em outra versão de schema, não compara nada
 * (a próxima mutação regrava a baseline, via `installIntegrityReseal`) — senão
 * um save honesto de antes de um patch que adicione/remova campo levaria
 * Tribbles pela atualização do jogo, não por trapaça. Esta função não grava
 * nada — só o `$subscribe` grava, e só depois da hidratação.
 */
export async function verifySaveIntegrity(
  raw: unknown,
  defaults: GameState,
  storage: IntegrityStorage | undefined = defaultStorage(),
): Promise<GameState> {
  const state = migrateSave(raw, defaults)
  const record = storage ? readRecord(storage) : null
  if (record && record.v === GAME_SCHEMA_VERSION && record.hash !== (await computeChecksum(state))) {
    state.tribbleInfestationActive = true
  }
  return state
}
