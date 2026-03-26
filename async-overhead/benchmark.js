const SchemaDecoder = require('./schema');
const fs = require('fs/promises');
const path = require('path');

const SCHEMA_FILE = path.join(__dirname, 'schema.txt');
const PAYLOAD = 'Hello World benchmark payload';
const ITERATIONS = 1_000_000;

async function bench(label, fn) {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) await fn();
  const ms = (performance.now() - start).toFixed(2);
  console.log(`${label}: ${ms}ms  (${(ITERATIONS / (ms / 1000) / 1e6).toFixed(2)}M ops/s)`);
}

async function main() {
  await fs.writeFile(SCHEMA_FILE, 'dummy-schema-content');

  const d1 = new SchemaDecoder();
  const d2 = new SchemaDecoder();

  // warm up schema cache for both
  await d1.loader(SCHEMA_FILE);
  await d2.loader(SCHEMA_FILE);

  const d3 = new SchemaDecoder();
  const d4 = new SchemaDecoder();
  await d3.loader(SCHEMA_FILE);
  await d4.loader(SCHEMA_FILE);

  console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`);
  await bench('decoder         (always await loader)', () => d1.decoder(SCHEMA_FILE, PAYLOAD));
  await bench('decoderFast     (skip async if cached)', () => d2.decoderFast(SCHEMA_FILE, PAYLOAD));
  console.log();
  await bench('loaderOnly      (always await loader)', () => d3.loaderOnly(SCHEMA_FILE));
  await bench('loaderOnlyFast  (skip async if cached)', () => d4.loaderOnlyFast(SCHEMA_FILE));
}

main().catch(console.error);
