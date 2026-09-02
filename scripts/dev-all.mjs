import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, '.pgdata');

const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    env: { ...process.env, FORCE_COLOR: '1' },
    ...opts,
  });
}

async function setupDatabase(pg) {
  if (!existsSync(dataDir)) {
    console.log('\n📦 Initializing embedded PostgreSQL...');
    await pg.initialise();
  }

  await pg.start();
  console.log('✅ PostgreSQL running on localhost:5432\n');

  console.log('📋 Pushing schema...');
  await new Promise((resolve, reject) => {
    const p = run('npm', ['run', 'db:push']);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('db:push failed'))));
  });

  console.log('🌱 Seeding data...');
  await new Promise((resolve, reject) => {
    const p = run('npm', ['run', 'db:seed']);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('db:seed failed'))));
  });

  console.log('✅ Database ready\n');
}

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: 5432,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  await setupDatabase(pg);

  console.log('🚀 Starting API (port 4000) and Customer Web (port 3000)...\n');

  const api = run('npm', ['run', 'dev', '--workspace=@omsp/api']);
  const web = run('npm', ['run', 'dev', '--workspace=@omsp/customer-web']);

  const shutdown = async () => {
    console.log('\nShutting down...');
    api.kill();
    web.kill();
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Wait a few seconds then run smoke tests
  setTimeout(async () => {
    try {
      const health = await fetch('http://localhost:4000/api/v1/health');
      const store = await fetch('http://localhost:4000/api/v1/stores/al-noor');
      const home = await fetch('http://localhost:3000');
      const shop = await fetch('http://localhost:3000/shop/al-noor');

      console.log('\n─── Smoke Tests ───');
      console.log(`API Health:     ${health.status} ${health.ok ? '✅' : '❌'}`);
      console.log(`Store API:      ${store.status} ${store.ok ? '✅' : '❌'}`);
      console.log(`Customer Home:  ${home.status} ${home.ok ? '✅' : '❌'}`);
      console.log(`Shop Page:      ${shop.status} ${shop.ok ? '✅' : '❌'}`);
      console.log('───────────────────');
      console.log('\n🌐 Open http://localhost:3000/shop/al-noor\n');
    } catch (e) {
      console.log('Smoke tests pending — servers still starting...');
    }
  }, 8000);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
