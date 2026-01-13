<template>
  <div class="deployments-view">
    <div class="view-header">
      <div class="header-content">
        <h2>Deployments</h2>
        <p v-if="hasSelectedNode" class="node-info">
          Viewing deployments for Node {{ selectedNodeId }}
        </p>
      </div>
      <button @click="refreshDeployments" class="refresh-btn" :disabled="loading">
        <span v-if="loading">Loading...</span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <div v-if="!hasMnemonic" class="warning-message">
      <p>⚠️ Please configure your mnemonic in the sidebar to fetch deployments via RMB.</p>
    </div>

    <div v-else-if="!hasSelectedNode" class="warning-message">
      <p>⚠️ Please select a node from the <router-link to="/nodes">Nodes page</router-link> to view its deployments.</p>
    </div>

    <div v-else-if="error" 
         class="error-message"
         :class="{ 'unauthorized-error': error.toLowerCase().includes('unauthorized') }">
      {{ error }}
    </div>

    <div v-else-if="deployments.length === 0 && !loading" class="empty-state">
      No deployments found on Node {{ selectedNodeId }}
    </div>

    <div v-else>
      <!-- Summary Statistics -->
      <div class="deployments-summary">
        <div class="summary-item total">
          <span class="summary-label">Deployments</span>
          <span class="summary-value">{{ deploymentSummary.totalDeployments }}</span>
        </div>
        <div class="summary-item total">
          <span class="summary-label">Total Workloads</span>
          <span class="summary-value">{{ deploymentSummary.totalWorkloads }}</span>
        </div>
        <div class="summary-item init">
          <span class="summary-label">Init</span>
          <span class="summary-value">{{ deploymentSummary.init }}</span>
        </div>
        <div class="summary-item ok">
          <span class="summary-label">OK</span>
          <span class="summary-value">{{ deploymentSummary.ok }}</span>
        </div>
        <div class="summary-item error">
          <span class="summary-label">Error</span>
          <span class="summary-value">{{ deploymentSummary.error }}</span>
        </div>
        <div v-if="deploymentSummary.other > 0" class="summary-item other">
          <span class="summary-label">Other</span>
          <span class="summary-value">{{ deploymentSummary.other }}</span>
        </div>
      </div>

      <!-- Deployments Grouped by Twin ID -->
      <div class="deployments-groups">
        <div 
          v-for="group in groupedDeployments" 
          :key="group.twinId"
          class="twin-group"
        >
          <div class="twin-group-header">
            <h3>Twin ID: {{ group.twinId }}</h3>
            <div class="twin-group-stats">
              <span class="stat">{{ group.deployments.length }} deployment(s)</span>
              <span class="stat">{{ group.totalWorkloads }} workload(s)</span>
            </div>
          </div>
          
          <div class="deployments-grid">
            <div
              v-for="deployment in group.deployments"
              :key="`${deployment.twin_id}-${deployment.contract_id}`"
              class="deployment-card"
              @click="navigateToDeployment(deployment)"
            >
              <div class="deployment-header">
                <div class="deployment-id">
                  <span class="label">Contract ID:</span>
                  <span class="value">{{ deployment.contract_id }}</span>
                </div>
              </div>

              <div class="deployment-workloads">
                <div class="workloads-header">
                  <span class="workload-count">{{ deployment.workloads.length }} workload(s)</span>
                </div>
                <div class="workload-list">
                  <div
                    v-for="workload in deployment.workloads"
                    :key="workload.name"
                    class="workload-item"
                    :class="workload.state"
                  >
                    <div class="workload-type">{{ workload.type.toUpperCase() }}</div>
                    <div class="workload-name">{{ workload.name }}</div>
                    <div class="workload-state">
                      <span class="status-indicator" :class="workload.state"></span>
                      {{ workload.state }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { rmbService } from '@/services/rmbService';
import type { Deployment } from '@/types/deployment';

const router = useRouter();
const deployments = ref<Deployment[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const hasMnemonic = computed(() => rmbService.hasMnemonic());
const hasSelectedNode = computed(() => rmbService.getSelectedNode() !== null);
const selectedNodeId = computed(() => rmbService.getSelectedNodeId());

// Group deployments by Twin ID
const groupedDeployments = computed(() => {
  const groups = new Map<number, Deployment[]>();
  
  for (const deployment of deployments.value) {
    if (!groups.has(deployment.twin_id)) {
      groups.set(deployment.twin_id, []);
    }
    groups.get(deployment.twin_id)?.push(deployment);
  }
  
  // Convert to array and sort by twin ID
  return Array.from(groups.entries())
    .map(([twinId, deployments]) => ({
      twinId,
      deployments,
      totalWorkloads: deployments.reduce((sum, d) => sum + d.workloads.length, 0)
    }))
    .sort((a, b) => a.twinId - b.twinId);
});

// Calculate summary statistics for all deployments
const deploymentSummary = computed(() => {
  const summary = {
    totalDeployments: deployments.value.length,
    totalWorkloads: 0,
    ok: 0,
    init: 0,
    error: 0,
    other: 0
  };
  
  for (const deployment of deployments.value) {
    summary.totalWorkloads += deployment.workloads.length;
    
    for (const workload of deployment.workloads) {
      const state = workload.state.toLowerCase();
      if (state === 'ok') {
        summary.ok++;
      } else if (state === 'init') {
        summary.init++;
      } else if (state === 'error') {
        summary.error++;
      } else {
        summary.other++;
      }
    }
  }
  
  return summary;
});

const loadDeployments = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await rmbService.listDeployments();
    deployments.value = response.deployments;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load deployments';
    console.error('Error loading deployments:', err);
  } finally {
    loading.value = false;
  }
};

const refreshDeployments = () => {
  loadDeployments();
};

const navigateToDeployment = (deployment: Deployment) => {
  router.push({
    name: 'deployment-detail',
    params: {
      twinId: deployment.twin_id.toString(),
      contractId: deployment.contract_id.toString()
    }
  });
};

onMounted(() => {
  loadDeployments();
});
</script>

<style scoped>
.deployments-view {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.view-header h2 {
  color: var(--color-heading);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.node-info {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0;
  font-weight: 500;
}

.refresh-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.deployments-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: 8px;
  border: 2px solid var(--color-border);
  transition: all 0.2s;
}

.summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.summary-item.total {
  border-color: var(--color-border-hover);
}

.summary-item.ok {
  border-color: var(--color-success);
}

.summary-item.init {
  border-color: var(--color-info);
}

.summary-item.error {
  border-color: var(--color-error);
}

.summary-item.other {
  border-color: var(--color-info);
}

.summary-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-heading);
}

.summary-item.total .summary-value {
  color: var(--color-heading);
}

.summary-item.ok .summary-value {
  color: var(--color-success);
}

.summary-item.init .summary-value {
  color: var(--color-info);
}

.summary-item.error .summary-value {
  color: var(--color-error);
}

.summary-item.other .summary-value {
  color: var(--color-info);
}

.error-message {
  background: #f85149 !important;
  color: white;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  border: 1px solid #f85149 !important;
}

.error-message.unauthorized-error {
  background: #ffa657 !important;
  color: #1a1a1a;
  border: 2px solid #ff8c00 !important;
  font-weight: 500;
  padding: 1.25rem;
}

.error-message.unauthorized-error::before {
  content: "🔒 ";
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.warning-message {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid #f59e0b;
  color: var(--color-text);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.warning-message a {
  color: var(--color-primary);
  text-decoration: underline;
}

.empty-state {
  text-align: center;
  color: var(--color-text);
  padding: 3rem;
  font-size: 1.1rem;
}

.deployments-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.twin-group {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
}

.twin-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
}

.twin-group-header h3 {
  color: var(--color-heading);
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}

.twin-group-stats {
  display: flex;
  gap: 1.5rem;
}

.twin-group-stats .stat {
  color: var(--color-text);
  font-size: 0.9rem;
  padding: 0.25rem 0.75rem;
  background: var(--color-background-soft);
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.deployments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
}

.deployment-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.deployment-card:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.deployment-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.deployment-id {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
}

.value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-heading);
}

.workloads-header {
  margin-bottom: 0.5rem;
}

.workload-count {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
}

.workload-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.workload-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background-mute);
  border-radius: 4px;
  font-size: 0.875rem;
}

.workload-type {
  background: var(--color-secondary);
  color: var(--color-text);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.workload-name {
  flex: 1;
  color: var(--color-text);
}

.workload-state {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.ok {
  background: var(--color-success);
}

.status-indicator.failed {
  background: var(--color-error);
}

.status-indicator.degraded {
  background: var(--color-warning);
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-content {
    align-items: center;
    text-align: center;
  }
  
  .refresh-btn {
    align-self: center;
  }
}
</style>
