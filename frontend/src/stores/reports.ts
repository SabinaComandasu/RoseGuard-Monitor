import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ReportRecord {
  id: string
  title: string
  generatedAt: string
  sizeKb: number
  pdfDataUrl: string
}

export const useReportsStore = defineStore('reports', () => {
  const reports = ref<ReportRecord[]>([])

  function addReport(report: ReportRecord) {
    reports.value.unshift(report)
  }

  function removeReport(id: string) {
    reports.value = reports.value.filter(r => r.id !== id)
  }

  return { reports, addReport, removeReport }
})
