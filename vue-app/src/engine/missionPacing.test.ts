/**
 * Ritmo da missão: relógio, curva de fadiga e sondas.
 *
 * Estes três números eram completamente **não testados** — trocá-los não
 * quebrava nada, apesar de a calibragem inteira depender deles. A change
 * `mission-pacing` os moveu com base em simulação; estes testes prendem o
 * resultado da simulação à engine de verdade, pra que a próxima mudança de
 * balanceamento seja deliberada em vez de silenciosa.
 */

import { describe, expect, it } from 'vitest'
import {
  MISSION_DURATION,
  PROBES_INITIAL,
  TEAM_EFFICIENCY_FLOOR,
  TEAM_FATIGUE_HALFLIFE,
  TEAM_RECOVERY_PER_TURN,
} from '@/engine/constants'
import { resolveDamageControlTurn } from '@/engine/damageControl'
import { createNewGameState } from '@/engine/newGame'
import { SUBSYSTEM_KEYS, type SubsystemKey } from '@/types/game'

describe('mission-pacing — relógio e sondas', () => {
  it('a missão dura 40 stardates', () => {
    expect(MISSION_DURATION).toBe(40)
  })

  it('uma partida nova começa com 4 sondas', () => {
    expect(PROBES_INITIAL).toBe(4)
    expect(createNewGameState(1).remainingProbes).toBe(4)
  })

  it('o limite de stardate é o inicial mais a duração', () => {
    const state = createNewGameState(1)
    // A salvaguarda do original (`IFK9>T9THENT9=K9+1`) só eleva o limite se a
    // frota gerada passar da duração — com ~17 inimigos contra 40, nunca.
    expect(state.stardateLimit).toBe(state.stardate + MISSION_DURATION)
  })
})

describe('mission-pacing — curva de fadiga', () => {
  /** Uma equipe trabalhando N turnos seguidos, sem nunca completar o reparo. */
  function eficienciaPorTurno(turnos: number): number[] {
    const state = createNewGameState(2)
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'phasers'
    // Zerado pra que o subsistema não chegue a 100 e dispense a equipe no meio.
    state.subsystems.phasers = 0
    const curva: number[] = []
    for (let i = 0; i < turnos; i++) {
      resolveDamageControlTurn(state)
      curva.push(state.teams[0].efficiency)
    }
    return curva
  }

  it('meia-vida é de 6 turnos trabalhados', () => {
    expect(TEAM_FATIGUE_HALFLIFE).toBe(6)
    // 6º turno = metade. É a definição da constante, medida na engine.
    expect(eficienciaPorTurno(6)[5]).toBe(50)
  })

  it('a curva bate com a simulação que motivou a mudança', () => {
    const curva = eficienciaPorTurno(12)
    // turnos 1, 3, 6, 12 — os pontos citados no design.md da change.
    expect([curva[0], curva[2], curva[5], curva[11]]).toEqual([89, 71, 50, 25])
  })

  it('a equipe segue acima do piso no 12º turno trabalhado', () => {
    // Com meia-vida 3 ela batia no piso no 7º e rendia 3 pontos/turno pra
    // sempre — trabalhar mais deixava de ter qualquer efeito.
    expect(eficienciaPorTurno(12)[11]).toBeGreaterThan(TEAM_EFFICIENCY_FLOOR)
  })

  it('piso e recuperação idle NÃO mudaram — foram medidos e são inertes', () => {
    // Documentado como teste porque a tentação de "otimizar" estes dois é
    // exatamente o que a simulação desmentiu: subir a recuperação de 8 pra 16
    // moveu zero turnos, já que equipe reparando está `working` e nunca entra
    // no ramo de recuperação.
    expect(TEAM_EFFICIENCY_FLOOR).toBe(20)
    expect(TEAM_RECOVERY_PER_TURN).toBe(8)
  })
})

describe('mission-pacing — reparo pesado cabe na missão', () => {
  it('6 subsistemas a 20% voltam a 100 em 11 turnos, não 19', () => {
    const alvos = SUBSYSTEM_KEYS.filter((k) => k !== 'warpCore').slice(
      0,
      6,
    ) as SubsystemKey[]
    const state = createNewGameState(1)
    for (const sys of alvos) state.subsystems[sys] = 20
    // Uma equipe por sistema: a alocação natural quando 6 sistemas caem juntos.
    alvos.forEach((sys, i) => {
      state.teams[i].status = 'working'
      state.teams[i].assignedSystem = sys
    })

    let turnos = 0
    while (turnos < 60 && alvos.some((sys) => state.subsystems[sys] < 100)) {
      resolveDamageControlTurn(state)
      turnos++
    }

    expect(turnos).toBe(11)
    // O ponto da mudança: reparo pesado é ~27% de uma missão de 40, não 63% de
    // uma de 30.
    expect(turnos / MISSION_DURATION).toBeLessThan(0.3)
  })
})
