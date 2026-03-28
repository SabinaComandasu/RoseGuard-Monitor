<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Reading {
  timestamp: Date
  spo2: number
  heartRate: number
  temperature: number
}

type Period = 'today' | '7days' | '30days'

// ─── Mock data generator ─────────────────────────────────────────────────────
function generateReadings(period: Period): Reading[] {
  const now = new Date()
  const readings: Reading[] = []

  const configs: Record<Period, { count: number; stepMinutes: number }> = {
    today:  { count: 96,  stepMinutes: 15  },
    '7days':  { count: 84,  stepMinutes: 120 },
    '30days': { count: 120, stepMinutes: 360 },
  }

  const { count, stepMinutes } = configs[period]

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * stepMinutes * 60 * 1000)
    const hourOfDay = t.getHours()

    // Simulate circadian variation
    const hrBase    = hourOfDay >= 6 && hourOfDay <= 22 ? 72 : 58
    const spo2Base  = 97
    const tempBase  = hourOfDay >= 15 && hourOfDay <= 19 ? 36.8 : 36.5

    readings.push({
      timestamp:   t,
      spo2:        Math.min(100, Math.max(93, Math.round(spo2Base  + (Math.random() - 0.4) * 3))),
      heartRate:   Math.round(hrBase   + (Math.random() - 0.5) * 18),
      temperature: Math.round((tempBase + (Math.random() - 0.5) * 0.6) * 10) / 10,
    })
  }
  return readings
}

// ─── State ───────────────────────────────────────────────────────────────────
const period  = ref<Period>('7days')
const readings = ref<Reading[]>(generateReadings('7days'))
const page    = ref(1)
const PAGE_SIZE = 20

watch(period, (p) => {
  readings.value = generateReadings(p)
  page.value = 1
})

// ─── Summary stats ────────────────────────────────────────────────────────────
function stats(key: 'spo2' | 'heartRate' | 'temperature') {
  const vals = readings.value.map(r => r[key])
  const avg  = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  const min  = Math.min(...vals)
  const max  = Math.max(...vals)
  return { avg, min, max }
}

const spo2Stats  = computed(() => stats('spo2'))
const hrStats    = computed(() => stats('heartRate'))
const tempStats  = computed(() => stats('temperature'))

// ─── Chart helpers ────────────────────────────────────────────────────────────
function makeLabels() {
  return readings.value.map(r => {
    if (period.value === 'today')
      return r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return r.timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' ' + r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

function baseChart(color: string, yMin: number, yMax: number, unit: string) {
  return {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, background: 'transparent', fontFamily: 'Inter, sans-serif', sparkline: { enabled: false } },
    colors: [color],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } },
    stroke: { curve: 'smooth', width: 2.5 },
    grid: { borderColor: '#fce4ec', strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: makeLabels(),
      labels: { style: { colors: '#b0bec5', fontSize: '10px' }, rotate: 0 },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 8,
    },
    yaxis: { min: yMin, max: yMax, labels: { style: { colors: '#b0bec5', fontSize: '11px' }, formatter: (v: number) => `${v}${unit}` } },
    tooltip: { theme: 'light', style: { fontSize: '12px' }, y: { formatter: (v: number) => `${v}${unit}` } },
    markers: { size: 0, hover: { size: 4 } },
    dataLabels: { enabled: false },
  }
}

const spo2Chart = computed(() => ({
  options: baseChart('#e91e8c', 90, 100, '%'),
  series: [{ name: 'SpO2', data: readings.value.map(r => r.spo2) }],
}))

const hrChart = computed(() => ({
  options: baseChart('#f44336', 40, 120, ' BPM'),
  series: [{ name: 'Heart Rate', data: readings.value.map(r => r.heartRate) }],
}))

const tempChart = computed(() => ({
  options: baseChart('#f59e0b', 35, 38.5, '°C'),
  series: [{ name: 'Temperature', data: readings.value.map(r => r.temperature) }],
}))

// ─── Table ────────────────────────────────────────────────────────────────────
const sortedReadings = computed(() =>
  [...readings.value].reverse()
)

const paginatedReadings = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sortedReadings.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed(() => Math.ceil(sortedReadings.value.length / PAGE_SIZE))

function rowStatus(r: Reading): 'normal' | 'warning' | 'critical' {
  if (r.spo2 < 94 || r.heartRate > 100 || r.heartRate < 50 || r.temperature > 37.5) return 'critical'
  if (r.spo2 < 96 || r.heartRate > 90 || r.temperature > 37.2) return 'warning'
  return 'normal'
}

function formatTs(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const periods: { value: Period; label: string }[] = [
  { value: 'today',  label: 'Today'   },
  { value: '7days',  label: '7 Days'  },
  { value: '30days', label: '30 Days' },
]
</script>

<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header animate-s" style="--s-delay:0s">
      <div>
        <h1>History</h1>
        <p>Historical biometric readings and trends over time</p>
      </div>
      <div class="period-tabs">
        <button
          v-for="p in periods"
          :key="p.value"
          class="period-tab"
          :class="{ active: period === p.value }"
          @click="period = p.value"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Summary stats -->
    <div class="stats-grid animate-s" style="--s-delay:0.06s">

      <div class="stat-card card">
        <div class="stat-header">
          <div class="stat-icon spo2"><i class="pi pi-eye" /></div>
          <span class="stat-label">SpO2</span>
        </div>
        <div class="stat-avg">{{ spo2Stats.avg }}<span class="stat-unit">%</span></div>
        <div class="stat-range">
          <span class="range-item"><i class="pi pi-arrow-down" /> {{ spo2Stats.min }}%</span>
          <span class="range-divider" />
          <span class="range-item"><i class="pi pi-arrow-up" /> {{ spo2Stats.max }}%</span>
        </div>
        <div class="stat-sub">avg · min · max</div>
      </div>

      <div class="stat-card card">
        <div class="stat-header">
          <div class="stat-icon hr"><i class="pi pi-heart" /></div>
          <span class="stat-label">Heart Rate</span>
        </div>
        <div class="stat-avg">{{ hrStats.avg }}<span class="stat-unit">BPM</span></div>
        <div class="stat-range">
          <span class="range-item"><i class="pi pi-arrow-down" /> {{ hrStats.min }} BPM</span>
          <span class="range-divider" />
          <span class="range-item"><i class="pi pi-arrow-up" /> {{ hrStats.max }} BPM</span>
        </div>
        <div class="stat-sub">avg · min · max</div>
      </div>

      <div class="stat-card card">
        <div class="stat-header">
          <div class="stat-icon temp"><i class="pi pi-sun" /></div>
          <span class="stat-label">Temperature</span>
        </div>
        <div class="stat-avg">{{ tempStats.avg }}<span class="stat-unit">°C</span></div>
        <div class="stat-range">
          <span class="range-item"><i class="pi pi-arrow-down" /> {{ tempStats.min }}°C</span>
          <span class="range-divider" />
          <span class="range-item"><i class="pi pi-arrow-up" /> {{ tempStats.max }}°C</span>
        </div>
        <div class="stat-sub">avg · min · max</div>
      </div>

    </div>

    <!-- Charts -->
    <div class="charts-stack">

      <div class="chart-card card animate-s" style="--s-delay:0.12s">
        <div class="chart-label">
          <span class="chart-dot spo2" />
          SpO2 — Oxygen Saturation
        </div>
        <apexchart type="area" height="180" :options="spo2Chart.options" :series="spo2Chart.series" />
      </div>

      <div class="chart-card card animate-s" style="--s-delay:0.18s">
        <div class="chart-label">
          <span class="chart-dot hr" />
          Heart Rate
        </div>
        <apexchart type="area" height="180" :options="hrChart.options" :series="hrChart.series" />
      </div>

      <div class="chart-card card animate-s" style="--s-delay:0.24s">
        <div class="chart-label">
          <span class="chart-dot temp" />
          Body Temperature
        </div>
        <apexchart type="area" height="180" :options="tempChart.options" :series="tempChart.series" />
      </div>

    </div>

    <!-- Readings table -->
    <div class="table-card card animate-s" style="--s-delay:0.3s">
      <div class="table-header">
        <span class="table-title">All Readings</span>
        <span class="table-count">{{ sortedReadings.length }} entries</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>SpO2</th>
              <th>Heart Rate</th>
              <th>Temperature</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paginatedReadings" :key="r.timestamp.getTime()">
              <td class="ts-cell">{{ formatTs(r.timestamp) }}</td>
              <td><span class="val">{{ r.spo2 }}<span class="unit">%</span></span></td>
              <td><span class="val">{{ r.heartRate }}<span class="unit">BPM</span></span></td>
              <td><span class="val">{{ r.temperature }}<span class="unit">°C</span></span></td>
              <td><span class="status-badge" :class="rowStatus(r)">{{ rowStatus(r) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <button class="page-btn" :disabled="page === 1" @click="page--">
          <i class="pi pi-chevron-left" />
        </button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="page-btn" :disabled="page === totalPages" @click="page++">
          <i class="pi pi-chevron-right" />
        </button>
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

/* ── Header ─────────────────────────────────────────────── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.period-tabs {
  display: flex;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px;
}

.period-tab {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.period-tab:hover { color: var(--color-primary); }

.period-tab.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(233, 30, 140, 0.3);
}

/* ── Summary stats ──────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.stat-icon.spo2 { background: #fce4ec; color: #e91e8c; }
.stat-icon.hr   { background: #ffebee; color: #f44336; }
.stat-icon.temp { background: #fff8e1; color: #f59e0b; }

.stat-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
}

.stat-avg {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -1.5px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-unit {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-left: 2px;
}

.stat-range {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.range-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.range-item i { font-size: 10px; }

.range-divider {
  width: 1px;
  height: 12px;
  background: var(--color-border);
}

.stat-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* ── Charts ─────────────────────────────────────────────── */
.charts-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
}

.chart-card {
  padding: 20px 22px 10px;
}

.chart-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.chart-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-dot.spo2 { background: #e91e8c; }
.chart-dot.hr   { background: #f44336; }
.chart-dot.temp { background: #f59e0b; }

/* ── Table ──────────────────────────────────────────────── */
.table-card { padding: 0; overflow: hidden; }

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--color-border);
}

.table-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.table-count {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 3px 10px;
}

.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
}

thead tr {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

thead th {
  padding: 10px 20px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

tbody tr {
  border-bottom: 1px solid var(--color-border);
  transition: background 0.12s ease;
}

tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(--color-surface-hover); }

tbody td {
  padding: 11px 20px;
  font-size: 13px;
  color: var(--color-text-primary);
}

.ts-cell {
  color: var(--color-text-secondary);
  font-size: 12.5px;
  white-space: nowrap;
}

.val { font-weight: 700; }

.unit {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-left: 2px;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px;
  border-top: 1px solid var(--color-border);
}

.page-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 14px; }
}
</style>
