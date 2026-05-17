<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { marked } from 'marked'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useBiometricsStore } from '@/stores/biometrics'
import { useUserStore } from '@/stores/user'
import { useTrendsStore } from '@/stores/trends'
import { useHealthAdviceStore } from '@/stores/healthAdvice'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const chat = useChatStore()
const biometrics = useBiometricsStore()
const user = useUserStore()
const trends = useTrendsStore()
const healthAdvice = useHealthAdviceStore()

function openHealthAnalysis() {
  emit('close')
  router.push({ path: '/history', query: { autoAnalyze: '1' } })
}
const input = ref('')
const messagesEl = ref<HTMLElement | null>(null)
const isTyping = ref(false)
const error = ref('')
const historyOpen = ref(false)
const renamingId = ref<string | null>(null)
const renameValue = ref('')

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function systemContext() {
  return `You are a medical assistant integrated into the RoseGuard Monitor app.
Current patient: ${user.fullName || 'Unknown'}.
Live readings - SpO2: ${biometrics.spo2 ?? 'N/A'}%, Heart rate: ${biometrics.heartRate ?? 'N/A'} BPM, Temperature: ${biometrics.temperature ?? 'N/A'}°C.
Always reply in English only, regardless of the language the user writes in.
Structure responses with bullet points, clear sections, and bold text for important terms.
Be concise and practical. Always recommend consulting a doctor for important medical decisions.`
}

function renderMarkdown(text: string): string {
  return marked.parse(text) as string
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

watch(() => chat.messages.length, scrollToBottom)
watch(() => props.open, (val) => { if (val) scrollToBottom() })

async function startAdviceConversation(topic: 'bmi' | 'sleep' | 'activity') {
  const prompts: Record<string, string> = {
    bmi:      `My BMI is ${user.bmi?.toFixed(1)}. I'm ${user.heightCm} cm tall and weigh ${user.weightKg} kg. Please give me personalised, actionable advice to reach and maintain a healthy weight.`,
    sleep:    `I currently sleep about ${user.sleepHours} hours per night. Please give me practical tips to improve my sleep quality and reach the recommended 7–9 hours.`,
    activity: `I have a sedentary lifestyle and don't exercise regularly. Please give me a beginner-friendly plan to become more active, starting small and building up gradually.`,
  }
  chat.newConversation()
  await send(prompts[topic])
}

async function send(overrideText?: string) {
  const text = (typeof overrideText === 'string' ? overrideText : null) ?? input.value.trim()
  if (!text) return

  if (!chat.activeConversation) chat.newConversation()

  error.value = ''
  if (!overrideText) input.value = ''
  chat.addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

  isTyping.value = true
  scrollToBottom()

  try {
    const history = chat.messages
      .filter(m => typeof m.content === 'string' && m.content.length > 0)
      .map(m => ({
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
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: systemContext() },
          ...history,
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)

    const reply = data.choices?.[0]?.message?.content ?? 'No response received.'
    chat.addMessage({ role: 'assistant', content: reply, timestamp: new Date().toISOString() })
  } catch (e: any) {
    error.value = e.message ?? 'Failed to reach AI.'
    console.error('[Chat]', e)
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

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function selectConversation(id: string) {
  chat.switchConversation(id)
  scrollToBottom()
}

function startRename(conv: { id: string; title: string }, e: Event) {
  e.stopPropagation()
  renamingId.value = conv.id
  renameValue.value = conv.title
  nextTick(() => {
    const el = document.getElementById(`rename-${conv.id}`)
    el?.focus()
    ;(el as HTMLInputElement)?.select()
  })
}

function commitRename(id: string) {
  try {
    chat.renameConversation(id, renameValue.value)
  } finally {
    renamingId.value = null
  }
}

function onRenameKeydown(e: KeyboardEvent, id: string) {
  if (e.key === 'Enter') { e.preventDefault(); commitRename(id) }
  if (e.key === 'Escape') { renamingId.value = null }
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="backdrop">
    <div v-if="open" class="backdrop" @click="emit('close')" />
  </Transition>

  <!-- Panel -->
  <Transition name="panel">
    <div v-if="open" class="chat-panel" :class="{ 'with-history': historyOpen }">

      <!-- History sidebar -->
      <Transition name="history">
        <div v-if="historyOpen" class="history-sidebar">
          <div class="history-header">
            <span class="history-title">Chats</span>
            <button class="icon-btn" @click="chat.newConversation(); historyOpen = false" title="New chat">
              <i class="pi pi-plus" />
            </button>
          </div>
          <div class="history-list">
            <div
              v-if="chat.conversations.length === 0"
              class="history-empty"
            >No conversations yet</div>
            <div
              v-for="conv in chat.conversations"
              :key="conv.id"
              class="history-item"
              :class="{ active: conv.id === chat.activeId, renaming: renamingId === conv.id }"
              @click="renamingId !== conv.id && selectConversation(conv.id)"
            >
              <template v-if="renamingId === conv.id">
                <div class="rename-row">
                  <input
                    :id="`rename-${conv.id}`"
                    v-model="renameValue"
                    class="rename-input"
                    @click.stop
                    @keydown="onRenameKeydown($event, conv.id)"
                  />
                  <button class="rename-action-btn confirm" @click.stop="commitRename(conv.id)" title="Save">
                    <i class="pi pi-check" />
                  </button>
                  <button class="rename-action-btn cancel" @click.stop="renamingId = null" title="Cancel">
                    <i class="pi pi-times" />
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="history-item-title">{{ conv.title }}</div>
                <div class="history-item-meta">{{ formatDate(conv.createdAt) }}</div>
                <div class="history-item-actions">
                  <button class="action-btn" @click.stop="startRename(conv, $event)" title="Rename">
                    <i class="pi pi-pencil" />
                  </button>
                  <button class="action-btn delete-btn" @click.stop="chat.deleteConversation(conv.id)" title="Delete">
                    <i class="pi pi-trash" />
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Main chat -->
      <div class="chat-main">
        <!-- Header -->
        <div class="panel-header">
          <div class="header-left">
            <button class="icon-btn" @click="historyOpen = !historyOpen" :title="historyOpen ? 'Hide history' : 'Show history'">
              <i class="pi pi-history" />
            </button>
            <div class="avatar"><i class="pi pi-sparkles" /></div>
            <div>
              <div class="header-title">AI Assistant</div>
              <div class="header-sub">Powered by Grok</div>
            </div>
          </div>
          <div class="header-actions">
            <button class="icon-btn" @click="chat.newConversation()" title="New chat">
              <i class="pi pi-plus" />
            </button>
            <button class="close-btn" @click="emit('close')">
              <i class="pi pi-times" />
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div class="messages" ref="messagesEl">
          <div v-if="chat.messages.length === 0 && !isTyping" class="empty-chat">
            <div class="empty-icon"><i class="pi pi-comments" /></div>
            <p>Ask me anything about your health data, readings, or wellness tips.</p>

            <button v-if="trends.hasChartData" class="suggest-card" @click="openHealthAnalysis">
              <div class="suggest-icon-wrap">
                <i class="pi pi-sparkles" />
              </div>
              <div class="suggest-body">
                <div class="suggest-title">AI Health Recommendations</div>
                <div class="suggest-desc">Get personalised insights on your SpO₂, heart rate &amp; temperature readings</div>
              </div>
              <i class="pi pi-arrow-right suggest-arrow" />
            </button>

            <button v-if="healthAdvice.bmiUnlocked" class="suggest-card bmi-card" @click="startAdviceConversation('bmi')">
              <div class="suggest-icon-wrap bmi-icon-wrap">
                <i class="pi pi-user" />
              </div>
              <div class="suggest-body">
                <div class="suggest-title">Weight &amp; BMI Advice</div>
                <div class="suggest-desc">Personalised guidance to reach a healthy weight for your height</div>
              </div>
              <i class="pi pi-arrow-right suggest-arrow bmi-arrow" />
            </button>

            <button v-if="healthAdvice.sleepUnlocked" class="suggest-card sleep-card" @click="startAdviceConversation('sleep')">
              <div class="suggest-icon-wrap sleep-icon-wrap">
                <i class="pi pi-moon" />
              </div>
              <div class="suggest-body">
                <div class="suggest-title">Sleep Improvement Tips</div>
                <div class="suggest-desc">Practical steps to improve your sleep quality and hit 7–9 hours a night</div>
              </div>
              <i class="pi pi-arrow-right suggest-arrow sleep-arrow" />
            </button>

            <button v-if="healthAdvice.activityUnlocked" class="suggest-card activity-card" @click="startAdviceConversation('activity')">
              <div class="suggest-icon-wrap activity-icon-wrap">
                <i class="pi pi-bolt" />
              </div>
              <div class="suggest-body">
                <div class="suggest-title">Active Lifestyle Guide</div>
                <div class="suggest-desc">A beginner-friendly plan to move more and break out of a sedentary routine</div>
              </div>
              <i class="pi pi-arrow-right suggest-arrow activity-arrow" />
            </button>
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

          <div v-if="error" class="chat-error">
            <i class="pi pi-exclamation-triangle" /> {{ error }}
          </div>

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
          <button class="send-btn" :disabled="!input.trim()" @click="send()">
            <i class="pi pi-send" />
          </button>
        </div>
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
  width: 400px;
  z-index: 300;
  display: flex;
  flex-direction: row;
  background: var(--color-bg);
  border-left: 1px solid var(--color-border);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.35);
  transition: width 0.3s ease;
}

.chat-panel.with-history {
  width: 600px;
}

.panel-enter-active { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease; }
.panel-leave-active { transition: transform 0.22s ease, opacity 0.2s ease; }
.panel-enter-from   { transform: translateX(100%); opacity: 0; }
.panel-leave-to     { transform: translateX(100%); opacity: 0; }

/* ── History sidebar ──────────────────────────────────────── */
.history-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  overflow: hidden;
}

.history-enter-active { transition: width 0.3s ease, opacity 0.2s ease; }
.history-leave-active { transition: width 0.25s ease, opacity 0.15s ease; }
.history-enter-from   { width: 0; opacity: 0; }
.history-leave-to     { width: 0; opacity: 0; }

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.history-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-empty {
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 20px 8px;
}

.history-item {
  position: relative;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:hover { background: var(--color-bg); }
.history-item.active { background: var(--color-primary-light); }

.history-item-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 52px;
}

.history-item-meta {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.history-item-actions {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.history-item:hover .history-item-actions { opacity: 1; }

.action-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  font-size: 11px;
  transition: background 0.15s ease, color 0.15s ease;
}

.action-btn:hover { background: var(--color-surface); color: var(--color-text-primary); }
.action-btn.delete-btn:hover { background: var(--color-critical-bg); color: var(--color-critical); }

.rename-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.rename-input {
  flex: 1;
  min-width: 0;
  border: 1.5px solid var(--color-primary);
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 12.5px;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text-primary);
  outline: none;
}

.rename-action-btn {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.15s ease, color 0.15s ease;
}

.rename-action-btn.confirm {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}
.rename-action-btn.confirm:hover { background: rgba(16, 185, 129, 0.25); }

.rename-action-btn.cancel {
  background: var(--color-surface);
  color: var(--color-text-muted);
}
.rename-action-btn.cancel:hover { background: var(--color-critical-bg); color: var(--color-critical); }

/* ── Chat main ────────────────────────────────────────────── */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── Header ───────────────────────────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 9px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.header-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.header-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
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

.icon-btn:hover {
  background: var(--color-surface);
  color: var(--color-primary);
}

.close-btn {
  width: 30px;
  height: 30px;
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

.suggest-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 300px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.07), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(124, 58, 237, 0.22);
  border-radius: var(--radius-sm);
  padding: 13px 14px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  margin-top: 4px;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.suggest-card:hover {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.13), rgba(168, 85, 247, 0.1));
  border-color: rgba(124, 58, 237, 0.38);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.15);
}

.suggest-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  flex-shrink: 0;
}

.suggest-body { flex: 1; min-width: 0; }

.suggest-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.suggest-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
  line-height: 1.45;
}

.suggest-arrow {
  color: #7c3aed;
  font-size: 12px;
  flex-shrink: 0;
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

.message-row.user { flex-direction: row-reverse; }

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

.chat-input:focus { border-color: var(--color-primary); }
.chat-input::placeholder { color: var(--color-text-muted); }

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

/* ── Advice card variants ─────────────────────────────────── */
.bmi-card {
  background: linear-gradient(135deg, rgba(233, 30, 140, 0.07), rgba(201, 24, 111, 0.04));
  border-color: rgba(233, 30, 140, 0.22);
}
.bmi-card:hover {
  background: linear-gradient(135deg, rgba(233, 30, 140, 0.13), rgba(201, 24, 111, 0.09));
  border-color: rgba(233, 30, 140, 0.38);
  box-shadow: 0 4px 14px rgba(233, 30, 140, 0.14);
}
.bmi-icon-wrap { background: linear-gradient(135deg, #e91e8c, #c9186f); }
.bmi-arrow     { color: #e91e8c; }

.sleep-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.07), rgba(79, 70, 229, 0.04));
  border-color: rgba(99, 102, 241, 0.22);
}
.sleep-card:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.13), rgba(79, 70, 229, 0.09));
  border-color: rgba(99, 102, 241, 0.38);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.14);
}
.sleep-icon-wrap { background: linear-gradient(135deg, #6366f1, #4f46e5); }
.sleep-arrow     { color: #6366f1; }

.activity-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.07), rgba(5, 150, 105, 0.04));
  border-color: rgba(16, 185, 129, 0.22);
}
.activity-card:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.13), rgba(5, 150, 105, 0.09));
  border-color: rgba(16, 185, 129, 0.38);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.14);
}
.activity-icon-wrap { background: linear-gradient(135deg, #10b981, #059669); }
.activity-arrow     { color: #10b981; }
</style>
