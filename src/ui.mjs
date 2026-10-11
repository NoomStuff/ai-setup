import { stdout as output } from 'node:process';

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {NodeJS.Platform} platform
 * @param {boolean} isTTY
 * @returns {boolean}
 */
export function supportsUnicode(env = process.env, platform = process.platform, isTTY = output.isTTY ?? false) {
  if (env.FORCE_UNICODE) return true;
  if (env.NO_UNICODE) return false;
  if (platform !== 'win32') return env.TERM !== 'linux';

  // Native Windows consoles need no terminal-specific environment variables.
  // Node writes Unicode to the console even when its code page is not UTF-8.
  if (isTTY) return true;

  // Pseudo-terminals and redirected UTF-8 output may have no console handle.
  const locale = env.LC_ALL || env.LC_CTYPE || env.LANG || '';
  if (/utf-?8/i.test(locale)) return true;

  return Boolean(env.CI || env.WT_SESSION || env.VSCODE_INJECTION || env.WINDOWS_TERMINAL
    || env.TERMINUS_SUBLIME || env.ConEmuTask || env.HYPER || env.ConEmuANSI === 'ON')
    || env.TERM_PROGRAM === 'vscode' || env.TERM_PROGRAM === 'WezTerm'
    || env.TERM_PROGRAM === 'Hyper' || env.TERM_PROGRAM === 'Alacritty'
    || /^xterm(?:-|$)/i.test(env.TERM ?? '') || env.TERM === 'alacritty' || env.TERM === 'wezterm';
}

export const unicode = supportsUnicode();

export const sym = unicode
  ? { check: '✓', dash: '–', rule: '─', right: '→', dot: '·', ellipsis: '…', upDown: '↑↓', back: '←' }
  : { check: 'v', dash: '-', rule: '-', right: '->', dot: '-', ellipsis: '...', upDown: 'Up/Down', back: '<-' };

const useColor = (output.isTTY ?? false) && !process.env.NO_COLOR;
const paint = code => value => useColor ? `\x1b[${code}m${value}\x1b[0m` : value;
export const bold = paint(1);
export const dim = paint(2);
export const green = paint(32);
export const inverse = value => useColor ? `\x1b[7m${value}\x1b[0m` : value;

export function printHeader(title, subtitle = '') {
  console.log(`\n${bold(title)}`);
  if (subtitle) console.log(dim(subtitle));
  console.log(dim(sym.rule.repeat(44)));
}

export function printOptions(items) {
  const labelWidth = Math.max(...items.filter(item => !item.sep).map(item => item.label.length));
  for (const item of items) {
    if (item.sep) {
      console.log();
      continue;
    }
    const key = String(item.key).padStart(2);
    const detail = item.detail ? `  ${dim(item.detail)}` : '';
    console.log(`  ${key}  ${item.label.padEnd(labelWidth)}${detail}`);
  }
  console.log();
}

export function menuItems(config, skillInfo, foundCount = 0) {
  return [
    { key: 1, label: 'Apply setup', detail: 'Copy skills and instructions to the harnesses', action: 'update' },
    { key: 2, label: 'Verify setup', detail: 'Check if installed copies are correct', action: 'verify' },
    { sep: true },
    { key: 3, label: 'Choose harnesses', detail: `${config.enabledHarnesses.length} apps enabled, ${foundCount} found`, action: 'harnesses' },
    { key: 4, label: 'Choose skills', detail: `${skillInfo.enabled} of ${skillInfo.total} enabled`, action: 'skills' },
    { sep: true },
    { key: 5, label: 'Run on startup', detail: config.runOnStartup ? 'on' : 'off', action: 'startup' },
    { key: 6, label: 'Auto background updates', detail: config.autoFetch ? 'on' : 'off', action: 'autofetch' },
    { key: 7, label: "Don't skip missing harnesses", detail: config.installMissing ? 'on' : 'off', action: 'installMissing' },
    { sep: true },
    { key: 8, label: 'Exit', detail: '', action: 'exit' }
  ];
}

export function skillInfoFor(config, allSkills) {
  const enabled = allSkills.filter(name => !config.disabledSkills.includes(name));
  return {
    total: allSkills.length,
    enabled: enabled.length,
    detail: `${enabled.length} of ${allSkills.length} enabled`
  };
}

export function harnessStatusLabel(detected, willCreate) {
  return (detected ? 'found' : (willCreate ? 'create' : 'not installed')).padEnd(13);
}

export function harnessStatus(detected, willCreate) {
  const label = harnessStatusLabel(detected, willCreate);
  return (detected || willCreate ? green : dim)(label);
}

export function printHarnessOptions(rows) {
  const nameWidth = Math.max(...rows.map(row => row.name.length));
  for (const row of rows) {
    const box = row.enabled ? green('[x]') : dim('[ ]');
    console.log(`  ${String(row.key).padStart(2)}  ${box}  ${row.name.padEnd(nameWidth)}  ${harnessStatus(row.detected, row.willCreate)}`);
  }
  console.log();
}

export function printSkillOptions(rows) {
  for (const row of rows) {
    const box = row.enabled ? green('[x]') : dim('[ ]');
    console.log(`  ${String(row.key).padStart(2)}  ${box}  ${row.name}`);
  }
  console.log();
}

export async function ask(prompt, query) {
  if (prompt.closed) return null;
  let onClose;
  try {
    const closed = new Promise(resolve => {
      onClose = () => resolve(null);
      prompt.once('close', onClose);
    });
    return await Promise.race([prompt.question(query).catch(() => null), closed]);
  } catch {
    return null;
  } finally {
    if (onClose) prompt.removeListener('close', onClose);
  }
}

export function printResultGroups(okTitle, okItems, skipTitle, skipItems) {
  if (okItems.length) {
    console.log(`\n${green(sym.check)} ${bold(okTitle)}`);
    for (const item of okItems) {
      console.log(`  ${item.name}`);
      for (const line of item.lines) console.log(`    ${dim(line)}`);
    }
  }
  if (skipItems.length) {
    console.log(`\n${dim(sym.dash)} ${bold(skipTitle)}`);
    for (const item of skipItems) {
      console.log(`  ${item.name}`);
      for (const line of item.lines) console.log(`    ${dim(line)}`);
    }
  }
  console.log();
}
