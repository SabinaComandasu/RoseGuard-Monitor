import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  messages: ChatMessage[]
}

const STORAGE_KEY = 'rg_chat_history'

function load(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>(load())
  const activeId = ref<string | null>(conversations.value[0]?.id ?? null)

  const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeId.value) ?? null
  )

  const messages = computed(() => activeConversation.value?.messages ?? [])

  watch(conversations, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  function newConversation() {
    const c: Conversation = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      messages: [],
    }
    conversations.value.unshift(c)
    activeId.value = c.id
    return c
  }

  function switchConversation(id: string) {
    activeId.value = id
  }

  function deleteConversation(id: string) {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (activeId.value === id) {
      activeId.value = conversations.value[0]?.id ?? null
    }
  }

  function addMessage(message: ChatMessage) {
    if (!activeConversation.value) newConversation()
    const conv = activeConversation.value!
    conv.messages.push(message)

    // Auto-title from first user message
    if (conv.messages.filter(m => m.role === 'user').length === 1 && message.role === 'user') {
      conv.title = message.content.slice(0, 40) + (message.content.length > 40 ? '…' : '')
    }
  }

  return {
    conversations,
    activeId,
    activeConversation,
    messages,
    newConversation,
    switchConversation,
    deleteConversation,
    addMessage,
  }
})
