#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
  ReadResourceRequest,
} from '@modelcontextprotocol/sdk/types.js';
import * as k8s from '@kubernetes/client-node';

class KubernetesMCPServer {
  private server: Server;
  private k8sApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private kc: k8s.KubeConfig;

  constructor() {
    this.server = new Server(
      {
        name: 'kubernetes-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize Kubernetes client
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_pods',
          description: 'Get list of pods in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
            },
          },
        },
        {
          name: 'get_deployments',
          description: 'Get list of deployments in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
            },
          },
        },
        {
          name: 'get_services',
          description: 'Get list of services in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
            },
          },
        },
        {
          name: 'get_pod_logs',
          description: 'Get logs from a pod',
          inputSchema: {
            type: 'object',
            properties: {
              podName: {
                type: 'string',
                description: 'Name of the pod',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
              tailLines: {
                type: 'number',
                description: 'Number of lines to tail (default: 100)',
                default: 100,
              },
            },
            required: ['podName'],
          },
        },
        {
          name: 'describe_pod',
          description: 'Get detailed information about a pod',
          inputSchema: {
            type: 'object',
            properties: {
              podName: {
                type: 'string',
                description: 'Name of the pod',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
            },
            required: ['podName'],
          },
        },
        {
          name: 'scale_deployment',
          description: 'Scale a deployment to a specific number of replicas',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentName: {
                type: 'string',
                description: 'Name of the deployment',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
              replicas: {
                type: 'number',
                description: 'Number of replicas',
              },
            },
            required: ['deploymentName', 'replicas'],
          },
        },
        {
          name: 'delete_pod',
          description: 'Delete a pod (will be recreated by deployment if managed)',
          inputSchema: {
            type: 'object',
            properties: {
              podName: {
                type: 'string',
                description: 'Name of the pod to delete',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
            },
            required: ['podName'],
          },
        },
        {
          name: 'restart_deployment',
          description: 'Restart a deployment by rolling out a restart',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentName: {
                type: 'string',
                description: 'Name of the deployment to restart',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
            },
            required: ['deploymentName'],
          },
        },
        {
          name: 'update_deployment_image',
          description: 'Update the container image for a deployment',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentName: {
                type: 'string',
                description: 'Name of the deployment',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: default)',
                default: 'default',
              },
              image: {
                type: 'string',
                description: 'New container image to use',
              },
              containerName: {
                type: 'string',
                description: 'Name of the container to update (default: app)',
                default: 'app',
              },
            },
            required: ['deploymentName', 'image'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      const argsObj = (args as Record<string, any>) || {};

      try {
        switch (name) {
          case 'get_pods':
            return await this.getPods((argsObj.namespace as string) || 'default');

          case 'get_deployments':
            return await this.getDeployments((argsObj.namespace as string) || 'default');

          case 'get_services':
            return await this.getServices((argsObj.namespace as string) || 'default');

          case 'get_pod_logs':
            return await this.getPodLogs(
              argsObj.podName as string,
              (argsObj.namespace as string) || 'default',
              (argsObj.tailLines as number) || 100
            );

          case 'describe_pod':
            return await this.describePod(
              argsObj.podName as string,
              (argsObj.namespace as string) || 'default'
            );

          case 'scale_deployment':
            return await this.scaleDeployment(
              argsObj.deploymentName as string,
              (argsObj.namespace as string) || 'default',
              argsObj.replicas as number
            );

          case 'delete_pod':
            return await this.deletePod(
              argsObj.podName as string,
              (argsObj.namespace as string) || 'default'
            );

          case 'restart_deployment':
            return await this.restartDeployment(
              argsObj.deploymentName as string,
              (argsObj.namespace as string) || 'default'
            );

          case 'update_deployment_image':
            return await this.updateDeploymentImage(
              argsObj.deploymentName as string,
              (argsObj.namespace as string) || 'default',
              argsObj.image as string,
              (argsObj.containerName as string) || 'app'
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'k8s://namespaces',
          name: 'Kubernetes Namespaces',
          description: 'List of all Kubernetes namespaces',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
      const { uri } = request.params;

      if (uri === 'k8s://namespaces') {
        try {
          const response = await this.k8sApi.listNamespace();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  response.body.items.map((ns: k8s.V1Namespace) => ({
                    name: ns.metadata?.name,
                    status: ns.status?.phase,
                  })),
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`Failed to list namespaces: ${error.message}`);
        }
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async getPods(namespace: string) {
    try {
      const response = await this.k8sApi.listNamespacedPod(namespace);
      const pods = response.body.items.map((pod: k8s.V1Pod) => ({
        name: pod.metadata?.name,
        status: pod.status?.phase,
        node: pod.spec?.nodeName,
        createdAt: pod.metadata?.creationTimestamp,
        containers: pod.spec?.containers.map((c) => ({
          name: c.name,
          image: c.image,
        })),
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(pods, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get pods: ${error.message}`);
    }
  }

  private async getDeployments(namespace: string) {
    try {
      const response = await this.appsApi.listNamespacedDeployment(namespace);
      const deployments = response.body.items.map((deployment: k8s.V1Deployment) => ({
        name: deployment.metadata?.name,
        replicas: deployment.spec?.replicas,
        readyReplicas: deployment.status?.readyReplicas,
        availableReplicas: deployment.status?.availableReplicas,
        createdAt: deployment.metadata?.creationTimestamp,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(deployments, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get deployments: ${error.message}`);
    }
  }

  private async getServices(namespace: string) {
    try {
      const response = await this.k8sApi.listNamespacedService(namespace);
      const services = response.body.items.map((service: k8s.V1Service) => ({
        name: service.metadata?.name,
        type: service.spec?.type,
        clusterIP: service.spec?.clusterIP,
        ports: service.spec?.ports?.map((p: k8s.V1ServicePort) => ({
          port: p.port,
          targetPort: p.targetPort,
          protocol: p.protocol,
        })),
        createdAt: service.metadata?.creationTimestamp,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(services, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get services: ${error.message}`);
    }
  }

  private async getPodLogs(podName: string, namespace: string, tailLines: number) {
    try {
      const response = await this.k8sApi.readNamespacedPodLog(
        podName,
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        tailLines
      );

      return {
        content: [
          {
            type: 'text',
            text: response.body || 'No logs available',
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get pod logs: ${error.message}`);
    }
  }

  private async describePod(podName: string, namespace: string) {
    try {
      const response = await this.k8sApi.readNamespacedPod(podName, namespace);
      const pod = response.body;

      const description = {
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        status: pod.status?.phase,
        node: pod.spec?.nodeName,
        ip: pod.status?.podIP,
        hostIP: pod.status?.hostIP,
        createdAt: pod.metadata?.creationTimestamp,
        containers: pod.spec?.containers.map((c: k8s.V1Container) => ({
          name: c.name,
          image: c.image,
          resources: c.resources,
        })),
        containerStatuses: pod.status?.containerStatuses?.map((cs: k8s.V1ContainerStatus) => ({
          name: cs.name,
          ready: cs.ready,
          restartCount: cs.restartCount,
          state: cs.state,
        })),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(description, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to describe pod: ${error.message}`);
    }
  }

  private async scaleDeployment(
    deploymentName: string,
    namespace: string,
    replicas: number
  ) {
    try {
      const deployment = await this.appsApi.readNamespacedDeployment(
        deploymentName,
        namespace
      );

      if (!deployment.body.spec) {
        throw new Error('Deployment spec not found');
      }

      deployment.body.spec.replicas = replicas;

      await this.appsApi.replaceNamespacedDeployment(
        deploymentName,
        namespace,
        deployment.body
      );

      return {
        content: [
          {
            type: 'text',
            text: `Successfully scaled deployment ${deploymentName} to ${replicas} replicas`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to scale deployment: ${error.message}`);
    }
  }

  private async deletePod(podName: string, namespace: string) {
    try {
      await this.k8sApi.deleteNamespacedPod(podName, namespace);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted pod ${podName} in namespace ${namespace}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to delete pod: ${error.message}`);
    }
  }

  private async restartDeployment(deploymentName: string, namespace: string) {
    try {
      // Kubernetes doesn't have a direct restart command, so we patch the deployment
      // to trigger a rolling restart by updating an annotation
      const deployment = await this.appsApi.readNamespacedDeployment(
        deploymentName,
        namespace
      );

      if (!deployment.body.metadata) {
        throw new Error('Deployment metadata not found');
      }

      const annotations = deployment.body.metadata.annotations || {};
      annotations['kubectl.kubernetes.io/restartedAt'] = new Date().toISOString();
      deployment.body.metadata.annotations = annotations;

      await this.appsApi.replaceNamespacedDeployment(
        deploymentName,
        namespace,
        deployment.body
      );

      return {
        content: [
          {
            type: 'text',
            text: `Successfully restarted deployment ${deploymentName} in namespace ${namespace}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to restart deployment: ${error.message}`);
    }
  }

  private async updateDeploymentImage(
    deploymentName: string,
    namespace: string,
    image: string,
    containerName: string
  ) {
    try {
      const deployment = await this.appsApi.readNamespacedDeployment(
        deploymentName,
        namespace
      );

      if (!deployment.body.spec?.template.spec?.containers) {
        throw new Error('Deployment containers not found');
      }

      const container = deployment.body.spec.template.spec.containers.find(
        (c) => c.name === containerName
      );

      if (!container) {
        throw new Error(`Container ${containerName} not found in deployment`);
      }

      container.image = image;

      await this.appsApi.replaceNamespacedDeployment(
        deploymentName,
        namespace,
        deployment.body
      );

      return {
        content: [
          {
            type: 'text',
            text: `Successfully updated deployment ${deploymentName} container ${containerName} to image ${image}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to update deployment image: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kubernetes MCP server running on stdio');
  }
}

const server = new KubernetesMCPServer();
server.run().catch(console.error);

