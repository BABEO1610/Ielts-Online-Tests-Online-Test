const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

const IMAGE = process.env.POSTGRES_BACKUP_IMAGE || 'postgres:17-alpine';

const runProcess = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 120000,
    killSignal: 'SIGTERM',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || 'Docker command failed')
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://<redacted>@')
      .slice(0, 1000);
    throw new Error(detail);
  }
  return result.stdout;
};

const runDocker = (args) => runProcess('docker', args);

const sha256File = (file) => {
  const digest = crypto.createHash('sha256');
  digest.update(fs.readFileSync(file));
  return digest.digest('hex');
};

const databaseEnvironment = (connectionString) => {
  const url = new URL(connectionString);
  const values = {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')),
    PGSSLMODE: url.searchParams.get('sslmode') || 'require',
    PGCONNECT_TIMEOUT: '15',
    PGAPPNAME: 'ieltszone-public-backup',
  };
  if (Object.values(values).some((value) => /[\r\n]/.test(value))) {
    throw new Error('DATABASE_URL contains an invalid control character');
  }
  return values;
};

const main = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const backupDir = path.resolve(
    process.env.AI_GRADING_BACKUP_DIR || path.join(os.tmpdir(), 'ieltszone-backups')
  );
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `ieltszone-public-before-ai-grading-${stamp}.dump`;
  const backupPath = path.join(backupDir, name);
  const envPath = path.join(backupDir, `.pg-dump-${crypto.randomUUID()}.env`);
  const mount = `${backupDir}:/backup`;
  const nativeBin = process.env.POSTGRES_BIN_DIR;
  const nativeDump = nativeBin && path.join(nativeBin, 'pg_dump.exe');
  const nativeRestore = nativeBin && path.join(nativeBin, 'pg_restore.exe');
  let listing;

  const connectionEnv = databaseEnvironment(process.env.DATABASE_URL);
  try {
    if (nativeDump && nativeRestore && fs.existsSync(nativeDump) && fs.existsSync(nativeRestore)) {
      runProcess(nativeDump, [
        '--format=custom', '--compress=9', '--no-owner', '--no-acl',
        '--schema=public', `--file=${backupPath}`,
      ], { ...process.env, ...connectionEnv });
      listing = runProcess(nativeRestore, ['--list', backupPath]);
    } else {
      try {
        const envContents = Object.entries(connectionEnv)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        fs.writeFileSync(envPath, `${envContents}\n`, {
          encoding: 'utf8',
          flag: 'wx',
          mode: 0o600,
        });
        runDocker([
          'run', '--rm', '--env-file', envPath, '-v', mount, IMAGE,
          'pg_dump', '--format=custom', '--compress=9', '--no-owner', '--no-acl',
          '--schema=public', `--file=/backup/${name}`,
        ]);
      } finally {
        fs.rmSync(envPath, { force: true });
      }
      listing = runDocker([
        'run', '--rm', '-v', mount, IMAGE,
        'pg_restore', '--list', `/backup/${name}`,
      ]);
    }
  } catch (error) {
    fs.rmSync(backupPath, { force: true });
    throw error;
  }
  if (!listing.includes('TABLE DATA')) throw new Error('Backup verification found no table data');

  const digest = sha256File(backupPath);
  fs.writeFileSync(`${backupPath}.sha256`, `${digest}  ${name}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  console.log(JSON.stringify({
    backupPath,
    sha256: digest,
    bytes: fs.statSync(backupPath).size,
    verifiedTableData: true,
    backend: nativeDump && fs.existsSync(nativeDump) ? 'native-pg17' : 'docker-pg17',
  }, null, 2));
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({
      code: 'DATABASE_BACKUP_FAILED',
      message: String(error.message).slice(0, 1000),
    }));
    process.exitCode = 1;
  }
}

module.exports = { sha256File };
