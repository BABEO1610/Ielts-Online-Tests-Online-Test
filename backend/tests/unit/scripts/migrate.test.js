const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyFile, checksum, migrationFiles } = require('../../../scripts/migrate');
const { assertExistingBaseline, assertBaselineChecksums } = require('../../../scripts/baseline-migrations');

describe('migration runner', () => {
  test('sorts only SQL files and computes stable checksums', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    fs.writeFileSync(path.join(dir, '002_b.sql'), 'SELECT 2;');
    fs.writeFileSync(path.join(dir, '001_a.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(dir, 'README.md'), 'ignore');
    expect(migrationFiles(dir)).toEqual(['001_a.sql', '002_b.sql']);
    expect(checksum('SELECT 1;')).toMatch(/^[0-9a-f]{64}$/);
    expect(checksum('SELECT 1;\n')).toBe(checksum('SELECT 1;\r\n'));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('accepts a historical CRLF checksum for otherwise identical SQL', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    const sql = 'SELECT 1;\r\n';
    fs.writeFileSync(path.join(dir, '001.sql'), sql);
    const historicalCrlfChecksum = require('node:crypto').createHash('sha256').update(sql).digest('hex');
    const client = { query: jest.fn() };
    await expect(applyFile(client, dir, '001.sql', historicalCrlfChecksum)).resolves.toBe(false);
    expect(client.query).not.toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('refuses a modified migration already present in history', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    fs.writeFileSync(path.join(dir, '001.sql'), 'SELECT 1;');
    const client = { query: jest.fn() };
    await expect(applyFile(client, dir, '001.sql', '0'.repeat(64)))
      .rejects.toThrow('Checksum mismatch');
    expect(client.query).not.toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('rolls back and propagates migration errors', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    fs.writeFileSync(path.join(dir, '001.sql'), 'BROKEN');
    const client = { query: jest.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('syntax'))
      .mockResolvedValueOnce() };
    await expect(applyFile(client, dir, '001.sql')).rejects.toThrow('syntax');
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('baseline refuses an incomplete legacy schema', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ name: 'users', present: true }, { name: 'ai_usage_logs', present: false }],
      }),
    };
    await expect(assertExistingBaseline(client)).rejects.toThrow('BASELINE_SCHEMA_INCOMPLETE');
  });

  test('baseline never rewrites a previously recorded checksum', () => {
    expect(() => assertBaselineChecksums(
      [{ version: '001.sql', checksum: 'a'.repeat(64) }],
      [{ version: '001.sql', checksum: 'b'.repeat(64) }]
    )).toThrow('BASELINE_CHECKSUM_MISMATCH');
  });
});
