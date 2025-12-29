const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const nonexistent = require('./nonexistent-module');

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Kubernetes MCP Demo!',
    version: '1.0.0',
    hostname: process.env.HOSTNAME || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// API endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'k8s-mcp-app',
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

