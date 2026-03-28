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
