#!/bin/bash

set -e

echo "Setting up Kubernetes MCP Project"

if ! command -v minikube &> /dev/null; then
    echo "ERROR: minikube is not installed. Please install it first:"
    echo "   brew install minikube"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo "ERROR: kubectl is not installed. Please install it first:"
    echo "   brew install kubectl"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "ERROR: docker is not installed. Please install it first:"
    exit 1
fi

echo "Prerequisites check passed"

if ! minikube status &> /dev/null; then
    echo "Starting minikube..."
    minikube start
else
    echo "Minikube is already running"
fi

echo "Enabling ingress addon..."
minikube addons enable ingress

echo "Configuring docker to use minikube..."
eval $(minikube docker-env)

echo "Building Docker image..."
cd "$(dirname "$0")"
docker build -t k8s-mcp-app:latest .

echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/k8s-mcp-app -n mcp-demo || true

echo ""
echo "Setup complete!"
echo ""
echo "Useful commands:"
echo "   kubectl get pods -n mcp-demo"
echo "   kubectl get services -n mcp-demo"
echo "   kubectl get ingress -n mcp-demo"
echo "   minikube service k8s-mcp-app-service -n mcp-demo"
echo ""
echo "To access the app, add this to your /etc/hosts:"
echo "   $(minikube ip) k8s-mcp-app.local"
echo ""
echo "   Then visit: http://k8s-mcp-app.local"

