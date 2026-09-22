#!/usr/bin/env node
import { access, cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const scriptPath = fileURLToPath(import.meta.url);
const root = dirname(dirname(scriptPath));
const configPath = join(root, 'config.json');
const defaultConfigPath = join(dirname(scriptPath), 'default-config.json');
const sourceInstructions = join(root, 'AGENTS.md');
const sourceSkills = join(root, 'skills');
const args = process.argv.slice(2);
const command = args[0] ?? 'menu';
const homeFlag = args.indexOf('--home');
const home = resolve(homeFlag >= 0 ? args[homeFlag + 1] : homedir());
const statePath = join(home, '.ai-setup-state', `${Buffer.from(root).toString('base64url')}.json`);

if (!process.versions.bun && Number(process.versions.node.split('.')[0]) < 18) {
  throw new Error('AI setup needs Node.js 18 or newer.');
}

const presets = {
  agents: { name: 'Agent Skills standard', detect: ['.agents'], skills: ['.agents', 'skills'] },
  codex: { name: 'OpenAI Codex', detect: ['.codex'], instructions: ['.codex', 'AGENTS.md'], skills: ['.codex', 'skills'] },
  claude: { name: 'Claude Code', detect: ['.claude'], instructions: ['.claude', 'CLAUDE.md'], skills: ['.claude', 'skills'] },
  gemini: { name: 'Gemini CLI', detect: ['.gemini'], instructions: ['.gemini', 'GEMINI.md'], skills: ['.gemini', 'skills'] },
  copilot: { name: 'GitHub Copilot CLI', detect: ['.copilot'], instructions: ['.copilot', 'copilot-instructions.md'], skills: ['.copilot', 'skills'] },
  cursor: { name: 'Cursor', detect: ['.cursor'], instructions: ['.cursor', 'rules', 'ai-setup.md'], skills: ['.cursor', 'skills'] },
  windsurf: { name: 'Windsurf', detect: ['.codeium', 'windsurf'], instructions: ['.codeium', 'windsurf', 'memories', 'global_rules.md'], skills: ['.windsurf', 'skills'] },
  cline: { name: 'Cline', detect: ['.cline'], instructions: ['.cline', 'rules', 'ai-setup.md'], skills: ['.cline', 'skills'] },
  roo: { name: 'Roo Code', detect: ['.roo'], instructions: ['.roo', 'rules', 'ai-setup.md'], skills: ['.roo', 'skills'] },
  opencode: { name: 'OpenCode', detect: ['.config', 'opencode'], instructions: ['.config', 'opencode', 'AGENTS.md'], skills: ['.config', 'opencode', 'skills'] },
  antigravity: { name: 'Google Antigravity', detect: ['.gemini', 'antigravity'], skills: ['.gemini', 'antigravity', 'skills'] },
  kiro: { name: 'Kiro', detect: ['.kiro'], skills: ['.kiro', 'skills'] },
  amp: { name: 'Amp', detect: ['.config', 'amp'], skills: ['.config', 'amp', 'skills'] },
  goose: { name: 'Goose', detect: ['.config', 'goose'], skills: ['.config', 'goose', 'skills'] },
  zcode: { name: 'ZCode', detect: ['.zcode'], instructions: ['.zcode', 'AGENTS.md'], skills: ['.zcode', 'skills'] }
};

const exists = path => access(path, constants.F_OK).then(() => true, () => false);
const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function loadConfig() {
  const base = JSON.parse(await readFile(defaultConfigPath, 'utf8'));
  const hasUserConfig = await exists(configPath);
  const local = JSON.parse(await readFile(configPath, 'utf8').catch(() => '{}'));
  const config = {
    ...base,
    ...local
  };
  if (typeof config.runOnStartup !== 'boolean') throw new Error('runOnStartup must be true or false.');
  if (typeof config.autoFetch !== 'boolean') throw new Error('autoFetch must be true or false.');
  config.enabledHarnesses ??= Object.keys(presets);
  if (!Array.isArray(config.enabledHarnesses) || config.enabledHarnesses.some(id => typeof id !== 'string')) {
    throw new Error('enabledHarnesses must be a list of harness IDs.');
  }
  if (!hasUserConfig) await savePreferences(config);
  return config;
}

async function savePreferences(config) {
  const preferences = {
    enabledHarnesses: config.enabledHarnesses,
    runOnStartup: config.runOnStartup,
    autoFetch: config.autoFetch
  };
  await writeFile(configPath, JSON.stringify(preferences, null, 2) + '\n');
}

function harnesses(config) {
  return config.enabledHarnesses.map(id => {
    const value = presets[id];
    if (!value) throw new Error(`Unknown harness "${id}" in local preferences.`);
    return { id, ...value };
  });
}

async function sourceSkillNames() {
  await access(sourceInstructions, constants.R_OK);
  const entries = await readdir(sourceSkills, { withFileTypes: true });
  const names = entries.filter(entry => entry.isDirectory() && entry.name !== '.system').map(entry => entry.name);
  if (!names.length) throw new Error('The skills directory contains no skills.');
  for (const name of names) await access(join(sourceSkills, name, 'SKILL.md'), constants.R_OK);
  return names;
}

function targetPath(parts) {
  if (!Array.isArray(parts) || !parts.length) throw new Error('Harness paths must be non-empty arrays.');
  const target = resolve(home, ...parts);
  const prefix = home.endsWith(sep) ? home : home + sep;
  if (target !== home && !target.startsWith(prefix)) throw new Error(`Target escapes the home directory: ${target}`);
  return target;
}

async function harnessIsInstalled(harness) {
  return exists(targetPath(harness.detect));
}

function relativeHome(path) {
  const value = relative(home, path).split(sep).join('/');
  return value ? `~/${value}` : '~';
}

const useColor = (output.isTTY ?? false) && !process.env.NO_COLOR;
const paint = code => value => useColor ? `\x1b[${code}m${value}\x1b[0m` : value;
const bold = paint(1);
const dim = paint(2);
const green = paint(32);

function printHeader(title, subtitle = '') {
  console.log(`\n${bold(title)}`);
  if (subtitle) console.log(dim(subtitle));
  console.log(dim('─'.repeat(44)));
}

function printOptions(items) {
  const labelWidth = Math.max(...items.map(item => item.label.length));
  for (const item of items) {
    const key = String(item.key).padStart(2);
    const detail = item.detail ? `  ${dim(item.detail)}` : '';
    console.log(`  ${key}  ${item.label.padEnd(labelWidth)}${detail}`);
  }
  console.log();
}

function printHarnessOptions(rows) {
  const nameWidth = Math.max(...rows.map(row => row.name.length));
  for (const row of rows) {
    const box = row.enabled ? green('[x]') : dim('[ ]');
    const status = (row.detected ? 'found' : 'not installed').padEnd(13);
    const found = row.detected ? green(status) : dim(status);
    console.log(`  ${String(row.key).padStart(2)}  ${box}  ${row.name.padEnd(nameWidth)}  ${found}`);
  }
  console.log();
}

function printResultGroups(okTitle, okItems, skipTitle, skipItems) {
  if (okItems.length) {
    console.log(`\n${green('✓')} ${bold(okTitle)}`);
    for (const item of okItems) {
      console.log(`  ${item.name}`);
      for (const line of item.lines) console.log(`    ${dim(line)}`);
    }
  }
  if (skipItems.length) {
    console.log(`\n${dim('–')} ${bold(skipTitle)}`);
    for (const item of skipItems) {
      console.log(`  ${item.name}`);
      for (const line of item.lines) console.log(`    ${dim(line)}`);
    }
  }
  console.log();
}

async function removeEmptyParents(path) {
  let current = dirname(path);
  while (current !== home && current.startsWith(home + sep)) {
    const entries = await readdir(current).catch(() => null);
    if (!entries || entries.length) return;
    await rm(current, { recursive: true });
    current = dirname(current);
  }
}

async function backup(path, backupRoot) {
  if (!await exists(path)) return;
  const destination = join(backupRoot, relative(home, path));
  await mkdir(dirname(destination), { recursive: true });
  await cp(path, destination, { recursive: true, dereference: false });
}

async function replace(source, destination, backupRoot) {
  if (await exists(destination)) {
    if (!await sameContent(source, destination)) await backup(destination, backupRoot);
    await rm(destination, { recursive: true, force: true });
  }
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function sameContent(source, destination) {
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

async function install(config, quiet = false) {
  const skillNames = await sourceSkillNames();
  const backupRoot = join(home, '.ai-setup-backup', timestamp());
  const results = [];
  const managedPaths = [];
  const selectedHarnesses = harnesses(config);
  const activeHarnesses = [];
  const skippedHarnesses = [];
  for (const harness of selectedHarnesses) {
    if (await harnessIsInstalled(harness)) activeHarnesses.push(harness);
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
      await mkdir(destination, { recursive: true });
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
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify({ version: 1, repository: root, managedPaths }, null, 2) + '\n');
  await configureHooks(config);
  await setAutostart(config.runOnStartup, config.autoFetch);
  if (!quiet) {
    printHeader('Install complete', `${activeHarnesses.length} ready · ${skippedHarnesses.length} skipped`);
    printResultGroups(
      `${activeHarnesses.length} installed`,
      results.map(result => ({
        name: result.harness.name,
        lines: [
          result.instructions && `instructions -> ${relativeHome(result.instructions)}`,
          result.skills && `${skillNames.length} skills -> ${relativeHome(result.skills)}`
        ].filter(Boolean)
      })),
      `${skippedHarnesses.length} skipped`,
      skippedHarnesses.map(harness => ({
        name: harness.name,
        lines: [`no install folder at ${relativeHome(targetPath(harness.detect))}`]
      }))
    );
    if (await exists(backupRoot)) console.log(`${dim('Backups')}  ${backupRoot}\n`);
  }
}

async function verify(config) {
  const skillNames = await sourceSkillNames();
  const failures = [];
  const checked = [];
  const skipped = [];
  for (const harness of harnesses(config)) {
    if (!await harnessIsInstalled(harness)) {
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
  printHeader('Verification passed', `${checked.length} checked · ${skipped.length} skipped`);
  printResultGroups(
    `${checked.length} match`,
    checked.map(harness => ({ name: harness.name, lines: ['instructions and skills match'] })),
    `${skipped.length} skipped`,
    skipped.map(harness => ({ name: harness.name, lines: ['install folder not found'] }))
  );
}

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `git ${gitArgs.join(' ')} failed`).trim());
  return result.stdout.trim();
}

async function configureHooks(config) {
  const markerStart = '# ai-setup managed start';
  const markerEnd = '# ai-setup managed end';
  const invocation = `"${process.execPath.replaceAll('\\', '/')}" "${scriptPath.replaceAll('\\', '/')}" install`;
  for (const name of ['post-merge', 'post-rewrite']) {
    const path = join(root, '.git', 'hooks', name);
    let content = await readFile(path, 'utf8').catch(() => '#!/bin/sh\n');
    content = content.replace(new RegExp(`\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`, 'g'), '\n');
    content += `\n${markerStart}\n${invocation}\n${markerEnd}\n`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { mode: 0o755 });
  }
}

function startupFiles() {
  return {
    windows: join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'AI Setup Watcher.cmd'),
    macos: join(home, 'Library', 'LaunchAgents', 'dev.ai-setup.watcher.plist'),
    linux: join(home, '.config', 'autostart', 'ai-setup-watcher.desktop')
  };
}

function xmlEscape(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function setAutostart(enabled, autoFetch = false) {
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
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, { mode: 0o755 });
}

async function chooseHarnesses(config, prompt) {
  const ids = Object.keys(presets);
  const rows = [];
  for (const [index, id] of ids.entries()) {
    rows.push({
      key: index + 1,
      name: presets[id].name,
      enabled: config.enabledHarnesses.includes(id),
      detected: await harnessIsInstalled(presets[id])
    });
  }
  printHeader('Choose apps', `${config.enabledHarnesses.length} enabled`);
  printHarnessOptions(rows);
  const answer = (await prompt.question('Toggle numbers with commas, "found" enables installed apps, Enter keeps this selection: ')).trim().toLowerCase();
  if (!answer) return;
  if (answer === 'found') {
    config.enabledHarnesses = [];
    for (const id of ids) if (await harnessIsInstalled(presets[id])) config.enabledHarnesses.push(id);
  } else {
    const indexes = answer.split(',').map(value => Number(value.trim()) - 1);
    if (!indexes.length || indexes.some(index => !ids[index])) throw new Error('Enter valid numbers separated by commas.');
    const selected = new Set(config.enabledHarnesses);
    for (const index of indexes) selected.has(ids[index]) ? selected.delete(ids[index]) : selected.add(ids[index]);
    config.enabledHarnesses = ids.filter(id => selected.has(id));
  }
  await savePreferences(config);
  console.log(`\nSaved · ${config.enabledHarnesses.length} enabled`);
}

async function menu(config) {
  const prompt = createInterface({ input, output });
  try {
    while (true) {
      const detectedCount = (await Promise.all(harnesses(config).map(harnessIsInstalled))).filter(Boolean).length;
      printHeader('AI setup', `${config.enabledHarnesses.length} enabled · ${detectedCount} found`);
      printOptions([
        { key: 1, label: 'Install or update', detail: 'Copy instructions and skills' },
        { key: 2, label: 'Choose apps', detail: `${config.enabledHarnesses.length} enabled` },
        { key: 3, label: 'Verify', detail: 'Check installed copies' },
        { key: 4, label: 'Run on startup', detail: config.runOnStartup ? 'on' : 'off' },
        { key: 5, label: 'Fetch updates automatically', detail: config.autoFetch ? 'on' : 'off' },
        { key: 6, label: 'Exit', detail: '' }
      ]);
      const choice = (await prompt.question('Choose an option: ')).trim();
      if (choice === '1') await install(config);
      else if (choice === '2') {
        await chooseHarnesses(config, prompt);
      } else if (choice === '3') await verify(config);
      else if (choice === '4') {
        config.runOnStartup = !config.runOnStartup;
        await savePreferences(config);
        await setAutostart(config.runOnStartup, config.autoFetch);
        console.log(`\nRun on startup: ${config.runOnStartup ? 'on' : 'off'}`);
      } else if (choice === '5') {
        config.autoFetch = !config.autoFetch;
        await savePreferences(config);
        await setAutostart(config.runOnStartup, config.autoFetch);
        console.log(`\nAutomatic fetching: ${config.autoFetch ? 'on' : 'off'}`);
      } else if (choice === '6' || choice === '') return;
      else console.log('Enter a number from 1 to 6.');
    }
  } finally { prompt.close(); }
}

async function watch(config) {
  if (!config.autoFetch) throw new Error('Automatic fetching is turned off.');
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

try {
  const config = await loadConfig();
  if (command === 'menu') await menu(config);
  else if (command === 'install') await install(config);
  else if (command === 'verify') await verify(config);
  else if (command === 'watch') await watch(config);
  else if (command === 'autostart') await setAutostart(true, config.autoFetch);
  else if (command === 'no-autostart') await setAutostart(false);
  else if (command === 'list') {
    const rows = [];
    for (const [id, harness] of Object.entries(presets)) rows.push({
      key: id,
      name: harness.name,
      enabled: config.enabledHarnesses.includes(id),
      detected: await harnessIsInstalled(harness)
    });
    printHeader('Apps', `${config.enabledHarnesses.length} enabled of ${rows.length}`);
    const nameWidth = Math.max(...rows.map(row => row.name.length));
    for (const row of rows) {
      const box = row.enabled ? green('[x]') : dim('[ ]');
      const status = (row.detected ? 'found' : 'not installed').padEnd(13);
      const found = row.detected ? green(status) : dim(status);
      console.log(`  ${box}  ${row.name.padEnd(nameWidth)}  ${found}  ${dim(row.key)}`);
    }
    console.log();
  }
  else throw new Error(`Unknown command "${command}".`);
} catch (error) {
  console.error(`ai-setup: ${error.message}`);
  process.exitCode = 1;
}
