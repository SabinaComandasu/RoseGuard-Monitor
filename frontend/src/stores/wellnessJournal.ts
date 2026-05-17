import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface JournalAnswers {
  mood: number
  energy: number
  stress: number
  sleepHours: number
  sleepQuality: number
  symptoms: string[]
  exercised: boolean
  exerciseType: string
  exerciseMinutes: number
  notes: string
}

export interface JournalEntry {
  id: string
  date: string
  answers: JournalAnswers
  analysis: string
}

const STORAGE_KEY = 'rg_wellness_journal'

function load(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

export const useWellnessJournalStore = defineStore('wellnessJournal', () => {
  const entries = ref<JournalEntry[]>(load())

  watch(entries, val => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  function addEntry(answers: JournalAnswers, analysis: string): JournalEntry {
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      answers,
      analysis,
    }
    entries.value.unshift(entry)
    if (entries.value.length > 60) entries.value = entries.value.slice(0, 60)
    return entry
  }

  function deleteEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
  }

  return { entries, addEntry, deleteEntry }
})
