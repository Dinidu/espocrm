#!/bin/bash
#
# Docker entrypoint script to import reports and workflows on startup
# This script waits for EspoCRM to be ready, then imports data from JSON files
#

set -e

ESPO_URL="${ESPO_URL:-http://localhost:80}"
ESPO_USER="${ESPO_ADMIN_USERNAME:-admin}"
ESPO_PASSWORD="${ESPO_ADMIN_PASSWORD:-admin123}"
SCRIPTS_DIR="/var/www/html/data/scripts"
REPORTS_DIR="/var/www/html/data/reports"
WORKFLOWS_DIR="/var/www/html/data/workflows"

# Wait for EspoCRM to be ready
wait_for_espocrm() {
    echo "Waiting for EspoCRM to be ready..."
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "${ESPO_URL}/api/v1/App/user" \
            -H "Authorization: Basic $(echo -n "${ESPO_USER}:${ESPO_PASSWORD}" | base64)" \
            -H "Content-Type: application/json" > /dev/null 2>&1; then
            echo "EspoCRM is ready!"
            return 0
        fi
        echo "  Attempt $attempt/$max_attempts - waiting..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "ERROR: EspoCRM did not become ready in time"
    return 1
}

# Import reports if directory has JSON files
import_reports() {
    if [ -d "$REPORTS_DIR" ]; then
        local json_count=$(find "$REPORTS_DIR" -maxdepth 1 -name "*.json" ! -name "_*" 2>/dev/null | wc -l)
        if [ "$json_count" -gt 0 ]; then
            echo ""
            echo "========================================="
            echo "Importing Reports..."
            echo "========================================="
            cd "$SCRIPTS_DIR"
            node import-reports.js --url="$ESPO_URL" --user="$ESPO_USER" --password="$ESPO_PASSWORD"
        else
            echo "No report JSON files found. Skipping report import."
        fi
    else
        echo "Reports directory not found. Skipping report import."
    fi
}

# Import workflows if directory has JSON files
import_workflows() {
    if [ -d "$WORKFLOWS_DIR" ]; then
        local json_count=$(find "$WORKFLOWS_DIR" -maxdepth 1 -name "*.json" ! -name "_*" 2>/dev/null | wc -l)
        if [ "$json_count" -gt 0 ]; then
            echo ""
            echo "========================================="
            echo "Importing Workflows..."
            echo "========================================="
            cd "$SCRIPTS_DIR"
            node import-workflows.js --url="$ESPO_URL" --user="$ESPO_USER" --password="$ESPO_PASSWORD"
        else
            echo "No workflow JSON files found. Skipping workflow import."
        fi
    else
        echo "Workflows directory not found. Skipping workflow import."
    fi
}

main() {
    echo ""
    echo "========================================="
    echo "EspoCRM Data Import Script"
    echo "========================================="
    echo "URL: $ESPO_URL"
    echo "User: $ESPO_USER"
    echo ""
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo "ERROR: Node.js is not installed. Cannot run import scripts."
        exit 1
    fi
    
    # Wait for EspoCRM
    if ! wait_for_espocrm; then
        echo "Skipping import due to EspoCRM not being ready."
        exit 1
    fi
    
    # Import data
    import_reports
    import_workflows
    
    echo ""
    echo "========================================="
    echo "Data import complete!"
    echo "========================================="
}

main "$@"

