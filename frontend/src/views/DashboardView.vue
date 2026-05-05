<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LiveReadingCard from '@/components/LiveReadingCard.vue'
import KpiCard from '@/components/KpiCard.vue'
import { generateDashboardPdf } from '@/services/pdfGenerator'
import { useReportsStore } from '@/stores/reports'
import { useUserStore } from '@/stores/user'
import { useBiometricsStore } from '@/stores/biometrics'
import { connectBle, disconnectBle } from '@/services/ble'
import type { KpiItem } from '@/types'

const reportsStore = useReportsStore()
const userStore    = useUserStore()
const bioStore     = useBiometricsStore()

const spo2        = computed(() => bioStore.spo2        ?? 0)
const heartRate   = computed(() => bioStore.heartRate   ?? 0)
const temperature = computed(() => bioStore.temperature ?? 0)
const lastUpdated = computed(() => bioStore.lastUpdated ?? '--')

const downloadingPdf    = ref(false)
const bleConnecting     = ref(false)
const showTempWarning   = ref(false)
const showBpmTip        = ref(false)

watch(temperature, (val) => {
  showTempWarning.value = val > 40
})

watch([heartRate, () => bioStore.fingerDetected], ([bpm, finger]) => {
  showBpmTip.value = !!finger && (bpm as number) < 70
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

// --- Mock KPIs (will be replaced by backend) ---
const kpis: KpiItem[] = [
  { id: 'bmi', label: 'BMI', value: '22.4', unit: 'kg/m²', status: 'normal', icon: 'pi pi-user', description: 'Based on height & weight from profile' },
  { id: 'hrv', label: 'Heart Rate Variability', value: '48', unit: 'ms', status: 'normal', icon: 'pi pi-heart', description: 'Measured from pulse patterns' },
  { id: 'cardio', label: 'Cardiovascular Risk', value: 'Low', unit: '', status: 'normal', icon: 'pi pi-bolt', description: 'Age + pulse + SpO2 + BMI composite' },
  { id: 'stress', label: 'Stress Indicator', value: 'Moderate', unit: '', status: 'warning', icon: 'pi pi-exclamation-circle', description: 'Derived from HRV & pulse patterns' },
  { id: 'temp', label: 'Body Temp Status', value: '36.6', unit: '°C', status: 'normal', icon: 'pi pi-sun', description: 'Normal range: 36.1 – 37.2 °C' },
  { id: 'anomaly', label: 'Anomaly Flags', value: '0', unit: '', status: 'normal', icon: 'pi pi-flag', description: 'Deviations from your baseline' },
  { id: 'trend', label: '7-Day Trend', value: '+2.1', unit: '%', status: 'normal', icon: 'pi pi-chart-line', description: 'Overall health score change' },
  { id: 'rhr', label: 'Resting Heart Rate', value: '68', unit: 'BPM', status: 'normal', icon: 'pi pi-heart-fill', description: 'Average over last 24 hours' },
]

async function downloadPdf() {
  downloadingPdf.value = true
  await new Promise(r => setTimeout(r, 200))

  const now = new Date()
  const { doc, sizeKb } = generateDashboardPdf({
    spo2: spo2.value,
    heartRate: heartRate.value,
    temperature: temperature.value,
    kpis,
    userName: userStore.fullName,
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
const spo2Measuring   = ref(false)
const spo2Buffer      = ref<number[]>([])
const spo2Labels      = ref<string[]>([])
const spo2Frozen      = ref<number[]>([])
const spo2FrozenLbls  = ref<string[]>([])

// Heart Rate
const hrMeasuring     = ref(false)
const hrBuffer        = ref<number[]>([])
const hrLabels        = ref<string[]>([])
const hrFrozen        = ref<number[]>([])
const hrFrozenLbls    = ref<string[]>([])

// Temperature
const tempMeasuring   = ref(false)
const tempBuffer      = ref<number[]>([])
const tempLabels      = ref<string[]>([])
const tempFrozen      = ref<number[]>([])
const tempFrozenLbls  = ref<string[]>([])

watch(spo2, (val) => {
  if (spo2Measuring.value && val !== null && val > 0) {
    spo2Buffer.value.push(val)
    spo2Labels.value.push(nowLabel())
  }
})

watch(heartRate, (val) => {
  if (hrMeasuring.value && val !== null && val > 0) {
    hrBuffer.value.push(val)
    hrLabels.value.push(nowLabel())
  }
})

watch(temperature, (val) => {
  if (tempMeasuring.value && val !== null && val > 0) {
    tempBuffer.value.push(val)
    tempLabels.value.push(nowLabel())
  }
})

function toggleSpo2() {
  if (!spo2Measuring.value) {
    spo2Buffer.value = []
    spo2Labels.value = []
    spo2Measuring.value = true
  } else {
    spo2Frozen.value    = [...spo2Buffer.value]
    spo2FrozenLbls.value = [...spo2Labels.value]
    spo2Measuring.value = false
  }
}

function toggleHr() {
  if (!hrMeasuring.value) {
    hrBuffer.value = []
    hrLabels.value = []
    hrMeasuring.value = true
  } else {
    hrFrozen.value    = [...hrBuffer.value]
    hrFrozenLbls.value = [...hrLabels.value]
    hrMeasuring.value = false
  }
}

function toggleTemp() {
  if (!tempMeasuring.value) {
    tempBuffer.value = []
    tempLabels.value = []
    tempMeasuring.value = true
  } else {
    tempFrozen.value    = [...tempBuffer.value]
    tempFrozenLbls.value = [...tempLabels.value]
    tempMeasuring.value = false
  }
}

// ─── Chart helpers ───────────────────────────────────────────────────────────

function makeChartOpts(
  color: string,
  min: number,
  max: number,
  formatter: (v: number) => string,
  labels: string[],
) {
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
      labels: { style: { colors: '#b0bec5', fontSize: '10px' }, rotate: 0 },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 5,
    },
    yaxis: {
      min,
      max,
      labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter },
    },
    legend: { show: false },
    tooltip: { theme: 'light', style: { fontSize: '12px' }, y: { formatter } },
    markers: { size: 0, hover: { size: 5 } },
  }
}

const spo2ChartOpts = computed(() =>
  makeChartOpts('#e91e8c', 90, 100, (v: number) => `${v}%`,
    spo2Measuring.value ? spo2Labels.value : spo2FrozenLbls.value))

const hrChartOpts = computed(() =>
  makeChartOpts('#f44336', 40, 160, (v: number) => `${v} bpm`,
    hrMeasuring.value ? hrLabels.value : hrFrozenLbls.value))

const tempChartOpts = computed(() =>
  makeChartOpts('#f59e0b', 34, 40, (v: number) => `${v}°C`,
    tempMeasuring.value ? tempLabels.value : tempFrozenLbls.value))

const spo2Series  = computed(() => [{ name: 'SpO2',        data: spo2Measuring.value  ? spo2Buffer.value  : spo2Frozen.value  }])
const hrSeries    = computed(() => [{ name: 'Heart Rate',  data: hrMeasuring.value    ? hrBuffer.value    : hrFrozen.value    }])
const tempSeries  = computed(() => [{ name: 'Temperature', data: tempMeasuring.value  ? tempBuffer.value  : tempFrozen.value  }])

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
        <LiveReadingCard label="SpO2" :value="spo2" unit="%" status="normal" icon="pi pi-eye" :trend="0" />
      </div>
      <div class="reading-wrap" style="--s-delay: 0.18s">
        <LiveReadingCard label="Heart Rate" :value="heartRate" unit="BPM" status="normal" icon="pi pi-heart" :trend="2" />
        <Transition name="bpm-tip">
          <div v-if="showBpmTip" class="bpm-tip">
            <i class="pi pi-info-circle" />
            Try adjusting your finger position on the sensor for a better reading.
          </div>
        </Transition>
      </div>
      <div class="reading-wrap" style="--s-delay: 0.26s">
        <LiveReadingCard label="Temperature" :value="temperature" unit="°C" status="normal" icon="pi pi-sun" :trend="-0.1" />
        <Transition name="temp-tip">
          <div v-if="showTempWarning" class="temp-tip">
            <i class="pi pi-info-circle" />
            Please wait a moment while the sensor calibrates.
          </div>
        </Transition>
      </div>
    </div>

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
        />
      </div>
    </div>

    <!-- Metric Trend Charts -->
    <p class="section-title animate-section" style="margin-top: 32px; --s-delay: 0.85s">Metric Trends</p>
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
        <div v-if="!spo2Measuring && spo2Frozen.length === 0" class="chart-empty">
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
        <div v-if="!hrMeasuring && hrFrozen.length === 0" class="chart-empty">
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
        <div v-if="!tempMeasuring && tempFrozen.length === 0" class="chart-empty">
          <i class="pi pi-chart-line" />
          <span>Press "Start measuring" to begin</span>
        </div>
        <apexchart v-else type="area" height="180" :options="tempChartOpts" :series="tempSeries" />
      </div>

    </div>
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
.bpm-tip {
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

.bpm-tip .pi {
  font-size: 13px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #f97316;
}

.bpm-tip-enter-active,
.bpm-tip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.bpm-tip-enter-from,
.bpm-tip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

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
</style>
