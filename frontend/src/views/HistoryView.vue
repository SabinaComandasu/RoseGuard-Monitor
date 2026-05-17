<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { useRoute } from 'vue-router'
import { useTrendsStore } from '@/stores/trends'
import { useUserStore } from '@/stores/user'
import { useReportsStore } from '@/stores/reports'
import { generateDashboardPdf } from '@/services/pdfGenerator'

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const route        = useRoute()
const trendsStore  = useTrendsStore()
const userStore    = useUserStore()
const reportsStore = useReportsStore()

const downloadingPdf    = ref(false)
const showPdfDialog     = ref(false)
const pdfDialogAnalyzing = ref(false)

// Chart instance refs (populated by :ref binding in v-for)
const chartRefs: Record<string, any> = {}

// ─── Stats ────────────────────────────────────────────────────────────────────
function statOf(values: number[], decimals = 0) {
  if (!values.length) return null
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const fmt = (v: number) => decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))
  return { avg: fmt(avg), min: fmt(min), max: fmt(max), count: values.length }
}

const spo2Stats = computed(() => statOf(trendsStore.spo2Values))
const hrStats   = computed(() => statOf(trendsStore.hrValues))
const tempStats = computed(() => statOf(trendsStore.tempValues, 1))

// ─── Chart options ────────────────────────────────────────────────────────────
function yRange(values: number[], pad: number, minSpan: number, floor: number, ceil: number): [number, number, number] {
  if (!values.length) return [floor, ceil, 4]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  let lo2 = lo - pad
  let hi2 = hi + pad
  if (hi2 - lo2 < minSpan) {
    const mid = (lo2 + hi2) / 2
    lo2 = mid - minSpan / 2
    hi2 = mid + minSpan / 2
  }
  // floor/ceil are soft defaults — never clip actual readings
  const yMin = Math.floor(Math.min(lo, Math.max(floor, lo2)))
  const yMax = Math.ceil(Math.max(hi, Math.min(ceil, hi2)))
  const rawStep = (yMax - yMin) / 4 || 1
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const step = ([1, 2, 5, 10] as number[]).map(f => f * mag).find(s => s >= rawStep) ?? rawStep
  const niceMin = Math.floor(yMin / step) * step
  const niceMax = Math.ceil(yMax / step) * step
  const tickAmount = Math.max(2, Math.round((niceMax - niceMin) / step) + 1)
  return [niceMin, niceMax, tickAmount]
}

function makeOpts(color: string, values: number[], unit: string, labels: string[], pad: number, minSpan: number, floor: number, ceil: number) {
  const [yMin, yMax, tickAmount] = yRange(values, pad, minSpan, floor, ceil)
  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
      fontFamily: 'Inter, sans-serif',
      animations: { enabled: true, speed: 400, dynamicAnimation: { enabled: true, speed: 350 } },
    },
    colors: [color],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 0.2, opacityFrom: 0.35, opacityTo: 0.02 },
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: labels,
      labels: {
        style: { colors: '#b0bec5', fontSize: '10px' },
        hideOverlappingLabels: true,
        rotate: 0,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      tickAmount: 8,
    },
    yaxis: {
      min: yMin,
      max: yMax,
      tickAmount,
      labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter: (v: number) => `${v}${unit}` },
    },
    markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: 'light', style: { fontSize: '12px' }, x: { show: true }, y: { formatter: (v: number) => `${v}${unit}` } },
  }
}

const spo2Opts = computed(() => makeOpts('#e91e8c', trendsStore.spo2Values, '%',    trendsStore.spo2Labels, 1,   4,  85, 100))
const hrOpts   = computed(() => makeOpts('#f44336', trendsStore.hrValues,   ' BPM', trendsStore.hrLabels,   5,   20, 30, 220))
const tempOpts = computed(() => makeOpts('#f59e0b', trendsStore.tempValues, '°C',   trendsStore.tempLabels, 0.5, 2,  30, 43))

const spo2Series = computed(() => [{ name: 'SpO2',        data: trendsStore.spo2Values }])
const hrSeries   = computed(() => [{ name: 'Heart Rate',  data: trendsStore.hrValues   }])
const tempSeries = computed(() => [{ name: 'Temperature', data: trendsStore.tempValues }])

const hasAnyData = computed(() =>
  trendsStore.spo2Values.length > 0 || trendsStore.hrValues.length > 0 || trendsStore.tempValues.length > 0
)

// ─── PDF ──────────────────────────────────────────────────────────────────────
function downloadPdf() {
  if (recommendation.value) {
    executePdfDownload()
  } else {
    showPdfDialog.value = true
  }
}

async function pdfWithAnalysis() {
  pdfDialogAnalyzing.value = true
  await analyze()
  pdfDialogAnalyzing.value = false
  showPdfDialog.value = false
  await executePdfDownload()
}

async function pdfWithoutAnalysis() {
  showPdfDialog.value = false
  await executePdfDownload()
}

async function executePdfDownload() {
  downloadingPdf.value = true
  await new Promise(r => setTimeout(r, 150))

  // Capture chart images from rendered ApexCharts instances
  const chartImages: Record<string, string | undefined> = {}
  for (const key of ['spo2', 'hr', 'temp']) {
    const inst = chartRefs[key]
    if (inst?.chart) {
      try {
        const { imgURI } = await inst.chart.dataURI({ scale: 2 })
        chartImages[key] = imgURI
      } catch {}
    }
  }

  const now = new Date()
  const { doc, sizeKb } = generateDashboardPdf({
    kpis: [],
    userName: userStore.fullName,
    trends: hasAnyData.value ? {
      spo2: { values: trendsStore.spo2Values, labels: trendsStore.spo2Labels },
      hr:   { values: trendsStore.hrValues,   labels: trendsStore.hrLabels   },
      temp: { values: trendsStore.tempValues, labels: trendsStore.tempLabels },
    } : undefined,
    chartImages: {
      spo2: chartImages.spo2,
      hr:   chartImages.hr,
      temp: chartImages.temp,
    },
    aiRecommendation: recommendation.value || undefined,
  })

  doc.save(`RoseGuard_Trends_${now.toISOString().slice(0, 10)}.pdf`)

  reportsStore.addReport({
    id: crypto.randomUUID(),
    title: `Trends Report - ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    generatedAt: now.toISOString(),
    sizeKb,
    pdfDataUrl: doc.output('datauristring'),
  })

  downloadingPdf.value = false
}

const metrics = computed(() => [
  {
    key: 'spo2',
    label: 'SpO2',
    subtitle: 'Blood oxygen saturation',
    color: '#e91e8c',
    colorClass: 'spo2',
    unit: '%',
    icon: 'pi pi-eye',
    stats: spo2Stats.value,
    opts: spo2Opts.value,
    series: spo2Series.value,
    count: trendsStore.spo2Values.length,
  },
  {
    key: 'hr',
    label: 'Heart Rate',
    subtitle: 'Beats per minute',
    color: '#f44336',
    colorClass: 'hr',
    unit: ' BPM',
    icon: 'pi pi-heart',
    stats: hrStats.value,
    opts: hrOpts.value,
    series: hrSeries.value,
    count: trendsStore.hrValues.length,
  },
  {
    key: 'temp',
    label: 'Temperature',
    subtitle: 'Body temperature',
    color: '#f59e0b',
    colorClass: 'temp',
    unit: '°C',
    icon: 'pi pi-sun',
    stats: tempStats.value,
    opts: tempOpts.value,
    series: tempSeries.value,
    count: trendsStore.tempValues.length,
  },
])

// ─── Groq AI ──────────────────────────────────────────────────────────────────
const analyzing        = ref(false)
const errorMsg         = ref('')
const recommendation   = ref('')
const resultExpanded   = ref(true)

const recommendationHtml = computed(() =>
  recommendation.value ? (marked.parse(recommendation.value) as string) : ''
)

function buildPrompt() {
  const u = userStore

  const profileParts: string[] = []
  if (u.age)                      profileParts.push(`Age: ${u.age} years`)
  if (u.sex)                      profileParts.push(`Sex: ${u.sex}`)
  if (u.heightCm)                 profileParts.push(`Height: ${u.heightCm} cm`)
  if (u.weightKg)                 profileParts.push(`Weight: ${u.weightKg} kg`)
  if (u.bmi)                      profileParts.push(`BMI: ${u.bmi}`)
  if (u.bloodType)                profileParts.push(`Blood type: ${u.bloodType}`)
  if (u.conditions)               profileParts.push(`Medical conditions: ${u.conditions}`)
  if (u.medications)              profileParts.push(`Medications: ${u.medications}`)
  if (u.allergies)                profileParts.push(`Allergies: ${u.allergies}`)
  if (u.fitnessLevel)             profileParts.push(`Fitness level: ${u.fitnessLevel}`)
  if (u.smokingStatus)            profileParts.push(`Smoking: ${u.smokingStatus}`)
  if (u.alcoholConsumption)       profileParts.push(`Alcohol: ${u.alcoholConsumption}`)
  if (u.sleepHours)               profileParts.push(`Sleep: ${u.sleepHours} h/night`)

  const profile = profileParts.length > 0 ? profileParts.join('; ') : 'No profile data available.'

  const stat = (vals: number[], unit: string) =>
    vals.length === 0 ? 'no data' :
    `avg ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}${unit}, min ${Math.min(...vals)}${unit}, max ${Math.max(...vals)}${unit} (${vals.length} readings)`

  return `Patient profile: ${profile}

Recent sensor measurements:
- Blood oxygen (SpO2): ${stat(trendsStore.spo2Values, '%')}
- Heart rate: ${stat(trendsStore.hrValues, ' BPM')}
- Body temperature: ${stat(trendsStore.tempValues, '°C')}

Based on this data, please provide:
1. A brief assessment of whether these readings look normal or concerning.
2. Three to five specific, actionable health recommendations tailored to this patient.
3. Any reading that may warrant consulting a doctor.

Keep your tone friendly and accessible. Do not diagnose. Suggest professional consultation when appropriate.`
}

async function analyze() {
  analyzing.value      = true
  errorMsg.value       = ''
  recommendation.value = ''

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a knowledgeable, friendly health assistant. Help patients understand their biometric sensor data with concise, practical advice. Always remind users to consult a healthcare professional for medical decisions.' },
          { role: 'user',   content: buildPrompt() },
        ],
        max_tokens: 700,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)

    recommendation.value = (data.choices?.[0]?.message?.content ?? 'No response received.').trim()
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Could not reach the AI service. Please try again.'
  } finally {
    analyzing.value = false
  }
}

onMounted(() => {
  if (route.query.autoAnalyze === '1' && hasAnyData.value) analyze()
})
</script>

<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header animate-s" style="--s-delay:0s">
      <div>
        <h1>History</h1>
        <p>Recorded sensor measurements and AI-powered health recommendations</p>
      </div>
      <button class="pdf-btn" :disabled="downloadingPdf" @click="downloadPdf">
        <i :class="downloadingPdf ? 'pi pi-spin pi-spinner' : 'pi pi-file-pdf'" />
        {{ downloadingPdf ? 'Generating…' : 'Download PDF' }}
      </button>
    </div>

    <!-- No data state -->
    <div v-if="!hasAnyData" class="empty-page animate-s" style="--s-delay:0.08s">
      <i class="pi pi-chart-line" />
      <h3>No measurements recorded yet</h3>
      <p>Go to the Dashboard and press "Start measuring" on any of the trend charts to begin recording data.</p>
    </div>

    <template v-else>

      <!-- Analyze button -->
      <div class="analyze-row animate-s" style="--s-delay:0.06s">
        <button class="analyze-btn" :disabled="analyzing" @click="analyze">
          <i :class="analyzing ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'" />
          {{ analyzing ? 'Analyzing…' : 'Analyze with Groq AI' }}
        </button>
        <span class="analyze-sub">Groq will analyze your readings and health profile to give personalized advice.</span>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="error-card animate-s" style="--s-delay:0s">
        <i class="pi pi-exclamation-triangle" />
        {{ errorMsg }}
      </div>

      <!-- Thinking animation -->
      <div v-if="analyzing && !recommendation" class="card thinking-card animate-s" style="--s-delay:0s">
        <div class="thinking-dots">
          <span /><span /><span />
        </div>
        <p>Groq is analyzing your health data…</p>
      </div>

      <!-- AI response -->
      <div v-if="recommendation" class="card result-card animate-s" style="--s-delay:0s">
        <div class="result-header">
          <div class="result-badge">
            <i class="pi pi-sparkles" />
            Groq AI
          </div>
          <div class="result-header-right">
            <button class="collapse-btn" @click="resultExpanded = !resultExpanded" :title="resultExpanded ? 'Collapse' : 'Expand'">
              <i :class="resultExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
            </button>
          </div>
        </div>
        <div v-if="resultExpanded" class="result-body markdown" v-html="recommendationHtml" />
      </div>

      <!-- Metric sections -->
      <div class="metrics-stack">
        <div
          v-for="(m, i) in metrics"
          :key="m.key"
          class="metric-section card animate-s"
          :style="{ '--s-delay': `${0.06 + i * 0.08}s` }"
        >
          <!-- Section header -->
          <div class="metric-header">
            <div class="metric-title-row">
              <div class="metric-icon" :class="m.colorClass">
                <i :class="m.icon" />
              </div>
              <div>
                <span class="metric-label">{{ m.label }}</span>
                <span class="metric-subtitle">{{ m.subtitle }}</span>
              </div>
            </div>
            <span class="reading-count">{{ m.count }} readings</span>
          </div>

          <!-- Stats -->
          <div v-if="m.stats" class="stats-row">
            <div class="stat-pill">
              <span class="stat-pill-label">Avg</span>
              <span class="stat-pill-value" :style="{ color: m.color }">{{ m.stats.avg }}<span class="stat-pill-unit">{{ m.unit }}</span></span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-label">Min</span>
              <span class="stat-pill-value">{{ m.stats.min }}<span class="stat-pill-unit">{{ m.unit }}</span></span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-label">Max</span>
              <span class="stat-pill-value">{{ m.stats.max }}<span class="stat-pill-unit">{{ m.unit }}</span></span>
            </div>
          </div>

          <!-- Chart -->
          <div v-if="m.count > 0" class="chart-wrap">
            <apexchart :ref="(el: any) => { if (el) chartRefs[m.key] = el }" type="area" height="240" :options="m.opts" :series="m.series" />
          </div>
          <div v-else class="chart-empty">
            <i class="pi pi-chart-line" />
            <span>No {{ m.label }} data - start measuring on the Dashboard</span>
          </div>

        </div>
      </div>

    </template>

    <!-- PDF + AI dialog -->
    <div v-if="showPdfDialog" class="dialog-overlay" @click.self="showPdfDialog = false">
      <div class="dialog">
        <div class="dialog-icon">
          <i class="pi pi-sparkles" />
        </div>
        <h3>Include AI Analysis?</h3>
        <p>No Groq AI analysis has been done yet. Would you like to run one now and include it in the PDF?</p>
        <div v-if="pdfDialogAnalyzing" class="dialog-analyzing">
          <i class="pi pi-spin pi-spinner" />
          Analyzing with Groq…
        </div>
        <div v-else class="dialog-actions">
          <button class="dialog-btn-primary" @click="pdfWithAnalysis">
            <i class="pi pi-sparkles" /> Yes, include analysis
          </button>
          <button class="dialog-btn-secondary" @click="pdfWithoutAnalysis">
            Skip, download now
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-s { animation: fade-up 0.45s ease var(--s-delay, 0s) both; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.pdf-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.pdf-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 14px rgba(233, 30, 140, 0.35);
  transform: translateY(-1px);
}

.pdf-btn:disabled { opacity: 0.75; cursor: not-allowed; }

/* Empty page */
.empty-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 80px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-page .pi { font-size: 48px; opacity: 0.25; }

.empty-page h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.empty-page p {
  font-size: 13.5px;
  line-height: 1.6;
  max-width: 380px;
  margin: 0;
}

/* Metrics stack */
.metrics-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-section {
  padding: 24px 26px 16px;
}

/* Section header */
.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.metric-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.metric-icon.spo2 { background: #fce4ec; color: #e91e8c; }
.metric-icon.hr   { background: #ffebee; color: #f44336; }
.metric-icon.temp { background: #fff8e1; color: #f59e0b; }

.metric-label {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.metric-subtitle {
  display: block;
  font-size: 11.5px;
  color: var(--color-text-secondary);
  margin-top: 1px;
}

.reading-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 4px 12px;
}

/* Stats row */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 18px;
  min-width: 90px;
}

.stat-pill-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

.stat-pill-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-pill-unit {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-left: 2px;
}

/* Chart */
.chart-wrap { margin: 0 -4px; }

.chart-empty {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #b0bec5;
  font-size: 13px;
}

.chart-empty .pi { font-size: 30px; opacity: 0.35; }

/* Analyze row */
.analyze-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.analyze-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 0.15s, box-shadow 0.15s, transform 0.15s;
}

.analyze-btn:hover:not(:disabled) {
  box-shadow: 0 4px 18px rgba(124, 58, 237, 0.4);
  transform: translateY(-1px);
}

.analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.analyze-sub {
  font-size: 12.5px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Error */
.error-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: var(--radius-sm);
  color: #c62828;
  font-size: 13.5px;
  margin-bottom: 16px;
}

/* Thinking */
.thinking-card {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--color-text-secondary);
  font-size: 13.5px;
  margin-bottom: 16px;
}

.thinking-dots {
  display: flex;
  gap: 8px;
}

.thinking-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #a855f7;
  animation: pulse-dot 1.2s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1); }
}

/* Result card */
.result-card { padding: 24px 26px; margin-bottom: 8px; }

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.result-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: white;
}

.result-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 11px;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: var(--color-border);
  color: var(--color-text-primary);
}

/* Markdown body */
.markdown {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-primary);
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
  font-weight: 700;
  margin: 16px 0 6px;
  color: var(--color-text-primary);
}

.markdown :deep(p) { margin: 0 0 10px; }

.markdown :deep(ul),
.markdown :deep(ol) {
  padding-left: 20px;
  margin: 0 0 10px;
}

.markdown :deep(li) { margin-bottom: 5px; }

.markdown :deep(strong) { font-weight: 700; }

.markdown :deep(p:last-child) { margin-bottom: 0; }

@media (max-width: 700px) {
  .stats-row    { flex-wrap: wrap; }
  .page-header  { flex-direction: column; gap: 14px; }
  .analyze-row  { flex-direction: column; align-items: flex-start; }
  .result-header { flex-direction: column; align-items: flex-start; }
}

/* PDF / AI dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog {
  background: white;
  border-radius: var(--radius-md, 12px);
  padding: 32px 28px 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed22, #a855f722);
  border: 1px solid #a855f740;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #7c3aed;
  margin-bottom: 4px;
}

.dialog h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.dialog p {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  line-height: 1.55;
  margin: 0 0 8px;
}

.dialog-analyzing {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7c3aed;
  font-size: 13.5px;
  font-weight: 600;
  padding: 8px 0;
}

.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.dialog-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 16px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s, box-shadow 0.15s;
}

.dialog-btn-primary:hover { box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35); }

.dialog-btn-secondary {
  padding: 10px 16px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.dialog-btn-secondary:hover { background: var(--color-bg); }
</style>
