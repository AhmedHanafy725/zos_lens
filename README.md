# ZOS Lens

A powerful web-based monitoring and debugging tool for ThreeFold Grid's Zero-OS nodes. ZOS Lens provides real-time insights into node deployments, workload health, and deployment history using RMB (Reliable Message Bus) communication.

## Features

### 🔍 Node Discovery & Monitoring
- Browse and search ThreeFold Grid nodes
- Filter nodes by status, farm, and location
- View detailed node information including:
  - Node ID, Twin ID, Farm details
  - Resource capacity (CPU, Memory, Storage)
  - Network connectivity status
  - Geographic location

### 📦 Deployment Management
- List all deployments on a selected node
- View comprehensive deployment statistics:
  - Total deployments and workloads
  - Workload state breakdown (Init, OK, Error, Other)
- Navigate to detailed deployment views
- Real-time deployment data via RMB

### 🔬 Deployment Details
- **General Information**: Twin ID, Contract ID, Version, Expiration
- **Workload Details**: Complete workload configuration and metadata
- **Workload Status Summary**: Visual breakdown of workload states
- **Signature Requirements**: View deployment signatures and requirements

### 📊 Deployment History
- Complete timeline of deployment state changes
- Grouped by workload with sequential numbering
- Detailed state transitions with timestamps
- Error messages and state information
- Visual timeline with color-coded states

### 🏥 Health Monitoring
- Real-time health checks for network and zmachine workloads
- Detailed health check results:
  - VM configuration validation
  - Process and service status
  - Network namespace verification
  - Disk and filesystem checks
  - Mycelium service monitoring
- Visual health status indicators (healthy/unhealthy)
- Individual check pass/fail status with evidence data

### 📝 Workload Information
- Detailed workload runtime information
- Resource usage (CPU, Memory, etc.)
- Console logs with null-byte filtering
- Support for zmachine and network workloads
- Expandable info sections per workload

### 🔐 Permission Handling
- Clear unauthorized error messages for non-admin users
- Visual distinction between permission errors and technical failures
- Lock icon indicators for permission-restricted features
- Informative messages explaining admin privilege requirements

## Admin-Only Features

The following features require **admin privileges** on the target node:

- 📋 **Deployment Listing** (`zos.debug.deployment.list`)
- � **Deployment Details** (`zos.debug.deployment.get`)
- �📖 **Deployment History** (`zos.debug.deployment.history`)
- ℹ️ **Workload Info** (`zos.debug.deployment.info`)
- 🏥 **Health Checks** (`zos.debug.deployment.health`)

Non-admin users will see clear, user-friendly error messages explaining the permission requirements.

## Technology Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS with CSS Variables for theming
- **Communication**: RMB Direct Client (@threefold/rmb_direct_client)
- **Grid Integration**: ThreeFold Grid Proxy API

## Project Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- A ThreeFold Grid mnemonic (for RMB access)

### Installation

```sh
npm install
# or
yarn install
```

### Development

```sh
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```sh
npm run build
# or
yarn build
```

### Type Checking

```sh
npm run type-check
# or
yarn type-check
```

### Linting

```sh
npm run lint
# or
yarn lint
```

## Configuration

### Network Selection
ZOS Lens supports multiple ThreeFold Grid networks:
- **Mainnet**: Production network
- **Testnet**: Testing network
- **Devnet**: Development network

Select your network from the sidebar.

### Mnemonic Setup
1. Open the sidebar
2. Enter your ThreeFold Grid mnemonic
3. The mnemonic is stored locally in your browser
4. Required for RMB communication with nodes

### Node Selection
1. Navigate to the Nodes page
2. Browse or search for nodes
3. Click "View Deployments" to select a node
4. Selected node is remembered across sessions

## Usage

### Viewing Deployments
1. Configure your mnemonic in the sidebar
2. Select a node from the Nodes page
3. Navigate to Deployments to see all deployments on that node
4. Click on any deployment to view details

### Checking Deployment Health
1. Open a deployment detail page
2. Click "Show Health" in the General Information section
3. View health status for each workload
4. Expand health checks to see detailed validation results

### Viewing Workload Info
1. Open a deployment detail page
2. Find the workload you want to inspect
3. Click "Show Info" on the workload card
4. View runtime information and console logs

### Exploring Deployment History
1. Open a deployment detail page
2. Scroll to the Deployment History section
3. View timeline of state changes grouped by workload
4. See sequential state transitions with timestamps and messages

## Development

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)

### Recommended Browser Extensions

**Chromium-based browsers (Chrome, Edge, Brave, etc.):**
- [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)

**Firefox:**
- [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
- [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Architecture

### Services
- **rmbService**: High-level RMB operations and state management
- **gridClientService**: Low-level RMB client wrapper
- **networkConfig**: Network configuration management
- **rmbWrapper**: RMB request/response handling

### Views
- **NodesView**: Node discovery and selection
- **DeploymentsView**: Deployment listing and summary
- **DeploymentDetailView**: Detailed deployment information

### Components
- **JsonFormatter**: Pretty-print JSON data
- **Sidebar**: Navigation and configuration

## Contributing

Contributions are welcome! Please ensure:
- All TypeScript types are properly defined
- Code passes linting (`yarn lint`)
- Type checking passes (`yarn type-check`)
- Follow existing code style and patterns

## License

[Add your license here]

## Support

For issues, questions, or contributions, please visit the project repository.
