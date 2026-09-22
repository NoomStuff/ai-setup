import { access, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { exists, home, root, scriptPath, sourceInstructions, sourceSkills, statePath, timestamp } from './env.mjs';
import { harnesses, harnessWillInstall, relativeHome, targetPath } from './presets.mjs';
import { loadConfig } from './config.mjs';
import { dim, printHeader, printResultGroups, sym } from './ui.mjs';

export async function removeEmptyParents(path) {
  let current = dirname(path);
  while (current !== home && current.startsWith(home + sep)) {
    const entries = await readdir(current).catch(() => null);
    if (!entries || entries.length) return;
    await rm(current, { recursive: true });
    current = dirname(current);
  }
}

export async function ensureDir(path) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const info = await stat(path).catch(() => null);
    if (!info || !info.isDirectory()) throw error;
  }
}

export async function backup(path, backupRoot) {
  if (!await exists(path)) return;
  const destination = join(backupRoot, relative(home, path));
  await ensureDir(dirname(destination));
  await cp(path, destination, { recursive: true, dereference: false });
}

export async function replace(source, destination, backupRoot) {
  if (await exists(destination)) {
    if (!await sameContent(source, destination)) await backup(destination, backupRoot);
    await rm(destination, { recursive: true, force: true });
  }
  await ensureDir(dirname(destination));
  await cp(source, destination, { recursive: true });
}

export async function sameContent(source, destination) {
  const sourceInfo = await stat(source);
  const targetInfo = await stat(destination).catch(() => null);
  if (!targetInfo || sourceInfo.isDirectory() !== targetInfo.isDirectory()) return false;
  if (sourceInfo.isFile()) return (await readFile(source)).equals(await readFile(destination));
  const left = (await readdir(source)).sort();
  const right = (await readdir(destination)).sort();
  if (left.join('\0') !== right.join('\0')) return false;
  for (const entry of left) if (!await sameContent(join(source, entry), join(destination, entry))) return false;
  return true;
}

export async function sourceSkillNames() {
  await access(sourceInstructions, constants.R_OK);
  const entries = await readdir(sourceSkills, { withFileTypes: true });
  const names = entries.filter(entry => entry.isDirectory() && entry.name !== '.system').map(entry => entry.name);
  if (!names.length) throw new Error('The skills directory contains no skills.');
  for (const name of names) await access(join(sourceSkills, name, 'SKILL.md'), constants.R_OK);
  return names;
}

export async function install(config, opts = false) {
  const silent = typeof opts === 'object' ? !!opts.quiet : !!opts;
  const allSkills = await sourceSkillNames();
  const skillNames = allSkills.filter(name => !config.disabledSkills.includes(name));
  const backupRoot = join(home, '.ai-setup-backup', timestamp());
  const results = [];
  const managedPaths = [];
  const selectedHarnesses = harnesses(config);
  const activeHarnesses = [];
  const skippedHarnesses = [];
  for (const harness of selectedHarnesses) {
    if (await harnessWillInstall(harness, config)) activeHarnesses.push(harness);
    else skippedHarnesses.push(harness);
  }
  for (const harness of activeHarnesses) {
    if (harness.instructions) {
      const destination = targetPath(harness.instructions);
      await replace(sourceInstructions, destination, backupRoot);
      managedPaths.push(destination);
      results.push({ harness, instructions: destination });
    }
    if (harness.skills) {
      const destination = targetPath(harness.skills);
      await ensureDir(destination);
      for (const skill of skillNames) {
        const skillDestination = join(destination, skill);
        await replace(join(sourceSkills, skill), skillDestination, backupRoot);
        managedPaths.push(skillDestination);
      }
      const result = results.find(item => item.harness.id === harness.id);
      if (result) result.skills = destination;
      else results.push({ harness, skills: destination });
    }
  }
  const previousState = JSON.parse(await readFile(statePath, 'utf8').catch(() => '{"managedPaths":[]}'));
  for (const previousPath of previousState.managedPaths ?? []) {
    if (!managedPaths.includes(previousPath)) {
      if (await exists(previousPath)) {
        await backup(previousPath, backupRoot);
        await rm(previousPath, { recursive: true, force: true });
      }
      await removeEmptyParents(previousPath);
    }
  }
  await ensureDir(dirname(statePath));
  await writeFile(statePath, JSON.stringify({ version: 1, repository: root, managedPaths }, null, 2) + '\n');
  await configureHooks(config);
  await setAutostart(config.runOnStartup, config.autoFetch);
  const backupExists = await exists(backupRoot);
  const summary = {
    skillNames,
    results,
    activeHarnesses,
    skippedHarnesses,
    backupRoot,
    backupExists
  };
  if (!silent) renderInstallSummary(summary);
  return summary;
}

export function renderInstallSummary(summary) {
  const { skillNames, results, activeHarnesses, skippedHarnesses, backupRoot, backupExists } = summary;
  printHeader('Update complete', `${activeHarnesses.length} ready ${sym.dot} ${skippedHarnesses.length} skipped`);
  printResultGroups(
    `${activeHarnesses.length} updated`,
    results.map(result => ({
      name: result.harness.name,
      lines: [
        result.instructions && `instructions ${sym.right} ${relativeHome(result.instructions)}`,
        result.skills && `${skillNames.length} skills ${sym.right} ${relativeHome(result.skills)}`
      ].filter(Boolean)
    })),
    `${skippedHarnesses.length} skipped`,
    skippedHarnesses.map(harness => ({
      name: harness.name,
      lines: [`no install folder at ${relativeHome(targetPath(harness.detect))}`]
    }))
  );
  if (backupExists) console.log(`${dim('Backups')}  ${backupRoot}\n`);
}

export async function verify(config, opts = false) {
  const silent = typeof opts === 'object' ? !!opts.quiet : !!opts;
  const allSkills = await sourceSkillNames();
  const skillNames = allSkills.filter(name => !config.disabledSkills.includes(name));
  const failures = [];
  const checked = [];
  const skipped = [];
  for (const harness of harnesses(config)) {
    if (!await harnessWillInstall(harness, config)) {
      skipped.push(harness);
      continue;
    }
    checked.push(harness);
    if (harness.instructions && !await sameContent(sourceInstructions, targetPath(harness.instructions))) {
      failures.push(`${harness.name} instructions`);
    }
    if (harness.skills) for (const skill of skillNames) {
      if (!await sameContent(join(sourceSkills, skill), join(targetPath(harness.skills), skill))) failures.push(`${harness.name} skill ${skill}`);
    }
  }
  if (failures.length) throw new Error(`Missing or outdated targets:\n  ${failures.join('\n  ')}`);
  const summary = { checked, skipped };
  if (!silent) renderVerifySummary(summary);
  return summary;
}

export function renderVerifySummary(summary) {
  const { checked, skipped } = summary;
  printHeader('Verification passed', `${checked.length} checked ${sym.dot} ${skipped.length} skipped`);
  printResultGroups(
    `${checked.length} match`,
    checked.map(harness => ({ name: harness.name, lines: [matchDetail(harness)] })),
    `${skipped.length} skipped`,
    skipped.map(harness => ({ name: harness.name, lines: ['install folder not found'] }))
  );
}

export function matchDetail(harness) {
  if (harness.instructions && harness.skills) return 'instructions and skills match';
  if (harness.instructions) return 'instructions match';
  return 'skills match';
}

export async function lastAppliedAt() {
  const info = await stat(statePath).catch(() => null);
  return info ? info.mtime : null;
}

export function formatAgo(date, now = new Date()) {
  const seconds = Math.max(0, Math.floor((now - date) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `git ${gitArgs.join(' ')} failed`).trim());
  return result.stdout.trim();
}

export async function configureHooks(config) {
  const markerStart = '# ai-setup managed start';
  const markerEnd = '# ai-setup managed end';
  const invocation = `"${process.execPath.replaceAll('\\', '/')}" "${scriptPath.replaceAll('\\', '/')}" install`;
  for (const name of ['post-merge', 'post-rewrite']) {
    const path = join(root, '.git', 'hooks', name);
    let content = await readFile(path, 'utf8').catch(() => '#!/bin/sh\n');
    content = content.replace(new RegExp(`\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`, 'g'), '\n');
    content += `\n${markerStart}\n${invocation}\n${markerEnd}\n`;
    await ensureDir(dirname(path));
    await writeFile(path, content, { mode: 0o755 });
  }
}

export function startupFiles() {
  return {
    windows: join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'AI Setup Watcher.cmd'),
    macos: join(home, 'Library', 'LaunchAgents', 'dev.ai-setup.watcher.plist'),
    linux: join(home, '.config', 'autostart', 'ai-setup-watcher.desktop')
  };
}

export function xmlEscape(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export async function setAutostart(enabled, autoFetch = false) {
  const files = startupFiles();
  for (const path of Object.values(files)) await rm(path, { force: true });
  if (!enabled) return;

  let path;
  let content;
  const startupCommand = autoFetch ? 'watch' : 'install';
  if (process.platform === 'win32') {
    path = files.windows;
    content = `@echo off\r\nstart "" /min "${process.execPath}" "${scriptPath}" ${startupCommand}\r\n`;
  } else if (process.platform === 'darwin') {
    path = files.macos;
    content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>dev.ai-setup.watcher</string>
<key>ProgramArguments</key><array><string>${xmlEscape(process.execPath)}</string><string>${xmlEscape(scriptPath)}</string><string>${startupCommand}</string></array>
<key>RunAtLoad</key><true/>${autoFetch ? '<key>KeepAlive</key><true/>' : ''}
</dict></plist>
`;
  } else {
    path = files.linux;
    const quote = value => `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
    content = `[Desktop Entry]\nType=Application\nName=AI Setup\nExec=${quote(process.execPath)} ${quote(scriptPath)} ${startupCommand}\nTerminal=false\nX-GNOME-Autostart-enabled=true\n`;
  }
  await ensureDir(dirname(path));
  await writeFile(path, content, { mode: 0o755 });
}

export async function watch(config) {
  if (!config.autoFetch) throw new Error('Auto background updates are turned off.');
  const interval = 15 * 60_000;
  await install(config, true);
  console.log(`Applied local files. Watching for updates every ${interval / 60_000} minutes. Press Ctrl+C to stop.`);
  while (true) {
    try {
      if (git('status', '--porcelain')) throw new Error('Repository has local changes. Skipping pull.');
      git('fetch', '--quiet');
      const branch = git('branch', '--show-current');
      if (!branch) throw new Error('Repository is in detached HEAD state. Skipping pull.');
      const upstream = git('rev-parse', '--abbrev-ref', `${branch}@{upstream}`);
      const local = git('rev-parse', 'HEAD');
      const remote = git('rev-parse', upstream);
      if (local !== remote) {
        if (git('merge-base', local, remote) !== local) throw new Error('Local and remote branches diverged. Refusing to merge.');
        git('merge', '--ff-only', remote);
        await install(await loadConfig(), true);
        console.log(`[${new Date().toLocaleString()}] Pulled and applied ${remote.slice(0, 8)}.`);
      }
    } catch (error) { console.error(`[${new Date().toLocaleString()}] ${error.message}`); }
    await new Promise(resolveTimer => setTimeout(resolveTimer, interval));
  }
}
