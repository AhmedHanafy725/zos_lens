import { Client } from '@threefold/rmb_direct_client';
import { networkConfigService } from './networkConfig';
import { RMBWrapper } from './rmbWrapper';
import type { DeploymentListResponse, DeploymentDetailResponse, DeploymentDetail, DeploymentHistoryResponse, WorkloadInfoResponse, DeploymentHealthResponse } from '@/types/deployment';

class GridClientService {
  private client: Client | null = null;
  private rmbWrapper: RMBWrapper | null = null;
  private mnemonic: string = '';
  private isConnected: boolean = false;

  async initialize(mnemonic: string) {
    if (!mnemonic) {
      throw new Error('Mnemonic is required to initialize RMB Client');
    }

    this.mnemonic = mnemonic.trim();
    
    try {
      const config = networkConfigService.getCurrentConfig();
      
      // Initialize RMB Direct Client with all required parameters
      // Client(chainUrl, relayUrl, mnemonics, session, keypairType, retries)
      this.client = new Client(
        config.substrateUrl, 
        config.relayUrl, 
        this.mnemonic,
        'zos_lens_session',
        'sr25519',
        3
      );
      
      // Connect to the network
      await this.client.connect();
      this.isConnected = true;
      
      // Initialize RMB wrapper
      this.rmbWrapper = new RMBWrapper(this.client);
      
      console.log('RMB Client connected successfully');
    } catch (error) {
      console.error('Failed to initialize RMB Client:', error);
      this.isConnected = false;
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('invalid') && errorMsg.includes('mnemonic')) {
          throw new Error(`Mnemonic validation failed: The mnemonic phrase is not valid according to BIP39 standards. Please check:\n- Correct number of words (12 or 24)\n- No typos in words\n- Words are from the BIP39 wordlist\n- No extra spaces or special characters`);
        } else if (errorMsg.includes('twin') || errorMsg.includes('user')) {
          throw new Error(`No twin found: Your account doesn't exist on the ${networkConfigService.getCurrentNetwork()} network. Please:\n- Verify you're on the correct network\n- Ensure your account has been activated on this network\n- Try a different network if needed`);
        } else if (errorMsg.includes('connect') || errorMsg.includes('network')) {
          throw new Error(`Network connection failed: ${error.message}\nPlease check your internet connection and try again.`);
        }
      }
      
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        this.client.disconnect();
        this.isConnected = false;
        this.rmbWrapper = null;
        this.client = null;
        console.log('RMB Client disconnected');
      } catch (error) {
        console.error('Failed to disconnect RMB Client:', error);
      }
    }
  }

  getClient(): Client {
    if (!this.client || !this.isConnected) {
      throw new Error('RMB Client is not initialized or connected');
    }
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  async getNodeDeployments(nodeId: number): Promise<DeploymentListResponse> {
    try {
      if (!this.rmbWrapper) {
        throw new Error('RMB Wrapper is not initialized');
      }
      
      // Use RMB wrapper to call zos.debug.deployment.list on the specific node
      const result = await this.rmbWrapper.request('zos.debug.deployment.list', '', nodeId, 30);
      
      if (!result || typeof result === 'string') {
        return { deployments: [] };
      }

      // The RMB result can be in two formats:
      // 1. Direct: { deployments: [...] }
      // 2. Wrapped: { result: { deployments: [...] } }
      const response = result as { deployments?: unknown[]; result?: { deployments?: unknown[] } };
      const deployments = response.deployments || response.result?.deployments || [];

      // Transform the response to match our format
      return {
        deployments: deployments.map((dep: unknown) => {
          const deployment = dep as { 
            twin_id: number; 
            contract_id: number; 
            workloads: Array<{ type: string; name: string; state: string }> 
          };
          return {
            twin_id: deployment.twin_id,
            contract_id: deployment.contract_id,
            workloads: (deployment.workloads || []).map(w => ({
              type: w.type as 'zdb' | 'network' | 'zmachine' | 'zmount' | 'ip',
              name: w.name,
              state: w.state as 'ok' | 'failed' | 'degraded' | string
            }))
          };
        })
      };
    } catch (error) {
      console.error(`Failed to get deployments for node ${nodeId}:`, error);
      
      // Check for unauthorized errors
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied') || errorMessage.includes('forbidden')) {
        throw new Error('Unauthorized: Only admin users can list deployments on this node. This feature requires admin privileges.');
      }
      
      // For other errors, return empty array to maintain backward compatibility
      return { deployments: [] };
    }
  }

  async getDeploymentDetail(nodeId: number, twinId: number, contractId: number): Promise<DeploymentDetailResponse> {
    try {
      if (!this.rmbWrapper) {
        throw new Error('RMB Wrapper is not initialized');
      }
      
      // Use RMB wrapper to call zos.debug.deployment.get on the specific node
      const deployment = `${twinId}:${contractId}`;
      
      const result = await this.rmbWrapper.request(
        'zos.debug.deployment.get', 
        JSON.stringify({ deployment }), 
        nodeId, 
        30
      );
      
      if (!result || typeof result === 'string') {
        throw new Error('No valid response from node');
      }

      // Handle both direct and wrapped response formats
      const response = result as { deployment?: DeploymentDetail; result?: DeploymentDetail } | DeploymentDetail;
      
      // Check if result has a deployment or result property, otherwise use it directly
      let deploymentData: DeploymentDetail;
      if ('deployment' in response && response.deployment) {
        deploymentData = response.deployment;
      } else if ('result' in response && response.result) {
        deploymentData = response.result;
      } else {
        deploymentData = response as DeploymentDetail;
      }

      return {
        deployment: deploymentData
      };
    } catch (error) {
      console.error('Failed to get deployment detail:', error);
      throw error;
    }
  }

  async getDeploymentHistory(nodeId: number, twinId: number, contractId: number): Promise<DeploymentHistoryResponse> {
    try {
      if (!this.rmbWrapper) {
        throw new Error('RMB Wrapper is not initialized');
      }
      
      // Use RMB wrapper to call zos.debug.deployment.history on the specific node
      const deployment = `${twinId}:${contractId}`;
      
      const result = await this.rmbWrapper.request(
        'zos.debug.deployment.history', 
        JSON.stringify({ deployment }), 
        nodeId, 
        30
      );
      
      if (!result || typeof result === 'string') {
        throw new Error('No valid response from node');
      }

      // Handle both direct and wrapped response formats
      const response = result as DeploymentHistoryResponse | { result?: DeploymentHistoryResponse };
      
      // Check if result has a result property, otherwise use it directly
      if ('result' in response && response.result) {
        return response.result;
      }
      
      return response as DeploymentHistoryResponse;
    } catch (error) {
      console.error('Failed to get deployment history:', error);
      
      // Check for unauthorized errors
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied') || errorMessage.includes('forbidden')) {
        throw new Error('Unauthorized: Only admin users can access deployment history. This feature requires admin privileges on the node.');
      }
      
      throw error;
    }
  }

  async getWorkloadInfo(nodeId: number, twinId: number, contractId: number, workloadName: string): Promise<WorkloadInfoResponse> {
    try {
      if (!this.rmbWrapper) {
        throw new Error('RMB Wrapper is not initialized');
      }
      
      // Use RMB wrapper to call zos.debug.deployment.info on the specific node
      const deployment = `${twinId}:${contractId}`;
      
      const result = await this.rmbWrapper.request(
        'zos.debug.deployment.info', 
        JSON.stringify({ deployment, workload: workloadName, verbose: true }), 
        nodeId, 
        30
      );
      
      if (!result || typeof result === 'string') {
        throw new Error('No valid response from node');
      }

      // Handle both direct and wrapped response formats
      const response = result as WorkloadInfoResponse | { result?: WorkloadInfoResponse };
      
      // Check if result has a result property, otherwise use it directly
      if ('result' in response && response.result) {
        return response.result;
      }
      
      return response as WorkloadInfoResponse;
    } catch (error) {
      console.error('Failed to get workload info:', error);
      
      // Check for unauthorized errors
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied') || errorMessage.includes('forbidden')) {
        throw new Error('Unauthorized: Only admin users can access workload info. This feature requires admin privileges on the node.');
      }
      
      throw error;
    }
  }

  async getDeploymentHealth(nodeId: number, twinId: number, contractId: number): Promise<DeploymentHealthResponse> {
    try {
      if (!this.rmbWrapper) {
        throw new Error('RMB Wrapper is not initialized');
      }
      
      // Use RMB wrapper to call zos.debug.deployment.health on the specific node
      const deployment = `${twinId}:${contractId}`;
      
      const result = await this.rmbWrapper.request(
        'zos.debug.deployment.health', 
        JSON.stringify({ deployment }), 
        nodeId, 
        30
      );
      
      if (!result || typeof result === 'string') {
        throw new Error('No valid response from node');
      }

      // Handle both direct and wrapped response formats
      const response = result as DeploymentHealthResponse | { result?: DeploymentHealthResponse };
      
      // Check if result has a result property, otherwise use it directly
      if ('result' in response && response.result) {
        return response.result;
      }
      
      return response as DeploymentHealthResponse;
    } catch (error) {
      console.error('Failed to get deployment health:', error);
      
      // Check for unauthorized errors
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('unauthorized') || errorMessage.includes('permission denied') || errorMessage.includes('forbidden')) {
        throw new Error('Unauthorized: Only admin users can access deployment health. This feature requires admin privileges on the node.');
      }
      
      throw error;
    }
  }

  async resetClient() {
    await this.disconnect();
    this.client = null;
    this.rmbWrapper = null;
    this.isConnected = false;
  }
}

export const gridClientService = new GridClientService();
