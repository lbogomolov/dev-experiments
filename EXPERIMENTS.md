# Node.js Experiments

## null-init-race
Demonstrates the `this.initialized = null` constructor race condition.
- **Bug**: `this.initialized` starts as `null`; `await null` resolves instantly — callers during the null window never wait for real init.
- **Fix**: assign `this.initialized = redis.initialized.then(...)` directly so it is a pending Promise from the start.
- Scripts: `null-init-race/demo.js` (three cases), `null-init-race/fix.js`

## async-overhead
Measured cost of an unnecessary `await` on a cached value (1M iterations).
- `await asyncFn()` vs `cached ?? await asyncFn()` — **~2x slower** when isolated (~170ns/call overhead from extra microtask tick).
- Scripts: `async-overhead/schema.js`, `async-overhead/benchmark.js`
