<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import NetworkSelector from '@/components/NetworkSelector.vue'
import { onMounted } from 'vue'
import { rmbService } from '@/services/rmbService'

const router = useRouter()

onMounted(async () => {
  await rmbService.initialize()
})

const goToHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-section">
        <div class="logo-icon clickable" @click="goToHome">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background circle -->
            <circle cx="16" cy="16" r="15" fill="#1a1a1a" stroke="#3b82f6" stroke-width="2"/>
            
            <!-- ZOS Lens icon - stylized eye with grid pattern -->
            <!-- Eye shape -->
            <ellipse cx="16" cy="16" rx="10" ry="6" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
            
            <!-- Grid pattern inside eye -->
            <rect x="11" y="13" width="3" height="3" fill="#60a5fa"/>
            <rect x="14.5" y="13" width="3" height="3" fill="#60a5fa"/>
            <rect x="18" y="13" width="3" height="3" fill="#60a5fa"/>
            <rect x="11" y="16.5" width="3" height="3" fill="#60a5fa"/>
            <rect x="14.5" y="16.5" width="3" height="3" fill="#93c5fd"/>
            <rect x="18" y="16.5" width="3" height="3" fill="#60a5fa"/>
            
            <!-- Lens focus point -->
            <circle cx="16" cy="16" r="1.5" fill="#dbeafe"/>
            
            <!-- Z text -->
            <text x="16" y="26" font-family="monospace" font-size="4" font-weight="bold" fill="#3b82f6" text-anchor="middle">ZOS</text>
          </svg>
        </div>
        <h1 class="app-title clickable" @click="goToHome">ZOS Lens</h1>
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
  gap: 12px;
}

.logo-icon {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.logo-icon:hover {
  transform: scale(1.05);
}

.logo-icon svg {
  display: block;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.app-title.clickable {
  cursor: pointer;
  transition: color 0.2s ease;
}

.app-title.clickable:hover {
  color: var(--color-primary);
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
