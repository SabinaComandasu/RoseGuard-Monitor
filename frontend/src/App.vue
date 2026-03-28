<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/dashboard">Dashboard</RouterLink>
    <RouterLink to="/profile">Profile</RouterLink>
    <RouterLink to="/history">History</RouterLink>
    <RouterLink to="/reports">Reports</RouterLink>
    <RouterLink to="/chat">Chat</RouterLink>
  </nav>

  <RouterView />
</template>
