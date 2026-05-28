/**
 * Sound Effects — Uses Web Audio API to generate game sounds.
 * No external audio files needed.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = "square", volume = 0.3) {
  try {
    const ctx = getAudioContext()
    if (ctx.state === "suspended") ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not supported or blocked
  }
}

/** Countdown beep (3, 2, 1) */
export function playCountdownBeep() {
  playTone(440, 0.15, "square", 0.2)
}

/** Countdown final beep (GO!) */
export function playCountdownGo() {
  playTone(880, 0.3, "square", 0.3)
}

/** Timer warning (last 10 seconds) */
export function playTimerWarning() {
  playTone(600, 0.1, "sine", 0.15)
}

/** Timer urgent (last 5 seconds) */
export function playTimerUrgent() {
  playTone(800, 0.12, "square", 0.25)
}

/** Win sound — ascending notes */
export function playWinSound() {
  const ctx = getAudioContext()
  if (ctx.state === "suspended") ctx.resume()

  const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "square", 0.25), i * 120)
  })
}

/** Lose sound — descending notes */
export function playLoseSound() {
  const ctx = getAudioContext()
  if (ctx.state === "suspended") ctx.resume()

  const notes = [400, 350, 300, 250]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "sawtooth", 0.15), i * 150)
  })
}

/** Submit drawing sound */
export function playSubmitSound() {
  playTone(660, 0.1, "sine", 0.2)
  setTimeout(() => playTone(880, 0.15, "sine", 0.2), 100)
}

/** Chat message received */
export function playChatSound() {
  playTone(1200, 0.05, "sine", 0.1)
}
