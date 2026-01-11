import type { DeploymentListResponse, DeploymentDetailResponse } from '@/types/deployment';

// Mock data for demonstration purposes
const MOCK_DEPLOYMENTS: DeploymentListResponse = {
  deployments: [
    {
      twin_id: 41,
      contract_id: 257069,
      workloads: [{ type: 'zdb', name: 'zdbvmproject0', state: 'ok' }]
    },
    {
      twin_id: 89,
      contract_id: 252974,
      workloads: [{ type: 'network', name: 'nwtu91y', state: 'ok' }]
    },
    {
      twin_id: 89,
      contract_id: 252975,
      workloads: [{ type: 'zmachine', name: 'vmk21f2', state: 'ok' }]
    },
    {
      twin_id: 192,
      contract_id: 248280,
      workloads: [{ type: 'network', name: 'chainnetwork', state: 'ok' }]
    },
    {
      twin_id: 192,
      contract_id: 248281,
      workloads: [{ type: 'zmachine', name: 'chain', state: 'ok' }]
    },
  ]
};

class RMBService {
  private useMockData: boolean = true;

  async initialize() {
    try {
      // For now, we'll use mock data
      // To use real data, you'll need to configure the GridClient with proper credentials
      console.log('RMB service initialized (using mock data)');
      console.log('To use real data, configure your mnemonic and node ID in the settings');
    } catch (error) {
      console.error('Failed to initialize RMB service:', error);
      throw error;
    }
  }

  async listDeployments(): Promise<DeploymentListResponse> {
    try {
      if (this.useMockData) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_DEPLOYMENTS;
      }

      // Real implementation would go here
      // const response = await this.client.invoke('zos.debug.deployment.list', {});
      // return response as DeploymentListResponse;
      
      throw new Error('Real RMB connection not yet configured');
    } catch (error) {
      console.error('Failed to list deployments:', error);
      throw error;
    }
  }

  async getDeploymentDetail(twinId: number, contractId: number): Promise<DeploymentDetailResponse> {
    try {
      if (this.useMockData) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return mock deployment detail
        return {
          deployment: {
            version: 0,
            twin_id: twinId,
            contract_id: contractId,
            metadata: JSON.stringify({
              version: 3,
              type: 'network',
              name: 'example-network',
              projectName: 'example-project'
            }),
            description: 'Example deployment',
            expiration: 0,
            signature_requirement: {
              requests: [{ twin_id: twinId, required: false, weight: 1 }],
              weight_required: 1,
              signatures: [
                {
                  twin_id: twinId,
                  signature: '82b6ec4453166a79e860e50b4b18aa9e9daab8125da8ba5648bc67854fc60d63bb31f305117d19d0f0209dfaed2c0aabecf5a42c7d03ea681b468d72c729d988',
                  signature_type: 'sr25519'
                }
              ],
              signature_style: ''
            },
            workloads: [
              {
                version: 0,
                name: 'example-workload',
                type: 'network',
                data: {
                  ip_range: '10.20.0.0/16',
                  subnet: '10.20.2.0/24',
                },
                metadata: JSON.stringify({
                  version: 3,
                  user_accesses: []
                }),
                description: 'Example workload',
                result: {
                  created: Math.floor(Date.now() / 1000),
                  state: 'ok',
                  message: '',
                  data: null
                }
              }
            ]
          }
        };
      }

      // Real implementation would go here
      // const deployment = `${twinId}:${contractId}`;
      // const response = await this.client.invoke('zos.debug.deployment.get', { deployment });
      // return response as DeploymentDetailResponse;
      
      throw new Error('Real RMB connection not yet configured');
    } catch (error) {
      console.error('Failed to get deployment detail:', error);
      throw error;
    }
  }

  setUseMockData(useMock: boolean) {
    this.useMockData = useMock;
  }
}

export const rmbService = new RMBService();
