<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { marked } from 'marked'
import { useChatStore } from '@/stores/chat'
import { useBiometricsStore } from '@/stores/biometrics'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const chat = useChatStore()
const biometrics = useBiometricsStore()
const user = useUserStore()
const input = ref('')
const messagesEl = ref<HTMLElement | null>(null)
const isTyping = ref(false)
const error = ref('')

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function systemContext() {
  return `Ești un asistent medical integrat în aplicația RoseGuard Monitor.
Pacient curent: ${user.fullName || 'Necunoscut'}.
Citiri live — SpO2: ${biometrics.spo2 ?? 'N/A'}%, Frecvență cardiacă: ${biometrics.heartRate ?? 'N/A'} BPM, Temperatură: ${biometrics.temperature ?? 'N/A'}°C.
Always reply in English, regardless of the language the user writes in.
Structurează răspunsurile cu liste cu puncte, secțiuni clare și text îngroșat pentru termeni importanți.
Fii concis și practic. Recomandă întotdeauna consultarea unui medic pentru decizii medicale importante.`
}

function renderMarkdown(text: string): string {
  return marked.parse(text) as string
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

watch(() => chat.messages.length, scrollToBottom)
watch(() => props.open, (val) => { if (val) scrollToBottom() })

async function send() {
  const text = input.value.trim()
  if (!text) return

  error.value = ''
  input.value = ''
  chat.addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

  isTyping.value = true
  scrollToBottom()

  try {
    const history = chat.messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemContext() },
          ...history,
        ],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const msg = data?.error?.message ?? `HTTP ${res.status}`
      throw new Error(msg)
    }

    const reply = data.choices?.[0]?.message?.content ?? 'No response received.'
    chat.addMessage({ role: 'assistant', content: reply, timestamp: new Date().toISOString() })
  } catch (e: any) {
    error.value = e.message ?? 'Failed to reach Gemini.'
    console.error('[Gemini]', e)
  } finally {
    isTyping.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="backdrop">
    <div v-if="open" class="backdrop" @click="emit('close')" />
  </Transition>

  <!-- Panel -->
  <Transition name="panel">
    <div v-if="open" class="chat-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <div class="avatar">
            <i class="pi pi-sparkles" />
          </div>
          <div>
            <div class="header-title">AI Assistant</div>
            <div class="header-sub">Powered by Claude</div>
          </div>
        </div>
        <button class="close-btn" @click="emit('close')">
          <i class="pi pi-times" />
        </button>
      </div>

      <!-- Messages -->
      <div class="messages" ref="messagesEl">
        <!-- Empty state -->
        <div v-if="chat.messages.length === 0 && !isTyping" class="empty-chat">
          <div class="empty-icon"><i class="pi pi-comments" /></div>
          <p>Ask me anything about your health data, readings, or wellness tips.</p>
        </div>

        <div
          v-for="(msg, i) in chat.messages"
          :key="i"
          class="message-row"
          :class="msg.role"
        >
          <div v-if="msg.role === 'assistant'" class="msg-avatar">
            <i class="pi pi-sparkles" />
          </div>
          <div class="bubble">
            <div
              v-if="msg.role === 'assistant'"
              class="bubble-text markdown"
              v-html="renderMarkdown(msg.content)"
            />
            <div v-else class="bubble-text">{{ msg.content }}</div>
            <div class="bubble-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="chat-error">
          <i class="pi pi-exclamation-triangle" /> {{ error }}
        </div>

        <!-- Typing indicator -->
        <div v-if="isTyping" class="message-row assistant">
          <div class="msg-avatar"><i class="pi pi-sparkles" /></div>
          <div class="bubble typing-bubble">
            <span /><span /><span />
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="panel-footer">
        <textarea
          v-model="input"
          class="chat-input"
          placeholder="Ask about your health data…"
          rows="1"
          @keydown="onKeydown"
        />
        <button class="send-btn" :disabled="!input.trim()" @click="send">
          <i class="pi pi-send" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────── */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 299;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.25s ease; }
.backdrop-enter-from, .backdrop-leave-to        { opacity: 0; }

/* ── Panel ────────────────────────────────────────────────── */
.chat-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 380px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border-left: 1px solid var(--color-border);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.35);
}

.panel-enter-active { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease; }
.panel-leave-active { transition: transform 0.22s ease,                              opacity 0.2s ease; }
.panel-enter-from   { transform: translateX(100%); opacity: 0; }
.panel-leave-to     { transform: translateX(100%); opacity: 0; }

/* ── Header ───────────────────────────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 11px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}

.header-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.header-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 1px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s ease, color 0.15s ease;
}

.close-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

/* ── Messages ─────────────────────────────────────────────── */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.empty-chat p {
  font-size: 13px;
  max-width: 240px;
  line-height: 1.5;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  animation: msg-in 0.2s ease both;
}

@keyframes msg-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.message-row.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.bubble {
  max-width: 78%;
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.5;
}

.message-row.assistant .bubble {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-bottom-left-radius: 4px;
}

.message-row.user .bubble {
  background: var(--color-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble-time {
  font-size: 10px;
  margin-top: 5px;
  opacity: 0.55;
}

/* Markdown rendering */
:deep(.markdown) { line-height: 1.55; }
:deep(.markdown p)  { margin: 0 0 6px; }
:deep(.markdown p:last-child) { margin-bottom: 0; }
:deep(.markdown ul), :deep(.markdown ol) { margin: 4px 0 6px 16px; padding: 0; }
:deep(.markdown li) { margin-bottom: 3px; }
:deep(.markdown strong) { font-weight: 700; color: var(--color-text-primary); }
:deep(.markdown code) {
  font-size: 12px;
  background: rgba(233, 30, 140, 0.08);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: monospace;
}
:deep(.markdown h1), :deep(.markdown h2), :deep(.markdown h3) {
  font-size: 13px;
  font-weight: 700;
  margin: 8px 0 4px;
  color: var(--color-text-primary);
}

/* Typing indicator */
.typing-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
}

.typing-bubble span {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.typing-bubble span:nth-child(2) { animation-delay: 0.15s; }
.typing-bubble span:nth-child(3) { animation-delay: 0.3s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
  30%            { transform: translateY(-6px); opacity: 1; }
}

.chat-error {
  font-size: 12px;
  color: var(--color-critical);
  background: var(--color-critical-bg);
  border: 1px solid var(--color-critical-border);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Footer ───────────────────────────────────────────────── */
.panel-footer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  resize: none;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 10px 13px;
  font-size: 13.5px;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text-primary);
  line-height: 1.4;
  outline: none;
  transition: border-color 0.15s ease;
  field-sizing: content;
  max-height: 120px;
  overflow-y: auto;
}

.chat-input:focus {
  border-color: var(--color-primary);
}

.chat-input::placeholder {
  color: var(--color-text-muted);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
}

.send-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: scale(1.08);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
