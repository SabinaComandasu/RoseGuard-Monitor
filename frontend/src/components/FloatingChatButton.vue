<script setup lang="ts">
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button class="fab" title="AI Assistant" @click="$emit('toggle')">
    <i class="pi pi-comments fab-icon" />
    <span class="fab-pulse" />
  </button>
</template>

<style scoped>
.fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 200;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(233, 30, 140, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.15s ease;
  animation: fab-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes fab-in {
  from { opacity: 0; transform: scale(0.5) translateY(20px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.fab:hover {
  transform: scale(1.1) translateY(-2px);
  background: var(--color-primary-dark);
  box-shadow:
    0 0 0 6px rgba(233, 30, 140, 0.15),
    0 6px 24px rgba(233, 30, 140, 0.55);
}

.fab:active { transform: scale(0.96); }

.fab-icon {
  font-size: 22px;
  position: relative;
  z-index: 1;
}

.fab-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(233, 30, 140, 0.6);
  animation: ring-pulse 2.4s ease-out infinite;
  pointer-events: none;
}

@keyframes ring-pulse {
  0%   { transform: scale(1);    opacity: 0.7; }
  70%  { transform: scale(1.55); opacity: 0;   }
  100% { transform: scale(1.55); opacity: 0;   }
}
</style>
