import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useHealthAdviceStore = defineStore('healthAdvice', () => {
  const bmiUnlocked      = ref(false)
  const sleepUnlocked    = ref(false)
  const activityUnlocked = ref(false)
  const notifSeen        = ref(false)

  const hasAny = computed(() =>
    bmiUnlocked.value || sleepUnlocked.value || activityUnlocked.value
  )

  const unlockedCount = computed(() =>
    [bmiUnlocked.value, sleepUnlocked.value, activityUnlocked.value].filter(Boolean).length
  )

  function evaluate(
    bmi: number | null, sleep: number | null, fitness: string,
    changed: { weightChanged: boolean; sleepChanged: boolean; fitnessChanged: boolean },
  ) {
    if (changed.weightChanged)  bmiUnlocked.value      = bmi !== null && (bmi < 18.5 || bmi >= 25)
    if (changed.sleepChanged)   sleepUnlocked.value    = sleep !== null && (sleep < 6 || sleep > 9)
    if (changed.fitnessChanged) activityUnlocked.value = fitness.toLowerCase() === 'sedentary'
    notifSeen.value = false
  }

  function markSeen() { notifSeen.value = true }

  return {
    bmiUnlocked, sleepUnlocked, activityUnlocked,
    hasAny, unlockedCount, notifSeen,
    evaluate, markSeen,
  }
})
