/**
 * Degradação de EXIBIÇÃO por dano no sensor. Sem Vue, sem DOM — só função pura,
 * pra a regra ficar verificável sem subir o browser.
 *
 * Distinto da perda de confiança (esmaecimento por idade), que é informação
 * envelhecendo e não equipamento falhando. Um quadrante pode estar esmaecido e
 * estável (dado velho, rescanear) ou nítido e tremendo (sensor quebrado,
 * reparar).
 */

/** Fração de dano a partir da qual o display degrada (banda "moderado"). */
export const SENSOR_MODERATE_DAMAGE = 0.3

/**
 * Embaralha dígitos do código KBS **para exibição**.
 *
 * O número dançando é o que comunica "leitura não confiável" sem precisar de
 * texto. A corrupção NUNCA toca o estado: `lrsScan` e `exploredQuadrants`
 * guardam o código verdadeiro, então reparar o sensor devolve a leitura certa.
 * Corromper o armazenado transformaria dano temporário em perda permanente de
 * conhecimento, que requisito nenhum pede.
 *
 * `tick` é o que faz os dígitos mudarem ao longo do tempo; `key` desacopla
 * quadrantes vizinhos, pra não piscarem todos no mesmo padrão.
 */
export function corruptKbsCode(code: string, key: string, tick: number): string {
  let seed = tick
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0
  return code
    .split('')
    .map((digit, i) => {
      const roll = Math.abs((seed * 1103515245 + i * 12345) % 100)
      return roll < 45 ? String(Math.abs((seed >> (i + 1)) % 10)) : digit
    })
    .join('')
}
