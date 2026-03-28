export type HealthStatus = 'normal' | 'warning' | 'critical' | 'unknown'

export interface BiometricReading {
  spo2: number
  heartRate: number
  temperature: number
  timestamp: string
}

export interface KpiItem {
  id: string
  label: string
  value: string | number | null
  unit: string
  status: HealthStatus
  icon: string
  description: string
}

export interface UserProfile {
  name: string
  age: number | null
  sex: string
  heightCm: number | null
  weightKg: number | null
  conditions: string
  medications: string
  fitnessLevel: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
