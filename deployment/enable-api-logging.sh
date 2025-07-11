#!/bin/bash

# Script to enable detailed API logging
echo "=== Enabling Detailed API Logging ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "ERROR: This script must be run as root (use sudo)"
   exit 1
fi

# Create a logging middleware file
cat > /opt/carcollection/backend/app/logging_middleware.py << 'EOF'
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import time
import json
import traceback
from typing import Callable
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_debug")

async def log_requests(request: Request, call_next: Callable) -> Response:
    """Log all API requests and responses for debugging"""
    
    # Start timer
    start_time = time.time()
    
    # Log request details
    logger.info(f"=== INCOMING REQUEST ===")
    logger.info(f"Method: {request.method}")
    logger.info(f"URL: {request.url}")
    logger.info(f"Client: {request.client.host if request.client else 'Unknown'}")
    
    # Log headers (excluding sensitive auth token details)
    headers = dict(request.headers)
    if 'authorization' in headers:
        headers['authorization'] = headers['authorization'][:20] + '...' if len(headers['authorization']) > 20 else headers['authorization']
    logger.info(f"Headers: {json.dumps(headers, indent=2)}")
    
    # Try to log body for POST/PUT requests
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                try:
                    body_json = json.loads(body)
                    # Hide sensitive data
                    if 'password' in body_json:
                        body_json['password'] = '***'
                    logger.info(f"Body: {json.dumps(body_json, indent=2)}")
                except:
                    logger.info(f"Body (raw): {body[:200]}...")
            # Reset body stream
            async def receive():
                return {"type": "http.request", "body": body}
            request._receive = receive
        except Exception as e:
            logger.error(f"Error reading request body: {e}")
    
    # Process request
    try:
        response = await call_next(request)
        
        # Log response
        duration = time.time() - start_time
        logger.info(f"=== RESPONSE ===")
        logger.info(f"Status: {response.status_code}")
        logger.info(f"Duration: {duration:.3f}s")
        
        # For error responses, try to capture the body
        if response.status_code >= 400:
            # Create a new response to capture body
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk
            
            try:
                error_detail = json.loads(response_body.decode())
                logger.error(f"Error Response: {json.dumps(error_detail, indent=2)}")
            except:
                logger.error(f"Error Response (raw): {response_body.decode()[:500]}")
            
            # Return new response with captured body
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        return response
        
    except Exception as e:
        # Log any exceptions
        duration = time.time() - start_time
        logger.error(f"=== EXCEPTION ===")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error(f"Duration: {duration:.3f}s")
        
        # Return error response
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Internal server error: {str(e)}",
                "type": type(e).__name__
            }
        )
EOF

# Update main.py to include the logging middleware
echo ""
echo "Adding logging middleware to FastAPI app..."

# Create a backup
cp /opt/carcollection/backend/app/main.py /opt/carcollection/backend/app/main.py.backup

# Add the import and middleware
python3 << 'EOF'
import sys
sys.path.insert(0, '/opt/carcollection/backend')

# Read the current main.py
with open('/opt/carcollection/backend/app/main.py', 'r') as f:
    content = f.read()

# Check if logging middleware is already added
if 'logging_middleware' not in content:
    # Find where to add the import
    import_line = "from app.logging_middleware import log_requests\n"
    
    # Add after other imports
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('from app.') and 'import' in line:
            lines.insert(i + 1, import_line)
            break
    
    # Add middleware after app creation
    for i, line in enumerate(lines):
        if 'app = FastAPI' in line:
            # Find the closing parenthesis
            j = i
            while j < len(lines) and ')' not in lines[j]:
                j += 1
            lines.insert(j + 1, '\n# Add request logging middleware\napp.middleware("http")(log_requests)')
            break
    
    # Write back
    with open('/opt/carcollection/backend/app/main.py', 'w') as f:
        f.write('\n'.join(lines))
    
    print("✓ Logging middleware added to main.py")
else:
    print("✓ Logging middleware already present")
EOF

# Set permissions
chown carcollection:carcollection /opt/carcollection/backend/app/logging_middleware.py
chown carcollection:carcollection /opt/carcollection/backend/app/main.py

echo ""
echo "Restarting backend service..."
systemctl restart carcollection-backend

sleep 3

echo ""
echo "Checking service status..."
if systemctl is-active --quiet carcollection-backend; then
    echo "✓ Backend service is running with enhanced logging"
else
    echo "✗ Backend service failed to start"
    echo "Restoring backup..."
    mv /opt/carcollection/backend/app/main.py.backup /opt/carcollection/backend/app/main.py
    systemctl restart carcollection-backend
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Now you can:"
echo "1. Try to add a new car or create a user"
echo "2. Check the logs with: sudo journalctl -u carcollection-backend -f"
echo "3. Or use the debug script: ./debug-api-errors.sh"
echo ""
echo "The logs will show:"
echo "- All incoming requests with headers and body"
echo "- Response status codes and errors"
echo "- Full exception tracebacks"
echo "- Request processing time"