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
      <span class="logo-icon">🌹</span>
      <div class="logo-text">
        <span class="logo-name">RoseGuard</span>
        <span class="logo-sub">Monitor</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <span class="nav-section-label">Navigation</span>
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
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
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-icon {
  font-size: 26px;
  line-height: 1;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo-name {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.2px;
}

.logo-sub {
  font-size: 11px;
  color: var(--color-sidebar-text);
  letter-spacing: 0.5px;
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
  transition: all 0.15s ease;
  border-left: 2px solid transparent;
}

.nav-item:hover {
  background: var(--color-sidebar-hover);
  color: #ffffff;
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
}

.nav-item.active .nav-icon {
  opacity: 1;
  color: var(--color-primary);
}

</style>
