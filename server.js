const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not required if env vars are set externally
}

const app = express();
app.use(express.json({ limit: '10mb' }));

const API_KEY = process.env.BRIDGE_API_KEY || 'change-me-to-something-secret';
const PORT = process.env.PORT || 3456;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'claude-n8n-bridge'
  });
});

// Main endpoint - n8n calls this when a workflow fails
app.post('/fix-workflow', async (req, res) => {
  // Validate API key (supports both x-api-key header and Bearer token)
  const apiKey = req.headers['x-api-key'] || 
                 (req.headers['authorization']?.startsWith('Bearer ') 
                   ? req.headers['authorization'].slice(7) 
                   : null);

  if (apiKey !== API_KEY) {
    console.log(`[${new Date().toISOString()}] Unauthorized request - invalid API key`);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const { workflow, execution, trigger } = req.body;

  if (!workflow) {
    return res.status(400).json({ error: 'Missing workflow data' });
  }

  // Extract error information
  const errorMessage = execution?.error?.message || 
                       trigger?.error?.message || 
                       'Unknown error';
  const lastNode = execution?.lastNodeExecuted || 'Unknown';
  const executionId = execution?.id || 'N/A';

  // Build the prompt for Claude Code
  const prompt = `An n8n workflow has failed and needs to be fixed.

WORKFLOW INFO:
- Workflow ID: ${workflow.id}
- Workflow Name: ${workflow.name}
- Execution ID: ${executionId}
- Failed Node: ${lastNode}
- Error Message: ${errorMessage}

YOUR TASK:
1. Use n8n_get_workflow with id "${workflow.id}" to fetch the current workflow
2. Analyze what went wrong based on the error message
3. Use n8n_update_partial_workflow to apply the fix
4. Explain what you fixed and why

Apply fixes directly without asking for permission.`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${new Date().toISOString()}] Error received`);
  console.log(`Workflow: ${workflow.name} (ID: ${workflow.id})`);
  console.log(`Failed node: ${lastNode}`);
  console.log(`Error: ${errorMessage}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Wait for Claude to finish fixing the workflow
    const claudeOutput = await runClaudeCode(prompt);
    
    console.log(`\n[${new Date().toISOString()}] Claude Code finished for workflow ${workflow.id}`);
    
    // Respond with full results including what was fixed
    res.json({ 
      success: true, 
      workflowId: workflow.id,
      workflowName: workflow.name,
      executionId: executionId,
      failedNode: lastNode,
      originalError: errorMessage,
      fixApplied: claudeOutput,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Claude Code failed:`, error.message);
    
    // Respond with error details
    res.status(500).json({ 
      success: false, 
      workflowId: workflow.id,
      workflowName: workflow.name,
      executionId: executionId,
      failedNode: lastNode,
      originalError: errorMessage,
      fixError: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

function runClaudeCode(prompt) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, `temp-prompt-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, prompt, 'utf8');

    console.log(`[${new Date().toISOString()}] Spawning Claude Code...`);

    // Linux: use bash to pipe the prompt to claude
    const claude = spawn('bash', [
      '-c',
      `cat "${tempFile}" | claude --dangerously-skip-permissions`
    ], { 
      timeout: 600000, // 10 minute timeout
      cwd: __dirname,
      env: { ...process.env, HOME: process.env.HOME || '/root' }
    });

    let output = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data.toString());
    });

    claude.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    claude.on('close', (code) => {
      // Clean up temp file
      try { fs.unlinkSync(tempFile); } catch (e) {}
      
      if (code === 0) {
        console.log(`\n[${new Date().toISOString()}] Claude Code completed successfully`);
        resolve(output);
      } else {
        reject(new Error(`Claude Code exited with code ${code}`));
      }
    });

    claude.on('error', (err) => {
      // Clean up temp file
      try { fs.unlinkSync(tempFile); } catch (e) {}
      reject(err);
    });
  });
}

// Start the server (listen on all interfaces for Docker access)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Claude n8n Bridge Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`Fix endpoint: http://127.0.0.1:${PORT}/fix-workflow`);
  console.log(`\nWaiting for n8n errors...`);
  console.log(`${'='.repeat(60)}\n`);
});
