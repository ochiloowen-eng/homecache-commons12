const { spawn } = require('child_process');

const isWindows = process.platform === 'win32';
const npmCmd = 'npm';

function run(name, args) {
  let child;
  try {
    child = spawn(npmCmd, args, {
      stdio: 'inherit',
      env: process.env,
      shell: isWindows,
    });
  } catch (err) {
    console.error(`${name} failed to start:`, err.message);
    process.exitCode = 1;
    return null;
  }

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
  if (server && !server.killed) {
    server.kill();
  }
  if (client && !client.killed) {
    client.kill();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
