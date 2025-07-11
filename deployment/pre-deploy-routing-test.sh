#!/bin/bash

# Pre-deployment routing verification script
# This script tests critical routes to ensure they're properly configured
# Run this before deploying to catch routing issues early

echo "🧪 Pre-deployment Routing Tests"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_BASE="http://localhost:8000"
FRONTEND_BASE="http://localhost:3000"

# Counter for failed tests
FAILED_TESTS=0

# Function to test a route
test_route() {
    local url=$1
    local expected_status=$2
    local description=$3
    local check_content=$4
    
    echo -n "Testing $description... "
    
    # Make the request
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Pass${NC} (HTTP $response)"
    else
        echo -e "${RED}✗ Fail${NC} (Expected $expected_status, got $response)"
        ((FAILED_TESTS++))
    fi
}

# Function to test admin routes specifically
test_admin_routes() {
    echo -e "\n${YELLOW}Admin Page Routes (Frontend)${NC}"
    echo "-----------------------------"
    
    # These should be handled by Next.js (frontend)
    test_route "$FRONTEND_BASE/admin" "200" "/admin page"
    test_route "$FRONTEND_BASE/admin/" "200" "/admin/ page"
    
    echo -e "\n${YELLOW}Admin API Routes (Backend)${NC}"
    echo "--------------------------"
    
    # These should return 401 (unauthorized) from the backend
    test_route "$API_BASE/admin/users/" "401" "/admin/users/ API"
    test_route "$API_BASE/admin/invitations/" "401" "/admin/invitations/ API"
    
    # These should return 404 from the backend (not handled)
    test_route "$API_BASE/admin" "404" "/admin (should not be in API)"
    test_route "$API_BASE/admin/" "404" "/admin/ (should not be in API)"
}

# Function to test other critical routes
test_other_routes() {
    echo -e "\n${YELLOW}Authentication Routes${NC}"
    echo "---------------------"
    
    test_route "$API_BASE/auth/login" "405" "/auth/login (GET should be 405)"
    test_route "$API_BASE/auth/me" "401" "/auth/me (requires auth)"
    
    echo -e "\n${YELLOW}Core API Routes${NC}"
    echo "---------------"
    
    test_route "$API_BASE/cars/" "401" "/cars/ API"
    test_route "$API_BASE/todos/" "401" "/todos/ API"
    
    echo -e "\n${YELLOW}Frontend Pages${NC}"
    echo "--------------"
    
    test_route "$FRONTEND_BASE/" "200" "Home page"
    test_route "$FRONTEND_BASE/login" "200" "Login page"
    test_route "$FRONTEND_BASE/dashboard" "200" "Dashboard page"
}

# Function to run nginx config test
test_nginx_config() {
    echo -e "\n${YELLOW}Nginx Configuration Test${NC}"
    echo "------------------------"
    
    if [ -f "nginx-staging.conf" ]; then
        echo -n "Testing nginx configuration syntax... "
        if nginx -t -c "$(pwd)/nginx-staging.conf" 2>/dev/null; then
            echo -e "${GREEN}✓ Valid${NC}"
        else
            echo -e "${RED}✗ Invalid${NC}"
            ((FAILED_TESTS++))
        fi
    else
        echo -e "${YELLOW}⚠ nginx-staging.conf not found in current directory${NC}"
    fi
}

# Main execution
main() {
    echo "Running pre-deployment routing tests..."
    echo "Make sure both frontend (port 3000) and backend (port 8000) are running!"
    echo ""
    
    # Check if services are running
    echo -n "Checking if backend is running... "
    if curl -s -o /dev/null "$API_BASE/docs" 2>/dev/null; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not running${NC}"
        echo "Please start the backend: cd backend && uvicorn app.main:app --reload"
        exit 1
    fi
    
    echo -n "Checking if frontend is running... "
    if curl -s -o /dev/null "$FRONTEND_BASE" 2>/dev/null; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not running${NC}"
        echo "Please start the frontend: cd car-collection-prototype && npm run dev"
        exit 1
    fi
    
    # Run tests
    test_admin_routes
    test_other_routes
    test_nginx_config
    
    # Summary
    echo -e "\n${YELLOW}Test Summary${NC}"
    echo "============"
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        echo "Safe to deploy."
        exit 0
    else
        echo -e "${RED}✗ $FAILED_TESTS test(s) failed!${NC}"
        echo "Please fix the issues before deploying."
        exit 1
    fi
}

# Run main function
main "$@"