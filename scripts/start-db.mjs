import EmbeddedPostgres from 'embedded-postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, '.pgdata');
const port = 5432;

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!existsSync(dataDir)) {
  console.log('Initializing embedded PostgreSQL...');
  await pg.initialise();
}

await pg.start();
console.log(`PostgreSQL running on localhost:${port}`);
console.log('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres');

// Keep process alive
process.on('SIGINT', async () => {
  await pg.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pg.stop();
  process.exit(0);
});

// Prevent exit
await new Promise(() => {});
