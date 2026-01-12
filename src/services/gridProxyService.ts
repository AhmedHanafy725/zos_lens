import GridProxyClient from '@threefold/gridproxy_client';
import { UnifiedNodeStatus } from '@threefold/gridproxy_client';
import { networkConfigService } from './networkConfig';

export interface Node {
  nodeId: number;
  farmId: number;
  twinId: number;
  country: string;
  city: string;
  status: string;
  publicConfig?: {
    ipv4: string;
    ipv6: string;
    gw4: string;
    gw6: string;
    domain: string;
  };
}

export interface Farm {
  farmId: number;
  name: string;
  twinId: number;
  pricingPolicyId: number;
  certificationType: string;
  stellarAddress: string;
  publicIps: Array<{
    id: string;
    ip: string;
    farmId: number;
    contractId: number;
    gateway: string;
  }>;
}

class GridProxyService {
  private client: GridProxyClient | null = null;
  private currentUrl: string = '';

  private getClient(): GridProxyClient {
    const config = networkConfigService.getCurrentConfig();
    // Recreate client if URL changed or client doesn't exist
    if (!this.client || this.currentUrl !== config.gridProxyUrl) {
      this.client = new GridProxyClient(config.gridProxyUrl);
      this.currentUrl = config.gridProxyUrl;
    }
    return this.client;
  }

  resetClient(): void {
    this.client = null;
    this.currentUrl = '';
  }

  async getNodes(filters?: {
    nodeId?: number;
    farmId?: number;
    country?: string;
    city?: string;
    page?: number;
    size?: number;
  }): Promise<{ data: Node[]; count: number }> {
    try {
      const client = this.getClient();
      const response = await client.nodes.list({
        nodeId: filters?.nodeId,
        farmIds: filters?.farmId ? String(filters.farmId) : undefined,
        country: filters?.country,
        city: filters?.city,
        status: UnifiedNodeStatus.Up,
        page: filters?.page || 1,
        size: filters?.size || 50,
        retCount: true, // Request total count from GridProxy
      });
      
      // GridProxy returns paginated data with structure { data: [...], count: number }
      // Check if response has a data property (paginated response)
      if (response && typeof response === 'object' && 'data' in response && 'count' in response) {
        return {
          data: (response.data as Node[]) || [],
          count: (response.count as number) || 0
        };
      }
      
      // Fallback: if it's already an array
      if (Array.isArray(response)) {
        const nodes = response as Node[];
        return {
          data: nodes,
          count: nodes.length
        };
      }
      
      // Default: empty result
      return { data: [], count: 0 };
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      throw error;
    }
  }

  async getNodeById(nodeId: number): Promise<Node | null> {
    try {
      const client = this.getClient();
      const response = await client.nodes.byId(nodeId);
      return response as unknown as Node;
    } catch (error) {
      console.error(`Failed to fetch node ${nodeId}:`, error);
      return null;
    }
  }

  async getFarms(filters?: {
    name?: string;
    farmId?: number;
    page?: number;
    size?: number;
  }): Promise<Farm[]> {
    try {
      const client = this.getClient();
      const response = await client.farms.list({
        name: filters?.name,
        farmId: filters?.farmId,
        page: filters?.page || 1,
        size: filters?.size || 50,
      });
      
      // GridProxy returns paginated data with structure { data: [...], count: number }
      if (response && typeof response === 'object' && 'data' in response) {
        return (response.data as unknown as Farm[]) || [];
      }
      
      if (Array.isArray(response)) {
        return response as unknown as Farm[];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch farms:', error);
      throw error;
    }
  }

  async getFarmById(farmId: number): Promise<Farm | null> {
    try {
      const client = this.getClient();
      const response = await client.farms.list({
        farmId,
        page: 1,
        size: 1,
      });
      
      let farms: Farm[] = [];
      if (response && typeof response === 'object' && 'data' in response) {
        farms = (response.data as unknown as Farm[]) || [];
      } else if (Array.isArray(response)) {
        farms = response as unknown as Farm[];
      }
      
      return farms && farms.length > 0 ? farms[0]! : null;
    } catch (error) {
      console.error(`Failed to fetch farm ${farmId}:`, error);
      return null;
    }
  }

  async getNodesByFarmId(farmId: number): Promise<Node[]> {
    try {
      const client = this.getClient();
      const response = await client.nodes.list({
        farmIds: String(farmId),
        page: 1,
        size: 100,
      });
      
      // GridProxy returns paginated data with structure { data: [...], count: number }
      if (response && typeof response === 'object' && 'data' in response) {
        return (response.data as Node[]) || [];
      }
      
      if (Array.isArray(response)) {
        return response as Node[];
      }
      
      return [];
    } catch (error) {
      console.error(`Failed to fetch nodes for farm ${farmId}:`, error);
      throw error;
    }
  }
}

export const gridProxyService = new GridProxyService();
