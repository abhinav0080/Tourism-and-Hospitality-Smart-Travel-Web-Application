const { spawn } = require('node:child_process');
const env = { ...process.env, PORT: '3000', BROWSER: 'none' };
const backend = spawn(process.execPath, ['server.js'], { stdio: 'inherit', env: { ...process.env, PORT: process.env.API_PORT || '5001' } });
const frontend = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['start'], { stdio: 'inherit', env });
let closing = false;
function shutdown() { if (closing) return; closing = true; backend.kill(); frontend.kill(); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
backend.on('exit', shutdown);
frontend.on('exit', shutdown);
console.log('API: http://localhost:5001 • React UI: http://localhost:3000');
