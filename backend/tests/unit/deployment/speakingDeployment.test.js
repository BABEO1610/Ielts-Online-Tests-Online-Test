const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const root = path.resolve(__dirname, '../../../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Speaking production deployment contract', () => {
  test('backend image uses Node 20 and installs both media executables', () => {
    const dockerfile = read('backend/Dockerfile.backend');
    expect(dockerfile).toMatch(/^FROM node:20-alpine/m);
    expect(dockerfile).toMatch(/apk add --no-cache[^\n]*\bffmpeg\b/i);
  });

  test('runs one dedicated non-public Speaking worker from the backend image', () => {
    const compose = YAML.parse(read('docker-compose.prod.yml'));
    const backend = compose.services.backend;
    const worker = compose.services['speaking-worker'];

    expect(worker).toBeDefined();
    expect(worker.image).toBe(backend.image);
    expect(worker.command).toEqual(['npm', 'run', 'worker']);
    expect(worker.env_file).toEqual(backend.env_file);
    expect(worker.environment).toEqual(expect.arrayContaining(['REDIS_URL=redis://redis:6379']));
    expect(worker).not.toHaveProperty('ports');
    expect(JSON.stringify(backend.command || '')).not.toMatch(/worker/i);
  });

  test('deploys only after compose validation and successful migrations', () => {
    const workflow = read('.github/workflows/deploy.yml');
    const positions = [
      'git pull origin main',
      'config --quiet',
      'build --no-cache backend frontend',
      'npm run migrate:preflight',
      'npm run migrate',
      'up -d --remove-orphans',
      'speaking:runtime-check',
    ].map((command) => workflow.indexOf(command));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(workflow).toMatch(/command -v ffmpeg/);
    expect(workflow).toMatch(/command -v ffprobe/);
    expect(workflow).not.toMatch(/migrate:baseline/);
    expect(workflow).not.toMatch(/(?:cat|type)\s+\.env\.production|printenv/i);
  });
});
