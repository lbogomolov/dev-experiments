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

// ─── Fixed service (correct) ──────────────────────────────────────────────────

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

// ─── "Fixed" service — but reassigns inside .then() like the original ─────────
//
// Looks safe because this.initialized is no longer null from the start.
// But there are two problems:
//
//   1. Return value: the outer .then() callback does not return the
//      initConnections() result, so the promise that external callers hold
//      resolves to undefined instead of the real result.
//
//   2. Promise identity swap: this.initialized gets replaced mid-flight.
//      A caller that reads the reference early, then awaits it later, holds
//      the OUTER promise (resolves to undefined). A caller that reads the
//      reference after reassignment holds the INNER promise (resolves to
//      the real result). Two callers, same property name, different outcomes.

class HanaStoreServiceReassigns {
  constructor(redis) {
    this._state = 'not started';

    // initialized starts as a real Promise — null window is gone
    this.initialized = redis.initialized.then(async () => {
      // mirrors the original: reassign inside .then(), await the new value
      this.initialized = initConnections();
      await this.initialized;
      this._state = 'ready';
      // ← no return value: outer promise resolves to undefined
    });
  }
}

// ─── Demonstration ────────────────────────────────────────────────────────────

async function main() {
  // ── Correct fix ─────────────────────────────────────────────────────────────
  {
    const redis = makeRedis(100);
    const svc = new HanaStoreServiceFixed(redis);

    console.log('\n── Correct fix: await during null window ──');
    console.log('svc.initialized:', svc.initialized); // Promise (not null)

    const t0 = Date.now();
    const result = await svc.initialized;
    console.log(`await resolved after ${Date.now() - t0} ms`);
    console.log('result:', result);          // { db: 'connected', topics: [...] }
    console.log('svc._state:', svc._state);  // "ready"
  }

  // ── Reassigns-inside-.then() variant ────────────────────────────────────────
  {
    const redis = makeRedis(100);
    const svc = new HanaStoreServiceReassigns(redis);

    // Grab the reference NOW (outer promise), before the .then() fires
    const refBeforeSwap = svc.initialized;

    console.log('\n── Reassigns variant: two callers, same property ──');
    console.log('svc.initialized is a Promise (not null):', svc.initialized instanceof Promise);

    // Wait for everything to settle
    await new Promise(resolve => setTimeout(resolve, 200));

    // Reference grabbed AFTER reassignment (inner promise)
    const refAfterSwap = svc.initialized;

    const r1 = await refBeforeSwap;
    const r2 = await refAfterSwap;

    console.log('result via early ref (outer promise):', r1);   // undefined ← bug
    console.log('result via late ref  (inner promise):', r2);   // { db: ..., topics: ... }
    console.log('same promise?', refBeforeSwap === refAfterSwap); // false — swapped mid-flight
    console.log('svc._state:', svc._state);                      // "ready" (timing worked out)
  }
}

main().catch(console.error);
