<template>
  <div class="deployment-detail-view">
    <div class="view-header">
      <button @click="goBack" class="back-btn">
        ← Back to Deployments
      </button>
      <h2>Deployment Details</h2>
      <button @click="refreshDeployment" class="refresh-btn" :disabled="loading">
        <span v-if="loading">Loading...</span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="deployment" class="deployment-content">
      <div class="deployment-info-card">
        <h3>General Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Twin ID:</span>
            <span class="value">{{ deployment.twin_id }}</span>
          </div>
          <div class="info-item">
            <span class="label">Contract ID:</span>
            <span class="value">{{ deployment.contract_id }}</span>
          </div>
          <div class="info-item">
            <span class="label">Version:</span>
            <span class="value">{{ deployment.version }}</span>
          </div>
          <div class="info-item">
            <span class="label">Expiration:</span>
            <span class="value">{{ formatExpiration(deployment.expiration) }}</span>
          </div>
        </div>
      </div>

      <div class="deployment-metadata-card">
        <h3>Metadata</h3>
        <JsonFormatter :data="parseMetadata(deployment.metadata)" />
      </div>

      <div class="deployment-signature-card">
        <h3>Signature Requirements</h3>
        <div class="signature-info">
          <div class="info-item">
            <span class="label">Weight Required:</span>
            <span class="value">{{ deployment.signature_requirement.weight_required }}</span>
          </div>
          <div class="signatures-list">
            <h4>Signatures:</h4>
            <div
              v-for="sig in deployment.signature_requirement.signatures"
              :key="sig.twin_id"
              class="signature-item"
            >
              <div class="info-item">
                <span class="label">Twin ID:</span>
                <span class="value">{{ sig.twin_id }}</span>
              </div>
              <div class="info-item">
                <span class="label">Type:</span>
                <span class="value">{{ sig.signature_type }}</span>
              </div>
              <div class="signature-hash">
                <span class="label">Signature:</span>
                <code class="hash-value">{{ sig.signature }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="workloads-card">
        <h3>Workloads ({{ deployment.workloads.length }})</h3>
        <div class="workloads-list">
          <div
            v-for="workload in deployment.workloads"
            :key="workload.name"
            class="workload-detail-card"
          >
            <div class="workload-header">
              <div class="workload-title">
                <span class="workload-type">{{ workload.type.toUpperCase() }}</span>
                <span class="workload-name">{{ workload.name }}</span>
              </div>
              <div class="workload-status" :class="workload.result.state">
                <span class="status-indicator" :class="workload.result.state"></span>
                {{ workload.result.state }}
              </div>
            </div>
            
            <div class="workload-details">
              <div class="workload-section">
                <h4>Data</h4>
                <JsonFormatter :data="workload.data" />
              </div>
              
              <div class="workload-section">
                <h4>Metadata</h4>
                <JsonFormatter :data="parseMetadata(workload.metadata)" />
              </div>
              
              <div class="workload-section">
                <h4>Result</h4>
                <div class="result-info">
                  <div class="info-item">
                    <span class="label">Created:</span>
                    <span class="value">{{ formatDate(workload.result.created) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">State:</span>
                    <span class="value" :class="workload.result.state">{{ workload.result.state }}</span>
                  </div>
                  <div v-if="workload.result.message" class="info-item">
                    <span class="label">Message:</span>
                    <span class="value">{{ workload.result.message }}</span>
                  </div>
                  <div v-if="workload.result.data" class="info-item">
                    <span class="label">Data:</span>
                    <JsonFormatter :data="workload.result.data" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Deployment History Section -->
      <div class="history-card">
        <h3>Deployment History</h3>
        
        <div v-if="loadingHistory" class="loading-message">
          Loading history...
        </div>
        
        <div v-else-if="historyError" class="error-message">
          {{ historyError }}
        </div>
        
        <div v-else-if="history.length === 0" class="empty-message">
          No history available for this deployment.
        </div>
        
        <div v-else class="history-timeline">
          <div 
            v-for="group in groupedHistory" 
            :key="group.name" 
            class="history-group"
            :class="group.latestState"
          >
            <div class="group-header">
              <div class="workload-info">
                <span class="workload-type">{{ group.type.toUpperCase() }}</span>
                <span class="workload-name">{{ group.name }}</span>
              </div>
              <span class="history-state" :class="group.latestState">{{ group.latestState }}</span>
            </div>
            
            <div class="group-entries">
              <div 
                v-for="entry in group.entries" 
                :key="entry.seq" 
                class="history-entry"
                :class="entry.state"
              >
                <div class="entry-marker">
                  <span class="seq-badge">{{ entry.seq }}</span>
                  <span class="status-dot" :class="entry.state"></span>
                </div>
                
                <div class="entry-content">
                  <div class="entry-info">
                    <span class="state-label" :class="entry.state">{{ entry.state }}</span>
                    <span class="timestamp">{{ formatDate(entry.created) }}</span>
                  </div>
                  <div v-if="entry.message" class="entry-message">
                    {{ entry.message }}
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
import JsonFormatter from '@/components/JsonFormatter.vue';
import type { DeploymentDetail, DeploymentHistoryEntry } from '@/types/deployment';

interface Props {
  twinId: string;
  contractId: string;
}

interface GroupedHistory {
  name: string;
  type: string;
  entries: DeploymentHistoryEntry[];
  latestState: string;
}

const props = defineProps<Props>();
const router = useRouter();
const deployment = ref<DeploymentDetail | null>(null);
const history = ref<DeploymentHistoryEntry[]>([]);
const loading = ref(false);
const loadingHistory = ref(false);
const error = ref<string | null>(null);
const historyError = ref<string | null>(null);

// Group history entries by workload name
const groupedHistory = computed<GroupedHistory[]>(() => {
  const groups = new Map<string, DeploymentHistoryEntry[]>();
  
  // Group entries by name
  for (const entry of history.value) {
    if (!groups.has(entry.name)) {
      groups.set(entry.name, []);
    }
    const group = groups.get(entry.name);
    if (group) {
      group.push(entry);
    }
  }
  
  // Convert to array and sort entries within each group by seq
  return Array.from(groups.entries())
    .map(([name, entries]) => {
      const sortedEntries = entries.sort((a, b) => a.seq - b.seq);
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      
      if (!firstEntry || !lastEntry) {
        return null;
      }
      
      return {
        name,
        type: firstEntry.type,
        entries: sortedEntries,
        latestState: lastEntry.state
      };
    })
    .filter((group): group is GroupedHistory => group !== null)
    .sort((a, b) => {
      const aFirst = a.entries[0];
      const bFirst = b.entries[0];
      return (aFirst?.seq || 0) - (bFirst?.seq || 0);
    });
});

const loadDeployment = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await rmbService.getDeploymentDetail(
      parseInt(props.twinId),
      parseInt(props.contractId)
    );
    deployment.value = response.deployment;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load deployment details';
    console.error('Error loading deployment:', err);
  } finally {
    loading.value = false;
  }
};

const loadHistory = async () => {
  loadingHistory.value = true;
  historyError.value = null;
  
  try {
    const response = await rmbService.getDeploymentHistory(
      parseInt(props.twinId),
      parseInt(props.contractId)
    );
    history.value = response.history;
  } catch (err) {
    historyError.value = err instanceof Error ? err.message : 'Failed to load deployment history';
    console.error('Error loading history:', err);
  } finally {
    loadingHistory.value = false;
  }
};

const refreshDeployment = () => {
  loadDeployment();
};

const goBack = () => {
  router.push('/deployments');
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString();
};

const formatExpiration = (expiration: number) => {
  return expiration === 0 ? 'Never' : formatDate(expiration);
};

const parseMetadata = (metadata: string) => {
  // If metadata is empty or whitespace, return empty object
  if (!metadata || metadata.trim() === '') {
    return {};
  }
  
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(metadata);
    // If it's already an object, return it
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    // If it's a primitive (string, number, etc.), wrap it
    return { value: parsed };
  } catch {
    // If parsing fails, it's a plain string - return it as an object
    return { text: metadata };
  }
};

onMounted(() => {
  loadDeployment();
  loadHistory();
});
</script>

<style scoped>
.deployment-detail-view {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.view-header h2 {
  color: var(--color-heading);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.back-btn,
.refresh-btn {
  background: var(--color-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.back-btn:hover,
.refresh-btn:hover:not(:disabled) {
  background: var(--color-secondary-hover);
  border-color: var(--color-border-hover);
}

.refresh-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: var(--color-error);
  color: white;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.deployment-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.deployment-info-card,
.deployment-metadata-card,
.deployment-signature-card,
.workloads-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.deployment-info-card h3,
.deployment-metadata-card h3,
.deployment-signature-card h3,
.workloads-card h3 {
  color: var(--color-heading);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.7;
}

.value {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-heading);
}

.metadata-content,
.json-content {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.signature-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.signatures-list h4 {
  color: var(--color-heading);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.signature-item {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.signature-hash {
  margin-top: 0.5rem;
}

.hash-value {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text);
  word-break: break-all;
  display: block;
  margin-top: 0.25rem;
}

.workloads-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workload-detail-card {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
}

.workload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.workload-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.workload-type {
  background: var(--color-secondary);
  color: var(--color-text);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.workload-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-heading);
}

.workload-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-indicator {
  width: 10px;
  height: 10px;
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

.workload-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.workload-section h4 {
  color: var(--color-heading);
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* History Section Styles */
.history-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.history-card h3 {
  color: var(--color-heading);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.loading-message,
.empty-message {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  font-style: italic;
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.history-group {
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.history-group:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
}

.group-entries {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-background-soft);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.history-entry:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.entry-marker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.seq-badge {
  background: var(--color-primary);
  color: white;
  min-width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0 0.5rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.ok {
  background: var(--color-success);
}

.status-dot.init {
  background: var(--color-info);
}

.status-dot.failed {
  background: var(--color-error);
}

.status-dot.degraded {
  background: var(--color-warning);
}

.entry-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.entry-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.state-label {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.state-label.ok {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.state-label.init {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.state-label.failed {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.state-label.degraded {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.timestamp {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.entry-message {
  font-size: 0.875rem;
  color: var(--color-text);
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: 4px;
  border-left: 3px solid var(--color-warning);
}

.workload-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.workload-type {
  background: var(--color-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.workload-name {
  font-weight: 500;
  color: var(--color-heading);
}

.history-state {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.history-state.ok {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.history-state.init {
  background: var(--color-info-bg);
  color: var(--color-info);
}

.history-state.failed {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.history-state.degraded {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.history-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.detail-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-item .label {
  font-weight: 500;
  color: var(--color-text-muted);
  min-width: 100px;
}

.detail-item .value {
  color: var(--color-text);
}
</style>
