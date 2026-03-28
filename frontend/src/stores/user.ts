import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const name = ref('')
  const age = ref<number | null>(null)
  const sex = ref('')
  const heightCm = ref<number | null>(null)
  const weightKg = ref<number | null>(null)
  const conditions = ref('')
  const medications = ref('')
  const fitnessLevel = ref('')

  return { name, age, sex, heightCm, weightKg, conditions, medications, fitnessLevel }
})
