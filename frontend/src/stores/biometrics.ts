import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const HISTORY_SIZE = 20

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

export const useBiometricsStore = defineStore('biometrics', () => {
  const spo2           = ref<number | null>(null)
  const heartRate      = ref<number | null>(null)
  const temperature    = ref<number | null>(null)
  const fingerDetected = ref(false)
  const lastUpdated    = ref<string | null>(null)
  const bleConnected   = ref(false)

  const history = ref<HistoryPoint[]>([])

  const historyTimestamps = computed(() => history.value.map(h => h.time))
  const historySpo2       = computed(() => history.value.map(h => h.spo2))
  const historyHeartRate  = computed(() => history.value.map(h => h.heartRate))
  const historyTemp       = computed(() => history.value.map(h => h.temperature))

  function pushReading(data: LiveReading) {
    spo2.value           = data.spo2
    heartRate.value      = data.heartRate
    temperature.value    = data.temperature
    fingerDetected.value = data.fingerDetected
    lastUpdated.value    = new Date().toLocaleTimeString()

    history.value.push({
      time:        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      heartRate:   data.heartRate,
      spo2:        data.spo2,
      temperature: data.temperature,
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
    if (!value) fingerDetected.value = false
  }

  return {
    spo2, heartRate, temperature, fingerDetected,
    lastUpdated, bleConnected,
    history, historyTimestamps, historySpo2, historyHeartRate, historyTemp,
    pushReading, updateReadings, setBleConnected,
  }
})
