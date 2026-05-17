export function playPop() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(480, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.42, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.07)
    osc.onended = () => ctx.close()
  } catch {}
}
