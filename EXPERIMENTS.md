# Node.js Experiments

## null-init-race
```js
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
```
Demonstrates the `this.initialized = null` constructor race condition.
- **Bug**: `this.initialized` starts as `null`; `await null` resolves instantly — callers during the null window never wait for real init.
- **Fix**: assign `this.initialized = redis.initialized.then(...)` directly so it is a pending Promise from the start.
- Scripts: `null-init-race/demo.js` (three cases), `null-init-race/fix.js`

## async-overhead
Measured cost of an unnecessary `await` on a cached value (1M iterations).
- `await asyncFn()` vs `cached ?? await asyncFn()` — **~2x slower** when isolated (~170ns/call overhead from extra microtask tick).
- Scripts: `async-overhead/schema.js`, `async-overhead/benchmark.js`
