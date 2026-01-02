#!/usr/bin/env node
/**
 * Export Workflows from EspoCRM
 * 
 * Usage: 
 *   node export-workflows.js --env=prod    # Use production settings from .env
 *   node export-workflows.js --env=dev     # Use dev settings from .env
 *   node export-workflows.js --url=http://localhost:8080 --user=admin --password=pass
 * 
 * Environment variables:
 *   ESPO_PROD_URL, ESPO_PROD_USER, ESPO_PROD_PASSWORD  - Production settings
 *   ESPO_DEV_URL, ESPO_DEV_USER, ESPO_DEV_PASSWORD    - Development settings
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load .env file if exists
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match && !process.env[match[1].trim()]) {
                process.env[match[1].trim()] = match[2].trim();
            }
        });
    }
}

// Parse command line arguments
function parseArgs() {
    loadEnv();
    
    const args = {
        url: null,
        user: null,
        password: null,
        env: null
    };

    process.argv.slice(2).forEach(arg => {
        const match = arg.match(/^--([a-zA-Z-]+)=(.+)$/);
        if (match) {
            const key = match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            args[key] = match[2];
        }
    });

    // Apply environment preset
    if (args.env === 'prod' || args.env === 'production') {
        args.url = args.url || process.env.ESPO_PROD_URL;
        args.user = args.user || process.env.ESPO_PROD_USER;
        args.password = args.password || process.env.ESPO_PROD_PASSWORD;
    } else if (args.env === 'dev' || args.env === 'development') {
        args.url = args.url || process.env.ESPO_DEV_URL;
        args.user = args.user || process.env.ESPO_DEV_USER;
        args.password = args.password || process.env.ESPO_DEV_PASSWORD;
    }

    // Fallback to generic env vars
    args.url = args.url || process.env.ESPO_URL || 'http://localhost:8080';
    args.user = args.user || process.env.ESPO_USER;
    args.password = args.password || process.env.ESPO_PASSWORD;

    return args;
}

// Make API request
async function apiRequest(baseUrl, endpoint, headers = {}, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, baseUrl);
        const client = url.protocol === 'https:' ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers
            }
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`API Error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// Authenticate and get auth token
async function authenticate(baseUrl, username, password) {
    console.log('Authenticating...');
    
    const authString = Buffer.from(`${username}:${password}`).toString('base64');
    
    try {
        const response = await apiRequest(
            baseUrl,
            '/api/v1/App/user',
            { 'Espo-Authorization': authString },
            'GET'
        );
        
        if (response && response.token) {
            console.log('Authentication successful!');
            return response.token;
        }
        
        return authString;
    } catch (error) {
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

// Fields to exclude from export
const EXCLUDE_FIELDS = [
    'createdAt', 'modifiedAt', 'createdById', 'createdByName',
    'modifiedById', 'modifiedByName'
];

function cleanForExport(entity) {
    const cleaned = { ...entity };
    EXCLUDE_FIELDS.forEach(field => delete cleaned[field]);
    return cleaned;
}

async function main() {
    const args = parseArgs();
    const outputDir = path.join(__dirname, '..', 'workflows');

    console.log('EspoCRM Workflow Export');
    console.log('=======================');
    console.log(`URL: ${args.url}`);
    console.log(`User: ${args.user}`);
    console.log(`Output: ${outputDir}`);
    console.log('');

    if (!args.user || !args.password) {
        console.error('Error: Username and password are required.');
        console.error('Usage: node export-workflows.js --url=URL --user=USER --password=PASS');
        process.exit(1);
    }

    let authToken;
    try {
        authToken = await authenticate(args.url, args.user, args.password);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }

    const authHeaders = {
        'Espo-Authorization': authToken
    };

    try {
        console.log('Fetching workflows...');
        const response = await apiRequest(
            args.url,
            '/api/v1/Workflow?maxSize=500&orderBy=name',
            authHeaders
        );

        if (!response.list || response.list.length === 0) {
            console.log('No workflows found.');
            return;
        }

        console.log(`Found ${response.list.length} workflows.`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const manifest = {
            exportedAt: new Date().toISOString(),
            source: args.url,
            count: response.list.length,
            workflows: []
        };

        for (const workflow of response.list) {
            const fullWorkflow = await apiRequest(
                args.url,
                `/api/v1/Workflow/${workflow.id}`,
                authHeaders
            );

            const cleaned = cleanForExport(fullWorkflow);
            const filename = `${workflow.id}.json`;
            const filepath = path.join(outputDir, filename);

            fs.writeFileSync(filepath, JSON.stringify(cleaned, null, 2));

            manifest.workflows.push({
                id: workflow.id,
                name: workflow.name,
                entityType: workflow.entityType,
                type: workflow.type,
                isActive: workflow.isActive,
                file: filename
            });

            const status = workflow.isActive ? '🟢' : '⚪';
            console.log(`  ${status} ${workflow.name} (${workflow.entityType})`);
        }

        const manifestPath = path.join(outputDir, '_manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        console.log('');
        console.log(`Export complete! ${response.list.length} workflows saved to ${outputDir}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
