#!/usr/bin/env node
/**
 * browser-with-typesafe installer.
 *
 * Exposes this skill to the skill directories the common agent hosts scan, so a
 * single checkout serves omp, Codex, Claude Code, Cursor, and any other host
 * that reads the shared agents layout, and writes a configuration template.
 *
 * Deliberate design rules:
 *   - installation never touches existing configuration
 *   - this tool **never receives, prompts for, or stores an API key**
 *   - an existing target is never overwritten silently
 *
 * Usage: node install.mjs [--target <id|absolute path>] [--copy] [--uninstall]
 *                         [--provider typesafe|openrouter] [--model <id>]
 *                         [--no-config] [--help]
 */

import { cp, lstat, mkdir, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVIDER_IDS, loadConfig, providerGuide, resolveProviderConfig } from './bridge/core.mjs';

const NAME = 'browser-with-typesafe';
const SKILL_ROOT = dirname(fileURLToPath(import.meta.url));

/** Configuration file location for a given home directory. */
export function configPaths(home = homedir()) {
  const dir = join(home, '.config', NAME);
  return { dir, file: join(dir, 'config.json') };
}

/**
 * Install targets. `agents-user` is the shared layout the reference skill uses
 * and the one omp's `agents` provider scans, so it covers omp, Codex, and other
 * agents-compatible hosts at once.
 */
const TARGETS = {
  'agents-user': (home) => join(home, '.agents', 'skills'),
  'agents-project': (_home, cwd) => join(cwd, '.agents', 'skills'),
  'claude-user': (home) => join(home, '.claude', 'skills'),
};

export function targetRootFor(id, { home = homedir(), cwd = process.cwd() } = {}) {
  if (TARGETS[id]) return TARGETS[id](home, cwd);
  if (isAbsolute(id)) return id;
  throw new Error(
    `Unknown target "${id}". Choose ${Object.keys(TARGETS).join(', ')} or an absolute path.`,
  );
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

/** Expose the skill at `targetRoot/<name>`. Refuses to clobber an unrelated path. */
export async function install({ targetRoot, mode = 'link' } = {}) {
  const target = join(resolve(targetRoot), NAME);

  if (await exists(target)) {
    const info = await lstat(target);
    if (info.isSymbolicLink()) {
      const current = resolve(dirname(target), await readlink(target));
      if (current === resolve(SKILL_ROOT)) return { target, mode: 'link', changed: false };
      throw new Error(`${target} already links to ${current}; remove it first.`);
    }
    if (info.isDirectory()) {
      if (await exists(join(target, 'bridge', 'index.mjs'))) {
        await rm(target, { recursive: true, force: true });
      } else {
        throw new Error(`${target} exists and is not this skill; remove it first.`);
      }
    } else {
      throw new Error(`${target} exists and is not a directory; remove it first.`);
    }
  }

  await mkdir(resolve(targetRoot), { recursive: true });
  if (mode === 'copy') {
    await cp(SKILL_ROOT, target, {
      recursive: true,
      filter: (source) => !source.includes(`${NAME}/tests`),
    });
    return { target, mode: 'copy', changed: true };
  }

  await symlink(SKILL_ROOT, target, 'dir');
  return { target, mode: 'link', changed: true };
}

/** Remove an installed skill directory or link. Configuration is preserved. */
export async function uninstall({ targetRoot } = {}) {
  const target = join(resolve(targetRoot), NAME);
  if (!(await exists(target))) return { target, removed: false };
  await rm(target, { recursive: true, force: true });
  return { target, removed: true };
}

/**
 * Write the configuration template.
 *
 * The `apiKey` field is written empty on purpose: the key is the user's to add,
 * in their own editor. That keeps the credential out of this tool, out of shell
 * history, and out of any transcript of a session that ran the install.
 */
export async function writeConfigTemplate({ provider = 'typesafe', model } = {}, { home = homedir() } = {}) {
  const resolved = resolveProviderConfig(provider, model);
  const { dir, file } = configPaths(home);

  if (await exists(file)) return { dir, file, written: false, ...resolved };

  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(
    file,
    `${JSON.stringify({ provider: resolved.provider, model: resolved.model, apiKey: '' }, null, 2)}\n`,
    { mode: 0o600, flag: 'wx' },
  );
  return { dir, file, written: true, ...resolved };
}

function parseArgs(argv) {
  const options = { target: 'agents-user', mode: 'link', configure: true, provider: 'typesafe' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') options.help = true;
    else if (arg === '--copy') options.mode = 'copy';
    else if (arg === '--link') options.mode = 'link';
    else if (arg === '--no-config') options.configure = false;
    else if (arg === '--uninstall') options.uninstall = true;
    else if (arg === '--target') options.target = argv[(i += 1)];
    else if (arg === '--provider') options.provider = argv[(i += 1)];
    else if (arg === '--model') options.model = argv[(i += 1)];
    else if (arg === '--key' || arg === '--api-key' || arg === '--token') {
      throw new Error(
        `${arg} is intentionally not supported: this tool never receives an API key. ` +
          'It writes the configuration file with an empty "apiKey" for you to fill in yourself.',
      );
    } else throw new Error(`Unknown option "${arg}". Use --help.`);
  }
  return options;
}

function printHelp() {
  const providers = providerGuide()
    .map(
      (guide) =>
        `  ${guide.id.padEnd(11)} ${guide.label.padEnd(22)} key: ${guide.keysUrl ?? 'env BIFROST_API_KEY'}`,
    )
    .join('\n');

  console.log(
    [
      'Usage: node install.mjs [options]',
      '',
      `  --target <id>   ${Object.keys(TARGETS).join(' | ')} | <absolute path>  (default: agents-user)`,
      '  --copy          copy files instead of symlinking',
      '  --uninstall     remove the installed skill (configuration is kept)',
      '  --provider <id> provider to write into the configuration template',
      '  --model <id>    model id (defaults to the provider default)',
      '  --no-config     install only; do not write a configuration template',
      '  --help          show this message',
      '',
      `Installs this skill as "<target>/${NAME}" and writes`,
      `${configPaths().file} with an empty "apiKey" for you to fill in.`,
      '',
      'Providers:',
      providers,
      '',
      'An API key is never accepted here: add it to the configuration file yourself,',
      'then verify with `node scripts/doctor.mjs`.',
    ].join('\n'),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const targetRoot = targetRootFor(options.target);
  const paths = configPaths();

  if (options.uninstall) {
    const result = await uninstall({ targetRoot });
    console.log(result.removed ? `Removed ${result.target}.` : `Nothing installed at ${result.target}.`);
    console.log(`Configuration preserved at ${paths.file}.`);
    return;
  }

  const result = await install({ targetRoot, mode: options.mode });
  console.log(
    `${result.changed ? 'Installed' : 'Already installed'} ${result.target} (${result.mode}).`,
  );

  if (!options.configure) {
    console.log(`Configuration not touched. Expected at ${paths.file}.`);
    return;
  }

  const config = await writeConfigTemplate(
    { provider: options.provider, model: options.model },
    { home: homedir() },
  );

  if (config.written) {
    console.log(
      [
        '',
        `Configuration template written: ${config.file}`,
        'Next steps:',
        `  1. Get a ${config.provider} key: ${config.keysUrl}`,
        '  2. Open that file and set "apiKey" yourself (this tool never receives it).',
        '  3. Verify: node scripts/doctor.mjs',
        '',
        `Accepted providers: ${PROVIDER_IDS.join(', ')}`,
        'Start a new session in your host so the skill is discovered.',
      ].join('\n'),
    );
    return;
  }

  try {
    const existing = await loadConfig(config.file);
    console.log(
      [
        '',
        `Kept existing configuration: ${config.file}`,
        `Provider: ${existing.provider}    Model: ${existing.model}`,
        existing.hasApiKey
          ? 'Verify it with: node scripts/doctor.mjs'
          : `Set "apiKey" in that file (get one at ${config.keysUrl}), then verify with: node scripts/doctor.mjs`,
      ].join('\n'),
    );
  } catch (error) {
    console.log(`\nExisting configuration at ${config.file} could not be used: ${error.message}`);
    console.log('Fix it, or delete that file and rerun this installer for a fresh template.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Installation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
