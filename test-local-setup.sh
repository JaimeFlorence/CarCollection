#!/bin/bash

echo "🧪 Testing Local Development Setup"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check backend
echo "1. Checking Backend..."
echo "----------------------"
cd backend 2>/dev/null || { echo -e "${RED}✗ Backend directory not found${NC}"; exit 1; }

# Check virtual environment
if [ -d "venv" ]; then
    echo -e "${GREEN}✓ Virtual environment exists${NC}"
else
    echo -e "${YELLOW}⚠ Virtual environment not found (run setup-local-dev.sh)${NC}"
fi

# Check .env file
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Backend .env exists${NC}"
    echo "  CORS setting: $(grep CORS_ORIGINS .env | head -1)"
else
    echo -e "${YELLOW}⚠ Backend .env not found (run setup-local-dev.sh)${NC}"
fi

# Check database
if [ -f "car_collection.db" ]; then
    echo -e "${GREEN}✓ Database exists${NC}"
else
    echo -e "${YELLOW}⚠ Database not found (will be created on first run)${NC}"
fi

cd ..

# Check frontend
echo ""
echo "2. Checking Frontend..."
echo "-----------------------"
cd car-collection-prototype 2>/dev/null || { echo -e "${RED}✗ Frontend directory not found${NC}"; exit 1; }

# Check node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Node modules installed${NC}"
else
    echo -e "${YELLOW}⚠ Node modules not found (run npm install)${NC}"
fi

# Check .env.local
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ Frontend .env.local exists${NC}"
    echo "  API URL: $(grep NEXT_PUBLIC_API_URL .env.local | head -1)"
else
    echo -e "${YELLOW}⚠ Frontend .env.local not found (run setup-local-dev.sh)${NC}"
fi

# Check api.ts for proper configuration
echo ""
echo "3. Checking API Configuration..."
echo "--------------------------------"
if grep -q "process.env.NEXT_PUBLIC_API_URL" src/lib/api.ts; then
    echo -e "${GREEN}✓ API uses environment variable${NC}"
    grep "API_BASE_URL" src/lib/api.ts | head -1
else
    echo -e "${RED}✗ API might be hardcoded${NC}"
fi

cd ..

# Summary
echo ""
echo "================================="
echo "Summary:"
echo ""

if [ -f "backend/.env" ] && [ -f "car-collection-prototype/.env.local" ]; then
    echo -e "${GREEN}✅ Local development appears to be configured correctly!${NC}"
    echo ""
    echo "To start development:"
    echo "1. Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
    echo "2. Frontend: cd car-collection-prototype && npm run dev"
    echo "3. Open:     http://localhost:3000"
else
    echo -e "${YELLOW}⚠️  Local development needs setup${NC}"
    echo ""
    echo "Run: ./setup-local-dev.sh"
fi