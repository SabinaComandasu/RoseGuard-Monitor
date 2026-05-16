<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import FloatingChatButton from './components/FloatingChatButton.vue'
import ChatPanel from './components/ChatPanel.vue'
import WelcomeBackDialog from './components/WelcomeBackDialog.vue'
import CompleteProfileDialog from './components/CompleteProfileDialog.vue'
import { useAuthStore } from './stores/auth'
import { useUserStore } from './stores/user'
import { useBiometricsStore } from './stores/biometrics'
import { useTrendsStore } from './stores/trends'
import { useHealthAdviceStore } from './stores/healthAdvice'
import type { WelcomeChanges } from './components/WelcomeBackDialog.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const user = useUserStore()
const bio  = useBiometricsStore()
const trends = useTrendsStore()
const healthAdvice = useHealthAdviceStore()
const healthAdviceNotif = ref(false)
const chatOpen = ref(false)
const sidebarOpen = ref(true)
const showWelcome = ref(false)
const showProfileGate = ref(false)

onMounted(async () => {
  if (!auth.isAuthenticated) return
  try {
    await user.load()
    if (!user.isProfileComplete) showProfileGate.value = true
  } catch {}
})

watch(() => auth.justLoggedIn, async (val) => {
  if (!val) return
  let loaded = false
  try { await user.load(); loaded = true } catch {}
  auth.justLoggedIn = false
  if (!loaded) return
  if (!user.isProfileComplete) {
    showProfileGate.value = true
  } else {
    showWelcome.value = true
  }
})

function closeWelcome(changes: WelcomeChanges | null) {
  showWelcome.value = false
  if (!changes) return
  healthAdvice.evaluate(user.bmi, user.sleepHours, user.fitnessLevel, changes)
  if (healthAdvice.hasAny) {
    healthAdviceNotif.value = true
    playPop()
  }
}

function onProfileSaved() {
  showProfileGate.value = false
}

function logout() {
  auth.logout()
  router.push('/signin')
}

function playPop() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.07)
    gain.gain.setValueAtTime(0.22, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
    osc.onended = () => ctx.close()
  } catch {}
}

watch(() => trends.hasChartData, (val) => {
  if (val && !trends.healthNotifSeen) playPop()
})

function onChatToggle() {
  chatOpen.value = !chatOpen.value
  if (chatOpen.value) {
    trends.markHealthNotifSeen()
    healthAdviceNotif.value = false
    healthAdvice.markSeen()
  }
}
</script>

<template>
  <!-- Public pages (sign in, etc.) render without the shell -->
  <RouterView v-if="route.meta.public" />

  <!-- Authenticated shell -->
  <template v-else>
    <AppSidebar :open="sidebarOpen" />
    <div class="app-main" :class="{ expanded: !sidebarOpen }">
      <header class="app-header">
        <button class="toggle-btn" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'">
          <i :class="sidebarOpen ? 'pi pi-angle-left' : 'pi pi-angle-right'" />
        </button>
        <div class="header-right">
          <div class="connection-status" :class="{ disconnected: !bio.bleConnected }">
            <span class="status-dot" />
            <span>{{ bio.bleConnected ? 'Bluetooth Connected' : 'Bluetooth Disconnected' }}</span>
          </div>
          <button class="logout-btn" @click="logout">
            <i class="pi pi-sign-out" />
            Log out
          </button>
        </div>
      </header>
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </div>

    <!-- Notification dot on FAB -->
    <Transition name="notif">
      <span v-if="(trends.hasChartData && !trends.healthNotifSeen) || healthAdviceNotif" class="fab-notif-dot" />
    </Transition>

    <!-- Health advice notification bubble (higher) -->
    <Transition name="notif">
      <div v-if="healthAdviceNotif" class="fab-notif-bubble health-notif-bubble">
        <i class="pi pi-heart" style="color:#e91e8c;font-size:12px" />
        {{ healthAdvice.unlockedCount === 1 ? '1 health tip unlocked' : `${healthAdvice.unlockedCount} health tips unlocked` }}
      </div>
    </Transition>

    <!-- Biometric conversation bubble -->
    <Transition name="notif">
      <div v-if="trends.hasChartData && !trends.healthNotifSeen" class="fab-notif-bubble">
        <i class="pi pi-sparkles" style="color:#7c3aed;font-size:12px" />
        New conversation unlocked
      </div>
    </Transition>

    <FloatingChatButton @toggle="onChatToggle" />
    <ChatPanel :open="chatOpen" @close="chatOpen = false" />
    <CompleteProfileDialog v-if="showProfileGate" @saved="onProfileSaved" />
    <WelcomeBackDialog v-if="showWelcome" @close="closeWelcome" />
  </template>
</template>

<style scoped>
.app-main {
  margin-left: var(--sidebar-width);
  width: calc(100vw - var(--sidebar-width));
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s ease, width 0.3s ease;
}

.app-main.expanded {
  margin-left: var(--sidebar-collapsed-width);
  width: calc(100vw - var(--sidebar-collapsed-width));
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 32px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.toggle-btn:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: scale(1.08);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border: 1.5px solid var(--color-primary);
  border-radius: 20px;
  background: rgba(233, 30, 140, 0.08);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.logout-btn:hover {
  background: rgba(233, 30, 140, 0.16);
  box-shadow: 0 2px 10px rgba(233, 30, 140, 0.25);
  transform: translateY(-1px);
}

.logout-btn:active {
  transform: translateY(0) scale(0.97);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 5px 12px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.7);
  animation: pulse 2s infinite;
}

.connection-status.disconnected .status-dot {
  background: #94a3b8;
  box-shadow: none;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* FAB notification */
.fab-notif-dot {
  position: fixed;
  bottom: 72px;
  right: 32px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #7c3aed;
  border: 2.5px solid #fff;
  z-index: 201;
  pointer-events: none;
}

.fab-notif-bubble {
  position: fixed;
  bottom: 100px;
  right: 28px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  z-index: 201;
  pointer-events: none;
}

.health-notif-bubble {
  bottom: 100px;
}

.notif-enter-active { transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.notif-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.notif-enter-from   { opacity: 0; transform: translateY(10px) scale(0.92); }
.notif-leave-to     { opacity: 0; transform: translateY(6px)  scale(0.95); }
</style>
