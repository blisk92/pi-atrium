<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores/app'
import Sidebar from './components/Sidebar.vue'
import ChatPane from './components/ChatPane.vue'
import RightPane from './components/RightPane.vue'

const appStore = useAppStore()

onMounted(() => {
  appStore.recordRendererReady()
})
</script>

<template>
  <div class="app">
    <Sidebar />
    <ChatPane />
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
