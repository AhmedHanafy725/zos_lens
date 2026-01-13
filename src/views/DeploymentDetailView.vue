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
        <div class="card-header">
          <h3>General Information</h3>
          <button 
            @click="toggleHealthChecks" 
            class="health-btn"
            :disabled="loadingHealth"
          >
            <span v-if="loadingHealth">Loading Health...</span>
            <span v-else>{{ healthVisible ? 'Hide Health' : 'Show Health' }}</span>
          </button>
        </div>
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

      <!-- Deployment Health Section -->
      <div v-if="healthVisible" class="health-card">
        <h3>Deployment Health</h3>
        
        <div v-if="loadingHealth" class="loading-message">
          Loading health checks...
        </div>
        
        <div v-else-if="healthError" 
             class="error-message"
             :class="{ 'unauthorized-error': healthError.toLowerCase().includes('unauthorized') }">
          {{ healthError }}
        </div>
        
        <div v-else-if="healthData" class="health-content">
          <div 
            v-for="workload in healthData.workloads" 
            :key="workload.workload_id"
            class="workload-health-card"
            :class="workload.status"
          >
            <div class="workload-health-header">
              <div class="workload-health-title">
                <span class="workload-type">{{ workload.type.toUpperCase() }}</span>
                <span class="workload-name">{{ workload.name }}</span>
              </div>
              <span class="health-status" :class="workload.status">
                {{ workload.status }}
              </span>
            </div>
            
            <div class="health-checks">
              <div 
                v-for="(check, index) in workload.checks" 
                :key="index"
                class="health-check"
                :class="{ ok: check.ok, failed: !check.ok }"
              >
                <div class="check-header">
                  <span class="check-icon" :class="{ ok: check.ok, failed: !check.ok }">
                    {{ check.ok ? '✓' : '✗' }}
                  </span>
                  <span class="check-name">{{ check.name }}</span>
                </div>
                <div class="check-message">{{ check.message }}</div>
                <div v-if="check.evidence && Object.keys(check.evidence).length > 0" class="check-evidence">
                  <JsonFormatter :data="check.evidence" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Workload Summary Statistics -->
      <div v-if="history.length > 0" class="history-summary-card">
        <h3>Workload Status Summary</h3>
        <div class="history-summary">
          <div class="summary-item total">
            <span class="summary-label">Total Workloads</span>
            <span class="summary-value">{{ historySummary.total }}</span>
          </div>
          <div class="summary-item init">
            <span class="summary-label">Init</span>
            <span class="summary-value">{{ historySummary.init }}</span>
          </div>
          <div class="summary-item ok">
            <span class="summary-label">OK</span>
            <span class="summary-value">{{ historySummary.ok }}</span>
          </div>
          <div class="summary-item error">
            <span class="summary-label">Error</span>
            <span class="summary-value">{{ historySummary.error }}</span>
          </div>
          <div v-if="historySummary.other > 0" class="summary-item other">
            <span class="summary-label">Other</span>
            <span class="summary-value">{{ historySummary.other }}</span>
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
              <div class="workload-actions">
                <button 
                  @click="toggleWorkloadInfo(workload.name)" 
                  class="info-btn"
                  :disabled="loadingWorkloadInfo[workload.name]"
                >
                  {{ workloadInfoVisible[workload.name] ? 'Hide Info' : 'Show Info' }}
                </button>
                <div class="workload-status" :class="workload.result.state">
                  <span class="status-indicator" :class="workload.result.state"></span>
                  {{ workload.result.state }}
                </div>
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
                    <span class="result-state-badge" :class="workload.result.state.toLowerCase()">
                      {{ workload.result.state }}
                    </span>
                  </div>
                  <div v-if="workload.result.message" class="result-message-item" :class="workload.result.state.toLowerCase()">
                    <span class="label">Message:</span>
                    <div class="result-message">{{ workload.result.message }}</div>
                  </div>
                  <div v-if="workload.result.data" class="info-item">
                    <span class="label">Data:</span>
                    <JsonFormatter :data="workload.result.data" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Workload Info Section -->
            <div v-if="workloadInfoVisible[workload.name]" class="workload-info-section">
              <div v-if="loadingWorkloadInfo[workload.name]" class="loading-message">
                Loading workload info...
              </div>
              
              <div v-else-if="workloadInfoErrors[workload.name]" 
                   class="error-message"
                   :class="{ 'unauthorized-error': workloadInfoErrors[workload.name]?.toLowerCase().includes('unauthorized') }">
                {{ workloadInfoErrors[workload.name] }}
              </div>
              
              <div v-else-if="workloadInfoData[workload.name]" class="workload-info-content">
                <div class="workload-section">
                  <h4>Workload Information</h4>
                  <JsonFormatter :data="workloadInfoData[workload.name]?.info || {}" />
                </div>
                
                <div v-if="workloadInfoData[workload.name]?.logs" class="workload-section">
                  <h4>Logs</h4>
                  <pre class="workload-logs">{{ cleanLogs(workloadInfoData[workload.name]?.logs || '') }}</pre>
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
        
        <div v-else-if="historyError" 
             class="error-message"
             :class="{ 'unauthorized-error': historyError.toLowerCase().includes('unauthorized') }">
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
                  <span class="seq-badge">{{ entry.sequentialIndex }}</span>
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
import type { DeploymentDetail, DeploymentHistoryEntry, WorkloadInfoResponse, DeploymentHealthResponse } from '@/types/deployment';

interface Props {
  twinId: string;
  contractId: string;
}

interface GroupedHistory {
  name: string;
  type: string;
  entries: (DeploymentHistoryEntry & { sequentialIndex: number })[];
  latestState: string;
}

const props = defineProps<Props>();
const router = useRouter();
const deployment = ref<DeploymentDetail | null>(null);
const history = ref<DeploymentHistoryEntry[]>([]);
const loading = ref(false);
const loadingHistory = ref(false);
const workloadInfoVisible = ref<Record<string, boolean>>({});
const loadingWorkloadInfo = ref<Record<string, boolean>>({});
const workloadInfoData = ref<Record<string, WorkloadInfoResponse>>({});
const workloadInfoErrors = ref<Record<string, string>>({});
const error = ref<string | null>(null);
const historyError = ref<string | null>(null);
const healthVisible = ref(false);
const loadingHealth = ref(false);
const healthData = ref<DeploymentHealthResponse | null>(null);
const healthError = ref<string | null>(null);

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
  
  // Convert to array and sort entries within each group by timestamp
  return Array.from(groups.entries())
    .map(([name, entries]) => {
      // Sort by timestamp (created field)
      const sortedEntries = entries.sort((a, b) => a.created - b.created);
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      
      if (!firstEntry || !lastEntry) {
        return null;
      }
      
      // Add sequential index to each entry
      const entriesWithIndex = sortedEntries.map((entry, index) => ({
        ...entry,
        sequentialIndex: index + 1
      }));
      
      return {
        name,
        type: firstEntry.type,
        entries: entriesWithIndex,
        latestState: lastEntry.state
      };
    })
    .filter((group): group is GroupedHistory => group !== null)
    .sort((a, b) => {
      const aFirst = a.entries[0];
      const bFirst = b.entries[0];
      return (aFirst?.created || 0) - (bFirst?.created || 0);
    });
});

// Calculate summary statistics for workload states
const historySummary = computed(() => {
  const summary = {
    total: 0,
    ok: 0,
    init: 0,
    error: 0,
    other: 0
  };
  
  // Count the latest state of each workload
  for (const group of groupedHistory.value) {
    summary.total++;
    const state = group.latestState.toLowerCase();
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
  
  return summary;
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

const toggleWorkloadInfo = async (workloadName: string) => {
  // Toggle visibility
  if (workloadInfoVisible.value[workloadName]) {
    workloadInfoVisible.value[workloadName] = false;
    return;
  }

  // If not already loaded, fetch the info
  if (!workloadInfoData.value[workloadName]) {
    await fetchWorkloadInfo(workloadName);
  }

  workloadInfoVisible.value[workloadName] = true;
};

const fetchWorkloadInfo = async (workloadName: string) => {
  loadingWorkloadInfo.value[workloadName] = true;
  workloadInfoErrors.value[workloadName] = '';

  try {
    const info = await rmbService.getWorkloadInfo(
      parseInt(props.twinId),
      parseInt(props.contractId),
      workloadName
    );

    workloadInfoData.value[workloadName] = info;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load workload info';
    workloadInfoErrors.value[workloadName] = errorMessage;
    console.error('Error loading workload info:', err);
  } finally {
    loadingWorkloadInfo.value[workloadName] = false;
  }
};

const cleanLogs = (logs: string): string => {
  if (!logs) return '';
  
  // Simply remove all null bytes
  const cleaned = logs.replace(/\x00/g, '');
  
  return cleaned.trim();
};

const toggleHealthChecks = async () => {
  // Toggle visibility
  if (healthVisible.value) {
    healthVisible.value = false;
    return;
  }

  // If not already loaded, fetch the health data
  if (!healthData.value) {
    await fetchDeploymentHealth();
  }

  healthVisible.value = true;
};

const fetchDeploymentHealth = async () => {
  loadingHealth.value = true;
  healthError.value = null;

  try {
    const health = await rmbService.getDeploymentHealth(
      parseInt(props.twinId),
      parseInt(props.contractId)
    );

    healthData.value = health;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load deployment health';
    healthError.value = errorMessage;
    console.error('Error loading deployment health:', err);
  } finally {
    loadingHealth.value = false;
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

.deployment-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.deployment-info-card,
.deployment-metadata-card,
.deployment-signature-card,
.workloads-card,
.history-summary-card,
.health-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.health-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.health-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.health-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.deployment-info-card h3,
.deployment-metadata-card h3,
.deployment-signature-card h3,
.workloads-card h3,
.history-summary-card h3 {
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

.workload-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.info-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.info-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.status-indicator.error {
  background: var(--color-error);
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

.result-state-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-block;
  width: fit-content;
}

.result-state-badge.ok {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.result-state-badge.init {
  background: var(--color-info-bg);
  color: var(--color-info);
  border: 1px solid var(--color-info);
}

.result-state-badge.error {
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

.result-message-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.result-message-item .label {
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 0.875rem;
}

.result-message {
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: 4px;
  border-left: 3px solid var(--color-error);
  color: var(--color-text);
}

.result-message-item.error .result-message {
  background: var(--color-error-bg);
  color: var(--color-error);
  border-left-color: #f85149;
}

.workload-info-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.workload-info-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workload-logs {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1rem;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

/* Health Check Styles */
.health-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workload-health-card {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
}

.workload-health-card.healthy {
  border-left: 4px solid var(--color-success);
}

.workload-health-card.unhealthy {
  border-left: 4px solid var(--color-error);
}

.workload-health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.workload-health-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.health-status {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.health-status.healthy {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.health-status.unhealthy {
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

.health-checks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.health-check {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.75rem;
}

.health-check.ok {
  border-left: 3px solid var(--color-success);
}

.health-check.failed {
  border-left: 3px solid var(--color-error);
}

.check-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.check-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.check-icon.ok {
  background: var(--color-success);
  color: white;
}

.check-icon.failed {
  background: var(--color-error);
  color: white;
}

.check-name {
  font-weight: 600;
  color: var(--color-heading);
  font-size: 0.875rem;
}

.check-message {
  font-size: 0.875rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.check-evidence {
  font-size: 0.8rem;
  margin-top: 0.5rem;
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

.history-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-background-soft);
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

.status-dot.error {
  background: var(--color-error);
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

.state-label.error {
  background: var(--color-error-bg);
  color: var(--color-error);
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
  border-left: 3px solid var(--color-error);
}

.history-entry.error .entry-message {
  border-left-color: #f85149;
  background: var(--color-error-bg);
  color: var(--color-error);
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

.history-state.error {
  background: var(--color-error-bg);
  color: var(--color-error);
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
