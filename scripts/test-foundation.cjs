const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const directory = path.resolve('.local/tests');
fs.mkdirSync(directory, { recursive: true });
const filename = `foundation-${Date.now()}.db`;
const url = `file:${path.join(directory, filename).replaceAll('\\', '/')}`;
fs.writeFileSync(path.join(directory, filename), '');
const env = { ...process.env, DATABASE_URL: url };
if (process.argv.includes('--e2e')) {
  env.AUTH_SECRET = 'isolated-e2e-secret-with-at-least-32-characters';
  env.OTP_DEV_ENABLED = 'true';
  env.PORTAL_E2E = 'true';
}
function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
const schema = path.join(directory, `schema-${Date.now()}.prisma`);
const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8')
  .replace(/datasource db \{[\s\S]*?\}/, `datasource db {\n  provider = "sqlite"\n  url      = "file:./${filename}"\n}`);
fs.writeFileSync(schema, schemaContent);
run(['node_modules/prisma/build/index.js', 'db', 'push', '--schema', schema]);
if (process.argv.includes('--e2e')) {
  run(['node_modules/tsx/dist/cli.mjs', 'tests/seed-e2e.ts']);
  run(['node_modules/@playwright/test/cli.js', 'test']);
} else run(['node_modules/tsx/dist/cli.mjs', '--test', 'tests/foundation.test.ts']);
