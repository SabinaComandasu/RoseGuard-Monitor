<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const user = useUserStore()

const saved = ref(false)
const saving = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

onMounted(() => { user.load().catch(() => {}) })

function onAvatarClick() {
  avatarInput.value?.click()
}

function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { user.avatarUrl = ev.target?.result as string }
  reader.readAsDataURL(file)
}

async function saveProfile() {
  saving.value = true
  try {
    await user.save()
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } finally {
    saving.value = false
  }
}

const bmiLabel = computed(() => {
  const b = user.bmi
  if (b === null) return null
  if (b < 18.5) return { text: 'Underweight', cls: 'warning' }
  if (b < 25)   return { text: 'Normal', cls: 'normal' }
  if (b < 30)   return { text: 'Overweight', cls: 'warning' }
  return { text: 'Obese', cls: 'critical' }
})

const fitnessOptions = [
  { value: 'sedentary',  label: 'Sedentary',  desc: 'Little or no exercise', icon: 'pi pi-minus-circle' },
  { value: 'light',      label: 'Light',       desc: '1–3 days/week', icon: 'pi pi-sun' },
  { value: 'moderate',   label: 'Moderate',    desc: '3–5 days/week', icon: 'pi pi-bolt' },
  { value: 'active',     label: 'Active',      desc: '6–7 days/week', icon: 'pi pi-star' },
  { value: 'very_active',label: 'Very Active', desc: 'Athlete level', icon: 'pi pi-heart' },
]

const initials = computed(() => {
  const f = user.firstName?.[0] ?? ''
  const l = user.lastName?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
})
</script>

<template>
  <div class="page">
    <div class="page-header animate-s" style="--s-delay:0s">
      <h1>Profile</h1>
      <p>Manage your personal information and health details</p>
    </div>

    <!-- Avatar + name header card -->
    <div class="profile-header-card card animate-s" style="--s-delay:0.06s">
      <div class="avatar-section">
        <div class="avatar-wrap" @click="onAvatarClick">
          <img v-if="user.avatarUrl" :src="user.avatarUrl" class="avatar-img" alt="Profile" />
          <div v-else class="avatar-placeholder">{{ initials }}</div>
          <div class="avatar-overlay">
            <i class="pi pi-camera" />
            <span>Change</span>
          </div>
        </div>
        <input ref="avatarInput" type="file" accept="image/*" class="hidden-input" @change="onAvatarChange" />

        <div class="profile-meta">
          <div class="profile-name">{{ user.fullName || 'Your Name' }}</div>
          <div class="profile-sub">
            <span v-if="user.age">{{ user.age }} years old</span>
            <span v-if="user.age && user.sex"> · </span>
            <span v-if="user.sex">{{ user.sex }}</span>
            <span v-if="(user.age || user.sex) && user.bmi"> · </span>
            <span v-if="user.bmi">BMI {{ user.bmi }}</span>
          </div>
          <div class="quick-stats">
            <div class="quick-stat">
              <span class="qs-value">{{ user.heightCm ?? '-' }}</span>
              <span class="qs-label">cm</span>
            </div>
            <div class="qs-divider" />
            <div class="quick-stat">
              <span class="qs-value">{{ user.weightKg ?? '-' }}</span>
              <span class="qs-label">kg</span>
            </div>
            <div class="qs-divider" />
            <div class="quick-stat">
              <span class="qs-value" :class="bmiLabel?.cls">{{ user.bmi ?? '-' }}</span>
              <span class="qs-label">BMI</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-grid">
      <!-- Personal Information -->
      <div class="section-card card animate-s" style="--s-delay:0.12s">
        <div class="section-card-header">
          <div class="section-icon"><i class="pi pi-user" /></div>
          <div>
            <div class="section-card-title">Personal Information</div>
            <div class="section-card-sub">Basic identity details</div>
          </div>
        </div>

        <div class="fields-grid">
          <div class="field">
            <label>First Name</label>
            <input v-model="user.firstName" type="text" placeholder="e.g. Maria" />
          </div>
          <div class="field">
            <label>Last Name</label>
            <input v-model="user.lastName" type="text" placeholder="e.g. Ionescu" />
          </div>
          <div class="field">
            <label>Date of Birth</label>
            <input v-model="user.dateOfBirth" type="date" />
          </div>
          <div class="field">
            <label>Sex</label>
            <select v-model="user.sex">
              <option value="" disabled>Select sex</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          <div class="field">
            <label>Blood Type</label>
            <select v-model="user.bloodType">
              <option value="" disabled>Select blood type</option>
              <option>A+</option><option>A−</option>
              <option>B+</option><option>B−</option>
              <option>AB+</option><option>AB−</option>
              <option>O+</option><option>O−</option>
              <option>Unknown</option>
            </select>
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="user.email" type="email" placeholder="you@example.com" />
          </div>
          <div class="field full-width">
            <label>Phone</label>
            <input v-model="user.phone" type="tel" placeholder="+40 700 000 000" />
          </div>
        </div>
      </div>

      <!-- Physical Measurements -->
      <div class="section-card card animate-s" style="--s-delay:0.18s">
        <div class="section-card-header">
          <div class="section-icon"><i class="pi pi-chart-bar" /></div>
          <div>
            <div class="section-card-title">Physical Measurements</div>
            <div class="section-card-sub">Used for KPI calculations</div>
          </div>
        </div>

        <div class="fields-grid">
          <div class="field">
            <label>Height</label>
            <div class="input-unit-wrap">
              <input v-model.number="user.heightCm" type="number" placeholder="e.g. 165" min="100" max="250" />
              <span class="unit-badge">cm</span>
            </div>
          </div>
          <div class="field">
            <label>Weight</label>
            <div class="input-unit-wrap">
              <input v-model.number="user.weightKg" type="number" placeholder="e.g. 60" min="20" max="300" />
              <span class="unit-badge">kg</span>
            </div>
          </div>
          <div class="field">
            <label>Target Weight <span class="optional">(optional)</span></label>
            <div class="input-unit-wrap">
              <input v-model.number="user.targetWeightKg" type="number" placeholder="e.g. 58" min="20" max="300" />
              <span class="unit-badge">kg</span>
            </div>
          </div>
          <div class="field">
            <label>BMI <span class="optional">(calculated)</span></label>
            <div class="bmi-display" :class="bmiLabel?.cls ?? 'unknown'">
              <span class="bmi-value">{{ user.bmi ?? '-' }}</span>
              <span v-if="bmiLabel" class="status-badge" :class="bmiLabel.cls">{{ bmiLabel.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Medical History -->
    <div class="section-card card animate-s" style="--s-delay:0.24s">
      <div class="section-card-header">
        <div class="section-icon warning"><i class="pi pi-heart" /></div>
        <div>
          <div class="section-card-title">Medical History</div>
          <div class="section-card-sub">Helps the AI assistant give more accurate insights</div>
        </div>
      </div>

      <div class="fields-grid col3">
        <div class="field">
          <label>Known Medical Conditions</label>
          <textarea v-model="user.conditions" rows="3" placeholder="e.g. Type 2 Diabetes, Hypertension" />
        </div>
        <div class="field">
          <label>Current Medications</label>
          <textarea v-model="user.medications" rows="3" placeholder="e.g. Metformin 500mg, Lisinopril 10mg" />
        </div>
        <div class="field">
          <label>Allergies</label>
          <textarea v-model="user.allergies" rows="3" placeholder="e.g. Penicillin, Aspirin, Pollen" />
        </div>
      </div>
    </div>

    <!-- Lifestyle -->
    <div class="section-card card animate-s" style="--s-delay:0.3s">
      <div class="section-card-header">
        <div class="section-icon"><i class="pi pi-star" /></div>
        <div>
          <div class="section-card-title">Lifestyle</div>
          <div class="section-card-sub">Factors that affect your health KPIs</div>
        </div>
      </div>

      <div class="lifestyle-section">
        <label class="lifestyle-label">Fitness Level</label>
        <div class="fitness-options">
          <button
            v-for="opt in fitnessOptions"
            :key="opt.value"
            class="fitness-opt"
            :class="{ active: user.fitnessLevel === opt.value }"
            type="button"
            @click="user.fitnessLevel = opt.value"
          >
            <i :class="opt.icon" />
            <span class="fo-label">{{ opt.label }}</span>
            <span class="fo-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <div class="fields-grid" style="margin-top:20px">
        <div class="field">
          <label>Smoking Status</label>
          <select v-model="user.smokingStatus">
            <option value="" disabled>Select status</option>
            <option value="never">Never smoked</option>
            <option value="former">Former smoker</option>
            <option value="occasional">Occasional smoker</option>
            <option value="current">Current smoker</option>
          </select>
        </div>
        <div class="field">
          <label>Alcohol Consumption</label>
          <select v-model="user.alcoholConsumption">
            <option value="" disabled>Select frequency</option>
            <option value="none">None</option>
            <option value="occasional">Occasional (1–2×/month)</option>
            <option value="moderate">Moderate (1–2×/week)</option>
            <option value="regular">Regular (3+×/week)</option>
          </select>
        </div>
        <div class="field">
          <label>Average Sleep</label>
          <div class="input-unit-wrap">
            <input v-model.number="user.sleepHours" type="number" placeholder="e.g. 7" min="1" max="16" step="0.5" />
            <span class="unit-badge">hrs/night</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Emergency Contact -->
    <div class="section-card card animate-s" style="--s-delay:0.36s">
      <div class="section-card-header">
        <div class="section-icon critical"><i class="pi pi-phone" /></div>
        <div>
          <div class="section-card-title">Emergency Contact</div>
          <div class="section-card-sub">Person to contact in case of a health emergency</div>
        </div>
      </div>

      <div class="fields-grid">
        <div class="field">
          <label>Contact Name</label>
          <input v-model="user.emergencyName" type="text" placeholder="e.g. Ana Ionescu" />
        </div>
        <div class="field">
          <label>Phone Number</label>
          <input v-model="user.emergencyPhone" type="tel" placeholder="+40 700 000 000" />
        </div>
        <div class="field">
          <label>Relationship</label>
          <select v-model="user.emergencyRelationship">
            <option value="" disabled>Select relationship</option>
            <option>Parent</option>
            <option>Spouse / Partner</option>
            <option>Sibling</option>
            <option>Child</option>
            <option>Friend</option>
            <option>Other</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Save button -->
    <div class="save-row animate-s" style="--s-delay:0.42s">
      <Transition name="saved">
        <div v-if="saved" class="saved-msg">
          <i class="pi pi-check-circle" /> Profile saved successfully
        </div>
      </Transition>
      <button class="save-btn" :disabled="saving" @click="saveProfile">
        <i :class="saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'" />
        {{ saving ? 'Saving…' : 'Save Profile' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Entrance */
.animate-s { animation: fade-up 0.45s ease var(--s-delay, 0s) both; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- Profile header card ---- */
.profile-header-card {
  padding: 28px 32px;
  margin-bottom: 20px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 28px;
}

.avatar-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-img,
.avatar-placeholder {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary-light);
}

.avatar-placeholder {
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(233, 30, 140, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-overlay i { font-size: 18px; }

.avatar-wrap:hover .avatar-overlay { opacity: 1; }

.hidden-input { display: none; }

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.3px;
}

.profile-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.quick-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 6px;
}

.quick-stat {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.qs-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.qs-value.normal   { color: var(--color-normal); }
.qs-value.warning  { color: var(--color-warning); }
.qs-value.critical { color: var(--color-critical); }

.qs-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.qs-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
}

/* ---- Layout grids ---- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

/* ---- Section cards ---- */
.section-card {
  padding: 24px 28px;
  margin-bottom: 16px;
}

.section-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.section-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.section-icon.warning  { background: var(--color-warning-bg);  color: var(--color-warning); }
.section-icon.critical { background: var(--color-critical-bg); color: var(--color-critical); }

.section-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.section-card-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 1px;
}

/* ---- Fields ---- */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.fields-grid.col3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.full-width {
  grid-column: 1 / -1;
}

label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.optional {
  font-weight: 400;
  color: var(--color-text-muted);
}

input, select, textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(233, 30, 140, 0.1);
}

textarea {
  resize: vertical;
  line-height: 1.5;
}

select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2378909c' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.input-unit-wrap {
  position: relative;
  display: flex;
}

.input-unit-wrap input {
  padding-right: 70px;
}

.unit-badge {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-left: none;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  pointer-events: none;
}

/* BMI display */
.bmi-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}

.bmi-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

/* Fitness options */
.lifestyle-section { margin-bottom: 4px; }

.lifestyle-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
}

.fitness-options {
  display: flex;
  gap: 10px;
}

.fitness-opt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 8px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: inherit;
}

.fitness-opt i {
  font-size: 18px;
  color: var(--color-text-muted);
  transition: color 0.18s ease;
}

.fo-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.fo-desc {
  font-size: 10.5px;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.3;
}

.fitness-opt:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-2px);
}

.fitness-opt.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(233, 30, 140, 0.12);
}

.fitness-opt.active i { color: var(--color-primary); }

/* Save row */
.save-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding-bottom: 40px;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 28px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.save-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 16px rgba(233, 30, 140, 0.35);
  transform: translateY(-1px);
}

.save-btn:active {
  transform: translateY(0) scale(0.98);
}

.saved-msg {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-normal);
  background: var(--color-normal-bg);
  border: 1px solid var(--color-normal-border);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
}

.saved-enter-active { animation: fade-up 0.25s ease; }
.saved-leave-active { animation: fade-up 0.2s ease reverse; }

@media (max-width: 1100px) {
  .form-grid { grid-template-columns: 1fr; }
  .fields-grid.col3 { grid-template-columns: 1fr 1fr; }
  .fitness-options { flex-wrap: wrap; }
}

@media (max-width: 700px) {
  .fields-grid { grid-template-columns: 1fr; }
  .fitness-options { flex-direction: column; }
}
</style>
