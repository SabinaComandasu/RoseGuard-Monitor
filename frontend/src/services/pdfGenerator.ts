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

function ascii(str: string): string {
  return str.normalize("NFD").replace(new RegExp("[̀-ͯ]", "g"), "")
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*(\d+)\.\s+/gm, '$1. ')
    .trim()
}

interface TrendSeries {
  values: number[]
  labels: string[]
}

interface PdfData {
  kpis: KpiItem[]
  userName: string
  trends?: {
    spo2: TrendSeries
    hr:   TrendSeries
    temp: TrendSeries
  }
  chartImages?: {
    spo2?: string
    hr?:   string
    temp?: string
  }
  aiRecommendation?: string
}

function drawTrendCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, unit: string, decimals: number,
  color: [number, number, number],
  series: TrendSeries,
  yMin: number, yMax: number,
) {
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(252, 228, 236)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')

  doc.setFillColor(...color)
  doc.roundedRect(x, y, w, 2.5, 1, 1, 'F')

  doc.setTextColor(...GRAY)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text(label.toUpperCase(), x + 5, y + 9)

  if (series.values.length === 0) {
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text('No measurements taken', x + w / 2, y + h / 2 + 2, { align: 'center' })
    return
  }

  const fmt = (v: number) => decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))
  const last = series.values[series.values.length - 1]
  const avg  = series.values.reduce((a, b) => a + b, 0) / series.values.length
  const min  = Math.min(...series.values)
  const max  = Math.max(...series.values)

  doc.setTextColor(...DARK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${fmt(last)}${unit}`, x + 5, y + 21)

  doc.setTextColor(...GRAY)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text(`avg ${fmt(avg)}  |  min ${fmt(min)}  max ${fmt(max)}${unit}`, x + 5, y + 27)

  const cx = x + 4
  const cy = y + 31
  const cw = w - 8
  const ch = 12
  const range = Math.max(yMax - yMin, 1)

  const pts = series.values.map((v, i) => ({
    px: cx + (i / Math.max(series.values.length - 1, 1)) * cw,
    py: cy + ch - Math.min(ch, Math.max(0, ((v - yMin) / range) * ch)),
  }))

  doc.setDrawColor(...color)
  doc.setLineWidth(0.8)
  for (let i = 1; i < pts.length; i++) {
    doc.line(pts[i - 1].px, pts[i - 1].py, pts[i].px, pts[i].py)
  }

  doc.setFillColor(...color)
  pts.forEach(p => doc.circle(p.px, p.py, 0.8, 'F'))

  doc.setTextColor(...GRAY)
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'italic')
  doc.text(`${series.values.length} readings`, x + w - 4, y + h - 3, { align: 'right' })
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
    doc.text(`Patient: ${ascii(data.userName)}`, 15, 34)
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  doc.text(`${dateStr} · ${timeStr}`, W - 15, 34, { align: 'right' })

  let y = 57

  // ── Section: Metric Trends ──────────────────────────────────
  if (data.trends || data.chartImages) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text('METRIC TRENDS', 15, y)
    y += 6

    const HR_COLOR:   [number, number, number] = [244, 67,  54]
    const TEMP_COLOR: [number, number, number] = [245, 158, 11]

    if (data.chartImages) {
      // Full-width chart images stacked vertically
      const chartMetas = [
        { key: 'spo2' as const, label: 'SpO2',        unit: '%',    color: PINK,       series: data.trends?.spo2, decimals: 0, yMin: 90, yMax: 100 },
        { key: 'hr'   as const, label: 'Heart Rate',  unit: ' BPM', color: HR_COLOR,   series: data.trends?.hr,   decimals: 0, yMin: 50, yMax: 150 },
        { key: 'temp' as const, label: 'Temperature', unit: '°C', color: TEMP_COLOR, series: data.trends?.temp, decimals: 1, yMin: 20, yMax: 40  },
      ]

      for (const m of chartMetas) {
        const imgURI = data.chartImages[m.key]
        const vals   = m.series?.values ?? []

        // Colored header row for this metric
        doc.setFillColor(...m.color)
        doc.rect(15, y, 180, 7, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(m.label.toUpperCase(), 19, y + 4.8)

        if (vals.length > 0) {
          const fmt = (v: number) => m.decimals > 0 ? v.toFixed(m.decimals) : String(Math.round(v))
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
          const statsText = `avg ${fmt(avg)}   min ${fmt(Math.min(...vals))}   max ${fmt(Math.max(...vals))}${m.unit}   ${vals.length} readings`
          doc.text(statsText, W - 17, y + 4.8, { align: 'right' })
        } else {
          doc.setFont('helvetica', 'italic')
          doc.text('No data recorded', W - 17, y + 4.8, { align: 'right' })
        }
        y += 7

        const panelH = 42
        if (imgURI && vals.length > 0) {
          doc.addImage(imgURI, 'PNG', 15, y, 180, panelH)
        } else {
          doc.setFillColor(...LIGHT)
          doc.setDrawColor(252, 228, 236)
          doc.rect(15, y, 180, panelH, 'FD')
          doc.setTextColor(...GRAY)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'italic')
          doc.text('No measurements taken', W / 2, y + panelH / 2 + 1.5, { align: 'center' })
        }
        y += panelH + 5
      }
    } else if (data.trends) {
      // Side-by-side sparkline cards (dashboard fallback)
      const cardW = 57
      const cardH = 50
      drawTrendCard(doc, 15,          y, cardW, cardH, 'SpO2',        '%',    0, PINK,       data.trends.spo2,  90, 100)
      drawTrendCard(doc, 15 + 62,     y, cardW, cardH, 'Heart Rate',  ' BPM', 0, HR_COLOR,   data.trends.hr,    50, 150)
      drawTrendCard(doc, 15 + 62 * 2, y, cardW, cardH, 'Temperature', '°C',  1, TEMP_COLOR, data.trends.temp,  20, 40)
      y += cardH + 12
    }
  }

  // ── Section: Health KPIs ────────────────────────────────────
  if (data.kpis.length > 0) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text('HEALTH KPIs', 15, y)
    y += 5

    doc.setFillColor(...DARK)
    doc.rect(15, y, W - 30, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('KPI',    22,      y + 5.3)
    doc.text('Value',  125,     y + 5.3)
    doc.text('Status', W - 20, y + 5.3, { align: 'right' })
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

      doc.setFillColor(...sc)
      doc.circle(20.5, y + rowH / 2, 1.4, 'F')

      doc.setTextColor(...DARK)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(kpi.label, 24, y + 5.8)

      const valStr = kpi.value !== null ? `${kpi.value}${kpi.unit ? ' ' + kpi.unit : ''}` : '-'
      doc.text(valStr, 125, y + 5.8)

      doc.setTextColor(...sc)
      doc.setFont('helvetica', 'bold')
      doc.text(STATUS_LABELS[kpi.status] ?? '', W - 20, y + 5.8, { align: 'right' })

      doc.setDrawColor(252, 228, 236)
      doc.line(15, y + rowH, W - 15, y + rowH)

      y += rowH
    })
  }

  // ── Section: AI Recommendation ──────────────────────────────
  if (data.aiRecommendation) {
    const PDARK:  [number, number, number] = [55,  10,  100]
    const PMED:   [number, number, number] = [124, 58,  237]
    const PLIGHT: [number, number, number] = [249, 246, 255]
    const PSOFT:  [number, number, number] = [190, 160, 240]

    const cX    = 15
    const cW    = 180
    const tX    = cX + 8          // text left edge (after accent bar + padding)
    const tW    = cX + cW - tX - 5 // text wrap width: card right edge minus text left minus 5mm right padding
    const lineH = 5

    // Always start on a fresh page
    doc.setDrawColor(...PINK); doc.line(15, 283, W - 15, 283)
    doc.addPage()
    doc.setFillColor(...DARK); doc.rect(0, 0, W, 20, 'F')
    doc.setFillColor(...PINK); doc.rect(0, 20, W, 2, 'F')
    doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text('RoseGuard Monitor', 15, 13)
    y = 28

    // Split text AFTER setting the exact font that will be used for rendering
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    const stripped = stripMarkdown(data.aiRecommendation)
    const lines    = doc.splitTextToSize(stripped, tW) as string[]

    // Section label
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY)
    doc.text('AI HEALTH RECOMMENDATIONS', 15, y)
    y += 5

    // ── Card header ─────────────────────────────────────────
    const hH = 14
    doc.setFillColor(...PDARK)
    doc.roundedRect(cX, y, cW, hH, 3, 3, 'F')
    doc.rect(cX, y + hH - 3, cW, 3, 'F')           // square bottom corners

    // Sparkle star (4-axis lines + white center dot)
    const sx = cX + 9, sy = y + hH / 2
    doc.setDrawColor(...PSOFT); doc.setLineWidth(0.65)
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 4
      doc.line(
        sx + Math.cos(angle) * 3.2, sy + Math.sin(angle) * 3.2,
        sx + Math.cos(angle + Math.PI) * 3.2, sy + Math.sin(angle + Math.PI) * 3.2,
      )
    }
    doc.setFillColor(...WHITE); doc.circle(sx, sy, 1.1, 'F')

    doc.setTextColor(...WHITE); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Groq AI', cX + 17, y + 9.2)

    doc.setTextColor(...PSOFT); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.text('Personalized Health Analysis', cX + 46, y + 9.2)

    doc.setFillColor(...PMED)
    doc.roundedRect(cX + cW - 24, y + 4, 20, 6, 1.5, 1.5, 'F')
    doc.setTextColor(...WHITE); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold')
    doc.text('AI ANALYSIS', cX + cW - 14, y + 7.9, { align: 'center' })

    y += hH

    // ── Text body (paginated) ────────────────────────────────
    let i = 0
    const padTop = 5, padBot = 5

    while (i < lines.length) {
      const avail  = 275 - y - padTop - padBot
      const maxL   = Math.max(1, Math.floor(avail / lineH))
      const end    = Math.min(i + maxL, lines.length)
      const chunk  = lines.slice(i, end)
      const chunkH = padTop + chunk.length * lineH + padBot

      doc.setFillColor(...PLIGHT); doc.rect(cX, y, cW, chunkH, 'F')
      doc.setFillColor(...PMED);   doc.rect(cX, y, 3,  chunkH, 'F')

      // Restore text font before drawing (font state may have changed above)
      doc.setTextColor(20, 10, 40); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
      let ty = y + padTop + 3.5
      for (const line of chunk) { doc.text(line, tX, ty); ty += lineH }

      y += chunkH
      i  = end

      if (i < lines.length) {
        doc.setDrawColor(...PINK); doc.line(15, 283, W - 15, 283)
        doc.addPage()
        doc.setFillColor(...DARK); doc.rect(0, 0, W, 16, 'F')
        doc.setFillColor(...PINK); doc.rect(0, 16, W, 2, 'F')
        doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
        doc.text('RoseGuard Monitor', 15, 11)
        y = 24

        doc.setFillColor(...PMED)
        doc.roundedRect(cX, y, cW, 8, 2, 2, 'F')
        doc.rect(cX, y + 5, cW, 3, 'F')
        doc.setTextColor(...WHITE); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
        doc.text('Groq AI - continued', cX + 8, y + 5.5)
        y += 8
      }
    }

  }

  // ── Footer ──────────────────────────────────────────────────
  doc.setDrawColor(...PINK)
  doc.line(15, 283, W - 15, 283)

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

function footer(doc: jsPDF, W: number, _page: number, _total: number) {
  doc.setDrawColor(...PINK)
  doc.line(15, 283, W - 15, 283)
}

export function generateHistoryPdf(data: HistoryPdfData): { doc: jsPDF; sizeKb: number } {
  const doc = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const ROWS_PER_PAGE = 28

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

  drawHeader(1)
  let y = 57

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
    doc.text(`min ${col.stats.min}${col.unit}  max ${col.stats.max}${col.unit}`, x + 5, y + 26)
  })

  y += cardH + 10

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text(`ALL READINGS  (${data.readings.length} total)`, 15, y)
  y += 5

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

  let currentPage = 1
  const sortedReadings = [...data.readings].reverse()

  sortedReadings.forEach((r, i) => {
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

// ─── Wellness Journal PDF ────────────────────────────────────────────────────

export interface WellnessPdfEntry {
  date: string
  userName: string
  mood: number
  moodLabel: string
  energy: number
  stress: number
  sleepHours: number
  sleepQuality: number
  sleepQualityLabel: string
  symptoms: string[]
  exercised: boolean
  exerciseType: string
  exerciseMinutes: number
  notes: string
  analysis: string
}

const PMED:   [number, number, number] = [124, 58,  237]
const PDARK:  [number, number, number] = [55,  10,  100]
const PLIGHT: [number, number, number] = [249, 246, 255]
const PSOFT:  [number, number, number] = [190, 160, 240]

function mdMeasureHeight(doc: jsPDF, analysis: string, tW: number): number {
  let h = 8
  for (const raw of analysis.split('\n')) {
    const t = raw.trim()
    if (!t) { h += 3; continue }
    if (/^#{1,3}\s/.test(t)) { h += 10; continue }
    const isBullet = /^[-*+]\s/.test(t)
    const stripped = t.replace(/^[-*+]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(stripped, isBullet ? tW - 6 : tW) as string[]
    h += wrapped.length * 5 + 2
  }
  return h + 8
}

function mdDrawText(
  doc: jsPDF,
  analysis: string,
  tX: number, startY: number, tW: number,
  headingColor: [number, number, number],
): void {
  const lineH = 5
  let y = startY

  for (const raw of analysis.split('\n')) {
    const t = raw.trim()
    if (!t) { y += 3; continue }

    if (/^#{1,3}\s/.test(t)) {
      const level  = (t.match(/^(#{1,3})\s/)?.[1].length ?? 2)
      const text   = t.replace(/^#+\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')
      doc.setTextColor(...headingColor)
      doc.setFontSize(level === 3 ? 9 : 10)
      doc.setFont('helvetica', 'bold')
      doc.text(text, tX, y + 3.5)
      doc.setDrawColor(...headingColor)
      doc.setLineWidth(0.3)
      doc.line(tX, y + 5.5, tX + tW, y + 5.5)
      y += 10
      continue
    }

    const isBullet = /^[-*+]\s/.test(t)
    const stripped = t.replace(/^[-*+]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(stripped, isBullet ? tW - 6 : tW) as string[]
    doc.setTextColor(20, 10, 40)
    if (isBullet) {
      doc.setFillColor(...headingColor)
      doc.circle(tX + 1.5, y + 2, 0.8, 'F')
      wrapped.forEach((wl, wi) => doc.text(wl, tX + 5, y + 2 + wi * lineH))
    } else {
      wrapped.forEach((wl, wi) => doc.text(wl, tX, y + 2 + wi * lineH))
    }
    y += wrapped.length * lineH + 2
  }
}

function drawMiniBar(
  doc: jsPDF,
  x: number, y: number, w: number,
  val: number, max: number,
  color: [number, number, number],
) {
  doc.setFillColor(220, 210, 228); doc.roundedRect(x, y, w, 2, 1, 1, 'F')
  const fw = Math.max(0, Math.min(1, val / max)) * w
  if (fw > 0) { doc.setFillColor(...color); doc.roundedRect(x, y, fw, 2, 1, 1, 'F') }
}

export function generateWellnessPdf(entry: WellnessPdfEntry): { doc: jsPDF; sizeKb: number } {
  const doc = new jsPDF('p', 'mm', 'a4')
  const W = 210

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 44, 'F')
  doc.setFillColor(...PINK); doc.rect(0, 44, W, 3, 'F')

  doc.setTextColor(...WHITE); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
  doc.text('RoseGuard Monitor', 15, 17)

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(201, 184, 195)
  doc.text('Wellness Journal', 15, 26)
  if (entry.userName) doc.text(`Patient: ${ascii(entry.userName)}`, 15, 34)

  const dateStr = new Date(entry.date).toLocaleDateString('en-GB', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
  doc.text(dateStr, W - 15, 34, { align: 'right' })

  let y = 57

  // ── Check-in Summary ────────────────────────────────────
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY)
  doc.text('CHECK-IN SUMMARY', 15, y)
  y += 5

  const mCardW = 43; const mCardH = 23; const mGap = 3
  const metricCards: Array<{ label: string; val: string; bar: number; max: number; color: [number,number,number] }> = [
    { label: 'MOOD',   val: entry.moodLabel,               bar: entry.mood,         max: 5,  color: PINK },
    { label: 'ENERGY', val: `${entry.energy}/10`,           bar: entry.energy,        max: 10, color: PINK },
    { label: 'STRESS', val: `${entry.stress}/10`,           bar: entry.stress,        max: 10, color: [245, 158, 11] },
    { label: 'SLEEP',  val: `${entry.sleepHours}h · ${entry.sleepQualityLabel}`, bar: entry.sleepQuality, max: 5, color: [59, 130, 246] },
  ]

  metricCards.forEach((card, i) => {
    const cx = 15 + i * (mCardW + mGap)
    doc.setFillColor(...LIGHT); doc.setDrawColor(252, 228, 236)
    doc.roundedRect(cx, y, mCardW, mCardH, 3, 3, 'FD')
    doc.setFillColor(...card.color); doc.roundedRect(cx, y, mCardW, 2, 1, 1, 'F')
    doc.setTextColor(...GRAY); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold')
    doc.text(card.label, cx + 4, y + 7.5)
    doc.setTextColor(...DARK); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
    doc.text(card.val, cx + 4, y + 15)
    drawMiniBar(doc, cx + 4, y + 18.5, mCardW - 8, card.bar, card.max, card.color)
  })

  y += mCardH + 5

  const dCardW = 57; const dCardH = 20; const dGap = 4.5
  const details: Array<{ label: string; text: string }> = [
    { label: 'SYMPTOMS', text: entry.symptoms.length ? entry.symptoms.join(', ') : 'None' },
    { label: 'EXERCISE',  text: entry.exercised ? `${entry.exerciseType || 'Activity'} · ${entry.exerciseMinutes} min` : 'No exercise today' },
    { label: 'NOTES',     text: entry.notes || 'None' },
  ]

  details.forEach((d, i) => {
    const dx = 15 + i * (dCardW + dGap)
    doc.setFillColor(...LIGHT); doc.setDrawColor(252, 228, 236)
    doc.roundedRect(dx, y, dCardW, dCardH, 3, 3, 'FD')
    doc.setTextColor(...GRAY); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold')
    doc.text(d.label, dx + 4, y + 6.5)
    doc.setTextColor(...DARK); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(d.text.slice(0, 90) + (d.text.length > 90 ? '…' : ''), dCardW - 8) as string[]
    doc.text(lines.slice(0, 2), dx + 4, y + 13)
  })

  y += dCardH + 10

  // ── AI Wellness Analysis ─────────────────────────────────
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY)
  doc.text('AI WELLNESS ANALYSIS', 15, y)
  y += 5

  const cX = 15; const cW = 180; const tX = cX + 8; const tW = cW - 13

  // Card header
  const hH = 14
  doc.setFillColor(...PDARK); doc.roundedRect(cX, y, cW, hH, 3, 3, 'F')
  doc.rect(cX, y + hH - 3, cW, 3, 'F')

  const sx = cX + 9; const sy = y + hH / 2
  doc.setDrawColor(...PSOFT); doc.setLineWidth(0.65)
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 4
    doc.line(sx + Math.cos(angle) * 3.2, sy + Math.sin(angle) * 3.2, sx + Math.cos(angle + Math.PI) * 3.2, sy + Math.sin(angle + Math.PI) * 3.2)
  }
  doc.setFillColor(...WHITE); doc.circle(sx, sy, 1.1, 'F')

  doc.setTextColor(...WHITE); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text('Groq AI', cX + 17, y + 9.2)
  doc.setTextColor(...PSOFT); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text('Personalized Wellness Analysis', cX + 46, y + 9.2)
  doc.setFillColor(...PMED); doc.roundedRect(cX + cW - 30, y + 4, 26, 6, 1.5, 1.5, 'F')
  doc.setTextColor(...WHITE); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold')
  doc.text('WELLNESS INSIGHT', cX + cW - 17, y + 7.9, { align: 'center' })

  y += hH

  // Body: measure height → draw background → draw text
  const bodyH = mdMeasureHeight(doc, entry.analysis, tW)
  const pageBottom = 278
  const availH = pageBottom - y
  const actualBodyH = Math.min(bodyH, availH)

  doc.setFillColor(...PLIGHT); doc.rect(cX, y, cW, actualBodyH, 'F')
  doc.setFillColor(...PMED);   doc.rect(cX, y, 3,  actualBodyH, 'F')
  mdDrawText(doc, entry.analysis, tX, y + 6, tW, PMED)

  doc.setDrawColor(...PINK); doc.line(15, 283, W - 15, 283)

  const pdfOutput = doc.output('datauristring')
  const base64 = pdfOutput.split(',')[1]
  const sizeKb = Math.round((base64.length * 3) / 4 / 1024)
  return { doc, sizeKb }
}
