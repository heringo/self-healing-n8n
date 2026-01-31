# Setup Guide

Complete installation and configuration guide for Self-Healing n8n Workflows.

## Prerequisites

- n8n instance (local or self-hosted)
- Node.js 18+
- Claude Code CLI installed
- Anthropic API key

## Installation

### 1. Create Service User

```bash
useradd -m -s /bin/bash claude-bridge
```

### 2. Install Bridge Server

```bash
mkdir -p /opt/claude-n8n-bridge
cd /opt/claude-n8n-bridge
npm install express dotenv
```

### 3. Configure Claude Code

Create `/home/claude-bridge/.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["-y", "@czlonkowski/n8n-mcp@latest"],
      "env": {
        "N8N_HOST": "http://127.0.0.1:5678",
        "N8N_API_KEY": "YOUR_N8N_API_KEY"
      }
    }
  }
}
```

Get your n8n API key:
1. n8n → Settings → API → Create API Key

### 4. Install Systemd Service

```bash
cp /opt/claude-n8n-bridge/systemd/claude-n8n-bridge.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable claude-n8n-bridge
systemctl start claude-n8n-bridge
```

### 5. Create Error Handler Workflow in n8n

1. **Create new workflow**: `Error Handler - Claude Code Fixer`

2. **Add Error Trigger node**

3. **Add HTTP Request node**:
   | Setting | Value |
   |---------|-------|
   | Method | POST |
   | URL | `http://172.17.0.1:3456/fix-workflow` |
   | Authentication | Header Auth |
   | Header Name | Authorization |
   | Header Value | Bearer YOUR_BRIDGE_API_KEY |
   | Body | JSON |
   | JSON | `={{ JSON.stringify($json) }}` |
   | Timeout | 300000 |

4. **Save and Activate**

### 6. Connect Your Workflows

For each workflow you want Claude to auto-fix:

1. Open the workflow
2. Click ⋮ menu → Settings
3. Set **Error Workflow** to `Error Handler - Claude Code Fixer`
4. Save

## Configuration Reference

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BRIDGE_API_KEY` | Secret key for auth | `dd0071b4af7c...` |
| `PORT` | Server port | `3456` |

### n8n URL for Docker

If n8n runs in Docker, use the Docker gateway IP:
```
http://172.17.0.1:3456/fix-workflow
```

Find your Docker gateway:
```bash
ip addr show docker0 | grep "inet "
```

## Verification

Check if everything is working:

```bash
# Service status
systemctl status claude-n8n-bridge

# Health check
curl http://localhost:3456/health

# View logs
journalctl -u claude-n8n-bridge -f
```
