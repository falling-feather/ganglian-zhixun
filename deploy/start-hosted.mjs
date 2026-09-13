// The original process supervisor owns the API and preview server and shuts both down.
process.env.DEMO_WEB_PORT=process.env.PORT??'4173';
process.env.WEB_ALLOWED_ORIGINS??=process.env.RENDER_EXTERNAL_URL??'';
process.env.DEMO_REUSE_DATA='1';
process.argv.push('--reuse-data');
await import('../scripts/run-demo-stack.mjs');
