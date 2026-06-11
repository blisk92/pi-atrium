<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores/app'
import { useSessionStore } from './stores/sessions'
import Sidebar from './components/Sidebar.vue'
import MiddlePane from './components/MiddlePane.vue'
import RightPane from './components/RightPane.vue'

const appStore = useAppStore()
const sessionStore = useSessionStore()

onMounted(() => {
  appStore.recordRendererReady()
  // Sidebar calls subscribe() on its own mount; this is a backup.
  sessionStore.subscribe()
})
</script>

<template>
  <div class="app">
    <Sidebar />
    <MiddlePane />
    <RightPane />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  overflow: hidden;
}
</style>
