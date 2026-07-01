#!/bin/bash

# ShelfLife Launcher for Linux / macOS
echo "==================================================="
echo "  ShelfLife - Starting Server"
echo "==================================================="
echo ""
echo "  Launching local application..."
echo "  The system will automatically open your browser."
echo ""

node server.js
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] The server failed to start or terminated unexpectedly."
    echo "Please make sure you have run './install.sh' first."
    echo ""
    exit 1
fi
