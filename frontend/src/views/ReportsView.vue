<script setup lang="ts">
import { useReportsStore } from '@/stores/reports'
import { useRouter } from 'vue-router'

const reports = useReportsStore()
const router = useRouter()

function download(report: typeof reports.reports[0]) {
  const a = document.createElement('a')
  a.href = report.pdfDataUrl
  a.download = `RoseGuard_Report_${report.generatedAt.slice(0, 10)}.pdf`
  a.click()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="page">
    <div class="page-header animate-s" style="--s-delay:0s">
      <div>
        <h1>Reports</h1>
        <p>PDF health reports generated from your dashboard data</p>
      </div>
      <button class="gen-btn" @click="router.push('/dashboard')">
        <i class="pi pi-plus" />
        Generate New Report
      </button>
    </div>

    <!-- Empty state -->
    <Transition name="fade">
      <div v-if="reports.reports.length === 0" class="empty-state animate-s" style="--s-delay:0.1s">
        <div class="empty-icon">
          <i class="pi pi-file-pdf" />
        </div>
        <h3>No reports yet</h3>
        <p>Click "Download PDF" on the dashboard to generate your first health report.</p>
        <button class="gen-btn" @click="router.push('/dashboard')">
          <i class="pi pi-arrow-right" />
          Go to Dashboard
        </button>
      </div>
    </Transition>

    <!-- Reports list -->
    <div v-if="reports.reports.length > 0" class="reports-list animate-s" style="--s-delay:0.1s">
      <div
        v-for="(report, i) in reports.reports"
        :key="report.id"
        class="report-row card"
        :style="{ '--s-delay': `${0.1 + i * 0.06}s` }"
      >
        <div class="report-icon">
          <i class="pi pi-file-pdf" />
        </div>

        <div class="report-info">
          <div class="report-title">{{ report.title }}</div>
          <div class="report-meta">
            <span><i class="pi pi-calendar" /> {{ formatDate(report.generatedAt) }}</span>
            <span><i class="pi pi-clock" /> {{ formatTime(report.generatedAt) }}</span>
            <span><i class="pi pi-database" /> {{ report.sizeKb }} KB</span>
          </div>
        </div>

        <div class="report-actions">
          <button class="action-btn download" @click="download(report)">
            <i class="pi pi-download" />
            Download
          </button>
          <button class="action-btn delete" @click="reports.removeReport(report.id)">
            <i class="pi pi-trash" />
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
  margin-bottom: 28px;
}

.gen-btn {
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

.gen-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 14px rgba(233, 30, 140, 0.35);
  transform: translateY(-1px);
}

.gen-btn:active { transform: translateY(0) scale(0.98); }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 40px;
  gap: 14px;
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.empty-state p {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  max-width: 340px;
}

/* Reports list */
.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  animation: fade-up 0.4s ease var(--s-delay, 0s) both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.report-row:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.report-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.report-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.report-meta i { font-size: 11px; }

/* Actions */
.report-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
  border: 1.5px solid;
}

.action-btn.download {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary-light);
}

.action-btn.download:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 3px 10px rgba(233, 30, 140, 0.3);
}

.action-btn.delete {
  background: transparent;
  color: var(--color-text-muted);
  border-color: var(--color-border);
  padding: 7px 10px;
}

.action-btn.delete:hover {
  background: var(--color-critical-bg);
  color: var(--color-critical);
  border-color: var(--color-critical-border);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
