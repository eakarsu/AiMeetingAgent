#!/bin/bash

# AI Meeting Agent - Start Script
# This script will:
# 1. Clean up used ports (3000 and 3001)
# 2. Start PostgreSQL (if using Docker)
# 3. Install dependencies
# 4. Set up database and seed data
# 5. Start both backend and frontend

set -e

echo "🚀 AI Meeting Agent - Starting..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup ports
cleanup_ports() {
    echo -e "${YELLOW}🧹 Cleaning up ports 3000 and 3001...${NC}"

    # Kill processes on port 3000 (frontend)
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "   Killing process on port 3000..."
        kill -9 $(lsof -ti:3000) 2>/dev/null || true
    fi

    # Kill processes on port 3001 (backend)
    if lsof -ti:3001 > /dev/null 2>&1; then
        echo "   Killing process on port 3001..."
        kill -9 $(lsof -ti:3001) 2>/dev/null || true
    fi

    echo -e "${GREEN}   ✓ Ports cleaned up${NC}"
}

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}🐘 Checking PostgreSQL...${NC}"

    # Check if PostgreSQL is running via pg_isready
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
            echo -e "${GREEN}   ✓ PostgreSQL is running${NC}"
            return 0
        fi
    fi

    # Check if Docker is available and try to start PostgreSQL container
    if command -v docker &> /dev/null; then
        echo "   Starting PostgreSQL via Docker..."

        # Check if container already exists
        if docker ps -a --format '{{.Names}}' | grep -q '^ai-meeting-postgres$'; then
            docker start ai-meeting-postgres 2>/dev/null || true
        else
            # Create new PostgreSQL container
            docker run -d \
                --name ai-meeting-postgres \
                -e POSTGRES_USER=postgres \
                -e POSTGRES_PASSWORD=postgres \
                -e POSTGRES_DB=ai_meeting_agent \
                -p 5432:5432 \
                postgres:15-alpine
        fi

        # Wait for PostgreSQL to be ready
        echo "   Waiting for PostgreSQL to be ready..."
        sleep 5

        for i in {1..30}; do
            if docker exec ai-meeting-postgres pg_isready -U postgres > /dev/null 2>&1; then
                echo -e "${GREEN}   ✓ PostgreSQL is ready${NC}"
                return 0
            fi
            sleep 1
        done

        echo -e "${RED}   ✗ PostgreSQL failed to start${NC}"
        return 1
    fi

    echo -e "${RED}   ✗ PostgreSQL is not running and Docker is not available${NC}"
    echo "   Please start PostgreSQL manually or install Docker"
    return 1
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"

    # Install backend dependencies
    echo "   Installing backend dependencies..."
    cd backend
    npm install
    cd ..

    # Install frontend dependencies
    echo "   Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..

    echo -e "${GREEN}   ✓ Dependencies installed${NC}"
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}🗄️  Setting up database...${NC}"

    cd backend

    # Generate Prisma client
    echo "   Generating Prisma client..."
    npx prisma generate

    # Push schema to database
    echo "   Pushing schema to database..."
    npx prisma db push --force-reset

    # Seed the database
    echo "   Seeding database with 15+ items per feature..."
    npm run db:seed

    cd ..

    echo -e "${GREEN}   ✓ Database setup complete${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🎯 Starting services...${NC}"

    # Start backend in background
    echo "   Starting backend on port 3001..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..

    # Wait for backend to start
    sleep 3

    # Start frontend in background
    echo "   Starting frontend on port 3000..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo -e "${GREEN}=================================="
    echo "🎉 AI Meeting Agent is running!"
    echo "==================================${NC}"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:3001"
    echo ""
    echo -e "${YELLOW}Demo Credentials:${NC}"
    echo "   Email:    demo@aimeetingagent.com"
    echo "   Password: demo123"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""

    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down...${NC}"
    cleanup_ports
    echo -e "${GREEN}✓ Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
main() {
    # Change to project directory
    cd "$(dirname "$0")"

    # Check for .env file and copy to backend
    if [ -f ".env" ]; then
        cp .env backend/.env
        echo -e "${GREEN}   ✓ Copied root .env to backend${NC}"
    elif [ ! -f "backend/.env" ]; then
        echo -e "${RED}Error: .env file not found!${NC}"
        echo "Please create a .env file with your configuration."
        echo ""
        echo "Example .env content:"
        echo "  DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/ai_meeting_agent\""
        echo "  JWT_SECRET=\"your-secret-key\""
        echo "  OPENROUTER_API_KEY=\"your-openrouter-api-key\""
        exit 1
    fi

    # Run setup steps
    cleanup_ports
    check_postgres
    install_deps
    setup_database
    start_services
}

# Run main function
main
