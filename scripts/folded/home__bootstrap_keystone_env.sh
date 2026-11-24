#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==> Updating Termux package repositories...${NC}"
pkg update -y && pkg upgrade -y

echo -e "${GREEN}==> Installing Termux User Repository (TUR) & core dependencies...${NC}"
pkg install -y tur-repo build-essential python

echo -e "${GREEN}==> Refreshing package index with TUR...${NC}"
pkg update -y

echo -e "${GREEN}==> Installing precompiled NumPy, Pandas, and python-dateutil via pkg...${NC}"
pkg install -y python-numpy python-pandas python-dateutil python-pytest

echo -e "${GREEN}==> Ensuring Python path configuration for local test runner...${NC}"
export PYTHONPATH="${PWD}:${PYTHONPATH:-}"

echo -e "${GREEN}==> Verifying Python imports...${NC}"
python3 -c "import numpy; import pandas; import dateutil; print('Imports verified successfully!')"

echo -e "${GREEN}==> Environment setup complete! You can now run tests with:${NC}"
echo -e "    ${YELLOW}PYTHONPATH=. pytest tests/${NC}"
