# Kubernetes MCP Project

A Node.js application deployed on Kubernetes (Minikube) with an MCP server for Kubernetes operations, integrated with Claude Desktop.

## Quick Start

### 1. Deploy to Kubernetes

```bash
./setup.sh
```

### 2. Setup MCP Server

```bash
./setup-mcp.sh
```

**Important**: Restart Claude Desktop after running this script.

### 3. Access the Application

```bash
minikube service k8s-mcp-app-service -n mcp-demo
```

Or add to `/etc/hosts`:
```
$(minikube ip) k8s-mcp-app.local
```

Then visit: `http://k8s-mcp-app.local`

## MCP Server Tools

**Read Operations:**
- `get_pods` - List pods in a namespace
- `get_deployments` - List deployments
- `get_services` - List services
- `get_pod_logs` - Get pod logs
- `describe_pod` - Get detailed pod information

**Modification Operations:**
- `scale_deployment` - Scale a deployment
- `delete_pod` - Delete a pod
- `restart_deployment` - Restart a deployment
- `update_deployment_image` - Update container image

## Example Usage

Here are some example conversations with Claude using the MCP server:

**User:** List all pods in the mcp-demo namespace

**Claude:** I found 2 pods running in the mcp-demo namespace:
- k8s-mcp-app-5c47cfdd8b-5dzpq (Status: Running)
- k8s-mcp-app-5c47cfdd8b-f6pvv (Status: Running)

---

**User:** check why my pods are failing

**Claude:** I found the issue! You have a pod stuck in "Pending" status. Let me check the logs...

Found the problem! All three pods are crashing with the same error:
```
Error: Cannot find module './nonexistent-module'
Require stack:
- /app/server.js
```

Issue: The application code in /app/server.js at line 6 is trying to require a module called ./nonexistent-module which doesn't exist.

---

**User:** can u delete the problematic pods

**Claude:** Yes! Let me delete the problematic pods.

I successfully deleted the 2 pending pods:
- k8s-mcp-app-59b6b74f95-69kc6 (deleted)
- k8s-mcp-app-7c4ddfc4cc-8gj6v (deleted)

The old buggy pods are gone! Now all pods are from newer replica sets.

## Project Structure

```
k8s-mcp-project/
├── server.js              # Node.js Express application
├── package.json           # App dependencies
├── Dockerfile             # Docker image
├── k8s/                   # Kubernetes manifests
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── mcp-server/            # MCP server for Kubernetes
│   ├── src/index.ts      # MCP server implementation
│   └── package.json
├── setup.sh              # Kubernetes deployment script
└── setup-mcp.sh          # MCP server setup script
```

## Prerequisites

- Docker
- Minikube
- kubectl
- Node.js (v18+)
- Claude Desktop

## Development

```bash
# Local app development
npm install
npm start

# MCP server development
cd mcp-server
npm install
npm run build
npm run dev
```

## Cleanup

```bash
kubectl delete -f k8s/
minikube stop
```

## License

MIT
