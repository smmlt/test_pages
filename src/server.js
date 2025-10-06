const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const app = express();

// Basic trust proxy off by default; can be enabled via env
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

// Simple JSON pretty printing in development
app.set('json spaces', process.env.NODE_ENV === 'development' ? 2 : 0);

// Health check endpoint (liveness)
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Utility to build time payload
function getTimePayload() {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const offsetMin = -now.getTimezoneOffset(); // minutes east of UTC
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const utcOffset = `${sign}${hh}:${mm}`;
    return {
        iso: now.toISOString(),
        epochMillis: now.getTime(),
        timezone: tz,
        utcOffset,
    };
}

// Main API endpoint for server time
app.get('/api/v1/time', (req, res) => {
    res.status(200).json(getTimePayload());
});

// Serve OpenAPI JSON
const openapiPath = path.join(__dirname, 'openapi.json');
let openapiDoc = null;
try {
    openapiDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
} catch (e) {
    // leave null; /docs will 404 gracefully if spec missing
}

// Serve the raw spec for easy access
app.get('/openapi.json', (req, res) => {
    if (!fs.existsSync(openapiPath)) {
        return res.status(404).json({ error: 'OpenAPI spec not found' });
    }
    res.sendFile(openapiPath);
});

// Swagger UI (if spec is available)
if (openapiDoc) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, {
        explorer: true,
    }));
}

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on http://localhost:${PORT}`);
        if (openapiDoc) {
            // eslint-disable-next-line no-console
            console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
        }
    });
}

module.exports = app;