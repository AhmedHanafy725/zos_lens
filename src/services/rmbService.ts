import type { DeploymentListResponse, DeploymentDetailResponse, Deployment, Workload } from '@/types/deployment';
import { networkConfigService } from './networkConfig';

interface GridProxyDeployment {
  twinId: number;
  contractId: number;
  workloads: Array<{
    type: string;
    name: string;
    state?: string;
  }>;
}

interface GridProxyDeploymentDetail {
  version?: number;
  twinId: number;
  contractId: number;
  metadata?: Record<string, unknown>;
  description?: string;
  expiration?: number;
  signatureRequirement?: {
    requests: Array<{ twin_id: number; required: boolean; weight: number }>;
    weight_required: number;
    signatures: Array<{ twin_id: number; signature: string; signature_type: string }>;
    signature_style: string;
  };
  workloads?: Array<{
    version?: number;
    name?: string;
    type?: string;
    data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    description?: string;
    created?: number;
    state?: string;
    message?: string;
    resultData?: unknown;
  }>;
}

// Helper function to safely cast workload type
function castWorkloadType(type: string): Workload['type'] {
  const validTypes: Workload['type'][] = ['zdb', 'network', 'zmachine', 'zmount'];
  return validTypes.includes(type as Workload['type']) ? type as Workload['type'] : 'network';
}

// Helper function to safely cast workload state
function castWorkloadState(state: string): Workload['state'] {
  const validStates: Workload['state'][] = ['ok', 'failed', 'degraded'];
  return validStates.includes(state as Workload['state']) ? state as Workload['state'] : state;
}

class RMBService {
  private selectedNodeId: number | null = null;
  private useMockData: boolean = false; // Default to real data

  async initialize() {
    try {
      // Load selected node from storage
      const storedNodeId = localStorage.getItem('zos_lens_selected_node');
      if (storedNodeId) {
        this.selectedNodeId = parseInt(storedNodeId);
        this.useMockData = false;
      }
      
      console.log('RMB service initialized');
      if (this.useMockData) {
        console.log('Using mock data. Select a node to fetch real deployment data.');
      } else {
        console.log('Fetching real deployment data from ThreeFold network');
      }
    } catch (error) {
      console.error('Failed to initialize RMB service:', error);
      throw error;
    }
  }

  setSelectedNode(nodeId: number | null) {
    this.selectedNodeId = nodeId;
    this.useMockData = nodeId === null;
    
    if (nodeId) {
      localStorage.setItem('zos_lens_selected_node', String(nodeId));
    } else {
      localStorage.removeItem('zos_lens_selected_node');
    }
  }

  getSelectedNode(): number | null {
    return this.selectedNodeId;
  }

  async listDeployments(): Promise<DeploymentListResponse> {
    try {
      // Always try to get real data first
      const config = networkConfigService.getCurrentConfig();
      
      // Fetch deployments from GridProxy
      const response = await fetch(`${config.gridProxyUrl}/deployments`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deployments: ${response.statusText}`);
      }

      const data = await response.json() as GridProxyDeployment[];
      
      // Transform the data to match our expected format
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
      console.error('Failed to fetch real deployments:', error);
      
      // Return empty result instead of mock data for real mode
      if (!this.useMockData) {
        return { deployments: [] };
      }
      
      throw error;
    }
  }

  async getDeploymentDetail(twinId: number, contractId: number): Promise<DeploymentDetailResponse> {
    try {
      // Always try to get real data first
      const config = networkConfigService.getCurrentConfig();
      
      // Fetch deployment detail from GridProxy
      const response = await fetch(`${config.gridProxyUrl}/deployments/${twinId}/${contractId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deployment detail: ${response.statusText}`);
      }

      const data = await response.json() as GridProxyDeploymentDetail;
      
      // Transform the data to match our expected format
      const deployment = {
        version: data.version || 0,
        twin_id: data.twinId,
        contract_id: data.contractId,
        metadata: JSON.stringify(data.metadata || {}),
        description: data.description || '',
        expiration: data.expiration || 0,
        signature_requirement: data.signatureRequirement || {
          requests: [{ twin_id: twinId, required: false, weight: 1 }],
          weight_required: 1,
          signatures: [],
          signature_style: ''
        },
        workloads: (data.workloads || []).map((w) => ({
          version: w.version || 0,
          name: w.name || '',
          type: w.type || '',
          data: w.data || {},
          metadata: JSON.stringify(w.metadata || {}),
          description: w.description || '',
          result: {
            created: w.created || Math.floor(Date.now() / 1000),
            state: w.state || 'unknown',
            message: w.message || '',
            data: w.resultData || null
          }
        }))
      };

      return { deployment };
    } catch (error) {
      console.error('Failed to fetch real deployment detail:', error);
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
