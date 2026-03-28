import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // Personal
  const firstName = ref('')
  const lastName = ref('')
  const dateOfBirth = ref('')
  const sex = ref('')
  const bloodType = ref('')
  const email = ref('')
  const phone = ref('')
  const avatarUrl = ref('')

  // Physical
  const heightCm = ref<number | null>(null)
  const weightKg = ref<number | null>(null)
  const targetWeightKg = ref<number | null>(null)

  // Medical
  const conditions = ref('')
  const medications = ref('')
  const allergies = ref('')

  // Lifestyle
  const fitnessLevel = ref('')
  const smokingStatus = ref('')
  const alcoholConsumption = ref('')
  const sleepHours = ref<number | null>(null)

  // Emergency contact
  const emergencyName = ref('')
  const emergencyPhone = ref('')
  const emergencyRelationship = ref('')

  // Computed
  const bmi = computed(() => {
    if (!heightCm.value || !weightKg.value) return null
    const h = heightCm.value / 100
    return Math.round((weightKg.value / (h * h)) * 10) / 10
  })

  const age = computed(() => {
    if (!dateOfBirth.value) return null
    const diff = Date.now() - new Date(dateOfBirth.value).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  })

  const fullName = computed(() => [firstName.value, lastName.value].filter(Boolean).join(' '))

  return {
    firstName, lastName, dateOfBirth, sex, bloodType, email, phone, avatarUrl,
    heightCm, weightKg, targetWeightKg,
    conditions, medications, allergies,
    fitnessLevel, smokingStatus, alcoholConsumption, sleepHours,
    emergencyName, emergencyPhone, emergencyRelationship,
    bmi, age, fullName,
  }
})
