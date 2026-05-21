const { spawn } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name, args) {
  const child = spawn(npmCmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });

  child.on('error', (err) => {
    console.error(`${name} failed to start:`, err.message);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  return child;
}

const server = run('server', ['run', 'server']);
const client = run('client', ['run', 'start:client']);

function shutdown() {
  if (!server.killed) {
    server.kill();
  }
  if (!client.killed) {
    client.kill();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
