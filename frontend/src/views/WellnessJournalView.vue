<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useWellnessJournalStore } from '@/stores/wellnessJournal'
import { useAuthStore } from '@/stores/auth'
import type { JournalAnswers, JournalEntry } from '@/stores/wellnessJournal'
import { generateWellnessPdf } from '@/services/pdfGenerator'
import { useReportsStore } from '@/stores/reports'
import { playPop } from '@/composables/usePopSound'

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const store         = useWellnessJournalStore()
const auth          = useAuthStore()
const reportsStore  = useReportsStore()

const MOODS = [
  { value: 1, emoji: '😞', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Bad'      },
  { value: 3, emoji: '😐', label: 'Okay'     },
  { value: 4, emoji: '🙂', label: 'Good'     },
  { value: 5, emoji: '😄', label: 'Great'    },
]

const SLEEP_QUALITY = [
  { value: 1, label: 'Terrible'  },
  { value: 2, label: 'Poor'      },
  { value: 3, label: 'Fair'      },
  { value: 4, label: 'Good'      },
  { value: 5, label: 'Excellent' },
]

const SYMPTOMS = [
  'Headache', 'Fatigue', 'Muscle ache', 'Nausea',
  'Dizziness', 'Shortness of breath', 'Chest discomfort', 'Joint pain',
]

const EXERCISE_TYPES = [
  'Walking', 'Running', 'Cycling', 'Swimming',
  'Gym / Weights', 'Yoga', 'Sports', 'Other',
]

function blankAnswers(): JournalAnswers {
  return {
    mood: 0, energy: 5, stress: 5,
    sleepHours: 7, sleepQuality: 0,
    symptoms: [], exercised: false,
    exerciseType: '', exerciseMinutes: 30,
    notes: '',
  }
}

const answers         = ref<JournalAnswers>(blankAnswers())
const analyzing       = ref(false)
const currentAnalysis = ref('')
const submitted       = ref(false)
const lastEntry       = ref<JournalEntry | null>(null)
const selectedEntry   = ref<JournalEntry | null>(null)
const error           = ref('')

const canSubmit = computed(() => answers.value.mood > 0 && answers.value.sleepQuality > 0)

function toggleSymptom(s: string) {
  const idx = answers.value.symptoms.indexOf(s)
  if (idx === -1) answers.value.symptoms.push(s)
  else answers.value.symptoms.splice(idx, 1)
}

function buildPrompt(a: JournalAnswers): string {
  const mood      = MOODS.find(m => m.value === a.mood)?.label ?? ''
  const sleepQ    = SLEEP_QUALITY.find(s => s.value === a.sleepQuality)?.label ?? ''
  const symptoms  = a.symptoms.length ? a.symptoms.join(', ') : 'None'
  const exercise  = a.exercised
    ? `Yes - ${a.exerciseType || 'unspecified'} for ${a.exerciseMinutes} minutes`
    : 'No'
  const name = auth.user?.firstName ?? 'the user'

  return `You are a compassionate, knowledgeable wellness coach speaking directly to ${name}. Write a warm, second-person analysis (use "you" and "your", never the person's name or third person). Use exactly these three markdown sections. Use ## for each header. Bold (**word**) key terms and numbers. Do not use bullet points. Do not mention you are an AI.

## Today's Snapshot
2–3 sentences giving an overview of today's overall wellness picture.

## Key Observations
2–3 sentences discussing how the specific factors interact - mood, sleep, energy, stress, symptoms, and exercise.

## Your Action Plan
1–2 specific, actionable suggestions followed by one encouraging closing sentence.

Today's check-in for ${name}:
- Overall mood: ${a.mood}/5 (${mood})
- Energy level: ${a.energy}/10
- Stress level: ${a.stress}/10
- Sleep: ${a.sleepHours}h, quality ${a.sleepQuality}/5 (${sleepQ})
- Physical symptoms: ${symptoms}
- Exercise: ${exercise}
- Notes: "${a.notes || 'None'}"

Respond only with the three markdown sections above. Be specific to their numbers.`
}

async function submit() {
  if (!canSubmit.value || analyzing.value) return
  analyzing.value = true
  currentAnalysis.value = ''
  submitted.value = false
  error.value = ''
  selectedEntry.value = null

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: buildPrompt(answers.value) }],
        temperature: 0.72,
        max_tokens: 900,
      }),
    })
    const data = await res.json()
    const analysis = data.choices?.[0]?.message?.content ?? 'No analysis returned.'
    lastEntry.value = store.addEntry({ ...answers.value, symptoms: [...answers.value.symptoms] }, analysis)
    currentAnalysis.value = analysis
    submitted.value = true
    answers.value = blankAnswers()
  } catch {
    error.value = 'Could not reach the AI - check your connection and try again.'
  } finally {
    analyzing.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function moodEmoji(v: number) {
  return MOODS.find(m => m.value === v)?.emoji ?? '😐'
}

const renderedAnalysis = computed(() =>
  currentAnalysis.value ? marked.parse(currentAnalysis.value) as string : ''
)

function renderAnalysis(text: string) {
  return marked.parse(text) as string
}

function onPageClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('button')
  if (btn && !btn.classList.contains('h-pdf') && !btn.classList.contains('h-delete')) playPop()
}

function downloadEntryPdf(entry: JournalEntry) {
  const { doc, sizeKb } = generateWellnessPdf({
    date: entry.date,
    userName: `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim(),
    mood: entry.answers.mood,
    moodLabel: MOODS.find(m => m.value === entry.answers.mood)?.label ?? '',
    energy: entry.answers.energy,
    stress: entry.answers.stress,
    sleepHours: entry.answers.sleepHours,
    sleepQuality: entry.answers.sleepQuality,
    sleepQualityLabel: SLEEP_QUALITY.find(s => s.value === entry.answers.sleepQuality)?.label ?? '',
    symptoms: entry.answers.symptoms,
    exercised: entry.answers.exercised,
    exerciseType: entry.answers.exerciseType,
    exerciseMinutes: entry.answers.exerciseMinutes,
    notes: entry.answers.notes,
    analysis: entry.analysis,
  })
  const d = new Date(entry.date)
  const slug = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const titleDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  reportsStore.addReport({
    id: crypto.randomUUID(),
    title: `Wellness Journal - ${titleDate}`,
    generatedAt: entry.date,
    sizeKb,
    pdfDataUrl: doc.output('datauristring'),
  })

  doc.save(`wellness-journal-${slug}.pdf`)
}
</script>

<template>
  <div class="page" @click.capture="onPageClick">
    <!-- Header -->
    <div class="page-header animate-section" style="--s-delay:0s">
      <div>
        <h1>Wellness Journal</h1>
        <p class="page-sub">Check in daily - your answers are analysed by AI for insights and patterns</p>
      </div>
      <div class="entry-badge" v-if="store.entries.length">
        <i class="pi pi-book" />
        {{ store.entries.length }} {{ store.entries.length === 1 ? 'entry' : 'entries' }}
      </div>
    </div>

    <div class="journal-layout">

      <!-- ── Left: Form ── -->
      <div class="form-col animate-section" style="--s-delay:0.07s">

        <!-- Mood -->
        <div class="q-card">
          <div class="q-label">How are you feeling today? <span class="req">*</span></div>
          <div class="mood-row">
            <button
              v-for="m in MOODS"
              :key="m.value"
              class="mood-btn"
              :class="{ active: answers.mood === m.value }"
              @click="answers.mood = m.value"
            >
              <span class="mood-emoji">{{ m.emoji }}</span>
              <span class="mood-label">{{ m.label }}</span>
            </button>
          </div>
        </div>

        <!-- Energy & Stress -->
        <div class="q-card">
          <div class="sliders-row">
            <div class="slider-group">
              <div class="q-label">Energy level</div>
              <div class="slider-track-row">
                <input type="range" min="1" max="10" v-model.number="answers.energy" class="slider energy-slider" :style="{ '--val': answers.energy }" />
                <span class="slider-val">{{ answers.energy }}<small>/10</small></span>
              </div>
              <div class="slider-hints"><span>Low</span><span>High</span></div>
            </div>
            <div class="slider-group">
              <div class="q-label">Stress level</div>
              <div class="slider-track-row">
                <input type="range" min="1" max="10" v-model.number="answers.stress" class="slider stress-slider" :style="{ '--val': answers.stress }" />
                <span class="slider-val">{{ answers.stress }}<small>/10</small></span>
              </div>
              <div class="slider-hints"><span>Calm</span><span>Stressed</span></div>
            </div>
          </div>
        </div>

        <!-- Sleep -->
        <div class="q-card">
          <div class="q-label">Sleep last night</div>
          <div class="sleep-row">
            <div class="sleep-hours-wrap">
              <span class="sub-label">Hours slept</span>
              <div class="num-input-wrap">
                <input type="number" min="0" max="24" step="0.5" v-model.number="answers.sleepHours" class="num-input" />
                <span class="num-unit">h</span>
              </div>
            </div>
            <div class="sleep-quality-wrap">
              <span class="sub-label">Quality <span class="req">*</span></span>
              <div class="quality-row">
                <button
                  v-for="q in SLEEP_QUALITY"
                  :key="q.value"
                  class="quality-btn"
                  :class="{ active: answers.sleepQuality === q.value }"
                  @click="answers.sleepQuality = q.value"
                >{{ q.label }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Symptoms -->
        <div class="q-card">
          <div class="q-label">Any physical symptoms today?</div>
          <div class="chips">
            <button
              v-for="s in SYMPTOMS"
              :key="s"
              class="chip"
              :class="{ active: answers.symptoms.includes(s) }"
              @click="toggleSymptom(s)"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Exercise -->
        <div class="q-card">
          <div class="q-label">Did you exercise today?</div>
          <div class="yesno-row">
            <button class="yesno-btn" :class="{ active: !answers.exercised }" @click="answers.exercised = false">No</button>
            <button class="yesno-btn" :class="{ active: answers.exercised  }" @click="answers.exercised = true">Yes</button>
          </div>
          <Transition name="slide-down">
            <div v-if="answers.exercised" class="exercise-fields">
              <div class="exercise-row">
                <div class="exercise-field">
                  <span class="sub-label">Type</span>
                  <select v-model="answers.exerciseType" class="sel-input">
                    <option value="">Select…</option>
                    <option v-for="t in EXERCISE_TYPES" :key="t">{{ t }}</option>
                  </select>
                </div>
                <div class="exercise-field">
                  <span class="sub-label">Duration</span>
                  <div class="num-input-wrap">
                    <input type="number" min="1" max="600" v-model.number="answers.exerciseMinutes" class="num-input" />
                    <span class="num-unit">min</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Notes -->
        <div class="q-card">
          <div class="q-label">Anything else on your mind?</div>
          <textarea
            v-model="answers.notes"
            class="notes-ta"
            placeholder="Symptoms, thoughts, how your day went…"
            rows="3"
          />
        </div>

        <!-- Submit -->
        <div class="submit-row">
          <p v-if="!canSubmit" class="submit-hint">
            <i class="pi pi-info-circle" /> Select your mood and sleep quality to continue
          </p>
          <p v-if="error" class="submit-error">
            <i class="pi pi-exclamation-triangle" /> {{ error }}
          </p>
          <button class="submit-btn" :disabled="!canSubmit || analyzing" @click="submit">
            <i :class="analyzing ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'" />
            {{ analyzing ? 'Analysing…' : 'Save & Analyse' }}
          </button>
        </div>
      </div>

      <!-- ── Right: Analysis + History ── -->
      <div class="panel-col animate-section" style="--s-delay:0.14s">
        <div class="panel-inner">

          <!-- Analysis result -->
          <Transition name="analysis-in">
            <div v-if="submitted && currentAnalysis" class="analysis-card">
              <div class="analysis-head">
                <i class="pi pi-sparkles" />
                <span>Today's Insight</span>
                <span class="analysis-date">{{ formatDate(new Date().toISOString()) }}</span>
                <button v-if="lastEntry" class="h-pdf" @click="downloadEntryPdf(lastEntry!)" title="Download as PDF">
                  <i class="pi pi-download" />
                </button>
              </div>
              <div class="analysis-body prose" v-html="renderedAnalysis" />
            </div>
          </Transition>

          <!-- Past entries -->
          <div class="history-block">
            <div class="history-heading">Past Entries</div>

            <div v-if="!store.entries.length" class="history-empty">
              <i class="pi pi-book" />
              <span>No entries yet. Complete your first check-in!</span>
            </div>

            <div v-else class="history-list">
              <div
                v-for="entry in store.entries"
                :key="entry.id"
                class="history-item"
              >
                <div
                  class="history-item-header"
                  @click="selectedEntry = selectedEntry?.id === entry.id ? null : entry"
                >
                  <span class="h-emoji">{{ moodEmoji(entry.answers.mood) }}</span>
                  <div class="h-meta">
                    <span class="h-date">{{ formatDate(entry.date) }}</span>
                    <div class="h-tags">
                      <span class="h-tag">⚡ {{ entry.answers.energy }}/10</span>
                      <span class="h-tag">😴 {{ entry.answers.sleepHours }}h</span>
                      <span v-if="entry.answers.exercised" class="h-tag">🏃 Active</span>
                      <span v-if="entry.answers.symptoms.length" class="h-tag warn">
                        ⚠ {{ entry.answers.symptoms.length }} symptom{{ entry.answers.symptoms.length > 1 ? 's' : '' }}
                      </span>
                    </div>
                  </div>
                  <div class="h-actions">
                    <button class="h-pdf" @click.stop="downloadEntryPdf(entry)" title="Download as PDF">
                      <i class="pi pi-download" />
                    </button>
                    <button class="h-delete" @click.stop="store.deleteEntry(entry.id)" title="Delete entry">
                      <i class="pi pi-trash" />
                    </button>
                    <i :class="`pi ${selectedEntry?.id === entry.id ? 'pi-chevron-up' : 'pi-chevron-down'} h-chevron`" />
                  </div>
                </div>
                <Transition name="slide-down">
                  <div v-if="selectedEntry?.id === entry.id" class="history-analysis">
                    <div class="analysis-body prose" v-html="renderAnalysis(entry.analysis)" />
                  </div>
                </Transition>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.page-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.entry-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 99px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.journal-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 1100px) {
  .journal-layout { grid-template-columns: 1fr; }
}

.animate-section {
  animation: fade-up 0.45s ease var(--s-delay, 0s) both;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Question cards ── */
.form-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.q-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 12px);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.q-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.req {
  color: var(--color-primary);
  margin-left: 2px;
}

/* ── Mood ── */
.mood-row {
  display: flex;
  gap: 8px;
}

.mood-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px 6px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.12s;
  font-family: inherit;
}

.mood-btn:hover { border-color: var(--color-primary); background: var(--color-primary-light, rgba(233,30,140,0.06)); }
.mood-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light, rgba(233,30,140,0.08));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(233,30,140,0.18);
}

.mood-emoji  { font-size: 26px; line-height: 1; }
.mood-label  { font-size: 10.5px; font-weight: 600; color: var(--color-text-secondary); }

/* ── Sliders ── */
.sliders-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-track-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider {
  flex: 1;
  appearance: none;
  height: 5px;
  border-radius: 99px;
  outline: none;
  cursor: pointer;
}

.energy-slider {
  background: linear-gradient(to right,
    var(--color-primary) 0%,
    var(--color-primary) calc((var(--val, 5) - 1) / 9 * 100%),
    var(--color-border) calc((var(--val, 5) - 1) / 9 * 100%),
    var(--color-border) 100%
  );
}

.stress-slider {
  background: linear-gradient(to right,
    #f59e0b 0%,
    #f59e0b calc((var(--val, 5) - 1) / 9 * 100%),
    var(--color-border) calc((var(--val, 5) - 1) / 9 * 100%),
    var(--color-border) 100%
  );
}

.energy-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.18);
  cursor: pointer;
}

.stress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f59e0b;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.18);
  cursor: pointer;
}

.slider-val {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
  min-width: 36px;
  text-align: right;
}

.slider-val small { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); }

.slider-hints {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--color-text-muted, #b0bec5);
}

/* ── Sleep ── */
.sleep-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.sleep-hours-wrap, .sleep-quality-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sleep-quality-wrap { flex: 1; }

.sub-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.num-input-wrap {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
}

.num-input {
  width: 56px;
  padding: 6px 10px;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text-primary);
}

.num-unit {
  padding: 6px 10px 6px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg);
}

.quality-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.quality-btn {
  padding: 6px 11px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1.5px solid var(--color-border);
  border-radius: 7px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.quality-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.quality-btn.active { border-color: var(--color-primary); background: var(--color-primary-light, rgba(233,30,140,0.08)); color: var(--color-primary); }

/* ── Chips ── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 600;
  border: 1.5px solid var(--color-border);
  border-radius: 99px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.chip:hover  { border-color: var(--color-primary); color: var(--color-primary); }
.chip.active { border-color: var(--color-primary); background: var(--color-primary-light, rgba(233,30,140,0.08)); color: var(--color-primary); }

/* ── Yes/No ── */
.yesno-row {
  display: flex;
  gap: 8px;
  width: fit-content;
}

.yesno-btn {
  padding: 7px 22px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.yesno-btn:hover  { border-color: var(--color-primary); }
.yesno-btn.active { border-color: var(--color-primary); background: var(--color-primary-light, rgba(233,30,140,0.08)); color: var(--color-primary); }

/* ── Exercise details ── */
.exercise-fields { padding-top: 4px; }

.exercise-row {
  display: flex;
  gap: 16px;
}

.exercise-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.sel-input {
  padding: 7px 10px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  font-size: 13px;
  font-family: inherit;
  color: var(--color-text-primary);
  outline: none;
  cursor: pointer;
}

/* ── Notes ── */
.notes-ta {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  font-size: 13px;
  font-family: inherit;
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.notes-ta:focus { border-color: var(--color-primary); }
.notes-ta::placeholder { color: var(--color-text-muted, #b0bec5); }

/* ── Submit ── */
.submit-row {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.submit-hint, .submit-error {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
}

.submit-hint  { color: var(--color-text-secondary); }
.submit-error { color: #b91c1c; }

.submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 24px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 8px);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-dark, #c9186f);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(233,30,140,0.35);
}

.submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Right panel ── */
.panel-col {
  position: sticky;
  top: 32px;
}

.panel-inner {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding-right: 2px;
}

/* ── Analysis card ── */
.analysis-card {
  background: var(--color-bg);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(233,30,140,0.1);
}

.analysis-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  background: linear-gradient(135deg, rgba(233,30,140,0.08) 0%, rgba(233,30,140,0.03) 100%);
  border-bottom: 1px solid rgba(233,30,140,0.15);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
}

.analysis-head .pi-sparkles { font-size: 14px; }
.analysis-date { margin-left: auto; font-size: 11px; font-weight: 500; color: var(--color-text-secondary); margin-right: 4px; }

.analysis-body {
  padding: 16px 18px;
  max-height: 52vh;
  overflow-y: auto;
}

/* ── Prose reset ── */
.prose :deep(h2) {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 16px 0 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(233, 30, 140, 0.18);
  letter-spacing: 0.1px;
}
.prose :deep(h2:first-child) { margin-top: 0; }
.prose :deep(h3) {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 12px 0 4px;
}
.prose :deep(p) {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--color-text-primary);
}
.prose :deep(p:last-child) { margin-bottom: 0; }
.prose :deep(strong) { color: var(--color-primary); font-weight: 700; }
.prose :deep(ul) { margin: 0 0 10px; padding-left: 18px; }
.prose :deep(li) {
  font-size: 13px;
  line-height: 1.65;
  color: var(--color-text-primary);
  margin-bottom: 3px;
}

/* ── History ── */
.history-block {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
}

.history-heading {
  padding: 14px 18px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 20px;
  color: var(--color-text-muted, #b0bec5);
  font-size: 13px;
  text-align: center;
}

.history-empty .pi { font-size: 28px; opacity: 0.35; }

.history-list { display: flex; flex-direction: column; }

.history-item { border-bottom: 1px solid var(--color-border); }
.history-item:last-child { border-bottom: none; }

.history-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.history-item-header:hover { background: var(--color-surface); }

.h-emoji { font-size: 22px; flex-shrink: 0; }

.h-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 4px;
}

.h-date {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.h-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.h-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 99px;
  padding: 1px 7px;
}

.h-tag.warn { color: #b45309; background: #fffbeb; border-color: #fde68a; }

.h-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.h-pdf,
.h-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-text-muted, #b0bec5);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s, color 0.15s;
}

.h-pdf:hover   { background: rgba(233, 30, 140, 0.08); color: var(--color-primary); }
.h-delete:hover { background: #fee2e2; color: #b91c1c; }

/* PDF button inside analysis card header */
.analysis-head .h-pdf {
  margin-left: auto;
  width: 24px;
  height: 24px;
  color: rgba(233, 30, 140, 0.5);
}
.analysis-head .h-pdf:hover { color: var(--color-primary); background: rgba(233, 30, 140, 0.1); }

.h-chevron {
  font-size: 12px;
  color: var(--color-text-muted, #b0bec5);
  transition: transform 0.2s;
}

.history-analysis {
  padding: 0;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.history-analysis .analysis-body {
  max-height: 40vh;
}

/* ── Transitions ── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.35s ease;
  max-height: 800px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

.analysis-in-enter-active { transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.analysis-in-enter-from   { opacity: 0; transform: translateY(12px) scale(0.97); }
</style>
