<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import LiveReadingCard from '@/components/LiveReadingCard.vue'
import KpiCard from '@/components/KpiCard.vue'
import { generateDashboardPdf } from '@/services/pdfGenerator'
import { useReportsStore } from '@/stores/reports'
import { useUserStore } from '@/stores/user'
import { useBiometricsStore } from '@/stores/biometrics'
import { useTrendsStore } from '@/stores/trends'
import { connectBle, disconnectBle } from '@/services/ble'
import type { KpiItem } from '@/types'

const reportsStore = useReportsStore()
const userStore    = useUserStore()
const bioStore     = useBiometricsStore()
const trendsStore  = useTrendsStore()

const spo2        = computed(() => bioStore.spo2)
const heartRate   = computed(() => bioStore.heartRate)
const temperature = computed(() => bioStore.temperature)
const lastUpdated = computed(() => bioStore.lastUpdated ?? '--')

const spo2Status  = computed(() => {
  if (spo2.value === null) return 'unknown'
  if (spo2.value < 90)    return 'critical'
  if (spo2.value < 95)    return 'warning'
  return 'normal'
})
const hrStatus = computed(() => {
  if (heartRate.value === null) return 'unknown'
  if (heartRate.value < 50 || heartRate.value > 110) return 'warning'
  return 'normal'
})
const tempStatus = computed(() => {
  if (temperature.value === null) return 'unknown'
  if (temperature.value > 37.5)  return 'warning'
  return 'normal'
})

const downloadingPdf    = ref(false)
const bleConnecting     = ref(false)
const showTempWarning   = ref(false)
const showPositionTip   = ref(false)
const positionTipVariant = ref<'no-signal' | 'bad-values'>('no-signal')
const showPdfWarning     = ref(false)

watch(temperature, (val) => {
  showTempWarning.value = val !== null && val > 40
})

watch([spo2, heartRate, () => bioStore.fingerDetected], ([s, bpm, finger]) => {
  const noSignal  = !!finger && (s === null || bpm === null)
  const badValues = !!finger && s !== null && bpm !== null &&
                    ((bpm as number) < 50 || (bpm as number) > 110)
  showPositionTip.value   = noSignal || badValues
  positionTipVariant.value = noSignal ? 'no-signal' : 'bad-values'
})

async function toggleBle() {
  if (bioStore.bleConnected) {
    await disconnectBle()
    return
  }
  bleConnecting.value = true
  try {
    await connectBle()
  } catch (e) {
    console.error('BLE connect failed', e)
  } finally {
    bleConnecting.value = false
  }
}

// ─── Profile-derived KPIs ────────────────────────────────────────────────────

const bmiKpi = computed(() => {
  const b = userStore.bmi
  if (b === null) return { value: '—', unit: '', status: 'unknown' as const }
  const status = b < 18.5 || b >= 30 ? 'critical' as const : b >= 25 ? 'warning' as const : 'normal' as const
  return { value: b.toFixed(1), unit: 'kg/m²', status }
})

const cardioKpi = computed(() => {
  let score = 0
  const a = userStore.age ?? 0
  if (a > 60) score += 3
  else if (a > 45) score += 2
  else if (a > 35) score += 1
  if (userStore.sex === 'Male') score += 1
  const b = userStore.bmi
  if (b !== null && b >= 30) score += 2
  else if (b !== null && b >= 25) score += 1
  if (userStore.smokingStatus === 'current') score += 3
  else if (userStore.smokingStatus === 'occasional') score += 2
  else if (userStore.smokingStatus === 'former') score += 1
  if (userStore.conditions.trim().length > 0) score += 1
  if (score >= 7) return { value: 'High',     status: 'critical' as const }
  if (score >= 4) return { value: 'Moderate', status: 'warning'  as const }
  return           { value: 'Low',      status: 'normal'   as const }
})

const lifestyleKpi = computed(() => {
  let score = 100
  const sleep = userStore.sleepHours
  if (sleep !== null) {
    if (sleep < 5 || sleep > 10) score -= 25
    else if (sleep < 6 || sleep > 9) score -= 10
  }
  if (userStore.fitnessLevel === 'sedentary') score -= 25
  else if (userStore.fitnessLevel === 'light') score -= 10
  if (userStore.smokingStatus === 'current') score -= 25
  else if (userStore.smokingStatus === 'occasional') score -= 15
  else if (userStore.smokingStatus === 'former') score -= 5
  if (userStore.alcoholConsumption === 'regular') score -= 20
  else if (userStore.alcoholConsumption === 'moderate') score -= 10
  score = Math.max(0, score)
  const status = score >= 70 ? 'normal' as const : score >= 40 ? 'warning' as const : 'critical' as const
  return { value: String(score), status }
})

const weightKpi = computed(() => {
  const current = userStore.weightKg
  const target  = userStore.targetWeightKg
  if (!current || !target) return { value: '—', unit: '', status: 'unknown' as const, description: 'Set target weight in profile' }
  const diff = Math.round((current - target) * 10) / 10
  if (Math.abs(diff) < 0.5) return { value: 'On target', unit: '', status: 'normal' as const, description: "You've reached your weight goal" }
  const abs = Math.abs(diff)
  return {
    value: diff > 0 ? `-${abs}` : `+${abs}`,
    unit: 'kg',
    status: abs > 10 ? 'warning' as const : 'normal' as const,
    description: diff > 0 ? `${abs} kg above target` : `${abs} kg below target`,
  }
})

const sleepKpi = computed(() => {
  const h = userStore.sleepHours
  if (h === null) return { value: '—', status: 'unknown' as const }
  if (h >= 7 && h <= 9) return { value: `${h}h`, status: 'normal'   as const }
  if (h >= 5 && h <= 10) return { value: `${h}h`, status: 'warning'  as const }
  return                        { value: `${h}h`, status: 'critical' as const }
})

const fitnessKpi = computed(() => {
  const map: Record<string, { label: string; status: 'normal' | 'warning' }> = {
    sedentary:   { label: 'Sedentary',   status: 'warning' },
    light:       { label: 'Light',       status: 'normal'  },
    moderate:    { label: 'Moderate',    status: 'normal'  },
    active:      { label: 'Active',      status: 'normal'  },
    very_active: { label: 'Very Active', status: 'normal'  },
  }
  return map[userStore.fitnessLevel] ?? { label: '—', status: 'unknown' as any }
})

const smokingKpi = computed(() => {
  const map: Record<string, { label: string; status: 'normal' | 'warning' | 'critical' }> = {
    never:      { label: 'Never',      status: 'normal'   },
    former:     { label: 'Former',     status: 'normal'   },
    occasional: { label: 'Occasional', status: 'warning'  },
    current:    { label: 'Current',    status: 'critical' },
  }
  return map[userStore.smokingStatus] ?? { label: '—', status: 'unknown' as any }
})

const medsKpi = computed(() => ({
  value:  userStore.medications.trim().length > 0 ? 'On file' : 'None',
  status: 'normal' as const,
}))

const bmiTooltip = computed(() => {
  const b = userStore.bmi
  if (b === null) return undefined
  if (b < 18.5)  return `BMI of ${b.toFixed(1)} is below the healthy range (< 18.5)`
  if (b < 25)    return `BMI of ${b.toFixed(1)} is in the healthy range (18.5–24.9)`
  if (b < 30)    return `BMI of ${b.toFixed(1)} is in the overweight range (25–29.9)`
  return               `BMI of ${b.toFixed(1)} indicates obesity (≥ 30)`
})

const cardioTooltip = computed(() => {
  const s = cardioKpi.value.status
  if (s === 'critical') return 'Multiple risk factors detected — age, BMI, or smoking are significant contributors'
  if (s === 'warning')  return 'Some risk factors present — consider reviewing lifestyle or consulting a doctor'
  return                       'No significant risk factors detected based on your profile'
})

const lifestyleTooltip = computed(() => {
  const s = lifestyleKpi.value.status
  if (s === 'critical') return 'Several lifestyle factors (sleep, fitness, smoking, alcohol) need attention'
  if (s === 'warning')  return 'One or more lifestyle factors are below recommended levels'
  return                       'Good lifestyle habits across sleep, fitness, and diet'
})

const sleepTooltip = computed(() => {
  const h = userStore.sleepHours
  if (h === null) return undefined
  if (h >= 7 && h <= 9) return 'Sleep duration is within the recommended 7–9 hours for adults'
  if (h < 7)            return `${h}h is below the recommended minimum of 7 hours per night`
  return                       `${h}h exceeds the recommended maximum of 9 hours per night`
})

const fitnessTooltip = computed(() => {
  if (userStore.fitnessLevel === 'sedentary')
    return 'A sedentary lifestyle is linked to higher cardiovascular and metabolic risk'
  return undefined
})

const smokingTooltip = computed(() => {
  const s = userStore.smokingStatus
  if (s === 'current')    return 'Active smoking is a major risk factor for heart disease, stroke, and cancer'
  if (s === 'occasional') return 'Even occasional smoking raises cardiovascular and respiratory risk'
  if (s === 'former')     return 'Former smokers still carry some residual risk compared to non-smokers'
  return undefined
})

const weightTooltip = computed(() => {
  const s = weightKpi.value.status
  if (s === 'warning') return 'You are more than 10 kg from your target — consider gradual adjustments'
  return undefined
})

const kpis = computed<KpiItem[]>(() => [
  { id: 'bmi',       label: 'BMI',                value: bmiKpi.value.value,       unit: bmiKpi.value.unit,       status: bmiKpi.value.status,       icon: 'pi pi-user',      description: 'Based on height & weight from profile', tooltip: bmiTooltip.value       },
  { id: 'cardio',    label: 'Cardiovascular Risk', value: cardioKpi.value.value,    unit: '',                      status: cardioKpi.value.status,    icon: 'pi pi-bolt',      description: 'Age, sex, BMI & lifestyle composite',   tooltip: cardioTooltip.value    },
  { id: 'lifestyle', label: 'Lifestyle Score',     value: lifestyleKpi.value.value, unit: '/100',                  status: lifestyleKpi.value.status, icon: 'pi pi-chart-bar', description: 'Sleep, fitness, smoking & alcohol',     tooltip: lifestyleTooltip.value },
  { id: 'weight',    label: 'Weight Goal',         value: weightKpi.value.value,    unit: weightKpi.value.unit,    status: weightKpi.value.status,    icon: 'pi pi-arrows-v',  description: weightKpi.value.description,             tooltip: weightTooltip.value    },
  { id: 'sleep',     label: 'Sleep',               value: sleepKpi.value.value,     unit: '',                      status: sleepKpi.value.status,     icon: 'pi pi-moon',      description: 'Avg. nightly sleep from profile',       tooltip: sleepTooltip.value     },
  { id: 'fitness',   label: 'Fitness Level',       value: fitnessKpi.value.label,   unit: '',                      status: fitnessKpi.value.status,   icon: 'pi pi-star',      description: 'Self-reported activity level',          tooltip: fitnessTooltip.value   },
  { id: 'smoking',   label: 'Smoking',             value: smokingKpi.value.label,   unit: '',                      status: smokingKpi.value.status,   icon: 'pi pi-ban',       description: 'Current smoking status',                tooltip: smokingTooltip.value   },
  { id: 'meds',      label: 'Medications',         value: medsKpi.value.value,      unit: '',                      status: medsKpi.value.status,      icon: 'pi pi-tablet',    description: 'Medications listed in profile'                                         },
])

type TrendSnapshot = { spo2: { values: number[]; labels: string[] }; hr: { values: number[]; labels: string[] }; temp: { values: number[]; labels: string[] } }

function currentTrends(): TrendSnapshot {
  return {
    spo2: { values: spo2Measuring.value ? [...spo2Buffer.value] : [...trendsStore.spo2Values], labels: spo2Measuring.value ? [...spo2Labels.value] : [...trendsStore.spo2Labels] },
    hr:   { values: hrMeasuring.value   ? [...hrBuffer.value]   : [...trendsStore.hrValues],   labels: hrMeasuring.value   ? [...hrLabels.value]   : [...trendsStore.hrLabels]   },
    temp: { values: tempMeasuring.value ? [...tempBuffer.value] : [...trendsStore.tempValues], labels: tempMeasuring.value ? [...tempLabels.value] : [...trendsStore.tempLabels] },
  }
}

async function downloadPdf() {
  const trends = currentTrends()
  const hasData = trends.spo2.values.length > 0 || trends.hr.values.length > 0 || trends.temp.values.length > 0
  if (!hasData) {
    showPdfWarning.value = true
    return
  }
  await executePdfDownload(trends)
}

async function executePdfDownload(trends?: TrendSnapshot) {
  showPdfWarning.value = false
  downloadingPdf.value = true
  await new Promise(r => setTimeout(r, 200))

  const now = new Date()
  const { doc, sizeKb } = generateDashboardPdf({
    kpis: kpis.value,
    userName: userStore.fullName,
    trends,
  })

  const fileName = `RoseGuard_Report_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)

  reportsStore.addReport({
    id: crypto.randomUUID(),
    title: `Dashboard Report — ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    generatedAt: now.toISOString(),
    sizeKb,
    pdfDataUrl: doc.output('datauristring'),
  })

  downloadingPdf.value = false
}

// ─── Per-metric measurement state ───────────────────────────────────────────

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// SpO2
const spo2Measuring = ref(false)
const spo2Buffer    = ref<number[]>([])
const spo2Labels    = ref<string[]>([])

// Heart Rate
const hrMeasuring = ref(false)
const hrBuffer    = ref<number[]>([])
const hrLabels    = ref<string[]>([])

// Temperature
const tempMeasuring = ref(false)
const tempBuffer    = ref<number[]>([])
const tempLabels    = ref<string[]>([])

const anyMeasuring = computed(() => spo2Measuring.value || hrMeasuring.value || tempMeasuring.value)

let spo2Interval: ReturnType<typeof setInterval> | null = null
let hrInterval:   ReturnType<typeof setInterval> | null = null
let tempInterval: ReturnType<typeof setInterval> | null = null

function toggleSpo2() {
  if (!spo2Measuring.value) {
    spo2Buffer.value = []
    spo2Labels.value = []
    spo2Measuring.value = true
    spo2Interval = setInterval(() => {
      const val = spo2.value
      if (val !== null && val > 0) {
        spo2Buffer.value.push(val)
        spo2Labels.value.push(nowLabel())
      }
    }, 1000)
  } else {
    if (spo2Interval !== null) { clearInterval(spo2Interval); spo2Interval = null }
    trendsStore.saveSpo2([...spo2Buffer.value], [...spo2Labels.value])
    spo2Measuring.value = false
  }
}

function toggleHr() {
  if (!hrMeasuring.value) {
    hrBuffer.value = []
    hrLabels.value = []
    hrMeasuring.value = true
    hrInterval = setInterval(() => {
      const val = heartRate.value
      if (val !== null && val > 0) {
        hrBuffer.value.push(val)
        hrLabels.value.push(nowLabel())
      }
    }, 1000)
  } else {
    if (hrInterval !== null) { clearInterval(hrInterval); hrInterval = null }
    trendsStore.saveHr([...hrBuffer.value], [...hrLabels.value])
    hrMeasuring.value = false
  }
}

function toggleTemp() {
  if (!tempMeasuring.value) {
    tempBuffer.value = []
    tempLabels.value = []
    tempMeasuring.value = true
    tempInterval = setInterval(() => {
      const val = temperature.value
      if (val !== null && val > 0) {
        tempBuffer.value.push(val)
        tempLabels.value.push(nowLabel())
      }
    }, 1000)
  } else {
    if (tempInterval !== null) { clearInterval(tempInterval); tempInterval = null }
    trendsStore.saveTemp([...tempBuffer.value], [...tempLabels.value])
    tempMeasuring.value = false
  }
}

function toggleAll() {
  if (anyMeasuring.value) {
    if (spo2Measuring.value) toggleSpo2()
    if (hrMeasuring.value)   toggleHr()
    if (tempMeasuring.value) toggleTemp()
  } else {
    if (!spo2Measuring.value) toggleSpo2()
    if (!hrMeasuring.value)   toggleHr()
    if (!tempMeasuring.value) toggleTemp()
  }
}

onUnmounted(() => {
  if (spo2Interval !== null) clearInterval(spo2Interval)
  if (hrInterval   !== null) clearInterval(hrInterval)
  if (tempInterval !== null) clearInterval(tempInterval)
})

// ─── Chart helpers ───────────────────────────────────────────────────────────

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

function makeChartOpts(
  color: string,
  values: number[],
  formatter: (v: number) => string,
  labels: string[],
  pad: number,
  minSpan: number,
  floor: number,
  ceil: number,
) {
  const [min, max, tickAmount] = yRange(values, pad, minSpan, floor, ceil)
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
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        opacityFrom: 0.35,
        opacityTo: 0.02,
      },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: labels,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min,
      max,
      tickAmount,
      labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: 'light', style: { fontSize: '12px' }, y: { formatter } },
    markers: { size: 0, hover: { size: 5 } },
  }
}

const spo2ChartOpts = computed(() =>
  makeChartOpts('#e91e8c',
    spo2Measuring.value ? spo2Buffer.value : trendsStore.spo2Values,
    (v: number) => `${v}%`,
    spo2Measuring.value ? spo2Labels.value : trendsStore.spo2Labels,
    1, 4, 85, 100))

const hrChartOpts = computed(() =>
  makeChartOpts('#f44336',
    hrMeasuring.value ? hrBuffer.value : trendsStore.hrValues,
    (v: number) => `${v} bpm`,
    hrMeasuring.value ? hrLabels.value : trendsStore.hrLabels,
    5, 20, 30, 220))

const tempChartOpts = computed(() =>
  makeChartOpts('#f59e0b',
    tempMeasuring.value ? tempBuffer.value : trendsStore.tempValues,
    (v: number) => `${v}°C`,
    tempMeasuring.value ? tempLabels.value : trendsStore.tempLabels,
    0.5, 2, 30, 43))

const spo2Series = computed(() => [{ name: 'SpO2',        data: spo2Measuring.value ? spo2Buffer.value : trendsStore.spo2Values }])
const hrSeries   = computed(() => [{ name: 'Heart Rate',  data: hrMeasuring.value   ? hrBuffer.value   : trendsStore.hrValues   }])
const tempSeries = computed(() => [{ name: 'Temperature', data: tempMeasuring.value ? tempBuffer.value : trendsStore.tempValues }])

const formattedDate = computed(() =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header animate-section" style="--s-delay: 0s">
      <div>
        <h1>Dashboard</h1>
        <p>{{ formattedDate }} &nbsp;·&nbsp; Last updated {{ lastUpdated }}</p>
      </div>
      <div class="header-actions">
        <button
          class="ble-btn"
          :class="{ connected: bioStore.bleConnected }"
          :disabled="bleConnecting"
          @click="toggleBle"
        >
          <i :class="bleConnecting ? 'pi pi-spin pi-spinner' : bioStore.bleConnected ? 'pi pi-wifi' : 'pi pi-bluetooth'" />
          {{ bleConnecting ? 'Connecting…' : bioStore.bleConnected ? 'Disconnect' : 'Connect Device' }}
        </button>
        <button class="pdf-btn" :disabled="downloadingPdf" @click="downloadPdf">
          <i :class="downloadingPdf ? 'pi pi-spin pi-spinner' : 'pi pi-file-pdf'" />
          {{ downloadingPdf ? 'Generating…' : 'Download PDF' }}
        </button>
      </div>
    </div>

    <!-- Live Readings -->
    <p class="section-title animate-section" style="--s-delay: 0.05s">
      Live Readings
      <span v-if="bioStore.bleConnected" class="finger-badge" :class="bioStore.fingerDetected ? 'on' : 'off'">
        <i class="pi pi-circle-fill" />
        {{ bioStore.fingerDetected ? 'Finger detected' : 'No finger' }}
      </span>
    </p>
    <div class="readings-grid">
      <div class="reading-wrap" style="--s-delay: 0.1s">
        <LiveReadingCard label="SpO2" :value="spo2" unit="%" :status="spo2Status" icon="pi pi-eye" />
      </div>
      <div class="reading-wrap" style="--s-delay: 0.18s">
        <LiveReadingCard label="Heart Rate" :value="heartRate" unit="BPM" :status="hrStatus" icon="pi pi-heart" />
      </div>
      <div class="reading-wrap" style="--s-delay: 0.26s">
        <LiveReadingCard label="Temperature" :value="temperature" unit="°C" :status="tempStatus" icon="pi pi-sun" />
        <Transition name="temp-tip">
          <div v-if="showTempWarning" class="temp-tip">
            <i class="pi pi-info-circle" />
            Please wait a moment while the sensor calibrates.
          </div>
        </Transition>
      </div>
    </div>

    <Transition name="position-tip">
      <div v-if="showPositionTip" class="position-tip">
        <i class="pi pi-info-circle" />
        <span v-if="positionTipVariant === 'no-signal'">
          Finger detected but no signal yet — try repositioning your finger on the sensor.
        </span>
        <span v-else>
          Reading looks off — try adjusting your finger position for a more accurate result.
        </span>
      </div>
    </Transition>

    <!-- Health KPIs -->
    <p class="section-title animate-section" style="margin-top: 32px; --s-delay: 0.32s">Health KPIs</p>
    <div class="kpi-grid">
      <div
        v-for="(kpi, i) in kpis"
        :key="kpi.id"
        class="kpi-wrap"
        :style="{ '--s-delay': `${0.36 + i * 0.06}s` }"
      >
        <KpiCard
          :label="kpi.label"
          :value="kpi.value"
          :unit="kpi.unit"
          :status="kpi.status"
          :icon="kpi.icon"
          :description="kpi.description"
          :tooltip="kpi.tooltip"
        />
      </div>
    </div>

    <!-- Metric Trend Charts -->
    <div class="section-title-row animate-section" style="margin-top: 32px; --s-delay: 0.85s">
      <p class="section-title" style="margin: 0">Metric Trends</p>
      <button class="measure-all-btn" :class="{ stopping: anyMeasuring }" @click="toggleAll">
        <i :class="anyMeasuring ? 'pi pi-stop-circle' : 'pi pi-play-circle'" />
        {{ anyMeasuring ? 'Stop All' : 'Measure All' }}
      </button>
    </div>
    <div class="charts-grid">

      <!-- SpO2 -->
      <div class="chart-card card animate-section" style="--s-delay: 0.9s">
        <div class="chart-header">
          <div>
            <span class="chart-title">SpO2</span>
            <span class="chart-subtitle">Blood oxygen saturation</span>
          </div>
          <button class="measure-btn" :class="{ recording: spo2Measuring }" @click="toggleSpo2">
            <i :class="spo2Measuring ? 'pi pi-stop-circle' : 'pi pi-play-circle'" />
            {{ spo2Measuring ? 'Stop measuring' : 'Start measuring' }}
          </button>
        </div>
        <div v-if="!spo2Measuring && trendsStore.spo2Values.length === 0" class="chart-empty">
          <i class="pi pi-chart-line" />
          <span>Press "Start measuring" to begin</span>
        </div>
        <apexchart v-else type="area" height="180" :options="spo2ChartOpts" :series="spo2Series" />
      </div>

      <!-- Heart Rate -->
      <div class="chart-card card animate-section" style="--s-delay: 0.95s">
        <div class="chart-header">
          <div>
            <span class="chart-title">Heart Rate</span>
            <span class="chart-subtitle">Beats per minute</span>
          </div>
          <button class="measure-btn" :class="{ recording: hrMeasuring }" @click="toggleHr">
            <i :class="hrMeasuring ? 'pi pi-stop-circle' : 'pi pi-play-circle'" />
            {{ hrMeasuring ? 'Stop measuring' : 'Start measuring' }}
          </button>
        </div>
        <div v-if="!hrMeasuring && trendsStore.hrValues.length === 0" class="chart-empty">
          <i class="pi pi-chart-line" />
          <span>Press "Start measuring" to begin</span>
        </div>
        <apexchart v-else type="area" height="180" :options="hrChartOpts" :series="hrSeries" />
      </div>

      <!-- Temperature -->
      <div class="chart-card card animate-section" style="--s-delay: 1.0s">
        <div class="chart-header">
          <div>
            <span class="chart-title">Temperature</span>
            <span class="chart-subtitle">Body temperature (°C)</span>
          </div>
          <button class="measure-btn" :class="{ recording: tempMeasuring }" @click="toggleTemp">
            <i :class="tempMeasuring ? 'pi pi-stop-circle' : 'pi pi-play-circle'" />
            {{ tempMeasuring ? 'Stop measuring' : 'Start measuring' }}
          </button>
        </div>
        <div v-if="!tempMeasuring && trendsStore.tempValues.length === 0" class="chart-empty">
          <i class="pi pi-chart-line" />
          <span>Press "Start measuring" to begin</span>
        </div>
        <apexchart v-else type="area" height="180" :options="tempChartOpts" :series="tempSeries" />
      </div>

    </div>

    <Transition name="pdf-warn">
      <div v-if="showPdfWarning" class="pdf-warn-overlay">
        <div class="pdf-warn-dialog">
          <h3>No trends recorded</h3>
          <p>
            You haven't started measuring any metrics yet. Use the "Start measuring" button on each chart first.
            If you continue, the PDF will only contain your Health KPIs — no trend charts.
          </p>
          <div class="pdf-warn-actions">
            <button class="pdf-warn-back" @click="showPdfWarning = false">
              Go back and measure
            </button>
            <button class="pdf-warn-proceed" @click="executePdfDownload()">
              Download without trends
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.ble-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: #f1f5f9;
  color: #475569;
  border: 1.5px solid #e2e8f0;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.ble-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.ble-btn.connected {
  background: #dcfce7;
  color: #16a34a;
  border-color: #86efac;
}

.ble-btn.connected:hover:not(:disabled) {
  background: #bbf7d0;
}

.ble-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.finger-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  vertical-align: middle;
}

.finger-badge.on  { background: #dcfce7; color: #16a34a; }
.finger-badge.off { background: #fef9c3; color: #a16207; }

.pdf-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.pdf-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 14px rgba(233, 30, 140, 0.35);
  transform: translateY(-1px);
}

.pdf-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.pdf-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

/* Entrance animation */
.animate-section {
  animation: fade-up 0.45s ease var(--s-delay, 0s) both;
}

.reading-wrap {
  animation: fade-up 0.45s ease var(--s-delay, 0s) both;
}

.kpi-wrap {
  animation: fade-up 0.4s ease var(--s-delay, 0s) both;
  position: relative;
  z-index: 1;
}

.kpi-wrap:has(.kpi-card:hover) {
  z-index: 10;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.readings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
}

.measure-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.measure-all-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 14px rgba(233, 30, 140, 0.35);
  transform: translateY(-1px);
}

.measure-all-btn:active {
  transform: translateY(0) scale(0.97);
}

.measure-all-btn.stopping {
  background: #b91c1c;
  box-shadow: none;
}

.measure-all-btn.stopping:hover {
  background: #991b1b;
  box-shadow: 0 4px 14px rgba(185, 28, 28, 0.3);
}

/* Metric trend charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.chart-card {
  padding: 20px 20px 12px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}

.chart-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.chart-subtitle {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.measure-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  color: #475569;
  border: 1.5px solid #e2e8f0;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.measure-btn:hover {
  background: #e2e8f0;
}

.measure-btn.recording {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.measure-btn.recording:hover {
  background: #fecaca;
}

.chart-empty {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #b0bec5;
  font-size: 13px;
}

.chart-empty .pi {
  font-size: 30px;
  opacity: 0.35;
}

@media (max-width: 1200px) {
  .kpi-grid    { grid-template-columns: repeat(3, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
}

@media (max-width: 900px) {
  .readings-grid { grid-template-columns: 1fr; }
  .kpi-grid      { grid-template-columns: repeat(2, 1fr); }
}

/* BPM placement tip */
/* Temperature calibration tip */
.temp-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 7px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.45;
}

.temp-tip .pi {
  font-size: 13px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #f97316;
}

.temp-tip-enter-active,
.temp-tip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.temp-tip-enter-from,
.temp-tip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Sensor position tip */
.position-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 9px;
  font-size: 13px;
  color: #1e40af;
  line-height: 1.5;
}

.position-tip .pi {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #3b82f6;
}

.position-tip-enter-active,
.position-tip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.position-tip-enter-from,
.position-tip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* PDF warning dialog */
.pdf-warn-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.pdf-warn-dialog {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 28px 32px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.pdf-warn-dialog h3 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.pdf-warn-dialog p {
  margin: 0 0 22px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.pdf-warn-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.pdf-warn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  color: #475569;
  border: 1.5px solid #e2e8f0;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}

.pdf-warn-back:hover {
  background: #e2e8f0;
}

.pdf-warn-proceed {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}

.pdf-warn-proceed:hover {
  background: var(--color-primary-dark);
}

.pdf-warn-enter-active,
.pdf-warn-leave-active {
  transition: opacity 0.2s ease;
}

.pdf-warn-enter-from,
.pdf-warn-leave-to {
  opacity: 0;
}
</style>
