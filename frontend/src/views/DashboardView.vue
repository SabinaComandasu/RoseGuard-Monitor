<script setup lang="ts">
import { ref, computed } from 'vue'
import LiveReadingCard from '@/components/LiveReadingCard.vue'
import KpiCard from '@/components/KpiCard.vue'
import type { KpiItem } from '@/types'

// --- Mock live readings (will be replaced by SignalR) ---
const spo2 = ref(98)
const heartRate = ref(72)
const temperature = ref(36.6)
const lastUpdated = ref(new Date().toLocaleTimeString())

// --- Mock KPIs (will be replaced by backend) ---
const kpis: KpiItem[] = [
  { id: 'bmi', label: 'BMI', value: '22.4', unit: 'kg/m²', status: 'normal', icon: 'pi pi-user', description: 'Based on height & weight from profile' },
  { id: 'hrv', label: 'Heart Rate Variability', value: '48', unit: 'ms', status: 'normal', icon: 'pi pi-heart', description: 'Measured from pulse patterns' },
  { id: 'cardio', label: 'Cardiovascular Risk', value: 'Low', unit: '', status: 'normal', icon: 'pi pi-bolt', description: 'Age + pulse + SpO2 + BMI composite' },
  { id: 'stress', label: 'Stress Indicator', value: 'Moderate', unit: '', status: 'warning', icon: 'pi pi-exclamation-circle', description: 'Derived from HRV & pulse patterns' },
  { id: 'temp', label: 'Body Temp Status', value: '36.6', unit: '°C', status: 'normal', icon: 'pi pi-sun', description: 'Normal range: 36.1 – 37.2 °C' },
  { id: 'anomaly', label: 'Anomaly Flags', value: '0', unit: '', status: 'normal', icon: 'pi pi-flag', description: 'Deviations from your baseline' },
  { id: 'trend', label: '7-Day Trend', value: '+2.1', unit: '%', status: 'normal', icon: 'pi pi-trending-up', description: 'Overall health score change' },
  { id: 'rhr', label: 'Resting Heart Rate', value: '68', unit: 'BPM', status: 'normal', icon: 'pi pi-heart-fill', description: 'Average over last 24 hours' },
]

// --- Chart data (mock last 24 readings) ---
const mockTimestamps = Array.from({ length: 20 }, (_, i) => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - (19 - i) * 5)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const chartOptions = ref({
  chart: {
    type: 'line',
    toolbar: { show: false },
    zoom: { enabled: false },
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
  },
  colors: ['#e91e8c', '#f44336', '#f59e0b'],
  stroke: { curve: 'smooth', width: [2.5, 2.5, 2.5] },
  grid: {
    borderColor: '#fce4ec',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  xaxis: {
    categories: mockTimestamps,
    labels: {
      style: { colors: '#b0bec5', fontSize: '11px' },
      rotate: 0,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
    tickAmount: 5,
  },
  yaxis: [
    {
      seriesName: 'SpO2',
      min: 90,
      max: 100,
      labels: { style: { colors: '#e91e8c', fontSize: '11px' }, formatter: (v: number) => `${v}%` },
    },
    {
      seriesName: 'Heart Rate',
      opposite: true,
      min: 50,
      max: 110,
      labels: { style: { colors: '#f44336', fontSize: '11px' }, formatter: (v: number) => `${v}bpm` },
    },
    {
      seriesName: 'Temperature',
      show: false,
      min: 35,
      max: 38,
    },
  ],
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '12px',
    labels: { colors: '#78909c' },
    markers: { size: 6, shape: 'circle' },
  },
  tooltip: {
    shared: true,
    theme: 'light',
    style: { fontSize: '12px' },
  },
  markers: { size: 0, hover: { size: 5 } },
})

const chartSeries = ref([
  {
    name: 'SpO2',
    data: [97, 98, 97, 98, 99, 98, 97, 98, 98, 99, 98, 97, 98, 97, 98, 99, 98, 98, 97, 98],
  },
  {
    name: 'Heart Rate',
    data: [70, 73, 75, 72, 68, 71, 74, 70, 69, 72, 75, 73, 70, 71, 72, 70, 74, 72, 71, 72],
  },
  {
    name: 'Temperature',
    data: [36.5, 36.6, 36.6, 36.7, 36.6, 36.5, 36.6, 36.7, 36.6, 36.6, 36.5, 36.6, 36.7, 36.6, 36.6, 36.5, 36.6, 36.6, 36.7, 36.6],
  },
])

const formattedDate = computed(() =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header animate-section" style="--s-delay: 0s">
      <h1>Dashboard</h1>
      <p>{{ formattedDate }} &nbsp;·&nbsp; Last updated {{ lastUpdated }}</p>
    </div>

    <!-- Live Readings -->
    <p class="section-title animate-section" style="--s-delay: 0.05s">Live Readings</p>
    <div class="readings-grid">
      <div class="reading-wrap" style="--s-delay: 0.1s">
        <LiveReadingCard label="SpO2" :value="spo2" unit="%" status="normal" icon="pi pi-eye" :trend="0" />
      </div>
      <div class="reading-wrap" style="--s-delay: 0.18s">
        <LiveReadingCard label="Heart Rate" :value="heartRate" unit="BPM" status="normal" icon="pi pi-heart" :trend="2" />
      </div>
      <div class="reading-wrap" style="--s-delay: 0.26s">
        <LiveReadingCard label="Temperature" :value="temperature" unit="°C" status="normal" icon="pi pi-sun" :trend="-0.1" />
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

    <!-- Trend Chart -->
    <p class="section-title animate-section" style="margin-top: 32px; --s-delay: 0.85s">24-Hour Trend</p>
    <div class="chart-card card animate-section" style="--s-delay: 0.9s">
      <div class="chart-header">
        <div>
          <span class="chart-title">Biometric Overview</span>
          <span class="chart-subtitle">SpO2, Heart Rate & Temperature — last 100 minutes</span>
        </div>
      </div>
      <apexchart
        type="line"
        height="280"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>
  </div>
</template>

<style scoped>
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

.chart-card {
  padding: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.chart-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.chart-subtitle {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 900px) {
  .readings-grid { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
