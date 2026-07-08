const NATURAL_VOICE_HINTS = ['natural', 'neural', 'online', 'enhanced', 'premium']

const FEMALE_VOICE_HINTS = [
  'female', 'zira', 'samantha', 'susan', 'victoria', 'karen', 'moira',
  'tessa', 'fiona', 'aria', 'jenny', 'google uk english female', 'google us english',
]

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  let score = 0
  if (NATURAL_VOICE_HINTS.some(hint => name.includes(hint))) score += 10
  if (FEMALE_VOICE_HINTS.some(hint => name.includes(hint))) score += 1
  return score
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter(v => v.lang.toLowerCase().startsWith('en'))
  const pool = english.length ? english : voices
  if (!pool.length) return undefined
  return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
}

function speakWithVoices(text: string, voices: SpeechSynthesisVoice[]) {
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(voices)
  if (voice) utterance.voice = voice
  utterance.rate = 1
  utterance.pitch = 1.02
  utterance.volume = 1
  window.speechSynthesis.speak(utterance)
}

export function speakPrompt(text: string) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      speakWithVoices(text, voices)
    } else {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => speakWithVoices(text, window.speechSynthesis.getVoices()),
        { once: true }
      )
    }
  } catch {}
}
