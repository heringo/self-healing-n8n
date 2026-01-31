#!/bin/bash

# Install Claude n8n Bridge as a systemd service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="claude-n8n-bridge.service"

echo "=============================================="
echo "Installing Claude n8n Bridge Service"
echo "=============================================="

# Generate a secure API key if not already set
if grep -q "change-me-to-something-secret" "$SCRIPT_DIR/$SERVICE_FILE"; then
    echo ""
    echo "Generating secure API key..."
    SECURE_KEY=$(openssl rand -hex 32)
    sed -i "s/change-me-to-something-secret/$SECURE_KEY/" "$SCRIPT_DIR/$SERVICE_FILE"
    echo "Generated API Key: $SECURE_KEY"
    echo ""
    echo "IMPORTANT: Save this API key! You need it for your n8n Error Handler workflow."
    echo ""
fi

# Copy service file to systemd
echo "Copying service file to /etc/systemd/system/..."
cp "$SCRIPT_DIR/$SERVICE_FILE" /etc/systemd/system/

# Reload systemd
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable and start the service
echo "Enabling service to start on boot..."
systemctl enable claude-n8n-bridge

echo "Starting the service..."
systemctl start claude-n8n-bridge

echo ""
echo "=============================================="
echo "Installation Complete!"
echo "=============================================="
echo ""
echo "Service status:"
systemctl status claude-n8n-bridge --no-pager

echo ""
echo "Useful commands:"
echo "  View logs:     journalctl -u claude-n8n-bridge -f"
echo "  Stop service:  systemctl stop claude-n8n-bridge"
echo "  Start service: systemctl start claude-n8n-bridge"
echo "  Restart:       systemctl restart claude-n8n-bridge"
echo ""
