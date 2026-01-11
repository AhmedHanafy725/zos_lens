import GridProxyClient from '@threefold/gridproxy_client';
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

  private getClient(): GridProxyClient {
    const config = networkConfigService.getCurrentConfig();
    if (!this.client) {
      this.client = new GridProxyClient(config.gridProxyUrl);
    }
    return this.client;
  }

  resetClient(): void {
    this.client = null;
  }

  async getNodes(filters?: {
    farmId?: number;
    country?: string;
    city?: string;
    page?: number;
    size?: number;
  }): Promise<Node[]> {
    try {
      const client = this.getClient();
      const response = await client.nodes.list({
        farmIds: filters?.farmId ? String(filters.farmId) : undefined,
        country: filters?.country,
        city: filters?.city,
        page: filters?.page || 1,
        size: filters?.size || 50,
      });
      // GridProxy returns paginated data
      return (response as unknown as Node[]) || [];
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
      // GridProxy returns paginated data
      return (response as unknown as Farm[]) || [];
    } catch (error) {
      console.error('Failed to fetch farms:', error);
      throw error;
    }
  }

  async getFarmById(farmId: number): Promise<Farm | null> {
    try {
      const client = this.getClient();
      // Use list with farmId filter since byId might not exist
      const response = await client.farms.list({
        farmId,
        page: 1,
        size: 1,
      });
      const farms = response as unknown as Farm[];
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
      return (response as unknown as Node[]) || [];
    } catch (error) {
      console.error(`Failed to fetch nodes for farm ${farmId}:`, error);
      return [];
    }
  }
}

export const gridProxyService = new GridProxyService();
