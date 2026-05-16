import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

const FITNESS_NORM: Record<string, string> = {
  'Sedentary':          'sedentary',
  'Lightly Active':     'light',
  'Moderately Active':  'moderate',
  'Very Active':        'very_active',
  'Athlete':            'very_active',
}
function normalizeFitness(val: string) {
  return FITNESS_NORM[val] ?? val
}

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

  const isProfileComplete = computed(() =>
    !!dateOfBirth.value && !!sex.value && !!heightCm.value && !!weightKg.value
  )

  async function load() {
    const { data } = await api.get('/profile').catch(() => ({ data: {} }))
    firstName.value          = data.firstName ?? ''
    lastName.value           = data.lastName ?? ''
    email.value              = data.email ?? ''
    dateOfBirth.value        = data.dateOfBirth ?? ''
    sex.value                = data.sex ?? ''
    bloodType.value          = data.bloodType ?? ''
    phone.value              = data.phone ?? ''
    avatarUrl.value          = data.avatarUrl ?? ''
    heightCm.value           = data.heightCm ?? null
    weightKg.value           = data.weightKg ?? null
    targetWeightKg.value     = data.targetWeightKg ?? null
    conditions.value         = data.conditions ?? ''
    medications.value        = data.medications ?? ''
    allergies.value          = data.allergies ?? ''
    fitnessLevel.value       = normalizeFitness(data.fitnessLevel ?? '')
    smokingStatus.value      = data.smokingStatus ?? ''
    alcoholConsumption.value = data.alcoholConsumption ?? ''
    sleepHours.value         = data.sleepHours ?? null
    emergencyName.value      = data.emergencyName ?? ''
    emergencyPhone.value     = data.emergencyPhone ?? ''
    emergencyRelationship.value = data.emergencyRelationship ?? ''
  }

  async function save() {
    await api.put('/profile', {
      firstName:            firstName.value,
      lastName:             lastName.value,
      dateOfBirth:          dateOfBirth.value || null,
      sex:                  sex.value || null,
      bloodType:            bloodType.value || null,
      phone:                phone.value || null,
      avatarUrl:            avatarUrl.value || null,
      heightCm:             heightCm.value,
      weightKg:             weightKg.value,
      targetWeightKg:       targetWeightKg.value,
      conditions:           conditions.value || null,
      medications:          medications.value || null,
      allergies:            allergies.value || null,
      fitnessLevel:         fitnessLevel.value || null,
      smokingStatus:        smokingStatus.value || null,
      alcoholConsumption:   alcoholConsumption.value || null,
      sleepHours:           sleepHours.value,
      emergencyName:        emergencyName.value || null,
      emergencyPhone:       emergencyPhone.value || null,
      emergencyRelationship: emergencyRelationship.value || null,
    })
  }

  return {
    firstName, lastName, dateOfBirth, sex, bloodType, email, phone, avatarUrl,
    heightCm, weightKg, targetWeightKg,
    conditions, medications, allergies,
    fitnessLevel, smokingStatus, alcoholConsumption, sleepHours,
    emergencyName, emergencyPhone, emergencyRelationship,
    bmi, age, fullName, isProfileComplete,
    load, save,
  }
})
