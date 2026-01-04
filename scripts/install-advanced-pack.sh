#!/bin/bash
#
# Quick script to install Advanced Pack extension
# Usage: ./scripts/install-advanced-pack.sh [docker|local]
#

set -e

MODE=${1:-docker}
EXTENSION_FILE="extensions/advanced-pack-3.11.12.zip"

if [ ! -f "$EXTENSION_FILE" ]; then
    echo "Error: Extension file not found: $EXTENSION_FILE"
    exit 1
fi

if [ "$MODE" = "docker" ]; then
    echo "Installing Advanced Pack via Docker..."
    echo ""
    
    # Check if container is running
    if ! docker ps | grep -q espocrm; then
        echo "Error: EspoCRM container is not running"
        echo "Start it with: docker compose up -d"
        exit 1
    fi
    
    # Copy extension to container
    echo "Copying extension to container..."
    docker cp "$EXTENSION_FILE" espocrm:/var/www/html/extensions/
    
    # Install via CLI
    echo "Installing extension..."
    docker exec espocrm php command.php extension --file="extensions/advanced-pack-3.11.12.zip"
    
    # Rebuild
    echo "Rebuilding..."
    docker exec espocrm php command.php rebuild
    
    echo ""
    echo "✓ Advanced Pack installed successfully!"
    echo ""
    echo "Verify installation:"
    echo "  docker exec espocrm php command.php extension --list"
    
elif [ "$MODE" = "local" ]; then
    echo "Installing Advanced Pack locally..."
    echo ""
    
    if [ ! -f "bootstrap.php" ]; then
        echo "Error: Not in EspoCRM root directory"
        exit 1
    fi
    
    # Install via CLI
    php command.php extension --file="$EXTENSION_FILE"
    
    # Rebuild
    php command.php rebuild
    
    echo ""
    echo "✓ Advanced Pack installed successfully!"
    echo ""
    echo "Verify installation:"
    echo "  php command.php extension --list"
    
else
    echo "Usage: $0 [docker|local]"
    echo ""
    echo "  docker  - Install in running Docker container (default)"
    echo "  local   - Install in local EspoCRM installation"
    exit 1
fi

