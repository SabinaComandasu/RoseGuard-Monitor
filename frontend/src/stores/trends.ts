import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTrendsStore = defineStore('trends', () => {
  const spo2Values = ref<number[]>([])
  const spo2Labels = ref<string[]>([])
  const hrValues   = ref<number[]>([])
  const hrLabels   = ref<string[]>([])
  const tempValues = ref<number[]>([])
  const tempLabels = ref<string[]>([])

  const hasChartData = computed(() =>
    spo2Values.value.length > 0 || hrValues.value.length > 0 || tempValues.value.length > 0
  )

  const healthNotifSeen = ref(false)
  function markHealthNotifSeen() { healthNotifSeen.value = true }

  function saveSpo2(values: number[], labels: string[]) { spo2Values.value = values; spo2Labels.value = labels }
  function saveHr  (values: number[], labels: string[]) { hrValues.value   = values; hrLabels.value   = labels }
  function saveTemp(values: number[], labels: string[]) { tempValues.value = values; tempLabels.value = labels }

  return {
    spo2Values, spo2Labels, hrValues, hrLabels, tempValues, tempLabels,
    saveSpo2, saveHr, saveTemp,
    hasChartData, healthNotifSeen, markHealthNotifSeen,
  }
})
