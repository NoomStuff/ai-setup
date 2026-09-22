import { stdin as input, stdout as output } from 'node:process';
import { harnesses, harnessIsInstalled, presets, relativeHome, targetPath } from './presets.mjs';
import { savePreferences } from './config.mjs';
import { install, setAutostart, sourceSkillNames, verify, lastAppliedAt, formatAgo } from './operations.mjs';
import { bold, dim, green, harnessStatus, harnessStatusLabel, inverse, menuItems, skillInfoFor, sym } from './ui.mjs';
import { matchDetail } from './operations.mjs';

export function popKey(buffer) {
  if (!buffer.buf.length) return null;
  if (buffer.buf[0] !== '\x1b') {
    const key = buffer.buf[0];
    buffer.buf = buffer.buf.slice(1);
    return key;
  }
  if (buffer.buf.length === 1) {
    buffer.buf = '';
    return 'esc';
  }
  if (buffer.buf[1] === 'O') {
    if (buffer.buf.length < 3) return null;
    const code = buffer.buf[2];
    buffer.buf = buffer.buf.slice(3);
    if (code === 'A') return 'up';
    if (code === 'B') return 'down';
    if (code === 'C') return 'right';
    if (code === 'D') return 'left';
    if (code === 'H') return 'home';
    if (code === 'F') return 'end';
    return 'unknown';
  }
  if (buffer.buf[1] === '[') {
    const match = /^\x1b\[(\d+)?([~A-Za-z])/.exec(buffer.buf);
    if (!match) return null;
    buffer.buf = buffer.buf.slice(match[0].length);
    const code = match[2];
    if (code === 'A') return 'up';
    if (code === 'B') return 'down';
    if (code === 'C') return 'right';
    if (code === 'D') return 'left';
    if (code === 'H') return 'home';
    if (code === 'F') return 'end';
    if (code === 'Z') return 'shift-tab';
    if (code === '~') {
      if (match[1] === '5') return 'pgup';
      if (match[1] === '6') return 'pgdn';
      return 'unknown';
    }
    return 'unknown';
  }
  buffer.buf = buffer.buf.slice(1);
  return 'esc';
}

export function installResultLines(summary, width) {
  const fit = (value, room) => value.length <= room ? value : value.slice(0, Math.max(0, room - sym.ellipsis.length)) + sym.ellipsis;
  const lines = [];
  const { skillNames, results, activeHarnesses, skippedHarnesses } = summary;
  if (results.length) {
    lines.push(`${green(sym.check)} ${bold(`${activeHarnesses.length} updated`)}`);
    for (const result of results) {
      lines.push(`  ${result.harness.name}`);
      if (result.instructions) lines.push(`    ${dim(fit(`instructions ${sym.right} ${relativeHome(result.instructions)}`, width - 4))}`);
      if (result.skills) lines.push(`    ${dim(fit(`${skillNames.length} skills ${sym.right} ${relativeHome(result.skills)}`, width - 4))}`);
    }
    lines.push('');
  }
  if (skippedHarnesses.length) {
    lines.push(`${dim(sym.dash)} ${bold(`${skippedHarnesses.length} skipped`)}`);
    for (const harness of skippedHarnesses) {
      lines.push(`  ${harness.name}`);
      lines.push(`    ${dim(fit(`no install folder at ${relativeHome(targetPath(harness.detect))}`, width - 4))}`);
    }
    lines.push('');
  }
  if (summary.backupExists) lines.push(`${dim('Backups')}  ${fit(summary.backupRoot, width - 11)}`);
  return lines;
}

export function verifyResultLines(summary) {
  const lines = [`${green(sym.check)} ${bold(`${summary.checked.length} match`)}`];
  for (const harness of summary.checked) {
    lines.push(`  ${harness.name}`);
    lines.push(`    ${dim(matchDetail(harness))}`);
  }
  if (summary.skipped.length) {
    lines.push('');
    lines.push(`${dim(sym.dash)} ${bold(`${summary.skipped.length} skipped`)}`);
    for (const harness of summary.skipped) {
      lines.push(`  ${harness.name}`);
      lines.push(`    ${dim('install folder not found')}`);
    }
  }
  return lines;
}

export async function menuTui(config) {
  const ids = Object.keys(presets);
  const detected = new Map();
  const refreshDetected = async () => {
    await Promise.all(ids.map(async id => detected.set(id, await harnessIsInstalled(presets[id]))));
  };

  const cols = () => Math.max(40, output.columns || 80);
  const rows = () => Math.max(12, output.rows || 24);
  const fit = (value, room) => value.length <= room ? value : value.slice(0, Math.max(0, room - sym.ellipsis.length)) + sym.ellipsis;
  const rule = () => dim(sym.rule.repeat(cols() - 2));
  const spinnerFrame = () => '|/-\\'[state.spin % 4];

  const state = {
    screen: 'main',
    mainIndex: 0,
    appsCursor: 0,
    skillsCursor: 0,
    skillNames: [],
    resultTitle: '',
    resultSubtitle: '',
    resultLines: [],
    resultScroll: 0,
    toast: '',
    busy: '',
    spin: 0,
    lastApplied: null
  };

  const mainItems = () => {
    const found = harnesses(config).filter(harness => detected.get(harness.id)).length;
    return menuItems(config, skillInfoFor(config, state.skillNames), found);
  };

  function moveMain(direction) {
    const items = mainItems();
    let index = state.mainIndex;
    do {
      index = (index + direction + items.length) % items.length;
    } while (items[index].sep);
    state.mainIndex = index;
  }

  let toastTimer;
  function showStatus(message, duration) {
    state.toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (state.toast === message) {
        state.toast = '';
        try { render(); } catch { /* terminal already restored */ }
      }
    }, duration);
  }
  function toast(message) {
    showStatus(message, 2500);
  }
  function showError(error) {
    state.busy = '';
    const firstLine = String(error?.message ?? error).split('\n')[0].trim() || 'Unknown error';
    showStatus(`Error: ${firstLine}`, 8000);
  }

  async function setEnabled(id, on) {
    const previous = [...config.enabledHarnesses];
    const selected = new Set(config.enabledHarnesses);
    if (on) selected.add(id);
    else selected.delete(id);
    config.enabledHarnesses = ids.filter(item => selected.has(item));
    try {
      await savePreferences(config);
      toast(`Saved ${sym.dot} ${config.enabledHarnesses.length} enabled`);
    } catch (error) {
      config.enabledHarnesses = previous;
      showError(error);
    }
  }

  async function setSkillEnabled(name, on) {
    const previous = [...config.disabledSkills];
    const disabled = new Set(config.disabledSkills);
    if (on) disabled.delete(name);
    else disabled.add(name);
    config.disabledSkills = state.skillNames.filter(item => disabled.has(item));
    try {
      await savePreferences(config);
      toast(`Saved ${sym.dot} ${skillInfoFor(config, state.skillNames).detail}`);
    } catch (error) {
      config.disabledSkills = previous;
      showError(error);
    }
  }

  function render() {
    const width = cols();
    const height = rows();
    const body = [];
    let footer = '';
    if (state.screen === 'main') {
      body.push(bold('AI setup'));
      body.push(dim(state.lastApplied ? `Last applied ${formatAgo(state.lastApplied)}` : 'Never applied - run Apply setup'));
      body.push(rule());
      body.push('');
      const items = mainItems();
      const labelWidth = Math.max(...items.filter(item => !item.sep).map(item => item.label.length));
      items.forEach((item, index) => {
        if (item.sep) {
          body.push('');
          return;
        }
        const selected = index === state.mainIndex;
        const cursor = selected ? '> ' : '  ';
        if (selected) {
          const text = `${item.label.padEnd(labelWidth)}${item.detail ? `  ${item.detail}` : ''}`;
          body.push(inverse(cursor + fit(text, width - cursor.length)));
        } else {
          body.push(`${cursor}${item.label.padEnd(labelWidth)}${item.detail ? `  ${dim(item.detail)}` : ''}`);
        }
      });
      footer = dim(`${sym.upDown} navigate ${sym.dot} Enter select ${sym.dot} 1-8 jump ${sym.dot} q/Esc quit`);
    } else if (state.screen === 'apps') {
      const total = ids.length + 1;
      const visible = Math.max(1, height - 9);
      const top = Math.min(Math.max(0, state.appsCursor - Math.floor(visible / 2)), Math.max(0, total - visible));
      const foundCount = ids.filter(id => detected.get(id)).length;
      body.push(bold('Choose harnesses'));
      body.push(dim(`${config.enabledHarnesses.length} enabled ${sym.dot} ${foundCount} found`));
      body.push(rule());
      body.push('');
      const nameWidth = Math.max(...ids.map(id => presets[id].name.length));
      const separator = dim(sym.rule.repeat(Math.max(10, Math.min(nameWidth + 20, width - 4))));
      for (let index = top; index < Math.min(total, top + visible); index++) {
        if (index === ids.length) {
          const selected = index === state.appsCursor;
          body.push(`  ${separator}`);
          body.push(selected ? inverse(`> ${sym.back} Back`) : `  ${sym.back} Back`);
          continue;
        }
        const id = ids[index];
        const selected = index === state.appsCursor;
        const cursor = selected ? '> ' : '  ';
        const enabled = config.enabledHarnesses.includes(id);
        const found = detected.get(id);
        const creates = !found && (presets[id].always === true || config.installMissing === true);
        const statusRaw = harnessStatusLabel(found, creates);
        const name = presets[id].name.padEnd(nameWidth);
        if (selected) {
          body.push(inverse(cursor + fit(`${enabled ? '[x]' : '[ ]'}  ${name}  ${statusRaw}`, width - cursor.length)));
        } else {
          const box = enabled ? green('[x]') : dim('[ ]');
          body.push(`${cursor}${box}  ${name}  ${harnessStatus(found, creates)}`);
        }
      }
      footer = dim(`${sym.upDown} move ${sym.dot} Enter toggle ${sym.dot} a all ${sym.dot} n none ${sym.dot} f found ${sym.dot} Esc back`);
    } else if (state.screen === 'skills') {
      const names = state.skillNames;
      const total = names.length + 1;
      const visible = Math.max(1, height - 9);
      const top = Math.min(Math.max(0, state.skillsCursor - Math.floor(visible / 2)), Math.max(0, total - visible));
      body.push(bold('Choose skills'));
      body.push(dim(skillInfoFor(config, names).detail));
      body.push(rule());
      body.push('');
      const widest = names.length ? Math.max(...names.map(name => name.length)) : 10;
      const separator = dim(sym.rule.repeat(Math.max(10, Math.min(widest + 8, width - 4))));
      for (let index = top; index < Math.min(total, top + visible); index++) {
        if (index === names.length) {
          const selected = index === state.skillsCursor;
          body.push(`  ${separator}`);
          body.push(selected ? inverse(`> ${sym.back} Back`) : `  ${sym.back} Back`);
          continue;
        }
        const name = names[index];
        const selected = index === state.skillsCursor;
        const cursor = selected ? '> ' : '  ';
        const enabled = !config.disabledSkills.includes(name);
        if (selected) {
          body.push(inverse(cursor + fit(`${enabled ? '[x]' : '[ ]'}  ${name}`, width - cursor.length)));
        } else {
          const box = enabled ? green('[x]') : dim('[ ]');
          body.push(`${cursor}${box}  ${name}`);
        }
      }
      footer = dim(`${sym.upDown} move ${sym.dot} Enter toggle ${sym.dot} a all ${sym.dot} n none ${sym.dot} Esc back`);
    } else {
      body.push(bold(state.resultTitle));
      if (state.resultSubtitle) body.push(dim(state.resultSubtitle));
      body.push(rule());
      body.push('');
      const visible = Math.max(1, height - body.length - 2);
      const maxScroll = Math.max(0, state.resultLines.length - visible);
      state.resultScroll = Math.min(Math.max(0, state.resultScroll), maxScroll);
      const slice = state.resultLines.slice(state.resultScroll, state.resultScroll + visible);
      body.push(...slice);
      const position = state.resultLines.length > visible
        ? ` ${sym.dot} ${state.resultScroll + 1}-${state.resultScroll + slice.length} of ${state.resultLines.length}`
        : '';
      footer = dim(`${sym.upDown} scroll ${sym.dot} Enter/Esc back${position}`);
    }
    const lines = body.slice(0, height - 1);
    while (lines.length < height - 1) lines.push('');
    const rawStatus = state.busy ? `  ${spinnerFrame()} ${state.busy}${sym.ellipsis}` : (state.toast ? state.toast : footer);
    lines.push(fit(String(rawStatus).split('\n')[0], width));
    output.write(`\x1b[H\x1b[J${lines.join('\n')}`);
  }

  async function activate(action) {
    if (action === 'exit') return 'quit';
    if (action === 'harnesses') {
      try {
        await refreshDetected();
      } catch (error) {
        showError(error);
        return undefined;
      }
      state.appsCursor = 0;
      state.screen = 'apps';
      return undefined;
    }
    if (action === 'skills') {
      try {
        state.skillNames = await sourceSkillNames();
      } catch (error) {
        state.resultTitle = 'Skills unavailable';
        state.resultSubtitle = '';
        state.resultLines = String(error.message).split('\n');
        state.resultScroll = 0;
        state.screen = 'result';
        return undefined;
      }
      state.skillsCursor = 0;
      state.screen = 'skills';
      return undefined;
    }
    if (action === 'startup') {
      const previous = config.runOnStartup;
      config.runOnStartup = !previous;
      try {
        await setAutostart(config.runOnStartup, config.autoFetch);
        await savePreferences(config);
        toast(`Run on startup: ${config.runOnStartup ? 'on' : 'off'}`);
      } catch (error) {
        config.runOnStartup = previous;
        showError(error);
      }
      return undefined;
    }
    if (action === 'autofetch') {
      const previous = config.autoFetch;
      config.autoFetch = !previous;
      try {
        await setAutostart(config.runOnStartup, config.autoFetch);
        await savePreferences(config);
        toast(`Auto background updates: ${config.autoFetch ? 'on' : 'off'}`);
      } catch (error) {
        config.autoFetch = previous;
        showError(error);
      }
      return undefined;
    }
    if (action === 'installMissing') {
      const previous = config.installMissing;
      config.installMissing = !previous;
      try {
        await savePreferences(config);
        toast(`Don't skip missing harnesses: ${config.installMissing ? 'on' : 'off'}`);
      } catch (error) {
        config.installMissing = previous;
        showError(error);
      }
      return undefined;
    }
    if (action === 'update') {
      state.busy = 'Updating';
      state.spin = 0;
      render();
      try {
        const summary = await install(config, { quiet: true });
        await refreshDetected();
        state.lastApplied = new Date();
        state.resultTitle = 'Update complete';
        state.resultSubtitle = `${summary.activeHarnesses.length} ready ${sym.dot} ${summary.skippedHarnesses.length} skipped`;
        state.resultLines = installResultLines(summary, cols());
      } catch (error) {
        state.resultTitle = 'Update failed';
        state.resultSubtitle = '';
        state.resultLines = String(error.message).split('\n');
      }
      state.busy = '';
      state.resultScroll = 0;
      state.screen = 'result';
      return undefined;
    }
    if (action === 'verify') {
      state.busy = 'Verifying';
      state.spin = 0;
      render();
      try {
        const summary = await verify(config, { quiet: true });
        state.resultTitle = 'Verification passed';
        state.resultSubtitle = `${summary.checked.length} checked ${sym.dot} ${summary.skipped.length} skipped`;
        state.resultLines = verifyResultLines(summary);
      } catch (error) {
        state.resultTitle = 'Verification failed';
        state.resultSubtitle = '';
        state.resultLines = String(error.message).split('\n');
      }
      state.busy = '';
      state.resultScroll = 0;
      state.screen = 'result';
      return undefined;
    }
    return undefined;
  }

  async function handleMainKey(key) {
    const items = mainItems();
    if (key === 'up' || key === 'shift-tab') moveMain(-1);
    else if (key === 'down' || key === '\t') moveMain(1);
    else if (key === 'home' || key === 'g') state.mainIndex = 0;
    else if (key === 'end' || key === 'G') state.mainIndex = items.length - 1;
    else if (key.length === 1 && key >= '1' && key <= '8') {
      const item = items.find(entry => entry.key === Number(key));
      if (item) {
        state.mainIndex = items.indexOf(item);
        return activate(item.action);
      }
    } else if (key === '\r' || key === '\n' || key === 'x' || key === 'right' || key === 'l') {
      const item = items[state.mainIndex];
      if (!item.sep) return activate(item.action);
    } else if (key === 'q' || key === 'esc') return 'quit';
    return undefined;
  }

  async function handleAppsKey(key) {
    const last = ids.length;
    const moveApps = direction => {
      state.appsCursor = (state.appsCursor + direction + last + 1) % (last + 1);
    };
    if (key === 'up' || key === 'shift-tab') moveApps(-1);
    else if (key === 'down' || key === '\t') moveApps(1);
    else if (key === 'home' || key === 'g') state.appsCursor = 0;
    else if (key === 'end' || key === 'G') state.appsCursor = last;
    else if (key === 'x' || key === '\r' || key === '\n') {
      if (state.appsCursor === last) state.screen = 'main';
      else {
        const id = ids[state.appsCursor];
        await setEnabled(id, !config.enabledHarnesses.includes(id));
      }
    } else if (key === 'a') {
      const previous = [...config.enabledHarnesses];
      config.enabledHarnesses = [...ids];
      try {
        await savePreferences(config);
        toast(`Saved ${sym.dot} ${config.enabledHarnesses.length} enabled`);
      } catch (error) {
        config.enabledHarnesses = previous;
        showError(error);
      }
    } else if (key === 'n') {
      const previous = [...config.enabledHarnesses];
      config.enabledHarnesses = [];
      try {
        await savePreferences(config);
        toast(`Saved ${sym.dot} ${config.enabledHarnesses.length} enabled`);
      } catch (error) {
        config.enabledHarnesses = previous;
        showError(error);
      }
    } else if (key === 'f') {
      const previous = [...config.enabledHarnesses];
      config.enabledHarnesses = ids.filter(id => detected.get(id));
      try {
        await savePreferences(config);
        toast(`Saved ${sym.dot} ${config.enabledHarnesses.length} enabled`);
      } catch (error) {
        config.enabledHarnesses = previous;
        showError(error);
      }
    } else if (key === 'left' || key === 'h' || key === 'q' || key === 'esc') {
      state.screen = 'main';
    }
    return undefined;
  }

  async function handleSkillsKey(key) {
    const names = state.skillNames;
    const last = names.length;
    const moveSkills = direction => {
      state.skillsCursor = (state.skillsCursor + direction + last + 1) % (last + 1);
    };
    if (key === 'up' || key === 'shift-tab') moveSkills(-1);
    else if (key === 'down' || key === '\t') moveSkills(1);
    else if (key === 'home' || key === 'g') state.skillsCursor = 0;
    else if (key === 'end' || key === 'G') state.skillsCursor = last;
    else if (key === 'x' || key === '\r' || key === '\n') {
      if (state.skillsCursor === last) state.screen = 'main';
      else {
        const name = names[state.skillsCursor];
        await setSkillEnabled(name, config.disabledSkills.includes(name));
      }
    } else if (key === 'a') {
      const previous = [...config.disabledSkills];
      config.disabledSkills = [];
      try {
        await savePreferences(config);
        toast(`Saved ${sym.dot} ${skillInfoFor(config, names).detail}`);
      } catch (error) {
        config.disabledSkills = previous;
        showError(error);
      }
    } else if (key === 'n') {
      const previous = [...config.disabledSkills];
      config.disabledSkills = [...names];
      try {
        await savePreferences(config);
        toast(`Saved ${sym.dot} ${skillInfoFor(config, names).detail}`);
      } catch (error) {
        config.disabledSkills = previous;
        showError(error);
      }
    } else if (key === 'left' || key === 'h' || key === 'q' || key === 'esc') {
      state.screen = 'main';
    }
    return undefined;
  }

  function handleResultKey(key) {
    const visible = Math.max(1, rows() - 6);
    const maxScroll = Math.max(0, state.resultLines.length - visible);
    if (key === 'up') state.resultScroll = Math.max(0, state.resultScroll - 1);
    else if (key === 'down' || key === '\t') state.resultScroll = Math.min(maxScroll, state.resultScroll + 1);
    else if (key === 'home' || key === 'g') state.resultScroll = 0;
    else if (key === 'end' || key === 'G') state.resultScroll = maxScroll;
    else if (key === 'x' || key === '\r' || key === '\n' || key === 'right' || key === 'l' || key === 'left' || key === 'h' || key === 'q' || key === 'esc') {
      state.screen = 'main';
      state.resultScroll = 0;
    }
    return undefined;
  }

  async function handleKey(key) {
    if (key === '\x03' || key === '\x11') {
      process.exitCode = 130;
      return 'quit';
    }
    if (state.busy) return undefined;
    if (state.screen === 'main') return handleMainKey(key);
    if (state.screen === 'apps') return handleAppsKey(key);
    if (state.screen === 'skills') return handleSkillsKey(key);
    return handleResultKey(key);
  }

  await refreshDetected();
  try {
    state.skillNames = await sourceSkillNames();
  } catch {
    state.skillNames = [];
  }
  try {
    state.lastApplied = await lastAppliedAt();
  } catch {
    state.lastApplied = null;
  }
  input.resume();
  input.setRawMode(true);
  output.write('\x1b[?1049h\x1b[H\x1b[?25l');
  const buffer = { buf: '' };
  const spinnerTimer = setInterval(() => {
    if (state.busy) {
      state.spin++;
      try { render(); } catch { /* output closed mid-spin, loop exit handles restore */ }
    }
  }, 120);
  const onResize = () => {
    try { render(); } catch { /* terminal closing, ignore */ }
  };
  output.on('resize', onResize);
  try {
    render();
    for await (const chunk of input) {
      buffer.buf += chunk.toString('utf8');
      let key;
      let action;
      while ((key = popKey(buffer)) !== null) {
        try {
          action = await handleKey(key);
        } catch (error) {
          state.busy = '';
          showError(error);
          action = undefined;
        }
        if (action === 'quit') break;
      }
      try {
        render();
      } catch {
        break;
      }
      if (action === 'quit') break;
    }
  } catch (error) {
    // Already fullscreen: never fall back to the basic menu mid-session.
    // Show the failure in the status bar when possible, then restore the terminal.
    try { showError(error); render(); } catch { /* terminal closing */ }
  } finally {
    clearInterval(spinnerTimer);
    clearTimeout(toastTimer);
    output.removeListener('resize', onResize);
    try { input.setRawMode(false); } catch { /* already restored */ }
    try { output.write('\x1b[?25h\x1b[?1049l'); } catch { /* output closed */ }
    input.pause();
  }
}
