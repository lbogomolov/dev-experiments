# Node.js Experiments

## async-overhead
Measured cost of an unnecessary `await` on a cached value (1M iterations).
- `await asyncFn()` vs `cached ?? await asyncFn()` — **~2x slower** when isolated (~170ns/call overhead from extra microtask tick).
- Scripts: `async-overhead/schema.js`, `async-overhead/benchmark.js`
