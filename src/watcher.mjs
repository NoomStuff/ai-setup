import { open, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { home, root, scriptPath, statePath } from './env.mjs';

export const watcherPath = `${statePath}.watcher`;
export const watcherLogPath = `${statePath}.watcher.log`;
const stopPath = `${watcherPath}.stop`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function watcherState() {
  let state;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      state = JSON.parse(await readFile(watcherPath, 'utf8'));
      break;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      if (!(error instanceof SyntaxError) || attempt === 9) throw error;
      await delay(50);
    }
  }
  if (!state) return null;
  if (process.platform === 'win32') {
    const result = spawnSync('tasklist.exe', ['/FI', `PID eq ${state.pid}`, '/FO', 'CSV', '/NH'],
      { windowsHide: true, encoding: 'utf8', timeout: 5000 });
    if (result.status !== 0) throw new Error('Could not check the background updater process.');
    return result.stdout.split('\n').some(line => line.split(',')[1] === `"${state.pid}"`) ? state : null;
  }
  try { process.kill(state.pid, 0); }
  catch (error) {
    if (error.code !== 'ESRCH') throw error;
    return null;
  }
  return state;
}

export async function acquireWatcher() {
  await mkdir(dirname(watcherPath), { recursive: true });
  let file;
  try { file = await open(watcherPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await watcherState()) return false;
    await rm(watcherPath, { force: true });
    try { file = await open(watcherPath, 'wx'); }
    catch (retryError) {
      if (retryError.code === 'EEXIST') return false;
      throw retryError;
    }
  }
  try {
    await file.writeFile(JSON.stringify({ pid: process.pid, ready: false }));
    await rm(stopPath, { force: true });
  } finally { await file.close(); }
  return true;
}

export async function readyWatcher() {
  await writeFile(watcherPath, JSON.stringify({ pid: process.pid, ready: true }));
}

export async function releaseWatcher() {
  await rm(watcherPath, { force: true });
  await rm(stopPath, { force: true });
}

export async function waitForNextFetch(interval) {
  const deadline = Date.now() + interval;
  do {
    if (await readFile(stopPath, 'utf8').catch(() => '') === String(process.pid)) return false;
    await delay(Math.min(1000, Math.max(0, deadline - Date.now())));
  } while (Date.now() < deadline);
  return true;
}

export async function startWatcher() {
  const existing = await watcherState();
  if (existing?.ready) return;
  await mkdir(dirname(watcherLogPath), { recursive: true });
  const log = openSync(watcherLogPath, 'a');
  let child;
  let failure;
  try {
    if (!existing) child = spawn(process.execPath, [scriptPath, 'watch', '--home', home], {
      cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log, log]
    });
    child?.on('error', error => { failure = error; });
    child?.unref();
  } finally { closeSync(log); }
  for (let attempt = 0; attempt < 100; attempt++) {
    if (failure) throw failure;
    if ((await watcherState())?.ready) return;
    if (child && child.exitCode !== null) break;
    await delay(100);
  }
  throw new Error(`Background updates failed to start. See ${watcherLogPath}`);
}

export async function stopWatcher() {
  const state = await watcherState();
  if (!state) return;
  await writeFile(stopPath, String(state.pid));
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await watcherState())?.pid !== state.pid) return;
    await delay(100);
  }
  throw new Error(`Background updates have not stopped yet. See ${watcherLogPath}`);
}
