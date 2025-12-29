#!/bin/bash

set -e

echo "Setting up MCP Server for Claude Desktop"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_SERVER_DIR="$PROJECT_DIR/mcp-server"
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install it first:"
    echo "   brew install node"
    exit 1
fi

echo "Building MCP server..."
cd "$MCP_SERVER_DIR"
npm install
npm run build

mkdir -p "$CLAUDE_CONFIG_DIR"

if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "Backing up existing Claude Desktop config..."
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "Updating existing Claude Desktop config..."
    if command -v jq &> /dev/null; then
        jq --arg cmd "node" \
           --arg arg "$MCP_SERVER_DIR/dist/index.js" \
           '.mcpServers.kubernetes = {command: $cmd, args: [$arg], env: {}}' \
           "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp" && \
        mv "$CLAUDE_CONFIG_FILE.tmp" "$CLAUDE_CONFIG_FILE"
    else
        echo "WARNING: jq not found. Please manually update $CLAUDE_CONFIG_FILE"
        echo "   Add this to the mcpServers section:"
        echo "   \"kubernetes\": {"
        echo "     \"command\": \"node\","
        echo "     \"args\": [\"$MCP_SERVER_DIR/dist/index.js\"],"
        echo "     \"env\": {}"
        echo "   }"
    fi
else
    echo "Creating new Claude Desktop config..."
    cat > "$CLAUDE_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "kubernetes": {
      "command": "node",
      "args": [
        "$MCP_SERVER_DIR/dist/index.js"
      ],
      "env": {}
    }
  }
}
EOF
fi

echo ""
echo "MCP server setup complete!"
echo ""
echo "Next steps:"
echo "   1. Restart Claude Desktop"
echo "   2. The Kubernetes MCP server should now be available"
echo ""
echo "Test the MCP server by asking Claude to:"
echo "   - List pods in the mcp-demo namespace"
echo "   - Get deployment information"
echo "   - Check service status"
echo ""
echo "Config file location: $CLAUDE_CONFIG_FILE"

