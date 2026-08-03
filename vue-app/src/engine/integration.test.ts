/**
 * Testes de INTEGRAÇÃO: dirigem o `turnEngine` e afirmam efeito que atravessa
 * fronteira de módulo.
 *
 * Existem por causa da decisão #38 da `fase-4-engine`: 86 testes unitários
 * verdes conviveram com 747 linhas de engine que nada invocava. Teste unitário
 * por módulo, escrito pelo autor do módulo, não detecta integração oca.
 *
 * **Critério de aceite desta suíte: um módulo órfão TEM que fazer teste falhar.**
 * Cada teste aqui passa por `resolvePlayerTurn`/`endTurn` — nunca chama a função
 * do módulo direto. Se alguém desconectar `navigation` ou `damageControl` do
 * `turnEngine`, isto fica vermelho.
 */

import { describe, expect, it } from 'vitest'
import {
  endTurn,
  resolvePlayerTurn,
  type TurnOptions,
} from '@/engine/turnEngine'
import { dispatchTeam } from '@/engine/damageControl'
import { createNewGameState } from '@/engine/newGame'
import { ENEMY_ENERGY_MAX } from '@/engine/constants'
import { chebyshev } from '@/engine/sector'
import type { GameState, GridCoord, SectorEntity } from '@/types/game'

/** Estado com posição fixa e setor vazio: isola o efeito sob teste. */
function fixture(seed = 1): GameState {
  const state = createNewGameState(seed)
  state.position.quadrant = { row: 4, col: 4 }
  state.position.sector = { row: 4, col: 4 }
  state.currentSector = []
  return state
}

/** RNG que nunca dispara roll probabilístico (estagnação, falha, destruição). */
const noRolls = () => 0.99

// `enemyEnergy` cheia por padrão: sem isso o inimigo fica sem energia pro
// custo do ataque (`ENEMY_ATTACK_COST`) e nunca dispara — `combat-tuning`.
function klingon(id: string, position: GridCoord, power = 200): SectorEntity {
  return {
    id,
    type: 'klingon_cruiser',
    position,
    enemyPower: power,
    enemyEnergy: ENEMY_ENERGY_MAX,
  }
}

describe('integração: damage-control ligado ao turnEngine', () => {
  it('equipe despachada não repara no turno do despacho, repara no seguinte', () => {
    const state = fixture()
    state.subsystems.warp = 50
    dispatchTeam(state, state.teams[0].id, 'warp')

    endTurn(state, noRolls)
    expect(state.subsystems.warp).toBe(50) // turno do despacho: nada

    endTurn(state, noRolls)
    expect(state.subsystems.warp).toBeGreaterThan(50) // turno seguinte: repara
  })

  it('breach sem equipe mata por radiação em 5 turnos', () => {
    const state = fixture()
    state.breach = { active: true, containment: 0, turnsRemaining: 5 }

    let reason: string | null = null
    for (let i = 0; i < 5; i++) {
      reason = endTurn(state, noRolls).terminalReason
      if (reason) break
    }

    expect(reason).toBe('radiation_death')
  })

  it('breach contido por equipe não mata', () => {
    const state = fixture()
    state.breach = { active: true, containment: 90, turnsRemaining: 5 }
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'warpCore'
    state.teams[0].efficiency = 100
    state.teams[0].turnsWorked = 1

    const res = endTurn(state, noRolls)
    expect(state.breach.active).toBe(false)
    expect(res.terminalReason).not.toBe('radiation_death')
  })

  it('Life Support crítico por 5 turnos causa asfixia', () => {
    const state = fixture()
    state.subsystems.life = 30

    let reason: string | null = null
    for (let i = 0; i < 6; i++) {
      reason = endTurn(state, noRolls).terminalReason
      if (reason) break
    }

    expect(reason).toBe('crew_asphyxiation')
  })
})

describe('integração: navigation ligado ao turnEngine', () => {
  it('sonda consome estoque na hora e resolve na distância + 1 turnos', () => {
    const state = fixture()
    const stock = state.remainingProbes
    // Chebyshev de 4,4 até 7,4 = 3 -> resolve em 4 turnos.
    const res = resolvePlayerTurn(
      state,
      { type: 'launch_probe', targetCoord: { row: 7, col: 4 } },
      noRolls,
    )

    expect(res.rejected).toBe(false)
    expect(state.remainingProbes).toBe(stock - 1)
    // O lançamento já gastou 1 turno de viagem no tick da etapa 5.
    expect(state.probe?.turnsRemaining).toBe(3)

    endTurn(state, noRolls)
    endTurn(state, noRolls)
    expect(state.probe).not.toBeNull()

    endTurn(state, noRolls)
    expect(state.probe).toBeNull()
  })

  it('lançar sonda sem estoque é recusado e não consome turno', () => {
    const state = fixture()
    state.remainingProbes = 0
    const stardate = state.stardate

    const res = resolvePlayerTurn(
      state,
      { type: 'launch_probe', targetCoord: { row: 7, col: 4 } },
      noRolls,
    )

    expect(res.rejected).toBe(true)
    expect(state.stardate).toBe(stardate)
  })

  it('confiança do scan decai por turno (idade sobe)', () => {
    const state = fixture()
    state.exploredQuadrants['1,1'] = { code: '105', age: 0 }

    endTurn(state, noRolls)
    endTurn(state, noRolls)

    expect(state.exploredQuadrants['1,1'].age).toBe(2)
    expect(state.lrsScanAge).toBe(2)
  })

  it('viagem de warp avança por turno e chega ao destino', () => {
    const state = fixture()
    state.warpFactor = 2

    // Chebyshev de 4,4 até 8,4 = 4, a warp 2 -> ceil(4/2) = 2 turnos.
    const res = resolvePlayerTurn(
      state,
      { type: 'move_warp', targetCoord: { row: 8, col: 4 } },
      noRolls,
    )
    expect(res.rejected).toBe(false)
    // 1 turno já decrementou no tick da etapa 5.
    expect(state.warpTrip?.turnsRemaining).toBe(1)

    endTurn(state, noRolls)
    expect(state.warpTrip).toBeNull()
    expect(state.position.quadrant).toEqual({ row: 8, col: 4 })
  })

  it('boost só gasta duração em turno de movimento sob impulso', () => {
    const state = fixture()
    state.boostActive = true
    state.boostTurnsUsed = 0

    endTurn(state, noRolls) // turno sem movimento
    expect(state.boostTurnsUsed).toBe(0)

    resolvePlayerTurn(
      state,
      { type: 'move_impulse', targetCoord: { row: 5, col: 4 } },
      noRolls,
    )
    expect(state.boostTurnsUsed).toBe(1)
  })

  it('cooldown de boost decai em qualquer turno', () => {
    const state = fixture()
    state.boostActive = false
    state.boostCooldown = 3

    endTurn(state, noRolls)
    expect(state.boostCooldown).toBe(2)
  })
})

describe('integração: estresse de warp chega ao Warp Core', () => {
  it('viagem a warp 6 alimenta overload efetivo com estresse 4', () => {
    // Warp 6 = +2 por ponto acima de 4 = +4. Com a tabela de dano do WC, o
    // overload efetivo 4 tira 0.06 de integridade por turno; overload 0 tira 0.
    // Se `warpStress` voltar a ser 0 cravado, a integridade não cai e o teste
    // falha — é o que prova que a decisão #29 não está mais inerte.
    const travelling = fixture()
    travelling.warpFactor = 6
    resolvePlayerTurn(
      travelling,
      { type: 'move_warp', targetCoord: { row: 8, col: 8 } },
      noRolls,
    )
    const damagedByStress = 100 - travelling.subsystems.warpCore

    const idle = fixture()
    endTurn(idle, noRolls)
    const damagedIdle = 100 - idle.subsystems.warpCore

    expect(damagedByStress).toBeGreaterThan(damagedIdle)
  })

  it('cruzeiro a warp 4 ou menos não estressa', () => {
    const state = fixture()
    state.warpFactor = 4
    resolvePlayerTurn(
      state,
      { type: 'move_warp', targetCoord: { row: 8, col: 8 } },
      noRolls,
    )
    expect(state.subsystems.warpCore).toBe(100)
  })
})

describe('integração: ações declaradas nunca são no-op silencioso', () => {
  it('toda ação de PlayerActionType produz efeito ou recusa com motivo', () => {
    const cases: Array<{ action: Parameters<typeof resolvePlayerTurn>[1] }> = [
      { action: { type: 'fire_phasers' } },
      { action: { type: 'fire_torpedoes' } },
      { action: { type: 'unload_tube', tubeId: 1 } },
      { action: { type: 'hail', targetId: 'k1' } },
      { action: { type: 'lock_weapons' } },
      { action: { type: 'launch_probe', targetCoord: { row: 6, col: 6 } } },
      { action: { type: 'move_impulse', targetCoord: { row: 5, col: 5 } } },
      { action: { type: 'move_warp', targetCoord: { row: 6, col: 6 } } },
      { action: { type: 'send_party', teamId: 'team-1', targetCoord: { row: 4, col: 5 } } },
      { action: { type: 'end_turn' } },
    ]

    for (const { action } of cases) {
      const state = fixture()
      state.currentSector = [klingon('k1', { row: 5, col: 5 })]
      const before = state.stardate
      const res = resolvePlayerTurn(state, action, noRolls)

      if (res.rejected) {
        // Recusa: motivo explícito E turno não consumido.
        expect(res.rejectionReason, `${action.type} recusou sem motivo`).toBeTruthy()
        expect(state.stardate, `${action.type} recusou mas gastou turno`).toBe(before)
      } else {
        // Aceite: turno consumido E algo registrado no log.
        expect(state.stardate, `${action.type} aceitou sem gastar turno`).toBe(before + 1)
        expect(res.events.length, `${action.type} aceitou sem evento`).toBeGreaterThan(0)
      }
    }
  })

  it('inimigo com energia aproxima; sem energia, evade — todo turno, não só em ação de movimento', () => {
    // `combat-tuning`: reposicionamento aleatório-no-engage saiu, movimento
    // deliberado entra na etapa 3 de TODA resolução — inclusive End Turn.
    const armed = fixture()
    armed.currentSector = [klingon('k1', { row: 1, col: 1 })] // energia cheia por padrão
    const distBefore = chebyshev(armed.currentSector[0].position, armed.position.sector)
    endTurn(armed, noRolls)
    const distAfter = chebyshev(armed.currentSector[0].position, armed.position.sector)
    expect(distAfter).toBeLessThan(distBefore)

    // Longe do canto do grid: no canto, evadir bateria na borda e não
    // aumentaria a distância — não é o cenário que este teste mede.
    const drained = fixture()
    drained.currentSector = [{ ...klingon('k1', { row: 6, col: 6 }), enemyEnergy: 0 }]
    const distBefore2 = chebyshev(drained.currentSector[0].position, drained.position.sector)
    endTurn(drained, noRolls)
    const distAfter2 = chebyshev(drained.currentSector[0].position, drained.position.sector)
    expect(distAfter2).toBeGreaterThan(distBefore2)
  })
})

describe('integração: hook onQuadrantEnter', () => {
  it('é invocado exatamente 1× ao trocar de quadrante', () => {
    const state = fixture()
    state.warpFactor = 8
    const seen: GridCoord[] = []
    const options: TurnOptions = {
      onQuadrantEnter: (_s, q) => seen.push({ ...q }),
    }

    // Warp 8 cobre a distância 1 em 1 turno: chega no mesmo turno do engage.
    resolvePlayerTurn(
      state,
      { type: 'move_warp', targetCoord: { row: 5, col: 4 } },
      noRolls,
      options,
    )

    expect(seen).toEqual([{ row: 5, col: 4 }])
  })

  it('ausência de hook não quebra a resolução', () => {
    const state = fixture()
    state.warpFactor = 8
    const res = resolvePlayerTurn(
      state,
      { type: 'move_warp', targetCoord: { row: 5, col: 4 } },
      noRolls,
    )
    expect(res.rejected).toBe(false)
    expect(state.position.quadrant).toEqual({ row: 5, col: 4 })
    expect(state.currentSector).toEqual([])
  })

  it('hook que povoa o setor não deixa a nave em cima de entidade', () => {
    const state = fixture()
    state.warpFactor = 8
    const options: TurnOptions = {
      onQuadrantEnter: (s) => {
        // Povoa exatamente a célula da nave, o pior caso.
        s.currentSector = [
          { id: 'star-1', type: 'star', position: { ...s.position.sector } },
        ]
      },
    }

    resolvePlayerTurn(
      state,
      { type: 'move_warp', targetCoord: { row: 5, col: 4 } },
      noRolls,
      options,
    )

    const star = state.currentSector[0].position
    expect(state.position.sector).not.toEqual(star)
  })
})

describe('integração: energia é vazão, não estoque', () => {
  it('dano que passa dos escudos consome CASCO', () => {
    const state = fixture()
    state.shieldEnergy = 0
    state.currentSector = [klingon('k1', { row: 4, col: 5 }, 300)]
    const hullBefore = state.hullIntegrity

    endTurn(state, () => 0.5)

    expect(state.hullIntegrity).toBeLessThan(hullBefore)
  })

  it('escudo erguido protege o casco', () => {
    const state = fixture()
    state.shieldEnergy = 2500
    state.currentSector = [klingon('k1', { row: 4, col: 5 }, 300)]

    endTurn(state, () => 0.5)

    expect(state.hullIntegrity).toBe(100)
    expect(state.shieldEnergy).toBeLessThan(2500)
  })

  it('emissão desligada não deflete nada, mas preserva a alocação (shield-power-model)', () => {
    const state = fixture()
    state.shieldEnergy = 2500
    state.shieldsRaised = false
    state.currentSector = [klingon('k1', { row: 4, col: 5 }, 300)]
    const hullBefore = state.hullIntegrity

    endTurn(state, () => 0.5)

    expect(state.hullIntegrity).toBeLessThan(hullBefore) // dano foi tudo pro casco
    expect(state.shieldEnergy).toBe(2500) // alocação intacta, só fora de uso
  })

  it('casco em zero destrói a nave', () => {
    const state = fixture()
    state.hullIntegrity = 0

    const res = endTurn(state, noRolls)

    expect(res.terminalReason).toBe('hull_destroyed')
  })

  it('consumo alto por muitos turnos NÃO mata por esgotamento', () => {
    // Não há `out_of_energy`: o risco de consumir demais é sobrecarga
    // danificando o core, nunca um tanque zerando.
    const state = fixture()
    state.shieldEnergy = 2500
    state.subsystemsOn = { srs: true, lrs: true, photons: true, autoNav: true }

    for (let i = 0; i < 10; i++) endTurn(state, noRolls)

    expect(state.result?.reason).not.toBe('hull_destroyed')
    expect(state.hullIntegrity).toBe(100)
  })

  it('core danificado gera menos e o mesmo consumo passa a estourar (espiral)', () => {
    // Consumo idêntico nos dois; só a integridade do core difere. Se
    // `autoOverload` recebesse o output NOMINAL em vez do efetivo, o core
    // danificado não sofreria mais que o intacto e este teste falharia.
    const healthy = fixture()
    const damaged = fixture()
    damaged.subsystems.warpCore = 40

    for (let i = 0; i < 3; i++) {
      endTurn(healthy, noRolls)
      endTurn(damaged, noRolls)
    }

    const lostHealthy = 100 - healthy.subsystems.warpCore
    const lostDamaged = 40 - damaged.subsystems.warpCore
    expect(lostHealthy).toBe(0)
    expect(lostDamaged).toBeGreaterThan(0)
  })

  it('desligar subsistema é a resposta real ao orçamento apertado', () => {
    const state = fixture()
    state.subsystems.warpCore = 40
    state.shieldEnergy = 2500

    // Com tudo ligado, o core apanha.
    const before = state.subsystems.warpCore
    endTurn(state, noRolls)
    const lostWithAll = before - state.subsystems.warpCore
    expect(lostWithAll).toBeGreaterThan(0)

    // Cortar consumo (baixar escudo, desligar sensores) alivia.
    state.subsystems.warpCore = before
    state.shieldEnergy = 0
    state.subsystemsOn = { srs: false, lrs: false, photons: false, autoNav: false }
    endTurn(state, noRolls)
    const lostTrimmed = before - state.subsystems.warpCore

    expect(lostTrimmed).toBeLessThan(lostWithAll)
  })
})

describe('integração: baixa de inimigo é permanente', () => {
  /** Setor com N inimigos no quadrante atual, refletido na galáxia. */
  function withEnemiesInGalaxy(state: GameState, count: number) {
    const key = `${state.position.quadrant.row},${state.position.quadrant.col}`
    state.galaxy[key] = {
      klingons: count,
      baseIds: [],
      stars: 3,
      planet: false,
      dilithiumCharges: 0,
      surveyed: false,
      clearedEnemies: 0,
    }
    state.currentSector = Array.from({ length: count }, (_, i) =>
      klingon(`k${i}`, { row: 2 + i, col: 2 }, 10),
    )
    state.enemiesLeft = count
    state.weaponsLocked = true
    state.phaserPower = 3000
  }

  it('destruir inimigo grava a baixa na galáxia, não só no setor', () => {
    const state = fixture()
    withEnemiesInGalaxy(state, 2)
    const key = `${state.position.quadrant.row},${state.position.quadrant.col}`

    resolvePlayerTurn(state, { type: 'fire_phasers' }, noRolls)

    // Sem isto, reentrar no quadrante repovoa com os mesmos inimigos.
    expect(state.galaxy[key].clearedEnemies).toBe(2)
    expect(state.enemiesLeft).toBe(0)
  })

  it('sair e voltar ao quadrante NÃO ressuscita quem morreu', () => {
    const state = fixture()
    withEnemiesInGalaxy(state, 2)
    resolvePlayerTurn(state, { type: 'fire_phasers' }, noRolls)
    expect(state.currentSector.filter((e) => e.enemyPower).length).toBe(0)

    // Rematerializa o setor como o hook `onQuadrantEnter` faria ao reentrar.
    const key = `${state.position.quadrant.row},${state.position.quadrant.col}`
    const content = state.galaxy[key]
    const live = Math.max(0, content.klingons - content.clearedEnemies)

    // O exploit era este número voltar a 2: dava pra vencer a partida indo e
    // voltando entre dois setores, porque `enemiesLeft` continuava caindo.
    expect(live).toBe(0)
  })

  it('captura não conta como destruição no rating', () => {
    const state = fixture()
    withEnemiesInGalaxy(state, 1)
    // rng baixo: passa no roll de rendição (30%) e no de interrogatório.
    resolvePlayerTurn(state, { type: 'hail', targetId: 'k0' }, () => 0.01)

    expect(state.klingonsCaptured).toBe(1)
    // Antes o mesmo Klingon somava nos dois contadores e inflava o rating.
    expect(state.klingonsDestroyed).toBe(0)
    expect(state.enemiesLeft).toBe(0)
  })
})

describe('integração: equipe de CdD não fica presa em sistema reparado', () => {
  it('subsistema a 100% dispensa quem estava nele', () => {
    const state = fixture()
    state.subsystems.warp = 99
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'warp'
    state.teams[0].efficiency = 100
    state.teams[0].turnsWorked = 1

    endTurn(state, noRolls)

    expect(state.subsystems.warp).toBe(100)
    expect(state.teams[0].status).toBe('idle')
    expect(state.teams[0].assignedSystem).toBeNull()
  })

  it('equipe exausta vai pra cooldown ao ser dispensada, não pro pool', () => {
    const state = fixture()
    state.subsystems.warp = 99
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'warp'
    state.teams[0].efficiency = 20 // no piso
    state.teams[0].turnsWorked = 9

    endTurn(state, noRolls)

    expect(state.teams[0].status).toBe('cooldown')
  })

  it('sistema ainda danificado mantém a equipe trabalhando', () => {
    const state = fixture()
    state.subsystems.warp = 50
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'warp'
    state.teams[0].efficiency = 100
    state.teams[0].turnsWorked = 1

    endTurn(state, noRolls)

    expect(state.subsystems.warp).toBeLessThan(100)
    expect(state.teams[0].status).toBe('working')
  })
})

describe('integração: combat ligado ao turnEngine', () => {
  it('phaser esfria em turno sem disparo e não esfria em turno com disparo', () => {
    const cooling = fixture()
    cooling.phaserTemp = 200
    endTurn(cooling, noRolls)
    expect(cooling.phaserTemp).toBeLessThan(200)

    const firing = fixture()
    firing.phaserTemp = 200
    firing.currentSector = [klingon('k1', { row: 5, col: 5 })]
    firing.weaponsLocked = true
    firing.phaserPower = 50
    const before = firing.phaserTemp
    resolvePlayerTurn(firing, { type: 'fire_phasers' }, noRolls)
    // Disparo AQUECE; o que importa é não ter passado pelo resfriamento passivo.
    expect(firing.phaserTemp).toBeGreaterThan(before)
  })

  it('estresse de cloak sobe 1× por turno, não 1× por raider', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'r1', type: 'cloaked_raider', position: { row: 1, col: 1 }, cloaked: true, cloakStress: 0 },
      { id: 'r2', type: 'cloaked_raider', position: { row: 2, col: 2 }, cloaked: true, cloakStress: 0 },
    ]

    endTurn(state, noRolls)

    // CLOAK_STRESS_PER_TURN = 4. Com o bug do laço, cada um subiria 8.
    expect(state.currentSector[0].cloakStress).toBe(4)
    expect(state.currentSector[1].cloakStress).toBe(4)
  })
})
