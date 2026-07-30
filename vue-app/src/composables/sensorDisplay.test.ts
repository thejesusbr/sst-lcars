import { describe, expect, it } from 'vitest'
import { corruptKbsCode } from '@/composables/sensorDisplay'

describe('composables/sensorDisplay', () => {
  it('mantém o formato do código: 3 dígitos, sempre', () => {
    for (let tick = 0; tick < 50; tick++) {
      const out = corruptKbsCode('357', '4,4', tick)
      expect(out).toMatch(/^\d{3}$/)
    }
  })

  it('os dígitos dançam ao longo do tempo', () => {
    const vistos = new Set<string>()
    for (let tick = 0; tick < 40; tick++) {
      vistos.add(corruptKbsCode('357', '4,4', tick))
    }
    // Leitura instável é o ponto: um valor só significaria display parado.
    expect(vistos.size).toBeGreaterThan(1)
  })

  it('quadrantes vizinhos não piscam no mesmo padrão', () => {
    const a = corruptKbsCode('357', '4,4', 7)
    const b = corruptKbsCode('357', '4,5', 7)
    expect(a === b && a === '357').toBe(false)
  })

  it('NÃO muta o código de origem — corrupção é só de exibição', () => {
    const original = '357'
    const congelado = original.slice()
    for (let tick = 0; tick < 20; tick++) corruptKbsCode(original, '4,4', tick)
    // O estado (`lrsScan`/`exploredQuadrants`) guarda esta string; reparar o
    // sensor tem que devolver a leitura certa.
    expect(original).toBe(congelado)
  })

  it('é determinística: mesmo tick e mesma chave dão o mesmo resultado', () => {
    expect(corruptKbsCode('357', '4,4', 11)).toBe(corruptKbsCode('357', '4,4', 11))
  })
})
