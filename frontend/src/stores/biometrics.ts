import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBiometricsStore = defineStore('biometrics', () => {
  const spo2 = ref<number | null>(null)
  const heartRate = ref<number | null>(null)
  const temperature = ref<number | null>(null)
  const lastUpdated = ref<string | null>(null)

  function updateReadings(data: { spo2: number; heartRate: number; temperature: number; timestamp: string }) {
    spo2.value = data.spo2
    heartRate.value = data.heartRate
    temperature.value = data.temperature
    lastUpdated.value = data.timestamp
  }

  return { spo2, heartRate, temperature, lastUpdated, updateReadings }
})
