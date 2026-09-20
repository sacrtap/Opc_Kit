#!/usr/bin/env node
/**
 * browser-with-typesafe installer.
 *
 * Exposes this skill to the skill directories the common agent hosts scan, so a
 * single checkout serves omp, Codex, Claude Code, Cursor, and any other host
 * that reads the shared agents layout.
 *
 * Design rules kept deliberately strict:
 *   - installation never touches existing configuration
 *   - credentials never move into the skill directory or into config.json
 *   - an existing target is never overwritten silently
 *
 * Usage: node install.mjs [--target <id>] [--copy] [--config <provider> <model> <envFile>]
 *                         [--no-config] [--uninstall] [--help]
 */

import { cp, lstat, mkdir, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const NAME = 'browser-with-typesafe';
const SKILL_ROOT = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(homedir(), '.config', NAME);
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const PROVIDERS = {
  typesafe: { model: 'jev-latest', pattern: /^jev-[a-z0-9.-]{1,80}$/ },
  openrouter: { model: '~typesafe/jev-latest', pattern: /^(?:~?typesafe\/)?jev-[a-z0-9.-]{1,80}$/ },
};

/**
 * Install targets keyed by id.
 *
 * `agents-user` is the shared layout the reference skill installs into and the
 * one omp's `agents` provider scans, so it covers omp, Codex, and other
 * agents-compatible hosts at once.
 */
const TARGETS = {
  'agents-user': () => join(homedir(), '.agents', 'skills'),
  'agents-project': () => join(process.cwd(), '.agents', 'skills'),
  'claude-user': () => join(homedir(), '.claude', 'skills'),
};

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function resolveTargetRoot(id) {
  if (TARGETS[id]) return TARGETS[id]();
  if (isAbsolute(id)) return id;
  throw new Error(`Unknown target "${id}". Choose ${Object.keys(TARGETS).join(', ')} or an absolute path.`);
}

function validateConfig(config) {
  const provider = PROVIDERS[config.provider];
  if (!provider) throw new Error(`Unsupported provider "${config.provider}". Choose typesafe or openrouter.`);
  if (typeof config.model !== 'string' || !provider.pattern.test(config.model)) {
    throw new Error('Enter a valid Jev model id.');
  }
  if (!isAbsolute(config.envFile ?? '')) {
    throw new Error('envFile must be an absolute path to an existing dotenv file.');
  }
  return config;
}

async function writeConfig(config) {
  validateConfig(config);
  if (!(await stat(config.envFile)).isFile()) {
    throw new Error('envFile must point at a regular file.');
  }
  if (await exists(CONFIG_PATH)) return { configPath: CONFIG_PATH, written: false };

  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await writeFile(
    CONFIG_PATH,
    `${JSON.stringify({ provider: config.provider, model: config.model, envFile: config.envFile }, null, 2)}\n`,
    { mode: 0o600, flag: 'wx' },
  );
  return { configPath: CONFIG_PATH, written: true };
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
      const marker = join(target, 'bridge', 'index.mjs');
      if (await exists(marker)) {
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

function parseArgs(argv) {
  const options = { target: 'agents-user', mode: 'link', configure: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') options.help = true;
    else if (arg === '--copy') options.mode = 'copy';
    else if (arg === '--no-config') options.configure = false;
    else if (arg === '--uninstall') options.uninstall = true;
    else if (arg === '--target') options.target = argv[(i += 1)];
    else if (arg === '--config') {
      options.config = { provider: argv[i + 1], model: argv[i + 2], envFile: argv[i + 3] };
      i += 3;
    } else throw new Error(`Unknown option "${arg}". Use --help.`);
  }
  return options;
}

async function promptForConfig() {
  const prompts = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const provider = (await prompts.question('Jev provider (typesafe / openrouter): ')).trim();
    const model =
      (await prompts.question(`Model [${PROVIDERS[provider]?.model ?? ''}]: `)).trim() ||
      PROVIDERS[provider]?.model;
    const envFile = (
      await prompts.question('Absolute path to your dotenv file holding the key (not the key itself): ')
    ).trim();
    return { provider, model, envFile };
  } finally {
    prompts.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      [
        `Usage: node install.mjs [--target ${Object.keys(TARGETS).join('|')}|<absolute path>] [--copy] [--uninstall]`,
        '                       [--config <provider> <model> <envFile>] [--no-config]',
        '',
        `Installs/link this skill as "<target>/skills/${NAME}".`,
        'Default target: agents-user (~/.agents/skills), the layout omp, Codex, and other',
        'agents-compatible hosts scan.',
        'Existing configuration is always preserved; credentials stay in your dotenv file.',
      ].join('\n'),
    );
    return;
  }

  const targetRoot = resolveTargetRoot(options.target);

  if (options.uninstall) {
    const result = await uninstall({ targetRoot });
    console.log(result.removed ? `Removed ${result.target}.` : `Nothing installed at ${result.target}.`);
    console.log(`Configuration preserved at ${CONFIG_PATH}.`);
    return;
  }

  const result = await install({ targetRoot, mode: options.mode });
  console.log(`${result.changed ? 'Installed' : 'Already installed'} ${result.target} (${result.mode}).`);

  let config;
  if (options.config) config = options.config;
  else if (options.configure && !(await exists(CONFIG_PATH))) {
    if (!process.stdin.isTTY) {
      console.log(`Configuration pending; write ${CONFIG_PATH} or rerun interactively.`);
      return;
    }
    config = await promptForConfig();
  }

  if (config) {
    const written = await writeConfig(config);
    console.log(
      written.written
        ? `Wrote ${written.configPath}. Keep the API key in your dotenv file.`
        : `Kept existing ${written.configPath}.`,
    );
  } else if (await exists(CONFIG_PATH)) {
    console.log(`Using existing ${CONFIG_PATH}.`);
  }

  console.log('Start a new session in your host so the skill is discovered.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Installation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
