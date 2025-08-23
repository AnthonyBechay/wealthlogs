#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    WealthLog Quick Setup Script                               ║
# ║                    One-command setup for new developers                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Welcome to WealthLog Development Setup!              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm installed: $NPM_VERSION${NC}"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed!${NC}"
    echo "Please install Git from https://git-scm.com/"
    exit 1
else
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✅ Git installed: $GIT_VERSION${NC}"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✅ PostgreSQL installed: $PSQL_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL not found. You'll need to install it or use Docker.${NC}"
fi

echo ""
echo -e "${YELLOW}🔧 Setting up configuration...${NC}"

# Create config from example if not exists
if [ ! -f "scripts/config.env" ]; then
    if [ -f "scripts/config.env.example" ]; then
        cp scripts/config.env.example scripts/config.env
        echo -e "${GREEN}✅ Created config.env from example${NC}"
    else
        echo -e "${RED}❌ config.env.example not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ config.env already exists${NC}"
fi

# Ask for database setup preference
echo ""
echo -e "${YELLOW}🗄️  Database Setup${NC}"
echo "Choose your database setup method:"
echo "1) Local PostgreSQL (requires PostgreSQL installed)"
echo "2) Docker PostgreSQL (requires Docker)"
echo "3) Manual setup (I'll configure it myself)"
read -p "Enter choice (1-3): " db_choice

case $db_choice in
    1)
        echo -e "${BLUE}Setting up local PostgreSQL...${NC}"
        
        # Get database credentials
        read -p "Enter PostgreSQL username (default: wealthlog_user): " db_user
        db_user=${db_user:-wealthlog_user}
        
        read -sp "Enter PostgreSQL password (default: dev_password123): " db_pass
        echo ""
        db_pass=${db_pass:-dev_password123}
        
        # Create database and user
        echo -e "${YELLOW}Creating database and user...${NC}"
        sudo -u postgres psql <<EOF
CREATE USER $db_user WITH PASSWORD '$db_pass';
CREATE DATABASE wealthlog OWNER $db_user;
GRANT ALL PRIVILEGES ON DATABASE wealthlog TO $db_user;
\q
EOF
        
        # Update config
        sed -i "s/DB_USERNAME=.*/DB_USERNAME=\"$db_user\"/" scripts/config.env
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=\"$db_pass\"/" scripts/config.env
        
        echo -e "${GREEN}✅ Database configured successfully${NC}"
        ;;
        
    2)
        echo -e "${BLUE}Setting up Docker PostgreSQL...${NC}"
        
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ Docker is not installed!${NC}"
            echo "Please install Docker from https://www.docker.com/"
            exit 1
        fi
        
        # Start PostgreSQL container
        docker run -d \
            --name wealthlog-postgres \
            -e POSTGRES_USER=wealthlog_user \
            -e POSTGRES_PASSWORD=dev_password123 \
            -e POSTGRES_DB=wealthlog \
            -p 5432:5432 \
            postgres:15-alpine
        
        echo -e "${GREEN}✅ PostgreSQL container started${NC}"
        ;;
        
    3)
        echo -e "${YELLOW}Manual setup selected. Please configure your database in scripts/config.env${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Make maintain.sh executable
chmod +x scripts/maintain.sh

# Run initialization
./scripts/maintain.sh init

echo ""
echo -e "${YELLOW}🏗️  Setting up database schema...${NC}"

# Setup database
./scripts/maintain.sh db:setup

echo ""
echo -e "${YELLOW}🧪 Running initial tests...${NC}"

# Run tests
./scripts/maintain.sh test

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🎉 Setup Complete! Your development environment       ║${NC}"
echo -e "${GREEN}║                    is ready to use!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📚 Quick Start Commands:${NC}"
echo -e "  ${YELLOW}./scripts/maintain.sh dev${NC}     - Start all services"
echo -e "  ${YELLOW}./scripts/maintain.sh test${NC}    - Run tests"
echo -e "  ${YELLOW}./scripts/maintain.sh doctor${NC}  - Check system health"
echo -e "  ${YELLOW}./scripts/maintain.sh help${NC}    - Show all commands"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo -e "  Frontend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend:   ${GREEN}http://localhost:5000${NC}"
echo -e "  Database:  ${GREEN}./scripts/maintain.sh db:studio${NC}"
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo -e "  README:    ${GREEN}./README.md${NC}"
echo -e "  Scripts:   ${GREEN}./scripts/README.md${NC}"
echo -e "  Docs:      ${GREEN}./docs/${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Start developing with: ./scripts/maintain.sh dev${NC}"