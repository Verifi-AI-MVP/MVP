import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
const exampleFile = path.join(root, '.env.example');

if (!existsSync(envFile)) {
  copyFileSync(exampleFile, envFile);
  console.log('Created .env from .env.example');
}

dotenv.config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const serverDir = path.join(root, 'server');
const env = { ...process.env };

function run(command: string) {
  execSync(command, { cwd: serverDir, stdio: 'inherit', env, shell: true });
}

run('npx prisma generate');
run('npx prisma db push --skip-generate --accept-data-loss');
run('npx tsx prisma/seed.ts');
console.log('Database ready');
