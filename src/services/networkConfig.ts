export enum NetworkEnv {
  dev = 'dev',
  test = 'test',
  qa = 'qa',
  main = 'main',
}

export interface NetworkConfig {
  name: string;
  gridProxyUrl: string;
  graphqlUrl: string;
  substrateUrl: string;
  relayUrl: string;
  activationServiceUrl: string;
}

export const NETWORK_CONFIGS: Record<NetworkEnv, NetworkConfig> = {
  [NetworkEnv.dev]: {
    name: 'Devnet',
    gridProxyUrl: 'https://gridproxy.dev.grid.tf',
    graphqlUrl: 'https://graphql.dev.grid.tf/graphql',
    substrateUrl: 'wss://tfchain.dev.grid.tf',
    relayUrl: 'wss://relay.dev.grid.tf',
    activationServiceUrl: 'https://activation.dev.grid.tf/activation/activate',
  },
  [NetworkEnv.test]: {
    name: 'Testnet',
    gridProxyUrl: 'https://gridproxy.test.grid.tf',
    graphqlUrl: 'https://graphql.test.grid.tf/graphql',
    substrateUrl: 'wss://tfchain.test.grid.tf',
    relayUrl: 'wss://relay.test.grid.tf',
    activationServiceUrl: 'https://activation.test.grid.tf/activation/activate',
  },
  [NetworkEnv.qa]: {
    name: 'QAnet',
    gridProxyUrl: 'https://gridproxy.qa.grid.tf',
    graphqlUrl: 'https://graphql.qa.grid.tf/graphql',
    substrateUrl: 'wss://tfchain.qa.grid.tf',
    relayUrl: 'wss://relay.qa.grid.tf',
    activationServiceUrl: 'https://activation.qa.grid.tf/activation/activate',
  },
  [NetworkEnv.main]: {
    name: 'Mainnet',
    gridProxyUrl: 'https://gridproxy.grid.tf',
    graphqlUrl: 'https://graphql.grid.tf/graphql',
    substrateUrl: 'wss://tfchain.grid.tf',
    relayUrl: 'wss://relay.grid.tf',
    activationServiceUrl: 'https://activation.grid.tf/activation/activate',
  },
};

class NetworkConfigService {
  private currentNetwork: NetworkEnv = NetworkEnv.main;

  getCurrentNetwork(): NetworkEnv {
    return this.currentNetwork;
  }

  setCurrentNetwork(network: NetworkEnv): void {
    this.currentNetwork = network;
    localStorage.setItem('zos_lens_network', network);
  }

  getCurrentConfig(): NetworkConfig {
    return NETWORK_CONFIGS[this.currentNetwork];
  }

  getAllNetworks(): Array<{ value: NetworkEnv; label: string }> {
    return Object.entries(NETWORK_CONFIGS).map(([key, config]) => ({
      value: key as NetworkEnv,
      label: config.name,
    }));
  }

  loadFromStorage(): void {
    const stored = localStorage.getItem('zos_lens_network');
    if (stored && Object.values(NetworkEnv).includes(stored as NetworkEnv)) {
      this.currentNetwork = stored as NetworkEnv;
    }
  }
}

export const networkConfigService = new NetworkConfigService();
networkConfigService.loadFromStorage();
