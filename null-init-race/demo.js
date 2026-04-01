'use strict';

// Simulates the HanaStoreService pattern:
//   - constructor kicks off async work inside a .then()
//   - this.initialized is null until that .then() runs
//   - callers that await this.initialized during the null window get await null
//     which resolves INSTANTLY — they never wait for real init

// ─── Simulated dependencies ───────────────────────────────────────────────────

function makeRedis(connectDelayMs) {
  return {
    initialized: new Promise(resolve => setTimeout(resolve, connectDelayMs)),
  };
}

async function initConnections() {
  // Pretend: open DB connections, load topics, etc.
  await new Promise(resolve => setTimeout(resolve, 50));
  return { db: 'connected', topics: ['topic-a', 'topic-b'] };
}

// ─── The buggy service ────────────────────────────────────────────────────────

class HanaStoreService {
  constructor(redis) {
    this.initialized = null;          // ← starts null, just like the real code
    this._state = 'not started';

    redis.initialized.then(async () => {
      this.initialized = initConnections();  // assigned asynchronously
      await this.initialized;
      this._state = 'ready';
    });
    // constructor returns immediately — initialized is still null
  }
}

// ─── Demonstration ────────────────────────────────────────────────────────────

async function main() {
  const redis = makeRedis(100); // Redis takes 100 ms to connect

  const svc = new HanaStoreService(redis);

  // ── Case 1: caller runs synchronously after construction (null window) ──────
  console.log('\n── Case 1: await during null window ──');
  console.log('svc.initialized right now:', svc.initialized);   // null

  const t0 = Date.now();
  const result1 = await svc.initialized;   // await null → resolves instantly
  console.log(`await resolved after ${Date.now() - t0} ms`);   // ~0 ms ← BUG
  console.log('result:', result1);          // undefined — not the real result
  console.log('svc._state:', svc._state);   // "not started" — init never ran

  // ── Case 2: caller waits long enough that .then() has already fired ─────────
  console.log('\n── Case 2: await after init completes ──');
  await new Promise(resolve => setTimeout(resolve, 200)); // outlast Redis + init

  const t1 = Date.now();
  const result2 = await svc.initialized;
  console.log(`await resolved after ${Date.now() - t1} ms`);   // ~0 ms (already settled)
  console.log('result:', result2);          // { db: 'connected', topics: [...] }
  console.log('svc._state:', svc._state);   // "ready"

  // ── Case 3: show WHY await null is dangerous — even in a loop ───────────────
  console.log('\n── Case 3: await null never blocks ──');
  const redis2 = makeRedis(10_000);  // Redis never connects in time
  const svc2 = new HanaStoreService(redis2);

  let iterations = 0;
  const deadline = Date.now() + 10;   // 10 ms budget

  while (Date.now() < deadline) {
    await svc2.initialized;            // should "wait for init" — but doesn't
    iterations++;
    if (iterations > 1_000_000) break; // safety
  }

  console.log(`Completed ${iterations} "awaits" in ~10 ms — init never ran.`);
  console.log('svc2._state:', svc2._state); // still "not started"
}

main().catch(console.error);
