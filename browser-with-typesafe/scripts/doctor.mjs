#!/usr/bin/env node
/**
 * browser-with-typesafe doctor.
 *
 * One command that answers "is this skill usable right now?" — configuration
 * present, permissions private, provider and model valid, credential set, and
 * the endpoint actually reachable.
 *
 * The credential is never printed: only its presence and length are reported.
 *
 * Usage: node scripts/doctor.mjs [--config <path>] [--help]
 * Exit code: 0 when ready, 1 otherwise.
 */

import { readFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG_PATH, resolveProviderConfig } from '../bridge/core.mjs';

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Probe the configured endpoint with one minimal, well-formed decision request.
 * Returns a plain result object; never throws.
 */
export async function probeEndpoint({ endpoint, apiKey, model, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const body = JSON.stringify({
    model,
    state: { goal: 'connectivity check', browser: 'none', history: [] },
    questions: {
      next: {
        type: 'choice',
        instructions: 'Report whether the service is reachable.',
        criteria: { ok: 'Reachable', no: 'Not reachable' },
      },
    },
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) return { ok: false, status: response.status, error: 'unexpected status' };
    const payload = await response.json();
    return { ok: true, status: response.status, model: payload?.model ?? model };
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.message : 'request failed' };
  }
}

function summarize(checks) {
  return {
    ready: checks.every((check) => check.ok),
    checks,
    blocking: checks.filter((check) => !check.ok).map((check) => check.name),
  };
}

/**
 * Run every check in order, stopping at the first blocking failure so the output
 * says what to fix rather than cascading noise.
 */
export async function runDoctor({ configPath = DEFAULT_CONFIG_PATH, probe = probeEndpoint } = {}) {
  const checks = [];
  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    return ok;
  };

  let raw;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch (error) {
    record(
      'config file',
      false,
      error.code === 'ENOENT'
        ? `missing at ${configPath} — run \`node install.mjs\` to create a template`
        : error.message,
    );
    return summarize(checks);
  }
  record('config file', true, configPath);

  const fileInfo = await stat(configPath);
  const fileMode = fileInfo.mode & 0o777;
  const filePrivate = (fileMode & 0o077) === 0;
  record(
    'file permissions',
    filePrivate,
    filePrivate
      ? `0${fileMode.toString(8)} (not readable by group or other)`
      : `0${fileMode.toString(8)} — run \`chmod 600 ${configPath}\``,
  );

  try {
    const dirInfo = await stat(dirname(configPath));
    const dirMode = dirInfo.mode & 0o777;
    const dirPrivate = (dirMode & 0o077) === 0;
    record(
      'directory permissions',
      dirPrivate,
      dirPrivate
        ? `0${dirMode.toString(8)} (not accessible by group or other)`
        : `0${dirMode.toString(8)} — run \`chmod 700 ${dirname(configPath)}\``,
    );
  } catch (error) {
    record('directory permissions', false, error.message);
  }

  if (!filePrivate) return summarize(checks);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    record('json', false, 'not valid JSON — fix it or recreate it with `node install.mjs`');
    return summarize(checks);
  }
  record('json', true, 'parsed');

  let resolved;
  try {
    resolved = resolveProviderConfig(parsed?.provider, parsed?.model);
  } catch (error) {
    record('provider / model', false, error.message);
    return summarize(checks);
  }
  record('provider / model', true, `${resolved.provider} / ${resolved.model}`);

  const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '';
  if (!record('apiKey', apiKey.length > 0, apiKey ? `set (${apiKey.length} characters, not shown)` : `empty — get one at ${resolved.keysUrl}`)) {
    return summarize(checks);
  }

  const result = await probe({ endpoint: resolved.endpoint, apiKey, model: resolved.model });
  record(
    'endpoint',
    result.ok,
    result.ok
      ? `${resolved.endpoint} -> HTTP ${result.status} (model ${result.model})`
      : `${resolved.endpoint} -> ${result.status === null ? result.error : `HTTP ${result.status}`}`,
  );

  return summarize(checks);
}

function printHelp() {
  console.log(
    [
      'Usage: node scripts/doctor.mjs [--config <path>] [--help]',
      '',
      `Checks the configuration at ${DEFAULT_CONFIG_PATH} (or --config <path>):`,
      '  config file · file permissions · directory permissions · JSON',
      '  provider / model · apiKey presence · endpoint reachability',
      '',
      'Prints no credential. Exit code 0 when ready, 1 otherwise.',
    ].join('\n'),
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    printHelp();
    return;
  }

  let configPath = DEFAULT_CONFIG_PATH;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--config') configPath = args[(i += 1)];
    else {
      console.error(`Unknown option "${args[i]}". Use --help.`);
      process.exitCode = 1;
      return;
    }
  }

  const report = await runDoctor({ configPath });

  for (const check of report.checks) {
    console.log(`  ${check.ok ? 'ok  ' : 'FAIL'}  ${check.name.padEnd(21)} ${check.detail}`);
  }
  console.log('');
  console.log(report.ready ? 'result  READY' : `result  NOT READY (${report.blocking.join(', ')})`);
  process.exitCode = report.ready ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
