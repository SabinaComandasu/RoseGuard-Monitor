<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

export interface WelcomeChanges {
  weightChanged:   boolean
  sleepChanged:    boolean
  fitnessChanged:  boolean
}

const emit = defineEmits<{ close: [changes: WelcomeChanges | null] }>()

const user = useUserStore()

// Capture values at dialog open so we can diff on save
const initWeight   = user.weightKg
const initSleep    = user.sleepHours
const initFitness  = user.fitnessLevel

const weight       = ref(user.weightKg)
const targetWeight = ref(user.targetWeightKg)
const sleepHours   = ref(user.sleepHours)
const fitnessLevel = ref(user.fitnessLevel)
const medications  = ref(user.medications)

const saving = ref(false)

async function confirm() {
  const changes: WelcomeChanges = {
    weightChanged:  weight.value !== initWeight,
    sleepChanged:   sleepHours.value !== initSleep,
    fitnessChanged: fitnessLevel.value !== initFitness,
  }
  saving.value = true
  user.weightKg       = weight.value
  user.targetWeightKg = targetWeight.value
  user.sleepHours     = sleepHours.value
  user.fitnessLevel   = fitnessLevel.value
  user.medications    = medications.value
  await user.save().catch(() => {})
  saving.value = false
  emit('close', changes)
}

function dismiss() {
  emit('close', null)
}

const fitnessOptions = [
  { value: 'sedentary',   label: 'Sedentary'            },
  { value: 'light',       label: 'Light (1–3×/week)'    },
  { value: 'moderate',    label: 'Moderate (3–5×/week)' },
  { value: 'active',      label: 'Active (6–7×/week)'   },
  { value: 'very_active', label: 'Very Active (athlete)'},
]
</script>

<template>
  <Transition name="dialog-fade">
    <div class="overlay" @click.self="dismiss">
      <div class="dialog" role="dialog" aria-modal="true">
        <div class="dialog-header">
          <span class="wave">👋</span>
          <div>
            <h2>Welcome back, {{ user.firstName || 'there' }}!</h2>
            <p class="subtitle">Just checking in — have any of these changed since your last visit?</p>
          </div>
        </div>

        <div class="fields">
          <div class="field-row">
            <div class="field">
              <label>Weight (kg)</label>
              <input type="number" v-model="weight" min="30" max="300" step="0.5" placeholder="—" />
            </div>
            <div class="field">
              <label>Target weight (kg)</label>
              <input type="number" v-model="targetWeight" min="30" max="300" step="0.5" placeholder="—" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Sleep hours / night</label>
              <input type="number" v-model="sleepHours" min="1" max="24" step="0.5" placeholder="—" />
            </div>
            <div class="field">
              <label>Fitness level</label>
              <select v-model="fitnessLevel">
                <option value="">— select —</option>
                <option v-for="o in fitnessOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
          </div>

          <div class="field full">
            <label>Current medications</label>
            <textarea v-model="medications" rows="2" placeholder="None" />
          </div>
        </div>

        <div class="actions">
          <button class="btn-ghost" @click="dismiss">Everything looks good</button>
          <button class="btn-primary" :disabled="saving" @click="confirm">
            <i v-if="saving" class="pi pi-spin pi-spinner" />
            Save changes
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--color-bg, #fff);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  padding: 32px 36px;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.wave {
  font-size: 36px;
  line-height: 1;
  flex-shrink: 0;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary, #1a1a2e);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13.5px;
  color: var(--color-text-secondary, #78909c);
  line-height: 1.45;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field.full {
  grid-column: 1 / -1;
}

label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-secondary, #78909c);
}

input,
select,
textarea {
  padding: 8px 11px;
  border: 1.5px solid var(--color-border, #e8eaf6);
  border-radius: 8px;
  background: var(--color-surface, #f8f9fc);
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary, #1a1a2e);
  transition: border-color 0.15s ease;
  resize: none;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--color-primary, #e91e8c);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-ghost {
  padding: 9px 18px;
  background: transparent;
  border: 1.5px solid var(--color-border, #e8eaf6);
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-secondary, #78909c);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn-ghost:hover {
  background: var(--color-surface, #f8f9fc);
  border-color: #ccc;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  background: var(--color-primary, #e91e8c);
  border: none;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease, transform 0.1s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #c9186f;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-active .dialog,
.dialog-fade-leave-active .dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog,
.dialog-fade-leave-to .dialog {
  transform: translateY(12px);
  opacity: 0;
}
</style>
