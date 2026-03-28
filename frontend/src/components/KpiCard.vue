<script setup lang="ts">
import type { HealthStatus } from '@/types'

defineProps<{
  label: string
  value: string | number | null
  unit?: string
  status: HealthStatus
  icon: string
  description: string
}>()

const statusLabel: Record<HealthStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'No Data',
}
</script>

<template>
  <div class="kpi-card card">
    <div class="kpi-top">
      <div class="kpi-icon-wrap" :class="status">
        <i :class="icon" />
      </div>
      <span class="status-badge" :class="status">{{ statusLabel[status] }}</span>
    </div>

    <div class="kpi-value-row">
      <span class="kpi-value">{{ value ?? '—' }}</span>
      <span v-if="unit && value !== null" class="kpi-unit">{{ unit }}</span>
    </div>

    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-desc">{{ description }}</div>
  </div>
</template>

<style scoped>
.kpi-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.kpi-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: transform 0.2s ease;
}

.kpi-card:hover .kpi-icon-wrap {
  transform: scale(1.15) rotate(-8deg);
}

.kpi-icon-wrap.normal  { background: var(--color-normal-bg);  color: var(--color-normal); }
.kpi-icon-wrap.warning { background: var(--color-warning-bg); color: var(--color-warning); }
.kpi-icon-wrap.critical{ background: var(--color-critical-bg);color: var(--color-critical); }
.kpi-icon-wrap.unknown { background: var(--color-unknown-bg); color: var(--color-unknown); }

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}

.kpi-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.kpi-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.kpi-desc {
  font-size: 11.5px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}
</style>
