import confirmSound from '@/assets/audio/computerbeep_17.mp3'
import redAlertSound from '@/assets/audio/tos_red_alert.mp3'
import denySound from '@/assets/audio/tactinput_neg_acknowledge.webm'
import warpEnterSound from '@/assets/audio/tng_warp3_clean.mp3'
import warpExitSound from '@/assets/audio/tng_warp_exit.mp3'
import phaserSound from '@/assets/audio/tos_ship_phaseer_2.mp3'
import torpedoSound from '@/assets/audio/tos_photon_torpedo.mp3'
import probeLaunchSound from '@/assets/audio/probe_launch_1.mp3'
import hailSound from '@/assets/audio/hailalert_1.mp3'
import transporterSound from '@/assets/audio/tos_transporter1_top.mp3'
import powerUpSound from '@/assets/audio/power_up2_clean.mp3'
import powerDownSound from '@/assets/audio/power_down.mp3'
import wcBreachSound from '@/assets/audio/alert10.mp3'
import shieldSizzleSound from '@/assets/audio/shield_sizzle.mp3'
import hullHit1Sound from '@/assets/audio/tos_hullhit_1.mp3'
import hullHit2Sound from '@/assets/audio/tos_hullhit_2.mp3'
import hullHit3Sound from '@/assets/audio/tos_hullhit_3.mp3'
import hullHit4Sound from '@/assets/audio/tos_hullhit_4.mp3'
import explosionSound from '@/assets/audio/largeexplosion4.mp3'

export const Sound = {
  CONFIRM: 'confirm',
  RED_ALERT: 'red_alert',
  DENY: 'deny',
  WARP_ENTER: 'warp_enter',
  WARP_EXIT: 'warp_exit',
  PHASER: 'phaser',
  TORPEDO: 'torpedo',
  PROBE_LAUNCH: 'probe_launch',
  HAIL: 'hail',
  TRANSPORTER: 'transporter',
  POWER_UP: 'power_up',
  POWER_DOWN: 'power_down',
  WC_BREACH: 'wc_breach',
  SHIELD_SIZZLE: 'shield_sizzle',
  HULL_HIT_1: 'hull_hit_1',
  HULL_HIT_2: 'hull_hit_2',
  HULL_HIT_3: 'hull_hit_3',
  HULL_HIT_4: 'hull_hit_4',
  EXPLOSION: 'explosion'
} as const

export type SoundKey = typeof Sound[keyof typeof Sound]

const sources: Record<SoundKey, string> = {
  [Sound.CONFIRM]: confirmSound,
  [Sound.RED_ALERT]: redAlertSound,
  [Sound.DENY]: denySound,
  [Sound.WARP_ENTER]: warpEnterSound,
  [Sound.WARP_EXIT]: warpExitSound,
  [Sound.PHASER]: phaserSound,
  [Sound.TORPEDO]: torpedoSound,
  [Sound.PROBE_LAUNCH]: probeLaunchSound,
  [Sound.HAIL]: hailSound,
  [Sound.TRANSPORTER]: transporterSound,
  [Sound.POWER_UP]: powerUpSound,
  [Sound.POWER_DOWN]: powerDownSound,
  [Sound.WC_BREACH]: wcBreachSound,
  [Sound.SHIELD_SIZZLE]: shieldSizzleSound,
  [Sound.HULL_HIT_1]: hullHit1Sound,
  [Sound.HULL_HIT_2]: hullHit2Sound,
  [Sound.HULL_HIT_3]: hullHit3Sound,
  [Sound.HULL_HIT_4]: hullHit4Sound,
  [Sound.EXPLOSION]: explosionSound
}

/**
 * As 4 variantes de acerto de casco, pra sortear a cada golpe. Uma amostra só,
 * repetida numa troca longa de tiros, lê como loop travado em vez de golpes
 * sucessivos.
 */
export const HULL_HIT_SOUNDS = [
  Sound.HULL_HIT_1,
  Sound.HULL_HIT_2,
  Sound.HULL_HIT_3,
  Sound.HULL_HIT_4
] as const

// Duração máxima em ms antes de cortar o som (ex: alerta vermelho é longo
// demais pra tocar inteiro toda vez que dispara).
const maxDuration: Partial<Record<SoundKey, number>> = {
  [Sound.RED_ALERT]: 5000,
  [Sound.PHASER]: 3000,
  [Sound.TRANSPORTER]: 3000,
  // Som de impacto não pode sobreviver ao evento que o causou: a fila encena um
  // evento a cada `TURN_EVENT_PRESENT_MS` (650), então uma amostra de 3s ainda
  // estaria tocando 4 eventos depois. O corte é folgado o bastante pra não soar
  // truncado, curto o bastante pra não empilhar.
  [Sound.SHIELD_SIZZLE]: 1200,
  [Sound.HULL_HIT_1]: 1200,
  [Sound.HULL_HIT_2]: 1200,
  [Sound.HULL_HIT_3]: 1200,
  [Sound.HULL_HIT_4]: 1200,
  [Sound.EXPLOSION]: 2000
}

const pool = new Map<SoundKey, HTMLAudioElement>()
const stopTimers = new Map<SoundKey, ReturnType<typeof setTimeout>>()

function getAudio(key: SoundKey): HTMLAudioElement {
  let audio = pool.get(key)
  if (!audio) {
    audio = new Audio(sources[key])
    pool.set(key, audio)
  }
  return audio
}

export function useSound() {
  const playSound = (key: SoundKey) => {
    const audio = getAudio(key)
    audio.currentTime = 0
    void audio.play()

    clearTimeout(stopTimers.get(key))
    const limit = maxDuration[key]
    if (limit !== undefined) {
      stopTimers.set(
        key,
        setTimeout(() => {
          audio.pause()
          audio.currentTime = 0
        }, limit)
      )
    }
  }

  return { playSound }
}
