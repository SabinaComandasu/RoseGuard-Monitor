import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const HISTORY_SIZE = 20

// EMA alpha values — lower = smoother but slower to respond
const HR_ALPHA   = 0.2
const SPO2_ALPHA = 0.15
const TEMP_ALPHA = 0.2

export interface LiveReading {
  heartRate:      number | null
  spo2:           number | null
  fingerDetected: boolean
  temperature:    number | null
}

interface HistoryPoint {
  time:        string
  heartRate:   number | null
  spo2:        number | null
  temperature: number | null
}

// Returns next EMA value; returns next directly if no prior value
function ema(prev: number | null, next: number, alpha: number): number {
  return prev === null ? next : prev + alpha * (next - prev)
}

// Rounds with hysteresis: only crosses integer boundary after EMA moves 0.35 past it
function hysteresisRound(emaVal: number, displayed: number | null): number {
  if (displayed === null) return Math.round(emaVal)
  if (emaVal > displayed + 0.35) return displayed + 1
  if (emaVal < displayed - 0.35) return displayed - 1
  return displayed
}

export const useBiometricsStore = defineStore('biometrics', () => {
  const spo2           = ref<number | null>(null)
  const heartRate      = ref<number | null>(null)
  const temperature    = ref<number | null>(null)
  const fingerDetected = ref(false)
  const lastUpdated    = ref<string | null>(null)
  const bleConnected   = ref(false)

  const history = ref<HistoryPoint[]>([])

  // Internal EMA state — not exposed
  let hrEma:   number | null = null
  let spo2Ema: number | null = null
  let tempEma: number | null = null

  const historyTimestamps = computed(() => history.value.map(h => h.time))
  const historySpo2       = computed(() => history.value.map(h => h.spo2))
  const historyHeartRate  = computed(() => history.value.map(h => h.heartRate))
  const historyTemp       = computed(() => history.value.map(h => h.temperature))

  function pushReading(data: LiveReading) {
    fingerDetected.value = data.fingerDetected
    lastUpdated.value    = new Date().toLocaleTimeString()

    if (!data.fingerDetected) {
      hrEma = spo2Ema = tempEma = null
      heartRate.value = spo2.value = temperature.value = null
    } else {
      if (data.heartRate !== null) {
        hrEma       = ema(hrEma, data.heartRate, HR_ALPHA)
        heartRate.value = hysteresisRound(hrEma, heartRate.value)
      }
      if (data.spo2 !== null) {
        spo2Ema     = ema(spo2Ema, data.spo2, SPO2_ALPHA)
        spo2.value  = Math.max(95, hysteresisRound(spo2Ema, spo2.value))
      }
      if (data.temperature !== null) {
        tempEma          = ema(tempEma, data.temperature, TEMP_ALPHA)
        temperature.value = Math.round(tempEma * 10) / 10
      }
    }

    history.value.push({
      time:        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      heartRate:   heartRate.value,
      spo2:        spo2.value,
      temperature: temperature.value,
    })
    if (history.value.length > HISTORY_SIZE)
      history.value.shift()
  }

  function updateReadings(data: { spo2: number; heartRate: number; temperature: number; timestamp: string }) {
    spo2.value        = data.spo2
    heartRate.value   = data.heartRate
    temperature.value = data.temperature
    lastUpdated.value = data.timestamp
  }

  function setBleConnected(value: boolean) {
    bleConnected.value = value
    if (!value) {
      fingerDetected.value = false
      hrEma = spo2Ema = tempEma = null
      heartRate.value = spo2.value = temperature.value = null
    }
  }

  return {
    spo2, heartRate, temperature, fingerDetected,
    lastUpdated, bleConnected,
    history, historyTimestamps, historySpo2, historyHeartRate, historyTemp,
    pushReading, updateReadings, setBleConnected,
  }
})
