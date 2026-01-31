# Architecture

Technical design of the Self-Healing n8n Workflows system.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              VPS                                        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Docker Network                            │   │
│  │                                                                  │   │
│  │  ┌──────────────────┐                                           │   │
│  │  │      n8n         │                                           │   │
│  │  │   (Container)    │                                           │   │
│  │  │                  │                                           │   │
│  │  │  - Workflows     │                                           │   │
│  │  │  - Error Trigger │                                           │   │
│  │  │  - HTTP Request  │──────────────────────┐                    │   │
│  │  │                  │                      │                    │   │
│  │  └──────────────────┘                      │                    │   │
│  │         ▲                                  │                    │   │
│  │         │ API (port 5678)                  │ HTTP POST          │   │
│  │         │                                  │ (172.17.0.1:3456)  │   │
│  └─────────┼──────────────────────────────────┼────────────────────┘   │
│            │                                  │                        │
│            │                                  ▼                        │
│  ┌─────────┴──────────────────────────────────────────────────────┐   │
│  │                     Host System                                 │   │
│  │                                                                 │   │
│  │  ┌─────────────────┐      ┌─────────────────┐                  │   │
│  │  │  Bridge Server  │      │   Claude Code   │                  │   │
│  │  │   (Node.js)     │─────>│     (CLI)       │                  │   │
│  │  │                 │spawn │                 │                  │   │
│  │  │  Port 3456      │      │  - Analyzes     │                  │   │
│  │  │  User: claude-  │      │  - Fixes        │                  │   │
│  │  │        bridge   │      │  - Updates      │                  │   │
│  │  └─────────────────┘      └────────┬────────┘                  │   │
│  │                                    │                           │   │
│  │                                    │ MCP Protocol              │   │
│  │                                    ▼                           │   │
│  │                           ┌─────────────────┐                  │   │
│  │                           │   n8n MCP       │                  │   │
│  │                           │   Server        │──────────────────┼───┘
│  │                           │                 │  HTTP API        │
│  │                           │  (npx spawned)  │  to n8n          │
│  │                           └─────────────────┘                  │
│  │                                                                │
│  └────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Bridge Server (`server.js`)

**Purpose**: Receives webhook from n8n, spawns Claude Code

**Technology**: Node.js + Express

**Location**: `/opt/claude-n8n-bridge/server.js`

**Endpoints**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/fix-workflow` | POST | Receive error, trigger fix |

**Security**:
- Runs as `claude-bridge` user (non-root)
- API key authentication (Bearer token)
- Listens on `0.0.0.0:3456`

### 2. Claude Code CLI

**Purpose**: AI agent that analyzes and fixes workflows

**Invocation**:
```bash
echo "prompt" | claude --dangerously-skip-permissions
```

**Configuration**: `/home/claude-bridge/.claude/`

### 3. n8n MCP Server

**Purpose**: Provides Claude with n8n API access

**Package**: `@czlonkowski/n8n-mcp`

**Tools Available**:
- `n8n_get_workflow` - Fetch workflow JSON
- `n8n_update_partial_workflow` - Apply fixes
- `n8n_validate_workflow` - Verify changes
- `n8n_list_workflows` - List all workflows

### 4. n8n Error Handler Workflow

**Purpose**: Catches errors, sends to bridge

**Nodes**:
1. Error Trigger - Catches workflow failures
2. HTTP Request - Sends to bridge server
3. (Optional) Notification - Slack/Email alert

## Data Flow

```
1. Workflow fails
   └─> n8n executes Error Handler workflow

2. Error Handler sends POST to bridge
   └─> {workflow: {...}, execution: {error: {...}}}

3. Bridge server receives request
   └─> Validates API key
   └─> Extracts error info
   └─> Builds prompt for Claude

4. Bridge spawns Claude Code
   └─> Pipes prompt to stdin
   └─> Waits for completion

5. Claude Code executes
   └─> Uses n8n MCP to fetch workflow
   └─> Analyzes error
   └─> Applies fix via MCP
   └─> Returns explanation

6. Bridge returns response
   └─> {success: true, fixApplied: "..."}

7. n8n receives response
   └─> Can trigger notification with fix details
```

## File Locations

| Component | Path |
|-----------|------|
| Bridge Server | `/opt/claude-n8n-bridge/` |
| Systemd Service | `/etc/systemd/system/claude-n8n-bridge.service` |
| Claude Config | `/home/claude-bridge/.claude/` |
| MCP Settings | `/home/claude-bridge/.claude/settings.local.json` |
| Logs | `journalctl -u claude-n8n-bridge` |

## Security Model

```
┌─────────────────────────────────────────────┐
│           claude-bridge user                │
│                                             │
│  CAN:                                       │
│  ✓ Read/write /opt/claude-n8n-bridge/       │
│  ✓ Read/write /home/claude-bridge/          │
│  ✓ Make HTTP requests to n8n API            │
│  ✓ Spawn processes (Claude Code)            │
│                                             │
│  CANNOT:                                    │
│  ✗ Access /root/                            │
│  ✗ Modify system files                      │
│  ✗ Run as sudo                              │
│  ✗ Access other users' files                │
└─────────────────────────────────────────────┘
```
