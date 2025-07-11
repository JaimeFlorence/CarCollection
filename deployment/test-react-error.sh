#!/bin/bash

# Test what's causing the React error
echo "=== Testing React Error ==="
echo ""

cd /opt/carcollection/car-collection-prototype

echo "1. Checking if AuthContext is working..."
grep -r "AuthProvider" src/context/ 2>/dev/null | head -5

echo ""
echo "2. Checking the home page component..."
if [ -f "src/app/page.tsx" ]; then
    echo "Home page redirect logic:"
    grep -A10 -B5 "redirect\|dashboard\|login" src/app/page.tsx
fi

echo ""
echo "3. Testing different pages directly:"
echo ""

# Test login page
echo "Login page:"
curl -s http://93.127.194.202/login | grep -E "<title>|Loading|error|Error" | head -5

echo ""
echo "Dashboard page:"
curl -s http://93.127.194.202/dashboard | grep -E "<title>|Loading|error|Error" | head -5

echo ""
echo "4. Checking for localStorage/sessionStorage issues..."
grep -r "localStorage\|sessionStorage" src/ 2>/dev/null | grep -v node_modules | head -10

echo ""
echo "5. Quick fix - clearing any client-side storage issues:"
echo ""
echo "Run these commands in your browser console (F12):"
echo "localStorage.clear();"
echo "sessionStorage.clear();"
echo ""
echo "Then refresh the page."

echo ""
echo "6. Alternative URLs to try:"
echo "- http://93.127.194.202/login (Login page)"
echo "- http://93.127.194.202/register (Registration page)"
echo "- http://93.127.194.202/dashboard (Dashboard - will redirect to login)"
echo ""

echo "7. Testing if it's a hydration error..."
# Check for common hydration issues
grep -r "useEffect\|useState.*localStorage" src/ 2>/dev/null | head -5

echo ""
echo "=== Recommendation ==="
echo ""
echo "Since the error page is loading, the issue is likely:"
echo "1. A client-side routing problem"
echo "2. An authentication context error"
echo "3. A hydration mismatch"
echo ""
echo "Try accessing: http://93.127.194.202/login"
echo "This should bypass the home page redirect logic."