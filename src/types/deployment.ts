export interface Workload {
  type: 'zdb' | 'network' | 'zmachine' | 'zmount' | 'ip';
  name: string;
  state: 'ok' | 'failed' | 'degraded' | string;
}

export interface Deployment {
  twin_id: number;
  contract_id: number;
  workloads: Workload[];
}

export interface DeploymentListResponse {
  deployments: Deployment[];
}

export interface SignatureRequirement {
  requests: Array<{
    twin_id: number;
    required: boolean;
    weight: number;
  }>;
  weight_required: number;
  signatures: Array<{
    twin_id: number;
    signature: string;
    signature_type: string;
  }>;
  signature_style: string;
}

export interface WorkloadData {
  [key: string]: unknown;
}

export interface WorkloadDetail {
  version: number;
  name: string;
  type: string;
  data: WorkloadData;
  metadata: string;
  description: string;
  result: {
    created: number;
    state: string;
    message: string;
    data: unknown;
  };
}

export interface DeploymentDetail {
  version: number;
  twin_id: number;
  contract_id: number;
  metadata: string;
  description: string;
  expiration: number;
  signature_requirement: SignatureRequirement;
  workloads: WorkloadDetail[];
}

export interface DeploymentDetailResponse {
  deployment: DeploymentDetail;
}

export interface DeploymentHistoryEntry {
  seq: number;
  type: string;
  name: string;
  created: number;
  state: string;
  message: string;
}

export interface DeploymentHistoryResponse {
  deployment: string;
  history: DeploymentHistoryEntry[];
}
