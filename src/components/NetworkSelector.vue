<template>
  <div class="network-selector">
    <div class="network-info">
      <h3>Network Configuration</h3>
      <div class="current-network">
        <span class="label">Current Network:</span>
        <span class="value">{{ currentNetworkLabel }}</span>
      </div>
    </div>

    <div class="network-controls">
      <div class="form-group">
        <label for="network-select">Select Network:</label>
        <select 
          id="network-select" 
          v-model="selectedNetwork" 
          @change="onNetworkChange"
          class="network-select"
        >
          <option v-for="network in networks" :key="network.value" :value="network.value">
            {{ network.label }}
          </option>
        </select>
      </div>

      <button 
        @click="refreshData" 
        class="btn btn-secondary"
        :disabled="loadingData"
      >
        {{ loadingData ? 'Loading...' : 'Refresh Data' }}
      </button>
    </div>

    <div v-if="rmbService.isUsingMockData()" class="mock-warning">
      <p>⚠️ Using mock data. Real data is available - select a network to fetch live deployments.</p>
    </div>

    <div v-else class="real-data-indicator">
      <p>✅ Using real data from ThreeFold {{ currentNetworkLabel }}</p>
    </div>

    <div class="network-urls">
      <h4>Current Network URLs:</h4>
      <div class="url-list">
        <div class="url-item">
          <span class="label">GridProxy:</span>
          <span class="value">{{ currentConfig.gridProxyUrl }}</span>
        </div>
        <div class="url-item">
          <span class="label">GraphQL:</span>
          <span class="value">{{ currentConfig.graphqlUrl }}</span>
        </div>
        <div class="url-item">
          <span class="label">Substrate:</span>
          <span class="value">{{ currentConfig.substrateUrl }}</span>
        </div>
        <div class="url-item">
          <span class="label">Relay:</span>
          <span class="value">{{ currentConfig.relayUrl }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { networkConfigService, type NetworkEnv } from '@/services/networkConfig';
import { rmbService } from '@/services/rmbService';

const selectedNetwork = ref<NetworkEnv>(networkConfigService.getCurrentNetwork());
const loadingData = ref(false);

const networks = computed(() => networkConfigService.getAllNetworks());
const currentNetworkLabel = computed(() => {
  const network = networks.value.find((n: { value: NetworkEnv; label: string }) => n.value === selectedNetwork.value);
  return network ? network.label : 'Unknown';
});
const currentConfig = computed(() => networkConfigService.getCurrentConfig());

const onNetworkChange = () => {
  networkConfigService.setCurrentNetwork(selectedNetwork.value);
  // Reset to real data when network changes
  rmbService.setSelectedNode(null);
  refreshData();
};

const refreshData = async () => {
  loadingData.value = true;
  try {
    // Trigger a refresh by reinitializing the service
    await rmbService.initialize();
  } catch (error) {
    console.error('Failed to refresh data:', error);
  } finally {
    loadingData.value = false;
  }
};

onMounted(async () => {
  await rmbService.initialize();
});
</script>

<style scoped>
.network-selector {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.network-info h3 {
  margin: 0 0 10px 0;
  color: var(--color-heading);
}

.current-network {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.current-network .label {
  font-weight: 600;
  color: var(--color-text-dark-2);
}

.current-network .value {
  color: var(--color-primary);
  font-weight: 500;
}

.network-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 500;
  color: var(--color-text);
}

.network-select,
.node-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
}

.network-select:disabled,
.node-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary {
  background: var(--color-secondary);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-secondary-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mock-warning {
  background: var(--color-warning);
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.mock-warning p {
  margin: 0;
}

.real-data-indicator {
  background: var(--color-success);
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.real-data-indicator p {
  margin: 0;
}

.network-urls h4 {
  margin: 0 0 10px 0;
  color: var(--color-heading);
  font-size: 16px;
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.url-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid var(--color-border);
}

.url-item:last-child {
  border-bottom: none;
}

.url-item .label {
  font-weight: 500;
  color: var(--color-text-dark-2);
}

.url-item .value {
  color: var(--color-text);
  font-family: monospace;
  font-size: 12px;
}

@media (max-width: 768px) {
  .url-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>
