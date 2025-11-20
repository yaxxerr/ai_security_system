#!/bin/bash
echo "Starting Django server with ASGI/WebSocket support..."
echo ""
daphne -b 127.0.0.1 -p 8000 backend.asgi:application

