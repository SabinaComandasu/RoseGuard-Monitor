<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'

const user = useUserStore()

const dateOfBirth      = ref(user.dateOfBirth)
const sex              = ref(user.sex)
const heightCm         = ref(user.heightCm)
const weightKg         = ref(user.weightKg)
const targetWeightKg   = ref(user.targetWeightKg)
const sleepHours       = ref(user.sleepHours)
const fitnessLevel     = ref(user.fitnessLevel)
const smokingStatus    = ref(user.smokingStatus)
const alcoholConsumption = ref(user.alcoholConsumption)

const emit = defineEmits<{ saved: [] }>()

const saving = ref(false)

const canSave = computed(() =>
  !!dateOfBirth.value && !!sex.value && !!heightCm.value && !!weightKg.value
)

async function save() {
  if (!canSave.value) return
  saving.value = true
  user.dateOfBirth        = dateOfBirth.value
  user.sex                = sex.value
  user.heightCm           = heightCm.value
  user.weightKg           = weightKg.value
  user.targetWeightKg     = targetWeightKg.value
  user.sleepHours         = sleepHours.value
  user.fitnessLevel       = fitnessLevel.value
  user.smokingStatus      = smokingStatus.value
  user.alcoholConsumption = alcoholConsumption.value
  await user.save().catch(() => {})
  saving.value = false
  emit('saved')
}
</script>

<template>
  <div class="overlay">
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="dialog-header">
        <div class="icon-wrap"><i class="pi pi-heart-fill" /></div>
        <div>
          <h2>Welcome to RoseGuard!</h2>
          <p class="subtitle">
            Fill in a few details so your dashboard can show meaningful health insights.
            Fields marked <span class="req-mark">*</span> are required.
          </p>
        </div>
      </div>

      <div class="sections">
        <!-- Basic info -->
        <div class="section-title">Basic info</div>
        <div class="field-row">
          <div class="field">
            <label>Date of birth <span class="req-mark">*</span></label>
            <input type="date" v-model="dateOfBirth" />
          </div>
          <div class="field">
            <label>Sex <span class="req-mark">*</span></label>
            <select v-model="sex">
              <option value="" disabled>Select sex</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </select>
          </div>
        </div>

        <!-- Physical -->
        <div class="section-title">Physical</div>
        <div class="field-row col3">
          <div class="field">
            <label>Height (cm) <span class="req-mark">*</span></label>
            <input type="number" v-model="heightCm" min="50" max="250" step="1" placeholder="e.g. 170" />
          </div>
          <div class="field">
            <label>Weight (kg) <span class="req-mark">*</span></label>
            <input type="number" v-model="weightKg" min="20" max="300" step="0.5" placeholder="e.g. 70" />
          </div>
          <div class="field">
            <label>Target weight (kg)</label>
            <input type="number" v-model="targetWeightKg" min="20" max="300" step="0.5" placeholder="optional" />
          </div>
        </div>

        <!-- Lifestyle -->
        <div class="section-title">Lifestyle</div>
        <div class="field-row">
          <div class="field">
            <label>Sleep hours / night</label>
            <input type="number" v-model="sleepHours" min="1" max="24" step="0.5" placeholder="e.g. 7.5" />
          </div>
          <div class="field">
            <label>Fitness level</label>
            <select v-model="fitnessLevel">
              <option value="" disabled>Select level</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light (1–3×/week)</option>
              <option value="moderate">Moderate (3–5×/week)</option>
              <option value="active">Active (6–7×/week)</option>
              <option value="very_active">Very Active (athlete)</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Smoking status</label>
            <select v-model="smokingStatus">
              <option value="" disabled>Select status</option>
              <option value="never">Never smoked</option>
              <option value="former">Former smoker</option>
              <option value="occasional">Occasional smoker</option>
              <option value="current">Current smoker</option>
            </select>
          </div>
          <div class="field">
            <label>Alcohol consumption</label>
            <select v-model="alcoholConsumption">
              <option value="" disabled>Select frequency</option>
              <option value="none">None</option>
              <option value="occasional">Occasional (1–2×/month)</option>
              <option value="moderate">Moderate (1–2×/week)</option>
              <option value="regular">Regular (3+×/week)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" :disabled="!canSave || saving" @click="save">
          <i v-if="saving" class="pi pi-spin pi-spinner" />
          <i v-else class="pi pi-check" />
          Save &amp; continue
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.dialog {
  background: var(--color-bg, #fff);
  border-radius: 18px;
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.22);
  padding: 36px 40px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(233, 30, 140, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-wrap .pi {
  font-size: 22px;
  color: var(--color-primary, #e91e8c);
}

h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  color: var(--color-text-primary, #1a1a2e);
}

.subtitle {
  margin: 5px 0 0;
  font-size: 13.5px;
  color: var(--color-text-secondary, #78909c);
  line-height: 1.5;
}

.req-mark {
  color: var(--color-primary, #e91e8c);
  font-weight: 700;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-primary, #e91e8c);
  margin-top: 6px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field-row.col3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-secondary, #78909c);
}

input,
select {
  padding: 9px 12px;
  border: 1.5px solid var(--color-border, #e8eaf6);
  border-radius: 9px;
  background: var(--color-surface, #f8f9fc);
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary, #1a1a2e);
  transition: border-color 0.15s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--color-primary, #e91e8c);
}

.actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 28px;
  background: var(--color-primary, #e91e8c);
  border: none;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #c9186f;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(233, 30, 140, 0.35);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
