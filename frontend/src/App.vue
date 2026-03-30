<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import FloatingChatButton from './components/FloatingChatButton.vue'
import ChatPanel from './components/ChatPanel.vue'
import { useAuthStore } from './stores/auth'
import { useUserStore } from './stores/user'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const user = useUserStore()
const chatOpen = ref(false)
const sidebarOpen = ref(true)

onMounted(() => {
  if (auth.isAuthenticated) user.load().catch(() => {})
})

function logout() {
  auth.logout()
  router.push('/signin')
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
          <div class="connection-status">
            <span class="status-dot" />
            <span>Bluetooth Connected</span>
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

    <FloatingChatButton @toggle="chatOpen = !chatOpen" />
    <ChatPanel :open="chatOpen" @close="chatOpen = false" />
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
</style>
