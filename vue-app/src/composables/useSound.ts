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
  WC_BREACH: 'wc_breach'
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
  [Sound.WC_BREACH]: wcBreachSound
}

// Duração máxima em ms antes de cortar o som (ex: alerta vermelho é longo
// demais pra tocar inteiro toda vez que dispara).
const maxDuration: Partial<Record<SoundKey, number>> = {
  [Sound.RED_ALERT]: 5000,
  [Sound.PHASER]: 3000,
  [Sound.TRANSPORTER]: 3000
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
