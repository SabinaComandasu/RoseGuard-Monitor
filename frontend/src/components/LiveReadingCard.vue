<script setup lang="ts">
import type { HealthStatus } from '@/types'

const props = defineProps<{
  label: string
  value: number | null
  unit: string
  status: HealthStatus
  icon: string
  trend?: number | null
}>()

const statusLabel: Record<HealthStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'No Data',
}

const statusDot: Record<HealthStatus, string> = {
  normal: '●',
  warning: '●',
  critical: '●',
  unknown: '●',
}
</script>

<template>
  <div class="reading-card card" :class="status">
    <div class="card-top">
      <span class="card-label">{{ label }}</span>
      <span class="card-icon"><i :class="icon" /></span>
    </div>

    <div class="card-value-row">
      <span class="card-value">{{ value ?? '—' }}</span>
      <span class="card-unit">{{ value !== null ? unit : '' }}</span>
    </div>

    <div class="card-footer">
      <span class="status-badge" :class="status">
        {{ statusDot[status] }} {{ statusLabel[status] }}
      </span>
      <span v-if="trend !== null && trend !== undefined" class="trend" :class="trend >= 0 ? 'up' : 'down'">
        {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}{{ unit }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.reading-card {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 3px solid var(--color-border);
  transition: all 0.2s ease;
}

.reading-card.normal { border-top-color: var(--color-normal); }
.reading-card.warning { border-top-color: var(--color-warning); }
.reading-card.critical { border-top-color: var(--color-critical); }
.reading-card.unknown { border-top-color: var(--color-unknown); }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.card-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 15px;
}

.card-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.card-value {
  font-size: 42px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -2px;
  line-height: 1;
}

.card-unit {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trend {
  font-size: 12px;
  font-weight: 600;
}

.trend.up { color: var(--color-critical); }
.trend.down { color: var(--color-normal); }
</style>
