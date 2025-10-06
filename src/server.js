/*
 Simple server that returns current server date/time and exposes Swagger UI docs.
*/

const express = require('express');
const os = require('os');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');

const app = express();

// Basic middleware
app.disable('x-powered-by');

// Health endpoint (optional but useful)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Time endpoint
app.get('/api/time', (req, res) => {
    const now = new Date();

    // Timezone offset in minutes, convert to "+HH:MM" format
    const tzMinutes = -now.getTimezoneOffset();
    const sign = tzMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(tzMinutes);
    const tz = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;

    const payload = {
        iso: new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().replace('Z', tz),
        utc: now.toUTCString(),
        epochMs: now.getTime(),
        timezone: tz,
        server: {
            hostname: os.hostname(),
            env: process.env.NODE_ENV || 'production'
        }
    };

    res.json(payload);
});

// Serve raw OpenAPI JSON and Swagger UI
app.get('/api-docs.json', (_req, res) => {
    res.json(openapiSpec);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'Server Time API Docs',
}));

// Redirect root to docs for convenience
app.get('/', (_req, res) => res.redirect('/docs'));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server Time API listening on http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
    server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);