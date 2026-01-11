<script setup lang="ts">
import { RouterView } from 'vue-router'
import NetworkSelector from '@/components/NetworkSelector.vue'
import { onMounted } from 'vue'
import { rmbService } from '@/services/rmbService'

onMounted(async () => {
  await rmbService.initialize()
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-section">
        <h1 class="app-title">ZOS Lens</h1>
      </div>
    </header>
    
    <main class="app-main">
      <div class="main-content">
        <div class="sidebar">
          <NetworkSelector />
        </div>
        <div class="content">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  color: var(--color-text);
}

.app-header {
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  padding: 0 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-section {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.main-content {
  height: 100%;
  display: flex;
}

.sidebar {
  width: 350px;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
  padding: 1rem;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 50vh;
  }
}
</style>
