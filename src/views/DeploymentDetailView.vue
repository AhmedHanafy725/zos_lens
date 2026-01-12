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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { rmbService } from '@/services/rmbService';
import JsonFormatter from '@/components/JsonFormatter.vue';
import type { DeploymentDetail } from '@/types/deployment';

interface Props {
  twinId: string;
  contractId: string;
}

const props = defineProps<Props>();
const router = useRouter();
const deployment = ref<DeploymentDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

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
</style>
