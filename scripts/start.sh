#!/bin/bash

# Default port
PORT=${1:-8000}

# Function to stop existing process on the port
stop_existing_python_on_port() {
    local target_port=$1
    local pid=$(lsof -t -i:$target_port)

    if [ -z "$pid" ]; then
        return
    fi

    # Check if it's a python process
    local proc_name=$(ps -p $pid -o comm=)
    if [[ $proc_name == python* ]]; then
        echo "Stopping old Python server on port $target_port (PID: $pid)..."
        kill -9 $pid
        sleep 0.4
    else
        echo "Port $target_port is already used by process '$proc_name' (PID: $pid)."
        echo "Please free the port or run: ./start.sh 8001"
        exit 1
    fi
}

# Change to the dashboard directory if we are not in it
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/.."

# Install dependencies if needed (optional, but good for first run)
# pip install -r requirements.txt

if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
    if [ ! -d node_modules ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    echo "Building frontend assets..."
    npm run build
fi

stop_existing_python_on_port $PORT

echo "Starting Dashboard server on http://localhost:$PORT"
echo "Tip: open http://localhost:$PORT/api/health to verify backend version"

python3 scripts/app.py --port $PORT
