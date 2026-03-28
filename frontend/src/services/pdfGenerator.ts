import jsPDF from 'jspdf'
import type { KpiItem } from '@/types'

const PINK:  [number, number, number] = [233, 30,  140]
const DARK:  [number, number, number] = [18,  8,   16 ]
const GRAY:  [number, number, number] = [120, 144, 156]
const LIGHT: [number, number, number] = [255, 245, 248]
const WHITE: [number, number, number] = [255, 255, 255]

const STATUS_COLORS: Record<string, [number, number, number]> = {
  normal:   [46,  125, 50 ],
  warning:  [230, 81,  0  ],
  critical: [198, 40,  40 ],
  unknown:  [84,  110, 122],
}

const STATUS_LABELS: Record<string, string> = {
  normal: 'Normal', warning: 'Warning', critical: 'Critical', unknown: 'No Data',
}

interface PdfData {
  spo2: number | null
  heartRate: number | null
  temperature: number | null
  kpis: KpiItem[]
  userName: string
}

export function generateDashboardPdf(data: PdfData): { doc: jsPDF; sizeKb: number } {
  const doc = new jsPDF('p', 'mm', 'a4')
  const W = 210

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 44, 'F')

  doc.setFillColor(...PINK)
  doc.rect(0, 44, W, 3, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('RoseGuard Monitor', 15, 17)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(201, 184, 195)
  doc.text('Health Dashboard Report', 15, 26)

  if (data.userName) {
    doc.text(`Patient: ${data.userName}`, 15, 34)
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  doc.text(`${dateStr} · ${timeStr}`, W - 15, 34, { align: 'right' })

  let y = 57

  // ── Section: Live Readings ──────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('LIVE READINGS', 15, y)
  y += 5

  const readings = [
    { label: 'SpO2',        value: data.spo2        !== null ? `${data.spo2}%`          : '—' },
    { label: 'Heart Rate',  value: data.heartRate   !== null ? `${data.heartRate} BPM`  : '—' },
    { label: 'Temperature', value: data.temperature !== null ? `${data.temperature}°C`  : '—' },
  ]

  const cardW = 57
  const cardH = 28

  readings.forEach((r, i) => {
    const x = 15 + i * (cardW + 5)

    doc.setFillColor(...LIGHT)
    doc.setDrawColor(252, 228, 236)
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD')

    // pink top accent
    doc.setFillColor(...PINK)
    doc.roundedRect(x, y, cardW, 2.5, 1, 1, 'F')

    doc.setTextColor(...GRAY)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.text(r.label.toUpperCase(), x + 5, y + 9)

    doc.setTextColor(...DARK)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(r.value, x + 5, y + 22)
  })

  y += cardH + 12

  // ── Section: Health KPIs ────────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('HEALTH KPIs', 15, y)
  y += 5

  // Table header
  doc.setFillColor(...DARK)
  doc.rect(15, y, W - 30, 8, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('KPI',    22,       y + 5.3)
  doc.text('Value',  125,      y + 5.3)
  doc.text('Status', W - 20,  y + 5.3, { align: 'right' })
  y += 8

  const rowH = 8.5
  data.kpis.forEach((kpi, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT)
      doc.rect(15, y, W - 30, rowH, 'F')
    } else {
      doc.setFillColor(...WHITE)
      doc.rect(15, y, W - 30, rowH, 'F')
    }

    const sc = STATUS_COLORS[kpi.status] ?? STATUS_COLORS.unknown

    // status dot
    doc.setFillColor(...sc)
    doc.circle(20.5, y + rowH / 2, 1.4, 'F')

    doc.setTextColor(...DARK)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(kpi.label, 24, y + 5.8)

    const valStr = kpi.value !== null ? `${kpi.value}${kpi.unit ? ' ' + kpi.unit : ''}` : '—'
    doc.text(valStr, 125, y + 5.8)

    doc.setTextColor(...sc)
    doc.setFont('helvetica', 'bold')
    doc.text(STATUS_LABELS[kpi.status] ?? '', W - 20, y + 5.8, { align: 'right' })

    doc.setDrawColor(252, 228, 236)
    doc.line(15, y + rowH, W - 15, y + rowH)

    y += rowH
  })

  // ── Footer ──────────────────────────────────────────────────
  const footerY = 278
  doc.setDrawColor(...PINK)
  doc.line(15, footerY, W - 15, footerY)

  doc.setTextColor(...GRAY)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.text(
    'This report is for informational purposes only and does not constitute medical advice.',
    W / 2, footerY + 5, { align: 'center' }
  )
  doc.text(
    'Please consult a qualified healthcare professional for medical decisions.',
    W / 2, footerY + 9, { align: 'center' }
  )

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('RoseGuard Monitor · Page 1 of 1', W / 2, 290, { align: 'center' })

  const pdfOutput = doc.output('datauristring')
  const base64 = pdfOutput.split(',')[1]
  const sizeKb = Math.round((base64.length * 3) / 4 / 1024)

  return { doc, sizeKb }
}

// ─── History PDF ─────────────────────────────────────────────────────────────

export interface HistoryReading {
  timestamp: Date
  spo2: number
  heartRate: number
  temperature: number
}

interface HistoryStats { avg: number; min: number; max: number }

interface HistoryPdfData {
  period: string
  userName: string
  readings: HistoryReading[]
  spo2Stats: HistoryStats
  hrStats: HistoryStats
  tempStats: HistoryStats
}

function rowStatus(r: HistoryReading): string {
  if (r.spo2 < 94 || r.heartRate > 100 || r.heartRate < 50 || r.temperature > 37.5) return 'critical'
  if (r.spo2 < 96 || r.heartRate > 90 || r.temperature > 37.2) return 'warning'
  return 'normal'
}

function footer(doc: jsPDF, W: number, page: number, total: number) {
  const footerY = 283
  doc.setDrawColor(...PINK)
  doc.line(15, footerY, W - 15, footerY)
  doc.setTextColor(...GRAY)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.text('This report is for informational purposes only and does not constitute medical advice.', W / 2, footerY + 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(`RoseGuard Monitor · Page ${page} of ${total}`, W / 2, footerY + 10, { align: 'center' })
}

export function generateHistoryPdf(data: HistoryPdfData): { doc: jsPDF; sizeKb: number } {
  const doc = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const ROWS_PER_PAGE = 28

  // ── Shared header renderer ────────────────────────────────
  function drawHeader(pageNum: number) {
    doc.setFillColor(...DARK)
    doc.rect(0, 0, W, 44, 'F')
    doc.setFillColor(...PINK)
    doc.rect(0, 44, W, 3, 'F')

    doc.setTextColor(...WHITE)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('RoseGuard Monitor', 15, 17)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(201, 184, 195)
    doc.text(`History Report · ${data.period}`, 15, 26)
    if (data.userName) doc.text(`Patient: ${data.userName}`, 15, 34)

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
    doc.text(`${dateStr}`, W - 15, 34, { align: 'right' })
  }

  // ── Page 1 ───────────────────────────────────────────────
  drawHeader(1)
  let y = 57

  // Summary stats
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('SUMMARY', 15, y)
  y += 5

  const statCols = [
    { label: 'SpO2',        unit: '%',   stats: data.spo2Stats,  color: PINK },
    { label: 'Heart Rate',  unit: ' BPM',stats: data.hrStats,    color: [244, 67, 54] as [number,number,number] },
    { label: 'Temperature', unit: '°C',  stats: data.tempStats,  color: [245, 158, 11] as [number,number,number] },
  ]

  const cardW = 57
  const cardH = 30
  statCols.forEach((col, i) => {
    const x = 15 + i * (cardW + 5)
    doc.setFillColor(...LIGHT)
    doc.setDrawColor(252, 228, 236)
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD')
    doc.setFillColor(...col.color)
    doc.roundedRect(x, y, cardW, 2.5, 1, 1, 'F')

    doc.setTextColor(...GRAY)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.text(col.label.toUpperCase(), x + 5, y + 9)

    doc.setTextColor(...DARK)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${col.stats.avg}${col.unit}`, x + 5, y + 19)

    doc.setTextColor(...GRAY)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`↓ ${col.stats.min}${col.unit}  ↑ ${col.stats.max}${col.unit}`, x + 5, y + 26)
  })

  y += cardH + 10

  // Readings count badge
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text(`ALL READINGS  (${data.readings.length} total)`, 15, y)
  y += 5

  // Table header
  const totalPages = Math.ceil(data.readings.length / ROWS_PER_PAGE) + 1
  const rowH = 7.5

  function drawTableHeader(atY: number) {
    doc.setFillColor(...DARK)
    doc.rect(15, atY, W - 30, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Timestamp',   20,      atY + 5.3)
    doc.text('SpO2',        90,      atY + 5.3)
    doc.text('Heart Rate',  120,     atY + 5.3)
    doc.text('Temperature', 153,     atY + 5.3)
    doc.text('Status',      W - 20, atY + 5.3, { align: 'right' })
    return atY + 8
  }

  y = drawTableHeader(y)

  // ── Rows across pages ─────────────────────────────────────
  let currentPage = 1
  const sortedReadings = [...data.readings].reverse()

  sortedReadings.forEach((r, i) => {
    // New page when full
    if (i > 0 && i % ROWS_PER_PAGE === 0) {
      footer(doc, W, currentPage, totalPages)
      doc.addPage()
      currentPage++
      drawHeader(currentPage)
      y = 57
      y = drawTableHeader(y)
    }

    const rowIndex = i % ROWS_PER_PAGE
    const bg = rowIndex % 2 === 0 ? LIGHT : WHITE
    doc.setFillColor(...bg)
    doc.rect(15, y, W - 30, rowH, 'F')

    const status = rowStatus(r)
    const sc = STATUS_COLORS[status] ?? STATUS_COLORS.unknown

    const tsStr = r.timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' ' + r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(tsStr, 20, y + 5)

    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(`${r.spo2}%`,        90,  y + 5)
    doc.text(`${r.heartRate} BPM`, 120, y + 5)
    doc.text(`${r.temperature}°C`, 153, y + 5)

    doc.setFillColor(...sc)
    doc.circle(W - 22, y + rowH / 2, 1.3, 'F')
    doc.setTextColor(...sc)
    doc.setFont('helvetica', 'bold')
    doc.text(STATUS_LABELS[status] ?? '', W - 19, y + 5)

    doc.setDrawColor(252, 228, 236)
    doc.line(15, y + rowH, W - 15, y + rowH)

    y += rowH
  })

  footer(doc, W, currentPage, totalPages)

  const pdfOutput = doc.output('datauristring')
  const base64 = pdfOutput.split(',')[1]
  const sizeKb = Math.round((base64.length * 3) / 4 / 1024)

  return { doc, sizeKb }
}
