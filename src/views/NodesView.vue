<template>
  <div class="nodes-view">
    <div class="header">
      <h2>Available Nodes</h2>
      <p class="subtitle">Select a node to view its deployments</p>
    </div>

    <div class="filters">
      <div class="filter-group">
        <label for="node-id-filter">Node ID:</label>
        <input 
          id="node-id-filter"
          v-model.number="filters.nodeId"
          type="number"
          placeholder="Filter by node ID"
          @input="loadNodes"
        />
      </div>
      <div class="filter-group">
        <label for="country-filter">Country:</label>
        <input 
          id="country-filter"
          v-model="filters.country"
          type="text"
          placeholder="Filter by country"
          @input="loadNodes"
        />
      </div>
      <div class="filter-group">
        <label for="city-filter">City:</label>
        <input 
          id="city-filter"
          v-model="filters.city"
          type="text"
          placeholder="Filter by city"
          @input="loadNodes"
        />
      </div>
      <div class="filter-group">
        <label for="farm-filter">Farm ID:</label>
        <input 
          id="farm-filter"
          v-model.number="filters.farmId"
          type="number"
          placeholder="Filter by farm ID"
          @input="loadNodes"
        />
      </div>
      <button @click="clearFilters" class="btn btn-secondary">Clear Filters</button>
    </div>

    <div v-if="loading" class="loading">
      <p>Loading nodes...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadNodes" class="btn btn-primary">Retry</button>
    </div>

    <div v-else-if="nodes.length === 0" class="empty">
      <p>No nodes found with the current filters.</p>
    </div>

    <div v-else>
      <div class="results-info">
        <p>Showing {{ nodes.length }} of {{ totalCount }} nodes (Page {{ currentPage }} of {{ totalPages }})</p>
      </div>

      <div class="nodes-grid">
        <div 
          v-for="node in nodes" 
          :key="node.nodeId"
          class="node-card"
          @click="selectNode(node)"
        >
          <div class="node-header">
            <h3>Node {{ node.nodeId }}</h3>
            <span class="status-badge" :class="node.status">{{ node.status }}</span>
          </div>
          <div class="node-info">
            <div class="info-item">
              <span class="label">Farm ID:</span>
              <span class="value">{{ node.farmId }}</span>
            </div>
            <div class="info-item">
              <span class="label">Twin ID:</span>
              <span class="value">{{ node.twinId }}</span>
            </div>
            <div class="info-item">
              <span class="label">Location:</span>
              <span class="value">{{ node.city }}, {{ node.country }}</span>
            </div>
            <div v-if="node.publicConfig" class="info-item">
              <span class="label">Public IP:</span>
              <span class="value">{{ node.publicConfig.ipv4 || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination">
        <button 
          @click="previousPage" 
          :disabled="currentPage === 1 || loading"
          class="btn btn-secondary"
        >
          Previous
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages || loading"
          class="btn btn-secondary"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { gridProxyService, type Node } from '@/services/gridProxyService';
import { rmbService } from '@/services/rmbService';

const router = useRouter();
const nodes = ref<Node[]>([]);
const loading = ref(false);
const error = ref('');

const filters = ref({
  nodeId: undefined as number | undefined,
  country: '',
  city: '',
  farmId: undefined as number | undefined,
});

const currentPage = ref(1);
const pageSize = ref(50);
const totalCount = ref(0);
const totalPages = ref(0);

const loadNodes = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const result = await gridProxyService.getNodes({
      nodeId: filters.value.nodeId,
      country: filters.value.country || undefined,
      city: filters.value.city || undefined,
      farmId: filters.value.farmId,
      page: currentPage.value,
      size: pageSize.value,
    });
    
    // Nodes are already filtered by status=up at the API level
    nodes.value = result.data;
    totalCount.value = result.count;
    totalPages.value = Math.ceil(result.count / pageSize.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load nodes';
    console.error('Failed to load nodes:', err);
  } finally {
    loading.value = false;
  }
};

const clearFilters = () => {
  filters.value = {
    nodeId: undefined,
    country: '',
    city: '',
    farmId: undefined,
  };
  currentPage.value = 1;
  loadNodes();
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadNodes();
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadNodes();
  }
};

const selectNode = (node: Node) => {
  // Set the selected node in RMB service (use twinId for RMB calls)
  rmbService.setSelectedNode(node.twinId);
  
  // Navigate to deployments view
  router.push('/deployments');
};

onMounted(() => {
  loadNodes();
});
</script>

<style scoped>
.nodes-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
}

.header h2 {
  margin: 0 0 8px 0;
  color: var(--color-heading);
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.filter-group input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
  min-width: 200px;
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

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-secondary);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-secondary-hover);
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-error);
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.node-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.node-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--color-border);
}

.node-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--color-heading);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.up {
  background: var(--color-success);
  color: white;
}

.status-badge.down {
  background: var(--color-error);
  color: white;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 14px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.info-item .value {
  font-size: 14px;
  color: var(--color-text);
  font-family: monospace;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 20px;
  margin-top: 20px;
}

.pagination .page-info {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}

.pagination .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results-info {
  text-align: center;
  padding: 10px;
  margin-bottom: 20px;
  color: var(--color-text-muted);
  font-size: 14px;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group input {
    min-width: 100%;
  }
  
  .nodes-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
