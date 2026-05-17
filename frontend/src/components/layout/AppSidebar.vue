<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'

defineProps<{ open: boolean }>()

const route = useRoute()
const auth = useAuthStore()
const user = useUserStore()

const initials = computed(() => {
  const f = auth.user?.firstName?.[0] ?? ''
  const l = auth.user?.lastName?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
})

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'pi pi-th-large', tourId: '' },
  { path: '/journal',   label: 'Journal',   icon: 'pi pi-book',     tourId: 'nav-journal' },
  { path: '/history',   label: 'AI Health', icon: 'pi pi-sparkles', tourId: 'nav-history' },
  { path: '/reports',   label: 'Reports',   icon: 'pi pi-file-pdf', tourId: 'nav-reports' },
]
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: !open }" data-tour="sidebar">
    <div class="sidebar-logo" v-if="open">
      <img src="@/assets/logo.png" alt="RoseGuard Monitor" class="logo-full" />
    </div>

    <nav class="sidebar-nav">
      <span class="nav-section-label">Navigation</span>
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
        :title="!open ? item.label : ''"
        v-bind="item.tourId ? { 'data-tour': item.tourId } : {}"
      >
        <i :class="item.icon" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- User profile footer -->
    <RouterLink to="/profile" class="user-footer" data-tour="user-footer" :class="{ collapsed: !open }" :title="!open ? (auth.user?.firstName ?? 'Profile') : ''">
      <div class="user-avatar">
        <img v-if="user.avatarUrl" :src="user.avatarUrl" class="avatar-img" alt="avatar" />
        <span v-else class="avatar-initials">{{ initials }}</span>
      </div>
      <div class="user-info" v-if="open">
        <span class="user-name">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</span>
        <span class="user-email">{{ auth.user?.email }}</span>
      </div>
      <i v-if="open" class="pi pi-angle-right user-arrow" />
    </RouterLink>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: var(--color-sidebar-bg);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  overflow: hidden;
  z-index: 100;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

/* ---- Logo ---- */
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.logo-full {
  width: 148px;
  height: auto;
  display: block;
  animation: heartbeat 2.5s ease-in-out infinite;
  filter:
    drop-shadow(0 0 4px rgba(233, 30, 140, 1))
    drop-shadow(0 0 10px rgba(233, 30, 140, 0.75))
    drop-shadow(0 0 22px rgba(233, 30, 140, 0.45));
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14%       { transform: scale(1.04); }
  28%       { transform: scale(1); }
  42%       { transform: scale(1.03); }
  56%       { transform: scale(1); }
}

/* ---- Nav ---- */
.sidebar-nav {
  flex: 1;
  padding: 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.25);
  padding: 0 8px;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease;
}

.sidebar.collapsed .nav-section-label {
  opacity: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-sidebar-text);
  border-left: 2px solid transparent;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, padding 0.3s ease, justify-content 0.3s ease;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px 0;
  border-left-color: transparent !important;
}

.sidebar.collapsed .nav-item.active {
  background: var(--color-sidebar-active-bg);
}

.nav-item:hover {
  background: var(--color-sidebar-hover);
  color: #ffffff;
}

.sidebar:not(.collapsed) .nav-item:hover {
  transform: translateX(3px);
}

.nav-item.active {
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-text-active);
  border-left-color: var(--color-sidebar-active-border);
  font-weight: 600;
}

.nav-icon {
  font-size: 16px;
  width: 18px;
  text-align: center;
  opacity: 0.85;
  flex-shrink: 0;
  transition: opacity 0.15s ease, transform 0.2s ease;
}

.nav-item:hover .nav-icon { opacity: 1; }
.nav-item.active .nav-icon { opacity: 1; color: var(--color-primary); }

.nav-label {
  overflow: hidden;
  opacity: 1;
  max-width: 200px;
  transition: opacity 0.2s ease, max-width 0.3s ease;
}

.sidebar.collapsed .nav-label {
  opacity: 0;
  max-width: 0;
}

/* ---- User footer ---- */
.user-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-decoration: none;
}

.user-footer.collapsed {
  justify-content: center;
  padding: 14px 0;
}

.user-footer:hover {
  background: var(--color-sidebar-hover);
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(233, 30, 140, 0.2);
  border: 1.5px solid rgba(233, 30, 140, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 11px;
  color: var(--color-sidebar-text);
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-arrow {
  font-size: 12px;
  color: var(--color-sidebar-text);
  flex-shrink: 0;
}
</style>
