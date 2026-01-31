# Self-Healing n8n Workflows

Automatically fix broken n8n workflows using Claude Code AI.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your VPS                                │
│                                                                 │
│  ┌──────────┐    Error    ┌──────────────┐    Spawn    ┌─────┐ │
│  │   n8n    │ ──────────> │ Bridge Server│ ─────────> │Claude│ │
│  │ Workflow │   HTTP POST │  (Node.js)   │            │ Code │ │
│  └──────────┘             └──────────────┘            └──────┘ │
│       │                          │                       │     │
│       │                          │                       │     │
│       │    ┌─────────────────────┘                       │     │
│       │    │ Response with fix details                   │     │
│       │    ▼                                             │     │
│  ┌──────────┐                                   ┌────────┴───┐ │
│  │ Notify   │                                   │  n8n MCP   │ │
│  │ (Slack)  │                                   │  Server    │ │
│  └──────────┘                                   └────────────┘ │
│                                                       │        │
│                              ┌────────────────────────┘        │
│                              │ API calls to fix workflow       │
│                              ▼                                 │
│                         ┌──────────┐                           │
│                         │   n8n    │                           │
│                         │   API    │                           │
│                         └──────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

1. **Start the service** (already configured):
   ```bash
   systemctl start claude-n8n-bridge
   ```

2. **Create Error Handler** in n8n (see [docs/SETUP.md](docs/SETUP.md))

3. **Connect your workflows** to the Error Handler

## Directory Structure

```
/opt/claude-n8n-bridge/
├── server.js              # Bridge server
├── CLAUDE.md              # AI instructions
├── package.json           # Dependencies
├── config/
│   └── example.env        # Environment template
├── docs/
│   ├── SETUP.md           # Installation guide
│   ├── TESTING.md         # How to test
│   └── ARCHITECTURE.md    # System design
└── systemd/
    ├── claude-n8n-bridge.service
    └── install-service.sh
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BRIDGE_API_KEY` | Auth key for n8n requests | Required |
| `PORT` | Server port | 3456 |

## Service Commands

```bash
# Status
systemctl status claude-n8n-bridge

# Logs (live)
journalctl -u claude-n8n-bridge -f

# Restart
systemctl restart claude-n8n-bridge

# Stop
systemctl stop claude-n8n-bridge
```

## What Claude Can Fix

| Can Fix | Cannot Fix |
|---------|------------|
| Null reference errors | Expired credentials |
| Expression syntax | API outages |
| JavaScript bugs | Rate limiting |
| Type mismatches | Network issues |

## Documentation

- [Setup Guide](docs/SETUP.md) - Full installation instructions
- [Testing Guide](docs/TESTING.md) - How to test the system
- [Architecture](docs/ARCHITECTURE.md) - Technical details

## Security

The bridge runs as a non-root user (`claude-bridge`) with limited permissions:
- Cannot access `/root/` or system files
- Can only modify files in `/opt/claude-n8n-bridge/` and its home
- n8n interaction is API-only (no file access)

## License

MIT
