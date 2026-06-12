const { spawn } = require('child_process');
const path = require('path');

// Start the backend server
const backend = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

// Start the frontend server
const frontend = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit();
});

console.log('Both servers are running...');
console.log('Backend: http://localhost:5001');
console.log('Frontend: http://localhost:5000');
console.log('Press Ctrl+C to stop both servers.');