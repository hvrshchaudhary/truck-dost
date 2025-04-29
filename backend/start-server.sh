#!/bin/bash

# Display header
echo "==============================================="
echo "      Starting Truck-Dost Backend Server      "
echo "==============================================="

# Function to clean up port
cleanup_port() {
  local PORT=$1
  echo "Cleaning up port $PORT..."
  
  # For macOS (lsof approach)
  if command -v lsof &> /dev/null; then
    local PIDS=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
      echo "Found processes using port $PORT: $PIDS"
      for PID in $PIDS; do
        echo "Killing process $PID..."
        kill -9 $PID 2>/dev/null
      done
      echo "Killed all processes using port $PORT"
    else
      echo "No processes found using port $PORT"
    fi
  # For Linux/Windows (alternative approaches)
  elif command -v netstat &> /dev/null && command -v grep &> /dev/null; then
    # Find PIDs using netstat (works on many systems)
    local PIDS=$(netstat -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d/ -f1 | grep -v '^$')
    if [ -n "$PIDS" ]; then
      echo "Found processes using port $PORT: $PIDS"
      for PID in $PIDS; do
        echo "Killing process $PID..."
        kill -9 $PID 2>/dev/null
      done
      echo "Killed all processes using port $PORT"
    else
      echo "No processes found using port $PORT"
    fi
  else
    echo "Warning: Could not find appropriate tools to check port usage"
  fi
  
  # Wait a moment to ensure processes are terminated
  sleep 1
}

# Array of ports to clean up
PORTS=(5001 5002 5003)

# Cleanup all potential ports
for PORT in "${PORTS[@]}"; do
  cleanup_port $PORT
done

# Ensure MongoDB is running (optional check)
if command -v mongod &> /dev/null; then
  echo "Checking if MongoDB is running..."
  if ! pgrep mongod > /dev/null; then
    echo "Warning: MongoDB does not appear to be running."
    echo "You might need to start MongoDB manually."
  else
    echo "MongoDB is running."
  fi
fi

# Check for required environment variables
if [ ! -f .env ]; then
  echo "Warning: .env file not found. Creating a sample one..."
  echo "JWT_SECRET=temporarysecret123456789" > .env
  echo "MONGODB_URI=mongodb://localhost:27017/truckdost" >> .env
  echo "Created sample .env file. Please update with proper values."
fi

# Check for NPM and install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Node modules not found. Installing dependencies..."
  npm install
fi

# Function to verify server is running
verify_server() {
  local PORT=$1
  local MAX_ATTEMPTS=10
  local ATTEMPT=1
  local SERVER_UP=false
  
  echo "Verifying server is running on port $PORT..."
  
  while [ $ATTEMPT -le $MAX_ATTEMPTS ] && [ "$SERVER_UP" = false ]; do
    echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    
    # Try to connect to the server
    if command -v curl &> /dev/null; then
      if curl -s http://localhost:$PORT >/dev/null; then
        SERVER_UP=true
        echo "  Success! Server is running on port $PORT"
      fi
    elif command -v wget &> /dev/null; then
      if wget -q --spider http://localhost:$PORT >/dev/null; then
        SERVER_UP=true
        echo "  Success! Server is running on port $PORT"
      fi
    else
      # No curl or wget, try a basic TCP connection with timeout
      if (echo > /dev/tcp/localhost/$PORT) >/dev/null 2>&1; then
        SERVER_UP=true
        echo "  Success! Server is running on port $PORT"
      fi
    fi
    
    if [ "$SERVER_UP" = false ]; then
      sleep 1
      ATTEMPT=$((ATTEMPT+1))
    fi
  done
  
  return $([ "$SERVER_UP" = true ])
}

# Start the server with auto-restart on failure
echo "Starting backend server..."
MAX_RESTARTS=3
RESTART_COUNT=0

start_server() {
  # Run server in the background
  node server.js &
  SERVER_PID=$!
  
  # Wait a moment for server to start
  sleep 2
  
  # Check if server started on main port or fallback
  if verify_server 5001; then
    echo "Server started successfully on port 5001"
    wait $SERVER_PID
  elif verify_server 5002; then
    echo "Server started successfully on fallback port 5002"
    wait $SERVER_PID
  elif verify_server 5003; then
    echo "Server started successfully on fallback port 5003"
    wait $SERVER_PID
  else
    echo "Failed to verify server startup on any port"
    kill -9 $SERVER_PID 2>/dev/null
    return 1
  fi
}

until start_server || [ $RESTART_COUNT -ge $MAX_RESTARTS ]; do
  RESTART_COUNT=$((RESTART_COUNT+1))
  echo "Server crashed. Attempt $RESTART_COUNT of $MAX_RESTARTS to restart..."
  sleep 2
  # Try to clean up ports again before restarting
  for PORT in "${PORTS[@]}"; do
    cleanup_port $PORT
  done
done

if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
  echo "Server failed to start after $MAX_RESTARTS attempts."
  echo "Please check logs for errors."
  exit 1
fi

# This will only execute if the server exits normally
echo "Server has stopped." 