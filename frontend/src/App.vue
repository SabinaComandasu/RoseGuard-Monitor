<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import FloatingChatButton from './components/FloatingChatButton.vue'
import ChatPanel from './components/ChatPanel.vue'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const chatOpen = ref(false)

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
    <AppSidebar />
    <div class="app-main">
      <header class="app-header">
        <div class="connection-status">
          <span class="status-dot" />
          <span>Bluetooth Connected</span>
        </div>
        <button class="logout-btn" @click="logout">
          <i class="pi pi-sign-out" />
          Log out
        </button>
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
}

.app-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 12px 32px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
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
