#!/usr/bin/env bash
# Rolemaster PWA — Local development server
# Launches a local HTTP server and opens the browser

PORT=8080

# Check if port is already in use
if lsof -i :"$PORT" >/dev/null 2>&1 || ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
    echo "Port $PORT in use, trying 8081..."
    PORT=8081
fi

echo ""
echo "  ========================================"
echo "  Rolemaster PWA - Dev Server"
echo "  http://localhost:$PORT"
echo "  ========================================"
echo ""
echo "  Press Ctrl+C to stop the server."
echo ""

# Open browser
if command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:$PORT" &
elif command -v open &>/dev/null; then
    open "http://localhost:$PORT" &
fi

# Try Python 3 first, then Python 2, then npx
if command -v python3 &>/dev/null; then
    python3 -m http.server "$PORT"
elif command -v python &>/dev/null; then
    python -m http.server "$PORT"
elif command -v npx &>/dev/null; then
    npx serve -l "$PORT"
else
    echo "ERROR: No HTTP server found. Install Python or Node.js."
    exit 1
fi
