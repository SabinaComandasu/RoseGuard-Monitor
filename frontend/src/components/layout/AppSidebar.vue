<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'pi pi-th-large' },
  { path: '/profile', label: 'Profile', icon: 'pi pi-user' },
  { path: '/history', label: 'History', icon: 'pi pi-chart-line' },
  { path: '/reports', label: 'Reports', icon: 'pi pi-file-pdf' },
  { path: '/chat', label: 'AI Assistant', icon: 'pi pi-comments' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <img src="@/assets/logo.png" alt="RoseGuard Monitor" class="logo-img" />
    </div>

    <nav class="sidebar-nav">
      <span class="nav-section-label">Navigation</span>
      <RouterLink
        v-for="(item, i) in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
        :style="{ '--nav-delay': `${i * 0.07 + 0.1}s` }"
      >
        <i :class="item.icon" class="nav-icon" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: var(--color-sidebar-bg);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  animation: sidebar-in 0.35s ease both;
}

@keyframes sidebar-in {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  animation: fade-down 0.4s ease 0.2s both;
}

@keyframes fade-down {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.logo-img {
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

.sidebar-nav {
  flex: 1;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.25);
  padding: 0 8px;
  margin-bottom: 8px;
  animation: fade-in 0.4s ease 0.3s both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
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
  animation: nav-item-in 0.35s ease var(--nav-delay, 0.1s) both;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
}

@keyframes nav-item-in {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

.nav-item:hover {
  background: var(--color-sidebar-hover);
  color: #ffffff;
  transform: translateX(3px);
}

.nav-item.active {
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-text-active);
  border-left-color: var(--color-sidebar-active-border);
  font-weight: 600;
}

.nav-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
  opacity: 0.85;
  transition: transform 0.2s ease, opacity 0.15s ease;
}

.nav-item:hover .nav-icon {
  opacity: 1;
  transform: scale(1.15);
}

.nav-item.active .nav-icon {
  opacity: 1;
  color: var(--color-primary);
}
</style>
