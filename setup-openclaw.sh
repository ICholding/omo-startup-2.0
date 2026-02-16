#!/usr/bin/env bash
#
# OpenClaw Setup Script for omo-startup-2.0
# Automates the configuration and startup of OpenClaw integration
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.openclaw.yml"
ENV_FILE="$SCRIPT_DIR/.env.openclaw"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  OpenClaw + omo-startup-2.0 Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    local deps=("docker" "docker-compose")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            echo -e "${RED}Error: $dep is not installed${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✓ All dependencies installed${NC}"
    echo ""
}

# Setup environment file
setup_environment() {
    echo -e "${BLUE}Setting up environment...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}Creating .env.openclaw from example...${NC}"
        cp "$SCRIPT_DIR/.env.openclaw.example" "$ENV_FILE"
        
        # Generate secure token
        TOKEN=$(openssl rand -hex 32)
        
        # Update token in env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^OPENCLAW_GATEWAY_TOKEN=.*/OPENCLAW_GATEWAY_TOKEN=$TOKEN/" "$ENV_FILE"
        else
            sed -i "s/^OPENCLAW_GATEWAY_TOKEN=.*/OPENCLAW_GATEWAY_TOKEN=$TOKEN/" "$ENV_FILE"
        fi
        
        echo -e "${GREEN}✓ Environment file created${NC}"
        echo -e "${YELLOW}⚠ Please edit $ENV_FILE to add your API keys${NC}"
    else
        echo -e "${GREEN}✓ Environment file already exists${NC}"
    fi
    
    echo ""
}

# Pull latest images
pull_images() {
    echo -e "${BLUE}Pulling Docker images...${NC}"
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    echo -e "${GREEN}✓ Images pulled${NC}"
    echo ""
}

# Start services
start_services() {
    echo -e "${BLUE}Starting OpenClaw services...${NC}"
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    echo -e "${GREEN}✓ Services started${NC}"
    echo ""
}

# Wait for health check
wait_for_health() {
    echo -e "${BLUE}Waiting for OpenClaw gateway to be ready...${NC}"
    
    local retries=30
    local count=0
    
    while [ $count -lt $retries ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T openclaw-gateway curl -sf http://localhost:18789/health &>/dev/null; then
            echo -e "${GREEN}✓ Gateway is healthy${NC}"
            echo ""
            return 0
        fi
        
        count=$((count + 1))
        echo -n "."
        sleep 2
    done
    
    echo -e "${RED}✗ Gateway failed to become healthy${NC}"
    echo ""
    return 1
}

# Setup WhatsApp
setup_whatsapp() {
    echo -e "${BLUE}Setup WhatsApp?${NC}"
    read -p "Do you want to configure WhatsApp now? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Starting WhatsApp setup...${NC}"
        echo -e "${YELLOW}Please scan the QR code with your WhatsApp app${NC}"
        echo ""
        
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm openclaw-cli channels login
    fi
    
    echo ""
}

# Setup Telegram
setup_telegram() {
    echo -e "${BLUE}Setup Telegram?${NC}"
    read -p "Do you want to configure Telegram now? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your Telegram Bot Token (from @BotFather): " BOT_TOKEN
        
        if [ -n "$BOT_TOKEN" ]; then
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm openclaw-cli channels add \
                --channel telegram \
                --token "$BOT_TOKEN"
            
            echo -e "${GREEN}✓ Telegram configured${NC}"
        fi
    fi
    
    echo ""
}

# Show status
show_status() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Setup Complete!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${GREEN}Services:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    echo -e "${GREEN}Endpoints:${NC}"
    echo "  - OpenClaw Gateway: http://localhost:18789"
    echo "  - OpenClaw Bridge:  http://localhost:18790"
    echo "  - OpenClaw Canvas:  http://localhost:18793"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  View logs:  docker-compose -f docker-compose.openclaw.yml logs -f"
    echo "  Stop:       docker-compose -f docker-compose.openclaw.yml down"
    echo "  CLI:        docker-compose -f docker-compose.openclaw.yml run --rm openclaw-cli"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Configure additional channels if needed"
    echo "  2. Update omo-startup-2.0 backend to use OpenClaw API"
    echo "  3. Test the integration"
    echo ""
}

# Main execution
main() {
    check_dependencies
    setup_environment
    pull_images
    start_services
    
    if wait_for_health; then
        setup_whatsapp
        setup_telegram
        show_status
    else
        echo -e "${RED}Setup completed with warnings. Check logs for issues.${NC}"
        docker-compose -f "$COMPOSE_FILE" logs --tail=50 openclaw-gateway
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --status       Show service status"
        echo "  --stop         Stop OpenClaw services"
        echo "  --logs         View service logs"
        echo "  --cli          Open CLI interface"
        echo ""
        exit 0
        ;;
    --status)
        docker-compose -f "$COMPOSE_FILE" ps
        exit 0
        ;;
    --stop)
        echo -e "${BLUE}Stopping OpenClaw services...${NC}"
        docker-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}✓ Services stopped${NC}"
        exit 0
        ;;
    --logs)
        docker-compose -f "$COMPOSE_FILE" logs -f
        exit 0
        ;;
    --cli)
        docker-compose -f "$COMPOSE_FILE" run --rm openclaw-cli
        exit 0
        ;;
    *)
        main
        ;;
esac
