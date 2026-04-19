import { spawn } from 'child_process';
import { once } from 'events';

const API_HEALTH_URL = 'http://localhost:5001/health';
const SERVER_START_TIMEOUT_MS = 30000;
const HEALTH_POLL_INTERVAL_MS = 750;

async function waitForHealth(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Keep polling while the server starts.
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_INTERVAL_MS));
  }

  return false;
}

function killChild(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGTERM');
}

async function run() {
  console.log('[dev:full] Starting API server (5001) and Vite client...');

  let serverChild = null;
  let managesServerLifecycle = false;

  // Reuse an already running backend instead of spawning a second server that collides on port 5001.
  const backendAlreadyRunning = await waitForHealth(API_HEALTH_URL, 1200);
  if (backendAlreadyRunning) {
    console.log('[dev:full] Reusing existing healthy API server on port 5001.');
  } else {
    managesServerLifecycle = true;
    serverChild = spawn('node', ['server/server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max_old_space_size=2048',
      },
      stdio: 'inherit',
    });

    const serverExitPromise = once(serverChild, 'exit').then(([code, signal]) => ({
      code,
      signal,
    }));

    const serverReadyPromise = waitForHealth(API_HEALTH_URL, SERVER_START_TIMEOUT_MS);
    const serverReadyOrExit = await Promise.race([
      serverReadyPromise.then((ready) => ({ type: 'ready', ready })),
      serverExitPromise.then((exit) => ({ type: 'exit', ...exit })),
    ]);

    if (serverReadyOrExit.type === 'exit') {
      console.error(
        `[dev:full] API server exited before ready (code=${serverReadyOrExit.code ?? 'null'}, signal=${serverReadyOrExit.signal ?? 'none'}).`
      );
      process.exit(typeof serverReadyOrExit.code === 'number' ? serverReadyOrExit.code : 1);
    }

    if (!serverReadyOrExit.ready) {
      console.error('[dev:full] API server did not become healthy within timeout.');
      killChild(serverChild);
      process.exit(1);
    }
  }

  console.log('[dev:full] API is healthy. Starting Vite client...');

  const clientChild = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max_old_space_size=4096',
    },
    stdio: 'inherit',
  });

  const shutdown = (signal) => {
    console.log(`\n[dev:full] Received ${signal}. Stopping child processes...`);
    killChild(clientChild);
    if (managesServerLifecycle) {
      killChild(serverChild);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  if (serverChild) {
    serverChild.on('exit', (code, signal) => {
      if (!clientChild.killed) {
        console.error(
          `[dev:full] API server exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'none'}). Stopping client.`
        );
        killChild(clientChild);
      }
    });
  }

  const [clientCode, clientSignal] = await once(clientChild, 'exit');
  if (managesServerLifecycle) {
    killChild(serverChild);
  }

  if (typeof clientCode === 'number') {
    process.exit(clientCode);
  }

  if (clientSignal) {
    console.error(`[dev:full] Client exited due to signal: ${clientSignal}`);
    process.exit(1);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error('[dev:full] Fatal error:', error);
  process.exit(1);
});
