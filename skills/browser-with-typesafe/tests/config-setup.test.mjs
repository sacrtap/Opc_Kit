import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  configPaths,
  install,
  targetRootFor,
  uninstall,
  writeConfigTemplate,
} from '../install.mjs';
import { runDoctor } from '../scripts/doctor.mjs';

const run = promisify(execFile);
const SKILL_ROOT = fileURLToPath(new URL('..', import.meta.url));
const INSTALLER = join(SKILL_ROOT, 'install.mjs');

const temporary = async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'bwt-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
};

const writeConfig = async (home, contents) => {
  const { dir, file } = configPaths(home);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(file, `${JSON.stringify(contents, null, 2)}\n`, { mode: 0o600 });
  return file;
};

test('writeConfigTemplate writes an empty apiKey and never a key', async (t) => {
  const home = await temporary(t);
  const result = await writeConfigTemplate({ provider: 'openrouter' }, { home });

  assert.equal(result.written, true);
  assert.equal(result.provider, 'openrouter');
  assert.equal(result.model, '~typesafe/jev-latest');

  const raw = await readFile(result.file, 'utf8');
  assert.deepEqual(JSON.parse(raw), { provider: 'openrouter', model: '~typesafe/jev-latest', apiKey: '' });

  const mode = (await stat(result.file)).mode & 0o777;
  assert.equal(mode.toString(8), '600');
  assert.equal(((await stat(result.dir)).mode & 0o777).toString(8), '700');
});

test('writeConfigTemplate preserves an existing configuration and validates input', async (t) => {
  const home = await temporary(t);
  const file = await writeConfig(home, { provider: 'typesafe', model: 'jev-latest', apiKey: 'kept' });

  const again = await writeConfigTemplate({ provider: 'openrouter' }, { home });
  assert.equal(again.written, false);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).apiKey, 'kept');

  await assert.rejects(
    () => writeConfigTemplate({ provider: 'nope' }, { home }),
    /Unsupported provider "nope"/,
  );
  await assert.rejects(
    () => writeConfigTemplate({ provider: 'typesafe', model: 'gpt-4' }, { home }),
    /Invalid model "gpt-4" for provider typesafe/,
  );
});

test('the installer accepts no key-bearing option', async () => {
  for (const flag of ['--key', '--api-key', '--token']) {
    const failure = await run(process.execPath, [INSTALLER, flag, 'secret'], { cwd: SKILL_ROOT })
      .then(() => null)
      .catch((error) => error);
    assert.ok(failure, `${flag} must be rejected`);
    assert.match(failure.stderr, /never receives an API key/);
  }
});

test('targetRootFor maps known ids and passes absolute paths through', async (t) => {
  const home = await temporary(t);
  assert.equal(targetRootFor('agents-user', { home }), join(home, '.agents', 'skills'));
  assert.equal(targetRootFor('claude-user', { home }), join(home, '.claude', 'skills'));
  assert.equal(targetRootFor('agents-project', { home, cwd: '/tmp/project' }), '/tmp/project/.agents/skills');
  assert.equal(targetRootFor('/tmp/custom/skills', { home }), '/tmp/custom/skills');
  assert.throws(() => targetRootFor('nope', { home }), /Unknown target "nope"/);
});

test('install links, is idempotent, and refuses to clobber an unrelated directory', async (t) => {
  const home = await temporary(t);
  const targetRoot = targetRootFor('agents-user', { home });

  const first = await install({ targetRoot });
  assert.equal(first.changed, true);
  assert.equal((await lstat(first.target)).isSymbolicLink(), true);

  assert.equal((await install({ targetRoot })).changed, false);

  const foreign = join(targetRoot, 'browser-with-typesafe');
  await rm(foreign, { recursive: true, force: true });
  await mkdir(foreign, { recursive: true });
  await assert.rejects(() => install({ targetRoot }), /exists and is not this skill/);

  assert.equal((await uninstall({ targetRoot })).removed, true);
  assert.equal((await uninstall({ targetRoot })).removed, false);
});

test('doctor reports not-ready for a missing, unprotected, or keyless configuration', async (t) => {
  const ok = { probe: async () => ({ ok: true, status: 200 }) };

  const missingHome = await temporary(t);
  const missing = await runDoctor({ configPath: configPaths(missingHome).file, ...ok });
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.blocking, ['config file']);
  assert.match(missing.checks[0].detail, /node install\.mjs/);

  const insecureHome = await temporary(t);
  const insecure = await writeConfig(insecureHome, { provider: 'typesafe', model: 'jev-latest', apiKey: 'k' });
  await chmod(insecure, 0o644);
  const wide = await runDoctor({ configPath: insecure, ...ok });
  assert.equal(wide.ready, false);
  assert.deepEqual(wide.blocking, ['file permissions']);
  assert.match(wide.checks.find((check) => check.name === 'file permissions').detail, /chmod 600/);

  const keylessHome = await temporary(t);
  const keyless = await writeConfig(keylessHome, { provider: 'typesafe', model: 'jev-latest', apiKey: '' });
  const empty = await runDoctor({ configPath: keyless, ...ok });
  assert.equal(empty.ready, false);
  assert.deepEqual(empty.blocking, ['apiKey']);
  assert.match(empty.checks.find((check) => check.name === 'apiKey').detail, /console\.typesafe\.ai\/keys/);
});

test('doctor is ready when the configuration is complete and the endpoint answers', async (t) => {
  const home = await temporary(t);
  const configPath = await writeConfig(home, {
    provider: 'openrouter',
    model: '~typesafe/jev-latest',
    apiKey: 'a-very-secret-value',
  });

  const probed = [];
  const report = await runDoctor({
    configPath,
    probe: async (options) => {
      probed.push(options);
      return { ok: true, status: 200, model: 'jev-1.13.0' };
    },
  });

  assert.equal(report.ready, true);
  assert.deepEqual(probed[0], {
    endpoint: 'https://openrouter.ai/api/alpha/decisions',
    apiKey: 'a-very-secret-value',
    model: '~typesafe/jev-latest',
  });

  // the credential is reported by length only, never printed
  const printed = JSON.stringify(report);
  assert.ok(!printed.includes('a-very-secret-value'));
  assert.match(report.checks.find((check) => check.name === 'apiKey').detail, /set \(19 characters, not shown\)/);
});

test('doctor reports an unreachable endpoint without claiming readiness', async (t) => {
  const home = await temporary(t);
  const configPath = await writeConfig(home, {
    provider: 'typesafe',
    model: 'jev-latest',
    apiKey: 'value',
  });

  const report = await runDoctor({
    configPath,
    probe: async () => ({ ok: false, status: 401, error: 'unexpected status' }),
  });

  assert.equal(report.ready, false);
  assert.deepEqual(report.blocking, ['endpoint']);
  assert.match(report.checks.at(-1).detail, /HTTP 401/);
});
