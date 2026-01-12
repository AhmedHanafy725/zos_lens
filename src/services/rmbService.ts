import type { DeploymentListResponse, DeploymentDetailResponse, DeploymentHistoryResponse, Deployment, Workload } from '@/types/deployment';
import { networkConfigService } from './networkConfig';
import { gridClientService } from './gridClientService';

interface GridProxyDeployment {
  twinId: number;
  contractId: number;
  workloads: Array<{
    type: string;
    name: string;
    state?: string;
  }>;
}

// Helper function to safely cast workload type
function castWorkloadType(type: string): Workload['type'] {
  const validTypes: Workload['type'][] = ['zdb', 'network', 'zmachine', 'zmount', 'ip'];
  return validTypes.includes(type as Workload['type']) ? type as Workload['type'] : 'network';
}

// Helper function to safely cast workload state
function castWorkloadState(state: string): Workload['state'] {
  const validStates: Workload['state'][] = ['ok', 'failed', 'degraded'];
  return validStates.includes(state as Workload['state']) ? state as Workload['state'] : state;
}

class RMBService {
  private selectedNodeId: number | null = null;
  private selectedTwinId: number | null = null;
  private useMockData: boolean = false;
  private mnemonic: string = '';

  async initialize() {
    try {
      // Load selected node from storage
      const storedNodeId = localStorage.getItem('zos_lens_selected_node');
      const storedTwinId = localStorage.getItem('zos_lens_selected_twin');
      if (storedNodeId && storedTwinId) {
        this.selectedNodeId = parseInt(storedNodeId);
        this.selectedTwinId = parseInt(storedTwinId);
        this.useMockData = false;
      }
      
      // Load mnemonic from storage
      const storedMnemonic = localStorage.getItem('zos_lens_mnemonic');
      if (storedMnemonic) {
        this.mnemonic = storedMnemonic;
        
        // Initialize GridClient if we have a mnemonic
        try {
          await gridClientService.initialize(this.mnemonic);
        } catch (error) {
          console.error('Failed to initialize GridClient:', error);
        }
      }
      
      console.log('RMB service initialized');
      if (!this.mnemonic) {
        console.log('No mnemonic provided. Please configure mnemonic to make RMB calls.');
      } else if (!this.selectedNodeId) {
        console.log('No node selected. Please select a node to fetch deployments.');
      } else {
        console.log('Ready to fetch deployment data from node', this.selectedNodeId);
      }
    } catch (error) {
      console.error('Failed to initialize RMB service:', error);
      throw error;
    }
  }

  setMnemonic(mnemonic: string) {
    this.mnemonic = mnemonic;
    if (mnemonic) {
      localStorage.setItem('zos_lens_mnemonic', mnemonic);
      // Reinitialize GridClient with new mnemonic
      gridClientService.initialize(mnemonic).catch(error => {
        console.error('Failed to initialize GridClient with new mnemonic:', error);
      });
    } else {
      localStorage.removeItem('zos_lens_mnemonic');
      gridClientService.disconnect();
    }
  }

  getMnemonic(): string {
    return this.mnemonic;
  }

  hasMnemonic(): boolean {
    return this.mnemonic.length > 0;
  }

  setSelectedNode(nodeId: number | null, twinId: number | null = null) {
    this.selectedNodeId = nodeId;
    this.selectedTwinId = twinId;
    this.useMockData = nodeId === null;
    
    if (nodeId) {
      localStorage.setItem('zos_lens_selected_node', String(nodeId));
      if (twinId) {
        localStorage.setItem('zos_lens_selected_twin', String(twinId));
      }
    } else {
      localStorage.removeItem('zos_lens_selected_node');
      localStorage.removeItem('zos_lens_selected_twin');
    }
  }

  getSelectedNode(): number | null {
    return this.selectedNodeId;
  }

  getSelectedNodeId(): number | null {
    return this.selectedNodeId;
  }

  getSelectedTwinId(): number | null {
    return this.selectedTwinId;
  }

  async listDeployments(): Promise<DeploymentListResponse> {
    try {
      // Check if we have mnemonic and selected node
      if (!this.mnemonic) {
        console.warn('No mnemonic provided. Cannot fetch deployments via RMB.');
        return { deployments: [] };
      }

      if (!this.selectedTwinId) {
        console.warn('No twin selected. Cannot fetch deployments via RMB.');
        return { deployments: [] };
      }

      // Use GridClient to make RMB call (RMB uses twin ID)
      if (gridClientService.isClientConnected()) {
        const result = await gridClientService.getNodeDeployments(this.selectedTwinId);
        return result;
      } else {
        // Try to initialize GridClient if not connected
        console.log('Initializing RMB client...');
        await gridClientService.initialize(this.mnemonic);
        const result = await gridClientService.getNodeDeployments(this.selectedTwinId);
        return result;
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      return { deployments: [] };
    }
  }

  async getDeploymentDetail(twinId: number, contractId: number): Promise<DeploymentDetailResponse> {
    try {
      // Check if we have mnemonic and selected node
      if (!this.mnemonic) {
        throw new Error('Mnemonic is required to fetch deployment details');
      }

      if (!this.selectedTwinId) {
        throw new Error('No twin selected. Please select a node first.');
      }

      // Use GridClient to make RMB call (RMB uses twin ID)
      if (gridClientService.isClientConnected()) {
        const result = await gridClientService.getDeploymentDetail(this.selectedTwinId, twinId, contractId);
        return result;
      } else {
        // Try to initialize GridClient if not connected
        await gridClientService.initialize(this.mnemonic);
        const result = await gridClientService.getDeploymentDetail(this.selectedTwinId, twinId, contractId);
        return result;
      }
    } catch (error) {
      console.error('Failed to fetch deployment detail:', error);
      throw error;
    }
  }

  async getDeploymentHistory(twinId: number, contractId: number): Promise<DeploymentHistoryResponse> {
    try {
      // Check if we have mnemonic and selected node
      if (!this.mnemonic) {
        throw new Error('Mnemonic is required to fetch deployment history');
      }

      if (!this.selectedTwinId) {
        throw new Error('No twin selected. Please select a node first.');
      }

      // Use GridClient to make RMB call (RMB uses twin ID)
      if (gridClientService.isClientConnected()) {
        const result = await gridClientService.getDeploymentHistory(this.selectedTwinId, twinId, contractId);
        return result;
      } else {
        // Try to initialize GridClient if not connected
        await gridClientService.initialize(this.mnemonic);
        const result = await gridClientService.getDeploymentHistory(this.selectedTwinId, twinId, contractId);
        return result;
      }
    } catch (error) {
      console.error('Failed to fetch deployment history:', error);
      throw error;
    }
  }

  isUsingMockData(): boolean {
    return this.useMockData;
  }

  // New method to get all deployments across the network
  async getAllDeployments(): Promise<DeploymentListResponse> {
    try {
      const config = networkConfigService.getCurrentConfig();
      const response = await fetch(`${config.gridProxyUrl}/deployments?size=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch all deployments: ${response.statusText}`);
      }

      const data = await response.json() as GridProxyDeployment[];
      
      const deployments: Deployment[] = data.map((dep: GridProxyDeployment): Deployment => ({
        twin_id: dep.twinId,
        contract_id: dep.contractId,
        workloads: dep.workloads.map((w): Workload => ({
          type: castWorkloadType(w.type),
          name: w.name,
          state: castWorkloadState(w.state || 'unknown')
        }))
      }));

      return { deployments };
    } catch (error) {
      console.error('Failed to fetch all deployments:', error);
      return { deployments: [] };
    }
  }

  // New method to get deployments by twin ID
  async getDeploymentsByTwinId(twinId: number): Promise<DeploymentListResponse> {
    try {
      const config = networkConfigService.getCurrentConfig();
      const response = await fetch(`${config.gridProxyUrl}/deployments?twinId=${twinId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deployments for twin ${twinId}: ${response.statusText}`);
      }

      const data = await response.json() as GridProxyDeployment[];
      
      const deployments: Deployment[] = data.map((dep: GridProxyDeployment): Deployment => ({
        twin_id: dep.twinId,
        contract_id: dep.contractId,
        workloads: dep.workloads.map((w): Workload => ({
          type: castWorkloadType(w.type),
          name: w.name,
          state: castWorkloadState(w.state || 'unknown')
        }))
      }));

      return { deployments };
    } catch (error) {
      console.error(`Failed to fetch deployments for twin ${twinId}:`, error);
      return { deployments: [] };
    }
  }
}

export const rmbService = new RMBService();
