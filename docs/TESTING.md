# Testing Guide

How to test the Self-Healing n8n Workflows system.

## Quick Test (curl)

Test the bridge server directly:

```bash
# Health check
curl http://localhost:3456/health

# Simulated error (will call Claude)
curl -X POST http://localhost:3456/fix-workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_BRIDGE_API_KEY" \
  -d '{
    "workflow": {"id": "test123", "name": "Test Workflow"},
    "execution": {
      "id": "exec1",
      "lastNodeExecuted": "Code",
      "error": {"message": "Cannot read property name of undefined"}
    }
  }'
```

## Full End-to-End Test

### Step 1: Watch the Logs

Open a terminal and run:
```bash
journalctl -u claude-n8n-bridge -f
```

### Step 2: Create Test Workflow in n8n

1. Create new workflow: `TEST - Intentional Bug`

2. Add **Manual Trigger** node

3. Add **Code** node with buggy code:
```javascript
// This will crash - accessing property on undefined
const data = $input.all();
const userName = data[0].json.user.profile.name;
return [{ json: { name: userName } }];
```

4. Connect: Manual Trigger → Code

5. Settings → Error Workflow → Select `Error Handler - Claude Code Fixer`

6. Save

### Step 3: Trigger the Error

1. Click **Test Workflow**
2. Watch the terminal logs

### Expected Behavior

1. Workflow fails with `Cannot read property 'name' of undefined`
2. Error Handler triggers
3. HTTP Request sends error to bridge server
4. Bridge spawns Claude Code
5. Claude fetches workflow via MCP
6. Claude analyzes error
7. Claude applies fix (adds optional chaining)
8. Response returns with fix details

### Verify the Fix

1. Open `TEST - Intentional Bug` workflow
2. Open the Code node
3. Check if code was updated to something like:
```javascript
const data = $input.all();
const userName = data?.[0]?.json?.user?.profile?.name ?? 'Unknown';
return [{ json: { name: userName } }];
```

## Troubleshooting Tests

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connection refused | Wrong IP | Use `172.17.0.1` for Docker |
| 401 Unauthorized | Bad API key | Check Bearer token matches |
| Claude timeout | Complex fix | Increase timeout to 600000 |
| Claude exit code 1 | Root user | Must run as non-root |

## Testing Different Error Types

### Null Reference
```javascript
const value = data.user.name; // Missing null check
```

### Expression Error
```javascript
return [{ json: { result: {{ $json.missing }} } }]; // Bad expression
```

### Type Error
```javascript
const parts = inputNumber.split(','); // Number has no split
```
