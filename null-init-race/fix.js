'use strict';

// The fix: create this.initialized as a Promise in the constructor,
// resolved from *inside* the .then() — so it is never null.

function makeRedis(connectDelayMs) {
  return {
    initialized: new Promise(resolve => setTimeout(resolve, connectDelayMs)),
  };
}

async function initConnections() {
  await new Promise(resolve => setTimeout(resolve, 50));
  return { db: 'connected', topics: ['topic-a', 'topic-b'] };
}

// ─── Fixed service ────────────────────────────────────────────────────────────

class HanaStoreServiceFixed {
  constructor(redis) {
    this._state = 'not started';

    // initialized is a real Promise from the start — never null
    this.initialized = redis.initialized.then(async () => {
      const result = await initConnections();
      this._state = 'ready';
      return result;
    });
  }
}

// ─── Demonstration ────────────────────────────────────────────────────────────

async function main() {
  const redis = makeRedis(100);
  const svc = new HanaStoreServiceFixed(redis);

  console.log('\n── Fixed: await during null window ──');
  console.log('svc.initialized right now:', svc.initialized); // Promise (not null)

  const t0 = Date.now();
  const result = await svc.initialized;
  console.log(`await resolved after ${Date.now() - t0} ms`);  // ~150 ms — correctly waited
  console.log('result:', result);
  console.log('svc._state:', svc._state);                     // "ready"
}

main().catch(console.error);
