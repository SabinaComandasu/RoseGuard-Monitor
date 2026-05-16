<script setup lang="ts">
import type { HealthStatus } from '@/types'

defineProps<{
  label: string
  value: string | number | null
  unit?: string
  status: HealthStatus
  icon: string
  description: string
  tooltip?: string
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
      <span class="badge-wrap">
        <span class="status-badge" :class="status">{{ statusLabel[status] }}</span>
        <span v-if="tooltip" class="badge-tooltip">{{ tooltip }}</span>
      </span>
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

.badge-wrap {
  position: relative;
  display: inline-flex;
}

.badge-tooltip {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  background: #475569;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
  padding: 9px 14px;
  border-radius: 8px;
  width: max-content;
  max-width: 320px;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-3px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 50;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.badge-tooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 10px;
  border: 5px solid transparent;
  border-bottom-color: #475569;
}

.badge-wrap:hover .badge-tooltip {
  opacity: 1;
  transform: translateY(0);
}

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
