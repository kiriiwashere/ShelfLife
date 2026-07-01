#!/bin/bash

# ShelfLife Uninstaller for Linux / macOS
echo "==================================================="
echo "  ShelfLife - ENV Uninstallation"
echo "==================================================="
echo ""
echo "  WARNING: This action will permanently delete:"
echo "    - All installed dependencies (node_modules)"
echo "    - The local database and ALL inventory history (data/)"
echo ""
read -p "Are you absolutely sure you want to proceed? (Y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Uninstallation cancelled."
    echo ""
    exit 0
fi

echo ""
echo "[1/3] Removing installed packages (node_modules)..."
rm -rf node_modules
rm -f package-lock.json

echo "[2/3] Deleting database files and logs (data)..."
rm -rf data

echo "[3/3] Cleaning up temporary files..."
rm -f data/db.json.tmp

echo ""
echo "==================================================="
echo "  Uninstallation Completed Cleanly."
echo "==================================================="
echo ""
