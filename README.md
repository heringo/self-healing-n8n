# Self-Healing n8n Workflows

**Autonomous error detection and recovery for your n8n automations, powered by Claude Code AI.**

When your n8n workflows break—whether from null references, expression errors, or JavaScript bugs—this system automatically detects the failure, analyzes the root cause, and applies intelligent fixes without human intervention. Get notified via Telegram, Slack, or Email when repairs are made.

## Features

- **Automatic Error Detection** — Catches workflow failures in real-time via n8n's error trigger
- **AI-Powered Diagnosis** — Claude Code analyzes error context, workflow structure, and execution data
- **Self-Healing Fixes** — Automatically patches broken nodes, expressions, and code
- **Multi-Channel Notifications** — Get alerts on Telegram, Slack, or Email when fixes are applied
- **Secure by Design** — Runs as isolated non-root user with minimal permissions

## How It Works

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Your VPS                                      │
│                                                                            │
│   ┌───────────┐   Error    ┌───────────────┐   Spawn    ┌──────────────┐   │
│   │    n8n    │ ────────── │ Bridge Server │ ────────── │  Claude Code │   │
│   │  Workflow │  HTTP POST │   (Node.js)   │            │      AI      │   │
│   └───────────┘            └───────────────┘            └──────────────┘   │
│                                   │                            │           │
│                                   │                     ┌──────┴───────┐   │
│                                   │                     │  n8n MCP     │   │
│                                   │                     │  Server      │   │
│                            ┌──────┴──────┐              └──────────────┘   │
│                            │   Notify    │                     │           │
│                            ├─────────────┤              Fix via API        │
│                            │  Telegram   │                     │           │
│                            │  Slack      │                     ▼           │
│                            │  Email      │              ┌──────────────┐   │
│                            └─────────────┘              │   n8n API    │   │
│                                                         └──────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

**Prerequisites:** Node.js 18+, n8n instance running, Claude Code CLI installed

1. **Start the bridge service:**
   ```bash
   systemctl start claude-n8n-bridge
   ```

2. **Create an Error Handler workflow** in n8n — see [Setup Guide](docs/SETUP.md)

3. **Connect your workflows** to the Error Handler trigger

4. **Test it** — trigger an error and watch the magic happen

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BRIDGE_API_KEY` | Auth key for n8n requests | Required |
| `PORT` | Server port | 3456 |

## What Claude Can Fix

| Can Fix | Cannot Fix |
|---------|------------|
| Null reference errors | Expired credentials |
| Expression syntax | API outages |
| JavaScript bugs | Rate limiting |
| Type mismatches | Network issues |

## Service Commands

```bash
# Check status
systemctl status claude-n8n-bridge

# View live logs
journalctl -u claude-n8n-bridge -f

# Restart service
systemctl restart claude-n8n-bridge

# Stop service
systemctl stop claude-n8n-bridge
```

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

## Documentation

- [Setup Guide](docs/SETUP.md) — Full installation instructions
- [Testing Guide](docs/TESTING.md) — How to test the system
- [Architecture](docs/ARCHITECTURE.md) — Technical details

## Security

The bridge runs as a non-root user (`claude-bridge`) with limited permissions:
- Cannot access `/root/` or system files
- Can only modify files in `/opt/claude-n8n-bridge/` and its home directory
- n8n interaction is API-only (no direct file access)

## License

**MIT License** — You are free to use, modify, and distribute this software for any purpose, commercial or personal. No warranty is provided. See the license terms for full details.

Contributions are welcome! Feel free to open issues or submit pull requests.
