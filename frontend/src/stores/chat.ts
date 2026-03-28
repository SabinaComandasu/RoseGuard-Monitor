import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])

  function addMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  return { messages, addMessage }
})
