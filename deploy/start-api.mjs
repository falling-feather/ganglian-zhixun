// The reverse proxy serves the built web files; this process owns only the API.
process.env.NODE_ENV ??= 'production';
process.env.HOST ??= '0.0.0.0';
process.env.PORT ??= '3001';
process.env.DATA_DIR ??= process.env.DEMO_DATA_DIR ?? '/data/runtime';
process.env.STARTUP_RECOVERY_MODE ??= 'blocking';
await import('../apps/api/dist/main.js');
