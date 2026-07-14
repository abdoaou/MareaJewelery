// Short notification chime (WAV) — works better on mobile than Web Audio alone
const CHIME_SRC =
  'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTBAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

let audio: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null
let unlocked = false

function getAudio() {
  if (!audio) {
    audio = new Audio(CHIME_SRC)
    audio.preload = 'auto'
  }
  return audio
}

/** Call after a user tap/click so sound works on iOS and Android. */
export async function unlockNotificationAudio() {
  if (unlocked) return true
  try {
    const el = getAudio()
    el.volume = 0.01
    await el.play()
    el.pause()
    el.currentTime = 0
    el.volume = 1
    unlocked = true
    return true
  } catch {
    try {
      if (!audioCtx) audioCtx = new AudioContext()
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      unlocked = true
      return true
    } catch {
      return false
    }
  }
}

function playWebAudioChime() {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') void audioCtx.resume()

  const ctx = audioCtx
  const t = ctx.currentTime

  const playTone = (freq: number, start: number, duration: number, volume = 0.25) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.start(start)
    osc.stop(start + duration)
  }

  playTone(880, t, 0.2)
  playTone(1174.66, t + 0.14, 0.35, 0.2)
}

/** Play notification sound + vibration on mobile */
export function playNotificationSound() {
  vibrateDevice()

  if (unlocked) {
    try {
      playWebAudioChime()
      return
    } catch {
      // fall through
    }
  }

  const el = getAudio()
  el.currentTime = 0
  el.volume = 1
  void el.play().catch(() => {
    try {
      playWebAudioChime()
    } catch {
      // blocked until user interacts
    }
  })
}

export function vibrateDevice() {
  if ('vibrate' in navigator) {
    navigator.vibrate([120, 60, 120])
  }
}

export function isAudioUnlocked() {
  return unlocked
}
