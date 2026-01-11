import { Client } from '@threefold/rmb_direct_client';
import { networkConfigService } from './networkConfig';
import type { DeploymentListResponse, DeploymentDetailResponse, DeploymentDetail } from '@/types/deployment';

class GridClientService {
  private client: Client | null = null;
  private mnemonic: string = '';
  private isConnected: boolean = false;

  async initialize(mnemonic: string) {
    if (!mnemonic) {
      throw new Error('Mnemonic is required to initialize RMB Client');
    }

    this.mnemonic = mnemonic;
    
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
      
      console.log('RMB Client connected successfully');
    } catch (error) {
      console.error('Failed to initialize RMB Client:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        this.client.disconnect();
        this.isConnected = false;
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
      const client = this.getClient();
      
      // Use RMB to call zos.debug.deployment.list on the specific node
      const result = await client.send('zos.debug.deployment.list', '', nodeId, 30);
      
      if (!result || typeof result === 'string') {
        return { deployments: [] };
      }

      // Transform the response to match our format
      const deployments = Array.isArray(result) ? result : [];
      
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
              type: w.type as 'zdb' | 'network' | 'zmachine' | 'zmount',
              name: w.name,
              state: w.state as 'ok' | 'failed' | 'degraded' | string
            }))
          };
        })
      };
    } catch (error) {
      console.error('Failed to get node deployments:', error);
      throw error;
    }
  }

  async getDeploymentDetail(nodeId: number, twinId: number, contractId: number): Promise<DeploymentDetailResponse> {
    try {
      const client = this.getClient();
      
      // Use RMB to call zos.debug.deployment.get on the specific node
      const deployment = `${twinId}:${contractId}`;
      const result = await client.send(
        'zos.debug.deployment.get', 
        JSON.stringify({ deployment }), 
        nodeId, 
        30
      );
      
      if (!result || typeof result === 'string') {
        throw new Error('No valid response from node');
      }

      return {
        deployment: result as DeploymentDetail
      };
    } catch (error) {
      console.error('Failed to get deployment detail:', error);
      throw error;
    }
  }

  async resetClient() {
    await this.disconnect();
    this.client = null;
    this.isConnected = false;
  }
}

export const gridClientService = new GridClientService();
