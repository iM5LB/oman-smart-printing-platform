import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

async function main() {
  if (!existsSync(dataDir)) {
    console.log('Initializing embedded PostgreSQL...');
    await pg.initialise();
  }

  await pg.start();
  console.log('PostgreSQL started on localhost:5432');

  // Create omsp database if needed
  try {
    execSync(
      `psql postgresql://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE omsp;"`,
      { stdio: 'pipe', cwd: root },
    );
    console.log('Created database: omsp');
  } catch {
    console.log('Database omsp already exists');
  }

  console.log('Running prisma db push...');
  execSync('npm run db:push', { stdio: 'inherit', cwd: root, env: process.env });

  console.log('Seeding database...');
  execSync('npm run db:seed', { stdio: 'inherit', cwd: root, env: process.env });

  await pg.stop();
  console.log('Database setup complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
