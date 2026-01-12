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

      <div class="form-group">
        <label for="mnemonic-input">Mnemonic (for RMB authentication):</label>
        <input 
          id="mnemonic-input"
          v-model="mnemonic"
          type="password"
          placeholder="Enter your mnemonic phrase"
          class="mnemonic-input"
          :class="{ 'input-error': mnemonicError }"
          @blur="onMnemonicChange"
        />
        <small v-if="mnemonicError" class="error-text">{{ mnemonicError }}</small>
        <small v-else class="help-text">Required to make RMB calls (12 or 24 words)</small>
      </div>

      <div class="status-indicator">
        <span v-if="!mnemonic" class="status-warning">⚠️ No mnemonic provided</span>
        <span v-else-if="mnemonicError" class="status-error">❌ Invalid mnemonic</span>
        <span v-else class="status-success">✅ Mnemonic configured</span>
      </div>

      <button 
        @click="refreshData" 
        class="btn btn-secondary"
        :disabled="loadingData"
      >
        {{ loadingData ? 'Loading...' : 'Refresh Data' }}
      </button>
    </div>

    <div v-if="!mnemonic" class="mock-warning">
      <p>⚠️ Please provide a mnemonic to authenticate RMB calls and fetch real deployment data.</p>
    </div>

    <div v-else class="real-data-indicator">
      <p>✅ Ready to fetch data from ThreeFold {{ currentNetworkLabel }}</p>
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
import { testMnemonicValidation, checkWordlistAvailability } from '@/utils/mnemonicTest';

const selectedNetwork = ref<NetworkEnv>(networkConfigService.getCurrentNetwork());
const loadingData = ref(false);
const mnemonic = ref<string>('');
const mnemonicError = ref<string>('');

const networks = computed(() => networkConfigService.getAllNetworks());
const currentNetworkLabel = computed(() => {
  const network = networks.value.find((n: { value: NetworkEnv; label: string }) => n.value === selectedNetwork.value);
  return network ? network.label : 'Unknown';
});
const currentConfig = computed(() => networkConfigService.getCurrentConfig());

const validateMnemonic = (phrase: string): boolean => {
  if (!phrase || phrase.trim() === '') {
    return false;
  }
  
  // Run the test utility to see what's happening
  const testResult = testMnemonicValidation(phrase);
  
  // BIP39 mnemonic should be 12, 15, 18, 21, or 24 words
  const words = phrase.trim().split(/\s+/);
  const validWordCounts = [12, 15, 18, 21, 24];
  
  if (!validWordCounts.includes(words.length)) {
    mnemonicError.value = `Invalid mnemonic: must be ${validWordCounts.join(', ')} words. Found ${words.length} words.`;
    return false;
  }
  
  // Basic validation: each word should be lowercase letters only
  const invalidWords = words.filter(word => !/^[a-z]+$/.test(word));
  if (invalidWords.length > 0) {
    mnemonicError.value = 'Invalid mnemonic: words should contain only lowercase letters';
    return false;
  }
  
  // If bip39 test failed, show error
  if (!testResult) {
    mnemonicError.value = 'Invalid mnemonic: BIP39 validation failed. One or more words are not in the BIP39 wordlist.';
    return false;
  }
  
  mnemonicError.value = '';
  return true;
};

const onNetworkChange = () => {
  networkConfigService.setCurrentNetwork(selectedNetwork.value);
  // Reset to real data when network changes
  rmbService.setSelectedNode(null);
  refreshData();
};

const onMnemonicChange = () => {
  const trimmedMnemonic = mnemonic.value.trim();
  
  if (!trimmedMnemonic) {
    localStorage.removeItem('zos_lens_mnemonic');
    rmbService.setMnemonic('');
    mnemonicError.value = '';
    return;
  }
  
  if (validateMnemonic(trimmedMnemonic)) {
    // Store mnemonic securely (in production, use proper encryption)
    localStorage.setItem('zos_lens_mnemonic', trimmedMnemonic);
    rmbService.setMnemonic(trimmedMnemonic);
  } else {
    // Don't store invalid mnemonic
    localStorage.removeItem('zos_lens_mnemonic');
    rmbService.setMnemonic('');
  }
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
  // Check wordlist availability on mount
  checkWordlistAvailability();
  
  // Load mnemonic from storage
  const storedMnemonic = localStorage.getItem('zos_lens_mnemonic');
  if (storedMnemonic) {
    mnemonic.value = storedMnemonic;
    if (validateMnemonic(storedMnemonic)) {
      rmbService.setMnemonic(storedMnemonic);
    } else {
      // Clear invalid stored mnemonic
      localStorage.removeItem('zos_lens_mnemonic');
      mnemonic.value = '';
    }
  }
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

.mnemonic-input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
  width: 100%;
  font-family: monospace;
}

.mnemonic-input.input-error {
  border-color: #ef4444;
}

.mnemonic-input::placeholder {
  color: var(--color-text-muted);
}

.help-text {
  color: var(--color-text-muted);
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.status-indicator {
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.status-warning {
  color: var(--color-warning);
}

.status-error {
  color: #ef4444;
}

.status-success {
  color: var(--color-success);
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
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  align-items: flex-start;
}

.url-item:last-child {
  border-bottom: none;
}

.url-item .label {
  font-weight: 500;
  color: var(--color-text-dark-2);
  min-width: 90px;
  flex-shrink: 0;
}

.url-item .value {
  color: var(--color-text);
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  flex: 1;
}

@media (max-width: 768px) {
  .url-item {
    flex-direction: column;
    gap: 5px;
  }
  
  .url-item .label {
    min-width: unset;
  }
}
</style>
