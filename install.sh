#!/bin/bash

# ShelfLife Installer for Linux / macOS
echo "==================================================="
echo "  ShelfLife - ENV Installation"
echo "==================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in your PATH."
    echo "Please install Node.js (v16+) and try again."
    echo ""
    exit 1
fi

echo "[1/3] Node.js detected: $(node -v)"
echo ""

echo "[2/3] Installing package dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Failed to install npm dependencies."
    echo "Please check your internet connection and try running 'npm install' manually."
    echo ""
    exit 1
fi

echo ""
echo "[3/3] Configuring Database..."
echo "     [1] Production Mode (Clean DB, admin user only)"
echo "     [2] Demo Mode (Preloaded items, staff user, usage history)"
echo ""
read -p "Enter selection (1 or 2) [Default: 2]: " INST_MODE

if [ "$INST_MODE" = "1" ]; then
    echo "Initializing clean database for production..."
    node seed.js --prod
else
    echo "Seeding database with demo data..."
    node seed.js --demo
fi

# Make script files executable
chmod +x start.sh uninstall.sh

echo ""
echo "==================================================="
echo "  Installation Completed Successfully!"
echo "==================================================="
echo ""
echo "  To launch the application, run: ./start.sh"
echo ""
echo "  Default Administrator Credentials:"
echo "    - Username: admin"
echo "    - Password: admin123"
echo ""
echo "==================================================="
